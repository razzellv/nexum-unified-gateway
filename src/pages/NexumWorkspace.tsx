import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp, Users, DollarSign, Plus, Trash2, Edit2,
  CheckCircle, Clock, XCircle, Lock, BarChart3, RefreshCw,
  Building2, Mail, Phone, Calendar, ChevronDown, ChevronUp,
  Rocket, AlertTriangle, Check, FileText, Tag, Percent,
  ExternalLink, Copy, Eye, EyeOff, Settings, Loader2,
  RotateCcw, Activity,
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL;

// ── CRM Types ─────────────────────────────────────────────────────────────────
type Pipeline = 'lead' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
type OrgType  = 'facility' | 'retail' | 'government' | 'other';

interface CRMClient {
  id: string; companyName: string; contactName: string; email: string; phone: string;
  orgType: OrgType; pipeline: Pipeline; mrr: number; notes: string;
  createdAt: string; lastContact: string; tier: string;
}

const PIPELINE_META: Record<Pipeline, { label: string; color: string; bg: string }> = {
  lead:        { label: 'Lead',        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  proposal:    { label: 'Proposal',    color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  negotiation: { label: 'Negotiation', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  closed_won:  { label: 'Closed Won',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  closed_lost: { label: 'Closed Lost', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
};

// ── Pilot Types ───────────────────────────────────────────────────────────────
type PilotStatus = 'pending' | 'in_progress' | 'approved' | 'declined' | 'discarded' | 'active';

interface PilotApplication {
  id: string; name: string; company: string; email: string; role: string;
  facilities: string; useCase: string; tier?: string; supportAddon: string | null;
  status: PilotStatus; submittedAt: string; approvedAt?: string;
  approvalCode?: string; declineReason?: string; notes?: string;
}

const PILOT_STATUS_META: Record<PilotStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  in_progress: { label: 'In Progress',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  approved:    { label: 'Approved',      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  declined:    { label: 'Declined',      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  discarded:   { label: 'Discarded',     color: 'text-muted-foreground', bg: 'bg-muted/20 border-border/20' },
  active:      { label: 'Active',        color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
};

// ── Promo Types ───────────────────────────────────────────────────────────────
type DiscountType = 'percentage' | 'fixed';
type PromoStatus  = 'active' | 'inactive' | 'expired';

interface PromoRecord {
  id: string;
  promoId: string;          // internal / Stripe coupon ID
  stripePromoId: string;    // Stripe promotion code ID
  name: string;             // internal name
  displayTitle: string;     // shown on pricing page button
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxRedemptions: number;
  currentRedemptions: number;
  status: PromoStatus;
  startDate: string;
  endDate: string;
  applicableTiers: string[];
  createdAt: string;
}

const BLANK_PROMO: Omit<PromoRecord, 'id' | 'createdAt' | 'currentRedemptions'> = {
  promoId: '', stripePromoId: '', name: '', displayTitle: '', description: '',
  discountType: 'percentage', discountValue: 100, maxRedemptions: 10,
  status: 'active', startDate: '', endDate: '',
  applicableTiers: ['business'],
};

// ── Email Settings Types ──────────────────────────────────────────────────────
const SENDER_EMAILS = [
  { value: 'noreply@nexumsuum.com',                       label: 'noreply@nexumsuum.com — System/automated' },
  { value: 'info@nexumsuum-facilityintelligence.com',     label: 'info@nexumsuum-facilityintelligence.com — Platform info' },
  { value: 'razzellv@nexumsuum.com',                      label: 'razzellv@nexumsuum.com — Personal/direct' },
];

type EmailType = 'pilot_confirmation' | 'pilot_approval' | 'pilot_decline' | 'invoice' | 'general_inquiry';

interface EmailSettings {
  pilot_confirmation: string;
  pilot_approval:     string;
  pilot_decline:      string;
  invoice:            string;
  general_inquiry:    string;
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  pilot_confirmation: 'noreply@nexumsuum.com',
  pilot_approval:     'info@nexumsuum-facilityintelligence.com',
  pilot_decline:      'noreply@nexumsuum.com',
  invoice:            'info@nexumsuum-facilityintelligence.com',
  general_inquiry:    'razzellv@nexumsuum.com',
};

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  pilot_confirmation: 'Pilot Application Confirmation',
  pilot_approval:     'Pilot Approval (with code)',
  pilot_decline:      'Pilot Decline',
  invoice:            'Invoice Sent',
  general_inquiry:    'General Inquiry Response',
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const CRM_KEY    = 'nexum_workspace_clients';
const PILOT_KEY  = 'nexum_pilot_applications';
const PROMO_KEY  = 'nexum_promos';
const ACTIVE_KEY = 'nexum_active_promo';
const EMAIL_KEY  = 'nexum_email_settings';

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

// ── CRM defaults ──────────────────────────────────────────────────────────────
const EMPTY_FORM: Omit<CRMClient, 'id' | 'createdAt'> = {
  companyName: '', contactName: '', email: '', phone: '',
  orgType: 'facility', pipeline: 'lead', mrr: 0,
  notes: '', lastContact: '', tier: 'basic',
};

type WorkspaceTab = 'crm' | 'pilot' | 'promos' | 'email';

// ═════════════════════════════════════════════════════════════════════════════
export default function NexumWorkspace() {
  const { userRole } = useAuth();
  const { toast }    = useToast();
  const isAdmin = userRole === 'admin';

  const [tab, setTab] = useState<WorkspaceTab>('crm');

  // ── CRM state ─────────────────────────────────────────────────────────────
  const [clients, setClients]     = useState<CRMClient[]>(() => load(CRM_KEY, []));
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<CRMClient, 'id' | 'createdAt'>>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPipeline, setFilter] = useState<Pipeline | 'all'>('all');
  const [search, setSearch] = useState('');

  // ── Pilot state ───────────────────────────────────────────────────────────
  const [pilotApps, setPilotApps]         = useState<PilotApplication[]>(() => load(PILOT_KEY, []));
  const [pilotSubTab, setPilotSubTab]     = useState<'pending' | 'in_progress' | 'approved' | 'declined'>('pending');
  const [expandedPilot, setExpandedPilot] = useState<string | null>(null);
  const [pilotNotes, setPilotNotes]       = useState<Record<string, string>>({});
  const [pilotLoading, setPilotLoading]   = useState<string | null>(null);
  const [fetchingPilots, setFetchingPilots] = useState(false);

  // Pilot modals
  const [approveTarget, setApproveTarget]   = useState<PilotApplication | null>(null);
  const [declineTarget, setDeclineTarget]   = useState<PilotApplication | null>(null);
  const [discardTarget, setDiscardTarget]   = useState<PilotApplication | null>(null);
  const [viewCodeTarget, setViewCodeTarget] = useState<PilotApplication | null>(null);
  const [declineReason, setDeclineReason]   = useState('');
  const [approveNote, setApproveNote]       = useState('');

  // ── Promo state ───────────────────────────────────────────────────────────
  const [promos, setPromos]               = useState<PromoRecord[]>(() => load(PROMO_KEY, []));
  const [activePromoId, setActivePromoId] = useState<string | null>(() => {
    const a = load<PromoRecord | null>(ACTIVE_KEY, null);
    return a?.id ?? null;
  });
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm]         = useState<Omit<PromoRecord, 'id' | 'createdAt' | 'currentRedemptions'>>(BLANK_PROMO);
  const [promoTierInput, setPromoTierInput] = useState('business');

  // ── Email settings state ──────────────────────────────────────────────────
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(() => load(EMAIL_KEY, DEFAULT_EMAIL_SETTINGS));
  const [savingEmail, setSavingEmail]     = useState(false);

  // ── Fetch pilot applications ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin || tab !== 'pilot') return;
    const fetchPilots = async () => {
      setFetchingPilots(true);
      try {
        const token = localStorage.getItem('nexum_access_token');
        const res = await fetch(`${API}/pilot-applications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const apps: PilotApplication[] = data.applications || data || [];
          if (apps.length > 0) { setPilotApps(apps); save(PILOT_KEY, apps); }
        }
      } catch { /* localStorage fallback already loaded */ }
      finally { setFetchingPilots(false); }
    };
    fetchPilots();
  }, [isAdmin, tab]);

  // ── Pilot actions ─────────────────────────────────────────────────────────
  const doPilotAction = async (
    app: PilotApplication,
    action: 'approve' | 'in-progress' | 'decline' | 'discard' | 'restore',
    extra?: Record<string, string>,
  ) => {
    setPilotLoading(app.id);
    const token = localStorage.getItem('nexum_access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/pilot-applications/${app.id}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          notes: pilotNotes[app.id] || app.notes || '',
          promoId: 'promo_1TM6yrDfw4bOR2dfq1igLbG1',
          email: app.email,
          contactName: app.contactName,
          companyName: app.companyName,
          ...extra,
        }),
      });
      const data = res.ok ? await res.json() : {};

      const statusMap: Record<string, PilotStatus> = {
        'approve':     'approved',
        'in-progress': 'in_progress',
        'decline':     'declined',
        'discard':     'discarded',
        'restore':     'pending',
      };
      const newStatus = statusMap[action];

      setPilotApps(prev => {
        const updated = prev.map(a => a.id === app.id ? {
          ...a,
          status:        newStatus,
          approvedAt:    action === 'approve' ? new Date().toISOString() : a.approvedAt,
          approvalCode:  data.approvalCode ?? a.approvalCode,
          declineReason: action === 'decline' ? (extra?.reason || '') : a.declineReason,
          notes:         pilotNotes[app.id] ?? a.notes,
        } : a);
        save(PILOT_KEY, updated);
        return updated;
      });

      const messages: Record<string, string> = {
        'approve':     `Approved — code sent to ${app.email}`,
        'in-progress': 'Marked as In Progress',
        'decline':     'Application declined',
        'discard':     'Application removed',
        'restore':     'Restored to Pending',
      };
      toast({ title: messages[action] });
    } catch {
      // Optimistic update if API is unreachable
      const statusMap: Record<string, PilotStatus> = {
        'approve': 'approved', 'in-progress': 'in_progress',
        'decline': 'declined', 'discard': 'discarded', 'restore': 'pending',
      };
      setPilotApps(prev => {
        const updated = prev.map(a => a.id === app.id
          ? { ...a, status: statusMap[action] as PilotStatus, notes: pilotNotes[app.id] ?? a.notes }
          : a);
        save(PILOT_KEY, updated);
        return updated;
      });
      toast({ title: 'Saved locally — sync when connected', variant: 'destructive' });
    } finally { setPilotLoading(null); }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    await doPilotAction(approveTarget, 'approve', { approveNote });
    setApproveTarget(null); setApproveNote('');
  };

  const confirmDecline = async () => {
    if (!declineTarget || !declineReason.trim()) return;
    await doPilotAction(declineTarget, 'decline', { reason: declineReason });
    setDeclineTarget(null); setDeclineReason('');
  };

  const confirmDiscard = async () => {
    if (!discardTarget) return;
    await doPilotAction(discardTarget, 'discard');
    setDiscardTarget(null);
  };

  // ── Promo helpers ─────────────────────────────────────────────────────────
  const savePromo = () => {
    if (!promoForm.name || !promoForm.stripePromoId) {
      toast({ title: 'Name and Stripe Promo ID are required', variant: 'destructive' }); return;
    }
    const rec: PromoRecord = {
      ...promoForm,
      id: `promo-${Date.now()}`,
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
      applicableTiers: promoTierInput.split(',').map(t => t.trim()).filter(Boolean),
    };
    const updated = [rec, ...promos];
    setPromos(updated); save(PROMO_KEY, updated);
    setShowPromoForm(false); setPromoForm(BLANK_PROMO);
    toast({ title: 'Promo saved' });
  };

  const setActivePromo = (promo: PromoRecord | null) => {
    setActivePromoId(promo?.id ?? null);
    save(ACTIVE_KEY, promo);
    toast({ title: promo ? `"${promo.name}" set as active promo` : 'Active promo cleared' });
  };

  const deletePromo = (id: string) => {
    const updated = promos.filter(p => p.id !== id);
    setPromos(updated); save(PROMO_KEY, updated);
    if (activePromoId === id) setActivePromo(null);
  };

  // ── Email settings save ───────────────────────────────────────────────────
  const saveEmailSettings = async () => {
    setSavingEmail(true);
    save(EMAIL_KEY, emailSettings);
    try {
      const token = localStorage.getItem('nexum_access_token');
      await fetch(`${API}/email-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ settings: emailSettings, pk: 'EMAIL_SETTINGS', sk: 'GLOBAL' }),
      });
    } catch { /* saved to localStorage above — best effort API */ }
    finally { setSavingEmail(false); }
    toast({ title: 'Email settings saved' });
  };

  // ── CRM helpers ───────────────────────────────────────────────────────────
  const activeClients = useMemo(() => clients.filter(c => c.pipeline === 'closed_won'), [clients]);
  const mrr      = useMemo(() => activeClients.reduce((s, c) => s + (c.mrr || 0), 0), [activeClients]);
  const arr      = mrr * 12;
  const pipeline = useMemo(() =>
    clients.filter(c => ['lead','proposal','negotiation'].includes(c.pipeline))
           .reduce((s, c) => s + (c.mrr || 0) * 12, 0), [clients]);

  const filtered = useMemo(() => clients
    .filter(c => filterPipeline === 'all' || c.pipeline === filterPipeline)
    .filter(c => !search || [c.companyName, c.contactName, c.email]
      .some(f => f.toLowerCase().includes(search.toLowerCase()))), [clients, filterPipeline, search]);

  const saveForm = () => {
    if (!form.companyName || !form.contactName) {
      toast({ title: 'Company name and contact required', variant: 'destructive' }); return;
    }
    if (editingId) {
      const updated = clients.map(c => c.id === editingId ? { ...c, ...form } : c);
      setClients(updated); save(CRM_KEY, updated); toast({ title: 'Client updated' });
    } else {
      const nc: CRMClient = { ...form, id: `crm-${Date.now()}`, createdAt: new Date().toISOString() };
      const updated = [nc, ...clients];
      setClients(updated); save(CRM_KEY, updated); toast({ title: 'Client added' });
    }
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false);
  };

  const deleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated); save(CRM_KEY, updated); toast({ title: 'Client removed' });
  };

  const startEdit = (c: CRMClient) => {
    setForm({ companyName: c.companyName, contactName: c.contactName, email: c.email,
      phone: c.phone, orgType: c.orgType, pipeline: c.pipeline, mrr: c.mrr,
      notes: c.notes, lastContact: c.lastContact, tier: c.tier });
    setEditingId(c.id); setShowForm(true);
  };

  // ── Pilot sub-tabs (visible statuses) ─────────────────────────────────────
  const pendingPilots    = pilotApps.filter(a => a.status === 'pending');
  const inProgressPilots = pilotApps.filter(a => a.status === 'in_progress');
  const approvedPilots   = pilotApps.filter(a => a.status === 'approved' || a.status === 'active');
  const declinedPilots   = pilotApps.filter(a => a.status === 'declined');

  const displayedPilots = pilotSubTab === 'pending' ? pendingPilots
    : pilotSubTab === 'in_progress' ? inProgressPilots
    : pilotSubTab === 'approved'   ? approvedPilots : declinedPilots;

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-24">
          <div className="text-center space-y-3">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">Nexum Workspace is admin-only.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nexum Workspace</h1>
              <p className="text-xs text-muted-foreground mt-0.5">CRM · Revenue · Pilot Program · Promos · Email Settings</p>
            </div>
          </div>
          {tab === 'crm' && (
            <Button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(v => !v); }}>
              <Plus className="w-4 h-4 mr-2" />{showForm ? 'Cancel' : 'Add Client'}
            </Button>
          )}
          {tab === 'promos' && (
            <Button onClick={() => setShowPromoForm(v => !v)}>
              <Plus className="w-4 h-4 mr-2" />{showPromoForm ? 'Cancel' : 'Add Promo'}
            </Button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg border border-border bg-card/50 flex-wrap">
          {([
            { id: 'crm'    as const, label: 'CRM',                icon: BarChart3 },
            { id: 'pilot'  as const, label: `Pilot${pendingPilots.length > 0 ? ` (${pendingPilots.length})` : ''}`, icon: Rocket },
            { id: 'promos' as const, label: 'Promotions',         icon: Tag },
            { id: 'email'  as const, label: 'Email Settings',     icon: Mail },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                tab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ═══════════════ PILOT TAB ═══════════════════════════════════════ */}
        {tab === 'pilot' && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Pending Review', value: pendingPilots.length,    color: 'text-yellow-400', icon: Clock },
                { label: 'In Progress',   value: inProgressPilots.length,  color: 'text-blue-400',   icon: Activity },
                { label: 'Approved',      value: approvedPilots.length,    color: 'text-green-400',  icon: CheckCircle },
                { label: 'Declined',      value: declinedPilots.length,    color: 'text-red-400',    icon: XCircle },
              ].map(({ label, value, color, icon: Icon }) => (
                <Card key={label} className="neon-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className={cn('text-3xl font-bold mt-0.5', color)}>{value}</p>
                    </div>
                    <Icon className={cn('w-6 h-6 opacity-40', color)} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sub-tabs + refresh */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {(['pending', 'in_progress', 'approved', 'declined'] as const).map(s => {
                  const meta = PILOT_STATUS_META[s];
                  const count = s === 'pending' ? pendingPilots.length
                    : s === 'in_progress' ? inProgressPilots.length
                    : s === 'approved' ? approvedPilots.length : declinedPilots.length;
                  return (
                    <button key={s} onClick={() => setPilotSubTab(s)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        pilotSubTab === s ? meta.bg + ' ' + meta.color : 'border-border/30 text-muted-foreground hover:text-foreground')}>
                      {meta.label} <span className="ml-1 opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTab('pilot')} disabled={fetchingPilots}>
                {fetchingPilots ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            {/* Applications table */}
            {displayedPilots.length === 0 ? (
              <Card className="neon-border">
                <CardContent className="p-12 text-center text-muted-foreground text-sm">
                  <Rocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No {pilotSubTab.replace('_', ' ')} applications.
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Name</span><span>Company</span><span>Email</span>
                  <span>Role</span><span>Submitted</span><span>Status</span><span>Actions</span>
                </div>
                <div className="divide-y divide-border/20">
                  {displayedPilots.map(app => {
                    const meta    = PILOT_STATUS_META[app.status];
                    const expanded = expandedPilot === app.id;
                    const busy    = pilotLoading === app.id;
                    return (
                      <div key={app.id} className={cn('bg-card/30 transition-colors hover:bg-muted/10', expanded && 'bg-muted/10')}>
                        {/* Row */}
                        <div
                          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 cursor-pointer"
                          onClick={() => setExpandedPilot(expanded ? null : app.id)}
                        >
                          <span className="font-medium text-sm truncate">{app.name}</span>
                          <span className="text-xs text-muted-foreground truncate flex items-center gap-1"><Building2 className="w-3 h-3 shrink-0" />{app.company}</span>
                          <span className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" />{app.email}</span>
                          <span className="text-xs text-muted-foreground capitalize">{app.role?.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">{new Date(app.submittedAt).toLocaleDateString()}</span>
                          <Badge className={cn('text-[10px] border w-fit', meta.bg, meta.color)}>{meta.label}</Badge>
                          {/* Action buttons — visible inline */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {(app.status === 'pending' || app.status === 'in_progress') && (
                              <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-500 text-white"
                                disabled={busy} onClick={() => setApproveTarget(app)}>
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {app.status === 'pending' && (
                              <Button size="sm" className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                                disabled={busy} onClick={() => doPilotAction(app, 'in-progress')}>
                                <Activity className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(app.status === 'pending' || app.status === 'in_progress') && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                disabled={busy} onClick={() => setDeclineTarget(app)}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {app.status === 'pending' && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                                disabled={busy} onClick={() => setDiscardTarget(app)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(app.status === 'approved' || app.status === 'active') && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                                onClick={() => setViewCodeTarget(app)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {app.status === 'declined' && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-muted-foreground"
                                disabled={busy} onClick={() => doPilotAction(app, 'restore')}>
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <button onClick={() => setExpandedPilot(expanded ? null : app.id)}
                              className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground transition-colors">
                              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="rounded-lg bg-muted/20 border border-border/30 p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">What they want to achieve</p>
                                <p className="text-xs leading-relaxed">{app.useCase || '—'}</p>
                              </div>
                              <div className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-1">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
                                {app.facilities && <p className="text-xs"><span className="text-muted-foreground">Facilities:</span> {app.facilities}</p>}
                                {app.tier      && <p className="text-xs"><span className="text-muted-foreground">Tier interest:</span> {app.tier}</p>}
                                {app.supportAddon && <p className="text-xs"><span className="text-muted-foreground">Support add-on:</span> {app.supportAddon}</p>}
                                {app.approvedAt && <p className="text-xs"><span className="text-muted-foreground">Approved:</span> {new Date(app.approvedAt).toLocaleString()}</p>}
                                {app.declineReason && <p className="text-xs text-red-400">Declined: {app.declineReason}</p>}
                              </div>
                            </div>
                            {app.approvalCode && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Approval code:</span>
                                <code className="font-mono bg-muted/30 px-2 py-0.5 rounded border border-border/40 text-green-400">{app.approvalCode}</code>
                                <button onClick={() => navigator.clipboard.writeText(app.approvalCode!)} className="p-1 hover:text-primary transition-colors">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Notes</label>
                              <Textarea
                                value={pilotNotes[app.id] ?? (app.notes || '')}
                                onChange={e => setPilotNotes(p => ({ ...p, [app.id]: e.target.value }))}
                                onBlur={() => {
                                  if (pilotNotes[app.id] !== undefined) {
                                    setPilotApps(prev => {
                                      const u = prev.map(a => a.id === app.id ? { ...a, notes: pilotNotes[app.id] } : a);
                                      save(PILOT_KEY, u); return u;
                                    });
                                  }
                                }}
                                placeholder="Internal notes about this applicant..."
                                rows={2} className="text-xs resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ PROMOTIONS TAB ══════════════════════════════════ */}
        {tab === 'promos' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Tag className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold">Promo / Coupon Management</p>
                <p className="text-xs text-muted-foreground">Manage Stripe promotion codes and pilot spots. One promo active at a time.</p>
              </div>
            </div>

            {/* Add promo form */}
            {showPromoForm && (
              <Card className="neon-border border-orange-500/20">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" /> New Promo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Internal Name *</Label>
                      <Input value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} placeholder="Q2 2026 Pilot" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stripe Promo Code ID * <a href="https://dashboard.stripe.com/promotion-codes" target="_blank" rel="noreferrer" className="text-primary ml-1 inline-flex items-center gap-0.5 text-[10px]">Create in Stripe <ExternalLink className="w-2.5 h-2.5" /></a></Label>
                      <Input value={promoForm.stripePromoId} onChange={e => setPromoForm(f => ({ ...f, stripePromoId: e.target.value }))} placeholder="promo_1TM6yr..." />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Display Title (shown on Pricing page button) *</Label>
                      <Input value={promoForm.displayTitle} onChange={e => setPromoForm(f => ({ ...f, displayTitle: e.target.value }))} placeholder="🚀 Apply for Pilot Access (10 spots)" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={promoForm.description} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-xs resize-none" placeholder="Full Business platform access, free for approved pilot partners..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount Type</Label>
                      <Select value={promoForm.discountType} onValueChange={v => setPromoForm(f => ({ ...f, discountType: v as DiscountType }))}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount Value {promoForm.discountType === 'percentage' ? '(%)' : '($)'}</Label>
                      <Input type="number" value={promoForm.discountValue} onChange={e => setPromoForm(f => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Redemptions (spots)</Label>
                      <Input type="number" value={promoForm.maxRedemptions} onChange={e => setPromoForm(f => ({ ...f, maxRedemptions: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Applicable Tiers (comma-separated)</Label>
                      <Input value={promoTierInput} onChange={e => setPromoTierInput(e.target.value)} placeholder="business, premium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={promoForm.startDate} onChange={e => setPromoForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" value={promoForm.endDate} onChange={e => setPromoForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setShowPromoForm(false); setPromoForm(BLANK_PROMO); }}>Cancel</Button>
                    <Button onClick={savePromo}><CheckCircle className="w-4 h-4 mr-2" />Save Promo</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {promos.length === 0 ? (
              <Card className="neon-border">
                <CardContent className="p-12 text-center text-muted-foreground text-sm">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No promos yet. Add your first promotion above.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {promos.map(p => {
                  const isActive  = activePromoId === p.id;
                  const spotsLeft = p.maxRedemptions - (p.currentRedemptions || 0);
                  const pct       = p.maxRedemptions > 0 ? ((p.currentRedemptions || 0) / p.maxRedemptions) * 100 : 0;
                  return (
                    <Card key={p.id} className={cn('neon-border', isActive && 'border-orange-500/40 bg-orange-500/5')}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{p.name}</p>
                              {isActive && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">Active</Badge>}
                              <Badge variant="outline" className={cn('text-[10px]',
                                p.status === 'active' ? 'text-green-400 border-green-400/30' :
                                p.status === 'expired' ? 'text-red-400 border-red-400/30' : 'text-muted-foreground')}>
                                {p.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {p.discountType === 'percentage' ? `${p.discountValue}% off` : `$${p.discountValue} off`}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground italic">{p.displayTitle}</p>
                            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="font-mono text-primary/80">{p.stripePromoId}</span>
                              <span>{spotsLeft} of {p.maxRedemptions} spots remaining</span>
                              {p.endDate && <span>Expires: {p.endDate}</span>}
                            </div>
                            {/* Redemption bar */}
                            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden max-w-48">
                              <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant={isActive ? 'outline' : 'default'}
                              className={isActive ? 'border-orange-500/30 text-orange-400 text-xs' : 'bg-orange-500 hover:bg-orange-400 text-white text-xs'}
                              onClick={() => setActivePromo(isActive ? null : p)}>
                              {isActive ? 'Clear Active' : 'Set as Active'}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-400 text-xs"
                              onClick={() => deletePromo(p.id)}>
                              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Hardcoded promo notice */}
            <Card className="neon-border border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-yellow-400">Hardcoded promo reference</p>
                  <p><code className="font-mono bg-muted/30 px-1 rounded">promo_1TM6yrDfw4bOR2dfq1igLbG1</code> is also referenced directly in Pricing.tsx and the pilot-application Lambda. Setting an active promo here updates the Pricing page pilot button — but the Lambda still uses the hardcoded ID until redeployed.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════ EMAIL SETTINGS TAB ══════════════════════════════ */}
        {tab === 'email' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Email Sender Configuration</p>
                <p className="text-xs text-muted-foreground">Configure which sender address is used for each email type. Stored in DynamoDB at PK: EMAIL_SETTINGS / SK: GLOBAL.</p>
              </div>
            </div>

            <Card className="neon-border">
              <CardContent className="p-6 space-y-5">
                {(Object.keys(EMAIL_TYPE_LABELS) as EmailType[]).map(type => (
                  <div key={type} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pb-4 border-b border-border/20 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{EMAIL_TYPE_LABELS[type]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {type === 'pilot_confirmation' && 'Sent immediately when someone submits a pilot application'}
                        {type === 'pilot_approval'     && 'Sent when you click Approve — includes the access code'}
                        {type === 'pilot_decline'      && 'Sent when you click Decline'}
                        {type === 'invoice'            && 'Sent when an invoice is issued'}
                        {type === 'general_inquiry'    && 'Replies to general contact form inquiries'}
                      </p>
                    </div>
                    <Select
                      value={emailSettings[type]}
                      onValueChange={v => setEmailSettings(s => ({ ...s, [type]: v }))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SENDER_EMAILS.map(e => (
                          <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={saveEmailSettings} disabled={savingEmail}>
                    {savingEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Check className="w-4 h-4 mr-2" />Save Settings</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="neon-border border-border/20 bg-muted/10">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Available sender addresses</p>
                {SENDER_EMAILS.map(e => (
                  <p key={e.value} className="font-mono">{e.value}</p>
                ))}
                <p className="pt-1 text-[11px]">These must be verified in AWS SES before they can send. Each address is already domain-verified under nexumsuum.com and nexumsuum-facilityintelligence.com.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════ CRM TAB ═════════════════════════════════════════ */}
        {tab === 'crm' && (<>
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Recurring Revenue', value: `$${mrr.toLocaleString()}`,       icon: DollarSign, color: 'text-green-400' },
              { label: 'Annual Recurring Revenue',  value: `$${arr.toLocaleString()}`,       icon: TrendingUp, color: 'text-cyan-400' },
              { label: 'Active Clients',            value: activeClients.length,             icon: Users,      color: 'text-primary' },
              { label: 'Pipeline Value (ARR)',      value: `$${pipeline.toLocaleString()}`,  icon: BarChart3,  color: 'text-yellow-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="neon-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
                    </div>
                    <Icon className={cn('w-5 h-5 mt-1 opacity-40', color)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add / Edit Form */}
          {showForm && (
            <Card className="neon-border border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{editingId ? 'Edit Client' : 'Add New Client'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Name *</Label>
                    <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g., Riverside Municipal Complex" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Primary Contact *</Label>
                    <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@facility.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Org Type</Label>
                    <Select value={form.orgType} onValueChange={v => setForm(f => ({ ...f, orgType: v as OrgType }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facility">Facility</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pipeline Stage</Label>
                    <Select value={form.pipeline} onValueChange={v => setForm(f => ({ ...f, pipeline: v as Pipeline }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PIPELINE_META) as Pipeline[]).map(p => (
                          <SelectItem key={p} value={p} className="text-xs">{PIPELINE_META[p].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">MRR ($)</Label>
                    <Input type="number" value={form.mrr || ''} onChange={e => setForm(f => ({ ...f, mrr: parseFloat(e.target.value) || 0 }))} placeholder="e.g., 349" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plan Tier</Label>
                    <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['basic','standard','business','premium','enterprise'].map(t => (
                          <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Contact Date</Label>
                    <Input type="date" value={form.lastContact} onChange={e => setForm(f => ({ ...f, lastContact: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Client context, follow-up actions..." className="text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
                  <Button onClick={saveForm}><CheckCircle className="w-4 h-4 mr-2" />{editingId ? 'Save Changes' : 'Add Client'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pipeline summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.entries(PIPELINE_META) as [Pipeline, typeof PIPELINE_META[Pipeline]][]).map(([key, meta]) => {
              const count = clients.filter(c => c.pipeline === key).length;
              return (
                <button key={key} onClick={() => setFilter(filterPipeline === key ? 'all' : key)}
                  className={cn('rounded-lg border p-2 text-center text-xs transition-all', meta.bg,
                    filterPipeline === key ? 'ring-2 ring-primary/50' : 'opacity-70 hover:opacity-100')}>
                  <p className={cn('font-semibold', meta.color)}>{meta.label}</p>
                  <p className="text-muted-foreground mt-0.5">{count} client{count !== 1 ? 's' : ''}</p>
                </button>
              );
            })}
          </div>

          {/* Client list */}
          <div className="space-y-3">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="max-w-sm" />
            {filtered.length === 0 ? (
              <Card className="neon-border">
                <CardContent className="p-12 text-center text-muted-foreground text-sm">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No clients yet. Add your first client above.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map(c => {
                  const meta = PIPELINE_META[c.pipeline];
                  const expanded = expandedId === c.id;
                  return (
                    <Card key={c.id} className={cn('neon-border transition-all', c.pipeline === 'closed_won' && 'border-green-500/20')}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{c.companyName}</p>
                              <Badge className={cn('text-[10px]', meta.bg, meta.color)}>{meta.label}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{c.tier}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{c.orgType}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.contactName}</span>
                              {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                              {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                              {c.mrr > 0 && <span className="flex items-center gap-1 text-green-400 font-semibold"><DollarSign className="w-3 h-3" />${c.mrr.toLocaleString()}/mo</span>}
                              {c.lastContact && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Last: {c.lastContact}</span>}
                            </div>
                            {expanded && c.notes && (
                              <p className="mt-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-border/30">{c.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setExpandedId(expanded ? null : c.id)} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>)}

      </div>

      {/* ── APPROVE MODAL ────────────────────────────────────────────────────── */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="neon-border max-w-md w-full border-green-500/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" />Approve Application</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Approve <strong>{approveTarget.name}</strong> from <strong>{approveTarget.company}</strong>?</p>
              <p className="text-xs text-muted-foreground">This will send them an access code via email at <span className="text-primary">{approveTarget.email}</span>.</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional — internal only)</Label>
                <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} rows={2} className="text-xs resize-none" placeholder="Any context to log..." />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setApproveTarget(null); setApproveNote(''); }}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-500 text-white" disabled={pilotLoading === approveTarget.id} onClick={confirmApprove}>
                  {pilotLoading === approveTarget.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Yes, Approve & Send Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DECLINE MODAL ────────────────────────────────────────────────────── */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="neon-border max-w-md w-full border-red-500/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="w-5 h-5 text-red-400" />Decline Application</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Decline <strong>{declineTarget.name}</strong>'s application?</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason * (sent to applicant)</Label>
                <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} className="text-xs resize-none"
                  placeholder="Application not selected for current cohort..." />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setDeclineTarget(null); setDeclineReason(''); }}>Cancel</Button>
                <Button variant="destructive" disabled={!declineReason.trim() || pilotLoading === declineTarget.id} onClick={confirmDecline}>
                  {pilotLoading === declineTarget.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Decline Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DISCARD MODAL ────────────────────────────────────────────────────── */}
      {discardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="neon-border max-w-sm w-full">
            <CardHeader><CardTitle className="text-base">Remove Application</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Remove <strong>{discardTarget.name}</strong>'s application from the list?</p>
              <p className="text-xs text-muted-foreground">This is a soft delete — the record is preserved in the database but hidden from this view.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDiscardTarget(null)}>Cancel</Button>
                <Button variant="destructive" disabled={pilotLoading === discardTarget.id} onClick={confirmDiscard}>
                  {pilotLoading === discardTarget.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── VIEW CODE MODAL ──────────────────────────────────────────────────── */}
      {viewCodeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="neon-border max-w-sm w-full border-green-500/20">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-5 h-5 text-green-400" />Approval Code</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{viewCodeTarget.name} — {viewCodeTarget.company}</p>
              <div className="flex items-center gap-2">
                <code className="font-mono bg-muted/30 px-3 py-2 rounded border border-border/40 text-green-400 text-lg tracking-widest flex-1 text-center">
                  {viewCodeTarget.approvalCode || '—'}
                </code>
                {viewCodeTarget.approvalCode && (
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(viewCodeTarget.approvalCode!); toast({ title: 'Copied!' }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Approved: {viewCodeTarget.approvedAt ? new Date(viewCodeTarget.approvedAt).toLocaleString() : '—'}</p>
              <Button className="w-full" variant="outline" onClick={() => setViewCodeTarget(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

    </MainLayout>
  );
}
