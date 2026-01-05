// Energy & Engineering Calculation Library for Nexum Suum Facility Intelligence™

import { FuelType } from './equipment-schemas';

// Emission factors by fuel type (kg CO2 per MMBtu)
// Updated to match new fuel types: Natural Gas, Oil #2, Oil #4, Electric, Other
export const EMISSION_FACTORS: Record<FuelType, number> = {
  'Natural Gas': 117.1,
  'Oil #2': 161.4,
  'Oil #4': 166,
  'Electric': 0, // Electric has no direct emissions (depends on grid)
  'Other': 100, // Default estimate for other fuels
};

// Steam latent heat at saturation (0 psig) - BTU per lb
export const STEAM_LATENT_HEAT_BTU_PER_LB = 970.3;

// ============ BOILER ENERGY CALCULATIONS ============

export interface BoilerEnergyResult {
  btu: number;
  mmbtu: number;
  emissionsKg: number;
  emissionsTons: number;
  fuelType: FuelType;
}

/**
 * Convert CCF (100 cubic feet) of natural gas to BTU
 * 1 CCF = 100,000 BTU (standard conversion)
 */
export function ccfToBtu(ccf: number): number {
  return ccf * 100000;
}

/**
 * Convert BTU to MMBtu (Million BTU)
 */
export function btuToMmbtu(btu: number): number {
  return btu / 1000000;
}

/**
 * Calculate emissions from MMBtu based on fuel type
 */
export function calculateEmissions(mmbtu: number, fuelType: FuelType): { kg: number; tons: number } {
  const factor = EMISSION_FACTORS[fuelType] || EMISSION_FACTORS['Natural Gas'];
  const kg = mmbtu * factor;
  const tons = kg / 1000;
  return { kg, tons };
}

/**
 * Full boiler energy calculation from CCF used
 */
export function calculateBoilerEnergy(ccfUsed: number, fuelType: FuelType): BoilerEnergyResult {
  const btu = ccfToBtu(ccfUsed);
  const mmbtu = btuToMmbtu(btu);
  const emissions = calculateEmissions(mmbtu, fuelType);
  
  return {
    btu,
    mmbtu,
    emissionsKg: emissions.kg,
    emissionsTons: emissions.tons,
    fuelType,
  };
}

// ============ UNFIRED STEAM GENERATOR CALCULATIONS ============

export interface UnfiredSteamResult {
  btu: number;
  mmbtu: number;
  emissionsKg: number;
  emissionsTons: number;
}

/**
 * Calculate BTU from steam generated (lbs) for unfired steam generator
 * Uses latent heat of steam at saturation (0 psig): 970.3 BTU/lb
 */
export function calculateUnfiredSteamBtu(steamGeneratedLbs: number): number {
  return steamGeneratedLbs * STEAM_LATENT_HEAT_BTU_PER_LB;
}

/**
 * Full unfired steam generator energy calculation
 */
export function calculateUnfiredSteamEnergy(steamGeneratedLbs: number, fuelType: FuelType): UnfiredSteamResult {
  const btu = calculateUnfiredSteamBtu(steamGeneratedLbs);
  const mmbtu = btuToMmbtu(btu);
  const emissions = calculateEmissions(mmbtu, fuelType);
  
  return {
    btu,
    mmbtu,
    emissionsKg: emissions.kg,
    emissionsTons: emissions.tons,
  };
}

// ============ EXISTING BOILER METRICS ============

export interface BoilerMetrics {
  supplyTemp: number;
  returnTemp: number;
  steamPressure?: number;
  fuelPressure: number;
  flueGasTemp?: number;
  o2Level?: number;
  co2Level?: number;
  waterFlow?: number;
  steamGenerated?: number;
}

export interface ChillerMetrics {
  evapSupplyTemp: number;
  evapReturnTemp: number;
  condSupplyTemp: number;
  condReturnTemp: number;
  amperage: number;
  voltage: number;
  flowRate: number;
  tons?: number;
}

export interface BenchmarkThresholds {
  optimal: { min: number; max: number };
  acceptable: { min: number; max: number };
  concern: { min: number; max: number };
}

// Boiler Efficiency Calculations
export function calculateBoilerEfficiency(metrics: BoilerMetrics): {
  efficiency: number;
  status: 'Optimal' | 'Needs Review' | 'Operational Concern';
  issues: string[];
} {
  const issues: string[] = [];
  const deltaT = metrics.supplyTemp - metrics.returnTemp;
  
  // Stack temperature analysis (Rule of Thumb: should be 200-400°F above supply)
  if (metrics.flueGasTemp) {
    const stackDelta = metrics.flueGasTemp - metrics.supplyTemp;
    if (stackDelta > 450) {
      issues.push('⚠ High stack temp indicates poor heat transfer; check for fouling or excess air');
    } else if (stackDelta < 150) {
      issues.push('⚠ Low stack temp may indicate condensation risk or sensor error');
    }
  }
  
  // O2 level analysis (Rule of Thumb: 3-5% for natural gas)
  if (metrics.o2Level) {
    if (metrics.o2Level > 6) {
      issues.push('⚠ High O₂ indicates excess air; adjust combustion for better efficiency');
    } else if (metrics.o2Level < 2) {
      issues.push('⚠ Low O₂ indicates incomplete combustion; immediate attention required');
    }
  }
  
  // Delta T analysis (Rule of Thumb: 20-40°F for hot water, varies for steam)
  if (deltaT < 15) {
    issues.push('⚠ Low ΔT indicates poor heat transfer; check flow rate and pump operation');
  } else if (deltaT > 50 && !metrics.steamPressure) {
    issues.push('⚠ High ΔT may indicate low flow or control issues');
  }
  
  // Simplified efficiency estimate (real calculation would use fuel input)
  let baseEfficiency = 82; // Starting baseline
  
  // Adjust based on O2 (every 1% excess O2 costs ~1% efficiency)
  if (metrics.o2Level) {
    const excessO2 = Math.max(0, metrics.o2Level - 3);
    baseEfficiency -= excessO2 * 0.8;
  }
  
  // Adjust based on stack temperature
  if (metrics.flueGasTemp) {
    const stackDelta = metrics.flueGasTemp - metrics.supplyTemp;
    if (stackDelta > 350) {
      baseEfficiency -= (stackDelta - 350) * 0.05;
    }
  }
  
  const efficiency = Math.max(60, Math.min(95, baseEfficiency));
  
  let status: 'Optimal' | 'Needs Review' | 'Operational Concern';
  if (efficiency >= 85 && issues.length === 0) {
    status = 'Optimal';
  } else if (efficiency >= 78 || issues.length <= 1) {
    status = 'Needs Review';
  } else {
    status = 'Operational Concern';
  }
  
  return { efficiency, status, issues };
}

// Chiller Performance Calculations
export function calculateChillerPerformance(metrics: ChillerMetrics): {
  kwPerTon: number;
  cop: number;
  evapDeltaT: number;
  condDeltaT: number;
  status: 'Optimal' | 'Needs Review' | 'Operational Concern';
  issues: string[];
} {
  const issues: string[] = [];
  const evapDeltaT = metrics.evapReturnTemp - metrics.evapSupplyTemp;
  const condDeltaT = metrics.condSupplyTemp - metrics.condReturnTemp;
  
  // Calculate kW
  const kW = (metrics.amperage * metrics.voltage * 1.732) / 1000; // 3-phase
  
  // Estimate tons from evaporator delta T and flow (Rule of Thumb: 24 BTU/min per ton)
  const estimatedTons = metrics.tons || (metrics.flowRate * evapDeltaT * 500) / 12000;
  
  const kwPerTon = estimatedTons > 0 ? kW / estimatedTons : 0;
  const cop = kwPerTon > 0 ? 3.517 / kwPerTon : 0; // 1 ton = 3.517 kW thermal
  
  // Evaporator Delta T Analysis (Rule of Thumb: 8-12°F optimal)
  if (evapDeltaT < 6) {
    issues.push('⚠ Low evap ΔT indicates insufficient load or high flow; check valves and demand');
  } else if (evapDeltaT > 14) {
    issues.push('⚠ High evap ΔT suggests low flow or fouled tubes; investigate immediately');
  }
  
  // Condenser Delta T Analysis (Rule of Thumb: 8-15°F optimal)
  if (condDeltaT < 6) {
    issues.push('⚠ Low cond ΔT indicates high condenser water flow or low load');
  } else if (condDeltaT > 18) {
    issues.push('⚠ High cond ΔT suggests condenser fouling or low water flow; check tower and pumps');
  }
  
  // Efficiency Analysis (Rule of Thumb: 0.5-0.7 kW/ton for modern chillers)
  if (kwPerTon > 0.8) {
    issues.push('⚠ kW/ton above optimal; check condenser water temp, refrigerant charge, and load conditions');
  } else if (kwPerTon < 0.4) {
    issues.push('⚠ kW/ton unusually low; verify sensor accuracy and operating conditions');
  }
  
  let status: 'Optimal' | 'Needs Review' | 'Operational Concern';
  if (kwPerTon >= 0.5 && kwPerTon <= 0.7 && issues.length === 0) {
    status = 'Optimal';
  } else if (kwPerTon <= 0.85 || issues.length <= 1) {
    status = 'Needs Review';
  } else {
    status = 'Operational Concern';
  }
  
  return { kwPerTon, cop, evapDeltaT, condDeltaT, status, issues };
}

// Cost Calculations
export interface UtilityRates {
  naturalGas: number; // $/therm
  electricity: number; // $/kWh
  water: number; // $/1000 gal
  sewer: number; // $/1000 gal
}

export function calculateDailyEnergyCost(
  gasUsage: number, // therms/day
  electricUsage: number, // kWh/day
  waterUsage: number, // gallons/day
  rates: UtilityRates
): {
  gasCost: number;
  electricCost: number;
  waterCost: number;
  totalCost: number;
  monthlyProjection: number;
  annualProjection: number;
} {
  const gasCost = gasUsage * rates.naturalGas;
  const electricCost = electricUsage * rates.electricity;
  const waterCost = (waterUsage / 1000) * (rates.water + rates.sewer);
  const totalCost = gasCost + electricCost + waterCost;
  
  return {
    gasCost,
    electricCost,
    waterCost,
    totalCost,
    monthlyProjection: totalCost * 30,
    annualProjection: totalCost * 365,
  };
}

// Savings Score Calculation
export function calculateSavingsScore(
  currentEfficiency: number,
  baselineEfficiency: number,
  annualEnergyCost: number
): {
  score: number; // 0-100
  percentImprovement: number;
  annualSavings: number;
  recommendations: string[];
} {
  const percentImprovement = ((currentEfficiency - baselineEfficiency) / baselineEfficiency) * 100;
  const annualSavings = annualEnergyCost * (percentImprovement / 100);
  const score = Math.max(0, Math.min(100, 50 + percentImprovement * 2));
  
  const recommendations: string[] = [];
  
  if (currentEfficiency < baselineEfficiency * 0.95) {
    recommendations.push('Schedule comprehensive combustion tuning and system audit');
    recommendations.push('Verify all sensors and controls are properly calibrated');
    recommendations.push('Inspect heat exchangers for fouling or scale buildup');
  } else if (currentEfficiency < baselineEfficiency * 1.02) {
    recommendations.push('Consider economizer installation if not present');
    recommendations.push('Optimize setpoints for current load conditions');
    recommendations.push('Review maintenance schedule and preventive procedures');
  } else {
    recommendations.push('Maintain current operational practices');
    recommendations.push('Continue monitoring for any performance degradation');
    recommendations.push('Document procedures for training and consistency');
  }
  
  return { score, percentImprovement, annualSavings, recommendations };
}

// Performance Benchmark Data (Rule of Thumb Standards)
export const BENCHMARK_THRESHOLDS = {
  boiler: {
    efficiency: { optimal: { min: 85, max: 95 }, acceptable: { min: 78, max: 85 }, concern: { min: 60, max: 78 } },
    stackTemp: { optimal: { min: 250, max: 400 }, acceptable: { min: 200, max: 450 }, concern: { min: 150, max: 600 } },
    o2Level: { optimal: { min: 3, max: 5 }, acceptable: { min: 2, max: 6 }, concern: { min: 1, max: 10 } },
    deltaT: { optimal: { min: 20, max: 40 }, acceptable: { min: 15, max: 50 }, concern: { min: 10, max: 60 } },
  },
  chiller: {
    kwPerTon: { optimal: { min: 0.5, max: 0.7 }, acceptable: { min: 0.4, max: 0.85 }, concern: { min: 0.3, max: 1.2 } },
    cop: { optimal: { min: 4.5, max: 7.0 }, acceptable: { min: 3.5, max: 8.0 }, concern: { min: 2.5, max: 10 } },
    evapDeltaT: { optimal: { min: 8, max: 12 }, acceptable: { min: 6, max: 14 }, concern: { min: 4, max: 18 } },
    condDeltaT: { optimal: { min: 8, max: 15 }, acceptable: { min: 6, max: 18 }, concern: { min: 4, max: 22 } },
  },
};

export function getStatusColor(value: number, thresholds: BenchmarkThresholds): string {
  if (value >= thresholds.optimal.min && value <= thresholds.optimal.max) {
    return 'text-green-500'; // Optimal
  } else if (value >= thresholds.acceptable.min && value <= thresholds.acceptable.max) {
    return 'text-yellow-500'; // Needs Review
  } else {
    return 'text-red-500'; // Operational Concern
  }
}

export function getStatusBg(value: number, thresholds: BenchmarkThresholds): string {
  if (value >= thresholds.optimal.min && value <= thresholds.optimal.max) {
    return 'bg-green-500/10 border-green-500/20';
  } else if (value >= thresholds.acceptable.min && value <= thresholds.acceptable.max) {
    return 'bg-yellow-500/10 border-yellow-500/20';
  } else {
    return 'bg-red-500/10 border-red-500/20';
  }
}
