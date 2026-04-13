import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen, Shield, ClipboardCheck, Users, AlertTriangle,
  FileText, TrendingUp, Lock, ChevronRight, CheckCircle,
  Building2, Mail, Phone, Zap,
} from 'lucide-react';

// ── Section metadata ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',       label: 'Role Overview',            icon: Building2 },
  { id: 'governance',     label: '4-Layer Governance',       icon: Shield },
  { id: 'preonboarding',  label: 'Pre-Onboarding Protocol',  icon: ClipboardCheck },
  { id: 'fias',           label: 'FIAS Assessment Protocol', icon: TrendingUp },
  { id: 'dataintegrity',  label: 'Data Integrity Standards', icon: Lock },
  { id: 'communication',  label: 'Client Communication',     icon: Mail },
  { id: 'emergency',      label: 'Emergency & Escalation',   icon: AlertTriangle },
  { id: 'records',        label: 'Record-Keeping',           icon: FileText },
];

const BADGE_REQUIRED = (
  <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 ml-2">Required</Badge>
);
const BADGE_BEST = (
  <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 ml-2">Best Practice</Badge>
);

function SectionBlock({ id, title, icon: Icon, children }: {
  id: string; title: string; icon: any; children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-4">
      <Card className="neon-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function Protocol({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
        <p className="font-semibold text-foreground">{title}</p>
      </div>
      <div className="pl-8 text-xs text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function CheckItem({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
      <span>{children}{required ? BADGE_REQUIRED : null}</span>
    </li>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PolicyGuide() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              FIO Policy Guide
              <span className="text-muted-foreground font-normal text-base ml-2">— Protocols & Procedures</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nexum Suum · Facility Intelligence Officer · Internal Reference · v1.0
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />Confidential
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">

          {/* Sticky nav */}
          <nav className="lg:sticky lg:top-4 space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    activeSection === s.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {s.label}
                  <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                </a>
              );
            })}
          </nav>

          {/* Content */}
          <div className="space-y-6">

            {/* Section 1 — Role Overview */}
            <SectionBlock id="overview" title="1. Facility Intelligence Officer — Role Overview" icon={Building2}>
              <p className="text-muted-foreground">
                The <strong className="text-foreground">Facility Intelligence Officer (FIO)</strong> is a Nexum Suum field and platform specialist responsible for assessing, onboarding, and continuously supporting facility clients on the FI Platform. The FIO sits at the intersection of technical operations and client intelligence — translating raw facility data into actionable, governance-backed insights.
              </p>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Core Responsibilities</p>
                <ul className="space-y-1.5">
                  {[
                    'Conduct FIAS assessments (pre-onboarding and periodic audits)',
                    'Ensure all facility data entering the platform meets admissibility standards',
                    'Generate and communicate intelligence reports to client leadership',
                    'Monitor dashboard KPIs and escalate anomalies',
                    'Train client facility teams on platform usage and log protocols',
                    'Maintain immutable assessment and log records',
                    'Coordinate work order generation from FIAS findings',
                  ].map(r => <CheckItem key={r}>{r}</CheckItem>)}
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Authority Level', value: 'Full platform access · Admin gate on FIAS', color: 'text-primary' },
                  { label: 'Reporting To', value: 'Nexum Suum Operations Lead', color: 'text-muted-foreground' },
                  { label: 'Cadence', value: 'Pre-onboarding + quarterly audits minimum', color: 'text-muted-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border/30 bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={cn('text-xs font-medium mt-0.5', color)}>{value}</p>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Section 2 — 4-Layer Governance */}
            <SectionBlock id="governance" title="2. 4-Layer Governance Model" icon={Shield}>
              <p className="text-muted-foreground">
                Every decision, log, and action on the FI Platform operates within a strict 4-layer governance chain. FIOs are responsible for understanding and enforcing all four layers.
              </p>

              <div className="space-y-3">
                {[
                  {
                    layer: '1', name: 'Record Layer', color: 'border-blue-500/30 bg-blue-500/5',
                    badge: 'text-blue-400', tool: 'Compliance Logger',
                    desc: 'All facility activity is captured as append-only, immutable records. No editing or deletion after submission. Every log entry must include: timestamp, operator ID, system type, and summary.',
                    rules: ['Submit logs immediately — never retroactively', 'Evidence notes required for any anomaly', 'Incomplete logs are flagged Incomplete / Invalid'],
                  },
                  {
                    layer: '2', name: 'Validation Layer', color: 'border-yellow-500/30 bg-yellow-500/5',
                    badge: 'text-yellow-400', tool: 'Operation Center',
                    desc: 'Each log is scored for governance completeness (Admissible / Incomplete / Invalid). Only Admissible records feed dashboard metrics. Invalid records are quarantined.',
                    rules: ['FIO reviews flagged logs within 24 hours', 'Re-entry required for Invalid records', 'Never override governance status manually'],
                  },
                  {
                    layer: '3', name: 'Interpretation Layer', color: 'border-purple-500/30 bg-purple-500/5',
                    badge: 'text-purple-400', tool: 'Executive / Manager Dashboards',
                    desc: 'Verified records are aggregated into KPIs, trend charts, and risk scores. All analysis displays the verified record count to ensure clients understand the data basis.',
                    rules: ['FIO reviews dashboard integrity monthly', 'Flag statistical anomalies to client leadership', 'FIAS scores appear here after platform push'],
                  },
                  {
                    layer: '4', name: 'Execution Layer', color: 'border-green-500/30 bg-green-500/5',
                    badge: 'text-green-400', tool: 'Work Orders / Violations',
                    desc: 'Actions are gated — work orders require resolution notes and a closing technician before completion. Violations must advance through the full sequence: Open → Acknowledged → In Review → Resolved.',
                    rules: ['No shortcuts in violation sequence', 'Completion gate cannot be bypassed', 'Sealed records are permanent and audit-ready'],
                  },
                ].map(l => (
                  <div key={l.layer} className={cn('rounded-lg border p-4 space-y-2', l.color)}>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold uppercase tracking-wide', l.badge)}>Layer {l.layer} — {l.name}</span>
                      <Badge variant="outline" className={cn('text-[10px]', l.badge, l.color)}>{l.tool}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                    <ul className="space-y-1">
                      {l.rules.map(r => <CheckItem key={r}>{r}</CheckItem>)}
                    </ul>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Section 3 — Pre-Onboarding Protocol */}
            <SectionBlock id="preonboarding" title="3. Pre-Onboarding Protocol" icon={ClipboardCheck}>
              <p className="text-muted-foreground">Before any facility is activated on the FI Platform, the FIO must complete a full pre-onboarding sequence. This establishes the baseline intelligence that all future dashboards are measured against.</p>

              <Protocol number="1" title="Initial Contact & Site Brief">
                <p>Confirm facility type (commercial, government, retail), number of buildings, and key systems in scope.</p>
                <ul className="space-y-1 mt-1 list-disc list-inside">
                  <li>Obtain facility address, primary contact, and emergency contact</li>
                  <li>Review any existing maintenance records or prior inspection reports</li>
                  <li>Confirm org type for platform configuration (facility / retail / government){BADGE_REQUIRED}</li>
                </ul>
              </Protocol>

              <Protocol number="2" title="FIAS Pre-Onboarding Assessment">
                <p>Open FIAS at <code className="bg-muted px-1 rounded text-[10px]">/fias</code>, select Assessment Type: <strong>Pre-Onboarding</strong>.</p>
                <ul className="space-y-1 mt-1 list-disc list-inside">
                  <li>Complete all 7 sections for each major system{BADGE_REQUIRED}</li>
                  <li>Document every finding — especially those flagged for Work Order generation</li>
                  <li>Seal the record before leaving the facility</li>
                  <li>Push to platform — scores will populate the Executive Dashboard immediately</li>
                </ul>
              </Protocol>

              <Protocol number="3" title="Platform Activation Checklist">
                <ul className="space-y-1 list-disc list-inside">
                  <li>Create facility account in AWS Cognito with correct <code className="bg-muted px-1 rounded text-[10px]">custom:orgType</code> and <code className="bg-muted px-1 rounded text-[10px]">custom:tier</code>{BADGE_REQUIRED}</li>
                  <li>Assign user roles to facility leadership team</li>
                  <li>Configure utility rates in Settings → Utility Rates</li>
                  <li>Register all major equipment in Equipment Library with install dates and data plate info</li>
                  <li>Run initial Operation Center log governance check</li>
                  <li>Deliver platform orientation to client team (1–2 hours){BADGE_REQUIRED}</li>
                </ul>
              </Protocol>

              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-400">
                <strong>Note:</strong> A facility must not be marked "Active" on the platform until FIAS Pre-Onboarding assessment is sealed and all critical findings have been acknowledged by client leadership.
              </div>
            </SectionBlock>

            {/* Section 4 — FIAS Assessment Protocol */}
            <SectionBlock id="fias" title="4. FIAS Assessment Protocol" icon={TrendingUp}>
              <p className="text-muted-foreground">The FIAS (Facility Intelligence Assessment System) is the primary intelligence-gathering instrument for FIOs. It produces a composite score that directly feeds the FI Platform dashboards.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Pre-Onboarding', when: 'Before platform activation', freq: 'One-time (per facility)' },
                  { label: 'Periodic Audit', when: 'Active platform client', freq: 'Quarterly minimum' },
                  { label: 'Incident Response', when: 'After system failure or compliance event', freq: 'Within 48 hours of event' },
                ].map(t => (
                  <div key={t.label} className="rounded-lg border border-border/30 bg-muted/10 p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">{t.label}</p>
                    <p className="text-muted-foreground">{t.when}</p>
                    <Badge variant="outline" className="text-[10px]">{t.freq}</Badge>
                  </div>
                ))}
              </div>

              <Protocol number="1" title="Scoring Formula">
                <p className="font-mono text-[11px] bg-muted p-2 rounded">FIAS Score = (Condition × 0.35) + (Performance × 0.35) + (Risk × 0.30)</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { band: 'Standard',        range: '85–100', color: 'text-green-400' },
                    { band: 'Monitor',         range: '70–84',  color: 'text-yellow-400' },
                    { band: 'Action Required', range: '50–69',  color: 'text-orange-400' },
                    { band: 'Critical',        range: '0–49',   color: 'text-red-400' },
                  ].map(b => (
                    <div key={b.band} className="flex items-center gap-2 text-xs">
                      <span className={cn('font-bold', b.color)}>{b.band}</span>
                      <span className="text-muted-foreground">({b.range})</span>
                    </div>
                  ))}
                </div>
              </Protocol>

              <Protocol number="2" title="Field Standards">
                <ul className="space-y-1 list-disc list-inside">
                  <li>Score every condition question — do not skip{BADGE_REQUIRED}</li>
                  <li>Scores below 4 require written evidence{BADGE_REQUIRED}</li>
                  <li>All findings must include System Area + Observed Condition + Recommended Action</li>
                  <li>Seal record before leaving site — records cannot be edited after sealing</li>
                  <li>Critical findings must be verbally communicated to client contact same day</li>
                </ul>
              </Protocol>

              <Protocol number="3" title="Post-Assessment Actions">
                <ul className="space-y-1 list-disc list-inside">
                  <li>Push to FI Platform immediately after sealing</li>
                  <li>Findings with WO flag auto-generate Work Orders on client dashboard</li>
                  <li>Send assessment summary email to client within 24 hours{BADGE_REQUIRED}</li>
                  <li>Schedule follow-up based on risk band (see Section 7 for escalation thresholds)</li>
                </ul>
              </Protocol>
            </SectionBlock>

            {/* Section 5 — Data Integrity Standards */}
            <SectionBlock id="dataintegrity" title="5. Data Integrity Standards" icon={Lock}>
              <p className="text-muted-foreground">All intelligence produced by the FI Platform is only as reliable as the data entering it. FIOs are gatekeepers of data quality.</p>

              <div className="space-y-3">
                {[
                  { title: 'Admissible Record Requirements', items: ['Timestamp present', 'Operator / submitter identified', 'System or equipment type specified', 'Summary or notes provided'], badge: 'text-green-400 border-green-500/20 bg-green-500/5' },
                  { title: 'Incomplete Record — FIO Action', items: ['Contact submitting operator within 4 hours', 'Request re-submission with missing fields', 'Document the gap in your own compliance log'], badge: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' },
                  { title: 'Invalid Record — FIO Action', items: ['Quarantined automatically — does not feed dashboards', 'Re-entry required by original submitter', 'If pattern of Invalid records: escalate to client management', 'Document repeat offenders in staff performance notes'], badge: 'text-red-400 border-red-500/20 bg-red-500/5' },
                ].map(block => (
                  <div key={block.title} className={cn('rounded-lg border p-3 space-y-2 text-xs', block.badge)}>
                    <p className="font-semibold">{block.title}</p>
                    <ul className="space-y-1">
                      {block.items.map(i => <CheckItem key={i}>{i}</CheckItem>)}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><strong>Immutability Rule:</strong> No record — log, work order, violation, or FIAS assessment — may be altered after it is submitted or sealed. Any discrepancy must be addressed through a new corrective record, not by editing the original.</span>
              </div>
            </SectionBlock>

            {/* Section 6 — Client Communication */}
            <SectionBlock id="communication" title="6. Client Communication Standards" icon={Mail}>
              <p className="text-muted-foreground">FIOs represent Nexum Suum in all client interactions. Communication must be professional, timely, and intelligence-backed.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { trigger: 'Post-Assessment', sla: 'Within 24 hours', content: 'FIAS summary email with score, risk band, and key findings' },
                  { trigger: 'Critical Finding (during assessment)', sla: 'Same day — verbal first', content: 'Immediate verbal notification + follow-up email within 2 hours' },
                  { trigger: 'Monthly Check-in', sla: 'First week of each month', content: 'Dashboard KPI review + upcoming PM reminders' },
                  { trigger: 'Work Order Generated', sla: 'Within 1 business day', content: 'Notify relevant client manager with priority and recommended timeframe' },
                  { trigger: 'Compliance Score Drop > 10 pts', sla: 'Within 24 hours', content: 'Root cause summary + recommended corrective action' },
                ].map(c => (
                  <div key={c.trigger} className="rounded-lg border border-border/30 bg-muted/10 p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">{c.trigger}</p>
                    <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-500/30">{c.sla}</Badge>
                    <p className="text-muted-foreground">{c.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-xs space-y-2">
                <p className="font-semibold text-foreground">Contact Routing</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>General inquiries: <strong className="text-foreground">info@nexumsuum-facilityintelligence.com</strong></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>FIO direct: <strong className="text-foreground">razzellv@nexumsuum.com</strong></span>
                </div>
              </div>
            </SectionBlock>

            {/* Section 7 — Emergency & Escalation */}
            <SectionBlock id="emergency" title="7. Emergency & Escalation Protocol" icon={AlertTriangle}>
              <p className="text-muted-foreground">Certain findings or platform events require immediate escalation beyond the standard communication cadence.</p>

              <div className="space-y-3">
                {[
                  { level: 'LEVEL 1 — Notify', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5', triggers: ['FIAS score drops into Monitor band (70–84)', 'Single critical finding during assessment', 'Compliance Logger showing > 20% Invalid records'], action: 'Email client facility manager within 24 hours. Document in platform.' },
                  { level: 'LEVEL 2 — Escalate', color: 'text-orange-400 border-orange-500/30 bg-orange-500/5', triggers: ['FIAS score in Action Required band (50–69)', 'Work order overdue > 14 days on critical equipment', 'Violation stuck in same stage > 7 days'], action: 'Call client leadership directly. Create platform WO if not already present. Re-assess within 30 days.' },
                  { level: 'LEVEL 3 — Critical Response', color: 'text-red-400 border-red-500/30 bg-red-500/5', triggers: ['FIAS score Critical band (< 50)', 'Active safety hazard identified on-site', 'Regulatory inspection failure or permit issue', 'System failure causing operational shutdown'], action: 'Immediate verbal notification to client + Nexum Suum operations lead. On-site visit within 48 hours. Full FIAS incident assessment.' },
                ].map(l => (
                  <div key={l.level} className={cn('rounded-lg border p-4 space-y-2 text-xs', l.color)}>
                    <p className="font-bold uppercase tracking-wide">{l.level}</p>
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Triggers:</p>
                      <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
                        {l.triggers.map(t => <li key={t}>{t}</li>)}
                      </ul>
                    </div>
                    <div className="pt-1 border-t border-current/10">
                      <span className="font-semibold">Action: </span>
                      <span className="text-muted-foreground">{l.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Section 8 — Record-Keeping */}
            <SectionBlock id="records" title="8. Record-Keeping Requirements" icon={FileText}>
              <p className="text-muted-foreground">FIOs are responsible for maintaining complete, governance-compliant records of all assessments, client interactions, and escalations.</p>

              <div className="space-y-3">
                <Protocol number="1" title="FIAS Records">
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Every sealed FIAS session is stored in platform under the facility's ID{BADGE_REQUIRED}</li>
                    <li>Export PDF copy and retain in Nexum Suum internal file for 3 years{BADGE_REQUIRED}</li>
                    <li>Assessment date, assessor name, system type, and score are non-negotiable fields</li>
                  </ul>
                </Protocol>

                <Protocol number="2" title="Communication Records">
                  <ul className="space-y-1 list-disc list-inside">
                    <li>All client communications relating to findings must be email (creates a paper trail){BADGE_BEST}</li>
                    <li>Document all verbal Level 2/3 escalations in writing within 2 hours</li>
                    <li>Use FIAS email section to generate pre-formatted assessment summaries</li>
                  </ul>
                </Protocol>

                <Protocol number="3" title="Platform Log Standards">
                  <ul className="space-y-1 list-disc list-inside">
                    <li>FIO logs own site visits and assessment sessions in Compliance Logger{BADGE_REQUIRED}</li>
                    <li>Log format: Date · Facility · System · Action Taken · Outcome</li>
                    <li>All platform-generated WOs from FIAS findings must be acknowledged within 3 business days</li>
                  </ul>
                </Protocol>
              </div>

              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><strong>Retention Policy:</strong> All records retained minimum 3 years. FIAS assessments and incident reports: 7 years. Cancelled facility data retained 90 days post-cancellation.</span>
              </div>
            </SectionBlock>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
