import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, CheckCircle2, AlertTriangle, FileText, Users, Wrench,
  ClipboardList, Award, ArrowRight, Building2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DELIVERABLES = [
  { icon: AlertTriangle, label: 'Operational Risk Register', desc: 'Prioritized register of operational risks with severity ratings and mitigation pathways.' },
  { icon: Users, label: 'Knowledge Loss Assessment', desc: 'Identifies critical knowledge held by at-risk employees — retirement, turnover, single points of failure.' },
  { icon: Wrench, label: 'Deferred Maintenance Analysis', desc: 'Quantifies exposure from deferred work orders, aging assets, and inspection gaps.' },
  { icon: ClipboardList, label: 'Decision Continuity Assessment', desc: 'Maps decision-making dependencies and identifies continuity gaps in leadership transitions.' },
  { icon: Users, label: 'Workforce Risk Analysis', desc: 'Evaluates staffing depth, cross-training coverage, and succession readiness across functions.' },
  { icon: Award, label: 'Operational Readiness Score™ (0–100)', desc: 'A single composite score benchmarking your organization\'s ability to sustain reliable operations.' },
  { icon: FileText, label: 'Executive Briefing Document', desc: 'Board-ready narrative summarizing findings, scores, and a prioritized 90-day action plan.' },
];

const ASSESSMENT_DOMAINS = [
  {
    name: 'Knowledge Continuity',
    description: 'Critical knowledge concentration, documentation completeness, succession planning depth',
    weight: 20,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    name: 'Physical Asset Integrity',
    description: 'Equipment condition, deferred maintenance backlog, preventive maintenance compliance',
    weight: 20,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    name: 'Compliance & Regulatory Posture',
    description: 'OSHA alignment, permit currency, inspection history, violation exposure',
    weight: 20,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    name: 'Workforce & Staffing Depth',
    description: 'Cross-training coverage, staffing ratios, vacation/absence resilience',
    weight: 15,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    name: 'Decision & Leadership Continuity',
    description: 'Succession clarity, decision documentation, institutional memory preservation',
    weight: 15,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    name: 'Operational Procedures & Documentation',
    description: 'SOP currency, emergency procedures, operator guide completeness',
    weight: 10,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
];

const TIMELINE = [
  { day: 'Pre-Engagement', title: 'Discovery Package', desc: 'Nexum sends a structured pre-assessment questionnaire to gather baseline data, org charts, asset lists, and regulatory history.' },
  { day: 'Day 1', title: 'On-Site Assessment', desc: 'Lead assessor conducts structured walkthroughs, operator interviews, records review, and facility inspection across all 6 domains.' },
  { day: 'Days 2–14', title: 'Analysis & Scoring', desc: 'Assessment data is analyzed, Operational Readiness Score calculated, risk register compiled, and Executive Briefing drafted.' },
  { day: 'Day 15', title: 'Findings Presentation', desc: 'Virtual or on-site debrief with leadership. All 7 deliverables delivered. 90-day action plan reviewed and handoff completed.' },
];

const PRICING = [
  { model: 'Commercial', price: '$7,500', clin: 'CLIN 0004', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { model: 'GovCon (Government)', price: '$12,500', clin: 'CLIN 0004', badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { model: 'Enterprise', price: '$24,999', clin: 'CLIN 0004', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

interface InquiryState {
  name: string;
  org: string;
  email: string;
  type: string;
  notes: string;
}

export default function OperationalTrust() {
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [form, setForm] = useState<InquiryState>({ name: '', org: '', email: '', type: 'Government / Public Agency', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const scores: Record<string, number> = JSON.parse(localStorage.getItem('nexum_ota_domain_scores') || '{}');
  const hasScores = Object.keys(scores).length > 0;

  const handleSubmit = () => {
    if (!form.name || !form.org || !form.email) return;
    const pending = JSON.parse(localStorage.getItem('nexum_ota_inquiries') || '[]');
    pending.push({ ...form, service: 'Operational Trust Assessment™', clin: 'CLIN_0004', submittedAt: new Date().toISOString() });
    localStorage.setItem('nexum_ota_inquiries', JSON.stringify(pending));
    setSubmitted(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-8 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">CLIN 0004 · FFP</Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">On-Site Assessment</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">SAM.gov Registered</Badge>
          </div>
          <h1 className="text-3xl font-bold">Operational Trust Assessment™</h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
            A structured, on-site evaluation of your organization's ability to reliably execute and sustain
            its operational commitments — producing a single Operational Readiness Score™ and seven
            actionable deliverables for leadership.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => setInquiryOpen(true)} className="gap-2">
              Request an Assessment <ArrowRight className="w-4 h-4" />
            </Button>
            <a href="/procurement-hub" className="text-sm text-primary underline underline-offset-4">
              View Procurement Hub →
            </a>
          </div>
        </div>

        {/* Live score if available */}
        {hasScores && (
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Self-Assessment Scores Detected</p>
                <p className="text-xs text-muted-foreground">Your Government Intelligence™ assessments have generated domain scores. An OTA engagement validates and deepens these findings with on-site verification.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What it is */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                What Is the OTA?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The Operational Trust Assessment™ is Nexum Suum's flagship on-site engagement — a 1-to-5-day
                structured evaluation conducted by a licensed SME assessor.
              </p>
              <p>
                Unlike virtual assessments or software-only tools, the OTA combines physical walkthrough,
                operator interviews, document review, and real-time observation to produce a defensible,
                independently verified picture of your operational health.
              </p>
              <p>
                The result is an <span className="text-foreground font-semibold">Operational Readiness Score™</span> —
                a 0–100 composite index across six weighted domains — plus a full evidence package your
                leadership team can act on immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Who Is It For?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {[
                'Government facilities facing leadership transitions, audits, or continuity concerns',
                'Public works departments with aging infrastructure and deferred maintenance backlogs',
                'Utilities and water authorities needing defensible operational documentation',
                'Healthcare facility management teams preparing for Joint Commission or CMS inspections',
                'County and municipal operations preparing for budget hearings or grant applications',
                'Any organization that needs to demonstrate operational readiness to oversight bodies',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Assessment domains */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Six Assessment Domains</h2>
          <p className="text-sm text-muted-foreground">Each domain is evaluated on-site and weighted to produce the composite Operational Readiness Score™.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ASSESSMENT_DOMAINS.map(domain => (
              <div key={domain.name} className={cn('rounded-lg border p-4', domain.bg, domain.border)}>
                <div className="flex items-start justify-between mb-2">
                  <p className={cn('text-sm font-semibold leading-tight', domain.color)}>{domain.name}</p>
                  <span className={cn('text-xs font-bold ml-2 shrink-0', domain.color)}>{domain.weight}%</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{domain.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 7 Deliverables */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Seven Deliverables Included</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {DELIVERABLES.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <d.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
            onClick={() => setTimelineExpanded(!timelineExpanded)}
          >
            Engagement Timeline
            {timelineExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {timelineExpanded && (
            <div className="space-y-3">
              {TIMELINE.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                  <div className="w-20 shrink-0">
                    <p className="text-xs font-bold text-primary">{step.day}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {PRICING.map(p => (
              <Card key={p.model} className="bg-card border-border text-center">
                <CardContent className="p-5 space-y-2">
                  <Badge className={cn('text-xs', p.badge)}>{p.model}</Badge>
                  <p className="text-2xl font-bold">{p.price}</p>
                  <p className="text-xs text-muted-foreground">per engagement</p>
                  <p className="text-xs font-mono text-muted-foreground">{p.clin} · FFP</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-site discounts available. Travel &amp; lodging billed at cost for sites beyond 60 miles from contractor base.
            GovCon pricing eligible for IDIQ, BPA, GSA Schedule, and OTA vehicle procurement.
          </p>
        </div>

        {/* Inquiry form */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request an Operational Trust Assessment™</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center py-8 space-y-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="font-semibold">Request Received</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We'll reach out within 1 business day to confirm availability and share the pre-assessment questionnaire.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Your Name *</label>
                    <Input
                      placeholder="Director of Operations"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Organization *</label>
                    <Input
                      placeholder="City of Springfield Public Works"
                      value={form.org}
                      onChange={e => setForm(f => ({ ...f, org: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="operations@agency.gov"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Organization Type</label>
                    <Input
                      placeholder="Government / Utility / Healthcare..."
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Context / Notes</label>
                  <Input
                    placeholder="Upcoming audit, leadership transition, infrastructure concern..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!form.name || !form.org || !form.email}
                >
                  Submit Assessment Request <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Response within 1 business day · GovCon procurement documentation available on request
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
