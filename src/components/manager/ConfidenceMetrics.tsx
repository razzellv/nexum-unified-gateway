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
  const lowerType = type.toLowerCase();
  const icons: Record<string, any> = {
    boiler: Flame,
    chiller: Snowflake,
    pump: Droplets,
    ahu: Wind,
  };
  
  // Match partial strings
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerType.includes(key)) return icon;
  }
  return Info;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    high: 'text-green-500 bg-green-500/10 border-green-500/30',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-red-500 bg-red-500/10 border-red-500/30',
  };
  return colors[status] || 'text-muted-foreground bg-muted/10 border-border';
};

const getConfidenceColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

export default function ConfidenceMetrics({ data }: ConfidenceMetricsProps) {
  if (!data || !data.metrics) return null;

  const metrics = data.metrics || [];
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Confidence Overview</span>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {summary.avg_confidence || 0}% Avg
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-500">{summary.high_confidence_count || 0}</p>
              <p className="text-xs text-muted-foreground">High Confidence (80+)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Minus className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-500">
                {metrics.filter((m: any) => m.confidence_score >= 60 && m.confidence_score < 80).length}
              </p>
              <p className="text-xs text-muted-foreground">Medium (60-79)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-500">{summary.low_confidence_count || 0}</p>
              <p className="text-xs text-muted-foreground">Low Confidence (&lt;60)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Systems */}
      <div className="grid gap-4">
        {metrics.map((metric: any, idx: number) => {
          const Icon = getSystemIcon(metric.equipment_type);
          const statusClass = getStatusColor(metric.status);
          const confidenceColor = getConfidenceColor(metric.confidence_score);

          return (
            <Card key={idx} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', statusClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{metric.equipment_type}</h3>
                      <p className="text-xs text-muted-foreground">
                        {metric.equipment_count} equipment, {metric.log_count} logs
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-3xl font-bold', confidenceColor)}>
                      {metric.confidence_score}%
                    </p>
                    <Badge className={statusClass}>
                      {metric.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Equipment Count</p>
                      <p className="text-lg font-bold">{metric.equipment_count}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Total Logs</p>
                      <p className="text-lg font-bold">{metric.log_count}</p>
                    </div>

                    {metric.avg_efficiency !== null && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Avg Efficiency</p>
                        <p className={cn(
                          'text-lg font-bold',
                          metric.avg_efficiency >= 85 ? 'text-green-500' : 'text-yellow-500'
                        )}>
                          {metric.avg_efficiency}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className={confidenceColor}>{metric.confidence_score}%</span>
                    </div>
                    <Progress value={metric.confidence_score} className="h-2" />
                  </div>

                  {/* Last Log */}
                  {metric.last_log && (
                    <div className="text-xs text-muted-foreground text-right">
                      Last log: {new Date(metric.last_log).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {metrics.length === 0 && (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No equipment data in the last 7 days</p>
            <p className="text-sm text-muted-foreground mt-2">Submit facility logs to generate confidence metrics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
