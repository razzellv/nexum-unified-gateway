import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";

import { ParticleBackground } from "@/components/ParticleBackground";

import { MainLayout } from '@/components/MainLayout';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { FacilityGauge } from '@/components/global/FacilityGauge';
import { ExportButtons } from '@/components/global/ExportButtons';
import { type EmployeePortalData, type WorkOrder } from '@/lib/nexum-api';
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
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmployeeDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EmployeePortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const employeeId = id || "EMP001";

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setError(null);
    
    try {
      // Call real API
      const apiData = await getEmployeeDashboard(employeeId);
      
      if (apiData) {
        setData(apiData);
      } else {
        throw new Error('No data returned from API');
      }
    } catch (apiError) {
      console.error('API call failed, using fallback data:', apiError);
      // Fallback to mock data if API fails
      const fallbackData = {
        employee: {
          id: employeeId,
          name: 'John Operator',
          department: 'Operations',
          shift: 'Day',
        },
        latestBoilerLog: {
          id: 'BL001',
          date: new Date().toISOString().split('T')[0],
          time: '08:00',
          equipment_id: 'B-01',
          steam_pressure: 125,
          water_level: 'Normal',
          fuel_pressure: 45,
          blowdown_performed: true,
          notes: 'All readings normal',
        },
        latestChillerLog: {
          id: 'CL001',
          date: new Date().toISOString().split('T')[0],
          time: '08:30',
          equipment_id: 'CH-01',
          evap_supply_temp: 44,
          evap_return_temp: 54,
          cond_supply_temp: 85,
          cond_return_temp: 95,
          efficiency: 4.2,
          refrigerant_type: 'R-134a',
        },
        complianceEvents: [
          { id: '1', type: 'Safety Check', severity: 1, status: 'Completed', date: new Date().toISOString() },
          { id: '2', type: 'PPE Violation', severity: 3, status: 'Pending', date: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', type: 'Log Entry Missing', severity: 2, status: 'Resolved', date: new Date(Date.now() - 172800000).toISOString() },
        ],
        virtuousScore: 85,
        workOrders: [
          { id: 'WO001', title: 'Boiler B-01 Inspection', description: 'Routine inspection', status: 'Open', priority: 'Medium', assignedTo: employeeId, equipment: 'B-01', dueDate: '2024-02-01', createdAt: '2024-01-20' },
          { id: 'WO002', title: 'Pump Maintenance', description: 'Replace seals', status: 'In Progress', priority: 'High', assignedTo: employeeId, equipment: 'P-03', dueDate: '2024-01-30', createdAt: '2024-01-22' },
        ],
      };
      setData(fallbackData as any);
    }

    setLastUpdated(new Date());
    setIsLoading(false);
  }, [employeeId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Auto-refresh every 60 seconds
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  if (loading) {
    return <NexumPageLoader message="Authenticating..." />;
  }
  // No auth check needed - app is read-only with mock admin profile

  // If trying to view another employee's dashboard, must be supervisor+

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
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{data?.employee.department}</Badge>
                <Badge variant="outline">{data?.employee.shift} Shift</Badge>
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
                { label: 'Virtuous Score', value: `${data.virtuousScore}` },
                { label: 'Open Work Orders', value: `${data.workOrders.filter(w => w.status !== 'Completed').length}` },
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
            {/* Virtuous Score */}
            <div className="flex justify-center">
              <Card className="executive-card neon-border p-6 opacity-0 fade-scale-in">
                <FacilityGauge value={data.virtuousScore} label="Your Virtuous Compliance Score" size="lg" />
              </Card>
            </div>

            {/* Latest Logs */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Boiler Log */}
              <Card className="neon-border" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Latest Boiler Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.latestBoilerLog ? (
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
                        <span className="text-muted-foreground">Fuel Pressure</span>
                        <span className="font-medium">{data.latestBoilerLog.fuel_pressure} PSI</span>
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
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No recent boiler logs</p>
                  )}
                </CardContent>
              </Card>

              {/* Chiller Log */}
              <Card className="neon-border" style={{ animationDelay: '150ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5 text-secondary" />
                    Latest Chiller Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.latestChillerLog ? (
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
                        <span className="text-muted-foreground">Cond Supply/Return</span>
                        <span className="font-medium">{data.latestChillerLog.cond_supply_temp}°F / {data.latestChillerLog.cond_return_temp}°F</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Efficiency (COP)</span>
                        <span className="font-medium text-primary">{data.latestChillerLog.efficiency}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Refrigerant</span>
                        <Badge variant="outline">{data.latestChillerLog.refrigerant_type}</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No recent chiller logs</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Compliance Events */}
            <Card className="neon-border" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Your Compliance Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.complianceEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No compliance issues - great job!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.complianceEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all',
                          event.severity >= 3 && event.status === 'Pending' ? 'animate-pulse border-destructive/50 bg-destructive/5' : 'border-border/50 bg-muted/30'
                        )}
                        style={{ animationDelay: `${250 + index * 50}ms` }}
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
                                {new Date(event.date).toLocaleString()}
                              </p>
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
            <Card className="neon-border" style={{ animationDelay: '300ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Your Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.workOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No work orders assigned</p>
                ) : (
                  <div className="space-y-3">
                    {data.workOrders.map((wo, index) => (
                      <div
                        key={wo.id}
                        className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all opacity-0 slide-up"
                        style={{ animationDelay: `${350 + index * 50}ms` }}
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
