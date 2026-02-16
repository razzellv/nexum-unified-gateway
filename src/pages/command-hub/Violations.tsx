import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, ClipboardList, Plus, Filter, Download, Users, AlertTriangle, Scale } from 'lucide-react';
import { mockViolations, mockEmployeeAccountability } from '@/data/mockData';
import { ViolationCard } from '@/components/command-hub/violations/ViolationCard';
import { IssueViolationDialog } from '@/components/command-hub/violations/IssueViolationDialog';
import { AssignWorkOrderDialog } from '@/components/command-hub/violations/AssignWorkOrderDialog';
import { EmployeeAccountabilityTable } from '@/components/command-hub/violations/EmployeeAccountabilityTable';
import { Violation } from '@/types/facility';
import { useToast } from '@/hooks/use-toast';

// Placeholder for current user role - would come from auth context
const currentUserRole = 'manager';

export default function Violations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [violations, setViolations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);

  const loadViolations = useCallback(async () => {

    if (!user?.facilityId) return;

    setIsLoading(true);

    try {

      const response = await fetch(`${API_BASE_URL}/violations?facilityId=${user.facilityId}`, {

        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexum_access_token')}` }

      });

      if (response.ok) {

        const data = await response.json();

        setViolations(data.violations || data || []);

      }

    } catch (error) {

      console.error(error);

    } finally {

      setIsLoading(false);

    }

  }, [user?.facilityId]);

  useEffect(() => { loadViolations(); }, [loadViolations]);



  // Load violations

  const loadViolations = useCallback(async () => {

    if (!user?.facilityId) return;

    

    setIsLoading(true);

    try {

      const response = await fetch(

        ${API_BASE_URL}/violations?facilityId=${user.facilityId},

        { headers: { 'Authorization': Bearer ${localStorage.getItem('nexum_access_token')} }}

      );

      if (response.ok) {

        const data = await response.json();

        setViolations(data.violations || data || []);

      }

    } catch (error) {

      console.error('Load violations error:', error);

      setViolations([]);

    } finally {

      setIsLoading(false);

    }

  }, [user?.facilityId]);

  useEffect(() => { loadViolations(); }, [loadViolations]);


  const canManageViolations = ['manager', 'supervisor'].includes(currentUserRole);

  const activeViolations = violations.filter(v => !v.acknowledged).length;
  const criticalCount = violations.filter(v => v.severityScore >= 8).length;
  const avgWeight = violations.length > 0 
    ? (violations.reduce((sum, v) => sum + v.weightFactor, 0) / violations.length).toFixed(1)
    : '0';
  const atRiskEmployees = mockEmployeeAccountability.filter(e => e.performanceStatus !== 'good').length;

  const handleIssueViolation = (violation: Omit<Violation, 'id' | 'issuedAt' | 'acknowledged' | 'attachments'>) => {
    const newViolation: Violation = {
      ...violation,
      id: `vio-${Date.now()}`,
      issuedAt: new Date(),
      acknowledged: false,
      attachments: []
    };
    setViolations([newViolation, ...violations]);
    toast({
      title: "Violation Issued",
      description: `Violation recorded for ${violation.employeeName}`,
    });
  };

  const handleAssignWorkOrder = (workOrder: {
    title: string;
    employeeId: string;
    description: string;
  }) => {
    toast({
      title: "Work Order Created",
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
              {activeViolations} active violations • {mockEmployeeAccountability.length} employees tracked
            </p>
          </div>

          {canManageViolations && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setShowWorkOrderDialog(true)}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Assign Work Order
              </Button>
              <Button onClick={() => setShowIssueDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Issue Violation
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Violations</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{activeViolations}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical Severity</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{criticalCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-critical/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-critical" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Weight Factor</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{avgWeight}x</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Employees at Risk</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{atRiskEmployees}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Violations */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-primary" />
                Recent Violations
                <Badge variant="outline" className="ml-auto text-xs">
                  {violations.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {violations.map((violation) => (
                <ViolationCard key={violation.id} violation={violation} />
              ))}
            </CardContent>
          </Card>

          {/* Employee Accountability */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Employee Accountability
                <Badge variant="outline" className="ml-auto text-xs">
                  Rolling 30/60/90 Days
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeAccountabilityTable data={mockEmployeeAccountability} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
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
