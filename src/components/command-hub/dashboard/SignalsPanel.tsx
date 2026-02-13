import { AlertTriangle, AlertCircle, Info, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Signal } from '@/types/facility';
import { mockSignals } from '@/data/mockData';

interface SignalItemProps {
  signal: Signal;
}

function SignalItem({ signal }: SignalItemProps) {
  const getIcon = () => {
    switch (signal.severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-critical" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getSystemLabel = (system: string) => {
    return system.charAt(0).toUpperCase() + system.slice(1);
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-200",
      signal.acknowledged 
        ? "bg-muted/30 border-border/50 opacity-60" 
        : signal.severity === 'critical'
          ? "bg-critical/10 border-critical/30"
          : signal.severity === 'warning'
            ? "bg-warning/10 border-warning/30"
            : "bg-card border-border"
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {getSystemLabel(signal.system)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(signal.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-foreground">{signal.message}</p>
          {signal.value !== undefined && signal.threshold !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              Value: {signal.value} | Threshold: {signal.threshold}
            </p>
          )}
        </div>
        {!signal.acknowledged && (
          <Button variant="ghost" size="sm" className="shrink-0">
            <Check className="w-4 h-4 mr-1" />
            Ack
          </Button>
        )}
      </div>
      {signal.taskCreated && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <Button variant="link" size="sm" className="h-auto p-0 text-primary">
            View Task <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function SignalsPanel() {
  const sortedSignals = [...mockSignals].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Facility Intelligence™ Signals</h3>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          {mockSignals.filter(s => !s.acknowledged).length} Active
        </Badge>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {sortedSignals.map((signal) => (
          <SignalItem key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}
