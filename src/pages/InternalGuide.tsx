import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, ClipboardCheck, RefreshCw, FileSearch, Users,
  FileOutput, DollarSign, BarChart3,
} from 'lucide-react';

const sections = [
  {
    id: 'fias-workflow',
    icon: ClipboardCheck,
    title: 'How to Use FIAS',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Step-by-step FIAS workflow:</p>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li><span className="font-medium text-foreground">Open FIAS</span> from the Nexum Internal sidebar. The active client is read from localStorage (<code className="bg-muted px-1 rounded text-xs">nexum_facility_id</code>).</li>
          <li><span className="font-medium text-foreground">Select a Stage</span> — Stage 1 (Free Call, $0), Stage 2 (Gap Analysis $249–$500), or Stage 3 (System Behavior Breakdown $1,000–$3,000+). Store the active stage per client.</li>
          <li><span className="font-medium text-foreground">Choose Assessment Mode</span> — Quick (5 questions, ~5 min) for initial calls; Full (up to 30 questions) for deeper engagements.</li>
          <li><span className="font-medium text-foreground">Answer Questions</span> — Each question has radio options (Yes / No / Partially / Unknown) and an optional notes field. Answers auto-save.</li>
          <li><span className="font-medium text-foreground">Log Equipment Issues</span> in the Equipment Issues tab — category, severity, unit ID, date noticed, description.</li>
          <li><span className="font-medium text-foreground">Log Performance</span> in the Performance tab — employee virtuous scores and stakeholder feedback.</li>
          <li><span className="font-medium text-foreground">Generate Report</span> once ≥5 questions are answered (Quick) or ≥15 (Full). The report auto-calculates an Operational Performance Score (0–100) and recommended next stage.</li>
          <li><span className="font-medium text-foreground">Save Assessment</span> — persists to localStorage and attempts a POST to <code className="bg-muted px-1 rounded text-xs">/assessments</code>.</li>
        </ol>
        <Separator />
        <p className="text-xs">Gap descriptions are auto-generated from No / Partially / Unknown answers. Critical and High equipment issues are always surfaced first in the report.</p>
      </div>
    ),
  },
  {
    id: 'vvfi-flow',
    icon: RefreshCw,
    title: 'VVFI Retainer Flow',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Virtuous Verified Facility Intelligence — recurring retainer program.</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { plan: 'Monthly', price: '$500/mo', cycle: 'Every 30 days' },
            { plan: 'Quarterly', price: '$1,200/qtr', cycle: 'Every 90 days' },
            { plan: 'Semi-Annual', price: '$2,000/semi', cycle: 'Every 180 days' },
          ].map(p => (
            <div key={p.plan} className="border border-border rounded-lg p-3">
              <p className="font-semibold text-foreground">{p.plan}</p>
              <p className="text-primary text-base font-bold">{p.price}</p>
              <p className="text-xs">{p.cycle}</p>
            </div>
          ))}
        </div>
        <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
          <li><span className="font-medium text-foreground">Enroll Client</span> in VVFI → New Engagement tab. Fill in contact details, plan type, start date, assigned consultant.</li>
          <li><span className="font-medium text-foreground">Track Status</span> — Active Retainers cards auto-calculate: On Track (&gt;14 days out), Due Soon (7–14 days), Overdue (past due).</li>
          <li><span className="font-medium text-foreground">Conduct Assessment</span> at each cadence using FIAS Full mode. Save report tagged to client facilityId.</li>
          <li><span className="font-medium text-foreground">Log VVFI Report</span> under VVFI → Reports for that client. Score trending appears as a line chart.</li>
          <li><span className="font-medium text-foreground">Review Gaps</span> — compare current score to prior reports. Flag persistent gaps for Stage 3 upgrade conversation.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'audit-reference',
    icon: FileSearch,
    title: 'Audit Checklist Reference',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">All scope categories and sub-items used in the Audit Module:</p>
        {[
          { cat: 'HVAC Systems', items: ['Filter condition', 'Coil condition', 'Belt/drive', 'Refrigerant charge', 'Controls calibration', 'Airflow measurement', 'Thermostat setpoints'] },
          { cat: 'Boilers', items: ['Burner operation', 'Water chemistry', 'Pressure relief', 'Controls', 'Flue/venting', 'Fuel supply', 'Annual cert status'] },
          { cat: 'Electrical', items: ['Panel labeling', 'Breaker condition', 'Grounding', 'Motor nameplate vs actual draw', 'Disconnect condition'] },
          { cat: 'Plumbing', items: ['Backflow preventer', 'Pressure reducing valve', 'Pipe insulation', 'Drain condition', 'Leak indicators'] },
          { cat: 'Fire Suppression', items: ['Sprinkler head condition', 'Water supply pressure', 'Alarm test', 'Signage & access', 'Last inspection cert'] },
          { cat: 'IAQ', items: ['CO2 levels', 'Humidity range', 'Air filter loading', 'Ventilation rate', 'Odor complaints log'] },
          { cat: 'Chillers', items: ['Entering/leaving water temps', 'Refrigerant log', 'Condenser approach', 'Evaporator approach', 'Unit controls', 'Insulation condition'] },
          { cat: 'Compliance Docs', items: ['Inspection certs current', 'Chemical handling logs', 'Permits on file', 'Training records', 'Corrective action log'] },
        ].map(s => (
          <div key={s.cat}>
            <p className="font-medium text-foreground mb-1">{s.cat}</p>
            <ul className="list-disc list-inside ml-3 space-y-0.5">
              {s.items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'client-management',
    icon: Users,
    title: 'Client Account Management',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li><span className="font-medium text-foreground">Add a client</span> in Client Accounts → Add Account. Required: Client Name, FacilityId, Org Type, Tier.</li>
          <li><span className="font-medium text-foreground">Search & filter</span> by Tier, Plan Status (Active / Past Due / Churned), and Org Type in the All Accounts tab.</li>
          <li><span className="font-medium text-foreground">Open detail view</span> by clicking any row. The Account Detail tab shows all fields, notes log, and risk flags.</li>
          <li><span className="font-medium text-foreground">Add a timestamped note</span> directly on the detail view — useful for call summaries, flags, follow-up reminders.</li>
          <li><span className="font-medium text-foreground">Open in FI Platform</span> — the detail view links to <code className="bg-muted px-1 rounded text-xs">portal.nexumsuum-facilityintelligence.com?adminView=facilityId</code> in a new tab.</li>
          <li><span className="font-medium text-foreground">Churn risk flags</span> are auto-set when: Plan Status = Past Due, no FIAS in &gt;90 days, or VVFI plan = None.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'doc-generator',
    icon: FileOutput,
    title: 'Doc Generator Guide',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Which template for which situation:</p>
        <div className="space-y-2">
          {[
            { type: 'FIAS Assessment Report', when: 'After completing a FIAS assessment — send to client as deliverable for Stage 2 or Stage 3.' },
            { type: 'VVFI Summary', when: 'Monthly/quarterly summary for active retainer clients. Includes score trend and top gaps.' },
            { type: 'Audit Report', when: 'After completing an on-site facility audit. Lists pass/fail checklist results per scope area.' },
            { type: 'Gap Analysis', when: 'Stage 2 deliverable. Focuses on No/Partially/Unknown answers from FIAS and maps them to operational gaps.' },
            { type: 'Proposal', when: 'Pre-sales or Stage 3 upsell. Combines gap analysis + recommended actions + pricing.' },
            { type: 'Executive Summary', when: 'Board or ownership presentation. High-level score, top 3 risks, recommended investment.' },
          ].map(t => (
            <div key={t.type} className="border border-border rounded p-2">
              <p className="font-medium text-foreground text-xs">{t.type}</p>
              <p className="text-xs mt-0.5">{t.when}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2">All generated documents are saved to localStorage under <code className="bg-muted px-1 rounded">nexum_generated_docs_{'{facilityId}'}</code> and appear in the History tab.</p>
      </div>
    ),
  },
  {
    id: 'pricing',
    icon: DollarSign,
    title: 'Pricing Reference',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground mb-2">FIAS Assessment Stages</p>
          <div className="space-y-1">
            {[
              ['Stage 1 — Free Qualification Call', '$0', '10–15 min, identify pain points'],
              ['Stage 2 — Gap Analysis', '$249–$500', 'Structured report of operational gaps'],
              ['Stage 3 — System Behavior Breakdown', '$1,000–$3,000+', 'Deep-dive + CTS scoring'],
            ].map(([s, p, d]) => (
              <div key={s} className="flex items-start gap-3 border border-border rounded p-2">
                <div className="flex-1">
                  <span className="font-medium text-foreground">{s}</span>
                  <p className="text-xs mt-0.5">{d}</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary/40 shrink-0">{p}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium text-foreground mb-2">VVFI Retainer Plans</p>
          <div className="space-y-1">
            {[
              ['Monthly', '$500/mo'],
              ['Quarterly', '$1,200/qtr (~$400/mo)'],
              ['Semi-Annual', '$2,000/semi (~$333/mo)'],
            ].map(([plan, price]) => (
              <div key={plan} className="flex justify-between border border-border rounded p-2">
                <span>{plan}</span>
                <span className="text-primary font-medium">{price}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium text-foreground mb-2">FI Platform Tiers (client-facing)</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {[
              ['Facility Basic', '$10,788/yr'], ['Facility Standard', '$23,988/yr'],
              ['Facility Business', '$47,988/yr'], ['Facility Premium', '$83,988/yr'],
              ['Command Basic', '$4,970/yr'], ['Command Standard', '$9,970/yr'],
              ['Command Pro', '$19,970/yr'], ['Retail Starter', '$197/mo'],
              ['Retail Pro', '$297/mo'],
            ].map(([t, p]) => (
              <div key={t} className="flex justify-between border border-border rounded px-2 py-1">
                <span>{t}</span><span className="text-primary">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'scoring',
    icon: BarChart3,
    title: 'Scoring Guide — Operational Performance Score',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">The 0–100 Operational Performance Score is calculated as:</p>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-1">
          <p>Score = (yesPercent × 0.40)</p>
          <p>      + (criticalHealthScore × 0.30)</p>
          <p>      + (avgVirtuousScore × 0.30)</p>
        </div>
        <div className="space-y-2">
          <div className="border border-border rounded p-2">
            <p className="font-medium text-foreground">yesPercent (40%)</p>
            <p className="text-xs mt-1">Percentage of answered questions with a "Yes" response. "No" and "Partially" lower this score; "Unknown" is neutral.</p>
          </div>
          <div className="border border-border rounded p-2">
            <p className="font-medium text-foreground">criticalHealthScore (30%)</p>
            <p className="text-xs mt-1">100 − (critical issues × 25) − (high issues × 10). Floored at 0. Zero critical issues = full 30% contribution.</p>
          </div>
          <div className="border border-border rounded p-2">
            <p className="font-medium text-foreground">avgVirtuousScore (30%)</p>
            <p className="text-xs mt-1">Average of all employee Virtuous Scores logged in the Performance tab. If no employees logged, defaults to 75.</p>
          </div>
        </div>
        <Separator />
        <p className="font-medium text-foreground">Score Bands:</p>
        <div className="space-y-1">
          {[
            ['80–100', 'Optimized', 'bg-green-500/20 text-green-400'],
            ['60–79', 'Functional with Gaps', 'bg-yellow-500/20 text-yellow-400'],
            ['40–59', 'Reactive Operations', 'bg-orange-500/20 text-orange-400'],
            ['< 40', 'Critical Intervention Required', 'bg-red-500/20 text-red-400'],
          ].map(([range, label, cls]) => (
            <div key={range} className={`flex justify-between rounded px-3 py-1.5 ${cls}`}>
              <span className="font-medium">{range}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs">Virtuous Score per employee = avg of: Response Time score (≤30 min=100, 30–60=80, 60–120=60, &gt;120=40), WO Completion %, PM Compliance %, Safety Score.</p>
      </div>
    ),
  },
];

export default function InternalGuide() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Internal Guide</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Staff Only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Reference documentation for Nexum Suum consulting operations.</p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {sections.map(s => (
            <AccordionItem key={s.id} value={s.id} className="border border-border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <s.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">{s.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {s.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Reference — LocalStorage Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-1 text-xs font-mono text-muted-foreground">
              {[
                'nexum_fias_answers_{facilityId}',
                'nexum_fias_issues_{facilityId}',
                'nexum_fias_perf_{facilityId}',
                'nexum_fias_report_{facilityId}',
                'nexum_fias_stage_{facilityId}',
                'nexum_energy_baseline_{facilityId}',
                'nexum_energy_report_{facilityId}',
                'nexum_vvfi_clients',
                'nexum_vvfi_reports_{facilityId}',
                'nexum_client_accounts',
                'nexum_audits',
                'nexum_generated_docs_{facilityId}',
                'nexum_contractor_jobs_{facilityId}',
                'nexum_contractor_callbacks_{facilityId}',
              ].map(k => (
                <code key={k} className="bg-muted rounded px-2 py-0.5">{k}</code>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
