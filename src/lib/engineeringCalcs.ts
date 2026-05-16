/**
 * Engineering unit derivation engine.
 *
 * Each `derive*` function takes the current form state (as a string-field map),
 * the field that just changed, and returns ONLY the fields that can be newly
 * computed — never overwriting a field the user just typed.
 *
 * Callers merge the result into state after the user-typed value is already set.
 *
 * All input/output values are strings (matching form state) so callers need no
 * type conversion. Empty string means "could not derive".
 */

const SQRT3 = 1.7320508;
const fmt   = (n: number, decimals = 2) => isFinite(n) && !isNaN(n) ? n.toFixed(decimals) : '';
const p     = (s: string) => parseFloat(s);
const ok    = (n: number) => isFinite(n) && !isNaN(n) && n > 0;

// ── Temperature helpers ──────────────────────────────────────────────────────

export function fToC(f: number) { return (f - 32) * 5 / 9; }
export function cToF(c: number) { return c * 9 / 5 + 32; }
export function deltaFToC(dt: number) { return dt * 5 / 9; }
export function deltaCToF(dt: number) { return dt * 9 / 5; }

// ── Electrical helpers ───────────────────────────────────────────────────────
// Assumes 3-phase for all motor callers (overwhelmingly dominant in facilities).
// PF default 0.85 — typical induction motor at 80–100% load.

export const DEFAULT_PF = 0.85;

/** kW → FLA (Full Load Amps), 3-phase */
export function kwToAmps3Ph(kw: number, volts: number, pf = DEFAULT_PF): number {
  return (kw * 1000) / (SQRT3 * volts * pf);
}

/** FLA + volts → kW, 3-phase */
export function ampsToKw3Ph(amps: number, volts: number, pf = DEFAULT_PF): number {
  return (SQRT3 * volts * amps * pf) / 1000;
}

/** HP → kW */
export function hpToKw(hp: number): number { return hp * 0.7457; }

/** kW → HP */
export function kwToHp(kw: number): number { return kw / 0.7457; }

// ── Thermal helpers ──────────────────────────────────────────────────────────

/** GPM + ΔT(°F) → BTU/hr (water, using 8.33 lb/gal × 60 min/hr ≈ 500) */
export function gpmDeltaTtoBtu(gpm: number, deltaT: number): number {
  return gpm * deltaT * 500;
}

/** BTU/hr → Tons of cooling */
export function btuToTons(btuHr: number): number { return btuHr / 12000; }

/** Tons → BTU/hr */
export function tonsToBtu(tons: number): number { return tons * 12000; }

/** kW + Tons → kW/Ton (efficiency) */
export function kwPerTon(kw: number, tons: number): number { return kw / tons; }

/** Tons + kW → COP */
export function cop(tons: number, kw: number): number {
  return (tons * 12000) / (kw * 3412);
}

/** GPM + Head(ft) + efficiency(0-1) → BHP, then kW */
export function pumpKw(gpm: number, headFt: number, eff: number): number {
  const bhp = (gpm * headFt) / (3960 * eff);
  return hpToKw(bhp);
}

/** PSI → feet of head */
export function psiToFeet(psi: number): number { return psi * 2.31; }

/** Feet → PSI */
export function feetToPsi(ft: number): number { return ft / 2.31; }

// ── Per-form derivation functions ────────────────────────────────────────────
// Each returns a partial Record<string, string> of fields to auto-fill.
// The caller must NOT overwrite the field the user just typed.

type Derived = Record<string, string>;

/**
 * ChillerForm derivations.
 * Fields: enteringWaterTemp, leavingWaterTemp, estimatedTons, currentKw,
 *         enteringCondenserWaterTemp, leavingCondenserWaterTemp
 * Derived outputs: chilledWaterDeltaT (display), condenserDeltaT (display),
 *                  kwPerTon (display), btuHr (display), cop (display)
 */
export function deriveChiller(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const ewt  = p(data.enteringWaterTemp);
  const lwt  = p(data.leavingWaterTemp);
  const tons  = p(data.estimatedTons);
  const kw    = p(data.currentKw);
  const cewt  = p(data.enteringCondenserWaterTemp);
  const clwt  = p(data.leavingCondenserWaterTemp);

  // Chilled water ΔT
  if (ok(ewt) && ok(lwt)) {
    d._chilledDeltaT = fmt(Math.abs(ewt - lwt), 1);
  }

  // Condenser ΔT
  if (ok(cewt) && ok(clwt)) {
    d._condenserDeltaT = fmt(Math.abs(clwt - cewt), 1);
  }

  // BTU/hr from tons
  if (ok(tons)) {
    d._btuHr = fmt(tonsToBtu(tons), 0);
  }

  // BTU/hr from GPM + ΔT (chilled side)
  if (ok(p(data.flowGPM)) && ok(ewt) && ok(lwt)) {
    const btu = gpmDeltaTtoBtu(p(data.flowGPM), Math.abs(ewt - lwt));
    d._btuHrFromFlow = fmt(btu, 0);
    // If tons not set, derive tons from flow calc
    if (!ok(tons)) d._tonsFromFlow = fmt(btuToTons(btu), 1);
  }

  // kW/Ton + COP
  if (ok(tons) && ok(kw)) {
    d._kwPerTon = fmt(kwPerTon(kw, tons), 3);
    d._cop      = fmt(cop(tons, kw), 2);
  }

  // If tons set but kW not → can't derive kW without kW/Ton reference
  // If kW set and tons not → can't derive tons from kW alone

  return d;
}

/**
 * PumpForm derivations.
 * Fields: motorCurrent (amps), motorVoltage, motorKw, flowGPM
 * Derived: motorKw from amps+volts, motorCurrent from kw+volts
 */
export function derivePump(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const amps  = p(data.motorCurrent);
  const volts = p(data.motorVoltage);
  const kw    = p(data.motorKw);

  if (changedField !== 'motorKw' && ok(amps) && ok(volts)) {
    d.motorKw = fmt(ampsToKw3Ph(amps, volts), 2);
  }

  if (changedField !== 'motorCurrent' && ok(kw) && ok(volts)) {
    d.motorCurrent = fmt(kwToAmps3Ph(kw, volts), 1);
  }

  return d;
}

/**
 * BoilerForm derivations.
 * Fields: supplyTemp, returnTemp, firingRate (MBH), kwDraw, gasCCF
 * Derived: ΔT display, BTU/hr output
 */
export function deriveBoiler(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const supply  = p(data.supplyTemp);
  const ret     = p(data.returnTemp);
  const firing  = p(data.firingRate); // MBH = 1,000 BTU/hr

  // ΔT (supply - return)
  if (ok(supply) && ok(ret)) {
    d._deltaT = fmt(supply - ret, 1);
  }

  // Input BTU/hr from firing rate (MBH × 1000)
  if (ok(firing)) {
    d._inputBtuHr = fmt(firing * 1000, 0);
  }

  return d;
}

/**
 * AHU / Air Handler derivations.
 * Fields: supplyTemp, returnTemp, cfm, staticPressure, motorAmps, motorVolts, motorKw
 */
export function deriveAHU(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const supply = p(data.supplyTemp);
  const ret    = p(data.returnTemp);
  const amps   = p(data.motorAmps || data.currentAmps || '');
  const volts  = p(data.motorVolts || data.supplyVoltage || '');
  const kw     = p(data.motorKw || '');

  if (ok(supply) && ok(ret)) d._deltaT = fmt(Math.abs(supply - ret), 1);

  if (changedField !== 'motorKw' && ok(amps) && ok(volts)) {
    d.motorKw = fmt(ampsToKw3Ph(amps, volts), 2);
  }
  if (changedField !== 'motorAmps' && ok(kw) && ok(volts)) {
    d.motorAmps = fmt(kwToAmps3Ph(kw, volts), 1);
  }

  return d;
}

/**
 * Cooling Tower derivations.
 * Fields: enteringWaterTemp, leavingWaterTemp, gpm, fanAmps, fanVolts, fanKw
 */
export function deriveTower(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const ewt  = p(data.enteringWaterTemp);
  const lwt  = p(data.leavingWaterTemp);
  const gpm  = p(data.gpm || data.flowGPM || '');
  const amps = p(data.fanAmps || data.motorAmps || '');
  const volts = p(data.fanVolts || data.motorVolts || '');
  const kw   = p(data.fanKw || data.motorKw || '');

  // Range (ΔT)
  if (ok(ewt) && ok(lwt)) {
    d._range = fmt(ewt - lwt, 1);
  }

  // Heat rejected (BTU/hr)
  if (ok(gpm) && ok(ewt) && ok(lwt)) {
    d._heatRejected = fmt(gpmDeltaTtoBtu(gpm, Math.abs(ewt - lwt)), 0);
  }

  if (changedField !== 'fanKw' && ok(amps) && ok(volts)) {
    d.fanKw = fmt(ampsToKw3Ph(amps, volts), 2);
  }
  if (changedField !== 'fanAmps' && ok(kw) && ok(volts)) {
    d.fanAmps = fmt(kwToAmps3Ph(kw, volts), 1);
  }

  return d;
}

/**
 * Baseline form in EquipmentLibrary (the setBD / baselineData pattern).
 * Fields: tons, kwPerTon, gpm, head, motorHp, efficiency (0–100%)
 * Derived: kW from tons×kwPerTon, HP from pump formula, kW from HP, BTU/hr
 */
export function deriveBaseline(
  data: Record<string, string>,
  changedField: string,
  equipmentType: string
): Derived {
  const d: Derived = {};
  const tons    = p(data.tons);
  const kpt     = p(data.kwPerTon);
  const gpm     = p(data.gpm);
  const head    = p(data.head);
  const hp      = p(data.motorHp);
  const eff     = p(data.efficiency) / 100 || 0.85; // stored as 0–100%
  const volts   = p(data.voltage || '480');
  const amps    = p(data.ampRating || '');
  const kw      = p(data.ratedKW || '');

  // Chiller/HVAC — tons + kW/ton → total kW draw
  if (['chiller', 'ahu', 'air_handler', 'cooling_tower'].includes(equipmentType)) {
    if (changedField !== 'ratedKW' && ok(tons) && ok(kpt)) {
      d.ratedKW = fmt(tons * kpt, 1);
    }
    if (ok(tons)) {
      d._btuHr = fmt(tonsToBtu(tons), 0);
    }
    // kW/ton from tons + kW
    if (changedField !== 'kwPerTon' && ok(tons) && ok(kw)) {
      d.kwPerTon = fmt(kw / tons, 3);
    }
  }

  // Pump — GPM + Head + eff → HP → kW; or HP → kW
  if (['pump', 'compressor'].includes(equipmentType)) {
    if (changedField !== 'motorHp' && ok(gpm) && ok(head)) {
      const calcHp = (gpm * head) / (3960 * (eff || 0.75));
      if (ok(calcHp)) {
        d.motorHp = fmt(calcHp, 1);
        d._motorKw = fmt(hpToKw(calcHp), 2);
      }
    }
    if (changedField !== 'motorHp' && ok(hp)) {
      d._motorKw = fmt(hpToKw(hp), 2);
    }
  }

  // Electrical — HP ↔ kW ↔ amps (any equipment)
  if (changedField !== 'motorHp' && ok(kw)) {
    d._hpFromKw = fmt(kwToHp(kw), 1);
  }
  if (changedField !== 'ratedKW' && ok(hp)) {
    d.ratedKW = fmt(hpToKw(hp), 2);
  }
  if (ok(kw) && ok(volts)) {
    d._flaFromKw = fmt(kwToAmps3Ph(kw, volts), 1);
  }
  if (changedField !== 'ratedKW' && ok(amps) && ok(volts)) {
    d.ratedKW = fmt(ampsToKw3Ph(amps, volts), 2);
  }

  // Hot water / boiler — GPM + ΔT → BTU/hr
  if (['boiler', 'hot_water_heater', 'heat_exchanger'].includes(equipmentType)) {
    const supplyT = p(data.supplyTemp || data.setpointTemp || '');
    const returnT = p(data.returnTemp || '');
    if (ok(gpm) && ok(supplyT) && ok(returnT)) {
      d._btuHr = fmt(gpmDeltaTtoBtu(gpm, Math.abs(supplyT - returnT)), 0);
    }
    // inputBTU from firingRate (MBH)
    const firingMbh = p(data.firingRate || data.inputBTU || '');
    if (ok(firingMbh) && data.firingRate) {
      d._inputBtuHr = fmt(firingMbh * 1000, 0);
    }
  }

  return d;
}

/**
 * Generic heat exchanger derivations.
 */
export function deriveHeatExchanger(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const primIn  = p(data.designPrimaryTempIn);
  const primOut = p(data.designPrimaryTempOut);
  const secIn   = p(data.designSecondaryTempIn);
  const secOut  = p(data.designSecondaryTempOut);
  const gpm     = p(data.gpm || '');

  if (ok(primIn) && ok(primOut)) d._primaryDeltaT  = fmt(Math.abs(primIn  - primOut), 1);
  if (ok(secIn)  && ok(secOut))  d._secondaryDeltaT = fmt(Math.abs(secIn  - secOut),  1);

  // BTU/hr from primary-side GPM + ΔT
  if (ok(gpm) && ok(primIn) && ok(primOut)) {
    d._heatDuty = fmt(gpmDeltaTtoBtu(gpm, Math.abs(primIn - primOut)), 0);
  }

  return d;
}

/**
 * Generator derivations.
 * Fields: ratedKW, ratedKVA, voltage, phases, ampRating
 */
export function deriveGenerator(data: Record<string, string>, changedField: string): Derived {
  const d: Derived = {};
  const kw    = p(data.ratedKWGen || data.ratedKW || '');
  const kva   = p(data.ratedKVA || '');
  const volts = p(data.voltage || '480');
  const amps  = p(data.ampRating || '');

  // kVA from kW (assume PF = 0.8 for generators)
  if (changedField !== 'ratedKVA' && ok(kw)) {
    d.ratedKVA = fmt(kw / 0.8, 1);
  }
  // kW from kVA
  if (changedField !== 'ratedKW' && !ok(kw) && ok(kva)) {
    d.ratedKWGen = fmt(kva * 0.8, 1);
  }
  // FLA from kW
  if (ok(kw) && ok(volts)) {
    d._fla = fmt(kwToAmps3Ph(kw, volts, 0.8), 1);
  }
  // kW from amps + volts
  if (changedField !== 'ratedKWGen' && ok(amps) && ok(volts)) {
    d.ratedKWGen = fmt(ampsToKw3Ph(amps, volts, 0.8), 1);
  }

  return d;
}

/**
 * Universal display-label helper. Returns a human-readable string showing
 * what was auto-derived and from what, e.g. "Auto (amps × volts)"
 */
export function autoLabel(derivedFields: Derived): Record<string, string> {
  const labels: Record<string, string> = {};
  // Map field key to its source description
  const sources: Record<string, string> = {
    motorKw:    'amps × volts',
    motorCurrent: 'kW ÷ volts',
    fanKw:      'amps × volts',
    fanAmps:    'kW ÷ volts',
    motorAmps:  'kW ÷ volts',
    ratedKW:    'HP × 0.746',
    ratedKVA:   'kW ÷ 0.8 PF',
    kwPerTon:   'kW ÷ tons',
    motorHp:    'GPM × head ÷ 3960',
    _btuHr:     'tons × 12,000',
    _deltaT:    'supply − return',
    _chilledDeltaT: 'EWT − LWT',
    _condenserDeltaT: 'EWT − LWT',
    _kwPerTon:  'kW ÷ tons',
    _cop:       'tons × 3.517 ÷ kW',
    _range:     'EWT − LWT',
    _heatRejected: 'GPM × ΔT × 500',
    _heatDuty:  'GPM × ΔT × 500',
    _motorKw:   'HP × 0.746',
    _flaFromKw: 'kW ÷ (√3 × V × PF)',
    _fla:       'kW ÷ (√3 × V × 0.8)',
    _inputBtuHr: 'MBH × 1,000',
    _hpFromKw:  'kW ÷ 0.746',
  };
  Object.keys(derivedFields).forEach(k => {
    if (sources[k]) labels[k] = sources[k];
  });
  return labels;
}
