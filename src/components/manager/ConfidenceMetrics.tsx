import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Flame, 
  Snowflake, 
  Droplets, 
  Wind,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceMetricsProps {
  data: any;
}

const getSystemIcon = (type: string) => {
  const icons: Record<string, any> = {
    boiler: Flame,
    chiller: Snowflake,
    pump: Droplets,
    ahu: Wind,
  };
  return icons[type] || Info;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    excellent: 'text-green-500 bg-green-500/10 border-green-500/30',
    good: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    fair: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    poor: 'text-red-500 bg-red-500/10 border-red-500/30',
  };
  return colors[status] || 'text-muted-foreground bg-muted/10 border-border';
};

const getConfidenceColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-red-500';
};

export default function ConfidenceMetrics({ data }: ConfidenceMetricsProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Confidence Overview</span>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {data.overall_confidence}% Avg
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-500">{data.summary.excellent}</p>
              <p className="text-xs text-muted-foreground">Excellent</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-500">{data.summary.good}</p>
              <p className="text-xs text-muted-foreground">Good</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Minus className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-500">{data.summary.fair}</p>
              <p className="text-xs text-muted-foreground">Fair</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-500">{data.summary.poor}</p>
              <p className="text-xs text-muted-foreground">Poor</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{data.summary.total_alerts}</p>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Systems */}
      <div className="grid gap-4">
        {data.systems.map((system: any) => {
          const Icon = getSystemIcon(system.system_type);
          const statusClass = getStatusColor(system.status);
          const confidenceColor = getConfidenceColor(system.confidence_score);

          return (
            <Card key={system.equipment_id} className="neon-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', statusClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{system.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{system.equipment_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-3xl font-bold', confidenceColor)}>
                      {system.confidence_score}%
                    </p>
                    <Badge className={statusClass}>
                      {system.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Temperature/Pressure Metrics */}
                    {system.metrics.temp_variance !== undefined && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Temp Variance</p>
                        <p className={cn(
                          'text-lg font-bold',
                          system.metrics.temp_variance < 5 ? 'text-green-500' : 'text-yellow-500'
                        )}>
                          {system.metrics.temp_variance.toFixed(1)}%
                        </p>
                      </div>
                    )}

                    {system.metrics.delta_t_efficiency !== undefined && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">ΔT Efficiency</p>
                        <p className={cn(
                          'text-lg font-bold',
                          system.metrics.delta_t_efficiency >= 0.9 ? 'text-green-500' : 'text-yellow-500'
                        )}>
                          {(system.metrics.delta_t_efficiency * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}

                    {/* Efficiency Ratio */}
                    {system.metrics.efficiency_ratio !== undefined && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {system.system_type === 'chiller' ? 'Efficiency (lower=better)' : 'Efficiency'}
                        </p>
                        <p className={cn(
                          'text-lg font-bold',
                          system.system_type === 'chiller'
                            ? system.metrics.efficiency_ratio >= 0.95 ? 'text-green-500' : 'text-yellow-500'
                            : system.metrics.efficiency_ratio >= 0.95 ? 'text-green-500' : 'text-yellow-500'
                        )}>
                          {(system.metrics.efficiency_ratio * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}

                    {/* Runtime */}
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Runtime</p>
                      <p className={cn(
                        'text-lg font-bold',
                        system.metrics.runtime_ratio >= 0.9 ? 'text-green-500' : 'text-yellow-500'
                      )}>
                        {system.metrics.total_runtime_hours}h
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {system.metrics.expected_runtime_hours}h
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className={confidenceColor}>{system.confidence_score}%</span>
                    </div>
                    <Progress value={system.confidence_score} className="h-2" />
                  </div>

                  {/* Alerts */}
                  {system.alerts && system.alerts.length > 0 && (
                    <div className="space-y-2">
                      {system.alerts.map((alert: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30"
                        >
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{alert.type.replace(/_/g, ' ').toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Log Count */}
                  <div className="text-xs text-muted-foreground text-right">
                    Based on {system.logs_count} logs over {data.period_days} days
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
