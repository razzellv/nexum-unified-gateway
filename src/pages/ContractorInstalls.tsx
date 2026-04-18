import { useState, useEffect, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import {
  HardHat, Plus, Search, Filter, CheckCircle2, Clock, AlertTriangle,
  Wrench, DollarSign, FileText, Camera, StickyNote, ChevronRight,
  Phone, Mail, Calendar, Building2, ClipboardList, BarChart3,
  Trash2, Upload, Download, Image, PlusCircle, Check, X,
  TrendingUp, Shield, Loader2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── TYPES ─────────────────────────────────────────────────────────────────────

type ProjectType = 'equipment_install' | 'system_upgrade' | 'retrofit' | 'repair' | 'inspection' | 'other';
type ProjectStatus = 'scheduled' | 'in_progress' | 'pending_inspection' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedDate: string;
}

interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  fileData: string;
  fileSize: number;
  uploadedAt: string;
}

interface ProjectPhoto {
  id: string;
  caption: string;
  imageData: string;
  takenAt: string;
}

interface NoteEntry {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

interface Project {
  projectId: string;
  projectName: string;
  contractorName: string;
  contractorCompany: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorLicense: string;
  projectType: ProjectType;
  equipmentType: string;
  location: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  estimatedEndDate: string;
  actualEndDate: string;
  estimatedCost: number;
  actualCost: number;
  poNumber: string;
  invoiceNumber: string;
  permitRequired: boolean;
  permitNumber: string;
  permitStatus: string;
  inspectionRequired: boolean;
  inspectionDate: string;
  inspectionResult: string;
  assignedTo: string;
  facilityId: string;
  notes: string;
  documents: ProjectDocument[];
  milestones: Milestone[];
  photos: ProjectPhoto[];
  noteLog: NoteEntry[];
  createdAt: string;
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexum_contractor_installs';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; icon: any }> = {
  scheduled:         { label: 'Scheduled',          color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',   icon: Calendar },
  in_progress:       { label: 'In Progress',         color: 'text-cyan-400',   bg: 'bg-cyan-400/10 border-cyan-400/30',   icon: Wrench },
  pending_inspection:{ label: 'Pending Inspection',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',icon: Shield },
  completed:         { label: 'Completed',           color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30', icon: CheckCircle2 },
  cancelled:         { label: 'Cancelled',           color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',     icon: X },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/30' },
  medium:   { label: 'Medium',   color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30' },
};

const PROJECT_TYPES: { id: ProjectType; label: string }[] = [
  { id: 'equipment_install', label: 'Equipment Install' },
  { id: 'system_upgrade',    label: 'System Upgrade' },
  { id: 'retrofit',          label: 'Retrofit' },
  { id: 'repair',            label: 'Repair' },
  { id: 'inspection',        label: 'Inspection' },
  { id: 'other',             label: 'Other' },
];

const EQUIPMENT_TYPES = [
  'HVAC', 'Boiler', 'Chiller', 'Cooling Tower', 'Air Handler', 'Electrical',
  'Plumbing', 'Fire Suppression', 'Elevator', 'Generator', 'BMS/Controls',
  'Lighting', 'Roofing', 'Windows/Doors', 'Insulation', 'Other',
];

const SAMPLE_PROJECTS: Project[] = [
  {
    projectId: 'ci-sample-1',
    projectName: 'Chiller Unit Replacement — Building A',
    contractorName: 'Mike Harmon', contractorCompany: 'Tri-State Mechanical',
    contractorPhone: '(614) 882-3300', contractorEmail: 'mharmon@tristate.com',
    contractorLicense: 'OH-MECH-88421',
    projectType: 'equipment_install', equipmentType: 'Chiller',
    location: 'Building A — Mechanical Room B1', status: 'in_progress',
    priority: 'high', startDate: '2026-04-10', estimatedEndDate: '2026-04-25',
    actualEndDate: '', estimatedCost: 42000, actualCost: 0,
    poNumber: 'PO-2026-0312', invoiceNumber: '',
    permitRequired: true, permitNumber: 'BLDG-2026-441', permitStatus: 'Approved',
    inspectionRequired: true, inspectionDate: '2026-04-26', inspectionResult: '',
    assignedTo: 'Sarah Chen', facilityId: 'facility-001',
    notes: 'Replacing 20-year-old Carrier chiller. Coordinate shutdown windows with operations.',
    documents: [], photos: [], noteLog: [],
    milestones: [
      { id: 'm1', title: 'Old unit removed', dueDate: '2026-04-12', completed: true, completedDate: '2026-04-12' },
      { id: 'm2', title: 'New unit delivered and staged', dueDate: '2026-04-15', completed: true, completedDate: '2026-04-15' },
      { id: 'm3', title: 'Crane lift and placement', dueDate: '2026-04-17', completed: false, completedDate: '' },
      { id: 'm4', title: 'Piping connections complete', dueDate: '2026-04-21', completed: false, completedDate: '' },
      { id: 'm5', title: 'Electrical connections and startup', dueDate: '2026-04-24', completed: false, completedDate: '' },
    ],
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    projectId: 'ci-sample-2',
    projectName: 'LED Lighting Retrofit — Floors 3–6',
    contractorName: 'Dana Reyes', contractorCompany: 'Bright Path Electric',
    contractorPhone: '(513) 774-5591', contractorEmail: 'dreyes@brightpath.com',
    contractorLicense: 'OH-ELEC-22187',
    projectType: 'retrofit', equipmentType: 'Lighting',
    location: 'Main Building — Floors 3 through 6', status: 'scheduled',
    priority: 'medium', startDate: '2026-05-05', estimatedEndDate: '2026-05-20',
    actualEndDate: '', estimatedCost: 18500, actualCost: 0,
    poNumber: 'PO-2026-0389', invoiceNumber: '',
    permitRequired: false, permitNumber: '', permitStatus: '',
    inspectionRequired: false, inspectionDate: '', inspectionResult: '',
    assignedTo: 'James Torres', facilityId: 'facility-001',
    notes: 'Phased retrofit across 4 floors. Work after business hours only.',
    documents: [], photos: [], noteLog: [],
    milestones: [
      { id: 'm6', title: 'Floor 3 complete', dueDate: '2026-05-08', completed: false, completedDate: '' },
      { id: 'm7', title: 'Floor 4 complete', dueDate: '2026-05-11', completed: false, completedDate: '' },
      { id: 'm8', title: 'Floors 5–6 complete', dueDate: '2026-05-18', completed: false, completedDate: '' },
    ],
    createdAt: '2026-04-05T00:00:00Z',
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function blankProject(facilityId: string): Omit<Project, 'projectId' | 'createdAt'> {
  return {
    projectName: '', contractorName: '', contractorCompany: '', contractorPhone: '',
    contractorEmail: '', contractorLicense: '', projectType: 'equipment_install',
    equipmentType: '', location: '', status: 'scheduled', priority: 'medium',
    startDate: new Date().toISOString().split('T')[0], estimatedEndDate: '',
    actualEndDate: '', estimatedCost: 0, actualCost: 0, poNumber: '', invoiceNumber: '',
    permitRequired: false, permitNumber: '', permitStatus: '', inspectionRequired: false,
    inspectionDate: '', inspectionResult: '', assignedTo: '', facilityId,
    notes: '', documents: [], milestones: [], photos: [], noteLog: '',
  } as any;
}

function milestoneProgress(milestones: Milestone[]): number {
  if (!milestones.length) return 0;
  return Math.round((milestones.filter(m => m.completed).length / milestones.length) * 100);
}

function isOverdue(project: Project): boolean {
  if (!project.estimatedEndDate || ['completed', 'cancelled'].includes(project.status)) return false;
  return new Date(project.estimatedEndDate) < new Date();
}

function daysOverdue(project: Project): number {
  if (!isOverdue(project)) return 0;
  return Math.floor((Date.now() - new Date(project.estimatedEndDate).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtCurrency(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function thisMonth() {
  const now = new Date();
  return (p: Project) => {
    if (!p.actualEndDate) return false;
    const d = new Date(p.actualEndDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
}

// ── STEP FORM STATE ───────────────────────────────────────────────────────────

function blankForm(facilityId: string) {
  return {
    projectName: '', projectType: 'equipment_install' as ProjectType, equipmentType: '',
    location: '', priority: 'medium' as Priority, status: 'scheduled' as ProjectStatus,
    contractorName: '', contractorCompany: '', contractorPhone: '', contractorEmail: '', contractorLicense: '',
    startDate: new Date().toISOString().split('T')[0], estimatedEndDate: '', estimatedCost: 0, poNumber: '',
    permitRequired: false, permitNumber: '', permitStatus: '',
    inspectionRequired: false, inspectionDate: '', assignedTo: '',
    notes: '', facilityId,
    milestones: [] as { title: string; dueDate: string }[],
  };
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

const ContractorInstalls = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const facilityId = user?.facilityId || 'facility-001';
  const userName = user?.name || user?.email || 'Staff';

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [form, setForm] = useState(blankForm(facilityId));
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [budgetWarnings, setBudgetWarnings] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Project[] = raw ? JSON.parse(raw) : [];
      if (parsed.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PROJECTS));
        setProjects(SAMPLE_PROJECTS);
      } else {
        setProjects(parsed);
      }
    } catch {
      setProjects(SAMPLE_PROJECTS);
    }
  }, []);

  function save(updated: Project[]) {
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Update budget tracking
    checkBudgetImpact(updated);
  }

  function checkBudgetImpact(all: Project[]) {
    try {
      const raw = JSON.parse(localStorage.getItem('nexum_dept_budgets') || '[]');
      const stored: any[] = Array.isArray(raw) ? raw : (raw?.rows ?? []);
      if (!stored.length) return;
      const warnings: string[] = [];
      const contractorSpend = all.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.actualCost || p.estimatedCost || 0), 0);
      stored.forEach((dept: any) => {
        const budget = Number(dept.annualBudget) || 0;
        const spent = Number(dept.spentToDate || dept.spent || 0) || 0;
        const total = spent + contractorSpend;
        const pct = budget > 0 ? (total / budget) * 100 : 0;
        if (pct >= 90 && budget > 0) {
          warnings.push(`${dept.department || 'Operations'} budget at ${Math.round(pct)}% (contractor costs included)`);
        }
      });
      setBudgetWarnings(warnings);
    } catch { /* best-effort */ }
  }

  // Filtered
  const filtered = useMemo(() => {
    return projects.filter(p => {
      const q = search.toLowerCase();
      if (q && !`${p.projectName} ${p.contractorCompany} ${p.equipmentType} ${p.location}`.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterType !== 'all' && p.projectType !== filterType) return false;
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      return true;
    }).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [projects, search, filterStatus, filterType, filterPriority]);

  // KPIs
  const kpis = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const scheduled = projects.filter(p => p.status === 'scheduled').length;
    const pendingInsp = projects.filter(p => p.status === 'pending_inspection').length;
    const totalCost = projects.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.estimatedCost || 0), 0);
    const completedMonth = projects.filter(thisMonth()).length;
    return { total, inProgress, scheduled, pendingInsp, totalCost, completedMonth };
  }, [projects]);

  // ── Add Project ─────────────────────────────────────────────────────────────

  function openAdd() {
    setForm(blankForm(facilityId));
    setAddStep(1);
    setNewMilestone({ title: '', dueDate: '' });
    setShowAdd(true);
  }

  function addMilestone() {
    if (!newMilestone.title.trim()) return;
    setForm(prev => ({ ...prev, milestones: [...prev.milestones, { ...newMilestone }] }));
    setNewMilestone({ title: '', dueDate: '' });
  }

  function removeMilestone(idx: number) {
    setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.projectName.trim() || !form.contractorCompany.trim()) {
      toast({ title: 'Required fields missing', description: 'Project name and contractor company are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const project: Project = {
        projectId: crypto.randomUUID(),
        ...form,
        actualCost: 0,
        invoiceNumber: '',
        actualEndDate: '',
        permitStatus: form.permitRequired ? (form.permitStatus || 'Pending') : '',
        inspectionResult: '',
        documents: [],
        photos: [],
        noteLog: [],
        milestones: form.milestones.map(m => ({
          id: crypto.randomUUID(),
          title: m.title,
          dueDate: m.dueDate,
          completed: false,
          completedDate: '',
        })),
        createdAt: new Date().toISOString(),
      };
      // Post to work-orders API as contractor category (best-effort)
      try {
        await apiRequest('/work-orders', {
          method: 'POST',
          body: JSON.stringify({
            title: project.projectName,
            category: 'contractor',
            status: 'open',
            priority: project.priority,
            facilityId: project.facilityId,
            assignedTo: project.assignedTo,
            description: `Contractor: ${project.contractorCompany} | ${project.equipmentType} | ${project.location}`,
            estimatedCost: project.estimatedCost,
            poNumber: project.poNumber,
          }),
        });
      } catch { /* best-effort */ }

      const updated = [...projects, project];
      save(updated);
      setShowAdd(false);
      toast({ title: 'Project created', description: `${project.projectName} has been added.` });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save project.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Project mutations ───────────────────────────────────────────────────────

  function updateProject(updated: Project) {
    const all = projects.map(p => p.projectId === updated.projectId ? updated : p);
    save(all);
    setDetailProject(updated);
  }

  function toggleMilestone(project: Project, milestoneId: string) {
    const updated = {
      ...project,
      milestones: project.milestones.map(m => m.id === milestoneId
        ? { ...m, completed: !m.completed, completedDate: !m.completed ? new Date().toISOString().split('T')[0] : '' }
        : m
      ),
    };
    updateProject(updated);
  }

  function addProjectMilestone(project: Project, title: string, dueDate: string) {
    if (!title.trim()) return;
    const updated = { ...project, milestones: [...project.milestones, { id: crypto.randomUUID(), title, dueDate, completed: false, completedDate: '' }] };
    updateProject(updated);
  }

  function addNote(project: Project) {
    if (!newNote.trim()) return;
    const entry: NoteEntry = { id: crypto.randomUUID(), text: newNote, createdAt: new Date().toISOString(), author: userName };
    const updated = { ...project, noteLog: [...(project.noteLog as any || []), entry] };
    updateProject(updated);
    setNewNote('');
  }

  function markComplete(project: Project) {
    const updated: Project = {
      ...project,
      status: 'completed',
      actualEndDate: new Date().toISOString().split('T')[0],
    };
    updateProject(updated);
    toast({ title: 'Project completed', description: `${project.projectName} marked as complete. Consider adding equipment to the Equipment Library.` });
  }

  function handleDelete(id: string) {
    save(projects.filter(p => p.projectId !== id));
    setDeleteConfirm(null);
    setDetailProject(null);
    toast({ title: 'Project deleted' });
  }

  // ── File uploads ────────────────────────────────────────────────────────────

  function handleDocUpload(project: Project, files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const doc: ProjectDocument = {
          id: crypto.randomUUID(), name: file.name,
          type: file.type, fileData: e.target?.result as string,
          fileSize: file.size, uploadedAt: new Date().toISOString(),
        };
        const updated = { ...project, documents: [...project.documents, doc] };
        updateProject(updated);
      };
      reader.readAsDataURL(file);
    });
  }

  function handlePhotoUpload(project: Project, files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const photo: ProjectPhoto = {
          id: crypto.randomUUID(), caption: file.name,
          imageData: e.target?.result as string, takenAt: new Date().toISOString(),
        };
        const updated = { ...project, photos: [...project.photos, photo] };
        updateProject(updated);
      };
      reader.readAsDataURL(file);
    });
  }

  function downloadDoc(doc: ProjectDocument) {
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.name;
    a.click();
  }

  function fmtFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <HardHat className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Contractor Installs</h1>
              <p className="text-sm text-muted-foreground">Track and manage contractor installation projects</p>
            </div>
          </div>
          <Button onClick={openAdd} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />New Project
          </Button>
        </div>

        {/* Budget warnings */}
        {budgetWarnings.map(w => (
          <div key={w} className="flex items-start gap-3 p-3 rounded-xl border border-orange-400/30 bg-orange-400/5">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-400">{w}</p>
          </div>
        ))}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Projects', value: kpis.total, icon: ClipboardList, color: 'text-primary' },
            { label: 'In Progress', value: kpis.inProgress, icon: Wrench, color: 'text-cyan-400' },
            { label: 'Scheduled', value: kpis.scheduled, icon: Calendar, color: 'text-blue-400' },
            { label: 'Pending Inspection', value: kpis.pendingInsp, icon: Shield, color: 'text-yellow-400' },
            { label: 'Committed Cost', value: fmtCurrency(kpis.totalCost), icon: DollarSign, color: 'text-green-400' },
            { label: 'Completed This Month', value: kpis.completedMonth, icon: CheckCircle2, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-4 h-4', color)} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-muted/20 border-border/40" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[160px] border-border/40 bg-muted/20 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[160px] border-border/40 bg-muted/20 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROJECT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-[130px] border-border/40 bg-muted/20 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterPriority('all'); setSearch(''); }}>
              <X className="w-4 h-4 mr-1" />Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Project Grid */}
        {filtered.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="py-16 text-center">
              <HardHat className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No projects found</p>
              <Button className="mt-4" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add First Project</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(project => {
              const sc = STATUS_CONFIG[project.status];
              const pc = PRIORITY_CONFIG[project.priority];
              const progress = milestoneProgress(project.milestones);
              const overdue = isOverdue(project);
              const daysOv = daysOverdue(project);
              const costVariance = project.actualCost > 0 ? project.actualCost - project.estimatedCost : null;
              const StatusIcon = sc.icon;
              return (
                <Card key={project.projectId} className={cn('border-border/40 cursor-pointer hover:border-primary/40 transition-colors', overdue && 'border-red-400/40')}
                  onClick={() => setDetailProject(project)}>
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{project.projectName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{project.contractorCompany}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1', sc.bg, sc.color)}>
                          <StatusIcon className="w-2.5 h-2.5" />{sc.label}
                        </span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', pc.bg, pc.color)}>{pc.label}</span>
                      </div>
                    </div>

                    {/* Equipment + Location */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{project.equipmentType || '—'}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.location || '—'}</span>
                    </div>

                    {/* Type badge */}
                    <div>
                      <Badge variant="outline" className="text-[10px] capitalize">{project.projectType.replace('_', ' ')}</Badge>
                      {project.permitRequired && (
                        <Badge variant="outline" className={cn('text-[10px] ml-1', project.permitStatus === 'Approved' ? 'border-green-400/30 text-green-400' : 'border-yellow-400/30 text-yellow-400')}>
                          Permit: {project.permitStatus || 'Pending'}
                        </Badge>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{fmtDate(project.startDate)}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className={cn(overdue ? 'text-red-400 font-semibold' : 'text-muted-foreground')}>
                        {fmtDate(project.estimatedEndDate)}
                      </span>
                      {overdue && <span className="text-red-400 text-[10px] font-bold">{daysOv}d overdue</span>}
                    </div>

                    {/* Cost */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Est: <span className="font-semibold text-foreground">{fmtCurrency(project.estimatedCost)}</span></span>
                      {project.actualCost > 0 && (
                        <span className={cn('font-semibold', costVariance && costVariance > 0 ? 'text-red-400' : 'text-green-400')}>
                          Actual: {fmtCurrency(project.actualCost)}
                        </span>
                      )}
                    </div>

                    {/* Milestones progress */}
                    {project.milestones.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Progress</span>
                          <span>{project.milestones.filter(m => m.completed).length}/{project.milestones.length} milestones</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Assigned + Actions */}
                    <div className="flex items-center justify-between pt-1">
                      {project.assignedTo && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />{project.assignedTo}
                        </span>
                      )}
                      <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                        {project.status !== 'completed' && project.status !== 'cancelled' && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-green-400 hover:bg-green-400/10"
                            onClick={() => markComplete(project)}>
                            <Check className="w-3 h-3 mr-1" />Complete
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-400 hover:bg-red-400/10"
                          onClick={() => setDeleteConfirm(project.projectId)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── ADD PROJECT MODAL ── */}
        <Dialog open={showAdd} onOpenChange={v => { if (!v) setShowAdd(false); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-primary" />
                New Contractor Project
                <span className="text-sm font-normal text-muted-foreground">Step {addStep} of 5</span>
              </DialogTitle>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-2">
              {[1,2,3,4,5].map(s => (
                <div key={s} className={cn('flex-1 h-1 rounded-full transition-all', s <= addStep ? 'bg-primary' : 'bg-muted/40')} />
              ))}
            </div>

            <div className="space-y-4">
              {/* Step 1: Project Info */}
              {addStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Project Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Project Name *</Label>
                      <Input value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} className="mt-1 h-9" placeholder="e.g. Chiller Replacement — Building A" />
                    </div>
                    <div>
                      <Label className="text-xs">Project Type</Label>
                      <Select value={form.projectType} onValueChange={v => setForm(p => ({ ...p, projectType: v as ProjectType }))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Equipment Type</Label>
                      <Select value={form.equipmentType} onValueChange={v => setForm(p => ({ ...p, equipmentType: v }))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Location (Building / Floor / Room)</Label>
                      <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="mt-1 h-9" placeholder="e.g. Building A — Mechanical Room B1" />
                    </div>
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as Priority }))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ProjectStatus }))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contractor Info */}
              {addStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Contractor Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Contact Name *</Label><Input value={form.contractorName} onChange={e => setForm(p => ({ ...p, contractorName: e.target.value }))} className="mt-1 h-9" /></div>
                    <div><Label className="text-xs">Company *</Label><Input value={form.contractorCompany} onChange={e => setForm(p => ({ ...p, contractorCompany: e.target.value }))} className="mt-1 h-9" /></div>
                    <div><Label className="text-xs">Phone</Label><Input value={form.contractorPhone} onChange={e => setForm(p => ({ ...p, contractorPhone: e.target.value }))} className="mt-1 h-9" placeholder="(555) 000-0000" /></div>
                    <div><Label className="text-xs">Email</Label><Input type="email" value={form.contractorEmail} onChange={e => setForm(p => ({ ...p, contractorEmail: e.target.value }))} className="mt-1 h-9" /></div>
                    <div className="col-span-2"><Label className="text-xs">License Number</Label><Input value={form.contractorLicense} onChange={e => setForm(p => ({ ...p, contractorLicense: e.target.value }))} className="mt-1 h-9" placeholder="e.g. OH-MECH-88421" /></div>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule & Cost */}
              {addStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Schedule & Cost</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="mt-1 h-9" /></div>
                    <div><Label className="text-xs">Estimated End Date</Label><Input type="date" value={form.estimatedEndDate} onChange={e => setForm(p => ({ ...p, estimatedEndDate: e.target.value }))} className="mt-1 h-9" /></div>
                    <div><Label className="text-xs">Estimated Cost ($)</Label><Input type="number" value={form.estimatedCost || ''} onChange={e => setForm(p => ({ ...p, estimatedCost: Number(e.target.value) }))} className="mt-1 h-9" /></div>
                    <div><Label className="text-xs">PO Number</Label><Input value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} className="mt-1 h-9" /></div>
                  </div>
                </div>
              )}

              {/* Step 4: Requirements */}
              {addStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Permit, Inspection & Assignment</p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/10 transition-colors">
                      <input type="checkbox" checked={form.permitRequired} onChange={e => setForm(p => ({ ...p, permitRequired: e.target.checked }))} className="accent-primary" />
                      <div><p className="text-sm font-medium">Permit Required</p><p className="text-xs text-muted-foreground">Building, mechanical, or electrical permit needed</p></div>
                    </label>
                    {form.permitRequired && (
                      <div className="grid grid-cols-2 gap-3 pl-4">
                        <div><Label className="text-xs">Permit Number</Label><Input value={form.permitNumber} onChange={e => setForm(p => ({ ...p, permitNumber: e.target.value }))} className="mt-1 h-9" /></div>
                        <div>
                          <Label className="text-xs">Permit Status</Label>
                          <Select value={form.permitStatus} onValueChange={v => setForm(p => ({ ...p, permitStatus: v }))}>
                            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>{['Pending','Submitted','Approved','Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/10 transition-colors">
                      <input type="checkbox" checked={form.inspectionRequired} onChange={e => setForm(p => ({ ...p, inspectionRequired: e.target.checked }))} className="accent-primary" />
                      <div><p className="text-sm font-medium">Inspection Required</p><p className="text-xs text-muted-foreground">Third-party or code inspection upon completion</p></div>
                    </label>
                    {form.inspectionRequired && (
                      <div className="pl-4">
                        <Label className="text-xs">Scheduled Inspection Date</Label>
                        <Input type="date" value={form.inspectionDate} onChange={e => setForm(p => ({ ...p, inspectionDate: e.target.value }))} className="mt-1 h-9 max-w-[200px]" />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Assigned Staff (internal supervisor)</Label>
                      <Input value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className="mt-1 h-9" placeholder="Staff member overseeing this project" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Milestones */}
              {addStep === 5 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Key Milestones <span className="font-normal text-muted-foreground/60">(optional)</span></p>
                  <div className="space-y-2">
                    {form.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{m.title}</p>
                          {m.dueDate && <p className="text-xs text-muted-foreground">Due: {fmtDate(m.dueDate)}</p>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/10" onClick={() => removeMilestone(i)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder="Milestone title…" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))} className="h-9 flex-1" />
                      <Input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone(p => ({ ...p, dueDate: e.target.value }))} className="h-9 w-36" />
                      <Button size="sm" variant="outline" onClick={addMilestone}><PlusCircle className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {/* Notes */}
                  <div>
                    <Label className="text-xs">Project Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="mt-1 text-sm resize-none" placeholder="Any additional notes, special instructions, or context…" />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <Button variant="outline" onClick={() => addStep > 1 ? setAddStep(s => s - 1) : setShowAdd(false)}>
                  {addStep === 1 ? 'Cancel' : 'Back'}
                </Button>
                {addStep < 5 ? (
                  <Button onClick={() => setAddStep(s => s + 1)} disabled={addStep === 1 && !form.projectName.trim()}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Project
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DETAIL MODAL ── */}
        <Dialog open={!!detailProject} onOpenChange={v => { if (!v) setDetailProject(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {detailProject && (() => {
              const p = detailProject;
              const sc = STATUS_CONFIG[p.status];
              const pc = PRIORITY_CONFIG[p.priority];
              const progress = milestoneProgress(p.milestones);
              const overdue = isOverdue(p);
              const StatusIcon = sc.icon;
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <HardHat className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-base leading-tight">{p.projectName}</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.contractorCompany} · {p.equipmentType} · {p.location}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1', sc.bg, sc.color)}>
                            <StatusIcon className="w-2.5 h-2.5" />{sc.label}
                          </span>
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', pc.bg, pc.color)}>{pc.label}</span>
                          {overdue && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full">{daysOverdue(p)}d overdue</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {p.status !== 'completed' && p.status !== 'cancelled' && (
                          <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => markComplete(p)}>
                            <Check className="w-3 h-3 mr-1" />Complete
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-400/30 text-red-400 hover:bg-red-400/10" onClick={() => setDeleteConfirm(p.projectId)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue="overview" className="mt-2">
                    <TabsList className="h-8 text-xs">
                      <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                      <TabsTrigger value="milestones" className="text-xs">Milestones ({p.milestones.length})</TabsTrigger>
                      <TabsTrigger value="documents" className="text-xs">Documents ({p.documents.length})</TabsTrigger>
                      <TabsTrigger value="photos" className="text-xs">Photos ({p.photos.length})</TabsTrigger>
                      <TabsTrigger value="notes" className="text-xs">Notes ({Array.isArray(p.noteLog) ? p.noteLog.length : 0})</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Contractor */}
                        <div className="p-3 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contractor</p>
                          <p className="text-sm font-semibold">{p.contractorName}</p>
                          <p className="text-xs text-muted-foreground">{p.contractorCompany}</p>
                          {p.contractorPhone && (
                            <a href={`tel:${p.contractorPhone}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                              <Phone className="w-3 h-3" />{p.contractorPhone}
                            </a>
                          )}
                          {p.contractorEmail && (
                            <a href={`mailto:${p.contractorEmail}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                              <Mail className="w-3 h-3" />{p.contractorEmail}
                            </a>
                          )}
                          {p.contractorLicense && <p className="text-[10px] text-muted-foreground">License: {p.contractorLicense}</p>}
                        </div>
                        {/* Schedule */}
                        <div className="p-3 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{fmtDate(p.startDate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Est. End</span><span className={overdue ? 'text-red-400 font-semibold' : ''}>{fmtDate(p.estimatedEndDate)}</span></div>
                            {p.actualEndDate && <div className="flex justify-between"><span className="text-muted-foreground">Actual End</span><span className="text-green-400">{fmtDate(p.actualEndDate)}</span></div>}
                            {p.assignedTo && <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span>{p.assignedTo}</span></div>}
                          </div>
                        </div>
                        {/* Cost */}
                        <div className="p-3 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Estimated</span><span className="font-semibold">{fmtCurrency(p.estimatedCost)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Actual</span>
                              <span className={p.actualCost > 0 ? (p.actualCost > p.estimatedCost ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold') : 'text-muted-foreground'}>
                                {p.actualCost > 0 ? fmtCurrency(p.actualCost) : '—'}
                              </span>
                            </div>
                            {p.actualCost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Variance</span>
                              <span className={p.actualCost > p.estimatedCost ? 'text-red-400' : 'text-green-400'}>
                                {p.actualCost > p.estimatedCost ? '+' : ''}{fmtCurrency(p.actualCost - p.estimatedCost)}
                              </span>
                            </div>}
                            {p.poNumber && <div className="flex justify-between"><span className="text-muted-foreground">PO #</span><span>{p.poNumber}</span></div>}
                            {p.invoiceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span>{p.invoiceNumber}</span></div>}
                          </div>
                        </div>
                        {/* Permit & Inspection */}
                        <div className="p-3 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compliance</p>
                          <div className="space-y-1 text-xs">
                            {p.permitRequired ? (
                              <>
                                <div className="flex justify-between"><span className="text-muted-foreground">Permit</span>
                                  <Badge variant="outline" className={cn('text-[10px]', p.permitStatus === 'Approved' ? 'border-green-400/30 text-green-400' : 'border-yellow-400/30 text-yellow-400')}>{p.permitStatus || 'Pending'}</Badge>
                                </div>
                                {p.permitNumber && <div className="flex justify-between"><span className="text-muted-foreground">Permit #</span><span>{p.permitNumber}</span></div>}
                              </>
                            ) : <p className="text-muted-foreground/60">No permit required</p>}
                            {p.inspectionRequired ? (
                              <>
                                <div className="flex justify-between"><span className="text-muted-foreground">Inspection</span><span>{fmtDate(p.inspectionDate)}</span></div>
                                {p.inspectionResult && <div className="flex justify-between"><span className="text-muted-foreground">Result</span><span className="text-green-400">{p.inspectionResult}</span></div>}
                              </>
                            ) : <p className="text-muted-foreground/60">No inspection required</p>}
                          </div>
                        </div>
                      </div>
                      {/* Update actual cost inline */}
                      <div className="p-3 rounded-xl border border-border/30 bg-muted/5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Update Actual Cost</p>
                        <div className="flex gap-2">
                          <Input type="number" defaultValue={p.actualCost || ''} placeholder="Actual cost…" className="h-8 text-xs flex-1" id={`actual-cost-${p.projectId}`} />
                          <Input defaultValue={p.invoiceNumber} placeholder="Invoice #" className="h-8 text-xs w-32" id={`invoice-${p.projectId}`} />
                          <Button size="sm" className="h-8 text-xs" onClick={() => {
                            const costEl = document.getElementById(`actual-cost-${p.projectId}`) as HTMLInputElement;
                            const invEl = document.getElementById(`invoice-${p.projectId}`) as HTMLInputElement;
                            updateProject({ ...p, actualCost: Number(costEl?.value || 0), invoiceNumber: invEl?.value || '' });
                          }}>Save</Button>
                        </div>
                      </div>
                      {p.notes && (
                        <div className="p-3 rounded-xl border border-border/30 bg-muted/5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Project Notes</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{p.notes}</p>
                        </div>
                      )}
                      {p.status === 'completed' && (
                        <div className="p-3 rounded-xl border border-green-400/30 bg-green-400/5 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-green-400">Project Complete</p>
                            <p className="text-xs text-muted-foreground">Consider adding this equipment to the Equipment Library for lifecycle tracking.</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-auto border-green-400/30 text-green-400 hover:bg-green-400/10 shrink-0 text-xs h-7">
                            <ExternalLink className="w-3 h-3 mr-1" />Equipment Library
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* MILESTONES */}
                    <TabsContent value="milestones" className="space-y-4 mt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className="text-sm font-semibold text-primary">{progress}%</span>
                      </div>
                      <div className="space-y-2">
                        {p.milestones.map(m => (
                          <div key={m.id} className={cn('flex items-center gap-3 p-3 rounded-lg border transition-colors', m.completed ? 'bg-green-400/5 border-green-400/20' : 'bg-muted/10 border-border/30')}>
                            <button onClick={() => toggleMilestone(p, m.id)}
                              className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors', m.completed ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground hover:border-primary')}>
                              {m.completed && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm', m.completed && 'line-through text-muted-foreground')}>{m.title}</p>
                              {m.dueDate && <p className="text-[10px] text-muted-foreground">Due: {fmtDate(m.dueDate)}{m.completedDate && ` · Done: ${fmtDate(m.completedDate)}`}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Add milestone */}
                      <div className="flex gap-2 pt-2 border-t border-border/30">
                        <Input placeholder="New milestone…" id={`ms-title-${p.projectId}`} className="h-8 text-xs flex-1" />
                        <Input type="date" id={`ms-date-${p.projectId}`} className="h-8 text-xs w-36" />
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                          const titleEl = document.getElementById(`ms-title-${p.projectId}`) as HTMLInputElement;
                          const dateEl = document.getElementById(`ms-date-${p.projectId}`) as HTMLInputElement;
                          addProjectMilestone(p, titleEl?.value || '', dateEl?.value || '');
                          if (titleEl) titleEl.value = '';
                          if (dateEl) dateEl.value = '';
                        }}>
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />Add
                        </Button>
                      </div>
                    </TabsContent>

                    {/* DOCUMENTS */}
                    <TabsContent value="documents" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        {p.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
                        {p.documents.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-muted/10">
                            <FileText className="w-5 h-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{fmtFileSize(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => downloadDoc(doc)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => docRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Document
                      </Button>
                      <input ref={docRef} type="file" multiple className="hidden" onChange={e => handleDocUpload(p, e.target.files)} />
                    </TabsContent>

                    {/* PHOTOS */}
                    <TabsContent value="photos" className="space-y-4 mt-4">
                      {p.photos.length === 0 && <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {p.photos.map(photo => (
                          <div key={photo.id} className="rounded-lg overflow-hidden border border-border/30 aspect-square relative group">
                            <img src={photo.imageData} alt={photo.caption} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <p className="text-[10px] text-white truncate">{photo.caption}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => photoRef.current?.click()}>
                        <Camera className="w-3.5 h-3.5 mr-1.5" />Upload Photos
                      </Button>
                      <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(p, e.target.files)} />
                    </TabsContent>

                    {/* NOTES */}
                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div className="space-y-3">
                        {(!Array.isArray(p.noteLog) || p.noteLog.length === 0) && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                        {(Array.isArray(p.noteLog) ? p.noteLog : []).map(entry => (
                          <div key={entry.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold">{entry.author}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{entry.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border/30">
                        <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note…" rows={2} className="text-sm resize-none flex-1" />
                        <Button size="sm" className="self-end h-8 text-xs" onClick={() => addNote(p)} disabled={!newNote.trim()}>Add</Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-400"><Trash2 className="w-4 h-4" />Delete Project</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will permanently delete this contractor project. This action cannot be undone.</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
};

export default ContractorInstalls;
