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
import { OnShiftTeamTable } from '@/components/supervisor/OnShiftTeamTable';
import { EmployeeStatusTable } from '@/components/supervisor/EmployeeStatusTable';
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

// Helper function to safely extract string from employee name
function safeString(value: any, fallback: string = 'Unknown'): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.name || value.id || fallback;
  }
  return String(value);
}

export default function SupervisorDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [violationsSummary, setViolationsSummary] = useState<any[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
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
      
      // Extract violations summary - SAFE STRING CONVERSION
      const violations = (apiData.violations_summary || []).map((v: any) => ({
        employeeId: v.employeeId,
        employeeName: safeString(v.employeeName, v.employeeId),
        role: v.role,
        violationCount: v.violationCount || 0,
        avgWeight: v.avgWeight || 0,
        avgSeverity: v.avgSeverity || 0,
        riskScore: v.riskScore || 0,
        virtuousScore: v.virtuousScore || 100,
        complianceRate: v.complianceRate || 100,
      }));
      
      // Extract department metrics
      const departments = (apiData.department_metrics || []).map((d: any) => ({
        department: d.department,
        avgSeverity: d.avgSeverity || 0,
        trend: d.trend || 'stable',
        violationCount: d.violationCount || 0,
        complianceRate: d.complianceRate || 100,
        riskScore: d.riskScore || 0,
        virtuousScore: d.virtuousScore || 100,
      }));
      
      // Extract work orders
      const orders = (apiData.work_orders || []).map((wo: any) => ({
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
      
      // Extract on-shift team - SAFE STRING CONVERSION
      const team = (apiData.on_shift_team || []).map((t: any) => ({
        employee: safeString(t.employee, t.operatorId),
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

  const getTrendIcon = (trend: string) => {
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
                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

                <Card className="neon-border">
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

            {/* Employee Status Table - NEW! */}
            <EmployeeStatusTable employees={violationsSummary} />

            {/* On-Shift Team Activity */}
            <OnShiftTeamTable team={onShiftTeam} />
          </>
        )} 
      </div>
    </MainLayout>
  );
}
