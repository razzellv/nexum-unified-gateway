import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Droplets, FlaskConical, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WaterChemistryData {
  equipmentId:   string;
  equipmentType: string;
  equipmentName: string;
  sampleSource:  string; // e.g. 'city_water' | 'boiler_vessel' | 'da_tank' ...
  // Universal
  ph:            string;
  conductivity:  string;
  tds:           string;
  hardness:      string;
  chlorineResidual: string;
  turbidity:     string;
  iron:          string;
  // Boiler / steam / condensate
  pAlkalinity:   string;
  mAlkalinity:   string;
  sulfites:      string;
  chlorides:     string;
  silica:        string;
  phosphates:    string;
  cyclesOfConcentration: string;
  // Cooling tower
  caHardness:    string;
  biocideResidual: string;
  bacteriaCount: string;
  lsi:           string;
  // Chiller closed loop
  glycolPct:     string;
  inhibitorConc: string;
  nitrite:       string;
  // RO / WFI
  feedConductivity:    string;
  permeateConductivity: string;
  tdsRejectionPct:     string;
  sdi:                 string;
  // Notes
  notes: string;
}

export const initialWaterChemistryData: WaterChemistryData = {
  equipmentId: '', equipmentType: '', equipmentName: '', sampleSource: '',
  ph: '', conductivity: '', tds: '', hardness: '', chlorineResidual: '', turbidity: '', iron: '',
  pAlkalinity: '', mAlkalinity: '', sulfites: '', chlorides: '', silica: '', phosphates: '', cyclesOfConcentration: '',
  caHardness: '', biocideResidual: '', bacteriaCount: '', lsi: '',
  glycolPct: '', inhibitorConc: '', nitrite: '',
  feedConductivity: '', permeateConductivity: '', tdsRejectionPct: '', sdi: '',
  notes: '',
};

export function validateWaterChemistryForm(data: WaterChemistryData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.equipmentId)  errors.equipmentId  = 'Select equipment to test';
  if (!data.sampleSource) errors.sampleSource = 'Select a sample source / test point';
  return errors;
}

// ── Sample source config ───────────────────────────────────────────────────────

interface SourceDef {
  value:    string;
  label:    string;
  hint?:    string;       // guidance shown when this source is selected
  alert?:   string;       // red/orange warning
  primary:  string[];     // fields to call out as "Key readings"
}

const SOURCES: Record<string, SourceDef[]> = {
  boiler: [
    {
      value: 'city_water',
      label: 'City / Makeup Water',
      hint: 'Incoming raw water before any treatment. Establishes baseline quality for treatment program sizing.',
      primary: ['ph', 'hardness', 'tds', 'conductivity', 'chlorineResidual', 'iron'],
    },
    {
      value: 'softener',
      label: 'Water Softener Effluent',
      hint: 'Post-softener output. Hardness should read 0 ppm — any hardness indicates breakthrough.',
      alert: 'Hardness > 0 ppm indicates softener exhaustion or channeling. Regenerate immediately.',
      primary: ['hardness', 'ph', 'conductivity', 'tds'],
    },
    {
      value: 'da_tank',
      label: 'Deaerator (DA) Tank',
      hint: 'Deaerated feedwater. O₂ scavenger (sulfite) is dosed here to eliminate residual dissolved oxygen.',
      primary: ['ph', 'sulfites', 'hardness', 'conductivity', 'iron'],
    },
    {
      value: 'feed_tank',
      label: 'Feed Water / Feed Tank',
      hint: 'Water entering the boiler. Should be soft, deaerated, and chemically conditioned.',
      primary: ['ph', 'sulfites', 'hardness', 'tds', 'conductivity', 'iron'],
    },
    {
      value: 'surge_tank',
      label: 'Surge / Condensate Tank',
      hint: 'Mix of returned condensate and makeup water. Monitor for hardness ingress and iron from corroded lines.',
      primary: ['ph', 'hardness', 'conductivity', 'iron', 'tds'],
    },
    {
      value: 'boiler_vessel',
      label: 'Boiler Vessel Water',
      hint: 'Water inside the boiler drum. This is the primary treatment control point — test at least daily.',
      alert: 'pH must be maintained 10–11 (steam) or 8.5–9.5 (hot water). Silica carryover above threshold causes turbine damage.',
      primary: ['ph', 'pAlkalinity', 'mAlkalinity', 'sulfites', 'conductivity', 'tds', 'phosphates', 'silica', 'chlorides', 'iron'],
    },
    {
      value: 'condensate',
      label: 'Condensate Return',
      hint: 'Returned steam condensate. Low pH indicates carbonic acid attack; iron/copper indicates corrosion in return lines.',
      primary: ['ph', 'hardness', 'conductivity', 'iron', 'tds'],
    },
    {
      value: 'blowdown',
      label: 'Blowdown Sample',
      hint: 'Used to calculate cycles of concentration. Compare TDS/conductivity to feedwater to verify blowdown rate.',
      primary: ['conductivity', 'tds', 'cyclesOfConcentration', 'ph'],
    },
  ],
  hot_water_heater: [
    { value: 'city_water',    label: 'Cold Water Inlet',       hint: 'Incoming cold water quality.',                                           primary: ['ph', 'hardness', 'tds', 'conductivity', 'chlorineResidual'] },
    { value: 'softener',      label: 'Softener Effluent',      hint: 'Post-softener quality. Hardness should be 0.',                           primary: ['hardness', 'ph', 'conductivity'] },
    { value: 'storage_tank',  label: 'Storage Tank Water',     hint: 'Tank water chemistry. Monitor for Legionella risk if temp < 140°F.',     primary: ['ph', 'hardness', 'tds', 'turbidity'], alert: 'Storage temp below 140°F (60°C) creates Legionella risk. Verify thermal disinfection schedule.' },
    { value: 'hot_outlet',    label: 'Hot Water Outlet',       hint: 'Delivered hot water quality.',                                           primary: ['ph', 'hardness', 'tds'] },
  ],
  condensate_system: [
    { value: 'condensate',  label: 'Condensate Return Header', hint: 'Returned condensate before mixing with makeup.',                         primary: ['ph', 'hardness', 'conductivity', 'iron'] },
    { value: 'surge_tank',  label: 'Condensate / Surge Tank',  hint: 'Mixed condensate + makeup holding tank.',                               primary: ['ph', 'hardness', 'conductivity', 'iron', 'tds'] },
    { value: 'city_water',  label: 'Makeup Water',             hint: 'Incoming makeup water to compensate for condensate losses.',             primary: ['ph', 'hardness', 'tds', 'chlorineResidual'] },
  ],
  cooling_tower: [
    {
      value: 'city_water',
      label: 'City / Makeup Water',
      hint: 'Makeup water quality. Determines treatment chemical dosing requirements.',
      primary: ['ph', 'hardness', 'tds', 'conductivity', 'chlorineResidual'],
    },
    {
      value: 'tower_basin',
      label: 'Tower Basin',
      hint: 'Primary control point. All treatment targets apply here. Test at least 3× per week per ASHRAE 188.',
      alert: 'Legionella risk: bacteria > 100,000 CFU/mL requires immediate shock treatment and notification.',
      primary: ['ph', 'conductivity', 'caHardness', 'mAlkalinity', 'chlorides', 'phosphates', 'biocideResidual', 'bacteriaCount', 'turbidity', 'lsi', 'cyclesOfConcentration'],
    },
    {
      value: 'condenser_supply',
      label: 'Condenser Supply Header',
      hint: 'Water entering the condenser. Compare to basin to detect heat exchanger fouling.',
      primary: ['ph', 'conductivity', 'turbidity'],
    },
    {
      value: 'condenser_return',
      label: 'Condenser Return Header',
      hint: 'Water leaving the condenser. Elevated conductivity vs supply may indicate scale or corrosion.',
      primary: ['ph', 'conductivity', 'turbidity'],
    },
    {
      value: 'blowdown',
      label: 'Blowdown',
      hint: 'Verify cycles of concentration are within program limits.',
      primary: ['conductivity', 'tds', 'cyclesOfConcentration', 'ph'],
    },
  ],
  chiller: [
    { value: 'chw_supply',    label: 'CHW Supply',         hint: 'Chilled water leaving the chiller.',               primary: ['ph', 'conductivity', 'glycolPct', 'inhibitorConc', 'nitrite', 'turbidity'] },
    { value: 'chw_return',    label: 'CHW Return',         hint: 'Chilled water returning from building. Compare pH/conductivity to supply.', primary: ['ph', 'conductivity', 'glycolPct', 'turbidity'] },
    { value: 'expansion_tank',label: 'Expansion Tank',     hint: 'Closed-loop system pressure buffer. Good representative sample point.',     primary: ['ph', 'conductivity', 'inhibitorConc', 'nitrite'] },
    { value: 'loop_sample',   label: 'Loop Sample Port',   hint: 'Inline sample port. Use when expansion tank is not accessible.',           primary: ['ph', 'conductivity', 'glycolPct', 'inhibitorConc', 'nitrite', 'turbidity'] },
  ],
  ro_system: [
    { value: 'city_water',        label: 'Raw Feed Water',               hint: 'Incoming city water before any pretreatment.',                              primary: ['ph', 'hardness', 'tds', 'conductivity', 'chlorineResidual', 'iron'] },
    { value: 'softener_effluent', label: 'Softener Effluent',            hint: 'Post-softener, pre-RO feed. Hardness must be 0 to protect membranes.',      primary: ['hardness', 'ph', 'conductivity'], alert: 'Any hardness will cause rapid membrane fouling. Regenerate softener before continuing.' },
    { value: 'ro_feed',           label: 'RO Feed (Post-Pretreatment)',  hint: 'Water entering the RO skid. SDI < 5 required.',                            primary: ['ph', 'conductivity', 'tds', 'sdi', 'chlorineResidual', 'iron'] },
    { value: 'permeate',          label: 'RO Permeate / Product Water',  hint: 'Purified product water. TDS rejection should be >95%.',                    primary: ['permeateConductivity', 'tdsRejectionPct', 'ph'] },
    { value: 'reject',            label: 'Reject / Concentrate',         hint: 'Concentrated waste stream. Monitor to optimize recovery ratio.',            primary: ['conductivity', 'tds', 'ph'] },
    { value: 'storage_tank',      label: 'Product Storage Tank',         hint: 'Stored purified water. Monitor for bacterial regrowth in standing water.',  primary: ['conductivity', 'ph', 'bacteriaCount'] },
  ],
  wfi_system: [
    { value: 'feed_water',    label: 'Feed Water (Pre-Still)',    hint: 'Water entering the WFI still.',                                          primary: ['ph', 'conductivity', 'tds', 'hardness'] },
    { value: 'still_outlet',  label: 'WFI Still Outlet',         hint: 'Freshly produced WFI. Must meet USP/EP conductivity and endotoxin specs.', primary: ['permeateConductivity', 'ph', 'bacteriaCount'] },
    { value: 'storage_tank',  label: 'WFI Storage Tank',         hint: 'Hot storage (80°C+) or ambient. Endotoxin and conductivity critical.',    primary: ['permeateConductivity', 'ph', 'bacteriaCount'], alert: 'WFI must be stored at ≥80°C or below 25°C to control endotoxin and microbial growth.' },
    { value: 'loop',          label: 'Distribution Loop',        hint: 'Point-of-use sample. Compare to storage tank for distribution integrity.', primary: ['permeateConductivity', 'ph', 'bacteriaCount'] },
  ],
};

// Normalize hot_water_heater → same sources as defined; condensate_system handled separately
function getSourcesForType(t: string): SourceDef[] {
  return SOURCES[t] ?? SOURCES['boiler']?.slice(0, 3) ?? [];
}

const WATER_CHEM_TYPES = ['boiler', 'hot_water_heater', 'chiller', 'cooling_tower', 'ro_system', 'wfi_system', 'condensate_system', 'other'];

// ── Field helper ──────────────────────────────────────────────────────────────

function F({
  label, k, unit, data, onChange, placeholder = '', isPrimary = false,
}: {
  label: string; k: keyof WaterChemistryData; unit?: string;
  data: WaterChemistryData; onChange: (d: WaterChemistryData) => void;
  placeholder?: string; isPrimary?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${isPrimary ? 'ring-1 ring-sky-500/30 rounded-lg p-2 bg-sky-500/5' : ''}`}>
      <Label className="text-xs font-medium flex items-center gap-1">
        {isPrimary && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
        {label}
        {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
      </Label>
      <Input
        type="number" step="any"
        value={data[k] as string}
        onChange={e => onChange({ ...data, [k]: e.target.value })}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: WaterChemistryData;
  onChange: (data: WaterChemistryData) => void;
  errors: Record<string, string>;
}

export function WaterChemistryForm({ data, onChange, errors }: Props) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loadingEq, setLoadingEq] = useState(false);

  useEffect(() => {
    setLoadingEq(true);
    apiRequest(`/equipment`)
      .then(res => {
        setEquipment((res.equipment || []).filter((e: any) => WATER_CHEM_TYPES.includes(e.equipmentType)));
      })
      .catch(() => {})
      .finally(() => setLoadingEq(false));
  }, [user?.facilityId]);

  const selectEquipment = (id: string) => {
    const eq = equipment.find(e => e.equipmentId === id);
    if (eq) onChange({ ...data, equipmentId: id, equipmentType: eq.equipmentType, equipmentName: eq.equipmentName || eq.equipmentId, sampleSource: '' });
  };

  const t          = data.equipmentType;
  const sources    = getSourcesForType(t);
  const activeSrc  = sources.find(s => s.value === data.sampleSource);
  const primary    = new Set(activeSrc?.primary ?? []);

  const isBoiler   = ['boiler', 'hot_water_heater', 'condensate_system'].includes(t);
  const isTower    = t === 'cooling_tower';
  const isChiller  = t === 'chiller';
  const isRO       = ['ro_system', 'wfi_system'].includes(t);
  const showAll    = !!data.sampleSource;

  // Which field sections to show per equipment type
  const showBoilerChem  = isBoiler  && showAll;
  const showTowerChem   = isTower   && showAll;
  const showChillerChem = isChiller && showAll;
  const showROChem      = isRO      && showAll;

  return (
    <div className="space-y-6">

      {/* ── Step 1: Equipment ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-400" />
          Step 1 — Select Equipment <span className="text-destructive">*</span>
        </Label>
        <Select value={data.equipmentId} onValueChange={selectEquipment} disabled={loadingEq}>
          <SelectTrigger className={errors.equipmentId ? 'border-destructive' : ''}>
            <SelectValue placeholder={loadingEq ? 'Loading equipment…' : 'Select equipment to test'} />
          </SelectTrigger>
          <SelectContent>
            {equipment.map(eq => (
              <SelectItem key={eq.equipmentId} value={eq.equipmentId}>
                {eq.equipmentName || eq.equipmentId}
                <span className="ml-2 text-muted-foreground text-xs capitalize">
                  {eq.equipmentType?.replace(/_/g, ' ')}
                </span>
              </SelectItem>
            ))}
            {equipment.length === 0 && !loadingEq && (
              <SelectItem value="__none" disabled>No water-bearing equipment found in library</SelectItem>
            )}
          </SelectContent>
        </Select>
        {errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId}</p>}
      </div>

      {/* ── Step 2: Sample Source ───────────────────────────────────────── */}
      {t && sources.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-sky-400" />
            Step 2 — Sample Source / Test Point <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.sampleSource}
            onValueChange={v => onChange({ ...data, sampleSource: v })}
          >
            <SelectTrigger className={errors.sampleSource ? 'border-destructive' : ''}>
              <SelectValue placeholder="Where in the system did you pull this sample?" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1">
                  {data.equipmentName} — Sample Points
                </SelectLabel>
                {sources.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.sampleSource && <p className="text-xs text-destructive">{errors.sampleSource}</p>}

          {/* Source guidance */}
          {activeSrc?.alert && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {activeSrc.alert}
            </div>
          )}
          {activeSrc?.hint && !activeSrc.alert && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-400">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {activeSrc.hint}
            </div>
          )}
          {activeSrc?.hint && activeSrc.alert && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-400">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {activeSrc.hint}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Chemistry Readings ──────────────────────────────────── */}
      {showAll && (
        <>
          {primary.size > 0 && (
            <p className="text-[10px] text-sky-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Highlighted fields are key readings for <strong>{activeSrc?.label}</strong>
            </p>
          )}

          {/* Universal / basic fields */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />General Chemistry
            </p>
            <div className="grid grid-cols-2 gap-3">
              <F label="pH"              k="ph"              data={data} onChange={onChange} placeholder="e.g. 7.5"      isPrimary={primary.has('ph')} />
              <F label="Conductivity"    k="conductivity"    unit="µS/cm" data={data} onChange={onChange} placeholder="e.g. 1500"   isPrimary={primary.has('conductivity')} />
              <F label="TDS"             k="tds"             unit="ppm"   data={data} onChange={onChange} placeholder="e.g. 750"    isPrimary={primary.has('tds')} />
              <F label="Total Hardness"  k="hardness"        unit="ppm CaCO₃" data={data} onChange={onChange} placeholder="e.g. 200" isPrimary={primary.has('hardness')} />
              <F label="Chlorine Residual" k="chlorineResidual" unit="ppm" data={data} onChange={onChange} placeholder="e.g. 0.5"  isPrimary={primary.has('chlorineResidual')} />
              <F label="Iron"            k="iron"            unit="ppm"   data={data} onChange={onChange} placeholder="e.g. 0.1"   isPrimary={primary.has('iron')} />
              <F label="Turbidity"       k="turbidity"       unit="NTU"   data={data} onChange={onChange} placeholder="e.g. 0.5"   isPrimary={primary.has('turbidity')} />
            </div>
          </div>

          {/* Boiler / steam / condensate */}
          {showBoilerChem && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Boiler / Steam Chemistry</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="P-Alkalinity"  k="pAlkalinity"   unit="ppm CaCO₃" data={data} onChange={onChange} placeholder="e.g. 200"  isPrimary={primary.has('pAlkalinity')} />
                <F label="M-Alkalinity"  k="mAlkalinity"   unit="ppm CaCO₃" data={data} onChange={onChange} placeholder="e.g. 400"  isPrimary={primary.has('mAlkalinity')} />
                <F label="Sulfites (O₂ Scavenger)" k="sulfites" unit="ppm" data={data} onChange={onChange} placeholder="e.g. 30–60" isPrimary={primary.has('sulfites')} />
                <F label="Chlorides"     k="chlorides"     unit="ppm"   data={data} onChange={onChange} placeholder="e.g. <50"    isPrimary={primary.has('chlorides')} />
                <F label="Silica"        k="silica"        unit="ppm SiO₂" data={data} onChange={onChange} placeholder="e.g. <50" isPrimary={primary.has('silica')} />
                <F label="Phosphates"    k="phosphates"    unit="ppm PO₄" data={data} onChange={onChange} placeholder="e.g. 20–40" isPrimary={primary.has('phosphates')} />
                <F label="Cycles of Concentration" k="cyclesOfConcentration" unit="x" data={data} onChange={onChange} placeholder="e.g. 8" isPrimary={primary.has('cyclesOfConcentration')} />
              </div>
            </div>
          )}

          {/* Cooling tower */}
          {showTowerChem && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cooling Tower Chemistry</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Calcium Hardness"  k="caHardness"     unit="ppm CaCO₃" data={data} onChange={onChange} placeholder="e.g. 200–600" isPrimary={primary.has('caHardness')} />
                <F label="M-Alkalinity"      k="mAlkalinity"    unit="ppm CaCO₃" data={data} onChange={onChange} placeholder="e.g. 100–300" isPrimary={primary.has('mAlkalinity')} />
                <F label="Chlorides"         k="chlorides"      unit="ppm"   data={data} onChange={onChange} placeholder="e.g. <250"    isPrimary={primary.has('chlorides')} />
                <F label="Phosphates"        k="phosphates"     unit="ppm PO₄" data={data} onChange={onChange} placeholder="e.g. 2–5"  isPrimary={primary.has('phosphates')} />
                <F label="Cycles of Concentration" k="cyclesOfConcentration" unit="x" data={data} onChange={onChange} placeholder="e.g. 4–6" isPrimary={primary.has('cyclesOfConcentration')} />
                <F label="Biocide Residual"  k="biocideResidual" unit="ppm"  data={data} onChange={onChange} placeholder="per program"  isPrimary={primary.has('biocideResidual')} />
                <F label="Bacteria Count"    k="bacteriaCount"  unit="CFU/mL" data={data} onChange={onChange} placeholder="target <10,000" isPrimary={primary.has('bacteriaCount')} />
                <F label="LSI (Langelier)"   k="lsi"            data={data} onChange={onChange} placeholder="-0.5 to +0.5"            isPrimary={primary.has('lsi')} />
              </div>
            </div>
          )}

          {/* Chiller */}
          {showChillerChem && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chilled Water Loop Chemistry</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Glycol Concentration" k="glycolPct"    unit="%"   data={data} onChange={onChange} placeholder="e.g. 25"    isPrimary={primary.has('glycolPct')} />
                <F label="Inhibitor Concentration" k="inhibitorConc" unit="ppm" data={data} onChange={onChange} placeholder="per spec" isPrimary={primary.has('inhibitorConc')} />
                <F label="Nitrite"               k="nitrite"     unit="ppm" data={data} onChange={onChange} placeholder="e.g. 800–1200" isPrimary={primary.has('nitrite')} />
              </div>
            </div>
          )}

          {/* RO / WFI */}
          {showROChem && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">RO / Water Treatment</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Feed Conductivity"     k="feedConductivity"    unit="µS/cm" data={data} onChange={onChange} placeholder="e.g. 500" isPrimary={primary.has('feedConductivity')} />
                <F label="Permeate Conductivity" k="permeateConductivity" unit="µS/cm" data={data} onChange={onChange} placeholder="e.g. 5"  isPrimary={primary.has('permeateConductivity')} />
                <F label="TDS Rejection"         k="tdsRejectionPct"     unit="%"     data={data} onChange={onChange} placeholder="target >95%" isPrimary={primary.has('tdsRejectionPct')} />
                <F label="SDI"                   k="sdi"                 data={data} onChange={onChange} placeholder="target <5"           isPrimary={primary.has('sdi')} />
                <F label="Bacteria Count"        k="bacteriaCount"       unit="CFU/mL" data={data} onChange={onChange} placeholder="target <100" isPrimary={primary.has('bacteriaCount')} />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes / Treatment Actions</Label>
            <Input
              value={data.notes}
              onChange={e => onChange({ ...data, notes: e.target.value })}
              placeholder="Treatment dosed, regeneration done, adjustments made…"
              className="h-8 text-sm"
            />
          </div>
        </>
      )}

      {/* Placeholder when no source selected yet */}
      {t && sources.length > 0 && !data.sampleSource && (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/40 rounded-lg">
          Select a sample source above to reveal the chemistry fields
        </div>
      )}
    </div>
  );
}
