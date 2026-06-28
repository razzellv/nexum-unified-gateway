import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  sensibleHeat, latentHeat, totalCooling, copCooling, eer, seerFromEer,
  hotWaterCapacity, boilerEfficiency, fanPower, fanFlowFromSpeed, fanPowerFromSpeed,
  chilledWaterGpm, pumpPower, chillerKwPerTon, ductVelocity, rectDuctArea, roundDuctArea,
  airChangesPerHour, dewPoint, humidityRatio, airEnthalpy, lightingHeatGain,
  estimateCoolingTons, pipeVelocity, gasConsumption, equivalentDiameter,
  HVAC_CONVERSIONS,
} from '@/lib/hvacFormulas';
import {
  Thermometer, Wind, Droplets, Zap, Settings2, ArrowRightLeft,
  Calculator, Gauge, Flame, Waves,
} from 'lucide-react';

// ── Helper ────────────────────────────────────────────────────────────────────
function N(v: number | undefined, dec = 2): string {
  if (v === undefined || isNaN(v) || !isFinite(v)) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

function useNum(init: string) {
  const [v, set] = useState(init);
  const n = parseFloat(v);
  return { v, set, n: isNaN(n) ? 0 : n };
}

function Row({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-1.5 border-b border-border/30 last:border-0', highlight && 'bg-primary/5 -mx-2 px-2 rounded')}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', highlight && 'text-primary')}>
        {value}{unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function Field({ label, value, unit, onChange }: { label: string; value: string; unit?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}{unit && <span className="ml-1 text-muted-foreground/60">({unit})</span>}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 text-sm"
        placeholder="0"
      />
    </div>
  );
}

// ── Section: Sensible / Latent / Total ────────────────────────────────────────
function HeatTab() {
  const cfm = useNum('5000');
  const dt = useNum('20');
  const dg = useNum('30');
  const dh = useNum('10');

  const qs = sensibleHeat(cfm.n, dt.n);
  const ql = latentHeat(cfm.n, dg.n);
  const qt = totalCooling(cfm.n, dh.n);
  const shr = qt > 0 ? qs / qt : 0;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Airflow" unit="CFM" value={cfm.v} onChange={cfm.set} />
          <Field label="Dry-Bulb ΔT" unit="°F" value={dt.v} onChange={dt.set} />
          <Field label="Moisture Change ΔGR" unit="gr/lb" value={dg.v} onChange={dg.set} />
          <Field label="Enthalpy Difference Δh" unit="BTU/lb" value={dh.v} onChange={dh.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent>
          <Row label="Sensible Heat (Q = 1.08 × CFM × ΔT)" value={N(qs, 0)} unit="BTU/hr" highlight />
          <Row label="→ Tons" value={N(HVAC_CONVERSIONS.btuToTons(qs), 2)} unit="tons" />
          <Row label="Latent Heat (Q = 0.68 × CFM × ΔGR)" value={N(ql, 0)} unit="BTU/hr" highlight />
          <Row label="Total Cooling (Q = 4.5 × CFM × Δh)" value={N(qt, 0)} unit="BTU/hr" highlight />
          <Row label="→ Tons" value={N(HVAC_CONVERSIONS.btuToTons(qt), 2)} unit="tons" />
          <Row label="Sensible Heat Ratio (SHR)" value={N(shr, 3)} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Refrigeration / Efficiency ───────────────────────────────────────
function RefrigTab() {
  const tons = useNum('100');
  const kw = useNum('110');

  const btu = HVAC_CONVERSIONS.tonsToBtu(tons.n);
  const cop = copCooling(btu, kw.n);
  const eerV = eer(btu, kw.n * 1000);
  const seerV = seerFromEer(eerV);
  const kwTon = chillerKwPerTon(kw.n, tons.n);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Cooling Capacity" unit="tons" value={tons.v} onChange={tons.set} />
          <Field label="Input Power" unit="kW" value={kw.v} onChange={kw.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent>
          <Row label="Cooling Capacity" value={N(btu, 0)} unit="BTU/hr" />
          <Row label="COP  (Q_cooling / W_input)" value={N(cop, 3)} highlight />
          <Row label="EER  (BTU/hr ÷ Watts)" value={N(eerV, 2)} highlight />
          <Row label="SEER  (≈ EER × 1.12)" value={N(seerV, 2)} />
          <Row label="kW/ton  (efficiency metric)" value={N(kwTon, 3)} highlight />
          <Row label="Benchmark (good: ≤ 0.6 kW/ton)" value={kwTon <= 0.6 ? '✓ Efficient' : kwTon <= 0.8 ? 'Average' : '⚠ Inefficient'} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Heating ──────────────────────────────────────────────────────────
function HeatingTab() {
  const gpm = useNum('200');
  const dt = useNum('20');
  const outBtu = useNum('800000');
  const inBtu = useNum('950000');
  const kwEl = useNum('50');

  const hwCap = hotWaterCapacity(gpm.n, dt.n);
  const eta = boilerEfficiency(outBtu.n, inBtu.n);
  const elHeat = HVAC_CONVERSIONS.kwToBtu(kwEl.n);
  const gasCons = gasConsumption(outBtu.n, eta);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground font-semibold pt-1">Hot Water System</p>
          <Field label="Flow Rate" unit="GPM" value={gpm.v} onChange={gpm.set} />
          <Field label="Temperature Difference ΔT" unit="°F" value={dt.v} onChange={dt.set} />
          <p className="text-xs text-muted-foreground font-semibold pt-2">Boiler Efficiency</p>
          <Field label="Output Capacity" unit="BTU/hr" value={outBtu.v} onChange={outBtu.set} />
          <Field label="Fuel Input" unit="BTU/hr" value={inBtu.v} onChange={inBtu.set} />
          <p className="text-xs text-muted-foreground font-semibold pt-2">Electric Heat</p>
          <Field label="Electric Input" unit="kW" value={kwEl.v} onChange={kwEl.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent>
          <Row label="Hot Water Capacity (500 × GPM × ΔT)" value={N(hwCap, 0)} unit="BTU/hr" highlight />
          <Row label="→ Tons equivalent" value={N(HVAC_CONVERSIONS.btuToTons(hwCap), 1)} unit="tons" />
          <Row label="Boiler Efficiency" value={N(eta, 1)} unit="%" highlight />
          <Row label="Gas Consumption (approx)" value={N(gasCons, 0)} unit="ft³/hr" />
          <Row label="Electric Heat Output" value={N(elHeat, 0)} unit="BTU/hr" highlight />
          <Row label="→ kW equivalent" value={N(kwEl.n, 1)} unit="kW" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Fan & Airflow ────────────────────────────────────────────────────
function FanTab() {
  const cfm = useNum('10000');
  const sp = useNum('1.5');
  const eff = useNum('65');
  const rpm1 = useNum('1800');
  const rpm2 = useNum('1440');
  const wIn = useNum('24');
  const hIn = useNum('18');
  const dIn = useNum('12');
  const roomVol = useNum('50000');

  const pw = fanPower(cfm.n, sp.n, eff.n / 100);
  const cfm2 = fanFlowFromSpeed(cfm.n, rpm1.n, rpm2.n);
  const sp2 = sp.n * Math.pow(rpm2.n / (rpm1.n || 1), 2);
  const pw2 = fanPowerFromSpeed(pw, rpm1.n, rpm2.n);
  const rectArea = rectDuctArea(wIn.n, hIn.n);
  const roundArea = roundDuctArea(dIn.n);
  const vel = ductVelocity(cfm.n, rectArea);
  const ach = airChangesPerHour(cfm.n, roomVol.n);
  const eqDia = equivalentDiameter(wIn.n, hIn.n);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Airflow" unit="CFM" value={cfm.v} onChange={cfm.set} />
          <Field label="Static Pressure" unit="in w.g." value={sp.v} onChange={sp.set} />
          <Field label="Fan Efficiency" unit="%" value={eff.v} onChange={eff.set} />
          <p className="text-xs text-muted-foreground font-semibold pt-2">Fan Laws (Speed Change)</p>
          <Field label="Original RPM" value={rpm1.v} onChange={rpm1.set} />
          <Field label="New RPM" value={rpm2.v} onChange={rpm2.set} />
          <p className="text-xs text-muted-foreground font-semibold pt-2">Duct Sizing</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Width" unit="in" value={wIn.v} onChange={wIn.set} />
            <Field label="Height" unit="in" value={hIn.v} onChange={hIn.set} />
          </div>
          <Field label="Round Diameter" unit="in" value={dIn.v} onChange={dIn.set} />
          <Field label="Room Volume" unit="ft³" value={roomVol.v} onChange={roomVol.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent>
          <Row label="Fan Power  (CFM × SP / 6356 / η)" value={N(pw, 2)} unit="kW" highlight />
          <Row label="→ HP" value={N(HVAC_CONVERSIONS.kwToHp(pw), 2)} unit="HP" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Fan Laws @ New RPM</p>
          <Row label="New Flow" value={N(cfm2, 0)} unit="CFM" highlight />
          <Row label="New Static Pressure" value={N(sp2, 3)} unit="in w.g." />
          <Row label="New Power" value={N(pw2, 2)} unit="kW" />
          <Row label="Power Savings" value={N(pw - pw2, 2)} unit="kW" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Duct</p>
          <Row label="Rect. Duct Velocity" value={N(vel, 0)} unit="FPM" highlight />
          <Row label="Equiv. Round Diameter" value={N(eqDia, 1)} unit="in" />
          <Row label="Air Changes / Hour" value={N(ach, 1)} unit="ACH" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Chilled Water ────────────────────────────────────────────────────
function ChilledWaterTab() {
  const load = useNum('1000000');
  const dt = useNum('10');
  const tdh = useNum('80');
  const pumpEff = useNum('75');
  const tons = useNum('83');
  const kw = useNum('55');

  const gpm = chilledWaterGpm(load.n, dt.n);
  const pumpKw = pumpPower(gpm, tdh.n, pumpEff.n / 100);
  const kwTon = chillerKwPerTon(kw.n, tons.n);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Cooling Load" unit="BTU/hr" value={load.v} onChange={load.set} />
          <Field label="Chilled Water ΔT" unit="°F" value={dt.v} onChange={dt.set} />
          <Field label="Total Dynamic Head" unit="ft" value={tdh.v} onChange={tdh.set} />
          <Field label="Pump Efficiency" unit="%" value={pumpEff.v} onChange={pumpEff.set} />
          <p className="text-xs text-muted-foreground font-semibold pt-2">Chiller Efficiency</p>
          <Field label="Chiller Input Power" unit="kW" value={kw.v} onChange={kw.set} />
          <Field label="Cooling Capacity" unit="tons" value={tons.v} onChange={tons.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent>
          <Row label="Required Flow (Q / 500 / ΔT)" value={N(gpm, 1)} unit="GPM" highlight />
          <Row label="Pump Power" value={N(pumpKw, 2)} unit="kW" highlight />
          <Row label="→ HP" value={N(HVAC_CONVERSIONS.kwToHp(pumpKw), 2)} unit="HP" />
          <Row label="Chiller kW/ton" value={N(kwTon, 3)} unit="kW/ton" highlight />
          <Row label="Efficiency Rating" value={kwTon < 0.5 ? '✓ Excellent' : kwTon < 0.65 ? '✓ Good' : kwTon < 0.8 ? 'Average' : '⚠ Poor'} />
          <Row label="Chiller COP" value={N(copCooling(HVAC_CONVERSIONS.tonsToBtu(tons.n), kw.n), 2)} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Psychrometrics ───────────────────────────────────────────────────
function PsychroTab() {
  const db = useNum('75');
  const rh = useNum('50');

  const dp = dewPoint(db.n, rh.n);
  const hr = humidityRatio(db.n, rh.n);
  const h = airEnthalpy(db.n, hr);
  const wb = db.n - (db.n - dp) / 3; // simplified wet-bulb approx

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Dry-Bulb Temperature" unit="°F" value={db.v} onChange={db.set} />
          <Field label="Relative Humidity" unit="%" value={rh.v} onChange={rh.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Results (Magnus Formula)</CardTitle></CardHeader>
        <CardContent>
          <Row label="Dew Point Temperature" value={N(dp, 1)} unit="°F" highlight />
          <Row label="→ Dew Point °C" value={N(HVAC_CONVERSIONS.fToC(dp), 1)} unit="°C" />
          <Row label="Wet-Bulb (approx)" value={N(wb, 1)} unit="°F" />
          <Row label="Humidity Ratio" value={N(hr, 1)} unit="gr/lb" highlight />
          <Row label="Enthalpy" value={N(h, 2)} unit="BTU/lb" highlight />
          <Row label="Comfort zone (ASHRAE 55)" value={db.n >= 68 && db.n <= 76 && rh.n >= 30 && rh.n <= 60 ? '✓ In range' : '⚠ Outside range'} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Unit Conversions ─────────────────────────────────────────────────
function ConversionTab() {
  const val = useNum('1');

  const conversions = [
    { label: 'Tons → BTU/hr', result: N(HVAC_CONVERSIONS.tonsToBtu(val.n), 0), unit: 'BTU/hr' },
    { label: 'BTU/hr → Tons', result: N(HVAC_CONVERSIONS.btuToTons(val.n), 4), unit: 'tons' },
    { label: 'kW → BTU/hr', result: N(HVAC_CONVERSIONS.kwToBtu(val.n), 1), unit: 'BTU/hr' },
    { label: 'BTU/hr → kW', result: N(HVAC_CONVERSIONS.btuToKw(val.n), 4), unit: 'kW' },
    { label: 'HP → kW', result: N(HVAC_CONVERSIONS.hpToKw(val.n), 3), unit: 'kW' },
    { label: 'kW → HP', result: N(HVAC_CONVERSIONS.kwToHp(val.n), 3), unit: 'HP' },
    { label: '°F → °C', result: N(HVAC_CONVERSIONS.fToC(val.n), 2), unit: '°C' },
    { label: '°C → °F', result: N(HVAC_CONVERSIONS.cToF(val.n), 2), unit: '°F' },
    { label: 'PSI → in w.g.', result: N(HVAC_CONVERSIONS.psiToInWg(val.n), 2), unit: 'in w.g.' },
    { label: 'in w.g. → PSI', result: N(HVAC_CONVERSIONS.inWgToPsi(val.n), 4), unit: 'PSI' },
    { label: 'GPM → L/min', result: N(HVAC_CONVERSIONS.gpmToLpm(val.n), 2), unit: 'L/min' },
    { label: 'CFM → L/s', result: N(HVAC_CONVERSIONS.cfmToLps(val.n), 3), unit: 'L/s' },
    { label: 'PSI → kPa', result: N(HVAC_CONVERSIONS.psiToKpa(val.n), 2), unit: 'kPa' },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Input Value</CardTitle></CardHeader>
        <CardContent>
          <Field label="Value" value={val.v} onChange={val.set} />
          <p className="text-xs text-muted-foreground mt-3">Enter any value above to see all conversions simultaneously.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">All Conversions</CardTitle></CardHeader>
        <CardContent>
          {conversions.map(c => (
            <Row key={c.label} label={c.label} value={c.result} unit={c.unit} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Cooling Load Estimate ────────────────────────────────────────────
function CoolingLoadTab() {
  const sqft = useNum('5000');
  const lights = useNum('2000');
  const people = useNum('20');
  const lf = useNum('450');

  const tonsEst = estimateCoolingTons(sqft.n, lf.n);
  const lightGain = lightingHeatGain(lights.n);
  const peopleGain = { sensible: people.n * 250, latent: people.n * 200, total: people.n * 450 };
  const totalLoad = HVAC_CONVERSIONS.tonsToBtu(tonsEst) + lightGain + peopleGain.total;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Floor Area" unit="sq ft" value={sqft.v} onChange={sqft.set} />
          <Field label="Load Factor" unit="sq ft/ton" value={lf.v} onChange={lf.set} />
          <p className="text-[10px] text-muted-foreground">Typical: office 400–500, retail 300–400, server room 100–150</p>
          <Field label="Lighting Load" unit="Watts" value={lights.v} onChange={lights.set} />
          <Field label="Occupants" unit="people" value={people.v} onChange={people.set} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Estimated Load</CardTitle></CardHeader>
        <CardContent>
          <Row label="Building Load (rule of thumb)" value={N(tonsEst, 1)} unit="tons" highlight />
          <Row label="→ BTU/hr" value={N(HVAC_CONVERSIONS.tonsToBtu(tonsEst), 0)} unit="BTU/hr" />
          <Row label="Lighting Heat Gain" value={N(lightGain, 0)} unit="BTU/hr" />
          <Row label="People Sensible" value={N(peopleGain.sensible, 0)} unit="BTU/hr" />
          <Row label="People Latent" value={N(peopleGain.latent, 0)} unit="BTU/hr" />
          <Row label="Total Load (incl. internal)" value={N(totalLoad, 0)} unit="BTU/hr" highlight />
          <Row label="→ Tons (total)" value={N(HVAC_CONVERSIONS.btuToTons(totalLoad), 1)} unit="tons" highlight />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'heat',     label: 'Heat Load',     icon: Thermometer },
  { id: 'refrig',   label: 'Refrigeration', icon: Zap },
  { id: 'heating',  label: 'Heating',       icon: Flame },
  { id: 'fan',      label: 'Fan & Duct',    icon: Wind },
  { id: 'chw',      label: 'Chilled Water', icon: Waves },
  { id: 'psychro',  label: 'Psychrometrics',icon: Droplets },
  { id: 'load',     label: 'Cooling Load',  icon: Gauge },
  { id: 'convert',  label: 'Conversions',   icon: ArrowRightLeft },
];

export default function HvacCalculator() {
  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Calculator className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">HVAC Formula Engine</h1>
            <p className="text-sm text-muted-foreground">Engineering calculations — psychrometrics, load, refrigeration, fan laws, conversions</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs border-blue-500/30 text-blue-400">
            ASHRAE Formulas
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground border border-border/40 rounded p-2.5 bg-muted/20">
          All formulas use US customary units (BTU, °F, CFM, GPM, HP, tons of refrigeration) unless noted. Results are instantaneous — edit any input to recalculate. For design work, verify against full load calculations and applicable codes.
        </p>

        {/* Tabs */}
        <Tabs defaultValue="heat">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 text-xs h-8">
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="heat" className="mt-4"><HeatTab /></TabsContent>
          <TabsContent value="refrig" className="mt-4"><RefrigTab /></TabsContent>
          <TabsContent value="heating" className="mt-4"><HeatingTab /></TabsContent>
          <TabsContent value="fan" className="mt-4"><FanTab /></TabsContent>
          <TabsContent value="chw" className="mt-4"><ChilledWaterTab /></TabsContent>
          <TabsContent value="psychro" className="mt-4"><PsychroTab /></TabsContent>
          <TabsContent value="load" className="mt-4"><CoolingLoadTab /></TabsContent>
          <TabsContent value="convert" className="mt-4"><ConversionTab /></TabsContent>
        </Tabs>

        {/* Formula Reference */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Quick Reference — Key Formulas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
              {[
                'Q_s = 1.08 × CFM × ΔT  (sensible, BTU/hr)',
                'Q_l = 0.68 × CFM × ΔGR  (latent, BTU/hr)',
                'Q_t = 4.5 × CFM × Δh  (total, BTU/hr)',
                'COP = Q_cooling / W_input',
                'EER = BTU/hr ÷ Watts',
                '1 ton = 12,000 BTU/hr',
                'Q_hw = 500 × GPM × ΔT  (hot water)',
                'P_fan = CFM × SP / (6356 × η)',
                'CFM₂ = CFM₁ × (RPM₂/RPM₁)  [Fan Law 1]',
                'SP₂ = SP₁ × (RPM₂/RPM₁)²  [Fan Law 2]',
                'P₂ = P₁ × (RPM₂/RPM₁)³  [Fan Law 3]',
                'P_pump = GPM × TDH / (3960 × η)',
              ].map(f => (
                <div key={f} className="p-1.5 rounded bg-muted/30 text-muted-foreground text-[10px]">{f}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
