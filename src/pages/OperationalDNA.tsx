import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Cpu, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Activity, BarChart3,
  ShieldAlert, Zap, Target, Layers, PieChart,
  Clock, Wrench, ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// ── Types ────────────────────────────────────────────────────────────────────

interface DNAScores {
  reliability_index: number;
  failure_probability: number;
  operational_stability_index: number;
  maintenance_effectiveness_score: number;
  risk_trajectory: 'improving' | 'stable' | 'degrading' | 'critical';
}

interface DNAPattern {
  type: 'recurring_failure' | 'seasonal_trend' | 'human_factor' | 'compliance_drift';
  title: string;
  description: string;
  frequency?: number;
  systems?: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface DNAPrediction {
  title: string;
  description: string;
  probability: number;
  timeframe: string;
  action: string;
}

interface RootCauseCluster {
  system: string;
  wo_count: number;
  share_pct: number;
}

interface DNAProfile {
  facility_id: string;
  generated_at: string;
  scores: DNAScores;
  patterns: DNAPattern[];
  predictions: DNAPrediction[];
  root_cause_clusters: RootCauseCluster[];
  data_points: {
    work_orders_analyzed: number;
    violations_analyzed: number;
    days_of_history: number;
  };
}

// ── Score card ────────────────────────────────────────────────────────────────

function ScoreRing({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const filled = circ * (value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="bold">
        {value}
      </text>
    </svg>
  );
}

const TRAJECTORY_META = {
  improving:  { label: 'Improving',  icon: TrendingUp,   color: '#22c55e', bg: 'bg-green-500/10 border-green-500/30' },
  stable:     { label: 'Stable',     icon: Minus,        color: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
  degrading:  { label: 'Degrading',  icon: TrendingDown, color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/30' },
  critical:   { label: 'Critical',   icon: AlertTriangle,color: '#ef4444', bg: 'bg-red-500/10 border-red-500/30' },
};

function scoreColor(v: number) {
  if (v >= 80) return '#22c55e';
  if (v >= 60) return '#3b82f6';
  if (v >= 40) return '#f59e0b';
  if (v >= 20) return '#f97316';
  return '#ef4444';
}

const PATTERN_META = {
  recurring_failure: { label: 'Recurring Failure', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: RefreshCw },
  seasonal_trend:    { label: 'Seasonal Trend',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Activity },
  human_factor:      { label: 'Human Factor',      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Target },
  compliance_drift:  { label: 'Compliance Drift',  color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: ShieldAlert },
};

const SEVERITY_BADGE = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/40',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  low:      'bg-blue-500/20 text-blue-400 border-blue-500/40',
};

// ── Pattern card ─────────────────────────────────────────────────────────────

function PatternCard({ p }: { p: DNAPattern }) {
  const [open, setOpen] = useState(false);
  const meta = PATTERN_META[p.type];
  const Icon = meta.icon;
  return (
    <div className={`border rounded-lg p-4 ${meta.color} cursor-pointer`} onClick={() => setOpen(o => !o)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{p.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[p.severity]}`}>
                {p.severity}
              </span>
              {p.frequency && (
                <span className="text-xs opacity-70">{p.frequency}× in period</span>
              )}
            </div>
            {open && (
              <p className="text-xs opacity-80 mt-1 leading-relaxed">{p.description}</p>
            )}
            {open && p.systems && p.systems.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {p.systems.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-background/30 border border-current/20">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button className="shrink-0 opacity-60 mt-0.5">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OperationalDNA() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.['custom:role'] === 'admin';

  const [profile, setProfile] = useState<DNAProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/operational-dna');
      setProfile(data as DNAProfile);
    } catch {
      // empty — shows placeholder
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const data = await apiRequest('/operational-dna/analyze', { method: 'POST' });
      setProfile(data as DNAProfile);
      toast({ title: 'DNA Analysis Complete', description: 'Your facility behavioral fingerprint has been updated.' });
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err?.message || 'Try again', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const exportReport = () => {
    if (!profile) return;
    const s = profile.scores;
    const lines = [
      'NEXUM SUUM — OPERATIONAL DNA REPORT',
      `Generated: ${new Date(profile.generated_at).toLocaleString()}`,
      `Data points: ${profile.data_points.work_orders_analyzed} WOs, ${profile.data_points.violations_analyzed} violations, ${profile.data_points.days_of_history} days`,
      '',
      '── SCORES ─────────────────────────────────────',
      `Reliability Index:            ${s.reliability_index}/100`,
      `Failure Probability:          ${s.failure_probability}/100`,
      `Operational Stability Index:  ${s.operational_stability_index}/100`,
      `Maintenance Effectiveness:    ${s.maintenance_effectiveness_score}/100`,
      `Risk Trajectory:              ${s.risk_trajectory.toUpperCase()}`,
      '',
      '── PATTERNS ────────────────────────────────────',
      ...profile.patterns.map(p => `[${p.severity.toUpperCase()}] ${p.title}: ${p.description}`),
      '',
      '── PREDICTIONS ─────────────────────────────────',
      ...profile.predictions.map(p => `• ${p.title} (${p.timeframe}, ${p.probability}% probability)\n  ${p.description}\n  Action: ${p.action}`),
      '',
      '── ROOT CAUSE CLUSTERS ─────────────────────────',
      ...profile.root_cause_clusters.map(c => `${c.system}: ${c.wo_count} WOs (${c.share_pct}%)`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `operational-dna-${Date.now()}.txt`;
    a.click();
  };

  const scores = profile?.scores;
  const traj = scores ? TRAJECTORY_META[scores.risk_trajectory] : null;
  const TrajIcon = traj?.icon;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Cpu className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Operational DNA Engine</h1>
              <p className="text-sm text-muted-foreground">
                Behavioral fingerprint of your facility's maintenance and compliance history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <Button variant="outline" size="sm" onClick={exportReport} className="gap-2">
                <Download className="w-4 h-4" /> Export
              </Button>
            )}
            <Button onClick={runAnalysis} disabled={running} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              {running ? 'Analyzing…' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Last run info */}
        {profile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Last analyzed {new Date(profile.generated_at).toLocaleString()} ·
            {profile.data_points.work_orders_analyzed} work orders ·
            {profile.data_points.violations_analyzed} violations ·
            {profile.data_points.days_of_history} days of history
          </div>
        )}

        {/* Score grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Reliability Index */}
          <div className="bg-card border border-border/40 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Reliability Index
            </div>
            <ScoreRing value={loading ? 0 : (scores?.reliability_index ?? 0)} color={scoreColor(scores?.reliability_index ?? 0)} />
            <p className="text-xs text-muted-foreground text-center">
              WO completion rate + PM adherence + resolution speed
            </p>
          </div>

          {/* Failure Probability */}
          <div className="bg-card border border-border/40 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Failure Probability
            </div>
            <ScoreRing value={loading ? 0 : (scores?.failure_probability ?? 0)} color={scoreColor(100 - (scores?.failure_probability ?? 0))} />
            <p className="text-xs text-muted-foreground text-center">
              Critical event rate trend — lower is better
            </p>
          </div>

          {/* Stability Index */}
          <div className="bg-card border border-border/40 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
              Stability Index
            </div>
            <ScoreRing value={loading ? 0 : (scores?.operational_stability_index ?? 0)} color={scoreColor(scores?.operational_stability_index ?? 0)} />
            <p className="text-xs text-muted-foreground text-center">
              Consistency of workload volume month-over-month
            </p>
          </div>

          {/* Maintenance Effectiveness */}
          <div className="bg-card border border-border/40 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-center">
              <Wrench className="w-4 h-4 text-amber-400" />
              Maintenance Effectiveness
            </div>
            <ScoreRing value={loading ? 0 : (scores?.maintenance_effectiveness_score ?? 0)} color={scoreColor(scores?.maintenance_effectiveness_score ?? 0)} />
            <p className="text-xs text-muted-foreground text-center">
              Completion rate minus recurrence ratio
            </p>
          </div>

          {/* Risk Trajectory */}
          <div className={`rounded-xl p-4 flex flex-col items-center justify-center gap-3 border ${traj?.bg ?? 'bg-card border-border/40'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Risk Trajectory
            </div>
            {traj && TrajIcon ? (
              <>
                <TrajIcon className="w-10 h-10" style={{ color: traj.color }} />
                <span className="text-base font-bold" style={{ color: traj.color }}>{traj.label}</span>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted/30 animate-pulse" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Last 30d vs prior 30d high-critical event delta
            </p>
          </div>
        </div>

        {/* Patterns + Predictions row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Patterns */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-semibold">Detected Patterns</h2>
              {profile && (
                <Badge variant="secondary" className="ml-auto">{profile.patterns.length}</Badge>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : !profile || profile.patterns.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No significant patterns detected</p>
                <p className="text-xs text-muted-foreground mt-1">Run an analysis to scan your operational history</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {profile.patterns.map((p, i) => <PatternCard key={i} p={p} />)}
              </div>
            )}
          </div>

          {/* Predictions */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold">Predictive Insights</h2>
              {profile && (
                <Badge variant="secondary" className="ml-auto">{profile.predictions.length}</Badge>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : !profile || profile.predictions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No predictions available yet</p>
                <p className="text-xs text-muted-foreground mt-1">More operational history generates better predictions</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {profile.predictions.map((p, i) => (
                  <div key={i} className="bg-background/40 border border-border/30 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{p.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{p.timeframe}</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {p.probability}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{p.action}</span>
                    </div>
                    <Progress value={p.probability} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Root Cause Clusters */}
        <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold">Root Cause Clusters</h2>
            <span className="text-xs text-muted-foreground ml-auto">Top systems by work order volume</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />)}
            </div>
          ) : !profile || profile.root_cause_clusters.length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cluster data yet — run an analysis to populate</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {profile.root_cause_clusters.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-48">{c.system}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{c.wo_count} WOs</span>
                        <span className="font-semibold text-cyan-400 w-10 text-right">{c.share_pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                        style={{ width: `${c.share_pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state CTA */}
        {!loading && !profile && (
          <div className="bg-card border border-border/40 rounded-xl p-10 text-center space-y-4">
            <Cpu className="w-12 h-12 text-purple-400 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No DNA Profile Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Run your first analysis to generate a behavioral fingerprint from your work orders,
                violations, and PM records. The engine identifies recurring failures, seasonal trends,
                human factors, and compliance drift automatically.
              </p>
            </div>
            <Button onClick={runAnalysis} disabled={running} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              {running ? 'Analyzing…' : 'Run First Analysis'}
            </Button>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
