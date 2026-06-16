import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, AlertTriangle, Activity, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedEntry = {
  id: string;
  type: 'observation' | 'violation' | 'log';
  title: string;
  detail?: string;
  timestamp: string;
};

const TYPE_META = {
  observation: { icon: BookOpen,      color: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    label: 'Observation' },
  violation:   { icon: AlertTriangle, color: 'text-red-400',    badge: 'bg-red-500/20 text-red-400 border-red-500/30',       label: 'Violation'   },
  log:         { icon: Activity,      color: 'text-green-400',  badge: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Data Log'    },
};

function formatTs(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  accentColor?: string;
}

export function EmployeeActivityFeed({ accentColor = 'text-primary' }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const base = import.meta.env.VITE_API_BASE_URL;

    try {
      const [obsRes, violRes, logRes] = await Promise.allSettled([
        fetch(`${base}/facility-logs?type=observation&limit=30`, { headers }),
        fetch(`${base}/violations?limit=30`, { headers }),
        fetch(`${base}/facility-logs?limit=30`, { headers }),
      ]);

      const collected: FeedEntry[] = [];

      if (obsRes.status === 'fulfilled' && obsRes.value.ok) {
        const data = await obsRes.value.json();
        const items = data.logs ?? data.observations ?? data.items ?? [];
        items.forEach((item: any) => {
          collected.push({
            id:        item.logId || item.observationId || item.SK || String(Math.random()),
            type:      'observation',
            title:     item.title || item.type || 'Observation logged',
            detail:    item.notes || item.description,
            timestamp: item.timestamp || item.createdAt || item.dateLogged || new Date().toISOString(),
          });
        });
      }

      if (violRes.status === 'fulfilled' && violRes.value.ok) {
        const data = await violRes.value.json();
        const items = data.violations ?? data.items ?? [];
        items.forEach((item: any) => {
          collected.push({
            id:        item.violationId || item.SK || String(Math.random()),
            type:      'violation',
            title:     item.violationType || item.title || 'Violation reported',
            detail:    item.description,
            timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
          });
        });
      }

      if (logRes.status === 'fulfilled' && logRes.value.ok) {
        const data = await logRes.value.json();
        const items = (data.logs ?? data.items ?? []).filter((i: any) => i.type !== 'observation');
        items.forEach((item: any) => {
          collected.push({
            id:        item.logId || item.SK || String(Math.random()),
            type:      'log',
            title:     item.equipmentName || item.equipment || item.title || 'Data entry logged',
            detail:    item.type || item.logType,
            timestamp: item.timestamp || item.createdAt || item.dateLogged || new Date().toISOString(),
          });
        });
      }

      if (collected.length === 0 && (
        obsRes.status === 'rejected' && violRes.status === 'rejected' && logRes.status === 'rejected'
      )) {
        setError('Unable to connect to the server. Check back later.');
      }

      collected.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(collected.slice(0, 50));
    } catch (err: any) {
      setError('Failed to load activity history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  return (
    <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2', accentColor)}>
            <Lock className="w-4 h-4" />
            My Activity History
            <span className="text-xs font-normal text-muted-foreground">(immutable record)</span>
          </CardTitle>
          <button
            onClick={fetchFeed}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Read-only chronological log of all entries you have submitted to the system.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <Activity className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No activity found yet.</p>
            <p className="text-xs text-muted-foreground/60">Entries will appear here as you log observations, violations, and data.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/40" />
            <div className="space-y-3">
              {entries.map((entry) => {
                const meta = TYPE_META[entry.type];
                const Icon = meta.icon;
                return (
                  <div key={entry.id} className="flex gap-3 relative">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10', 'bg-card border border-border/60')}>
                      <Icon className={cn('w-4 h-4', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{entry.title}</p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.detail}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', meta.badge)}>
                            {meta.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatTs(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
