// ── Water chemistry reference ranges for facility water systems ──────────────
export const WATER_PARAM_RANGES: Record<string, { min: number; max: number; unit: string; description: string }> = {
  'pH':                       { min: 7.0,   max: 8.5,   unit: 'pH',          description: 'Acidity/alkalinity balance' },
  'Hardness':                 { min: 50,    max: 200,   unit: 'ppm CaCO₃',   description: 'Calcium and magnesium content' },
  'Conductivity':             { min: 100,   max: 500,   unit: 'µS/cm',       description: 'Total dissolved solids indicator' },
  'TDS':                      { min: 100,   max: 500,   unit: 'ppm',         description: 'Total dissolved solids' },
  'Turbidity':                { min: 0,     max: 1.0,   unit: 'NTU',         description: 'Water clarity' },
  'Alkalinity':               { min: 100,   max: 300,   unit: 'ppm CaCO₃',   description: 'Buffering capacity' },
  'Chlorine':                 { min: 0.2,   max: 4.0,   unit: 'ppm',         description: 'Biocide residual' },
  'Iron':                     { min: 0,     max: 0.3,   unit: 'ppm',         description: 'Iron concentration (corrosion indicator)' },
  'Dissolved Oxygen':         { min: 0,     max: 0.007, unit: 'ppm',         description: 'Dissolved O₂ (corrosion risk)' },
  'Langelier Index':          { min: -0.5,  max: 0.5,   unit: 'LSI',         description: 'Scale/corrosion balance' },
  'Cycles of Concentration':  { min: 2,     max: 5,     unit: 'cycles',      description: 'Cooling tower concentration ratio' },
  'Silica':                   { min: 0,     max: 150,   unit: 'ppm',         description: 'Scaling potential' },
  'Phosphate':                { min: 10,    max: 40,    unit: 'ppm',         description: 'Scale/corrosion inhibitor' },
  'Molybdate':                { min: 20,    max: 50,    unit: 'ppm',         description: 'Corrosion inhibitor tracer' },
};

export const WATER_SAMPLE_SOURCES = [
  { value: 'boiler_feed',          label: 'Boiler Feed Water' },
  { value: 'boiler_blowdown',      label: 'Boiler Blowdown' },
  { value: 'condensate_return',    label: 'Condensate Return' },
  { value: 'chiller_loop',         label: 'Chiller Loop' },
  { value: 'chiller_makeup',       label: 'Chiller Makeup Water' },
  { value: 'cooling_tower_sump',   label: 'Cooling Tower Sump' },
  { value: 'cooling_tower_blowdown', label: 'Cooling Tower Blowdown' },
  { value: 'condenser_supply',     label: 'Condenser Water Supply' },
  { value: 'condenser_return',     label: 'Condenser Water Return' },
  { value: 'makeup_water',         label: 'Makeup Water / City Feed' },
  { value: 'closed_loop_heating',  label: 'Closed Loop Heating' },
  { value: 'discharge',            label: 'Discharge Point' },
  { value: 'other',                label: 'Other' },
];

export interface WaterParamStats {
  parameter: string;
  unit: string;
  sampleCount: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  confidenceScore: number;
  status: 'ok' | 'warning' | 'out_of_range';
  latestValue: number;
  latestDate: string;
}

export function computeWaterStats(records: Array<{ parameter: string; value: number; unit: string; status: string; sampleDate: string }>): WaterParamStats[] {
  const byParam = new Map<string, typeof records>();
  for (const r of records) {
    if (!byParam.has(r.parameter)) byParam.set(r.parameter, []);
    byParam.get(r.parameter)!.push(r);
  }
  return Array.from(byParam.entries()).map(([param, recs]) => {
    const values = recs.map(r => r.value);
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sampleFactor = Math.min(1, n / 10);
    const cvFactor = mean > 0 ? Math.max(0, 1 - (stdDev / mean) * 2) : 0.5;
    const confidenceScore = Math.round(sampleFactor * 70 + cvFactor * 30);
    const sorted = [...recs].sort((a, b) => a.sampleDate.localeCompare(b.sampleDate));
    const latest = sorted[sorted.length - 1];
    const violations = recs.filter(r => r.status === 'violation').length;
    const warnings = recs.filter(r => r.status === 'warning').length;
    const status: WaterParamStats['status'] = violations > 0 ? 'out_of_range' : warnings > 0 ? 'warning' : 'ok';
    return { parameter: param, unit: recs[0].unit, sampleCount: n, mean, stdDev, min, max, confidenceScore, status, latestValue: latest.value, latestDate: latest.sampleDate };
  });
}

export interface WaterHealthStatus {
  score: number;
  status: 'healthy' | 'caution' | 'treatment_needed' | 'no_data';
  parameterCount: number;
  violationCount: number;
  warningCount: number;
  treatmentWOsCompleted: number;
  treatmentPMsCompleted: number;
  recommendations: string[];
  lastSampleDate?: string;
}

export function computeWaterHealth(): WaterHealthStatus {
  const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
  const WATER_TYPES = ['water_quality', 'wastewater', 'stormwater', 'groundwater'];
  const envRecords = safe(() => {
    const raw = localStorage.getItem('nexum_env_monitoring');
    if (!raw) return [];
    return (JSON.parse(raw) as any[]).filter(r => WATER_TYPES.includes(r.testType));
  }, [] as any[]);

  if (envRecords.length === 0) {
    return { score: 0, status: 'no_data', parameterCount: 0, violationCount: 0, warningCount: 0, treatmentWOsCompleted: 0, treatmentPMsCompleted: 0, recommendations: ['Log water chemistry samples in Environmental Monitoring to track treatment effectiveness.'] };
  }

  const workOrders = safe(() => JSON.parse(localStorage.getItem('nexum_work_orders') || '[]') as any[], []);
  const violations = safe(() => JSON.parse(localStorage.getItem('nexum_violation_events') || '[]') as any[], []);
  const TREATMENT_KW = /water\s*treat|chemical\s*treat|water\s*chem|biocide|inhibitor|blowdown|descal|corrosion|scale\s*inhib|microbi/i;

  const cutoff = Date.now() - 90 * 86400000;
  const useRecords = envRecords.filter((r: any) => new Date(r.sampleDate).getTime() > cutoff);
  const base = useRecords.length > 0 ? useRecords : envRecords;

  const violationCount = base.filter((r: any) => r.status === 'violation').length;
  const warningCount = base.filter((r: any) => r.status === 'warning').length;
  const totalRecords = base.length;
  const treatmentWOs = workOrders.filter((wo: any) => TREATMENT_KW.test(`${wo.title} ${wo.description}`));
  const treatmentWOsCompleted = treatmentWOs.filter((wo: any) => wo.status === 'completed').length;
  const treatmentPMs = violations.filter((v: any) => TREATMENT_KW.test(`${v.type} ${v.description}`) && v.type === 'PM_COMPLETED');

  let score = 100;
  if (totalRecords > 0) {
    score -= (violationCount / totalRecords) * 60;
    score -= (warningCount / totalRecords) * 25;
  }
  if (treatmentWOsCompleted > 0) score = Math.min(100, score + 10);
  if (treatmentPMs.length > 0) score = Math.min(100, score + 5);
  score = Math.max(0, Math.round(score));

  const status: WaterHealthStatus['status'] = score >= 80 ? 'healthy' : score >= 50 ? 'caution' : 'treatment_needed';
  const recommendations: string[] = [];
  const violationParams = [...new Set(base.filter((r: any) => r.status === 'violation').map((r: any) => r.parameter as string))];
  const warningParams = [...new Set(base.filter((r: any) => r.status === 'warning').map((r: any) => r.parameter as string))];
  if (violationParams.length > 0) recommendations.push(`Chemical treatment needed: ${violationParams.slice(0, 3).join(', ')} exceed regulatory limits.`);
  if (warningParams.length > 0) recommendations.push(`Monitor closely: ${warningParams.slice(0, 3).join(', ')} approaching action levels.`);
  if (treatmentWOs.some((wo: any) => ['open', 'on_hold'].includes(wo.status))) recommendations.push('Open water treatment work orders pending — prioritize completion.');
  if (base.length < 3) recommendations.push('Increase sampling frequency — minimum 3 samples needed for confident water chemistry assessment.');
  if (score >= 80 && recommendations.length === 0) recommendations.push('Water chemistry within acceptable range. Continue scheduled treatment and PM program.');
  const sortedDates = base.map((r: any) => r.sampleDate as string).sort();
  return { score, status, parameterCount: new Set(base.map((r: any) => r.parameter)).size, violationCount, warningCount, treatmentWOsCompleted, treatmentPMsCompleted: treatmentPMs.length, recommendations, lastSampleDate: sortedDates[sortedDates.length - 1] };
}
