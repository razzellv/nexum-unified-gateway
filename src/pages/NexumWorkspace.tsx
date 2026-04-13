import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp, Users, DollarSign, Plus, Trash2, Edit2,
  CheckCircle, Clock, XCircle, Lock, BarChart3, RefreshCw,
  Building2, Mail, Phone, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Pipeline = 'lead' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
type OrgType = 'facility' | 'retail' | 'government' | 'other';

interface CRMClient {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  orgType: OrgType;
  pipeline: Pipeline;
  mrr: number;
  notes: string;
  createdAt: string;
  lastContact: string;
  tier: string;
}

const PIPELINE_META: Record<Pipeline, { label: string; color: string; bg: string }> = {
  lead:        { label: 'Lead',        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  proposal:    { label: 'Proposal',    color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  negotiation: { label: 'Negotiation', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  closed_won:  { label: 'Closed Won',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  closed_lost: { label: 'Closed Lost', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
};

const STORAGE_KEY = 'nexum_workspace_clients';

function loadClients(): CRMClient[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveClients(clients: CRMClient[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

const EMPTY_FORM: Omit<CRMClient, 'id' | 'createdAt'> = {
  companyName: '', contactName: '', email: '', phone: '',
  orgType: 'facility', pipeline: 'lead', mrr: 0,
  notes: '', lastContact: '', tier: 'basic',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function NexumWorkspace() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';

  const [clients, setClients]           = useState<CRMClient[]>(loadClients);
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [form, setForm]                 = useState<Omit<CRMClient, 'id' | 'createdAt'>>(EMPTY_FORM);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [filterPipeline, setFilter]     = useState<Pipeline | 'all'>('all');
  const [search, setSearch]             = useState('');

  // Revenue metrics
  const activeClients = useMemo(() => clients.filter(c => c.pipeline === 'closed_won'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.mrr || 0), 0), [activeClients]);
  const arr = mrr * 12;
  const pipeline = useMemo(() =>
    clients.filter(c => ['lead', 'proposal', 'negotiation'].includes(c.pipeline))
           .reduce((s, c) => s + (c.mrr || 0) * 12, 0),
    [clients]
  );

  const filtered = useMemo(() => clients
    .filter(c => filterPipeline === 'all' || c.pipeline === filterPipeline)
    .filter(c =>
      !search ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ), [clients, filterPipeline, search]);

  const saveForm = () => {
    if (!form.companyName || !form.contactName) {
      toast({ title: 'Company name and contact required', variant: 'destructive' }); return;
    }
    if (editingId) {
      const updated = clients.map(c => c.id === editingId ? { ...c, ...form } : c);
      setClients(updated); saveClients(updated);
      toast({ title: 'Client updated' });
    } else {
      const newClient: CRMClient = { ...form, id: `crm-${Date.now()}`, createdAt: new Date().toISOString() };
      const updated = [newClient, ...clients];
      setClients(updated); saveClients(updated);
      toast({ title: 'Client added' });
    }
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false);
  };

  const deleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated); saveClients(updated);
    toast({ title: 'Client removed' });
  };

  const startEdit = (c: CRMClient) => {
    setForm({ companyName: c.companyName, contactName: c.contactName, email: c.email, phone: c.phone, orgType: c.orgType, pipeline: c.pipeline, mrr: c.mrr, notes: c.notes, lastContact: c.lastContact, tier: c.tier });
    setEditingId(c.id); setShowForm(true);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-24">
          <div className="text-center space-y-3">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">Nexum Workspace is admin-only.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nexum Workspace</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Internal CRM · Revenue Tracking · Admin Only</p>
            </div>
          </div>
          <Button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(v => !v); }}>
            <Plus className="w-4 h-4 mr-2" />{showForm ? 'Cancel' : 'Add Client'}
          </Button>
        </div>

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Monthly Recurring Revenue', value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
            { label: 'Annual Recurring Revenue', value: `$${arr.toLocaleString()}`, icon: TrendingUp, color: 'text-cyan-400' },
            { label: 'Active Clients', value: activeClients.length, icon: Users, color: 'text-primary' },
            { label: 'Pipeline Value (ARR)', value: `$${pipeline.toLocaleString()}`, icon: BarChart3, color: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="neon-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
                  </div>
                  <Icon className={cn('w-5 h-5 mt-1 opacity-40', color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <Card className="neon-border border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{editingId ? 'Edit Client' : 'Add New Client'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name *</Label>
                  <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g., Riverside Municipal Complex" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Contact *</Label>
                  <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@facility.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Org Type</Label>
                  <Select value={form.orgType} onValueChange={v => setForm(f => ({ ...f, orgType: v as OrgType }))}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facility">Facility</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pipeline Stage</Label>
                  <Select value={form.pipeline} onValueChange={v => setForm(f => ({ ...f, pipeline: v as Pipeline }))}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PIPELINE_META) as Pipeline[]).map(p => (
                        <SelectItem key={p} value={p} className="text-xs">{PIPELINE_META[p].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">MRR ($)</Label>
                  <Input type="number" value={form.mrr || ''} onChange={e => setForm(f => ({ ...f, mrr: parseFloat(e.target.value) || 0 }))} placeholder="e.g., 349" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plan Tier</Label>
                  <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['basic', 'standard', 'business', 'premium', 'enterprise'].map(t => (
                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Contact Date</Label>
                  <Input type="date" value={form.lastContact} onChange={e => setForm(f => ({ ...f, lastContact: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Client context, follow-up actions, key contacts..." className="text-xs resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
                <Button onClick={saveForm}><CheckCircle className="w-4 h-4 mr-2" />{editingId ? 'Save Changes' : 'Add Client'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.entries(PIPELINE_META) as [Pipeline, typeof PIPELINE_META[Pipeline]][]).map(([key, meta]) => {
            const count = clients.filter(c => c.pipeline === key).length;
            return (
              <button key={key} onClick={() => setFilter(filterPipeline === key ? 'all' : key)}
                className={cn('rounded-lg border p-2 text-center text-xs transition-all', meta.bg,
                  filterPipeline === key ? 'ring-2 ring-primary/50' : 'opacity-70 hover:opacity-100')}>
                <p className={cn('font-semibold', meta.color)}>{meta.label}</p>
                <p className="text-muted-foreground mt-0.5">{count} client{count !== 1 ? 's' : ''}</p>
              </button>
            );
          })}
        </div>

        {/* Search + list */}
        <div className="space-y-3">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="max-w-sm" />

          {filtered.length === 0 ? (
            <Card className="neon-border">
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No clients yet. Add your first client above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const meta = PIPELINE_META[c.pipeline];
                const expanded = expandedId === c.id;
                return (
                  <Card key={c.id} className={cn('neon-border transition-all', c.pipeline === 'closed_won' && 'border-green-500/20')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{c.companyName}</p>
                            <Badge className={cn('text-[10px]', meta.bg, meta.color)}>{meta.label}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{c.tier}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{c.orgType}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.contactName}</span>
                            {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                            {c.mrr > 0 && <span className="flex items-center gap-1 text-green-400 font-semibold"><DollarSign className="w-3 h-3" />${c.mrr.toLocaleString()}/mo</span>}
                            {c.lastContact && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Last: {c.lastContact}</span>}
                          </div>
                          {expanded && c.notes && (
                            <p className="mt-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-border/30">{c.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setExpandedId(expanded ? null : c.id)} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
