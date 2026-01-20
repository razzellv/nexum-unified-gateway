import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";

import { getSupervisorDashboard } from "@/lib/nexum-api";

import { ParticleBackground } from "@/components/ParticleBackground";

import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { ExportButtons } from '@/components/global/ExportButtons';
import { 
  type ViolationSummary,
  type VirtuousMetrics,
  type WorkOrder 
} from '@/lib/nexum-api';
import { OnShiftTeamTable } from '@/components/supervisor/OnShiftTeamTable';
import { 
  ClipboardList, 
  AlertTriangle, 
  Users, 
  Bell, 
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupervisorStats {
  openWorkOrders: number;
  highSeverityViolations: number;
  avgComplianceScore: number;
  unassignedWorkOrders: number;
  activeAlerts: number;
  waterChemistryAlerts: number;
}

export default function SupervisorDashboard() {
  const { isAuthenticated, loading } = useAuth();
  console.log("🔵 SupervisorDashboard auth:", { isAuthenticated, loading });
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [violationsSummary, setViolationsSummary] = useState<ViolationSummary[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<VirtuousMetrics[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [onShiftTeam, setOnShiftTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call real supervisor-dash Lambda
      const apiData = await getSupervisorDashboard();
      console.log("✅ Supervisor API data:", apiData);
      
      // Transform API data to match component expectations
      // TODO: Map apiData to violations, departments, workOrders
      // For now, use mock data as fallback
      
      const violations: any[] = [
        { employeeId: 'E001', employeeName: 'John Smith', violationCount: 1, avgWeight: 0.3, avgSeverity: 25 },
        { employeeId: 'E002', employeeName: 'Jane Doe', violationCount: 3, avgWeight: 0.5, avgSeverity: 55 },
        { employeeId: 'E003', employeeName: 'Mike Johnson', violationCount: 7, avgWeight: 0.8, avgSeverity: 85 },
      ];
      
      const departments: any[] = [
        { department: 'Operations', avgSeverity: 35, trend: 'down' as const, violationCount: 12, complianceRate: 88 },
        { department: 'Engineering', avgSeverity: 20, trend: 'stable' as const, violationCount: 6, complianceRate: 95 },
        { department: 'Maintenance', avgSeverity: 45, trend: 'stable' as const, violationCount: 8, complianceRate: 78 },
      ];
      
      // Use real work orders from API
      const orders: WorkOrder[] = apiData.work_orders?.map((wo: any) => ({
        id: wo.id,
        title: `Work Order ${wo.id}`,
        description: wo.type || 'Work order',
        status: 'Open',
        priority: wo.priority || 'Medium',
        assignedTo: wo.assigned_to || 'Unassigned',
        equipment: wo.equipment,
        dueDate: wo.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: wo.created || new Date().toISOString().split('T')[0],
      })) || [];
      
      setViolationsSummary(violations);
      setDepartmentMetrics(departments);
      setWorkOrders(orders);
      
      // Use real stats from API
      const highSeverity = violations.filter(v => v.avgSeverity >= 70).length;
      const openWO = apiData.summary?.open_work_orders || 0;
      const unassignedWO = orders.filter(o => !o.assignedTo || o.assignedTo === 'Unassigned').length;
      const avgCompliance = Math.round((100 - violations.reduce((acc, v) => acc + v.avgSeverity, 0) / violations.length));
      // Set on-shift team from API
const team = apiData.on_shift_team || [];
setOnShiftTeam(team);
      setStats({
        openWorkOrders: openWO,
        highSeverityViolations: highSeverity,
        avgComplianceScore: avgCompliance,
        unassignedWorkOrders: unassignedWO,
        activeAlerts: Math.floor(Math.random() * 5) + 2,
        waterChemistryAlerts: Math.floor(Math.random() * 3),
      });
      console.log("📊 Setting stats to:", {
        openWorkOrders: openWO,
        highSeverityViolations: highSeverity,
        avgComplianceScore: avgCompliance,
        unassignedWorkOrders: unassignedWO
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to load supervisor data. Retrying...');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  // No auth/role redirect - access controlled via RoleContext and MainLayout

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-destructive text-destructive-foreground';
    if (severity >= 3) return 'bg-yellow-500 text-yellow-950';
    return 'bg-green-500 text-green-950';
  };

  const getHeatmapColor = (value: number) => {
    const normalized = Math.min(100, Math.max(0, value));
    if (normalized >= 80) return 'bg-green-500/20 border-green-500/50';
    if (normalized >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-destructive/20 border-destructive/50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-400" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <MainLayout>
      <ParticleBackground />
        <NexumBranding />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-2">
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
              title="Supervisor Report"
              data={violationsSummary}
              metrics={stats ? [
                { label: 'Open Work Orders', value: `${stats.openWorkOrders}` },
                { label: 'Team Compliance', value: `${stats.avgComplianceScore}%` },
              ] : undefined}
            />
          </div>
        </div>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading supervisor metrics..." />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Card className="neon-border" style={{ animationDelay: '0ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <Badge variant={stats.openWorkOrders > 10 ? 'destructive' : 'secondary'}>
                        {stats.openWorkOrders}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Open Work Orders</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '50ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <Badge variant={stats.highSeverityViolations > 0 ? 'destructive' : 'secondary'}>
                        {stats.highSeverityViolations}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">High Severity Today</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '100ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <span className={cn(
                        'text-xl font-bold',
                        stats.avgComplianceScore >= 80 ? 'text-green-400' : stats.avgComplianceScore >= 60 ? 'text-yellow-400' : 'text-destructive'
                      )}>
                        {stats.avgComplianceScore}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Team Compliance</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '150ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Clock className="h-5 w-5 text-yellow-400" />
                      <Badge variant={stats.unassignedWorkOrders > 0 ? 'destructive' : 'secondary'}>
                        {stats.unassignedWorkOrders}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Unassigned WOs</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '200ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Bell className="h-5 w-5 text-yellow-400" />
                      <Badge variant={stats.activeAlerts > 0 ? 'destructive' : 'secondary'}>
                        {stats.activeAlerts}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Active Alerts</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '250ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Activity className="h-5 w-5 text-primary" />
                      <Badge variant={stats.waterChemistryAlerts > 0 ? 'destructive' : 'secondary'}>
                        {stats.waterChemistryAlerts}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Water Chemistry</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Employee Compliance Summary */}
            <Card className="neon-border" style={{ animationDelay: '300ms' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Employee Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {violationsSummary.map((employee) => {
                    const score = Math.max(0, 100 - employee.avgSeverity * 10);
                    return (
                      <div
                        className={cn(
                          'p-4 rounded-lg border transition-all hover:shadow-lg',
                          getHeatmapColor(score)
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{employee.employeeName}</span>
                          <Badge className={getSeverityColor(employee.avgSeverity)}>
                            Sev {employee.avgSeverity.toFixed(1)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>Violations: {employee.violationCount}</p>
                          <p>Avg Weight: {employee.avgWeight.toFixed(1)}</p>
                        </div>
                        <Progress value={score} className="h-1.5 mt-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Work Order Summary (Read-Only) */}
            <Card className="neon-border" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Work Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workOrders.map((wo) => (
                    <div
                      key={wo.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{wo.title}</span>
                            <Badge variant={wo.priority === 'Critical' ? 'destructive' : wo.priority === 'High' ? 'default' : 'secondary'}>
                              {wo.priority}
                            </Badge>
                            <Badge variant={wo.status === 'Completed' ? 'outline' : 'secondary'}>
                              {wo.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{wo.description}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Equipment: {wo.equipment}</span>
                            <span>Assigned: {wo.assignedTo || 'Unassigned'}</span>
                            <span>Due: {wo.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Risk Leaderboard */}
            <Card className="neon-border" style={{ animationDelay: '500ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Department Risk Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentMetrics.map((dept) => (
                    <div
                      key={dept.department}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{dept.department}</p>
                          <p className="text-sm text-muted-foreground">
                            {dept.violationCount} violations • {dept.complianceRate}% compliance
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(dept.trend)}
                          <Badge className={getSeverityColor(Math.round(dept.avgSeverity))}>
                            Avg Sev: {dept.avgSeverity.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Supervisor Insights */}
            <Card className="neon-border border-primary/30" style={{ animationDelay: '600ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Today's Priorities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Top 3 Risks Today</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Chiller CH-02 compressor showing signs of stress</li>
                      <li>• 2 unassigned high-priority work orders</li>
                      <li>• Water chemistry pH trending out of range</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-400">Most Delayed Work Orders</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• WO-001: Boiler inspection (3 days overdue)</li>
                      <li>• WO-004: Pump seal replacement (1 day overdue)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Employees Needing Support</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {violationsSummary.filter(v => v.avgSeverity >= 3).slice(0, 3).map(v => (
                        <li key={v.employeeId}>• {v.employeeName} - {v.violationCount} recent violations</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-400">Recommended Actions</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Assign WO-003 to available technician</li>
                      <li>• Schedule team meeting on compliance</li>
                      <li>• Review water treatment schedule</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
      {/* On-Shift Team Activity */}
            <OnShiftTeamTable team={onShiftTeam} />        )}
      </div>
    </MainLayout>
  );
}
