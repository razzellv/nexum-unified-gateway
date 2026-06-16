// Scope & Deliverables Intelligence™ Panel
// Answers: "Are we still solving the right problem, and how close are we?"
//
// Computes from live DC chain data:
//  • Scope Alignment Score™  — % of chains progressing as expected
//  • Cause Proximity™         — how close current evidence is to confirming root cause
//  • Deviation Signals        — chains where observations drifted from probable cause
//  • Deliverables At Risk     — chains stalled without execution or outcome

import { useMemo } from 'react';
import { Target, AlertTriangle, CheckCircle2, Clock, ArrowRight, TrendingDown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useDCIntelligence, type UseDCIntelligenceOptions, type DCChainSummary } from '@/lib/dc-intelligence';
import { cn } from '@/lib/utils';

interface Props extends UseDCIntelligenceOptions {
  className?: string;
  /** Show in compact 2-metric mode for dashboards with less space */
  compact?: boolean;
}

// ── Scoring helpers ────────────────────────────────────────────────────────────

interface AlignmentAnalysis {
  scopeAlignmentScore: number;
  causeProximityLabel: 'Confirmed' | 'Progressing' | 'Investigating' | 'Drifted' | 'Stalled';
  causeProximityColor: string;
  deviationChains: DCChainSummary[];   // chains stuck/drifted from probable cause
  stalledChains: DCChainSummary[];     // chains with only observation (no execution)
  closedChains: DCChainSummary[];      // chains with confirmed outcomes
  atRiskCount: number;
  insightLine: string;
}

function analyzeChains(chains: DCChainSummary[]): AlignmentAnalysis {
  if (chains.length === 0) {
    return {
      scopeAlignmentScore: 100,
      causeProximityLabel: 'Investigating',
      causeProximityColor: 'text-blue-400',
      deviationChains: [],
      stalledChains: [],
      closedChains: [],
      atRiskCount: 0,
      insightLine: 'No decision chains recorded yet. Start by logging observations.',
    };
  }

  const now = Date.now();

  // Stalled: active chains with only 0-1 signals and created > 3 days ago
  const stalledChains = chains.filter(c => {
    if (c.status !== 'active') return false;
    const age = (now - new Date(c.createdAt).getTime()) / 86400000;
    const signals = c.signalCount ?? 0;
    return age > 3 && signals <= 1;
  });

  // Deviation: chains where repeat-failure risk is high (same problem recurring)
  const deviationChains = chains.filter(c =>
    (c.metrics?.repeatFailureRisk ?? 0) >= 50 ||
    (c.metrics?.knowledgePreservationScore ?? 100) < 35
  );

  // Closed/confirmed: complete chains with outcome signal
  const closedChains = chains.filter(c => c.status === 'complete');

  // Alignment score: start at 100, deduct for problems
  let score = 100;
  score -= stalledChains.length * 12;
  score -= deviationChains.length * 15;

  // Bonus: chains with high KPS are well-governed
  const highKPS = chains.filter(c => (c.metrics?.knowledgePreservationScore ?? 0) >= 70).length;
  score += highKPS * 5;

  // Clamp 0–100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Cause proximity
  const avgKPS = chains.length > 0
    ? Math.round(chains.reduce((sum, c) => sum + (c.metrics?.knowledgePreservationScore ?? 0), 0) / chains.length)
    : 0;
  const avgDAR = chains
    .map(c => c.metrics?.decisionAccuracyRate)
    .filter((v): v is number => v != null);

  let causeProximityLabel: AlignmentAnalysis['causeProximityLabel'];
  let causeProximityColor: string;

  if (deviationChains.length >= 2 || score < 40) {
    causeProximityLabel = 'Drifted';
    causeProximityColor = 'text-red-400';
  } else if (stalledChains.length >= chains.length * 0.5) {
    causeProximityLabel = 'Stalled';
    causeProximityColor = 'text-orange-400';
  } else if (avgDAR.length > 0 && avgDAR.reduce((a, b) => a + b, 0) / avgDAR.length >= 70) {
    causeProximityLabel = 'Confirmed';
    causeProximityColor = 'text-emerald-400';
  } else if (avgKPS >= 50) {
    causeProximityLabel = 'Progressing';
    causeProximityColor = 'text-blue-400';
  } else {
    causeProximityLabel = 'Investigating';
    causeProximityColor = 'text-amber-400';
  }

  // Insight line
  let insightLine = '';
  if (deviationChains.length > 0) {
    insightLine = `${deviationChains.length} chain${deviationChains.length > 1 ? 's' : ''} show cause drift — observations may have moved away from the probable root cause.`;
  } else if (stalledChains.length > 0) {
    insightLine = `${stalledChains.length} investigation${stalledChains.length > 1 ? 's' : ''} stalled without execution — assign work orders to advance these chains.`;
  } else if (closedChains.length > 0 && score >= 75) {
    insightLine = `${closedChains.length} chain${closedChains.length > 1 ? 's' : ''} confirmed and closed. Current scope is well-aligned.`;
  } else {
    insightLine = `Scope alignment is ${score >= 80 ? 'strong' : 'moderate'}. Continue documenting assessment and authorization signals.`;
  }

  return {
    scopeAlignmentScore: score,
    causeProximityLabel,
    causeProximityColor,
    deviationChains: deviationChains.slice(0, 3),
    stalledChains: stalledChains.slice(0, 3),
    closedChains: closedChains.slice(0, 2),
    atRiskCount: stalledChains.length + deviationChains.length,
    insightLine,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScopeAlignmentPanel({ compact, className, ...options }: Props) {
  const navigate = useNavigate();
  const { stats, chains, loading, accessDenied } = useDCIntelligence({
    ...options,
    limit: options.limit ?? 15,
  });

  const analysis = useMemo(() => analyzeChains(chains), [chains]);

  // Don't render for staff or non-tier users — same gate as DC panel
  if (accessDenied) return null;

  const scoreColor =
    analysis.scopeAlignmentScore >= 80 ? 'text-emerald-400' :
    analysis.scopeAlignmentScore >= 55 ? 'text-amber-400' :
    'text-red-400';

  const barColor =
    analysis.scopeAlignmentScore >= 80 ? 'bg-emerald-400' :
    analysis.scopeAlignmentScore >= 55 ? 'bg-amber-400' :
    'bg-red-400';

  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors', className)}
        onClick={() => navigate('/dc-vault')}
        role="button"
      >
        <Target className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Scope Alignment™</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <p className={cn('text-sm font-semibold', scoreColor)}>
              {analysis.scopeAlignmentScore}% · {analysis.causeProximityLabel}
            </p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={cn('neon-border border-blue-500/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Target className="w-4 h-4 text-blue-400" />
            Scope &amp; Deliverables Intelligence™
          </CardTitle>
          <button
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            onClick={() => navigate('/dc-vault')}
          >
            DC Vault <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && chains.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Analyzing chains…</div>
        ) : (
          <>
            {/* ── Top metric row ── */}
            <div className="grid grid-cols-3 gap-3">
              {/* Scope Alignment Score */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Scope Alignment™</span>
                <span className={cn('text-2xl font-bold', scoreColor)}>
                  {analysis.scopeAlignmentScore}%
                </span>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', barColor)}
                    style={{ width: `${analysis.scopeAlignmentScore}%` }} />
                </div>
              </div>

              {/* Cause Proximity */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Cause Proximity™</span>
                <span className={cn('text-lg font-semibold', analysis.causeProximityColor)}>
                  {analysis.causeProximityLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stats ? `${stats.totalChains} total chains` : '—'}
                </span>
              </div>

              {/* At Risk */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Deliverables At Risk</span>
                <span className={cn('text-2xl font-bold', analysis.atRiskCount > 0 ? 'text-orange-400' : 'text-emerald-400')}>
                  {analysis.atRiskCount}
                </span>
                <span className="text-xs text-muted-foreground">chains need action</span>
              </div>
            </div>

            {/* ── Insight line ── */}
            <div className={cn(
              'flex items-start gap-2 px-3 py-2 rounded-lg text-xs border',
              analysis.atRiskCount > 0
                ? 'bg-amber-500/8 border-amber-500/20 text-amber-300'
                : 'bg-blue-500/8 border-blue-500/20 text-blue-300'
            )}>
              {analysis.atRiskCount > 0
                ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                : <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
              }
              <span>{analysis.insightLine}</span>
            </div>

            {/* ── Deviation chains ── */}
            {analysis.deviationChains.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  Cause drift detected
                </p>
                {analysis.deviationChains.map(c => (
                  <div key={c.id} onClick={() => navigate('/dc-vault')}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-red-500/20 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-xs truncate flex-1">{c.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-500/40 text-red-300 shrink-0">
                      {(c.metrics?.repeatFailureRisk ?? 0) >= 50 ? 'Repeat risk' : 'Low KPS'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* ── Stalled chains ── */}
            {analysis.stalledChains.length > 0 && analysis.deviationChains.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  Stalled investigations
                </p>
                {analysis.stalledChains.map(c => (
                  <div key={c.id} onClick={() => navigate('/dc-vault')}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-orange-500/20 bg-orange-500/5 cursor-pointer hover:bg-orange-500/10 transition-colors">
                    <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className="text-xs truncate flex-1">{c.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-500/40 text-orange-300 shrink-0">
                      {c.signalCount ?? 0} signal{c.signalCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* ── Confirmed/closed chains ── */}
            {analysis.closedChains.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Root cause confirmed
                </p>
                {analysis.closedChains.map(c => (
                  <div key={c.id} onClick={() => navigate('/dc-vault')}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-xs truncate flex-1">{c.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-emerald-500/40 text-emerald-300 shrink-0">
                      KPS {c.metrics?.knowledgePreservationScore ?? '?'}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
