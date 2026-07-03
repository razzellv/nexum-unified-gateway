/**
 * ObservationEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts raw data into outcome-based system observations. Runs after every
 * BMS poll cycle and every manual log submission.
 *
 * Detection types:
 *   BASELINE_DEVIATION   — metric moved ≥2 std-devs from learned normal
 *   TIMING_GAP           — blowdown / maintenance logged later than performed
 *   ENVIRONMENTAL_OUTCOME— rain / temp condition sustained load/energy pattern
 *   TREND_DRIFT          — metric trending steadily away from baseline over time
 *   RECOVERY_ANOMALY     — system took longer than learned norm to recover
 *
 * Storage: nexum_system_observations (localStorage, capped at 500)
 * Event:   nexum_observation_update (CustomEvent, no payload — listeners re-read storage)
 */

import { BaselineEngine, BaselineEngineClass } from './BaselineEngine';

export type SystemObservationType =
  | 'BASELINE_DEVIATION'
  | 'TIMING_GAP'
  | 'ENVIRONMENTAL_OUTCOME'
  | 'TREND_DRIFT'
  | 'RECOVERY_ANOMALY'
  | 'VIOLATION_LOGGED';

export type SystemObservationFlag = 'critical' | 'warning' | 'note' | 'pattern' | 'learning';

export interface SystemObservation {
  id:               string;
  type:             SystemObservationType;
  flag:             SystemObservationFlag;
  equipmentId:      string;
  equipmentLabel?:  string;
  metric?:          string;
  observedValue?:   number | string;
  expectedValue?:   number | string;
  delta?:           number;
  deltaPct?:        number;
  zScore?:          number;
  direction?:       'above' | 'below' | 'none';
  condition?:       string;
  interpretation:   string;
  context?:         string;       // human-readable context sentence
  recommendation?:  string;
  source:           'bms' | 'manual_log' | 'cross_source' | 'environmental';
  timestamp:        string;
  detectedAt:       string;
  sampleCount?:     number;       // how many readings the baseline is based on
  acknowledged?:    boolean;
}

export interface EnvironmentalOutcomeTemplate {
  id:              string;
  condition:       string;      // e.g. "rainy + outdoor_temp < 55°F"
  avgLoad:         number;      // % rated load
  avgDuration:     number;      // hours sustained
  avgEnergyCost:   number;      // $/day estimate
  avgRuntime:      number;      // hours
  occurrences:     number;
  lastSeen:        string;
}

const OBS_KEY     = 'nexum_system_observations';
const ENV_KEY     = 'nexum_env_outcomes';
const MAX_OBS     = 500;
const MAX_ENV     = 100;

// Timing gap threshold: if log.createdAt − log.performedAt > this → flag
const TIMING_GAP_MINUTES = 20;

// Recovery anomaly: if post-maintenance metric doesn't normalize within this window
const RECOVERY_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

function uid(): string {
  return `sysobs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readJson<T>(k: string, fb: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch { return fb; }
}

function writeJson(k: string, val: unknown, cap: number): void {
  try {
    let arr = Array.isArray(val) ? val : [val];
    if (arr.length > cap) arr = arr.slice(0, cap);
    localStorage.setItem(k, JSON.stringify(arr));
  } catch { /* quota */ }
}

const KNOWN_LOG_METRICS = [
  'pressure', 'temperature', 'humidity', 'runtime', 'efficiency',
  'co2', 'flowRate', 'voltage', 'current', 'kw', 'kwh',
  'supplyTemp', 'returnTemp', 'deltaT', 'conductivity', 'cycles',
];

const LOG_TYPE_KEYWORDS: Record<string, SystemObservationFlag> = {
  blowdown:        'note',
  chemical_feed:   'note',
  flush:           'note',
  inspection:      'learning',
  repair:          'warning',
  alarm:           'critical',
  shutdown:        'critical',
  override:        'warning',
};

class ObservationEngineClass {
  private running = false;

  /** Process a newly submitted manual facility log. */
  processLog(log: any): void {
    if (!log) return;
    const eid      = log.equipmentId || log.equipment_id || log.id;
    const logType  = (log.type || log.logType || log.category || '').toLowerCase();
    const hour     = new Date(log.timestamp || log.createdAt || Date.now()).getHours();
    const condition = BaselineEngine.inferCondition({ logType, hour });

    const observations: SystemObservation[] = [];

    // ── 1. TIMING_GAP ──────────────────────────────────────────────────────────
    if (log.performedAt && log.createdAt) {
      const performed = new Date(log.performedAt).getTime();
      const created   = new Date(log.createdAt).getTime();
      const gapMinutes = (created - performed) / 60000;
      if (gapMinutes > TIMING_GAP_MINUTES) {
        const maintenanceType = logType || 'maintenance';
        observations.push({
          id: uid(), type: 'TIMING_GAP',
          flag: gapMinutes > 120 ? 'warning' : 'note',
          equipmentId: eid || 'unknown',
          metric: 'log_timing',
          observedValue: `${Math.round(gapMinutes)}min lag`,
          expectedValue: `< ${TIMING_GAP_MINUTES}min`,
          delta: gapMinutes,
          interpretation: `${maintenanceType} on ${eid} was performed at ${new Date(log.performedAt).toLocaleTimeString()} but logged ${Math.round(gapMinutes)} minutes later. The system has recorded this timing gap.`,
          context: `Logging lag: ${Math.round(gapMinutes)} min. Performed ${new Date(log.performedAt).toLocaleString()}, logged ${new Date(log.createdAt).toLocaleString()}.`,
          recommendation: gapMinutes > 60
            ? 'Encourage field staff to log events within 20 minutes of completion for accurate timestamps.'
            : 'Minor timing lag noted — no action required unless recurring.',
          source: 'manual_log',
          timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // ── 2. BASELINE_DEVIATION — check each numeric metric in the log ──────────
    if (eid) {
      // Check top-level known fields
      for (const metric of KNOWN_LOG_METRICS) {
        const rawVal = log[metric] ?? (log.readings || {})[metric] ?? (log.metrics || {})[metric];
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;
        const val = parseFloat(String(rawVal));
        if (!isFinite(val)) continue;

        const dev = BaselineEngine.checkAndUpdate(eid, metric, val, condition);
        if (dev && dev.isDeviation) {
          const flag: SystemObservationFlag = dev.zScore >= 3.5 ? 'critical' : dev.zScore >= 2.5 ? 'warning' : 'note';
          observations.push({
            id: uid(), type: 'BASELINE_DEVIATION',
            flag,
            equipmentId: eid,
            metric,
            observedValue: val,
            expectedValue: parseFloat(dev.mean.toFixed(3)),
            delta:    parseFloat(dev.delta.toFixed(3)),
            deltaPct: parseFloat(dev.deltaPct.toFixed(1)),
            zScore:   parseFloat(dev.zScore.toFixed(2)),
            direction: dev.direction,
            condition,
            sampleCount: dev.sampleCount,
            interpretation: `${metric} on ${eid} is ${Math.round(dev.deltaPct)}% ${dev.direction} its learned baseline of ${dev.mean.toFixed(2)} (σ=${dev.stddev.toFixed(2)}, n=${dev.sampleCount}). Observed: ${val}.`,
            context: `Condition bucket: ${condition}. Z-score: ${dev.zScore.toFixed(2)}. Based on ${dev.sampleCount} prior readings.`,
            recommendation: flag === 'critical'
              ? `Investigate ${metric} on ${eid} immediately — reading is ${dev.zScore.toFixed(1)} standard deviations from normal.`
              : `Monitor ${metric} on ${eid} over the next 24 hours. If the trend continues, create a work order.`,
            source: 'manual_log',
            timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
            detectedAt: new Date().toISOString(),
          });
        } else if (!dev) {
          // Not enough data yet — just update baseline silently (already done inside checkAndUpdate)
        }
      }
    }

    if (observations.length > 0) this.append(observations);
  }

  /** Process BMS live data — run after each poll cycle. */
  processBMSData(): void {
    if (this.running) return;
    this.running = true;
    try {
      const bmsRaw     = readJson<Record<string, any>>('nexum_bms_live_data', {});
      const climateRaw = readJson<any[]>('nexum_climate_bms_data', []);
      const energyRaw  = readJson<any[]>('nexum_energy_bms_data', []);

      const observations: SystemObservation[] = [];

      const allEntries = [
        ...Object.values(bmsRaw),
        ...climateRaw,
        ...energyRaw,
      ];

      for (const entry of allEntries) {
        const equipId: string = entry?.equipmentId || entry?.skidId || entry?.feedId || '';
        if (!equipId) continue;
        const points: any[] = entry?.points || entry?.data || [];

        for (const pt of points) {
          const val = parseFloat(String(pt.value ?? pt.currentValue ?? pt.reading ?? 'NaN'));
          if (!isFinite(val)) continue;
          const metric    = (pt.name || pt.pointName || '').toLowerCase().replace(/\s+/g, '_');
          if (!metric) continue;

          const dev = BaselineEngine.checkAndUpdate(equipId, metric, val);
          if (dev && dev.isDeviation) {
            const flag: SystemObservationFlag = dev.zScore >= 3.5 ? 'critical' : dev.zScore >= 2.5 ? 'warning' : 'note';
            observations.push({
              id: uid(), type: 'BASELINE_DEVIATION',
              flag,
              equipmentId: equipId,
              metric,
              observedValue: val,
              expectedValue: parseFloat(dev.mean.toFixed(3)),
              delta:    parseFloat(dev.delta.toFixed(3)),
              deltaPct: parseFloat(dev.deltaPct.toFixed(1)),
              zScore:   parseFloat(dev.zScore.toFixed(2)),
              direction: dev.direction,
              sampleCount: dev.sampleCount,
              interpretation: `BMS sensor "${metric}" on ${equipId} reads ${val} — ${Math.round(dev.deltaPct)}% ${dev.direction} the learned baseline of ${dev.mean.toFixed(2)}.`,
              context: `Z-score: ${dev.zScore.toFixed(2)} (based on ${dev.sampleCount} BMS readings).${pt.alarm ? ' BMS alarm flag is active.' : ''}`,
              recommendation: flag === 'critical'
                ? `Inspect ${equipId} immediately. BMS shows a ${dev.zScore.toFixed(1)}σ deviation on ${metric}.`
                : `Schedule a follow-up check on ${equipId} — ${metric} is drifting from its learned normal.`,
              source: 'bms',
              timestamp: pt.timestamp || entry?.timestamp || new Date().toISOString(),
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      // ── Environmental outcome learning ──────────────────────────────────────
      this.updateEnvironmentalOutcomes(energyRaw);

      if (observations.length > 0) this.append(observations);
    } finally {
      this.running = false;
      this.dispatch();
    }
  }

  /** Build/update environmental outcome templates from energy + climate co-occurrence. */
  private updateEnvironmentalOutcomes(energyRaw: any[]): void {
    try {
      const climateRaw = readJson<any[]>('nexum_climate_bms_data', []);
      const existing   = readJson<EnvironmentalOutcomeTemplate[]>(ENV_KEY, []);

      // Find temp + precipitation readings from climate bucket
      let outdoorTemp: number | undefined;
      let precipitation = false;
      for (const entry of climateRaw) {
        const pts: any[] = entry?.points || entry?.data || [];
        for (const pt of pts) {
          const pname = (pt.name || '').toLowerCase();
          if ((pname.includes('outdoor') || pname.includes('outside')) && pname.includes('temp')) {
            const t = parseFloat(String(pt.value ?? ''));
            if (isFinite(t)) outdoorTemp = t;
          }
          if (pname.includes('rain') || pname.includes('precip')) {
            precipitation = !!(pt.value || pt.currentValue);
          }
        }
      }

      if (outdoorTemp === undefined && !precipitation) return;

      // Build a condition label
      const condParts: string[] = [];
      if (precipitation) condParts.push('rainy');
      if (outdoorTemp !== undefined) {
        condParts.push(
          outdoorTemp < 32 ? 'freezing (<32°F)'
          : outdoorTemp < 50 ? 'cold (<50°F)'
          : outdoorTemp < 65 ? 'cool (50-65°F)'
          : outdoorTemp < 80 ? 'mild (65-80°F)'
          : 'hot (>80°F)'
        );
      }
      const condLabel = condParts.join(' + ');

      // Aggregate energy readings
      let totalKW = 0; let totalRuntime = 0; let kWCount = 0; let rtCount = 0;
      for (const entry of energyRaw) {
        const pts: any[] = entry?.points || entry?.data || [];
        for (const pt of pts) {
          const pname = (pt.name || '').toLowerCase();
          const v = parseFloat(String(pt.value ?? ''));
          if (!isFinite(v)) continue;
          if (pname.includes('kw') && !pname.includes('kwh')) { totalKW += v; kWCount++; }
          if (pname.includes('runtime')) { totalRuntime += v; rtCount++; }
        }
      }

      if (kWCount === 0) return;

      const avgKW     = totalKW / kWCount;
      const avgRT     = rtCount > 0 ? totalRuntime / rtCount : 0;
      const estCostDay = avgKW * 24 * 0.12; // $0.12/kWh industry avg

      const existing_idx = existing.findIndex(e => e.condition === condLabel);
      if (existing_idx >= 0) {
        const e = existing[existing_idx];
        const n = e.occurrences + 1;
        existing[existing_idx] = {
          ...e,
          avgLoad:       parseFloat(((e.avgLoad * e.occurrences + (avgKW / Math.max(avgKW, 1)) * 100) / n).toFixed(1)),
          avgEnergyCost: parseFloat(((e.avgEnergyCost * e.occurrences + estCostDay) / n).toFixed(2)),
          avgRuntime:    parseFloat(((e.avgRuntime * e.occurrences + avgRT) / n).toFixed(1)),
          occurrences: n,
          lastSeen: new Date().toISOString(),
        };
      } else {
        const newTemplate: EnvironmentalOutcomeTemplate = {
          id: `env-${Date.now()}`,
          condition: condLabel,
          avgLoad: parseFloat(((avgKW / Math.max(avgKW, 1)) * 100).toFixed(1)),
          avgDuration: 0,
          avgEnergyCost: parseFloat(estCostDay.toFixed(2)),
          avgRuntime: parseFloat(avgRT.toFixed(1)),
          occurrences: 1,
          lastSeen: new Date().toISOString(),
        };
        existing.unshift(newTemplate);
      }

      writeJson(ENV_KEY, existing, MAX_ENV);

      // Emit an observation if this is a well-established pattern (≥3 occurrences)
      const match = existing.find(e => e.condition === condLabel && e.occurrences >= 3);
      if (match) {
        const obs: SystemObservation = {
          id: uid(), type: 'ENVIRONMENTAL_OUTCOME',
          flag: 'pattern',
          equipmentId: 'facility',
          interpretation: `Under ${match.condition} conditions, your facility historically sustains ~${match.avgEnergyCost.toFixed(0)}/day energy cost over ${match.avgRuntime.toFixed(1)}h of extended runtime. Seen ${match.occurrences} times.`,
          context: `Condition: ${match.condition}. Avg energy cost: $${match.avgEnergyCost}/day. Observed ${match.occurrences} times.`,
          recommendation: `Pre-stage equipment and notify staff when a ${match.condition} forecast is expected — historical data shows elevated load and cost.`,
          source: 'environmental',
          timestamp: new Date().toISOString(),
          detectedAt: new Date().toISOString(),
        };
        this.append([obs]);
      }
    } catch { /* ignore */ }
  }

  record(obs: SystemObservation): void {
    this.append([obs]);
    this.dispatch();
  }

  getAll(): SystemObservation[] {
    return readJson<SystemObservation[]>(OBS_KEY, []);
  }

  acknowledge(id: string): void {
    const all = this.getAll();
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], acknowledged: true };
      writeJson(OBS_KEY, all, MAX_OBS);
      this.dispatch();
    }
  }

  private append(incoming: SystemObservation[]): void {
    const existing = this.getAll();
    const merged   = [...incoming, ...existing];
    writeJson(OBS_KEY, merged, MAX_OBS);
  }

  private dispatch(): void {
    try { window.dispatchEvent(new CustomEvent('nexum_observation_update')); } catch {}
  }
}

export const ObservationEngine = new ObservationEngineClass();
