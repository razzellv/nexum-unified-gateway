/**
 * Continuity Intelligence™
 *
 * "Facility Intelligence measures how operations perform.
 *  Operational Intelligence measures whether operations CAN CONTINUE performing."
 *
 * Measures organizational resilience against disruption, personnel turnover,
 * knowledge loss, leadership changes, vendor dependency, compliance failures,
 * and decision breakdowns.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield, Users, Wrench, Brain, Database, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Minus, Save, RefreshCw,
  BarChart3, Info, Plus, Trash2, BookOpen, Zap, Target, ChevronRight,
  UserCheck, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  COMPONENT_META, SECTOR_LABELS, SECTOR_OUTPUT_LABEL, SECTOR_FACTORS,
  EMPTY_RECORD, calcFullScore, calcEmployeeScore, getHealth,
  type ContinuityRecord, type SectorType, type EmployeeContinuityRecord,
  type ContinuityHealth, type ContinuityScoreResult,
} from '@/config/continuity';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const CACHE_KEY = (id: string) => `nexum_continuity_${id}`;

// ── Health config ──────────────────────────────────────────────────────────────
const HEALTH_CONFIG: Record<ContinuityHealth, {
  color: string; bg: string; border: string; icon: typeof CheckCircle2;
  barColor: string; label: string; desc: string;
}> = {
  Strong:   { color: 'text-green-400',  bg: 'bg-green-950/40',   border: 'border-green-600/40',  icon: CheckCircle2, barColor: 'bg-green-500',  label: 'Strong',   desc: 'Organization is resilient against disruption' },
  Moderate: { color: 'text-yellow-400', bg: 'bg-yellow-950/30',  border: 'border-yellow-600/40', icon: AlertTriangle,barColor: 'bg-yellow-500', label: 'Moderate', desc: 'Some continuity gaps — monitoring and action needed' },
  'At Risk':{ color: 'text-orange-400', bg: 'bg-orange-950/30',  border: 'border-orange-600/40', icon: AlertTriangle,barColor: 'bg-orange-500', label: 'At Risk',  desc: 'Significant vulnerability to operational disruption' },
  Critical: { color: 'text-red-400',    bg: 'bg-red-950/40',     border: 'border-red-600/40',    icon: XCircle,      barColor: 'bg-red-500',    label: 'Critical', desc: 'High risk of operational failure under disruption' },
};

// ── ScoreRing ──────────────────────────────────────────────────────────────────
function ScoreRing({ score, health, size = 'lg' }: { score: number; health: ContinuityHealth; size?: 'sm' | 'lg' }) {
  const cfg = HEALTH_CONFIG[health];
  const r = size === 'lg' ? 52 : 32;
  const cx = size === 'lg' ? 60 : 40;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const strokeWidth = size === 'lg' ? 8 : 5;
  const svgSize = size === 'lg' ? 120 : 80;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={health === 'Strong' ? '#22c55e' : health === 'Moderate' ? '#eab308' : health === 'At Risk' ? '#f97316' : '#ef4444'}
          strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <span className={cn('font-bold font-mono', size === 'lg' ? 'text-2xl' : 'text-base', cfg.color)}>{score}</span>
      </div>
    </div>
  );
}

// ── SliderField ────────────────────────────────────────────────────────────────
function SliderField({ label, description, value, onChange }: {
  label: string; description: string; value: number; onChange: (v: number) => void;
}) {
  const clr = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : value >= 40 ? 'text-orange-400' : value > 0 ? 'text-red-400' : 'text-muted-foreground';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs">{description}</TooltipContent>
          </Tooltip>
        </div>
        <span className={cn('text-sm font-bold font-mono w-8 text-right', clr)}>{value}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={100} step={1} className="w-full" />
    </div>
  );
}

// ── ComponentCard ──────────────────────────────────────────────────────────────
function ComponentCard({ meta, values, onChange, score }: {
  meta: typeof COMPONENT_META[0];
  values: Record<string, number>;
  onChange: (field: string, v: number) => void;
  score: number;
}) {
  const health = getHealth(score);
  const cfg = HEALTH_CONFIG[health];
  const Icon = meta.key === 'knowledge' ? BookOpen : meta.key === 'workforce' ? Users : meta.key === 'operational' ? Wrench : meta.key === 'decision' ? Brain : Database;
  return (
    <Card className={cn('border', score > 0 ? cfg.border : 'border-border/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={cn('w-4 h-4', score > 0 ? cfg.color : 'text-muted-foreground')} />
            {meta.label}
            <Badge variant="outline" className="text-[10px] font-mono px-1.5">{Math.round(meta.weight * 100)}% weight</Badge>
          </CardTitle>
          {score > 0 && (
            <div className="flex items-center gap-1.5">
              <span className={cn('text-lg font-bold font-mono', cfg.color)}>{score}</span>
              <Badge variant="outline" className={cn('text-xs', cfg.color)}>{cfg.label}</Badge>
            </div>
          )}
        </div>
        <CardDescription className="text-xs">{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meta.fields.map(f => (
          <SliderField
            key={f.key}
            label={f.label}
            description={f.description}
            value={values[f.key] ?? 0}
            onChange={v => onChange(f.key, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ── ForecastCard ───────────────────────────────────────────────────────────────
function ForecastCard({ scenario, variant }: {
  scenario: ContinuityScoreResult['forecast']['optimistic'];
  variant: 'optimistic' | 'mostLikely' | 'pessimistic';
}) {
  const health = getHealth(scenario.score);
  const cfg = HEALTH_CONFIG[health];
  const borderCls = variant === 'optimistic' ? 'border-green-600/30' : variant === 'mostLikely' ? 'border-primary/30' : 'border-red-600/30';
  const tagCls    = variant === 'optimistic' ? 'bg-green-600' : variant === 'mostLikely' ? 'bg-primary' : 'bg-red-600';
  const impacts = [
    { icon: Wrench,       label: 'Operational', text: scenario.operationalImpact },
    { icon: BarChart3,    label: 'Financial',   text: scenario.financialImpact },
    { icon: Shield,       label: 'Compliance',  text: scenario.complianceImpact },
    { icon: UserCheck,    label: 'Service',     text: scenario.serviceImpact },
    { icon: Database,     label: 'Continuity',  text: scenario.continuityImpact },
  ];
  return (
    <Card className={cn('border', borderCls)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScoreRing score={scenario.score} health={health} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{scenario.label} Scenario</CardTitle>
                <span className={cn('text-[10px] font-medium text-white px-2 py-0.5 rounded-full', tagCls)}>{cfg.label}</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-0.5">"{scenario.condition}"</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {impacts.map(({ icon: Icon, label, text }) => (
            <div key={label} className="flex gap-2.5 text-xs">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">{label}: </span>
                <span className="text-muted-foreground">{text}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ContinuityIntelligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const token = localStorage.getItem('nexum_access_token') || '';

  const [record, setRecord] = useState<ContinuityRecord>(EMPTY_RECORD(facilityId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Employee form state
  const [empForm, setEmpForm] = useState<Omit<EmployeeContinuityRecord, 'employeeId'>>({
    name: '', role: '', department: '',
    knowledgeContribution: 50, documentationScore: 50,
    trainingScore: 50, reliabilityScore: 50, crossFunctionalScore: 50,
  });
  const [addingEmp, setAddingEmp] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/continuity?facilityId=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) { setRecord(data); setLoading(false); return; }
      }
    } catch { /* fall through */ }
    const cached = localStorage.getItem(CACHE_KEY(facilityId));
    if (cached) setRecord(JSON.parse(cached));
    setLoading(false);
  }, [facilityId]);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    const payload = { ...record, facilityId, updatedAt: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE}/continuity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Continuity scores saved' });
    } catch {
      toast({ title: 'Saved locally', description: 'API unreachable — stored locally.' });
    }
    localStorage.setItem(CACHE_KEY(facilityId), JSON.stringify(payload));
    setSaved(true); setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  // ── Setters ───────────────────────────────────────────────────────────────
  const setComponent = (component: keyof ContinuityRecord['globalInputs'], field: string, value: number) => {
    setRecord(prev => ({
      ...prev,
      globalInputs: {
        ...prev.globalInputs,
        [component]: { ...prev.globalInputs[component], [field]: value },
      },
    }));
  };

  const setSectorFactor = (key: string, value: number) => {
    setRecord(prev => ({ ...prev, sectorFactors: { ...prev.sectorFactors, [key]: value } }));
  };

  const setSector = (s: SectorType) => {
    setRecord(prev => ({ ...prev, sector: s, sectorFactors: {} }));
  };

  const addEmployee = () => {
    if (!empForm.name.trim()) return;
    const emp: EmployeeContinuityRecord = { ...empForm, employeeId: `emp-${Date.now()}` };
    setRecord(prev => ({ ...prev, employees: [...prev.employees, emp] }));
    setEmpForm({ name: '', role: '', department: '', knowledgeContribution: 50, documentationScore: 50, trainingScore: 50, reliabilityScore: 50, crossFunctionalScore: 50 });
    setAddingEmp(false);
  };

  const removeEmployee = (id: string) => {
    setRecord(prev => ({ ...prev, employees: prev.employees.filter(e => e.employeeId !== id) }));
  };

  // ── Calculations ──────────────────────────────────────────────────────────
  const result = useMemo(() => calcFullScore(record), [record]);
  const empResults = useMemo(() => record.employees.map(e => calcEmployeeScore(e)), [record.employees]);
  const sectorDefs = SECTOR_FACTORS[record.sector];

  const globalHealthCfg = HEALTH_CONFIG[result.health];
  const sectorHealthCfg = HEALTH_CONFIG[result.sectorHealth];
  const GlobalHealthIcon = globalHealthCfg.icon;

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">Loading Continuity Intelligence…</span>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Continuity Intelligence™</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Measuring organizational resilience against disruption, knowledge loss, and operational breakdown
              </p>
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {saved ? 'Saved ✓' : 'Save Scores'}
            </Button>
          </div>

          {/* ── Global Score Banner ── */}
          <div className={cn('rounded-xl border p-5', globalHealthCfg.bg, globalHealthCfg.border)}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={result.globalScore} health={result.health} size="lg" />
                <Badge className={cn('text-white text-xs mt-1', result.health === 'Strong' ? 'bg-green-600' : result.health === 'Moderate' ? 'bg-yellow-600' : result.health === 'At Risk' ? 'bg-orange-600' : 'bg-red-600')}>
                  {result.health}
                </Badge>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <GlobalHealthIcon className={cn('w-5 h-5', globalHealthCfg.color)} />
                  <h2 className="text-lg font-bold">Organizational Continuity Score</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{globalHealthCfg.desc}</p>

                {/* 5 component mini-bars */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {COMPONENT_META.map(meta => {
                    const s = result.components[meta.key];
                    const h = getHealth(s);
                    const c = HEALTH_CONFIG[h];
                    const Icon = meta.key === 'knowledge' ? BookOpen : meta.key === 'workforce' ? Users : meta.key === 'operational' ? Wrench : meta.key === 'decision' ? Brain : Database;
                    return (
                      <div key={meta.key} className="text-center">
                        <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', s > 0 ? c.color : 'text-muted-foreground/40')} />
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                          <div className={cn('h-full rounded-full transition-all', s > 0 ? c.barColor : 'bg-muted-foreground/20')} style={{ width: `${s}%` }} />
                        </div>
                        <p className={cn('text-[10px] font-mono font-bold', s > 0 ? c.color : 'text-muted-foreground/40')}>{s > 0 ? s : '—'}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{meta.label.split(' ')[0]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sector score */}
              {sectorDefs.length > 0 && (
                <div className={cn('rounded-lg border p-3 text-center min-w-[130px]', sectorHealthCfg.bg, sectorHealthCfg.border)}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">{SECTOR_OUTPUT_LABEL[record.sector]}</p>
                  <ScoreRing score={result.sectorScore} health={result.sectorHealth} size="sm" />
                  <Badge className={cn('text-white text-[10px] mt-1.5', result.sectorHealth === 'Strong' ? 'bg-green-600' : result.sectorHealth === 'Moderate' ? 'bg-yellow-600' : result.sectorHealth === 'At Risk' ? 'bg-orange-600' : 'bg-red-600')}>
                    {result.sectorHealth}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="score" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl">
              <TabsTrigger value="score"    className="text-xs flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" />Score</TabsTrigger>
              <TabsTrigger value="sector"   className="text-xs flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />Sector</TabsTrigger>
              <TabsTrigger value="workforce"className="text-xs flex items-center gap-1"><Users className="w-3.5 h-3.5" />Workforce</TabsTrigger>
              <TabsTrigger value="forecast" className="text-xs flex items-center gap-1"><Zap className="w-3.5 h-3.5" />AI Forecast</TabsTrigger>
              <TabsTrigger value="risk"     className="text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Risk Intel</TabsTrigger>
            </TabsList>

            {/* ── SCORE TAB ── */}
            <TabsContent value="score" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rate each sub-measure 0–100. Zero values are excluded from averages — only enter scores for measures you have data for.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {COMPONENT_META.map(meta => (
                  <ComponentCard
                    key={meta.key}
                    meta={meta}
                    values={record.globalInputs[meta.key] as Record<string, number>}
                    onChange={(field, v) => setComponent(meta.key, field, v)}
                    score={result.components[meta.key]}
                  />
                ))}

                {/* Score Summary */}
                <Card className="border-primary/20 bg-primary/5 lg:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Score Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {COMPONENT_META.map(meta => {
                      const s = result.components[meta.key];
                      const h = getHealth(s);
                      const c = HEALTH_CONFIG[h];
                      return (
                        <div key={meta.key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{meta.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn('font-mono font-bold', s > 0 ? c.color : 'text-muted-foreground')}>{s > 0 ? s : '—'}</span>
                              {s > 0 && <Badge variant="outline" className={cn('text-[10px] px-1 py-0', c.color)}>{c.label}</Badge>}
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-500', s > 0 ? c.barColor : '')} style={{ width: `${s}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Global Score</span>
                      <span className={cn('text-xl font-bold font-mono', globalHealthCfg.color)}>
                        {result.globalScore > 0 ? result.globalScore : '—'}
                        <span className="text-xs text-muted-foreground"> / 100</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── SECTOR TAB ── */}
            <TabsContent value="sector" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Organization Sector</Label>
                  <Select value={record.sector} onValueChange={(v) => setSector(v as SectorType)}>
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SECTOR_LABELS) as [SectorType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {result.sectorScore > 0 && (
                  <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-2', sectorHealthCfg.bg, sectorHealthCfg.border)}>
                    <ScoreRing score={result.sectorScore} health={result.sectorHealth} size="sm" />
                    <div>
                      <p className="text-xs text-muted-foreground">{SECTOR_OUTPUT_LABEL[record.sector]}</p>
                      <p className={cn('text-sm font-bold', sectorHealthCfg.color)}>{sectorHealthCfg.label}</p>
                    </div>
                  </div>
                )}
              </div>

              {sectorDefs.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm">Facility sector uses the Global Continuity Score without additional factors.</p>
                    <p className="text-xs mt-1">Select a different sector to unlock sector-specific scoring factors.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Founder Dependency Warning — Entrepreneurship */}
                  {record.sector === 'entrepreneurship' && (record.sectorFactors['founderIndependence'] ?? 0) < 40 && (
                    <div className="rounded-xl border border-red-600/40 bg-red-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-400 text-sm">⚠ Founder Dependency Risk — Critical</p>
                          <p className="text-xs text-muted-foreground mt-1">If the founder becomes unavailable tomorrow, answer honestly:</p>
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                            <li>Can <strong>operations</strong> continue without the founder?</li>
                            <li>Can <strong>sales</strong> continue without the founder?</li>
                            <li>Can <strong>customer service</strong> continue without the founder?</li>
                            <li>Can <strong>finances</strong> continue without the founder?</li>
                          </ul>
                          <p className="text-xs text-red-300 mt-2 font-medium">Raise Founder Independence score by documenting processes and delegating authority.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{SECTOR_LABELS[record.sector]} — Additional Continuity Factors</CardTitle>
                      <CardDescription className="text-xs">
                        These sector-specific factors (40% weight) combine with your global score (60%) to produce the {SECTOR_OUTPUT_LABEL[record.sector]}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {sectorDefs.map(f => (
                        <SliderField
                          key={f.key}
                          label={f.label}
                          description={f.description}
                          value={record.sectorFactors[f.key] ?? 0}
                          onChange={v => setSectorFactor(f.key, v)}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Global Score (60%)</p>
                          <p className={cn('text-lg font-bold font-mono', globalHealthCfg.color)}>{result.globalScore}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sector Factors Avg (40%)</p>
                          <p className="text-lg font-bold font-mono text-foreground">
                            {sectorDefs.length > 0
                              ? Math.round(sectorDefs.reduce((s, d) => s + (record.sectorFactors[d.key] || 0), 0) / sectorDefs.length)
                              : '—'}
                          </p>
                        </div>
                        <div className="col-span-2 border-t border-border/30 pt-3">
                          <p className="text-xs text-muted-foreground">{SECTOR_OUTPUT_LABEL[record.sector]}</p>
                          <p className={cn('text-2xl font-bold font-mono', sectorHealthCfg.color)}>{result.sectorScore}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── WORKFORCE TAB ── */}
            <TabsContent value="workforce" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Employee Continuity Scores</h3>
                  <p className="text-xs text-muted-foreground">Individual resilience and knowledge contribution scores for each team member</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddingEmp(true)}>
                  <Plus className="w-4 h-4 mr-1" />Add Employee
                </Button>
              </div>

              {/* Add Employee Form */}
              {addingEmp && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">New Employee Continuity Record</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Name *</Label>
                        <Input className="mt-1 h-8 text-sm" value={empForm.name} onChange={e => setEmpForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Input className="mt-1 h-8 text-sm" value={empForm.role} onChange={e => setEmpForm(p => ({ ...p, role: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Department</Label>
                        <Input className="mt-1 h-8 text-sm" value={empForm.department} onChange={e => setEmpForm(p => ({ ...p, department: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { key: 'knowledgeContribution' as const, label: 'Knowledge Contribution', desc: 'How much organizational knowledge this person contributes and retains' },
                        { key: 'documentationScore'    as const, label: 'Documentation Score',    desc: 'Consistency of documenting work, decisions, and processes' },
                        { key: 'trainingScore'         as const, label: 'Training Score',          desc: 'Training and certification status and currency' },
                        { key: 'reliabilityScore'      as const, label: 'Reliability Score',       desc: 'Attendance, work completion rate, and responsiveness' },
                        { key: 'crossFunctionalScore'  as const, label: 'Cross-Functional Score',  desc: 'Ability to support multiple operational areas' },
                      ].map(f => (
                        <SliderField
                          key={f.key}
                          label={f.label}
                          description={f.desc}
                          value={empForm[f.key]}
                          onChange={v => setEmpForm(p => ({ ...p, [f.key]: v }))}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={addEmployee} disabled={!empForm.name.trim()}>Add to Team</Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingEmp(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employee list */}
              {empResults.length === 0 && !addingEmp ? (
                <Card className="border-border/40">
                  <CardContent className="py-10 text-center">
                    <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No employees added yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add team members to see individual continuity scores and identify knowledge loss risks</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {empResults.map(emp => {
                    const cfg = HEALTH_CONFIG[emp.health];
                    return (
                      <Card key={emp.employeeId} className={cn('border', cfg.border)}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-0.5 w-12">
                              <span className={cn('text-xl font-bold font-mono', cfg.color)}>{emp.overallScore}</span>
                              <Badge variant="outline" className={cn('text-[9px] px-1', cfg.color)}>{cfg.label}</Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold truncate">{emp.name}</p>
                                {emp.role && <Badge variant="outline" className="text-xs">{emp.role}</Badge>}
                                {emp.department && <Badge variant="outline" className="text-xs">{emp.department}</Badge>}
                              </div>
                              <div className="grid grid-cols-5 gap-1 mt-2">
                                {[
                                  { label: 'Knowledge', val: emp.knowledgeContribution },
                                  { label: 'Docs',      val: emp.documentationScore },
                                  { label: 'Training',  val: emp.trainingScore },
                                  { label: 'Reliability',val: emp.reliabilityScore },
                                  { label: 'X-Functional',val: emp.crossFunctionalScore },
                                ].map(({ label, val }) => {
                                  const h = getHealth(val);
                                  const c = HEALTH_CONFIG[h];
                                  return (
                                    <div key={label} className="text-center">
                                      <div className="h-1 bg-muted rounded-full overflow-hidden mb-0.5">
                                        <div className={cn('h-full rounded-full', c.barColor)} style={{ width: `${val}%` }} />
                                      </div>
                                      <p className="text-[9px] text-muted-foreground">{label}</p>
                                      <p className={cn('text-[10px] font-mono font-bold', c.color)}>{val}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <button onClick={() => removeEmployee(emp.employeeId)} className="text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Workforce aggregate */}
                  {empResults.length > 1 && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Team Avg Continuity Score</span>
                          <span className={cn('text-lg font-bold font-mono', globalHealthCfg.color)}>
                            {Math.round(empResults.reduce((s, e) => s + e.overallScore, 0) / empResults.length)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-center">
                          {(['Strong', 'Moderate', 'At Risk'] as ContinuityHealth[]).map(h => {
                            const count = empResults.filter(e => e.health === h).length;
                            const c = HEALTH_CONFIG[h];
                            return (
                              <div key={h} className={cn('rounded p-1.5', c.bg)}>
                                <p className={cn('font-bold text-base', c.color)}>{count}</p>
                                <p className="text-muted-foreground">{h}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── AI FORECAST TAB ── */}
            <TabsContent value="forecast" className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary">AI Continuity Forecast Engine</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Three scenarios generated from your current score ({result.globalScore}/100). Each scenario projects operational, financial,
                      compliance, service, and continuity impact.
                    </p>
                  </div>
                </div>
              </div>

              {result.globalScore === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="py-10 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Enter scores in the Score tab to generate AI forecasts</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Scenario comparison strip */}
                  <div className="grid grid-cols-3 gap-3">
                    {([result.forecast.optimistic, result.forecast.mostLikely, result.forecast.pessimistic] as const).map((s, i) => {
                      const variant = i === 0 ? 'optimistic' : i === 1 ? 'mostLikely' : 'pessimistic';
                      const h = getHealth(s.score);
                      const c = HEALTH_CONFIG[h];
                      return (
                        <div key={s.label} className={cn('rounded-lg border p-3 text-center', c.bg, c.border)}>
                          <p className="text-xs text-muted-foreground mb-1.5">{s.label}</p>
                          <p className={cn('text-2xl font-bold font-mono', c.color)}>{s.score}</p>
                          <Badge className={cn('text-white text-[10px] mt-1', h === 'Strong' ? 'bg-green-600' : h === 'Moderate' ? 'bg-yellow-600' : h === 'At Risk' ? 'bg-orange-600' : 'bg-red-600')}>{c.label}</Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <ForecastCard scenario={result.forecast.optimistic}  variant="optimistic" />
                    <ForecastCard scenario={result.forecast.mostLikely}  variant="mostLikely" />
                    <ForecastCard scenario={result.forecast.pessimistic} variant="pessimistic" />
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── RISK INTELLIGENCE TAB ── */}
            <TabsContent value="risk" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Top Risks */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      Top Continuity Risks
                    </CardTitle>
                    <CardDescription className="text-xs">Lowest-scoring areas creating the greatest organizational vulnerability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.topRisks.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-400 py-4">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm">No critical risks identified — all scores above threshold</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {result.topRisks.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/20 border border-red-600/20">
                            <span className="text-xs font-bold text-red-400 font-mono w-4 shrink-0">{i + 1}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{risk}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Knowledge Loss Risks */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-yellow-400" />
                      Knowledge Loss Intelligence
                    </CardTitle>
                    <CardDescription className="text-xs">Areas where undocumented knowledge creates departure risk</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: 'SOP Documentation Gap',    score: record.globalInputs.knowledge.sopCompleteness,      risk: 'Undocumented SOPs will cause operational confusion during transitions' },
                        { label: 'Procedure Coverage Risk',  score: record.globalInputs.knowledge.procedureCoverage,    risk: 'Missing written procedures create single-person dependency' },
                        { label: 'Cross-Training Coverage',  score: record.globalInputs.workforce.crossTraining,        risk: 'Single-skilled roles create critical vulnerability to departures' },
                        { label: 'Succession Readiness',     score: record.globalInputs.workforce.successionReadiness,  risk: 'No identified successors for key leadership roles' },
                        { label: 'Historical Data Retention',score: record.globalInputs.data.historicalTrendRetention,  risk: 'Inability to maintain trend analysis after personnel changes' },
                      ].map(({ label, score, risk }) => {
                        const h = getHealth(score || 0);
                        const c = HEALTH_CONFIG[h];
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : score > 0 ? '#ef4444' : '#6b7280' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{label}</span>
                                <span className={cn('font-mono font-bold', score > 0 ? c.color : 'text-muted-foreground')}>{score > 0 ? score : '—'}</span>
                              </div>
                              {score > 0 && score < 70 && <p className="text-[10px] text-muted-foreground mt-0.5">{risk}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Employee Risk Cards */}
                {empResults.length > 0 && (
                  <>
                    {/* Turnover Risk */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          Turnover Risk — Key Personnel
                        </CardTitle>
                        <CardDescription className="text-xs">Employees with low continuity scores present the highest departure risk</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {empResults.filter(e => e.overallScore < 60).length === 0 ? (
                          <p className="text-sm text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />No high-turnover-risk employees identified</p>
                        ) : (
                          <div className="space-y-2">
                            {empResults.filter(e => e.overallScore < 60).sort((a, b) => a.overallScore - b.overallScore).map(e => {
                              const c = HEALTH_CONFIG[e.health];
                              return (
                                <div key={e.employeeId} className={cn('flex items-center justify-between p-2 rounded-lg border', c.bg, c.border)}>
                                  <div>
                                    <p className="text-xs font-semibold">{e.name}</p>
                                    {e.role && <p className="text-[10px] text-muted-foreground">{e.role}</p>}
                                  </div>
                                  <span className={cn('text-sm font-bold font-mono', c.color)}>{e.overallScore}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Decision Bottlenecks */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          Decision Bottleneck Intelligence
                        </CardTitle>
                        <CardDescription className="text-xs">Leadership and decision continuity vulnerabilities</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { label: 'Leadership Engagement',     score: record.globalInputs.decision.leadershipEngagement,     action: 'Increase leadership participation in operational reviews' },
                          { label: 'Risk Review Frequency',     score: record.globalInputs.decision.riskReviews,              action: 'Establish regular risk review cadence' },
                          { label: 'Escalation Resolution Rate',score: record.globalInputs.decision.escalationResolution,     action: 'Define and enforce escalation resolution SLAs' },
                          { label: 'Corrective Action Closure', score: record.globalInputs.decision.correctiveActionClosure,  action: 'Implement corrective action tracking and accountability' },
                        ].map(({ label, score, action }) => {
                          const h = getHealth(score || 0);
                          const c = HEALTH_CONFIG[h];
                          return (
                            <div key={label}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium">{label}</span>
                                <span className={cn('font-mono font-bold', score > 0 ? c.color : 'text-muted-foreground')}>{score > 0 ? score : '—'}</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                                <div className={cn('h-full rounded-full transition-all', score > 0 ? c.barColor : '')} style={{ width: `${score}%` }} />
                              </div>
                              {score > 0 && score < 70 && <p className="text-[10px] text-muted-foreground">{action}</p>}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Executive Summary */}
                <Card className={cn('lg:col-span-2 border-primary/20 bg-primary/5')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Continuity Intelligence™ — Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {[
                        { label: 'Global Continuity Score', val: result.globalScore > 0 ? `${result.globalScore}/100` : '—', cls: globalHealthCfg.color },
                        { label: SECTOR_OUTPUT_LABEL[record.sector], val: result.sectorScore > 0 ? `${result.sectorScore}/100` : '—', cls: sectorHealthCfg.color },
                        { label: 'Optimistic Forecast',    val: result.globalScore > 0 ? `${result.forecast.optimistic.score}/100` : '—', cls: 'text-green-400' },
                        { label: 'Pessimistic Forecast',   val: result.globalScore > 0 ? `${result.forecast.pessimistic.score}/100` : '—', cls: 'text-red-400' },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className="p-3 rounded-lg border border-border/50 bg-background/50">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className={cn('text-xl font-bold font-mono mt-0.5', cls)}>{val}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Facility Intelligence measures <em>how</em> operations perform. Continuity Intelligence™ measures whether operations
                      <em> can continue performing</em> — through disruption, turnover, knowledge loss, leadership changes, and decision breakdowns.
                      This score is the single most important measure of long-term organizational resilience.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
