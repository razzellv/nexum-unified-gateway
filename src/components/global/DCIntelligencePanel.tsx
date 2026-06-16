// Decision Continuity™ Intelligence Panel
// Self-gating: only renders for leadership roles with dc_vault tier access.
// Admin always sees full data. Staff roles see nothing (null).

import { Shield, Link, TrendingUp, AlertTriangle, ArrowRight, Loader2, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDCIntelligence, type UseDCIntelligenceOptions } from '@/lib/dc-intelligence';
import { useTier } from '@/hooks/useTier';
import { cn } from '@/lib/utils';

interface Props extends UseDCIntelligenceOptions {
  /** Show compact single-row mode (for KPI strips) */
  compact?: boolean;
  className?: string;
}

function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round(Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden w-full">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreCell({ label, value, color, unit = '%' }: { label: string; value: number | null; color: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className={cn('text-lg font-bold', color)}>
        {value == null ? '—' : `${value}${unit}`}
      </span>
      {value != null && <MiniBar value={value} color={color.replace('text-', 'bg-')} />}
    </div>
  );
}

export function DCIntelligencePanel({ compact, className, ...options }: Props) {
  const navigate = useNavigate();
  const { can } = useTier();
  const { stats, chains, loading, error, accessDenied, refresh } = useDCIntelligence(options);

  // ── Access denied: non-leadership or below premium tier ──────────────────────
  if (accessDenied) {
    if (compact) return null; // Don't clutter KPI strips
    // Full panel: show upgrade prompt if they have role but lack tier
    if (can('system_violations')) {
      // Has business tier (system_violations) but not premium (dc_vault)
      return (
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border border-violet-500/20 bg-violet-500/5', className)}>
          <Lock className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-300">Decision Continuity™ Vault</p>
            <p className="text-xs text-muted-foreground">Upgrade to Premium to unlock immutable decision chains &amp; KPS intelligence.</p>
          </div>
          <Button size="sm" variant="outline" className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 shrink-0"
            onClick={() => navigate('/pricing')}>
            Upgrade
          </Button>
        </div>
      );
    }
    // Below business or not leadership — hide entirely
    return null;
  }

  if (compact) {
    // ── KPI-grid-friendly single row ──────────────────────────────────────────
    return (
      <div
        className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border border-violet-500/20 bg-violet-500/5 cursor-pointer hover:bg-violet-500/10 transition-colors', className)}
        onClick={() => navigate('/dc-vault')}
        role="button"
      >
        <Shield className="w-4 h-4 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">DC Vault™</p>
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin text-violet-400 mt-0.5" />
          ) : (
            <p className="text-sm font-semibold text-violet-300">
              {stats
                ? `KPS ${stats.avgKPS ?? '—'}% · ${stats.activeChains} active`
                : 'No chains yet'}
            </p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────────────
  return (
    <Card className={cn('neon-border border-violet-500/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="w-4 h-4 text-violet-400" />
            Decision Continuity™ Vault
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-6 text-xs text-violet-400 hover:text-violet-300 px-2"
              onClick={() => navigate('/dc-vault')}
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !stats && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading DC intelligence…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* ── Metric grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ScoreCell label="Avg KPS™"          value={stats.avgKPS}           color="text-violet-400" />
              <ScoreCell label="Admissibility"     value={stats.admissibilityRate} color="text-emerald-400" />
              <ScoreCell label="Decision Accuracy" value={stats.avgDAR}            color="text-blue-400" />
              <ScoreCell label="Active Chains"     value={stats.activeChains}      color="text-amber-400" unit="" />
            </div>

            {/* ── Chain count badges ── */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="border-violet-500/40 text-violet-300">
                <Link className="w-3 h-3 mr-1" />
                {stats.totalChains} total chains
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                {stats.completeChains} complete
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-300">
                {stats.totalSignals} signals
              </Badge>
            </div>
          </>
        )}

        {/* ── Recent chains ── */}
        {chains.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            <p className="text-xs text-muted-foreground font-medium">Recent chains</p>
            {chains.slice(0, 4).map(chain => {
              const kps = chain.metrics?.knowledgePreservationScore;
              return (
                <div
                  key={chain.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => navigate('/dc-vault')}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs truncate flex-1 text-foreground/80 group-hover:text-foreground transition-colors">
                    {chain.title}
                  </span>
                  {kps != null && (
                    <span className={cn('text-xs font-mono shrink-0',
                      kps >= 70 ? 'text-emerald-400' : kps >= 40 ? 'text-amber-400' : 'text-red-400')}>
                      {kps}%
                    </span>
                  )}
                  <Badge variant="outline" className={cn('text-xs h-4 px-1 shrink-0',
                    chain.status === 'active'   ? 'border-blue-500/40 text-blue-300' :
                    chain.status === 'complete' ? 'border-emerald-500/40 text-emerald-300' :
                    'border-muted text-muted-foreground')}>
                    {chain.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && !stats && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No decision chains recorded yet.{' '}
            <button className="text-violet-400 underline" onClick={() => navigate('/dc-vault')}>
              Open DC Vault
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
