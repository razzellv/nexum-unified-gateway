import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEPARTMENTS } from '@/config/roles';
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
  type WorkOrder,
  listSuggestions,
  dismissSuggestion,
  actOnSuggestion,
  type Suggestion,
  getCostBreakdown,
  type CostBreakdown,
} from '@/lib/nexum-api';
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
  Award,
  Pencil,
  Check,
  Lightbulb,
  CheckCheck,
  XCircle,
  DollarSign,
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

const SUPERVISOR_TITLES = [
  'Maintenance Supervisor',
  'Head Custodian',
  'Lead Engineer',
  'Facilities Supervisor',
  'Chief Engineer',
  'Plant Supervisor',
  'Operations Supervisor',
  'Shift Supervisor',
  'Lead Technician',
  'Senior Maintenance Lead',
  'Facilities Manager',
  'Building Supervisor',
];

export default function SupervisorDashboard() {
  const { isAuthenticated, loading, user } = useAuth();

  const userDept = user?.department || 'Operations';
  const [selectedDept, setSelectedDept] = useState<string>(userDept);
  const [supervisorTitle, setSupervisorTitle] = useState<string>(
    localStorage.getItem('nexum_supervisor_title') || 'Maintenance Supervisor'
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [violationsSummary, setViolationsSummary] = useState<ViolationSummary[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<VirtuousMetrics[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [onShiftTeam, setOnShiftTeam] = useState<any[]>([]);
  const [violationDetails, setViolationDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiData = await getSupervisorDashboard();
      console.log("✅ Supervisor API data:", apiData);
      
      // Extract violations summary with virtuous/risk scores - SAFE STRING CONVERSION
      const violations: ViolationSummary[] = (apiData.violations_summary || []).map((v: any) => ({
        employeeId: v.employeeId,
        employeeName: safeString(v.employeeName, v.employeeId), // FIXED
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
      
      // Extract on-shift team - SAFE STRING CONVERSION
      const team = (apiData.on_shift_team || []).map((t: any) => ({
        employee: safeString(t.employee, t.operatorId), // FIXED
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
      const onLog = () => fetchData();
      window.addEventListener('facility-log-submitted', onLog);
      return () => {
        clearInterval(interval);
        window.removeEventListener('facility-log-submitted', onLog);
      };
    }
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    listSuggestions('active').then(data => {
      setSuggestions(data.items || []);
      setSuggestionsLoaded(true);
    }).catch(() => setSuggestionsLoaded(true));
  }, []);

  useEffect(() => {
    getCostBreakdown().then(b => setCostBreakdown(b)).catch(() => {});
  }, []);

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

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return 'bg-destructive text-destructive-foreground';
    if (severity >= 40) return 'bg-yellow-500 text-yellow-950';
    return 'bg-green-500 text-green-950';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | 'improving' | 'worsening') => {
    if (trend === 'up' || trend === 'worsening') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'down' || trend === 'improving') return <TrendingDown className="h-4 w-4 text-green-400" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  // Department filtering
  const filteredWorkOrders = selectedDept === 'All'
    ? workOrders
    : workOrders.filter((wo: WorkOrder & { department?: string }) => !wo.department || wo.department === selectedDept);

  const filteredViolations = selectedDept === 'All'
    ? violationsSummary
    : violationsSummary.filter((v: ViolationSummary & { department?: string }) => !v.department || v.department === selectedDept);

  const filteredTeam = selectedDept === 'All'
    ? onShiftTeam
    : onShiftTeam.filter((t: any) => !t.department || t.department === selectedDept);

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title identity */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={supervisorTitle}
                    onValueChange={(v) => {
                      setSupervisorTitle(v);
                      localStorage.setItem('nexum_supervisor_title', v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPERVISOR_TITLES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTitle(false)}>
                    <Check className="w-4 h-4 text-green-400" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold leading-tight">{supervisorTitle}</h1>
                  <button onClick={() => setEditingTitle(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {user?.name || user?.email} · {selectedDept} Dept
              </p>
            </div>
          </div>
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

        {/* Department Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Showing: <span className="text-foreground font-medium">{selectedDept}</span> department
            </span>
          </div>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

            {/* Employee Status Table */}
            <EmployeeStatusTable employees={filteredViolations} />

            {/* On-Shift Team Activity */}
            <OnShiftTeamTable team={filteredTeam} />

            {/* Open Work Orders */}
            <Card className="neon-border" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Open Work Orders
                  <Badge variant="outline" className="ml-auto">{filteredWorkOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredWorkOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No open work orders</p>
                  ) : (
                    filteredWorkOrders.map((wo) => (
                      <div
                        key={wo.id}
                        className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-medium">{wo.title}</h4>
                              <Badge variant={wo.priority === 'High' ? 'destructive' : wo.priority === 'Medium' ? 'default' : 'secondary'}>
                                {wo.priority}
                              </Badge>
                              <Badge variant="outline">{wo.status}</Badge>
                              {wo.category && <Badge variant="outline" className="text-xs border-primary/30 text-primary">{wo.category}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{wo.description}</p>
                            {wo.notes && (
                              <div className="mt-2 p-2 rounded bg-yellow-400/5 border border-yellow-400/20">
                                <p className="text-xs text-yellow-400 font-medium mb-0.5">Notes</p>
                                <p className="text-xs text-muted-foreground">{wo.notes}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                              <div className="p-2 rounded bg-muted/20 border border-border/20">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equipment</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{wo.equipment || '—'}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/20 border border-border/20">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned To</p>
                                <p className="text-xs font-medium mt-0.5 truncate">{wo.assignedTo || 'Unassigned'}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/20 border border-border/20">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</p>
                                <p className="text-xs font-medium mt-0.5">{wo.dueDate || '—'}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/20 border border-border/20">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Hours</p>
                                <p className="text-xs font-medium mt-0.5">{wo.estimatedHours ? `${wo.estimatedHours}h` : '—'}</p>
                              </div>
                            </div>
                            {(wo.location || wo.building) && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="text-primary">📍</span>
                                <span>{[wo.building, wo.location].filter(Boolean).join(' — ')}</span>
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground font-mono">#{wo.id?.slice(-8) || 'N/A'}</span>
                              {wo.createdAt && <span className="text-[10px] text-muted-foreground">Created: {new Date(wo.createdAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                  {departmentMetrics.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No department metrics available</p>
                  ) : (
                    departmentMetrics.map((dept) => (
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
                            <Badge className={getSeverityColor(dept.riskScore)}>
                              Avg Sev: {dept.avgSeverity.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                    <h4 className="font-medium text-destructive">High Priority Work Orders</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {workOrders.filter(wo => wo.priority === 'High').slice(0, 3).length > 0 ? (
                        workOrders.filter(wo => wo.priority === 'High').slice(0, 3).map(wo => (
                          <li key={wo.id}>• {wo.title} - {wo.assignedTo || 'Unassigned'}</li>
                        ))
                      ) : (
                        <li>• No high priority work orders</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-400">Unassigned Work Orders</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {workOrders.filter(wo => !wo.assignedTo || wo.assignedTo === 'Unassigned').slice(0, 3).length > 0 ? (
                        workOrders.filter(wo => !wo.assignedTo || wo.assignedTo === 'Unassigned').slice(0, 3).map(wo => (
                          <li key={wo.id}>• {wo.title} - {wo.equipment}</li>
                        ))
                      ) : (
                        <li>• All work orders assigned</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Employees Needing Support</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {violationsSummary.filter(v => v.riskScore >= 70).slice(0, 3).length > 0 ? (
                        violationsSummary.filter(v => v.riskScore >= 70).slice(0, 3).map(v => (
                          <li key={v.employeeId}>• {v.employeeName} - {v.violationCount} violations (Risk: {v.riskScore})</li>
                        ))
                      ) : (
                        <li>• All employees performing well</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-400">Department Performance</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {departmentMetrics.slice(0, 3).length > 0 ? (
                        departmentMetrics.slice(0, 3).map(dept => (
                          <li key={dept.department}>• {dept.department}: {dept.complianceRate}% compliance</li>
                        ))
                      ) : (
                        <li>• No department metrics available</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Maintenance Cost Impact ───────────────────────────────────────── */}
        {costBreakdown && costBreakdown.bySystemType.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold">Maintenance Cost Impact</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {costBreakdown.bySystemType.slice(0, 4).map(s => (
                <div key={s.name} className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground capitalize">{s.name || 'Unassigned'}</p>
                  <p className="text-sm font-bold text-emerald-400">${(s.amount / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">{s.percent.toFixed(1)}% of facility cost</p>
                  <Progress value={s.percent} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Operational Suggestions ──────────────────────────────────────── */}
        {suggestionsLoaded && suggestions.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Operational Suggestions</h2>
              {suggestions.filter(s => s.priority === 'high').length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {suggestions.filter(s => s.priority === 'high').length} high priority
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.slice(0, 4).map(s => (
                <Card
                  key={s.SK}
                  className={cn(
                    "border-l-4",
                    s.priority === 'high'   ? "border-l-red-500"    :
                    s.priority === 'medium' ? "border-l-yellow-500" :
                                             "border-l-blue-500"
                  )}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{s.message}</p>
                      <Badge
                        className={cn(
                          "text-xs shrink-0",
                          s.priority === 'high'   ? "bg-red-500/20 text-red-400"    :
                          s.priority === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
                                                   "bg-blue-500/20 text-blue-400"
                        )}
                      >
                        {s.priority}
                      </Badge>
                    </div>
                    {s.suggestedVendorName && (
                      <p className="text-xs text-muted-foreground">
                        Suggested vendor: <span className="text-primary">{s.suggestedVendorName}</span>
                        {s.vendorMatchScore !== undefined && ` · ${s.vendorMatchScore}% match`}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          actOnSuggestion(s.SK).catch(() => {});
                          setSuggestions(prev => prev.filter(x => x.SK !== s.SK));
                        }}
                      >
                        <CheckCheck className="w-3 h-3" /> Act
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-muted-foreground"
                        onClick={() => {
                          dismissSuggestion(s.SK).catch(() => {});
                          setSuggestions(prev => prev.filter(x => x.SK !== s.SK));
                        }}
                      >
                        <XCircle className="w-3 h-3" /> Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
