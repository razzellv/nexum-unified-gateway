/**
 * EVMWidget — compact Earned Value Management card for embedding in dashboards,
 * Work Orders, Executive Dashboard, and Settings panels.
 *
 * Usage:
 *   <EVMWidget bac={80000} pv={45000} ev={40000} ac={42000} projectName="HVAC 2026" />
 *   <EVMWidget compact /> — tiny inline strip
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { calcEVM } from '@/pages/ProjectControls';

export type ProjectHealth = 'green' | 'yellow' | 'red';

export interface EVMWidgetProps {
  projectId?: string;
  projectName?: string;
  bac?: number;
  pv?: number;
  ev?: number;
  ac?: number;
  /** Render as a slim inline strip */
  compact?: boolean;
  /** Show inside another card (suppresses Card wrapper) */
  embedded?: boolean;
}

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtIdx = (n: number) => n.toFixed(3);

const healthBadgeCls: Record<ProjectHealth, string> = {
  green:  'bg-green-600 text-white',
  yellow: 'bg-yellow-600 text-white',
  red:    'bg-red-600 text-white',
};

function loadFromCache(facilityId?: string): { bac: number; pv: number; ev: number; ac: number; name: string } | null {
  const fid = facilityId || localStorage.getItem('nexum_active_facility_id') || 'facility-001';
  const cached = localStorage.getItem(`nexum_pc_${fid}`);
  if (!cached) return null;
  try {
    const projects = JSON.parse(cached);
    const lastId = localStorage.getItem('nexum_active_project_id');
    const p = (lastId ? projects.find((x: any) => x.projectId === lastId) : null) || projects[0];
    return p ? { bac: p.bac, pv: p.pv, ev: p.ev, ac: p.ac, name: p.projectName } : null;
  } catch { return null; }
}

export function EVMWidget({ projectId, projectName, bac, pv, ev, ac, compact = false, embedded = false }: EVMWidgetProps) {
  // Fall back to localStorage cache when no props provided
  const cache = useMemo(() => (bac === undefined ? loadFromCache() : null), [bac]);

  const B = bac ?? cache?.bac ?? 0;
  const P = pv  ?? cache?.pv  ?? 0;
  const E = ev  ?? cache?.ev  ?? 0;
  const A = ac  ?? cache?.ac  ?? 0;
  const name = projectName || cache?.name || 'Active Project';

  const evm = useMemo(() => calcEVM(B, P, E, A), [B, P, E, A]);
  const to  = `/project-controls${projectId ? `?projectId=${projectId}` : ''}`;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
        <Target className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono">
              SPI&nbsp;<span className={cn('font-bold', evm.spi >= 0.95 ? 'text-green-400' : evm.spi >= 0.80 ? 'text-yellow-400' : 'text-red-400')}>{fmtIdx(evm.spi)}</span>
            </span>
            <span className="text-xs font-mono">
              CPI&nbsp;<span className={cn('font-bold', evm.cpi >= 0.95 ? 'text-green-400' : evm.cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400')}>{fmtIdx(evm.cpi)}</span>
            </span>
          </div>
        </div>
        <Badge className={cn('text-xs shrink-0', healthBadgeCls[evm.health])}>{evm.health.toUpperCase()}</Badge>
        <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const inner = (
    <>
      {/* Indices */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'SPI', val: fmtIdx(evm.spi), clr: evm.spi >= 0.95 ? 'text-green-400' : evm.spi >= 0.80 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'CPI', val: fmtIdx(evm.cpi), clr: evm.cpi >= 0.95 ? 'text-green-400' : evm.cpi >= 0.80 ? 'text-yellow-400' : 'text-red-400' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="p-2.5 rounded-lg bg-muted/30 text-center border border-border/30">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-xl font-bold font-mono mt-0.5', clr)}>{val}</p>
          </div>
        ))}
      </div>

      {/* Variances */}
      <div className="space-y-2">
        {[
          { label: 'SV — Schedule', val: evm.sv, icon: evm.sv >= 0 ? TrendingUp : TrendingDown },
          { label: 'CV — Cost',     val: evm.cv, icon: evm.cv >= 0 ? TrendingUp : TrendingDown },
        ].map(({ label, val, icon: Icon }) => (
          <div key={label} className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Icon className="w-3 h-3" /> {label}
            </span>
            <span className={cn('font-mono font-semibold', val >= 0 ? 'text-green-400' : 'text-red-400')}>
              {val >= 0 ? '+' : ''}{fmt$(val)}
            </span>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Planned</span><span className="font-mono">{B > 0 ? `${((P / B) * 100).toFixed(0)}%` : '—'}</span>
        </div>
        <Progress value={B > 0 ? (P / B) * 100 : 0} className="h-1" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Earned</span><span className="font-mono">{B > 0 ? `${((E / B) * 100).toFixed(0)}%` : '—'}</span>
        </div>
        <Progress value={B > 0 ? (E / B) * 100 : 0} className="h-1" />
      </div>

      {/* Budget */}
      <div className="mt-3 flex justify-between text-xs border-t border-border/30 pt-2.5">
        <span className="text-muted-foreground">BAC</span>
        <span className="font-mono text-foreground">{fmt$(B)}</span>
      </div>
    </>
  );

  if (embedded) return <div className="space-y-3">{inner}</div>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Project Controls
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', healthBadgeCls[evm.health])}>{evm.health.toUpperCase()}</Badge>
            <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
              View Full <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{name}</p>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
