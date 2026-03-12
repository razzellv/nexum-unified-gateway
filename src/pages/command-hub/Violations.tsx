import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, ClipboardList, Plus, Filter, Download, Users, AlertTriangle, Scale } from 'lucide-react';
import { ViolationCard } from '@/components/command-hub/violations/ViolationCard';
import { IssueViolationDialog } from '@/components/command-hub/violations/IssueViolationDialog';
import { AssignWorkOrderDialog } from '@/components/command-hub/violations/AssignWorkOrderDialog';
import { EmployeeAccountabilityTable } from '@/components/command-hub/violations/EmployeeAccountabilityTable';
import { Violation } from '@/types/facility';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const currentUserRole = 'manager';

// ── Build employee accountability from raw violations ─────────────────────────
function buildAccountability(violations: any[]) {
  const now = Date.now();
  const MS_30 = 30 * 24 * 60 * 60 * 1000;
  const MS_60 = 60 * 24 * 60 * 60 * 1000;
  const MS_90 = 90 * 24 * 60 * 60 * 1000;

  // Group by operator name
  const byEmployee: Record<string, {
    name: string;
    id: string;
    role: string;
    violations: any[];
  }> = {};

  violations.forEach(v => {
    const name = v.employeeName || v.operator || v.operatorId || 'Unknown';
    const id   = v.operatorId || name;
    if (!byEmployee[name]) {
      byEmployee[name] = { name, id, role: v.equipmentType || 'Staff', violations: [] };
    }
    byEmployee[name].violations.push(v);
  });

  return Object.values(byEmployee).map(emp => {
    const v30 = emp.violations.filter(v => {
      const ts = new Date(v.timestamp || v.createdAt || 0).getTime();
      return now - ts <= MS_30;
    });
    const v60 = emp.violations.filter(v => {
      const ts = new Date(v.timestamp || v.createdAt || 0).getTime();
      return now - ts <= MS_60;
    });
    const v90 = emp.violations.filter(v => {
      const ts = new Date(v.timestamp || v.createdAt || 0).getTime();
      return now - ts <= MS_90;
    });

    // Weighted score: sum(severity * weight) / 10 for 90-day window
    const weightedScore90 = v90.reduce((sum, v) => {
      return sum + ((v.severityScore || v.severity || 50) * (v.weightFactor || v.weight || 0.5)) / 10;
    }, 0);

    let performanceStatus: 'good' | 'warning' | 'critical' = 'good';
    if (weightedScore90 > 20) performanceStatus = 'critical';
    else if (weightedScore90 > 10) performanceStatus = 'warning';

    // Separate role/department from equipmentType
    const roleParts = emp.role.split('/');

    return {
      employeeId:         emp.id,
      employeeName:       emp.name,
      role:               roleParts[0] || 'Staff',
      department:         roleParts[1] || 'Maintenance',
      violations30Days:   v30.length,
      violations60Days:   v60.length,
      violations90Days:   v90.length,
      weightedScore90Days: parseFloat(weightedScore90.toFixed(1)),
      performanceStatus,
      lastViolation:      emp.violations[0]?.timestamp || null,
    };
  }).sort((a, b) => b.weightedScore90Days - a.weightedScore90Days);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Violations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [violations, setViolations]         = useState<any[]>([]);
  const [accountability, setAccountability] = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [showIssueDialog, setShowIssueDialog]         = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);

  const loadViolations = useCallback(async () => {
    if (!user?.facilityId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
      const response = await fetch(
        `${API_BASE_URL}/violations?facilityId=${user.facilityId}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const list = data.violations || data || [];
        setViolations(list);
        setAccountability(buildAccountability(list));
      }
    } catch (error) {
      console.error('Violations load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.facilityId]);

  useEffect(() => { loadViolations(); }, [loadViolations]);

  const canManageViolations = ['manager', 'supervisor'].includes(currentUserRole);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const activeViolations = violations.filter(v => !v.acknowledged).length;
  const criticalCount    = violations.filter(v => (v.severityScore || v.severity || 0) >= 80).length;
  const avgWeight        = violations.length > 0
    ? (violations.reduce((sum, v) => sum + (v.weightFactor || v.weight || 0), 0) / violations.length).toFixed(1)
    : '0';
  const atRiskEmployees  = accountability.filter(e => e.performanceStatus !== 'good').length;

  const handleIssueViolation = (violation: Omit<Violation, 'id' | 'issuedAt' | 'acknowledged' | 'attachments'>) => {
    const newViolation: Violation = {
      ...violation,
      id:           `vio-${Date.now()}`,
      issuedAt:     new Date(),
      acknowledged: false,
      attachments:  [],
    };
    const updated = [newViolation, ...violations];
    setViolations(updated);
    setAccountability(buildAccountability(updated));
    toast({
      title:       'Violation Issued',
      description: `Violation recorded for ${violation.employeeName}`,
    });
  };

  const handleAssignWorkOrder = (workOrder: { title: string; employeeId: string; description: string }) => {
    toast({
      title:       'Work Order Created',
      description: `Work order "${workOrder.title}" has been assigned.`,
    });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="w-7 h-7 text-primary" />
              Violations & Accountability
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeViolations} active violations • {accountability.length} employees tracked
            </p>
          </div>
          {canManageViolations && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <Button variant="outline" onClick={() => setShowWorkOrderDialog(true)}>
                <ClipboardList className="w-4 h-4 mr-2" />Assign Work Order
              </Button>
              <Button onClick={() => setShowIssueDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />Issue Violation
              </Button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Violations', value: activeViolations, icon: AlertOctagon,  color: 'text-warning',    bg: 'bg-warning/20' },
            { label: 'Critical Severity', value: criticalCount,    icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/20' },
            { label: 'Avg Weight Factor', value: `${avgWeight}x`,  icon: Scale,         color: 'text-primary',    bg: 'bg-primary/20' },
            { label: 'Employees at Risk', value: atRiskEmployees,  icon: Users,         color: 'text-orange-500', bg: 'bg-orange-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Violations */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-primary" />
                Recent Violations
                <Badge variant="outline" className="ml-auto text-xs">{violations.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading violations...</p>
              ) : violations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No violations recorded</p>
              ) : (
                violations.map((violation, i) => (
                  <ViolationCard key={violation.violationId || i} violation={violation} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Employee Accountability — real data */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Employee Accountability
                <Badge variant="outline" className="ml-auto text-xs">Rolling 30/60/90 Days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : accountability.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No employee data yet</p>
              ) : (
                <EmployeeAccountabilityTable data={accountability} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <IssueViolationDialog
        open={showIssueDialog}
        onOpenChange={setShowIssueDialog}
        onSubmit={handleIssueViolation}
      />
      <AssignWorkOrderDialog
        open={showWorkOrderDialog}
        onOpenChange={setShowWorkOrderDialog}
        onSubmit={handleAssignWorkOrder}
      />
    </MainLayout>
  );
}
