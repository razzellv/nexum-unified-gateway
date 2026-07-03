import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFinancialMetrics } from '@/lib/useFinancialMetrics';
import {
  Wrench, AlertTriangle, CheckCircle, TrendingUp, ArrowRight,
  Clock, BarChart2, Users, ChevronDown, ChevronUp, Plus, X,
  Phone, Mail, Building2, Repeat, Timer, AlertOctagon,
  ShoppingCart, Package, Shield, Leaf, Target, BarChart3,
  Activity, AlertOctagon as AlertOct, CheckCircle2, DollarSign,
  ShieldCheck, Truck, ClipboardList, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadInventory, loadShrink, loadFoodSafety, loadCompliance,
  loadVendorLogs, loadTasks, loadEnergy, loadStoreProfile,
  buildInventoryHealth, buildShrinkSummary, buildFoodSafetyScore,
  buildVendorIntelligence, buildOperationalEfficiency,
  buildRetailCTS, buildRetailExecutiveSummary, buildRetailTimeline,
} from '@/lib/retail-engine';
import { RetailCTSPanel } from '@/components/retail/RetailCTSPanel';

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkType = 'repair' | 'maintenance' | 'inspection' | 'install' | 'retrofit' | 'emergency' | 'pm';

interface CompletedJob {
  id: string;
  date: string;
  equipmentSystem: string;
  workType: WorkType;
  vendor: string;
  techName: string;
  duration: string;
  outcome: string;
  recommendation?: string;
  facilityImpact?: string;
  linkedWO?: string;
}

type RequestStatus = 'requested' | 'approved' | 'scheduled' | 'in_progress' | 'delayed' | 'emergency';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface ServiceRequest {
  id: string;
  createdAt: string;
  scheduledDate?: string;
  equipmentSystem: string;
  workType: string;
  priority: Priority;
  status: RequestStatus;
  assignedVendor?: string;
  assignedTech?: string;
  notes?: string;
  delayReason?: string;
}

type VendorStatus = 'active' | 'inactive' | 'probation' | 'preferred';

interface VendorSite {
  id: string;
  vendorName: string;
  serviceCategory: string;
  primaryContact: string;
  phone: string;
  email: string;
  assignedFacilities: string[];
  openJobs: number;
  completedJobs: number;
  lastService: string;
  completionRate: number;
  responseTime: string;
  status: VendorStatus;
}

interface RecurringFlag {
  id: string;
  equipmentSystem: string;
  serviceCount: number;
  lastService: string;
  issue: string;
}

interface WorkOrder {
  id: string;
  equipmentSystem: string;
  createdAt: string;
  ageDays: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const safeParseArray = <T,>(key: string): T[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const rateColor = (rate: number): string => {
  if (rate >= 90) return 'text-green-400';
  if (rate >= 75) return 'text-yellow-400';
  return 'text-red-400';
};

const rateBg = (rate: number): string => {
  if (rate >= 90) return 'bg-green-400';
  if (rate >= 75) return 'bg-yellow-400';
  return 'bg-red-400';
};

const rateBand = (rate: number): { label: string; color: string } => {
  if (rate >= 90) return { label: 'Excellent', color: 'text-green-400' };
  if (rate >= 75) return { label: 'Good', color: 'text-yellow-400' };
  if (rate >= 60) return { label: 'Watch', color: 'text-orange-400' };
  return { label: 'Risk', color: 'text-red-400' };
};

const ageColor = (days: number): string => {
  if (days > 30) return 'text-red-400';
  if (days > 15) return 'text-orange-400';
  if (days > 7) return 'text-yellow-400';
  return 'text-green-400';
};

const ageDot = (days: number): string => {
  if (days > 30) return 'bg-red-400';
  if (days > 15) return 'bg-orange-400';
  if (days > 7) return 'bg-yellow-400';
  return 'bg-green-400';
};

const workTypeBadgeClass = (wt: WorkType): string => {
  const map: Record<WorkType, string> = {
    repair: 'border-red-400/40 text-red-400',
    maintenance: 'border-blue-400/40 text-blue-400',
    inspection: 'border-purple-400/40 text-purple-400',
    install: 'border-teal-400/40 text-teal-400',
    retrofit: 'border-indigo-400/40 text-indigo-400',
    emergency: 'border-red-500/60 text-red-500',
    pm: 'border-green-400/40 text-green-400',
  };
  return map[wt] || 'border-border text-muted-foreground';
};

const priorityBadgeClass = (p: Priority): string => {
  const map: Record<Priority, string> = {
    critical: 'border-red-500/60 text-red-500 bg-red-500/10',
    high: 'border-orange-400/50 text-orange-400',
    medium: 'border-yellow-400/50 text-yellow-400',
    low: 'border-muted-foreground/40 text-muted-foreground',
  };
  return map[p] || '';
};

const statusBadgeClass = (s: RequestStatus): string => {
  const map: Record<RequestStatus, string> = {
    requested: 'border-muted-foreground/40 text-muted-foreground',
    approved: 'border-blue-400/50 text-blue-400',
    scheduled: 'border-purple-400/50 text-purple-400',
    in_progress: 'border-teal-400/50 text-teal-400',
    delayed: 'border-orange-400/50 text-orange-400',
    emergency: 'border-red-500/60 text-red-500',
  };
  return map[s] || '';
};

const statusLabel: Record<RequestStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  emergency: 'Emergency',
};

const vendorStatusBadge: Record<VendorStatus, string> = {
  preferred: 'border-green-400/50 text-green-400 bg-green-400/10',
  active: 'border-teal-400/50 text-teal-400',
  probation: 'border-yellow-400/50 text-yellow-400',
  inactive: 'border-muted-foreground/40 text-muted-foreground',
};

// ── Auto-detection ─────────────────────────────────────────────────────────────

function detectRecurringIssues(jobs: CompletedJob[], requests: ServiceRequest[]): RecurringFlag[] {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 90);

  // Unify into { equipmentSystem, date } entries
  const entries: { equipmentSystem: string; date: string }[] = [
    ...jobs.map(j => ({ equipmentSystem: j.equipmentSystem, date: j.date })),
    ...requests.map(r => ({ equipmentSystem: r.equipmentSystem, date: r.createdAt })),
  ];

  // Group by normalized equipmentSystem
  const groups = new Map<string, { equipmentSystem: string; dates: string[] }>();
  for (const entry of entries) {
    const key = entry.equipmentSystem.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, { equipmentSystem: entry.equipmentSystem, dates: [] });
    }
    groups.get(key)!.dates.push(entry.date);
  }

  const flags: RecurringFlag[] = [];
  for (const { equipmentSystem, dates } of groups.values()) {
    // Filter to dates within last 90 days
    const recent = dates.filter(d => {
      const parsed = new Date(d);
      return !isNaN(parsed.getTime()) && parsed >= cutoff && parsed <= today;
    });
    if (recent.length >= 3) {
      const sorted = [...recent].sort((a, b) => b.localeCompare(a));
      const lastService = sorted[0];
      const count = recent.length;
      flags.push({
        id: `auto-${equipmentSystem.replace(/\s+/g, '-').toLowerCase()}`,
        equipmentSystem,
        serviceCount: count,
        lastService,
        issue: `${count} service events in last 90 days — review for root cause`,
      });
    }
  }

  return flags;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_COMPLETED_JOBS: CompletedJob[] = [
  {
    id: 'cj-001', date: '2026-04-22', equipmentSystem: 'Chiller — Unit 3',
    workType: 'repair', vendor: 'Arctic HVAC', techName: 'Marcus Bell',
    duration: '4h 30m',
    outcome: 'Replaced refrigerant leak at evaporator coil header. System returned to 44°F setpoint.',
    recommendation: 'Schedule full coil inspection within 30 days — surface corrosion noted on adjacent circuits.',
    facilityImpact: 'Restored 180-ton cooling capacity to main air handlers',
    linkedWO: 'WO-2041',
  },
  {
    id: 'cj-002', date: '2026-04-20', equipmentSystem: 'Cooling Tower Fan Motor — CT-2',
    workType: 'pm', vendor: 'Summit Mechanical', techName: 'Daria Osei',
    duration: '2h 15m',
    outcome: 'Quarterly PM completed. Lubricated bearings, checked belt tension, cleaned basin, tested controls.',
    facilityImpact: 'Condenser water supply temp maintained at 85°F design point',
  },
  {
    id: 'cj-003', date: '2026-04-18', equipmentSystem: 'Boiler Feed Pump — BFP-1',
    workType: 'repair', vendor: 'ThermoLine Services', techName: 'Roy Castillo',
    duration: '6h 00m',
    outcome: 'Replaced mechanical seal and impeller. Pump restored to full flow capacity.',
    recommendation: 'Verify water treatment dosing — hardness fouling on impeller suggests scale buildup.',
  },
  {
    id: 'cj-004', date: '2026-04-15', equipmentSystem: 'AHU-4 Cooling Coil',
    workType: 'maintenance', vendor: 'Arctic HVAC', techName: 'Janet Liu',
    duration: '3h 00m',
    outcome: 'Cleaned and inspected cooling coil. Cleared blocked condensate drain, confirmed 55°F leaving air temp.',
    facilityImpact: 'Restored airflow balance to zones 4A–4D',
  },
  {
    id: 'cj-005', date: '2026-04-12', equipmentSystem: 'Condenser Water Pump — CWP-2',
    workType: 'inspection', vendor: 'Summit Mechanical', techName: 'Daria Osei',
    duration: '1h 30m',
    outcome: 'Annual inspection complete. Motor current, vibration, and flow within spec. No corrective action needed.',
  },
  {
    id: 'cj-006', date: '2026-04-08', equipmentSystem: 'Exhaust Fan VFD — EF-7',
    workType: 'retrofit', vendor: 'Controls Pro', techName: 'Nathan Fox',
    duration: '5h 45m',
    outcome: 'Replaced failed fixed-speed starter with Allen Bradley PowerFlex 525 VFD. Programmed ramp/decel.',
    recommendation: 'Update BAS sequence to enable demand-controlled ventilation on new drive.',
    facilityImpact: 'Estimated 18% reduction in fan energy on EF-7 circuit',
    linkedWO: 'WO-1987',
  },
];

const MOCK_ACTIVE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-001', createdAt: '2026-04-25', scheduledDate: '2026-04-28',
    equipmentSystem: 'Chiller — Unit 1', workType: 'PM',
    priority: 'medium', status: 'scheduled',
    assignedVendor: 'Arctic HVAC', assignedTech: 'Marcus Bell',
    notes: 'Annual spring startup PM before peak season',
  },
  {
    id: 'sr-002', createdAt: '2026-04-24',
    equipmentSystem: 'Boiler — B-2', workType: 'Repair',
    priority: 'critical', status: 'emergency',
    assignedVendor: 'ThermoLine Services',
    notes: 'Low water cutoff tripped repeatedly — boiler offline. Heating zone 3 affected.',
  },
  {
    id: 'sr-003', createdAt: '2026-04-23', scheduledDate: '2026-04-30',
    equipmentSystem: 'RTU-5 Rooftop Unit', workType: 'Inspection',
    priority: 'low', status: 'approved',
    assignedVendor: 'Arctic HVAC',
    notes: 'Tenant complaint of uneven temps in suite 220',
  },
  {
    id: 'sr-004', createdAt: '2026-04-21',
    equipmentSystem: 'AHU-4 Cooling Coil', workType: 'Repair',
    priority: 'high', status: 'delayed',
    assignedVendor: 'Arctic HVAC', assignedTech: 'Janet Liu',
    delayReason: 'Coil replacement part on back-order, ETA 2026-05-02',
    notes: 'Coil fin damage found during April 15 maintenance visit',
  },
  {
    id: 'sr-005', createdAt: '2026-04-20', scheduledDate: '2026-04-26',
    equipmentSystem: 'DDC Controls — Wing B', workType: 'Install',
    priority: 'medium', status: 'in_progress',
    assignedVendor: 'Controls Pro', assignedTech: 'Nathan Fox',
    notes: 'Phase 2 BAS controller replacement underway',
  },
  {
    id: 'sr-006', createdAt: '2026-04-19',
    equipmentSystem: 'Cooling Tower — CT-1', workType: 'Maintenance',
    priority: 'medium', status: 'requested',
    notes: 'Basin cleaning and water treatment check before summer ops',
  },
  {
    id: 'sr-007', createdAt: '2026-04-17', scheduledDate: '2026-05-05',
    equipmentSystem: 'Exhaust Fan Array — Parking Garage', workType: 'PM',
    priority: 'low', status: 'scheduled',
    assignedVendor: 'Summit Mechanical',
    notes: 'Annual belt & bearing PM, 12 fans',
  },
  {
    id: 'sr-008', createdAt: '2026-04-15',
    equipmentSystem: 'Steam Trap Survey — Campus Wide', workType: 'Inspection',
    priority: 'medium', status: 'approved',
    assignedVendor: 'ThermoLine Services',
    notes: 'Full campus steam trap audit, ~80 traps',
  },
];

const MOCK_VENDOR_SITES: VendorSite[] = [
  {
    id: 'vs-001', vendorName: 'Arctic HVAC', serviceCategory: 'HVAC',
    primaryContact: 'Karen Reyes', phone: '(312) 555-0142', email: 'kreyes@arctichvac.com',
    assignedFacilities: ['Main Campus', 'West Annex', 'Parking Structure'],
    openJobs: 4, completedJobs: 38, lastService: '2026-04-22', completionRate: 94,
    responseTime: '1.5h avg', status: 'preferred',
  },
  {
    id: 'vs-002', vendorName: 'Summit Mechanical', serviceCategory: 'Mechanical',
    primaryContact: 'Daria Osei', phone: '(312) 555-0271', email: 'dosei@summitmech.com',
    assignedFacilities: ['Main Campus', 'South Plant'],
    openJobs: 2, completedJobs: 22, lastService: '2026-04-20', completionRate: 87,
    responseTime: '2h avg', status: 'active',
  },
  {
    id: 'vs-003', vendorName: 'ThermoLine Services', serviceCategory: 'Mechanical',
    primaryContact: 'Roy Castillo', phone: '(773) 555-0389', email: 'rcastillo@thermoline.com',
    assignedFacilities: ['Main Campus', 'Boiler Plant'],
    openJobs: 3, completedJobs: 14, lastService: '2026-04-18', completionRate: 71,
    responseTime: '3h avg', status: 'probation',
  },
  {
    id: 'vs-004', vendorName: 'Controls Pro', serviceCategory: 'Controls',
    primaryContact: 'Nathan Fox', phone: '(312) 555-0504', email: 'nfox@controlspro.com',
    assignedFacilities: ['Main Campus'],
    openJobs: 1, completedJobs: 9, lastService: '2026-04-08', completionRate: 91,
    responseTime: '2.5h avg', status: 'active',
  },
  {
    id: 'vs-005', vendorName: 'Apex Electrical', serviceCategory: 'Electrical',
    primaryContact: 'Simone Park', phone: '(708) 555-0617', email: 'spark@apexelec.com',
    assignedFacilities: ['West Annex', 'Parking Structure'],
    openJobs: 0, completedJobs: 6, lastService: '2026-03-14', completionRate: 100,
    responseTime: '4h avg', status: 'inactive',
  },
];

const MOCK_RECURRING_FLAGS: RecurringFlag[] = [
  {
    id: 'rf-001', equipmentSystem: 'Chiller — Unit 3',
    serviceCount: 4, lastService: '2026-04-22',
    issue: '4 service calls in 67 days — refrigerant leak history, recurring coil corrosion',
  },
  {
    id: 'rf-002', equipmentSystem: 'AHU-4 Cooling Coil',
    serviceCount: 3, lastService: '2026-04-15',
    issue: '3 service calls in 82 days — drain blockage, coil fin damage, now coil replacement pending',
  },
];

const MOCK_AGING_WO: WorkOrder[] = [
  { id: 'WO-1901', equipmentSystem: 'Steam Trap — Building D', createdAt: '2026-03-14', ageDays: 43 },
  { id: 'WO-1945', equipmentSystem: 'Humidifier — AHU-2', createdAt: '2026-03-28', ageDays: 29 },
  { id: 'WO-1987', equipmentSystem: 'Exhaust Fan VFD — EF-7', createdAt: '2026-04-08', ageDays: 18 },
  { id: 'WO-2019', equipmentSystem: 'Makeup Air Unit — MAU-1', createdAt: '2026-04-17', ageDays: 9 },
  { id: 'WO-2038', equipmentSystem: 'DDC Sensor — Zone 14B', createdAt: '2026-04-22', ageDays: 4 },
];

// ── Sub-components ──────────────────────────────────────────────────────────────

function CompletionGauge({ rate }: { rate: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-semibold', rateColor(rate))}>{rate}%</span>
        <span className={cn('text-[10px]', rateColor(rate))}>{rateBand(rate).label}</span>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', rateBg(rate))} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

// ── Tab 1: Work Done ───────────────────────────────────────────────────────────

function WorkDoneTab() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CompletedJob[]>(() => {
    const saved = safeParseArray<CompletedJob>('svc_completed_jobs');
    return saved.length > 0 ? saved : MOCK_COMPLETED_JOBS;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    equipmentSystem: '', workType: 'repair' as WorkType,
    vendor: '', techName: '', duration: '', outcome: '', recommendation: '',
  });

  const persist = (updated: CompletedJob[]) => {
    setJobs(updated);
    localStorage.setItem('svc_completed_jobs', JSON.stringify(updated));
  };

  const handleSave = () => {
    if (!form.equipmentSystem || !form.outcome) {
      toast({ title: 'Missing fields', description: 'Equipment/System and Outcome are required.', variant: 'destructive' });
      return;
    }
    const newJob: CompletedJob = {
      id: `cj-${Date.now()}`,
      date: form.date,
      equipmentSystem: form.equipmentSystem,
      workType: form.workType,
      vendor: form.vendor,
      techName: form.techName,
      duration: form.duration,
      outcome: form.outcome,
      recommendation: form.recommendation || undefined,
    };
    persist([newJob, ...jobs]);
    setForm({ date: new Date().toISOString().split('T')[0], equipmentSystem: '', workType: 'repair', vendor: '', techName: '', duration: '', outcome: '', recommendation: '' });
    setShowForm(false);
    toast({ title: 'Job logged', description: `${newJob.equipmentSystem} saved.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{jobs.length} completed jobs</p>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)} className="border-border/50 gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : '+ Log Completed Job'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Log Completed Job</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Work Type</label>
                <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value as WorkType }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50">
                  {(['repair','maintenance','inspection','install','retrofit','emergency','pm'] as WorkType[]).map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Equipment / System *</label>
              <input type="text" placeholder="e.g. Chiller — Unit 3" value={form.equipmentSystem} onChange={e => setForm(f => ({ ...f, equipmentSystem: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vendor</label>
                <input type="text" placeholder="Company name" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tech Name</label>
                <input type="text" placeholder="Technician name" value={form.techName} onChange={e => setForm(f => ({ ...f, techName: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Duration</label>
              <input type="text" placeholder="e.g. 4h 30m" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Outcome / Work Performed *</label>
              <textarea rows={3} placeholder="Describe work performed and result..." value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Recommendation (optional)</label>
              <textarea rows={2} placeholder="Follow-up actions, parts to order, next service..." value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
            </div>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">Save Job</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {jobs.map(job => (
          <Card key={job.id} className="bg-card border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{job.equipmentSystem}</p>
                  <p className="text-xs text-muted-foreground">{job.date}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn('text-[10px] capitalize', workTypeBadgeClass(job.workType))}>
                    {job.workType}
                  </Badge>
                  {job.facilityImpact && (
                    <Badge variant="outline" className="text-[10px] border-teal-400/40 text-teal-400 bg-teal-400/5">
                      FI Impact
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {job.vendor && <span><Users className="w-3 h-3 inline mr-1" />{job.vendor}</span>}
                {job.techName && <span>{job.techName}</span>}
                {job.duration && <span><Clock className="w-3 h-3 inline mr-1" />{job.duration}</span>}
                {job.linkedWO && <span className="text-purple-400">{job.linkedWO}</span>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{job.outcome}</p>
              {job.facilityImpact && (
                <p className="text-xs text-teal-400/80 italic">{job.facilityImpact}</p>
              )}
              {job.recommendation && (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-2.5">
                  <p className="text-[11px] text-yellow-400 font-semibold mb-0.5">Recommendation</p>
                  <p className="text-xs text-yellow-300/80">{job.recommendation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Active Requests ─────────────────────────────────────────────────────

const ALL_STATUSES: RequestStatus[] = ['emergency', 'in_progress', 'scheduled', 'approved', 'requested', 'delayed'];

function ActiveRequestsTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const saved = safeParseArray<ServiceRequest>('svc_active_requests');
    return saved.length > 0 ? saved : MOCK_ACTIVE_REQUESTS;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    equipmentSystem: '', workType: '', priority: 'medium' as Priority,
    scheduledDate: '', assignedVendor: '', notes: '',
  });

  const persist = (updated: ServiceRequest[]) => {
    setRequests(updated);
    localStorage.setItem('svc_active_requests', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!form.equipmentSystem) {
      toast({ title: 'Missing field', description: 'Equipment/System is required.', variant: 'destructive' });
      return;
    }
    const newReq: ServiceRequest = {
      id: `sr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      equipmentSystem: form.equipmentSystem,
      workType: form.workType,
      priority: form.priority,
      status: 'requested',
      scheduledDate: form.scheduledDate || undefined,
      assignedVendor: form.assignedVendor || undefined,
      notes: form.notes || undefined,
    };
    persist([newReq, ...requests]);
    setForm({ equipmentSystem: '', workType: '', priority: 'medium', scheduledDate: '', assignedVendor: '', notes: '' });
    setShowForm(false);
    toast({ title: 'Request created', description: `${newReq.equipmentSystem} added.` });
  };

  const updateStatus = (id: string, status: RequestStatus) => {
    persist(requests.map(r => r.id === id ? { ...r, status } : r));
  };

  const grouped = ALL_STATUSES.reduce<Record<RequestStatus, ServiceRequest[]>>((acc, s) => {
    acc[s] = requests.filter(r => r.status === s);
    return acc;
  }, {} as Record<RequestStatus, ServiceRequest[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{requests.length} active requests</p>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)} className="border-border/50 gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : '+ New Request'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Service Request</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Equipment / System *</label>
              <input type="text" placeholder="e.g. AHU-4 Cooling Coil" value={form.equipmentSystem} onChange={e => setForm(f => ({ ...f, equipmentSystem: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Work Type</label>
                <input type="text" placeholder="Repair, PM, Inspection..." value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50">
                  {(['low','medium','high','critical'] as Priority[]).map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Scheduled Date</label>
                <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Assigned Vendor</label>
                <input type="text" placeholder="Vendor name" value={form.assignedVendor} onChange={e => setForm(f => ({ ...f, assignedVendor: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <textarea rows={2} placeholder="Additional context..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
            </div>
            <Button size="sm" onClick={handleAdd} className="bg-primary text-primary-foreground">Create Request</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {ALL_STATUSES.map(status => {
          const group = grouped[status];
          if (group.length === 0) return null;
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold uppercase tracking-wider', statusBadgeClass(status).split(' ').find(c => c.startsWith('text-')))}>{statusLabel[status]}</span>
                <Badge variant="outline" className={cn('text-[10px]', statusBadgeClass(status))}>{group.length}</Badge>
              </div>
              <div className="space-y-2">
                {group.map(req => (
                  <Card key={req.id} className={cn('bg-card border-border', req.status === 'emergency' && 'animate-pulse border-red-500/40')}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">{req.equipmentSystem}</p>
                          <p className="text-xs text-muted-foreground">{req.workType} · Created {req.createdAt}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', priorityBadgeClass(req.priority))}>
                          {req.priority}
                        </Badge>
                      </div>
                      {(req.assignedVendor || req.assignedTech || req.scheduledDate) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {req.assignedVendor && <span><Users className="w-3 h-3 inline mr-1" />{req.assignedVendor}</span>}
                          {req.assignedTech && <span>{req.assignedTech}</span>}
                          {req.scheduledDate && <span><Clock className="w-3 h-3 inline mr-1" />Sched: {req.scheduledDate}</span>}
                        </div>
                      )}
                      {req.notes && <p className="text-xs text-muted-foreground">{req.notes}</p>}
                      {req.delayReason && (
                        <p className="text-xs text-orange-400"><AlertTriangle className="w-3 h-3 inline mr-1" />{req.delayReason}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground">Update Status:</span>
                        <select value={req.status} onChange={e => updateStatus(req.id, e.target.value as RequestStatus)}
                          className="bg-background border border-border/40 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-primary/50">
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{statusLabel[s]}</option>
                          ))}
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 3: Vendor / Client View ────────────────────────────────────────────────

function VendorViewTab() {
  const [vendors] = useState<VendorSite[]>(() => {
    const saved = safeParseArray<VendorSite>('svc_vendor_sites');
    return saved.length > 0 ? saved : MOCK_VENDOR_SITES;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{vendors.length} vendor records</p>
      <div className="grid gap-4 md:grid-cols-2">
        {vendors.map(v => (
          <Card key={v.id} className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{v.vendorName}</p>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary mt-0.5">{v.serviceCategory}</Badge>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', vendorStatusBadge[v.status])}>
                  {v.status}
                </Badge>
              </div>

              {/* Completion rate */}
              <CompletionGauge rate={v.completionRate} />

              {/* Job counts */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-orange-400 font-medium">{v.openJobs} open</span>
                <span className="text-green-400 font-medium">{v.completedJobs} completed</span>
                <span className="text-muted-foreground"><Timer className="w-3 h-3 inline mr-1" />{v.responseTime}</span>
              </div>

              {/* Last service */}
              <p className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />Last service: {v.lastService}</p>

              {/* Facilities */}
              <div className="flex flex-wrap gap-1">
                {v.assignedFacilities.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground">
                    <Building2 className="w-2.5 h-2.5 inline mr-0.5" />{f}
                  </span>
                ))}
              </div>

              {/* Contact */}
              <div className="border-t border-border/30 pt-2 space-y-1">
                <p className="text-xs font-medium">{v.primaryContact}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span><Phone className="w-3 h-3 inline mr-1" />{v.phone}</span>
                  <span><Mail className="w-3 h-3 inline mr-1" />{v.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: Performance ─────────────────────────────────────────────────────────

function PerformanceTab() {
  const total = 47;
  const completed = 31;
  const open = 12;
  const delayed = 3;
  const cancelled = 1;
  const needsFollowUp = 2;
  const completionRate = Math.round((completed / total) * 100);
  const onTimeRate = 78;
  const onTimeJobs = 24;
  const lateJobs = 7;
  const avgDays = 3.2;
  const bestVendor = 'Arctic HVAC';
  const bestVendorRate = 94;

  const band = rateBand(completionRate);

  const [savedRecurringFlags] = useState<RecurringFlag[]>(() => {
    const saved = safeParseArray<RecurringFlag>('svc_recurring_flags');
    return saved.length > 0 ? saved : MOCK_RECURRING_FLAGS;
  });

  const [completedJobs] = useState<CompletedJob[]>(() => {
    const saved = safeParseArray<CompletedJob>('svc_completed_jobs');
    return saved.length > 0 ? saved : MOCK_COMPLETED_JOBS;
  });

  const [activeRequests] = useState<ServiceRequest[]>(() => {
    const saved = safeParseArray<ServiceRequest>('svc_active_requests');
    return saved.length > 0 ? saved : MOCK_ACTIVE_REQUESTS;
  });

  const autoFlags = useMemo(
    () => detectRecurringIssues(completedJobs, activeRequests),
    [completedJobs, activeRequests],
  );

  const recurringFlags = useMemo(() => {
    const autoSystems = new Set(autoFlags.map(f => f.equipmentSystem.toLowerCase().trim()));
    const savedExtras = savedRecurringFlags.filter(
      f => !autoSystems.has(f.equipmentSystem.toLowerCase().trim()),
    );
    return [...autoFlags, ...savedExtras];
  }, [autoFlags, savedRecurringFlags]);

  useEffect(() => {
    localStorage.setItem('svc_recurring_flags', JSON.stringify(autoFlags));
  }, [autoFlags]);

  const agingWO = MOCK_AGING_WO.slice().sort((a, b) => b.ageDays - a.ageDays);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Completion Rate */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className={cn('text-5xl font-bold', rateColor(completionRate))}>{completionRate}%</p>
            <p className={cn('text-sm font-medium mt-1', band.color)}>{band.label}</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Completed', value: completed, color: 'text-green-400' },
              { label: 'Open', value: open, color: 'text-blue-400' },
              { label: 'Delayed', value: delayed, color: 'text-orange-400' },
              { label: 'Cancelled', value: cancelled, color: 'text-muted-foreground' },
              { label: 'Needs Follow-Up', value: needsFollowUp, color: 'text-yellow-400' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn('font-semibold', row.color)}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2 space-y-0.5">
            <p><span className="text-green-400">≥90%</span> Excellent &nbsp;·&nbsp; <span className="text-yellow-400">75–89%</span> Good &nbsp;·&nbsp; <span className="text-orange-400">60–74%</span> Watch &nbsp;·&nbsp; <span className="text-red-400">&lt;60%</span> Risk</p>
          </div>
        </CardContent>
      </Card>

      {/* On-Time Completion */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />On-Time Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className={cn('text-5xl font-bold', rateColor(onTimeRate))}>{onTimeRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">on-time rate</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">On-Time Jobs</span>
              <span className="text-green-400 font-semibold">{onTimeJobs}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Late Jobs</span>
              <span className="text-red-400 font-semibold">{lateJobs}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Avg Days to Complete</span>
              <span className="text-foreground font-semibold">{avgDays}d</span>
            </div>
          </div>
          <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-2.5">
            <p className="text-[11px] text-green-400 font-semibold">Best Performing Vendor</p>
            <p className="text-xs text-foreground mt-0.5">{bestVendor} — <span className="text-green-400 font-bold">{bestVendorRate}%</span> on-time</p>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Issues */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="w-4 h-4 text-orange-400" />Recurring Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recurringFlags.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No recurring issues detected. All equipment service frequency is within normal range.
            </p>
          ) : (
            recurringFlags.map(flag => {
              const isAuto = flag.id.startsWith('auto-');
              return (
                <div key={flag.id} className="rounded-lg border border-orange-400/30 bg-orange-400/5 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-orange-300">{flag.equipmentSystem}</p>
                    <div className="flex items-center gap-1.5">
                      {isAuto && (
                        <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-400 bg-orange-400/10">
                          Auto-Detected
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] border-orange-400/40 text-orange-400">
                        {flag.serviceCount}x in 90d
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-orange-200/80">{flag.serviceCount} service events</span> in 90 days
                  </p>
                  <p className="text-[10px] text-muted-foreground">Last service: {flag.lastService}</p>
                  <p className="text-xs text-orange-200/70">{flag.issue}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Work Aging */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="w-4 h-4 text-yellow-400" />Work Order Aging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {agingWO.map(wo => (
            <div key={wo.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/10">
              <div>
                <p className="text-xs font-medium">{wo.equipmentSystem}</p>
                <p className="text-[10px] text-muted-foreground">{wo.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full shrink-0', ageDot(wo.ageDays))} />
                <span className={cn('text-xs font-semibold tabular-nums', ageColor(wo.ageDays))}>{wo.ageDays}d</span>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground pt-1 space-y-0.5">
            <p><span className="text-red-400">■</span> &gt;30d &nbsp;·&nbsp; <span className="text-orange-400">■</span> 15–30d &nbsp;·&nbsp; <span className="text-yellow-400">■</span> 7–14d &nbsp;·&nbsp; <span className="text-green-400">■</span> &lt;7d</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RetailDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [tick, setTick] = useState(0);

  // Financial metrics hook — provides asset value, WO spend, compliance rate, etc.
  const fin = useFinancialMetrics(tick);

  // Refresh fin metrics on relevant storage events
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('equipment-updated', handler);
    window.addEventListener('facility-log-submitted', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('equipment-updated', handler);
      window.removeEventListener('facility-log-submitted', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // KPI state
  const [kpis, setKpis] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('service_tech_kpis') || 'null');
      if (saved && typeof saved === 'object') return saved;
    } catch { /* ignore */ }
    return { total: 47, completed: 31, open: 12, inProgress: 4, onTimeRate: 78, emergencyAlerts: 3 };
  });

  // Auto-compute recurring issues count from live localStorage data
  const [kpiCompletedJobs] = useState<CompletedJob[]>(() => {
    const saved = safeParseArray<CompletedJob>('svc_completed_jobs');
    return saved.length > 0 ? saved : MOCK_COMPLETED_JOBS;
  });
  const [kpiActiveRequests] = useState<ServiceRequest[]>(() => {
    const saved = safeParseArray<ServiceRequest>('svc_active_requests');
    return saved.length > 0 ? saved : MOCK_ACTIVE_REQUESTS;
  });
  const kpiAutoFlags = useMemo(
    () => detectRecurringIssues(kpiCompletedJobs, kpiActiveRequests),
    [kpiCompletedJobs, kpiActiveRequests],
  );
  const kpiSavedFlags = useMemo<RecurringFlag[]>(() => {
    const saved = safeParseArray<RecurringFlag>('svc_recurring_flags');
    return saved.length > 0 ? saved : MOCK_RECURRING_FLAGS;
  }, []);
  const recurringIssuesCount = useMemo(() => {
    const autoSystems = new Set(kpiAutoFlags.map(f => f.equipmentSystem.toLowerCase().trim()));
    const savedExtras = kpiSavedFlags.filter(
      f => !autoSystems.has(f.equipmentSystem.toLowerCase().trim()),
    );
    return kpiAutoFlags.length + savedExtras.length;
  }, [kpiAutoFlags, kpiSavedFlags]);

  const [upgradeBannerOpen, setUpgradeBannerOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem('service_tech_kpis', JSON.stringify(kpis));
  }, [kpis]);

  // ── Retail Intelligence data ───────────────────────────────────────────────
  const storeId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const [retailTick, setRetailTick] = useState(0);
  useEffect(() => {
    const handler = () => setRetailTick(t => t + 1);
    window.addEventListener('nexum_retail_update', handler);
    return () => window.removeEventListener('nexum_retail_update', handler);
  }, []);

  const retailProfile  = useMemo(() => loadStoreProfile(storeId),    [storeId, retailTick]);
  const retailInv      = useMemo(() => loadInventory(storeId),        [storeId, retailTick]);
  const retailShrink   = useMemo(() => loadShrink(storeId),           [storeId, retailTick]);
  const retailFS       = useMemo(() => loadFoodSafety(storeId),       [storeId, retailTick]);
  const retailComp     = useMemo(() => loadCompliance(storeId),       [storeId, retailTick]);
  const retailVendors  = useMemo(() => loadVendorLogs(storeId),       [storeId, retailTick]);
  const retailTasks    = useMemo(() => loadTasks(storeId),            [storeId, retailTick]);
  const retailEnergy   = useMemo(() => loadEnergy(storeId),           [storeId, retailTick]);

  const invHealth  = useMemo(() => buildInventoryHealth(retailInv),                                 [retailInv]);
  const shrinkSum  = useMemo(() => buildShrinkSummary(retailShrink, retailInv),                    [retailShrink, retailInv]);
  const fsScore    = useMemo(() => buildFoodSafetyScore(retailFS, retailComp),                     [retailFS, retailComp]);
  const vendorInt  = useMemo(() => buildVendorIntelligence(retailVendors),                         [retailVendors]);
  const opsEff     = useMemo(() => buildOperationalEfficiency(retailTasks),                        [retailTasks]);
  const retailCTS  = useMemo(() => buildRetailCTS(retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks), [retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks]);
  const retailExec = useMemo(() => buildRetailExecutiveSummary(retailProfile, retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks, retailEnergy), [retailProfile, retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks, retailEnergy]);
  const retailTimeline = useMemo(() => buildRetailTimeline(retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks), [retailInv, retailShrink, retailFS, retailComp, retailVendors, retailTasks]);

  const fmtUSD = (v: number) => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(0)}`;

  const completionRate = Math.round((kpis.completed / kpis.total) * 100);

  // Prefer fin.openWorkOrderCount (reads nexum_work_orders) over stale kpis.open
  const liveOpenWOs = fin.openWorkOrderCount > 0 ? fin.openWorkOrderCount : kpis.open;

  const kpiCards = [
    { label: 'Total Work Orders', value: kpis.total, color: 'text-foreground', sub: 'all orders' },
    { label: 'Completed', value: kpis.completed, color: 'text-green-400', sub: 'finished' },
    { label: 'Open', value: liveOpenWOs, color: 'text-blue-400', sub: 'pending' },
    { label: 'In Progress', value: kpis.inProgress, color: 'text-teal-400', sub: 'active now' },
    { label: 'Completion Rate', value: `${completionRate}%`, color: rateColor(completionRate), sub: 'completed / total' },
    { label: 'On-Time Rate', value: `${kpis.onTimeRate}%`, color: rateColor(kpis.onTimeRate), sub: 'on-time completion' },
    { label: 'Emergency Alerts', value: kpis.emergencyAlerts, color: 'text-red-400', sub: 'require attention', badge: kpis.emergencyAlerts > 0 ? 'red' : undefined },
    { label: 'Recurring Issues', value: recurringIssuesCount, color: recurringIssuesCount > 0 ? 'text-orange-400' : 'text-muted-foreground', sub: '≥3 calls / 90 days', badge: recurringIssuesCount > 0 ? 'orange' : undefined },
  ];

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Service & Vendor Intelligence</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">OPERATIONS</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Work Orders · Vendor Performance · Field Operations</p>
          </div>
          {!isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate('/pricing')}>
                <TrendingUp className="w-4 h-4 mr-2" />Upgrade to Pro
              </Button>
            </div>
          )}
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpiCards.map(({ label, value, color, sub, badge }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground leading-tight mb-1">{label}</p>
                <div className="flex items-center gap-1">
                  <p className={cn('text-xl font-bold leading-none', color)}>{value}</p>
                  {badge === 'red' && <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />}
                  {badge === 'orange' && <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="intelligence" className="space-y-4">
          <TabsList className="bg-muted/30 border border-border/50 flex-wrap h-auto">
            <TabsTrigger value="intelligence" className="text-xs data-[state=active]:bg-[#00FFE1]/20 data-[state=active]:text-[#00FFE1]">
              <Activity className="w-3 h-3 mr-1" />Intelligence
            </TabsTrigger>
            <TabsTrigger value="cts" className="text-xs data-[state=active]:bg-[#00FFE1]/20 data-[state=active]:text-[#00FFE1]">
              <ShieldCheck className="w-3 h-3 mr-1" />CTS™
            </TabsTrigger>
            <TabsTrigger value="work-done" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Work Done
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active Requests
            </TabsTrigger>
            <TabsTrigger value="vendor-view" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Vendor View
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Performance
            </TabsTrigger>
          </TabsList>

          {/* ── Intelligence Tab ── */}
          <TabsContent value="intelligence" className="space-y-6">
            {/* SPI Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Store Performance Index', value: `${retailExec.storePerformanceIndex}/100`, sub: 'CTS™ composite score', color: retailExec.storePerformanceIndex >= 80 ? 'text-green-400' : retailExec.storePerformanceIndex >= 65 ? 'text-yellow-400' : 'text-red-400', icon: Target },
                { label: 'Shrink Rate', value: `${shrinkSum.shrinkPct.toFixed(2)}%`, sub: `vs. ${retailProfile.targetShrinkPct}% target`, color: shrinkSum.shrinkPct <= retailProfile.targetShrinkPct ? 'text-green-400' : 'text-red-400', icon: Shield },
                { label: 'Food Safety Score', value: `${fsScore.overallScore}/100`, sub: `${fsScore.passRate.toFixed(0)}% checks passed`, color: fsScore.overallScore >= 90 ? 'text-green-400' : fsScore.overallScore >= 80 ? 'text-yellow-400' : 'text-red-400', icon: CheckCircle2 },
                { label: 'Vendor Fill Rate', value: `${vendorInt.avgFillRate.toFixed(1)}%`, sub: `${vendorInt.totalVendors} vendors tracked`, color: vendorInt.avgFillRate >= 95 ? 'text-green-400' : vendorInt.avgFillRate >= 85 ? 'text-yellow-400' : 'text-red-400', icon: Truck },
              ].map(k => (
                <Card key={k.label} className="border-white/10 bg-white/2">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <k.icon className={cn('w-3.5 h-3.5', k.color)} />
                      <span className="text-[10px] text-muted-foreground">{k.label}</span>
                    </div>
                    <div className={cn('text-xl font-bold', k.color)}>{k.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inventory Health */}
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-purple-400" />Inventory Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {[
                    { label: 'Total SKUs', value: invHealth.totalSkus.toLocaleString(), color: 'text-foreground' },
                    { label: 'Out-of-Stock Rate', value: `${invHealth.outOfStockRate.toFixed(1)}%`, color: invHealth.outOfStockRate > 5 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Inventory Turn', value: `${invHealth.turnDays.toFixed(0)} days`, color: invHealth.turnDays > retailProfile.targetInventoryTurnDays ? 'text-yellow-400' : 'text-green-400' },
                    { label: 'Dead Stock Value', value: fmtUSD(invHealth.deadStockValue), color: invHealth.deadStockValue > 0 ? 'text-orange-400' : 'text-green-400' },
                    { label: 'Expiry Risk', value: fmtUSD(invHealth.expiryRisk), color: invHealth.expiryRisk > 0 ? 'text-red-400' : 'text-green-400' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-xs border-b border-white/5 pb-1 last:border-0">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={cn('font-semibold', r.color)}>{r.value}</span>
                    </div>
                  ))}
                  {invHealth.reorderAlerts.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {invHealth.reorderAlerts.slice(0,2).map((a,i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-yellow-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{a}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shrink Intelligence */}
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-red-400" />Loss Prevention Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {[
                    { label: 'Shrink Value (30d)', value: fmtUSD(shrinkSum.totalShrinkValue), color: shrinkSum.totalShrinkValue > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'WoW Change', value: `${shrinkSum.weekOverWeekChange > 0 ? '+' : ''}${shrinkSum.weekOverWeekChange.toFixed(0)}%`, color: shrinkSum.weekOverWeekChange > 10 ? 'text-red-400' : shrinkSum.weekOverWeekChange > 0 ? 'text-yellow-400' : 'text-green-400' },
                    { label: 'Top Category', value: shrinkSum.topCategory.replace(/_/g,' '), color: 'text-orange-400' },
                    { label: 'Top Department', value: shrinkSum.topDepartment, color: 'text-foreground' },
                    { label: 'Open Cases', value: `${shrinkSum.openCases}`, color: shrinkSum.openCases > 3 ? 'text-red-400' : 'text-foreground' },
                    { label: 'Recovered Value', value: fmtUSD(shrinkSum.recoveredValue), color: 'text-green-400' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-xs border-b border-white/5 pb-1 last:border-0">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={cn('font-semibold', r.color)}>{r.value}</span>
                    </div>
                  ))}
                  {shrinkSum.preventionActions.slice(0,1).map((a,i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-[#00FFE1] mt-1">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />{a}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Food Safety */}
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Food Safety & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn('text-3xl font-bold', fsScore.overallScore >= 90 ? 'text-green-400' : fsScore.overallScore >= 80 ? 'text-yellow-400' : 'text-red-400')}>
                      {fsScore.overallScore}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Health Inspection Score</div>
                      <Progress value={fsScore.overallScore} className="h-1.5 w-24 mt-1" />
                    </div>
                  </div>
                  {[
                    { label: 'Temperature Compliance', value: `${fsScore.temperatureCompliance.toFixed(0)}%`, color: fsScore.temperatureCompliance >= 95 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Sanitation Compliance', value: `${fsScore.sanitationCompliance.toFixed(0)}%`, color: fsScore.sanitationCompliance >= 90 ? 'text-green-400' : 'text-yellow-400' },
                    { label: 'Critical Violations', value: `${fsScore.criticalViolations}`, color: fsScore.criticalViolations > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Expiring Permits', value: `${fsScore.expiringPermits.length}`, color: fsScore.expiringPermits.length > 0 ? 'text-orange-400' : 'text-green-400' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-xs border-b border-white/5 pb-1 last:border-0">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={cn('font-semibold', r.color)}>{r.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Operational Efficiency */}
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-blue-400" />Operational Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {[
                    { label: 'Task Completion Rate', value: `${opsEff.taskCompletionRate.toFixed(0)}%`, color: opsEff.taskCompletionRate >= 85 ? 'text-green-400' : 'text-yellow-400' },
                    { label: 'On-Time Rate', value: `${opsEff.onTimeCompletionRate.toFixed(0)}%`, color: opsEff.onTimeCompletionRate >= 80 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Critical Missed', value: `${opsEff.criticalTasksMissed}`, color: opsEff.criticalTasksMissed > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Best Shift', value: opsEff.bestShift, color: 'text-green-400' },
                    { label: 'Worst Shift', value: opsEff.worstShift, color: 'text-orange-400' },
                    { label: 'Top Missed Dept', value: opsEff.topMissedCategory, color: 'text-muted-foreground' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-xs border-b border-white/5 pb-1 last:border-0">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={cn('font-semibold capitalize', r.color)}>{r.value || 'N/A'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Quick Wins & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Quick Wins
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {retailExec.quickWins.length === 0
                    ? <p className="text-xs text-muted-foreground">Log store activity to generate recommendations.</p>
                    : retailExec.quickWins.map((w,i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{w}</span>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />Risk Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {retailExec.topRisks.length === 0
                    ? <p className="text-xs text-muted-foreground">No active risk flags.</p>
                    : retailExec.topRisks.map((r,i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{r}</span>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            </div>

            {/* Intelligence Timeline */}
            {retailTimeline.length > 0 && (
              <Card className="border-white/10">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#00FFE1]" />Intelligence Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {retailTimeline.slice(0, 8).map(e => (
                    <div key={e.id} className="flex items-start gap-2 text-xs border-b border-white/5 pb-2 last:border-0">
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', e.severity === 'critical' ? 'bg-red-400' : e.severity === 'warning' ? 'bg-yellow-400' : 'bg-[#00FFE1]')} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{e.title}</div>
                        <div className="text-muted-foreground truncate">{e.description}</div>
                      </div>
                      {e.value && <span className={cn('text-[10px] font-semibold shrink-0', e.severity === 'critical' ? 'text-red-400' : 'text-muted-foreground')}>{e.value}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── CTS™ Tab ── */}
          <TabsContent value="cts" className="space-y-4">
            <RetailCTSPanel insights={retailCTS} compact={false} />
            {/* 5-year projection */}
            <Card className="border-white/10">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />Capital Projects & 5-Year Outlook
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {retailExec.capitalProjects.map((p,i) => (
                    <Badge key={i} variant="outline" className="text-xs text-purple-400 border-purple-400/30">{p}</Badge>
                  ))}
                </div>
                {retailExec.fiveYearProjection && (
                  <div className="p-3 rounded-lg border border-[#00FFE1]/20 bg-[#00FFE1]/5 text-xs text-muted-foreground">
                    <span className="text-[#00FFE1] font-semibold">5-Year Projection: </span>
                    {retailExec.fiveYearProjection}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="work-done">
            <WorkDoneTab />
          </TabsContent>

          <TabsContent value="active">
            <ActiveRequestsTab />
          </TabsContent>

          <TabsContent value="vendor-view">
            <VendorViewTab />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab />
          </TabsContent>
        </Tabs>

        {/* ── Tier Upgrade Banner — hidden for admin ── */}
        {!isAdmin && <Card className="bg-card border-border border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Unlock Full Service Tech Pro
              </CardTitle>
              <button onClick={() => setUpgradeBannerOpen(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                {upgradeBannerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </CardHeader>
          {upgradeBannerOpen && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  'Multi-client vendor aggregation',
                  'Advanced performance analytics',
                  'Automated service reminders',
                  'Vendor-branded reports',
                  'Emergency escalation workflows',
                ].map(feature => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate('/pricing')}>
                Upgrade to Pro <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          )}
        </Card>}

      </div>
    </MainLayout>
  );
}
