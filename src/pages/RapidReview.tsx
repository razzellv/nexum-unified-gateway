import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import {
  Search, Upload, CheckCircle2, AlertTriangle, Zap, DollarSign,
  FileText, Mail, Printer, ChevronRight, ChevronLeft, Sparkles, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

const TOP_10_ISSUES = [
  { id: 'i1', label: 'HVAC inefficiency / aging equipment', category: 'Equipment', impact: 'High' },
  { id: 'i2', label: 'No energy baseline established', category: 'Energy', impact: 'High' },
  { id: 'i3', label: 'High utility costs vs. benchmark', category: 'Energy', impact: 'High' },
  { id: 'i4', label: 'Reactive-only maintenance culture', category: 'Operations', impact: 'High' },
  { id: 'i5', label: 'Compliance gaps / lapsed inspections', category: 'Compliance', impact: 'Critical' },
  { id: 'i6', label: 'No preventive maintenance program', category: 'Operations', impact: 'High' },
  { id: 'i7', label: 'Lighting system outdated / no controls', category: 'Energy', impact: 'Medium' },
  { id: 'i8', label: 'Boiler/chiller approaching end of life', category: 'Equipment', impact: 'High' },
  { id: 'i9', label: 'No digital work order system', category: 'Technology', impact: 'Medium' },
  { id: 'i10', label: 'Water waste / no submetering', category: 'Energy', impact: 'Medium' },
];

const IMPACT_COLORS: Record<string, string> = {
  Critical: 'text-red-500 border-red-500/30 bg-red-500/5',
  High: 'text-orange-500 border-orange-500/30 bg-orange-500/5',
  Medium: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5',
  Low: 'text-green-500 border-green-500/30 bg-green-500/5',
};

const SERVICE_TIERS = [
  {
    id: 'rapid_review',
    name: 'Rapid Review',
    price: 'Free',
    priceNote: '20–30 min call',
    desc: 'Virtual questionnaire to map operational structure, workflow, and early risks.',
    features: ['Ops structure questionnaire', 'Utility bill review', 'Risk identification', 'Analysis to Improve report', 'Service tier recommendation'],
    cta: 'This Review',
    color: 'border-cyan-400/30',
  },
  {
    id: 'onsite_lite',
    name: 'Onsite Lite',
    price: '$2,500',
    priceNote: 'Half-day on-site',
    desc: 'On-site walkthrough — trend data, operator & manager assessment, report + SOPs/EOPs/Checklists.',
    features: ['Current trend data logged', 'Lead operator evaluated', 'Manager workflow observed', 'Written assessment report', 'Custom SOPs, EOPs & Checklists'],
    cta: 'Recommend Onsite Lite',
    color: 'border-primary/40',
    highlight: true,
  },
  {
    id: 'full_engagement',
    name: 'Full Engagement',
    price: '$5,000+',
    priceNote: 'Full transformation',
    desc: 'Adds staff capability scoring, interlock/safety testing, blowdown lines, compliance fault documentation.',
    features: ['All Onsite Lite deliverables', 'Staff capability scoring', 'Interlock & safety testing', 'Blowdown & load testing', 'Compliance faults documented', 'Permits & certs verified'],
    cta: 'Recommend Full Engagement',
    color: 'border-yellow-500/40',
  },
  {
    id: 'consulting',
    name: 'Consulting / VVFI',
    price: 'Retainer',
    priceNote: '$500–$2,000/mo',
    desc: 'Ongoing quarterly/bi-weekly meetings, 30-question bank, Analysis to Improve reports, custom docs.',
    features: ['Quarterly or bi-weekly meetings', 'Custom 30-question bank', 'Weekly improvement tracking', 'Analysis to Improve report', 'Custom SOPs on request', '20% off FI Platform year 1'],
    cta: 'Recommend Consulting',
    color: 'border-green-400/30',
  },
];

interface OpsQuestionnaire {
  logFrequency: string;
  logMethod: string;
  sopLocation: string;
  safetySignage: string;
  currentWorkflow: string;
  staffFollowWorkflow: string;
  roughWeek: string;
  leadOperatorName: string;
  managerName: string;
  openConcerns: string;
}

interface ReviewSession {
  id: string;
  date: string;
  clientName: string;
  facilityType: string;
  sqft: string;
  contactEmail: string;
  contactPhone: string;
  ops: OpsQuestionnaire;
  selectedIssues: string[];
  billNotes: string;
  aiAnalysis: string;
  selectedTier: string;
  reportSent: boolean;
}

const BLANK_OPS: OpsQuestionnaire = {
  logFrequency: '', logMethod: '', sopLocation: '', safetySignage: '',
  currentWorkflow: '', staffFollowWorkflow: '', roughWeek: '',
  leadOperatorName: '', managerName: '', openConcerns: '',
};

function blankSession(): ReviewSession {
  return {
    id: `rr-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    facilityType: 'Office',
    sqft: '',
    contactEmail: '',
    contactPhone: '',
    ops: { ...BLANK_OPS },
    selectedIssues: [],
    billNotes: '',
    aiAnalysis: '',
    selectedTier: '',
    reportSent: false,
  };
}

const FACILITY_TYPES = ['Office', 'Industrial', 'Retail', 'Healthcare', 'Education', 'Hospitality', 'Government', 'Mixed Use'];

function generateAnalysis(session: ReviewSession): string {
  const issues = TOP_10_ISSUES.filter(i => session.selectedIssues.includes(i.id));
  const criticals = issues.filter(i => i.impact === 'Critical' || i.impact === 'High');
  const energyIssues = issues.filter(i => i.category === 'Energy');
  const sqft = parseFloat(session.sqft) || 0;
  const { ops } = session;

  let text = `FACILITY INTELLIGENCE RAPID REVIEW — ANALYSIS TO IMPROVE\n`;
  text += `${'='.repeat(60)}\n`;
  text += `Client: ${session.clientName || 'N/A'} | ${session.facilityType} | ${sqft ? sqft.toLocaleString() + ' sqft' : 'Sqft TBD'}\n`;
  text += `Date: ${session.date}\n\n`;

  text += `EXECUTIVE SUMMARY\n${'-'.repeat(40)}\n`;
  text += `Based on the Rapid Review call, ${session.clientName || 'this facility'} has ${issues.length} identified risk area(s), `;
  text += `${criticals.length} of which are rated High or Critical priority.\n\n`;

  // Operational structure findings
  const opsGaps: string[] = [];
  if (!ops.logFrequency || ops.logFrequency === 'As-Needed' || ops.logFrequency === 'Never') opsGaps.push('Inconsistent or absent equipment logging');
  if (!ops.sopLocation || ops.sopLocation.toLowerCase().includes('no') || ops.sopLocation.toLowerCase().includes('none')) opsGaps.push('No documented SOP location / SOPs may not exist');
  if (ops.safetySignage === 'No') opsGaps.push('No safety awareness or regulatory signage posted');
  if (!ops.currentWorkflow) opsGaps.push('Workflow not documented or described');

  if (opsGaps.length > 0) {
    text += `OPERATIONAL STRUCTURE GAPS\n${'-'.repeat(40)}\n`;
    opsGaps.forEach((g, i) => { text += `${i + 1}. ${g}\n`; });
    text += '\n';
  }

  if (ops.roughWeek) {
    text += `TYPICAL WEEK SUMMARY\n${'-'.repeat(40)}\n`;
    text += `${ops.roughWeek}\n\n`;
  }

  if (criticals.length > 0) {
    text += `TOP PRIORITY RISKS\n${'-'.repeat(40)}\n`;
    criticals.forEach((issue, i) => { text += `${i + 1}. [${issue.impact}] ${issue.label}\n`; });
    text += '\n';
  }

  if (energyIssues.length > 0) {
    text += `ENERGY OPPORTUNITY\n${'-'.repeat(40)}\n`;
    if (sqft > 0) {
      const estSavings = Math.round(sqft * 0.85 * 0.12);
      text += `${energyIssues.length} energy gap(s) identified. Estimated savings potential: $${estSavings.toLocaleString()}/yr\n(based on $0.12/sqft benchmark for facilities in this condition range).\n\n`;
    } else {
      text += `${energyIssues.length} energy gap(s) identified. Complete energy baseline to quantify savings potential.\n\n`;
    }
  }

  if (session.billNotes) {
    text += `UTILITY NOTES\n${'-'.repeat(40)}\n${session.billNotes}\n\n`;
  }

  text += `RECOMMENDATIONS\n${'-'.repeat(40)}\n`;
  if (issues.length >= 5 || opsGaps.length >= 3) {
    text += `High issue density — recommend Full Engagement to develop a complete transformation roadmap, interlock & safety testing, and staff capability scoring.\n`;
  } else if (issues.length >= 3 || opsGaps.length >= 2) {
    text += `Multiple gaps identified — recommend Onsite Lite walkthrough to log trend data, assess lead operator and manager, and deliver SOPs, EOPs and Checklists.\n`;
  } else {
    text += `Low-to-moderate concern level — recommend starting with Onsite Lite to establish a baseline and validate findings from this review.\n`;
  }

  text += `\nPrepared by: Nexum Suum Facility Intelligence™\n`;
  return text;
}

export default function RapidReview() {
  const [tab, setTab] = useState('review');
  const [step, setStep] = useState(1);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [draft, setDraft] = useState<ReviewSession>(blankSession());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    syncRead<ReviewSession[]>('nexum_rapid_reviews', '/rapid-review', facilityId).then(d => {
      if (d) setSessions(d);
    });
  }, []);

  const saveSessions = (next: ReviewSession[]) => {
    setSessions(next);
    syncWrite('nexum_rapid_reviews', next, '/rapid-review', facilityId);
  };

  const updateDraft = (field: keyof ReviewSession, val: unknown) =>
    setDraft(d => ({ ...d, [field]: val }));

  const toggleIssue = (id: string) =>
    setDraft(d => ({
      ...d,
      selectedIssues: d.selectedIssues.includes(id)
        ? d.selectedIssues.filter(i => i !== id)
        : [...d.selectedIssues, id],
    }));

  const updateOps = (field: keyof OpsQuestionnaire, val: string) =>
    setDraft(d => ({ ...d, ops: { ...d.ops, [field]: val } }));

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await new Promise(r => setTimeout(r, 1400));
    const analysis = generateAnalysis(draft);
    setDraft(d => ({ ...d, aiAnalysis: analysis }));
    setIsAnalyzing(false);
    toast.success('Analysis complete.');
    setStep(5);
  };

  const saveSession = () => {
    if (!draft.clientName) { toast.error('Client name required.'); return; }
    saveSessions([draft, ...sessions]);
    toast.success('Review session saved.');
    setDraft(blankSession());
    setStep(1);
    setTab('history');
  };

  const sendReport = () => {
    if (!draft.contactEmail) { toast.error('Contact email required.'); return; }
    setDraft(d => ({ ...d, reportSent: true }));
    toast.success(`Report marked as sent to ${draft.contactEmail}. (Configure SES to actually send.)`);
  };

  const selectedIssueObjects = TOP_10_ISSUES.filter(i => draft.selectedIssues.includes(i.id));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Search className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Facility Intelligence Rapid Review</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Upload utility bills, identify issues, generate AI analysis, and recommend service tiers.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="review">New Review</TabsTrigger>
            <TabsTrigger value="tiers">Service Tiers</TabsTrigger>
            <TabsTrigger value="history">History ({sessions.length})</TabsTrigger>
          </TabsList>

          {/* ── New Review ── */}
          <TabsContent value="review" className="mt-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {['Client Info', 'Ops Questionnaire', 'Utility Bills', 'Issue Selector', 'Analysis & Report'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
                  <span className={cn('text-sm whitespace-nowrap', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>

            {/* Step 1 — Client Info */}
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle>Step 1 — Client Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Client / Facility Name</Label>
                      <Input value={draft.clientName} onChange={e => updateDraft('clientName', e.target.value)} placeholder="Acme Industrial" />
                    </div>
                    <div>
                      <Label>Facility Type</Label>
                      <Select value={draft.facilityType} onValueChange={v => updateDraft('facilityType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FACILITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Building Sqft</Label>
                      <Input value={draft.sqft} onChange={e => updateDraft('sqft', e.target.value)} placeholder="50,000" />
                    </div>
                    <div>
                      <Label>Review Date</Label>
                      <Input type="date" value={draft.date} onChange={e => updateDraft('date', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contact Email</Label>
                      <Input type="email" value={draft.contactEmail} onChange={e => updateDraft('contactEmail', e.target.value)} placeholder="manager@facility.com" />
                    </div>
                    <div>
                      <Label>Contact Phone</Label>
                      <Input value={draft.contactPhone} onChange={e => updateDraft('contactPhone', e.target.value)} placeholder="(555) 000-0000" />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)} disabled={!draft.clientName}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2 — Operational Questionnaire (20-30 min call) */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 2 — Operational Structure Questionnaire</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Complete during the 20–30 min Rapid Review call. Captures how the facility currently operates.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Lead Operator / Engineer Name</Label>
                      <Input value={draft.ops.leadOperatorName} onChange={e => updateOps('leadOperatorName', e.target.value)} placeholder="Name and role" />
                    </div>
                    <div>
                      <Label>Facility Manager Name</Label>
                      <Input value={draft.ops.managerName} onChange={e => updateOps('managerName', e.target.value)} placeholder="Name" />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>How often are logs taken?</Label>
                      <Select value={draft.ops.logFrequency} onValueChange={v => updateOps('logFrequency', v)}>
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          {['Multiple times daily', 'Daily', 'Weekly', 'Monthly', 'As-Needed', 'Never / No logs taken'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>How are logs taken / stored?</Label>
                      <Input value={draft.ops.logMethod} onChange={e => updateOps('logMethod', e.target.value)} placeholder="Paper binder, spreadsheet, CMMS, app…" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Where are SOPs kept?</Label>
                      <Input value={draft.ops.sopLocation} onChange={e => updateOps('sopLocation', e.target.value)} placeholder="Binder in boiler room, shared drive, nowhere…" />
                    </div>
                    <div>
                      <Label>Safety / awareness signage posted?</Label>
                      <Select value={draft.ops.safetySignage} onValueChange={v => updateOps('safetySignage', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Yes — comprehensive', 'Yes — some areas', 'Minimal / outdated', 'No'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Describe the current workflow — how does day-to-day operation run?</Label>
                    <Textarea value={draft.ops.currentWorkflow} onChange={e => updateOps('currentWorkflow', e.target.value)} rows={3} placeholder="Walk-through of typical daily tasks, who does what, shift handoffs, etc." />
                  </div>

                  <div>
                    <Label>How do staff follow the workflow? Is it communicated, trained, or informal?</Label>
                    <Textarea value={draft.ops.staffFollowWorkflow} onChange={e => updateOps('staffFollowWorkflow', e.target.value)} rows={3} placeholder="Verbal instruction only? Posted on wall? Part of onboarding? Nobody really knows?" />
                  </div>

                  <div>
                    <Label>What does a rough / busy week look like?</Label>
                    <Textarea value={draft.ops.roughWeek} onChange={e => updateOps('roughWeek', e.target.value)} rows={3} placeholder="Unplanned breakdowns, call-outs, compliance visits, emergencies — paint the picture." />
                  </div>

                  <div>
                    <Label>Any open concerns the client wants to flag?</Label>
                    <Textarea value={draft.ops.openConcerns} onChange={e => updateOps('openConcerns', e.target.value)} rows={2} placeholder="Anything weighing on them — budget, equipment, staff turnover, upcoming inspections…" />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3 — Utility Bills */}
            {step === 3 && (
              <Card>
                <CardHeader><CardTitle>Step 3 — Utility Bills</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium">Upload Utility Bills</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG — electric, gas, water bills</p>
                    <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) toast.success(`${files.length} file(s) selected.`);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Manual Bill Notes / Summary</Label>
                    <Textarea
                      value={draft.billNotes}
                      onChange={e => updateDraft('billNotes', e.target.value)}
                      rows={4}
                      placeholder="Electric avg $4,200/mo, Gas avg $1,800/mo, 12-month total $72,480. EUI est. 95 kBTU/sqft/yr…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setStep(4)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4 — Issue Selector */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Step 4 — Issue Selector</CardTitle>
                    <Badge variant="secondary">{draft.selectedIssues.length} selected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select all risks and issues identified or suspected for this facility:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {TOP_10_ISSUES.map(issue => (
                      <button
                        key={issue.id}
                        onClick={() => toggleIssue(issue.id)}
                        className={cn(
                          'text-left px-4 py-3 rounded-lg border text-sm transition-colors',
                          draft.selectedIssues.includes(issue.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-border/80',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-4 h-4 rounded flex items-center justify-center border shrink-0',
                            draft.selectedIssues.includes(issue.id) ? 'border-primary bg-primary' : 'border-border',
                          )}>
                            {draft.selectedIssues.includes(issue.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="flex-1">{issue.label}</span>
                          <Badge className={cn('text-xs border ml-1 shrink-0', IMPACT_COLORS[issue.impact])}>{issue.impact}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{issue.category}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={runAnalysis} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <>Analyzing… <span className="ml-2 animate-spin">⟳</span></>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generate Analysis to Improve</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 — Analysis & Report */}
            {step === 5 && (
              <div className="space-y-4">
                {/* Analysis */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm">AI Analysis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={draft.aiAnalysis}
                      onChange={e => updateDraft('aiAnalysis', e.target.value)}
                      rows={12}
                      className="font-mono text-xs resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Issue summary */}
                {selectedIssueObjects.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Identified Issues ({selectedIssueObjects.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedIssueObjects.map(i => (
                          <Badge key={i.id} className={cn('text-xs border', IMPACT_COLORS[i.impact])}>{i.label}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Service tier recommendation */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Recommended Service Tier</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {SERVICE_TIERS.map(tier => (
                        <button
                          key={tier.id}
                          onClick={() => updateDraft('selectedTier', tier.id)}
                          className={cn(
                            'text-left border rounded-lg p-4 transition-colors',
                            draft.selectedTier === tier.id ? 'border-primary bg-primary/5' : tier.color,
                            (tier as any).highlight && draft.selectedTier !== tier.id && 'border-primary/40',
                          )}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-bold text-sm">{tier.name}</p>
                            <Badge variant={(tier as any).highlight ? 'default' : 'secondary'} className="text-xs">{tier.price}</Badge>
                          </div>
                          <p className="text-xs text-primary mb-2">{(tier as any).priceNote}</p>
                          <p className="text-xs text-muted-foreground mb-2">{tier.desc}</p>
                          <ul className="space-y-1">
                            {tier.features.map(f => (
                              <li key={f} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Email send */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Send Report</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Send to Email</Label>
                        <Input
                          type="email"
                          value={draft.contactEmail}
                          onChange={e => updateDraft('contactEmail', e.target.value)}
                          placeholder="client@facility.com"
                        />
                      </div>
                      <Button onClick={sendReport} disabled={draft.reportSent}>
                        <Mail className="w-4 h-4 mr-2" />
                        {draft.reportSent ? 'Sent ✓' : 'Send Report'}
                      </Button>
                      <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                    {draft.reportSent && (
                      <div className="flex items-center gap-2 text-xs text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        Report sent to {draft.contactEmail}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <Button className="flex-1" onClick={saveSession}>
                    <FileText className="w-4 h-4 mr-2" />Save Review Session
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Service Tiers ── */}
          <TabsContent value="tiers" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {SERVICE_TIERS.map((tier, idx) => (
                <Card key={tier.id} className={cn('border flex flex-col', tier.color, (tier as any).highlight && 'shadow-lg ring-1 ring-primary/30')}>
                  {(tier as any).highlight && (
                    <div className="bg-primary text-primary-foreground text-xs text-center py-1 px-3 rounded-t font-medium">Most Booked</div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{idx + 2}</div>
                      <CardTitle className="text-base">{tier.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{tier.price}</span>
                      <span className="text-xs text-muted-foreground">{(tier as any).priceNote}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.desc}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <ul className="space-y-1.5 flex-1">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />The Engagement Journey</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1.5">
                  <p><span className="text-foreground font-medium">1. FI Intro</span> — Free discovery call. Is FI the right fit?</p>
                  <p><span className="text-foreground font-medium">2. Rapid Review</span> — Free 20–30 min call. Ops structure + utility review + this tool.</p>
                  <p><span className="text-foreground font-medium">3. Onsite Lite</span> — $2,500. Half-day on-site. Report + SOPs/EOPs/Checklists.</p>
                  <p><span className="text-foreground font-medium">4. Full Engagement</span> — $5,000+. Deep staff, system & compliance evaluation.</p>
                  <p><span className="text-foreground font-medium">5. Consulting / VVFI</span> — Retainer. Ongoing relationship, Analysis to Improve.</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Revenue Path</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1.5">
                  <p>Rapid Review (Free) → Onsite Lite ($2,500) → Full Engagement ($5k+)</p>
                  <p>+ VVFI Consulting retainer ($500–$2,000/mo ongoing)</p>
                  <p>+ FI Platform license ($10,788–$83,988/yr) with 20% VVFI discount</p>
                  <p>+ Custom SOPs, EOPs & Checklists via Doc Generator</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" className="mt-4">
            {sessions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No review sessions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs uppercase">
                      {['Client', 'Type', 'Sqft', 'Issues', 'Tier', 'Date', 'Report Sent'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{s.clientName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.facilityType}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.sqft ? parseInt(s.sqft).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2">{s.selectedIssues.length}</td>
                        <td className="px-3 py-2">
                          {s.selectedTier ? <Badge variant="outline" className="text-xs">{SERVICE_TIERS.find(t => t.id === s.selectedTier)?.name || s.selectedTier}</Badge> : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{s.date}</td>
                        <td className="px-3 py-2">
                          {s.reportSent ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
