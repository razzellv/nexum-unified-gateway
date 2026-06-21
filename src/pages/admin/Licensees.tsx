import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Radio, Search, Plus, RefreshCw, Building2, BarChart3, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LicenseeOrg {
  orgId: string;
  orgName: string;
  orgType: 'facility' | 'retail' | 'government';
  tier: string;
  registeredAssets: number;
  contactEmail: string;
  licenseStart: string;
  licenseExpiry: string;
  reportSubscription: boolean;
  activeProbeSession?: {
    sessionId: string;
    tier: string;
    startedAt: string;
    endsAt: string;
    equipmentName: string;
  };
}

interface AssignSessionForm {
  orgId: string;
  equipmentId: string;
  equipmentName: string;
  probeTier: 'standard' | 'extended' | 'prestige';
  startDate: string;
}

const TIER_COLORS: Record<string, string> = {
  basic: 'text-muted-foreground border-border/40',
  standard: 'text-blue-400 border-blue-400/40',
  business: 'text-purple-400 border-purple-400/40',
  premium: 'text-amber-400 border-amber-400/40',
  enterprise: 'text-green-400 border-green-400/40',
  admin: 'text-red-400 border-red-400/40',
  'command basic': 'text-sky-400 border-sky-400/40',
  'command standard': 'text-blue-400 border-blue-400/40',
  'command pro': 'text-indigo-400 border-indigo-400/40',
};

const PROBE_TIERS = [
  { id: 'standard', label: 'Standard — 8-Hour Session' },
  { id: 'extended', label: 'Extended — 1-Week Continuous' },
  { id: 'prestige', label: 'Prestige Probe — 30-Day Managed' },
];

const DEMO_LICENSEES: LicenseeOrg[] = [
  { orgId: 'org-001', orgName: 'Metro Industrial LLC', orgType: 'facility', tier: 'enterprise', registeredAssets: 142, contactEmail: 'ops@metroindustrial.com', licenseStart: '2025-01-01', licenseExpiry: '2026-01-01', reportSubscription: true },
  { orgId: 'org-002', orgName: 'Oakview Memorial Hospital', orgType: 'facility', tier: 'premium', registeredAssets: 87, contactEmail: 'facilities@oakview.org', licenseStart: '2025-03-15', licenseExpiry: '2026-03-15', reportSubscription: true },
  { orgId: 'org-003', orgName: 'Riverside Fire Dept.', orgType: 'government', tier: 'command pro', registeredAssets: 34, contactEmail: 'chief@riversidefd.gov', licenseStart: '2025-06-01', licenseExpiry: '2026-06-01', reportSubscription: false },
  { orgId: 'org-004', orgName: 'Fresh Market Chain #12', orgType: 'retail', tier: 'standard', registeredAssets: 28, contactEmail: 'store12@freshmarket.com', licenseStart: '2025-04-01', licenseExpiry: '2026-04-01', reportSubscription: false },
  { orgId: 'org-005', orgName: 'NorthStar Manufacturing', orgType: 'facility', tier: 'business', registeredAssets: 65, contactEmail: 'eng@northstarmfg.com', licenseStart: '2025-02-01', licenseExpiry: '2026-02-01', reportSubscription: true },
];

export default function Licensees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [licensees, setLicensees] = useState<LicenseeOrg[]>(DEMO_LICENSEES);
  const [search, setSearch] = useState('');
  const [loading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignSessionForm>({ orgId: '', equipmentId: '', equipmentName: '', probeTier: 'standard', startDate: new Date().toISOString().split('T')[0] });

  const isAdmin = user?.role === 'admin' || user?.['custom:role'] === 'admin';

  useEffect(() => {
    // Load any locally-assigned sessions and merge
    try {
      const sessions = JSON.parse(localStorage.getItem('nexum_probe_sessions') || '[]');
      if (sessions.length > 0) {
        setLicensees(prev => prev.map(lic => {
          const active = sessions.find((s: any) => s.status === 'active');
          if (active) return { ...lic, activeProbeSession: { sessionId: active.sessionId, tier: active.tierLabel, startedAt: active.startedAt, endsAt: active.endsAt, equipmentName: active.equipmentName } };
          return lic;
        }));
      }
    } catch {}
  }, []);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Admin access required.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const filtered = licensees.filter(l =>
    l.orgName.toLowerCase().includes(search.toLowerCase()) ||
    l.orgType.includes(search.toLowerCase()) ||
    l.tier.includes(search.toLowerCase())
  );

  const totalAssets = licensees.reduce((sum, l) => sum + l.registeredAssets, 0);
  const activeProbes = licensees.filter(l => l.activeProbeSession).length;
  const reportSubs = licensees.filter(l => l.reportSubscription).length;

  const handleAssign = () => {
    if (!assignForm.orgId || !assignForm.equipmentName || !assignForm.probeTier) return;
    const tierLabels: Record<string, string> = { standard: 'Standard', extended: 'Extended', prestige: 'Prestige Probe' };
    const durationHours: Record<string, number> = { standard: 8, extended: 168, prestige: 720 };
    const startAt = new Date(assignForm.startDate);
    const endsAt = new Date(startAt.getTime() + durationHours[assignForm.probeTier] * 3600000);
    const session = {
      sessionId: `ps-admin-${Date.now()}`,
      orgId: assignForm.orgId,
      equipmentId: assignForm.equipmentId || `eq-${Date.now()}`,
      equipmentName: assignForm.equipmentName,
      tier: assignForm.probeTier,
      tierLabel: tierLabels[assignForm.probeTier],
      startedAt: startAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: 'active',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('nexum_probe_sessions') || '[]');
      localStorage.setItem('nexum_probe_sessions', JSON.stringify([session, ...existing]));
    } catch {}
    setLicensees(prev => prev.map(l => l.orgId === assignForm.orgId ? { ...l, activeProbeSession: { sessionId: session.sessionId, tier: session.tierLabel, startedAt: session.startedAt, endsAt: session.endsAt, equipmentName: session.equipmentName } } : l));
    toast({ title: 'Probe session assigned', description: `${tierLabels[assignForm.probeTier]} session scheduled for ${licensees.find(l => l.orgId === assignForm.orgId)?.orgName}.` });
    setAssignOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Licensee Registry
            </h1>
            <p className="text-sm text-muted-foreground">All registered FI Platform organizations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Radio className="w-4 h-4 mr-2" />Assign Probe Session
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Licensees</p>
            <p className="text-2xl font-bold">{licensees.length}</p>
          </CardContent></Card>
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registered Assets</p>
            <p className="text-2xl font-bold">{totalAssets.toLocaleString()}</p>
          </CardContent></Card>
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Probe Sessions</p>
            <p className="text-2xl font-bold text-green-400">{activeProbes}</p>
          </CardContent></Card>
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Report Subscriptions</p>
            <p className="text-2xl font-bold text-amber-400">{reportSubs}</p>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search organizations…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <Card className="neon-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Organization</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Tier</TableHead>
                    <TableHead className="text-muted-foreground text-center">Assets</TableHead>
                    <TableHead className="text-muted-foreground">License</TableHead>
                    <TableHead className="text-muted-foreground">Probe Session</TableHead>
                    <TableHead className="text-muted-foreground text-center">Reports</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  ) : filtered.map(lic => (
                    <TableRow key={lic.orgId} className="border-border/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{lic.orgName}</p>
                          <p className="text-xs text-muted-foreground">{lic.contactEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{lic.orgType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs capitalize', TIER_COLORS[lic.tier] || 'text-muted-foreground')}>{lic.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{lic.registeredAssets}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">{new Date(lic.licenseExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lic.activeProbeSession ? (
                          <div className="text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="font-medium text-green-400">{lic.activeProbeSession.tier}</span>
                            </div>
                            <p className="text-muted-foreground">{lic.activeProbeSession.equipmentName}</p>
                            <p className="text-muted-foreground">Ends {new Date(lic.activeProbeSession.endsAt).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {lic.reportSubscription ? (
                          <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/40">Active</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Probe Session Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />Assign Probe Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Organization</Label>
              <Select value={assignForm.orgId} onValueChange={v => setAssignForm(f => ({ ...f, orgId: v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select organization…" /></SelectTrigger>
                <SelectContent>{licensees.map(l => <SelectItem key={l.orgId} value={l.orgId}>{l.orgName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Equipment / Asset Name</Label>
              <Input className="text-xs" value={assignForm.equipmentName} onChange={e => setAssignForm(f => ({ ...f, equipmentName: e.target.value }))} placeholder="e.g., Main Chiller, VFD-01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Probe Tier</Label>
              <Select value={assignForm.probeTier} onValueChange={v => setAssignForm(f => ({ ...f, probeTier: v as any }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROBE_TIERS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" className="text-xs" value={assignForm.startDate} onChange={e => setAssignForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignForm.orgId || !assignForm.equipmentName}>
              <Radio className="w-4 h-4 mr-2" />Assign Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
