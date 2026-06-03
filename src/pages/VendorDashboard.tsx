import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle, Bell,
  Building2, Wrench, Calendar, ChevronDown, ChevronUp,
  Send, Users, Phone, Mail, Star, ArrowUpRight, User,
  Inbox, Settings, RefreshCw, CheckCheck, XCircle, MessageSquare,
  Lightbulb, Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  getVendorProfile,
  updateVendorProfile,
  listReceivedPlucks,
  respondToPluck,
  listSuggestions,
  dismissSuggestion,
  actOnSuggestion,
  type VendorProfile,
  type VendorPluck,
  type Suggestion,
} from '@/lib/nexum-api';

// ── Mock data representing vendor's perspective ───────────────────────────────

interface WorkEntry {
  id: string;
  clientName: string;
  clientFacility: string;
  workType: string;
  equipment: string;
  description: string;
  date: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  techName: string;
  notes?: string;
}

interface ServiceRequest {
  id: string;
  clientName: string;
  clientFacility: string;
  type: string;
  equipment: string;
  description: string;
  requestedDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending_approval' | 'approved' | 'scheduled' | 'rejected';
  approvedBy?: string;
  scheduledDate?: string;
}

interface ClientAccount {
  id: string;
  clientName: string;
  facilityName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  tier: string;
  joinedDate: string;
  isPrimary: boolean;
  openRequests: number;
  totalJobsCompleted: number;
  lastService: string;
}

const MY_VENDOR_NAME = 'Northeast HVAC Services';
const MY_VENDOR_CONTACT = 'James Carter';

const MOCK_WORK_HISTORY: WorkEntry[] = [
  {
    id: 'wh-001',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    workType: 'Install',
    equipment: 'BLR-001 — Main Boiler',
    description: 'New Honeywell modulating burner installed on Main Boiler. Combustion analysis completed; efficiency at 92.4%.',
    date: '2026-01-15T09:00:00.000Z',
    status: 'completed',
    techName: 'James Carter',
    notes: 'Customer satisfied. Recommend annual tune-up in Q4.',
  },
  {
    id: 'wh-002',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    workType: 'Inspection',
    equipment: 'AHU-003 — Air Handler',
    description: 'Annual AHU inspection. Replaced filters, cleaned coils, checked belt tension.',
    date: '2025-12-10T08:30:00.000Z',
    status: 'completed',
    techName: 'Mike Torres',
    notes: 'Belt showing wear — replacement recommended within 90 days.',
  },
  {
    id: 'wh-003',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    workType: 'Repair',
    equipment: 'PMP-001 — CHW Pump',
    description: 'Mechanical seal replaced after leak reported by facility staff.',
    date: '2025-11-22T11:15:00.000Z',
    status: 'completed',
    techName: 'James Carter',
  },
  {
    id: 'wh-004',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    workType: 'Retrofit',
    equipment: 'CHL-001 — Primary Chiller',
    description: 'VFD installed on chiller compressor. Targeting 15% energy reduction.',
    date: '2026-02-01T07:00:00.000Z',
    status: 'scheduled',
    techName: 'TBD',
  },
];

const MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-001',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    type: 'Maintenance',
    equipment: 'BLR-001 — Main Boiler',
    description: 'Spring boiler maintenance — combustion tune-up, heat exchanger inspection, controls check.',
    requestedDate: '2026-03-15T00:00:00.000Z',
    priority: 'medium',
    status: 'approved',
    approvedBy: 'Sarah Leung — Facility Manager',
    scheduledDate: '2026-03-15T09:00:00.000Z',
  },
  {
    id: 'sr-002',
    clientName: 'Greenfield Operations LLC',
    clientFacility: 'Main Campus — Building A',
    type: 'Install',
    equipment: 'AHU-003 — Belt Drive',
    description: 'Replace worn belt identified in December inspection before it fails.',
    requestedDate: '2026-02-20T00:00:00.000Z',
    priority: 'high',
    status: 'pending_approval',
  },
  {
    id: 'sr-003',
    clientName: 'Riverfront Properties',
    clientFacility: 'North Tower',
    type: 'Emergency',
    equipment: 'CHL-002 — Backup Chiller',
    description: 'Refrigerant leak detected by facility BAS. Immediate containment and repair.',
    requestedDate: '2026-01-28T16:00:00.000Z',
    priority: 'high',
    status: 'scheduled',
    approvedBy: 'Tom Reyes — Property Manager',
    scheduledDate: '2026-01-29T06:00:00.000Z',
  },
];

const MOCK_CLIENTS: ClientAccount[] = [
  {
    id: 'c-001',
    clientName: 'Greenfield Operations LLC',
    facilityName: 'Main Campus — Building A',
    contactName: 'Sarah Leung',
    contactEmail: 'sleung@greenfield-ops.com',
    contactPhone: '(617) 555-0142',
    tier: 'Premium',
    joinedDate: '2024-06-01',
    isPrimary: true,
    openRequests: 2,
    totalJobsCompleted: 12,
    lastService: '2026-01-15',
  },
  {
    id: 'c-002',
    clientName: 'Riverfront Properties',
    facilityName: 'North Tower',
    contactName: 'Tom Reyes',
    contactEmail: 'treyes@riverfront.com',
    contactPhone: '(617) 555-0289',
    tier: 'Standard',
    joinedDate: '2025-02-14',
    isPrimary: false,
    openRequests: 1,
    totalJobsCompleted: 5,
    lastService: '2025-12-01',
  },
];

// ── Helper components ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed:        'bg-green-400/10 text-green-400 border-green-400/30',
  in_progress:      'bg-blue-400/10 text-blue-400 border-blue-400/30',
  scheduled:        'bg-purple-400/10 text-purple-400 border-purple-400/30',
  pending_approval: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  approved:         'bg-green-400/10 text-green-400 border-green-400/30',
  rejected:         'bg-red-400/10 text-red-400 border-red-400/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-400',
  medium: 'text-yellow-400',
  low:    'text-green-400',
};

function WorkEntryRow({ entry }: { entry: WorkEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/20 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-background/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{entry.equipment}</p>
            <p className="text-xs text-muted-foreground truncate">{entry.clientFacility}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLORS[entry.status])}>
            {entry.status.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Date(entry.date).toLocaleDateString()}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/20 bg-background/20 space-y-2">
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{entry.workType}</Badge>
            <span className="text-xs text-muted-foreground">Tech: {entry.techName}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">{entry.date}</span>
          </div>
          <p className="text-sm text-foreground/80">{entry.description}</p>
          {entry.notes && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 italic">{entry.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({ req, onRespond }: { req: ServiceRequest; onRespond: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/20 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-background/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1', PRIORITY_COLORS[req.priority]
            .replace('text-', 'bg-'))} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{req.equipment}</p>
            <p className="text-xs text-muted-foreground truncate">{req.clientFacility}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLORS[req.status])}>
            {req.status.replace('_', ' ')}
          </Badge>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/20 bg-background/20 space-y-3">
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{req.type}</Badge>
            <span className={cn('text-xs font-medium capitalize', PRIORITY_COLORS[req.priority])}>
              {req.priority} priority
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">
              Requested: {new Date(req.requestedDate).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-foreground/80">{req.description}</p>
          {req.approvedBy && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Approved by {req.approvedBy}
            </p>
          )}
          {req.scheduledDate && (
            <p className="text-xs text-purple-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Scheduled: {new Date(req.scheduledDate).toLocaleString()}
            </p>
          )}
          {req.status === 'pending_approval' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="text-xs h-8"
                onClick={() => onRespond(req.id)}>
                <Send className="w-3 h-3 mr-1" /> Send Update to Client
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schedule / Notify Dialog ──────────────────────────────────────────────────
function ScheduleDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    toast({
      title: 'Notification Sent',
      description: `Client will receive a scheduling notification for ${date} at ${time}.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Schedule Service & Notify Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="input-group">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <Label className="text-xs">Message to Client (optional)</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add any notes for the facility manager..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSend} disabled={!date}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Vendor dashboard is restricted to vendor and service_tech org types
  // Other org types who navigate here directly are redirected
  useEffect(() => {
    if (user?.orgType && user.orgType !== 'vendor' && user.orgType !== 'service_tech') {
      navigate('/', { replace: true });
    }
  }, [user?.orgType, navigate]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [removedClients, setRemovedClients] = useState<Array<{ clientName: string; removedAt: string }>>(() =>
    JSON.parse(localStorage.getItem('nexum_vendor_removed_clients') || '[]')
  );

  // ── Live data ─────────────────────────────────────────────────────────────
  const [profile, setProfile]               = useState<VendorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm]       = useState<Partial<VendorProfile>>({});
  const [savingProfile, setSavingProfile]   = useState(false);

  const [plucks, setPlucks]                   = useState<VendorPluck[]>([]);
  const [plucksLoading, setPlucksLoading]     = useState(false);
  const [respondPluck, setRespondPluck]       = useState<VendorPluck | null>(null);
  const [pluckResponse, setPluckResponse]     = useState({ response: 'accepted' as 'accepted' | 'declined' | 'responded', message: '' });
  const [submittingPluck, setSubmittingPluck] = useState(false);

  const [suggestions, setSuggestions]         = useState<Suggestion[]>([]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await getVendorProfile();
      setProfile(data);
      setProfileForm({ orgName: data.orgName, ownerName: data.ownerName, ownerTitle: data.ownerTitle, phone: data.phone, website: data.website, bio: data.bio, licenseNumber: data.licenseNumber });
    } catch { /* no profile yet */ }
    finally { setProfileLoading(false); }
  }, []);

  const loadPlucks = useCallback(async () => {
    setPlucksLoading(true);
    try { const data = await listReceivedPlucks(); setPlucks(data.items || []); }
    catch { setPlucks([]); }
    finally { setPlucksLoading(false); }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try { const data = await listSuggestions('active'); setSuggestions(data.items || []); }
    catch { setSuggestions([]); }
  }, []);

  useEffect(() => {
    loadProfile();
    loadPlucks();
    loadSuggestions();
  }, [loadProfile, loadPlucks, loadSuggestions]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateVendorProfile(profileForm);
      setProfile(updated);
      setEditingProfile(false);
      toast({ title: 'Profile saved', description: 'Your company info has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive' });
    } finally { setSavingProfile(false); }
  };

  const handlePluckRespond = async () => {
    if (!respondPluck) return;
    setSubmittingPluck(true);
    try {
      await respondToPluck(respondPluck.SK, { response: pluckResponse.response, message: pluckResponse.message, status: pluckResponse.response });
      toast({ title: 'Response sent', description: `You ${pluckResponse.response} the request.` });
      setRespondPluck(null);
      setPluckResponse({ response: 'accepted', message: '' });
      await loadPlucks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to respond.', variant: 'destructive' });
    } finally { setSubmittingPluck(false); }
  };

  const pendingCount = MOCK_REQUESTS.filter(r => r.status === 'pending_approval').length;
  const newPlucks    = plucks.filter(p => p.status === 'sent').length;
  const displayName  = profile?.orgName || MY_VENDOR_NAME;
  const displayContact = profile ? `${profile.ownerName || ''}${profile.ownerTitle ? ` · ${profile.ownerTitle}` : ''}`.trim() || MY_VENDOR_CONTACT : MY_VENDOR_CONTACT;

  const handleSendResponse = () => {
    toast({
      title: 'Response Sent',
      description: 'Client has been notified of your update.',
    });
    setRespondId(null);
    setResponseText('');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
            <p className="text-muted-foreground mt-1">
              Vendor Portal · {displayContact} · Nexum Suum Facility Intelligence™
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/messages')}>
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Messages
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule Service
            </Button>
          </div>
        </div>

        {/* Vendor identity banner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-300">Viewing as: {displayName}</p>
            <p className="text-xs text-muted-foreground">You can only see work assigned to your company · {MOCK_CLIENTS.length} active client{MOCK_CLIENTS.length !== 1 ? 's' : ''}</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 shrink-0">
            {profile?.tier === 'pro' || profile?.tier === 'enterprise' ? (
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Pro</span>
            ) : 'Vendor Account'}
          </Badge>
        </div>

        {/* Client removal notification */}
        {removedClients.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-300">Client Access Removed</p>
              {removedClients.map((rc, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {rc.clientName} removed your access on {new Date(rc.removedAt).toLocaleDateString()}.
                  Your historical work for this client is preserved in their records.
                </p>
              ))}
            </div>
            <button
              className="text-muted-foreground hover:text-foreground text-xs shrink-0"
              onClick={() => {
                setRemovedClients([]);
                localStorage.removeItem('nexum_vendor_removed_clients');
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Jobs Completed', value: MOCK_WORK_HISTORY.filter(w => w.status === 'completed').length, color: 'text-green-400', icon: CheckCircle },
            { label: 'Scheduled', value: MOCK_WORK_HISTORY.filter(w => w.status === 'scheduled').length, color: 'text-purple-400', icon: Calendar },
            { label: 'Pending Approval', value: pendingCount, color: pendingCount > 0 ? 'text-yellow-400' : 'text-muted-foreground', icon: Clock },
            { label: 'Active Clients', value: MOCK_CLIENTS.length, color: 'text-blue-400', icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="p-4 rounded-lg border border-border/20 bg-card text-center">
              <Icon className={cn('w-5 h-5 mx-auto mb-2', color)} />
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="work-done" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="work-done" className="flex items-center gap-1.5 text-xs">
              <ClipboardList className="w-3.5 h-3.5" /> Work Done
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs relative">
              <Bell className="w-3.5 h-3.5" /> Requests &amp; Approvals
              {pendingCount > 0 && (
                <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-yellow-500 text-black">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="plucks" className="flex items-center gap-1.5 text-xs relative">
              <Inbox className="w-3.5 h-3.5" /> Service Requests
              {newPlucks > 0 && (
                <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-amber-500 text-black">{newPlucks}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-1.5 text-xs">
              <Lightbulb className="w-3.5 h-3.5" /> Suggestions
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" /> Client List
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Work Done ── */}
          <TabsContent value="work-done" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Work History
                  <Badge variant="outline" className="ml-auto text-[10px]">{MOCK_WORK_HISTORY.length} entries</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_WORK_HISTORY.map(entry => (
                  <WorkEntryRow key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Requests & Approvals ── */}
          <TabsContent value="requests" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-yellow-400" />
                  Service Requests &amp; Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_REQUESTS.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending requests.</p>
                ) : (
                  MOCK_REQUESTS.map(req => (
                    <RequestRow key={req.id} req={req} onRespond={id => setRespondId(id)} />
                  ))
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground/50 px-1">
              Approved work orders trigger a notification to the facility manager. Pending items require their approval before scheduling.
            </p>
          </TabsContent>

          {/* ── Tab 3: Pluck Inbox (Facility Service Requests) ── */}
          <TabsContent value="plucks" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-amber-400" /> Facility Service Requests
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Facilities have reached out — review each pluck and respond.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={loadPlucks} disabled={plucksLoading}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", plucksLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {plucksLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-lg" />)}
              </div>
            ) : plucks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No service requests yet</p>
                  <p className="text-xs mt-1">When facilities send you a pluck, it appears here.</p>
                </CardContent>
              </Card>
            ) : (
              plucks.map(pluck => (
                <Card key={pluck.id} className={cn("border", pluck.status === 'sent' && "border-amber-500/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{pluck.serviceType}</p>
                          <Badge variant="outline" className={cn("text-[10px]",
                            pluck.status === 'sent'     ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            pluck.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            pluck.status === 'declined' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          )}>
                            {pluck.status}
                          </Badge>
                          {pluck.urgency === 'urgent' && (
                            <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{pluck.description}</p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          {pluck.preferredDate && <span>Preferred: {new Date(pluck.preferredDate).toLocaleDateString()}</span>}
                          <span>{new Date(pluck.createdAt).toLocaleDateString()}</span>
                          {pluck.matchScore !== null && <span className="text-cyan-400">{pluck.matchScore}% match</span>}
                        </div>
                        {pluck.vendorMessage && (
                          <div className="mt-2 bg-muted/20 rounded p-2 text-xs text-muted-foreground flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Your reply: {pluck.vendorMessage}</span>
                          </div>
                        )}
                      </div>
                      {(pluck.status === 'sent' || pluck.status === 'viewed') && (
                        <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0"
                          onClick={() => { setRespondPluck(pluck); setPluckResponse({ response: 'accepted', message: '' }); }}>
                          Respond
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Tab 4: Suggestions ── */}
          <TabsContent value="suggestions" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Smart Suggestions
              </h3>
              <Button size="sm" variant="outline" onClick={loadSuggestions}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>

            {(profile?.tier !== 'pro' && profile?.tier !== 'enterprise') && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-amber-400">Upgrade to Pro for full suggestions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pro unlocks priority alerts, vendor-fit scoring, and revenue opportunity signals across your client facilities.
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => navigate('/upgrade')}>
                  Upgrade <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}

            {suggestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No suggestions right now</p>
                  <p className="text-xs mt-1">As your client facilities log more data, smart opportunities appear here.</p>
                </CardContent>
              </Card>
            ) : (
              suggestions.map(sug => (
                <Card key={sug.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px]",
                        sug.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        sug.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-slate-500/20 text-slate-400'
                      )}>
                        {sug.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{sug.category}</span>
                    </div>
                    <p className="font-semibold text-sm">{sug.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sug.detail}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => actOnSuggestion(sug.SK).then(() => setSuggestions(p => p.filter(s => s.id !== sug.id)))}>
                        <CheckCheck className="w-3 h-3 mr-1" /> Act
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                        onClick={() => dismissSuggestion(sug.SK).then(() => setSuggestions(p => p.filter(s => s.id !== sug.id)))}>
                        <XCircle className="w-3 h-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Tab 5: Profile ── */}
          <TabsContent value="profile" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Company Profile
              </h3>
              {editingProfile ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>Edit</Button>
              )}
            </div>

            {profileLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/20 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {editingProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Company / Organization Name</Label>
                        <Input value={profileForm.orgName || ''} onChange={e => setProfileForm(p => ({ ...p, orgName: e.target.value }))} placeholder="Northeast HVAC Services" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Owner / Contact Name</Label>
                        <Input value={profileForm.ownerName || ''} onChange={e => setProfileForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="James Carter" />
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
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs">About / Bio</Label>
                        <Textarea value={profileForm.bio || ''} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief description of your company and specialties…" className="min-h-[80px]" />
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {[
                        { label: 'Company', value: profile?.orgName },
                        { label: 'Owner', value: profile?.ownerName },
                        { label: 'Title', value: profile?.ownerTitle },
                        { label: 'Phone', value: profile?.phone },
                        { label: 'Website', value: profile?.website },
                        { label: 'License', value: profile?.licenseNumber },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="font-medium">{value || '—'}</dd>
                        </div>
                      ))}
                      {profile?.bio && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-muted-foreground">About</dt>
                          <dd className="text-sm">{profile.bio}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 6: Client List ── */}
          <TabsContent value="clients" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Client Accounts
                  <Badge variant="outline" className="ml-auto text-[10px]">{MOCK_CLIENTS.length} clients</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Showing {MOCK_CLIENTS.length} client{MOCK_CLIENTS.length !== 1 ? 's' : ''} assigned to your account.
                  Contact your facility manager to update assignments.
                </p>
                {[...MOCK_CLIENTS].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map(client => (
                  <div key={client.id} className={cn(
                    'p-4 rounded-lg border transition-colors',
                    client.isPrimary ? 'border-primary/40 bg-primary/5' : 'border-border/20 bg-background/30'
                  )}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Building2 className={cn('w-5 h-5 shrink-0', client.isPrimary ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{client.clientName}</p>
                            {client.isPrimary && (
                              <Badge className="text-[9px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30">
                                Primary Client
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">{client.tier}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{client.facilityName}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => window.open(`tel:${client.contactPhone}`)}>
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => window.open(`mailto:${client.contactEmail}`)}>
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Contact', value: client.contactName },
                        { label: 'Jobs Done', value: String(client.totalJobsCompleted) },
                        { label: 'Open Requests', value: String(client.openRequests), highlight: client.openRequests > 0 },
                        { label: 'Last Service', value: client.lastService },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="p-2 rounded bg-background/40 border border-border/10">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className={cn('text-xs font-medium', highlight ? 'text-yellow-400' : 'text-foreground')}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {!client.isPrimary && (
                      <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Entrepreneur tier — multi-client management active
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground/50 px-1">
              Primary client is your original invite source. Additional clients are managed under your Entrepreneur tier.
              If a client removes your account, you'll receive a notification with an option to retain your data.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pluck Respond Dialog */}
      <Dialog open={!!respondPluck} onOpenChange={open => { if (!open) setRespondPluck(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" /> Respond to Service Request
            </DialogTitle>
          </DialogHeader>
          {respondPluck && (
            <div className="space-y-4">
              <div className="bg-muted/20 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-sm">{respondPluck.serviceType}</p>
                <p className="text-xs text-muted-foreground">{respondPluck.description}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Response</Label>
                <select
                  value={pluckResponse.response}
                  onChange={e => setPluckResponse(p => ({ ...p, response: e.target.value as 'accepted' | 'declined' | 'responded' }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="accepted">Accept — I can take this job</option>
                  <option value="declined">Decline — Not available</option>
                  <option value="responded">Respond — Need more info</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message (optional)</Label>
                <Textarea
                  value={pluckResponse.message}
                  onChange={e => setPluckResponse(p => ({ ...p, message: e.target.value }))}
                  placeholder="Add context, confirm availability, or ask a question…"
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRespondPluck(null)}>Cancel</Button>
            <Button size="sm" onClick={handlePluckRespond} disabled={submittingPluck}
              className={pluckResponse.response === 'declined' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
              {submittingPluck ? 'Sending…' : pluckResponse.response === 'accepted' ? 'Accept Request' : pluckResponse.response === 'declined' ? 'Decline' : 'Send Response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} />

      {/* Respond to request dialog */}
      <Dialog open={!!respondId} onOpenChange={() => setRespondId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Send Update to Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Your update will be sent to the facility manager for this request.
            </Label>
            <Textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="e.g. On my way — ETA 2 hours. Will need access to mechanical room."
              className="min-h-[100px] resize-none text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRespondId(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSendResponse} disabled={!responseText.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default VendorDashboard;
