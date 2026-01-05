import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface EfficiencyGaugeProps {
  title: string;
  value: number;
  unit: string;
  target: number;
  status: 'Optimal' | 'Needs Review' | 'Operational Concern';
  trend?: number; // percentage change
  subtitle?: string;
}

export function EfficiencyGauge({ title, value, unit, target, status, trend, subtitle }: EfficiencyGaugeProps) {
  const percentage = Math.min(100, (value / target) * 100);
  const deviation = ((value - target) / target) * 100;
  
  const statusConfig = {
    'Optimal': {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    'Needs Review': {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    'Operational Concern': {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  return (
    <Card className={`${config.borderColor} ${config.bgColor} border-2`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-foreground">
            {value.toFixed(1)}
            <span className="text-lg text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target: {target}{unit}</span>
            <span className={deviation >= 0 ? 'text-green-500' : 'text-red-500'}>
              {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                status === 'Optimal' ? 'bg-green-500' : 
                status === 'Needs Review' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
        
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs. last period</span>
          </div>
        )}
        
        <div className={`text-xs font-medium ${config.color} flex items-center gap-1`}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'currentColor' }} />
          {status}
        </div>
      </CardContent>
    </Card>
  );
}