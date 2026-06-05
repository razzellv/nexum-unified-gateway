import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, RefreshCw, Download, Clock, AlertTriangle, CheckCircle2,
  Eye, Camera, FileText, Database, BarChart3, Target, Zap, ArrowRight,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Activity,
  ClipboardList, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ── Types ────────────────────────────────────────────────────────────────────

interface IntegrityScores {
  event_integrity: number;
  capture_latency: number;
  evidence_completeness: number;
  assumption_risk: number;
  documentation_confidence: number;
  decision_defensibility: number;
  composite: number;
}

interface RecommendedAction {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  detail: string;
}

interface ScoredRecord {
  record_type: 'work_order' | 'violation' | 'facility_log';
  record_sk: string;
  record_title: string;
  composite: number;
  event_integrity: number;
  capture_latency: number;
  evidence_completeness: number;
  assumption_risk: number;
  documentation_confidence: number;
  decision_defensibility: number;
  integrity_risk_level: 'green' | 'yellow' | 'orange' | 'red';
  capture_latency_hours: number | null;
}

interface IntegritySummary {
  records_scored: number;
  scores: IntegrityScores;
  risk_distribution: { green: number; yellow: number; orange: number; red: number };
  integrity_risk_level: 'green' | 'yellow' | 'orange' | 'red';
  avg_capture_latency_hours: number | null;
  recommended_actions: RecommendedAction[];
  scored_at: string;
  recent_records: ScoredRecord[];
  data_points: { work_orders: number; violations: number; facility_logs: number };
}

// ── Visual constants ──────────────────────────────────────────────────────────

const RISK_META = {
  green:  { label: 'High Integrity',     bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  bar: 'bg-green-500'  },
  yellow: { label: 'Moderate Integrity', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  orange: { label: 'Elevated Degradation Risk', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'bg-orange-500' },
  red:    { label: 'Significant Risk',   bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    bar: 'bg-red-500'    },
};

const METRIC_META = [
  {
    key: 'event_integrity' as const,
    label: 'Event Integrity',
    icon: Zap,
    color: 'text-indigo-400',
    bar: 'bg-indigo-500',
    tip: 'Fidelity between actual event and documented record',
  },
  {
    key: 'capture_latency' as const,
    label: 'Capture Latency',
    icon: Clock,
    color: 'text-cyan-400',
    bar: 'bg-cyan-500',
    tip: 'Speed of documentation relative to event occurrence',
  },
  {
    key: 'evidence_completeness' as const,
    label: 'Evidence Completeness',
    icon: Camera,
    color: 'text-green-400',
    bar: 'bg-green-500',
    tip: 'Photos, measurements, asset ID, location, witnesses',
  },
  {
    key: 'assumption_risk' as const,
    label: 'Assumption Risk',
    icon: Eye,
    color: 'text-orange-400',
    bar: 'bg-orange-500',
    tip: 'Likelihood that portions were reconstructed vs. directly observed (higher = safer)',
  },
  {
    key: 'documentation_confidence' as const,
    label: 'Documentation Confidence',
    icon: FileText,
    color: 'text-blue-400',
    bar: 'bg-blue-500',
    tip: 'Overall trustworthiness of the recorded information',
  },
  {
    key: 'decision_defensibility' as const,
    label: 'Decision Defensibility',
    icon: Target,
    color: 'text-purple-400',
    bar: 'bg-purple-500',
    tip: 'Whether the record can support audits, investigations, or executive decisions',
  },
];

// ── Signal chain ─────────────────────────────────────────────────────────────

const CHAIN_STEPS = [
  { label: 'Event',         icon: Zap,         scoreKey: 'event_integrity'          },
  { label: 'Observation',   icon: Eye,          scoreKey: 'capture_latency'          },
  { label: 'Capture',       icon: Camera,       scoreKey: 'capture_latency'          },
  { label: 'Documentation', icon: FileText,     scoreKey: 'evidence_completeness'    },
  { label: 'Storage',       icon: Database,     scoreKey: 'assumption_risk'          },
  { label: 'Reporting',     icon: BarChart3,    scoreKey: 'documentation_confidence' },
  { label: 'Decision',      icon: Target,       scoreKey: 'decision_defensibility'   },
] as const;

function chainColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function SignalChain({ scores }: { scores: IntegrityScores }) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Integrity Chain</h2>
        <span className="text-xs text-muted-foreground ml-auto">Event → Decision degradation path</span>
      </div>
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {CHAIN_STEPS.map((step, i) => {
          const Icon = step.icon;
          const score = scores[step.scoreKey];
          const color = chainColor(score);
          return (
            <div key={step.label} className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: color, background: `${color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-xs font-medium" style={{ color }}>{score}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-14">{step.label}</span>
              </div>
              {i < CHAIN_STEPS.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mb-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Composite score gauge ─────────────────────────────────────────────────────

function CompositeGauge({ score, riskLevel }: { score: number; riskLevel: string }) {
  const meta = RISK_META[riskLevel as keyof typeof RISK_META] || RISK_META.red;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  const color = riskLevel === 'green' ? '#22c55e' : riskLevel === 'yellow' ? '#eab308' : riskLevel === 'orange' ? '#f97316' : '#ef4444';

  return (
    <div className={`rounded-xl border p-6 flex flex-col items-center gap-3 ${meta.bg} ${meta.border}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className={`w-5 h-5 ${meta.text}`} />
        <span className="text-sm font-semibold">Overall Integrity Score</span>
      </div>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
        <circle
          cx={65} cy={65} r={r}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
        <text x={65} y={60} textAnchor="middle" fill={color} fontSize={28} fontWeight="bold">{score}</text>
        <text x={65} y={78} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>/100</text>
      </svg>
      <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
    </div>
  );
}

// ── Risk distribution bar ─────────────────────────────────────────────────────

function RiskDistributionBar({ dist, total }: { dist: IntegritySummary['risk_distribution']; total: number }) {
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const segments = [
    { key: 'green'  as const, label: 'High Integrity',           color: 'bg-green-500'  },
    { key: 'yellow' as const, label: 'Moderate',                  color: 'bg-yellow-500' },
    { key: 'orange' as const, label: 'Elevated Risk',             color: 'bg-orange-500' },
    { key: 'red'    as const, label: 'Significant Risk',          color: 'bg-red-500'    },
  ];
  return (
    <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Risk Distribution</span>
        <span className="text-xs text-muted-foreground">{total} records scored</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {segments.map(s => dist[s.key] > 0 && (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${pct(dist[s.key])}%` }}
            title={`${s.label}: ${dist[s.key]} (${pct(dist[s.key])}%)`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-xs font-semibold ml-auto">{dist[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Record row ────────────────────────────────────────────────────────────────

const RTYPE_META = {
  work_order:   { label: 'Work Order',   icon: ClipboardList, color: 'text-blue-400'   },
  violation:    { label: 'Violation',    icon: AlertTriangle, color: 'text-red-400'    },
  facility_log: { label: 'Facility Log', icon: Activity,      color: 'text-green-400'  },
};

function RecordRow({ r, expanded, onToggle }: { r: ScoredRecord; expanded: boolean; onToggle: () => void }) {
  const rt = RTYPE_META[r.record_type] || RTYPE_META.facility_log;
  const RIcon = rt.icon;
  const risk = RISK_META[r.integrity_risk_level] || RISK_META.red;

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <RIcon className={`w-4 h-4 shrink-0 ${rt.color}`} />
        <span className="text-sm font-medium flex-1 truncate">{r.record_title || r.record_sk}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${risk.bg} ${risk.border} ${risk.text}`}>
          {r.composite}
        </span>
        <span className={`text-xs hidden sm:inline ${risk.text}`}>{risk.label}</span>
        {r.capture_latency_hours !== null && (
          <span className="text-xs text-muted-foreground hidden md:inline">
            {r.capture_latency_hours < 1 ? '<1h' : `${Math.round(r.capture_latency_hours)}h`} lag
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-border/20 pt-3">
          {METRIC_META.map(m => (
            <div key={m.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={`text-xs font-semibold ${m.color}`}>{r[m.key]}</span>
              </div>
              <Progress value={r[m.key]} className="h-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────

const PRIORITY_STYLE = {
  high:   'bg-red-500/10 border-red-500/30 text-red-400',
  medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

function ActionCard({ a }: { a: RecommendedAction }) {
  return (
    <div className={`rounded-lg border p-4 space-y-1.5 ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.medium}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold">{a.action}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide font-bold opacity-70">{a.priority}</span>
      </div>
      <p className="text-xs opacity-80 leading-relaxed">{a.detail}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventIntegrity() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<IntegritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/event-integrity');
      setSummary(data as IntegritySummary);
    } catch { /* empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAudit = async () => {
    setRunning(true);
    try {
      const data = await apiRequest('/event-integrity/audit', { method: 'POST' });
      setSummary(data as IntegritySummary);
      toast({ title: 'Integrity Audit Complete', description: `${(data as IntegritySummary).records_scored} records scored.` });
    } catch (err: any) {
      toast({ title: 'Audit failed', description: err?.message || 'Try again', variant: 'destructive' });
    } finally { setRunning(false); }
  };

  const exportReport = () => {
    if (!summary) return;
    const s = summary.scores;
    const lines = [
      'NEXUM SUUM — EVENT-TO-RECORD INTEGRITY ENGINE™ REPORT',
      `Generated: ${new Date(summary.scored_at).toLocaleString()}`,
      `Records Scored: ${summary.records_scored} (${summary.data_points.work_orders} WOs, ${summary.data_points.violations} violations, ${summary.data_points.facility_logs} logs)`,
      `Average Capture Latency: ${summary.avg_capture_latency_hours !== null ? `${summary.avg_capture_latency_hours}h` : 'unknown'}`,
      '',
      '── INTEGRITY SCORES ─────────────────────────────────────────────────',
      `Overall Composite:           ${s.composite}/100`,
      `Event Integrity:             ${s.event_integrity}/100`,
      `Capture Latency:             ${s.capture_latency}/100`,
      `Evidence Completeness:       ${s.evidence_completeness}/100`,
      `Assumption Risk:             ${s.assumption_risk}/100`,
      `Documentation Confidence:    ${s.documentation_confidence}/100`,
      `Decision Defensibility:      ${s.decision_defensibility}/100`,
      '',
      `Overall Risk Level: ${summary.integrity_risk_level.toUpperCase()}`,
      '',
      '── RISK DISTRIBUTION ────────────────────────────────────────────────',
      `Green (High Integrity):      ${summary.risk_distribution.green} records`,
      `Yellow (Moderate):           ${summary.risk_distribution.yellow} records`,
      `Orange (Elevated Risk):      ${summary.risk_distribution.orange} records`,
      `Red (Significant Risk):      ${summary.risk_distribution.red} records`,
      '',
      '── RECOMMENDED ACTIONS ──────────────────────────────────────────────',
      ...summary.recommended_actions.map(a => `[${a.priority.toUpperCase()}] ${a.action}\n  ${a.detail}`),
      '',
      '── RECENT RECORDS ───────────────────────────────────────────────────',
      ...summary.recent_records.slice(0, 15).map(r =>
        `${r.record_type.replace(/_/g, ' ')} | ${r.record_title.slice(0, 50)} | Score: ${r.composite} | ${r.integrity_risk_level.toUpperCase()}${r.capture_latency_hours !== null ? ` | Lag: ${Math.round(r.capture_latency_hours)}h` : ''}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `event-integrity-report-${Date.now()}.txt`;
    a.click();
  };

  const scores = summary?.scores;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Event-to-Record Integrity Engine™</h1>
              <p className="text-sm text-muted-foreground">
                Measures fidelity of operational records across the Event → Decision integrity chain
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <Button variant="outline" size="sm" onClick={exportReport} className="gap-2">
                <Download className="w-4 h-4" /> Export
              </Button>
            )}
            <Button onClick={runAudit} disabled={running} className="gap-2">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {running ? 'Auditing…' : 'Run Integrity Audit'}
            </Button>
          </div>
        </div>

        {/* Last run */}
        {summary && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last audited {new Date(summary.scored_at).toLocaleString()}
            </span>
            <span>{summary.data_points.work_orders} work orders · {summary.data_points.violations} violations · {summary.data_points.facility_logs} logs</span>
            {summary.avg_capture_latency_hours !== null && (
              <span>Avg capture lag: <span className={summary.avg_capture_latency_hours > 24 ? 'text-orange-400 font-medium' : 'text-green-400 font-medium'}>{summary.avg_capture_latency_hours}h</span></span>
            )}
          </div>
        )}

        {/* Main scores row: composite gauge + 6 metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Composite gauge */}
          <div className="lg:col-span-1">
            {loading ? (
              <div className="h-64 rounded-xl bg-muted/20 animate-pulse" />
            ) : (
              <CompositeGauge
                score={scores?.composite ?? 0}
                riskLevel={summary?.integrity_risk_level ?? 'red'}
              />
            )}
          </div>

          {/* 6 metric cards */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {METRIC_META.map(m => {
              const val = scores?.[m.key] ?? 0;
              const Icon = m.icon;
              return (
                <div key={m.key} className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs font-medium text-muted-foreground leading-tight">{m.label}</span>
                  </div>
                  {loading ? (
                    <div className="h-7 w-16 rounded bg-muted/30 animate-pulse" />
                  ) : (
                    <>
                      <div className={`text-2xl font-bold ${m.color}`}>{val}</div>
                      <Progress value={val} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground leading-tight">{m.tip}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Signal chain */}
        {scores && !loading && <SignalChain scores={scores} />}

        {/* Risk distribution */}
        {summary && !loading && (
          <RiskDistributionBar
            dist={summary.risk_distribution}
            total={summary.records_scored}
          />
        )}

        {/* Recommended actions + recent records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recommended actions */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold">Recommended Actions</h2>
              {summary && (
                <Badge variant="secondary" className="ml-auto">{summary.recommended_actions.length}</Badge>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : !summary || summary.recommended_actions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No actions required — integrity is strong</p>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.recommended_actions.map((a, i) => (
                  <ActionCard key={i} a={a} />
                ))}
              </div>
            )}
          </div>

          {/* Recent records */}
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-semibold">Scored Records</h2>
              {summary && (
                <Badge variant="secondary" className="ml-auto">{summary.records_scored}</Badge>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : !summary || summary.recent_records.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No records scored yet</p>
                <p className="text-xs text-muted-foreground mt-1">Run an audit to score your operational records</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {summary.recent_records.map((r, i) => (
                  <RecordRow
                    key={`${r.record_type}-${r.record_sk}-${i}`}
                    r={r}
                    expanded={expandedRow === `${r.record_type}-${r.record_sk}`}
                    onToggle={() => setExpandedRow(prev =>
                      prev === `${r.record_type}-${r.record_sk}` ? null : `${r.record_type}-${r.record_sk}`
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty state CTA */}
        {!loading && !summary && (
          <div className="bg-card border border-border/40 rounded-xl p-10 text-center space-y-4">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Integrity Audit Run Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Run your first audit to score every work order, violation, and facility log against
                the six integrity dimensions. The engine identifies where your records are most
                vulnerable to information loss, assumption creation, and documentation gaps.
              </p>
            </div>
            <Button onClick={runAudit} disabled={running} className="gap-2">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {running ? 'Auditing…' : 'Run First Integrity Audit'}
            </Button>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
