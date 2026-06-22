/**
 * BaselineEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Learns what "normal" looks like for each piece of equipment across every
 * tracked metric. Uses Welford's online algorithm so baselines stay up-to-date
 * as each new log or BMS reading arrives — no batch re-processing needed.
 *
 * Condition buckets let the engine learn separate normals for different contexts:
 *   - "cold_outdoor" (outdoor temp < 40°F)
 *   - "warm_outdoor" (outdoor temp 60-90°F)
 *   - "post_blowdown"
 *   - "peak_occupancy"
 *   - "off_hours"
 *   - "rainy"
 *   - default (no specific condition)
 *
 * Deviation detection only starts once MIN_SAMPLES readings are recorded so
 * early noise does not generate false positives.
 *
 * Storage: nexum_baselines (localStorage)
 */

const STORAGE_KEY   = 'nexum_baselines';
const MIN_SAMPLES   = 8;   // minimum readings before deviation detection activates
const MAX_BASELINES = 2000;

export interface BaselineRecord {
  equipmentId:  string;
  metric:       string;
  condition:    string;
  n:            number;   // sample count
  mean:         number;
  M2:           number;   // sum of squared deviations (Welford)
  min:          number;
  max:          number;
  lastUpdated:  string;
}

export interface DeviationResult {
  isDeviation:   boolean;
  zScore:        number;        // how many standard deviations from mean
  delta:         number;        // absolute difference from mean
  deltaPct:      number;        // % difference from mean
  mean:          number;
  stddev:        number;
  sampleCount:   number;
  direction:     'above' | 'below' | 'none';
}

function key(equipmentId: string, metric: string, condition: string): string {
  return `${equipmentId}::${metric}::${condition}`;
}

class BaselineEngineClass {
  private cache: Map<string, BaselineRecord> | null = null;

  private load(): Map<string, BaselineRecord> {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { this.cache = new Map(); return this.cache; }
      const arr: BaselineRecord[] = JSON.parse(raw);
      this.cache = new Map(arr.map(r => [key(r.equipmentId, r.metric, r.condition), r]));
    } catch {
      this.cache = new Map();
    }
    return this.cache;
  }

  private persist(): void {
    try {
      const map = this.load();
      let arr = Array.from(map.values());
      // Cap total stored baselines — evict least-sampled
      if (arr.length > MAX_BASELINES) {
        arr = arr.sort((a, b) => b.n - a.n).slice(0, MAX_BASELINES);
        this.cache = new Map(arr.map(r => [key(r.equipmentId, r.metric, r.condition), r]));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch { /* quota */ }
  }

  /** Feed one reading into the baseline. Call after every log submission or BMS poll. */
  update(equipmentId: string, metric: string, value: number, condition = 'default'): void {
    if (!isFinite(value)) return;
    const map  = this.load();
    const k    = key(equipmentId, metric, condition);
    const rec  = map.get(k);

    if (!rec) {
      map.set(k, {
        equipmentId, metric, condition,
        n: 1, mean: value, M2: 0,
        min: value, max: value,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Welford's online update
      rec.n++;
      const delta  = value - rec.mean;
      rec.mean    += delta / rec.n;
      const delta2 = value - rec.mean;
      rec.M2      += delta * delta2;
      rec.min      = Math.min(rec.min, value);
      rec.max      = Math.max(rec.max, value);
      rec.lastUpdated = new Date().toISOString();
      map.set(k, rec);
    }
    this.persist();
  }

  /** Get the stored baseline record (null if not enough data yet). */
  get(equipmentId: string, metric: string, condition = 'default'): BaselineRecord | null {
    const rec = this.load().get(key(equipmentId, metric, condition));
    if (!rec || rec.n < MIN_SAMPLES) return null;
    return rec;
  }

  stddev(rec: BaselineRecord): number {
    if (rec.n < 2) return 0;
    return Math.sqrt(rec.M2 / (rec.n - 1));
  }

  /**
   * Check whether a new reading deviates from the learned baseline.
   * Returns null if there is not enough historical data yet.
   */
  check(equipmentId: string, metric: string, value: number, condition = 'default'): DeviationResult | null {
    const rec = this.get(equipmentId, metric, condition);
    if (!rec) return null;

    const sd      = this.stddev(rec);
    const delta   = value - rec.mean;
    const deltaPct = rec.mean !== 0 ? Math.abs(delta / rec.mean) * 100 : 0;
    const zScore  = sd > 0 ? Math.abs(delta / sd) : 0;

    return {
      isDeviation: zScore >= 2.0,   // ≥2 standard deviations = deviation
      zScore,
      delta,
      deltaPct,
      mean:        rec.mean,
      stddev:      sd,
      sampleCount: rec.n,
      direction:   delta > 0 ? 'above' : delta < 0 ? 'below' : 'none',
    };
  }

  /**
   * Convenience: update baseline AND immediately check for deviation.
   * The order is: check first (against prior baseline), then update so the new
   * value contributes to future checks without biasing the current one.
   */
  checkAndUpdate(equipmentId: string, metric: string, value: number, condition = 'default'): DeviationResult | null {
    const result = this.check(equipmentId, metric, value, condition);
    this.update(equipmentId, metric, value, condition);
    return result;
  }

  /** Seed baselines from existing facility logs on startup. */
  seedFromLogs(): void {
    try {
      const raw = localStorage.getItem('nexum_facility_logs');
      if (!raw) return;
      const logs: any[] = JSON.parse(raw);
      for (const log of logs) {
        const eid = log.equipmentId || log.equipment_id;
        if (!eid) continue;
        const readings = log.readings || log.metrics || log.values || {};
        for (const [metric, val] of Object.entries(readings)) {
          const n = parseFloat(String(val));
          if (isFinite(n)) this.update(eid, metric, n);
        }
        // Top-level numeric fields that look like metric readings
        const KNOWN_METRICS = ['pressure', 'temperature', 'humidity', 'runtime', 'efficiency', 'co2', 'flowRate', 'voltage', 'current', 'kw', 'kwh'];
        for (const m of KNOWN_METRICS) {
          const v = log[m];
          if (v !== undefined && v !== null && v !== '') {
            const n = parseFloat(String(v));
            if (isFinite(n)) this.update(eid, m, n);
          }
        }
      }
    } catch { /* ignore */ }
  }

  /** Derive condition label from context clues in a log or BMS point. */
  static inferCondition(context: { outdoorTemp?: number; precipitation?: boolean; logType?: string; hour?: number }): string {
    const { outdoorTemp, precipitation, logType, hour } = context;
    if (logType && ['blowdown', 'chemical_feed', 'flush'].some(t => (logType || '').toLowerCase().includes(t))) return 'post_maintenance';
    if (precipitation) return 'rainy';
    if (outdoorTemp !== undefined) {
      if (outdoorTemp < 32)  return 'freezing';
      if (outdoorTemp < 50)  return 'cold_outdoor';
      if (outdoorTemp < 70)  return 'mild_outdoor';
      if (outdoorTemp < 85)  return 'warm_outdoor';
      return 'hot_outdoor';
    }
    if (hour !== undefined) {
      if (hour >= 7 && hour < 18) return 'peak_occupancy';
      return 'off_hours';
    }
    return 'default';
  }
}

export const BaselineEngine = new BaselineEngineClass();
