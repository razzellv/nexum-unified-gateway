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
    id: 'intro',
    name: 'FI Intro',
    price: 'Free',
    desc: '30-min AI strategy call + rapid review summary',
    features: ['AI issue analysis', 'Top risk identification', 'Recommended next steps', 'PDF summary report'],
    cta: 'Schedule Call',
    color: 'border-border',
  },
  {
    id: 'onsite_lite',
    name: 'Onsite Lite',
    price: '$2,500',
    desc: 'Onsite Performance Walkthrough — half-day assessment',
    features: ['On-site facility walkthrough', 'Equipment condition review', 'Priority fix list', 'Written summary report', '1-hr debrief call'],
    cta: 'Book Onsite Lite',
    color: 'border-primary/40',
    highlight: true,
  },
  {
    id: 'full_engagement',
    name: 'Full Engagement',
    price: '$5,000+',
    desc: 'Facility Intelligence Transformation Program',
    features: ['Full FIAS assessment', 'Energy baseline report', 'CTS-3 correlation model', 'ROI & investment analysis', 'Implementation roadmap', 'Ongoing VVFI retainer option'],
    cta: 'Start Full Engagement',
    color: 'border-yellow-500/40',
  },
];

interface ReviewSession {
  id: string;
  date: string;
  clientName: string;
  facilityType: string;
  sqft: string;
  contactEmail: string;
  contactPhone: string;
  selectedIssues: string[];
  billNotes: string;
  aiAnalysis: string;
  selectedTier: string;
  reportSent: boolean;
}

function blankSession(): ReviewSession {
  return {
    id: `rr-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    facilityType: 'Office',
    sqft: '',
    contactEmail: '',
    contactPhone: '',
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

  let text = `FACILITY INTELLIGENCE RAPID REVIEW\n`;
  text += `Client: ${session.clientName || 'N/A'} | ${session.facilityType} | ${sqft ? sqft.toLocaleString() + ' sqft' : 'Sqft TBD'}\n`;
  text += `Date: ${session.date}\n\n`;

  text += `EXECUTIVE SUMMARY\n`;
  text += `Based on the initial review, ${session.clientName || 'this facility'} has ${issues.length} identified risk area(s), `;
  text += `${criticals.length} of which are rated High or Critical priority.\n\n`;

  if (criticals.length > 0) {
    text += `TOP PRIORITY ISSUES\n`;
    criticals.forEach((issue, i) => {
      text += `${i + 1}. [${issue.impact}] ${issue.label}\n`;
    });
    text += '\n';
  }

  if (energyIssues.length > 0) {
    text += `ENERGY OPPORTUNITY\n`;
    text += `${energyIssues.length} energy-related issue(s) identified. `;
    if (sqft > 0) {
      const estSavings = Math.round(sqft * 0.85 * 0.12);
      text += `Estimated annual savings potential: $${estSavings.toLocaleString()} (based on $0.12/sqft industry benchmark for facilities in this condition range).\n\n`;
    } else {
      text += `Complete the energy baseline to quantify savings potential.\n\n`;
    }
  }

  text += `RECOMMENDED NEXT STEP\n`;
  if (issues.length >= 5) {
    text += `High issue density — recommend Full Engagement (FITP) to develop a complete transformation roadmap and ROI analysis.`;
  } else if (issues.length >= 3) {
    text += `Multiple issues identified — recommend Onsite Lite walkthrough to validate findings and prioritize action items.`;
  } else {
    text += `Low-to-moderate concern level — recommend a 30-min AI strategy call to review findings and confirm next steps.`;
  }

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

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // Generate analysis client-side (AI call would go here if API key available)
    await new Promise(r => setTimeout(r, 1200));
    const analysis = generateAnalysis(draft);
    setDraft(d => ({ ...d, aiAnalysis: analysis }));
    setIsAnalyzing(false);
    toast.success('Analysis complete.');
    setStep(4);
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
              {['Client Info', 'Utility Bills', 'Issue Selector', 'AI Analysis & Report'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
                  <span className={cn('text-sm whitespace-nowrap', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
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

            {/* Step 2 — Utility Bills */}
            {step === 2 && (
              <Card>
                <CardHeader><CardTitle>Step 2 — Utility Bills</CardTitle></CardHeader>
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
                        if (files.length) toast.success(`${files.length} file(s) selected (analysis requires backend integration).`);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Manual Bill Notes / Summary</Label>
                    <Textarea
                      value={draft.billNotes}
                      onChange={e => updateDraft('billNotes', e.target.value)}
                      rows={4}
                      placeholder="Paste utility data or notes here. Example: Electric avg $4,200/mo, Gas avg $1,800/mo, 12-month total $72,480. EUI estimated at 95 kBTU/sqft/yr…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3 — Issue Selector */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Step 3 — Issue Selector</CardTitle>
                    <Badge variant="secondary">{draft.selectedIssues.length} selected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select all issues and risks identified or suspected for this facility:</p>
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
                    <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={runAnalysis} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <>Analyzing… <span className="ml-2 animate-spin">⟳</span></>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generate AI Analysis</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4 — Analysis & Report */}
            {step === 4 && (
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
                            tier.highlight && draft.selectedTier !== tier.id && 'border-primary/40',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-bold text-sm">{tier.name}</p>
                            <Badge variant={tier.highlight ? 'default' : 'secondary'} className="text-xs">{tier.price}</Badge>
                          </div>
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
                  <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <Button className="flex-1" onClick={saveSession}>
                    <FileText className="w-4 h-4 mr-2" />Save Review Session
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Service Tiers ── */}
          <TabsContent value="tiers" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SERVICE_TIERS.map(tier => (
                <Card key={tier.id} className={cn('border', tier.color, tier.highlight && 'shadow-lg')}>
                  {tier.highlight && (
                    <div className="bg-primary text-primary-foreground text-xs text-center py-1 px-3 rounded-t font-medium">Most Recommended</div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{tier.name}</CardTitle>
                      <Badge variant="outline" className="text-lg font-bold px-3 py-1">{tier.price}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tier.desc}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Separator />
                    <Button className="w-full" variant={tier.highlight ? 'default' : 'outline'}>
                      {tier.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />FI Intro → Onsite Lite Pathway</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Client submits utility bills via Rapid Review</p>
                  <p>2. Nexum generates AI analysis + selects top issues</p>
                  <p>3. 30-min strategy call to review findings</p>
                  <p>4. Recommend Onsite Lite or Full Engagement based on issue density</p>
                  <p>5. Upsell to VVFI retainer after engagement complete</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Revenue Path</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>FI Intro (Free) → Onsite Lite ($2,500) → Full Engagement ($5k+)</p>
                  <p>+ FI Platform subscription (Basic $10,788/yr → Enterprise)</p>
                  <p>+ VVFI Retainer ($500–$2,000/mo ongoing)</p>
                  <p>+ Contractor Install oversight fees</p>
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
