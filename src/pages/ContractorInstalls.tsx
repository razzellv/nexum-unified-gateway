import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  HardHat, Plus, Search, RefreshCw, Wrench, ClipboardList,
  CheckCircle, AlertTriangle, Building2, Calendar, User,
  FileText, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const getToken = () =>
  localStorage.getItem('nexum_id_token') ||
  localStorage.getItem('nexum_access_token') || '';

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkType = 'install' | 'retrofit' | 'repair' | 'inspection' | 'maintenance';
type WorkStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface WorkEntry {
  id: string;
  workType: WorkType;
  status: WorkStatus;
  vendorId: string;
  vendorName: string;
  equipmentId: string;
  equipmentName: string;
  description: string;
  notes: string;
  scheduledDate: string;
  completedDate?: string;
  createdAt: string;
  createdBy: string;
  facilityId: string;
}

interface Vendor { vendorId: string; name: string; specialty: string[] }

// ── Constants ─────────────────────────────────────────────────────────────────
const WORK_TYPES: { value: WorkType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'install',     label: 'Install',     icon: HardHat,       color: 'text-blue-400'   },
  { value: 'retrofit',    label: 'Retrofit',    icon: Wrench,        color: 'text-purple-400' },
  { value: 'repair',      label: 'Repair',      icon: AlertTriangle, color: 'text-orange-400' },
  { value: 'inspection',  label: 'Inspection',  icon: ClipboardList, color: 'text-cyan-400'   },
  { value: 'maintenance', label: 'Maintenance', icon: CheckCircle,   color: 'text-green-400'  },
];

const EQUIPMENT_OPTIONS = [
  'BLR-001 — Main Boiler',
  'CHL-001 — Primary Chiller',
  'PMP-001 — CHW Pump',
  'AHU-001 — Air Handler Unit',
  'COOL-001 — Cooling Tower',
  'GEN-001 — Emergency Generator',
  'ELEC-PANEL-3B — Electrical Panel 3B',
  'Other / New Equipment',
];

const STATUS_META: Record<WorkStatus, { label: string; color: string }> = {
  scheduled:   { label: 'Scheduled',   color: 'text-blue-400 border-blue-400/30'   },
  in_progress: { label: 'In Progress', color: 'text-yellow-400 border-yellow-400/30' },
  completed:   { label: 'Completed',   color: 'text-green-400 border-green-400/30'  },
  cancelled:   { label: 'Cancelled',   color: 'text-muted-foreground border-border/30' },
};

// ── Mock data (replaced by API when available) ────────────────────────────────
const MOCK_ENTRIES: WorkEntry[] = [
  {
    id: 'ci-001', workType: 'install', status: 'completed',
    vendorId: 'v-001', vendorName: 'Northeast HVAC Services',
    equipmentId: 'BLR-001', equipmentName: 'Main Boiler',
    description: 'New low-NOx burner assembly installation',
    notes: 'Replaced original burner with Cleaver-Brooks CB100. Combustion analysis performed post-install. O₂ at 4.2%, stack temp 320°F.',
    scheduledDate: '2026-01-10', completedDate: '2026-01-10',
    createdAt: '2026-01-08T09:00:00.000Z', createdBy: 'Razzell', facilityId: 'facility-001',
  },
  {
    id: 'ci-002', workType: 'retrofit', status: 'completed',
    vendorId: 'v-002', vendorName: 'CoolTech Refrigeration',
    equipmentId: 'CHL-001', equipmentName: 'Primary Chiller',
    description: 'VFD retrofit on condenser fan motors',
    notes: 'Installed ABB VFDs on all 3 condenser fans. Estimated 18% energy reduction at partial load.',
    scheduledDate: '2026-01-14', completedDate: '2026-01-15',
    createdAt: '2026-01-12T14:00:00.000Z', createdBy: 'Mike T', facilityId: 'facility-001',
  },
  {
    id: 'ci-003', workType: 'inspection', status: 'completed',
    vendorId: 'v-001', vendorName: 'Northeast HVAC Services',
    equipmentId: 'AHU-001', equipmentName: 'Air Handler Unit',
    description: 'Annual filter and coil inspection',
    notes: 'Filters replaced. Coil fouling at 15% — recommend cleaning at next scheduled PM.',
    scheduledDate: '2026-01-18', completedDate: '2026-01-18',
    createdAt: '2026-01-16T10:00:00.000Z', createdBy: 'Sarah L', facilityId: 'facility-001',
  },
  {
    id: 'ci-004', workType: 'repair', status: 'in_progress',
    vendorId: 'v-003', vendorName: 'Precision Plumbing & Piping',
    equipmentId: 'PMP-001', equipmentName: 'CHW Pump',
    description: 'Mechanical seal replacement',
    notes: 'Seal failure detected during routine check. Parts on order — ETA 2 days.',
    scheduledDate: '2026-01-22', completedDate: undefined,
    createdAt: '2026-01-20T08:30:00.000Z', createdBy: 'John D', facilityId: 'facility-001',
  },
  {
    id: 'ci-005', workType: 'maintenance', status: 'scheduled',
    vendorId: 'v-002', vendorName: 'CoolTech Refrigeration',
    equipmentId: 'CHL-001', equipmentName: 'Primary Chiller',
    description: 'Spring startup and refrigerant check',
    notes: '',
    scheduledDate: '2026-03-15', completedDate: undefined,
    createdAt: '2026-01-21T11:00:00.000Z', createdBy: 'Razzell', facilityId: 'facility-001',
  },
];

const MOCK_VENDORS: Vendor[] = [
  { vendorId: 'v-001', name: 'Northeast HVAC Services', specialty: ['Boilers', 'AHU', 'Controls'] },
  { vendorId: 'v-002', name: 'CoolTech Refrigeration',  specialty: ['Chillers', 'Refrigeration']  },
  { vendorId: 'v-003', name: 'Precision Plumbing & Piping', specialty: ['Pumps', 'Piping']         },
];

// ── Log Work Dialog ───────────────────────────────────────────────────────────
interface LogWorkDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendors: Vendor[];
  onSubmit: (entry: Omit<WorkEntry, 'id' | 'createdAt' | 'createdBy' | 'facilityId'>) => void;
}

function LogWorkDialog({ open, onOpenChange, vendors, onSubmit }: LogWorkDialogProps) {
  const [workType, setWorkType] = useState<WorkType>('install');
  const [vendorId, setVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [addNew, setAddNew] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<WorkStatus>('scheduled');

  const reset = () => {
    setWorkType('install'); setVendorId(''); setNewVendorName('');
    setAddNew(false); setEquipment(''); setDescription('');
    setNotes(''); setScheduledDate(''); setStatus('scheduled');
  };

  const handleSubmit = () => {
    if (!description || !scheduledDate || !equipment) {
      toast({ title: 'Missing fields', description: 'Description, equipment, and date are required.', variant: 'destructive' });
      return;
    }
    const resolvedVendorId = addNew ? `new-${Date.now()}` : vendorId;
    const resolvedVendorName = addNew ? newVendorName : (vendors.find(v => v.vendorId === vendorId)?.name ?? '');
    onSubmit({
      workType, status, vendorId: resolvedVendorId, vendorName: resolvedVendorName,
      equipmentId: equipment.split(' — ')[0] ?? equipment,
      equipmentName: equipment.split(' — ')[1] ?? equipment,
      description, notes, scheduledDate,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-primary" />Log Contractor Work
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Work Type */}
          <div className="space-y-1.5">
            <Label>Work Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {WORK_TYPES.map(wt => (
                <button
                  key={wt.value}
                  onClick={() => setWorkType(wt.value)}
                  className={cn(
                    'flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all',
                    workType === wt.value ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <wt.icon className="w-3.5 h-3.5" />{wt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label>Vendor / Contractor</Label>
            {!addNew ? (
              <div className="flex gap-2">
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select existing vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.vendorId} value={v.vendorId}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setAddNew(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />New
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input placeholder="New vendor name" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => { setAddNew(false); setNewVendorName(''); }}>Cancel</Button>
              </div>
            )}
            {addNew && <p className="text-xs text-muted-foreground">Vendor will also be added to Vendor Hub.</p>}
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <Label>Equipment / System</Label>
            <Select value={equipment} onValueChange={setEquipment}>
              <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Input placeholder="Brief description of work" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Scheduled Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as WorkStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes / Findings</Label>
            <Textarea placeholder="Findings, materials used, recommendations..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[80px] resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}><CheckCircle className="w-4 h-4 mr-2" />Log Work</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContractorInstalls() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorkEntry[]>(MOCK_ENTRIES);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Try to load vendors from API
  useEffect(() => {
    const facilityId = user?.facilityId || 'facility-001';
    const token = getToken();
    if (!token) return;
    fetch(`${API_BASE}/vendors?facilityId=${facilityId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.vendors?.length) setVendors(d.vendors); })
      .catch(() => {});
  }, [user]);

  const handleLogWork = useCallback((data: Omit<WorkEntry, 'id' | 'createdAt' | 'createdBy' | 'facilityId'>) => {
    const newEntry: WorkEntry = {
      ...data,
      id: `ci-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Unknown',
      facilityId: user?.facilityId || 'facility-001',
    };
    setEntries(prev => [newEntry, ...prev]);
    // If new vendor, add to vendor list
    if (data.vendorId.startsWith('new-') && data.vendorName) {
      setVendors(prev => [...prev, { vendorId: data.vendorId, name: data.vendorName, specialty: [] }]);
      toast({ title: 'Vendor added', description: `${data.vendorName} was added to Vendor Hub.` });
    }
    toast({ title: 'Work logged', description: `${data.workType} entry created for ${data.equipmentName}.` });
  }, [user]);

  const filtered = entries.filter(e => {
    const matchSearch = !search ||
      e.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.equipmentName.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter   === 'all' || e.workType === typeFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const counts = WORK_TYPES.reduce((acc, wt) => {
    acc[wt.value] = entries.filter(e => e.workType === wt.value).length;
    return acc;
  }, {} as Record<WorkType, number>);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardHat className="w-7 h-7 text-primary" />Contractor Installs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Work history for all vendors · linked to equipment & vendor hub
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />Log New Work
          </Button>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {WORK_TYPES.map(wt => (
            <button
              key={wt.value}
              onClick={() => setTypeFilter(prev => prev === wt.value ? 'all' : wt.value)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                typeFilter === wt.value ? 'border-primary/50 bg-primary/10' : 'border-border/20 bg-card/50 hover:border-border/50'
              )}
            >
              <wt.icon className={cn('w-4 h-4 mb-1', wt.color)} />
              <p className="text-lg font-bold">{counts[wt.value]}</p>
              <p className="text-xs text-muted-foreground">{wt.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search vendor, equipment, description..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />Reset
          </Button>
        </div>

        {/* Work history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />Work History
              <Badge variant="outline" className="ml-auto text-xs">{filtered.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No work entries found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filtered.map(entry => {
                  const wt       = WORK_TYPES.find(w => w.value === entry.workType)!;
                  const sm       = STATUS_META[entry.status];
                  const expanded = expandedId === entry.id;
                  return (
                    <div key={entry.id}>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                        onClick={() => setExpandedId(expanded ? null : entry.id)}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <wt.icon className={cn('w-4 h-4 shrink-0', wt.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{entry.description}</span>
                              <Badge variant="outline" className={cn('text-[10px]', sm.color)}>{sm.label}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{entry.workType}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{entry.equipmentName}</span>
                              <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.vendorName}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{entry.scheduledDate}</span>
                            </div>
                          </div>
                          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </div>
                      </button>

                      {expanded && (
                        <div className="px-6 py-4 bg-accent/20 border-t border-border/20 space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><p className="text-xs text-muted-foreground">Equipment ID</p><p className="font-mono">{entry.equipmentId}</p></div>
                            <div><p className="text-xs text-muted-foreground">Vendor</p><p>{entry.vendorName}</p></div>
                            <div><p className="text-xs text-muted-foreground">Logged by</p><p>{entry.createdBy}</p></div>
                            <div><p className="text-xs text-muted-foreground">Scheduled</p><p>{entry.scheduledDate}</p></div>
                            {entry.completedDate && <div><p className="text-xs text-muted-foreground">Completed</p><p>{entry.completedDate}</p></div>}
                            <div><p className="text-xs text-muted-foreground">Record timestamp (ISO)</p><p className="font-mono text-xs">{entry.createdAt}</p></div>
                          </div>
                          {entry.notes && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" />Notes / Findings</p>
                              <p className="text-sm bg-background/40 rounded p-2.5 italic">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LogWorkDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        vendors={vendors}
        onSubmit={handleLogWork}
      />
    </MainLayout>
  );
}
