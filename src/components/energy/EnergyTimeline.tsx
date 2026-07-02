import { useMemo } from 'react';
import { buildTimeline } from '@/lib/energy-engine';
import type { TimelineEntry } from '@/types/energy';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Zap, Droplets, Flame, Activity, ShieldCheck,
  AlertTriangle, Wrench, Eye, Radio, Clock,
} from 'lucide-react';

const SOURCE_META: Record<TimelineEntry['source'], { label: string; icon: any; color: string }> = {
  meter_reading:  { label: 'Meter Reading',    icon: Activity,     color: 'text-[#00FFE1]' },
  energy_event:   { label: 'Energy Event',     icon: Zap,          color: 'text-yellow-400' },
  maintenance:    { label: 'Maintenance',      icon: Wrench,       color: 'text-blue-400' },
  violation:      { label: 'Violation',        icon: AlertTriangle,color: 'text-red-400' },
  observation:    { label: 'Observation',      icon: Eye,          color: 'text-purple-400' },
  climate:        { label: 'Climate',          icon: Flame,        color: 'text-orange-400' },
  water_chemistry:{ label: 'Water Chemistry',  icon: Droplets,     color: 'text-cyan-400' },
  compliance:     { label: 'Compliance',       icon: ShieldCheck,  color: 'text-green-400' },
  bms:            { label: 'BMS',              icon: Radio,        color: 'text-indigo-400' },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/5',
  warning:  'border-yellow-500/40 bg-yellow-500/5',
  info:     'border-white/10 bg-white/2',
  success:  'border-green-500/40 bg-green-500/5',
};

interface Props {
  facilityId: string;
  filterSource?: TimelineEntry['source'] | 'all';
  maxItems?: number;
}

export function EnergyTimeline({ facilityId, filterSource = 'all', maxItems = 100 }: Props) {
  const entries = useMemo(() => {
    const all = buildTimeline(facilityId);
    const filtered = filterSource === 'all' ? all : all.filter(e => e.source === filterSource);
    return filtered.slice(0, maxItems);
  }, [facilityId, filterSource, maxItems]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
        No timeline entries yet. Log your first meter reading to begin building operational history.
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, TimelineEntry[]> = {};
  entries.forEach(e => {
    const label = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{date}</div>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="space-y-2 ml-4 border-l border-white/10 pl-4">
            {items.map(entry => {
              const meta = SOURCE_META[entry.source];
              const Icon = meta.icon;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'relative rounded-lg border p-3 transition-all',
                    SEVERITY_STYLES[entry.severity],
                  )}
                >
                  {/* connector dot */}
                  <div className={cn('absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full border-2 border-background',
                    entry.severity === 'critical' ? 'bg-red-500' :
                    entry.severity === 'warning'  ? 'bg-yellow-500' :
                    entry.severity === 'success'  ? 'bg-green-500' : 'bg-white/30'
                  )} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', meta.color)} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{entry.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', meta.color, 'border-current/30')}>
                        {meta.label}
                      </Badge>
                      {entry.financialImpact !== undefined && entry.financialImpact > 0 && (
                        <span className="text-[10px] text-yellow-400 font-medium">
                          ${entry.financialImpact.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
