import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  CheckSquare, Square, ChevronDown, ChevronUp,
  User, Wrench, ShieldCheck, Rocket, BarChart3,
  FileText, ClipboardList, Clock, DollarSign,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckItem { id: string; label: string; note?: string; }

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  duration: string;
  deliverable: string;
  items: CheckItem[];
}

// ── Phase Definitions ─────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: 'discovery',
    number: 1,
    title: 'Discovery',
    subtitle: 'Understand the client\'s operation before touching anything',
    icon: User,
    color: 'text-blue-400',
    duration: '1 session (~60–90 min)',
    deliverable: 'Discovery Summary (your internal notes)',
    items: [
      { id: 'd1', label: 'Confirm org type: Facility / Retail / Government' },
      { id: 'd2', label: 'Total asset / equipment count (rough estimate)' },
      { id: 'd3', label: 'How many people will use the platform? (headcount by role)' },
      { id: 'd4', label: 'What systems do they currently use? (CMMS, spreadsheets, paper logs, BAS/BMS, ERP)' },
      { id: 'd5', label: 'What data do they most need inside the platform? (equipment, work orders, compliance, energy)' },
      { id: 'd6', label: 'Do they have any active regulatory requirements? (OSHA, EPA, NPDES, SARA Tier II)' },
      { id: 'd7', label: 'What does "done" look like for them in 90 days?' },
      { id: 'd8', label: 'Who is the internal champion / primary contact?' },
      { id: 'd9', label: 'Is integration with an existing system needed? (yes/no — scope later)' },
      { id: 'd10', label: 'Note anything that signals urgency (audit coming, incident, new hire, leadership change)' },
    ],
  },
  {
    id: 'scoping',
    number: 2,
    title: 'Scoping',
    subtitle: 'Turn discovery notes into a clear scope and price',
    icon: ClipboardList,
    color: 'text-purple-400',
    duration: 'Async (you + build support)',
    deliverable: 'Scope document to share with client',
    items: [
      { id: 's1', label: 'List every deliverable from discovery (equipment import, role setup, compliance templates, etc.)' },
      { id: 's2', label: 'Classify each: CSV import / platform config / live integration / training' },
      { id: 's3', label: 'Confirm which tier of implementation applies: Self-guided / Assisted ($4,999) / White-glove ($12,000)' },
      { id: 's4', label: 'Identify any add-ons: BMS/CMMS integration (+$8k/yr), asset expansion tier, support tier' },
      { id: 's5', label: 'Draft one-page scope summary: what\'s included, what\'s not, timeline, price' },
      { id: 's6', label: 'Send scope doc to client for sign-off before next session' },
      { id: 's7', label: 'Confirm payment / billing arrangement (invoice, Stripe, net-30)' },
    ],
  },
  {
    id: 'setup',
    number: 3,
    title: 'Platform Setup',
    subtitle: 'Configure the platform for their specific facility',
    icon: Wrench,
    color: 'text-yellow-400',
    duration: '1–3 sessions depending on scope',
    deliverable: 'Configured platform ready for client use',
    items: [
      { id: 'p1', label: 'Confirm Cognito account created with correct org type, tier, facilityId' },
      { id: 'p2', label: 'Set org type in platform (facility / retail / government)' },
      { id: 'p3', label: 'Configure departments and user roles for their org structure' },
      { id: 'p4', label: 'Build out custom violation types to match their operations (Settings → Compliance Types)' },
      { id: 'p5', label: 'Import equipment list (CSV or manual entry) into Equipment Intelligence' },
      { id: 'p6', label: 'Create 2–3 sample work orders so they can see the flow' },
      { id: 'p7', label: 'Set up compliance logger templates for their regulatory requirements' },
      { id: 'p8', label: 'Invite team members and confirm they can log in with correct roles' },
      { id: 'p9', label: 'Walk through Onboarding Status page — confirm all milestones are reachable' },
      { id: 'p10', label: 'If integration scoped: hand off data extract to build team, confirm mapping' },
    ],
  },
  {
    id: 'training',
    number: 4,
    title: 'Training & Handoff',
    subtitle: 'Make sure the team can run it without you',
    icon: Rocket,
    color: 'text-green-400',
    duration: '1 session per role group',
    deliverable: 'Trained team, completed onboarding milestones',
    items: [
      { id: 't1', label: 'Leadership walkthrough: dashboards, reports, executive view' },
      { id: 't2', label: 'Operations team walkthrough: work orders, equipment, violations' },
      { id: 't3', label: 'Compliance/safety walkthrough: compliance logger, OSHA 300, violations' },
      { id: 't4', label: 'Enroll team in Optimize & Learn course appropriate to their role' },
      { id: 't5', label: 'Confirm all 8 onboarding milestones completed (check Onboarding Tracker in workspace)' },
      { id: 't6', label: 'Record one walkthrough session for their reference (Loom or similar)' },
      { id: 't7', label: 'Deliver written summary of what was set up and how to manage it' },
      { id: 't8', label: 'Confirm support tier: Standard / Priority / Enterprise SLA' },
    ],
  },
  {
    id: 'validation',
    number: 5,
    title: '30-Day Check-In',
    subtitle: 'Confirm they\'re running, catch anything that slipped',
    icon: ShieldCheck,
    color: 'text-cyan-400',
    duration: '30 min call, 30 days post-launch',
    deliverable: 'Signed-off implementation, upsell opportunities identified',
    items: [
      { id: 'v1', label: 'Review onboarding progress — any milestones still incomplete?' },
      { id: 'v2', label: 'Are all users logging in regularly? Check usage.' },
      { id: 'v3', label: 'Any equipment data gaps or incorrect configurations?' },
      { id: 'v4', label: 'Any compliance or violation issues that surfaced — log them' },
      { id: 'v5', label: 'Ask: what\'s one thing that would make this more useful for you?' },
      { id: 'v6', label: 'Identify any upsell opportunities: integration, additional training, support upgrade' },
      { id: 'v7', label: 'Mark implementation as complete — mark checkin_30d milestone done in Onboarding Tracker' },
      { id: 'v8', label: 'Schedule 90-day follow-up if on Premium/Enterprise tier' },
    ],
  },
];

// ── Stripe Products Reference ─────────────────────────────────────────────────

const STRIPE_NEEDED = [
  {
    category: 'Storage Add-ons (Recurring Monthly)',
    items: [
      { name: 'Nexum Suum — Secure Storage 50GB', desc: 'Add 50 GB of encrypted AWS S3 storage for compliance documents, equipment photos, and audit files. Scoped per licensee account.', price: '$29/mo', billing: 'recurring', id: 'price_storage_50gb' },
      { name: 'Nexum Suum — Secure Storage 200GB', desc: 'Add 200 GB of encrypted AWS S3 storage for compliance documents, equipment photos, and audit files. Scoped per licensee account.', price: '$79/mo', billing: 'recurring', id: 'price_storage_200gb' },
      { name: 'Nexum Suum — Secure Storage 1TB', desc: 'Add 1 TB of encrypted AWS S3 storage for compliance documents, equipment photos, and audit files. Scoped per licensee account.', price: '$149/mo', billing: 'recurring', id: 'price_storage_1tb' },
    ],
  },
  {
    category: 'Asset Expansion Tiers (Annual, Add-on to Base License)',
    items: [
      { name: 'Nexum Suum — Asset Expansion: 500–2,000 Assets', desc: 'Expands your equipment tracking capacity from the base <500 tier to 500–2,000 tracked assets in the FI Platform. Annual add-on.', price: '+$4,000/yr', billing: 'recurring annual', id: 'TBD — create in Stripe' },
      { name: 'Nexum Suum — Asset Expansion: 2,000–10,000 Assets', desc: 'Expands your equipment tracking capacity to 2,000–10,000 tracked assets. Suited for large campuses, multi-building, or multi-department facilities. Annual add-on.', price: '+$10,000/yr', billing: 'recurring annual', id: 'TBD — create in Stripe' },
      { name: 'Nexum Suum — Asset Expansion: 10,000+ Assets', desc: 'Unlimited asset tracking above 10,000 — designed for large industrial, university, or multi-site government operations. Annual add-on.', price: '+$20,000/yr', billing: 'recurring annual', id: 'TBD — create in Stripe' },
    ],
  },
  {
    category: 'Integration Add-on (Annual, Recurring)',
    items: [
      { name: 'Nexum Suum — BMS/CMMS Integration', desc: 'Annual integration license for connecting the FI Platform to an existing Building Management System (BMS) or Computerized Maintenance Management System (CMMS). Includes data sync, API mapping, and ongoing connection maintenance.', price: '+$8,000/yr', billing: 'recurring annual', id: 'TBD — create in Stripe' },
    ],
  },
  {
    category: 'Consulting Services (One-time, Request-Based — Invoice or Stripe Link)',
    items: [
      { name: 'Nexum Suum — Industrial Stormwater Compliance Audit', desc: 'NPDES permit review, SWPPP gap analysis, site walkthrough protocol, quarterly inspection checklist (MSGP Table D-1), and corrective action report. Delivered within 5 business days.', price: '$2,400', billing: 'one-time payment', id: 'TBD — create as Payment Link in Stripe' },
      { name: 'Nexum Suum — Tier II / SARA Chemical Inventory Audit', desc: 'Complete EPCRA Section 312 chemical inventory review, SDS verification, threshold calculations, and state Tier II report — filed on your behalf or handed off ready to submit. Delivered within 7 business days.', price: '$1,800', billing: 'one-time payment', id: 'TBD — create as Payment Link in Stripe' },
      { name: 'Nexum Suum — FI Integration Blueprint™', desc: '30-day fixed engagement: structured operational data model, decision defensibility parameter map, risk gap analysis, API mapping schemas for ERP integration, data field requirements spec, and 90-day post-go-live monitoring checklist.', price: '$25,000–$45,000', billing: 'custom quote / invoice', id: 'Quote-based — send via invoice or custom Stripe link' },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

function PhaseCard({ phase }: { phase: Phase }) {
  const [open, setOpen]       = useState(phase.number === 1);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [client, setClient]   = useState('');

  const Icon     = phase.icon;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const total     = phase.items.length;
  const allDone   = doneCount === total;

  const toggle = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }));

  return (
    <Card className={cn(
      'border transition-all',
      allDone ? 'border-green-500/30 bg-green-500/5' : 'border-border/60',
    )}>
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full p-4 flex items-center gap-4 text-left"
        >
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border',
            allDone ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-muted/30 border-border/60 text-muted-foreground',
          )}>
            {allDone ? '✓' : phase.number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className={cn('w-4 h-4', phase.color)} />
              <span className="text-sm font-semibold">{phase.title}</span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">{phase.duration}</Badge>
              {allDone && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Done</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{phase.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground font-mono">{doneCount}/{total}</span>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
            {/* Client label for this phase */}
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="Client name / facility (for your notes)"
                className="h-7 text-xs max-w-xs"
              />
            </div>

            {/* Checklist */}
            <div className="space-y-1">
              {phase.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-muted/20 text-left transition-colors"
                >
                  {checked[item.id]
                    ? <CheckSquare className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    : <Square className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  }
                  <span className={cn(
                    'text-xs leading-relaxed',
                    checked[item.id] ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Deliverable callout */}
            <div className="bg-muted/20 border border-border/40 rounded-lg p-3 flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Deliverable</p>
                <p className="text-xs text-muted-foreground mt-0.5">{phase.deliverable}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImplementationGuide() {
  const [activeSection, setActiveSection] = useState<'guide' | 'stripe'>('guide');
  const [scopeNotes, setScopeNotes]       = useState('');

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary uppercase tracking-wider">Admin Only</Badge>
          </div>
          <h1 className="text-xl font-bold">White-Glove Implementation Guide</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sequential checklist for every client engagement — Discovery → Scoping → Setup → Training → 30-Day Check-In.
          </p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2">
          {[
            { id: 'guide',  label: 'Implementation Phases', icon: ClipboardList },
            { id: 'stripe', label: 'Stripe Products Needed', icon: DollarSign },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                activeSection === id
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'border-border/40 text-muted-foreground hover:border-primary/30',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Guide section */}
        {activeSection === 'guide' && (
          <div className="space-y-4">
            {/* Quick scope notepad */}
            <Card className="bg-muted/10 border-border/40">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />Current Engagement Notes
                </p>
                <Textarea
                  value={scopeNotes}
                  onChange={e => setScopeNotes(e.target.value)}
                  placeholder="Client name, key context, open items, follow-ups…"
                  className="text-xs h-20 resize-none bg-transparent border-border/40"
                />
              </CardContent>
            </Card>

            {/* Phases */}
            {PHASES.map(phase => (
              <PhaseCard key={phase.id} phase={phase} />
            ))}

            {/* Bottom callout */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Total engagement timeline</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Self-guided: client completes phases 1 + 3–5 independently (1–3 weeks).
                    Assisted ($4,999): you run phase 3 with them (2–4 sessions, 2 weeks).
                    White-glove ($12,000): you run all phases, full setup + training (4–6 weeks).
                    Integration add-on: parallel track, add 2–4 weeks depending on system.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stripe section */}
        {activeSection === 'stripe' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              These products need to be created in your Stripe dashboard. Use the exact names and descriptions below — they appear on invoices and receipts.
              Products with a real <code className="text-[11px] bg-muted px-1 py-0.5 rounded">price_1T...</code> ID are already live. Ones marked <span className="text-yellow-400 font-medium">TBD</span> need to be created.
            </p>
            {STRIPE_NEEDED.map(group => (
              <div key={group.category} className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{group.category}</h3>
                {group.items.map(item => (
                  <Card key={item.name} className="border-border/50 bg-card/60">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">{item.price}</Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{item.billing}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      <p className={cn(
                        'text-[11px] font-mono px-2 py-1 rounded w-fit',
                        item.id.startsWith('price_1T')
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400',
                      )}>
                        {item.id}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
            <Card className="bg-muted/10 border-border/40">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">How to create in Stripe:</p>
                <p>Dashboard → Products → + Add product → paste name → paste description → set price type (recurring or one-time) → save → copy the <code>price_1T...</code> ID → update CLAUDE.md and Pricing.tsx.</p>
                <p className="mt-1">For consulting services ($2,400 / $1,800), create as <strong>Payment Links</strong> in Stripe — you can send these directly to clients after they request the service. The Blueprint ($25K–$45K) stays quote/invoice-based.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
