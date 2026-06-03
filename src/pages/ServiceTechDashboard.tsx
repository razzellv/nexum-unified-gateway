import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Users,
  CheckCircle2,
  Building2,
  DollarSign,
  ClipboardList,
  Truck,
  Clock,
  MapPin,
  Plus,
  Download,
  Calendar,
  Zap,
  Inbox,
  Lightbulb,
  Settings,
  Star,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
  CheckCheck,
  XCircle,
  MessageSquare,
  Sparkles,
  Shield,
  RefreshCw,
} from 'lucide-react';
import {
  getVendorProfile,
  updateVendorProfile,
  listReceivedPlucks,
  respondToPluck,
  listSuggestions,
  type VendorProfile,
  type VendorPluck,
  type Suggestion,
} from '@/lib/nexum-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'Urgent' | 'Normal' | 'Low';
type WOStatus = 'En Route' | 'On Site' | 'Completed' | 'Scheduled';
type TechStatus = 'Available' | 'On Site' | 'En Route' | 'Off Duty';
type ClientTier = 'Enterprise' | 'Premium' | 'Standard';

interface WorkOrder {
  id: string;
  client: string;
  site: string;
  serviceType: string;
  tech: string;
  priority: Priority;
  status: WOStatus;
  eta: string;
}

interface Technician {
  id: string;
  name: string;
  initials: string;
  jobId: string;
  site: string;
  status: TechStatus;
  hoursToday: number;
}

interface ClientSite {
  id: string;
  name: string;
  siteType: string;
  openJobs: number;
  lastService: string;
  nextVisit: string;
  tier: ClientTier;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TECHS: Technician[] = [
  { id: 't1', name: 'Marcus Rivera', initials: 'MR', jobId: 'JOB-0041', site: 'Apex Tower', status: 'On Site', hoursToday: 6.5 },
  { id: 't2', name: 'Dana Chen', initials: 'DC', jobId: 'JOB-0042', site: 'Metro Medical', status: 'En Route', hoursToday: 4.0 },
  { id: 't3', name: 'Kevin Walsh', initials: 'KW', jobId: 'JOB-0045', site: 'Riverfront Lofts', status: 'On Site', hoursToday: 7.0 },
  { id: 't4', name: 'Priya Nair', initials: 'PN', jobId: '—', site: '—', status: 'Available', hoursToday: 2.5 },
  { id: 't5', name: 'James Obi', initials: 'JO', jobId: 'JOB-0043', site: 'Lakewood Plant', status: 'On Site', hoursToday: 8.0 },
  { id: 't6', name: 'Sofia Bauer', initials: 'SB', jobId: '—', site: '—', status: 'Off Duty', hoursToday: 0 },
];

const MOCK_CLIENTS: ClientSite[] = [
  { id: 'c1', name: 'Apex Tower LLC', siteType: 'Commercial Office', openJobs: 2, lastService: '2026-04-18', nextVisit: '2026-05-02', tier: 'Enterprise' },
  { id: 'c2', name: 'Metro Medical Center', siteType: 'Healthcare', openJobs: 1, lastService: '2026-04-20', nextVisit: '2026-04-28', tier: 'Enterprise' },
  { id: 'c3', name: 'Lakewood Industrial', siteType: 'Industrial', openJobs: 1, lastService: '2026-04-10', nextVisit: '2026-05-10', tier: 'Premium' },
  { id: 'c4', name: 'Riverfront Lofts', siteType: 'Residential Complex', openJobs: 1, lastService: '2026-04-22', nextVisit: '2026-05-22', tier: 'Standard' },
  { id: 'c5', name: 'Harbor View Hotel', siteType: 'Hospitality', openJobs: 0, lastService: '2026-04-15', nextVisit: '2026-05-15', tier: 'Premium' },
  { id: 'c6', name: 'Westside Schools Dist.', siteType: 'Education', openJobs: 0, lastService: '2026-04-08', nextVisit: '2026-05-08', tier: 'Standard' },
];

const INITIAL_WOS: WorkOrder[] = [
  { id: 'JOB-0041', client: 'Apex Tower LLC', site: 'Apex Tower — Floor 12', serviceType: 'HVAC Maintenance', tech: 'Marcus Rivera', priority: 'Normal', status: 'On Site', eta: '2:30 PM' },
  { id: 'JOB-0042', client: 'Metro Medical Center', site: 'Metro Medical — Mechanical Rm', serviceType: 'Boiler Repair', tech: 'Dana Chen', priority: 'Urgent', status: 'En Route', eta: '12:45 PM' },
  { id: 'JOB-0043', client: 'Lakewood Industrial', site: 'Lakewood Plant — Unit B', serviceType: 'Electrical', tech: 'James Obi', priority: 'Urgent', status: 'On Site', eta: '1:00 PM' },
  { id: 'JOB-0044', client: 'Harbor View Hotel', site: 'Harbor View — Basement', serviceType: 'Plumbing', tech: 'Priya Nair', priority: 'Normal', status: 'Scheduled', eta: '3:00 PM' },
  { id: 'JOB-0045', client: 'Riverfront Lofts', site: 'Riverfront Lofts — Unit 4B', serviceType: 'HVAC Maintenance', tech: 'Kevin Walsh', priority: 'Low', status: 'On Site', eta: '4:00 PM' },
  { id: 'JOB-0040', client: 'Westside Schools Dist.', site: 'Jefferson Elem. — Rm 104', serviceType: 'General Maintenance', tech: 'Sofia Bauer', priority: 'Low', status: 'Completed', eta: '—' },
];

const LS_KEY = 'service_tech_work_orders';

const safeParseArray = (key: string): WorkOrder[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const priorityColor: Record<Priority, string> = {
  Urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  Normal: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusColor: Record<WOStatus, string> = {
  'En Route': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'On Site': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  Scheduled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const techStatusColor: Record<TechStatus, string> = {
  Available: 'bg-green-500/20 text-green-400',
  'On Site': 'bg-teal-500/20 text-teal-400',
  'En Route': 'bg-amber-500/20 text-amber-400',
  'Off Duty': 'bg-slate-500/20 text-slate-400',
};

const tierColor: Record<ClientTier, string> = {
  Enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Premium: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Standard: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const pluckStatusColor: Record<string, string> = {
  sent:      'bg-amber-500/20 text-amber-400',
  viewed:    'bg-cyan-500/20 text-cyan-400',
  accepted:  'bg-green-500/20 text-green-400',
  declined:  'bg-red-500/20 text-red-400',
  responded: 'bg-teal-500/20 text-teal-400',
};

const suggPriorityColor: Record<string, string> = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low:    'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// ─── All available service types ──────────────────────────────────────────────
const ALL_SERVICE_TYPES = [
  'HVAC Maintenance', 'HVAC Repair', 'Boiler Repair', 'Boiler Maintenance',
  'Plumbing', 'Electrical', 'Chiller Service', 'Pump Repair',
  'Controls / BAS', 'Fire & Life Safety', 'General Maintenance',
  'Refrigeration', 'Sheet Metal / Ductwork', 'Energy Auditing', 'Commissioning',
];

// ─── New WO form state ────────────────────────────────────────────────────────
interface NewWOForm {
  title: string;
  client: string;
  serviceType: string;
  tech: string;
  priority: Priority;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceTechDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const companyName =
    (user as Record<string, unknown> | null)?.companyName as string ||
    user?.name || 'Service Tech Co.';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Work orders ────────────────────────────────────────────────────────────
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    const saved = safeParseArray(LS_KEY);
    return [...saved, ...INITIAL_WOS];
  });
  const [editingRow, setEditingRow]   = useState<string | null>(null);
  const [rowStatus, setRowStatus]     = useState<Record<string, WOStatus>>({});
  const [showModal, setShowModal]     = useState(false);
  const [newWO, setNewWO]             = useState<NewWOForm>({
    title: '', client: '', serviceType: '', tech: '', priority: 'Normal',
  });

  // ── Profile ────────────────────────────────────────────────────────────────
  const [profile, setProfile]           = useState<VendorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEdit, setProfileEdit]   = useState(false);
  const [profileForm, setProfileForm]   = useState<Partial<VendorProfile>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Plucks ─────────────────────────────────────────────────────────────────
  const [plucks, setPlucks]             = useState<VendorPluck[]>([]);
  const [plucksLoading, setPlucksLoading] = useState(false);
  const [respondDialog, setRespondDialog] = useState<VendorPluck | null>(null);
  const [respondForm, setRespondForm]   = useState({ response: 'accepted' as 'accepted' | 'declined' | 'responded', message: '' });
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // ── Suggestions ────────────────────────────────────────────────────────────
  const [suggestions, setSuggestions]     = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const urgentCount    = workOrders.filter(w => w.priority === 'Urgent' && w.status !== 'Completed').length;
  const techsOnDuty    = MOCK_TECHS.filter(t => t.status !== 'Off Duty').length;
  const completedToday = workOrders.filter(w => w.status === 'Completed').length;
  const activeSites    = MOCK_CLIENTS.filter(c => c.openJobs > 0).length;
  const newPlucks      = plucks.filter(p => p.status === 'sent').length;
  const activeSuggestions = suggestions.filter(s => s.status === 'active').length;

  // ── Load profile ───────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await getVendorProfile();
      setProfile(data);
      setProfileForm({
        orgName:      data.orgName,
        ownerName:    data.ownerName,
        ownerTitle:   data.ownerTitle,
        phone:        data.phone,
        website:      data.website,
        bio:          data.bio,
        licenseNumber: data.licenseNumber,
        services:     data.services,
        serviceAreas: data.serviceAreas,
        certifications: data.certifications,
      });
    } catch {
      // profile may not exist yet — that's fine
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Load plucks ────────────────────────────────────────────────────────────
  const loadPlucks = useCallback(async () => {
    setPlucksLoading(true);
    try {
      const data = await listReceivedPlucks();
      setPlucks(data.items || []);
    } catch {
      setPlucks([]);
    } finally {
      setPlucksLoading(false);
    }
  }, []);

  // ── Load suggestions ───────────────────────────────────────────────────────
  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const data = await listSuggestions('active');
      setSuggestions(data.items || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadPlucks();
    loadSuggestions();
  }, [loadProfile, loadPlucks, loadSuggestions]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStatusUpdate = (woId: string) => {
    const next = rowStatus[woId];
    if (!next) return;
    setWorkOrders(prev => prev.map(w => (w.id === woId ? { ...w, status: next } : w)));
    setEditingRow(null);
    toast({ title: 'Status Updated', description: `${woId} → ${next}` });
  };

  const handleSaveWO = () => {
    if (!newWO.title || !newWO.client || !newWO.tech || !newWO.serviceType) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    const nextId = `JOB-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const wo: WorkOrder = {
      id: nextId, client: newWO.client, site: `${newWO.client} — Main`,
      serviceType: newWO.serviceType, tech: newWO.tech, priority: newWO.priority,
      status: 'Scheduled', eta: 'TBD',
    };
    const updated = [wo, ...workOrders];
    setWorkOrders(updated);
    const saved = safeParseArray(LS_KEY);
    localStorage.setItem(LS_KEY, JSON.stringify([wo, ...saved]));
    setShowModal(false);
    setNewWO({ title: '', client: '', serviceType: '', tech: '', priority: 'Normal' });
    toast({ title: 'Work Order Created', description: `${nextId} added to dispatch board.` });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateVendorProfile(profileForm);
      setProfile(updated);
      setProfileEdit(false);
      toast({ title: 'Profile Saved', description: 'Your company profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRespondToPluck = async () => {
    if (!respondDialog) return;
    setSubmittingResponse(true);
    try {
      await respondToPluck(respondDialog.SK, {
        response: respondForm.response,
        message:  respondForm.message,
        status:   respondForm.response,
      });
      toast({ title: 'Response Sent', description: `You ${respondForm.response} the service request.` });
      setRespondDialog(null);
      setRespondForm({ response: 'accepted', message: '' });
      await loadPlucks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send response.', variant: 'destructive' });
    } finally {
      setSubmittingResponse(false);
    }
  };

  const toggleService = (svc: string) => {
    setProfileForm(prev => {
      const current = prev.services || [];
      const next = current.includes(svc) ? current.filter(s => s !== svc) : [...current, svc];
      return { ...prev, services: next };
    });
  };

  const WO_STATUSES: WOStatus[] = ['Scheduled', 'En Route', 'On Site', 'Completed'];

  const isPro = profile?.tier === 'pro' || profile?.tier === 'enterprise';

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">
              {profile?.orgName || companyName}
            </h1>
            <p className="text-muted-foreground text-sm">Service Operations Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPro && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 gap-1"
                onClick={() => navigate('/upgrade')}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Button>
            )}
            {isPro && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                <Star className="h-3 w-3 fill-amber-400" /> Pro
              </Badge>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active WOs</span>
                <ClipboardList className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{workOrders.filter(w => w.status !== 'Completed').length}</p>
              <p className="text-xs text-red-400">{urgentCount} urgent</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Techs on Duty</span>
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{techsOnDuty}<span className="text-base text-muted-foreground">/{MOCK_TECHS.length}</span></p>
              <p className="text-xs text-muted-foreground">field active</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Completed Today</span>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold">{completedToday}</p>
              <p className="text-xs text-green-400">on track</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Client Sites</span>
                <Building2 className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{activeSites}</p>
              <p className="text-xs text-muted-foreground">of {MOCK_CLIENTS.length}</p>
            </CardContent>
          </Card>

          <Card className={cn("border-border/50 bg-card/60", newPlucks > 0 && "border-amber-500/40")}>
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">New Requests</span>
                <Inbox className={cn("h-4 w-4", newPlucks > 0 ? "text-amber-400" : "text-muted-foreground")} />
              </div>
              <p className={cn("text-2xl font-bold", newPlucks > 0 && "text-amber-400")}>{newPlucks}</p>
              <p className="text-xs text-muted-foreground">plucks received</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Smart Tips</span>
                <Lightbulb className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold">{activeSuggestions}</p>
              <p className="text-xs text-muted-foreground">active suggestions</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="dispatch">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-none lg:flex gap-1">
            <TabsTrigger value="dispatch" className="gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dispatch</span>
            </TabsTrigger>
            <TabsTrigger value="plucks" className="gap-1.5 relative">
              <Inbox className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Requests</span>
              {newPlucks > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {newPlucks}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Dispatch Board ────────────────────────────────────────────── */}
          <TabsContent value="dispatch" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5 text-cyan-400" />
                Today's Dispatch Board
              </h2>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Work Order
              </Button>
            </div>

            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">Job ID</th>
                      <th className="text-left px-4 py-2 font-medium">Client / Site</th>
                      <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Service</th>
                      <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Tech</th>
                      <th className="text-left px-4 py-2 font-medium">Priority</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">ETA</th>
                      <th className="text-left px-4 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.map(wo => (
                      <tr key={wo.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{wo.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs leading-tight">{wo.client}</p>
                          <p className="text-muted-foreground text-xs leading-tight">{wo.site}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs">{wo.serviceType}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs">{wo.tech}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', priorityColor[wo.priority])}>
                            {wo.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingRow === wo.id ? (
                            <Select value={rowStatus[wo.id] ?? wo.status} onValueChange={v => setRowStatus(prev => ({ ...prev, [wo.id]: v as WOStatus }))}>
                              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>{WO_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColor[wo.status])}>
                              {wo.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{wo.eta}</td>
                        <td className="px-4 py-3">
                          {editingRow === wo.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => handleStatusUpdate(wo.id)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRow(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingRow(wo.id); setRowStatus(prev => ({ ...prev, [wo.id]: wo.status })); }}>
                              Update
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Client Sites */}
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-4">
              <Building2 className="h-5 w-5 text-cyan-400" /> Client Sites Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MOCK_CLIENTS.map(client => (
                <Card key={client.id} className="border-border/50 bg-card/60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.siteType}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', tierColor[client.tier])}>
                        {client.tier}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Open Jobs</p>
                        <p className={cn('font-semibold', client.openJobs > 0 ? 'text-amber-400' : 'text-green-400')}>{client.openJobs}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Service</p>
                        <p className="font-medium">{client.lastService}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Visit</p>
                        <p className="font-medium">{client.nextVisit}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      onClick={() => toast({ title: 'View Site', description: `Opening ${client.name}` })}>
                      <MapPin className="h-3 w-3 mr-1" /> View Site
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => toast({ title: 'Export', description: "Preparing dispatch report." })}>
                  <Download className="h-4 w-4 mr-2" /> Export Dispatch
                </Button>
                <Button variant="outline" onClick={() => navigate('/calendar')}>
                  <Calendar className="h-4 w-4 mr-2" /> Full Calendar
                </Button>
                <Button variant="outline" onClick={() => navigate('/service-tech-analytics')}>
                  <Zap className="h-4 w-4 mr-2" /> Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pluck Inbox (Requests from Facilities) ────────────────────── */}
          <TabsContent value="plucks" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-cyan-400" />
                  Service Requests
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Facilities have requested your services — review and respond.</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadPlucks} disabled={plucksLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", plucksLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {plucksLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-lg" />)}
              </div>
            ) : plucks.length === 0 ? (
              <Card className="border-border/50 bg-card/60">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No service requests yet</p>
                  <p className="text-sm mt-1">When facilities send you a pluck, it'll appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {plucks.map(pluck => (
                  <Card key={pluck.id} className={cn("border-border/50 bg-card/60", pluck.status === 'sent' && "border-amber-500/30")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{pluck.serviceType}</p>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", pluckStatusColor[pluck.status] || "bg-slate-500/20 text-slate-400")}>
                              {pluck.status}
                            </span>
                            {pluck.urgency === 'urgent' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Urgent</span>
                            )}
                            {pluck.urgency === 'emergency' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Emergency
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pluck.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {pluck.preferredDate && <span>Preferred: {new Date(pluck.preferredDate).toLocaleDateString()}</span>}
                            <span>{new Date(pluck.createdAt).toLocaleDateString()}</span>
                            {pluck.matchScore !== null && (
                              <span className="text-cyan-400">Match score: {pluck.matchScore}%</span>
                            )}
                          </div>
                          {pluck.vendorMessage && (
                            <div className="mt-2 bg-muted/20 rounded-md p-2 text-xs text-muted-foreground flex items-start gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>Your response: {pluck.vendorMessage}</span>
                            </div>
                          )}
                        </div>
                        {(pluck.status === 'sent' || pluck.status === 'viewed') && (
                          <Button
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                            onClick={() => { setRespondDialog(pluck); setRespondForm({ response: 'accepted', message: '' }); }}
                          >
                            Respond
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Suggestions ────────────────────────────────────────────────── */}
          <TabsContent value="suggestions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  Smart Suggestions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-detected service opportunities and growth signals from your client facilities.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadSuggestions} disabled={suggestionsLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", suggestionsLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {!isPro && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-amber-400">Upgrade to Pro for full Suggestions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pro subscribers get priority alerts, vendor-fit analysis, and revenue opportunity scoring across all client facilities.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => navigate('/upgrade')}>
                    Upgrade <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {suggestionsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-lg" />)}
              </div>
            ) : suggestions.length === 0 ? (
              <Card className="border-border/50 bg-card/60">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No suggestions right now</p>
                  <p className="text-sm mt-1">As your client facilities log more data, smart opportunities will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {suggestions.map(sug => (
                  <Card key={sug.id} className="border-border/50 bg-card/60 hover:border-amber-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", suggPriorityColor[sug.priority])}>
                              {sug.priority}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{sug.category}</span>
                            {sug.riskScore > 60 && (
                              <span className="text-xs flex items-center gap-1 text-amber-400">
                                <AlertTriangle className="h-3 w-3" /> Risk: {sug.riskScore}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm">{sug.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sug.detail}</p>
                          {sug.suggestedVendorName && (
                            <p className="text-xs text-cyan-400 mt-1.5 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-cyan-400" />
                              Suggested vendor: {sug.suggestedVendorName}
                              {sug.vendorMatchScore !== null && ` (${sug.vendorMatchScore}% match)`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1"
                            onClick={async () => {
                              const { actOnSuggestion } = await import('@/lib/nexum-api');
                              await actOnSuggestion(sug.SK);
                              await loadSuggestions();
                              toast({ title: 'Marked as acted on' });
                            }}>
                            <CheckCheck className="h-3 w-3" /> Act
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                            onClick={async () => {
                              const { dismissSuggestion } = await import('@/lib/nexum-api');
                              await dismissSuggestion(sug.SK);
                              await loadSuggestions();
                              toast({ title: 'Suggestion dismissed' });
                            }}>
                            <XCircle className="h-3 w-3 mr-1" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Company Profile + Services ────────────────────────────────── */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-cyan-400" />
                Company Profile
              </h2>
              {profileEdit ? (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setProfileEdit(false)}>Cancel</Button>
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setProfileEdit(true)}>Edit Profile</Button>
              )}
            </div>

            {profileLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50 bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Company Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profileEdit ? (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Company / Organization Name</Label>
                          <Input value={profileForm.orgName || ''} onChange={e => setProfileForm(p => ({ ...p, orgName: e.target.value }))} placeholder="HVAC Solutions Inc." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Owner / Contact Name</Label>
                          <Input value={profileForm.ownerName || ''} onChange={e => setProfileForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="John Smith" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Title</Label>
                          <Input value={profileForm.ownerTitle || ''} onChange={e => setProfileForm(p => ({ ...p, ownerTitle: e.target.value }))} placeholder="Owner / Operations Manager" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone</Label>
                          <Input value={profileForm.phone || ''} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 000-0000" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Website</Label>
                          <Input value={profileForm.website || ''} onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">License Number</Label>
                          <Input value={profileForm.licenseNumber || ''} onChange={e => setProfileForm(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="Contractor license #" />
                        </div>
                      </>
                    ) : (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{profile?.orgName || '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Owner</dt><dd className="font-medium">{profile?.ownerName || '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Title</dt><dd className="font-medium">{profile?.ownerTitle || '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{profile?.phone || '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Website</dt><dd className="font-medium">{profile?.website || '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">License</dt><dd className="font-medium">{profile?.licenseNumber || '—'}</dd></div>
                      </dl>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">About / Bio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profileEdit ? (
                      <Textarea
                        value={profileForm.bio || ''}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Brief description of your company, specialties, and service area…"
                        className="min-h-[120px]"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{profile?.bio || 'No bio added yet.'}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Services Offered
                      {!isPro && (
                        <span className="text-xs text-amber-400 font-normal flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Pro unlocks service matching & suggestions
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profileEdit ? (
                      <div className="flex flex-wrap gap-2">
                        {ALL_SERVICE_TYPES.map(svc => {
                          const selected = (profileForm.services || []).includes(svc);
                          return (
                            <button
                              key={svc}
                              onClick={() => toggleService(svc)}
                              className={cn(
                                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                                selected
                                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                  : "border-border/50 text-muted-foreground hover:border-border"
                              )}
                            >
                              {selected && <CheckCheck className="inline h-3 w-3 mr-1" />}
                              {svc}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(profile?.services || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No services listed yet. Edit your profile to add services.</p>
                        ) : (
                          profile?.services.map(svc => (
                            <span key={svc} className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                              {svc}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tier + Upgrade Card */}
            <Card className={cn("border-border/50", isPro ? "border-amber-500/30 bg-amber-500/5" : "bg-card/60")}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", isPro ? "bg-amber-500/20" : "bg-slate-500/20")}>
                    {isPro ? <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> : <Shield className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{isPro ? 'Pro Plan' : 'Basic Plan'}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPro
                        ? 'Full access to smart suggestions, vendor matching, and priority pluck routing.'
                        : 'Upgrade to Pro to unlock smart suggestions, service match scoring, and priority pluck visibility.'}
                    </p>
                  </div>
                </div>
                {!isPro && (
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shrink-0" onClick={() => navigate('/upgrade')}>
                    Upgrade <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Team / Technician Status ──────────────────────────────────── */}
          <TabsContent value="team" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" /> Technician Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MOCK_TECHS.map(tech => (
                <Card key={tech.id} className="border-border/50 bg-card/60">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                      {tech.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{tech.name}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', techStatusColor[tech.status])}>
                          {tech.status}
                        </span>
                      </div>
                      {tech.jobId !== '—' ? (
                        <p className="text-xs text-muted-foreground truncate">{tech.jobId} · {tech.site}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {tech.status === 'Off Duty' ? 'Not scheduled today' : 'Ready for dispatch'}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{tech.hoursToday}h today</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                          disabled={tech.status === 'Off Duty'}
                          onClick={() => toast({ title: 'Dispatched', description: `${tech.name} has been dispatched.` })}>
                          Dispatch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── New Work Order Modal ──────────────────────────────────────────── */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-cyan-400" /> New Work Order
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="wo-title">Job Title</Label>
                <Input id="wo-title" placeholder="e.g. HVAC Inspection — Unit 3" value={newWO.title} onChange={e => setNewWO(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={newWO.client} onValueChange={v => setNewWO(p => ({ ...p, client: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{MOCK_CLIENTS.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select value={newWO.serviceType} onValueChange={v => setNewWO(p => ({ ...p, serviceType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                  <SelectContent>{ALL_SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Technician</Label>
                <Select value={newWO.tech} onValueChange={v => setNewWO(p => ({ ...p, tech: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>
                    {MOCK_TECHS.filter(t => t.status !== 'Off Duty').map(t => <SelectItem key={t.id} value={t.name}>{t.name} — {t.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newWO.priority} onValueChange={v => setNewWO(p => ({ ...p, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Urgent', 'Normal', 'Low'] as Priority[]).map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSaveWO}>Create Work Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Respond to Pluck Dialog ──────────────────────────────────────── */}
        <Dialog open={!!respondDialog} onOpenChange={open => { if (!open) setRespondDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-cyan-400" /> Respond to Service Request
              </DialogTitle>
            </DialogHeader>
            {respondDialog && (
              <div className="space-y-4 py-2">
                <div className="bg-muted/20 rounded-lg p-3 space-y-1">
                  <p className="font-semibold text-sm">{respondDialog.serviceType}</p>
                  <p className="text-xs text-muted-foreground">{respondDialog.description}</p>
                  {respondDialog.preferredDate && (
                    <p className="text-xs text-muted-foreground">Preferred date: {new Date(respondDialog.preferredDate).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Your Response</Label>
                  <Select value={respondForm.response} onValueChange={v => setRespondForm(p => ({ ...p, response: v as 'accepted' | 'declined' | 'responded' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">Accept — I can take this job</SelectItem>
                      <SelectItem value="declined">Decline — Not available</SelectItem>
                      <SelectItem value="responded">Respond — Need more info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Message (optional)</Label>
                  <Textarea
                    value={respondForm.message}
                    onChange={e => setRespondForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Add context, ask a question, or confirm availability…"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setRespondDialog(null)}>Cancel</Button>
              <Button
                className={cn("text-white", respondForm.response === 'declined' ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700")}
                onClick={handleRespondToPluck}
                disabled={submittingResponse}
              >
                {submittingResponse ? 'Sending…' : respondForm.response === 'accepted' ? 'Accept Request' : respondForm.response === 'declined' ? 'Decline' : 'Send Response'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
