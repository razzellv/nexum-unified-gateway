/**
 * ContinuityWidget — compact Continuity Intelligence™ score card for embedding
 * in Executive Dashboard, Manager Dashboard, OCCAE, and Operational Intelligence.
 *
 * Usage:
 *   <ContinuityWidget />                 — auto-loads from localStorage cache
 *   <ContinuityWidget compact />         — slim inline strip
 *   <ContinuityWidget embedded />        — no Card wrapper
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { calcFullScore, EMPTY_RECORD, SECTOR_OUTPUT_LABEL, type ContinuityHealth } from '@/config/continuity';
import type { ContinuityRecord } from '@/config/continuity';

interface ContinuityWidgetProps {
  facilityId?: string;
  compact?: boolean;
  embedded?: boolean;
}

const HEALTH_CONFIG: Record<ContinuityHealth, { color: string; bg: string; border: string; icon: typeof Shield; label: string }> = {
  Strong:   { color: 'text-green-400',  bg: 'bg-green-50 dark:bg-green-950/40',   border: 'border-green-200 dark:border-green-600/40',  icon: CheckCircle2,  label: 'Strong'   },
  Moderate: { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-600/40', icon: AlertTriangle, label: 'Moderate' },
  'At Risk':{ color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-600/40', icon: AlertTriangle, label: 'At Risk'  },
  Critical: { color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40',       border: 'border-red-200 dark:border-red-600/40',       icon: XCircle,       label: 'Critical' },
};

function loadFromCache(facilityId?: string): ContinuityRecord | null {
  try {
    const raw = localStorage.getItem(`nexum_continuity_${facilityId || 'default'}`);
    if (!raw) return null;
    return JSON.parse(raw) as ContinuityRecord;
  } catch {
    return null;
  }
}

export function ContinuityWidget({ facilityId, compact = false, embedded = false }: ContinuityWidgetProps) {
  const record = useMemo(() => loadFromCache(facilityId) || EMPTY_RECORD(facilityId || 'default'), [facilityId]);
  const result = useMemo(() => calcFullScore(record), [record]);
  const hasData = result.globalScore > 0;

  if (!hasData) {
    if (compact) {
      return (
        <Link to="/continuity-intelligence" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Shield className="h-3.5 w-3.5" />
          <span>Continuity Intelligence not yet configured</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      );
    }
    const inner = (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
        <Shield className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No continuity scores yet</p>
        <Link to="/continuity-intelligence" className="text-xs text-primary hover:underline">
          Configure Continuity Intelligence™ →
        </Link>
      </div>
    );
    if (embedded) return inner;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" /> Continuity Intelligence™
          </CardTitle>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    );
  }

  const cfg = HEALTH_CONFIG[result.health];
  const HealthIcon = cfg.icon;

  if (compact) {
    return (
      <Link to="/continuity-intelligence" className="flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-muted/30 transition-colors text-xs">
        <HealthIcon className={cn('h-4 w-4 shrink-0', cfg.color)} />
        <span className="font-medium text-foreground">Continuity</span>
        <div className="flex-1 mx-1">
          <Progress value={result.globalScore} className="h-1.5" />
        </div>
        <span className="font-semibold font-mono">{result.globalScore}/100</span>
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', cfg.color)}>{cfg.label}</Badge>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </Link>
    );
  }

  const body = (
    <div className="space-y-4">
      {/* Score + health */}
      <div className={cn('flex items-center gap-3 rounded-lg border p-3', cfg.bg, cfg.border)}>
        <HealthIcon className={cn('h-6 w-6 shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-bold font-mono', cfg.color)}>{result.globalScore}</span>
            <span className="text-xs text-muted-foreground">/100 global continuity score</span>
          </div>
          <Progress value={result.globalScore} className="h-1.5 mt-1" />
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-xs', cfg.color)}>{cfg.label}</Badge>
      </div>

      {/* 5 components */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {(['knowledge', 'workforce', 'operational', 'decision', 'data'] as const).map(key => {
          const s = result.components[key];
          const h = s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'At Risk' : 'Critical';
          const c = HEALTH_CONFIG[h];
          const labels = { knowledge: 'Know.', workforce: 'Work.', operational: 'Ops', decision: 'Dec.', data: 'Data' };
          return (
            <div key={key} className={cn('rounded border p-1.5', s > 0 ? c.bg : '')}>
              <p className="text-[10px] text-muted-foreground">{labels[key]}</p>
              <p className={cn('text-sm font-bold font-mono', s > 0 ? c.color : 'text-muted-foreground')}>{s > 0 ? s : '—'}</p>
            </div>
          );
        })}
      </div>

      {/* Sector score if available */}
      {result.sectorScore !== result.globalScore && result.sectorScore > 0 && (
        <div className="text-xs flex items-center justify-between border-t pt-2 text-muted-foreground">
          <span>{SECTOR_OUTPUT_LABEL[record.sector]}</span>
          <span className={cn('font-mono font-bold', HEALTH_CONFIG[result.sectorHealth].color)}>{result.sectorScore}/100</span>
        </div>
      )}

      {/* Forecast strip */}
      {hasData && (
        <div className="grid grid-cols-3 gap-1.5 text-center text-xs border-t pt-3">
          {[
            { label: 'Optimistic',  score: result.forecast.optimistic.score,  cls: 'text-green-400' },
            { label: 'Most Likely', score: result.forecast.mostLikely.score,  cls: 'text-foreground' },
            { label: 'Pessimistic', score: result.forecast.pessimistic.score, cls: 'text-red-400' },
          ].map(({ label, score, cls }) => (
            <div key={label}>
              <p className="text-muted-foreground">{label}</p>
              <p className={cn('font-bold font-mono', cls)}>{score}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end text-xs border-t pt-2">
        <Link to="/continuity-intelligence" className="flex items-center gap-1 text-primary hover:underline font-medium">
          Full Report <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );

  if (embedded) return body;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Continuity Intelligence™
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export default ContinuityWidget;
