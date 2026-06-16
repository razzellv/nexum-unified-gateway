import { useState, useMemo } from 'react';
import {
  Droplets, Gauge, ShieldCheck, Zap, Wind, RefreshCw,
  AlertTriangle, CheckCircle2, Download, ChevronDown, ChevronUp,
  ClipboardList, Thermometer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ── Scoring types ─────────────────────────────────────────────────────────────
interface GlycolForm {
  // 1. Pressure Stability
  pressureVariancePSI: number;
  systemLosingPressure: boolean;
  // 2. Makeup Frequency
  dailyMakeupGallons: number;
  makeupMaskingLeak: boolean;
  // 3. Pump Reliability
  pumpsAlternating: boolean;
  pumpAlternationHours: number;
  primaryPumpFailed: boolean;
  // 4. Freeze Protection
  currentConcentration: number;
  minimumConcentration: number;
  // 5. Chemical Quality
  phReading: number;
  inhibitorsGood: boolean;
  daysSinceLastTest: number;
  // 6. Air Elimination
  ventsWorkingProperly: boolean;
  airPocketsDetected: boolean;
  systemNoise: boolean;
}

interface Risk { factor: string; severity: 'critical' | 'high' | 'medium' | 'low'; text: string; action: string; }
interface ScoreResult { total: number; breakdown: Record<string, number>; risks: Risk[]; rating: string; ratingColor: string; }

const DEFAULT_FORM: GlycolForm = {
  pressureVariancePSI: 2,
  systemLosingPressure: false,
  dailyMakeupGallons: 0.25,
  makeupMaskingLeak: false,
  pumpsAlternating: true,
  pumpAlternationHours: 48,
  primaryPumpFailed: false,
  currentConcentration: 40,
  minimumConcentration: 30,
  phReading: 7.4,
  inhibitorsGood: true,
  daysSinceLastTest: 45,
  ventsWorkingProperly: true,
  airPocketsDetected: false,
  systemNoise: false,
};

// ── Scoring engine ────────────────────────────────────────────────────────────
function calculate(f: GlycolForm): ScoreResult {
  const risks: Risk[] = [];

  // 1. Pressure Stability — 20 pts
  let pressure = f.pressureVariancePSI <= 2 ? 20 : f.pressureVariancePSI <= 5 ? 15 : f.pressureVariancePSI <= 10 ? 10 : 5;
  if (f.systemLosingPressure) pressure = Math.max(2, pressure - 6);
  if (pressure < 12)
    risks.push({ factor: 'Pressure Stability', severity: pressure < 7 ? 'critical' : 'high',
      text: `${f.pressureVariancePSI} PSI variance${f.systemLosingPressure ? ' + active pressure loss' : ''} detected.`,
      action: 'Inspect expansion tank bladder; pressure-test loop for leaks; verify PRV setpoint.' });

  // 2. Makeup Frequency — 20 pts
  let makeup = f.dailyMakeupGallons <= 0.5 ? 20 : f.dailyMakeupGallons <= 1 ? 15 : f.dailyMakeupGallons <= 3 ? 8 : 3;
  if (f.makeupMaskingLeak) makeup = Math.max(2, makeup - 8);
  if (makeup < 12)
    risks.push({ factor: 'Glycol Loss / Makeup', severity: makeup < 5 ? 'critical' : 'high',
      text: `${f.dailyMakeupGallons} gal/day makeup${f.makeupMaskingLeak ? ' — suspected masking a leak' : ''}.`,
      action: 'Isolate loop sections; use UV dye tracer or pressure decay test to locate leak source.' });

  // 3. Pump Reliability — 15 pts
  let pump = 5;
  if (f.primaryPumpFailed) pump = 2;
  else if (!f.pumpsAlternating) pump = 5;
  else if (f.pumpAlternationHours <= 72) pump = 15;
  else if (f.pumpAlternationHours <= 168) pump = 10;
  else pump = 7;
  if (pump < 10)
    risks.push({ factor: 'Pump Alternation', severity: pump < 4 ? 'critical' : 'high',
      text: f.primaryPumpFailed ? 'Primary pump failure — running on standby.' : `Last alternation ${f.pumpAlternationHours}h ago — alternation ${f.pumpsAlternating ? 'overdue' : 'not functioning'}.`,
      action: 'Test lead-lag controls; verify both pumps start on command; check alternation relay.' });

  // 4. Freeze Protection Margin — 20 pts
  const margin = f.currentConcentration - f.minimumConcentration;
  const freeze = margin > 10 ? 20 : margin >= 5 ? 15 : margin >= 2 ? 10 : margin >= 0 ? 5 : 0;
  if (freeze < 12)
    risks.push({ factor: 'Freeze Protection', severity: freeze === 0 ? 'critical' : freeze < 7 ? 'high' : 'medium',
      text: `Concentration ${f.currentConcentration}% vs. ${f.minimumConcentration}% minimum — ${margin < 0 ? 'BELOW MINIMUM' : margin.toFixed(1) + '% margin'}.`,
      action: 'Test with refractometer; calculate required add-volume; add glycol and re-test. Document result.' });

  // 5. Chemical Quality — 15 pts
  const phOk = f.phReading >= 6.5 && f.phReading <= 8.5;
  let chem = f.phReading === 0 ? 3 : (!phOk ? 3 : (f.inhibitorsGood && f.daysSinceLastTest <= 30 ? 15 : f.daysSinceLastTest <= 90 ? 10 : f.daysSinceLastTest <= 180 ? 6 : 4));
  if (!phOk && f.phReading > 0) chem = Math.max(2, chem - 3);
  if (chem < 10)
    risks.push({ factor: 'Chemical Quality', severity: chem < 5 ? 'critical' : 'medium',
      text: `pH ${f.phReading || 'untested'} (target 6.5–8.5); inhibitors ${f.inhibitorsGood ? 'OK' : 'depleted'}; last tested ${f.daysSinceLastTest} days ago.`,
      action: 'Perform full glycol analysis (pH, inhibitor, freeze point, metals). Treat or replace as indicated.' });

  // 6. Air Elimination — 10 pts
  const air = (f.ventsWorkingProperly && !f.airPocketsDetected && !f.systemNoise) ? 10
    : (f.ventsWorkingProperly && !f.airPocketsDetected) ? 7
    : (!f.airPocketsDetected) ? 5 : 2;
  if (air < 6)
    risks.push({ factor: 'Air Elimination', severity: air < 3 ? 'high' : 'medium',
      text: `Air vents ${f.ventsWorkingProperly ? 'OK' : 'not functioning'}; pockets ${f.airPocketsDetected ? 'detected' : 'none'}; noise ${f.systemNoise ? 'present' : 'none'}.`,
      action: 'Manually purge high points; inspect and test automatic air vents; verify expansion tank charge.' });

  const breakdown = { pressure, makeup, pump, freeze, chem, air };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const [rating, ratingColor] =
    total >= 85 ? ['Excellent — System Healthy', 'text-green-400'] :
    total >= 70 ? ['Good — Monitor Closely', 'text-lime-400'] :
    total >= 50 ? ['Fair — Schedule Inspection', 'text-yellow-400'] :
    total >= 30 ? ['Poor — Action Required', 'text-orange-400'] :
                  ['Critical — Immediate Intervention', 'text-red-400'];

  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return { total, breakdown, risks, rating, ratingColor };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  // SVG half-circle gauge, 0=left end, 100=right end
  const r = 52, cx = 70, cy = 68;
  const toXY = (pct: number) => {
    const angle = Math.PI - (pct / 100) * Math.PI;
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const { x, y } = toXY(score);
  const largeArc = score > 50 ? 1 : 0;
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fillPath  = score === 0 ? '' : `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`;
  const color = score >= 85 ? '#4ade80' : score >= 70 ? '#a3e635' : score >= 50 ? '#facc15' : score >= 30 ? '#fb923c' : '#f87171';

  return (
    <svg viewBox="0 0 140 80" className="w-full max-w-[180px]">
      <path d={trackPath} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" strokeLinecap="round" />
      {fillPath && <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />}
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground font-bold" fontSize="22">{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-muted-foreground" fontSize="9">/100</text>
    </svg>
  );
}

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  high:     'bg-orange-500/10 border-orange-500/30 text-orange-400',
  medium:   'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low:      'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

function Num({ value, onChange, min, max, step = 0.1, unit = '' }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 bg-background border border-border/50 rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-primary/50"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary rounded" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </label>
  );
}

const FACTOR_META = [
  { key: 'pressure', label: 'Pressure Stability',   max: 20, icon: Gauge },
  { key: 'makeup',   label: 'Glycol Loss / Makeup', max: 20, icon: Droplets },
  { key: 'pump',     label: 'Pump Reliability',     max: 15, icon: Zap },
  { key: 'freeze',   label: 'Freeze Protection',    max: 20, icon: Thermometer },
  { key: 'chem',     label: 'Chemical Quality',     max: 15, icon: ShieldCheck },
  { key: 'air',      label: 'Air Elimination',      max: 10, icon: Wind },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function GlycolHealthScore() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GlycolForm>(DEFAULT_FORM);

  const set = <K extends keyof GlycolForm>(k: K, v: GlycolForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const result = useMemo(() => calculate(form), [form]);

  const handleExport = () => {
    const now = new Date().toLocaleString();
    const lines = [
      'NEXUM SUUM — GLYCOL SYSTEM HEALTH SCORE™',
      `Assessment Date: ${now}`,
      '─'.repeat(50),
      `Overall Score: ${result.total}/100 — ${result.rating}`,
      '',
      'FACTOR BREAKDOWN',
      ...FACTOR_META.map(f => `  ${f.label.padEnd(24)} ${result.breakdown[f.key]}/${f.max}`),
      '',
      'IDENTIFIED RISKS & ACTIONS',
      ...result.risks.map(r => `[${r.severity.toUpperCase()}] ${r.factor}\n  Finding: ${r.text}\n  Action:  ${r.action}`),
      '',
      'INPUT PARAMETERS',
      `  Pressure Variance:       ${form.pressureVariancePSI} PSI`,
      `  System Losing Pressure:  ${form.systemLosingPressure ? 'Yes' : 'No'}`,
      `  Daily Makeup:            ${form.dailyMakeupGallons} gal/day`,
      `  Makeup Masking Leak:     ${form.makeupMaskingLeak ? 'Yes' : 'No'}`,
      `  Pumps Alternating:       ${form.pumpsAlternating ? 'Yes' : 'No'} (last ${form.pumpAlternationHours}h)`,
      `  Primary Pump Failed:     ${form.primaryPumpFailed ? 'Yes' : 'No'}`,
      `  Glycol Concentration:    ${form.currentConcentration}% (min ${form.minimumConcentration}%)`,
      `  pH Reading:              ${form.phReading}`,
      `  Inhibitors Good:         ${form.inhibitorsGood ? 'Yes' : 'No'}`,
      `  Days Since Chemical Test: ${form.daysSinceLastTest}`,
      `  Vents Working:           ${form.ventsWorkingProperly ? 'Yes' : 'No'}`,
      `  Air Pockets Detected:    ${form.airPocketsDetected ? 'Yes' : 'No'}`,
      `  System Noise:            ${form.systemNoise ? 'Yes' : 'No'}`,
      '',
      '─'.repeat(50),
      'This report was generated by Nexum Suum Facility Intelligence™',
      'Glycol System Health Score™ is a defensible operational risk rating.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `glycol-health-score-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📄 Report Downloaded', description: 'Glycol System Health Score report saved.' });
  };

  const handleCreateWO = () => {
    toast({
      title: 'Work Order Created',
      description: `Glycol System Assessment — ${result.risks[0]?.factor || 'review'} flagged as ${result.risks[0]?.severity || 'priority'}. Open Work Orders to assign.`,
    });
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">

          {/* Collapsible header */}
          <Card className={cn('border-primary/20 transition-all', open && 'border-primary/40')}>
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Glycol System Health Score™
                      <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-400/30">Facility Intelligence</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      6-factor operational risk rating for glycol loop life-support systems
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {open && (
                    <div className={cn('text-sm font-bold', result.ratingColor)}>
                      {result.total}/100
                    </div>
                  )}
                  {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>

            {open && (
              <CardContent className="space-y-6 pt-0">
                <div className="grid lg:grid-cols-3 gap-6">

                  {/* ── Assessment form (left 2/3) ─────────────────────────── */}
                  <div className="lg:col-span-2 space-y-4">

                    {/* 1 — Pressure */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Gauge className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">1. Pressure Stability</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.pressure}/{20} pts</span>
                        </div>
                        <Field label="Pressure variance over 24h (PSI swing)">
                          <Num value={form.pressureVariancePSI} onChange={v => set('pressureVariancePSI', v)} min={0} max={30} step={0.5} unit="PSI" />
                        </Field>
                        <Check checked={form.systemLosingPressure} onChange={v => set('systemLosingPressure', v)} label="System is actively losing pressure (confirmed trend)" />
                      </CardContent>
                    </Card>

                    {/* 2 — Makeup */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Droplets className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm font-semibold">2. Makeup Frequency</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.makeup}/{20} pts</span>
                        </div>
                        <Field label="Average daily makeup volume">
                          <Num value={form.dailyMakeupGallons} onChange={v => set('dailyMakeupGallons', v)} min={0} max={20} step={0.25} unit="gal/day" />
                        </Field>
                        <Check checked={form.makeupMaskingLeak} onChange={v => set('makeupMaskingLeak', v)} label="Suspect makeup is masking an undetected leak" />
                      </CardContent>
                    </Card>

                    {/* 3 — Pump */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-semibold">3. Pump Reliability</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.pump}/{15} pts</span>
                        </div>
                        <Check checked={form.pumpsAlternating} onChange={v => set('pumpsAlternating', v)} label="Lead-lag alternation is functioning" />
                        <Field label="Hours since last pump alternation">
                          <Num value={form.pumpAlternationHours} onChange={v => set('pumpAlternationHours', v)} min={0} max={720} step={1} unit="hrs" />
                        </Field>
                        <Check checked={form.primaryPumpFailed} onChange={v => set('primaryPumpFailed', v)} label="Primary pump has failed — running on standby" />
                      </CardContent>
                    </Card>

                    {/* 4 — Freeze */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Thermometer className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-semibold">4. Freeze Protection Margin</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.freeze}/{20} pts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Current glycol concentration">
                            <Num value={form.currentConcentration} onChange={v => set('currentConcentration', v)} min={0} max={60} step={1} unit="%" />
                          </Field>
                          <Field label="Minimum required for location">
                            <Num value={form.minimumConcentration} onChange={v => set('minimumConcentration', v)} min={0} max={60} step={1} unit="%" />
                          </Field>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Margin: <span className={cn('font-semibold', (form.currentConcentration - form.minimumConcentration) < 2 ? 'text-red-400' : 'text-green-400')}>
                            {(form.currentConcentration - form.minimumConcentration).toFixed(1)}%
                          </span>
                          {form.currentConcentration < form.minimumConcentration && ' — BELOW MINIMUM'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 5 — Chemical */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-semibold">5. Chemical Quality</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.chem}/{15} pts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Current pH reading (0 = not tested)">
                            <Num value={form.phReading} onChange={v => set('phReading', v)} min={0} max={14} step={0.1} />
                          </Field>
                          <Field label="Days since last chemical test">
                            <Num value={form.daysSinceLastTest} onChange={v => set('daysSinceLastTest', v)} min={0} max={730} step={1} unit="days" />
                          </Field>
                        </div>
                        <Check checked={form.inhibitorsGood} onChange={v => set('inhibitorsGood', v)} label="Inhibitor and corrosion protection levels are acceptable" />
                        <p className="text-xs text-muted-foreground">Target pH: 6.5 – 8.5 for most propylene glycol systems</p>
                      </CardContent>
                    </Card>

                    {/* 6 — Air */}
                    <Card className="glass-panel border-border/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Wind className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-semibold">6. Air Elimination</span>
                          <span className="ml-auto text-xs text-muted-foreground">{result.breakdown.air}/{10} pts</span>
                        </div>
                        <Check checked={form.ventsWorkingProperly} onChange={v => set('ventsWorkingProperly', v)} label="Automatic air vents cycling properly" />
                        <Check checked={form.airPocketsDetected} onChange={v => set('airPocketsDetected', v)} label="Air pockets or dead legs detected in system" />
                        <Check checked={form.systemNoise} onChange={v => set('systemNoise', v)} label="Banging, gurgling, or flow noise present" />
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Score panel (right 1/3) ────────────────────────────── */}
                  <div className="space-y-4">
                    <div className="sticky top-4 space-y-4">

                      {/* Score dial */}
                      <Card className={cn('glass-panel text-center', result.total < 30 ? 'border-red-500/30' : result.total < 50 ? 'border-orange-500/30' : result.total >= 85 ? 'border-green-500/30' : 'border-border/30')}>
                        <CardContent className="p-5">
                          <div className="flex justify-center mb-1">
                            <ScoreArc score={result.total} />
                          </div>
                          <p className={cn('text-sm font-semibold leading-tight', result.ratingColor)}>
                            {result.rating}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Glycol System Health Score™</p>
                        </CardContent>
                      </Card>

                      {/* Factor breakdown */}
                      <Card className="glass-panel border-border/30">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-3">Factor Breakdown</p>
                          {FACTOR_META.map(({ key, label, max, icon: Icon }) => {
                            const val = result.breakdown[key];
                            const pct = (val / max) * 100;
                            const barColor = pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : pct >= 40 ? 'bg-orange-400' : 'bg-red-400';
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[11px] text-muted-foreground">{label}</span>
                                  </div>
                                  <span className="text-[11px] font-medium">{val}/{max}</span>
                                </div>
                                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
                          <Download className="w-4 h-4 mr-2" />Export Management Report
                        </Button>
                        {result.risks.length > 0 && (
                          <Button onClick={handleCreateWO} variant="outline" size="sm" className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                            <ClipboardList className="w-4 h-4 mr-2" />Create Work Order
                          </Button>
                        )}
                        <Button onClick={() => setForm(DEFAULT_FORM)} variant="ghost" size="sm" className="w-full text-muted-foreground">
                          <RefreshCw className="w-3.5 h-3.5 mr-2" />Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Risk findings ────────────────────────────────────────── */}
                {result.risks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      Identified Risks & Recommended Actions
                    </h3>
                    {result.risks.map((r, i) => (
                      <div key={i} className={cn('rounded-lg border p-4 space-y-1.5', SEV_COLORS[r.severity])}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide">{r.severity}</span>
                          <span className="text-sm font-semibold">{r.factor}</span>
                        </div>
                        <p className="text-xs">{r.text}</p>
                        <p className="text-xs font-medium">→ {r.action}</p>
                      </div>
                    ))}
                  </div>
                )}

                {result.risks.length === 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-400">All factors within acceptable range</p>
                      <p className="text-xs text-muted-foreground">Continue routine monitoring. Schedule next chemical analysis per PM program.</p>
                    </div>
                  </div>
                )}

              </CardContent>
            )}
          </Card>

        </div>
      </div>
    </section>
  );
}
