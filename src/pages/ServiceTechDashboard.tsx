import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';

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
  } catch {
    return [];
  }
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

// ─── New WO form state type ───────────────────────────────────────────────────

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
    user?.name ||
    'Service Tech Co.';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    const saved = safeParseArray(LS_KEY);
    return [...saved, ...INITIAL_WOS];
  });

  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, WOStatus>>({});
  const [showModal, setShowModal] = useState(false);
  const [newWO, setNewWO] = useState<NewWOForm>({
    title: '',
    client: '',
    serviceType: '',
    tech: '',
    priority: 'Normal',
  });

  const urgentCount = workOrders.filter(
    (w) => w.priority === 'Urgent' && w.status !== 'Completed'
  ).length;
  const techsOnDuty = MOCK_TECHS.filter((t) => t.status !== 'Off Duty').length;
  const completedToday = workOrders.filter((w) => w.status === 'Completed').length;
  const activeSites = MOCK_CLIENTS.filter((c) => c.openJobs > 0).length;

  const handleStatusUpdate = (woId: string) => {
    const next = rowStatus[woId];
    if (!next) return;
    setWorkOrders((prev) => prev.map((w) => (w.id === woId ? { ...w, status: next } : w)));
    setEditingRow(null);
    toast({ title: 'Status Updated', description: `${woId} → ${next}` });
  };

  const handleSaveWO = () => {
    if (!newWO.title || !newWO.client || !newWO.tech || !newWO.serviceType) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    const nextId = `JOB-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const wo: WorkOrder = {
      id: nextId,
      client: newWO.client,
      site: `${newWO.client} — Main`,
      serviceType: newWO.serviceType,
      tech: newWO.tech,
      priority: newWO.priority,
      status: 'Scheduled',
      eta: 'TBD',
    };
    const updated = [wo, ...workOrders];
    setWorkOrders(updated);
    const saved = safeParseArray(LS_KEY);
    localStorage.setItem(LS_KEY, JSON.stringify([wo, ...saved]));
    setShowModal(false);
    setNewWO({ title: '', client: '', serviceType: '', tech: '', priority: 'Normal' });
    toast({ title: 'Work Order Created', description: `${nextId} added to dispatch board.` });
  };

  const WO_STATUSES: WOStatus[] = ['Scheduled', 'En Route', 'On Site', 'Completed'];
  const SERVICE_TYPES = ['HVAC Maintenance', 'Boiler Repair', 'Plumbing', 'Electrical', 'General Maintenance'];

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">{companyName}</h1>
            <p className="text-muted-foreground text-sm">Service Operations Dashboard</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{today}</span>
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active Work Orders</span>
                <ClipboardList className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">
                {workOrders.filter((w) => w.status !== 'Completed').length}
              </p>
              <p className="text-xs text-red-400">{urgentCount} urgent</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Technicians on Duty</span>
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">
                {techsOnDuty}
                <span className="text-base text-muted-foreground">/{MOCK_TECHS.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">field active</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Jobs Completed Today</span>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold">{completedToday}</p>
              <p className="text-xs text-green-400">on track</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Client Sites Active</span>
                <Building2 className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{activeSites}</p>
              <p className="text-xs text-muted-foreground">of {MOCK_CLIENTS.length} total</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Revenue This Month</span>
                <DollarSign className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">$50,400</p>
              <p className="text-xs text-cyan-400">+12% vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Section 1: Dispatch Board ────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-cyan-400" />
              Today's Dispatch Board
            </CardTitle>
          </CardHeader>
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
                {workOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{wo.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs leading-tight">{wo.client}</p>
                      <p className="text-muted-foreground text-xs leading-tight">{wo.site}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{wo.serviceType}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs">{wo.tech}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-medium',
                          priorityColor[wo.priority]
                        )}
                      >
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingRow === wo.id ? (
                        <Select
                          value={rowStatus[wo.id] ?? wo.status}
                          onValueChange={(v) =>
                            setRowStatus((prev) => ({ ...prev, [wo.id]: v as WOStatus }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WO_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border font-medium',
                            statusColor[wo.status]
                          )}
                        >
                          {wo.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {wo.eta}
                    </td>
                    <td className="px-4 py-3">
                      {editingRow === wo.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
                            onClick={() => handleStatusUpdate(wo.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingRow(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingRow(wo.id);
                            setRowStatus((prev) => ({ ...prev, [wo.id]: wo.status }));
                          }}
                        >
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

        {/* ── Section 2: Technician Status ─────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-cyan-400" />
            Technician Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOCK_TECHS.map((tech) => (
              <Card key={tech.id} className="border-border/50 bg-card/60">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                    {tech.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{tech.name}</p>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                          techStatusColor[tech.status]
                        )}
                      >
                        {tech.status}
                      </span>
                    </div>
                    {tech.jobId !== '—' ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {tech.jobId} · {tech.site}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {tech.status === 'Off Duty' ? 'Not scheduled today' : 'Ready for dispatch'}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{tech.hoursToday}h today</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        disabled={tech.status === 'Off Duty'}
                        onClick={() =>
                          toast({
                            title: 'Dispatched',
                            description: `${tech.name} has been dispatched.`,
                          })
                        }
                      >
                        Dispatch
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Section 3: Client Sites Overview ─────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-cyan-400" />
            Client Sites Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOCK_CLIENTS.map((client) => (
              <Card key={client.id} className="border-border/50 bg-card/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.siteType}</p>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium shrink-0',
                        tierColor[client.tier]
                      )}
                    >
                      {client.tier}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Open Jobs</p>
                      <p
                        className={cn(
                          'font-semibold',
                          client.openJobs > 0 ? 'text-amber-400' : 'text-green-400'
                        )}
                      >
                        {client.openJobs}
                      </p>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs mt-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() =>
                      toast({
                        title: 'View Site',
                        description: `Opening site details for ${client.name}`,
                      })
                    }
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    View Site
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Section 4: Quick Actions ──────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: 'Export Started',
                  description: "Today's dispatch report is being prepared.",
                })
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Export Today's Dispatch
            </Button>
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              View Full Calendar
            </Button>
            <Button variant="outline" onClick={() => navigate('/service-tech-analytics')}>
              <Zap className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </CardContent>
        </Card>

        {/* ── New Work Order Modal ──────────────────────────────────────────── */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-cyan-400" />
                New Work Order
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="wo-title">Job Title</Label>
                <Input
                  id="wo-title"
                  placeholder="e.g. HVAC Inspection — Unit 3"
                  value={newWO.title}
                  onChange={(e) => setNewWO((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select
                  value={newWO.client}
                  onValueChange={(v) => setNewWO((p) => ({ ...p, client: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_CLIENTS.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select
                  value={newWO.serviceType}
                  onValueChange={(v) => setNewWO((p) => ({ ...p, serviceType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Technician</Label>
                <Select
                  value={newWO.tech}
                  onValueChange={(v) => setNewWO((p) => ({ ...p, tech: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_TECHS.filter((t) => t.status !== 'Off Duty').map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} — {t.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={newWO.priority}
                  onValueChange={(v) => setNewWO((p) => ({ ...p, priority: v as Priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Urgent', 'Normal', 'Low'] as Priority[]).map((pr) => (
                      <SelectItem key={pr} value={pr}>
                        {pr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={handleSaveWO}
              >
                Create Work Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
