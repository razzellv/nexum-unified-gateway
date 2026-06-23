import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Signal {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  system: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  value?: number;
  threshold?: number;
  source?: string;
}

function SignalItem({ signal, onAck }: { signal: Signal; onAck: (id: string) => void }) {
  const getIcon = () => {
    switch (signal.severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-critical" />;
      case 'warning':  return <AlertCircle className="w-4 h-4 text-warning" />;
      default:         return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all duration-200',
      signal.acknowledged
        ? 'bg-muted/30 border-border/50 opacity-60'
        : signal.severity === 'critical'
          ? 'bg-critical/10 border-critical/30'
          : signal.severity === 'warning'
            ? 'bg-warning/10 border-warning/30'
            : 'bg-card border-border'
    )}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Badge variant="outline" className="text-xs capitalize h-5 px-1.5">
              {signal.system?.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-snug">{signal.message}</p>
          {signal.value !== undefined && signal.threshold !== undefined && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {signal.value} / {signal.threshold} threshold
            </p>
          )}
        </div>
        {!signal.acknowledged && (
          <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs" onClick={() => onAck(signal.id)}>
            <Check className="w-3 h-3 mr-1" />Ack
          </Button>
        )}
      </div>
    </div>
  );
}

export function SignalsPanel() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      // Pull from violations + flagged logs
      const [violationsRes, logsRes] = await Promise.allSettled([
        fetch(`${baseUrl}/violations?facilityId=${user?.facilityId}&limit=20`, { headers }),
        fetch(`${baseUrl}/facility-logs?facilityId=${user?.facilityId}&flagged=true&limit=10`, { headers }),
      ]);

      const newSignals: Signal[] = [];

      if (violationsRes.status === 'fulfilled' && violationsRes.value.ok) {
        const data = await violationsRes.value.json();
        const violations = data.violations || data.items || [];
        violations.slice(0, 8).forEach((v: any) => {
          newSignals.push({
            id: v.violationId || v.id || Math.random().toString(),
            severity: v.severity >= 80 ? 'critical' : v.severity >= 50 ? 'warning' : 'info',
            system: v.equipmentType || v.systemType || v.violationType || 'general',
            message: v.description || v.violationType?.replace(/_/g, ' ') || 'Violation detected',
            timestamp: v.timestamp || v.createdAt || new Date().toISOString(),
            acknowledged: v.status === 'resolved' || acknowledged.has(v.violationId || v.id),
            source: 'violation',
          });
        });
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const data = await logsRes.value.json();
        const logs = data.logs || data.items || [];
        logs.slice(0, 5).forEach((l: any) => {
          newSignals.push({
            id: l.logId || l.id || Math.random().toString(),
            severity: 'warning',
            system: l.systemType || l.equipmentType || 'operations',
            message: `Flagged log: ${l.operatorNotes || l.summary || 'Abnormal condition reported'}`,
            timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
            acknowledged: acknowledged.has(l.logId || l.id),
            source: 'log',
          });
        });
      }

      // Sort: unacknowledged critical first
      newSignals.sort((a, b) => {
        if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });

      setSignals(newSignals);
    } catch (err) {
      console.error('SignalsPanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.facilityId) fetchSignals();
  }, [user?.facilityId]);

  const handleAck = (id: string) => {
    setAcknowledged(prev => new Set([...prev, id]));
    setSignals(prev => prev.map(s => s.id === id ? { ...s, acknowledged: true } : s));
  };

  const activeCount = signals.filter(s => !s.acknowledged).length;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Facility Intelligence™ Signals</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {activeCount} Active
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchSignals}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading signals...</div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Check className="w-8 h-8 mx-auto mb-2 text-success opacity-50" />
            All clear — no active signals
          </div>
        ) : (
          signals.map(signal => (
            <SignalItem key={signal.id} signal={signal} onAck={handleAck} />
          ))
        )}
      </div>
    </div>
  );
}
