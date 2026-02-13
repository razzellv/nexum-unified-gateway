import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard as MetricCardType } from '@/types/facility';

interface MetricCardProps {
  metric: MetricCardType;
  delay?: number;
}

export function MetricCard({ metric, delay = 0 }: MetricCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-critical';
      default: return 'text-foreground';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend?: string, status?: string) => {
    if (status === 'critical') return 'text-critical';
    if (status === 'warning') return 'text-warning';
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-critical';
    return 'text-muted-foreground';
  };

  return (
    <div 
      className="metric-card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
        {metric.status && (
          <span className={cn(
            "status-dot",
            metric.status === 'success' && "status-dot-success",
            metric.status === 'warning' && "status-dot-warning",
            metric.status === 'critical' && "status-dot-critical"
          )} />
        )}
      </div>
      
      <div className="mt-3 flex items-end justify-between">
        <p className={cn("text-3xl font-bold tracking-tight", getStatusColor(metric.status))}>
          {metric.value}
        </p>
        
        {(metric.change !== undefined || metric.trend) && (
          <div className={cn("flex items-center gap-1 text-sm", getTrendColor(metric.trend, metric.status))}>
            {getTrendIcon(metric.trend)}
            {metric.change !== undefined && (
              <span>{metric.change > 0 ? '+' : ''}{metric.change}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
