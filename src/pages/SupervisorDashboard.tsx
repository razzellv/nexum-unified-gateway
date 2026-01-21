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
  Activity,
  Shield,
  Target,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupervisorStats {
  openWorkOrders: number;
  highSeverityViolations: number;
  totalViolations: number;
  avgComplianceScore: number;
  avgVirtuousScore: number;
  unassignedWorkOrders: number;
  activeAlerts: number;
  waterChemistryAlerts: number;
  employeesAtRisk: number;
}

export default function SupervisorDashboard() {
  const { isAuthenticated, loading } = useAuth();
  console.log("🔵 SupervisorDashboard auth:", { isAuthenticated, loading });
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [violationsSummary, setViolationsSummary] = useState<ViolationSummary[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<VirtuousMetrics[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [onShiftTeam, setOnShiftTeam] = useState<any[]>([]);
  const [violationDetails, setViolationDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiData = await getSupervisorDashboard();
      console.log("✅ Supervisor API data:", apiData);
      
      // Extract violations summary with virtuous/risk scores
      const violations: ViolationSummary[] = (apiData.violations_summary || []).map((v: any) => ({
        employeeId: v.employeeId,
        employeeName: v.employeeName,
        role: v.role,
        violationCount: v.violationCount || 0,
        avgWeight: v.avgWeight || 0,
        avgSeverity: v.avgSeverity || 0,
        riskScore: v.riskScore || 0,
        virtuousScore: v.virtuousScore || 100,
        complianceRate: v.complianceRate || 100,
      }));
      
      // Extract department metrics
      const departments: VirtuousMetrics[] = (apiData.department_metrics || []).map((d: any) => ({
        department: d.department,
        avgSeverity: d.avgSeverity || 0,
        trend: d.trend || 'stable',
        violationCount: d.violationCount || 0,
        complianceRate: d.complianceRate || 100,
        riskScore: d.riskScore || 0,
        virtuousScore: d.virtuousScore || 100,
      }));
      
      // Extract work orders
      const orders: WorkOrder[] = (apiData.work_orders || []).map((wo: any) => ({
        id: wo.id,
        title: `Work Order ${wo.id}`,
        description: wo.description || wo.type || 'Work order',
        status: wo.status || 'Open',
        priority: wo.priority || 'Medium',
        assignedTo: wo.assigned_to || 'Unassigned',
        equipment: wo.equipment,
        dueDate: wo.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: wo.created || new Date().toISOString().split('T')[0],
      }));
      
      // Extract on-shift team
      const team = (apiData.on_shift_team || []).map((t: any) => ({
        employee: t.employee,
        operatorId: t.operatorId,
        role: t.role || 'Operator',
        systems_logged_24h: t.systems_logged_24h || 0,
        total_logs: t.total_logs || 0,
        specialty: t.specialty || 'HVAC',
        last_activity: t.last_activity,
        violations_count: t.violations_count || 0,
        avg_severity: t.avg_severity || 0,
        compliance_rate: t.compliance_rate || 100,
        risk_score: t.risk_score || 0,
        virtuous_score: t.virtuous_score || 100,
      }));
      
      // Extract violation details
      const details = apiData.violation_details || [];
      
      console.log("📊 Processed data:", {
        violations: violations.length,
        departments: departments.length,
        workOrders: orders.length,
        team: team.length,
        violationDetails: details.length,
      });
      
      setViolationsSummary(violations);
      setDepartmentMetrics(departments);
      setWorkOrders(orders);
      setOnShiftTeam(team);
      setViolationDetails(details);
      
      // Use real stats from API summary
      const summary = apiData.summary || {};
      setStats({
        openWorkOrders: summary.open_work_orders || 0,
        totalViolations: summary.total_violations || 0,
        highSeverityViolations: summary.high_severity_violations || 0,
        avgComplianceScore: summary.avg_compliance_score || 100,
        avgVirtuousScore: summary.avg_virtuous_score || 100,
        unassignedWorkOrders: summary.unassigned_work_orders || 0,
        activeAlerts: summary.alerts_count || 0,
        waterChemistryAlerts: summary.water_chemistry_alerts || 0,
        employeesAtRisk: summary.employees_at_risk || 0,
      });
      
      console.log("📊 Stats set from API:", summary);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Unable to load supervisor data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  if (loading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'bg-destructive text-destructive-foreground';
    if (riskScore >= 40) return 'bg-yellow-500 text-yellow-950';
    return 'bg-green-500 text-green-950';
  };

  const getVirtuousColor = (virtuousScore: number) => {
    if (virtuousScore >= 80) return 'bg-green-500 text-green-950';
    if (virtuousScore >= 60) return 'bg-yellow-500 text-yellow-950';
    return 'bg-destructive text-destructive-foreground';
  };

  const getHeatmapColor = (virtuousScore: number) => {
    if (virtuousScore >= 80) return 'bg-green-500/20 border-green-500/50';
    if (virtuousScore >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-destructive/20 border-destructive/50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | 'improving' | 'worsening') => {
    if (trend === 'up' || trend === 'worsening') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'down' || trend === 'improving') return <TrendingDown className="h-4 w-4 text-green-400" />;
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
                { label: 'Total Violations', value: `${stats.totalViolations}` },
                { label: 'High Severity', value: `${stats.highSeverityViolations}` },
                { label: 'Team Compliance', value: `${stats.avgComplianceScore}%` },
                { label: 'Virtuous Score', value: `${stats.avgVirtuousScore}%` },
                { label: 'At-Risk Employees', value: `${stats.employeesAtRisk}` },
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <Card className="neon-border" style={{ animationDelay: '0ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <Badge variant={stats.openWorkOrders > 10 ? 'destructive' : 'secondary'}>
                        {stats.openWorkOrders}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Open WOs</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '50ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <Badge variant={stats.totalViolations > 0 ? 'destructive' : 'secondary'}>
                        {stats.totalViolations}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Violations</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '100ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Shield className="h-5 w-5 text-destructive" />
                      <Badge variant={stats.highSeverityViolations > 0 ? 'destructive' : 'secondary'}>
                        {stats.highSeverityViolations}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">High Severity</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '150ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Target className="h-5 w-5 text-green-400" />
                      <span className={cn(
                        'text-xl font-bold',
                        stats.avgComplianceScore >= 80 ? 'text-green-400' : stats.avgComplianceScore >= 60 ? 'text-yellow-400' : 'text-destructive'
                      )}>
                        {stats.avgComplianceScore}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Compliance</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '200ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Award className="h-5 w-5 text-primary" />
                      <span className={cn(
                        'text-xl font-bold',
                        stats.avgVirtuousScore >= 80 ? 'text-green-400' : stats.avgVirtuousScore >= 60 ? 'text-yellow-400' : 'text-destructive'
                      )}>
                        {stats.avgVirtuousScore}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Virtuous</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '250ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Users className="h-5 w-5 text-yellow-400" />
                      <Badge variant={stats.employeesAtRisk > 0 ? 'destructive' : 'secondary'}>
                        {stats.employeesAtRisk}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">At Risk</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '300ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Clock className="h-5 w-5 text-yellow-400" />
                      <Badge variant={stats.unassignedWorkOrders > 0 ? 'destructive' : 'secondary'}>
                        {stats.unassignedWorkOrders}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Unassigned</p>
                  </CardContent>
                </Card>

                <Card className="neon-border" style={{ animationDelay: '350ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Bell className="h-5 w-5 text-yellow-400" />
                      <Badge variant={stats.activeAlerts > 0 ? 'destructive' : 'secondary'}>
                        {stats.activeAlerts}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Alerts</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Employee Compliance Summary with Virtuous Scores */}
            <Card className="neon-border" style={{ animationDelay: '400ms' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Employee Compliance & Virtuous Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {violationsSummary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 text-green-400" />
                    <p>No violations recorded today - excellent compliance!</p>
                    <p className="text-sm mt-1">Team Virtuous Score: 100%</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {violationsSummary.map((employee) => (
                      <div
                        key={employee.employeeId}
                        className={cn(
                          'p-4 rounded-lg border transition-all hover:shadow-lg',
                          getHeatmapColor(employee.virtuousScore || 100)
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{employee.employeeName}</span>
                          <Badge className={getRiskColor(employee.riskScore || 0)}>
                            Risk {(employee.riskScore || 0).toFixed(0)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground mb-2">
                          <div className="flex justify-between">
                            <span>Violations:</span>
                            <span className="font-medium">{employee.violationCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Severity:</span>
                            <span className="font-medium">{(employee.avgSeverity || 0).toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Virtuous:</span>
                            <span className={cn(
                              'font-medium',
                              (employee.virtuousScore || 100) >= 80 ? 'text-green-400' : 
                              (employee.virtuousScore || 100) >= 60 ? 'text-yellow-400' : 'text-destructive'
                            )}>{(employee.virtuousScore || 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <Progress value={employee.virtuousScore || 100} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Order Summary */}
            <Card className="neon-border" style={{ animationDelay: '500ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Work Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No open work orders</p>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Department Risk Leaderboard */}
            <Card className="neon-border" style={{ animationDelay: '600ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Department Risk & Virtuous Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {departmentMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No department data available</p>
                  </div>
                ) : (
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
                            <Badge className={getRiskColor(dept.riskScore || 0)}>
                              Risk: {(dept.riskScore || 0).toFixed(0)}
                            </Badge>
                            <Badge className={getVirtuousColor(dept.virtuousScore || 100)}>
                              Virtuous: {(dept.virtuousScore || 100).toFixed(0)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Priorities */}
            <Card className="neon-border border-primary/30" style={{ animationDelay: '700ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Today's Priorities & Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Immediate Actions Required</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {stats && stats.highSeverityViolations > 0 && (
                        <li>• {stats.highSeverityViolations} high severity violations to address</li>
                      )}
                      {stats && stats.unassignedWorkOrders > 0 && (
                        <li>• {stats.unassignedWorkOrders} unassigned work orders need assignment</li>
                      )}
                      {stats && stats.employeesAtRisk > 0 && (
                        <li>• {stats.employeesAtRisk} employees at risk - coaching needed</li>
                      )}
                      {(!stats || (stats.highSeverityViolations === 0 && stats.unassignedWorkOrders === 0 && stats.employeesAtRisk === 0)) && (
                        <li>• No immediate actions required</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-400">High-Risk Team Members</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {violationsSummary.filter(v => (v.riskScore || 0) >= 70).slice(0, 3).map(v => (
                        <li key={v.employeeId}>
                          • {v.employeeName} - Risk: {(v.riskScore || 0).toFixed(0)}, Virtuous: {(v.virtuousScore || 100).toFixed(0)}%
                        </li>
                      ))}
                      {violationsSummary.filter(v => (v.riskScore || 0) >= 70).length === 0 && (
                        <li>• All team members in good standing</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Department Focus Areas</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {departmentMetrics.filter(d => (d.riskScore || 0) >= 40).slice(0, 3).map(d => (
                        <li key={d.department}>
                          • {d.department} - {d.violationCount} violations (Risk: {(d.riskScore || 0).toFixed(0)})
                        </li>
                      ))}
                      {departmentMetrics.filter(d => (d.riskScore || 0) >= 40).length === 0 && (
                        <li>• All departments meeting standards</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-400">Performance Highlights</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {stats && stats.avgVirtuousScore >= 80 && (
                        <li>• Team Virtuous Score: {stats.avgVirtuousScore}% - excellent!</li>
                      )}
                      {violationsSummary.filter(v => v.violationCount === 0).length > 0 && (
                        <li>• {violationsSummary.filter(v => v.violationCount === 0).length} team members with zero violations</li>
                      )}
                      {violationsSummary.filter(v => (v.virtuousScore || 100) >= 90).length > 0 && (
                        <li>• {violationsSummary.filter(v => (v.virtuousScore || 100) >= 90).length} employees with virtuous scores ≥ 90%</li>
                      )}
                      {(!stats || stats.avgVirtuousScore < 80) && violationsSummary.length === 0 && (
                        <li>• Keep up the good work</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* On-Shift Team Activity */}
            <OnShiftTeamTable team={onShiftTeam} />
          </>
        )} 
      </div>
    </MainLayout>
  );
}
