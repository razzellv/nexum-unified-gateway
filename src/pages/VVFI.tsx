import { useState, useEffect } from 'react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { RefreshCw, Plus, Calendar, User, AlertTriangle, CheckCircle, Clock, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

interface VVFIClient {
  id: string;
  facilityId: string;
  contactName: string;
  email: string;
  phone: string;
  plan: 'Monthly' | 'Quarterly' | 'Semi-Annual';
  startDate: string;
  nextDue: string;
  lastCompleted: string | null;
  consultant: string;
  facilityType: string;
  notes: string;
  status: 'On Track' | 'Due Soon' | 'Overdue' | 'Paused';
}

interface VVFIReport {
  id: string;
  clientFacilityId: string;
  date: string;
  score: number;
  topGap: string;
  recommendedAction: string;
}

function computeStatus(nextDue: string): VVFIClient['status'] {
  const days = Math.floor((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days > 14) return 'On Track';
  if (days >= 7) return 'Due Soon';
  if (days >= 0) return 'Due Soon';
  return 'Overdue';
}

function calcNextDue(startDate: string, plan: VVFIClient['plan']): string {
  const d = new Date(startDate);
  if (plan === 'Monthly') d.setMonth(d.getMonth() + 1);
  else if (plan === 'Quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
}

const STATUS_STYLE: Record<VVFIClient['status'], string> = {
  'On Track': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Due Soon': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Overdue': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Paused': 'bg-muted text-muted-foreground border-border',
};

const BLANK_CLIENT: Omit<VVFIClient, 'id' | 'status' | 'nextDue'> = {
  facilityId: '',
  contactName: '',
  email: '',
  phone: '',
  plan: 'Monthly',
  startDate: new Date().toISOString().split('T')[0],
  lastCompleted: null,
  consultant: '',
  facilityType: '',
  notes: '',
};

export default function VVFI() {
  const [tab, setTab] = useState('retainers');
  const [clients, setClients] = useState<VVFIClient[]>([]);
  const [reports, setReports] = useState<VVFIReport[]>([]);
  const [form, setForm] = useState({ ...BLANK_CLIENT });
  const [selectedClient, setSelectedClient] = useState('');
  const [drawerClient, setDrawerClient] = useState<VVFIClient | null>(null);

  useEffect(() => {
    syncRead<VVFIClient[]>('nexum_vvfi_clients', '/vvfi/clients', facilityId).then(d => {
      if (d) setClients(d);
    });
    syncRead<VVFIReport[]>('nexum_vvfi_reports', '/vvfi/reports', facilityId).then(d => {
      if (d) setReports(d);
    });
  }, []);

  const saveClients = (next: VVFIClient[]) => {
    setClients(next);
    syncWrite('nexum_vvfi_clients', next, '/vvfi/clients', facilityId);
  };

  const handleSubmit = () => {
    if (!form.facilityId || !form.contactName || !form.plan) {
      toast.error('FacilityId, Contact Name, and Plan are required.');
      return;
    }
    const nextDue = calcNextDue(form.startDate, form.plan);
    const client: VVFIClient = {
      ...form,
      id: `vvfi-${Date.now()}`,
      nextDue,
      status: computeStatus(nextDue),
    };
    saveClients([...clients, client]);
    setForm({ ...BLANK_CLIENT });
    toast.success(`Retainer created for ${client.facilityId}`);
    setTab('retainers');
  };

  const clientReports = reports.filter(r => r.clientFacilityId === selectedClient);
  const chartData = clientReports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({ date: r.date.slice(0, 7), score: r.score }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <RefreshCw className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">VVFI Retainer Program</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Virtuous Verified Facility Intelligence — Monthly · Quarterly · Semi-Annual</p>
        </div>

        {/* Pricing reference */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { plan: 'Monthly', price: '$500/mo', cycle: '~$500/mo' },
            { plan: 'Quarterly', price: '$1,200/qtr', cycle: '~$400/mo' },
            { plan: 'Semi-Annual', price: '$2,000/semi', cycle: '~$333/mo' },
          ].map(p => (
            <Card key={p.plan} className="border-primary/20">
              <CardContent className="p-4 text-center">
                <p className="font-semibold">{p.plan}</p>
                <p className="text-xl font-bold text-primary">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.cycle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="retainers">Active Retainers ({clients.length})</TabsTrigger>
            <TabsTrigger value="new">New Engagement</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Active Retainers ── */}
          <TabsContent value="retainers" className="space-y-3 mt-4">
            {clients.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No active retainers. Add one in New Engagement.</p>
                </CardContent>
              </Card>
            )}
            {clients.map(c => {
              const status = computeStatus(c.nextDue);
              const clientRpts = reports.filter(r => r.clientFacilityId === c.facilityId);
              return (
                <Card key={c.id} className={cn('border', status === 'Overdue' ? 'border-red-500/30' : 'border-border')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{c.facilityId}</span>
                          <Badge variant="outline" className="text-xs">{c.plan}</Badge>
                          <Badge className={cn('text-xs border', STATUS_STYLE[status])}>{status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.contactName}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Next: {c.nextDue}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last: {c.lastCompleted || 'Never'}</span>
                          <span className="flex items-center gap-1">Consultant: {c.consultant || '—'}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDrawerClient(drawerClient?.id === c.id ? null : c)}
                      >
                        {drawerClient?.id === c.id ? 'Close' : 'History'}
                      </Button>
                    </div>
                    {drawerClient?.id === c.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">Assessment History ({clientRpts.length})</p>
                        {clientRpts.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No reports logged yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead><tr className="text-muted-foreground border-b border-border">
                                <th className="text-left py-1 pr-4">Date</th>
                                <th className="text-left py-1 pr-4">Score</th>
                                <th className="text-left py-1 pr-4">Top Gap</th>
                                <th className="text-left py-1">Recommended Action</th>
                              </tr></thead>
                              <tbody>
                                {clientRpts.sort((a,b) => b.date.localeCompare(a.date)).map(r => (
                                  <tr key={r.id} className="border-b border-border/50">
                                    <td className="py-1 pr-4">{r.date}</td>
                                    <td className="py-1 pr-4 font-medium text-primary">{r.score}</td>
                                    <td className="py-1 pr-4">{r.topGap}</td>
                                    <td className="py-1">{r.recommendedAction}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Tab 2: New Engagement ── */}
          <TabsContent value="new" className="mt-4">
            <Card>
              <CardHeader><CardTitle>New VVFI Engagement</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client FacilityId *</Label>
                    <Input value={form.facilityId} onChange={e => setForm(f => ({ ...f, facilityId: e.target.value }))} placeholder="facility-001" />
                  </div>
                  <div>
                    <Label>Contact Name *</Label>
                    <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Smith" />
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
                    <Label>Plan *</Label>
                    <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v as VVFIClient['plan'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly — $500/mo</SelectItem>
                        <SelectItem value="Quarterly">Quarterly — $1,200/qtr</SelectItem>
                        <SelectItem value="Semi-Annual">Semi-Annual — $2,000/semi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Assigned Consultant</Label>
                    <Input value={form.consultant} onChange={e => setForm(f => ({ ...f, consultant: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Facility Type</Label>
                    <Input value={form.facilityType} onChange={e => setForm(f => ({ ...f, facilityType: e.target.value }))} placeholder="Industrial / Commercial / Healthcare…" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />Create Retainer Engagement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Reports ── */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Choose a client…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.facilityId}>{c.facilityId} — {c.contactName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedClient && (
              <>
                {chartData.length >= 2 ? (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Score Trend — {selectedClient}</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Need ≥2 reports to show trend chart.</CardContent></Card>
                )}

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm">All Reports</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="w-3 h-3 mr-1" />Print
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {clientReports.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No reports for this client yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground text-xs">
                            <th className="text-left px-4 py-2">Date</th>
                            <th className="text-left px-4 py-2">Score</th>
                            <th className="text-left px-4 py-2">Top Gap</th>
                            <th className="text-left px-4 py-2">Recommended Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientReports.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                            <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-4 py-2">{r.date}</td>
                              <td className="px-4 py-2 font-bold text-primary">{r.score}</td>
                              <td className="px-4 py-2">{r.topGap}</td>
                              <td className="px-4 py-2 text-muted-foreground">{r.recommendedAction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
