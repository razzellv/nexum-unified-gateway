import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck, AlertTriangle, FileText, GraduationCap, ClipboardList,
  TrendingUp, Calendar, CheckCircle2, XCircle, Clock, Download, ChevronRight,
  Leaf, FlaskConical, BookOpen, Users, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComplianceItem {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  status: 'current' | 'due_soon' | 'overdue' | 'na';
  notes?: string;
}

interface TrainingRecord {
  id: string;
  topic: string;
  assigned: number;
  completed: number;
  dueDate: string;
}

interface ViolationSummary {
  open: number;
  resolved: number;
  thisMonth: number;
}

const LOCAL_ITEMS_KEY  = 'nexum_compliance_items';
const LOCAL_TRAINING_KEY = 'nexum_compliance_training';

const DEFAULT_ITEMS: ComplianceItem[] = [
  { id: '1', title: 'OSHA 300 Annual Summary Posting', category: 'OSHA', dueDate: '2026-02-01', status: 'current' },
  { id: '2', title: 'SARA Tier II Report Submission', category: 'Tier II', dueDate: '2026-03-01', status: 'due_soon' },
  { id: '3', title: 'NPDES Stormwater Annual Report', category: 'Stormwater', dueDate: '2026-06-30', status: 'current' },
  { id: '4', title: 'Hazmat Inventory Review', category: 'EHS', dueDate: '2026-04-15', status: 'current' },
  { id: '5', title: 'Fire Extinguisher Inspection', category: 'Safety', dueDate: '2026-05-30', status: 'due_soon' },
  { id: '6', title: 'Air Quality Permit Renewal', category: 'Environmental', dueDate: '2026-07-01', status: 'current' },
  { id: '7', title: 'Wastewater Discharge Limit Review', category: 'Environmental', dueDate: '2026-08-15', status: 'current' },
];

const DEFAULT_TRAINING: TrainingRecord[] = [
  { id: 't1', topic: 'Hazard Communication (HazCom / GHS)', assigned: 12, completed: 10, dueDate: '2026-06-01' },
  { id: 't2', topic: 'Lockout / Tagout (LOTO)', assigned: 8, completed: 8, dueDate: '2026-05-01' },
  { id: 't3', topic: 'Bloodborne Pathogens', assigned: 6, completed: 3, dueDate: '2026-05-15' },
  { id: 't4', topic: 'Emergency Action Plan', assigned: 15, completed: 15, dueDate: '2026-04-01' },
  { id: 't5', topic: 'Respiratory Protection', assigned: 5, completed: 2, dueDate: '2026-05-20' },
];

const STATUS_COLORS: Record<string, string> = {
  current:   'text-green-500',
  due_soon:  'text-yellow-500',
  overdue:   'text-red-500',
  na:        'text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  current:  'Current',
  due_soon: 'Due Soon',
  overdue:  'Overdue',
  na:       'N/A',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  OSHA:          <ShieldCheck className="w-3.5 h-3.5" />,
  'Tier II':     <FlaskConical className="w-3.5 h-3.5" />,
  Stormwater:    <Leaf className="w-3.5 h-3.5" />,
  Environmental: <Leaf className="w-3.5 h-3.5" />,
  EHS:           <AlertTriangle className="w-3.5 h-3.5" />,
  Safety:        <ShieldCheck className="w-3.5 h-3.5" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComplianceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems]       = useState<ComplianceItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_ITEMS_KEY) || 'null') || DEFAULT_ITEMS; }
    catch { return DEFAULT_ITEMS; }
  });
  const [training, setTraining] = useState<TrainingRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_TRAINING_KEY) || 'null') || DEFAULT_TRAINING; }
    catch { return DEFAULT_TRAINING; }
  });
  const [violations] = useState<ViolationSummary>({ open: 3, resolved: 14, thisMonth: 2 });
  const [editItem, setEditItem]   = useState<ComplianceItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem]     = useState<Partial<ComplianceItem>>({ status: 'current' });

  useEffect(() => { localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(LOCAL_TRAINING_KEY, JSON.stringify(training)); }, [training]);

  const overdueCount  = items.filter(i => i.status === 'overdue').length;
  const dueSoonCount  = items.filter(i => i.status === 'due_soon').length;
  const currentCount  = items.filter(i => i.status === 'current').length;
  const overallScore  = items.length ? Math.round((currentCount / items.length) * 100) : 0;

  const trainingAvg = training.length
    ? Math.round(training.reduce((s, t) => s + (t.completed / t.assigned) * 100, 0) / training.length)
    : 0;

  function cycleStatus(id: string) {
    const cycle: ComplianceItem['status'][] = ['current', 'due_soon', 'overdue', 'na'];
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const idx = cycle.indexOf(i.status);
      return { ...i, status: cycle[(idx + 1) % cycle.length] };
    }));
  }

  function addItem() {
    if (!newItem.title || !newItem.category || !newItem.dueDate) return;
    const item: ComplianceItem = {
      id: Date.now().toString(),
      title: newItem.title,
      category: newItem.category,
      dueDate: newItem.dueDate,
      status: (newItem.status as ComplianceItem['status']) || 'current',
      notes: newItem.notes,
    };
    setItems(prev => [item, ...prev]);
    setNewItem({ status: 'current' });
    setShowAddModal(false);
  }

  function saveEdit() {
    if (!editItem) return;
    setItems(prev => prev.map(i => i.id === editItem.id ? editItem : i));
    setEditItem(null);
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compliance &amp; EHS Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Regulatory tracking · OSHA 300 · Tier II / SARA · Environmental · Training compliance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/osha-300')}>
              <Leaf className="w-4 h-4 mr-1.5" /> EHS Module
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <ClipboardList className="w-4 h-4 mr-1.5" /> Add Item
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
            label="Compliance Score"
            value={`${overallScore}%`}
            sub={`${currentCount} of ${items.length} current`}
            color={overallScore >= 80 ? 'border-green-500/20' : overallScore >= 60 ? 'border-yellow-500/20' : 'border-red-500/20'}
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="Overdue Items"
            value={String(overdueCount)}
            sub={`${dueSoonCount} due soon`}
            color={overdueCount > 0 ? 'border-red-500/20' : 'border-border/40'}
          />
          <KPICard
            icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
            label="Training Avg"
            value={`${trainingAvg}%`}
            sub="across all programs"
            color="border-border/40"
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
            label="Open Violations"
            value={String(violations.open)}
            sub={`${violations.thisMonth} this month`}
            color={violations.open > 0 ? 'border-yellow-500/20' : 'border-border/40'}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Compliance Checklist */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" /> Regulatory Checklist
                </CardTitle>
                <span className="text-xs text-muted-foreground">{items.length} items</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {items.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setEditItem({ ...item })}
                >
                  <div className="shrink-0 text-muted-foreground">
                    {CATEGORY_ICONS[item.category] || <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.category} · Due {item.dueDate}</p>
                  </div>
                  <button
                    className={cn('text-xs font-semibold shrink-0', STATUS_COLORS[item.status])}
                    onClick={e => { e.stopPropagation(); cycleStatus(item.id); }}
                  >
                    {STATUS_LABELS[item.status]}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Training Compliance */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" /> Training Compliance
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/optimize-learn')}>
                  View LMS <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {training.map(t => {
                const pct = Math.round((t.completed / t.assigned) * 100);
                return (
                  <div key={t.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate pr-2">{t.topic}</span>
                      <span className={cn('shrink-0 font-semibold tabular-nums', pct === 100 ? 'text-green-500' : pct >= 80 ? 'text-yellow-500' : 'text-red-500')}>
                        {t.completed}/{t.assigned}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">Due {t.dueDate}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon={<BookOpen className="w-4 h-4" />} label="OSHA 300 Log" onClick={() => navigate('/osha-300')} />
          <QuickAction icon={<FlaskConical className="w-4 h-4" />} label="Tier II / SARA" onClick={() => navigate('/osha-300')} />
          <QuickAction icon={<Leaf className="w-4 h-4" />} label="Environmental" onClick={() => navigate('/environmental')} />
          <QuickAction icon={<Users className="w-4 h-4" />} label="Consulting" onClick={() => navigate('/consulting')} />
        </div>

        {/* Violations Summary */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Violation Tracker
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/violations')}>
                View All <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-2xl font-bold text-red-500">{violations.open}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Open</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-2xl font-bold text-yellow-500">{violations.thisMonth}</p>
                <p className="text-xs text-muted-foreground mt-0.5">This Month</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">{violations.resolved}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Resolved YTD</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Edit Item Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold">Edit Compliance Item</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <input className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editItem.dueDate} onChange={e => setEditItem({ ...editItem, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value as ComplianceItem['status'] })}>
                  <option value="current">Current</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="overdue">Overdue</option>
                  <option value="na">N/A</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={2} value={editItem.notes || ''} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-5 border-t border-border">
              <button className="text-xs text-red-500 hover:text-red-400"
                onClick={() => { setItems(prev => prev.filter(i => i.id !== editItem.id)); setEditItem(null); }}>
                Remove
              </button>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/40"
                  onClick={() => setEditItem(null)}>Cancel</button>
                <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold">Add Compliance Item</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <input className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. OSHA 300 Annual Posting"
                  value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="OSHA, EHS, Tier II…"
                    value={newItem.category || ''} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newItem.dueDate || ''} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newItem.status} onChange={e => setNewItem({ ...newItem, status: e.target.value as ComplianceItem['status'] })}>
                  <option value="current">Current</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/40"
                onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                onClick={addItem}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color?: string }) {
  return (
    <Card className={cn('border', color)}>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-3 rounded-xl border border-border/40 hover:bg-muted/30 hover:border-primary/30 transition-colors text-sm font-medium w-full"
    >
      <span className="text-primary">{icon}</span>
      {label}
      <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
    </button>
  );
}
