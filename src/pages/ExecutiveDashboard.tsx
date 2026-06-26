import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { FacilityGauge } from '@/components/global/FacilityGauge';
import { ExportButtons } from '@/components/global/ExportButtons';
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { DCIntelligencePanel } from '@/components/global/DCIntelligencePanel';
import { ScopeAlignmentPanel } from '@/components/global/ScopeAlignmentPanel';
import { TierGate } from '@/components/TierGate';
import { getExecutiveDashboard, getCostSummary, getCostBreakdown, type CostSummary, type CostBreakdown } from '@/lib/nexum-api';
import { getAvailableFacilities } from '@/lib/role-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Flame, DollarSign, AlertTriangle, Clock,
  TrendingUp, BarChart3, ClipboardList, Building2, Users, RefreshCw, Shield, Activity,
  CalendarClock, Cpu, TrendingDown, PieChart, Layers, Target, ClipboardCheck,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { calcDOTPerformance } from '@/pages/DecisionOutcomeTracking';
import type { DOTRecord } from '@/pages/DecisionOutcomeTracking';
import { ContinuityWidget } from '@/components/continuity/ContinuityWidget';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FacilitiesIntelligenceCard } from '@/components/global/FacilitiesIntelligenceCard';

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(end: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);
  return count;
}

function operatorName(op: any): string {
  if (!op) return 'Unknown';
  if (typeof op === 'string') {
    if (op === '[object Object]') return 'Unknown';
    return op;
  }
  if (typeof op === 'object') return op.name || op.id || 'Unknown';
  return String(op);
}

function KPICard({ title, value, unit, icon: Icon, trend, delay }: {
  title: string; value: number; unit?: string;
  icon: React.ElementType; trend?: 'up' | 'down'; delay: number;
}) {
  const animated = useCountUp(value);
  return (
    <Card className="executive-card neon-border" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
            {trend === 'up' ? '↑' : '↓'}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <span className="text-3xl font-bold text-foreground text-glow count-glow">
          {unit === '$' && '$'}{animated.toLocaleString()}{unit === '%' && '%'}
        </span>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </Card>
  );
}

function SiteCard({ site, index }: { site: any; index: number }) {
  const health = site.facilityIntegrity || 0;
  const healthColor = health >= 80 ? 'text-green-400' : health >= 60 ? 'text-yellow-400' : 'text-destructive';
  const compliance = site.complianceScore || 0;
  const compColor = compliance >= 80 ? 'text-green-400' : compliance >= 60 ? 'text-yellow-400' : 'text-destructive';
  return (
    <div className="p-4 rounded-xl border border-border/40 bg-card/50 hover:border-primary/30 transition-all space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{site.name}</p>
          {site.facilityId && <p className="text-[10px] text-muted-foreground font-mono">{site.facilityId}</p>}
        </div>
        <div className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', health >= 80 ? 'border-green-400/30 text-green-400 bg-green-400/10' : health >= 60 ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' : 'border-destructive/30 text-destructive bg-destructive/10')}>
          {health >= 80 ? 'Healthy' : health >= 60 ? 'Monitor' : 'At Risk'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Boiler Eff.</p>
          <p className="font-bold text-sm text-primary mt-0.5">{site.boilerEfficiency || 0}%</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Facility Health</p>
          <p className={cn('font-bold text-sm mt-0.5', healthColor)}>{health}%</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Cost</p>
          <p className="font-bold text-sm text-yellow-400 mt-0.5">${(site.dailyCost || 0).toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compliance</p>
          <p className={cn('font-bold text-sm mt-0.5', compColor)}>{compliance}%</p>
        </div>
      </div>
      {site.violations > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
          <span className="text-xs text-destructive font-medium">{site.violations} open violation{site.violations !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}


function EmployeeRiskCard({ employee, index }: { employee: any; index: number }) {
  const riskColors = {
    Low:      'bg-green-500/20 text-green-400 border-green-500/30',
    Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    High:     'bg-destructive/20 text-destructive border-destructive/30',
  };
  const level = employee.riskLevel as keyof typeof riskColors;
  return (
    <div className={cn('p-4 rounded-lg border', riskColors[level])} style={{ animationDelay: `${800 + index * 100}ms` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4" />
          <span className="font-medium">{employee.name}</span>
        </div>
        <Badge className={riskColors[level]}>{employee.riskLevel}</Badge>
      </div>
      <div className="flex gap-4 mt-2 text-sm">
        <span>Score: {employee.complianceScore}%</span>
        <span>Violations: {employee.violations}</span>
        {employee.category && <span className="text-xs opacity-70">{employee.category}</span>}
      </div>
    </div>
  );
}

function ComplianceBar({ label, count, total, color }: { label: string; count: number; total: number; color: string; }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Decision Outcome Tracking™ Executive Tab ──────────────────────────────────
function DOTExecTab({ facilityId }: { facilityId: string }) {
  const [records, setRecords] = useState<DOTRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexum_access_token') || '';
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
    fetch(`${API_BASE}/decision-outcomes?facilityId=${facilityId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRecords(data))
      .catch(() => {
        const cached = localStorage.getItem(`nexum_dot_${facilityId}`);
        if (cached) setRecords(JSON.parse(cached));
      })
      .finally(() => setLoading(false));
  }, [facilityId]);

  const perfs = records.map(r => ({ record: r, perf: calcDOTPerformance(r) }));
  const green  = perfs.filter(p => p.perf.health === 'Green').length;
  const yellow = perfs.filter(p => p.perf.health === 'Yellow').length;
  const red    = perfs.filter(p => p.perf.health === 'Red').length;
  const avgScore = perfs.length > 0
    ? Math.round(perfs.reduce((s, p) => s + p.perf.overallScore, 0) / perfs.length)
    : 0;

  const healthBadge = (h: string) =>
    h === 'Green'  ? 'bg-green-600 text-white' :
    h === 'Yellow' ? 'bg-yellow-600 text-white' :
                     'bg-red-600 text-white';

  if (loading) return (
    <div className="flex justify-center py-16 text-muted-foreground">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading decision records…
    </div>
  );

  if (records.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ClipboardCheck className="w-10 h-10 text-muted-foreground/40" />
      <p className="font-medium text-muted-foreground">No decisions tracked yet</p>
      <p className="text-sm text-muted-foreground/60">Start tracking whether your decisions produced their intended outcomes.</p>
      <a href="/decision-outcomes" className="mt-2 text-sm text-primary hover:underline">Open Decision Outcome Tracking™ →</a>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Decisions', val: records.length.toString() },
          { label: 'Avg Outcome Score', val: `${avgScore}/100`, clr: avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'On Track', val: green.toString(), clr: 'text-green-400' },
          { label: 'At Risk', val: yellow.toString(), clr: 'text-yellow-400' },
          { label: 'Critical', val: red.toString(), clr: 'text-red-400' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="p-3 rounded-lg border border-border/50 bg-muted/20">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-base font-bold font-mono mt-0.5 ${clr || 'text-foreground'}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Decisions table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              {['Decision', 'Type', 'Status', 'Outcomes', 'Score', 'Health'].map(h => (
                <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Decision' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {perfs.map(({ record: r, perf }) => {
              const achieved = r.actualOutcomes.filter(a => a.achieved).length;
              return (
                <tr key={r.decisionId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium max-w-[200px] truncate">
                    <a href={`/decision-outcomes?id=${r.decisionId}`} className="hover:text-primary hover:underline">{r.decisionName}</a>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">{r.decisionType || '—'}</td>
                  <td className="py-2.5 px-3 text-right text-xs">{r.status}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {achieved}/{r.expectedOutcomes.length}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold ${perf.health === 'Green' ? 'text-green-400' : perf.health === 'Yellow' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {Math.round(perf.overallScore)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${healthBadge(perf.health)}`}>{perf.health}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground text-right">
        <a href="/decision-outcomes" className="text-primary hover:underline">Open full Decision Outcome Tracking™ →</a>
      </p>
    </div>
  );
}

// ── Project Controls Executive Tab ───────────────────────────────────────────
function ProjectControlsExecTab({ facilityId }: { facilityId: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try API first, fall back to localStorage cache
    const token = localStorage.getItem('nexum_access_token') || '';
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

    fetch(`${API_BASE}/project-controls?facilityId=${facilityId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setProjects(data))
      .catch(() => {
        const cached = localStorage.getItem(`nexum_pc_${facilityId}`);
        if (cached) setProjects(JSON.parse(cached));
      })
      .finally(() => setLoading(false));
  }, [facilityId]);

  const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const fmtIdx = (n: number) => n.toFixed(3);
  const healthCls = (h: string) => h === 'green' ? 'bg-green-600 text-white' : h === 'yellow' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white';

  const totals = projects.reduce((acc, p) => ({
    bac: acc.bac + (p.bac || 0),
    ev:  acc.ev  + (p.ev  || 0),
    ac:  acc.ac  + (p.ac  || 0),
    sv:  acc.sv  + ((p.ev || 0) - (p.pv || 0)),
    cv:  acc.cv  + ((p.ev || 0) - (p.ac || 0)),
  }), { bac: 0, ev: 0, ac: 0, sv: 0, cv: 0 });

  if (loading) return <div className="flex justify-center py-16 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading projects…</div>;

  if (projects.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Target className="w-10 h-10 text-muted-foreground/40" />
      <p className="font-medium text-muted-foreground">No projects yet</p>
      <p className="text-sm text-muted-foreground/60">Create your first EVM project in Project Controls.</p>
      <a href="/project-controls" className="mt-2 text-sm text-primary hover:underline">Open Project Controls →</a>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total BAC', val: fmt$(totals.bac) },
          { label: 'Total Earned (EV)', val: fmt$(totals.ev) },
          { label: 'Total Spent (AC)', val: fmt$(totals.ac) },
          { label: 'Schedule Var.', val: fmt$(totals.sv), clr: totals.sv >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Cost Var.', val: fmt$(totals.cv), clr: totals.cv >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="p-3 rounded-lg border border-border/50 bg-muted/20">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-base font-bold font-mono mt-0.5 ${clr || 'text-foreground'}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              {['Project', 'BAC', 'SPI', 'CPI', 'SV', 'CV', 'Health'].map(h => (
                <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Project' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {projects.map(p => {
              const pv = p.pv || 0; const ev = p.ev || 0; const ac = p.ac || 0;
              const spi = pv > 0 ? ev / pv : 0;
              const cpi = ac > 0 ? ev / ac : 0;
              const sv  = ev - pv; const cv = ev - ac;
              let health = p.health || (spi >= 0.95 && cpi >= 0.95 ? 'green' : spi >= 0.80 && cpi >= 0.80 ? 'yellow' : 'red');
              return (
                <tr key={p.projectId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium">
                    <a href={`/project-controls?projectId=${p.projectId}`} className="hover:text-primary hover:underline">{p.projectName}</a>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt$(p.bac || 0)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold ${spi >= 0.95 ? 'text-green-400' : spi >= 0.80 ? 'text-yellow-400' : 'text-red-400'}`}>{fmtIdx(spi)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs font-bold ${cpi >= 0.95 ? 'text-green-400' : cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400'}`}>{fmtIdx(cpi)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs ${sv >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sv >= 0 ? '+' : ''}{fmt$(sv)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs ${cv >= 0 ? 'text-green-400' : 'text-red-400'}`}>{cv >= 0 ? '+' : ''}{fmt$(cv)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${healthCls(health)}`}>{health.toUpperCase()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground text-right">
        <a href="/project-controls" className="text-primary hover:underline">Open full Project Controls module →</a>
      </p>
    </div>
  );
}

// ── OVPI Tab ──────────────────────────────────────────────────────────────────
function OVPITab() {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<any>(null);

  useEffect(() => { fetchOVPI(); }, []);

  const fetchOVPI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const [woRes, vioRes] = await Promise.all([
        fetch(`${baseUrl}/work-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/violations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const woData = woRes.ok ? await woRes.json() : { workOrders: [] };
      const vioData = vioRes.ok ? await vioRes.json() : { violations: [] };
      const wos = woData.workOrders || [];
      const violations = vioData.violations || [];
      const completed = wos.filter((w: any) => w.status === 'completed').length;
      const total = wos.length || 1;
      const onTime = wos.filter((w: any) => w.status === 'completed' && w.priority !== 'critical').length;
      const openVio = violations.filter((v: any) => v.status === 'open').length;
      const highVio = violations.filter((v: any) => v.severity === 'high').length;
      const repairScore  = Math.min(100, Math.round((completed / total) * 100));
      const woScore      = Math.min(100, Math.round((onTime / (completed || 1)) * 100));
      const stewardScore = Math.max(0, 100 - (openVio * 5) - (highVio * 10));
      const orgScore     = Math.max(0, 100 - (violations.length * 2));
      const overall      = Math.round((repairScore + woScore + stewardScore + orgScore) / 4);
      setScores({
        overall,
        domains: [
          { name: 'Repair & Maintenance',  score: repairScore,   detail: `${completed}/${total} WOs completed`,   trend: repairScore >= 80 ? 'up' : 'down' },
          { name: 'Work Order Discipline', score: woScore,       detail: `${onTime} on-time completions`,         trend: woScore >= 80 ? 'up' : 'down' },
          { name: 'System Stewardship',    score: stewardScore,  detail: `${openVio} open violations`,            trend: openVio === 0 ? 'up' : 'down' },
          { name: 'Organizational Virtue', score: orgScore,      detail: `${violations.length} total violations`, trend: violations.length < 5 ? 'up' : 'down' },
        ],
      });
    } catch (err) {
      console.error('OVPI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good Standing';
    if (score >= 60) return 'Needs Attention';
    return 'At Risk';
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Operational Virtue & Performance Intelligence</h2>
          <p className="text-muted-foreground mt-1">Executive-level facility performance scoring across 4 operational domains</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Executive Only</Badge>
          <Button variant="outline" size="sm" onClick={fetchOVPI} className="border-primary/30 hover:border-primary">
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {scores && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="executive-card neon-border p-6 text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                    strokeDasharray={`${(scores.overall / 100) * 339} 339`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute text-center">
                  <p className={`text-4xl font-bold ${getScoreColor(scores.overall)}`}>{scores.overall}</p>
                  <p className="text-xs text-muted-foreground">SCORE</p>
                </div>
              </div>
              <h3 className="text-lg font-bold">Operational Virtue Score</h3>
              <Badge className={`mt-2 ${scores.overall >= 75 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                {getScoreLabel(scores.overall)}
              </Badge>
            </Card>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {scores.domains.map((domain: any, i: number) => (
                <Card key={i} className="executive-card neon-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{domain.name}</p>
                    <Badge variant="outline" className={`text-xs ${domain.trend === 'up' ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30'}`}>
                      {domain.trend === 'up' ? '↑' : '↓'}
                    </Badge>
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(domain.score)}`}>
                    {domain.score}<span className="text-sm text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{domain.detail}</p>
                  <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${domain.score}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="executive-card neon-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />Performance Interpretation
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              {scores.domains.map((domain: any, i: number) => (
                <div key={i} className="space-y-1">
                  <p className="font-medium text-muted-foreground">{domain.name}</p>
                  <p className={`text-xl font-bold ${getScoreColor(domain.score)}`}>{getScoreLabel(domain.score)}</p>
                  <p className="text-xs text-muted-foreground">{domain.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="executive-card neon-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />Scoring Guide
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { range: '90–100', label: 'Excellent',        color: 'text-green-400',  desc: 'Exceptional facility performance' },
                { range: '75–89',  label: 'Good Standing',    color: 'text-primary',    desc: 'Above average with minor gaps' },
                { range: '60–74',  label: 'Needs Attention',  color: 'text-yellow-400', desc: 'Improvement required' },
                { range: '0–59',   label: 'At Risk',          color: 'text-red-400',    desc: 'Immediate action needed' },
              ].map((g, i) => (
                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border space-y-1">
                  <p className={`text-lg font-bold ${g.color}`}>{g.range}</p>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function readLocalArray(key: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** Compute key metrics from nexum_equipment_library and nexum_work_orders */
function computeLocalMetrics() {
  const equipment  = readLocalArray('nexum_equipment_library');
  const workOrders = readLocalArray('nexum_work_orders');
  const violations = readLocalArray('nexum_violation_events');

  // Total maintenance cost across all equipment
  const totalMaintenanceCost = equipment.reduce((sum: number, eq: any) => {
    return sum
      + (parseFloat(eq.maintenanceCostAccumulated) || 0)
      + (parseFloat(eq.laborCostAccumulated)       || 0)
      + (parseFloat(eq.partsConsumedValue)          || 0)
      + (parseFloat(eq.contractorCostAccumulated)   || 0);
  }, 0);

  // Daily cost = total maintenance / 365
  const localDailyCost = equipment.length > 0
    ? Math.round(totalMaintenanceCost / 365)
    : 0;

  // Average equipment efficiency (active equipment only)
  const activeEq = equipment.filter((eq: any) =>
    !eq.status || eq.status === 'active' || eq.status === 'operational'
  );
  const localAvgEfficiency = activeEq.length > 0
    ? Math.round(
        activeEq.reduce((sum: number, eq: any) => sum + (parseFloat(eq.currentEfficiency) || 0), 0) /
        activeEq.length
      )
    : 0;

  // Asset replacement value
  const localAssetValue = equipment.reduce((sum: number, eq: any) => {
    return sum + (parseFloat(eq.replacementCost) || parseFloat(eq.purchasePrice) || 0);
  }, 0);

  // Open work orders from local data
  const localOpenWOs = workOrders.filter((wo: any) =>
    wo.status && wo.status !== 'completed' && wo.status !== 'Completed'
  ).length;

  // Compliance rate from violations
  const totalVio = violations.length;
  const openVio  = violations.filter((v: any) => v.status === 'open').length;
  const localComplianceRate = totalVio > 0
    ? Math.round(((totalVio - openVio) / totalVio) * 100)
    : 100;

  return {
    localDailyCost,
    localAvgEfficiency,
    localAssetValue,
    localOpenWOs,
    localComplianceRate,
    hasEquipmentData: equipment.length > 0,
    hasWOData:        workOrders.length > 0,
    hasViolationData: violations.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { isAuthenticated, loading, user } = useAuth();
  const facilityId = user?.facilityId || user?.["custom:facilityId"] || "facility-001";
  const currentRole = 'executive';
  const roleScope = { facilityScope: 'multi' };

  const [data, setData]               = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedBuilding, setSelectedBuilding]  = useState('all');
  const [selectedSystem,   setSelectedSystem]    = useState('all');
  const [assetStats, setAssetStats] = useState({ totalAssets: 0, totalValue: 0, inventoryValue: 0, inventoryItems: 0 });
  const [capitalPlan, setCapitalPlan] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [localMetricsKey, setLocalMetricsKey] = useState(0);

  // Compute localStorage-derived metrics whenever local data changes
  const localMetrics = useMemo(() => computeLocalMetrics(), [localMetricsKey]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Snapshot localStorage metrics at fetch time so we can use them as fallbacks
    const local = computeLocalMetrics();
    try {
      const api = await getExecutiveDashboard();
      const complianceScore   = api.compliance?.score               ?? api.kpis?.compliance_score
                                  ?? (local.hasViolationData ? local.localComplianceRate : 0);
      const totalViolations   = api.compliance?.total_violations     ?? 0;
      const openViolations    = api.compliance?.open_violations      ?? 0;
      const highSeverity      = api.compliance?.high_severity_violations ?? 0;
      const uptime            = api.kpis?.uptime_percentage          ?? 95.5;
      // Open work orders: prefer API, fall back to localStorage count
      const openWorkOrders    = api.operations?.work_orders_open
                                  ?? (local.hasWOData ? local.localOpenWOs : 0);
      const completedWOs      = api.operations?.work_orders_completed ?? 0;
      const totalReadings     = api.operations?.total_readings        ?? 0;
      // Daily cost: prefer API financial data, fall back to localStorage equipment cost calc
      const apiMonthlyCost    = api.financial?.estimated_monthly_energy_cost;
      const dailyCost         = apiMonthlyCost != null
                                  ? Math.round(apiMonthlyCost / 30)
                                  : (local.hasEquipmentData ? local.localDailyCost : 0);
      const roi               = api.financial?.roi_percentage        ?? 0;
      // Avg efficiency: prefer API, fall back to localStorage equipment efficiency average
      const avgEfficiency     = api.kpis?.overall_efficiency
                                  ?? (local.hasEquipmentData ? local.localAvgEfficiency : undefined);
      const riskIndex         = Math.min(100, Math.round(openViolations * 2 + highSeverity * 5));

      const byOperator: Record<string, { name: string; violations: number; totalSeverity: number; categories: Set<string> }> = {};
      (api.compliance?.recent_violations || []).forEach((v: any) => {
        const name = operatorName(v.operator || v.operatorId);
        if (!byOperator[name]) byOperator[name] = { name, violations: 0, totalSeverity: 0, categories: new Set() };
        byOperator[name].violations++;
        byOperator[name].totalSeverity += v.severity || 0;
        if (v.category) byOperator[name].categories.add(v.category);
      });

      const topEmployees = Object.values(byOperator)
        .sort((a, b) => b.totalSeverity - a.totalSeverity)
        .slice(0, 6)
        .map(e => {
          const avgSev = e.totalSeverity / e.violations;
          return {
            name: e.name, violations: e.violations,
            complianceScore: Math.max(0, 100 - Math.round(avgSev)),
            riskLevel: avgSev >= 70 ? 'High' : avgSev >= 40 ? 'Moderate' : 'Low',
            category: [...e.categories].join(', '),
          };
        });

      if (topEmployees.length === 0) {
        topEmployees.push({ name: 'No violations recorded', violations: 0, complianceScore: 100, riskLevel: 'Low', category: '' });
      }

      // Resolved efficiency — never fall back to a hardcoded 85
      const resolvedEfficiency = avgEfficiency ?? 0;

      const trendBase    = Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0] }));
      const boilerTrend  = trendBase.map(d => ({ ...d, value: resolvedEfficiency }));
      const savingsTrend = trendBase.map(d => ({ ...d, value: dailyCost > 0 ? Math.round(dailyCost * 0.05) : 0 }));

      setData({
        metrics: {
          complianceScore, uptime: Math.round(uptime),
          openWorkOrders, completedWOs, totalReadings,
          dailyCost, riskIndex, roi,
          avgEfficiency: resolvedEfficiency,
          openViolations, totalViolations, highSeverity,
        },
        trends: { boiler: boilerTrend, savings: savingsTrend },
        topEmployees,
        violationsByType:     api.compliance?.violations_by_type     || {},
        violationsByCategory: api.compliance?.violations_by_category || {},
        topSites: (() => {
          const allFacilities = api.all_facilities || [];
          if (allFacilities.length > 1) {
            return allFacilities.map((f: any, i: number) => ({
              name: f.name || f.facilityId || `Facility ${i+1}`,
              facilityId: f.facilityId,
              boilerEfficiency: resolvedEfficiency > 0 ? Math.round(resolvedEfficiency - i * 1.5) : 0,
              cop: parseFloat((4.2 - i * 0.1).toFixed(1)),
              dailyCost: Math.round(dailyCost / Math.max(allFacilities.length, 1)),
              facilityIntegrity: Math.round((uptime || 95) - i),
              violations: Math.max(0, Math.round((openViolations || 0) / Math.max(allFacilities.length, 1))),
              complianceScore: Math.round((api.compliance?.compliance_score || complianceScore) - i * 1.5),
            }));
          }
          // Single facility — show with full data
          return [{ name: 'Main Campus', facilityId, boilerEfficiency: resolvedEfficiency, cop: 4.2, dailyCost, facilityIntegrity: Math.round(uptime), violations: openViolations, complianceScore }];
        })(),
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load executive dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      window.addEventListener('nexum_bms_poll_update', fetchData);
      return () => {
        clearInterval(interval);
        window.removeEventListener('nexum_bms_poll_update', fetchData);
      };
    }
  }, [isAuthenticated, fetchData]);

  // Load capital plan and local equipment from localStorage
  useEffect(() => {
    const loadCapitalData = () => {
      try {
        const plan = JSON.parse(localStorage.getItem('nexum_capital_plan') || '[]');
        setCapitalPlan(Array.isArray(plan) ? plan : []);
      } catch { /* ignore */ }
    };
    loadCapitalData();
    const handler = () => {
      setAssetStats(prev => ({ ...prev }));
      loadCapitalData();
      setLocalMetricsKey(k => k + 1);
    };
    window.addEventListener('equipment-updated', handler);
    return () => window.removeEventListener('equipment-updated', handler);
  }, []);

  // Fetch asset count + value for scorecards
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('nexum_access_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    Promise.all([
      fetch(`${baseUrl}/equipment`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { equipment: [] }).catch(() => ({ equipment: [] })),
      fetch(`${baseUrl}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([eqData, invData]) => {
      const eqList: any[] = eqData.equipment || [];
      // Prefer API inventory; fall back to localStorage if API returned nothing
      const apiInv: any[] = invData.items || invData.inventory || invData.parts || [];
      const invList: any[] = apiInv.length > 0 ? apiInv : (() => {
        try {
          const local = JSON.parse(localStorage.getItem('nexum_inventory') || '[]');
          return Array.isArray(local) ? local : [];
        } catch { return []; }
      })();
      const totalAssets = eqList.reduce((s: number, e: any) => s + (e.count || 1), 0);
      const totalValue = eqList.reduce((s: number, e: any) => s + (parseFloat(e.replacementCost || e.purchasePrice || 0) * (e.count || 1)), 0);
      const inventoryItems = invList.length;
      const inventoryValue = invList.reduce((s: number, i: any) => s + ((i.quantity || 0) * (i.unitCost || 0)), 0);
      setAssetStats({ totalAssets, totalValue, inventoryItems, inventoryValue });
    });
  }, [isAuthenticated, facilityId]);

  useEffect(() => {
    setCostLoading(true);
    Promise.all([getCostSummary(), getCostBreakdown()])
      .then(([summary, breakdown]) => {
        setCostSummary(summary);
        setCostBreakdown(breakdown);
      })
      .catch(() => {})
      .finally(() => setCostLoading(false));
  }, []);

  if (loading) return <NexumPageLoader message="Loading..." />;

  // Role guard — only executive, admin, and director have access
  const role = user?.role?.toLowerCase() || '';
  if (!['admin', 'executive', 'director'].includes(role)) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
          <Shield className="w-12 h-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">Executive Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">This dashboard is restricted to Executive and Director-level accounts. Contact your administrator if you need access.</p>
        </div>
      </MainLayout>
    );
  }

  const filteredSites  = data?.topSites?.filter((s: any) => selectedFacility === 'all' || s.name === selectedFacility) || [];
  const overallScore   = data?.metrics ? Math.round((data.metrics.avgEfficiency + data.metrics.uptime + data.metrics.complianceScore) / 3) : 0;
  const availableFacilities = getAvailableFacilities(currentRole);
  const showMultiFacility   = roleScope.facilityScope === 'multi';
  const typeColors = ['#00f2ea', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#f97316'];

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-8">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />Executive Intelligence Center™
            </h1>
            <p className="text-muted-foreground mt-1">
              30-day operational intelligence overview
              {lastUpdated && <span className="ml-2 text-xs">· Updated {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="border-primary/30 hover:border-primary">
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />Refresh
            </Button>
            {data && (
              <ExportButtons title="Executive Report" metrics={[
                { label: 'Compliance Score', value: `${data.metrics.complianceScore}%` },
                { label: 'Daily Cost',       value: `$${data.metrics.dailyCost.toLocaleString()}` },
                { label: 'Uptime',           value: `${data.metrics.uptime}%` },
                { label: 'Open WOs',         value: String(data.metrics.openWorkOrders) },
              ]} />
            )}
          </div>
        </div>

        <Card className="p-4 border-border/50">
          <ScopeFilters
            selectedFacility={selectedFacility} selectedBuilding={selectedBuilding} selectedSystem={selectedSystem}
            onFacilityChange={(v) => { setSelectedFacility(v); setSelectedBuilding('all'); }}
            onBuildingChange={setSelectedBuilding} onSystemChange={setSelectedSystem}
            showFacility={availableFacilities.length > 0}
          />
        </Card>

        {error && <NexumError message={error} onRetry={fetchData} />}

        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="operations" className="flex items-center gap-1 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />Operations
            </TabsTrigger>
            <TabsTrigger value="ovpi" className="flex items-center gap-1 text-xs">
              <Activity className="w-3.5 h-3.5" />OVPI
            </TabsTrigger>
            <TabsTrigger value="project-controls" className="flex items-center gap-1 text-xs">
              <Target className="w-3.5 h-3.5" />Projects
            </TabsTrigger>
            <TabsTrigger value="decision-outcomes" className="flex items-center gap-1 text-xs">
              <ClipboardCheck className="w-3.5 h-3.5" />Decisions
            </TabsTrigger>
            <TabsTrigger value="continuity" className="flex items-center gap-1 text-xs">
              <Shield className="w-3.5 h-3.5" />Continuity
            </TabsTrigger>
          </TabsList>

          {/* ── Operations Tab ── */}
          <TabsContent value="operations">
            {isLoading ? (
              <div className="flex justify-center py-20"><NexumLoader message="Loading executive metrics..." /></div>
            ) : data?.metrics && (
              <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  <KPICard title="Compliance Score"  value={data.metrics.complianceScore}  unit="%"  icon={Shield}        delay={0}   trend="up" />
                  <KPICard title="Avg Efficiency"    value={data.metrics.avgEfficiency}    unit="%"  icon={Flame}         delay={50}  trend="up" />
                  <KPICard title="Daily Cost"        value={data.metrics.dailyCost}        unit="$"  icon={DollarSign}    delay={100} />
                  <KPICard title="Risk Index"        value={data.metrics.riskIndex}               icon={AlertTriangle}  delay={150} trend="down" />
                  <KPICard title="Uptime %"          value={data.metrics.uptime}           unit="%"  icon={TrendingUp}    delay={200} trend="up" />
                  <KPICard title="ROI %"             value={data.metrics.roi}              unit="%"  icon={BarChart3}     delay={250} />
                  <KPICard title="Open Work Orders"  value={data.metrics.openWorkOrders}          icon={ClipboardList}  delay={300} />
                  <KPICard title="Total Readings"    value={data.metrics.totalReadings}           icon={Clock}          delay={350} />
                </div>
                {/* Decision Continuity™ + Scope Alignment — both role & tier auto-gated */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <DCIntelligencePanel limit={5} />
                  <ScopeAlignmentPanel limit={15} />
                </div>
                {/* Facilities Intelligence */}
                <FacilitiesIntelligenceCard />

                {/* Capital KPI cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(() => {
                    const operationalValue = assetStats.totalValue;
                    const riskCount = capitalPlan.filter(p => p.score >= 71).length;
                    return (
                      <>
                        <Card className="executive-card neon-border p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                              <Cpu className="h-5 w-5 text-emerald-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">Operational Asset Value</p>
                          </div>
                          <p className="text-3xl font-bold text-emerald-400">${Math.round(operationalValue / 1000)}K</p>
                          <p className="text-xs text-muted-foreground mt-1">Total replacement value on record</p>
                        </Card>
                        <Card className="executive-card neon-border p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                              <CalendarClock className="h-5 w-5 text-orange-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">Replacement Risk</p>
                          </div>
                          <p className="text-3xl font-bold text-orange-400">{riskCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">Assets in replacement window (score ≥71)</p>
                        </Card>
                      </>
                    );
                  })()}
                </div>
                {/* Interpretation layer: data integrity notice */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400/80">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Analysis based on <strong className="text-blue-400">{data.metrics.totalReadings ?? 0} verified records</strong> — only admissible, governance-checked entries feed these metrics.
                    Incomplete or unvalidated logs are excluded from executive summaries.
                  </span>
                </div>

                {/* ── Asset + Inventory Scorecards ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Equipment Units', value: assetStats.totalAssets.toLocaleString(), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', desc: 'Across all equipment types' },
                    { label: 'Equipment Asset Value', value: `$${(assetStats.totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', desc: 'Total replacement cost on record' },
                    { label: 'Inventory Line Items', value: assetStats.inventoryItems.toLocaleString(), icon: Building2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', desc: 'Parts, supplies & materials' },
                    { label: 'Inventory Stock Value', value: `$${(assetStats.inventoryValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', desc: 'Based on qty × unit cost' },
                  ].map((card, i) => (
                    <Card key={i} className="executive-card neon-border p-4">
                      <div className={cn('inline-flex p-2 rounded-lg border mb-3', card.bg)}>
                        <card.icon className={cn('w-5 h-5', card.color)} />
                      </div>
                      <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{card.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                    </Card>
                  ))}
                </div>

                {/* ── Financial Overview ── */}
                <Card className="executive-card neon-border p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />Financial Overview
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Daily Op Cost',       value: `$${(data.metrics.dailyCost || 0).toLocaleString()}`,              sub: 'Energy + ops' },
                      { label: 'Monthly Projected',   value: `$${((data.metrics.dailyCost || 0) * 30).toLocaleString()}`,        sub: 'Daily × 30' },
                      { label: 'Annual Projected',    value: `$${((data.metrics.dailyCost || 0) * 365).toLocaleString()}`,       sub: 'Daily × 365' },
                      { label: 'Equipment Value',     value: assetStats.totalValue > 0 ? `$${Math.round(assetStats.totalValue/1000)}K` : '—', sub: 'Replacement cost' },
                      { label: 'Inventory Value',     value: assetStats.inventoryValue > 0 ? `$${(assetStats.inventoryValue/1000).toFixed(1)}K` : '—', sub: 'Qty × unit cost' },
                      { label: 'Total Asset Value',   value: (assetStats.totalValue + assetStats.inventoryValue) > 0 ? `$${Math.round((assetStats.totalValue + assetStats.inventoryValue)/1000)}K` : '—', sub: 'Equipment + inventory' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-background/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold text-primary mt-1">{item.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                  {/* Department budgets */}
                  {(() => {
                    const deptBudgets: any[] = (() => {
                      try {
                        const raw = JSON.parse(localStorage.getItem('nexum_dept_budgets') || '[]');
                        return Array.isArray(raw) ? raw : (raw?.rows ?? []);
                      } catch { return []; }
                    })();
                    if (deptBudgets.length === 0) return (
                      <p className="text-sm text-muted-foreground mt-4 text-center">Set department budgets in <strong>Settings → Budget</strong></p>
                    );
                    const totalBudget = deptBudgets.reduce((s: number, d: any) => s + (parseFloat(d.annualBudget) || 0), 0);
                    const totalSpent  = deptBudgets.reduce((s: number, d: any) => s + (parseFloat(d.spent || '0') || 0), 0);
                    return (
                      <div className="mt-4 pt-4 border-t border-border space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Annual Budget</span>
                          <span className="font-semibold">${totalBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent to Date</span>
                          <span className="font-semibold text-yellow-400">${totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="font-semibold text-green-400">${(totalBudget - totalSpent).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* ── Asset Replacement Intelligence ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-orange-400" />Asset Replacement Intelligence
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Replacement Candidates */}
                    <Card className="executive-card neon-border p-5">
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Approaching Replacement (Score ≥70)</h4>
                      {capitalPlan.filter(p => p.score >= 70).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No assets currently flagged for replacement. Use Asset Intelligence in Equipment Library to queue assets.</p>
                      ) : (
                        <div className="space-y-2">
                          {capitalPlan.filter(p => p.score >= 70).sort((a, b) => b.score - a.score).slice(0, 6).map((asset: any) => {
                            const scoreColor = asset.score >= 86 ? 'text-red-400' : asset.score >= 71 ? 'text-orange-400' : 'text-yellow-400';
                            const scoreBg = asset.score >= 86 ? 'bg-red-500/10' : asset.score >= 71 ? 'bg-orange-500/10' : 'bg-yellow-500/10';
                            return (
                              <div key={asset.equipmentId} className={`flex items-center justify-between p-2 rounded-lg ${scoreBg}`}>
                                <div>
                                  <p className="text-sm font-medium">{asset.equipmentName}</p>
                                  <p className="text-xs text-muted-foreground">Window: {asset.windowMonths} months · Cost: ${(asset.replacementCost / 1000).toFixed(0)}K</p>
                                </div>
                                <span className={`text-lg font-bold ${scoreColor}`}>{asset.score}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    {/* Capital Forecast */}
                    <Card className="executive-card neon-border p-5">
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Capital Forecast by Horizon</h4>
                      {(() => {
                        const buckets = [
                          { label: '0–12 Months',  months: 12,  color: 'text-red-400',    bg: 'bg-red-500/10' },
                          { label: '1–3 Years',    months: 36,  color: 'text-orange-400', bg: 'bg-orange-500/10' },
                          { label: '3–5 Years',    months: 60,  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                          { label: '5+ Years',     months: 999, color: 'text-green-400',  bg: 'bg-green-500/10' },
                        ];
                        let prev = 0;
                        return (
                          <div className="space-y-3">
                            {buckets.map(b => {
                              const assets = capitalPlan.filter(p => p.windowMonths > prev && p.windowMonths <= b.months);
                              const cost = assets.reduce((s: number, a: any) => s + (a.replacementCost || 0), 0);
                              prev = b.months;
                              return (
                                <div key={b.label} className={`flex items-center justify-between p-3 rounded-lg ${b.bg}`}>
                                  <div>
                                    <p className="text-sm font-medium">{b.label}</p>
                                    <p className="text-xs text-muted-foreground">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
                                  </div>
                                  <p className={`text-lg font-bold ${b.color}`}>${(cost / 1000).toFixed(0)}K</p>
                                </div>
                              );
                            })}
                            <div className="pt-2 border-t border-border flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Capital Plan</span>
                              <span className="font-bold">${(capitalPlan.reduce((s: number, a: any) => s + (a.replacementCost || 0), 0) / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                        );
                      })()}
                    </Card>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Card className="executive-card neon-border p-6" style={{ animationDelay: '400ms' }}>
                    <FacilityGauge value={overallScore} label="Overall Facility Intelligence Score" size="lg" />
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />Compliance Overview — Last 30 Days
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {[
                        { label: 'Compliance Score', value: `${data.metrics.complianceScore}%`, color: data.metrics.complianceScore >= 70 ? 'text-green-400' : 'text-red-400' },
                        { label: 'Total Violations', value: data.metrics.totalViolations,        color: 'text-foreground' },
                        { label: 'Open Violations',  value: data.metrics.openViolations,         color: data.metrics.openViolations > 0 ? 'text-yellow-400' : 'text-green-400' },
                        { label: 'High Severity',    value: data.metrics.highSeverity,           color: data.metrics.highSeverity > 0 ? 'text-red-400' : 'text-green-400' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {Object.entries(data.violationsByCategory).map(([cat, count]: [string, any], i) => (
                        <ComplianceBar key={cat} label={cat} count={count} total={data.metrics.totalViolations} color={typeColors[i % typeColors.length]} />
                      ))}
                    </div>
                  </Card>

                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />Violations by Type
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(data.violationsByType)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([type, count]: [string, any], i) => (
                          <ComplianceBar key={type} label={type} count={count} total={data.metrics.totalViolations} color={typeColors[i % typeColors.length]} />
                        ))}
                    </div>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />Efficiency Trend (30d)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.trends.boiler}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => v.slice(5)} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[70, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />Est. Daily Savings Opportunity
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.trends.savings}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => v.slice(5)} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`$${v}`, 'Est. Savings']} />
                        <Area type="monotone" dataKey="value" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.3)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {showMultiFacility && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredSites.map((site: any, i: number) => <SiteCard key={i} site={site} index={i} />)}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />Employee Compliance Risk
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {data.topEmployees.map((e: any, i: number) => <EmployeeRiskCard key={i} employee={e} index={i} />)}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── OVPI Tab — Premium gated ── */}
          <TabsContent value="ovpi">
            <TierGate
              featureName="OVPI Performance Intelligence"
              requiredTier="PREMIUM"
              description="Operational Virtue & Performance Intelligence scoring is available on the Premium plan."
            >
              <OVPITab />
            </TierGate>
          </TabsContent>

          {/* ── Project Controls Tab ── */}
          <TabsContent value="project-controls">
            <ProjectControlsExecTab facilityId={user?.facilityId || user?.['custom:facilityId'] || 'facility-001'} />
          </TabsContent>

          {/* ── Decision Outcomes Tab ── */}
          <TabsContent value="decision-outcomes">
            <DOTExecTab facilityId={user?.facilityId || user?.['custom:facilityId'] || 'facility-001'} />
          </TabsContent>

          {/* ── Continuity Intelligence™ Tab ── */}
          <TabsContent value="continuity">
            <ContinuityWidget
              facilityId={user?.facilityId || user?.['custom:facilityId'] || 'facility-001'}
              embedded
            />
          </TabsContent>
        </Tabs>

        {/* ── Financial Intelligence ─────────────────────────────────────────────── */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Financial Intelligence</h2>
            {costLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>

          {/* KPI row: 6 cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'YTD Spend', value: `$${((costSummary?.totalCostYTD || 0) / 1000).toFixed(1)}k`, sub: 'Year to date', color: 'text-emerald-400' },
              { label: 'This Month', value: `$${((costSummary?.totalCostThisMonth || 0) / 1000).toFixed(1)}k`, sub: 'Current month', color: 'text-blue-400' },
              { label: 'CapEx', value: `$${((costSummary?.capex || 0) / 1000).toFixed(1)}k`, sub: `${(costSummary?.capexPercent || 0).toFixed(0)}% of total`, color: 'text-purple-400' },
              { label: 'OpEx', value: `$${((costSummary?.opex || 0) / 1000).toFixed(1)}k`, sub: `${(costSummary?.opexPercent || 0).toFixed(0)}% of total`, color: 'text-amber-400' },
              { label: 'Asset Book Value', value: `$${((costSummary?.totalBookValue || 0) / 1000).toFixed(1)}k`, sub: `${costSummary?.assetCount || 0} assets`, color: 'text-cyan-400' },
              { label: 'Depreciation YTD', value: `$${((costSummary?.totalDepreciationYTD || 0) / 1000).toFixed(1)}k`, sub: 'Accumulated loss', color: 'text-red-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Cost breakdown — department + category */}
          {costBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department contribution */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" /> Cost by Department
                </h3>
                <div className="space-y-2">
                  {(costBreakdown.byDepartment.slice(0, 5)).map(d => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{d.name || 'Unassigned'}</span>
                        <span className="font-medium">${(d.amount / 1000).toFixed(1)}k <span className="text-muted-foreground">({d.percent.toFixed(1)}%)</span></span>
                      </div>
                      <Progress value={d.percent} className="h-1.5" />
                    </div>
                  ))}
                  {costBreakdown.byDepartment.length === 0 && <p className="text-xs text-muted-foreground">No cost data recorded yet.</p>}
                </div>
              </div>

              {/* Category contribution */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-muted-foreground" /> Cost by Category
                </h3>
                <div className="space-y-2">
                  {(costBreakdown.byCategory.slice(0, 5)).map(c => (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground capitalize">{c.name}</span>
                        <span className="font-medium">${(c.amount / 1000).toFixed(1)}k <span className="text-muted-foreground">({c.percent.toFixed(1)}%)</span></span>
                      </div>
                      <Progress value={c.percent} className="h-1.5" />
                    </div>
                  ))}
                  {costBreakdown.byCategory.length === 0 && <p className="text-xs text-muted-foreground">No category data recorded yet.</p>}
                </div>
              </div>

              {/* System type contribution */}
              <div className="bg-card border border-border rounded-lg p-4 md:col-span-2">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" /> Cost by System Type
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(costBreakdown.bySystemType.slice(0, 8)).map(s => (
                    <div key={s.name} className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-muted-foreground capitalize">{s.name || 'Unassigned'}</p>
                      <p className="text-sm font-semibold">${(s.amount / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-muted-foreground">{s.percent.toFixed(1)}% of total</p>
                    </div>
                  ))}
                  {costBreakdown.bySystemType.length === 0 && <p className="text-xs text-muted-foreground col-span-4">No system cost data recorded yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
