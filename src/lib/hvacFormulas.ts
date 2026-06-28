// ── HVAC Engineering Formula Engine ──────────────────────────────────────────
// Based on ASHRAE fundamentals and standard HVAC engineering practices.
// All formulas operate in US customary units unless noted.

// ── Unit Conversions ─────────────────────────────────────────────────────────

export const HVAC_CONVERSIONS = {
  // Temperature
  fToC: (f: number) => (f - 32) * (5 / 9),
  cToF: (c: number) => c * (9 / 5) + 32,
  fToR: (f: number) => f + 459.67,                  // Fahrenheit → Rankine

  // Power / Energy
  tonsToBtu: (tons: number) => tons * 12000,         // 1 ton = 12,000 BTU/hr
  btuToTons: (btu: number) => btu / 12000,
  kwToBtu: (kw: number) => kw * 3412.14,             // 1 kW = 3412.14 BTU/hr
  btuToKw: (btu: number) => btu / 3412.14,
  hpToKw: (hp: number) => hp * 0.7457,
  kwToHp: (kw: number) => kw / 0.7457,
  btuToKwh: (btu: number) => btu / 3412.14,

  // Flow
  gpmToLpm: (gpm: number) => gpm * 3.7854,
  cfmToLps: (cfm: number) => cfm * 0.4719,

  // Pressure
  psiToInWg: (psi: number) => psi * 27.6807,        // PSI → in w.g.
  inWgToPsi: (inWg: number) => inWg / 27.6807,
  psiToKpa: (psi: number) => psi * 6.8948,
};

// ── Sensible & Latent Heat ────────────────────────────────────────────────────

/**
 * Sensible heat gain/loss in air (BTU/hr)
 * Q_s = 1.08 × CFM × ΔT
 * Applies to dry-bulb temperature change with no moisture change.
 */
export function sensibleHeat(cfm: number, deltaTF: number): number {
  return 1.08 * cfm * deltaTF;
}

/**
 * Latent heat from moisture (BTU/hr)
 * Q_l = 0.68 × CFM × ΔGR   (ΔGR = change in grains of moisture per lb dry air)
 */
export function latentHeat(cfm: number, deltaGrains: number): number {
  return 0.68 * cfm * deltaGrains;
}

/**
 * Total cooling capacity from airside enthalpy (BTU/hr)
 * Q_t = 4.5 × CFM × Δh   (Δh = enthalpy difference, BTU/lb)
 */
export function totalCooling(cfm: number, deltaEnthalpyBtuPerLb: number): number {
  return 4.5 * cfm * deltaEnthalpyBtuPerLb;
}

/**
 * Sensible Heat Ratio
 * SHR = Q_sensible / Q_total
 */
export function sensibleHeatRatio(sensible: number, total: number): number {
  if (total === 0) return 0;
  return sensible / total;
}

// ── Refrigeration Cycle ───────────────────────────────────────────────────────

/**
 * Coefficient of Performance (cooling)
 * COP = Q_cooling (BTU/hr) / W_input (BTU/hr)
 * Note: convert W_input kW → BTU/hr first (×3412.14)
 */
export function copCooling(coolingCapacityBtu: number, inputPowerKw: number): number {
  const inputBtu = HVAC_CONVERSIONS.kwToBtu(inputPowerKw);
  if (inputBtu === 0) return 0;
  return coolingCapacityBtu / inputBtu;
}

/**
 * Energy Efficiency Ratio
 * EER = BTU/hr ÷ Watts
 * EER ≈ COP × 3.412
 */
export function eer(coolingCapacityBtu: number, inputPowerWatts: number): number {
  if (inputPowerWatts === 0) return 0;
  return coolingCapacityBtu / inputPowerWatts;
}

/**
 * SEER approximation from EER
 * SEER ≈ EER × 1.12  (simplified; exact requires part-load data)
 */
export function seerFromEer(eerValue: number): number {
  return eerValue * 1.12;
}

/**
 * EER from COP
 */
export function eerFromCop(cop: number): number {
  return cop * 3.412;
}

/**
 * Refrigeration effect (tons) from compressor power and COP
 */
export function refrigerationTons(inputPowerKw: number, cop: number): number {
  const coolingKw = inputPowerKw * cop;
  return HVAC_CONVERSIONS.btuToTons(HVAC_CONVERSIONS.kwToBtu(coolingKw));
}

// ── Heating Systems ───────────────────────────────────────────────────────────

/**
 * Hot water heating capacity (BTU/hr)
 * Q = 500 × GPM × ΔT   (water: ρ × Cp ≈ 500 for imperial)
 */
export function hotWaterCapacity(gpm: number, deltaTF: number): number {
  return 500 * gpm * deltaTF;
}

/**
 * Boiler efficiency
 * η = Q_output / Q_input × 100  (%)
 */
export function boilerEfficiency(outputBtu: number, inputBtu: number): number {
  if (inputBtu === 0) return 0;
  return (outputBtu / inputBtu) * 100;
}

/**
 * Fuel consumption rate (gas)
 * ft³/hr = BTU_output / (heating_value × efficiency)
 * Natural gas heating value ≈ 1020 BTU/ft³
 */
export function gasConsumption(
  outputBtu: number,
  efficiencyPct: number,
  heatingValueBtuPerCcf = 1020
): number {
  if (efficiencyPct === 0 || heatingValueBtuPerCcf === 0) return 0;
  return outputBtu / ((efficiencyPct / 100) * heatingValueBtuPerCcf);
}

/**
 * Heat output from electric resistance (BTU/hr)
 * Q = kW × 3412.14
 */
export function electricHeat(kw: number): number {
  return HVAC_CONVERSIONS.kwToBtu(kw);
}

// ── Chilled Water System ──────────────────────────────────────────────────────

/**
 * Chilled water flow rate needed for given load
 * GPM = Q (BTU/hr) / (500 × ΔT)
 */
export function chilledWaterGpm(loadBtu: number, deltaTF: number): number {
  if (deltaTF === 0) return 0;
  return loadBtu / (500 * deltaTF);
}

/**
 * Pump power (kW)
 * P = (GPM × TDH) / (3960 × η_pump)
 * TDH = total dynamic head (ft), η = pump efficiency (0–1)
 */
export function pumpPower(gpm: number, tdhFt: number, pumpEfficiency = 0.7): number {
  if (pumpEfficiency === 0) return 0;
  const hp = (gpm * tdhFt) / (3960 * pumpEfficiency);
  return HVAC_CONVERSIONS.hpToKw(hp);
}

/**
 * Chiller system kW/ton (efficiency metric)
 * Lower = more efficient. Industry benchmark: 0.5–0.7 kW/ton
 */
export function chillerKwPerTon(inputPowerKw: number, coolingTons: number): number {
  if (coolingTons === 0) return 0;
  return inputPowerKw / coolingTons;
}

// ── Fan & Blower ──────────────────────────────────────────────────────────────

/**
 * Fan power (kW)
 * P = (CFM × SP) / (6356 × η_fan)
 * SP = static pressure (in w.g.), η = fan efficiency (0–1)
 */
export function fanPower(cfm: number, staticPressureInWg: number, fanEfficiency = 0.65): number {
  if (fanEfficiency === 0) return 0;
  const hp = (cfm * staticPressureInWg) / (6356 * fanEfficiency);
  return HVAC_CONVERSIONS.hpToKw(hp);
}

/**
 * Fan Laws — new flow from speed change
 * CFM₂ = CFM₁ × (RPM₂ / RPM₁)
 */
export function fanFlowFromSpeed(cfm1: number, rpm1: number, rpm2: number): number {
  if (rpm1 === 0) return 0;
  return cfm1 * (rpm2 / rpm1);
}

/**
 * Fan Laws — new static pressure from speed change
 * SP₂ = SP₁ × (RPM₂ / RPM₁)²
 */
export function fanPressureFromSpeed(sp1: number, rpm1: number, rpm2: number): number {
  if (rpm1 === 0) return 0;
  return sp1 * Math.pow(rpm2 / rpm1, 2);
}

/**
 * Fan Laws — new power from speed change
 * P₂ = P₁ × (RPM₂ / RPM₁)³
 */
export function fanPowerFromSpeed(p1: number, rpm1: number, rpm2: number): number {
  if (rpm1 === 0) return 0;
  return p1 * Math.pow(rpm2 / rpm1, 3);
}

// ── Airflow & Duct ────────────────────────────────────────────────────────────

/**
 * Duct velocity (FPM)
 * V = CFM / Area (ft²)
 */
export function ductVelocity(cfm: number, areaFt2: number): number {
  if (areaFt2 === 0) return 0;
  return cfm / areaFt2;
}

/**
 * Rectangular duct area (ft²)
 */
export function rectDuctArea(widthIn: number, heightIn: number): number {
  return (widthIn * heightIn) / 144;
}

/**
 * Round duct area (ft²)
 */
export function roundDuctArea(diameterIn: number): number {
  return Math.PI * Math.pow(diameterIn / 24, 2);
}

/**
 * Equivalent round diameter from rectangular duct
 * D_eq = 1.3 × (a×b)^0.625 / (a+b)^0.25
 */
export function equivalentDiameter(aIn: number, bIn: number): number {
  return 1.3 * Math.pow(aIn * bIn, 0.625) / Math.pow(aIn + bIn, 0.25);
}

/**
 * Air changes per hour (ACH)
 * ACH = (CFM × 60) / Room_Volume_ft³
 */
export function airChangesPerHour(cfm: number, roomVolumeFt3: number): number {
  if (roomVolumeFt3 === 0) return 0;
  return (cfm * 60) / roomVolumeFt3;
}

// ── Psychrometrics ────────────────────────────────────────────────────────────

/**
 * Relative humidity (approximation)
 * RH = (actual vapor pressure / saturation vapor pressure) × 100
 * Simplified: Magnus formula for saturation pressure
 */
export function saturationPressure(tempF: number): number {
  const t = HVAC_CONVERSIONS.fToC(tempF);
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3)); // kPa
}

/**
 * Dew point temperature (°F) from dry-bulb and relative humidity
 * Magnus formula approximation
 */
export function dewPoint(dryBulbF: number, rhPct: number): number {
  const t = HVAC_CONVERSIONS.fToC(dryBulbF);
  const rh = rhPct / 100;
  const a = 17.27, b = 237.3;
  const alpha = ((a * t) / (b + t)) + Math.log(rh);
  const dpC = (b * alpha) / (a - alpha);
  return HVAC_CONVERSIONS.cToF(dpC);
}

/**
 * Humidity ratio (grains of water per lb of dry air)
 * W = 0.62198 × Pv / (P_atm - Pv)  [converted to grains: × 7000]
 * Simplified with RH input
 */
export function humidityRatio(dryBulbF: number, rhPct: number): number {
  const pSat = saturationPressure(dryBulbF); // kPa
  const pv = (rhPct / 100) * pSat;           // actual vapor pressure kPa
  const pAtm = 101.325;                       // standard atmosphere kPa
  return 0.62198 * (pv / (pAtm - pv)) * 7000; // grains/lb
}

/**
 * Enthalpy of moist air (BTU/lb dry air)
 * h = 0.240 × T + W × (1061 + 0.444 × T)
 * T = dry-bulb °F, W = humidity ratio (lb/lb)
 */
export function airEnthalpy(dryBulbF: number, humidityRatioGrains: number): number {
  const w = humidityRatioGrains / 7000; // convert grains to lb/lb
  return 0.240 * dryBulbF + w * (1061 + 0.444 * dryBulbF);
}

// ── Heat Transfer ─────────────────────────────────────────────────────────────

/**
 * Conductive heat transfer (BTU/hr)
 * Q = U × A × ΔT
 * U = overall heat transfer coefficient (BTU/hr·ft²·°F)
 */
export function conductiveHeatTransfer(u: number, areaFt2: number, deltaTF: number): number {
  return u * areaFt2 * deltaTF;
}

/**
 * R-value (thermal resistance) from U-value
 * R = 1 / U
 */
export function rFromU(u: number): number {
  if (u === 0) return Infinity;
  return 1 / u;
}

/**
 * U-value from R-value
 */
export function uFromR(r: number): number {
  if (r === 0) return Infinity;
  return 1 / r;
}

// ── Cooling Load Estimates ────────────────────────────────────────────────────

/**
 * Rule-of-thumb cooling load estimate
 * Based on: 400–600 sq ft per ton for commercial office
 */
export function estimateCoolingTons(sqFt: number, loadFactor = 450): number {
  return sqFt / loadFactor;
}

/**
 * Lighting heat gain (BTU/hr)
 * Q = Watts × 3.412 × ballast_factor
 */
export function lightingHeatGain(watts: number, ballastFactor = 1.0): number {
  return watts * 3.412 * ballastFactor;
}

/**
 * People heat gain (BTU/hr) — combined sensible + latent
 * Typical office: 250 BTU/hr sensible + 200 BTU/hr latent per person
 */
export function peopleHeatGain(count: number, sensiblePerPerson = 250, latentPerPerson = 200): {
  sensible: number; latent: number; total: number;
} {
  return {
    sensible: count * sensiblePerPerson,
    latent: count * latentPerPerson,
    total: count * (sensiblePerPerson + latentPerPerson),
  };
}

// ── Piping ────────────────────────────────────────────────────────────────────

/**
 * Pipe velocity (ft/s)
 * V = GPM / (2.448 × d²)   d = pipe ID in inches
 */
export function pipeVelocity(gpm: number, pipeDiameterIn: number): number {
  if (pipeDiameterIn === 0) return 0;
  return gpm / (2.448 * Math.pow(pipeDiameterIn, 2));
}

/**
 * Reynolds number (dimensionless)
 * Re = (V × D) / ν    ν = kinematic viscosity (ft²/s)
 * Water at 60°F: ν ≈ 1.217e-5 ft²/s
 */
export function reynoldsNumber(
  velocityFps: number,
  diameterFt: number,
  kinematicViscosity = 1.217e-5
): number {
  return (velocityFps * diameterFt) / kinematicViscosity;
}

// ── Sound ─────────────────────────────────────────────────────────────────────

/**
 * Sound pressure level addition (dB)
 * When combining two sources: L_total = 10 × log10(10^(L1/10) + 10^(L2/10))
 */
export function combineSoundLevels(db1: number, db2: number): number {
  return 10 * Math.log10(Math.pow(10, db1 / 10) + Math.pow(10, db2 / 10));
}

/**
 * NC (Noise Criteria) level approximation from dBA
 * Rough: NC ≈ dBA - 7  (varies by spectrum shape)
 */
export function estimateNC(dba: number): number {
  return dba - 7;
}

// ── Composite calculator for equipment profile ────────────────────────────────

export interface HvacEquipmentProfile {
  equipmentType: string;
  coolingCapacityTons?: number;
  heatingCapacityBtu?: number;
  inputPowerKw?: number;
  airflowCfm?: number;
  supplyTempF?: number;
  returnTempF?: number;
  chilledWaterSupplyF?: number;
  chilledWaterReturnF?: number;
  waterFlowGpm?: number;
  staticPressureInWg?: number;
}

export interface HvacDerivedMetrics {
  coolingCapacityBtu?: number;
  cop?: number;
  eer?: number;
  seer?: number;
  kwPerTon?: number;
  sensibleLoad?: number;
  waterFlowGpm?: number;
  chilledWaterCapacityBtu?: number;
  fanPowerKw?: number;
  airDeltaT?: number;
  label: string[];  // human-readable summary lines
}

export function deriveHvacMetrics(profile: HvacEquipmentProfile): HvacDerivedMetrics {
  const result: HvacDerivedMetrics = { label: [] };

  const capBtu = profile.coolingCapacityTons
    ? HVAC_CONVERSIONS.tonsToBtu(profile.coolingCapacityTons)
    : undefined;
  if (capBtu) result.coolingCapacityBtu = capBtu;

  if (capBtu && profile.inputPowerKw) {
    result.cop = copCooling(capBtu, profile.inputPowerKw);
    result.eer = eer(capBtu, profile.inputPowerKw * 1000);
    result.seer = seerFromEer(result.eer);
    result.kwPerTon = chillerKwPerTon(profile.inputPowerKw, profile.coolingCapacityTons!);
    result.label.push(`COP: ${result.cop.toFixed(2)}`);
    result.label.push(`EER: ${result.eer.toFixed(1)}`);
    result.label.push(`kW/ton: ${result.kwPerTon.toFixed(3)}`);
  }

  if (profile.airflowCfm && profile.supplyTempF != null && profile.returnTempF != null) {
    const dt = Math.abs(profile.returnTempF - profile.supplyTempF);
    result.airDeltaT = dt;
    result.sensibleLoad = sensibleHeat(profile.airflowCfm, dt);
    result.label.push(`Sensible load: ${Math.round(result.sensibleLoad).toLocaleString()} BTU/hr`);
  }

  if (profile.waterFlowGpm && profile.chilledWaterSupplyF != null && profile.chilledWaterReturnF != null) {
    const dt = Math.abs(profile.chilledWaterReturnF - profile.chilledWaterSupplyF);
    result.chilledWaterCapacityBtu = hotWaterCapacity(profile.waterFlowGpm, dt);
    result.label.push(`CW capacity: ${Math.round(result.chilledWaterCapacityBtu / 12000).toFixed(1)} tons`);
  }

  if (profile.airflowCfm && profile.staticPressureInWg) {
    result.fanPowerKw = fanPower(profile.airflowCfm, profile.staticPressureInWg);
    result.label.push(`Fan power: ${result.fanPowerKw.toFixed(2)} kW`);
  }

  return result;
}
