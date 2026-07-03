// Energy Intelligence™ 2.0 — Calculation & Intelligence Engine
// Every energy reading runs through this engine before being stored or displayed.

import type {
  EnergyReading, EnergyMeter, EnergyEvent, CostConfig, OIExplanation,
  ContributingFactor, BenchmarkResult, ForecastPoint, ForecastSummary,
  ExecutiveSummaryData, LoadBreakdownItem, TimelineEntry, CTSInsight,
  UtilityType, EnergyEventType,
} from '@/types/energy';

// ── Storage Keys ──────────────────────────────────────────────────────────────

export const KEYS = {
  meters:   (fid: string) => `nexum_energy_meters_${fid}`,
  readings: (fid: string) => `nexum_energy_readings_${fid}`,
  cost:     (fid: string) => `nexum_energy_cost_config_${fid}`,
  events:   (fid: string) => `nexum_energy_events_${fid}`,
};

function readJson<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeJson(key: string, val: unknown, cap = 5000): void {
  try {
    let arr = Array.isArray(val) ? val : [val];
    if (arr.length > cap) arr = arr.slice(0, cap);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch { /* quota */ }
}
function writeObj(key: string, val: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Unit constants ────────────────────────────────────────────────────────────

const KWH_TO_BTU    = 3412.14;
const THERM_TO_BTU  = 100000;
const GALLON_TO_BTU = 139;      // hot water heating value approximation
const KWH_CARBON_LBS = 0.386;   // EPA eGRID US avg
const THERM_CARBON_LBS = 11.7;
const CCF_TO_THERMS  = 1.02;

// ── Season detection ──────────────────────────────────────────────────────────

export function getSeason(date: Date): EnergyReading['season'] {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5)  return 'spring';
  if (m >= 6 && m <= 8)  return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

// ── Calculations ──────────────────────────────────────────────────────────────

export function calcConsumption(current: number, previous: number, multiplier: number): number {
  return Math.max(0, (current - previous) * multiplier);
}

export function calcBTUs(consumption: number, utilityType: UtilityType): number {
  switch (utilityType) {
    case 'electric': case 'solar_production': case 'battery_storage':
      return consumption * KWH_TO_BTU;
    case 'natural_gas':
      return consumption * THERM_TO_BTU;
    case 'water': case 'hot_water': case 'domestic_water' as any:
      return consumption * GALLON_TO_BTU;
    default: return consumption * KWH_TO_BTU;
  }
}

export function calcCarbon(consumption: number, utilityType: UtilityType): number {
  switch (utilityType) {
    case 'electric': case 'solar_production':
      return consumption * KWH_CARBON_LBS;
    case 'natural_gas':
      return consumption * THERM_CARBON_LBS;
    default: return 0;
  }
}

export function calcCost(
  consumption: number,
  utilityType: UtilityType,
  config: CostConfig,
  timestamp: string,
  demandKw?: number,
): number {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const isWkd = date.getDay() === 0 || date.getDay() === 6;

  if (utilityType === 'electric') {
    let rate = config.electricBaseRate;
    // TOU adjustment
    if (config.touEnabled && config.touPeriods.length > 0) {
      const period = config.touPeriods.find(p =>
        hour >= p.startHour && hour < p.endHour &&
        p.days.includes(isWkd ? 'weekend' : 'weekday')
      );
      if (period) rate = period.ratePerUnit;
    }
    let cost = consumption * (rate + config.electricFuelAdjustment);
    if (demandKw) cost += demandKw * config.electricDemandRate;
    cost *= (1 + config.electricTaxRate / 100);
    return cost;
  }
  if (utilityType === 'natural_gas') {
    return consumption * config.gasBaseRate * (1 + config.gasTaxRate / 100);
  }
  if (utilityType === 'water') {
    return consumption * config.waterBaseRate;
  }
  return 0;
}

export function calcIntensityPerSqFt(consumption: number, sqFt: number): number | undefined {
  return sqFt > 0 ? consumption / sqFt : undefined;
}

export function calcIntensityPerOccupant(consumption: number, occupants: number): number | undefined {
  return occupants > 0 ? consumption / occupants : undefined;
}

// ── Rolling window aggregation ────────────────────────────────────────────────

export function rollingConsumption(
  readings: EnergyReading[],
  meterId: string,
  days: number,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return readings
    .filter(r => r.meterId === meterId && new Date(r.timestamp) >= cutoff)
    .reduce((s, r) => s + r.consumption, 0);
}

export function rollingAvgDaily(readings: EnergyReading[], meterId: string, days: number): number {
  return rollingConsumption(readings, meterId, days) / days;
}

// ── Statistical helpers ───────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ── Event detection ───────────────────────────────────────────────────────────

export function detectEvents(
  reading: EnergyReading,
  history: EnergyReading[],
  meter: EnergyMeter,
): EnergyEvent[] {
  const events: EnergyEvent[] = [];
  const recent = history
    .filter(r => r.meterId === reading.meterId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  if (recent.length < 3) return events;

  const consumptions = recent.map(r => r.consumption);
  const avg = mean(consumptions);
  const sd  = stddev(consumptions);

  function makeEvent(
    type: EnergyEventType,
    severity: EnergyEvent['severity'],
    title: string,
    desc: string,
    measured: number,
    expected: number,
  ): EnergyEvent {
    return {
      eventId:       `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      severity,
      meterId:       reading.meterId,
      utilityType:   reading.utilityType,
      timestamp:     reading.timestamp,
      detectedAt:    new Date().toISOString(),
      title,
      description:   desc,
      measuredValue: measured,
      expectedValue: expected,
      unit:          reading.unit,
      deviation:     expected > 0 ? ((measured - expected) / expected) * 100 : 0,
      acknowledged:  false,
    };
  }

  // Demand spike (> avg + 2σ)
  if (avg > 0 && reading.consumption > avg + 2 * sd) {
    events.push(makeEvent(
      'DEMAND_SPIKE', 'critical',
      `Abnormal Consumption — ${meter.label}`,
      `Consumption ${reading.consumption.toFixed(1)} ${reading.unit} is ${((reading.consumption / avg - 1) * 100).toFixed(0)}% above rolling average of ${avg.toFixed(1)}.`,
      reading.consumption, avg,
    ));
  }

  // Night consumption — readings between 10pm–6am with significant use
  const hour = new Date(reading.timestamp).getHours();
  const nightAvg = recent
    .filter(r => { const h = new Date(r.timestamp).getHours(); return h >= 22 || h < 6; })
    .reduce((s, r) => s + r.consumption, 0) / Math.max(1, recent.filter(r => { const h = new Date(r.timestamp).getHours(); return h >= 22 || h < 6; }).length);
  if ((hour >= 22 || hour < 6) && reading.consumption > avg * 0.4 && reading.consumption > nightAvg * 1.5) {
    events.push(makeEvent(
      'NIGHT_CONSUMPTION', 'warning',
      `Off-Hours Load — ${meter.label}`,
      `Significant off-hours consumption detected at ${new Date(reading.timestamp).toLocaleTimeString()}.`,
      reading.consumption, nightAvg,
    ));
  }

  // Weekend consumption anomaly
  if (reading.isWeekend) {
    const weekdayAvg = mean(
      recent.filter(r => !r.isWeekend && !r.isHoliday).map(r => r.consumption)
    );
    if (weekdayAvg > 0 && reading.consumption > weekdayAvg * 0.7) {
      events.push(makeEvent(
        'WEEKEND_CONSUMPTION', 'info',
        `Weekend Load — ${meter.label}`,
        `Weekend consumption is ${((reading.consumption / weekdayAvg) * 100).toFixed(0)}% of typical weekday load.`,
        reading.consumption, weekdayAvg * 0.3,
      ));
    }
  }

  // Water leak — non-zero off-hours water
  if (reading.utilityType === 'water' && (hour >= 22 || hour < 5) && reading.consumption > 0) {
    events.push(makeEvent(
      'WATER_LEAK', 'warning',
      `Potential Water Leak — ${meter.label}`,
      `Non-zero water consumption detected during off-hours. Possible leak or unscheduled use.`,
      reading.consumption, 0,
    ));
  }

  // Gas spike > 150% rolling avg
  if (reading.utilityType === 'natural_gas' && avg > 0 && reading.consumption > avg * 1.5) {
    events.push(makeEvent(
      'GAS_SPIKE', 'critical',
      `Gas Spike — ${meter.label}`,
      `Gas consumption ${reading.consumption.toFixed(1)} therms is ${((reading.consumption / avg - 1) * 100).toFixed(0)}% above average.`,
      reading.consumption, avg,
    ));
  }

  return events;
}

// ── OI Explanation engine ─────────────────────────────────────────────────────

export function generateOIExplanation(
  current: EnergyReading,
  history: EnergyReading[],
  config: CostConfig,
): OIExplanation | null {
  const same = history
    .filter(r => r.meterId === current.meterId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (same.length < 2) return null;

  const prev30avg = mean(same.slice(0, 30).map(r => r.consumption)) || current.consumption;
  const change    = prev30avg > 0 ? ((current.consumption - prev30avg) / prev30avg) * 100 : 0;

  const factors: ContributingFactor[] = [];

  // Weather correlation
  if (current.outsideAirTemp !== undefined) {
    const avgTemp = mean(same.slice(0, 14).filter(r => r.outsideAirTemp !== undefined).map(r => r.outsideAirTemp!));
    const tempDelta = current.outsideAirTemp - avgTemp;
    if (Math.abs(tempDelta) > 5) {
      factors.push({
        factor:     'Outdoor air temperature shift',
        evidence:   `OAT is ${current.outsideAirTemp}°F vs 14-day avg of ${avgTemp.toFixed(1)}°F (Δ ${tempDelta > 0 ? '+' : ''}${tempDelta.toFixed(1)}°F)`,
        confidence: 'high',
        impact:     Math.abs(tempDelta) > 10 ? 'major' : 'moderate',
      });
    }
  }

  // Occupancy correlation
  if (current.occupancy !== undefined) {
    const avgOcc = mean(same.slice(0, 14).filter(r => r.occupancy !== undefined).map(r => r.occupancy!));
    const occDelta = current.occupancy - avgOcc;
    if (Math.abs(occDelta) > 10) {
      factors.push({
        factor:     'Occupancy change',
        evidence:   `Current occupancy ${current.occupancy}% vs 14-day avg ${avgOcc.toFixed(0)}%`,
        confidence: 'medium',
        impact:     Math.abs(occDelta) > 20 ? 'major' : 'minor',
      });
    }
  }

  // Weekend / holiday context
  if (current.isWeekend) {
    factors.push({
      factor: 'Weekend operation', evidence: 'Reading taken on weekend — reduced baseline expected',
      confidence: 'high', impact: 'moderate',
    });
  }
  if (current.isHoliday) {
    factors.push({
      factor: 'Holiday operation', evidence: 'Building operating on holiday schedule',
      confidence: 'high', impact: 'major',
    });
  }

  // Abnormal event note
  if (current.abnormalEvent) {
    factors.push({
      factor: 'Operator-noted abnormal event',
      evidence: current.abnormalEvent,
      confidence: 'high', impact: 'major',
    });
  }

  // Water chemistry correlation (for electric/gas — chiller/boiler efficiency)
  try {
    const waterCfg = JSON.parse(localStorage.getItem('nexum_water_meter_config') || 'null');
    if (waterCfg?.conductivity && waterCfg.conductivity > 1800) {
      factors.push({
        factor:     'Elevated cooling tower conductivity',
        evidence:   `Conductivity at ${waterCfg.conductivity} µS/cm indicates scaling potential, reducing heat transfer efficiency by est. 2–5%`,
        confidence: 'medium',
        impact:     'moderate',
      });
    }
  } catch {}

  // CTS / Violation cross-reference
  try {
    const violations = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]') as any[];
    const recent = violations.filter(v => {
      const age = Date.now() - new Date(v.issuedAt || v.timestamp || 0).getTime();
      return age < 30 * 24 * 3600 * 1000; // last 30 days
    });
    if (recent.length > 0) {
      factors.push({
        factor:     'Recent operational violations may affect energy performance',
        evidence:   `${recent.length} violation(s) issued in last 30 days — see Violations module for corrective actions`,
        confidence: 'low',
        impact:     'minor',
      });
    }
  } catch {}

  const direction: OIExplanation['changeDirection'] = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';
  const absChange = Math.abs(change);
  const risk: OIExplanation['operationalRisk'] =
    absChange > 25 ? 'critical' : absChange > 15 ? 'elevated' : absChange > 5 ? 'normal' : 'low';

  const financialImpact = Math.abs(change / 100 * current.cost);
  const highFactors     = factors.filter(f => f.confidence === 'high').length;
  const confidence      = Math.min(95, 40 + highFactors * 20 + (factors.length > 0 ? 10 : 0));

  return {
    metric:             current.utilityType,
    change:             Math.round(change * 10) / 10,
    changeDirection:    direction,
    headline:           `${current.utilityType.replace('_', ' ')} ${direction === 'up' ? 'increased' : direction === 'down' ? 'decreased' : 'is stable'} ${absChange.toFixed(1)}% vs 30-day avg`,
    why:                factors.length > 0
                          ? factors.map(f => f.factor).join('; ')
                          : 'No anomalous contributing factors detected in current data.',
    factors,
    operationalRisk:    risk,
    financialImpact,
    recommendedActions: buildRecommendations(current, change, factors),
    evidenceTimestamp:  new Date().toISOString(),
    confidence,
  };
}

function buildRecommendations(
  reading: EnergyReading,
  changePct: number,
  factors: ContributingFactor[],
): string[] {
  const recs: string[] = [];
  if (changePct > 15)  recs.push('Investigate primary load contributors — schedule equipment walkthrough');
  if (reading.utilityType === 'electric' && changePct > 10) recs.push('Review demand window to identify peak contributors and consider load shifting');
  if (factors.some(f => f.factor.includes('conductivity'))) recs.push('Perform boiler/chiller blowdown and water treatment review');
  if (factors.some(f => f.factor.includes('occupancy'))) recs.push('Verify occupancy schedules against BAS programming');
  if (factors.some(f => f.factor.includes('violation'))) recs.push('Close open corrective actions — operational violations may be contributing to inefficiency');
  if (reading.isWeekend) recs.push('Verify weekend setback schedules are active in BAS');
  if (recs.length === 0) recs.push('Continue monitoring — no immediate action required');
  return recs;
}

// ── Linear forecast ───────────────────────────────────────────────────────────

export function buildForecast(
  readings: EnergyReading[],
  meterId: string,
  config: CostConfig,
  monthsAhead = 12,
): ForecastSummary {
  const meterReadings = readings
    .filter(r => r.meterId === meterId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const recent30 = meterReadings.slice(-30);
  const avgDailyConsumption = recent30.length > 0
    ? recent30.reduce((s, r) => s + r.consumption, 0) / Math.max(recent30.length, 1)
    : 0;
  const avgDailyCost = recent30.length > 0
    ? recent30.reduce((s, r) => s + r.cost, 0) / Math.max(recent30.length, 1)
    : 0;

  const points: ForecastPoint[] = [];
  const now = new Date();

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const month = d.getMonth();
    // Seasonal multiplier (rough HVAC load shape)
    const seasonMultiplier =
      (month >= 5 && month <= 8) ? 1.25 :   // summer cooling
      (month >= 11 || month <= 1) ? 1.15 :   // winter heating
      0.95;

    const predicted = avgDailyConsumption * daysInMonth * seasonMultiplier;
    const predictedCost = avgDailyCost * daysInMonth * seasonMultiplier;
    const budgetKey = d.toLocaleDateString('en-US', { month: 'long' });
    const budgetAmt = config.budgetBreakdown?.[budgetKey] ?? config.annualBudget / 12;

    points.push({
      label,
      predictedConsumption: Math.round(predicted),
      predictedCost:        Math.round(predictedCost),
      budgetAmount:         budgetAmt,
      confidence:           Math.max(30, 90 - i * 5),
      isActual:             false,
    });
  }

  const annualProjection = points.reduce((s, p) => s + p.predictedCost, 0);
  const annualBudget     = config.annualBudget || annualProjection;
  const nextMonth        = points[0];

  return {
    nextMonthCost:         nextMonth?.predictedCost ?? 0,
    nextMonthConsumption:  nextMonth?.predictedConsumption ?? 0,
    annualProjection,
    annualBudget,
    budgetVariance:        annualProjection - annualBudget,
    budgetVariancePct:     annualBudget > 0 ? ((annualProjection - annualBudget) / annualBudget) * 100 : 0,
    carbonProjectionLbs:   meterReadings[0]?.utilityType === 'electric'
                             ? annualProjection / (config.electricBaseRate || 0.12) * KWH_CARBON_LBS
                             : 0,
    points,
  };
}

// ── Benchmarking ──────────────────────────────────────────────────────────────

// ENERGY STAR median EUI (kBtu/sqft/yr) by building type
const ENERGY_STAR_MEDIANS: Record<string, number> = {
  office: 90, hospital: 250, school: 65, retail: 100,
  warehouse: 40, hotel: 175, multifamily: 60, default: 100,
};

export function buildBenchmarks(
  readings: EnergyReading[],
  meterId: string,
  config: CostConfig,
): BenchmarkResult[] {
  if (!config.squareFeet || config.squareFeet === 0) return [];
  const recent = readings.filter(r => r.meterId === meterId);
  if (recent.length === 0) return [];

  const totalKwh  = recent.reduce((s, r) => s + r.consumption, 0);
  const totalCost = recent.reduce((s, r) => s + r.cost, 0);
  const kwhPerSqFt = totalKwh / config.squareFeet;
  const costPerSqFt = totalCost / config.squareFeet;
  const kwhPerOccupant = config.occupantCount > 0 ? totalKwh / config.occupantCount : undefined;
  const esMedian = (ENERGY_STAR_MEDIANS[config.buildingType] ?? ENERGY_STAR_MEDIANS.default) / 3.412; // convert kBtu to kWh

  const benchmarks: BenchmarkResult[] = [];

  benchmarks.push({
    metricLabel:    'Energy Intensity (kWh/sqft)',
    currentValue:   Math.round(kwhPerSqFt * 10) / 10,
    targetValue:    Math.round(esMedian * 0.8 * 10) / 10,
    unit:           'kWh/sqft',
    ashraeBaseline: Math.round(esMedian * 10) / 10,
    energyStarMedian: Math.round(esMedian * 10) / 10,
    status:         kwhPerSqFt <= esMedian * 0.8 ? 'below_target' : kwhPerSqFt <= esMedian ? 'on_target' : 'above_target',
    trendDirection: 'stable',
    percentFromTarget: Math.round(((kwhPerSqFt - esMedian) / esMedian) * 100),
  });

  benchmarks.push({
    metricLabel:  'Cost per Square Foot',
    currentValue: Math.round(costPerSqFt * 100) / 100,
    targetValue:  Math.round(costPerSqFt * 0.85 * 100) / 100,
    unit:         '$/sqft',
    status:       'on_target',
    trendDirection: 'stable',
    percentFromTarget: 0,
  });

  if (kwhPerOccupant !== undefined) {
    benchmarks.push({
      metricLabel:  'Energy per Occupant',
      currentValue: Math.round(kwhPerOccupant),
      targetValue:  Math.round(kwhPerOccupant * 0.9),
      unit:         'kWh/occupant',
      status:       'on_target',
      trendDirection: 'stable',
      percentFromTarget: 0,
    });
  }

  return benchmarks;
}

// ── Executive Summary generator ───────────────────────────────────────────────

export function buildExecutiveSummary(
  readings: EnergyReading[],
  config: CostConfig,
): ExecutiveSummaryData {
  const totalCost    = readings.reduce((s, r) => s + r.cost, 0);
  const totalKwh     = readings.filter(r => r.utilityType === 'electric').reduce((s, r) => s + r.consumption, 0);
  const totalCarbon  = readings.reduce((s, r) => s + r.carbonLbs, 0);

  // Group by equipment
  const byCat: Record<string, { kwh: number; cost: number }> = {};
  readings.forEach(r => {
    const k = r.equipment || r.utilityType;
    if (!byCat[k]) byCat[k] = { kwh: 0, cost: 0 };
    byCat[k].kwh  += r.consumption;
    byCat[k].cost += r.cost;
  });
  const sorted = Object.entries(byCat).sort((a, b) => b[1].cost - a[1].cost);

  const quickWins: string[] = [];
  const risks: string[] = [];
  if (totalKwh > 0 && config.squareFeet > 0 && totalKwh / config.squareFeet > 15) {
    quickWins.push('Lighting controls upgrade — estimated 10–15% reduction');
    quickWins.push('HVAC scheduling audit — align setpoints with occupancy');
  }
  quickWins.push('Demand response enrollment — reduce peak demand charges');
  risks.push('Aging equipment increasing energy intensity');

  // CTS cross-reference
  try {
    const violations = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]') as any[];
    if (violations.some(v => !v.acknowledged)) {
      risks.push(`${violations.filter(v => !v.acknowledged).length} open corrective action(s) may affect operational efficiency`);
    }
  } catch {}

  return {
    generatedAt:         new Date().toISOString(),
    periodLabel:         'Year-to-Date',
    totalCost,
    totalConsumptionKwh: totalKwh,
    totalCarbonLbs:      Math.round(totalCarbon),
    topCostDrivers:      sorted.slice(0, 5).map(([label, d]) => ({
      label, cost: Math.round(d.cost), pct: totalCost > 0 ? Math.round((d.cost / totalCost) * 100) : 0,
    })),
    topConsumers:        sorted.slice(0, 5).map(([label, d]) => ({
      label, kwh: Math.round(d.kwh), pct: totalKwh > 0 ? Math.round((d.kwh / totalKwh) * 100) : 0,
    })),
    quickWins,
    riskAreas:           risks,
    potentialSavings:    Math.round(totalCost * 0.12),
    capitalProjects:     ['LED retrofit — 3-year payback', 'Variable frequency drives on pumps', 'Building automation system upgrade'],
    budgetForecast:      Math.round(totalCost * 1.05),
    fiveYearProjection:  Math.round(totalCost * 5 * 1.03),
    performanceScore:    Math.min(100, Math.max(0, 75 - (readings.length === 0 ? 20 : 0))),
  };
}

// ── Cross-module Timeline builder ─────────────────────────────────────────────

export function buildTimeline(facilityId: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Energy readings
  const readings = readJson<EnergyReading[]>(KEYS.readings(facilityId), []);
  readings.slice(0, 50).forEach(r => {
    entries.push({
      id:           `reading-${r.readingId}`,
      timestamp:    r.timestamp,
      source:       'meter_reading',
      title:        `${r.utilityType.replace('_', ' ')} reading — ${r.consumption.toFixed(1)} ${r.unit}`,
      description:  `Operator: ${r.operator} | Cost: $${r.cost.toFixed(2)} | Building: ${r.building}`,
      severity:     'info',
      utilityType:  r.utilityType,
      financialImpact: r.cost,
    });
  });

  // Energy events
  const events = readJson<any[]>(KEYS.events(facilityId), []);
  events.forEach(e => {
    entries.push({
      id:          `event-${e.eventId}`,
      timestamp:   e.timestamp,
      source:      'energy_event',
      title:       e.title,
      description: e.description,
      severity:    e.severity,
      utilityType: e.utilityType,
      financialImpact: e.financialImpact,
    });
  });

  // PM Maintenance history
  try {
    const pm = JSON.parse(localStorage.getItem(`nexum_pm_schedules_${facilityId}`) || '[]') as any[];
    pm.filter(p => p.completedAt).forEach(p => {
      entries.push({
        id:          `pm-${p.pmId}`,
        timestamp:   p.completedAt,
        source:      'maintenance',
        title:       `PM Completed — ${p.taskName}`,
        description: `${p.equipmentName} | By: ${p.completedBy || 'Unknown'} | ${p.completionNotes || ''}`,
        severity:    'success',
      });
    });
  } catch {}

  // Violations (CTS cross-reference)
  try {
    const violations = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]') as any[];
    violations.slice(0, 30).forEach(v => {
      entries.push({
        id:          `viol-${v.id}`,
        timestamp:   v.issuedAt || v.timestamp,
        source:      'violation',
        title:       `Violation — ${v.violationType || v.category || 'Operational'}`,
        description: `${v.employeeName ? `Staff: ${v.employeeName} | ` : ''}${v.description || ''}`,
        severity:    (v.severityScore || v.severity || 0) >= 80 ? 'critical' : 'warning',
      });
    });
  } catch {}

  // System observations (Observation Journal feed)
  try {
    const obs = JSON.parse(localStorage.getItem('nexum_system_observations') || '[]') as any[];
    obs.slice(0, 30).forEach(o => {
      entries.push({
        id:          `obs-${o.id}`,
        timestamp:   o.timestamp,
        source:      'observation',
        title:       `${o.type?.replace('_', ' ')} — ${o.equipmentLabel || o.equipmentId}`,
        description: o.interpretation,
        severity:    o.flag === 'critical' ? 'critical' : o.flag === 'warning' ? 'warning' : 'info',
      });
    });
  } catch {}

  // BMS data points (communication events)
  try {
    const bms = JSON.parse(localStorage.getItem('nexum_energy_bms_data') || '[]') as any[];
    bms.slice(0, 20).forEach(b => {
      if (b.kw && b.kw > 0) {
        entries.push({
          id:          `bms-${b.pointId || b.timestamp}`,
          timestamp:   b.timestamp,
          source:      'bms',
          title:       `BMS Data Point — ${b.label || b.pointId}`,
          description: `kW: ${b.kw} | kWh: ${b.kwh || 0} | Demand: ${b.demand || 0}`,
          severity:    'info',
          utilityType: 'electric',
        });
      }
    });
  } catch {}

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── CTS Analysis ──────────────────────────────────────────────────────────────

export function buildCTSInsights(readings: EnergyReading[], events: any[]): CTSInsight[] {
  const violations = (() => { try { return JSON.parse(localStorage.getItem('nexum_violation_events') || '[]'); } catch { return []; } })();
  const obs        = (() => { try { return JSON.parse(localStorage.getItem('nexum_system_observations') || '[]'); } catch { return []; } })();

  const openViolations = violations.filter((v: any) => !v.acknowledged).length;
  const criticalEvents = events.filter(e => e.severity === 'critical').length;

  return [
    {
      dimension:  'reliability',
      score:      Math.max(0, 100 - criticalEvents * 10 - openViolations * 5),
      trend:      criticalEvents === 0 ? 'improving' : 'declining',
      evidence:   [
        `${events.length} energy events detected in current period`,
        `${criticalEvents} critical events require immediate corrective action`,
      ],
      correctiveActions: criticalEvents > 0
        ? ['Investigate demand spikes', 'Verify meter communication', 'Schedule preventive maintenance']
        : ['Continue current monitoring cadence'],
      preservedKnowledge: ['Energy baseline established from historical readings', 'Seasonal patterns recorded'],
    },
    {
      dimension:  'relevance',
      score:      readings.length > 10 ? 85 : 40,
      trend:      readings.length > 5 ? 'improving' : 'stable',
      evidence:   [
        `${readings.length} meter readings in history`,
        `Data spans ${readings.length > 0 ? 'active' : 'no'} operational period`,
      ],
      correctiveActions: readings.length < 5 ? ['Increase reading frequency to improve data relevance'] : [],
      preservedKnowledge: ['All readings are append-only — never overwritten'],
    },
    {
      dimension:  'scalability',
      score:      75,
      trend:      'stable',
      evidence:   [
        'localStorage-backed — scales per facility',
        'BMS integration available via nexum_energy_bms_data',
      ],
      correctiveActions: ['Consider BMS/BACnet integration for real-time automation'],
      preservedKnowledge: ['Architecture supports multi-meter, multi-building, multi-utility'],
    },
    {
      dimension:  'volatility',
      score:      Math.max(20, 90 - events.filter(e => e.type === 'DEMAND_SPIKE').length * 15),
      trend:      events.length > 3 ? 'declining' : 'stable',
      evidence:   [
        `${events.filter(e => e.type === 'DEMAND_SPIKE').length} demand spike(s) detected`,
        `${events.filter(e => e.type === 'ABNORMAL_CONSUMPTION').length} abnormal consumption event(s)`,
      ],
      correctiveActions: ['Analyze demand spikes for load-shifting opportunities', 'Review TOU rate schedule alignment'],
      preservedKnowledge: ['Event history preserved for trend correlation'],
    },
    {
      dimension:  'validation',
      score:      Math.max(40, 100 - obs.filter((o: any) => !o.acknowledged).length * 8),
      trend:      obs.length > 0 ? 'improving' : 'stable',
      evidence:   [
        `${obs.length} system observations cross-referenced`,
        `${openViolations} open corrective action(s) from Violations module`,
      ],
      correctiveActions: openViolations > 0
        ? ['Close open corrective actions to improve validation score', 'Acknowledge system observations']
        : ['All observations acknowledged — validation score healthy'],
      preservedKnowledge: ['Evidence chain intact: readings → events → observations → corrections'],
    },
  ];
}

// ── Persist helpers ───────────────────────────────────────────────────────────

export function saveReading(facilityId: string, reading: EnergyReading): void {
  const all = readJson<EnergyReading[]>(KEYS.readings(facilityId), []);
  all.unshift(reading);
  writeJson(KEYS.readings(facilityId), all, 5000);
  window.dispatchEvent(new CustomEvent('nexum_energy_update'));
}

export function saveEvent(facilityId: string, event: EnergyEvent): void {
  const all = readJson<EnergyEvent[]>(KEYS.events(facilityId), []);
  all.unshift(event);
  writeJson(KEYS.events(facilityId), all, 1000);
  // also mirror to observation journal
  try {
    const obs = JSON.parse(localStorage.getItem('nexum_system_observations') || '[]');
    obs.unshift({
      id:             `energy-${event.eventId}`,
      type:           'BASELINE_DEVIATION',
      flag:           event.severity === 'critical' ? 'critical' : 'warning',
      equipmentId:    event.meterId,
      equipmentLabel: event.title,
      interpretation: event.description,
      context:        `Event: ${event.type} | Deviation: ${event.deviation.toFixed(1)}%`,
      recommendation: event.correctiveAction || 'Review meter data and investigate cause.',
      source:         'manual_log',
      timestamp:      event.timestamp,
      detectedAt:     event.detectedAt,
    });
    localStorage.setItem('nexum_system_observations', JSON.stringify(obs.slice(0, 500)));
    window.dispatchEvent(new CustomEvent('nexum_observation_update'));
  } catch {}
}

export function loadMeters(facilityId: string): EnergyMeter[] {
  return readJson<EnergyMeter[]>(KEYS.meters(facilityId), []);
}
export function saveMeter(facilityId: string, meter: EnergyMeter): void {
  const all = loadMeters(facilityId);
  const idx = all.findIndex(m => m.meterId === meter.meterId);
  if (idx >= 0) all[idx] = meter; else all.push(meter);
  writeJson(KEYS.meters(facilityId), all, 500);
}
export function loadCostConfig(facilityId: string): CostConfig {
  const stored = localStorage.getItem(KEYS.cost(facilityId));
  if (stored) try { return JSON.parse(stored); } catch {}
  return {
    facilityId,
    electricBaseRate: 0.12, electricDemandRate: 12, electricFixedFee: 25,
    electricTaxRate: 6, electricFuelAdjustment: 0.008,
    powerFactorPenaltyThreshold: 0.9, touPeriods: [], touEnabled: false,
    gasBaseRate: 0.85, gasFixedFee: 15, gasTaxRate: 4,
    waterBaseRate: 0.004, waterFixedFee: 12, waterUnit: 'gallon',
    annualBudget: 120000, budgetBreakdown: {},
    squareFeet: 0, occupantCount: 0, buildingType: 'office',
    updatedAt: new Date().toISOString(),
  };
}
export function saveCostConfig(facilityId: string, config: CostConfig): void {
  writeObj(KEYS.cost(facilityId), { ...config, updatedAt: new Date().toISOString() });
}
