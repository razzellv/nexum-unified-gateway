import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserCheck, AlertTriangle, Package,
  FileText, Briefcase, Building2, CheckCircle2,
  Clock, Target, RefreshCw, BookOpen, Shield,
  TrendingUp, Wrench, Phone, Star, ChevronRight, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function safeStr(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val || fallback;
  if (typeof val === 'object') return val.name || val.id || fallback;
  return String(val) || fallback;
}

const TRANSITION_ROLES = [
  { value: 'facility_manager', label: 'Facility Manager' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'plant_manager', label: 'Plant Manager' },
  { value: 'director', label: 'Director of Facilities' },
  { value: 'executive', label: 'Executive / VP Operations' },
];

interface RiskItem { title: string; severity: 'critical' | 'high' | 'medium'; description: string; source: string }
interface ProjectItem { title: string; status: string; priority: string; description: string }
interface KnowledgeItem { role: string; name: string; topic: string; priority: string }
interface DecisionItem { title: string; context: string; deadline: string; owner: string }
interface AssetItem { name: string; type: string; condition: string; notes: string }
interface ComplianceItem { item: string; dueDate: string; status: string; authority: string }
interface VendorItem { name: string; service: string; contact: string; relationship: string }
interface PriorityItem { title: string; rationale: string; timeframe: string }
interface HistoryItem { date: string; decision: string; outcome: string; madeBy: string }

interface Workspace {
  role: string; roleValue: string; outgoing: string; incoming: string; generatedAt: string;
  plan30: string[]; plan60: string[]; plan90: string[];
  risks: RiskItem[]; projects: ProjectItem[]; knowledge: KnowledgeItem[];
  openDecisions: DecisionItem[]; criticalAssets: AssetItem[]; compliance: ComplianceItem[];
  vendors: VendorItem[]; priorities: PriorityItem[]; decisionHistory: HistoryItem[];
}

function buildWorkspace(roleValue: string, roleLabel: string, outgoing: string, incoming: string): Workspace {
  const storedWOs: any[] = (() => { try { return JSON.parse(localStorage.getItem('nexum_work_orders') || '[]'); } catch { return []; } })();
  const storedViolations: any[] = (() => { try { return JSON.parse(localStorage.getItem('nexum_violations') || '[]'); } catch { return []; } })();
  const storedEquipment: any[] = (() => { try { return JSON.parse(localStorage.getItem('nexum_equipment_library') || '[]'); } catch { return []; } })();
  const storedVendors: any[] = (() => { try { const v = JSON.parse(localStorage.getItem('nexum_vendors') || '[]'); return Array.isArray(v) ? v : v.vendors || v.items || []; } catch { return []; } })();

  const isExecutive = roleValue === 'director' || roleValue === 'executive';

  const plan30 = [
    `Schedule minimum 3 formal knowledge transfer sessions with ${outgoing} — undocumented decisions first`,
    'Physical walkthrough of all facilities and critical equipment rooms — eyes on everything',
    'Meet individually with each direct report — listen first, assess second',
    'Review all active and overdue work orders; identify anything past-due or at risk',
    'Access Facility Memory™ and Operational DNA™ for institutional knowledge baseline',
    'Review compliance calendar for items due within the next 60 days',
    'Identify all active vendor contracts and schedule formal introductions',
    'Review last 12 months of operational logs and performance trend data',
    'Conduct open-door listening sessions with front-line staff (no agenda)',
    'Document any immediate safety or compliance concerns for same-day escalation',
    ...(isExecutive
      ? ['Meet with finance leadership to review budget status and capital planning horizon', 'Review all contracts and commitments valued over $50,000']
      : ['Review all PM schedules and overdue preventive maintenance', 'Meet with key service technicians — they know things the logs don\'t capture']),
  ];

  const plan60 = [
    'Complete and present your facility assessment findings to leadership',
    'Define your top 5 operational priorities — communicate them clearly and repeatedly',
    'Establish regular team meeting cadence and performance reporting rhythm',
    'Review and update emergency response contact lists and protocols',
    'Assess staff training needs and begin scheduling certifications',
    'Resolve or formally assign ownership to all critical work orders',
    'Conduct vendor performance reviews for your top 3–5 service partners',
    'Review energy and utility consumption trends — identify obvious inefficiencies',
    'Identify 3 quick wins and begin execution — build credibility with action',
    'Establish your personal KPI baseline before the next quarterly review',
  ];

  const plan90 = [
    'Present your 6-month operational roadmap to leadership — data-backed, not instinct-driven',
    'Resolve or escalate all critical compliance items with documented action plans',
    'Submit capital expenditure recommendations where deferred maintenance requires investment',
    'Finalize staffing assessment and present individual development plans',
    'Implement first phase of identified operational improvements',
    'Conduct 90-day self-review with your supervisor — set year-one success metrics',
    'Complete vendor scorecard and contract renegotiation recommendations',
    'Finalize annual maintenance budget and capital planning request',
    'Document all critical operational procedures not yet formally captured in platform',
    'Declare full operational ownership — this transition is complete',
  ];

  const risks: RiskItem[] = [];
  storedViolations
    .filter((v: any) => v.severity >= 6 || v.status === 'active')
    .slice(0, 3)
    .forEach((v: any) => {
      risks.push({
        title: safeStr(v.violationType, safeStr(v.type, 'Active Violation')),
        severity: v.severity >= 8 ? 'critical' : v.severity >= 5 ? 'high' : 'medium',
        description: safeStr(v.description, safeStr(v.notes, 'Requires immediate review')),
        source: 'Violations System',
      });
    });

  const defaultRisks: RiskItem[] = [
    { title: 'Undocumented Institutional Knowledge', severity: 'high', description: `Critical decisions, vendor relationships, and operational patterns held by ${outgoing} are likely not fully captured in any system. Multiple knowledge transfer sessions are non-negotiable before their last day.`, source: 'Transition Assessment' },
    { title: 'Vendor Relationship Continuity', severity: 'medium', description: 'Key service partners may have personal relationships with the outgoing leader. Formal re-introductions and relationship mapping are required within 30 days.', source: 'Transition Assessment' },
    { title: 'Compliance Calendar Gap', severity: 'high', description: 'Regulatory deadlines, permit renewals, and inspection schedules must be formally verified and ownership transferred. A missed filing during transition is a leadership failure, not a systems failure.', source: 'Compliance System' },
    { title: 'Capital Projects Continuity', severity: 'medium', description: 'Active capital expenditure requests or approved projects need status reviews and stakeholder re-introductions with incoming leadership.', source: 'Project Controls' },
    { title: 'Team Trust & Retention Risk', severity: 'medium', description: 'Staff loyalty may be personal to the outgoing leader. Leadership transitions create uncertainty — early listening sessions and visible respect for team knowledge are critical stabilizers.', source: 'Transition Assessment' },
  ];
  risks.push(...defaultRisks.slice(0, Math.max(0, 5 - risks.length)));

  const projects: ProjectItem[] = storedWOs
    .filter((wo: any) => wo.priority === 'critical' || wo.priority === 'high')
    .slice(0, 5)
    .map((wo: any) => ({
      title: safeStr(wo.title, safeStr(wo.description, 'Work Order')),
      status: safeStr(wo.status, 'open'),
      priority: safeStr(wo.priority, 'high'),
      description: safeStr(wo.reason, safeStr(wo.notes, 'Review status with outgoing leader')),
    }));

  const projectDefaults: ProjectItem[] = [
    { title: 'Annual Preventive Maintenance Execution', status: 'in-progress', priority: 'high', description: 'Confirm all scheduled and overdue PMs with technician team. Understand what\'s been deferred and why.' },
    { title: 'Energy Optimization Initiative', status: 'planning', priority: 'medium', description: 'Identified savings opportunities pending new leadership review and approval.' },
    { title: 'Compliance Documentation Audit', status: 'open', priority: 'high', description: 'Annual update and verification of all regulatory compliance records.' },
    { title: 'Vendor Contract Review Cycle', status: 'open', priority: 'medium', description: 'Upcoming contract renewals requiring incoming leadership sign-off and potential renegotiation.' },
  ];
  while (projects.length < 4) { projects.push(projectDefaults[projects.length]); }

  const knowledge: KnowledgeItem[] = [
    { role: 'Outgoing Leader', name: outgoing, topic: 'Full operational handover — undocumented decisions, key personal contacts, staff performance concerns, politics, and everything that won\'t survive them walking out the door', priority: 'critical' },
    { role: 'Chief Engineer / Lead Technician', name: 'Identify', topic: 'Critical system conditions, known equipment quirks, maintenance backlog they\'re worried about, and what they think leadership doesn\'t understand about operations', priority: 'critical' },
    { role: 'Compliance / Safety Officer', name: 'Identify', topic: 'Open violations, upcoming inspections, regulatory contacts, and anything they\'ve flagged but haven\'t gotten traction on', priority: 'high' },
    { role: 'Finance / Controller', name: 'Identify', topic: 'Budget status, capital requests, vendor contracts, spending authorities, and financial concerns tied to operations', priority: 'high' },
    { role: 'Key Service Vendor', name: 'Identify', topic: 'Active agreements, response commitments, equipment issues they\'re watching, and what the previous leader promised them', priority: 'medium' },
    { role: 'All Direct Reports', name: 'Individual sessions', topic: 'Individual workload, concerns they haven\'t raised, development goals, and what\'s broken that they wish leadership would fix', priority: 'medium' },
    { role: 'Executive Sponsor / Supervisor', name: 'Identify', topic: 'Strategic priorities for this role, what success looks like in year one, political context, and decisions they expect you to own immediately', priority: 'high' },
  ];

  const openDecisions: DecisionItem[] = [
    { title: 'Capital Equipment Replacement Decision', context: 'Aging equipment evaluation pending repair vs. replace decision — likely has a pending recommendation from outgoing leader', deadline: '90 days', owner: incoming },
    { title: 'Vendor Contract Renewal / Competitive Bid', context: 'Service contracts due for renewal — determine whether to renew on existing terms or issue a competitive RFP', deadline: '60 days', owner: incoming },
    { title: 'Staffing & Succession Planning', context: 'Open positions, skill gaps, or succession items left by outgoing leader that require ownership and action', deadline: '30 days', owner: incoming },
    { title: 'Deferred Maintenance Prioritization', context: 'List of known deferred maintenance items awaiting budget approval — needs risk assessment and prioritization by incoming leader', deadline: '60 days', owner: incoming },
    { title: 'Compliance Remediation Plan', context: 'Any open compliance findings requiring a formal corrective action plan with new leadership accountability', deadline: '30 days', owner: incoming },
  ];

  const criticalAssets: AssetItem[] = storedEquipment.slice(0, 4).map((e: any) => ({
    name: safeStr(e.name, safeStr(e.equipmentName, 'Asset')),
    type: safeStr(e.type, safeStr(e.equipmentType, 'Equipment')),
    condition: safeStr(e.condition, 'Review Required'),
    notes: safeStr(e.notes, safeStr(e.description, 'Physical inspection required within first 30 days')),
  }));

  const assetDefaults: AssetItem[] = [
    { name: 'Central Chiller Plant', type: 'HVAC / Refrigeration', condition: 'Review Required', notes: 'Life-safety and comfort-critical. Review runtime hours, efficiency trends, and last service records. Know who your service vendor is on day one.' },
    { name: 'Boiler System', type: 'Boiler / Steam', condition: 'Review Required', notes: 'High-pressure vessel with state inspection requirements. Verify current inspection certificates and next due date immediately.' },
    { name: 'Emergency Generator / UPS', type: 'Electrical / Life-Safety', condition: 'Review Required', notes: 'Life-safety backup. Verify fuel supply, load test records, and automatic transfer switch function date.' },
    { name: 'Building Automation System (BAS)', type: 'Building Controls', condition: 'Review Required', notes: 'Central monitoring and control. Verify your access credentials, vendor support contract, and current alarm setpoints.' },
    { name: 'Fire Suppression / Alarm System', type: 'Life-Safety', condition: 'Review Required', notes: 'Life-safety system requiring annual inspections. Confirm last test date, deficiency list, and vendor.' },
  ];
  while (criticalAssets.length < 4) { criticalAssets.push(assetDefaults[criticalAssets.length]); }

  const compliance: ComplianceItem[] = [
    { item: 'Annual Boiler / Pressure Vessel Inspection', dueDate: 'Verify with outgoing leader', status: 'Confirm inspection certificate and next due date', authority: 'State Boiler Division' },
    { item: 'Fire Safety System Annual Inspection & Test', dueDate: 'Verify with fire marshal', status: 'Confirm compliance status and deficiency list', authority: 'Local Fire Marshal / NFPA' },
    { item: 'OSHA 300 Log — Annual Posting Requirement', dueDate: 'Feb 1 – Apr 30 annually', status: 'Ensure posting completed and records current', authority: 'OSHA 29 CFR 1904' },
    { item: 'Environmental Permits / Stormwater NPDES', dueDate: 'Verify permit expiry dates', status: 'Review all permit terms and reporting obligations', authority: 'EPA / State DEQ' },
    { item: 'Refrigerant Management Records (EPA Sec. 608)', dueDate: 'Ongoing — annual EPA reporting', status: 'Verify Section 608 compliance and technician certifications', authority: 'EPA Section 608' },
    { item: 'Equipment Operating Licenses & Certifications', dueDate: 'Varies by jurisdiction', status: 'Review all equipment certs — boilers, elevators, pressure vessels', authority: 'Various State / Local' },
    { item: 'Emergency Response Plan — Annual Review', dueDate: 'Annual update required', status: 'Review and update with incoming leadership as named coordinator', authority: 'OSHA / Local EHS' },
  ];

  const vendorData: VendorItem[] = storedVendors.slice(0, 4).map((v: any) => ({
    name: safeStr(v.name, safeStr(v.vendorName, 'Vendor')),
    service: safeStr(v.service, safeStr(v.specialty, 'Service')),
    contact: safeStr(v.contact, safeStr(v.email, 'Review vendor file')),
    relationship: 'Active — Review Contract Terms',
  }));

  const vendorDefaults: VendorItem[] = [
    { name: 'Primary HVAC / Mechanical Contractor', service: 'HVAC Maintenance, Repairs & Emergency Response', contact: 'Review vendor file', relationship: 'Review active service agreement and emergency response SLA' },
    { name: 'Plumbing & Piping Contractor', service: 'Plumbing, Piping & Mechanical Systems', contact: 'Review vendor file', relationship: 'Review active service agreement' },
    { name: 'Electrical Contractor', service: 'Electrical Systems, Panel Maintenance & Controls', contact: 'Review vendor file', relationship: 'Review active service agreement' },
    { name: 'Life Safety / Fire Protection Contractor', service: 'Sprinkler, Fire Alarm & Suppression Systems', contact: 'Review vendor file', relationship: 'Review annual maintenance contract' },
  ];
  while (vendorData.length < 4) { vendorData.push(vendorDefaults[vendorData.length]); }

  const priorities: PriorityItem[] = [
    { title: 'Safety & Compliance First', rationale: 'No matter what else is happening, no safety issue gets deferred on your watch. Establish this as your standard in the first 30 days and the team will respect you for it.', timeframe: 'Days 1–30' },
    { title: 'Team Stability & Trust Before Change', rationale: 'Your team is watching closely. Avoid structural changes in the first 60 days. Listen far more than you speak. Build psychological safety before you drive any change.', timeframe: 'Days 1–60' },
    { title: 'Operational Continuity Above All', rationale: 'Understand what\'s fragile, what\'s vendor-dependent, and what would hurt most if it failed in your first 90 days. Protect those things first.', timeframe: 'Days 1–30' },
    { title: 'Capital & Budget Clarity', rationale: 'Know exactly what\'s approved, what\'s pending, and what decisions you\'ve inherited before committing to anything. No capital promises in the first 60 days.', timeframe: 'Days 30–60' },
    { title: 'Establish Baseline Before You Change Anything', rationale: 'Define what "good" looks like before you change anything. Collect data. Set KPIs. Change should be data-driven and defensible, not instinct-driven.', timeframe: 'Days 60–90' },
  ];

  const decisionHistory: HistoryItem[] = [
    { date: 'Access Decision Continuity™ Vault', decision: 'Major capital decisions and asset investments from last 24 months', outcome: 'Full documented history with rationale available in platform', madeBy: outgoing },
    { date: 'Access Decision Continuity™ Vault', decision: 'Vendor selection and contract decisions with justification', outcome: 'Full documented history with rationale available in platform', madeBy: outgoing },
    { date: 'Access Decision Continuity™ Vault', decision: 'Safety and compliance response decisions with outcomes', outcome: 'Full documented history with rationale available in platform', madeBy: outgoing },
    { date: 'Schedule knowledge interview', decision: 'Informal operational decisions not captured in any system', outcome: 'Must be captured in knowledge transfer sessions before outgoing leader departs', madeBy: outgoing },
  ];

  return {
    role: roleLabel, roleValue, outgoing, incoming,
    generatedAt: new Date().toISOString(),
    plan30, plan60, plan90, risks, projects, knowledge,
    openDecisions, criticalAssets, compliance,
    vendors: vendorData, priorities, decisionHistory,
  };
}

const SEVERITY_CARD: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/5',
  high: 'border-orange-500/30 bg-orange-500/5',
  medium: 'border-yellow-500/30 bg-yellow-500/5',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-muted/50 text-muted-foreground border-border',
};

function SectionHeader({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-primary" />
      <h3 className="font-semibold text-sm">{title}</h3>
      {count !== undefined && <Badge variant="outline" className="text-xs ml-auto">{count} items</Badge>}
    </div>
  );
}

const LeadershipTransition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roleValue, setRoleValue] = useState('');
  const [outgoing, setOutgoing] = useState('');
  const [incoming, setIncoming] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!roleValue || !outgoing.trim() || !incoming.trim()) {
      toast({ title: 'Required fields missing', description: 'Please select the role and enter both leader names.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const roleLabel = TRANSITION_ROLES.find(r => r.value === roleValue)?.label || roleValue;
    await new Promise(r => setTimeout(r, 1800));
    setWorkspace(buildWorkspace(roleValue, roleLabel, outgoing.trim(), incoming.trim()));
    setGenerating(false);
    toast({ title: 'Transition workspace ready', description: `30/60/90 day plan and full operational briefing generated for ${incoming.trim()}.` });
  };

  const handleExport = () => {
    if (!workspace) return;
    const lines = [
      'LEADERSHIP TRANSITION™ WORKSPACE',
      `Generated: ${new Date(workspace.generatedAt).toLocaleString()}`,
      `Role: ${workspace.role}`,
      `Outgoing: ${workspace.outgoing}  →  Incoming: ${workspace.incoming}`,
      '', '═══ 30-DAY PLAN ═══',
      ...workspace.plan30.map((item, i) => `${i + 1}. ${item}`),
      '', '═══ 60-DAY PLAN ═══',
      ...workspace.plan60.map((item, i) => `${i + 1}. ${item}`),
      '', '═══ 90-DAY PLAN ═══',
      ...workspace.plan90.map((item, i) => `${i + 1}. ${item}`),
      '', '═══ OUTSTANDING RISKS ═══',
      ...workspace.risks.map(r => `[${r.severity.toUpperCase()}] ${r.title}\n   ${r.description}`),
      '', '═══ KNOWLEDGE INTERVIEWS ═══',
      ...workspace.knowledge.map(k => `• [${k.priority.toUpperCase()}] ${k.role} (${k.name})\n  ${k.topic}`),
      '', '═══ CRITICAL ASSETS — INSPECT IN 30 DAYS ═══',
      ...workspace.criticalAssets.map(a => `• ${a.name} (${a.type})\n  ${a.notes}`),
      '', '═══ PENDING COMPLIANCE ═══',
      ...workspace.compliance.map(c => `• ${c.item}\n  Due: ${c.dueDate} | Authority: ${c.authority}`),
      '', '═══ OPEN DECISIONS ═══',
      ...workspace.openDecisions.map(d => `• ${d.title} (${d.deadline})\n  ${d.context}`),
      '', '═══ OPERATIONAL PRIORITIES ═══',
      ...workspace.priorities.map((p, i) => `${i + 1}. ${p.title} [${p.timeframe}]\n   ${p.rationale}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadership-transition-${workspace.incoming.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Leadership Transition™
            </h1>
            <p className="text-sm text-muted-foreground">
              Onboarding workspace for incoming leadership — generated from your operational intelligence.
            </p>
          </div>
          {workspace && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setWorkspace(null)}>
                <RefreshCw className="w-4 h-4 mr-2" />New Transition
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </div>
          )}
        </div>

        {/* Setup form */}
        {!workspace && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Initiate Leadership Transition</CardTitle>
              <p className="text-xs text-muted-foreground">
                The incoming leader receives a structured workspace generated from your platform data — operational history,
                compliance records, equipment status, vendor relationships, and institutional knowledge.
                The organization retains everything.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Role Being Transitioned *</Label>
                  <Select value={roleValue} onValueChange={setRoleValue}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select role..." /></SelectTrigger>
                    <SelectContent>
                      {TRANSITION_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Outgoing Leader *</Label>
                  <Input className="h-9 text-sm" placeholder="Full name" value={outgoing} onChange={e => setOutgoing(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Incoming Leader *</Label>
                  <Input className="h-9 text-sm" placeholder="Full name" value={incoming} onChange={e => setIncoming(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Workspace contents</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-2 gap-x-4">
                  {[
                    '30/60/90 Day Plans', 'Outstanding Risks', 'Active Projects',
                    'Knowledge Interviews', 'Open Decisions', 'Critical Assets',
                    'Pending Compliance', 'Vendor Relationships', 'Operational Priorities', 'Decision History',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />{item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                <strong>Organization Ownership:</strong> All operational data, assets, documents, compliance records, and knowledge belong to your organization — not to any individual, consultant, or vendor. Leadership changes. The intelligence stays.
              </div>

              <div className="flex justify-end">
                <Button onClick={handleGenerate} disabled={generating || !roleValue || !outgoing.trim() || !incoming.trim()}>
                  {generating
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating workspace…</>
                    : <><Star className="w-4 h-4 mr-2" />Generate Transition Workspace</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated workspace */}
        {workspace && (
          <>
            {/* Summary banner */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{workspace.incoming}</p>
                  <p className="text-xs text-muted-foreground">Incoming {workspace.role}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <p className="text-xs text-muted-foreground">Transition from <strong>{workspace.outgoing}</strong></p>
              <div className="ml-auto flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs text-primary border-primary/40">{workspace.plan30.length} Day-30 Actions</Badge>
                <Badge variant="outline" className="text-xs text-red-400 border-red-400/40">{workspace.risks.filter(r => r.severity === 'critical' || r.severity === 'high').length} High+ Risks</Badge>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/40">{workspace.compliance.length} Compliance Items</Badge>
              </div>
            </div>

            <Tabs defaultValue="plans">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border pb-2">
                {[
                  { value: 'plans', label: '30/60/90 Plans' },
                  { value: 'risks', label: 'Risks' },
                  { value: 'projects', label: 'Projects' },
                  { value: 'knowledge', label: 'Knowledge' },
                  { value: 'assets', label: 'Assets' },
                  { value: 'compliance', label: 'Compliance' },
                  { value: 'vendors', label: 'Vendors' },
                  { value: 'decisions', label: 'Decisions' },
                  { value: 'priorities', label: 'Priorities' },
                ].map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 h-7 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md">{t.label}</TabsTrigger>
                ))}
              </TabsList>

              {/* 30/60/90 Plans */}
              <TabsContent value="plans">
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  {[
                    { label: '30-Day', subtitle: 'Orientation & Assessment', items: workspace.plan30, border: 'border-blue-500/30 bg-blue-500/5', num: 'text-blue-400 border-blue-400/40', icon: Clock },
                    { label: '60-Day', subtitle: 'Priorities & Quick Wins', items: workspace.plan60, border: 'border-purple-500/30 bg-purple-500/5', num: 'text-purple-400 border-purple-400/40', icon: Target },
                    { label: '90-Day', subtitle: 'Strategy & Full Ownership', items: workspace.plan90, border: 'border-amber-500/30 bg-amber-500/5', num: 'text-amber-400 border-amber-400/40', icon: TrendingUp },
                  ].map(plan => (
                    <Card key={plan.label} className={cn('border', plan.border)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <plan.icon className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm">{plan.label} Plan</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        {plan.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border mt-0.5', plan.num)}>{i + 1}</span>
                            <p className="text-muted-foreground leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Risks */}
              <TabsContent value="risks">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={AlertTriangle} title="Outstanding Risks" count={workspace.risks.length} />
                  {workspace.risks.map((risk, i) => (
                    <Card key={i} className={cn('border', SEVERITY_CARD[risk.severity])}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{risk.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{risk.description}</p>
                            <p className="text-xs text-muted-foreground mt-2 opacity-60">Source: {risk.source}</p>
                          </div>
                          <Badge variant="outline" className={cn('shrink-0 text-xs capitalize', PRIORITY_BADGE[risk.severity])}>{risk.severity}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Projects */}
              <TabsContent value="projects">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={Briefcase} title="Active Projects & Work Orders" count={workspace.projects.length} />
                  {workspace.projects.map((proj, i) => (
                    <Card key={i} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{proj.title}</p>
                            {proj.description && <p className="text-xs text-muted-foreground mt-1">{proj.description}</p>}
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            <Badge variant="outline" className={cn('text-xs capitalize', PRIORITY_BADGE[proj.priority] || PRIORITY_BADGE.low)}>{proj.priority}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{proj.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Knowledge Interviews */}
              <TabsContent value="knowledge">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={BookOpen} title="Knowledge Interview Schedule" count={workspace.knowledge.length} />
                  <p className="text-xs text-muted-foreground mb-4">Schedule these sessions before the outgoing leader's last day. The goal is to capture what no system holds.</p>
                  {workspace.knowledge.map((k, i) => (
                    <Card key={i} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold', PRIORITY_BADGE[k.priority] || PRIORITY_BADGE.low)}>{i + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium text-sm">{k.role}</p>
                              <Badge variant="outline" className="text-xs">{k.name}</Badge>
                              <Badge variant="outline" className={cn('text-xs capitalize ml-auto', PRIORITY_BADGE[k.priority] || PRIORITY_BADGE.low)}>{k.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{k.topic}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Critical Assets */}
              <TabsContent value="assets">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={Wrench} title="Critical Assets — Inspect in First 30 Days" count={workspace.criticalAssets.length} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    {workspace.criticalAssets.map((asset, i) => (
                      <Card key={i} className="border border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="font-medium text-sm flex-1 truncate">{asset.name}</p>
                            <Badge variant="outline" className="text-xs shrink-0">{asset.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{asset.notes}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Pending Compliance */}
              <TabsContent value="compliance">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={Shield} title="Pending Compliance Items" count={workspace.compliance.length} />
                  {workspace.compliance.map((item, i) => (
                    <Card key={i} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.item}</p>
                            <p className="text-xs text-muted-foreground mt-1">Due: {item.dueDate}</p>
                            <p className="text-xs text-muted-foreground">Authority: {item.authority}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 max-w-[140px] text-right">{item.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Vendors */}
              <TabsContent value="vendors">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={Building2} title="Key Vendor Relationships" count={workspace.vendors.length} />
                  <p className="text-xs text-muted-foreground mb-4">Formally introduce yourself to these partners within 30 days. Don't let them find out about the transition from a service call.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {workspace.vendors.map((vendor, i) => (
                      <Card key={i} className="border border-border/50">
                        <CardContent className="p-4">
                          <p className="font-medium text-sm">{vendor.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{vendor.service}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground">{vendor.contact}</p>
                          </div>
                          <p className="text-xs text-primary mt-1">{vendor.relationship}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Open Decisions */}
              <TabsContent value="decisions">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={FileText} title="Open Decisions Requiring New Leadership" count={workspace.openDecisions.length} />
                  {workspace.openDecisions.map((dec, i) => (
                    <Card key={i} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{dec.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{dec.context}</p>
                            <p className="text-xs text-muted-foreground mt-2">Owner: <strong>{dec.owner}</strong></p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 text-amber-400 border-amber-400/40">
                            <Clock className="w-3 h-3 mr-1" />{dec.deadline}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
                    <strong className="text-primary">Decision Continuity™ Vault</strong> holds the full documented decision history from prior leadership. Navigate to <strong>/dc-vault</strong> for complete records with context and outcomes.
                  </div>
                </div>
              </TabsContent>

              {/* Priorities */}
              <TabsContent value="priorities">
                <div className="space-y-3 mt-4">
                  <SectionHeader icon={TrendingUp} title="Operational Priorities for Incoming Leader" count={workspace.priorities.length} />
                  {workspace.priorities.map((p, i) => (
                    <Card key={i} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">{i + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium text-sm">{p.title}</p>
                              <Badge variant="outline" className="text-xs ml-auto">{p.timeframe}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.rationale}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default LeadershipTransition;
