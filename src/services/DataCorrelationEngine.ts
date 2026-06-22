/**
 * DataCorrelationEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-references BMS batch data (nexum_bms_live_data) against manually
 * submitted facility logs (nexum_facility_logs) to surface:
 *
 *   DIVERGENCE       — BMS reading and manual log for same equipment differ > threshold
 *   ALARM_MATCH      — Active BMS alarm has a matching manual log within 48 hrs
 *   BLIND_SPOT       — Equipment has BMS data but zero manual logs, or vice versa
 *   LEADING_INDICATOR— BMS trend degraded before a manual issue was logged
 *   LAGGING_RESPONSE — Manual log shows issue BMS never flagged
 *
 * Results are written to nexum_correlation_results and a nexum_correlation_update
 * custom event is dispatched so any listening component can re-render.
 *
 * The engine is intentionally read-only: it never writes back to facility_logs
 * or bms_live_data.
 */

export type CorrelationType =
  | 'DIVERGENCE'
  | 'ALARM_MATCH'
  | 'BLIND_SPOT'
  | 'LEADING_INDICATOR'
  | 'LAGGING_RESPONSE';

export type CorrelationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CorrelationInsight {
  id: string;
  type: CorrelationType;
  severity: CorrelationSeverity;
  equipmentId: string;
  equipmentLabel?: string;
  title: string;
  detail: string;
  bmsValue?: number | string;
  manualValue?: number | string;
  bmsTimestamp?: string;
  manualTimestamp?: string;
  recommendedAction?: string;
  detectedAt: string;
}

export interface CorrelationSummary {
  runAt: string;
  totalInsights: number;
  byCriticality: Record<CorrelationSeverity, number>;
  byType: Record<CorrelationType, number>;
  insights: CorrelationInsight[];
}

const RESULTS_KEY = 'nexum_correlation_results';
const DIVERGENCE_THRESHOLD_PCT = 15; // >15% relative difference = divergence
const BLIND_SPOT_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hrs with no cross-source data
const ALARM_MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;
const LEADING_INDICATOR_WINDOW_MS = 24 * 60 * 60 * 1000;

// Metric keyword → canonical dimension used to compare BMS vs manual values
const METRIC_DIMENSION_MAP: Record<string, string> = {
  temp: 'temperature', temperature: 'temperature',
  humidity: 'humidity', rh: 'humidity',
  co2: 'co2', co_2: 'co2',
  pressure: 'pressure',
  kw: 'power_kw', kwh: 'energy_kwh', demand: 'demand_kw',
  amps: 'current_amps', current: 'current_amps',
  voltage: 'voltage',
  airflow: 'airflow_cfm', cfm: 'airflow_cfm',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function classify(pointName: string): string | null {
  const lower = pointName.toLowerCase();
  for (const [kw, dim] of Object.entries(METRIC_DIMENSION_MAP)) {
    if (lower.includes(kw)) return dim;
  }
  return null;
}

function relativeDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return (Math.abs(a - b) / denom) * 100;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Main engine ─────────────────────────────────────────────────────────────

class DataCorrelationEngineClass {
  private running = false;

  /** Run a full correlation pass. Safe to call concurrently — second call is a no-op. */
  async run(): Promise<CorrelationSummary> {
    if (this.running) return this.getLastResults();
    this.running = true;
    try {
      const insights = this.correlate();
      const summary  = this.buildSummary(insights);
      this.save(summary);
      this.dispatch();
      return summary;
    } finally {
      this.running = false;
    }
  }

  getLastResults(): CorrelationSummary {
    return readJson<CorrelationSummary>(RESULTS_KEY, {
      runAt: new Date().toISOString(),
      totalInsights: 0,
      byCriticality: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byType: { DIVERGENCE: 0, ALARM_MATCH: 0, BLIND_SPOT: 0, LEADING_INDICATOR: 0, LAGGING_RESPONSE: 0 },
      insights: [],
    });
  }

  // ── Core correlation logic ──────────────────────────────────────────────────

  private correlate(): CorrelationInsight[] {
    const insights: CorrelationInsight[] = [];

    // ── Source data ──────────────────────────────────────────────────────────
    const bmsRaw   = readJson<Record<string, any>>(        'nexum_bms_live_data',   {});
    const logsRaw  = readJson<any[]>(                      'nexum_facility_logs',   []);
    const climateRaw = readJson<any[]>(                    'nexum_climate_bms_data',[]);
    const energyRaw  = readJson<any[]>(                    'nexum_energy_bms_data', []);

    const logs: any[] = Array.isArray(logsRaw) ? logsRaw : [];

    // Build lookup: equipmentId → latest manual log entries
    const manualByEquip = new Map<string, any[]>();
    for (const log of logs) {
      const eid = log.equipmentId || log.equipment_id || log.id;
      if (!eid) continue;
      if (!manualByEquip.has(eid)) manualByEquip.set(eid, []);
      manualByEquip.get(eid)!.push(log);
    }

    // Flatten BMS feeds into per-equipment, per-dimension readings
    interface BMSReading { equipmentId: string; dimension: string; value: number; timestamp: string; alarm: boolean; pointName: string; }
    const bmsReadings: BMSReading[] = [];

    const allBmsEntries = [
      ...Object.values(bmsRaw),
      ...climateRaw,
      ...energyRaw,
    ];

    for (const entry of allBmsEntries) {
      const points: any[] = entry?.points || entry?.data || (Array.isArray(entry) ? entry : []);
      const feedEquipId: string = entry?.equipmentId || entry?.skidId || entry?.feedId || '';
      for (const pt of points) {
        const dim = classify(pt.name || pt.pointName || '');
        if (!dim) continue;
        const val = parseFloat(pt.value ?? pt.currentValue ?? pt.reading ?? 'NaN');
        if (isNaN(val)) continue;
        const equipId = pt.equipmentId || pt.skidId || feedEquipId;
        if (!equipId) continue;
        bmsReadings.push({
          equipmentId: equipId,
          dimension:   dim,
          value:       val,
          timestamp:   pt.timestamp || entry?.timestamp || new Date().toISOString(),
          alarm:       !!(pt.alarm || pt.inAlarm || pt.alarmActive),
          pointName:   pt.name || pt.pointName || dim,
        });
      }
    }

    // Group BMS by equipment
    const bmsByEquip = new Map<string, BMSReading[]>();
    for (const r of bmsReadings) {
      if (!bmsByEquip.has(r.equipmentId)) bmsByEquip.set(r.equipmentId, []);
      bmsByEquip.get(r.equipmentId)!.push(r);
    }

    const now = Date.now();

    // ── 1. DIVERGENCE & LEADING_INDICATOR & ALARM_MATCH ─────────────────────
    for (const [equipId, bmsPoints] of bmsByEquip.entries()) {
      const manualLogs = manualByEquip.get(equipId) || [];

      // ALARM_MATCH: any BMS alarm + a manual log within window
      const alarmPoints = bmsPoints.filter(p => p.alarm);
      if (alarmPoints.length > 0 && manualLogs.length > 0) {
        const earliest = alarmPoints.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
        const alarmTs  = new Date(earliest.timestamp).getTime();
        const matched  = manualLogs.find(l => {
          const lts = new Date(l.timestamp || l.createdAt || 0).getTime();
          return Math.abs(lts - alarmTs) <= ALARM_MATCH_WINDOW_MS;
        });
        if (matched) {
          insights.push({
            id: uid(), type: 'ALARM_MATCH', severity: 'high',
            equipmentId: equipId,
            title:  `BMS Alarm Corroborated by Manual Log`,
            detail: `${alarmPoints.length} BMS alarm point(s) active on ${earliest.pointName}. A manual log was submitted within 48 hours — issue is cross-confirmed.`,
            bmsTimestamp:    earliest.timestamp,
            manualTimestamp: matched.timestamp || matched.createdAt,
            recommendedAction: 'Create a work order if one is not already open. Document root cause in the platform.',
            detectedAt: new Date().toISOString(),
          });
        }
      }

      // DIVERGENCE & LEADING_INDICATOR
      for (const bmsPoint of bmsPoints) {
        // Find manual reading for the same dimension in the same log
        for (const ml of manualLogs) {
          const manualVal = this.extractManualDimension(ml, bmsPoint.dimension);
          if (manualVal === null) continue;

          const diffPct = relativeDiff(bmsPoint.value, manualVal);
          if (diffPct >= DIVERGENCE_THRESHOLD_PCT) {
            const bmsTs    = new Date(bmsPoint.timestamp).getTime();
            const manualTs = new Date(ml.timestamp || ml.createdAt || 0).getTime();
            const deltaMs  = bmsTs - manualTs;

            // If BMS reading preceded the manual log issue by < 24 hrs → leading indicator
            if (deltaMs < 0 && Math.abs(deltaMs) <= LEADING_INDICATOR_WINDOW_MS) {
              insights.push({
                id: uid(), type: 'LEADING_INDICATOR', severity: 'medium',
                equipmentId: equipId,
                title:  `BMS Pre-Flagged Issue Before Manual Log`,
                detail: `BMS reported ${bmsPoint.value} ${bmsPoint.dimension} on ${bmsPoint.pointName} — ${Math.round(Math.abs(deltaMs) / 3600000)}h before the manual log noted ${manualVal}.`,
                bmsValue: bmsPoint.value, manualValue: manualVal,
                bmsTimestamp: bmsPoint.timestamp, manualTimestamp: ml.timestamp || ml.createdAt,
                recommendedAction: 'Consider lowering BMS alarm thresholds to catch similar deviations earlier.',
                detectedAt: new Date().toISOString(),
              });
            } else {
              // Generic divergence
              const sev: CorrelationSeverity = diffPct >= 40 ? 'critical' : diffPct >= 25 ? 'high' : 'medium';
              insights.push({
                id: uid(), type: 'DIVERGENCE', severity: sev,
                equipmentId: equipId,
                title:  `Reading Divergence — ${bmsPoint.dimension} (${Math.round(diffPct)}% apart)`,
                detail: `BMS recorded ${bmsPoint.value} vs manual log of ${manualVal} for ${bmsPoint.dimension} on equipment ${equipId}. Sensor drift, calibration error, or data entry issue possible.`,
                bmsValue: bmsPoint.value, manualValue: manualVal,
                bmsTimestamp: bmsPoint.timestamp, manualTimestamp: ml.timestamp || ml.createdAt,
                recommendedAction: sev === 'critical'
                  ? 'Immediately verify sensor calibration and re-check equipment in person.'
                  : 'Schedule a sensor calibration check and compare against a reference instrument.',
                detectedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      // LAGGING_RESPONSE: manual log flags an issue but no BMS alarm exists
      for (const ml of manualLogs) {
        const isFlagged = ml.flagged || ml.isFlagged || ml.flag || false;
        if (!isFlagged) continue;
        const hasMatchingAlarm = alarmPoints.some(ap => {
          const lts = new Date(ml.timestamp || ml.createdAt || 0).getTime();
          const ats = new Date(ap.timestamp).getTime();
          return Math.abs(lts - ats) <= ALARM_MATCH_WINDOW_MS;
        });
        if (!hasMatchingAlarm) {
          insights.push({
            id: uid(), type: 'LAGGING_RESPONSE', severity: 'medium',
            equipmentId: equipId,
            title:  `Manual Flag Without BMS Alarm — Possible Sensor Gap`,
            detail: `A manual log was flagged for equipment ${equipId} but no corresponding BMS alarm was raised. BMS coverage may be incomplete, or alarm thresholds need adjustment.`,
            manualTimestamp: ml.timestamp || ml.createdAt,
            recommendedAction: 'Review BMS sensor placement and alarm threshold configuration for this equipment.',
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // ── 2. BLIND_SPOT ────────────────────────────────────────────────────────

    // Equipment with BMS data but no manual logs in window
    for (const [equipId, bmsPoints] of bmsByEquip.entries()) {
      if (manualByEquip.has(equipId)) continue;
      const latestBms = bmsPoints.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
      const age = now - new Date(latestBms.timestamp).getTime();
      if (age <= BLIND_SPOT_WINDOW_MS) {
        insights.push({
          id: uid(), type: 'BLIND_SPOT', severity: 'low',
          equipmentId: equipId,
          title:  `BMS-Monitored Equipment Has No Recent Manual Logs`,
          detail: `Equipment ${equipId} is sending BMS data but has no manual log entries in the past 72 hours. Manual verification is recommended to confirm condition.`,
          bmsTimestamp: latestBms.timestamp,
          recommendedAction: 'Assign a staff member to perform and log a physical inspection.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Equipment with manual logs but no BMS data (BMS blind spot)
    for (const [equipId, mlogs] of manualByEquip.entries()) {
      if (bmsByEquip.has(equipId)) continue;
      const latest = mlogs.reduce((a: any, b: any) => (a.timestamp || '') > (b.timestamp || '') ? a : b, mlogs[0]);
      const age = now - new Date(latest?.timestamp || latest?.createdAt || 0).getTime();
      if (age <= BLIND_SPOT_WINDOW_MS) {
        insights.push({
          id: uid(), type: 'BLIND_SPOT', severity: 'info',
          equipmentId: equipId,
          title:  `Manually Logged Equipment Has No BMS Coverage`,
          detail: `Equipment ${equipId} has recent manual logs but no active BMS point data. Consider connecting it to a BMS feed for continuous monitoring.`,
          manualTimestamp: latest?.timestamp || latest?.createdAt,
          recommendedAction: 'Evaluate whether a BMS sensor or integration point can be added for this equipment.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  // ── Extract a known dimension value from a manual log entry ─────────────────
  private extractManualDimension(log: any, dimension: string): number | null {
    // Direct field names
    const candidates: string[] = [dimension, ...Object.keys(METRIC_DIMENSION_MAP).filter(k => METRIC_DIMENSION_MAP[k] === dimension)];
    for (const key of candidates) {
      const val = log[key] ?? log[`${key}Reading`] ?? log[`${key}Value`] ?? log[`${key}_reading`];
      if (val !== undefined && val !== null && val !== '') {
        const n = parseFloat(String(val));
        if (!isNaN(n)) return n;
      }
    }
    // Check readings sub-object
    const readings = log.readings || log.metrics || log.values || {};
    for (const key of candidates) {
      const val = readings[key];
      if (val !== undefined && val !== null) {
        const n = parseFloat(String(val));
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  // ── Summary + persistence ──────────────────────────────────────────────────

  private buildSummary(insights: CorrelationInsight[]): CorrelationSummary {
    const byCriticality: Record<CorrelationSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byType: Record<CorrelationType, number> = { DIVERGENCE: 0, ALARM_MATCH: 0, BLIND_SPOT: 0, LEADING_INDICATOR: 0, LAGGING_RESPONSE: 0 };

    for (const ins of insights) {
      byCriticality[ins.severity] = (byCriticality[ins.severity] || 0) + 1;
      byType[ins.type] = (byType[ins.type] || 0) + 1;
    }

    // Sort: critical → high → medium → low → info
    const ORDER: CorrelationSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    const sorted = [...insights].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

    return {
      runAt:         new Date().toISOString(),
      totalInsights: insights.length,
      byCriticality,
      byType,
      insights:      sorted.slice(0, 200), // cap at 200 stored insights
    };
  }

  private save(summary: CorrelationSummary): void {
    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(summary));
    } catch { /* quota exceeded — skip silently */ }
  }

  private dispatch(): void {
    try {
      window.dispatchEvent(new CustomEvent('nexum_correlation_update'));
    } catch { /* non-browser env */ }
  }
}

export const DataCorrelationEngine = new DataCorrelationEngineClass();
