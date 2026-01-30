import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { FacilityGauge } from '@/components/global/FacilityGauge';
import { ExportButtons } from '@/components/global/ExportButtons';
import { getEmployeeDashboard } from "@/lib/nexum-api";
import { 
  User, 
  Flame, 
  Snowflake, 
  Shield, 
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Activity,
  TrendingUp,
  Award,
  Zap,
  Target,
  Clock,
  BarChart3,
  Gauge,
  Trophy,
  Medal,
  Wind,
  Droplets,
  Waves,
  Hash // ✅ NEW: For employee ID icon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple bar chart component
const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  // ✅ FIXED: Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No activity data for the last 7 days</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div 
              className={cn(
                "w-full rounded-t transition-all duration-300",
                item.count > 0 
                  ? "bg-gradient-to-t from-primary to-primary/50" 
                  : "bg-muted/20"
              )}
              style={{ 
                height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`,
                minHeight: '4px'
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-primary">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Donut chart component
const DonutChart = ({ data }: { data: Array<{ type: string; count: number }> }) => {
  // ✅ FIXED: Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">No equipment coverage data</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const colors = ['#00d9ff', '#0066ff', '#00ffaa', '#ffaa00', '#aa00ff'];
  
  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      boiler: Flame,
      chiller: Snowflake,
      ahu: Wind,
      pump: Droplets,
      cooling_tower: Waves,
    };
    return icons[type] || Activity;
  };
  
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const Icon = getIcon(item.type);
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: colors[i % colors.length] }} />
                <span className="capitalize">{item.type.replace('_', ' ')}</span>
              </div>
              <span className="font-semibold">{item.count}</span>
            </div>
            <Progress 
              value={percentage} 
              className="h-2"
              style={{
                // @ts-ignore
                '--progress-background': colors[i % colors.length]
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default function EmployeeDashboard() {
  const { isAuthenticated, loading, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED: Use user.sub if no id param
  const employeeId = id || user?.sub || "EMP001";

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setError(null);
    setIsLoading(true);
    
    try {
      console.log('📊 Fetching employee dashboard for:', employeeId);
      const apiData = await getEmployeeDashboard(employeeId);
      console.log('✅ Dashboard data received:', apiData);
      setData(apiData);
    } catch (apiError) {
      console.error('❌ API call failed:', apiError);
      setError('Unable to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  if (loading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-destructive text-destructive-foreground';
    if (severity >= 3) return 'bg-yellow-500 text-yellow-950';
    if (severity >= 2) return 'bg-orange-500 text-orange-950';
    return 'bg-green-500 text-green-950';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Resolved') return 'bg-green-500/20 text-green-400';
    if (status === 'In Progress') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-muted text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'Critical') return 'bg-destructive text-destructive-foreground';
    if (priority === 'High') return 'bg-orange-500 text-orange-950';
    if (priority === 'Medium') return 'bg-yellow-500 text-yellow-950';
    return 'bg-muted text-muted-foreground';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/20' };
    if (rank === 3) return { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-600/20' };
    return { icon: Award, color: 'text-primary', bg: 'bg-primary/20' };
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground text-glow">
                {data?.employee.name || 'Employee Portal'}
              </h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {/* ✅ NEW: Employee ID Badge */}
                <Badge variant="outline" className="bg-primary/5 border-primary/30">
                  <Hash className="w-3 h-3 mr-1" />
                  {data?.employee.id || employeeId}
                </Badge>
                <Badge variant="outline">{data?.employee.department || 'Operations'}</Badge>
                <Badge variant="outline">{data?.employee.shift || 'Day'} Shift</Badge>
                {data?.rank && data?.totalEmployees && (
                  <Badge variant="outline" className="bg-primary/10">
                    Rank #{data.rank} of {data.totalEmployees}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="border-primary/30 hover:border-primary"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <ExportButtons 
              title="My Report"
              metrics={data ? [
                { label: 'Employee ID', value: data.employee.id },
                { label: 'Virtuous Score', value: `${data.virtuousScore}` },
                { label: 'Logs This Week', value: `${data.metrics?.logsThisWeek || 0}` },
              ] : undefined}
            />
          </div>
        </div>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading your data..." />
          </div>
        ) : data && (
          <>
            {/* Virtuous Score & Rank */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="executive-card neon-border p-6 opacity-0 fade-scale-in">
                <FacilityGauge value={data.virtuousScore || 0} label="Your Virtuous Compliance Score" size="lg" />
              </Card>
              
              {/* Rank Card */}
              {data.rank && (
                <Card className="neon-border opacity-0 fade-scale-in" style={{ animationDelay: '100ms' }}>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      {(() => {
                        const { icon: Icon, color, bg } = getRankBadge(data.rank);
                        return (
                          <div className={cn('p-4 rounded-full', bg)}>
                            <Icon className={cn('w-12 h-12', color)} />
                          </div>
                        );
                      })()}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Rank #{data.rank}</h3>
                    <p className="text-muted-foreground">out of {data.totalEmployees} operators</p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                      <p className="text-3xl font-bold text-primary">{data.virtuousScore}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Performance Metrics */}
            {data.metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="neon-border" style={{ animationDelay: '150ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Logs This Week</p>
                        <p className="text-2xl font-bold text-neon-cyan">{data.metrics.logsThisWeek || 0}</p>
                      </div>
                      <Activity className="w-8 h-8 text-neon-cyan opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '200ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Work Orders</p>
                        <p className="text-2xl font-bold text-success">
                          {data.metrics.workOrdersCompleted || 0}/{data.metrics.workOrdersTotal || 0}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-success opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '250ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Equipment Types</p>
                        <p className="text-2xl font-bold text-warning">{data.metrics.equipmentTypesCovered || 0}</p>
                      </div>
                      <Gauge className="w-8 h-8 text-warning opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '300ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Response</p>
                        <p className="text-2xl font-bold text-primary">{data.metrics.avgCompletionTimeHours || 0}h</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Activity Timeline */}
            <Card className="neon-border" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Activity Timeline (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={data.activityTimeline || []} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Equipment Coverage */}
              <Card className="neon-border" style={{ animationDelay: '400ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Equipment Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart data={data.equipmentCoverage || []} />
                </CardContent>
              </Card>

              {/* Leaderboard */}
              {data.leaderboard && data.leaderboard.length > 0 && (
                <Card className="neon-border" style={{ animationDelay: '450ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.leaderboard.map((operator: any, index: number) => {
                        const { icon: Icon, color, bg } = getRankBadge(index + 1);
                        const isCurrentUser = operator.id === employeeId || operator.id === data.employee.id;
                        
                        return (
                          <div
                            key={operator.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg transition-all',
                              isCurrentUser 
                                ? 'bg-primary/20 border-2 border-primary' 
                                : 'bg-muted/30 border border-border/30'
                            )}
                          >
                            <div className={cn('p-2 rounded-full', bg)}>
                              <Icon className={cn('w-4 h-4', color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-medium truncate',
                                isCurrentUser && 'text-primary font-bold'
                              )}>
                                {operator.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {operator.logsCount} logs • {operator.department}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{operator.score}</p>
                              <p className="text-xs text-muted-foreground">score</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Shift Summary */}
            {data.shiftSummary && (
              <Card className="neon-border" style={{ animationDelay: '500ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Today's Shift Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold">{data.shiftSummary.logsSubmitted || 0}</p>
                      <p className="text-sm text-muted-foreground">Logs Submitted</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <Gauge className="w-8 h-8 mx-auto mb-2 text-success" />
                      <p className="text-3xl font-bold">{data.shiftSummary.equipmentChecked || 0}</p>
                      <p className="text-sm text-muted-foreground">Equipment Checked</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <AlertTriangle className={cn(
                        'w-8 h-8 mx-auto mb-2',
                        (data.shiftSummary.alertsFlagged || 0) > 0 ? 'text-warning' : 'text-muted-foreground'
                      )} />
                      <p className="text-3xl font-bold">{data.shiftSummary.alertsFlagged || 0}</p>
                      <p className="text-sm text-muted-foreground">Alerts Flagged</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.active && data.certifications.active.length > 0 && (
              <Card className="neon-border" style={{ animationDelay: '550ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Certifications
                    {data.certifications.expiringSoon && data.certifications.expiringSoon.length > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {data.certifications.expiringSoon.length} Expiring Soon
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.certifications.active.map((cert: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-success" />
                          <div>
                            <p className="font-medium">{cert.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Expires: {cert.expires || cert.expirationDate || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-success/10 text-success">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Latest Logs */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Boiler Log */}
              {data.latestBoilerLog && (
                <Card className="neon-border" style={{ animationDelay: '600ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />
                      Latest Boiler Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Equipment</span>
                        <span className="font-medium">{data.latestBoilerLog.equipment_id}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date/Time</span>
                        <span className="font-medium">{data.latestBoilerLog.date} {data.latestBoilerLog.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Steam Pressure</span>
                        <span className="font-medium">{data.latestBoilerLog.steam_pressure} PSI</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Water Level</span>
                        <Badge variant="outline">{data.latestBoilerLog.water_level}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Blowdown</span>
                        <Badge variant={data.latestBoilerLog.blowdown_performed ? 'default' : 'secondary'}>
                          {data.latestBoilerLog.blowdown_performed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      {data.latestBoilerLog.notes && (
                        <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                          Notes: {data.latestBoilerLog.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chiller Log */}
              {data.latestChillerLog && (
                <Card className="neon-border" style={{ animationDelay: '650ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Snowflake className="h-5 w-5 text-secondary" />
                      Latest Chiller Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Equipment</span>
                        <span className="font-medium">{data.latestChillerLog.equipment_id}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date/Time</span>
                        <span className="font-medium">{data.latestChillerLog.date} {data.latestChillerLog.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Evap Supply/Return</span>
                        <span className="font-medium">{data.latestChillerLog.evap_supply_temp}°F / {data.latestChillerLog.evap_return_temp}°F</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Efficiency</span>
                        <span className="font-medium text-primary">{data.latestChillerLog.efficiency}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Refrigerant</span>
                        <Badge variant="outline">{data.latestChillerLog.refrigerant_type}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Compliance Events */}
            <Card className="neon-border" style={{ animationDelay: '700ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Compliance Events
                  {data.complianceEvents && data.complianceEvents.length > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {data.complianceEvents.length} Total
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.complianceEvents || data.complianceEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No compliance issues - great job!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.complianceEvents.map((event: any, index: number) => (
                      <div
                        key={event.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all',
                          event.severity >= 3 && event.status === 'Pending' 
                            ? 'animate-pulse border-destructive/50 bg-destructive/5' 
                            : 'border-border/50 bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {event.severity >= 3 ? (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            ) : (
                              <Activity className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{event.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.date || event.timestamp).toLocaleString()}
                              </p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(event.severity)}>
                              Sev {event.severity}
                            </Badge>
                            <Badge className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Orders */}
            <Card className="neon-border" style={{ animationDelay: '750ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.workOrders || data.workOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No work orders assigned</p>
                ) : (
                  <div className="space-y-3">
                    {data.workOrders.map((wo: any, index: number) => (
                      <div
                        key={wo.id}
                        className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{wo.title}</span>
                              <Badge className={getPriorityColor(wo.priority)}>
                                {wo.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{wo.description}</p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {wo.equipment}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {wo.dueDate}
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(wo.status)}>
                            {wo.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
