import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Target, Plus, Save, Trash2, RefreshCw, Info, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, XCircle, DollarSign, BarChart3,
  FileText, Pencil, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProjectHealth = 'green' | 'yellow' | 'red';

export interface ProjectData {
  projectId: string;
  projectName: string;
  facilityId: string;
  workOrderId?: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  startDate?: string;
  plannedEndDate?: string;
  notes?: string;
  updatedAt?: string;
  createdAt?: string;
}

const EMPTY: Omit<ProjectData, 'projectId' | 'facilityId'> = {
  projectName: 'New Project', bac: 0, pv: 0, ev: 0, ac: 0,
  startDate: '', plannedEndDate: '', notes: '',
};

// ── EVM engine ─────────────────────────────────────────────────────────────────
export function calcEVM(bac: number, pv: number, ev: number, ac: number) {
  const sv   = ev - pv;
  const cv   = ev - ac;
  const spi  = pv > 0 ? ev / pv  : 0;
  const cpi  = ac > 0 ? ev / ac  : 0;

  // ── Three standard PMBOK EAC methods ──────────────────────────────────────
  // EAC₁ (CPI method): assumes current cost efficiency continues for all remaining work
  const eacCpi       = cpi > 0 ? bac / cpi : bac;
  // EAC₂ (Budget rate): assumes remaining work is performed at the originally planned rate
  const eacBudget    = ac + (bac - ev);
  // EAC₃ (Composite): accounts for both cost and schedule efficiency on remaining work
  const eacComposite = (cpi * spi) > 0 ? ac + (bac - ev) / (cpi * spi) : bac;

  // Primary EAC used for downstream calcs (CPI method — most statistically reliable)
  const eac = eacCpi;
  const etc = eac - ac;
  const vac = bac - eac;

  // TCPI: cost efficiency required on remaining work to finish within BAC
  const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 0;
  // PCIB: Percent Complete Index Budget — fraction of total budget earned (EV / BAC)
  const pcib = bac > 0 ? ev / bac : 0;
  // PCIC: Percent Complete Index Cost — fraction of estimated total cost spent (AC / EAC)
  const pcic = eac > 0 ? ac / eac : 0;
  // Legacy percentage aliases used by progress bars (0–100 scale)
  const ppc  = bac > 0 ? (pv / bac) * 100 : 0;
  const apc  = pcib * 100;
  let health: ProjectHealth = 'red';
  if (spi >= 0.95 && cpi >= 0.95) health = 'green';
  else if (spi >= 0.80 && cpi >= 0.80) health = 'yellow';
  return { sv, cv, spi, cpi, eac, eacCpi, eacBudget, eacComposite, etc, vac, tcpi, pcib, pcic, ppc, apc, health };
}

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtIdx = (n: number) => n.toFixed(3);

// ── Sub-components ─────────────────────────────────────────────────────────────

function TipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <Label className="text-sm font-semibold">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function CurrencyField({
  label, tip, question, value, onChange, error,
}: {
  label: string; tip: string; question: string;
  value: number; onChange: (n: number) => void; error?: string;
}) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(value > 0 ? String(value) : '');
  }, [value, focused]);

  return (
    <div className="space-y-1.5">
      <TipLabel label={label} tip={tip} />
      <p className="text-xs text-muted-foreground italic">"{question}"</p>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className={cn('pl-8 font-mono', error && 'border-red-500')}
          type="number" min="0" step="100" placeholder="0"
          value={focused ? raw : value > 0 ? value : ''}
          onFocus={() => { setFocused(true); setRaw(value > 0 ? String(value) : ''); }}
          onBlur={() => {
            setFocused(false);
            const n = parseFloat(raw);
            onChange(!isNaN(n) && n >= 0 ? n : 0);
          }}
          onChange={e => setRaw(e.target.value)}
        />
      </div>
      {value > 0 && <p className="text-xs text-primary/70 font-mono">{fmt$(value)}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function IndexGauge({ label, value, ideal }: { label: string; value: number; ideal: string }) {
  const pct = Math.min(value * 100, 150);
  const clr = value >= 0.95 ? 'text-green-400' : value >= 0.80 ? 'text-yellow-400' : 'text-red-400';
  const bar = value >= 0.95 ? 'bg-green-500' : value >= 0.80 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('text-xl font-bold font-mono', clr)}>{fmtIdx(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{ideal}</p>
    </div>
  );
}

function VarianceRow({ label, value, positiveLabel, negativeLabel }: {
  label: string; value: number; positiveLabel: string; negativeLabel: string;
}) {
  const pos = value > 0; const zero = value === 0;
  const clr = pos ? 'text-green-400' : zero ? 'text-muted-foreground' : 'text-red-400';
  const Icon = pos ? TrendingUp : zero ? Minus : TrendingDown;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-base font-bold font-mono mt-0.5', clr)}>{fmt$(value)}</p>
      </div>
      <div className={cn('flex flex-col items-end gap-0.5', clr)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{pos ? positiveLabel : zero ? 'On Track' : negativeLabel}</span>
      </div>
    </div>
  );
}

function HealthBanner({ health, spi, cpi }: { health: ProjectHealth; spi: number; cpi: number }) {
  const cfg = {
    green: {
      wrap: 'bg-green-950/50 border-green-600/40',
      badge: 'bg-green-600',
      Icon: CheckCircle2,
      iconCls: 'text-green-400',
      title: 'Project On Track',
      desc: 'Both schedule and cost performance are within acceptable thresholds.',
    },
    yellow: {
      wrap: 'bg-yellow-950/40 border-yellow-600/40',
      badge: 'bg-yellow-600',
      Icon: AlertTriangle,
      iconCls: 'text-yellow-400',
      title: 'Monitoring Required',
      desc: 'Schedule or cost performance is showing early warning signs. Review and take corrective action.',
    },
    red: {
      wrap: 'bg-red-950/40 border-red-600/40',
      badge: 'bg-red-600',
      Icon: XCircle,
      iconCls: 'text-red-400',
      title: 'Project At Risk',
      desc: 'Critical deviation in schedule or cost. Immediate corrective action required.',
    },
  }[health];
  const { Icon } = cfg;
  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-xl border', cfg.wrap)}>
      <Icon className={cn('w-5 h-5 shrink-0', cfg.iconCls)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{cfg.title}</span>
          <Badge className={cn('text-white text-xs px-2', cfg.badge)}>{health.toUpperCase()}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
      </div>
      <div className="hidden sm:flex gap-4 shrink-0 text-xs text-muted-foreground">
        <div>
          SPI&nbsp;
          <span className={cn('font-bold', spi >= 0.95 ? 'text-green-400' : spi >= 0.80 ? 'text-yellow-400' : 'text-red-400')}>{fmtIdx(spi)}</span>
        </div>
        <div>
          CPI&nbsp;
          <span className={cn('font-bold', cpi >= 0.95 ? 'text-green-400' : cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400')}>{fmtIdx(cpi)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProjectControls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const token = localStorage.getItem('nexum_access_token') || '';

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/project-controls?facilityId=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ProjectData[] = await res.json();
        setProjects(data);
        const wantId = searchParams.get('projectId') || localStorage.getItem('nexum_active_project_id');
        const target = data.find(p => p.projectId === wantId) || data[0];
        if (target) { setActiveId(target.projectId); applyForm(target); }
        else startNew(false);
      } else throw new Error('API error');
    } catch {
      const cached = localStorage.getItem(`nexum_pc_${facilityId}`);
      if (cached) {
        const data: ProjectData[] = JSON.parse(cached);
        setProjects(data);
        if (data[0]) { setActiveId(data[0].projectId); applyForm(data[0]); }
        else startNew(false);
      } else startNew(false);
    } finally { setLoading(false); }
  }, [facilityId]);

  useEffect(() => { load(); }, [load]);

  function applyForm(p: ProjectData) {
    setForm({
      projectName: p.projectName, bac: p.bac, pv: p.pv, ev: p.ev, ac: p.ac,
      startDate: p.startDate || '', plannedEndDate: p.plannedEndDate || '',
      notes: p.notes || '', workOrderId: p.workOrderId,
    });
  }

  useEffect(() => {
    const p = projects.find(p => p.projectId === activeId);
    if (p) { applyForm(p); setSaved(false); }
  }, [activeId]);

  function startNew(commit = true) {
    const id = `proj-${Date.now()}`;
    const p: ProjectData = { projectId: id, facilityId, ...EMPTY };
    if (commit) { setProjects(prev => [...prev, p]); setActiveId(id); setForm({ ...EMPTY }); }
  }

  async function deleteProject() {
    if (!activeId || projects.length <= 1) return;
    try {
      await fetch(`${API_BASE}/project-controls/${activeId}?facilityId=${facilityId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* best effort */ }
    const rest = projects.filter(p => p.projectId !== activeId);
    setProjects(rest);
    setActiveId(rest[0]?.projectId || '');
    toast({ title: 'Project deleted' });
  }

  async function save() {
    setSaving(true);
    const payload: ProjectData = { ...form, projectId: activeId, facilityId, updatedAt: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE}/project-controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const updated = projects.map(p => p.projectId === activeId ? { ...payload } : p);
      setProjects(updated);
      localStorage.setItem(`nexum_pc_${facilityId}`, JSON.stringify(updated));
      localStorage.setItem('nexum_active_project_id', activeId);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast({ title: 'Project saved', description: form.projectName });
    } catch {
      const updated = projects.map(p => p.projectId === activeId ? { ...payload } : p);
      setProjects(updated);
      localStorage.setItem(`nexum_pc_${facilityId}`, JSON.stringify(updated));
      localStorage.setItem('nexum_active_project_id', activeId);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast({ title: 'Saved locally', description: 'API unreachable — stored in localStorage.' });
    } finally { setSaving(false); }
  }

  const set = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  // ── EVM calcs ─────────────────────────────────────────────────────────────
  const evm = useMemo(() => calcEVM(form.bac, form.pv, form.ev, form.ac), [form.bac, form.pv, form.ev, form.ac]);

  // ── Validation ────────────────────────────────────────────────────────────
  const errors: Record<string, string> = {};
  if (form.bac <= 0) errors.bac = 'BAC must be greater than $0';
  if (form.pv > form.bac && form.bac > 0) errors.pv = 'PV cannot exceed BAC';
  if (form.ev > form.bac && form.bac > 0) errors.ev = 'EV cannot exceed BAC';

  // ── Summary table rows ────────────────────────────────────────────────────
  type SummaryRow = { metric: string; question: string; value: string; color?: string; badge?: string; badgeCls?: string };
  const summaryRows: SummaryRow[] = [
    { metric: 'BAC',    question: 'What is the total approved budget for this project?',            value: fmt$(form.bac) },
    { metric: 'PV',     question: 'What should have been completed by now per the schedule?',       value: fmt$(form.pv) },
    { metric: 'EV',     question: 'What amount of work has actually been accomplished?',            value: fmt$(form.ev) },
    { metric: 'AC',     question: 'What has actually been spent to date?',                          value: fmt$(form.ac) },
    { metric: 'SV',     question: 'Are we ahead or behind schedule? (EV − PV)',                    value: fmt$(evm.sv),  color: evm.sv >= 0 ? 'text-green-400' : 'text-red-400', badge: evm.sv >= 0 ? 'Ahead' : 'Behind', badgeCls: evm.sv >= 0 ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400' },
    { metric: 'CV',     question: 'Are we under or over budget? (EV − AC)',                        value: fmt$(evm.cv),  color: evm.cv >= 0 ? 'text-green-400' : 'text-red-400', badge: evm.cv >= 0 ? 'Under Budget' : 'Over Budget', badgeCls: evm.cv >= 0 ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400' },
    { metric: 'SPI',    question: 'How efficiently are we progressing against the schedule? (EV / PV)', value: fmtIdx(evm.spi), color: evm.spi >= 0.95 ? 'text-green-400' : evm.spi >= 0.80 ? 'text-yellow-400' : 'text-red-400', badge: evm.spi >= 0.95 ? 'On Track' : evm.spi >= 0.80 ? 'Watch' : 'At Risk', badgeCls: evm.spi >= 0.95 ? 'border-green-500/40 text-green-400' : evm.spi >= 0.80 ? 'border-yellow-500/40 text-yellow-400' : 'border-red-500/40 text-red-400' },
    { metric: 'CPI',    question: 'How efficiently is the project spending money? (EV / AC)',       value: fmtIdx(evm.cpi), color: evm.cpi >= 0.95 ? 'text-green-400' : evm.cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400', badge: evm.cpi >= 0.95 ? 'Efficient' : evm.cpi >= 0.80 ? 'Watch' : 'Over Cost', badgeCls: evm.cpi >= 0.95 ? 'border-green-500/40 text-green-400' : evm.cpi >= 0.80 ? 'border-yellow-500/40 text-yellow-400' : 'border-red-500/40 text-red-400' },
    { metric: 'EAC₁',   question: 'Estimate At Completion — CPI method, assumes current efficiency continues (BAC / CPI) [Primary]', value: fmt$(evm.eacCpi),       color: evm.eacCpi <= form.bac ? 'text-green-400' : 'text-red-400' },
    { metric: 'EAC₂',   question: 'Estimate At Completion — budget rate, remaining work at planned rate (AC + BAC − EV) [Optimistic]', value: fmt$(evm.eacBudget),    color: evm.eacBudget <= form.bac ? 'text-green-400' : 'text-red-400' },
    { metric: 'EAC₃',   question: 'Estimate At Completion — composite method, both CPI and SPI applied (AC + (BAC−EV)/(CPI×SPI)) [Conservative]', value: fmt$(evm.eacComposite), color: evm.eacComposite <= form.bac ? 'text-green-400' : 'text-red-400' },
    { metric: 'ETC',    question: 'Estimate To Complete — remaining cost to finish all work at current CPI (EAC₁ − AC)',  value: fmt$(evm.etc) },
    { metric: 'VAC',    question: 'Variance At Completion — projected over/under budget at completion (BAC − EAC₁)',       value: fmt$(evm.vac), color: evm.vac >= 0 ? 'text-green-400' : 'text-red-400', badge: evm.vac >= 0 ? 'Under Budget' : 'Over Budget', badgeCls: evm.vac >= 0 ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400' },
    { metric: 'TCPI',   question: 'Cost efficiency needed on all remaining work to finish within BAC — (BAC−EV)/(BAC−AC)', value: fmtIdx(evm.tcpi), color: evm.tcpi <= 1.0 ? 'text-green-400' : evm.tcpi <= 1.1 ? 'text-yellow-400' : 'text-red-400', badge: evm.tcpi <= 1.0 ? 'Achievable' : evm.tcpi <= 1.1 ? 'Challenging' : 'High Risk', badgeCls: evm.tcpi <= 1.0 ? 'border-green-500/40 text-green-400' : evm.tcpi <= 1.1 ? 'border-yellow-500/40 text-yellow-400' : 'border-red-500/40 text-red-400' },
    { metric: 'PCIB',   question: 'Percent Complete Index Budget — what fraction of total budget has been earned (EV / BAC)', value: fmtPct(evm.pcib * 100), color: 'text-foreground', badge: evm.pcib >= evm.pcic ? 'On/Under Budget' : 'Behind Budget', badgeCls: evm.pcib >= evm.pcic ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400' },
    { metric: 'PCIC',   question: 'Percent Complete Index Cost — what fraction of estimated final cost has been spent (AC / EAC)', value: fmtPct(evm.pcic * 100), color: 'text-foreground', badge: evm.pcic <= evm.pcib ? 'Spending In Control' : 'Spending Ahead', badgeCls: evm.pcic <= evm.pcib ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400' },
    { metric: 'Status', question: 'Overall project health classification',                          value: evm.health.toUpperCase(), color: evm.health === 'green' ? 'text-green-400' : evm.health === 'yellow' ? 'text-yellow-400' : 'text-red-400' },
  ];

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mr-2" />
        <span className="text-muted-foreground">Loading Project Controls…</span>
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
                <Target className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Project Controls</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Earned Value Management — Budget &amp; Schedule Performance
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={activeId} onValueChange={id => { setActiveId(id); localStorage.setItem('nexum_active_project_id', id); }}>
                <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.projectId} value={p.projectId}>{p.projectName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => startNew()}>
                <Plus className="w-4 h-4 mr-1" />New
              </Button>
              {projects.length > 1 && (
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={deleteProject}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={saving || Object.keys(errors).length > 0}>
                {saving
                  ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  : <Save className="w-4 h-4 mr-1" />}
                {saved ? 'Saved ✓' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Project name + dates */}
          <div className="flex flex-wrap items-center gap-3">
            {editingName ? (
              <Input
                autoFocus className="max-w-xs h-8 text-base font-semibold"
                value={form.projectName}
                onChange={e => set('projectName', e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold">{form.projectName}</h2>
                <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {form.startDate && <Badge variant="outline" className="text-xs">Start: {form.startDate}</Badge>}
            {form.plannedEndDate && <Badge variant="outline" className="text-xs">End: {form.plannedEndDate}</Badge>}
          </div>

          {/* ── Health Banner ── */}
          <HealthBanner health={evm.health} spi={evm.spi} cpi={evm.cpi} />

          {/* ── EVM Process Flow ── */}
          <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">EVM Calculation Pipeline</p>
            <div className="flex items-center gap-0 flex-wrap">
              {[
                {
                  step: '1',
                  title: 'Base Measures',
                  subtitle: 'Inputs',
                  items: ['BAC', 'PV', 'EV', 'AC'],
                  active: form.bac > 0 && form.pv > 0 && form.ev > 0 && form.ac > 0,
                  color: 'border-blue-500/50 bg-blue-500/10',
                  dot: 'bg-blue-500',
                  textColor: 'text-blue-400',
                },
                {
                  step: '2',
                  title: 'Variances',
                  subtitle: 'Computed',
                  items: ['SV = EV−PV', 'CV = EV−AC'],
                  active: form.pv > 0 && form.ev > 0 && form.ac > 0,
                  color: evm.sv >= 0 && evm.cv >= 0 ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10',
                  dot: evm.sv >= 0 && evm.cv >= 0 ? 'bg-green-500' : 'bg-yellow-500',
                  textColor: evm.sv >= 0 && evm.cv >= 0 ? 'text-green-400' : 'text-yellow-400',
                },
                {
                  step: '3',
                  title: 'Indices',
                  subtitle: 'Computed',
                  items: ['SPI = EV/PV', 'CPI = EV/AC'],
                  active: form.pv > 0 && form.ac > 0,
                  color: evm.spi >= 0.95 && evm.cpi >= 0.95 ? 'border-green-500/50 bg-green-500/10' : evm.spi >= 0.80 && evm.cpi >= 0.80 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-red-500/50 bg-red-500/10',
                  dot: evm.spi >= 0.95 && evm.cpi >= 0.95 ? 'bg-green-500' : evm.spi >= 0.80 && evm.cpi >= 0.80 ? 'bg-yellow-500' : 'bg-red-500',
                  textColor: evm.spi >= 0.95 && evm.cpi >= 0.95 ? 'text-green-400' : evm.spi >= 0.80 && evm.cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400',
                },
                {
                  step: '4',
                  title: 'Forecasts',
                  subtitle: 'Computed',
                  items: ['EAC', 'ETC', 'TCPI', 'VAC', 'PCIB', 'PCIC'],
                  active: form.bac > 0 && form.ac > 0,
                  color: evm.vac >= 0 ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10',
                  dot: evm.vac >= 0 ? 'bg-green-500' : 'bg-red-500',
                  textColor: evm.vac >= 0 ? 'text-green-400' : 'text-red-400',
                },
              ].map((stage, i, arr) => (
                <div key={stage.step} className="flex items-center">
                  <div className={cn('rounded-lg border p-3 min-w-[130px]', stage.active ? stage.color : 'border-border/30 bg-muted/10')}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white', stage.active ? stage.dot : 'bg-muted-foreground/30')}>
                        {stage.step}
                      </div>
                      <span className={cn('text-xs font-semibold', stage.active ? stage.textColor : 'text-muted-foreground/50')}>{stage.title}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wide mb-1">{stage.subtitle}</p>
                    <div className="flex flex-wrap gap-1">
                      {stage.items.map(item => (
                        <span key={item} className={cn('text-[10px] font-mono px-1 py-0.5 rounded',
                          stage.active ? 'bg-background/60 text-foreground' : 'bg-background/20 text-muted-foreground/40'
                        )}>{item}</span>
                      ))}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center px-1">
                      <div className={cn('w-6 h-0.5', stage.active ? 'bg-primary/50' : 'bg-border/30')} />
                      <ChevronRight className={cn('w-3 h-3 -ml-1', stage.active ? 'text-primary/50' : 'text-border/30')} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ─────── LEFT: Inputs ─────── */}
            <div className="space-y-6">

              {/* Section 1 — BAC */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">§1</Badge>
                    Project Budget Baseline
                  </CardTitle>
                  <CardDescription>The total approved budget — the anchor for all EVM calculations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CurrencyField
                    label="BAC — Budget At Completion"
                    tip="The total authorized budget assigned to the project. This is the Performance Measurement Baseline (PMB) — all variances and forecasts are derived from it."
                    question="What is the total approved budget for this project?"
                    value={form.bac} onChange={v => set('bac', v)} error={errors.bac}
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input type="date" className="mt-1 h-8 text-xs" value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Planned End Date</Label>
                      <Input type="date" className="mt-1 h-8 text-xs" value={form.plannedEndDate || ''} onChange={e => set('plannedEndDate', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections 2–4 — PV / EV / AC */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">§2–4</Badge>
                    Performance Measurement Data
                  </CardTitle>
                  <CardDescription>Enter current performance values to enable all EVM calculations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <CurrencyField
                    label="PV — Planned Value"
                    tip="The authorized budget assigned to work scheduled to be accomplished (BCWS). Represents what 'should' have been done by now per the project schedule."
                    question="What amount of work should have been completed by this point in time according to the approved schedule?"
                    value={form.pv} onChange={v => set('pv', v)} error={errors.pv}
                  />
                  <Separator />
                  <CurrencyField
                    label="EV — Earned Value"
                    tip="The measure of work performed expressed in terms of the budget authorized for that work (BCWP). Represents what has actually been 'earned' or accomplished."
                    question="What amount of work has actually been accomplished?"
                    value={form.ev} onChange={v => set('ev', v)} error={errors.ev}
                  />
                  <Separator />
                  <CurrencyField
                    label="AC — Actual Cost"
                    tip="The realized cost incurred for the work performed (ACWP). The total funds spent so far regardless of earned value."
                    question="What has actually been spent to perform the work completed so far?"
                    value={form.ac} onChange={v => set('ac', v)}
                  />
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Notes & Assumptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add corrective actions, assumptions, risks, or stakeholder notes…"
                    className="text-sm min-h-[90px] resize-none"
                    value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ─────── RIGHT: Calculated Metrics ─────── */}
            <div className="space-y-6">

              {/* Sections 5–6 — SV / CV */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">§5–6</Badge>
                    Variance Analysis
                  </CardTitle>
                  <CardDescription>Schedule and cost deviation from the approved baseline</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">SV = EV − PV</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">Schedule Variance: positive means ahead of schedule; negative means behind. At project completion, SV always returns to 0.</TooltipContent>
                      </Tooltip>
                    </div>
                    <VarianceRow label="Schedule Variance (SV)" value={evm.sv} positiveLabel="Ahead of Schedule" negativeLabel="Behind Schedule" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">CV = EV − AC</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">Cost Variance: positive means under budget; negative means over budget. Unlike SV, CV does not self-correct at completion.</TooltipContent>
                      </Tooltip>
                    </div>
                    <VarianceRow label="Cost Variance (CV)" value={evm.cv} positiveLabel="Under Budget" negativeLabel="Over Budget" />
                  </div>
                </CardContent>
              </Card>

              {/* Section 7 — SPI / CPI */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">§7</Badge>
                    Performance Indices
                  </CardTitle>
                  <CardDescription>Efficiency ratios — 1.00 is perfect, above 1.00 is favorable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">SPI = EV / PV</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">Schedule Performance Index. SPI &gt; 1.0 means ahead; &lt; 1.0 means behind. Industry alert threshold: &lt; 0.80.</TooltipContent>
                      </Tooltip>
                    </div>
                    <IndexGauge label="Schedule Performance Index (SPI)" value={evm.spi} ideal="Target ≥ 0.95  |  Ideal ≥ 1.00  |  Alert < 0.80" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">CPI = EV / AC</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">Cost Performance Index. CPI &gt; 1.0 means under budget; &lt; 1.0 means over budget. The most reliable predictor of final project cost.</TooltipContent>
                      </Tooltip>
                    </div>
                    <IndexGauge label="Cost Performance Index (CPI)" value={evm.cpi} ideal="Target ≥ 0.95  |  Ideal ≥ 1.00  |  Alert < 0.80" />
                  </div>
                </CardContent>
              </Card>

              {/* ── PCIB / PCIC / TCPI Analysis Card ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">§8</Badge>
                    Performance Control Index Analysis
                  </CardTitle>
                  <CardDescription>PCIB vs PCIC budget control indicators — are you spending in line with earned work?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* PCIB */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">PCIB = EV / BAC</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          Percent Complete Index Budget: the fraction of the total approved budget that has been earned through completed work.
                          PCIB tracks how far you are through the project in budget terms.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-2">"What fraction of the total budget has been earned through completed work?"</p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Budget Earned</span>
                      <span className="text-xl font-bold font-mono text-foreground">{fmtPct(evm.pcib * 100)}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(evm.pcib * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Target: tracks to 100% at project completion</p>
                  </div>

                  {/* PCIC */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">PCIC = AC / EAC</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          Percent Complete Index Cost: the fraction of the estimated final cost (EAC) that has already been spent.
                          Comparing PCIC to PCIB reveals whether spending is tracking with work progress.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-2">"What fraction of the estimated total cost has already been spent?"</p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Cost Consumed</span>
                      <span className="text-xl font-bold font-mono text-foreground">{fmtPct(evm.pcic * 100)}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', evm.pcic <= evm.pcib ? 'bg-green-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(evm.pcic * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {evm.pcic > 0 && evm.pcib > 0
                        ? evm.pcic <= evm.pcib
                          ? `✓ Spending (${fmtPct(evm.pcic * 100)}) is at or below work progress (${fmtPct(evm.pcib * 100)}) — favorable`
                          : `⚠ Spending (${fmtPct(evm.pcic * 100)}) is outpacing work progress (${fmtPct(evm.pcib * 100)}) — unfavorable`
                        : 'Enter BAC, EV, AC, and CPI to compute'}
                    </p>
                  </div>

                  {/* TCPI */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">TCPI = (BAC−EV) / (BAC−AC)</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          To-Complete Performance Index: the cost efficiency that must be achieved on all remaining work to finish within BAC.
                          TCPI &gt; 1.0 means you need to work cheaper than current CPI. TCPI &gt; 1.2 is generally considered unachievable.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-2">"How efficiently must remaining work be executed to finish within the approved budget?"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Required Efficiency</span>
                      <span className={cn('text-xl font-bold font-mono',
                        evm.tcpi <= 1.0 ? 'text-green-400' : evm.tcpi <= 1.1 ? 'text-yellow-400' : 'text-red-400'
                      )}>{fmtIdx(evm.tcpi)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500',
                          evm.tcpi <= 1.0 ? 'bg-green-500' : evm.tcpi <= 1.1 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${Math.min((evm.tcpi / 1.5) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Achievable (&lt;1.0)</span>
                      <span>Challenging (1.0–1.1)</span>
                      <span>High Risk (&gt;1.1)</span>
                    </div>
                  </div>

                  {/* PCIB vs PCIC vs CPI vs SPI quick-read */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Index Comparison</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'PCIB', val: fmtPct(evm.pcib * 100), clr: 'text-blue-400' },
                        { label: 'PCIC', val: fmtPct(evm.pcic * 100), clr: evm.pcic <= evm.pcib ? 'text-green-400' : 'text-red-400' },
                        { label: 'SPI',  val: fmtIdx(evm.spi),  clr: evm.spi >= 0.95 ? 'text-green-400' : evm.spi >= 0.80 ? 'text-yellow-400' : 'text-red-400' },
                        { label: 'CPI',  val: fmtIdx(evm.cpi),  clr: evm.cpi >= 0.95 ? 'text-green-400' : evm.cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400' },
                      ].map(({ label, val, clr }) => (
                        <div key={label} className="rounded-lg bg-muted/30 border border-border/40 p-2">
                          <p className="text-xs font-mono font-bold text-muted-foreground">{label}</p>
                          <p className={cn('text-base font-bold font-mono mt-0.5', clr)}>{val}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      <span className="font-medium text-foreground">PCIB vs PCIC:</span> When PCIB &gt; PCIC, earned work exceeds spending rate — favorable.
                      When PCIC &gt; PCIB, spending is outpacing work completion — requires corrective action.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* EAC Analysis — all three PMBOK methods */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">FORECAST</Badge>
                    EAC Analysis — Estimate At Completion
                  </CardTitle>
                  <CardDescription>Three PMBOK EAC methods give a cost range — from optimistic (budget rate) to conservative (composite)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Three EAC method cards */}
                  <div className="space-y-2">
                    {[
                      {
                        label: 'EAC₁ — CPI Method',
                        formula: 'BAC / CPI',
                        val: evm.eacCpi,
                        tag: 'Primary',
                        tagCls: 'bg-primary text-primary-foreground',
                        tip: 'Assumes current cost efficiency (CPI) continues unchanged for all remaining work. The most statistically reliable estimate for projects already past 20% completion.',
                        assumption: 'Past performance predicts future performance',
                        highlight: true,
                      },
                      {
                        label: 'EAC₂ — Budget Rate',
                        formula: 'AC + (BAC − EV)',
                        val: evm.eacBudget,
                        tag: 'Optimistic',
                        tagCls: 'bg-blue-600 text-white',
                        tip: 'Assumes all remaining work is completed exactly at the planned/budgeted rate, regardless of current overruns. Used when past variances are considered non-recurring.',
                        assumption: 'Remaining work performed at planned efficiency',
                        highlight: false,
                      },
                      {
                        label: 'EAC₃ — Composite',
                        formula: 'AC + (BAC−EV) / (CPI × SPI)',
                        val: evm.eacComposite,
                        tag: 'Conservative',
                        tagCls: 'bg-orange-600 text-white',
                        tip: 'Factors both schedule (SPI) and cost (CPI) inefficiency into the remaining work estimate. Produces the most conservative (highest) cost projection.',
                        assumption: 'Both schedule and cost pressures persist',
                        highlight: false,
                      },
                    ].map(item => (
                      <div
                        key={item.label}
                        className={cn(
                          'rounded-lg border p-3',
                          item.highlight
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/50 bg-muted/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{item.label}</span>
                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', item.tagCls)}>{item.tag}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help shrink-0 mt-0.5" /></TooltipTrigger>
                            <TooltipContent className="text-xs max-w-xs">{item.tip}</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className={cn(
                            'text-lg font-bold font-mono',
                            item.val <= form.bac ? 'text-green-400' : 'text-red-400'
                          )}>{fmt$(item.val)}</span>
                          <span className="text-xs font-mono text-muted-foreground/60">{item.formula}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 italic">{item.assumption}</p>
                        {/* EAC vs BAC bar */}
                        {form.bac > 0 && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500', item.val <= form.bac ? 'bg-green-500' : 'bg-red-500')}
                                style={{ width: `${Math.min((item.val / Math.max(evm.eacComposite, form.bac)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* EAC Range Summary */}
                  {form.bac > 0 && (
                    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Cost Projection Range</p>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Budget (BAC)</span>
                        <span className="font-mono font-medium">{fmt$(form.bac)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-blue-400">Best Case (EAC₂)</span>
                        <span className={cn('font-mono font-medium', evm.eacBudget <= form.bac ? 'text-green-400' : 'text-red-400')}>{fmt$(evm.eacBudget)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-primary">Expected (EAC₁)</span>
                        <span className={cn('font-mono font-medium', evm.eacCpi <= form.bac ? 'text-green-400' : 'text-red-400')}>{fmt$(evm.eacCpi)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-orange-400">Worst Case (EAC₃)</span>
                        <span className={cn('font-mono font-medium', evm.eacComposite <= form.bac ? 'text-green-400' : 'text-red-400')}>{fmt$(evm.eacComposite)}</span>
                      </div>
                    </div>
                  )}

                  {/* ETC / VAC / TCPI row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'ETC', name: 'Estimate To Complete', formula: 'EAC − AC', val: fmt$(evm.etc), clr: 'text-foreground', tip: 'Remaining cost to finish all work based on the CPI method EAC.' },
                      { label: 'VAC', name: 'Variance At Completion', formula: 'BAC − EAC', val: fmt$(evm.vac), clr: evm.vac >= 0 ? 'text-green-400' : 'text-red-400', tip: 'Projected over/under budget at completion. Positive means finish under budget.' },
                      { label: 'TCPI', name: 'To-Complete Index', formula: '(BAC−EV)/(BAC−AC)', val: fmtIdx(evm.tcpi), clr: evm.tcpi <= 1.0 ? 'text-green-400' : evm.tcpi <= 1.1 ? 'text-yellow-400' : 'text-red-400', tip: 'CPI required on all remaining work to finish within BAC. Above 1.1 is generally considered unachievable.' },
                    ].map(item => (
                      <div key={item.label} className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono text-muted-foreground">{item.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent className="text-xs max-w-xs">{item.tip}</TooltipContent>
                          </Tooltip>
                        </div>
                        <p className={cn('text-sm font-bold font-mono', item.clr)}>{item.val}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{item.name}</p>
                        <p className="text-[10px] text-primary/50 font-mono">{item.formula}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Progress bars — PV/BAC · PCIB · PCIC (extracted to separate mini-card) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-xs px-2 font-mono">PROGRESS</Badge>
                    Completion Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Planned % Complete (PV / BAC)</span>
                        <span className="font-mono font-medium">{fmtPct(evm.ppc)}</span>
                      </div>
                      <Progress value={evm.ppc} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>PCIB — Budget Earned (EV / BAC)</span>
                        <span className="font-mono font-medium text-blue-400">{fmtPct(evm.pcib * 100)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(evm.pcib * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>PCIC — Cost Consumed (AC / EAC)</span>
                        <span className={cn('font-mono font-medium', evm.pcic <= evm.pcib ? 'text-green-400' : 'text-red-400')}>{fmtPct(evm.pcic * 100)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', evm.pcic <= evm.pcib ? 'bg-green-500' : 'bg-red-500')}
                          style={{ width: `${Math.min(evm.pcic * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* ── Executive Summary Table ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Executive Summary — EVM Status Report
                  </CardTitle>
                  <CardDescription>Complete earned value metrics for stakeholder reporting and decision defensibility</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-14">Metric</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question / Description</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Value</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {summaryRows.map(row => (
                      <tr key={row.metric} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-bold font-mono text-foreground">{row.metric}</td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs leading-relaxed">{row.question}</td>
                        <td className={cn('py-2.5 px-3 text-right font-mono font-semibold', row.color || 'text-foreground')}>{row.value}</td>
                        <td className="py-2.5 px-3 text-right">
                          {row.badge && (
                            <Badge variant="outline" className={cn('text-xs', row.badgeCls)}>
                              {row.badge}
                            </Badge>
                          )}
                          {row.metric === 'Status' && (
                            <Badge className={cn('text-white text-xs', evm.health === 'green' ? 'bg-green-600' : evm.health === 'yellow' ? 'bg-yellow-600' : 'bg-red-600')}>
                              {evm.health.toUpperCase()}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Project: <span className="text-foreground font-medium">{form.projectName}</span> · Facility: {facilityId}</span>
                <span>Report Date: {new Date().toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Integration Note ── */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Single Source of Truth — EVM Data Integration</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    BAC, PV, EV, AC, SV, CV, SPI, CPI and project health are synchronized across Work Orders,
                    Equipment Intelligence, Compliance, Energy Dashboard, Executive Insights, PDF Exports, and
                    Decision Continuity™ records. All calculations update in real time when project activities,
                    costs, schedules, or completion percentages are modified.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Work Orders', 'Equipment', 'Assessments', 'Compliance', 'Energy', 'Executive Insights', 'DC Vault', 'PDF Exports', 'Reports'].map(n => (
                      <Badge key={n} variant="outline" className="text-xs text-primary/70 border-primary/20">{n}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
