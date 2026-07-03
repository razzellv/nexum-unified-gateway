// Energy Intelligence™ 2.0 — Data Types
// Every type here maps directly to a localStorage record or a derived value.

export type UtilityType =
  | 'electric' | 'water' | 'natural_gas' | 'steam' | 'condensate'
  | 'fuel_oil' | 'diesel' | 'propane' | 'chilled_water' | 'hot_water'
  | 'compressed_air' | 'ups' | 'generator_fuel' | 'solar_production'
  | 'battery_storage' | 'power_quality' | 'demand_meter' | 'submeter';

export type CommMethod = 'BACnet' | 'Modbus' | 'API' | 'Manual' | 'SCADA' | 'BMS';

export type BenchmarkStatus = 'above_target' | 'below_target' | 'improving' | 'declining' | 'critical' | 'on_target';

export type EnergyEventType =
  | 'DEMAND_SPIKE' | 'POWER_OUTAGE' | 'GENERATOR_EVENT' | 'UPS_TRANSFER'
  | 'BATTERY_DISCHARGE' | 'UNEXPECTED_RUNTIME' | 'NIGHT_CONSUMPTION'
  | 'WEEKEND_CONSUMPTION' | 'SIMULTANEOUS_STARTS' | 'WATER_LEAK'
  | 'GAS_SPIKE' | 'STEAM_SPIKE' | 'ABNORMAL_CONSUMPTION' | 'SENSOR_FAILURE'
  | 'METER_FAILURE' | 'COMM_LOSS' | 'LOAD_IMBALANCE' | 'UNEXPECTED_PEAK'
  | 'DEMAND_RATCHET' | 'WEATHER_EVENT';

export type LoadCategory =
  | 'HVAC' | 'Boilers' | 'Chillers' | 'Cooling Towers' | 'Pumps'
  | 'Air Compressors' | 'Vacuum Systems' | 'UPS' | 'Battery Banks'
  | 'Lighting' | 'Kitchen' | 'Production' | 'Plug Loads' | 'Elevators'
  | 'IT / Server' | 'Fire Pumps' | 'Domestic Water' | 'Irrigation'
  | 'Compressed Air' | 'Unknown Loads';

// ── Meter Registry ────────────────────────────────────────────────────────────

export interface EnergyMeter {
  meterId: string;
  utilityType: UtilityType;
  label: string;                // human display name
  meterNumber: string;
  manufacturer: string;
  serialNumber: string;
  building: string;
  floor: string;
  mechanicalRoom: string;
  equipmentServed: string;
  utilityCompany: string;
  rateSchedule: string;
  meterMultiplier: number;
  hasDemandCharges: boolean;
  touEnabled: boolean;
  billingCycle: 'monthly' | 'bi-monthly' | 'quarterly';
  commMethod: CommMethod;
  installationDate: string;
  calibrationDate: string;
  unit: string;                 // kWh, therms, gallons, lbs, etc.
  active: boolean;
  notes: string;
  createdAt: string;
}

// ── Reading Log (append-only) ─────────────────────────────────────────────────

export interface EnergyReading {
  readingId: string;
  meterId: string;
  utilityType: UtilityType;
  timestamp: string;
  operator: string;
  building: string;
  equipment: string;
  currentReading: number;
  previousReading: number;
  unit: string;
  meterMultiplier: number;
  consumption: number;          // (current - previous) × multiplier
  peakConsumption?: number;
  offPeakConsumption?: number;
  shoulderConsumption?: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  outsideAirTemp?: number;
  occupancy?: number;           // %
  shift?: string;
  productionStatus?: string;
  isHoliday: boolean;
  isWeekend: boolean;
  abnormalEvent?: string;
  notes: string;
  // Auto-calculated on save
  cost: number;
  demandKw?: number;
  carbonLbs: number;
  btus: number;
  intensityPerSqFt?: number;
  intensityPerOccupant?: number;
  createdAt: string;
}

// ── Cost / Rate Engine ────────────────────────────────────────────────────────

export interface TouPeriod {
  name: 'On-Peak' | 'Mid-Peak' | 'Off-Peak';
  startHour: number;
  endHour: number;
  days: ('weekday' | 'weekend')[];
  ratePerUnit: number;
}

export interface CostConfig {
  facilityId: string;
  // Electric
  electricBaseRate: number;       // $/kWh
  electricDemandRate: number;     // $/kW peak demand
  electricFixedFee: number;       // $/month
  electricTaxRate: number;        // %
  electricFuelAdjustment: number; // $/kWh
  powerFactorPenaltyThreshold: number; // 0–1
  touPeriods: TouPeriod[];
  // Gas
  gasBaseRate: number;            // $/therm
  gasFixedFee: number;
  gasTaxRate: number;
  // Water
  waterBaseRate: number;          // $/gallon or $/CCF
  waterFixedFee: number;
  waterUnit: 'gallon' | 'CCF' | 'HCF';
  // Budget
  annualBudget: number;
  budgetBreakdown: Record<string, number>; // month → budget $
  // Facility
  squareFeet: number;
  occupantCount: number;
  productionUnits?: string;
  buildingType: string;
  updatedAt: string;
}

// ── Detected Events ───────────────────────────────────────────────────────────

export interface EnergyEvent {
  eventId: string;
  type: EnergyEventType;
  severity: 'critical' | 'warning' | 'info';
  meterId: string;
  utilityType: UtilityType;
  timestamp: string;
  detectedAt: string;
  title: string;
  description: string;
  measuredValue: number;
  expectedValue: number;
  unit: string;
  deviation: number;            // % above/below expected
  financialImpact?: number;     // $ estimate
  acknowledged: boolean;
  correctiveAction?: string;
  resolvedAt?: string;
}

// ── OI Explanation ────────────────────────────────────────────────────────────

export interface ContributingFactor {
  factor: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  impact: 'major' | 'moderate' | 'minor';
}

export interface OIExplanation {
  metric: string;
  change: number;               // % change
  changeDirection: 'up' | 'down' | 'stable';
  headline: string;             // "Energy increased 12%"
  why: string;                  // plain-english explanation
  factors: ContributingFactor[];
  operationalRisk: 'critical' | 'elevated' | 'normal' | 'low';
  financialImpact: number;
  recommendedActions: string[];
  evidenceTimestamp: string;
  confidence: number;           // 0–100
}

// ── Benchmark ─────────────────────────────────────────────────────────────────

export interface BenchmarkResult {
  metricLabel: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: BenchmarkStatus;
  trendDirection: 'improving' | 'declining' | 'stable';
  percentFromTarget: number;
  ashraeBaseline?: number;
  energyStarMedian?: number;
  historicalBest?: number;
}

// ── System Load Breakdown ─────────────────────────────────────────────────────

export interface LoadBreakdownItem {
  category: LoadCategory;
  estimatedKwh: number;
  estimatedCost: number;
  percentOfTotal: number;
  runtimeHours?: number;
  peakDemandKw?: number;
  efficiency?: number;          // %
  trend: 'up' | 'down' | 'stable';
  recommendation?: string;
}

// ── Forecast ──────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  label: string;               // "Aug 2026", "Q3 2026"
  predictedConsumption: number;
  predictedCost: number;
  budgetAmount?: number;
  confidence: number;          // 0–100
  isActual: boolean;
}

export interface ForecastSummary {
  nextMonthCost: number;
  nextMonthConsumption: number;
  annualProjection: number;
  annualBudget: number;
  budgetVariance: number;      // + over, - under
  budgetVariancePct: number;
  carbonProjectionLbs: number;
  points: ForecastPoint[];
}

// ── Executive Summary ─────────────────────────────────────────────────────────

export interface ExecutiveSummaryData {
  generatedAt: string;
  periodLabel: string;
  totalCost: number;
  totalConsumptionKwh: number;
  totalCarbonLbs: number;
  topCostDrivers: Array<{ label: string; cost: number; pct: number }>;
  topConsumers: Array<{ label: string; kwh: number; pct: number }>;
  quickWins: string[];
  riskAreas: string[];
  potentialSavings: number;
  capitalProjects: string[];
  budgetForecast: number;
  fiveYearProjection: number;
  performanceScore: number;    // 0–100
}

// ── Timeline Entry (cross-module) ─────────────────────────────────────────────

export type TimelineSource =
  | 'meter_reading' | 'energy_event' | 'maintenance' | 'violation'
  | 'observation' | 'climate' | 'water_chemistry' | 'compliance' | 'bms';

export interface TimelineEntry {
  id: string;
  timestamp: string;
  source: TimelineSource;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  utilityType?: UtilityType;
  financialImpact?: number;
  linkedEntities?: string[];   // equipment IDs, meter IDs, etc.
}

// ── CTS Cross-Reference ───────────────────────────────────────────────────────

export interface CTSInsight {
  dimension: 'reliability' | 'relevance' | 'scalability' | 'volatility' | 'validation';
  score: number;              // 0–100
  trend: 'improving' | 'declining' | 'stable';
  evidence: string[];
  correctiveActions: string[];
  preservedKnowledge: string[];
}
