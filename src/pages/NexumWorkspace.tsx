import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import {
  LayoutDashboard, Users, ClipboardList, FileOutput, BookOpen,
  TrendingUp, Wrench, Zap, Search, StickyNote, ExternalLink,
  ChevronRight, Activity, AlertCircle, CheckCircle2, Clock,
  PhoneCall, Plus, Trash2, RefreshCw, MailCheck, Trophy,
  XCircle, CalendarClock, Filter, ShieldCheck, Copy, ChevronDown,
  ChevronUp, Crown, Globe, Gauge, Send, Mail, Calendar, Loader2, MessageSquare,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const API_BASE  = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const FC_BASE   = 'https://internal.nexumsuum-facilityintelligence.com';
const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

function getToken() {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceNote { id: string; text: string; createdAt: string; pinned: boolean; }

type LeadStatus = 'pending' | 'contacted' | 'qualified' | 'won' | 'lost' | 'canceled';
interface Lead {
  leadId: string; source: string; status: LeadStatus; name: string; email: string;
  phone: string; company: string; role: string; meetingType: string;
  scheduledAt: string | null; notes: string; callbackDate: string | null;
  followUpDate: string | null; convertedAt: string | null; wonValue: number | null;
  utmSource: string; createdAt: string; updatedAt: string;
}

type PilotStatus = 'pending' | 'in_progress' | 'approved' | 'active' | 'declined' | 'discarded';
interface PilotApp {
  appId: string; PK: string; name: string; email: string; company: string;
  role: string; facilities: string; useCase: string; status: PilotStatus;
  pilotCode?: string; pilotTier?: string; adminNotes?: string;
  createdAt: string; approvedAt?: string;
}

interface Booking {
  bookingId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientOrg: string;
  service: string;
  scheduledDate: string;
  timeSlot: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  stripeSessionId: string;
  createdAt: string;
}

interface ClientUser {
  username?: string; email: string; name?: string; tier?: string; role?: string;
  orgType?: string; facilityId?: string; orgId?: string; status?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERNAL_TOOLS = [
  { label: 'FIAS Assessment',        href: '/fias',                         icon: Activity,      desc: 'Run facility intelligence assessments & score clients',        color: 'text-blue-400',   external: false },
  { label: 'VVFI Retainers',         href: '/virtuous',                     icon: TrendingUp,    desc: 'Manage ongoing VVFI retainer engagements',                     color: 'text-green-400',  external: false },
  { label: 'Contractor Installs',    href: '/contractor-installs',          icon: Wrench,        desc: 'Track installs, callbacks & job performance',                  color: 'text-red-400',    external: false },
  { label: 'OIG Dashboard',          href: '/operational-intelligence',     icon: Gauge,         desc: 'Operational Intelligence & Governance scoring',                color: 'text-indigo-400', external: false },
  { label: 'Facility Intelligence',  href: '/facility-intelligence',        icon: Zap,           desc: 'AI-powered facility diagnostics & benchmarks',                 color: 'text-cyan-400',   external: false },
  { label: 'Policy Guide',           href: '/policy-guide',                 icon: BookOpen,      desc: 'SOPs, scoring guides & workflow reference',                    color: 'text-teal-400',   external: false },
  { label: 'Work Orders',            href: '/work-orders',                  icon: ClipboardList, desc: 'Client facility work order management',                        color: 'text-orange-400', external: false },
  { label: 'Violations',             href: '/violations',                   icon: AlertCircle,   desc: 'Violations tracking & compliance enforcement',                 color: 'text-rose-400',   external: false },
  { label: 'Audit Module',           href: `${FC_BASE}/audit-module`,       icon: ClipboardList, desc: 'Facility audits with pass/fail tracking — Facility Compass',   color: 'text-orange-400', external: true  },
  { label: 'Doc Generator',          href: `${FC_BASE}/doc-generator`,      icon: FileOutput,    desc: 'Build client-facing reports & proposals — Facility Compass',   color: 'text-yellow-400', external: true  },
  { label: 'Energy Baseline',        href: `${FC_BASE}/energy-baseline`,    icon: Zap,           desc: 'Baseline energy data & CTS integration — Facility Compass',    color: 'text-amber-400',  external: true  },
  { label: 'Rapid Review',           href: `${FC_BASE}/rapid-review`,       icon: Search,        desc: 'FI Rapid Review — bill upload & AI analysis — Facility Compass', color: 'text-pink-400', external: true  },
];

const TIER_META: Record<string, { label: string; color: string }> = {
  basic:      { label: 'Basic',      color: 'bg-muted/40 text-muted-foreground border-border' },
  standard:   { label: 'Standard',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  business:   { label: 'Business',   color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  premium:    { label: 'Premium',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  enterprise: { label: 'Enterprise', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  admin:      { label: 'Admin',      color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const STATUS_META: Record<LeadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', icon: <Clock className="h-3 w-3" /> },
  contacted: { label: 'Contacted', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',       icon: <MailCheck className="h-3 w-3" /> },
  qualified: { label: 'Qualified', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  won:       { label: 'Won',       color: 'bg-green-500/15 text-green-300 border-green-500/30',    icon: <Trophy className="h-3 w-3" /> },
  lost:      { label: 'Lost',      color: 'bg-red-500/15 text-red-300 border-red-500/30',          icon: <XCircle className="h-3 w-3" /> },
  canceled:  { label: 'Canceled',  color: 'bg-muted/40 text-muted-foreground border-border/40',    icon: <XCircle className="h-3 w-3" /> },
};

const PILOT_STATUS_META: Record<PilotStatus, { label: string; color: string }> = {
  pending:     { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Review',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  approved:    { label: 'Approved',       color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  active:      { label: 'Active',         color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  declined:    { label: 'Declined',       color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  discarded:   { label: 'Discarded',      color: 'bg-muted/40 text-muted-foreground border-border' },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

interface WSStats { leads: number; pilots: number; users: number; }

function useWorkspaceStats() {
  const [stats, setStats] = useState<WSStats>({ leads: 0, pilots: 0, users: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const hdrs = { Authorization: `Bearer ${getToken()}` };
    const next: WSStats = { leads: 0, pilots: 0, users: 0 };
    try {
      const [l, p, u] = await Promise.allSettled([
        fetch(`${API_BASE}/leads`, { headers: hdrs }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/pilot-applications`, { headers: hdrs }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/users`, { headers: hdrs }).then(r => r.ok ? r.json() : null),
      ]);
      if (l.status === 'fulfilled' && l.value) next.leads  = (l.value.leads         || []).length;
      if (p.status === 'fulfilled' && p.value) next.pilots = (p.value.applications  || []).length;
      if (u.status === 'fulfilled' && u.value) next.users  = (u.value.users         || []).length;
    } catch { /* silent */ }
    setStats(next);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { stats, loading, refresh };
}

// ── Small shared components ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ── Stats Row ─────────────────────────────────────────────────────────────────

function StatsRow({ stats, loading, onTabChange }: { stats: WSStats; loading: boolean; onTabChange: (t: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Registered Users', value: stats.users,  icon: Users,        color: 'text-blue-400',   tab: 'clients' },
        { label: 'Leads',            value: stats.leads,  icon: TrendingUp,   color: 'text-green-400',  tab: 'pipeline' },
        { label: 'Pilot Apps',       value: stats.pilots, icon: Crown,        color: 'text-purple-400', tab: 'pilots'  },
        { label: 'Facility Compass', value: '↗',          icon: Globe,        color: 'text-cyan-400',   href: FC_BASE  },
      ].map(({ label, value, icon: Icon, color, tab, href }) => (
        <Card key={label} className="bg-card/60 border-border/40 hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => href ? window.open(href, '_blank') : tab && onTabChange(tab)}>
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <Icon className={cn('w-5 h-5 shrink-0', color)} />
            <div>
              <p className={cn('text-2xl font-bold leading-none', loading && typeof value === 'number' ? 'text-muted-foreground' : 'text-foreground')}>
                {loading && typeof value === 'number' ? '…' : value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Client Accounts ───────────────────────────────────────────────────────────

function ClientAccounts() {
  const [users, setUsers]         = useState<ClientUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateTier = async (user: ClientUser, newTier: string) => {
    const key = user.username || user.email;
    setUpdatingTier(key);
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(key)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ tier: newTier }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => (u.username || u.email) === key ? { ...u, tier: newTier } : u));
        toast.success(`Tier updated → ${newTier}`);
      } else {
        toast.error('Tier update failed.');
      }
    } catch { toast.error('Network error.'); }
    setUpdatingTier(null);
  };

  const visible = users.filter(u => {
    if (tierFilter !== 'all' && (u.tier || 'basic').toLowerCase() !== tierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.email?.toLowerCase().includes(q) && !u.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />Client Accounts
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Registered FI Platform users — manage tiers & roles</p>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchUsers} disabled={loading} className="text-muted-foreground">
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…" className="pl-8 h-8 text-xs bg-muted/30 border-border/40" />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40 w-36">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All tiers</SelectItem>
            {Object.entries(TIER_META).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading users…</p>
      ) : visible.length === 0 ? (
        <Card className="bg-card/40 border-border/30">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {users.length === 0 ? 'No registered users found.' : 'No users match the current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">User</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tier</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Role</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Org Type</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Facility ID</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Change Tier</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(user => {
                const key  = user.username || user.email;
                const tier = (user.tier || 'basic').toLowerCase();
                const tierM = TIER_META[tier] || TIER_META.basic;
                return (
                  <tr key={key} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{user.name || user.email}</p>
                      {user.name && <p className="text-muted-foreground text-[10px]">{user.email}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border', tierM.color)}>{tierM.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{user.role || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground capitalize">{user.orgType || '—'}</td>
                    <td className="px-3 py-2.5">
                      {user.facilityId
                        ? <code className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{user.facilityId}</code>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Select value={tier} onValueChange={v => updateTier(user, v)} disabled={updatingTier === key}>
                        <SelectTrigger className="h-6 text-[10px] bg-muted/30 border-border/40 w-28 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIER_META).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── FIAS Quick ────────────────────────────────────────────────────────────────

function FIASQuick() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />FIAS Assessments
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Facility Intelligence Assessment System — run assessments, score clients</p>
        </div>
        <a href="/fias">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" />Open FIAS
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-sm font-medium">Run New Assessment</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Start a new FIAS session for a client facility. Score equipment reliability,
              compliance, energy efficiency, and operational maturity to justify retainer proposals.
            </p>
            <a href="/fias">
              <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Plus className="w-3.5 h-3.5" />Start Assessment
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-sm font-medium">Facility Compass</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Access the full internal workspace including FIAS history, client records,
              doc generator, audit module, and retainer management.
            </p>
            <a href={`${FC_BASE}/fias`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10">
                <ExternalLink className="w-3.5 h-3.5" />Open in Facility Compass
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-xs text-blue-300 font-medium mb-2">About FIAS</p>
        <p className="text-xs text-blue-200/70 leading-relaxed">
          The Facility Intelligence Assessment System (FIAS) is a structured scoring methodology
          evaluating operations across equipment reliability, compliance posture, energy efficiency,
          and operational maturity. Results justify retainer proposals and build the VVFI client base.
        </p>
      </div>
    </div>
  );
}

// ── Engagements (Booking Tracker) ─────────────────────────────────────────────

const SLOT_LABELS: Record<string, string> = {
  "09:00": "9:00 AM", "10:00": "10:00 AM", "11:00": "11:00 AM",
  "13:00": "1:00 PM", "14:00": "2:00 PM",  "15:00": "3:00 PM",  "16:00": "4:00 PM",
};

const BOOKING_STATUS_META = {
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  completed:  { label: 'Completed',  color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  cancelled:  { label: 'Cancelled',  color: 'bg-muted/40 text-muted-foreground border-border/40' },
};

function EngagementsTab() {
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [loading, setLoading]         = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [updating, setUpdating]       = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/all`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      setBookings(prev => prev.map(b => b.bookingId === id ? { ...b, status: status as any } : b));
    } catch { /* silent */ }
    setUpdating(null);
  };

  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);

  const upcoming  = bookings.filter(b => b.status === 'confirmed' && b.scheduledDate >= new Date().toISOString().split('T')[0]).length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const revenue   = bookings.filter(b => b.status !== 'cancelled').length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Upcoming',  value: upcoming,  color: 'text-blue-400' },
          { label: 'Completed', value: completed, color: 'text-green-400' },
          { label: 'Total Booked', value: revenue, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="bg-card/60 border-border/40">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex gap-2">
          {['confirmed','completed','cancelled','all'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs border transition-all capitalize',
                statusFilter === s
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'border-border/40 text-muted-foreground hover:border-primary/30'
              )}
            >{s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={fetchBookings} disabled={loading} className="text-xs gap-1.5">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading bookings…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {statusFilter === 'all' ? 'No bookings yet.' : `No ${statusFilter} bookings.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const meta = BOOKING_STATUS_META[b.status] || BOOKING_STATUS_META.confirmed;
            const isExpanded = expanded === b.bookingId;
            const isPast = b.scheduledDate < new Date().toISOString().split('T')[0];
            return (
              <Card key={b.bookingId} className={cn('bg-card/60 border-border/40 transition-all', isExpanded && 'border-primary/30')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{b.clientName}</p>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', meta.color)}>
                          {meta.label}
                        </span>
                        {isPast && b.status === 'confirmed' && (
                          <span className="text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded">Past</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{b.scheduledDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{SLOT_LABELS[b.timeSlot] || b.timeSlot} EST
                        </span>
                        <span className="font-medium text-foreground/70">{b.service}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          disabled={updating === b.bookingId}
                          onClick={() => updateStatus(b.bookingId, 'completed')}
                        >
                          {updating === b.bookingId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark Done'}
                        </Button>
                      )}
                      {b.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-red-400"
                          disabled={updating === b.bookingId}
                          onClick={() => updateStatus(b.bookingId, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : b.bookingId)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Email: </span>{b.clientEmail}</div>
                      <div><span className="text-muted-foreground">Phone: </span>{b.clientPhone || '—'}</div>
                      <div><span className="text-muted-foreground">Organization: </span>{b.clientOrg || '—'}</div>
                      <div><span className="text-muted-foreground">Booking ID: </span><span className="font-mono text-[10px]">{b.bookingId}</span></div>
                      {b.notes && (
                        <div className="col-span-2"><span className="text-muted-foreground">Notes: </span>{b.notes}</div>
                      )}
                      {b.stripeSessionId && (
                        <div className="col-span-2"><span className="text-muted-foreground">Stripe: </span><span className="font-mono text-[10px]">{b.stripeSessionId}</span></div>
                      )}
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

// ── Communications Hub ────────────────────────────────────────────────────────

const PORTAL_URL = 'https://portal.nexumsuum-facilityintelligence.com';

const EMAIL_TEMPLATES = [
  {
    id: 'onboarding',
    label: 'Onboarding Welcome',
    subject: 'Your FI Platform Access is Live — Let\'s Get You Set Up',
    body: (name: string) =>
`Hi ${name},

Welcome to Nexum Suum Facility Intelligence™. Your platform account is now active and ready to use.

Here's how to get started:
1. Log in at ${PORTAL_URL}
2. Complete your Onboarding Setup (takes ~10 minutes)
3. Add your first piece of equipment to the Equipment Library
4. Log your first facility data point

If you have any questions or need help getting set up, reply to this email and I'll be with you directly.

— Razzel Taylor
Nexum Suum Facility Intelligence™`,
  },
  {
    id: 'pilot',
    label: 'Pilot Program Welcome',
    subject: 'You\'re In — Nexum Suum Pilot Program',
    body: (name: string) =>
`Hi ${name},

You're officially a Nexum Suum Pilot Partner. Here's what that means for you:

Your Pilot Partner Perks:
✓ Early access to new features before public release
✓ Direct input on product development
✓ Exclusive event invitations
✓ Priority onboarding support
✓ Insider company updates
✓ Business tier platform access during your pilot period

Your access details will follow in a separate message. We'll be in close contact throughout — your feedback directly shapes how this platform evolves.

— Razzel Taylor
Nexum Suum Facility Intelligence™`,
  },
  {
    id: 'both',
    label: 'Pilot + Onboarding (Combined)',
    subject: 'You\'re In — Pilot Access + FI Platform Is Live',
    body: (name: string) =>
`Hi ${name},

You've been approved as a Nexum Suum Pilot Partner and your FI Platform account is now active.

Your Pilot Partner Perks:
✓ Early feature access
✓ Direct product input
✓ Event invitations
✓ Priority onboarding support
✓ Insider company updates
✓ Business tier access

Getting Started on the Platform:
1. Log in at ${PORTAL_URL}
2. Complete your Onboarding Setup (~10 minutes)
3. Add your first equipment or facility data point

As a pilot partner, reach out directly anytime — your experience is our priority.

— Razzel Taylor
Nexum Suum Facility Intelligence™`,
  },
];

const SMS_TEMPLATES = [
  {
    id: 'onboarding',
    label: 'Onboarding',
    body: (name: string) =>
`Hi ${name}, your Nexum Suum FI Platform is live. Log in at ${PORTAL_URL} to get set up. Questions? Reply anytime — Razzel Taylor, Nexum Suum`,
  },
  {
    id: 'pilot',
    label: 'Pilot Welcome',
    body: (name: string) =>
`Hi ${name}, you've been approved as a Nexum Suum Pilot Partner! Check your email for details and next steps. — Razzel Taylor, Nexum Suum`,
  },
  {
    id: 'both',
    label: 'Pilot + Platform',
    body: (name: string) =>
`Hi ${name}, your Pilot access is confirmed and your FI Platform is live. Login: ${PORTAL_URL} — Reply anytime, Razzel Taylor, Nexum Suum`,
  },
];

function CommunicationsHub() {
  const [pilots, setPilots] = useState<PilotApp[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/pilot-applications`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.applications) setPilots(d.applications); })
      .catch(() => {});
  }, []);

  const approvedPilots = pilots.filter(p => ['approved', 'active'].includes(p.status));

  // ── Email state ──────────────────────────────────────────────────────────────
  const [emailMode, setEmailMode]         = useState<'pick' | 'manual'>('pick');
  const [emailPickId, setEmailPickId]     = useState('');
  const [emailManual, setEmailManual]     = useState({ name: '', email: '' });
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject]   = useState('');
  const [emailBody, setEmailBody]         = useState('');
  const [emailSending, setEmailSending]   = useState(false);
  const [emailSent, setEmailSent]         = useState(false);

  // ── SMS state ────────────────────────────────────────────────────────────────
  const [smsPhone, setSmsPhone]           = useState('');
  const [smsName, setSmsName]             = useState('');
  const [smsTemplate, setSmsTemplate]     = useState('');
  const [smsBody, setSmsBody]             = useState('');
  const [smsSending, setSmsSending]       = useState(false);
  const [smsSent, setSmsSent]             = useState(false);

  const applyEmailTemplate = (id: string, name: string) => {
    const tpl = EMAIL_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body(name || 'there'));
  };

  const applySmsTemplate = (id: string, name: string) => {
    const tpl = SMS_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    setSmsBody(tpl.body(name || 'there'));
  };

  const emailTarget = emailMode === 'pick'
    ? approvedPilots.find(p => p.appId === emailPickId)
    : null;
  const emailTo   = emailMode === 'pick' ? emailTarget?.email  || '' : emailManual.email;
  const emailName = emailMode === 'pick' ? emailTarget?.name   || '' : emailManual.name;

  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    setEmailSending(true);
    try {
      const res = await fetch(`${API_BASE}/admin/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: emailTo, toName: emailName, subject: emailSubject, message: emailBody }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 4000);
        setEmailSubject(''); setEmailBody(''); setEmailTemplate('');
        setEmailPickId(''); setEmailManual({ name: '', email: '' });
      } else { toast.error('Email failed — check console.'); }
    } catch { toast.error('Network error.'); }
    setEmailSending(false);
  };

  const sendSms = async () => {
    if (!smsPhone || !smsBody) return;
    setSmsSending(true);
    try {
      const res = await fetch(`${API_BASE}/admin/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: smsPhone, message: smsBody }),
      });
      if (res.ok) {
        setSmsSent(true);
        setTimeout(() => setSmsSent(false), 4000);
        setSmsBody(''); setSmsTemplate(''); setSmsPhone(''); setSmsName('');
      } else { toast.error('SMS failed — check console.'); }
    } catch { toast.error('Network error.'); }
    setSmsSending(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Email Hub ── */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSent && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Email sent successfully
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['pick','manual'] as const).map(m => (
              <button key={m} onClick={() => setEmailMode(m)}
                className={cn('px-3 py-1 rounded-full text-xs border transition-all',
                  emailMode === m ? 'bg-primary/20 text-primary border-primary/40' : 'border-border/40 text-muted-foreground hover:border-primary/30')}>
                {m === 'pick' ? 'Pick Pilot Client' : 'Enter Email Manually'}
              </button>
            ))}
          </div>

          {/* Recipient */}
          {emailMode === 'pick' ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Select approved pilot</label>
              <Select value={emailPickId} onValueChange={v => { setEmailPickId(v); if (emailTemplate) { const p = approvedPilots.find(a => a.appId === v); applyEmailTemplate(emailTemplate, p?.name || ''); } }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={approvedPilots.length ? 'Choose a pilot…' : 'No approved pilots yet'} /></SelectTrigger>
                <SelectContent>
                  {approvedPilots.map(p => (
                    <SelectItem key={p.appId} value={p.appId} className="text-sm">
                      {p.name} — {p.company} <span className="text-muted-foreground text-xs">({p.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={emailManual.name} onChange={e => { setEmailManual(f => ({...f, name: e.target.value})); if (emailTemplate) applyEmailTemplate(emailTemplate, e.target.value); }} placeholder="Recipient name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Email *</label>
                <Input type="email" value={emailManual.email} onChange={e => setEmailManual(f => ({...f, email: e.target.value}))} placeholder="client@company.com" className="h-9 text-sm" />
              </div>
            </div>
          )}

          {/* Template picker */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Template (optional)</label>
            <Select value={emailTemplate} onValueChange={v => { setEmailTemplate(v); applyEmailTemplate(v, emailName); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a template…" /></SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id} className="text-sm">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Subject *</label>
            <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject" className="h-9 text-sm" />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Message *</label>
            <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Write your message here…" rows={8} className="text-sm font-mono" />
          </div>

          <Button className="w-full" disabled={!emailTo || !emailSubject || !emailBody || emailSending} onClick={sendEmail}>
            {emailSending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</> : <><Send className="w-4 h-4 mr-2" />Send Email</>}
          </Button>
          {emailTo && <p className="text-xs text-center text-muted-foreground">Sending to: {emailTo}</p>}
        </CardContent>
      </Card>

      {/* ── SMS Hub ── */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            SMS Hub
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Outbound · Copy sent to your work phone</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {smsSent && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Text sent — copy delivered to your work phone
            </div>
          )}

          {/* Recipient phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Recipient name</label>
              <Input value={smsName} onChange={e => { setSmsName(e.target.value); if (smsTemplate) applySmsTemplate(smsTemplate, e.target.value); }} placeholder="Client name" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone number *</label>
              <Input value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="(973) 000-0000" className="h-9 text-sm" />
            </div>
          </div>

          {/* Template picker */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Template (optional)</label>
            <Select value={smsTemplate} onValueChange={v => { setSmsTemplate(v); applySmsTemplate(v, smsName); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a template…" /></SelectTrigger>
              <SelectContent>
                {SMS_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id} className="text-sm">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Message * <span className="text-muted-foreground/60">({smsBody.length}/160)</span></label>
            <Textarea value={smsBody} onChange={e => setSmsBody(e.target.value)} placeholder="Write your text message…" rows={4} className="text-sm" />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-300">
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            Sent from AWS SNS · A copy goes to your work phone (973) 444-8260 · Replies go to your physical phone
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-500 text-white" disabled={!smsPhone || !smsBody || smsSending} onClick={sendSms}>
            {smsSending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</> : <><MessageSquare className="w-4 h-4 mr-2" />Send Text</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Lead Pipeline ─────────────────────────────────────────────────────────────

function LeadPipeline() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [newLead, setNewLead]           = useState({
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
        const cached = localStorage.getItem(LEADS_KEY);
        if (cached) setLeads(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem(LEADS_KEY);
      if (cached) setLeads(JSON.parse(cached));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    setSaving(leadId);
    const patch: Record<string, unknown> = { status };
    if (status === 'won') patch.convertedAt = new Date().toISOString();
    setLeads(prev => prev.map(l => l.leadId === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l));
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(patch),
      });
    } catch { /* optimistic already applied */ }
    setSaving(null);
  };

  const updateField = async (leadId: string, field: string, value: string | null) => {
    setSaving(leadId);
    setLeads(prev => prev.map(l => l.leadId === leadId ? { ...l, [field]: value } : l));
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ [field]: value }),
      });
    } catch { /* noop */ }
    setSaving(null);
  };

  const deleteLead = async (leadId: string) => {
    setLeads(prev => prev.filter(l => l.leadId !== leadId));
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* noop */ }
  };

  const addLead = async () => {
    if (!newLead.name || !newLead.email) { toast.error('Name and email are required.'); return; }
    setSaving('new');
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...newLead, notify: false }),
      });
      if (res.ok) {
        toast.success(`Lead added — ${newLead.name}`);
        setNewLead({ name: '', email: '', phone: '', company: '', role: '', meetingType: '', notes: '', source: 'manual' });
        setShowAdd(false);
        fetchLeads();
      } else { toast.error('Failed to add lead.'); }
    } catch { toast.error('Network error — lead not saved.'); }
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-foreground', icon: <Users className="h-4 w-4" /> },
          { label: 'Pending',   value: stats.pending,   color: 'text-yellow-400', icon: <Clock className="h-4 w-4" /> },
          { label: 'Contacted', value: stats.contacted, color: 'text-blue-400',   icon: <MailCheck className="h-4 w-4" /> },
          { label: 'Won',       value: stats.won,       color: 'text-green-400',  icon: <Trophy className="h-4 w-4" /> },
          { label: 'Callbacks', value: stats.callbacks, color: 'text-orange-400', icon: <PhoneCall className="h-4 w-4" /> },
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
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All sources</SelectItem>
              <SelectItem value="calendly" className="text-xs">Calendly</SelectItem>
              <SelectItem value="manual" className="text-xs">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAdd && (
        <Card className="bg-card/60 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />New Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name',        label: 'Name *',             placeholder: 'Full name'           },
                { key: 'email',       label: 'Email *',            placeholder: 'email@example.com'   },
                { key: 'phone',       label: 'Phone',              placeholder: 'Phone'               },
                { key: 'company',     label: 'Company / Facility', placeholder: 'Organization'        },
                { key: 'role',        label: 'Role / Title',       placeholder: 'Title'               },
                { key: 'meetingType', label: 'Meeting Type',       placeholder: 'Discovery Call, Demo…'},
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <Input
                    value={newLead[key as keyof typeof newLead]}
                    onChange={e => setNewLead(p => ({ ...p, [key]: e.target.value }))}
                    className="h-8 text-xs bg-muted/30 border-border/40"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))}
                rows={2} className="text-xs bg-muted/30 border-border/40 resize-none" placeholder="Any context about this lead…" />
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

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Calendly Webhook:</span>{' '}
          <span className="font-mono text-blue-200/80">POST /leads/webhook/calendly</span>
          {' '}— paste into Calendly → Integrations → Webhooks to auto-create leads from bookings.
        </div>
      </div>

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
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setExpandedId(expanded ? null : lead.leadId)}>
                      {expanded ? 'Less' : 'More'}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Change Status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['pending', 'contacted', 'qualified', 'won', 'lost'] as LeadStatus[]).map(s => (
                            <button key={s} onClick={() => updateStatus(lead.leadId, s)}
                              className={cn('px-2 py-1 rounded text-xs border transition-colors',
                                lead.status === s ? STATUS_META[s].color : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                              {STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Callback Date</p>
                          <Input type="date" defaultValue={lead.callbackDate?.slice(0, 10) || ''}
                            onBlur={e => updateField(lead.leadId, 'callbackDate', e.target.value || null)}
                            className="h-7 text-xs bg-muted/30 border-border/40" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Follow-up Date</p>
                          <Input type="date" defaultValue={lead.followUpDate?.slice(0, 10) || ''}
                            onBlur={e => updateField(lead.leadId, 'followUpDate', e.target.value || null)}
                            className="h-7 text-xs bg-muted/30 border-border/40" />
                        </div>
                      </div>
                      {lead.notes && (
                        <div className="text-xs bg-muted/20 rounded p-2 text-foreground/80 leading-relaxed">{lead.notes}</div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.phone && <span>📞 {lead.phone}</span>}
                        {lead.role  && <span>· {lead.role}</span>}
                        {lead.utmSource && <span>· src: {lead.utmSource}</span>}
                        <button onClick={() => { if (confirm(`Delete lead for ${lead.name}?`)) deleteLead(lead.leadId); }}
                          className="ml-auto text-red-400 hover:text-red-300 flex items-center gap-1">
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

// ── Pilot Applications ────────────────────────────────────────────────────────

function PilotApplications() {
  const [apps, setApps]             = useState<PilotApp[]>([]);
  const [loading, setLoading]       = useState(false);
  const [actioning, setActioning]   = useState<string | null>(null);
  const [notes, setNotes]           = useState<Record<string, string>>({});
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});
  const [filter, setFilter]         = useState<PilotStatus | 'all'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<PilotApp | null>(null);
  const [emailDraft, setEmailDraft]   = useState({ subject: '', body: '' });
  const [sending, setSending]         = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pilot-applications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApps(data.applications || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const doAction = async (app: PilotApp, action: string) => {
    setActioning(app.appId);
    try {
      const res = await fetch(`${API_BASE}/pilot-applications/${app.appId}/${action}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ notes: notes[app.appId] || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          action === 'approve'
            ? `Approved — code: ${data.pilotCode} · Business tier ${data.cognitoTierSet ? 'provisioned' : 'queued for registration'}`
            : action === 'decline' ? 'Application declined.' : `Status → ${data.newStatus}`
        );
        fetchApps();
      } else { toast.error('Action failed — check console.'); }
    } catch { toast.error('Network error.'); }
    setActioning(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const openEmail = (app: PilotApp) => {
    setEmailTarget(app);
    setEmailDraft({ subject: 'Nexum Suum — Pilot Program Update', body: `Hi ${app.name},\n\n` });
  };

  const sendEmail = async () => {
    if (!emailTarget || !emailDraft.subject || !emailDraft.body) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/pilot-applications/${emailTarget.appId}/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ subject: emailDraft.subject, message: emailDraft.body }),
      });
      if (res.ok) {
        toast.success(`Email sent to ${emailTarget.email}`);
        setEmailTarget(null);
      } else {
        toast.error('Failed to send — check console.');
      }
    } catch { toast.error('Network error.'); }
    setSending(false);
  };

  const visible = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const counts  = Object.fromEntries(
    (Object.keys(PILOT_STATUS_META) as PilotStatus[]).map(s => [s, apps.filter(a => a.status === s).length])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-purple-400" />Pilot Applications
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approve to grant Business tier access · Approval email + Cognito provisioning automated
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchApps} disabled={loading} className="text-muted-foreground">
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', ...Object.keys(PILOT_STATUS_META)] as (PilotStatus | 'all')[]).map(s => {
          const count = s === 'all' ? apps.length : (counts[s] ?? 0);
          const meta  = s !== 'all' ? PILOT_STATUS_META[s] : null;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                filter === s
                  ? meta ? meta.color : 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-muted/20 text-muted-foreground border-border hover:border-primary/40')}>
              {s === 'all' ? 'All' : PILOT_STATUS_META[s].label}
              {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {loading && apps.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Loading applications…</p>
      )}

      {!loading && visible.length === 0 && (
        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No applications</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'all'
                ? 'No pilot applications have been submitted yet.'
                : `No ${PILOT_STATUS_META[filter as PilotStatus]?.label.toLowerCase()} applications.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visible.map(app => {
          const meta    = PILOT_STATUS_META[app.status];
          const isOpen  = expanded[app.appId];
          const working = actioning === app.appId;

          return (
            <Card key={app.appId}
              className={cn('border bg-card/60', app.status === 'pending' || app.status === 'in_progress' ? 'border-yellow-500/20' : 'border-border')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <Badge className={cn('text-[10px] border', meta.color)}>{meta.label}</Badge>
                      {(app.status === 'approved' || app.status === 'active') && (
                        <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <Crown className="w-2.5 h-2.5 mr-1" />Business Tier
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.email} · {app.company || 'No company'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button onClick={() => setExpanded(e => ({ ...e, [app.appId]: !e[app.appId] }))}
                      className="text-muted-foreground hover:text-foreground">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {app.pilotCode && (
                  <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Code</span>
                    <code className="text-sm font-bold text-purple-400 font-mono flex-1">{app.pilotCode}</code>
                    <button onClick={() => copyCode(app.pilotCode!)} className="text-muted-foreground hover:text-foreground" title="Copy code">
                      {copiedCode === app.pilotCode
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {isOpen && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {[
                        { label: 'Role',        value: app.role       },
                        { label: 'Facilities',  value: app.facilities },
                        { label: 'Use Case',    value: app.useCase    },
                        { label: 'Approved At', value: app.approvedAt ? new Date(app.approvedAt).toLocaleDateString() : '—' },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <span className="text-muted-foreground">{label}: </span>
                          <span className="text-foreground">{value}</span>
                        </div>
                      ) : null)}
                    </div>

                    {app.adminNotes && (
                      <div className="bg-muted/20 rounded p-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Notes: </span>{app.adminNotes}
                      </div>
                    )}

                    {(app.status === 'pending' || app.status === 'in_progress') && (
                      <Textarea
                        placeholder="Optional note to applicant…"
                        value={notes[app.appId] || ''}
                        onChange={e => setNotes(n => ({ ...n, [app.appId]: e.target.value }))}
                        className="text-xs h-16 resize-none"
                      />
                    )}

                    <div className="flex flex-wrap gap-2">
                      {(app.status === 'pending' || app.status === 'in_progress') && (
                        <>
                          <Button size="sm" disabled={working} onClick={() => doAction(app, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {working ? 'Approving…' : 'Approve → Business Tier'}
                          </Button>
                          {app.status === 'pending' && (
                            <Button size="sm" variant="outline" disabled={working} onClick={() => doAction(app, 'in_progress')} className="text-xs">
                              Mark In Review
                            </Button>
                          )}
                          <Button size="sm" variant="outline" disabled={working} onClick={() => doAction(app, 'decline')}
                            className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">
                            Decline
                          </Button>
                          <Button size="sm" variant="ghost" disabled={working} onClick={() => doAction(app, 'discard')} className="text-xs text-muted-foreground">
                            Discard
                          </Button>
                        </>
                      )}
                      {app.status === 'approved' && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />Waiting for applicant to activate with code
                        </p>
                      )}
                      {app.status === 'active' && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />Active — Business tier provisioned
                        </p>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEmail(app)}
                        className="text-xs text-muted-foreground hover:text-primary ml-auto gap-1.5">
                        <Mail className="w-3.5 h-3.5" />Email
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Email compose dialog */}
      <Dialog open={!!emailTarget} onOpenChange={open => !open && setEmailTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-primary" />
              Email {emailTarget?.name}
              <span className="text-muted-foreground font-normal text-xs">({emailTarget?.email})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Subject</Label>
              <Input
                value={emailDraft.subject}
                onChange={e => setEmailDraft(d => ({ ...d, subject: e.target.value }))}
                className="text-sm"
                placeholder="Subject line…"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Message</Label>
              <Textarea
                value={emailDraft.body}
                onChange={e => setEmailDraft(d => ({ ...d, body: e.target.value }))}
                className="text-sm min-h-[180px] resize-none"
                placeholder="Write your message…"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Sent from Nexum Suum · Replies go to razzellv@nexumsuum.com
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEmailTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={sendEmail} disabled={sending || !emailDraft.subject || !emailDraft.body}
              className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending…' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Onboarding Tracker ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  complete:    'bg-green-500/10 text-green-400 border-green-500/20',
  pending:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function OnboardingTracker() {
  const [records, setRecords]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');

  const hdrs = (() => {
    const t = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/onboarding/all`, { headers: hdrs });
      if (res.ok) {
        const d = await res.json();
        const sorted = (d.records || []).sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecords(sorted);
      }
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleMilestone = async (facilityId: string, milestoneId: string, done: boolean) => {
    await fetch(`${API_BASE}/onboarding/${facilityId}/milestone`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ milestoneId, done }),
    });
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading onboarding records…</div>;

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-xl">
        No onboarding records yet. Records are created automatically when a pilot user first logs in.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">Active Onboarding Clients ({records.length})</h2>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>Refresh</Button>
      </div>
      {records.map(r => {
        const completed = (r.milestones || []).filter((m: any) => m.done).length;
        const total     = (r.milestones || []).length || 8;
        const pct       = r.progress ?? Math.round((completed / total) * 100);
        const isOpen    = expanded === r.facilityId;

        return (
          <Card key={r.facilityId} className="bg-card border-border">
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              onClick={() => setExpanded(isOpen ? null : r.facilityId)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{(r.orgName || r.email || '?')[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.orgName || r.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.email} · {r.orgType} · {r.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end gap-0.5">
                  <span className="text-xs font-medium">{pct}%</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Badge className={cn('text-[10px] border', STATUS_COLORS[r.status] || STATUS_COLORS.in_progress)}>
                  {r.status?.replace('_', ' ')}
                </Badge>
              </div>
            </button>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t border-border/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-muted-foreground">
                  <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Started</span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</div>
                  <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Type</span>{r.type}</div>
                  <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Milestones</span>{completed}/{total}</div>
                  <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Last Update</span>{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'}</div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Milestones</p>
                  {(r.milestones || []).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMilestone(r.facilityId, m.id, !m.done)}
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                          m.done ? 'bg-green-500/20 border-green-500/40' : 'border-border/50 hover:border-primary/50',
                        )}
                      >
                        {m.done && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                      </button>
                      <span className={cn('text-xs', m.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                        {m.label}
                      </span>
                      {m.doneAt && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.doneAt).toLocaleDateString()}</span>}
                    </div>
                  ))}
                </div>

                {r.notes && (
                  <div className="text-xs bg-muted/30 rounded-lg p-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">Notes: </span>{r.notes}
                  </div>
                )}

                <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  Email {r.email} →
                </a>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NexumWorkspace() {
  const [activeTab, setActiveTab]       = useState('overview');
  const { stats, loading: statsLoading, refresh: refreshStats } = useWorkspaceStats();
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
      id: `note-${Date.now()}`, text: newNote.trim(),
      createdAt: new Date().toISOString(), pinned: false,
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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <LayoutDashboard className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Nexum Workspace</h1>
              <Badge variant="outline" className="text-orange-400 border-orange-400/40">Admin Only</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Internal operations hub — client accounts, leads, pilots, FIAS & all Nexum tools.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={refreshStats} disabled={statsLoading} className="text-muted-foreground text-xs">
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', statsLoading && 'animate-spin')} />Refresh
            </Button>
            <a href={FC_BASE} target="_blank" rel="noreferrer">
              <Button size="sm" className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />Facility Compass
              </Button>
            </a>
          </div>
        </div>

        <StatsRow stats={stats} loading={statsLoading} onTabChange={setActiveTab} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border/40 h-auto flex-wrap gap-0.5 p-1">
            {[
              { value: 'overview',  label: 'Overview'          },
              { value: 'clients',   label: 'Client Accounts'   },
              { value: 'fias',      label: 'FIAS Assessments'  },
              { value: 'pipeline',  label: 'Lead Pipeline'     },
              { value: 'pilots',     label: 'Pilot Applications' },
              { value: 'onboarding',   label: 'Onboarding Tracker'  },
              { value: 'engagements',  label: 'Engagements'           },
              { value: 'comms',        label: 'Communications'        },
              { value: 'tools',        label: 'Tools & Resources'     },
              { value: 'notes',      label: 'Notes'              },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {[
                    { label: 'Client Accounts',         icon: Users,        color: 'text-blue-400',   tab: 'clients'  },
                    { label: 'FIAS Assessment',          icon: Activity,     color: 'text-teal-400',   tab: 'fias'     },
                    { label: 'Lead Pipeline',            icon: TrendingUp,   color: 'text-green-400',  tab: 'pipeline' },
                    { label: 'Pilot Applications',       icon: Crown,        color: 'text-purple-400', tab: 'pilots'   },
                    { label: 'VVFI Retainers',           icon: TrendingUp,   color: 'text-emerald-400',href: '/virtuous' },
                    { label: 'OIG Dashboard',            icon: Gauge,        color: 'text-indigo-400', href: '/operational-intelligence' },
                  ].map(({ label, icon: Icon, color, tab, href }) => (
                    tab ? (
                      <button key={label} onClick={() => setActiveTab(tab)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors w-full group text-left">
                        <Icon className={cn('w-4 h-4 shrink-0', color)} />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors flex-1">{label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <a key={label} href={href}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors group">
                        <Icon className={cn('w-4 h-4 shrink-0', color)} />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors flex-1">{label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {[
                      { label: 'FI Platform Portal',  status: 'Online',            ok: true  },
                      { label: 'API Gateway',          status: 'Healthy',           ok: true  },
                      { label: 'Cognito Auth',         status: 'Healthy',           ok: true  },
                      { label: 'SES Email',            status: 'Verify Identities', ok: false },
                      { label: 'Facility Compass',     status: 'External',          ok: true  },
                    ].map(({ label, status, ok }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn('flex items-center gap-1.5 font-medium', ok ? 'text-green-400' : 'text-yellow-400')}>
                          {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {status}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Nexum Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'FI Platform Portal',   href: 'https://portal.nexumsuum-facilityintelligence.com' },
                      { label: 'Facility Compass',      href: FC_BASE },
                      { label: 'Admin View (Portal)',   href: 'https://portal.nexumsuum-facilityintelligence.com?adminView=1' },
                      { label: 'FC — FIAS',             href: `${FC_BASE}/fias` },
                      { label: 'FC — Doc Generator',    href: `${FC_BASE}/doc-generator` },
                    ].map(({ label, href }) => (
                      <a key={label} href={href} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" />{label}
                      </a>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Client Accounts ── */}
          <TabsContent value="clients" className="mt-4">
            <ClientAccounts />
          </TabsContent>

          {/* ── FIAS ── */}
          <TabsContent value="fias" className="mt-4">
            <FIASQuick />
          </TabsContent>

          {/* ── Lead Pipeline ── */}
          <TabsContent value="pipeline" className="mt-4">
            <LeadPipeline />
          </TabsContent>

          {/* ── Pilot Applications ── */}
          <TabsContent value="pilots" className="mt-4">
            <PilotApplications />
          </TabsContent>

          {/* ── Onboarding Tracker ── */}
          <TabsContent value="onboarding" className="mt-4">
            <OnboardingTracker />
          </TabsContent>

          {/* ── Communications ── */}
          <TabsContent value="comms" className="mt-4">
            <CommunicationsHub />
          </TabsContent>

          {/* ── Engagements ── */}
          <TabsContent value="engagements" className="mt-4">
            <EngagementsTab />
          </TabsContent>

          {/* ── Tools & Resources ── */}
          <TabsContent value="tools" className="mt-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1">Internal Tools</h2>
                <p className="text-xs text-muted-foreground">
                  FI Platform tools open in this app. <ExternalLink className="inline w-3 h-3 mx-0.5" /> tools open in Facility Compass.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {INTERNAL_TOOLS.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <a key={tool.href} href={tool.href}
                      target={tool.external ? '_blank' : undefined}
                      rel={tool.external ? 'noreferrer' : undefined}
                      className="block">
                      <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                        <CardContent className="py-4 px-4 flex items-start gap-3">
                          <div className={cn('mt-0.5 shrink-0', tool.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{tool.label}</p>
                              {tool.external && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto mt-0.5" />
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ── Notes ── */}
          <TabsContent value="notes" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Quick Client Lookup</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && lookupClient()}
                      placeholder="Name or facilityId…" className="flex-1" />
                    <Button size="sm" onClick={lookupClient}><Search className="w-4 h-4" /></Button>
                  </div>
                  {clientResult && <div className="text-xs bg-muted/40 rounded p-2 font-mono">{clientResult}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Workspace Notes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                      placeholder="Quick note…" rows={2} className="flex-1 text-sm resize-none" />
                    <Button size="sm" onClick={addNote} className="self-end">
                      <StickyNote className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {sorted.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
                    )}
                    {sorted.map(n => (
                      <div key={n.id} className={cn('flex items-start gap-2 text-xs rounded p-2 border',
                        n.pinned ? 'border-primary/40 bg-primary/5' : 'border-border/50')}>
                        <p className="flex-1 text-foreground whitespace-pre-wrap">{n.text}</p>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => togglePin(n.id)} title="Pin"
                            className={cn('text-muted-foreground hover:text-primary', n.pinned && 'text-primary')}>📌</button>
                          <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
