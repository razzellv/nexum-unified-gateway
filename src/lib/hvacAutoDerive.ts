/**
 * HVAC Auto-Derivation Engine
 *
 * Runs in the background whenever data arrives from any source:
 *   - BMS/BAS poll (nexum_bms_poll_update event)
 *   - Manual operator/engineer input (equipment-updated event)
 *   - CMMS feed (facility-log-submitted event)
 *
 * For each piece of HVAC equipment it finds in localStorage it:
 *   1. Collects all available numeric readings (from library, BMS live, facility logs)
 *   2. Derives every metric the available data supports (COP, EER, sensible load, etc.)
 *   3. Writes results to nexum_hvac_derived[equipmentId] so any component can read them
 *   4. Dispatches 'hvac-derived-updated' so live UI panels refresh
 *
 * Output key: localStorage 'nexum_hvac_derived'
 *   → Record<equipmentId, HvacDerived>
 */

import {
  cop as calcCop,
  btuToTons, tonsToBtu, hpToKw, kwToHp, gpmDeltaTtoBtu,
  kwPerTon as calcKwPerTon,
  fToC, cToF,
} from './engineeringCalcs';

import {
  sensibleHeat, latentHeat, totalCooling, eer as calcEer, seerFromEer,
  fanPower, chilledWaterGpm, pumpPower, dewPoint, humidityRatio, airEnthalpy,
  HVAC_CONVERSIONS,
} from './hvacFormulas';

// ── Storage key ───────────────────────────────────────────────────────────────

export const HVAC_DERIVED_KEY = 'nexum_hvac_derived';

// ── Output type ───────────────────────────────────────────────────────────────

export interface HvacDerived {
  equipmentId: string;
  equipmentType?: string;
  equipmentName?: string;

  // Refrigeration / cooling
  coolingCapacityBtu?: number;
  coolingCapacityTons?: number;
  cop?: number;
  eer?: number;
  seer?: number;
  kwPerTon?: number;

  // Thermal — air side
  airDeltaT?: number;         // °F
  sensibleLoadBtu?: number;
  totalCoolingBtu?: number;

  // Thermal — water side
  chilledWaterDeltaT?: number;
  chilledWaterCapacityBtu?: number;
  requiredGpm?: number;

  // Fan / blower
  fanPowerKw?: number;

  // Psychrometrics
  dewPointF?: number;
  humidityRatioGrains?: number;
  enthalpyBtuLb?: number;

  // Boiler / heating
  hotWaterCapacityBtu?: number;

  // Meta
  source: 'bms' | 'manual' | 'cmms' | 'mixed';
  updatedAt: string;
  availableFields: string[];  // list of inputs that were present
}

// ── Safe number parsing ───────────────────────────────────────────────────────

function n(v: unknown): number {
  const f = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isFinite(f) ? f : NaN;
}
function ok(v: number): boolean { return isFinite(v) && !isNaN(v) && v !== 0; }
function safe<T>(fn: () => T, fallback: T): T { try { return fn(); } catch { return fallback; } }

function readLS<T>(key: string, fallback: T): T {
  return safe<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }, fallback);
}

// ── HVAC equipment type detection ─────────────────────────────────────────────

const HVAC_TYPES = new Set([
  'chiller', 'ahu', 'air_handler', 'air_handling_unit', 'cooling_tower',
  'condensing_unit', 'heat_pump', 'vrf', 'hvac', 'fan_coil', 'doas',
  'makeup_air', 'rooftop_unit', 'rtu', 'split_system', 'boiler',
  'hot_water_heater', 'pump', 'fan', 'blower', 'exhaust_fan',
  'heat_exchanger', 'humidifier', 'dehumidifier', 'cooling_coil',
  'heating_coil', 'economizer',
]);

function isHvacType(type: string): boolean {
  const t = (type || '').toLowerCase().replace(/[\s-]/g, '_');
  return HVAC_TYPES.has(t) || /chiller|hvac|ahu|boiler|pump|fan|cool|heat|refrig|air/i.test(type);
}

// ── Merge equipment readings from all sources ─────────────────────────────────

function mergeReadings(
  equipmentId: string,
  equipRecord: Record<string, any>,
): { readings: Record<string, number>; source: HvacDerived['source'] } {
  const readings: Record<string, number> = {};
  const sources = new Set<string>();

  // 1. From equipment library record itself (baseline fields)
  const NUMERIC_FIELDS = [
    'tons', 'kwPerTon', 'currentKw', 'ratedKW', 'motorHp', 'motorKw',
    'cfm', 'staticPressure', 'supplyTemp', 'returnTemp',
    'gpm', 'head', 'enteringWaterTemp', 'leavingWaterTemp',
    'enteringCondenserWaterTemp', 'leavingCondenserWaterTemp',
    'firingRate', 'inputBTU', 'fanHp',
    'relativeHumidity', 'humidity', 'outdoorHumidity',
    'dryBulbTemp', 'outdoorTemp', 'indoorTemp', 'supplyAirTemp', 'returnAirTemp',
    'ratedCapacity', 'currentEfficiency', 'ratedEfficiency',
    'designFlowRate', 'designSupplyTemp', 'designReturnTemp',
    'flowGPM', 'estimatedTons', 'operatingKw',
  ];
  for (const f of NUMERIC_FIELDS) {
    const v = n(equipRecord[f] ?? equipRecord[f.toLowerCase()]);
    if (ok(v)) { readings[f] = v; sources.add('manual'); }
  }

  // 2. From BMS live data (keyed by equipmentId in nexum_bms_live_data)
  const bmsAll = readLS<Record<string, any>>(LIVE_DATA_KEY, {});
  for (const [feedKey, feedData] of Object.entries(bmsAll)) {
    const items: any[] = feedData?.liveData || feedData?.data || [];
    for (const item of items) {
      if ((item.equipmentId || '') !== equipmentId) continue;
      const pts = item.points || item.readings || {};
      for (const [k, pt] of Object.entries(pts)) {
        const val = typeof (pt as any).value === 'number' ? (pt as any).value : n((pt as any).value);
        if (ok(val)) { readings[k] = val; sources.add('bms'); }
      }
    }
  }

  // 3. From facility logs — take the most recent log entry for this equipment
  const logs: any[] = readLS<any[]>(FAC_LOGS_KEY, []);
  const myLogs = logs.filter(l => l.equipmentId === equipmentId).slice(-10);
  for (const log of myLogs) {
    for (const [k, v] of Object.entries(log)) {
      const val = n(v);
      if (ok(val) && !['PK', 'SK'].includes(k)) { readings[k] = val; sources.add(log.source === 'bms_auto' ? 'bms' : 'manual'); }
    }
  }

  const srcArr = [...sources];
  const src: HvacDerived['source'] = srcArr.length > 1 ? 'mixed' : srcArr[0] === 'bms' ? 'bms' : srcArr[0] === 'cmms' ? 'cmms' : 'manual';
  return { readings, source: src };
}

// Constants matching BMSPollService
const LIVE_DATA_KEY = 'nexum_bms_live_data';
const FAC_LOGS_KEY  = 'nexum_facility_logs';

// ── Derive metrics from a readings map + equipment type ───────────────────────

function deriveFromReadings(
  equipmentId: string,
  equipRecord: Record<string, any>,
  readings: Record<string, number>,
  source: HvacDerived['source'],
): HvacDerived {
  const type = (equipRecord.equipmentType || '').toLowerCase();
  const result: HvacDerived = {
    equipmentId,
    equipmentType: equipRecord.equipmentType,
    equipmentName: equipRecord.name || equipRecord.equipmentName || equipRecord.model,
    source,
    updatedAt: new Date().toISOString(),
    availableFields: Object.keys(readings),
  };

  // ── Helper aliases (try multiple field name variants from BMS/CMMS) ─────────
  const getTons = () =>
    readings.tons || readings.estimatedTons || readings.coolingCapacityTons || NaN;

  const getKw = () =>
    readings.currentKw || readings.operatingKw || readings.ratedKW || readings.motorKw || NaN;

  const getCfm = () =>
    readings.cfm || readings.airflow || readings.airflowCFM || readings.cfmAirflow || NaN;

  const getGpm = () =>
    readings.gpm || readings.flowGPM || readings.waterFlowGpm || NaN;

  const getSupply = () =>
    readings.supplyTemp || readings.supplyAirTemp || readings.leavingWaterTemp ||
    readings.supplyAirTemperature || NaN;

  const getReturn = () =>
    readings.returnTemp || readings.returnAirTemp || readings.enteringWaterTemp ||
    readings.returnAirTemperature || NaN;

  const getRH = () =>
    readings.relativeHumidity || readings.humidity || readings.outdoorHumidity || NaN;

  const getDB = () =>
    readings.dryBulbTemp || readings.outdoorTemp || readings.indoorTemp ||
    readings.supplyTemp || NaN;

  // ── Cooling capacity / refrigeration ──────────────────────────────────────

  const tons = getTons();
  const kw   = getKw();

  if (ok(tons)) {
    result.coolingCapacityTons = tons;
    result.coolingCapacityBtu  = tonsToBtu(tons);
  }

  if (ok(tons) && ok(kw)) {
    result.cop      = calcCop(tons, kw);
    result.kwPerTon = calcKwPerTon(kw, tons);
    const btu = tonsToBtu(tons);
    result.eer  = calcEer(btu, kw * 1000);
    result.seer = seerFromEer(result.eer);
  }

  // ── Air-side: AHU, RTU, fan coil, split system ────────────────────────────

  const cfm    = getCfm();
  const supply = getSupply();
  const ret    = getReturn();

  if (ok(cfm) && ok(supply) && ok(ret)) {
    const dt = Math.abs(ret - supply);
    result.airDeltaT      = dt;
    result.sensibleLoadBtu = sensibleHeat(cfm, dt);
    if (result.coolingCapacityBtu === undefined) {
      result.coolingCapacityBtu  = result.sensibleLoadBtu;
      result.coolingCapacityTons = btuToTons(result.sensibleLoadBtu);
    }
  }

  // ── Water-side: chiller, chilled water AHU, heat exchanger ───────────────

  const gpm = getGpm();
  const ewt = readings.enteringWaterTemp ?? readings.chilledWaterReturn ?? NaN;
  const lwt = readings.leavingWaterTemp  ?? readings.chilledWaterSupply ?? NaN;

  if (ok(gpm) && ok(ewt) && ok(lwt)) {
    const dt = Math.abs(ewt - lwt);
    result.chilledWaterDeltaT      = dt;
    result.chilledWaterCapacityBtu = gpmDeltaTtoBtu(gpm, dt);
    if (!result.coolingCapacityBtu) {
      result.coolingCapacityBtu  = result.chilledWaterCapacityBtu;
      result.coolingCapacityTons = btuToTons(result.chilledWaterCapacityBtu);
    }
  }

  if (result.coolingCapacityBtu && !ok(gpm)) {
    const dt = (ok(ewt) && ok(lwt)) ? Math.abs(ewt - lwt) : 10; // default 10°F ΔT
    result.requiredGpm = chilledWaterGpm(result.coolingCapacityBtu, dt);
  }

  // ── Fan power ──────────────────────────────────────────────────────────────

  const sp = readings.staticPressure || readings.staticPressureInWg || NaN;
  if (ok(cfm) && ok(sp)) {
    result.fanPowerKw = fanPower(cfm, sp);
  } else if (ok(readings.fanHp)) {
    result.fanPowerKw = hpToKw(readings.fanHp);
  } else if (ok(readings.motorHp)) {
    result.fanPowerKw = hpToKw(readings.motorHp);
  }

  // ── Psychrometrics ─────────────────────────────────────────────────────────

  const db = getDB();
  const rh = getRH();

  if (ok(db) && ok(rh)) {
    result.dewPointF            = dewPoint(db, rh);
    result.humidityRatioGrains  = humidityRatio(db, rh);
    result.enthalpyBtuLb        = airEnthalpy(db, result.humidityRatioGrains);
  }

  // ── Hot water / boiler ────────────────────────────────────────────────────

  const hwGpm    = getGpm();
  const hwSupply = readings.supplyTemp   ?? readings.boilerSupplyTemp ?? NaN;
  const hwReturn = readings.returnTemp   ?? readings.boilerReturnTemp ?? NaN;
  const firing   = readings.firingRate   ?? NaN; // MBH
  const inputBtu = readings.inputBTU     ?? NaN;

  if (/boiler|hot.water/i.test(type)) {
    if (ok(hwGpm) && ok(hwSupply) && ok(hwReturn)) {
      result.hotWaterCapacityBtu = gpmDeltaTtoBtu(hwGpm, Math.abs(hwSupply - hwReturn));
    } else if (ok(firing)) {
      result.hotWaterCapacityBtu = firing * 1000 * 0.85; // MBH × 1000 × ~85% efficiency estimate
    } else if (ok(inputBtu)) {
      result.hotWaterCapacityBtu = inputBtu * 0.85;
    }
  }

  return result;
}

// ── Main derivation runner ────────────────────────────────────────────────────

export function runHvacAutoDerive(): number {
  const equipment: any[] = readLS<any[]>('nexum_equipment_library', []);
  if (!equipment.length) return 0;

  const existing = readLS<Record<string, HvacDerived>>(HVAC_DERIVED_KEY, {});
  let updated = 0;

  for (const eq of equipment) {
    const id = eq.equipmentId || eq.id;
    if (!id) continue;
    if (!isHvacType(eq.equipmentType || '')) continue;

    const { readings, source } = mergeReadings(id, eq);
    if (!Object.keys(readings).length) continue;

    const derived = deriveFromReadings(id, eq, readings, source);

    // Only write if something meaningful was derived
    const meaningful = (
      derived.cop !== undefined ||
      derived.eer !== undefined ||
      derived.kwPerTon !== undefined ||
      derived.sensibleLoadBtu !== undefined ||
      derived.chilledWaterCapacityBtu !== undefined ||
      derived.fanPowerKw !== undefined ||
      derived.dewPointF !== undefined ||
      derived.hotWaterCapacityBtu !== undefined
    );
    if (!meaningful) continue;

    existing[id] = derived;
    updated++;
  }

  if (updated > 0) {
    try { localStorage.setItem(HVAC_DERIVED_KEY, JSON.stringify(existing)); } catch { /* quota */ }
    safe(() => window.dispatchEvent(new CustomEvent('hvac-derived-updated')), undefined);
  }

  return updated;
}

// ── Hook: read derived metrics for one or all equipment ───────────────────────

import { useState, useEffect } from 'react';

export function useHvacDerived(equipmentId?: string): HvacDerived | HvacDerived[] | null {
  const [data, setData] = useState<HvacDerived | HvacDerived[] | null>(() => {
    const all = readLS<Record<string, HvacDerived>>(HVAC_DERIVED_KEY, {});
    return equipmentId ? (all[equipmentId] ?? null) : Object.values(all);
  });

  useEffect(() => {
    const refresh = () => {
      const all = readLS<Record<string, HvacDerived>>(HVAC_DERIVED_KEY, {});
      setData(equipmentId ? (all[equipmentId] ?? null) : Object.values(all));
    };
    window.addEventListener('hvac-derived-updated', refresh);
    window.addEventListener('equipment-updated', refresh);
    return () => {
      window.removeEventListener('hvac-derived-updated', refresh);
      window.removeEventListener('equipment-updated', refresh);
    };
  }, [equipmentId]);

  return data;
}

// ── Inline derived panel used inside Equipment Library edit form ───────────────

import { useMemo } from 'react';

interface InlineField {
  label: string;
  value: string;
  unit?: string;
  good?: boolean;   // undefined = neutral, true = green, false = amber/red
}

function fmtNum(v: number | undefined, dec = 2): string {
  if (v === undefined || !isFinite(v)) return '';
  return v.toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

export function useInlineHvacDerived(
  formValues: Record<string, string | number>,
  equipmentType: string,
): InlineField[] {
  return useMemo(() => {
    const fields: InlineField[] = [];
    if (!isHvacType(equipmentType)) return fields;

    // Convert string form values to numbers for computation
    const nums: Record<string, number> = {};
    for (const [k, v] of Object.entries(formValues)) {
      const parsed = typeof v === 'number' ? v : parseFloat(String(v));
      if (isFinite(parsed) && parsed !== 0) nums[k] = parsed;
    }

    const getTons = () => nums.tons || nums.estimatedTons || nums.coolingCapacityTons || NaN;
    const getKw   = () => nums.currentKw || nums.operatingKw || nums.ratedKW || nums.motorKw || NaN;
    const getCfm  = () => nums.cfm || nums.airflow || NaN;
    const getSP   = () => nums.staticPressure || NaN;
    const getGpm  = () => nums.gpm || nums.flowGPM || NaN;

    const tons = getTons(), kw = getKw(), cfm = getCfm();
    const sp = getSP(), gpm = getGpm();
    const ewt = nums.enteringWaterTemp ?? NaN, lwt = nums.leavingWaterTemp ?? NaN;
    const supply = nums.supplyTemp ?? NaN, ret = nums.returnTemp ?? NaN;
    const rh = nums.relativeHumidity ?? NaN, db = nums.dryBulbTemp ?? nums.supplyTemp ?? NaN;

    // Cooling capacity
    if (ok(tons)) {
      fields.push({ label: 'Cooling Capacity', value: fmtNum(tonsToBtu(tons), 0), unit: 'BTU/hr' });
    }

    // COP + EER + kW/ton
    if (ok(tons) && ok(kw)) {
      const copV = calcCop(tons, kw);
      const eerV = calcEer(tonsToBtu(tons), kw * 1000);
      const kwTon = calcKwPerTon(kw, tons);
      fields.push({ label: 'COP', value: fmtNum(copV, 2), good: copV >= 3.0 });
      fields.push({ label: 'EER', value: fmtNum(eerV, 1), good: eerV >= 10 });
      fields.push({ label: 'SEER (est.)', value: fmtNum(seerFromEer(eerV), 1) });
      fields.push({ label: 'kW/ton', value: fmtNum(kwTon, 3), unit: 'kW/ton', good: kwTon <= 0.65 });
    }

    // Sensible load
    if (ok(cfm) && ok(supply) && ok(ret)) {
      const dt = Math.abs(ret - supply);
      fields.push({ label: 'ΔT (air)', value: fmtNum(dt, 1), unit: '°F' });
      fields.push({ label: 'Sensible Load', value: fmtNum(sensibleHeat(cfm, dt), 0), unit: 'BTU/hr' });
    }

    // Fan power
    if (ok(cfm) && ok(sp)) {
      fields.push({ label: 'Fan Power', value: fmtNum(fanPower(cfm, sp), 2), unit: 'kW' });
    }

    // Chilled water capacity
    if (ok(gpm) && ok(ewt) && ok(lwt)) {
      const dt = Math.abs(ewt - lwt);
      const cap = gpmDeltaTtoBtu(gpm, dt);
      fields.push({ label: 'CW ΔT', value: fmtNum(dt, 1), unit: '°F' });
      fields.push({ label: 'CW Capacity', value: fmtNum(cap, 0), unit: 'BTU/hr' });
      fields.push({ label: 'Equiv. Tons', value: fmtNum(btuToTons(cap), 1), unit: 'tons' });
    }

    // Psychrometrics
    if (ok(db) && ok(rh)) {
      fields.push({ label: 'Dew Point', value: fmtNum(dewPoint(db, rh), 1), unit: '°F' });
      const hr = humidityRatio(db, rh);
      fields.push({ label: 'Humidity Ratio', value: fmtNum(hr, 1), unit: 'gr/lb' });
      fields.push({ label: 'Air Enthalpy', value: fmtNum(airEnthalpy(db, hr), 2), unit: 'BTU/lb' });
    }

    return fields;
  }, [JSON.stringify(formValues), equipmentType]);
}
