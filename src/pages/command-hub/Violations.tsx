import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, ClipboardList, Plus, Filter, Download, Users, AlertTriangle, Scale, CheckCircle, Eye, ShieldCheck, ChevronRight } from 'lucide-react';
import { ViolationCard } from '@/components/command-hub/violations/ViolationCard';
import { IssueViolationDialog } from '@/components/command-hub/violations/IssueViolationDialog';
import { AssignWorkOrderDialog } from '@/components/command-hub/violations/AssignWorkOrderDialog';
import { EmployeeAccountabilityTable } from '@/components/command-hub/violations/EmployeeAccountabilityTable';
import { Violation } from '@/types/facility';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const currentUserRole = 'manager';

const ORG_LABELS: Record<string, { title: string; badge: string }> = {
  facility:   { title: 'Violations & Accountability', badge: 'Facility' },
  retail:     { title: 'Violations & Incident Log',   badge: 'Retail' },
  government: { title: 'Violations & Compliance Log', badge: 'Gov / Public Safety' },
};

// Safe string extractor — handles fields that may arrive as {name, id} objects
function extractStr(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val || null;
  if (typeof val === 'object') return val.name || val.id || null;
  return String(val) || null;
}

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
    const name = extractStr(v.employeeName) || extractStr(v.operator) || extractStr(v.operatorId) || 'Unknown';
    const id   = extractStr(v.operatorId) || name;
    const role = extractStr(v.equipmentType) || 'Staff';
    if (!byEmployee[name]) {
      byEmployee[name] = { name, id, role, violations: [] };
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
  const orgType = (localStorage.getItem('nexum_org_type') || 'facility') as 'facility' | 'retail' | 'government';
  const orgLabel = ORG_LABELS[orgType] ?? ORG_LABELS.facility;

  const [violations, setViolations]         = useState<any[]>([]);
  const [accountability, setAccountability] = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [showIssueDialog, setShowIssueDialog]         = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  // Sequence lifecycle: open → acknowledged → inReview → resolved
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, 'open' | 'acknowledged' | 'inReview' | 'resolved'>>({});

  const loadViolations = useCallback(async () => {
    const facilityId = user?.facilityId || user?.['custom:facilityId'] || user?.['custom:orgId'] || 'facility-001';
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
      const response = await fetch(
        `${API_BASE_URL}/violations?facilityId=${facilityId}&limit=100`,
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
  }, [user?.facilityId, user?.['custom:facilityId']]);

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
    try {
      const prev = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]');
      prev.unshift({
        ...newViolation,
        issuedAt: newViolation.issuedAt.toISOString(),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'open',
      });
      localStorage.setItem('nexum_violation_events', JSON.stringify(prev.slice(0, 200)));
      window.dispatchEvent(new CustomEvent('facility-log-submitted', { detail: { type: 'violation' } }));
    } catch {}
  };

  const handleAssignWorkOrder = (workOrder: { title: string; employeeId: string; description: string }) => {
    toast({
      title:       'Work Order Created',
      description: `Work order "${workOrder.title}" has been assigned.`,
    });
  };

  // Sequence step labels and colors
  const SEQUENCE_STEPS = ['open', 'acknowledged', 'inReview', 'resolved'] as const;
  type LifecycleStep = typeof SEQUENCE_STEPS[number];
  const STEP_META: Record<LifecycleStep, { label: string; color: string; nextLabel: string }> = {
    open:         { label: 'Open',          color: 'bg-red-500/20 text-red-400 border-red-500/30',      nextLabel: 'Acknowledge' },
    acknowledged: { label: 'Acknowledged',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', nextLabel: 'Move to Review' },
    inReview:     { label: 'In Review',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   nextLabel: 'Resolve' },
    resolved:     { label: 'Resolved',      color: 'bg-green-500/20 text-green-400 border-green-500/30', nextLabel: '' },
  };

  const getViolationStep = (v: any): LifecycleStep => {
    const id = v.violationId || v.id;
    if (lifecycleMap[id]) return lifecycleMap[id];
    if (v.status === 'resolved') return 'resolved';
    if (v.inReview) return 'inReview';
    if (v.acknowledged) return 'acknowledged';
    return 'open';
  };

  const advanceStep = (violationId: string, current: LifecycleStep) => {
    const idx = SEQUENCE_STEPS.indexOf(current);
    if (idx < SEQUENCE_STEPS.length - 1) {
      const next = SEQUENCE_STEPS[idx + 1];
      setLifecycleMap(prev => ({ ...prev, [violationId]: next }));
      const meta = STEP_META[next];
      toast({ title: `Violation ${meta.label}`, description: `Status advanced to "${meta.label}". Sequence step recorded.` });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="w-7 h-7 text-primary" />
              {orgLabel.title}
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full border border-primary/30 text-primary">{orgLabel.badge}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeViolations} active violations • {accountability.length} {orgType === 'government' ? 'personnel' : 'employees'} tracked
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
                violations.map((violation, i) => {
                  const vid = violation.violationId || violation.id || String(i);
                  const step = getViolationStep(violation);
                  const meta = STEP_META[step];
                  const severity = violation.severityScore || violation.severity || 0;
                  return (
                    <div key={vid} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2">
                      {/* Top row: type + sequence badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className={`w-4 h-4 shrink-0 ${severity >= 80 ? 'text-red-400' : severity >= 50 ? 'text-orange-400' : 'text-yellow-400'}`} />
                          <span className="text-sm font-medium truncate">
                            {typeof violation.type === 'string' ? violation.type
                              : typeof violation.violationType === 'string' ? violation.violationType
                              : (violation.type as any)?.name || (violation.violationType as any)?.name || 'Violation'}
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-2 ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      {/* Details */}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {(violation.employeeName || violation.operator) && (
                          <p><span className="text-foreground/60">Personnel:</span> {
                            typeof violation.employeeName === 'string' ? violation.employeeName
                            : typeof violation.operator === 'string' ? violation.operator
                            : (violation.employeeName as any)?.name || (violation.operator as any)?.name || String(violation.operatorId || '—')
                          }</p>
                        )}
                        <p><span className="text-foreground/60">Severity:</span> {severity}/100 • {new Date(violation.issuedAt || violation.timestamp || Date.now()).toLocaleDateString()}</p>
                        {violation.description && <p className="truncate"><span className="text-foreground/60">Notes:</span> {violation.description}</p>}
                      </div>
                      {/* Sequence pipeline */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        {SEQUENCE_STEPS.map((s, idx) => (
                          <span key={s} className="flex items-center gap-1">
                            <span className={step === s ? 'text-foreground font-semibold' : (SEQUENCE_STEPS.indexOf(step) > idx ? 'text-green-400' : '')}>
                              {STEP_META[s].label}
                            </span>
                            {idx < SEQUENCE_STEPS.length - 1 && <ChevronRight className="w-3 h-3" />}
                          </span>
                        ))}
                      </div>
                      {/* Advance button */}
                      {step !== 'resolved' && canManageViolations && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs border-primary/30 hover:border-primary"
                          onClick={() => advanceStep(vid, step)}
                        >
                          {step === 'inReview' ? <ShieldCheck className="w-3 h-3 mr-1.5 text-green-400" /> : <ChevronRight className="w-3 h-3 mr-1.5" />}
                          {meta.nextLabel}
                        </Button>
                      )}
                      {step === 'resolved' && (
                        <div className="flex items-center gap-1.5 text-xs text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Record sealed — sequence complete
                        </div>
                      )}
                    </div>
                  );
                })
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
        orgType={orgType}
      />
      <AssignWorkOrderDialog
        open={showWorkOrderDialog}
        onOpenChange={setShowWorkOrderDialog}
        onSubmit={handleAssignWorkOrder}
      />
    </MainLayout>
  );
}
