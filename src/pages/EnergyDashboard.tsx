import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";
import { BaselineRatesManager } from "@/components/BaselineRatesManager";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { getEnergyDashboard } from "@/lib/nexum-api";
import { MPCCPanel } from '@/components/energy/MPCCPanel';
import {
  Zap, DollarSign, Clock, RefreshCw, Flame, Snowflake, Wind, Droplets,
  AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Lightbulb,
  Moon, Sun, Activity, Gauge, Building2, BarChart3, ChevronRight,
  Settings2, ChevronDown, ChevronUp, Edit,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { computeWaterHealth } from '@/lib/waterChemistry';

// ── Existing data types (unchanged) ──────────────────────────────────────────

interface EnergyData {
  facility_id: string;
  generated_at: string;
  period_days: number;
  rates: { electric: number; gas: number; water: number };
  summary: {
    total_kwh_consumed: number;
    estimated_electric_cost: number;
    total_therms_consumed: number;
    total_ccf_consumed: number;
    total_btus_consumed: number;
    estimated_gas_cost: number;
    gas_equivalent_kwh: number;
    total_gallons_consumed: number;
    estimated_water_cost: number;
    total_energy_equivalent_kwh: number;
    estimated_total_utility_cost: number;
    total_runtime_hours: number;
    average_kwh_per_day: number;
  };
  by_utility: {
    electric: Array<{ system_type: string; kwh: number; estimated_cost: number; runtime_hours: number; percentage_of_electric: number }>;
    gas: Array<{ system_type: string; therms: number; btus: number; estimated_cost: number; percentage_of_gas: number }>;
    water: Array<{ system_type: string; gallons: number; estimated_cost: number; percentage_of_water: number }>;
  };
  equipment_breakdown: Array<{ equipment_id: string; type: string; name: string; total_kwh: number; estimated_cost: number }>;
}

// ── New types ─────────────────────────────────────────────────────────────────

interface EquipmentLoadItem {
  id: string;
  name: string;
  equipmentType: string;
  category: string;
  kw: number;
  amps: number;
  voltage: string;
  phases: string;
  powerFactor: number;
  hp?: number;
  source: 'baseline' | 'estimated';
  notes?: string;
}

interface DemandTier {
  name: 'On-Peak' | 'Mid-Peak' | 'Off-Peak';
  hours: string;
  rateMultiplier: number;
  description: string;
}

interface QuarterData {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  months: string;
  season: string;
  kwhEstimate: number;
  costEstimate: number;
  dominantLoad: string;
  peakMonth: string;
  seasonalNote: string;
  isPeak: boolean;
}

// ── Equipment load defaults lookup ────────────────────────────────────────────

interface LoadDefault { kw: number; voltage: number; phases: string; pf: number; hp?: number; category: string }

const LOAD_DEFAULTS: Record<string, LoadDefault> = {
  chiller:        { kw: 80,   voltage: 480, phases: '3Ø', pf: 0.90, hp: 107,  category: 'HVAC' },
  ahu:            { kw: 12,   voltage: 480, phases: '3Ø', pf: 0.87, hp: 15,   category: 'HVAC' },
  'air handler':  { kw: 12,   voltage: 480, phases: '3Ø', pf: 0.87, hp: 15,   category: 'HVAC' },
  'air handling': { kw: 12,   voltage: 480, phases: '3Ø', pf: 0.87, hp: 15,   category: 'HVAC' },
  boiler:         { kw: 3.5,  voltage: 120, phases: '1Ø', pf: 0.85,           category: 'Heating' },
  'hot water':    { kw: 4.5,  voltage: 240, phases: '1Ø', pf: 0.92,           category: 'Heating' },
  pump:           { kw: 5.6,  voltage: 480, phases: '3Ø', pf: 0.88, hp: 7.5,  category: 'Pumps & Motors' },
  motor:          { kw: 5.6,  voltage: 480, phases: '3Ø', pf: 0.88, hp: 7.5,  category: 'Pumps & Motors' },
  compressor:     { kw: 18.6, voltage: 480, phases: '3Ø', pf: 0.88, hp: 25,   category: 'Pumps & Motors' },
  'cooling tower':{ kw: 11.2, voltage: 480, phases: '3Ø', pf: 0.87, hp: 15,   category: 'HVAC' },
  vfd:            { kw: 7.5,  voltage: 480, phases: '3Ø', pf: 0.95,           category: 'HVAC' },
  'exhaust fan':  { kw: 0.75, voltage: 120, phases: '1Ø', pf: 0.85, hp: 1,    category: 'HVAC' },
  lighting:       { kw: 4.0,  voltage: 120, phases: '1Ø', pf: 0.95,           category: 'Lighting' },
  sprinkler:      { kw: 5.6,  voltage: 480, phases: '3Ø', pf: 0.88, hp: 7.5,  category: 'Fire & Safety' },
  'fire pump':    { kw: 18.6, voltage: 480, phases: '3Ø', pf: 0.88, hp: 25,   category: 'Fire & Safety' },
  'fire alarm':   { kw: 0.5,  voltage: 120, phases: '1Ø', pf: 0.90,           category: 'Fire & Safety' },
  mcc:            { kw: 45,   voltage: 480, phases: '3Ø', pf: 0.88,           category: 'MCC / Distribution' },
  elevator:       { kw: 11.2, voltage: 208, phases: '3Ø', pf: 0.85,           category: 'Vertical Transport' },
  generator:      { kw: 0,    voltage: 480, phases: '3Ø', pf: 0.85,           category: 'Emergency Power' },
  'ups':          { kw: 3.0,  voltage: 208, phases: '1Ø', pf: 0.90,           category: 'Emergency Power' },
};

const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'HVAC':                 { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    bar: 'bg-blue-500' },
  'Heating':              { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30',  bar: 'bg-orange-500' },
  'Pumps & Motors':       { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/30',  bar: 'bg-indigo-500' },
  'Lighting':             { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   bar: 'bg-amber-500' },
  'Fire & Safety':        { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30',    bar: 'bg-rose-500' },
  'MCC / Distribution':   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500' },
  'Vertical Transport':   { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30',  bar: 'bg-purple-500' },
  'Emergency Power':      { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/30',   bar: 'bg-slate-400' },
  'Other':                { bg: 'bg-muted',          text: 'text-muted-foreground', border: 'border-border',    bar: 'bg-muted-foreground' },
};

// ── Calculations ──────────────────────────────────────────────────────────────

function calcAmps(kw: number, voltageV: number, phases: string, pf: number): number {
  if (kw === 0 || voltageV === 0) return 0;
  const watts = kw * 1000;
  if (phases === '3Ø') {
    return parseFloat((watts / (voltageV * 1.732 * pf)).toFixed(1));
  }
  return parseFloat((watts / (voltageV * pf)).toFixed(1));
}

function matchLoadDefault(equipmentType: string): LoadDefault {
  const t = equipmentType.toLowerCase();
  for (const [key, def] of Object.entries(LOAD_DEFAULTS)) {
    if (t.includes(key)) return def;
  }
  return { kw: 2.0, voltage: 120, phases: '1Ø', pf: 0.85, category: 'Other' };
}

function getEquipmentLoads(): EquipmentLoadItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem('nexum_equipment_library') || '[]');
    const baselines = JSON.parse(localStorage.getItem('nexum_equipment_baselines') || '{}');
    return stored.map((eq: any, idx: number) => {
      const id = eq.equipmentId || eq.id || `eq-${idx}`;
      const name = eq.equipmentName || eq.name || `${eq.manufacturer || ''} ${eq.model || eq.equipmentType}`.trim();
      const def = matchLoadDefault(eq.equipmentType || '');
      const baseline = baselines[id];

      // Try to get HP/kW from baseline spec if available
      let kw = def.kw;
      let source: 'baseline' | 'estimated' = 'estimated';
      if (baseline?.ratedCapacity) {
        const hpMatch = baseline.ratedCapacity.match(/(\d+(?:\.\d+)?)\s*hp/i);
        const kwMatch = baseline.ratedCapacity.match(/(\d+(?:\.\d+)?)\s*kw/i);
        const tonMatch = baseline.ratedCapacity.match(/(\d+(?:\.\d+)?)\s*ton/i);
        if (hpMatch) { kw = parseFloat(hpMatch[1]) * 0.746 / def.pf; source = 'baseline'; }
        else if (kwMatch) { kw = parseFloat(kwMatch[1]); source = 'baseline'; }
        else if (tonMatch) { kw = parseFloat(tonMatch[1]) * 0.9; source = 'baseline'; } // ~0.9 kW/ton design
      }

      return {
        id,
        name,
        equipmentType: eq.equipmentType || 'Unknown',
        category: def.category,
        kw: parseFloat(kw.toFixed(1)),
        amps: calcAmps(kw, def.voltage, def.phases, def.pf),
        voltage: `${def.voltage}V`,
        phases: def.phases,
        powerFactor: def.pf,
        hp: def.hp,
        source,
      };
    });
  } catch { return []; }
}

function getTimerLoads(): EquipmentLoadItem[] {
  try {
    const timers = JSON.parse(localStorage.getItem('nexum_climate_timers') || '[]');
    return timers.filter((t: any) => t.enabled).map((t: any, idx: number) => {
      const def = matchLoadDefault(t.systemType || '');
      return {
        id: t.id || `timer-${idx}`,
        name: t.name || t.systemType,
        equipmentType: t.systemType,
        category: t.systemType === 'lighting' ? 'Lighting' : t.systemType === 'sprinkler' ? 'Fire & Safety' : def.category,
        kw: def.kw,
        amps: calcAmps(def.kw, def.voltage, def.phases, def.pf),
        voltage: `${def.voltage}V`,
        phases: def.phases,
        powerFactor: def.pf,
        source: 'estimated' as const,
        notes: `Zone: ${t.zone || '—'} · ${t.durationMinutes || 0} min/cycle`,
      };
    });
  } catch { return []; }
}

function getCurrentDemandTier(): DemandTier {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 20) {
    return { name: 'On-Peak', hours: '8 AM – 8 PM', rateMultiplier: 1.5, description: 'Peak demand charges apply. Avoid starting large motors or adding loads.' };
  }
  if ((hour >= 6 && hour < 8) || (hour >= 20 && hour < 22)) {
    return { name: 'Mid-Peak', hours: '6–8 AM & 8–10 PM', rateMultiplier: 1.15, description: 'Moderate demand period. Transition hours — good for pre-cooling or post-peak wind-down.' };
  }
  return { name: 'Off-Peak', hours: '10 PM – 6 AM', rateMultiplier: 0.75, description: 'Lowest demand charges. Best window to run high-load processes, charge storage, or pre-condition spaces.' };
}

function buildQuarterlyData(data: EnergyData): QuarterData[] {
  const base = data.summary.average_kwh_per_day;
  const rate = data.rates.electric;

  return [
    {
      quarter: 'Q1', label: 'Q1 — Winter', months: 'Jan · Feb · Mar', season: 'Heating Dominant',
      kwhEstimate: Math.round(base * 90 * 1.05),
      costEstimate: Math.round(base * 90 * 1.05 * rate),
      dominantLoad: 'Boilers & Heating',
      peakMonth: 'January',
      seasonalNote: 'Heating plant at max output. Lighting load elevated (shorter days). Chiller plant on standby saves cooling energy but boiler aux and HWP loads increase.',
      isPeak: false,
    },
    {
      quarter: 'Q2', label: 'Q2 — Spring', months: 'Apr · May · Jun', season: 'Transition',
      kwhEstimate: Math.round(base * 91 * 0.88),
      costEstimate: Math.round(base * 91 * 0.88 * rate),
      dominantLoad: 'AHUs & Fans',
      peakMonth: 'June',
      seasonalNote: 'Best efficiency quarter. Economizer hours peak in April–May — free cooling reduces chiller runtime. Heating plant dials back. Lowest combined utility bill typical.',
      isPeak: false,
    },
    {
      quarter: 'Q3', label: 'Q3 — Summer', months: 'Jul · Aug · Sep', season: 'Cooling Dominant',
      kwhEstimate: Math.round(base * 92 * 1.35),
      costEstimate: Math.round(base * 92 * 1.35 * rate),
      dominantLoad: 'Chillers & Cooling Tower',
      peakMonth: 'August',
      seasonalNote: 'Peak demand quarter. Chiller plant runs at or above design capacity. Condenser water approach temperatures rise with high wet-bulb. Demand charges are highest — avoid on-peak spikes.',
      isPeak: true,
    },
    {
      quarter: 'Q4', label: 'Q4 — Fall', months: 'Oct · Nov · Dec', season: 'Heating Emerging',
      kwhEstimate: Math.round(base * 92 * 0.97),
      costEstimate: Math.round(base * 92 * 0.97 * rate),
      dominantLoad: 'Boilers & Lighting',
      peakMonth: 'December',
      seasonalNote: 'Heating plant restarts in October–November. Lighting load rises again as days shorten. Holiday occupancy patterns affect ventilation scheduling.',
      isPeak: false,
    },
  ];
}

// ── Demand reduction actions ───────────────────────────────────────────────────

interface ReductionAction {
  action: string;
  savingsKW: number;
  timing: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
  category: string;
}

function getDemandReductions(loads: EquipmentLoadItem[], tier: DemandTier): ReductionAction[] {
  const actions: ReductionAction[] = [
    { action: 'Pre-cool building before 8 AM (off-peak) to defer chiller start past on-peak window', savingsKW: 40, timing: 'Overnight / early morning', difficulty: 'Moderate', category: 'HVAC' },
    { action: 'Stage chiller plant — bring second chiller online only when first exceeds 85% load', savingsKW: 80, timing: 'On-peak hours', difficulty: 'Advanced', category: 'HVAC' },
    { action: 'Reset hot water supply temperature via outdoor air reset curve — reduce boiler firing', savingsKW: 3, timing: 'Mild weather days', difficulty: 'Easy', category: 'Heating' },
    { action: 'Dim or cycle non-critical lighting to 70% during on-peak demand window (8 AM–8 PM)', savingsKW: 8, timing: 'Business hours', difficulty: 'Easy', category: 'Lighting' },
    { action: 'Shift irrigation / sprinkler cycles to off-peak window (10 PM–6 AM)', savingsKW: 6, timing: 'Off-peak only', difficulty: 'Easy', category: 'Fire & Safety' },
    { action: 'Raise chilled water supply temp setpoint 2°F during off-peak to reduce overnight kW draw', savingsKW: 12, timing: 'Off-peak', difficulty: 'Moderate', category: 'HVAC' },
    { action: 'Sequence pump start/stop — avoid simultaneous large motor starts during on-peak', savingsKW: 15, timing: 'Morning startup', difficulty: 'Moderate', category: 'Pumps & Motors' },
    { action: 'Enable VFD minimum speed on AHU fans during low occupancy hours', savingsKW: 5, timing: 'Early morning / weekends', difficulty: 'Easy', category: 'HVAC' },
    { action: 'Schedule non-critical MCC loads (process equipment, auxiliary motors) to off-peak', savingsKW: 20, timing: 'Off-peak window', difficulty: 'Advanced', category: 'MCC / Distribution' },
    { action: 'Verify cooling tower fan staging — run one fan at 100% vs two at 50%', savingsKW: 3, timing: 'Cooling season', difficulty: 'Easy', category: 'HVAC' },
  ];

  // Prioritize actions relevant to current tier
  if (tier.name === 'Off-Peak') {
    return actions.filter(a => a.timing.toLowerCase().includes('off-peak') || a.difficulty === 'Advanced').slice(0, 6);
  }
  return actions.filter(a => !a.timing.toLowerCase().includes('off-peak only')).slice(0, 7);
}

// ── Demo data (unchanged) ────────────────────────────────────────────────────

const DEMO_ENERGY_DATA: EnergyData = {
  facility_id: 'demo', generated_at: new Date().toISOString(), period_days: 30,
  rates: { electric: 0.12, gas: 0.85, water: 0.004 },
  summary: {
    total_kwh_consumed: 42800, estimated_electric_cost: 5136,
    total_therms_consumed: 620, total_ccf_consumed: 620, total_btus_consumed: 62000000, estimated_gas_cost: 527,
    gas_equivalent_kwh: 18172, total_gallons_consumed: 185000, estimated_water_cost: 740,
    total_energy_equivalent_kwh: 60972, estimated_total_utility_cost: 6403,
    total_runtime_hours: 712, average_kwh_per_day: 1427,
  },
  by_utility: {
    electric: [
      { system_type: 'Chiller', kwh: 18200, estimated_cost: 2184, runtime_hours: 310, percentage_of_electric: 42.5 },
      { system_type: 'AHU', kwh: 9400, estimated_cost: 1128, runtime_hours: 720, percentage_of_electric: 22.0 },
      { system_type: 'Pump', kwh: 7600, estimated_cost: 912, runtime_hours: 690, percentage_of_electric: 17.8 },
      { system_type: 'Lighting', kwh: 4200, estimated_cost: 504, runtime_hours: 720, percentage_of_electric: 9.8 },
      { system_type: 'Other', kwh: 3400, estimated_cost: 408, runtime_hours: 680, percentage_of_electric: 7.9 },
    ],
    gas: [
      { system_type: 'Boiler', therms: 480, btus: 48000000, estimated_cost: 408, percentage_of_gas: 77.4 },
      { system_type: 'Hot Water Heater', therms: 140, btus: 14000000, estimated_cost: 119, percentage_of_gas: 22.6 },
    ],
    water: [
      { system_type: 'Cooling Tower', gallons: 95000, estimated_cost: 380, percentage_of_water: 51.4 },
      { system_type: 'Boiler Makeup', gallons: 52000, estimated_cost: 208, percentage_of_water: 28.1 },
      { system_type: 'Domestic', gallons: 38000, estimated_cost: 152, percentage_of_water: 20.5 },
    ],
  },
  equipment_breakdown: [
    { equipment_id: 'eq1', type: 'Chiller', name: 'Chiller-01', total_kwh: 18200, estimated_cost: 2184 },
    { equipment_id: 'eq2', type: 'AHU', name: 'AHU-North', total_kwh: 5200, estimated_cost: 624 },
    { equipment_id: 'eq3', type: 'AHU', name: 'AHU-South', total_kwh: 4200, estimated_cost: 504 },
    { equipment_id: 'eq4', type: 'Pump', name: 'CWP-01', total_kwh: 4100, estimated_cost: 492 },
    { equipment_id: 'eq5', type: 'Boiler', name: 'Boiler-01', total_kwh: 3600, estimated_cost: 432 },
  ],
};

function safeStr(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val || fallback;
  if (typeof val === 'object') return val.name || val.id || fallback;
  return String(val) || fallback;
}

function getSystemIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('boiler')) return <Flame className="h-5 w-5 text-orange-500" />;
  if (t.includes('chiller')) return <Snowflake className="h-5 w-5 text-blue-500" />;
  if (t.includes('ahu') || t.includes('air')) return <Wind className="h-5 w-5 text-cyan-500" />;
  if (t.includes('pump') || t.includes('tower')) return <Droplets className="h-5 w-5 text-indigo-500" />;
  if (t.includes('light')) return <Lightbulb className="h-5 w-5 text-amber-500" />;
  return <Zap className="h-5 w-5 text-yellow-500" />;
}

// ── Demand tier badge ─────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: DemandTier }) {
  if (tier.name === 'On-Peak') return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
      <Sun className="w-3 h-3" /> On-Peak
    </Badge>
  );
  if (tier.name === 'Mid-Peak') return (
    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
      <Activity className="w-3 h-3" /> Mid-Peak
    </Badge>
  );
  return (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
      <Moon className="w-3 h-3" /> Off-Peak
    </Badge>
  );
}

// ── Water Meter types & calculations ─────────────────────────────────────────

const WATER_METER_KEY = 'nexum_water_meter_config';
const CF_TO_GAL = 7.48052; // exact cubic feet to US gallons

export interface WaterMeterConfig {
  totalCF: number;             // from meter reading
  periodDays: number;          // how many days the reading covers
  ratePerThousandGal: number;  // $/1,000 gallons
  dumpTankLossGalDay: number;  // gal/day lost through dump/blowdown tank
  expansionTankCapGal: number; // expansion tank size in gallons
}

export interface WaterMeterDerived {
  totalGallons: number;
  gpm: number;
  gph: number;
  gpd: number;
  dailyCost: number;
  hourlyCost: number;
  perThousandGalCost: number;
  annualProjectedCost: number;
  dumpTankLossGalDay: number;
  dumpTankPctOfDaily: number;
  expansionTankCapGal: number;
  expansionTankFillPct: number; // expansion cap as % of daily usage
}

function deriveWaterMetrics(cfg: WaterMeterConfig): WaterMeterDerived {
  const totalGallons = cfg.totalCF * CF_TO_GAL;
  const gpd = cfg.periodDays > 0 ? totalGallons / cfg.periodDays : totalGallons;
  const gph = gpd / 24;
  const gpm = gph / 60;
  const dailyCost = (gpd / 1000) * cfg.ratePerThousandGal;
  const hourlyCost = dailyCost / 24;
  const perThousandGalCost = cfg.ratePerThousandGal;
  const annualProjectedCost = dailyCost * 365;
  const dumpTankPctOfDaily = gpd > 0 ? (cfg.dumpTankLossGalDay / gpd) * 100 : 0;
  const expansionTankFillPct = gpd > 0 ? (cfg.expansionTankCapGal / gpd) * 100 : 0;
  return {
    totalGallons, gpm, gph, gpd,
    dailyCost, hourlyCost, perThousandGalCost, annualProjectedCost,
    dumpTankLossGalDay: cfg.dumpTankLossGalDay,
    dumpTankPctOfDaily,
    expansionTankCapGal: cfg.expansionTankCapGal,
    expansionTankFillPct,
  };
}

function loadWaterMeterConfig(): WaterMeterConfig {
  try {
    const raw = localStorage.getItem(WATER_METER_KEY);
    if (raw) return JSON.parse(raw) as WaterMeterConfig;
  } catch {}
  return { totalCF: 11971600, periodDays: 1, ratePerThousandGal: 4.75, dumpTankLossGalDay: 1377, expansionTankCapGal: 1113 };
}

function saveWaterMeterConfig(cfg: WaterMeterConfig) {
  try { localStorage.setItem(WATER_METER_KEY, JSON.stringify(cfg)); } catch {}
}

// ── WaterHealthBar ────────────────────────────────────────────────────────────

function WaterHealthBar() {
  const health = computeWaterHealth();
  const isNoData = health.status === 'no_data';
  const isHealthy = health.status === 'healthy';
  const isTreatmentNeeded = health.status === 'treatment_needed';
  const isCaution = health.status === 'caution';

  const barColor = isHealthy ? 'bg-cyan-500' : isCaution ? 'bg-amber-500' : isTreatmentNeeded ? 'bg-red-500' : 'bg-muted';
  const borderColor = isHealthy ? 'border-cyan-500/30' : isCaution ? 'border-amber-500/30' : isTreatmentNeeded ? 'border-red-500/30' : 'border-border/40';
  const bgColor = isHealthy ? 'bg-cyan-500/5' : isCaution ? 'bg-amber-500/5' : isTreatmentNeeded ? 'bg-red-500/5' : '';
  const textColor = isHealthy ? 'text-cyan-400' : isCaution ? 'text-amber-400' : isTreatmentNeeded ? 'text-red-400' : 'text-muted-foreground';

  return (
    <Card className={`neon-border border ${borderColor} ${bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Droplets className={`w-5 h-5 shrink-0 ${textColor} ${isHealthy ? 'animate-pulse' : ''}`} />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Water Treatment Status</p>
                {!isNoData && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    isHealthy ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                    isCaution ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {isHealthy ? '✓ Treated — Healthy' : isCaution ? '⚠ Caution' : '✕ Treatment Needed'}
                  </span>
                )}
              </div>
              {!isNoData && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {health.parameterCount} parameter{health.parameterCount !== 1 ? 's' : ''} tracked
                  {health.violationCount > 0 ? ` · ${health.violationCount} violation${health.violationCount > 1 ? 's' : ''}` : ''}
                  {health.warningCount > 0 ? ` · ${health.warningCount} warning${health.warningCount > 1 ? 's' : ''}` : ''}
                  {health.treatmentWOsCompleted > 0 ? ` · ${health.treatmentWOsCompleted} treatment WO${health.treatmentWOsCompleted > 1 ? 's' : ''} completed` : ''}
                  {health.lastSampleDate ? ` · Last sample: ${health.lastSampleDate}` : ''}
                </p>
              )}
              {isNoData && <p className="text-xs text-muted-foreground">No water chemistry data. Log samples in Environmental Monitoring.</p>}
            </div>
          </div>
          {!isNoData && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${textColor}`}>{health.score}/100</p>
              <p className="text-[10px] text-muted-foreground">Treatment Score</p>
            </div>
          )}
        </div>

        {/* Health bar */}
        {!isNoData && (
          <div className="mt-3">
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor} ${isHealthy ? 'animate-pulse' : ''}`}
                style={{ width: `${health.score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Needs Treatment</span>
              <span>Fully Treated</span>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <div className="mt-3 space-y-1">
            {health.recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${isHealthy ? 'text-cyan-300/70' : isCaution ? 'text-amber-300' : 'text-red-300'}`}>
                {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EnergyDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<EnergyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiData = await getEnergyDashboard();
      const valid = apiData?.summary?.total_energy_equivalent_kwh !== undefined && apiData?.by_utility;
      if (valid) { setData(apiData); setUsingDemo(false); }
      else { setData(DEMO_ENERGY_DATA); setUsingDemo(true); }
    } catch {
      setData(DEMO_ENERGY_DATA); setUsingDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      window.addEventListener('nexum_bms_poll_update', fetchData);
      return () => { clearInterval(interval); window.removeEventListener('nexum_bms_poll_update', fetchData); };
    }
  }, [isAuthenticated, fetchData]);

  // Water meter config
  const [waterCfg, setWaterCfg] = useState<WaterMeterConfig>(() => loadWaterMeterConfig());
  const [waterEditOpen, setWaterEditOpen] = useState(false);
  const [waterDraft, setWaterDraft] = useState<WaterMeterConfig>(() => loadWaterMeterConfig());
  const waterMetrics = useMemo(() => deriveWaterMetrics(waterCfg), [waterCfg]);

  const saveWater = () => {
    saveWaterMeterConfig(waterDraft);
    setWaterCfg(waterDraft);
    setWaterEditOpen(false);
  };

  // Derived data from localStorage
  const equipmentLoads = useMemo(() => [...getEquipmentLoads(), ...getTimerLoads()], [isLoading]);
  const demandTier = useMemo(() => getCurrentDemandTier(), []);
  const quarterlyData = useMemo(() => data ? buildQuarterlyData(data) : [], [data]);
  const reductionActions = useMemo(() => getDemandReductions(equipmentLoads, demandTier), [equipmentLoads, demandTier]);

  const totalRegisteredKW = useMemo(() => equipmentLoads.reduce((s, e) => s + e.kw, 0), [equipmentLoads]);
  const totalRegisteredAmps = useMemo(() => equipmentLoads.reduce((s, e) => s + e.amps, 0), [equipmentLoads]);

  const loadsByCategory = useMemo(() => {
    const map: Record<string, EquipmentLoadItem[]> = {};
    equipmentLoads.forEach(e => {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    });
    return map;
  }, [equipmentLoads]);

  if (authLoading) return <NexumPageLoader message="Authenticating..." />;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">Energy Intelligence™</h1>
              <TierBadge tier={demandTier} />
            </div>
            <p className="text-muted-foreground text-sm">
              {demandTier.name} · {demandTier.hours} · {demandTier.description}
            </p>
          </div>
          <div className="flex gap-2">
            <BaselineRatesManager />
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {usingDemo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            Showing demo data — connect utility meters or log energy readings to populate live figures.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading energy data..." />
          </div>
        ) : data ? (
          <>
            {/* ── Summary Cards ──────────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="neon-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Energy Equivalent</p>
                  <p className="text-2xl font-bold">{data.summary.total_energy_equivalent_kwh.toLocaleString()} kWh</p>
                  <p className="text-xs text-muted-foreground mt-1">Electric + Gas combined · {data.period_days} days</p>
                </CardContent>
              </Card>
              <Card className="neon-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Total Cost</p>
                  <p className="text-2xl font-bold">${data.summary.estimated_total_utility_cost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">All utilities · ${(data.summary.estimated_total_utility_cost / data.period_days).toFixed(0)}/day avg</p>
                </CardContent>
              </Card>
              <Card className="neon-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Registered Load</p>
                  <p className="text-2xl font-bold">{totalRegisteredKW.toFixed(1)} kW</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalRegisteredAmps.toFixed(0)} A total · {equipmentLoads.length} assets</p>
                </CardContent>
              </Card>
              <Card className="neon-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Avg Daily Consumption</p>
                  <p className="text-2xl font-bold">{data.summary.average_kwh_per_day.toFixed(0)} kWh</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.summary.total_runtime_hours.toFixed(0)} total runtime hrs</p>
                </CardContent>
              </Card>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────────── */}
            <Tabs defaultValue="electric" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
                <TabsTrigger value="electric" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" />Electric</TabsTrigger>
                <TabsTrigger value="gas" className="text-xs"><Flame className="h-3.5 w-3.5 mr-1" />Gas</TabsTrigger>
                <TabsTrigger value="water" className="text-xs"><Droplets className="h-3.5 w-3.5 mr-1" />Water</TabsTrigger>
                <TabsTrigger value="load-registry" className="text-xs"><Building2 className="h-3.5 w-3.5 mr-1" />Load Registry</TabsTrigger>
                <TabsTrigger value="peak-demand" className="text-xs"><Gauge className="h-3.5 w-3.5 mr-1" />Peak Demand</TabsTrigger>
                <TabsTrigger value="quarterly" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Quarterly</TabsTrigger>
                <TabsTrigger value="mpcc" className="text-xs"><Activity className="h-3.5 w-3.5 mr-1" />MPCC</TabsTrigger>
              </TabsList>

              {/* ── ELECTRIC ─────────────────────────────────────────────────── */}
              <TabsContent value="electric" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Electric Consumption</p>
                    <p className="text-2xl font-bold">{data.summary.total_kwh_consumed.toLocaleString()} kWh</p>
                    <p className="text-xs text-muted-foreground mt-1">${data.rates.electric}/kWh · {data.period_days}-day period</p>
                  </CardContent></Card>
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Estimated Electric Cost</p>
                    <p className="text-2xl font-bold">${data.summary.estimated_electric_cost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">${(data.summary.estimated_electric_cost / data.period_days).toFixed(0)}/day average</p>
                  </CardContent></Card>
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Daily Average</p>
                    <p className="text-2xl font-bold">{data.summary.average_kwh_per_day.toFixed(1)} kWh</p>
                    <p className="text-xs text-muted-foreground mt-1">≈ {(data.summary.average_kwh_per_day / 24).toFixed(1)} kW continuous draw</p>
                  </CardContent></Card>
                </div>

                <Card className="neon-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Electric Consumption by System</CardTitle></CardHeader>
                  <CardContent>
                    {data.by_utility.electric.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.electric.map((sys, i) => (
                          <div key={safeStr(sys.system_type, String(i))} className="flex items-center gap-4">
                            <div className="shrink-0">{getSystemIcon(safeStr(sys.system_type))}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(sys.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground tabular-nums">
                                  {sys.kwh.toLocaleString()} kWh &nbsp;·&nbsp; {(sys.percentage_of_electric || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${sys.percentage_of_electric}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Est. ${(sys.estimated_cost || 0).toLocaleString()} &nbsp;·&nbsp; {sys.runtime_hours} hrs &nbsp;·&nbsp; ~{((sys.kwh / Math.max(sys.runtime_hours, 1))).toFixed(1)} kW avg draw
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8 text-sm">No electric usage data. Log equipment data to see breakdowns.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── GAS ──────────────────────────────────────────────────────── */}
              <TabsContent value="gas" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Therms Consumed', value: data.summary.total_therms_consumed.toLocaleString(), sub: `$${data.rates.gas}/Therm` },
                    { label: 'CCF Consumed', value: data.summary.total_ccf_consumed.toLocaleString(), sub: 'Hundred cubic feet' },
                    { label: 'BTUs', value: `${(data.summary.total_btus_consumed / 1000000).toFixed(1)}M`, sub: 'Total heat content' },
                    { label: 'Estimated Gas Cost', value: `$${data.summary.estimated_gas_cost.toLocaleString()}`, sub: `$${(data.summary.estimated_gas_cost / data.period_days).toFixed(0)}/day` },
                  ].map(c => (
                    <Card key={c.label} className="neon-border"><CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-2xl font-bold">{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                    </CardContent></Card>
                  ))}
                </div>
                <Card className="neon-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Natural Gas by System</CardTitle></CardHeader>
                  <CardContent>
                    {data.by_utility.gas.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.gas.map((sys, i) => (
                          <div key={safeStr(sys.system_type, String(i))} className="flex items-center gap-4">
                            <div className="shrink-0">{getSystemIcon(safeStr(sys.system_type))}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(sys.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground">{sys.therms || 0} Therms · {(sys.percentage_of_gas || 0).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${sys.percentage_of_gas}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Est. ${(sys.estimated_cost || 0).toLocaleString()} · {(sys.btus / 1000000).toFixed(1)}M BTUs</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8 text-sm">No gas data. Log boiler/heating equipment to see breakdowns.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── WATER ────────────────────────────────────────────────────── */}
              <TabsContent value="water" className="space-y-4">

                {/* ── Meter config edit toggle ───────────────────────────── */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Water Intelligence — meter-based analytics</p>
                  <button
                    type="button"
                    onClick={() => { setWaterDraft(waterCfg); setWaterEditOpen(v => !v); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded px-2 py-1"
                  >
                    <Edit className="w-3 h-3" /> {waterEditOpen ? 'Cancel' : 'Edit Meter Inputs'}
                    {waterEditOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* ── Meter input form (collapsible) ─────────────────────── */}
                {waterEditOpen && (
                  <Card className="neon-border">
                    <CardContent className="p-4 space-y-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Settings2 className="w-3.5 h-3.5" />Meter Configuration
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Total CF (meter reading)</Label>
                          <Input type="number" value={waterDraft.totalCF} onChange={e => setWaterDraft(d => ({ ...d, totalCF: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                          <p className="text-[10px] text-muted-foreground">1 CF = 7.48052 gal</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Period (days)</Label>
                          <Input type="number" min="1" value={waterDraft.periodDays} onChange={e => setWaterDraft(d => ({ ...d, periodDays: parseFloat(e.target.value) || 1 }))} className="h-8 text-sm" />
                          <p className="text-[10px] text-muted-foreground">Days covered by reading</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rate ($/1,000 gal)</Label>
                          <Input type="number" step="0.01" value={waterDraft.ratePerThousandGal} onChange={e => setWaterDraft(d => ({ ...d, ratePerThousandGal: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                          <p className="text-[10px] text-muted-foreground">Utility rate per 1K gal</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dump Tank Loss (gal/day)</Label>
                          <Input type="number" value={waterDraft.dumpTankLossGalDay} onChange={e => setWaterDraft(d => ({ ...d, dumpTankLossGalDay: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                          <p className="text-[10px] text-muted-foreground">Blowdown / dump loss daily</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expansion Tank Capacity (gal)</Label>
                          <Input type="number" value={waterDraft.expansionTankCapGal} onChange={e => setWaterDraft(d => ({ ...d, expansionTankCapGal: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                          <p className="text-[10px] text-muted-foreground">Tank rated capacity</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setWaterEditOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border/40 text-muted-foreground hover:text-foreground">Cancel</button>
                        <button type="button" onClick={saveWater} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">Save & Recalculate</button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Row 1: Meter Reading & Conversion ─────────────────── */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Meter Reading</p>
                      <p className="text-2xl font-bold">{waterCfg.totalCF.toLocaleString()} CF</p>
                      <p className="text-xs text-muted-foreground mt-1">Cubic feet · {waterCfg.periodDays}-day period</p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Gallons</p>
                      <p className="text-2xl font-bold text-blue-400">{waterMetrics.totalGallons.toLocaleString('en-US', { maximumFractionDigits: 2 })} gal</p>
                      <p className="text-xs text-muted-foreground mt-1">@ 7.48052 gal/CF conversion</p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Daily Flow Volume</p>
                      <p className="text-2xl font-bold">{waterMetrics.gpd.toLocaleString('en-US', { maximumFractionDigits: 0 })} GPD</p>
                      <p className="text-xs text-muted-foreground mt-1">Gallons per day average</p>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Row 2: Flow Rates ──────────────────────────────────── */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="neon-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gallons per Minute (GPM)</p>
                        <p className="text-2xl font-bold text-blue-400">{waterMetrics.gpm.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Daily average flow rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <Gauge className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gallons per Hour (GPH)</p>
                        <p className="text-2xl font-bold text-cyan-400">{waterMetrics.gph.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Hourly average throughput</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Row 3: Cost Analysis ───────────────────────────────── */}
                <Card className="neon-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />Water Cost Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily Cost</p>
                        <p className="text-xl font-bold text-green-400">${waterMetrics.dailyCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">per day</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hourly Cost</p>
                        <p className="text-xl font-bold text-emerald-400">${waterMetrics.hourlyCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">per hour</p>
                      </div>
                      <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Per 1,000 Gallons</p>
                        <p className="text-xl font-bold text-teal-400">${waterMetrics.perThousandGalCost.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">utility rate</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Annual Projection</p>
                        <p className="text-xl font-bold text-blue-400">${(waterMetrics.annualProjectedCost / 1000).toFixed(1)}K</p>
                        <p className="text-[10px] text-muted-foreground mt-1">at current rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Row 4: System Loss & Buffer ────────────────────────── */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Dump Tank Loss</p>
                          <p className="text-2xl font-bold text-amber-400">{waterMetrics.dumpTankLossGalDay.toLocaleString()} gal/day</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 text-amber-400" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">% of daily usage</span>
                          <span className={cn('font-semibold', waterMetrics.dumpTankPctOfDaily > 5 ? 'text-red-400' : 'text-amber-400')}>
                            {waterMetrics.dumpTankPctOfDaily.toFixed(3)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', waterMetrics.dumpTankPctOfDaily > 5 ? 'bg-red-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, waterMetrics.dumpTankPctOfDaily * 10)}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Blowdown / blow-off tank discharge loss per day</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Expansion Tank Capacity</p>
                          <p className="text-2xl font-bold text-indigo-400">{waterMetrics.expansionTankCapGal.toLocaleString()} gal</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <Gauge className="w-5 h-5 text-indigo-400" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">% of daily volume</span>
                          <span className="font-semibold text-indigo-400">{waterMetrics.expansionTankFillPct.toFixed(3)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, waterMetrics.expansionTankFillPct * 10)}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Rated tank volume vs. daily throughput ratio</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Row 5: Metric reference table ─────────────────────── */}
                <Card className="neon-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />Water Usage Summary Table
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Metric</th>
                            <th className="text-right text-xs text-muted-foreground font-medium py-2">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {[
                            { label: 'Total Meter Reading (CF)', value: `${waterCfg.totalCF.toLocaleString()} CF` },
                            { label: 'Total Gallons', value: `${waterMetrics.totalGallons.toLocaleString('en-US', { maximumFractionDigits: 2 })} gal` },
                            { label: 'Gallons per Minute (GPM)', value: `${waterMetrics.gpm.toLocaleString('en-US', { maximumFractionDigits: 1 })} GPM` },
                            { label: 'Gallons per Hour (GPH)', value: `${waterMetrics.gph.toLocaleString('en-US', { maximumFractionDigits: 2 })} GPH` },
                            { label: 'Daily Water Cost', value: `$${waterMetrics.dailyCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}` },
                            { label: 'Hourly Water Cost', value: `$${waterMetrics.hourlyCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}` },
                            { label: 'Per 1,000 Gallons Cost', value: `$${waterMetrics.perThousandGalCost.toFixed(2)}` },
                            { label: 'Annual Projected Cost', value: `$${waterMetrics.annualProjectedCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
                            { label: 'Dump Tank Loss (gal/day)', value: `${waterMetrics.dumpTankLossGalDay.toLocaleString()} gal` },
                            { label: 'Expansion Tank Capacity', value: `${waterMetrics.expansionTankCapGal.toLocaleString()} gal` },
                          ].map(row => (
                            <tr key={row.label}>
                              <td className="py-2 pr-4 text-muted-foreground text-xs">{row.label}</td>
                              <td className="py-2 text-right font-semibold text-xs tabular-nums">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Row 6: Water Health + System Breakdown ─────────────── */}
                <WaterHealthBar />
                <Card className="neon-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Water Usage by System</CardTitle></CardHeader>
                  <CardContent>
                    {data.by_utility.water.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.water.map((sys, i) => (
                          <div key={safeStr(sys.system_type, String(i))} className="flex items-center gap-4">
                            <div className="shrink-0">{getSystemIcon(safeStr(sys.system_type))}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(sys.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground">{(sys.gallons || 0).toLocaleString()} gal · {(sys.percentage_of_water || 0).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${sys.percentage_of_water}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Est. ${(sys.estimated_cost || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8 text-sm">No water data. Log cooling tower/domestic usage to see breakdowns.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── LOAD REGISTRY ────────────────────────────────────────────── */}
              <TabsContent value="load-registry" className="space-y-4">
                {/* Summary strip */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Registered Load</p>
                    <p className="text-2xl font-bold">{totalRegisteredKW.toFixed(1)} kW</p>
                    <p className="text-xs text-muted-foreground mt-1">{equipmentLoads.length} assets registered</p>
                  </CardContent></Card>
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Amperage Draw</p>
                    <p className="text-2xl font-bold">{totalRegisteredAmps.toFixed(0)} A</p>
                    <p className="text-xs text-muted-foreground mt-1">Simultaneous full-load estimate</p>
                  </CardContent></Card>
                  <Card className="neon-border"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Estimated Annual Load Cost</p>
                    <p className="text-2xl font-bold">${Math.round(totalRegisteredKW * 8760 * 0.65 * data.rates.electric).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">At 65% load factor · ${data.rates.electric}/kWh</p>
                  </CardContent></Card>
                </div>

                {equipmentLoads.length === 0 ? (
                  <Card className="neon-border">
                    <CardContent className="py-16 text-center space-y-3">
                      <Building2 className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                      <p className="font-medium">No equipment registered yet</p>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Add equipment in the Equipment Library — boilers, chillers, pumps, motors, lighting, sprinklers — and they'll appear here with estimated kW, amperage, and voltage requirements.
                      </p>
                      <a href="/equipment-library">
                        <Button variant="outline" size="sm">Open Equipment Library <ChevronRight className="w-4 h-4 ml-1" /></Button>
                      </a>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Voltage requirements reference */}
                    <Card className="neon-border">
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Voltage Requirements by System Type</CardTitle></CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/50">
                                {['System', 'Typical Voltage', 'Phase', 'Typical Amps', 'Notes'].map(h => (
                                  <th key={h} className="text-left py-2 px-3 text-muted-foreground font-semibold uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {[
                                { sys: 'Chiller (centrifugal/scroll)', v: '460/480V', ph: '3Ø', amps: '80–400A', note: 'Largest single electrical load on most facilities' },
                                { sys: 'AHU / Air Handler', v: '208/480V', ph: '3Ø', amps: '15–60A', note: 'VFD-driven fans reduce demand significantly' },
                                { sys: 'Boiler (burner/controls)', v: '120/240V', ph: '1Ø', amps: '5–20A', note: 'Gas-fired — electrical is controls/ignition only' },
                                { sys: 'Pumps (HWP/CWP/CHP)', v: '480V', ph: '3Ø', amps: '10–50A', note: 'VFDs reduce motor starting inrush and kW' },
                                { sys: 'Cooling Tower Fan', v: '480V', ph: '3Ø', amps: '15–40A', note: 'Two-speed or VFD saves 25–40%' },
                                { sys: 'Lighting (LED/fluorescent)', v: '120/277V', ph: '1Ø', amps: '1–15A per circuit', note: '277V ballasts common in commercial; LED reduces load 40–60%' },
                                { sys: 'Emergency/Exit Lighting', v: '120V', ph: '1Ø', amps: '0.5–2A', note: 'Battery-backed; continuous draw' },
                                { sys: 'Sprinkler / Fire Pump', v: '480V', ph: '3Ø', amps: '15–60A', note: 'Dedicated circuit required; must not share breaker' },
                                { sys: 'Exhaust Fan', v: '120/208V', ph: '1Ø or 3Ø', amps: '2–15A', note: 'Timer control can eliminate off-hours runtime' },
                                { sys: 'MCC Panel (motor ctrl)', v: '480V', ph: '3Ø', amps: '100–400A', note: 'Aggregate load of all motors on MCC bus' },
                                { sys: 'Elevator / Escalator', v: '208/480V', ph: '3Ø', amps: '20–80A', note: 'Regenerative drives return energy to grid' },
                                { sys: 'VFD (variable freq. drive)', v: '208/480V', ph: '3Ø', amps: 'Varies', note: 'Can reduce motor kW by 50%+ at part load' },
                                { sys: 'Generator (standby)', v: '480V', ph: '3Ø', amps: '0A (passive)', note: 'No demand draw until utility failure' },
                              ].map(row => (
                                <tr key={row.sys} className="hover:bg-muted/20 transition-colors">
                                  <td className="py-2 px-3 font-medium">{row.sys}</td>
                                  <td className="py-2 px-3 tabular-nums font-bold text-yellow-400">{row.v}</td>
                                  <td className="py-2 px-3">{row.ph}</td>
                                  <td className="py-2 px-3 tabular-nums">{row.amps}</td>
                                  <td className="py-2 px-3 text-muted-foreground">{row.note}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Per-category load breakdown */}
                    {Object.entries(loadsByCategory).map(([category, items]) => {
                      const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['Other'];
                      const catKW = items.reduce((s, e) => s + e.kw, 0);
                      const catAmps = items.reduce((s, e) => s + e.amps, 0);
                      return (
                        <Card key={category} className={cn('neon-border border', style.border)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <CardTitle className={cn('text-sm', style.text)}>{category}</CardTitle>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{catKW.toFixed(1)} kW total</span>
                                <span>{catAmps.toFixed(0)} A estimated</span>
                                <span>{items.length} assets</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/30 bg-muted/20">
                                    <th className="text-left py-2 px-4 text-muted-foreground font-semibold">Asset</th>
                                    <th className="text-left py-2 px-4 text-muted-foreground font-semibold">Type</th>
                                    <th className="text-right py-2 px-4 text-muted-foreground font-semibold">kW</th>
                                    <th className="text-right py-2 px-4 text-muted-foreground font-semibold">Amps</th>
                                    <th className="text-center py-2 px-4 text-muted-foreground font-semibold">Voltage</th>
                                    <th className="text-center py-2 px-4 text-muted-foreground font-semibold">Phase</th>
                                    <th className="text-center py-2 px-4 text-muted-foreground font-semibold">PF</th>
                                    <th className="text-left py-2 px-4 text-muted-foreground font-semibold hidden md:table-cell">Source</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                  {items.map(item => (
                                    <tr key={item.id} className="hover:bg-muted/20">
                                      <td className="py-2 px-4 font-medium truncate max-w-[160px]">{item.name}</td>
                                      <td className="py-2 px-4 text-muted-foreground capitalize">{item.equipmentType}</td>
                                      <td className="py-2 px-4 text-right font-bold tabular-nums">{item.kw.toFixed(1)}</td>
                                      <td className="py-2 px-4 text-right tabular-nums">{item.amps.toFixed(1)}</td>
                                      <td className="py-2 px-4 text-center font-mono text-yellow-400">{item.voltage}</td>
                                      <td className="py-2 px-4 text-center">{item.phases}</td>
                                      <td className="py-2 px-4 text-center text-muted-foreground">{item.powerFactor.toFixed(2)}</td>
                                      <td className="py-2 px-4 hidden md:table-cell">
                                        <Badge className={cn('text-[10px] h-4 px-1.5', item.source === 'baseline' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground')}>
                                          {item.source}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className={cn('border-t border-border/50', style.bg)}>
                                    <td colSpan={2} className={cn('py-2 px-4 font-bold text-xs', style.text)}>Category Total</td>
                                    <td className={cn('py-2 px-4 text-right font-bold tabular-nums', style.text)}>{catKW.toFixed(1)}</td>
                                    <td className={cn('py-2 px-4 text-right font-bold tabular-nums', style.text)}>{catAmps.toFixed(0)}</td>
                                    <td colSpan={4} />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              {/* ── PEAK DEMAND ───────────────────────────────────────────────── */}
              <TabsContent value="peak-demand" className="space-y-4">

                {/* Tier status */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    {
                      label: 'Off-Peak Window',
                      hours: '10 PM – 6 AM',
                      mult: '0.75×',
                      desc: 'Lowest demand charges. Best window for high-load processes, pre-conditioning, and storage charging.',
                      icon: Moon,
                      active: demandTier.name === 'Off-Peak',
                      style: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    },
                    {
                      label: 'Mid-Peak Window',
                      hours: '6–8 AM & 8–10 PM',
                      mult: '1.15×',
                      desc: 'Transition period. Moderate demand. Wind down after on-peak or ramp up carefully.',
                      icon: Activity,
                      active: demandTier.name === 'Mid-Peak',
                      style: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                    },
                    {
                      label: 'On-Peak Window',
                      hours: '8 AM – 8 PM',
                      mult: '1.5×',
                      desc: 'Peak demand charges apply. Avoid adding large loads. Pre-conditioning before this window saves significantly.',
                      icon: Sun,
                      active: demandTier.name === 'On-Peak',
                      style: 'bg-red-500/10 border-red-500/30 text-red-400',
                    },
                  ] as const).map(tier => (
                    <Card key={tier.label} className={cn('border-2 transition-all', tier.active ? tier.style : 'border-border opacity-60')}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <tier.icon className={cn('w-5 h-5', tier.active ? tier.style.split(' ')[2] : 'text-muted-foreground')} />
                          <span className="text-xs font-bold">{tier.mult} rate</span>
                          {tier.active && <Badge className={cn('text-[10px]', tier.style)}>NOW</Badge>}
                        </div>
                        <p className="text-sm font-semibold">{tier.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tier.hours}</p>
                        <p className="text-xs text-muted-foreground leading-snug">{tier.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Why is peak demand happening */}
                <Card className="neon-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Peak Demand Drivers — What's Causing High kW
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { driver: 'Simultaneous motor starts', detail: 'When chillers, pumps, and AHU fans start at the same time (especially morning startup), inrush current spikes demand up to 6× nameplate amps for 3–8 seconds — and utilities capture this as the demand charge interval.', severity: 'high', fix: 'Sequence motor starts 2–5 minutes apart using BAS or manual startup protocol.' },
                      { driver: 'Full cooling load at peak OAT', detail: 'On days where OAT exceeds 90°F, chiller plant runs at or above design load. Each additional ton of cooling requires ~0.8–1.0 kW. A 100-ton chiller at full load = 80–100 kW alone.', severity: 'high', fix: 'Pre-cool building to 70°F before 8 AM using overnight off-peak kWh. Reduce setpoint recovery demand during on-peak.' },
                      { driver: 'Boiler lockout / restart cycling', detail: 'In shoulder seasons, boilers cycling on and off repeatedly due to a wide dead band causes frequent burner starts and auxiliary motor starts (oil pumps, blowers, controls). Each restart adds a small demand spike.', severity: 'moderate', fix: 'Tune boiler dead band and reset curve to reduce cycling. Consider night setback during shoulder season.' },
                      { driver: 'Lighting at full brightness during peak hours', detail: 'Commercial lighting running at 100% during 8 AM–8 PM adds load directly to the on-peak window. LED retrofits reduce this 40–60%, but timing still matters.', severity: 'moderate', fix: 'Dim to 70–80% during peak window. Use occupancy sensors to eliminate unoccupied space lighting.' },
                      { driver: 'MCC panel: all motors online simultaneously', detail: 'When all motors on an MCC bus are running simultaneously — pumps, fans, compressors — the combined demand can exceed the panel’s calculated design load, triggering demand spikes and potential overcurrent conditions.', severity: 'moderate', fix: 'Review MCC bus capacity. Sequence non-critical loads. Use VFDs to reduce steady-state kW.' },
                      { driver: 'Sprinkler/irrigation pump running during peak hours', detail: 'Irrigation and sprinkler pump motors (typically 7.5–25 HP) running during the day add 6–19 kW to an already loaded circuit and count fully toward the demand window.', severity: 'low', fix: 'Shift all irrigation cycles to off-peak window (10 PM–6 AM). Use the Timers feature in Climate Intelligence to enforce this schedule.' },
                    ].map(d => (
                      <div key={d.driver} className={cn('p-4 rounded-lg border', d.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : d.severity === 'moderate' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted border-border')}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', d.severity === 'high' ? 'text-red-400' : d.severity === 'moderate' ? 'text-amber-400' : 'text-muted-foreground')} />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{d.driver}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{d.detail}</p>
                            <div className="flex items-start gap-1.5 mt-2">
                              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-primary">{d.fix}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Reduction actions */}
                <Card className="neon-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-emerald-400" />
                        Demand Reduction Actions
                      </CardTitle>
                      <TierBadge tier={demandTier} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {reductionActions.map((action, i) => {
                      const style = CATEGORY_STYLE[action.category] || CATEGORY_STYLE['Other'];
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
                            <TrendingDown className={cn('w-4 h-4', style.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">{action.action}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge className={cn('text-[10px]', style.bg, style.text, style.border)}>{action.category}</Badge>
                              <span className="text-xs text-muted-foreground">{action.timing}</span>
                              <Badge className={cn('text-[10px]', action.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : action.difficulty === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30')}>
                                {action.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-400">−{action.savingsKW} kW</p>
                            <p className="text-xs text-muted-foreground">potential</p>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Total potential reduction: ~{reductionActions.reduce((s, a) => s + a.savingsKW, 0)} kW · est. ${Math.round(reductionActions.reduce((s, a) => s + a.savingsKW, 0) * 720 * 0.12 * 0.3).toLocaleString()}/yr savings
                    </p>
                  </CardContent>
                </Card>

                {/* Efficiency windows */}
                <Card className="neon-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      When to Run What — Efficiency Windows
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        window: 'Off-Peak (10 PM – 6 AM)',
                        icon: Moon, color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5',
                        run: ['Pre-cool building envelope to 68–70°F (thermal mass acts as a battery)', 'Run irrigation / sprinkler systems', 'Process equipment with flexible schedules', 'Charge battery storage or UPS systems', 'Run washers, sterilizers, dishwashers in applicable facilities', 'Backfill hot water storage tanks (domestic HW)'],
                        avoid: ['None — this is the lowest-cost window'],
                      },
                      {
                        window: 'Mid-Peak (6–8 AM & 8–10 PM)',
                        icon: Activity, color: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5',
                        run: ['Ramp up cooling plant gradually before occupancy peak', 'Reset chilled water setpoint upward (+2°F) to reduce kW', 'Transition lighting to occupancy-controlled schedules'],
                        avoid: ['Starting multiple large motors simultaneously', 'Running sprinkler/irrigation if it can be shifted to off-peak'],
                      },
                      {
                        window: 'On-Peak (8 AM – 8 PM)',
                        icon: Sun, color: 'text-red-400', border: 'border-red-500/20 bg-red-500/5',
                        run: ['Only what is operationally necessary', 'Monitor cooling plant efficiency — target kW/ton ≤ 0.8', 'Implement lighting demand response (dim to 70%)'],
                        avoid: ['Motor starts without sequencing', 'Adding non-critical loads', 'Running irrigation during peak window', 'Performing demand-increasing maintenance tasks'],
                      },
                    ].map(w => (
                      <div key={w.window} className={cn('rounded-xl border p-5 space-y-3', w.border)}>
                        <div className="flex items-center gap-2">
                          <w.icon className={cn('w-5 h-5', w.color)} />
                          <p className={cn('font-semibold text-sm', w.color)}>{w.window}</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Run / Shift To This Window</p>
                            <ul className="space-y-1">
                              {w.run.map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avoid</p>
                            <ul className="space-y-1">
                              {w.avoid.map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── QUARTERLY ─────────────────────────────────────────────────── */}
              <TabsContent value="quarterly" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {quarterlyData.map(q => (
                    <Card key={q.quarter} className={cn('neon-border border', q.isPeak ? 'border-amber-500/40' : 'border-border')}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{q.label}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{q.months}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {q.isPeak && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Peak Quarter</Badge>}
                            <Badge variant="outline" className="text-[10px]">{q.season}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Est. kWh</p>
                            <p className="text-xl font-bold tabular-nums">{q.kwhEstimate.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Est. Cost</p>
                            <p className="text-xl font-bold tabular-nums">${q.costEstimate.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><span className="font-semibold text-foreground">Dominant load:</span> {q.dominantLoad}</p>
                          <p><span className="font-semibold text-foreground">Peak month:</span> {q.peakMonth}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-2">{q.seasonalNote}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Annual bar chart (visual) */}
                <Card className="neon-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Annual kWh Distribution by Quarter</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {quarterlyData.map(q => {
                      const annualTotal = quarterlyData.reduce((s, x) => s + x.kwhEstimate, 0);
                      const pct = annualTotal > 0 ? (q.kwhEstimate / annualTotal) * 100 : 0;
                      return (
                        <div key={q.quarter}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{q.label}</span>
                            <span className="text-muted-foreground tabular-nums">{q.kwhEstimate.toLocaleString()} kWh · {pct.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div
                              className={cn('h-3 rounded-full transition-all', q.isPeak ? 'bg-amber-500' : 'bg-primary/70')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Annual estimated total: {quarterlyData.reduce((s, q) => s + q.kwhEstimate, 0).toLocaleString()} kWh ·
                      ${quarterlyData.reduce((s, q) => s + q.costEstimate, 0).toLocaleString()} projected
                    </p>
                  </CardContent>
                </Card>

                {/* Seasonal efficiency index */}
                <Card className="neon-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Seasonal Efficiency Opportunities</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { season: 'Q1 — Winter', opp: 'Outdoor air reset for hot water supply temperature — each 5°F setpoint reduction saves ~3% boiler fuel. Also: boiler stack economizer recovery.', saving: '3–8% gas', icon: Flame, iconClass: 'text-orange-400' },
                        { season: 'Q2 — Spring', opp: 'Economizer hours peak in April–May. Verify damper actuators and controls. Every hour of economizer operation = zero compressor energy for that load. Log economizer runtime daily.', saving: '15–25% cooling kWh', icon: Wind, iconClass: 'text-cyan-400' },
                        { season: 'Q3 — Summer', opp: 'Condenser water setpoint reset: allow CWT to float lower on cool nights (below 75°F OAT) — each 1°F lower CWT = ~0.5% chiller efficiency gain. Pre-cooling night setback is most impactful this quarter.', saving: '10–20% peak kW', icon: Snowflake, iconClass: 'text-blue-400' },
                        { season: 'Q4 — Fall', opp: 'Transition chiller plant to staging mode — run one chiller efficiently rather than two at part load. Chiller is most efficient at 70–80% load. Sequence off second chiller earlier.', saving: '5–12% cooling kWh', icon: Activity, iconClass: 'text-violet-400' },
                      ].map(row => (
                        <div key={row.season} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                          <row.icon className={cn('w-4 h-4 shrink-0 mt-0.5', row.iconClass)} />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{row.season}</p>
                            <p className="text-sm leading-snug">{row.opp}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">{row.saving}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── MPCC ─────────────────────────────────────────────────────── */}
              <TabsContent value="mpcc">
                <MPCCPanel />
              </TabsContent>
            </Tabs>

            <WaterHealthBar />

            {/* ── Top Energy Consumers ──────────────────────────────────────── */}
            {data.equipment_breakdown.length > 0 && (
              <Card className="neon-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top Energy Consumers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.equipment_breakdown.slice(0, 10).map(equip => (
                      <div key={equip.equipment_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          {getSystemIcon(safeStr(equip.type))}
                          <div>
                            <p className="text-sm font-medium">{safeStr(equip.name, 'Unknown')}</p>
                            <p className="text-xs text-muted-foreground capitalize">{safeStr(equip.type, 'Unknown')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm tabular-nums">{equip.total_kwh.toLocaleString()} kWh</p>
                          <p className="text-xs text-muted-foreground">Est. ${equip.estimated_cost.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
