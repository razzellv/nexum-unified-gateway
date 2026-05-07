import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import {
  LayoutDashboard, Users, ClipboardList, FileOutput, BookOpen,
  TrendingUp, Wrench, Zap, Search, StickyNote, ExternalLink,
  ChevronRight, Activity, AlertCircle, CheckCircle2, Clock,
  PhoneCall, Plus, Trash2, RefreshCw, MailCheck, Trophy,
  XCircle, CalendarClock, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE  = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

function getToken() {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceNote {
  id: string;
  text: string;
  createdAt: string;
  pinned: boolean;
}

type LeadStatus = 'pending' | 'contacted' | 'qualified' | 'won' | 'lost' | 'canceled';

interface Lead {
  leadId:       string;
  source:       string;
  status:       LeadStatus;
  name:         string;
  email:        string;
  phone:        string;
  company:      string;
  role:         string;
  meetingType:  string;
  scheduledAt:  string | null;
  notes:        string;
  callbackDate: string | null;
  followUpDate: string | null;
  convertedAt:  string | null;
  wonValue:     number | null;
  utmSource:    string;
  createdAt:    string;
  updatedAt:    string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERNAL_TOOLS = [
  { label: 'FIAS Assessment',    path: '/fias',              icon: Activity,      desc: 'Run facility assessments & score clients',      color: 'text-blue-400' },
  { label: 'VVFI Retainers',     path: '/vvfi',              icon: TrendingUp,    desc: 'Manage ongoing retainer engagements',           color: 'text-green-400' },
  { label: 'Client Accounts',    path: '/client-accounts',   icon: Users,         desc: 'CRM — accounts, notes, churn flags',            color: 'text-purple-400' },
  { label: 'Audit Module',       path: '/audit-module',      icon: ClipboardList, desc: 'Run facility audits with pass/fail tracking',   color: 'text-orange-400' },
  { label: 'Doc Generator',      path: '/doc-generator',     icon: FileOutput,    desc: 'Build client-facing reports & proposals',       color: 'text-yellow-400' },
  { label: 'Energy Baseline',    path: '/energy-baseline',   icon: Zap,           desc: 'Baseline energy data & CTS integration',        color: 'text-cyan-400' },
  { label: 'Contractor Installs',path: '/contractor-installs',icon: Wrench,       desc: 'Track installs, callbacks & job performance',   color: 'text-red-400' },
  { label: 'CTS-3 Model',        path: '/cts3-model',        icon: LayoutDashboard,desc: 'Correlation tracking spreadsheet model',       color: 'text-indigo-400' },
  { label: 'Rapid Review',       path: '/rapid-review',      icon: Search,        desc: 'FI Rapid Review — bill upload & AI analysis',   color: 'text-pink-400' },
  { label: 'Internal Guide',     path: '/internal-guide',    icon: BookOpen,      desc: 'SOPs, scoring guides & workflow reference',     color: 'text-teal-400' },
];

const STAT_KEYS = [
  { key: 'nexum_client_accounts', label: 'Client Accounts', icon: Users },
  { key: 'nexum_vvfi_clients',    label: 'VVFI Retainers',  icon: TrendingUp },
  { key: 'nexum_audits',          label: 'Audits',          icon: ClipboardList },
  { key: 'nexum_generated_docs',  label: 'Documents',       icon: FileOutput },
];

const STATUS_META: Record<LeadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',  icon: <Clock className="h-3 w-3" /> },
  contacted: { label: 'Contacted', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',        icon: <MailCheck className="h-3 w-3" /> },
  qualified: { label: 'Qualified', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',  icon: <CheckCircle2 className="h-3 w-3" /> },
  won:       { label: 'Won',       color: 'bg-green-500/15 text-green-300 border-green-500/30',     icon: <Trophy className="h-3 w-3" /> },
  lost:      { label: 'Lost',      color: 'bg-red-500/15 text-red-300 border-red-500/30',           icon: <XCircle className="h-3 w-3" /> },
  canceled:  { label: 'Canceled',  color: 'bg-muted/40 text-muted-foreground border-border/40',     icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useStorageCount(key: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setCount((JSON.parse(raw) as unknown[]).length);
    } catch { /* noop */ }
  }, []);
  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatsRow() {
  const counts = STAT_KEYS.map(s => ({ ...s, count: useStorageCount(s.key) }));
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {counts.map(({ key, label, icon: Icon, count }) => (
        <Card key={key}>
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Lead Pipeline Panel ───────────────────────────────────────────────────────

function LeadPipeline() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [newLead, setNewLead]       = useState({
    name: '', email: '', phone: '', company: '', role: '', meetingType: '', notes: '', source: 'manual',
  });

  const LEADS_KEY = 'nexum_leads_cache';

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched: Lead[] = data.leads || [];
        setLeads(fetched);
        localStorage.setItem(LEADS_KEY, JSON.stringify(fetched));
      } else {
        // Fallback to cache
        const cached = localStorage.getItem(LEADS_KEY);
        if (cached) setLeads(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem(LEADS_KEY);
      if (cached) setLeads(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    setSaving(leadId);
    const patch: Record<string, unknown> = { status };
    if (status === 'won') patch.convertedAt = new Date().toISOString();

    // Optimistic update
    setLeads(prev => prev.map(l => l.leadId === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l));

    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(patch),
      });
    } catch { /* optimistic already applied */ }
    setSaving(null);
  };

  const updateField = async (leadId: string, field: string, value: string | null) => {
    setSaving(leadId);
    setLeads(prev => prev.map(l => l.leadId === leadId ? { ...l, [field]: value } : l));
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ [field]: value }),
      });
    } catch { /* noop */ }
    setSaving(null);
  };

  const deleteLead = async (leadId: string) => {
    setLeads(prev => prev.filter(l => l.leadId !== leadId));
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* noop */ }
  };

  const addLead = async () => {
    if (!newLead.name || !newLead.email) {
      toast.error('Name and email are required.');
      return;
    }
    setSaving('new');
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ ...newLead, notify: false }),
      });
      if (res.ok) {
        toast.success(`Lead added — ${newLead.name}`);
        setNewLead({ name: '', email: '', phone: '', company: '', role: '', meetingType: '', notes: '', source: 'manual' });
        setShowAdd(false);
        fetchLeads();
      } else {
        toast.error('Failed to add lead.');
      }
    } catch {
      toast.error('Network error — lead not saved.');
    }
    setSaving(null);
  };

  const visible = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    return true;
  });

  const stats = {
    total:     leads.length,
    pending:   leads.filter(l => l.status === 'pending').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    won:       leads.filter(l => l.status === 'won').length,
    callbacks: leads.filter(l => l.callbackDate && l.status !== 'won' && l.status !== 'lost').length,
  };

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-foreground',   icon: <Users className="h-4 w-4" /> },
          { label: 'Pending',   value: stats.pending,   color: 'text-yellow-400',   icon: <Clock className="h-4 w-4" /> },
          { label: 'Contacted', value: stats.contacted, color: 'text-blue-400',     icon: <MailCheck className="h-4 w-4" /> },
          { label: 'Won',       value: stats.won,       color: 'text-green-400',    icon: <Trophy className="h-4 w-4" /> },
          { label: 'Callbacks', value: stats.callbacks, color: 'text-orange-400',   icon: <PhoneCall className="h-4 w-4" /> },
        ].map(s => (
          <Card key={s.label} className="bg-card/60 border-border/40">
            <CardContent className="p-3 flex items-center gap-2">
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" onClick={() => setShowAdd(v => !v)} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Lead
        </Button>
        <Button size="sm" variant="ghost" onClick={fetchLeads} disabled={loading} className="text-muted-foreground">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All sources</SelectItem>
              <SelectItem value="calendly" className="text-xs">Calendly</SelectItem>
              <SelectItem value="manual" className="text-xs">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add lead form */}
      {showAdd && (
        <Card className="bg-card/60 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />New Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <Input value={newLead.name} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                <Input value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="Phone" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company / Facility</label>
                <Input value={newLead.company} onChange={e => setNewLead(p => ({ ...p, company: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="Organization" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Role / Title</label>
                <Input value={newLead.role} onChange={e => setNewLead(p => ({ ...p, role: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="Title" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meeting Type</label>
                <Input value={newLead.meetingType} onChange={e => setNewLead(p => ({ ...p, meetingType: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/40" placeholder="Discovery Call, Demo…" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} rows={2} className="text-xs bg-muted/30 border-border/40 resize-none" placeholder="Any context about this lead…" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addLead} disabled={saving === 'new'} className="bg-primary text-primary-foreground">
                {saving === 'new' ? 'Saving…' : 'Save Lead'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendly webhook notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Calendly Webhook:</span>{' '}
          <span className="font-mono text-blue-200/80">POST /leads/webhook/calendly</span>
          {' '}— paste into Calendly → Integrations → Webhooks to auto-create leads from bookings.
        </div>
      </div>

      {/* Leads list */}
      {loading && leads.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading leads…</p>
      ) : visible.length === 0 ? (
        <Card className="bg-card/40 border-border/30">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {leads.length === 0 ? 'No leads yet. Add one manually or connect Calendly.' : 'No leads match the current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map(lead => {
            const expanded = expandedId === lead.leadId;
            return (
              <Card key={lead.leadId} className={cn('bg-card/60 border-border/40 transition-colors', saving === lead.leadId && 'opacity-70')}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-foreground">{lead.name}</span>
                        <StatusBadge status={lead.status} />
                        {lead.source === 'calendly' && (
                          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">Calendly</span>
                        )}
                        {lead.callbackDate && (
                          <span className="text-xs text-orange-400 flex items-center gap-1">
                            <PhoneCall className="h-3 w-3" />{lead.callbackDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{lead.email}</span>
                        {lead.company && <span>· {lead.company}</span>}
                        {lead.meetingType && <span>· {lead.meetingType}</span>}
                        {lead.scheduledAt && <span>· {new Date(lead.scheduledAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpandedId(expanded ? null : lead.leadId)}>
                        {expanded ? 'Less' : 'More'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded row */}
                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                      {/* Quick status buttons */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Change Status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['pending', 'contacted', 'qualified', 'won', 'lost'] as LeadStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(lead.leadId, s)}
                              className={cn(
                                'px-2 py-1 rounded text-xs border transition-colors',
                                lead.status === s
                                  ? STATUS_META[s].color
                                  : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                              )}
                            >
                              {STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes + callback */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Callback Date</p>
                          <Input
                            type="date"
                            defaultValue={lead.callbackDate?.slice(0, 10) || ''}
                            onBlur={e => updateField(lead.leadId, 'callbackDate', e.target.value || null)}
                            className="h-7 text-xs bg-muted/30 border-border/40"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Follow-up Date</p>
                          <Input
                            type="date"
                            defaultValue={lead.followUpDate?.slice(0, 10) || ''}
                            onBlur={e => updateField(lead.leadId, 'followUpDate', e.target.value || null)}
                            className="h-7 text-xs bg-muted/30 border-border/40"
                          />
                        </div>
                      </div>

                      {lead.notes && (
                        <div className="text-xs bg-muted/20 rounded p-2 text-foreground/80 leading-relaxed">
                          {lead.notes}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.phone && <span>📞 {lead.phone}</span>}
                        {lead.role  && <span>· {lead.role}</span>}
                        {lead.utmSource && <span>· src: {lead.utmSource}</span>}
                        <button
                          onClick={() => { if (confirm(`Delete lead for ${lead.name}?`)) deleteLead(lead.leadId); }}
                          className="ml-auto text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />Delete
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NexumWorkspace() {
  const [notes, setNotes]               = useState<WorkspaceNote[]>([]);
  const [newNote, setNewNote]           = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientResult, setClientResult] = useState<string | null>(null);

  useEffect(() => {
    syncRead<WorkspaceNote[]>('nexum_workspace_notes', '/workspace/notes', facilityId)
      .then(d => { if (d) setNotes(d); });
  }, []);

  const saveNotes = (next: WorkspaceNote[]) => {
    setNotes(next);
    syncWrite('nexum_workspace_notes', next, '/workspace/notes', facilityId);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: WorkspaceNote = {
      id: `note-${Date.now()}`,
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    saveNotes([note, ...notes]);
    setNewNote('');
    toast.success('Note saved.');
  };

  const deleteNote = (id: string) => saveNotes(notes.filter(n => n.id !== id));
  const togglePin  = (id: string) => saveNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));

  const lookupClient = () => {
    if (!clientSearch.trim()) return;
    const raw = localStorage.getItem('nexum_client_accounts');
    if (!raw) { setClientResult('No client accounts found.'); return; }
    try {
      const accounts: { id: string; name: string; facilityId: string; tier: string; status: string }[] = JSON.parse(raw);
      const match = accounts.find(a =>
        a.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        a.facilityId.toLowerCase().includes(clientSearch.toLowerCase())
      );
      setClientResult(match
        ? `${match.name} · ${match.facilityId} · ${match.tier} · ${match.status}`
        : 'No matching client found.');
    } catch { setClientResult('Error reading client data.'); }
  };

  const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Nexum Workspace</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Admin Only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Internal operations hub — all Nexum tools in one place.</p>
        </div>

        <StatsRow />

        <Tabs defaultValue="tools">
          <TabsList className="bg-muted/50 border border-border/40">
            <TabsTrigger value="tools"    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Internal Tools</TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Lead Pipeline</TabsTrigger>
            <TabsTrigger value="notes"    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Notes & Links</TabsTrigger>
          </TabsList>

          {/* ── Internal Tools tab ── */}
          <TabsContent value="tools" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {INTERNAL_TOOLS.map(tool => {
                const Icon = tool.icon;
                return (
                  <a key={tool.path} href={tool.path} className="block">
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                      <CardContent className="py-4 px-4 flex items-start gap-3">
                        <div className={cn('mt-0.5 shrink-0', tool.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{tool.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto mt-0.5" />
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Lead Pipeline tab ── */}
          <TabsContent value="pipeline" className="mt-4">
            <LeadPipeline />
          </TabsContent>

          {/* ── Notes & Links tab ── */}
          <TabsContent value="notes" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Lookup */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Quick Client Lookup</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && lookupClient()}
                      placeholder="Name or facilityId…"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={lookupClient}><Search className="w-4 h-4" /></Button>
                  </div>
                  {clientResult && (
                    <div className="text-xs bg-muted/40 rounded p-2 font-mono">{clientResult}</div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">FI Platform links</p>
                    <a href="https://portal.nexumsuum-facilityintelligence.com" target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> Customer Portal
                    </a>
                    <a href="https://portal.nexumsuum-facilityintelligence.com?adminView=1" target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> Admin View
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Workspace Notes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Quick note…"
                      rows={2}
                      className="flex-1 text-sm resize-none"
                    />
                    <Button size="sm" onClick={addNote} className="self-end">
                      <StickyNote className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sorted.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
                    )}
                    {sorted.map(n => (
                      <div key={n.id} className={cn('flex items-start gap-2 text-xs rounded p-2 border', n.pinned ? 'border-primary/40 bg-primary/5' : 'border-border/50')}>
                        <p className="flex-1 text-foreground whitespace-pre-wrap">{n.text}</p>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => togglePin(n.id)} title="Pin" className={cn('text-muted-foreground hover:text-primary', n.pinned && 'text-primary')}>📌</button>
                          <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-sm">System Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>FI Platform — <span className="text-green-500 font-medium">Online</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>API Gateway — <span className="text-green-500 font-medium">Healthy</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span>SES Email — <span className="text-yellow-500 font-medium">Verify Identities</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
