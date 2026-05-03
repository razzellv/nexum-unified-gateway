import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { Users, Plus, Search, ExternalLink, AlertTriangle, CheckCircle, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

export interface ClientAccount {
  id: string;
  clientName: string;
  facilityId: string;
  orgType: 'facility' | 'retail' | 'government' | 'other';
  tier: string;
  planStatus: 'Active' | 'Past Due' | 'Churned';
  onboardingComplete: boolean;
  lastFIASDate: string | null;
  vvfiPlan: 'None' | 'Monthly' | 'Quarterly' | 'Semi-Annual';
  openIssues: number;
  nexumContact: string;
  email: string;
  phone: string;
  notes: ClientNote[];
  createdAt: string;
}

interface ClientNote {
  id: string;
  text: string;
  createdAt: string;
}

const BLANK: Omit<ClientAccount, 'id' | 'notes' | 'createdAt'> = {
  clientName: '',
  facilityId: '',
  orgType: 'facility',
  tier: 'standard',
  planStatus: 'Active',
  onboardingComplete: false,
  lastFIASDate: null,
  vvfiPlan: 'None',
  openIssues: 0,
  nexumContact: '',
  email: '',
  phone: '',
};

const STATUS_STYLE: Record<ClientAccount['planStatus'], string> = {
  Active: 'bg-green-500/20 text-green-400 border-green-500/30',
  'Past Due': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Churned: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TIERS = ['basic', 'standard', 'business', 'premium', 'enterprise', 'retail_starter', 'retail_pro', 'command_basic', 'command_standard', 'command_pro'];

function churnFlags(c: ClientAccount): string[] {
  const flags: string[] = [];
  if (c.planStatus === 'Past Due') flags.push('Payment past due');
  if (!c.lastFIASDate || daysSince(c.lastFIASDate) > 90) flags.push('No FIAS in >90 days');
  if (c.vvfiPlan === 'None') flags.push('No VVFI retainer');
  if (!c.onboardingComplete) flags.push('Onboarding incomplete');
  return flags;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function ClientAccounts() {
  const [tab, setTab] = useState('all');
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [selected, setSelected] = useState<ClientAccount | null>(null);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrg, setFilterOrg] = useState('all');
  const [form, setForm] = useState({ ...BLANK });
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    syncRead<ClientAccount[]>('nexum_client_accounts', '/clients', facilityId).then(d => {
      if (d) setAccounts(d);
    });
  }, []);

  const save = (next: ClientAccount[]) => {
    setAccounts(next);
    syncWrite('nexum_client_accounts', next, '/clients', facilityId);
  };

  const filtered = useMemo(() => accounts.filter(a => {
    if (search && !a.clientName.toLowerCase().includes(search.toLowerCase()) &&
        !a.facilityId.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTier !== 'all' && a.tier !== filterTier) return false;
    if (filterStatus !== 'all' && a.planStatus !== filterStatus) return false;
    if (filterOrg !== 'all' && a.orgType !== filterOrg) return false;
    return true;
  }), [accounts, search, filterTier, filterStatus, filterOrg]);

  const handleAdd = () => {
    if (!form.clientName || !form.facilityId) {
      toast.error('Client Name and FacilityId are required.');
      return;
    }
    const account: ClientAccount = {
      ...form,
      id: `acc-${Date.now()}`,
      notes: [],
      createdAt: new Date().toISOString(),
    };
    save([...accounts, account]);
    setForm({ ...BLANK });
    toast.success(`Account created: ${account.clientName}`);
    setTab('all');
  };

  const addNote = () => {
    if (!selected || !noteText.trim()) return;
    const note: ClientNote = { id: `note-${Date.now()}`, text: noteText.trim(), createdAt: new Date().toISOString() };
    const updated = accounts.map(a => a.id === selected.id ? { ...a, notes: [note, ...a.notes] } : a);
    save(updated);
    setSelected(prev => prev ? { ...prev, notes: [note, ...prev.notes] } : prev);
    setNoteText('');
    toast.success('Note added.');
  };

  const openInPlatform = (acc: ClientAccount) => {
    window.open(`https://portal.nexumsuum-facilityintelligence.com?adminView=${acc.facilityId}`, '_blank');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Client Accounts</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Internal CRM for all Nexum Suum licensee accounts.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All Accounts ({accounts.length})</TabsTrigger>
            <TabsTrigger value="detail" disabled={!selected}>
              {selected ? `Detail — ${selected.clientName}` : 'Account Detail'}
            </TabsTrigger>
            <TabsTrigger value="add">Add Account</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: All Accounts ── */}
          <TabsContent value="all" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search name or facilityId…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Past Due">Past Due</SelectItem>
                  <SelectItem value="Churned">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterOrg} onValueChange={setFilterOrg}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Org Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Org Types</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>{accounts.length === 0 ? 'No accounts yet. Add one.' : 'No results match your filters.'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs uppercase">
                      {['Client', 'FacilityId', 'Org', 'Tier', 'Status', 'Onboarding', 'Last FIAS', 'VVFI', 'Issues', 'Contact'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr
                        key={a.id}
                        className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => { setSelected(a); setTab('detail'); }}
                      >
                        <td className="px-3 py-2 font-medium">{a.clientName}</td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{a.facilityId}</td>
                        <td className="px-3 py-2 capitalize">{a.orgType}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-xs">{a.tier}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn('text-xs border', STATUS_STYLE[a.planStatus])}>{a.planStatus}</Badge>
                        </td>
                        <td className="px-3 py-2">{a.onboardingComplete ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.lastFIASDate || '—'}</td>
                        <td className="px-3 py-2">{a.vvfiPlan}</td>
                        <td className="px-3 py-2">{a.openIssues > 0 ? <span className="text-red-400 font-medium">{a.openIssues}</span> : '0'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.nexumContact || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Account Detail ── */}
          <TabsContent value="detail" className="mt-4">
            {!selected ? (
              <p className="text-muted-foreground text-sm">Click a row in All Accounts to open detail.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{selected.clientName}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{selected.facilityId}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openInPlatform(selected)}>
                    <ExternalLink className="w-3 h-3 mr-1" />Open in FI Platform
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Org Type', selected.orgType],
                    ['Tier', selected.tier],
                    ['Plan Status', selected.planStatus],
                    ['VVFI Plan', selected.vvfiPlan],
                    ['Onboarding', selected.onboardingComplete ? 'Complete' : 'Incomplete'],
                    ['Last FIAS', selected.lastFIASDate || 'Never'],
                    ['Open Issues', String(selected.openIssues)],
                    ['Nexum Contact', selected.nexumContact || '—'],
                  ].map(([label, val]) => (
                    <Card key={label} className="border-border/60">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium text-sm mt-0.5">{val}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Churn risk flags */}
                {(() => {
                  const flags = churnFlags(selected);
                  return flags.length > 0 ? (
                    <Card className="border-yellow-500/30">
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">Churn Risk Flags</CardTitle></CardHeader>
                      <CardContent className="space-y-1">
                        {flags.map(f => (
                          <div key={f} className="flex items-center gap-2 text-sm text-yellow-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />{f}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />No churn risk flags
                    </div>
                  );
                })()}

                {/* Notes */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><StickyNote className="w-4 h-4" />Notes Log</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a timestamped note…"
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={addNote} size="sm" className="self-end">Add</Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selected.notes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No notes yet.</p>
                      ) : (
                        selected.notes.map(n => (
                          <div key={n.id} className="border border-border rounded p-2 text-sm">
                            <p className="text-xs text-muted-foreground mb-1">{new Date(n.createdAt).toLocaleString()}</p>
                            <p>{n.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 3: Add Account ── */}
          <TabsContent value="add" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Add New Client Account</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client Name *</Label>
                    <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>FacilityId *</Label>
                    <Input value={form.facilityId} onChange={e => setForm(f => ({ ...f, facilityId: e.target.value }))} placeholder="facility-001" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Org Type</Label>
                    <Select value={form.orgType} onValueChange={v => setForm(f => ({ ...f, orgType: v as ClientAccount['orgType'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facility">Facility</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Plan Status</Label>
                    <Select value={form.planStatus} onValueChange={v => setForm(f => ({ ...f, planStatus: v as ClientAccount['planStatus'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Past Due">Past Due</SelectItem>
                        <SelectItem value="Churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>VVFI Plan</Label>
                    <Select value={form.vvfiPlan} onValueChange={v => setForm(f => ({ ...f, vvfiPlan: v as ClientAccount['vvfiPlan'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Last FIAS Date</Label>
                    <Input type="date" value={form.lastFIASDate || ''} onChange={e => setForm(f => ({ ...f, lastFIASDate: e.target.value || null }))} />
                  </div>
                  <div>
                    <Label>Open Issues</Label>
                    <Input type="number" min={0} value={form.openIssues} onChange={e => setForm(f => ({ ...f, openIssues: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Nexum Contact</Label>
                    <Input value={form.nexumContact} onChange={e => setForm(f => ({ ...f, nexumContact: e.target.value }))} placeholder="Razzell Taylor" />
                  </div>
                  <div className="flex items-center gap-3 mt-5">
                    <input
                      type="checkbox"
                      id="onboarding"
                      checked={form.onboardingComplete}
                      onChange={e => setForm(f => ({ ...f, onboardingComplete: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="onboarding">Onboarding Complete</Label>
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />Add Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
