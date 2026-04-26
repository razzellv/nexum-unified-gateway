import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ClipboardList, Users, FileSearch, Package, Plus, X, ChevronDown, ChevronRight,
  Trash2, Star, AlertTriangle, Wrench, DollarSign, CalendarClock, ShieldCheck,
  Thermometer, Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type WOStatus = 'draft' | 'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
type QuoteStatus = 'open' | 'closed' | 'awarded' | 'cancelled';
type MaterialCategory = 'filters' | 'belts' | 'bearings' | 'refrigerant' | 'controls' | 'piping' | 'electrical' | 'other';

interface WOLineItem {
  description: string;
  qty: number;
  unitCost: number;
}

interface WorkOrder {
  id: string;
  woNumber: string;
  vendorId: string;
  vendorName: string;
  items: WOLineItem[];
  status: WOStatus;
  createdDate: string;
  scheduledDate?: string;
  completedDate?: string;
  equipmentSystem: string;
  workType: string;
  notes?: string;
  totalCost: number;
}

interface VendorRecord {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  serviceCategory: string;
  rating: number;
  leadTimeDays: number;
  paymentTerms?: string;
  licenseNumber?: string;
  insuranceExpiry?: string;
  assignedSystems: string[];
  notes?: string;
  addedAt: string;
}

interface ServiceQuote {
  id: string;
  title: string;
  equipmentSystem: string;
  workScope: string;
  deadline?: string;
  status: QuoteStatus;
  bids: Array<{
    vendor: string;
    amount: number;
    leadTime: string;
    notes: string;
  }>;
  awardedTo?: string;
  createdAt: string;
}

interface MaterialEntry {
  id: string;
  date: string;
  itemName: string;
  category: MaterialCategory;
  quantity: number;
  unitCost: number;
  totalCost: number;
  linkedWO?: string;
  appliedTo: string;
  notes?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1', woNumber: 'WO-2025-0041', vendorId: 'v-1', vendorName: 'Arctic Systems HVAC',
    items: [
      { description: 'Chiller tube cleaning — 450-ton unit', qty: 1, unitCost: 3200 },
      { description: 'Chemical descaling treatment', qty: 2, unitCost: 480 },
    ],
    status: 'completed', createdDate: '2025-03-10', scheduledDate: '2025-03-18',
    completedDate: '2025-03-19', equipmentSystem: 'Chiller', workType: 'Preventive Maintenance',
    notes: 'Tube fouling factor improved from 0.0015 to 0.0003 post-cleaning.',
    totalCost: 4160,
  },
  {
    id: 'wo-2', woNumber: 'WO-2025-0042', vendorId: 'v-1', vendorName: 'Arctic Systems HVAC',
    items: [
      { description: 'Cooling tower fan motor replacement — 25HP', qty: 1, unitCost: 2750 },
      { description: 'Motor coupling alignment', qty: 1, unitCost: 350 },
      { description: 'Labor — motor swap & commissioning', qty: 6, unitCost: 125 },
    ],
    status: 'in_progress', createdDate: '2025-04-01', scheduledDate: '2025-04-22',
    equipmentSystem: 'Cooling Tower', workType: 'Corrective Repair',
    notes: 'Motor vibration exceeded 0.25 in/s RMS. Parts on order.',
    totalCost: 3850,
  },
  {
    id: 'wo-3', woNumber: 'WO-2025-0043', vendorId: 'v-4', vendorName: 'Pinnacle Controls Group',
    items: [
      { description: 'BAS controller firmware upgrade — Trane Tracer', qty: 3, unitCost: 680 },
      { description: 'DDC sensor recalibration', qty: 12, unitCost: 45 },
    ],
    status: 'approved', createdDate: '2025-04-10', scheduledDate: '2025-05-05',
    equipmentSystem: 'Building Automation System', workType: 'Software / Controls',
    notes: 'Firmware 5.2.1 required for integration with new energy management platform.',
    totalCost: 2580,
  },
  {
    id: 'wo-4', woNumber: 'WO-2025-0044', vendorId: 'v-3', vendorName: 'BlueLine Mechanical',
    items: [
      { description: 'AHU-7 coil replacement — 12-row DX coil', qty: 1, unitCost: 5400 },
      { description: 'Refrigerant recovery & recharge (R-410A)', qty: 1, unitCost: 920 },
      { description: 'Labor — crane lift & installation', qty: 10, unitCost: 145 },
    ],
    status: 'requested', createdDate: '2025-04-18', equipmentSystem: 'AHU-7',
    workType: 'Major Repair', notes: 'Coil leak confirmed via electronic detector. Unit offline.',
    totalCost: 7770,
  },
  {
    id: 'wo-5', woNumber: 'WO-2025-0045', vendorId: 'v-2', vendorName: 'Meridian Electrical Services',
    items: [
      { description: 'Variable frequency drive replacement — 30HP', qty: 1, unitCost: 3100 },
      { description: 'VFD programming & parameter set', qty: 1, unitCost: 400 },
    ],
    status: 'draft', createdDate: '2025-04-22',
    equipmentSystem: 'Pump Station', workType: 'Equipment Replacement',
    notes: 'VFD faulting on over-current. Pump P-12 on bypass.',
    totalCost: 3500,
  },
];

const MOCK_VENDORS: VendorRecord[] = [
  {
    id: 'v-1', name: 'Arctic Systems HVAC', contact: 'Derek Holt', email: 'dholt@arcticsystems.com',
    phone: '(312) 555-0182', serviceCategory: 'HVAC', rating: 5, leadTimeDays: 3,
    paymentTerms: 'Net 30', licenseNumber: 'IL-HVAC-29841', insuranceExpiry: '2026-01-15',
    assignedSystems: ['Chiller', 'Cooling Tower', 'AHU'], notes: 'Preferred vendor — 10-yr relationship.',
    addedAt: '2022-06-01',
  },
  {
    id: 'v-2', name: 'Meridian Electrical Services', contact: 'Sandra Yee', email: 'syee@meridianelec.com',
    phone: '(312) 555-0247', serviceCategory: 'Electrical', rating: 4, leadTimeDays: 5,
    paymentTerms: 'Net 45', licenseNumber: 'IL-EC-77302', insuranceExpiry: '2025-06-10',
    assignedSystems: ['Pump Station', 'MCC', 'Lighting'], notes: 'Strong on industrial MCC work.',
    addedAt: '2023-01-15',
  },
  {
    id: 'v-3', name: 'BlueLine Mechanical', contact: 'Tom Farrell', email: 'tfarrell@bluelinemech.com',
    phone: '(773) 555-0391', serviceCategory: 'Mechanical', rating: 4, leadTimeDays: 7,
    paymentTerms: 'Net 30', licenseNumber: 'IL-MECH-50214', insuranceExpiry: '2025-05-30',
    assignedSystems: ['AHU', 'FCU', 'Hydronic Piping'],
    notes: 'Good on refrigeration; slower on scheduling during peak season.',
    addedAt: '2023-07-20',
  },
  {
    id: 'v-4', name: 'Pinnacle Controls Group', contact: 'Alicia Romero', email: 'aromero@pinnaclecontrols.com',
    phone: '(630) 555-0518', serviceCategory: 'Controls', rating: 5, leadTimeDays: 4,
    paymentTerms: 'Net 30', licenseNumber: 'IL-CTRL-18843', insuranceExpiry: '2026-03-22',
    assignedSystems: ['BAS', 'DDC', 'Trane Tracer', 'Niagara N4'],
    notes: 'Certified Trane and Niagara integrator.', addedAt: '2021-11-10',
  },
  {
    id: 'v-5', name: 'ColdChain Refrigeration', contact: 'Marcus Webb', email: 'mwebb@coldchainref.com',
    phone: '(847) 555-0673', serviceCategory: 'Refrigeration', rating: 3, leadTimeDays: 10,
    paymentTerms: 'Net 60', licenseNumber: 'IL-REF-34509', insuranceExpiry: '2025-04-05',
    assignedSystems: ['Walk-in Coolers', 'Process Chillers', 'Condensing Units'],
    notes: 'Competitive pricing but longer lead times on parts.', addedAt: '2024-02-01',
  },
];

const MOCK_QUOTES: ServiceQuote[] = [
  {
    id: 'q-1', title: 'Annual Chiller PM Contract', equipmentSystem: 'Chiller',
    workScope: 'Full-scope annual preventive maintenance contract for (2) 450-ton York centrifugal chillers. Includes: tube cleaning, oil analysis, refrigerant charge check, eddy-current testing, vibration analysis, controls calibration, and startup/shutdown.',
    deadline: '2025-05-15', status: 'open',
    bids: [
      { vendor: 'Arctic Systems HVAC', amount: 28500, leadTime: '14 days', notes: 'Includes 2 emergency call-outs.' },
      { vendor: 'BlueLine Mechanical', amount: 31200, leadTime: '10 days', notes: 'Eddy-current testing sub-contracted.' },
    ],
    createdAt: '2025-04-05',
  },
  {
    id: 'q-2', title: 'Cooling Tower Basin Rebuild', equipmentSystem: 'Cooling Tower',
    workScope: 'Full basin cleaning, inspecting, and recoating for (3) induced-draft cooling towers. Replace fill media on Tower CT-2. Repair cold-water basin cracks with epoxy mortar. Replace float valve assemblies on all three units.',
    deadline: '2025-06-01', status: 'awarded', awardedTo: 'Arctic Systems HVAC',
    bids: [
      { vendor: 'Arctic Systems HVAC', amount: 19800, leadTime: '21 days', notes: 'Fill media sourced from Brentwood Industries.' },
      { vendor: 'BlueLine Mechanical', amount: 22400, leadTime: '18 days', notes: 'Price includes scaffolding rental.' },
      { vendor: 'ColdChain Refrigeration', amount: 24100, leadTime: '30 days', notes: 'Limited cooling tower experience noted.' },
    ],
    createdAt: '2025-03-20',
  },
  {
    id: 'q-3', title: 'Building Automation Upgrade — Phase 2', equipmentSystem: 'BAS / DDC',
    workScope: 'Upgrade existing Andover Continuum controllers to Niagara N4 framework. Migrate all 240 data points. Re-commission AHU schedules and setpoints. Provide graphics package for new Supervisor workstation. Training for facilities staff.',
    deadline: '2025-07-30', status: 'open',
    bids: [
      { vendor: 'Pinnacle Controls Group', amount: 87500, leadTime: '45 days', notes: 'Niagara certified; includes 1-yr warranty on programming.' },
    ],
    createdAt: '2025-04-12',
  },
];

const MOCK_MATERIALS: MaterialEntry[] = [
  {
    id: 'm-1', date: '2025-04-20', itemName: 'MERV-13 Filters 20x25x4', category: 'filters',
    quantity: 48, unitCost: 18.50, totalCost: 888, linkedWO: 'WO-2025-0041', appliedTo: 'AHU-1 through AHU-6',
    notes: 'Quarterly filter change.',
  },
  {
    id: 'm-2', date: '2025-04-18', itemName: 'AHU Fan Belt — B-78', category: 'belts',
    quantity: 6, unitCost: 22.00, totalCost: 132, linkedWO: 'WO-2025-0042', appliedTo: 'AHU-3, AHU-5',
    notes: 'Matched set replacement.',
  },
  {
    id: 'm-3', date: '2025-04-15', itemName: 'Pump Bearing 6205-2RS', category: 'bearings',
    quantity: 4, unitCost: 38.75, totalCost: 155, linkedWO: 'WO-2025-0045', appliedTo: 'Pump P-12',
    notes: 'Bearing noise detected on vibration survey.',
  },
  {
    id: 'm-4', date: '2025-04-12', itemName: 'R-410A Refrigerant (25 lb cylinder)', category: 'refrigerant',
    quantity: 3, unitCost: 210.00, totalCost: 630, linkedWO: 'WO-2025-0044', appliedTo: 'AHU-7 DX Coil',
    notes: 'Charge added after coil repair and pressure test.',
  },
  {
    id: 'm-5', date: '2025-04-10', itemName: 'Trane Tracer UC400 Controller', category: 'controls',
    quantity: 2, unitCost: 680.00, totalCost: 1360, linkedWO: 'WO-2025-0043', appliedTo: 'AHU-8, AHU-9',
    notes: 'Replaced failed controllers.',
  },
  {
    id: 'm-6', date: '2025-04-08', itemName: '2" Copper Pipe Fittings (assorted)', category: 'piping',
    quantity: 20, unitCost: 14.25, totalCost: 285, appliedTo: 'Hydronic Supply Main — Level 3',
    notes: 'Repair of small leak at union joint.',
  },
  {
    id: 'm-7', date: '2025-04-05', itemName: '30A Circuit Breaker — Square D QO', category: 'electrical',
    quantity: 3, unitCost: 42.00, totalCost: 126, linkedWO: 'WO-2025-0045', appliedTo: 'MCC Panel B',
    notes: 'Breakers replaced during VFD installation.',
  },
  {
    id: 'm-8', date: '2025-04-02', itemName: 'Vibration Isolation Pads — 6"x6"', category: 'other',
    quantity: 8, unitCost: 12.50, totalCost: 100, appliedTo: 'Pump P-12, P-13',
    notes: 'Installed during pump realignment.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function woStatusColor(status: WOStatus): string {
  return {
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    requested: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    approved: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    in_progress: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[status] ?? 'bg-gray-500/20 text-gray-400';
}

function quoteStatusColor(status: QuoteStatus): string {
  return {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    awarded: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[status] ?? 'bg-gray-500/20 text-gray-400';
}

function materialCategoryColor(cat: MaterialCategory): string {
  return {
    filters: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    belts: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bearings: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    refrigerant: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    controls: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    piping: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    electrical: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }[cat] ?? 'bg-gray-500/20 text-gray-400';
}

function insuranceBadge(expiry?: string): JSX.Element | null {
  if (!expiry) return null;
  const exp = new Date(expiry);
  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-1">Expired</Badge>;
  if (diffDays <= 60) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs ml-1">Expiring Soon</Badge>;
  return null;
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Tab: Work Orders ────────────────────────────────────────────────────────

function WorkOrdersTab() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() =>
    loadFromStorage<WorkOrder>('foi_work_orders', MOCK_WORK_ORDERS)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    vendorName: '', equipmentSystem: '', workType: '', scheduledDate: '', notes: '',
  });
  const [lineItems, setLineItems] = useState<WOLineItem[]>([{ description: '', qty: 1, unitCost: 0 }]);

  const totalSpend = workOrders.reduce((s, w) => s + w.totalCost, 0);
  const openCount = workOrders.filter(w => ['requested', 'approved', 'in_progress', 'draft'].includes(w.status)).length;
  const completedCount = workOrders.filter(w => w.status === 'completed').length;

  function updateStatus(id: string, status: WOStatus) {
    const updated = workOrders.map(w => w.id === id ? { ...w, status } : w);
    setWorkOrders(updated);
    saveToStorage('foi_work_orders', updated);
    toast({ title: 'Status updated', description: `Work order updated to ${status.replace('_', ' ')}.` });
  }

  function addLineItem() {
    setLineItems([...lineItems, { description: '', qty: 1, unitCost: 0 }]);
  }

  function removeLineItem(i: number) {
    setLineItems(lineItems.filter((_, idx) => idx !== i));
  }

  function updateLineItem(i: number, field: keyof WOLineItem, val: string | number) {
    setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: val } : li));
  }

  function saveWorkOrder() {
    if (!form.vendorName || !form.equipmentSystem || !form.workType) {
      toast({ title: 'Missing fields', description: 'Vendor, equipment system, and work type are required.', variant: 'destructive' });
      return;
    }
    const totalCost = lineItems.reduce((s, li) => s + (li.qty * li.unitCost), 0);
    const wo: WorkOrder = {
      id: `wo-${Date.now()}`,
      woNumber: `WO-${Date.now()}`,
      vendorId: `v-${Date.now()}`,
      vendorName: form.vendorName,
      items: lineItems,
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0],
      scheduledDate: form.scheduledDate || undefined,
      equipmentSystem: form.equipmentSystem,
      workType: form.workType,
      notes: form.notes || undefined,
      totalCost,
    };
    const updated = [wo, ...workOrders];
    setWorkOrders(updated);
    saveToStorage('foi_work_orders', updated);
    setForm({ vendorName: '', equipmentSystem: '', workType: '', scheduledDate: '', notes: '' });
    setLineItems([{ description: '', qty: 1, unitCost: 0 }]);
    setShowForm(false);
    toast({ title: 'Work order created', description: `${wo.woNumber} saved.` });
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total WOs', value: workOrders.length, icon: <ClipboardList className="h-4 w-4 text-blue-400" /> },
          { label: 'Open', value: openCount, icon: <CalendarClock className="h-4 w-4 text-cyan-400" /> },
          { label: 'Completed', value: completedCount, icon: <ShieldCheck className="h-4 w-4 text-green-400" /> },
          { label: 'Total Spend', value: fmt(totalSpend), icon: <DollarSign className="h-4 w-4 text-amber-400" /> },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Work Orders</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> New Work Order
        </Button>
      </div>

      {/* New WO form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              New Work Order
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Vendor / Contractor</label>
                <Input value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} placeholder="Arctic Systems HVAC" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Equipment / System</label>
                <Input value={form.equipmentSystem} onChange={e => setForm({ ...form, equipmentSystem: e.target.value })} placeholder="Chiller, AHU-7, Pump P-12…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Work Type</label>
                <Input value={form.workType} onChange={e => setForm({ ...form, workType: e.target.value })} placeholder="Preventive Maintenance, Corrective Repair…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Scheduled Date</label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional context…" rows={2} />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Line Items</p>
                <Button size="sm" variant="outline" onClick={addLineItem} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Input value={li.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Description" className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={li.qty} min={1} onChange={e => updateLineItem(i, 'qty', Number(e.target.value))} placeholder="Qty" className="h-8 text-xs" />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" value={li.unitCost} min={0} step={0.01} onChange={e => updateLineItem(i, 'unitCost', Number(e.target.value))} placeholder="Unit Cost" className="h-8 text-xs" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLineItem(i)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                Total: <span className="text-foreground font-semibold">{fmt(lineItems.reduce((s, li) => s + li.qty * li.unitCost, 0))}</span>
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={saveWorkOrder}>Save Work Order</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WO list */}
      <div className="space-y-2">
        {workOrders.map(wo => (
          <Card key={wo.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === wo.id ? null : wo.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandedId === wo.id
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{wo.woNumber}</span>
                      <Badge className={cn('text-xs border', woStatusColor(wo.status))}>
                        {wo.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {wo.vendorName} · {wo.equipmentSystem} · {wo.workType}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-foreground">{fmt(wo.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">{wo.createdDate}</p>
                </div>
              </div>

              {expandedId === wo.id && (
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  {/* Line items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border">
                          <th className="text-left pb-1">Description</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">Unit Cost</th>
                          <th className="text-right pb-1">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wo.items.map((item, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-1 text-foreground">{item.description}</td>
                            <td className="py-1 text-right text-muted-foreground">{item.qty}</td>
                            <td className="py-1 text-right text-muted-foreground">{fmt(item.unitCost)}</td>
                            <td className="py-1 text-right font-medium text-foreground">{fmt(item.qty * item.unitCost)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="pt-2 text-right text-muted-foreground font-medium">Total</td>
                          <td className="pt-2 text-right font-bold text-foreground">{fmt(wo.totalCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {wo.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{wo.notes}</p>
                  )}
                  {/* Status update */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Update status:</span>
                    <Select value={wo.status} onValueChange={v => updateStatus(wo.id, v as WOStatus)}>
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['draft','requested','approved','in_progress','completed','cancelled'] as WOStatus[]).map(s => (
                          <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Vendors ─────────────────────────────────────────────────────────────

function VendorsTab() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<VendorRecord[]>(() =>
    loadFromStorage<VendorRecord>('foi_vendors', MOCK_VENDORS)
  );
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'rating'>('name');

  const [form, setForm] = useState({
    name: '', contact: '', email: '', phone: '', serviceCategory: 'HVAC',
    leadTimeDays: '', paymentTerms: '', licenseNumber: '', insuranceExpiry: '',
    assignedSystems: '', notes: '',
  });

  function saveVendor() {
    if (!form.name || !form.contact || !form.serviceCategory) {
      toast({ title: 'Missing fields', description: 'Name, contact, and service category are required.', variant: 'destructive' });
      return;
    }
    const v: VendorRecord = {
      id: `v-${Date.now()}`,
      name: form.name, contact: form.contact,
      email: form.email || undefined, phone: form.phone || undefined,
      serviceCategory: form.serviceCategory,
      rating: 3, leadTimeDays: Number(form.leadTimeDays) || 7,
      paymentTerms: form.paymentTerms || undefined,
      licenseNumber: form.licenseNumber || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      assignedSystems: form.assignedSystems.split(',').map(s => s.trim()).filter(Boolean),
      notes: form.notes || undefined,
      addedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [v, ...vendors];
    setVendors(updated);
    saveToStorage('foi_vendors', updated);
    setForm({ name: '', contact: '', email: '', phone: '', serviceCategory: 'HVAC', leadTimeDays: '', paymentTerms: '', licenseNumber: '', insuranceExpiry: '', assignedSystems: '', notes: '' });
    setShowForm(false);
    toast({ title: 'Vendor added', description: `${v.name} saved.` });
  }

  const sorted = [...vendors].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'category') return a.serviceCategory.localeCompare(b.serviceCategory);
    return b.rating - a.rating;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {(['name','category','rating'] as const).map(s => (
            <Button key={s} size="sm" variant={sortBy === s ? 'default' : 'outline'}
              className="h-7 text-xs" onClick={() => setSortBy(s)}>
              Sort by {s}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Add Vendor / Contractor
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company Name</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Arctic Systems HVAC" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Primary Contact</label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(312) 555-0100" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Service Category</label>
                <Select value={form.serviceCategory} onValueChange={v => setForm({ ...form, serviceCategory: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['HVAC','Electrical','Plumbing','Controls','Mechanical','Refrigeration','Fire Safety'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Avg Lead Time (days)</label>
                <Input type="number" value={form.leadTimeDays} onChange={e => setForm({ ...form, leadTimeDays: e.target.value })} placeholder="7" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Payment Terms</label>
                <Input value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">License Number</label>
                <Input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="IL-HVAC-12345" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Insurance Expiry</label>
                <Input type="date" value={form.insuranceExpiry} onChange={e => setForm({ ...form, insuranceExpiry: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assigned Systems (comma-separated)</label>
                <Input value={form.assignedSystems} onChange={e => setForm({ ...form, assignedSystems: e.target.value })} placeholder="Chiller, AHU, Cooling Tower" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={saveVendor}>Save Vendor</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-3">Company</th>
              <th className="text-left py-2 pr-3">Category</th>
              <th className="text-left py-2 pr-3">Contact</th>
              <th className="text-left py-2 pr-3">Rating</th>
              <th className="text-left py-2 pr-3">Lead Time</th>
              <th className="text-left py-2 pr-3">Assigned Systems</th>
              <th className="text-left py-2">Insurance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(v => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-muted/10">
                <td className="py-2 pr-3">
                  <p className="font-medium text-foreground">{v.name}</p>
                  {v.licenseNumber && <p className="text-xs text-muted-foreground">{v.licenseNumber}</p>}
                </td>
                <td className="py-2 pr-3">
                  <Badge variant="outline" className="text-xs">{v.serviceCategory}</Badge>
                </td>
                <td className="py-2 pr-3">
                  <p className="text-foreground">{v.contact}</p>
                  {v.email && <p className="text-xs text-muted-foreground">{v.email}</p>}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-3 w-3', i < v.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground')} />
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{v.leadTimeDays}d</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {v.assignedSystems.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    {v.insuranceExpiry && (
                      <span className="text-xs text-muted-foreground">{v.insuranceExpiry}</span>
                    )}
                    {insuranceBadge(v.insuranceExpiry)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Service Quotes ──────────────────────────────────────────────────────

function QuotesTab() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<ServiceQuote[]>(() =>
    loadFromStorage<ServiceQuote>('foi_quotes', MOCK_QUOTES)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ title: '', equipmentSystem: '', workScope: '', deadline: '' });
  const [bidRows, setBidRows] = useState<Array<{ vendor: string; amount: string; leadTime: string; notes: string }>>([
    { vendor: '', amount: '', leadTime: '', notes: '' },
  ]);

  function addBidRow() {
    setBidRows([...bidRows, { vendor: '', amount: '', leadTime: '', notes: '' }]);
  }

  function removeBidRow(i: number) {
    setBidRows(bidRows.filter((_, idx) => idx !== i));
  }

  function updateBidRow(i: number, field: string, val: string) {
    setBidRows(bidRows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function saveQuote() {
    if (!form.title || !form.equipmentSystem || !form.workScope) {
      toast({ title: 'Missing fields', description: 'Title, equipment system, and work scope are required.', variant: 'destructive' });
      return;
    }
    const q: ServiceQuote = {
      id: `q-${Date.now()}`,
      title: form.title, equipmentSystem: form.equipmentSystem,
      workScope: form.workScope, deadline: form.deadline || undefined,
      status: 'open',
      bids: bidRows.filter(r => r.vendor).map(r => ({
        vendor: r.vendor, amount: Number(r.amount) || 0, leadTime: r.leadTime, notes: r.notes,
      })),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [q, ...quotes];
    setQuotes(updated);
    saveToStorage('foi_quotes', updated);
    setForm({ title: '', equipmentSystem: '', workScope: '', deadline: '' });
    setBidRows([{ vendor: '', amount: '', leadTime: '', notes: '' }]);
    setShowForm(false);
    toast({ title: 'Quote request created', description: `${q.title} saved.` });
  }

  function awardBid(quoteId: string, vendorName: string) {
    const updated = quotes.map(q =>
      q.id === quoteId ? { ...q, status: 'awarded' as QuoteStatus, awardedTo: vendorName } : q
    );
    setQuotes(updated);
    saveToStorage('foi_quotes', updated);
    toast({ title: 'Quote awarded', description: `Awarded to ${vendorName}.` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Service Quotes</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> New Quote Request
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              New Quote Request
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Annual Chiller PM Contract" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Equipment / System</label>
                <Input value={form.equipmentSystem} onChange={e => setForm({ ...form, equipmentSystem: e.target.value })} placeholder="Chiller, BAS, Cooling Tower…" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Work Scope</label>
                <Textarea value={form.workScope} onChange={e => setForm({ ...form, workScope: e.target.value })} placeholder="Describe the scope of work…" rows={3} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bid Deadline</label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>

            {/* Bid rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Bids</p>
                <Button size="sm" variant="outline" onClick={addBidRow} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Add Bid
                </Button>
              </div>
              {bidRows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <div className="col-span-3">
                    <Input value={r.vendor} onChange={e => updateBidRow(i, 'vendor', e.target.value)} placeholder="Vendor" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={r.amount} onChange={e => updateBidRow(i, 'amount', e.target.value)} placeholder="Amount" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-3">
                    <Input value={r.leadTime} onChange={e => updateBidRow(i, 'leadTime', e.target.value)} placeholder="Lead time" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-3">
                    <Input value={r.notes} onChange={e => updateBidRow(i, 'notes', e.target.value)} placeholder="Notes" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBidRow(i)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={saveQuote}>Save Quote Request</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {quotes.map(q => (
          <Card key={q.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandedId === q.id
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{q.title}</span>
                      <Badge className={cn('text-xs border', quoteStatusColor(q.status))}>
                        {q.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.equipmentSystem} · {q.bids.length} bid{q.bids.length !== 1 ? 's' : ''}
                      {q.deadline && ` · Deadline: ${q.deadline}`}
                    </p>
                  </div>
                </div>
                {q.awardedTo && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs ml-4">
                    Awarded: {q.awardedTo}
                  </Badge>
                )}
              </div>

              {expandedId === q.id && (
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 leading-relaxed">{q.workScope}</p>
                  {q.bids.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="text-left pb-1">Vendor</th>
                            <th className="text-right pb-1">Amount</th>
                            <th className="text-left pb-1 pl-3">Lead Time</th>
                            <th className="text-left pb-1 pl-3">Notes</th>
                            <th className="text-left pb-1 pl-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.bids.map((bid, i) => {
                            const isWinner = q.awardedTo === bid.vendor;
                            return (
                              <tr key={i} className={cn('border-b border-border/50', isWinner && 'bg-green-500/10')}>
                                <td className={cn('py-1.5 font-medium', isWinner ? 'text-green-400' : 'text-foreground')}>
                                  {bid.vendor} {isWinner && '✓'}
                                </td>
                                <td className="py-1.5 text-right text-foreground font-semibold">{fmt(bid.amount)}</td>
                                <td className="py-1.5 pl-3 text-muted-foreground">{bid.leadTime}</td>
                                <td className="py-1.5 pl-3 text-muted-foreground">{bid.notes}</td>
                                <td className="py-1.5 pl-3">
                                  {q.status !== 'awarded' && (
                                    <Button size="sm" variant="outline" className="h-6 text-xs"
                                      onClick={() => awardBid(q.id, bid.vendor)}>
                                      Award
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Materials & Parts ───────────────────────────────────────────────────

function MaterialsTab() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<MaterialEntry[]>(() =>
    loadFromStorage<MaterialEntry>('foi_materials', MOCK_MATERIALS)
  );
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    itemName: '', category: 'filters' as MaterialCategory,
    quantity: '1', unitCost: '', linkedWO: '', appliedTo: '', notes: '',
  });

  const totalCostForm = Number(form.quantity) * Number(form.unitCost);

  // Summary calcs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);

  const monthSpend = materials
    .filter(m => new Date(m.date) >= startOfMonth)
    .reduce((s, m) => s + m.totalCost, 0);
  const weekItems = materials.filter(m => new Date(m.date) >= startOfWeek).length;

  const catCounts: Partial<Record<MaterialCategory, number>> = {};
  materials.forEach(m => { catCounts[m.category] = (catCounts[m.category] ?? 0) + 1; });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const highestCostItem = materials.reduce((max, m) => m.totalCost > (max?.totalCost ?? 0) ? m : max, materials[0]);

  function saveMaterial() {
    if (!form.itemName || !form.appliedTo) {
      toast({ title: 'Missing fields', description: 'Item name and applied-to system are required.', variant: 'destructive' });
      return;
    }
    const entry: MaterialEntry = {
      id: `m-${Date.now()}`,
      date: form.date, itemName: form.itemName, category: form.category,
      quantity: Number(form.quantity) || 1, unitCost: Number(form.unitCost) || 0,
      totalCost: (Number(form.quantity) || 1) * (Number(form.unitCost) || 0),
      linkedWO: form.linkedWO || undefined, appliedTo: form.appliedTo,
      notes: form.notes || undefined,
    };
    const updated = [entry, ...materials];
    setMaterials(updated);
    saveToStorage('foi_materials', updated);
    setForm({ date: new Date().toISOString().split('T')[0], itemName: '', category: 'filters', quantity: '1', unitCost: '', linkedWO: '', appliedTo: '', notes: '' });
    setShowForm(false);
    toast({ title: 'Material logged', description: `${entry.itemName} recorded.` });
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Month Spend', value: fmt(monthSpend), icon: <DollarSign className="h-4 w-4 text-amber-400" /> },
          { label: 'Top Category', value: topCat, icon: <Package className="h-4 w-4 text-purple-400" /> },
          { label: 'Highest Cost Item', value: highestCostItem ? highestCostItem.itemName.split(' ').slice(0,3).join(' ') : '—', icon: <AlertTriangle className="h-4 w-4 text-orange-400" /> },
          { label: 'Items This Week', value: weekItems, icon: <Wrench className="h-4 w-4 text-cyan-400" /> },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold text-foreground truncate">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Materials & Parts Log</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> Log Material / Part
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Log Material / Part
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Item Name</label>
                <Input value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} placeholder="MERV-13 Filter 20x25x4" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as MaterialCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['filters','belts','bearings','refrigerant','controls','piping','electrical','other'] as MaterialCategory[]).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit Cost ($)</label>
                <Input type="number" min={0} step={0.01} value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Cost</label>
                <Input disabled value={totalCostForm > 0 ? fmt(totalCostForm) : '—'} className="text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Linked WO (optional)</label>
                <Input value={form.linkedWO} onChange={e => setForm({ ...form, linkedWO: e.target.value })} placeholder="WO-2025-0041" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Applied To (system/equipment)</label>
                <Input value={form.appliedTo} onChange={e => setForm({ ...form, appliedTo: e.target.value })} placeholder="AHU-3, Pump P-12…" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={saveMaterial}>Save Entry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-3">Date</th>
              <th className="text-left py-2 pr-3">Item</th>
              <th className="text-left py-2 pr-3">Category</th>
              <th className="text-right py-2 pr-3">Qty</th>
              <th className="text-right py-2 pr-3">Unit</th>
              <th className="text-right py-2 pr-3">Total</th>
              <th className="text-left py-2 pr-3">Linked WO</th>
              <th className="text-left py-2 pr-3">Applied To</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/10">
                <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{m.date}</td>
                <td className="py-2 pr-3 text-foreground font-medium">{m.itemName}</td>
                <td className="py-2 pr-3">
                  <Badge className={cn('text-xs border', materialCategoryColor(m.category))}>{m.category}</Badge>
                </td>
                <td className="py-2 pr-3 text-right text-muted-foreground">{m.quantity}</td>
                <td className="py-2 pr-3 text-right text-muted-foreground">{fmt(m.unitCost)}</td>
                <td className="py-2 pr-3 text-right font-semibold text-foreground">{fmt(m.totalCost)}</td>
                <td className="py-2 pr-3 text-muted-foreground text-xs">{m.linkedWO ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground text-xs">{m.appliedTo}</td>
                <td className="py-2 text-muted-foreground text-xs">{m.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'work-orders' | 'vendors' | 'quotes' | 'materials';

const TABS: Array<{ id: TabId; label: string; icon: JSX.Element }> = [
  { id: 'work-orders', label: 'Work Orders', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'vendors', label: 'Vendors', icon: <Users className="h-4 w-4" /> },
  { id: 'quotes', label: 'Service Quotes', icon: <FileSearch className="h-4 w-4" /> },
  { id: 'materials', label: 'Materials & Parts', icon: <Package className="h-4 w-4" /> },
];

export default function RetailIntelligence() {
  const [activeTab, setActiveTab] = useState<TabId>('work-orders');

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Thermometer className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-foreground">Field Operations Intelligence</h1>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs font-bold tracking-wider">OPS INTEL</Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Procurement · Vendor Quotes · Materials · Work Analysis
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'work-orders' && <WorkOrdersTab />}
          {activeTab === 'vendors' && <VendorsTab />}
          {activeTab === 'quotes' && <QuotesTab />}
          {activeTab === 'materials' && <MaterialsTab />}
        </div>
      </div>
    </MainLayout>
  );
}
