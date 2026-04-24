import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { VendorCard } from '@/components/command-hub/vendors/VendorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Search, Phone, RefreshCw, Mail, Send, Bell,
  CheckCircle, Clock, AlertTriangle, Users, ClipboardList,
} from 'lucide-react';
import { AddVendorDialog } from '@/components/command-hub/dialogs/AddVendorDialog';
import { FilterDialog } from '@/components/command-hub/dialogs/FilterDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const getToken = () =>
  localStorage.getItem('nexum_id_token') ||
  localStorage.getItem('nexum_access_token') ||
  localStorage.getItem('accessToken') || '';

export interface Vendor {
  vendorId: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  specialty: string[];
  onCall: boolean;
  insuranceExpiry?: string;
  responseTimeRating: number;
  activeContracts: number;
  totalSpend: number;
  createdAt?: string;
}

// ── Alert types ───────────────────────────────────────────────────────────────
type AlertStatus = 'sent' | 'acknowledged' | 'resolved';
interface VendorAlert {
  id: string;
  vendorId: string;
  vendorName: string;
  issue: string;
  sentAt: string;
  status: AlertStatus;
  response?: string;
}

const MOCK_ALERTS: VendorAlert[] = [
  { id: 'a-001', vendorId: 'v-001', vendorName: 'Northeast HVAC Services', issue: 'Boiler pressure spiked — safety interlock risk', sentAt: '2026-01-17T08:22:00.000Z', status: 'acknowledged', response: 'On the way — ETA 45 min' },
  { id: 'a-002', vendorId: 'v-002', vendorName: 'CoolTech Refrigeration', issue: 'Chiller efficiency dropped below 70% — condenser check needed', sentAt: '2026-01-16T14:05:00.000Z', status: 'resolved' },
];

// ── Mock work history (mirrors ContractorInstalls entries) ────────────────────
const MOCK_WORK = [
  { id: 'ci-001', vendorId: 'v-001', vendorName: 'Northeast HVAC Services', type: 'install',     desc: 'New low-NOx burner assembly', equipment: 'BLR-001', date: '2026-01-10', status: 'completed' },
  { id: 'ci-002', vendorId: 'v-002', vendorName: 'CoolTech Refrigeration',  type: 'retrofit',    desc: 'VFD retrofit on condenser fans', equipment: 'CHL-001', date: '2026-01-15', status: 'completed' },
  { id: 'ci-003', vendorId: 'v-001', vendorName: 'Northeast HVAC Services', type: 'inspection',  desc: 'Annual AHU filter & coil inspection', equipment: 'AHU-001', date: '2026-01-18', status: 'completed' },
  { id: 'ci-004', vendorId: 'v-003', vendorName: 'Precision Plumbing',      type: 'repair',      desc: 'Mechanical seal replacement', equipment: 'PMP-001', date: '2026-01-22', status: 'in_progress' },
  { id: 'ci-005', vendorId: 'v-002', vendorName: 'CoolTech Refrigeration',  type: 'maintenance', desc: 'Spring startup & refrigerant check', equipment: 'CHL-001', date: '2026-03-15', status: 'scheduled' },
];

const SPECIALTIES = ['All', 'Boilers', 'Chillers', 'Electrical', 'Controls', 'Safety', 'General', 'Pumps', 'Piping', 'Refrigeration', 'Burners'];

// ── Invite Vendor Dialog ──────────────────────────────────────────────────────
function InviteVendorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [msg, setMsg]     = useState('');

  const send = () => {
    if (!email || !name) {
      toast({ title: 'Required', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Invite sent',
      description: `${name} (${email}) will receive an account creation email with access instructions.`,
    });
    setEmail(''); setName(''); setMsg('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Invite Vendor</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Vendor will receive an email to create a free account. Access is restricted to your facility only.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Company / Contact Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. CoolTech Refrigeration" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email Address <span className="text-destructive">*</span></Label>
            <Input type="email" placeholder="vendor@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Personal message (optional)</Label>
            <Textarea placeholder="Add a note to your invite..." value={msg} onChange={e => setMsg(e.target.value)} className="min-h-[70px] resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send}><Send className="w-4 h-4 mr-2" />Send Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Alert Poke Dialog ─────────────────────────────────────────────────────────
function AlertPokeDialog({ vendor, open, onOpenChange, onSend }: {
  vendor: Vendor | null; open: boolean;
  onOpenChange: (v: boolean) => void;
  onSend: (alert: VendorAlert) => void;
}) {
  const [issue, setIssue] = useState('');

  const QUICK = ['Boiler pressure spike — check needed', 'Chiller efficiency drop', 'Pump seal leak', 'HVAC filter emergency', 'Power issue — panel 3B'];

  const send = () => {
    if (!issue || !vendor) return;
    const newAlert: VendorAlert = {
      id: `a-${Date.now()}`,
      vendorId: vendor.vendorId,
      vendorName: vendor.name,
      issue,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    onSend(newAlert);
    toast({ title: 'Alert sent', description: `${vendor.name} has been poked. You'll be notified when they respond.` });
    setIssue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" />Send Alert to {vendor?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">Quick issue presets:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button key={q} onClick={() => setIssue(q)}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-all', issue === q ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:text-foreground')}
              >{q}</button>
            ))}
          </div>
          <div className="space-y-1">
            <Label>Or describe the issue</Label>
            <Textarea value={issue} onChange={e => setIssue(e.target.value)} placeholder="Describe what needs attention..." className="min-h-[70px] resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!issue} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Bell className="w-4 h-4 mr-2" />Send Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Vendors = () => {
  const { user } = useAuth();
  const facilityId = user?.facilityId || 'facility-001';
  const [vendors, setVendors]             = useState<Vendor[]>([]);
  const [alerts, setAlerts]               = useState<VendorAlert[]>(MOCK_ALERTS);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [showFilter, setShowFilter]       = useState(false);
  const [alertTarget, setAlertTarget]     = useState<Vendor | null>(null);
  const [workFilter, setWorkFilter]       = useState('all');

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendors?facilityId=${facilityId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch {
      toast({ title: 'Error', description: 'Could not load vendors. Check your connection.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleVendorAdded = (v: Vendor) => {
    setVendors(prev => [v, ...prev]);
    toast({ title: 'Vendor Added', description: `${v.name} added to Vendor Hub.` });
  };

  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    try {
      const res = await fetch(`${API_BASE}/vendors?facilityId=${facilityId}&vendorId=${vendorId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setVendors(prev => prev.filter(v => v.vendorId !== vendorId));
      toast({ title: 'Vendor Removed', description: `${vendorName} removed. All historical work is preserved.` });
    } catch {
      toast({ title: 'Error', description: 'Could not remove vendor.', variant: 'destructive' });
    }
  };

  const handleAlertSent = (alert: VendorAlert) => setAlerts(prev => [alert, ...prev]);

  const filtered = vendors.filter(v => {
    const matchSearch    = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contactName?.toLowerCase().includes(search.toLowerCase()) || v.specialty?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchSpecialty = activeSpecialty === 'All' || v.specialty?.some(s => s.toLowerCase() === activeSpecialty.toLowerCase());
    return matchSearch && matchSpecialty;
  });

  const onCallVendors = vendors.filter(v => v.onCall);

  const filteredWork = workFilter === 'all' ? MOCK_WORK : MOCK_WORK.filter(w => w.vendorId === workFilter);

  const ALERT_STATUS_META: Record<AlertStatus, { icon: React.ElementType; color: string }> = {
    sent:         { icon: Send,          color: 'text-orange-400' },
    acknowledged: { icon: CheckCircle,   color: 'text-yellow-400' },
    resolved:     { icon: CheckCircle,   color: 'text-green-400'  },
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Vendor Hub</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${vendors.length} vendors · ${onCallVendors.length} on call`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search vendors..." className="pl-10 w-full sm:w-56 bg-muted/50" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={fetchVendors}><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}><Mail className="w-4 h-4 mr-1.5" />Invite</Button>
            <Button size="sm" onClick={() => setShowAddVendor(true)}><Plus className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Add Vendor</span></Button>
          </div>
        </div>

        {/* On-call banner */}
        {onCallVendors.length > 0 && (
          <div className="glass-panel p-4 border-l-4 border-l-success">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="font-medium">On-Call Vendors</p>
                  <p className="text-sm text-muted-foreground">{onCallVendors.map(v => v.name).join(', ')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const list = onCallVendors.map(v => `${v.name}: ${v.phone}`).join('\n');
                toast({ title: `${onCallVendors.length} On-Call Vendors`, description: list || 'None.' });
              }}>
                Emergency Contact List
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="contacts">
          <TabsList>
            <TabsTrigger value="contacts" className="flex items-center gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Contacts</TabsTrigger>
            <TabsTrigger value="history"  className="flex items-center gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" />Work History</TabsTrigger>
            <TabsTrigger value="alerts"   className="flex items-center gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" />Alerts
              {alerts.filter(a => a.status === 'sent').length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-orange-500 text-[9px] text-white flex items-center justify-center">
                  {alerts.filter(a => a.status === 'sent').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Contacts tab ───────────────────────────────────────────────── */}
          <TabsContent value="contacts" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {SPECIALTIES.map(s => (
                <Badge key={s} variant="outline"
                  className={cn('cursor-pointer hover:bg-muted shrink-0 capitalize', activeSpecialty === s && 'bg-muted border-primary/50 text-primary')}
                  onClick={() => setActiveSpecialty(s)}>{s}</Badge>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-medium mb-1">No vendors found</p>
                <p className="text-sm">Add a vendor or invite them to join.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(vendor => (
                  <div key={vendor.vendorId} className="relative">
                    <VendorCard
                      vendor={vendor}
                      onAssignProject={() => toast({ title: 'Coming Soon', description: 'Assign via Contractor Installs.' })}
                      onViewContracts={() => toast({ title: 'Coming Soon', description: 'Contract management — Business tier.' })}
                      onDelete={() => handleDeleteVendor(vendor.vendorId, vendor.name)}
                    />
                    {/* Alert poke button overlay */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-3 right-3 h-7 px-2 border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
                      onClick={e => { e.stopPropagation(); setAlertTarget(vendor); }}
                    >
                      <Bell className="w-3.5 h-3.5 mr-1" />Alert
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Work History tab ───────────────────────────────────────────── */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <select
                value={workFilter}
                onChange={e => setWorkFilter(e.target.value)}
                className="text-sm border border-border/30 rounded-md px-2 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Vendors</option>
                {[...new Set(MOCK_WORK.map(w => w.vendorId))].map(id => {
                  const name = MOCK_WORK.find(w => w.vendorId === id)?.vendorName ?? id;
                  return <option key={id} value={id}>{name}</option>;
                })}
              </select>
              <p className="text-xs text-muted-foreground">{filteredWork.length} entries — sourced from Contractor Installs</p>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-border/20">
                {filteredWork.map(w => {
                  const statusColors: Record<string, string> = {
                    completed:   'text-green-400 border-green-400/30',
                    in_progress: 'text-yellow-400 border-yellow-400/30',
                    scheduled:   'text-blue-400 border-blue-400/30',
                  };
                  return (
                    <div key={w.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-medium">{w.desc}</span>
                            <Badge variant="outline" className={cn('text-[10px]', statusColors[w.status] ?? '')}>{w.status.replace('_', ' ')}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{w.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{w.vendorName} · {w.equipment} · {w.date}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Alerts tab ─────────────────────────────────────────────────── */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Send a poke from any vendor card. Vendor receives an email + in-app notification and can respond with ETA, On the Way, or a message.
            </p>
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No alerts sent yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => {
                  const meta = ALERT_STATUS_META[alert.status];
                  const StatusIcon = meta.icon;
                  return (
                    <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/20 bg-card/50">
                      <StatusIcon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium">{alert.vendorName}</span>
                          <Badge variant="outline" className={cn('text-[10px]', meta.color)}>{alert.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.issue}</p>
                        {alert.response && (
                          <p className="text-xs text-foreground/70 mt-1 italic">↩ "{alert.response}"</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">{new Date(alert.sentAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddVendorDialog open={showAddVendor} onOpenChange={setShowAddVendor} onVendorAdded={handleVendorAdded} />
      <InviteVendorDialog open={showInvite} onOpenChange={setShowInvite} />
      <FilterDialog open={showFilter} onOpenChange={setShowFilter} title="Filter Vendors" categories={['On Call', 'Boilers', 'Chillers', 'Electrical', 'Controls']} />
      <AlertPokeDialog vendor={alertTarget} open={!!alertTarget} onOpenChange={v => { if (!v) setAlertTarget(null); }} onSend={handleAlertSent} />
    </MainLayout>
  );
};

export default Vendors;
