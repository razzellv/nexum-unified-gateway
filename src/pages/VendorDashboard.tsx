import { useState } from 'react';
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
  Send, Users, Phone, Mail, Star, ArrowUpRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const pendingCount = MOCK_REQUESTS.filter(r => r.status === 'pending_approval').length;

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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{MY_VENDOR_NAME}</h1>
            <p className="text-muted-foreground mt-1">
              Vendor Portal · {MY_VENDOR_CONTACT} · Nexum Suum Facility Intelligence™
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule Service
            </Button>
          </div>
        </div>

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

          {/* ── Tab 3: Client List ── */}
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
