import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { NexumBranding } from "@/components/NexumBranding";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { DCIntelligencePanel } from '@/components/global/DCIntelligencePanel';
import { ScopeAlignmentPanel } from '@/components/global/ScopeAlignmentPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { ExportButtons } from '@/components/global/ExportButtons';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, AlertTriangle, CheckCircle, RefreshCw, Calendar,
  Wrench, Shield, Users, Gauge, Flame, Snowflake, Wind,
  Droplets, Waves, ClipboardList, TrendingUp, Clock, BarChart3,
  Building2, Radio, Zap, HardHat, UserCog, GitBranch, Eye, Lock,
  Brain, Lightbulb, TrendingDown, ChevronRight, Sparkles, FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KPIs {
  logsToday: number; logsLast7Days: number; openWorkOrders: number;
  overdueWorkOrders: number; openViolations: number;
  equipmentOnline: number; equipmentTotal: number; activeStaffToday: number;
}

interface OperationCenterData {
  facilityId: string; generatedAt: string; kpis: KPIs;
  shiftSummary: { date: string; totalLogsToday: number; equipmentChecked: number; activeOperators: number; activityTimeline: Array<{ date: string; count: number }> };
  recentLogsFeed: Array<{ logId: string; timestamp: string; equipmentId: string; equipmentType: string; operatorId: string; operatorName: string; summary: string; flagged: boolean }>;
  workOrdersSummary: { total: number; open: number; inProgress: number; completed: number; overdue: number; recent: Array<{ id: string; title: string; status: string; priority: string; assignedTo: string; equipmentId: string; dueDate: string; createdAt: string; cost: number | null }> };
  equipmentStatus: { total: number; active: number; maintenance: number; decommissioned: number; withBaseline: number; byType: Array<{ type: string; total: number; active: number; maintenance: number }> };
  complianceSummary: { totalViolations30d: number; openViolations: number; criticalViolations: number; flaggedLogs7d: number; events: Array<{ id: string; type: string; description: string; timestamp: string; severity: number; status: string; equipmentId: string; source: string }> };
  personnelSummary: { totalFieldStaff: number; activeToday: number; byRole: Record<string, number>; staff: Array<{ id: string; name: string; role: string; shift: string; logsLast30Days: number; openWorkOrders: number; lastActive: string | null }> };
}

// ─── Probability Feed types + engine ──────────────────────────────────────────

type ProbabilityUrgency = 'Critical' | 'High' | 'Medium' | 'Low';
type ProbabilityConfidence = 'High' | 'Medium' | 'Low';

interface ProbabilitySignal {
  label: string;
  weight: number;
}

interface ProbabilityFinding {
  id: string;
  title: string;
  equipmentType: string;
  probability: number;
  confidence: ProbabilityConfidence;
  signals: ProbabilitySignal[];
  rootCauses: string[];
  recommendation: string;
  urgency: ProbabilityUrgency;
  vvfiRecommended: boolean;
}

function buildProbabilityFeed(data: OperationCenterData): ProbabilityFinding[] {
  const findings: ProbabilityFinding[] = [];

  // ── Signal 1: Overdue Work Orders → PM Lag ─────────────────────────────────
  const overdue = data.workOrdersSummary?.overdue ?? 0;
  const totalWOs = data.workOrdersSummary?.total ?? 1;
  if (overdue > 0) {
    const overdueRatio = overdue / totalWOs;
    const prob = Math.min(95, Math.round(overdueRatio * 60 + (overdue >= 3 ? 35 : 20)));
    findings.push({
      id: 'overdue-wos',
      title: 'Preventive Maintenance Lag Detected',
      equipmentType: 'multiple systems',
      probability: prob,
      confidence: overdue >= 3 ? 'High' : 'Medium',
      signals: [
        { label: `${overdue} overdue work order${overdue > 1 ? 's' : ''}`, weight: 40 },
        ...(data.kpis?.openWorkOrders > 5 ? [{ label: 'High open WO backlog overall', weight: 20 }] : []),
      ],
      rootCauses: [
        'PM schedule not adhered to — tasks deferred past due dates',
        'Staff capacity constraints preventing timely completion',
        'Parts or vendor availability creating repair bottlenecks',
        'Work order prioritization gaps — critical items buried',
        'Seasonal demand peak stretching maintenance crew thin',
      ],
      recommendation: 'Review WO backlog with your supervisor. Identify which systems are most overdue and prioritize by operational risk.',
      urgency: overdue >= 3 ? 'Critical' : 'High',
      vvfiRecommended: overdue >= 2,
    });
  }

  // ── Signal 2: Flagged Logs → Equipment Distress Pattern ────────────────────
  const flaggedLogs = (data.recentLogsFeed || []).filter(l => l.flagged);
  if (flaggedLogs.length > 0) {
    const byType: Record<string, number> = {};
    flaggedLogs.forEach(l => { byType[l.equipmentType] = (byType[l.equipmentType] ?? 0) + 1; });
    const [topType, topCount] = Object.entries(byType).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    const prob = Math.min(92, flaggedLogs.length * 16 + 28);
    findings.push({
      id: 'flagged-logs',
      title: `Repeated Flag Pattern${topType ? ` — ${topType.replace(/_/g, ' ')} System` : ''}`,
      equipmentType: topType || 'general',
      probability: prob,
      confidence: flaggedLogs.length >= 3 ? 'High' : 'Medium',
      signals: [
        { label: `${flaggedLogs.length} flagged log${flaggedLogs.length > 1 ? 's' : ''} in current window`, weight: 35 },
        ...(topCount >= 2 ? [{ label: `${topCount} flags concentrated on ${topType.replace(/_/g, ' ')}`, weight: 25 }] : []),
      ],
      rootCauses: [
        'Equipment operating outside baseline performance parameters',
        'Sensor or meter calibration drift — readings may be inaccurate',
        'Operator noting anomalous behavior during routine checks',
        'System approaching end-of-life or scheduled maintenance interval',
        'Process condition change upstream affecting downstream readings',
      ],
      recommendation: `Inspect ${topType ? topType.replace(/_/g, ' ') : 'flagged equipment'} logs for recurring patterns. Cross-reference with recent WOs and PM history.`,
      urgency: flaggedLogs.length >= 3 ? 'High' : 'Medium',
      vvfiRecommended: flaggedLogs.length >= 2,
    });
  }

  // ── Signal 3: Open / Critical Violations → Compliance Risk ─────────────────
  const criticalViolations = data.complianceSummary?.criticalViolations ?? 0;
  const openViolations = data.complianceSummary?.openViolations ?? 0;
  if (criticalViolations > 0 || openViolations >= 3) {
    const prob = Math.min(90, criticalViolations * 25 + openViolations * 8 + 20);
    findings.push({
      id: 'compliance-risk',
      title: 'Compliance Risk — Unresolved Violation Pattern',
      equipmentType: 'compliance',
      probability: prob,
      confidence: criticalViolations > 0 ? 'High' : 'Medium',
      signals: [
        ...(criticalViolations > 0 ? [{ label: `${criticalViolations} critical violation${criticalViolations > 1 ? 's' : ''}`, weight: 50 }] : []),
        ...(openViolations > 0 ? [{ label: `${openViolations} total open violations`, weight: 20 }] : []),
        ...(data.complianceSummary?.flaggedLogs7d > 0 ? [{ label: `${data.complianceSummary.flaggedLogs7d} flagged logs in past 7 days`, weight: 15 }] : []),
      ],
      rootCauses: [
        'SOPs not being followed during routine operations',
        'Staff training gaps on specific equipment or procedures',
        'Equipment failure creating compliance conditions',
        'Documentation frequency requirements not met',
        'Recent operational changes not yet reflected in procedures',
      ],
      recommendation: 'Review all open violations in the Compliance tab. Critical violations require immediate corrective action and documented resolution.',
      urgency: criticalViolations > 0 ? 'Critical' : 'High',
      vvfiRecommended: true,
    });
  }

  // ── Signal 4: Equipment in Maintenance → Fleet Stress ──────────────────────
  const inMaint = data.equipmentStatus?.maintenance ?? 0;
  const totalEquip = Math.max(data.equipmentStatus?.total ?? 1, 1);
  if (inMaint > 0) {
    const maintPct = (inMaint / totalEquip) * 100;
    const prob = Math.min(85, Math.round(maintPct * 1.8 + 22));
    findings.push({
      id: 'maintenance-load',
      title: `Equipment Fleet Stress — ${inMaint} Unit${inMaint > 1 ? 's' : ''} In Maintenance`,
      equipmentType: 'multiple',
      probability: prob,
      confidence: maintPct > 20 ? 'High' : 'Medium',
      signals: [
        { label: `${inMaint} of ${data.equipmentStatus?.total} units in maintenance (${Math.round(maintPct)}%)`, weight: 40 },
        ...(maintPct > 25 ? [{ label: 'Fleet maintenance rate exceeds 25% threshold', weight: 20 }] : []),
      ],
      rootCauses: [
        'Deferred maintenance compounding into concurrent failures',
        'Seasonal load peaks stressing equipment beyond rated capacity',
        'End-of-life equipment reaching failure threshold simultaneously',
        'Repair crew or parts availability creating a maintenance backlog',
        'Incorrect operating procedures accelerating equipment wear',
      ],
      recommendation: `${maintPct > 25 ? 'Urgent: high fleet maintenance rate. ' : ''}Review units in maintenance — identify shared root causes or common vendor.`,
      urgency: maintPct > 25 ? 'High' : 'Medium',
      vvfiRecommended: maintPct > 20,
    });
  }

  // ── Signal 5: Repeat Work Orders on Same Equipment → Chronic Issue ─────────
  const recentWOs = data.workOrdersSummary?.recent ?? [];
  const openWOs = recentWOs.filter(wo =>
    ['open', 'in progress', 'in_progress'].includes(wo.status?.toLowerCase() ?? '')
  );
  const byEquip: Record<string, number> = {};
  openWOs.forEach(wo => { if (wo.equipmentId) byEquip[wo.equipmentId] = (byEquip[wo.equipmentId] ?? 0) + 1; });
  const repeatEquip = Object.entries(byEquip).filter(([, count]) => count >= 2);
  if (repeatEquip.length > 0) {
    findings.push({
      id: 'repeat-wos',
      title: `Chronic Issue — ${repeatEquip.length} Unit${repeatEquip.length > 1 ? 's' : ''} with Repeat Open WOs`,
      equipmentType: 'multiple',
      probability: Math.min(88, repeatEquip.length * 18 + 42),
      confidence: 'High',
      signals: [
        { label: `${repeatEquip.length} equipment ID${repeatEquip.length > 1 ? 's' : ''} with 2+ concurrent open work orders`, weight: 55 },
      ],
      rootCauses: [
        'Underlying root cause not addressed — surface repairs only',
        'Worn components not replaced during previous service visits',
        'Operating conditions exceeding equipment design parameters',
        'Incorrect repair procedure or wrong parts specified',
        'Systemic issue affecting a family of similar units',
      ],
      recommendation: `Investigate ${repeatEquip.slice(0, 3).map(([id]) => id).join(', ')}${repeatEquip.length > 3 ? ' and others' : ''} — multiple open WOs indicate a chronic failure, not isolated incidents.`,
      urgency: 'High',
      vvfiRecommended: true,
    });
  }

  // ── Signal 6: Low Log Activity → Operational Visibility Gap ────────────────
  const logsToday = data.kpis?.logsToday ?? 0;
  const activeStaff = data.kpis?.activeStaffToday ?? 1;
  const logRatio = logsToday / Math.max(activeStaff, 1);
  if (logRatio < 1 && activeStaff > 0) {
    findings.push({
      id: 'low-log-activity',
      title: 'Operational Visibility Gap — Low Log Activity',
      equipmentType: 'operations',
      probability: Math.min(70, Math.round((1 - logRatio) * 50 + 20)),
      confidence: 'Medium',
      signals: [
        { label: `Only ${logsToday} logs submitted today with ${activeStaff} active staff`, weight: 30 },
        { label: 'Log-to-staff ratio below 1:1 threshold', weight: 20 },
      ],
      rootCauses: [
        'Staff not completing required daily log rounds',
        'Equipment logging skipped due to perceived non-issues',
        'Staff unfamiliar with logging requirements or system',
        'High workload causing documentation to be deprioritized',
      ],
      recommendation: 'Remind active operators to complete their equipment log rounds. Low log activity reduces the system\'s ability to detect emerging issues.',
      urgency: 'Medium',
      vvfiRecommended: false,
    });
  }

  const urgencyOrder: Record<ProbabilityUrgency, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return findings.sort((a, b) =>
    urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.probability - a.probability
  );
}

// ─── Workflow templates (mirrors Workflows page) ───────────────────────────────

const WORKFLOW_TEMPLATES = [
  {
    id: 'tpl-1', name: 'Boiler Emergency Response', system: 'boiler', icon: '🔥',
    estimatedHours: 4.0,
    description: 'Standard response workflow for boiler alarms and failures.',
    triggers: ['High stack temperature', 'Low water cutoff', 'Flame failure'],
    steps: [
      { name: 'Verify alarm and assess severity',     assignTo: 'Technician',  hours: 0.5 },
      { name: 'Implement immediate safety measures',  assignTo: 'Supervisor',  hours: 1.0 },
      { name: 'Contact vendor if required',           assignTo: 'Supervisor',  hours: 0.5 },
      { name: 'Document and analyze root cause',      assignTo: 'Technician',  hours: 2.0 },
    ],
  },
  {
    id: 'tpl-2', name: 'Chiller Performance Issue', system: 'chiller', icon: '❄️',
    estimatedHours: 7.0,
    description: 'Workflow for chiller efficiency drops and performance issues.',
    triggers: ['High discharge pressure', 'Low suction pressure', 'Efficiency drop >5%'],
    steps: [
      { name: 'Review operating parameters',            assignTo: 'Technician', hours: 1.0 },
      { name: 'Check refrigerant levels and pressures', assignTo: 'Technician', hours: 2.0 },
      { name: 'Inspect condenser and evaporator',       assignTo: 'Technician', hours: 3.0 },
      { name: 'Schedule cleaning if required',          assignTo: 'Supervisor', hours: 1.0 },
    ],
  },
  {
    id: 'tpl-3', name: 'PM Work Order Creation', system: 'general', icon: '🔧',
    estimatedHours: 3.25,
    description: 'Preventive maintenance scheduling and assignment workflow.',
    triggers: ['Scheduled PM date', 'Equipment hours threshold', 'Manual trigger'],
    steps: [
      { name: 'Generate PM work order',                assignTo: 'Supervisor',  hours: 0.25 },
      { name: 'Assign to qualified technician',        assignTo: 'Manager',     hours: 0.25 },
      { name: 'Confirm parts and materials available', assignTo: 'Technician',  hours: 0.5 },
      { name: 'Execute PM and log readings',           assignTo: 'Technician',  hours: 2.0 },
      { name: 'Manager sign-off and close WO',         assignTo: 'Manager',     hours: 0.25 },
    ],
  },
  {
    id: 'tpl-4', name: 'Compliance Violation Response', system: 'general', icon: '🛡️',
    estimatedHours: 4.0,
    description: 'Structured response workflow for compliance violations.',
    triggers: ['Violation logged', 'Inspector finding', 'Self-audit result'],
    steps: [
      { name: 'Document violation details',        assignTo: 'Supervisor', hours: 0.5 },
      { name: 'Notify relevant leadership',        assignTo: 'Supervisor', hours: 0.25 },
      { name: 'Implement corrective action',       assignTo: 'Technician', hours: 2.0 },
      { name: 'Verify correction and re-inspect',  assignTo: 'Engineer',   hours: 1.0 },
      { name: 'Update compliance logger',          assignTo: 'Supervisor', hours: 0.25 },
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

const ActivityBar = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No activity data</div>;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-1.5 h-24">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex-1 w-full flex items-end">
            <div className={cn('w-full rounded-t transition-all duration-500', item.count > 0 ? 'bg-gradient-to-t from-primary to-primary/40' : 'bg-muted/20')}
              style={{ height: `${item.count > 0 ? (item.count / maxCount) * 100 : 8}%`, minHeight: '3px' }} />
          </div>
          <p className="text-[10px] font-semibold text-primary">{item.count}</p>
          <p className="text-[9px] text-muted-foreground">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
        </div>
      ))}
    </div>
  );
};

const EquipmentTypeIcon = ({ type }: { type: string }) => {
  const map: Record<string, any> = { boiler: Flame, chiller: Snowflake, ahu: Wind, air_handler: Wind, pump: Droplets, cooling_tower: Waves };
  const Icon = map[type?.toLowerCase()] || Gauge;
  return <Icon className="w-4 h-4" />;
};

const getPriorityColor = (priority: string) => {
  if (priority === 'Critical') return 'bg-destructive text-destructive-foreground';
  if (priority === 'High')     return 'bg-orange-500 text-orange-950';
  if (priority === 'Medium')   return 'bg-yellow-500 text-yellow-950';
  return 'bg-muted text-muted-foreground';
};

const getStatusColor = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'completed' || s === 'resolved') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (s === 'in progress' || s === 'in_progress') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (s === 'open') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-muted/50 text-muted-foreground border-border/30';
};

const getSeverityColor = (severity: number) => {
  if (severity >= 4) return 'bg-destructive text-destructive-foreground';
  if (severity >= 3) return 'bg-orange-500 text-orange-950';
  if (severity >= 2) return 'bg-yellow-500 text-yellow-950';
  return 'bg-green-500/20 text-green-400';
};

const getRoleIcon = (role: string) => {
  const r = role?.toLowerCase();
  if (r === 'engineer') return UserCog;
  if (r === 'technician' || r === 'tech') return Wrench;
  if (r === 'custodian') return Building2;
  return HardHat;
};

const KPICard = ({ label, value, icon: Icon, accent, sub }: { label: string; value: string | number; icon: any; accent?: string; sub?: string }) => (
  <Card className="neon-border min-w-0">
    <CardContent className="p-3">
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight truncate flex-1">{label}</p>
        <Icon className={cn('w-4 h-4 opacity-60 shrink-0', accent || 'text-primary')} />
      </div>
      <p className={cn('text-xl font-bold leading-tight truncate', accent || 'text-primary')}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OperationCenter() {
  const { isAuthenticated, loading, user } = useAuth();
  const { toast } = useToast();
  const { can, isAdmin } = useTier();
  const [data, setData] = useState<OperationCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'workorders' | 'compliance' | 'personnel' | 'workflows' | 'probability'>('overview');
  const [recentWOs, setRecentWOs] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<typeof WORKFLOW_TEMPLATES[0] | null>(null);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '1m' | '3m' | 'all'>('7d');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const hasVVFI = can('vvfi');

  const probabilityFindings = useMemo(
    () => data ? buildProbabilityFeed(data) : [],
    [data]
  );

  const fetchData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await apiRequest('/dashboard/manager');
      setData(result);
    } catch (err: any) {
      console.error('❌ Operation Center fetch failed:', err);
      setError(err.message || 'Failed to load Operation Center data');
      toast({ title: 'Error', description: 'Failed to load Operation Center', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecentWOs = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setRecentWOs((d.workOrders || d.items || []).slice(0, 8));
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { setIsLoading(false); setError('Authentication required. Please log in.'); return; }

    fetchData();
    fetchRecentWOs();

    let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => {
      fetchData().catch((err: any) => {
        // Stop polling if auth failed to avoid flooding expired-token 401s
        if (err?.status === 401 && intervalId) { clearInterval(intervalId); intervalId = null; }
      });
      fetchRecentWOs();
    }, 30000);

    const logHandler = () => { fetchData(); fetchRecentWOs(); };
    window.addEventListener('facility-log-submitted', logHandler);
    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('facility-log-submitted', logHandler);
    };
  }, [isAuthenticated, loading, fetchData, fetchRecentWOs]);



  if (loading)            return <NexumPageLoader message="Authenticating..." />;

  // Tier gate — show upgrade prompt instead of a raw API auth error
  if (!isAdmin && !can('operations_center')) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Operation Center</h2>
          <p className="text-muted-foreground max-w-md">
            The Operation Center provides a real-time facility-wide view — equipment status, work orders, compliance, personnel, and AI probability feeds.
            Available on the <strong>Business</strong> plan and above.
          </p>
          <Button onClick={() => window.location.href = '/pricing'} className="mt-2">
            View Plans &amp; Upgrade
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (error && !data)     return <NexumError message={error} onRetry={fetchData} />;
  if (isLoading && !data) return (
    <MainLayout>
      <div className="flex justify-center py-20"><NexumLoader message="Loading Operation Center..." /></div>
    </MainLayout>
  );

  // ── Governance: log completeness check (Record layer) ─────────────────────
  function logGovernanceStatus(log: any): { label: string; color: string; borderClass: string; score: number } {
    const checks = [
      !!log.timestamp,
      !!(log.equipmentType || log.systemType),
      !!(log.operatorName || log.operatorId),
      !!(log.summary || log.notes || log.description),
    ];
    const score = checks.filter(Boolean).length;
    if (score === 4) return { label: 'Admissible', color: 'text-green-400', borderClass: 'border-green-500/20', score };
    if (score === 3) return { label: 'Incomplete', color: 'text-yellow-400', borderClass: 'border-yellow-500/30', score };
    return { label: 'Invalid', color: 'text-red-400', borderClass: 'border-red-500/30', score };
  }

  const filterByDateRange = (items: any[], field = 'timestamp') => {
    if (dateRange === 'all') return items;
    const now = Date.now();
    const ms = dateRange === '24h' ? 86400000 : dateRange === '7d' ? 604800000 : dateRange === '1m' ? 2592000000 : 7776000000;
    return items.filter(item => {
      const t = new Date(item[field] || item.createdAt || item.timestamp || 0).getTime();
      return !isNaN(t) && t >= now - ms;
    });
  };

  const tabs = [
    { key: 'overview',     label: 'Overview',          icon: Radio },
    { key: 'equipment',    label: 'Equipment',         icon: Gauge },
    { key: 'workorders',   label: 'Work Orders',       icon: ClipboardList },
    { key: 'compliance',   label: 'Compliance',        icon: Shield },
    { key: 'personnel',    label: 'Personnel',         icon: Users },
    { key: 'workflows',    label: 'Workflows',         icon: GitBranch },
    { key: 'probability',  label: 'Probability Feed',  icon: Brain },
  ] as const;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground text-glow">Operation Center</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Facility-wide live view • {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-muted/30 rounded-lg p-1 border border-border/40">
              {(['24h', '7d', '1m', '3m', 'all'] as const).map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={cn('px-2 py-1 text-xs rounded font-medium transition-all',
                    dateRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {r === 'all' ? 'All' : r === '1m' ? '30d' : r === '3m' ? '90d' : r.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="border-primary/30 hover:border-primary">
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />Refresh
            </Button>
            <ExportButtons
              title="Operation Center Report"
              metrics={data?.kpis ? [
                { label: 'Logs Today',       value: `${data.kpis.logsToday}` },
                { label: 'Open Work Orders', value: `${data.kpis.openWorkOrders}` },
                { label: 'Open Violations',  value: `${data.kpis.openViolations}` },
                { label: 'Equipment Online', value: `${data.kpis.equipmentOnline}/${data.kpis.equipmentTotal}` },
              ] : undefined}
            />
          </div>
        </div>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20"><NexumLoader message="Refreshing data..." /></div>
        ) : data && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <KPICard label="Logs Today"    value={data.kpis?.logsToday ?? 0}         icon={Activity}      accent="text-neon-cyan" />
              <KPICard label="Logs 7 Days"   value={data.kpis?.logsLast7Days ?? 0}    icon={TrendingUp}    accent="text-primary" />
              <KPICard label="Open WOs"      value={data.kpis?.openWorkOrders ?? 0}   icon={ClipboardList} accent="text-yellow-400"
                sub={(data.kpis?.overdueWorkOrders ?? 0) > 0 ? `${data.kpis?.overdueWorkOrders} overdue` : undefined} />
              <KPICard label="Overdue WOs"   value={data.kpis?.overdueWorkOrders ?? 0} icon={Clock}        accent={(data.kpis?.overdueWorkOrders ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'} />
              <KPICard label="Violations"    value={data.kpis?.openViolations ?? 0}   icon={AlertTriangle} accent={(data.kpis?.openViolations ?? 0) > 0 ? 'text-orange-400' : 'text-green-400'} />
              <KPICard label="Equip. Online" value={`${data.kpis?.equipmentOnline ?? 0}/${data.kpis?.equipmentTotal ?? 0}`} icon={Gauge} accent="text-success" />
              <KPICard label="Active Staff"  value={data.kpis?.activeStaffToday ?? 0} icon={Users}         accent="text-primary" sub="today" />
              <KPICard label="Total Staff"   value={data.personnelSummary?.totalFieldStaff || 0} icon={HardHat} />
            </div>

            {/* Decision Continuity™ compact health indicator — role & tier auto-gated */}
            <DCIntelligencePanel compact limit={3} />

            {/* Tab Nav */}
            <div className="flex gap-1 border-b border-border/40 overflow-x-auto pb-0">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                    activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Today's Shift Summary
                      <Badge variant="outline" className="ml-auto text-xs">{data.shiftSummary?.date ?? '—'}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Activity className="w-7 h-7 mx-auto mb-2 text-primary" />
                        <p className="text-3xl font-bold">{data.shiftSummary?.totalLogsToday ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Logs Submitted</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Gauge className="w-7 h-7 mx-auto mb-2 text-success" />
                        <p className="text-3xl font-bold">{data.shiftSummary?.equipmentChecked ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Equipment Checked</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Users className="w-7 h-7 mx-auto mb-2 text-neon-cyan" />
                        <p className="text-3xl font-bold">{data.shiftSummary?.activeOperators ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Active Operators</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">7-Day Activity</p>
                      <ActivityBar data={data.shiftSummary?.activityTimeline || []} />
                    </div>
                  </CardContent>
                </Card>

                {/* Scope & DC Intelligence — side by side, auto role+tier gated */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <ScopeAlignmentPanel limit={12} />
                  <DCIntelligencePanel compact limit={3} />
                </div>

                {/* Top probability signals surfaced in overview */}
                {probabilityFindings.filter(f => f.urgency === 'Critical' || f.urgency === 'High').length > 0 && (
                  <Card className="neon-border border-orange-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Brain className="w-4 h-4 text-orange-400" />
                        Top Probability Signals
                        <Badge variant="outline" className="ml-auto border-orange-500/40 text-orange-300 text-xs">
                          {probabilityFindings.filter(f => f.urgency === 'Critical' || f.urgency === 'High').length} high-priority
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {probabilityFindings.filter(f => f.urgency === 'Critical' || f.urgency === 'High').slice(0, 3).map(f => (
                        <div key={f.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/30 bg-muted/20">
                          <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0',
                            f.urgency === 'Critical' ? 'bg-red-400' : 'bg-orange-400')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{f.title}</span>
                              <Badge variant="outline" className={cn('text-[10px] h-4 px-1',
                                f.urgency === 'Critical' ? 'border-red-500/40 text-red-300' : 'border-orange-500/40 text-orange-300')}>
                                {f.probability}% probability
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{f.recommendation}</p>
                          </div>
                          <button onClick={() => setActiveTab('probability')}
                            className="text-xs text-primary hover:underline shrink-0 mt-0.5">
                            Details
                          </button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Log Activity
                      <Badge variant="outline" className="ml-auto">{filterByDateRange(data.recentLogsFeed || []).length} entries</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filterByDateRange(data.recentLogsFeed || []).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No recent logs</p>
                    ) : (
                      <div className="space-y-2">
                        {filterByDateRange(data.recentLogsFeed || []).map((log, i) => {
                          const gov = logGovernanceStatus(log);
                          return (
                            <div key={log.logId || i} className={cn('flex items-start gap-3 p-3 rounded-lg border transition-all',
                              log.flagged ? 'border-orange-500/40 bg-orange-500/5' : `${gov.borderClass} bg-muted/20 hover:border-primary/20`)}>
                              <div className="mt-0.5"><EquipmentTypeIcon type={log.equipmentType} /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{log.equipmentId}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.equipmentType?.replace('_', ' ')}</Badge>
                                  {log.flagged && <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">Flagged</Badge>}
                                  <span className={cn('ml-auto flex items-center gap-1 text-[10px] font-semibold', gov.color)}>
                                    {gov.score === 4 ? <Lock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {gov.label}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{log.operatorName} • {new Date(log.timestamp).toLocaleString()}</p>
                                {log.summary && <p className="text-xs text-muted-foreground/70 mt-1 truncate">{log.summary}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── EQUIPMENT ── */}
            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Active',         value: data.equipmentStatus?.active         ?? 0, color: 'text-green-400',        icon: CheckCircle },
                    { label: 'Maintenance',    value: data.equipmentStatus?.maintenance    ?? 0, color: 'text-yellow-400',       icon: Wrench },
                    { label: 'Decommissioned', value: data.equipmentStatus?.decommissioned ?? 0, color: 'text-muted-foreground', icon: AlertTriangle },
                    { label: 'Baseline Set',   value: data.equipmentStatus?.withBaseline   ?? 0, color: 'text-primary',          icon: TrendingUp },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <Card key={label} className="neon-border">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Icon className={cn('w-8 h-8 opacity-70', color)} />
                        <div><p className={cn('text-2xl font-bold', color)}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="neon-border">
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Equipment by Type</CardTitle></CardHeader>
                  <CardContent>
                    {(data.equipmentStatus?.byType || []).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No equipment data</p>
                    ) : (
                      <div className="space-y-3">
                        {(data.equipmentStatus?.byType || []).map((eq) => {
                          const pct = (data.equipmentStatus?.total ?? 0) > 0 ? (eq.total / data.equipmentStatus!.total) * 100 : 0;
                          return (
                            <div key={eq.type} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2"><EquipmentTypeIcon type={eq.type} /><span className="capitalize">{eq.type.replace('_', ' ')}</span></div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="text-green-400">{eq.active} active</span>
                                  {eq.maintenance > 0 && <span className="text-yellow-400">{eq.maintenance} maint.</span>}
                                  <span className="font-semibold text-foreground">{eq.total} total</span>
                                </div>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── WORK ORDERS ── */}
            {activeTab === 'workorders' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Total',       value: data.workOrdersSummary?.total      ?? 0, color: 'text-foreground' },
                    { label: 'Open',        value: data.workOrdersSummary?.open       ?? 0, color: 'text-blue-400' },
                    { label: 'In Progress', value: data.workOrdersSummary?.inProgress ?? 0, color: 'text-yellow-400' },
                    { label: 'Completed',   value: data.workOrdersSummary?.completed  ?? 0, color: 'text-green-400' },
                    { label: 'Overdue',     value: data.workOrdersSummary?.overdue    ?? 0, color: (data.workOrdersSummary?.overdue ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} className="neon-border"><CardContent className="p-4 text-center"><p className={cn('text-3xl font-bold', color)}>{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></CardContent></Card>
                  ))}
                </div>
                <Card className="neon-border">
                  <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" />Recent Work Orders</CardTitle></CardHeader>
                  <CardContent>
                    {filterByDateRange(data.workOrdersSummary?.recent || [], 'createdAt').length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No work orders found</p>
                    ) : (
                      <div className="space-y-3">
                        {filterByDateRange(data.workOrdersSummary?.recent || [], 'createdAt').map((wo) => (
                          <div key={wo.id} className="p-4 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/30 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-sm">{wo.title}</span>
                                  <Badge className={getPriorityColor(wo.priority)}>{wo.priority}</Badge>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                                  {wo.equipmentId && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{wo.equipmentId}</span>}
                                  {wo.assignedTo && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{wo.assignedTo}</span>}
                                  {wo.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {wo.dueDate}</span>}
                                  {wo.cost != null && <span className="flex items-center gap-1 text-green-400">${wo.cost.toLocaleString()}</span>}
                                </div>
                              </div>
                              <Badge variant="outline" className={getStatusColor(wo.status)}>{wo.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── COMPLIANCE ── */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Violations (30d)',  value: data.complianceSummary?.totalViolations30d ?? 0, color: 'text-foreground', icon: Shield },
                    { label: 'Open Violations',   value: data.complianceSummary?.openViolations     ?? 0, color: (data.complianceSummary?.openViolations ?? 0) > 0 ? 'text-orange-400' : 'text-green-400', icon: AlertTriangle },
                    { label: 'Critical',          value: data.complianceSummary?.criticalViolations ?? 0, color: (data.complianceSummary?.criticalViolations ?? 0) > 0 ? 'text-destructive' : 'text-green-400', icon: Zap },
                    { label: 'Flagged Logs (7d)', value: data.complianceSummary?.flaggedLogs7d      ?? 0, color: 'text-yellow-400', icon: Activity },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <Card key={label} className="neon-border"><CardContent className="p-4 flex items-center gap-3"><Icon className={cn('w-8 h-8 opacity-70', color)} /><div><p className={cn('text-2xl font-bold', color)}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
                  ))}
                </div>
                <Card className="neon-border">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Compliance Events<Badge variant="outline" className="ml-auto">{filterByDateRange(data.complianceSummary?.events || []).length}</Badge></CardTitle></CardHeader>
                  <CardContent>
                    {filterByDateRange(data.complianceSummary?.events || []).length === 0 ? (
                      <div className="text-center py-8"><CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" /><p className="text-muted-foreground">No compliance issues — all clear</p></div>
                    ) : (
                      <div className="space-y-3">
                        {filterByDateRange(data.complianceSummary?.events || []).map((event, i) => (
                          <div key={event.id || i} className={cn('p-4 rounded-lg border transition-all',
                            event.severity >= 4 ? 'border-destructive/50 bg-destructive/5 animate-pulse' :
                            event.severity >= 3 ? 'border-orange-500/40 bg-orange-500/5' : 'border-border/40 bg-muted/20')}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                {event.severity >= 3 ? <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" /> : <Activity className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">{event.type}</p>
                                  <p className="text-xs text-muted-foreground">{event.equipmentId && <>{event.equipmentId} • </>}{new Date(event.timestamp).toLocaleString()}</p>
                                  {event.description && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{event.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className={getSeverityColor(event.severity)}>Sev {event.severity}</Badge>
                                <Badge variant="outline" className={getStatusColor(event.status)}>{event.status}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── PERSONNEL ── */}
            {activeTab === 'personnel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(data.personnelSummary?.byRole || {}).map(([role, count]) => {
                    const Icon = getRoleIcon(role);
                    return (
                      <Card key={role} className="neon-border"><CardContent className="p-4 flex items-center gap-3"><Icon className="w-8 h-8 text-primary opacity-70" /><div><p className="text-2xl font-bold text-primary">{count}</p><p className="text-xs text-muted-foreground capitalize">{role}s</p></div></CardContent></Card>
                    );
                  })}
                  <Card className="neon-border"><CardContent className="p-4 flex items-center gap-3"><Radio className="w-8 h-8 text-neon-cyan opacity-70" /><div><p className="text-2xl font-bold text-neon-cyan">{data.personnelSummary?.activeToday ?? 0}</p><p className="text-xs text-muted-foreground">Active Today</p></div></CardContent></Card>
                </div>
                <Card className="neon-border">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Field Staff Activity<Badge variant="outline" className="ml-auto">{data.personnelSummary?.totalFieldStaff ?? 0} total</Badge></CardTitle></CardHeader>
                  <CardContent>
                    {(data.personnelSummary?.staff || []).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No field staff found</p>
                    ) : (
                      <div className="space-y-2">
                        {(data.personnelSummary?.staff || []).map((person) => {
                          const Icon = getRoleIcon(person.role);
                          const isActiveToday = person.lastActive && new Date(person.lastActive).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                          return (
                            <div key={person.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/20 transition-all">
                              <div className={cn('p-2 rounded-full', isActiveToday ? 'bg-primary/20' : 'bg-muted/40')}>
                                <Icon className={cn('w-4 h-4', isActiveToday ? 'text-primary' : 'text-muted-foreground')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{person.name}</p>
                                  {isActiveToday && <Badge className="text-[9px] px-1 py-0 bg-green-500/20 text-green-400 border-green-500/30">Active today</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground capitalize">{person.role} • {person.shift} shift</p>
                              </div>
                              <div className="text-right text-xs"><p className="font-semibold text-primary">{person.logsLast30Days}</p><p className="text-muted-foreground">logs/30d</p></div>
                              {person.openWorkOrders > 0 && <div className="text-right text-xs"><p className="font-semibold text-yellow-400">{person.openWorkOrders}</p><p className="text-muted-foreground">open WOs</p></div>}
                              {person.lastActive && <div className="text-right text-xs hidden md:block"><p className="text-muted-foreground/60">{new Date(person.lastActive).toLocaleDateString()}</p><p className="text-muted-foreground/40">last active</p></div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── WORKFLOWS ── */}
            {activeTab === 'workflows' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Operational Workflows</h2>
                    <p className="text-sm text-muted-foreground">Run standard workflows or view recent work order activity</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/workflows'}>
                    <GitBranch className="w-4 h-4 mr-2" />Manage Workflows
                  </Button>
                </div>

                {/* Templates — click for detail */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WORKFLOW_TEMPLATES.map(template => (
                    <Card
                      key={template.id}
                      className="neon-border hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedWorkflow(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{template.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{template.name}</p>
                              <Badge variant="outline" className="text-[10px] shrink-0">Built-in</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">
                              {template.system} · {template.steps.length} steps · {template.estimatedHours}h estimated
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                              {template.description}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  Workflows are managed by supervisors and managers. Contact your supervisor to initiate a workflow.
                </div>

                {/* Workflow Detail Dialog */}
                <Dialog open={!!selectedWorkflow} onOpenChange={(o) => !o && setSelectedWorkflow(null)}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    {selectedWorkflow && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <span className="text-xl">{selectedWorkflow.icon}</span>
                            {selectedWorkflow.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          {/* Description */}
                          <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>

                          {/* Meta */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="capitalize">{selectedWorkflow.system}</Badge>
                            <Badge variant="outline">{selectedWorkflow.steps.length} steps</Badge>
                            <Badge variant="outline">{selectedWorkflow.estimatedHours}h estimated</Badge>
                          </div>

                          {/* Triggers */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Triggers</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedWorkflow.triggers.map((t, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Steps */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Steps</p>
                            <div className="space-y-2">
                              {selectedWorkflow.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{step.name}</p>
                                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                                      <span>Assigned to: {step.assignTo}</span>
                                      <span>{step.hours}h</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 shrink-0" />
                            To initiate this workflow, contact your supervisor or manager.
                          </div>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Recent WO activity from workflows */}
                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      Recent Work Orders
                      <Badge variant="outline" className="ml-auto">{recentWOs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentWOs.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No recent work orders</p>
                    ) : (
                      <div className="space-y-2">
                        {recentWOs.map((wo, i) => (
                          <div key={wo.workOrderId || wo.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm hover:bg-muted/50 transition-colors">
                            <CheckCircle className={cn('w-4 h-4 shrink-0', ['completed', 'done', 'closed'].includes(wo.status?.toLowerCase()) ? 'text-green-400' : 'text-muted-foreground')} />
                            <span className="flex-1 truncate">{wo.title || wo.description}</span>
                            <Badge variant="outline" className={cn('text-xs', getStatusColor(wo.status))}>{wo.status || 'open'}</Badge>
                            {wo.createdAt && <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{new Date(wo.createdAt).toLocaleDateString()}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {/* ── PROBABILITY FEED ── */}
            {activeTab === 'probability' && (
              <div className="space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Daily Probability Feed
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Correlating work orders, PMs, flagged logs, violations, and equipment metrics to surface likely root causes.
                      Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}.
                    </p>
                  </div>
                  {probabilityFindings.length > 0 && (
                    <div className="flex gap-2 shrink-0">
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                        {probabilityFindings.filter(f => f.urgency === 'Critical').length} Critical
                      </Badge>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {probabilityFindings.filter(f => f.urgency === 'High').length} High
                      </Badge>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {probabilityFindings.filter(f => f.urgency === 'Medium').length} Medium
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Empty state */}
                {probabilityFindings.length === 0 && (
                  <Card className="neon-border">
                    <CardContent className="py-16 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-70" />
                      <h3 className="text-lg font-semibold mb-1">All Clear</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        No probability signals detected. No overdue WOs, flagged logs, open violations, or maintenance anomalies in your current data window.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Findings */}
                {probabilityFindings.map((finding) => {
                  const isExpanded = expandedFinding === finding.id;
                  const urgencyStyles: Record<string, string> = {
                    Critical: 'border-destructive/40 bg-destructive/5',
                    High:     'border-orange-500/40 bg-orange-500/5',
                    Medium:   'border-yellow-500/30 bg-yellow-500/5',
                    Low:      'border-border/40 bg-muted/20',
                  };
                  const urgencyBadge: Record<string, string> = {
                    Critical: 'bg-destructive/20 text-destructive border-destructive/30',
                    High:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    Medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    Low:      'bg-muted/50 text-muted-foreground border-border/30',
                  };
                  const probColor = finding.probability >= 75 ? 'text-destructive' : finding.probability >= 50 ? 'text-orange-400' : 'text-yellow-400';

                  return (
                    <Card key={finding.id} className={cn('border transition-all', urgencyStyles[finding.urgency])}>
                      <CardContent className="p-0">
                        {/* Summary row — always visible */}
                        <button
                          className="w-full text-left p-4 flex items-start gap-4"
                          onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                        >
                          <div className="shrink-0 mt-0.5">
                            <FlaskConical className={cn('w-5 h-5', probColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm">{finding.title}</span>
                              <Badge className={cn('text-[10px] px-1.5 py-0 border', urgencyBadge[finding.urgency])}>
                                {finding.urgency}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize hidden sm:inline-flex">
                                {finding.equipmentType.replace(/_/g, ' ')}
                              </Badge>
                              {finding.vvfiRecommended && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                                  VVFI Candidate
                                </Badge>
                              )}
                            </div>
                            {/* Probability bar */}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 max-w-48">
                                <Progress value={finding.probability} className="h-1.5" />
                              </div>
                              <span className={cn('text-xs font-bold tabular-nums shrink-0', probColor)}>
                                {finding.probability}% probable
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {finding.confidence} confidence
                              </span>
                            </div>
                            {/* Signals summary */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {finding.signals.map((sig, i) => (
                                <span key={i} className="text-[10px] bg-muted/40 border border-border/30 rounded px-1.5 py-0.5 text-muted-foreground">
                                  {sig.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className={cn('w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform', isExpanded && 'rotate-90')} />
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-border/30 px-4 pb-4 pt-4 space-y-4">
                            {/* Root Causes */}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5" />
                                What may be causing this
                              </p>
                              <div className="space-y-1.5">
                                {finding.rootCauses.map((cause, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">
                                      {i + 1}
                                    </div>
                                    <span className="text-muted-foreground leading-snug">{cause}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recommendation */}
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Recommended Action
                              </p>
                              <p className="text-sm text-foreground">{finding.recommendation}</p>
                            </div>

                            {/* VVFI CTA */}
                            {finding.vvfiRecommended && (
                              hasVVFI ? (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-primary">Deep Diagnostic Available</p>
                                      <p className="text-xs text-muted-foreground">Your VVFI retainer includes full root cause analysis for this pattern.</p>
                                    </div>
                                  </div>
                                  <Button size="sm" className="shrink-0 ml-3" onClick={() => window.location.href = '/vvfi'}>
                                    Open VVFI <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                                  <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-1.5">
                                        VVFI Retainer — Deeper Diagnosis
                                        <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Premium+</Badge>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        The VVFI retainer includes quarterly analysis, a 30-question operational assessment, and a dedicated consultant to diagnose patterns like this one.
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline" className="shrink-0 ml-3 border-primary/30 hover:border-primary" onClick={() => window.location.href = '/pricing'}>
                                    Upgrade <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* How the feed works */}
                <Card className="neon-border border-border/30">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      How the Probability Feed Works
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      {[
                        { icon: ClipboardList, label: 'Work Orders', desc: 'Open, overdue, and repeat WOs signal PM gaps or chronic failures' },
                        { icon: AlertTriangle, label: 'Violations', desc: 'Critical and open violations indicate compliance or operational risk' },
                        { icon: Activity,      label: 'Flagged Logs', desc: 'Repeated equipment flags in the log feed suggest distress patterns' },
                        { icon: Wrench,        label: 'Maintenance Status', desc: 'High fleet maintenance rates indicate systemic stress' },
                        { icon: TrendingUp,    label: 'Log Activity', desc: 'Low log-to-staff ratios flag operational visibility gaps' },
                        { icon: Brain,         label: 'Correlation', desc: 'Findings are ranked by urgency and probability score derived from combined signal weight' },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="flex gap-2">
                          <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                          <div>
                            <p className="font-medium text-foreground/70">{label}</p>
                            <p className="leading-snug">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
