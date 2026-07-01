import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench, Plus, Calendar, Clock, AlertTriangle, CheckCircle2,
  Search, Filter, RefreshCw, ChevronRight, ClipboardList,
  Zap, Thermometer, Droplets, Activity, Target, Edit,
  CheckCheck, X, User, Package, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type PMFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
type PMStatus    = 'scheduled' | 'overdue' | 'in_progress' | 'completed';
type PMPriority  = 'low' | 'medium' | 'high' | 'critical';

interface PMSchedule {
  pmId: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  taskName: string;
  description: string;
  frequency: PMFrequency;
  lastCompleted?: string;
  nextDue: string;
  assignedTo: string;
  status: PMStatus;
  priority: PMPriority;
  estimatedHours: number;
  tags: string[];
  completionNotes?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<PMFrequency, string> = {
  daily:       'Daily',
  weekly:      'Weekly',
  bi_weekly:   'Bi-Weekly',
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  semi_annual: 'Semi-Annual',
  annual:      'Annual',
};

const FREQ_DAYS: Record<PMFrequency, number> = {
  daily: 1, weekly: 7, bi_weekly: 14, monthly: 30,
  quarterly: 90, semi_annual: 180, annual: 365,
};

const PRIORITY_CONFIG: Record<PMPriority, { label: string; color: string; badge: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  high:     { label: 'High',     color: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low:      { label: 'Low',      color: 'text-green-400',  badge: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

const EQUIP_ICONS: Record<string, any> = {
  boiler: Thermometer, chiller: Zap, pump: Droplets, hvac: Activity,
  compressor: Zap, cooling_tower: Droplets, generator: Zap,
  default: Wrench,
};

// ── Storage helpers ────────────────────────────────────────────────────────────

const PM_KEY = (fid: string) => `nexum_pm_schedules_${fid}`;

function loadPMs(facilityId: string): PMSchedule[] {
  try {
    const raw = localStorage.getItem(PM_KEY(facilityId));
    if (!raw) return seedPMs(facilityId);
    return JSON.parse(raw);
  } catch { return []; }
}

function savePMs(facilityId: string, pms: PMSchedule[]): void {
  try { localStorage.setItem(PM_KEY(facilityId), JSON.stringify(pms)); } catch {}
}

function nextDueFromFreq(frequency: PMFrequency, fromDate = new Date()): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + FREQ_DAYS[frequency]);
  return d.toISOString().split('T')[0];
}

function getDaysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function deriveStatus(pm: PMSchedule): PMStatus {
  if (pm.status === 'completed' || pm.status === 'in_progress') return pm.status;
  const days = getDaysUntil(pm.nextDue);
  return days < 0 ? 'overdue' : 'scheduled';
}

// ── Seed data (first load) ─────────────────────────────────────────────────────

function seedPMs(facilityId: string): PMSchedule[] {
  const today = new Date().toISOString().split('T')[0];
  const past  = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0]; };
  const fut   = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().split('T')[0]; };

  const seed: PMSchedule[] = [
    {
      pmId: 'pm-001', equipmentId: 'eq-boiler-1',
      equipmentName: 'Boiler B-1 (Main)', equipmentType: 'boiler',
      taskName: 'Monthly Boiler Blowdown & Inspection',
      description: 'Perform bottom blowdown, check water level gauge, inspect burner assembly, log stack temperature and steam pressure readings.',
      frequency: 'monthly', lastCompleted: past(12), nextDue: fut(18),
      assignedTo: 'J. Martinez', status: 'scheduled', priority: 'high',
      estimatedHours: 2, tags: ['boiler', 'blowdown', 'pressure'], createdAt: today,
    },
    {
      pmId: 'pm-002', equipmentId: 'eq-chiller-1',
      equipmentName: 'Chiller CH-1', equipmentType: 'chiller',
      taskName: 'Quarterly Chiller PM',
      description: 'Check refrigerant charge, clean condenser coils, verify approach temperatures, log evap/cond supply and return temps, inspect oil levels.',
      frequency: 'quarterly', lastCompleted: past(95), nextDue: past(5),
      assignedTo: 'R. Thompson', status: 'overdue', priority: 'critical',
      estimatedHours: 4, tags: ['chiller', 'refrigerant', 'efficiency'], createdAt: today,
    },
    {
      pmId: 'pm-003', equipmentId: 'eq-pump-hs1',
      equipmentName: 'Heating Supply Pump HS-1', equipmentType: 'pump',
      taskName: 'Monthly Pump Lubrication & Bearing Check',
      description: 'Lubricate motor bearings, check packing/mechanical seal, measure vibration, verify amps against nameplate, inspect coupling.',
      frequency: 'monthly', lastCompleted: past(8), nextDue: fut(22),
      assignedTo: 'J. Martinez', status: 'scheduled', priority: 'medium',
      estimatedHours: 1, tags: ['pump', 'lubrication', 'bearing'], createdAt: today,
    },
    {
      pmId: 'pm-004', equipmentId: 'eq-ahu-1',
      equipmentName: 'AHU-1 Main Air Handler', equipmentType: 'hvac',
      taskName: 'Filter Replacement & Belt Inspection',
      description: 'Replace all filters (MERV-13), inspect fan belts for wear, check belt tension, clean drain pan, verify economizer dampers operate freely.',
      frequency: 'bi_weekly', lastCompleted: past(3), nextDue: fut(11),
      assignedTo: 'S. Williams', status: 'scheduled', priority: 'medium',
      estimatedHours: 1.5, tags: ['air-handler', 'filter', 'belt'], createdAt: today,
    },
    {
      pmId: 'pm-005', equipmentId: 'eq-cooling-tower-1',
      equipmentName: 'Cooling Tower CT-1', equipmentType: 'cooling_tower',
      taskName: 'Weekly Water Treatment Check',
      description: 'Test conductivity, pH, inhibitor levels. Log bleed/feed rates. Inspect drift eliminators. Clean basin strainer. Verify biocide dosing.',
      frequency: 'weekly', lastCompleted: past(2), nextDue: fut(5),
      assignedTo: 'R. Thompson', status: 'scheduled', priority: 'high',
      estimatedHours: 1, tags: ['cooling-tower', 'water-treatment', 'chemistry'], createdAt: today,
    },
    {
      pmId: 'pm-006', equipmentId: 'eq-generator-1',
      equipmentName: 'Emergency Generator EG-1', equipmentType: 'generator',
      taskName: 'Monthly Load Test',
      description: 'Run under load for 30 minutes, log voltage/frequency, check coolant level, inspect exhaust, test auto-transfer switch, record fuel level.',
      frequency: 'monthly', lastCompleted: past(28), nextDue: past(2),
      assignedTo: 'M. Chen', status: 'overdue', priority: 'critical',
      estimatedHours: 1, tags: ['generator', 'load-test', 'electrical'], createdAt: today,
    },
    {
      pmId: 'pm-007', equipmentId: 'eq-compressor-1',
      equipmentName: 'Air Compressor AC-1', equipmentType: 'compressor',
      taskName: 'Annual Oil Change & Valve Inspection',
      description: 'Drain and replace compressor oil, inspect inlet and discharge valves, replace air/oil separator element, check belts, test safety relief valve.',
      frequency: 'annual', nextDue: fut(45),
      assignedTo: 'S. Williams', status: 'scheduled', priority: 'medium',
      estimatedHours: 3, tags: ['compressor', 'oil-change', 'annual'], createdAt: today,
    },
  ];

  savePMs(facilityId, seed);
  return seed;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: any; color: string;
}) {
  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-muted/30 shrink-0', color.replace('text-', 'bg-').replace('-400', '-500/10').replace('-500', '-500/10'))}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className={cn('text-[10px] mt-0.5', color)}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── PM row card ────────────────────────────────────────────────────────────────

function PMCard({ pm, onComplete, onEdit }: {
  pm: PMSchedule;
  onComplete: (pm: PMSchedule) => void;
  onEdit: (pm: PMSchedule) => void;
}) {
  const days   = getDaysUntil(pm.nextDue);
  const status = deriveStatus(pm);
  const EqIcon = EQUIP_ICONS[pm.equipmentType] || EQUIP_ICONS.default;
  const pri    = PRIORITY_CONFIG[pm.priority];

  const dueBadge = status === 'overdue'
    ? { text: `${Math.abs(days)}d overdue`, cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
    : status === 'completed'
    ? { text: 'Completed', cls: 'bg-green-500/15 text-green-400 border-green-500/30' }
    : status === 'in_progress'
    ? { text: 'In Progress', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
    : days <= 3
    ? { text: `Due in ${days}d`, cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' }
    : { text: `Due in ${days}d`, cls: 'bg-muted/40 text-muted-foreground border-border/40' };

  return (
    <Card className={cn(
      'border-border/40 hover:border-border/70 transition-all',
      status === 'overdue' ? 'border-l-2 border-l-red-500' : '',
      status === 'completed' ? 'opacity-60' : '',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Equipment icon */}
          <div className="w-10 h-10 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 mt-0.5">
            <EqIcon className="w-5 h-5 text-[#00FFE1]" />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-sm">{pm.taskName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pm.equipmentName} · {FREQ_LABELS[pm.frequency]}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <Badge variant="outline" className={cn('text-[10px] px-1.5', pri.badge)}>{pri.label}</Badge>
                <Badge variant="outline" className={cn('text-[10px] px-1.5', dueBadge.cls)}>{dueBadge.text}</Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pm.description}</p>

            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />{pm.assignedTo || 'Unassigned'}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{pm.estimatedHours}h est.
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />Next: {pm.nextDue}
              </span>
              {pm.lastCompleted && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />Last: {pm.lastCompleted}
                </span>
              )}
            </div>

            {pm.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {pm.tags.slice(0, 4).map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-muted/30 text-[10px] text-muted-foreground border border-border/30">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {status !== 'completed' && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-[#00FFE1]/30 text-[#00FFE1] hover:bg-[#00FFE1]/10"
                onClick={() => onComplete(pm)}>
                <CheckCheck className="w-3 h-3 mr-1" />Complete
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit(pm)}>
              <Edit className="w-3 h-3 mr-1" />Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create / Edit dialog ───────────────────────────────────────────────────────

const BLANK_FORM = {
  equipmentName: '', equipmentType: 'hvac', taskName: '', description: '',
  frequency: 'monthly' as PMFrequency, assignedTo: '', priority: 'medium' as PMPriority,
  estimatedHours: '1', tags: '', nextDue: '',
};

function PMFormDialog({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: typeof BLANK_FORM, pmId?: string) => void;
  initial?: PMSchedule;
}) {
  const [form, setForm] = useState(initial ? {
    equipmentName: initial.equipmentName,
    equipmentType: initial.equipmentType,
    taskName: initial.taskName,
    description: initial.description,
    frequency: initial.frequency,
    assignedTo: initial.assignedTo,
    priority: initial.priority,
    estimatedHours: String(initial.estimatedHours),
    tags: initial.tags.join(', '),
    nextDue: initial.nextDue,
  } : { ...BLANK_FORM });

  useEffect(() => {
    setForm(initial ? {
      equipmentName: initial.equipmentName, equipmentType: initial.equipmentType,
      taskName: initial.taskName, description: initial.description,
      frequency: initial.frequency, assignedTo: initial.assignedTo,
      priority: initial.priority, estimatedHours: String(initial.estimatedHours),
      tags: initial.tags.join(', '), nextDue: initial.nextDue,
    } : { ...BLANK_FORM });
  }, [initial, open]);

  // Auto-compute next due when frequency changes (only for new PMs)
  useEffect(() => {
    if (!initial && form.frequency) {
      setForm(f => ({ ...f, nextDue: nextDueFromFreq(f.frequency as PMFrequency) }));
    }
  }, [form.frequency, initial]);

  const f = (k: keyof typeof BLANK_FORM, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit PM Schedule' : 'New PM Schedule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Equipment Name</Label>
              <Input value={form.equipmentName} onChange={e => f('equipmentName', e.target.value)}
                placeholder="e.g. Boiler B-1 (Main)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Equipment Type</Label>
              <Select value={form.equipmentType} onValueChange={v => f('equipmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['boiler','chiller','pump','hvac','compressor','cooling_tower','generator','elevator','electrical','plumbing','other'].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => f('priority', v as PMPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['critical','high','medium','low'] as PMPriority[]).map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{PRIORITY_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Task Name</Label>
              <Input value={form.taskName} onChange={e => f('taskName', e.target.value)}
                placeholder="e.g. Monthly Boiler Blowdown & Inspection" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Description / Procedure</Label>
              <Textarea rows={3} value={form.description} onChange={e => f('description', e.target.value)}
                placeholder="Step-by-step maintenance procedure..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frequency</Label>
              <Select value={form.frequency} onValueChange={v => f('frequency', v as PMFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(FREQ_LABELS) as [PMFrequency, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Due Date</Label>
              <Input type="date" value={form.nextDue} onChange={e => f('nextDue', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned To</Label>
              <Input value={form.assignedTo} onChange={e => f('assignedTo', e.target.value)}
                placeholder="Technician name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Hours</Label>
              <Input type="number" min="0.5" step="0.5" value={form.estimatedHours}
                onChange={e => f('estimatedHours', e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => f('tags', e.target.value)}
                placeholder="boiler, blowdown, pressure" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-[#00FFE1]/15 text-[#00FFE1] border border-[#00FFE1]/30 hover:bg-[#00FFE1]/25"
              onClick={() => onSave(form, initial?.pmId)}
              disabled={!form.equipmentName || !form.taskName || !form.nextDue}
            >
              {initial ? 'Save Changes' : 'Create PM Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Complete dialog ────────────────────────────────────────────────────────────

function CompleteDialog({
  open, pm, onClose, onConfirm,
}: {
  open: boolean;
  pm: PMSchedule | null;
  onClose: () => void;
  onConfirm: (notes: string, completedBy: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [by, setBy]       = useState('');

  useEffect(() => { if (open) { setNotes(''); setBy(pm?.assignedTo || ''); } }, [open, pm]);

  if (!pm) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-[#00FFE1]" />Complete PM Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-sm font-medium">{pm.taskName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pm.equipmentName}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Completed By</Label>
            <Input value={by} onChange={e => setBy(e.target.value)} placeholder="Technician name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Completion Notes</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Findings, readings taken, parts replaced..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Next occurrence will be auto-scheduled: <span className="text-[#00FFE1]">{nextDueFromFreq(pm.frequency)}</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25"
              onClick={() => onConfirm(notes, by)}>
              <CheckCheck className="w-4 h-4 mr-1.5" />Mark Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PreventiveMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';

  const [pms, setPMs] = useState<PMSchedule[]>([]);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<PMPriority | 'all'>('all');
  const [filterType, setFilterType] = useState('all');
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'completed' | 'all'>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPM, setEditPM] = useState<PMSchedule | null>(null);
  const [completePM, setCompletePM] = useState<PMSchedule | null>(null);

  useEffect(() => {
    setPMs(loadPMs(facilityId));
  }, [facilityId]);

  // Derive statuses
  const enriched = useMemo(() => pms.map(pm => ({ ...pm, status: deriveStatus(pm) })), [pms]);

  // Stats
  const stats = useMemo(() => {
    const overdue    = enriched.filter(p => p.status === 'overdue').length;
    const upcoming7  = enriched.filter(p => p.status === 'scheduled' && getDaysUntil(p.nextDue) <= 7).length;
    const thisMonth  = enriched.filter(p => p.status === 'completed' && p.completedAt?.startsWith(new Date().toISOString().slice(0, 7))).length;
    const totalHours = enriched.filter(p => p.status !== 'completed').reduce((s, p) => s + p.estimatedHours, 0);
    return { overdue, upcoming7, thisMonth, totalHours };
  }, [enriched]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(pm => {
      if (tab === 'upcoming'  && pm.status !== 'scheduled' && pm.status !== 'in_progress') return false;
      if (tab === 'overdue'   && pm.status !== 'overdue')  return false;
      if (tab === 'completed' && pm.status !== 'completed') return false;
      if (filterPriority !== 'all' && pm.priority !== filterPriority) return false;
      if (filterType !== 'all' && pm.equipmentType !== filterType) return false;
      if (q && !pm.taskName.toLowerCase().includes(q) && !pm.equipmentName.toLowerCase().includes(q) &&
          !pm.assignedTo.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      if (a.priority === 'critical' && b.priority !== 'critical') return -1;
      if (b.priority === 'critical' && a.priority !== 'critical') return 1;
      return new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime();
    });
  }, [enriched, tab, filterPriority, filterType, search]);

  const handleSave = useCallback((form: typeof BLANK_FORM, pmId?: string) => {
    setPMs(prev => {
      let updated: PMSchedule[];
      if (pmId) {
        updated = prev.map(p => p.pmId === pmId ? {
          ...p,
          equipmentName: form.equipmentName, equipmentType: form.equipmentType,
          taskName: form.taskName, description: form.description,
          frequency: form.frequency as PMFrequency, assignedTo: form.assignedTo,
          priority: form.priority as PMPriority,
          estimatedHours: parseFloat(form.estimatedHours) || 1,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          nextDue: form.nextDue,
        } : p);
      } else {
        const newPM: PMSchedule = {
          pmId: `pm-${Date.now()}`,
          equipmentId: `eq-${Date.now()}`,
          equipmentName: form.equipmentName, equipmentType: form.equipmentType,
          taskName: form.taskName, description: form.description,
          frequency: form.frequency as PMFrequency, assignedTo: form.assignedTo,
          priority: form.priority as PMPriority,
          estimatedHours: parseFloat(form.estimatedHours) || 1,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          nextDue: form.nextDue, status: 'scheduled',
          createdAt: new Date().toISOString().split('T')[0],
        };
        updated = [...prev, newPM];
      }
      savePMs(facilityId, updated);
      return updated;
    });
    setCreateOpen(false);
    setEditPM(null);
    toast({ title: pmId ? 'PM schedule updated' : 'PM schedule created', description: form.taskName });
  }, [facilityId, toast]);

  const handleComplete = useCallback((notes: string, completedBy: string) => {
    if (!completePM) return;
    const now = new Date().toISOString().split('T')[0];
    setPMs(prev => {
      const updated = prev.map(p => p.pmId === completePM.pmId ? {
        ...p,
        status: 'completed' as PMStatus,
        lastCompleted: now,
        completedAt: now,
        completedBy: completedBy || p.assignedTo,
        completionNotes: notes,
        nextDue: nextDueFromFreq(p.frequency),
      } : p);
      savePMs(facilityId, updated);
      return updated;
    });
    setCompletePM(null);
    toast({ title: 'PM completed', description: `${completePM.taskName} — next due auto-scheduled` });
  }, [completePM, facilityId, toast]);

  // Unique equipment types for filter
  const equipTypes = useMemo(() => [...new Set(pms.map(p => p.equipmentType))], [pms]);

  // Compliance progress (% of non-overdue scheduled PMs)
  const compliancePct = useMemo(() => {
    const total = enriched.filter(p => p.status !== 'completed').length;
    const ontrack = enriched.filter(p => p.status === 'scheduled' || p.status === 'in_progress').length;
    return total > 0 ? Math.round((ontrack / total) * 100) : 100;
  }, [enriched]);

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00FFE1]/10 border border-[#00FFE1]/20 shrink-0">
              <Wrench className="w-5 h-5 text-[#00FFE1]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Preventive Maintenance</h1>
              <p className="text-xs text-muted-foreground">Schedule, track, and complete recurring PM tasks across all assets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPMs(loadPMs(facilityId))}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
            </Button>
            <Button size="sm"
              className="bg-[#00FFE1]/15 text-[#00FFE1] border border-[#00FFE1]/30 hover:bg-[#00FFE1]/25"
              onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />New PM Schedule
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Overdue Tasks" value={stats.overdue} icon={AlertTriangle}
            color="text-red-400" sub={stats.overdue > 0 ? 'Requires immediate action' : 'None overdue'} />
          <StatCard label="Due This Week" value={stats.upcoming7} icon={Calendar}
            color="text-orange-400" sub="Within next 7 days" />
          <StatCard label="Completed This Month" value={stats.thisMonth} icon={CheckCircle2}
            color="text-green-400" sub="Closed out" />
          <StatCard label="Pending Hours" value={`${stats.totalHours}h`} icon={Clock}
            color="text-[#00FFE1]" sub="Estimated workload" />
        </div>

        {/* PM Compliance bar */}
        <Card className="border-border/40 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00FFE1]" />
                <span className="text-sm font-medium">PM Compliance Rate</span>
              </div>
              <span className={cn('text-sm font-bold',
                compliancePct >= 90 ? 'text-green-400' : compliancePct >= 70 ? 'text-yellow-400' : 'text-red-400'
              )}>{compliancePct}%</span>
            </div>
            <Progress value={compliancePct}
              className={cn('h-2', compliancePct >= 90 ? '[&>div]:bg-green-500' : compliancePct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500')} />
            <p className="text-xs text-muted-foreground mt-1.5">
              {enriched.filter(p => p.status === 'scheduled').length} on track · {stats.overdue} overdue · {enriched.filter(p => p.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Search tasks, equipment, assignee..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPriority} onValueChange={v => setFilterPriority(v as any)}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {(['critical','high','medium','low'] as PMPriority[]).map(p => (
                <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {equipTypes.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs + list */}
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
          <TabsList className="h-8">
            <TabsTrigger value="upcoming" className="text-xs">
              Upcoming
              {enriched.filter(p => p.status === 'scheduled' || p.status === 'in_progress').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                  {enriched.filter(p => p.status === 'scheduled' || p.status === 'in_progress').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Overdue
              {stats.overdue > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {stats.overdue}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>

          {(['upcoming', 'overdue', 'completed', 'all'] as const).map(t => (
            <TabsContent key={t} value={t} className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No PM tasks in this view</p>
                  {t === 'upcoming' && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Schedule your first PM
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map(pm => (
                  <PMCard key={pm.pmId} pm={pm}
                    onComplete={p => setCompletePM(p)}
                    onEdit={p => setEditPM(p)}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Dialogs */}
      <PMFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleSave} />
      <PMFormDialog open={!!editPM} initial={editPM || undefined}
        onClose={() => setEditPM(null)} onSave={handleSave} />
      <CompleteDialog open={!!completePM} pm={completePM}
        onClose={() => setCompletePM(null)} onConfirm={handleComplete} />
    </MainLayout>
  );
}
