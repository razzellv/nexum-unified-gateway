import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Droplets, FlaskConical, CheckCircle2, Clock, FileText,
  Phone, Mail, Building2, Calendar, Briefcase, X, ChevronRight,
  Zap, Shield, Award, Printer,
} from 'lucide-react';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const LS_KEY = 'nexum_consulting_requests';

function getToken() {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceId = 'stormwater' | 'tier2' | 'bundle';

interface ServiceRequest {
  id: string;
  serviceId: ServiceId;
  facilityName: string;
  facilityAddress: string;
  sicNaics: string;
  permitNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredWindow: string;
  knownIssues: string;
  submittedAt: string;
  status: 'submitted' | 'in_review' | 'scheduled' | 'completed';
}

interface ServiceDef {
  id: ServiceId;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  tagline: string;
  price: string;
  priceNote: string;
  deliveryTime: string;
  badge?: string;
  includes: string[];
  regulatoryContext: string;
  permitLabel: string;
  permitPlaceholder: string;
}

// ─── Service Definitions ──────────────────────────────────────────────────────

const SERVICES: ServiceDef[] = [
  {
    id: 'stormwater',
    icon: Droplets,
    iconColor: 'text-blue-500',
    title: 'Industrial Stormwater Compliance Audit',
    tagline: 'NPDES permit review, site walkthrough, and corrective action report — delivered in 5 business days.',
    price: '$2,400',
    priceNote: 'one-time',
    deliveryTime: '5 business days',
    includes: [
      'NPDES permit review and permit limit mapping',
      'Site walkthrough protocol (discharge points, BMPs, housekeeping)',
      'SWPPP gap analysis vs. Multi-Sector General Permit (MSGP)',
      'Quarterly visual inspection checklist (MSGP Table D-1 format)',
      'Corrective action report with prioritized findings',
      '30-day follow-up check-in call',
    ],
    regulatoryContext: 'Required under Clean Water Act 40 CFR Part 122. Facilities with industrial stormwater discharges must maintain a current SWPPP and conduct annual compliance evaluations.',
    permitLabel: 'NPDES Permit Number',
    permitPlaceholder: 'e.g. OHR000001 (leave blank if unknown)',
  },
  {
    id: 'tier2',
    icon: FlaskConical,
    iconColor: 'text-orange-500',
    title: 'Tier II / SARA Chemical Inventory Audit',
    tagline: 'February 15th filing prep — we inventory, classify, and generate your state Tier II report.',
    price: '$1,800',
    priceNote: 'one-time',
    deliveryTime: '7 business days',
    includes: [
      'On-site or remote chemical inventory review',
      'SDS verification and threshold calculations',
      'Hazard classification per EPCRA Section 312',
      'Tier II report generated and reviewed',
      'Filed on your behalf or handed off ready to submit',
      'LEPC and fire department notification checklist',
    ],
    regulatoryContext: 'Required under EPCRA Section 312 (SARA Title III). Facilities storing hazardous chemicals above threshold quantities must file annually by February 15th with their SERC, LEPC, and local fire department.',
    permitLabel: 'Facility EPA ID (if known)',
    permitPlaceholder: 'e.g. OHD000123456 (optional)',
  },
];

const BUNDLE: ServiceDef = {
  id: 'bundle',
  icon: Zap,
  iconColor: 'text-purple-500',
  title: 'Stormwater + Tier II Bundle',
  tagline: 'Both audits in a single site visit — maximum savings, minimum disruption.',
  price: '$3,800',
  priceNote: 'save $400',
  deliveryTime: '7 business days',
  badge: 'Best Value',
  includes: [
    'Everything in Stormwater Audit',
    'Everything in Tier II / SARA Audit',
    'Combined site visit — one day, both deliverables',
    'Integrated corrective action plan covering both programs',
    '60-day follow-up check-in call',
  ],
  regulatoryContext: 'Most facilities that trigger NPDES stormwater requirements also store chemicals above Tier II thresholds. Bundling both audits in one visit reduces disruption and delivers a unified compliance picture.',
  permitLabel: 'NPDES Permit Number (if known)',
  permitPlaceholder: 'e.g. OHR000001 (optional)',
};

const STATUS_META: Record<ServiceRequest['status'], { label: string; color: string }> = {
  submitted:   { label: 'Submitted',   color: 'bg-blue-100 text-blue-700' },
  in_review:   { label: 'In Review',   color: 'bg-yellow-100 text-yellow-700' },
  scheduled:   { label: 'Scheduled',   color: 'bg-purple-100 text-purple-700' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
};

const EMPTY_FORM = {
  facilityName: '',
  facilityAddress: '',
  sicNaics: '',
  permitNumber: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  preferredWindow: '',
  knownIssues: '',
};

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({ svc, onRequest }: { svc: ServiceDef; onRequest: (id: ServiceId) => void }) {
  const Icon = svc.icon;
  return (
    <Card className={cn('relative flex flex-col', svc.id === 'bundle' && 'border-purple-300 shadow-purple-100 shadow-md')}>
      {svc.badge && (
        <div className="absolute -top-3 left-6">
          <Badge className="bg-purple-600 text-white px-3 py-1">{svc.badge}</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-muted/60', svc.id === 'bundle' ? 'bg-purple-50' : '')}>
            <Icon className={cn('w-6 h-6', svc.iconColor)} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base leading-tight">{svc.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{svc.tagline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Price + delivery */}
        <div className="flex items-end gap-3 pb-3 border-b border-border/40">
          <span className="text-3xl font-bold text-foreground">{svc.price}</span>
          <span className="text-sm text-muted-foreground pb-1">{svc.priceNote}</span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {svc.deliveryTime}
          </div>
        </div>

        {/* Includes */}
        <ul className="space-y-2">
          {svc.includes.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* Regulatory context */}
        <div className="bg-muted/40 rounded-md p-3 text-xs text-muted-foreground border border-border/30 mt-auto">
          <div className="flex items-start gap-2">
            <Shield className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
            <span>{svc.regulatoryContext}</span>
          </div>
        </div>

        <Button
          onClick={() => onRequest(svc.id)}
          className={cn('w-full', svc.id === 'bundle' && 'bg-purple-600 hover:bg-purple-700')}
        >
          Request This Service
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsultingServices() {
  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });
  const [activeService, setActiveService] = useState<ServiceId | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const activeSvcDef = activeService
    ? ([...SERVICES, BUNDLE].find(s => s.id === activeService) ?? null)
    : null;

  function printReport(r: ServiceRequest, svc: ServiceDef | undefined) {
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const submittedDate = new Date(r.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Nexum Suum — ${svc?.title ?? 'Service'} Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 0; padding: 40px; max-width: 760px; margin: 0 auto; }
  .header { border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 20px; font-weight: 700; color: #7c3aed; }
  .brand-sub { font-size: 10px; color: #6b7280; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }
  .report-title { font-size: 15px; font-weight: 700; margin: 0 0 20px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f9f9f9; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
  .meta-item label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 12px; color: #111; }
  .section-title { font-size: 12px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 20px 0 12px; }
  .checklist { list-style: none; padding: 0; margin: 0; }
  .checklist li { padding: 5px 0; border-bottom: 1px dotted #e5e7eb; display: flex; gap: 8px; }
  .checklist li::before { content: '☐'; color: #7c3aed; font-size: 13px; }
  .regulatory { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 11px; color: #92400e; line-height: 1.6; margin: 12px 0; }
  .findings-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; min-height: 80px; margin-top: 8px; font-size: 11px; color: #6b7280; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 10px; color: #6b7280; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  .badge { display: inline-block; background: #ede9fe; color: #7c3aed; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="brand">Nexum Suum</div>
    <div class="brand-sub">Facility Intelligence™ · Compliance & Advisory Services</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#6b7280;">
    <div>Report Date: ${reportDate}</div>
    <div>Request ID: ${r.id}</div>
    <div><span class="badge">ADMISSIBLE DOCUMENT</span></div>
  </div>
</div>

<div class="report-title">${svc?.title ?? 'Compliance Service'} — Engagement Report</div>

<div class="section-title">Facility Information</div>
<div class="meta-grid">
  <div class="meta-item"><label>Facility Name</label><span>${r.facilityName || '—'}</span></div>
  <div class="meta-item"><label>Facility Address</label><span>${r.facilityAddress || '—'}</span></div>
  <div class="meta-item"><label>SIC / NAICS Code</label><span>${r.sicNaics || 'Not provided'}</span></div>
  <div class="meta-item"><label>${svc?.permitLabel ?? 'Permit / EPA ID'}</label><span>${r.permitNumber || 'Not provided'}</span></div>
</div>

<div class="section-title">Primary Contact</div>
<div class="meta-grid">
  <div class="meta-item"><label>Name</label><span>${r.contactName}</span></div>
  <div class="meta-item"><label>Email</label><span>${r.contactEmail}</span></div>
  <div class="meta-item"><label>Phone</label><span>${r.contactPhone || '—'}</span></div>
  <div class="meta-item"><label>Request Submitted</label><span>${submittedDate}</span></div>
</div>

<div class="section-title">Regulatory Context</div>
<div class="regulatory">${svc?.regulatoryContext ?? ''}</div>

<div class="section-title">Service Scope — Deliverables</div>
<ul class="checklist">
  ${(svc?.includes ?? []).map(i => `<li>${i}</li>`).join('')}
</ul>

<div class="section-title">Known Issues / Areas of Concern (Client-Reported)</div>
<div class="findings-box">${r.knownIssues || 'None reported at time of request.'}</div>

<div class="section-title">Findings & Corrective Actions</div>
<div class="findings-box" style="min-height:120px;">
  <span style="color:#d1d5db;font-style:italic;">To be completed by Nexum Suum specialist following site engagement.</span>
</div>

<div class="section-title">Certification</div>
<p style="font-size:11px;color:#374151;line-height:1.7;">
  This report has been prepared by Nexum Suum Facility Intelligence™ based on the information provided by the facility contact and any on-site observations made during the engagement. All findings are documented in accordance with applicable regulatory standards and are intended to support the facility's compliance posture. This document may be retained as a defensible compliance record.
</p>

<div class="signature-grid">
  <div>
    <div style="height:40px;"></div>
    <div class="sig-line">Nexum Suum Specialist Signature &amp; Date</div>
  </div>
  <div>
    <div style="height:40px;"></div>
    <div class="sig-line">Facility Representative Signature &amp; Date</div>
  </div>
</div>

<div class="footer">
  <span>Nexum Suum Facility Intelligence™ · razzellv@nexumsuum.com</span>
  <span>Confidential — Prepared for ${r.facilityName} · ${reportDate}</span>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function saveLocally(req: ServiceRequest) {
    const updated = [req, ...requests];
    setRequests(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }

  async function handleSubmit() {
    if (!form.facilityName || !form.contactName || !form.contactEmail) {
      toast.error('Please fill in facility name, contact name, and email.');
      return;
    }
    setSubmitting(true);
    const req: ServiceRequest = {
      id: `CR-${Date.now().toString(36).toUpperCase()}`,
      serviceId: activeService!,
      ...form,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };

    // Best-effort API post
    try {
      await fetch(`${API_BASE}/consulting-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(req),
      });
    } catch {
      // Swallow — record saved locally regardless
    }

    saveLocally(req);
    toast.success("Request submitted! We'll reach out within 1 business day.");
    setActiveService(null);
    setForm({ ...EMPTY_FORM });
    setSubmitting(false);
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Consulting Services</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            On-demand EH&S compliance audits delivered by Nexum specialists. Book a service and receive
            your report within the stated delivery window — or it's free.
          </p>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          {[
            { icon: Award, text: 'EPCRA & NPDES Specialists' },
            { icon: Shield, text: 'No PE license required for audit/consult scope' },
            { icon: Clock, text: 'Guaranteed delivery windows' },
            { icon: FileText, text: 'Print-ready reports, filing-ready exports' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {SERVICES.map(svc => (
            <ServiceCard key={svc.id} svc={svc} onRequest={setActiveService} />
          ))}
          <ServiceCard svc={BUNDLE} onRequest={setActiveService} />
        </div>

        {/* Past requests */}
        {requests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Service Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/40">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 font-medium">Facility</th>
                      <th className="pb-2 font-medium">Submitted</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {requests.map(r => {
                      const svc = [...SERVICES, BUNDLE].find(s => s.id === r.serviceId);
                      const meta = STATUS_META[r.status];
                      return (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="py-2 font-mono text-xs text-muted-foreground">{r.id}</td>
                          <td className="py-2">{svc?.title ?? r.serviceId}</td>
                          <td className="py-2">{r.facilityName}</td>
                          <td className="py-2 text-muted-foreground">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', meta.color)}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => printReport(r, svc)}
                            >
                              <Printer className="w-3 h-3" />Report
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Intake Modal ── */}
      {activeService && activeSvcDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {(() => { const Icon = activeSvcDef.icon; return <Icon className={cn('w-5 h-5', activeSvcDef.iconColor)} />; })()}
                <div>
                  <h2 className="font-semibold text-base">{activeSvcDef.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeSvcDef.price} {activeSvcDef.priceNote} · {activeSvcDef.deliveryTime} delivery
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveService(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <p className="text-sm text-muted-foreground">
                Fill in the details below and a Nexum specialist will reach out within 1 business day to confirm your audit window.
              </p>

              {/* Facility */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Facility Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Facility Name *</Label>
                    <Input
                      placeholder="Groton Water Treatment Facility"
                      value={form.facilityName}
                      onChange={e => setForm(f => ({ ...f, facilityName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Facility Address *</Label>
                    <Input
                      placeholder="123 Main St, Groton, CT 06340"
                      value={form.facilityAddress}
                      onChange={e => setForm(f => ({ ...f, facilityAddress: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SIC / NAICS Code</Label>
                    <Input
                      placeholder="e.g. 4941 — Water Supply (optional)"
                      value={form.sicNaics}
                      onChange={e => setForm(f => ({ ...f, sicNaics: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{activeSvcDef.permitLabel}</Label>
                    <Input
                      placeholder={activeSvcDef.permitPlaceholder}
                      value={form.permitNumber}
                      onChange={e => setForm(f => ({ ...f, permitNumber: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Primary Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name *</Label>
                    <Input
                      placeholder="Jane Smith"
                      value={form.contactName}
                      onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</Label>
                    <Input
                      type="email"
                      placeholder="jane@city.gov"
                      value={form.contactEmail}
                      onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(860) 555-0100"
                      value={form.contactPhone}
                      onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Scheduling
                </h3>
                <div className="space-y-1 max-w-xs">
                  <Label className="text-xs">Preferred Audit Window</Label>
                  <Input
                    type="month"
                    value={form.preferredWindow}
                    onChange={e => setForm(f => ({ ...f, preferredWindow: e.target.value }))}
                  />
                </div>
              </div>

              {/* Known issues */}
              <div className="space-y-1">
                <Label className="text-xs">Known Issues or Areas of Concern</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. We had a stormwater discharge exceedance last fall and haven't updated our SWPPP since 2022..."
                  value={form.knownIssues}
                  onChange={e => setForm(f => ({ ...f, knownIssues: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                * Required fields. We'll reply within 1 business day to confirm.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveService(null)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
