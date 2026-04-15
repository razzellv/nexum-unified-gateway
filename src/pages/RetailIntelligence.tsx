import { useState, useRef } from 'react';
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
  ShoppingCart, Users, TrendingUp, Package, Plus, X, ChevronDown, ChevronRight,
  Trash2, BarChart3, AlertTriangle, FileText, Truck, DollarSign, RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type POStatus = 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';
type RFPStatus = 'open' | 'closed' | 'awarded' | 'cancelled';
type WasteReason = 'expired' | 'damaged' | 'theft' | 'spoilage' | 'overstock' | 'other';

interface POItem { name: string; qty: number; unitCost: number; }

interface PurchaseOrder {
  id: string; poNumber: string; supplierId: string; supplierName: string;
  items: POItem[]; status: POStatus; orderDate: string;
  expectedDelivery?: string; receivedDate?: string; notes?: string;
}

interface Supplier {
  id: string; name: string; contact: string; email?: string; phone?: string;
  category: string; rating: number; leadTimeDays: number;
  paymentTerms?: string; notes?: string; addedAt: string;
}

interface RFP {
  id: string; title: string; category: string; description: string;
  deadline?: string; status: RFPStatus;
  bids: Array<{ supplier: string; amount: number; notes: string }>;
  awardedTo?: string; createdAt: string;
}

interface WasteEntry {
  id: string; date: string; itemName: string; category: string;
  quantity: number; unitCost: number; totalCost: number;
  reason: WasteReason; notes?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  pos: 'nexum_retail_pos',
  suppliers: 'nexum_retail_suppliers',
  rfps: 'nexum_retail_rfps',
  waste: 'nexum_retail_waste',
};

const PO_STATUS_META: Record<POStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'text-muted-foreground', bg: 'bg-muted/20' },
  sent:      { label: 'Sent',      color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  received:  { label: 'Received',  color: 'text-green-400',        bg: 'bg-green-500/10' },
  partial:   { label: 'Partial',   color: 'text-yellow-400',       bg: 'bg-yellow-500/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400',          bg: 'bg-red-500/10' },
};

const RFP_STATUS_META: Record<RFPStatus, { label: string; color: string }> = {
  open:      { label: 'Open',      color: 'text-green-400' },
  closed:    { label: 'Closed',    color: 'text-muted-foreground' },
  awarded:   { label: 'Awarded',   color: 'text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-400' },
};

const WASTE_REASON_META: Record<WasteReason, { label: string; color: string; bg: string }> = {
  expired:   { label: 'Expired',   color: 'text-red-400',    bg: 'bg-red-500/10' },
  damaged:   { label: 'Damaged',   color: 'text-orange-400', bg: 'bg-orange-500/10' },
  theft:     { label: 'Theft',     color: 'text-purple-400', bg: 'bg-purple-500/10' },
  spoilage:  { label: 'Spoilage',  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  overstock: { label: 'Overstock', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  other:     { label: 'Other',     color: 'text-muted-foreground', bg: 'bg-muted/20' },
};

const SUPPLIER_CATEGORIES = ['produce','dairy','dry goods','beverages','meat & deli','cleaning','packaging','equipment','services','other'];
const PAYMENT_TERMS = ['Net 30','Net 60','Net 90','COD','Prepaid','Net 15'];
const WASTE_ITEM_CATEGORIES = ['dairy','produce','meat','bakery','beverage','frozen','dry goods','supplies','other'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; } catch { return fallback; }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

function poTotal(po: PurchaseOrder): number {
  return po.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
}

function nextPONumber(pos: PurchaseOrder[]): string {
  const year = new Date().getFullYear();
  const n = pos.filter(p => p.poNumber.startsWith(`PO-${year}`)).length + 1;
  return `PO-${year}-${String(n).padStart(3, '0')}`;
}

function RatingDots({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={cn('w-2 h-2 rounded-full', i <= value ? 'bg-yellow-400' : 'bg-muted/40')} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = 'overview' | 'purchase-orders' | 'suppliers' | 'rfp' | 'waste';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',        label: 'Overview',       icon: BarChart3 },
  { id: 'purchase-orders', label: 'Purchase Orders',icon: ShoppingCart },
  { id: 'suppliers',       label: 'Suppliers',      icon: Truck },
  { id: 'rfp',             label: 'RFP / Procurement', icon: FileText },
  { id: 'waste',           label: 'Waste & Shrink', icon: AlertTriangle },
];

export default function RetailIntelligence() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // ── State ──
  const [pos,       setPos]       = useState<PurchaseOrder[]>(() => load(STORAGE_KEYS.pos, []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => load(STORAGE_KEYS.suppliers, []));
  const [rfps,      setRfps]      = useState<RFP[]>(() => load(STORAGE_KEYS.rfps, []));
  const [waste,     setWaste]     = useState<WasteEntry[]>(() => load(STORAGE_KEYS.waste, []));

  // ── Modal visibility ──
  const [showAddPO,       setShowAddPO]       = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddRFP,      setShowAddRFP]      = useState(false);
  const [showAddWaste,    setShowAddWaste]    = useState(false);
  const [expandedPO,      setExpandedPO]      = useState<string | null>(null);
  const [expandedRFP,     setExpandedRFP]     = useState<string | null>(null);
  const [supplierSearch,  setSupplierSearch]  = useState('');
  const [wasteFilter,     setWasteFilter]     = useState<WasteReason | 'all'>('all');
  const [wastePeriod,     setWastePeriod]     = useState<'week' | 'month' | 'all'>('month');
  const [bidForms,        setBidForms]        = useState<Record<string, { supplier: string; amount: string; notes: string }>>({});

  // ── PO Form ──
  const [poForm, setPoForm] = useState({
    supplierName: '', orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '', status: 'draft' as POStatus, notes: '',
    items: [{ name: '', qty: 1, unitCost: 0 }],
  });

  // ── Supplier Form ──
  const [supForm, setSupForm] = useState({
    name: '', contact: '', email: '', phone: '',
    category: 'produce', rating: 4, leadTimeDays: 3,
    paymentTerms: 'Net 30', notes: '',
  });

  // ── RFP Form ──
  const [rfpForm, setRfpForm] = useState({
    title: '', category: '', description: '', deadline: '',
  });

  // ── Waste Form ──
  const [wasteForm, setWasteForm] = useState({
    date: new Date().toISOString().split('T')[0], itemName: '',
    category: 'dairy', quantity: 1, unitCost: 0,
    reason: 'expired' as WasteReason, notes: '',
  });

  // ── Persist helpers ──
  function savePos(next: PurchaseOrder[])   { setPos(next);       save(STORAGE_KEYS.pos, next); }
  function saveSup(next: Supplier[])        { setSuppliers(next); save(STORAGE_KEYS.suppliers, next); }
  function saveRfps(next: RFP[])            { setRfps(next);      save(STORAGE_KEYS.rfps, next); }
  function saveWaste(next: WasteEntry[])    { setWaste(next);     save(STORAGE_KEYS.waste, next); }

  // ── Handlers ──
  const handleAddPO = () => {
    if (!poForm.supplierName || poForm.items.every(i => !i.name)) return;
    const po: PurchaseOrder = {
      id: Date.now().toString(),
      poNumber: nextPONumber(pos),
      supplierId: Date.now().toString(),
      supplierName: poForm.supplierName,
      items: poForm.items.filter(i => i.name),
      status: poForm.status,
      orderDate: poForm.orderDate,
      expectedDelivery: poForm.expectedDelivery || undefined,
      notes: poForm.notes,
    };
    savePos([...pos, po]);
    setPoForm({ supplierName:'', orderDate:new Date().toISOString().split('T')[0], expectedDelivery:'', status:'draft', notes:'', items:[{name:'',qty:1,unitCost:0}] });
    setShowAddPO(false);
    toast({ title: 'PO created', description: po.poNumber });
  };

  const handleAddSupplier = () => {
    if (!supForm.name) return;
    const s: Supplier = { ...supForm, id: Date.now().toString(), addedAt: new Date().toISOString() };
    saveSup([...suppliers, s]);
    setSupForm({ name:'', contact:'', email:'', phone:'', category:'produce', rating:4, leadTimeDays:3, paymentTerms:'Net 30', notes:'' });
    setShowAddSupplier(false);
    toast({ title: 'Supplier added', description: supForm.name });
  };

  const handleAddRFP = () => {
    if (!rfpForm.title || !rfpForm.description) return;
    const r: RFP = { ...rfpForm, id: Date.now().toString(), status: 'open', bids: [], createdAt: new Date().toISOString() };
    saveRfps([...rfps, r]);
    setRfpForm({ title:'', category:'', description:'', deadline:'' });
    setShowAddRFP(false);
    toast({ title: 'RFP created', description: rfpForm.title });
  };

  const handleAddWaste = () => {
    if (!wasteForm.itemName || !wasteForm.quantity) return;
    const w: WasteEntry = { ...wasteForm, id: Date.now().toString(), totalCost: wasteForm.quantity * wasteForm.unitCost };
    saveWaste([...waste, w]);
    setWasteForm({ date:new Date().toISOString().split('T')[0], itemName:'', category:'dairy', quantity:1, unitCost:0, reason:'expired', notes:'' });
    setShowAddWaste(false);
    toast({ title: 'Waste entry logged' });
  };

  const handleMarkReceived = (poId: string) => {
    const next = pos.map(p => p.id === poId ? { ...p, status: 'received' as POStatus, receivedDate: new Date().toISOString().split('T')[0] } : p);
    savePos(next);
    toast({ title: 'PO marked received' });
  };

  const handleAddBid = (rfpId: string) => {
    const bf = bidForms[rfpId];
    if (!bf?.supplier || !bf?.amount) return;
    const next = rfps.map(r => r.id === rfpId
      ? { ...r, bids: [...r.bids, { supplier: bf.supplier, amount: parseFloat(bf.amount) || 0, notes: bf.notes || '' }] }
      : r);
    saveRfps(next);
    setBidForms(prev => ({ ...prev, [rfpId]: { supplier:'', amount:'', notes:'' } }));
    toast({ title: 'Bid added' });
  };

  const handleAwardRFP = (rfpId: string, supplier: string) => {
    const next = rfps.map(r => r.id === rfpId ? { ...r, status: 'awarded' as RFPStatus, awardedTo: supplier } : r);
    saveRfps(next);
    toast({ title: 'RFP awarded', description: supplier });
  };

  // ── Derived KPIs ──
  const openPOs      = pos.filter(p => p.status === 'draft' || p.status === 'sent' || p.status === 'partial').length;
  const openPOValue  = pos.filter(p => p.status !== 'cancelled' && p.status !== 'received').reduce((s, p) => s + poTotal(p), 0);
  const openRFPs     = rfps.filter(r => r.status === 'open').length;
  const ytdWaste     = waste.reduce((s, w) => s + w.totalCost, 0);

  // Waste date filter
  const now = Date.now();
  const filteredWaste = waste.filter(w => {
    const wt = new Date(w.date).getTime();
    if (wastePeriod === 'week'  && now - wt > 7  * 86400000) return false;
    if (wastePeriod === 'month' && now - wt > 30 * 86400000) return false;
    return wasteFilter === 'all' || w.reason === wasteFilter;
  });

  // Waste by category breakdown
  const wasteByCat = filteredWaste.reduce((acc, w) => {
    acc[w.category] = (acc[w.category] || 0) + w.totalCost;
    return acc;
  }, {} as Record<string, number>);
  const maxWasteCat = Math.max(...Object.values(wasteByCat), 1);

  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || s.category.includes(supplierSearch.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Retail Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Purchase orders, suppliers, procurement, and waste tracking.</p>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open POs',       value: openPOs,                        color: 'text-blue-400',    icon: ShoppingCart },
            { label: 'Active Suppliers',value: suppliers.length,              color: 'text-teal-400',    icon: Truck },
            { label: 'Open RFPs',      value: openRFPs,                       color: 'text-purple-400',  icon: FileText },
            { label: 'Waste Cost YTD', value: `$${ytdWaste.toLocaleString()}`,color: 'text-red-400',     icon: AlertTriangle },
          ].map(k => (
            <Card key={k.label} className="border-border/30 bg-muted/10">
              <CardContent className="p-3 flex items-center gap-2">
                <k.icon className={cn('w-4 h-4 shrink-0', k.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={cn('font-bold text-sm', k.color)}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/30 overflow-x-auto pb-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-400" /> Recent Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {pos.length === 0 && <p className="text-xs text-muted-foreground">No purchase orders yet.</p>}
                {[...pos].reverse().slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{p.supplierName} · {p.orderDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-400">${poTotal(p).toLocaleString()}</span>
                      <Badge className={cn('text-[10px]', PO_STATUS_META[p.status].color, PO_STATUS_META[p.status].bg)}>
                        {PO_STATUS_META[p.status].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Waste by Reason (All Time)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {waste.length === 0 && <p className="text-xs text-muted-foreground">No waste entries yet.</p>}
                {(Object.entries(
                  waste.reduce((acc, w) => { acc[w.reason] = (acc[w.reason] || 0) + w.totalCost; return acc; }, {} as Record<string, number>)
                ) as [WasteReason, number][]).sort((a, b) => b[1] - a[1]).map(([reason, total]) => {
                  const max = Math.max(...waste.reduce((acc, w) => { acc[w.reason] = (acc[w.reason]||0)+w.totalCost; return acc; }, {} as Record<string,number>) ? Object.values(waste.reduce((acc, w) => { acc[w.reason]=(acc[w.reason]||0)+w.totalCost; return acc; }, {} as Record<string,number>)) : [1]);
                  const pct = Math.round((total / Math.max(max, 1)) * 100);
                  return (
                    <div key={reason} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className={WASTE_REASON_META[reason]?.color || 'text-muted-foreground'}>{WASTE_REASON_META[reason]?.label || reason}</span>
                        <span className="text-muted-foreground">${total.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/30 lg:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-400" /> Top Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {suppliers.length === 0 && <p className="text-xs text-muted-foreground">No suppliers added yet.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suppliers.slice(0, 6).map(s => (
                    <div key={s.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 text-xs space-y-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-muted-foreground capitalize">{s.category} · {s.leadTimeDays}d lead</p>
                      <RatingDots value={s.rating} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PURCHASE ORDERS ── */}
        {activeTab === 'purchase-orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pos.length} orders · {openPOs} open · <span className="text-green-400 font-medium">${openPOValue.toLocaleString()} open value</span>
              </p>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setShowAddPO(true)}>
                <Plus className="w-4 h-4" /> New PO
              </Button>
            </div>

            {pos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No purchase orders yet.</p>
              </div>
            )}

            {[...pos].reverse().map(p => (
              <Card key={p.id} className="border-border/30">
                <div className="flex items-start justify-between gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedPO(expandedPO === p.id ? null : p.id)}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{p.poNumber}</p>
                      <Badge className={cn('text-[10px]', PO_STATUS_META[p.status].color, PO_STATUS_META[p.status].bg)}>
                        {PO_STATUS_META[p.status].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.supplierName} · {p.orderDate}</p>
                    <p className="text-xs font-medium text-green-400 mt-0.5">${poTotal(p).toLocaleString()} · {p.items.length} item{p.items.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); const next = pos.filter(x => x.id !== p.id); savePos(next); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedPO === p.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedPO === p.id && (
                  <div className="border-t border-border/20 p-4 space-y-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/20">
                          <th className="text-left pb-1">Item</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">Unit Cost</th>
                          <th className="text-right pb-1">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((item, i) => (
                          <tr key={i} className="border-b border-border/10 last:border-0">
                            <td className="py-1">{item.name}</td>
                            <td className="text-right">{item.qty}</td>
                            <td className="text-right">${item.unitCost.toFixed(2)}</td>
                            <td className="text-right font-medium">${(item.qty * item.unitCost).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold">
                          <td colSpan={3} className="pt-2 text-right text-muted-foreground">Total</td>
                          <td className="pt-2 text-right text-green-400">${poTotal(p).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {p.expectedDelivery && <span>Expected: {p.expectedDelivery}</span>}
                      {p.receivedDate && <span className="text-green-400">Received: {p.receivedDate}</span>}
                      {p.notes && <span className="italic">{p.notes}</span>}
                    </div>
                    {(p.status === 'sent' || p.status === 'partial') && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-500 text-xs h-7"
                        onClick={() => handleMarkReceived(p.id)}>
                        Mark Received
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── SUPPLIERS ── */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Input placeholder="Search suppliers..." className="max-w-xs"
                value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} />
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-500" onClick={() => setShowAddSupplier(true)}>
                <Plus className="w-4 h-4" /> Add Supplier
              </Button>
            </div>

            {suppliers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No suppliers yet.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(s => {
                const ratingColor = s.rating >= 4 ? 'text-green-400' : s.rating >= 3 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <Card key={s.id} className="border-border/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{s.name}</p>
                          <Badge variant="outline" className="text-[10px] mt-1 capitalize">{s.category}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RatingDots value={s.rating} />
                          <button onClick={() => { saveSup(suppliers.filter(x => x.id !== s.id)); }}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {s.contact && <span>Contact: {s.contact}</span>}
                        {s.email && <span className="truncate">✉ {s.email}</span>}
                        {s.phone && <span>📞 {s.phone}</span>}
                        <span className={cn('font-medium', ratingColor)}>Lead: {s.leadTimeDays}d</span>
                        {s.paymentTerms && <span>{s.paymentTerms}</span>}
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RFP / PROCUREMENT ── */}
        {activeTab === 'rfp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{rfps.length} RFPs · {openRFPs} open</p>
              <Button size="sm" className="gap-2 bg-purple-600 hover:bg-purple-500" onClick={() => setShowAddRFP(true)}>
                <Plus className="w-4 h-4" /> New RFP
              </Button>
            </div>

            {rfps.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No RFPs yet.</p>
              </div>
            )}

            {[...rfps].reverse().map(r => {
              const isExpanded = expandedRFP === r.id;
              const isExpired = r.deadline && new Date(r.deadline).getTime() < Date.now();
              const bf = bidForms[r.id] || { supplier: '', amount: '', notes: '' };
              return (
                <Card key={r.id} className="border-border/30">
                  <div className="flex items-start justify-between gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedRFP(isExpanded ? null : r.id)}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{r.title}</p>
                        <Badge className={cn('text-[10px]', RFP_STATUS_META[r.status].color, 'bg-muted/20')}>
                          {RFP_STATUS_META[r.status].label}
                        </Badge>
                        {r.bids.length > 0 && <Badge variant="outline" className="text-[10px]">{r.bids.length} bid{r.bids.length !== 1 ? 's' : ''}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.category}{r.deadline && <span className={cn('ml-2', isExpired ? 'text-red-400' : '')}>Deadline: {r.deadline}{isExpired ? ' (expired)' : ''}</span>}
                      </p>
                      {r.awardedTo && <p className="text-xs text-blue-400 mt-0.5">Awarded to: {r.awardedTo}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={e => { e.stopPropagation(); saveRfps(rfps.filter(x => x.id !== r.id)); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/20 p-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{r.description}</p>

                      {/* Bids */}
                      {r.bids.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bids</p>
                          {r.bids.map((bid, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded border border-border/30 bg-muted/10 text-xs">
                              <div>
                                <span className="font-medium">{bid.supplier}</span>
                                {bid.notes && <span className="text-muted-foreground ml-2">— {bid.notes}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 font-semibold">${bid.amount.toLocaleString()}</span>
                                {r.status === 'open' && (
                                  <button onClick={() => handleAwardRFP(r.id, bid.supplier)}
                                    className="text-[10px] px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">
                                    Award
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add bid */}
                      {r.status === 'open' && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Bid</p>
                          <div className="flex gap-2 flex-wrap">
                            <Input className="flex-1 min-w-[140px] h-7 text-xs" placeholder="Supplier name"
                              value={bf.supplier} onChange={e => setBidForms(prev => ({ ...prev, [r.id]: { ...bf, supplier: e.target.value } }))} />
                            <Input className="w-28 h-7 text-xs" placeholder="Amount ($)" type="number"
                              value={bf.amount} onChange={e => setBidForms(prev => ({ ...prev, [r.id]: { ...bf, amount: e.target.value } }))} />
                            <Input className="flex-1 min-w-[120px] h-7 text-xs" placeholder="Notes"
                              value={bf.notes} onChange={e => setBidForms(prev => ({ ...prev, [r.id]: { ...bf, notes: e.target.value } }))} />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddBid(r.id)}>Add</Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {r.status === 'open' && (
                          <button onClick={() => saveRfps(rfps.map(x => x.id === r.id ? { ...x, status: 'closed' as RFPStatus } : x))}
                            className="text-xs px-3 py-1 rounded border border-border/40 text-muted-foreground hover:text-foreground transition-colors">
                            Close RFP
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── WASTE & SHRINK ── */}
        {activeTab === 'waste' && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Waste Cost',   value: `$${filteredWaste.reduce((s,w)=>s+w.totalCost,0).toLocaleString()}`, color: 'text-red-400' },
                { label: 'Units Wasted',       value: filteredWaste.reduce((s,w)=>s+w.quantity,0).toLocaleString(),         color: 'text-orange-400' },
                { label: 'Top Category',       value: Object.entries(wasteByCat).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—',    color: 'text-yellow-400' },
                { label: 'Entries',            value: filteredWaste.length,                                                  color: 'text-muted-foreground' },
              ].map(k => (
                <Card key={k.label} className="border-border/30 bg-muted/10">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className={cn('font-bold text-sm', k.color)}>{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex gap-1 flex-wrap">
                {(['all','expired','damaged','theft','spoilage','overstock','other'] as const).map(f => (
                  <button key={f} onClick={() => setWasteFilter(f)}
                    className={cn('text-xs px-3 py-1 rounded-full border transition-colors', wasteFilter === f
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:text-foreground')}>
                    {f === 'all' ? 'All' : WASTE_REASON_META[f].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(['week','month','all'] as const).map(p => (
                    <button key={p} onClick={() => setWastePeriod(p)}
                      className={cn('text-xs px-2 py-1 rounded border transition-colors', wastePeriod === p
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:text-foreground')}>
                      {p === 'week' ? '7d' : p === 'month' ? '30d' : 'All'}
                    </button>
                  ))}
                </div>
                <Button size="sm" className="gap-1 bg-red-700 hover:bg-red-600 h-7 text-xs" onClick={() => setShowAddWaste(true)}>
                  <Plus className="w-3 h-3" /> Log Waste
                </Button>
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(wasteByCat).length > 0 && (
              <Card className="border-border/30">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Waste by Category</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2">
                  {Object.entries(wasteByCat).sort((a,b)=>b[1]-a[1]).map(([cat, total]) => (
                    <div key={cat} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{cat}</span>
                        <span className="text-red-400 font-medium">${total.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/60 rounded-full transition-all" style={{ width: `${Math.round((total/maxWasteCat)*100)}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Waste log */}
            {filteredWaste.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No waste entries in this period.</p>
              </div>
            )}
            <div className="space-y-2">
              {[...filteredWaste].sort((a,b)=>b.date.localeCompare(a.date)).map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card text-xs">
                  <div className="flex-1">
                    <p className="font-medium">{w.itemName}</p>
                    <p className="text-muted-foreground capitalize">{w.category} · {w.date}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground">{w.quantity} units</span>
                    <span className="text-red-400 font-semibold">${w.totalCost.toLocaleString()}</span>
                    <Badge className={cn('text-[10px]', WASTE_REASON_META[w.reason].color, WASTE_REASON_META[w.reason].bg)}>
                      {WASTE_REASON_META[w.reason].label}
                    </Badge>
                    <button onClick={() => saveWaste(waste.filter(x => x.id !== w.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MODALS ── */}

        {/* Add PO */}
        {showAddPO && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddPO(false)}>
            <Card className="w-full max-w-lg border-blue-500/30 my-4" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">New Purchase Order</CardTitle>
                <button onClick={() => setShowAddPO(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Supplier *</label>
                    <Input placeholder="Supplier name" value={poForm.supplierName} onChange={e => setPoForm(f => ({...f, supplierName: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Order Date</label>
                    <Input type="date" value={poForm.orderDate} onChange={e => setPoForm(f => ({...f, orderDate: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Expected Delivery</label>
                    <Input type="date" value={poForm.expectedDelivery} onChange={e => setPoForm(f => ({...f, expectedDelivery: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
                    <Select value={poForm.status} onValueChange={v => setPoForm(f => ({...f, status: v as POStatus}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(PO_STATUS_META) as POStatus[]).map(s => <SelectItem key={s} value={s}>{PO_STATUS_META[s].label}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Items</label>
                    <button onClick={() => setPoForm(f => ({...f, items: [...f.items, {name:'',qty:1,unitCost:0}]}))}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  {poForm.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-5 gap-1.5 items-center">
                      <Input className="col-span-2 h-7 text-xs" placeholder="Item name"
                        value={item.name} onChange={e => { const items = [...poForm.items]; items[i].name = e.target.value; setPoForm(f => ({...f, items})); }} />
                      <Input className="h-7 text-xs" type="number" placeholder="Qty"
                        value={item.qty} onChange={e => { const items = [...poForm.items]; items[i].qty = parseInt(e.target.value)||1; setPoForm(f => ({...f, items})); }} />
                      <Input className="h-7 text-xs" type="number" placeholder="Unit $"
                        value={item.unitCost||''} onChange={e => { const items = [...poForm.items]; items[i].unitCost = parseFloat(e.target.value)||0; setPoForm(f => ({...f, items})); }} />
                      <button onClick={() => setPoForm(f => ({...f, items: f.items.filter((_,j) => j !== i)}))}
                        className="text-muted-foreground hover:text-destructive transition-colors flex justify-center">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {poForm.items.length > 0 && (
                    <p className="text-xs text-right text-green-400 font-medium">
                      Total: ${poForm.items.reduce((s,i) => s + i.qty*i.unitCost, 0).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-1"><label className="text-xs text-muted-foreground">Notes</label>
                  <Textarea rows={2} value={poForm.notes} onChange={e => setPoForm(f => ({...f, notes: e.target.value}))} /></div>
                <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleAddPO}>Create PO</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Supplier */}
        {showAddSupplier && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddSupplier(false)}>
            <Card className="w-full max-w-md border-teal-500/30 my-4" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Supplier</CardTitle>
                <button onClick={() => setShowAddSupplier(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Supplier Name *</label>
                    <Input value={supForm.name} onChange={e => setSupForm(f => ({...f, name: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Contact Person</label>
                    <Input value={supForm.contact} onChange={e => setSupForm(f => ({...f, contact: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Category</label>
                    <Select value={supForm.category} onValueChange={v => setSupForm(f => ({...f, category: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUPPLIER_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Email</label>
                    <Input type="email" value={supForm.email} onChange={e => setSupForm(f => ({...f, email: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={supForm.phone} onChange={e => setSupForm(f => ({...f, phone: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Rating (1–5)</label>
                    <Select value={String(supForm.rating)} onValueChange={v => setSupForm(f => ({...f, rating: parseInt(v)}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} star{n!==1?'s':''}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Lead Time (days)</label>
                    <Input type="number" value={supForm.leadTimeDays} onChange={e => setSupForm(f => ({...f, leadTimeDays: parseInt(e.target.value)||1}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Payment Terms</label>
                    <Select value={supForm.paymentTerms} onValueChange={v => setSupForm(f => ({...f, paymentTerms: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea rows={2} value={supForm.notes} onChange={e => setSupForm(f => ({...f, notes: e.target.value}))} /></div>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-500" onClick={handleAddSupplier}>Add Supplier</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add RFP */}
        {showAddRFP && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRFP(false)}>
            <Card className="w-full max-w-md border-purple-500/30" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">New RFP</CardTitle>
                <button onClick={() => setShowAddRFP(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Title *</label>
                  <Input placeholder="e.g. Produce supplier Q3" value={rfpForm.title} onChange={e => setRfpForm(f => ({...f, title: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Category</label>
                    <Input placeholder="produce, equipment..." value={rfpForm.category} onChange={e => setRfpForm(f => ({...f, category: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Deadline</label>
                    <Input type="date" value={rfpForm.deadline} onChange={e => setRfpForm(f => ({...f, deadline: e.target.value}))} /></div>
                </div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Description *</label>
                  <Textarea rows={3} placeholder="Describe requirements, quantities, specs..." value={rfpForm.description} onChange={e => setRfpForm(f => ({...f, description: e.target.value}))} /></div>
                <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={handleAddRFP}>Create RFP</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Waste Entry */}
        {showAddWaste && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddWaste(false)}>
            <Card className="w-full max-w-md border-red-500/30" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Log Waste Entry
                </CardTitle>
                <button onClick={() => setShowAddWaste(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Item Name *</label>
                    <Input placeholder="e.g. Whole Milk 1 Gal" value={wasteForm.itemName} onChange={e => setWasteForm(f => ({...f, itemName: e.target.value}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Category</label>
                    <Select value={wasteForm.category} onValueChange={v => setWasteForm(f => ({...f, category: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WASTE_ITEM_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Reason</label>
                    <Select value={wasteForm.reason} onValueChange={v => setWasteForm(f => ({...f, reason: v as WasteReason}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(WASTE_REASON_META) as WasteReason[]).map(r => <SelectItem key={r} value={r}>{WASTE_REASON_META[r].label}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Quantity *</label>
                    <Input type="number" value={wasteForm.quantity} onChange={e => setWasteForm(f => ({...f, quantity: parseFloat(e.target.value)||1}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Unit Cost ($)</label>
                    <Input type="number" value={wasteForm.unitCost||''} onChange={e => setWasteForm(f => ({...f, unitCost: parseFloat(e.target.value)||0}))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Date</label>
                    <Input type="date" value={wasteForm.date} onChange={e => setWasteForm(f => ({...f, date: e.target.value}))} /></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea rows={2} value={wasteForm.notes||''} onChange={e => setWasteForm(f => ({...f, notes: e.target.value}))} /></div>
                </div>
                {wasteForm.quantity > 0 && wasteForm.unitCost > 0 && (
                  <p className="text-xs text-right text-red-400 font-medium">
                    Total loss: ${(wasteForm.quantity * wasteForm.unitCost).toLocaleString()}
                  </p>
                )}
                <Button className="w-full bg-red-700 hover:bg-red-600" onClick={handleAddWaste}>Log Waste</Button>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
