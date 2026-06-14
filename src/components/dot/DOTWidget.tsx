/**
 * DOTWidget — compact Decision Outcome Tracking™ summary card for embedding
 * in Executive Dashboard, Manager Dashboard, OCCAE, and Operational Intelligence.
 *
 * Usage:
 *   <DOTWidget />                        — auto-loads from localStorage cache
 *   <DOTWidget compact />                — slim inline strip
 *   <DOTWidget embedded />               — no Card wrapper
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  ClipboardList, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { calcDOTPerformance } from '@/pages/DecisionOutcomeTracking';
import type { DOTRecord } from '@/pages/DecisionOutcomeTracking';

interface DOTWidgetProps {
  facilityId?: string;
  /** Render as slim inline strip */
  compact?: boolean;
  /** Suppress Card wrapper when embedded inside another card */
  embedded?: boolean;
}

function loadFromCache(facilityId?: string): DOTRecord[] {
  try {
    const key = `nexum_dot_${facilityId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as DOTRecord[];
  } catch {
    return [];
  }
}

const HEALTH_CONFIG = {
  Green:  { color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle2,   label: 'On Track'  },
  Yellow: { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle,  label: 'At Risk'   },
  Red:    { color: 'text-red-600',    bg: 'bg-red-50 border-red-200',      icon: XCircle,        label: 'Critical'  },
};

export function DOTWidget({ facilityId, compact = false, embedded = false }: DOTWidgetProps) {
  const records = useMemo(() => loadFromCache(facilityId), [facilityId]);

  const portfolio = useMemo(() => {
    if (records.length === 0) return null;
    const perfs = records.map(r => calcDOTPerformance(r));
    const avgScore     = Math.round(perfs.reduce((s, p) => s + p.overallScore, 0) / perfs.length);
    const green        = perfs.filter(p => p.health === 'Green').length;
    const yellow       = perfs.filter(p => p.health === 'Yellow').length;
    const red          = perfs.filter(p => p.health === 'Red').length;
    const health       = red > 0 ? 'Red' : yellow > 0 ? 'Yellow' : 'Green';
    const openCount    = records.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
    const completedCount = records.filter(r => r.status === 'Completed').length;
    return { avgScore, green, yellow, red, health, openCount, completedCount, total: records.length };
  }, [records]);

  if (records.length === 0) {
    if (compact) {
      return (
        <Link to="/decision-outcomes" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ClipboardList className="h-3.5 w-3.5" />
          <span>No decisions tracked yet</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      );
    }
    const inner = (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No decisions tracked yet</p>
        <Link to="/decision-outcomes" className="text-xs text-primary hover:underline">
          Start tracking decisions →
        </Link>
      </div>
    );
    if (embedded) return inner;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Decision Outcome Tracking™
          </CardTitle>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    );
  }

  if (!portfolio) return null;

  const cfg = HEALTH_CONFIG[portfolio.health];
  const HealthIcon = cfg.icon;

  // ── Compact strip ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <Link
        to="/decision-outcomes"
        className="flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-muted/30 transition-colors text-xs"
      >
        <HealthIcon className={cn('h-4 w-4 shrink-0', cfg.color)} />
        <span className="font-medium text-foreground">Decisions</span>
        <span className="text-muted-foreground">{portfolio.total} tracked</span>
        <Badge
          variant="outline"
          className={cn('ml-auto text-[10px] px-1.5 py-0', cfg.color)}
        >
          {cfg.label}
        </Badge>
        <span className="font-semibold">{portfolio.avgScore}/100</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </Link>
    );
  }

  // ── Full card body ───────────────────────────────────────────────────────────
  const body = (
    <div className="space-y-4">
      {/* Overall score + health */}
      <div className={cn('flex items-center gap-3 rounded-lg border p-3', cfg.bg)}>
        <HealthIcon className={cn('h-6 w-6 shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-bold', cfg.color)}>{portfolio.avgScore}</span>
            <span className="text-xs text-muted-foreground">/100 avg outcome score</span>
          </div>
          <Progress value={portfolio.avgScore} className="h-1.5 mt-1" />
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-xs', cfg.color)}>
          {cfg.label}
        </Badge>
      </div>

      {/* Health breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-green-50 border border-green-200 p-2">
          <div className="text-lg font-bold text-green-700">{portfolio.green}</div>
          <div className="text-[10px] text-green-600">On Track</div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
          <div className="text-lg font-bold text-amber-700">{portfolio.yellow}</div>
          <div className="text-[10px] text-amber-600">At Risk</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-2">
          <div className="text-lg font-bold text-red-700">{portfolio.red}</div>
          <div className="text-[10px] text-red-600">Critical</div>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {portfolio.openCount} active · {portfolio.completedCount} completed
        </span>
        <Link
          to="/decision-outcomes"
          className="flex items-center gap-1 text-primary hover:underline font-medium"
        >
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Decision Outcome Tracking™
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export default DOTWidget;
