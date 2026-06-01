import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, ClipboardCheck, Eye, FileText, Building2, Cpu, User,
  Scale, ShieldAlert, Shield, Award, Upload, BookOpen, CheckCircle2, XCircle,
  AlertCircle, Download, RefreshCw, Calendar, ExternalLink,
  TrendingUp, ChevronDown, ChevronUp, Sparkles, History
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logComplianceEvent, createIssue, listIssues } from '@/lib/nexum-api';
import { apiRequest } from '@/lib/api';
import { violationTypeConfigs } from '@/data/mockData';
import { loadCustomViolations, customToConfig } from '@/lib/customViolations';
import { NotifySelect } from '@/components/compliance/NotifySelect';
import type { NotifyRecipient } from '@/components/compliance/NotifySelect';

const API_BASE = "https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod";

const getToken = () =>
  localStorage.getItem("nexum_id_token") ||
  localStorage.getItem("nexum_access_token") ||
  localStorage.getItem("accessToken") || "";

const FACILITIES = ['Facility Alpha', 'Facility Beta', 'Facility Gamma', 'Facility Delta'];
const BUILDINGS = ['Building A', 'Building B', 'Building C', 'Warehouse 1', 'Warehouse 2'];

const SYSTEM_TYPES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'security', label: 'Security' },
  { value: 'production', label: 'Production' },
  { value: 'waste_management', label: 'Waste Management' },
  { value: 'other', label: 'Other' },
];

// Legacy violation types kept for PM/Safety tabs that still use them
const VIOLATION_TYPES = [
  { value: 'MISSING_LOG',         label: 'Missing Equipment Log',        severity: 25 },
  { value: 'LATE_LOG',            label: 'Late Log Entry',               severity: 15 },
  { value: 'INCOMPLETE_DATA',     label: 'Incomplete Data Entry',        severity: 35 },
  { value: 'OUT_OF_RANGE',        label: 'Out of Range Reading',         severity: 50 },
  { value: 'CRITICAL_FAILURE',    label: 'Critical Equipment Failure',   severity: 100 },
  { value: 'UNSAFE_OPERATION',    label: 'Unsafe Operation',             severity: 90 },
  { value: 'MISSED_ROUND',        label: 'Missed Equipment Round',       severity: 40 },
  { value: 'DOCUMENTATION_ERROR', label: 'Documentation Error',          severity: 30 },
  { value: 'UNAUTHORIZED_CHANGE', label: 'Unauthorized System Change',   severity: 75 },
  { value: 'SAFETY_VIOLATION',    label: 'Safety Protocol Violation',    severity: 95 },
  { value: 'TRAINING_LAPSE',      label: 'Training/Certification Lapse', severity: 35 },
  { value: 'PROCEDURE_DEVIATION', label: 'Procedure Deviation',          severity: 45 },
  { value: 'POOR_COMMUNICATION',  label: 'Poor Communication',           severity: 25 },
  { value: 'QUALITY_ISSUE',       label: 'Quality Issue',                severity: 40 },
  { value: 'RESPONSE_DELAY',      label: 'Delayed Response to Issue',    severity: 55 },
  { value: 'UNETHICAL_CONDUCT',   label: 'Unethical Conduct',            severity: 85 },
  { value: 'DISHONESTY',          label: 'Dishonesty/Falsification',     severity: 95 },
  { value: 'POLICY_VIOLATION',    label: 'Company Policy Violation',     severity: 65 },
];

const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'Low — Minor, no immediate risk',          score: 25 },
  { value: 'medium',   label: 'Medium — Operational impact',             score: 50 },
  { value: 'high',     label: 'High — Safety/regulatory risk',           score: 75 },
  { value: 'critical', label: 'Critical — Immediate corrective action',  score: 100 },
];

const SEVERITY_COLORS: Record<string, string> = {
  low:      'text-blue-400',
  medium:   'text-yellow-400',
  high:     'text-orange-400',
  critical: 'text-red-400',
};

const POSITIVE_BEHAVIORS = [
  { value: 'EXEMPLARY_SAFETY', label: 'Exemplary Safety Practice', severity: -20 },
  { value: 'PROACTIVE_REPORTING', label: 'Proactive Issue Reporting', severity: -15 },
  { value: 'EXCELLENCE', label: 'Operational Excellence', severity: -25 },
  { value: 'MENTORSHIP', label: 'Mentorship/Training Others', severity: -15 },
];

const POLICY_REFERENCES = [
  { value: 'OSHA-1910.134', label: 'OSHA 1910.134 - Respiratory Protection' },
  { value: 'OSHA-1910.147', label: 'OSHA 1910.147 - Lockout/Tagout' },
  { value: 'OSHA-1910.1200', label: 'OSHA 1910.1200 - Hazard Communication' },
  { value: 'OSHA-1926.501', label: 'OSHA 1926.501 - Fall Protection' },
  { value: 'NFPA-70', label: 'NFPA 70 - National Electrical Code' },
  { value: 'NFPA-101', label: 'NFPA 101 - Life Safety Code' },
  { value: 'ASHRAE-62.1', label: 'ASHRAE 62.1 - Ventilation Standards' },
  { value: 'COMPANY-SOP-001', label: 'Company SOP-001 - General Safety' },
  { value: 'COMPANY-SOP-002', label: 'Company SOP-002 - Equipment Operation' },
  { value: 'COMPANY-SOP-003', label: 'Company SOP-003 - Emergency Response' },
  { value: 'other', label: 'Other (specify in notes)' },
];

const HAZARD_TYPES = [
  { value: 'slip_trip_fall', label: 'Slip / Trip / Fall' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'ergonomic', label: 'Ergonomic' },
  { value: 'fire', label: 'Fire' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'other', label: 'Other' },
];

const AGENCIES = [
  { value: 'OSHA', label: 'OSHA' },
  { value: 'DOH', label: 'DOH - Department of Health' },
  { value: 'NJ_BPU', label: 'NJ Board of Public Utilities' },
  { value: 'FIRE_MARSHAL', label: 'Fire Marshal' },
  { value: 'EPA', label: 'EPA' },
  { value: 'LOCAL_BOILER', label: 'Local Boiler Inspection' },
  { value: 'ASME', label: 'ASME' },
  { value: 'INSURANCE', label: 'Insurance Inspection' },
  { value: 'INTERNAL', label: 'Internal Audit' },
  { value: 'OTHER', label: 'Other Agency' },
];

const AUDIT_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'special', label: 'Special / Unscheduled' },
  { value: 'follow_up', label: 'Follow-Up' },
];

const resultConfig = {
  pass: { label: 'Pass', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle2 },
  fail: { label: 'Fail', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle },
  conditional: { label: 'Conditional', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertCircle },
};

// ─── GlobalFields ─────────────────────────────────────────────────────────────

interface GlobalFieldsProps {
  register: any;
  watch: any;
  errors: any;
  setValue: any;
}

// Helper: get default datetime-local value (current datetime)
function getDefaultDatetimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const OBSERVED_SOURCES = [
  { value: 'operator',          label: 'Operator Rounds',         category: 'human' },
  { value: 'technician',        label: 'Technician Inspection',   category: 'human' },
  { value: 'supervisor',        label: 'Supervisor Walkthrough',  category: 'human' },
  { value: 'vendor',            label: 'Vendor Note',             category: 'human' },
  { value: 'contractor',        label: 'Contractor Report',       category: 'human' },
  { value: 'inspector',         label: 'Inspector Finding',       category: 'human' },
  { value: 'occupant',          label: 'Occupant Report',         category: 'human' },
  { value: 'bas_alarm',         label: 'BAS Alarm',               category: 'sensor' },
  { value: 'ai_detection',      label: 'AI Detection',            category: 'ai_inferred' },
  { value: 'pm_inspection',     label: 'PM Inspection',           category: 'human' },
  { value: 'compliance_audit',  label: 'Compliance Audit',        category: 'human' },
  { value: 'safety_walk',       label: 'Safety Walk',             category: 'human' },
  { value: 'work_order',        label: 'Work Order',              category: 'human' },
] as const;

const REPORT_CATEGORIES = [
  { value: 'human',            label: 'Human-Reported' },
  { value: 'sensor',           label: 'Sensor/System Generated' },
  { value: 'ai_inferred',      label: 'AI-Inferred' },
  { value: 'system_generated', label: 'System-Generated' },
] as const;

const CONFIDENCE_LEVELS = [
  { value: 'low',      label: 'Low — Limited evidence' },
  { value: 'moderate', label: 'Moderate — Reasonable confidence' },
  { value: 'high',     label: 'High — Strong evidence' },
] as const;

function GlobalFields({ register, watch, errors, setValue }: GlobalFieldsProps) {
  const selectedSource = watch('firstObservedSource');

  // Auto-set reportCategory when firstObservedSource changes
  useEffect(() => {
    if (!selectedSource) return;
    const src = OBSERVED_SOURCES.find(s => s.value === selectedSource);
    if (src) {
      setValue('reportCategory', src.category);
    }
  }, [selectedSource, setValue]);

  return (
    <div className="space-y-6">
      {/* Origin of Truth — FIRST section */}
      <div className="space-y-4 p-6 rounded-lg border border-primary/40 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Origin of Truth</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Observed Source</Label>
            <Select onValueChange={(v) => setValue('firstObservedSource', v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {OBSERVED_SOURCES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Report Category</Label>
            <Select
              value={watch('reportCategory') || ''}
              onValueChange={(v) => setValue('reportCategory', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Auto-set based on source; override if needed</p>
          </div>
          <div className="space-y-2">
            <Label>Confidence Level</Label>
            <Select
              defaultValue="moderate"
              onValueChange={(v) => setValue('confidenceLevel', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONFIDENCE_LEVELS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>First Observed At (defaults to now)</Label>
            <Input
              type="datetime-local"
              defaultValue={getDefaultDatetimeLocal()}
              {...register('firstObservedTimestamp')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Location</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Facility</Label>
            <Select onValueChange={(v) => setValue('facility', v)}>
              <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
              <SelectContent>
                {FACILITIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Building</Label>
            <Select onValueChange={(v) => setValue('building', v)}>
              <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">System / Equipment</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>System Type</Label>
            <Select onValueChange={(v) => setValue('equipmentType', v)}>
              <SelectTrigger><SelectValue placeholder="Select system type" /></SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Equipment ID</Label>
            <Input {...register('equipmentId')} placeholder="e.g., HVAC-001, B-01" className="font-mono" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Personnel</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Employee ID *</Label>
            <Input
              {...register('operatorId', { required: true })}
              placeholder="e.g., EMP001"
              className={`font-mono ${errors.operatorId ? 'border-destructive' : ''}`}
            />
            {errors.operatorId && <p className="text-xs text-destructive">Required</p>}
            <p className="text-xs text-muted-foreground">Employee's ID from system</p>
          </div>
          <div className="space-y-2">
            <Label>Employee Name</Label>
            <Input {...register('operator')} placeholder="Full name (optional)" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Event Details</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              {...register('description', { required: true, minLength: 10 })}
              placeholder="Provide a detailed description of the event..."
              rows={4}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && <p className="text-xs text-destructive">Required (min 10 characters)</p>}
          </div>
          <div className="space-y-2">
            <Label>Notes / Evidence</Label>
            <Textarea {...register('notes')} placeholder="Additional notes, evidence, or context..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Corrective Action Taken</Label>
            <Textarea {...register('correctiveAction')} placeholder="What action was taken or is planned..." rows={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────

function ReportCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = resultConfig[r.result as keyof typeof resultConfig] || resultConfig.conditional;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden`}>
      {/* Main row */}
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{r.agency}</span>
              <Badge variant="outline" className="text-xs">{r.auditType}</Badge>
              <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              {r.narrative && (
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Narrative
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {r.auditDate}{r.inspector ? ` • Inspector: ${r.inspector}` : ''}
            </p>
            {r.findings?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Findings: {r.findings.join(', ')}
              </p>
            )}
            {r.nextInspectionDate && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Next: {r.nextInspectionDate}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{r.auditYear}</span>
          {r.downloadUrl && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(r.downloadUrl, '_blank')}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          {r.narrative && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Narrative panel */}
      {expanded && r.narrative && (
        <div className="border-t border-border/40 bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Compliance Intelligence Summary</span>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {r.narrative}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AuditReportsTab ──────────────────────────────────────────────────────────

function AuditReportsTab() {
  const [view, setView] = useState<'library' | 'upload'>('library');
  const [reports, setReports] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [agencyBreakdown, setAgencyBreakdown] = useState<any>({});
  const [repeatPatterns, setRepeatPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterAgency, setFilterAgency] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    agency: '',
    auditType: 'annual',
    auditDate: '',
    result: '',
    inspector: '',
    inspectorLicense: '',
    nextInspectionDate: '',
    findings: '',
    correctiveActions: '',
    systemTypes: [] as string[],
    notes: '',
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAgency) params.append('agency', filterAgency);
      if (filterResult) params.append('result', filterResult);
      if (filterYear) params.append('year', filterYear);

      const res = await fetch(`${API_BASE}/audit-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.reports || []);
      setSummary(data.summary || null);
      setAgencyBreakdown(data.agencyBreakdown || {});
      setRepeatPatterns(data.repeatPatterns || []);
    } catch (err) {
      console.error('Failed to load audit reports:', err);
      toast({ title: 'Error loading reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [filterAgency, filterResult, filterYear]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!form.agency || !form.auditDate || !form.result || !selectedFile) {
      toast({ title: 'Agency, date, result and file are required', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const payload = {
        ...form,
        findings: form.findings ? form.findings.split('\n').filter(Boolean) : [],
        correctiveActions: form.correctiveActions ? form.correctiveActions.split('\n').filter(Boolean) : [],
        auditYear: new Date(form.auditDate).getFullYear(),
        fileBase64: base64,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      };

      const res = await fetch(`${API_BASE}/audit-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      toast({
        title: '✅ Audit report uploaded',
        description: data.narrative
          ? 'Report uploaded with AI compliance narrative generated.'
          : `Report ID: ${data.reportId}`,
      });

      setView('library');
      setSelectedFile(null);
      setForm({
        agency: '', auditType: 'annual', auditDate: '', result: '',
        inspector: '', inspectorLicense: '', nextInspectionDate: '',
        findings: '', correctiveActions: '', systemTypes: [], notes: '',
      });
      fetchReports();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Agency', 'Type', 'Date', 'Year', 'Result', 'Inspector', 'Next Inspection', 'Findings', 'File', 'Narrative'];
    const rows = reports.map(r => [
      r.agency, r.auditType, r.auditDate, r.auditYear, r.result,
      r.inspector, r.nextInspectionDate,
      (r.findings || []).join('; '), r.fileName,
      (r.narrative || '').replace(/,/g, ';').replace(/\n/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={view === 'library' ? 'default' : 'ghost'} size="sm" onClick={() => setView('library')}>
            <BookOpen className="w-4 h-4 mr-1" /> Library
          </Button>
          <Button variant={view === 'upload' ? 'default' : 'ghost'} size="sm" onClick={() => setView('upload')}>
            <Upload className="w-4 h-4 mr-1" /> Upload Report
          </Button>
        </div>
        {view === 'library' && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchReports}><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Library View */}
      {view === 'library' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-500">{summary.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-500">{summary.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-500">{summary.conditional}</p>
                <p className="text-xs text-muted-foreground">Conditional</p>
              </div>
            </div>
          )}

          {/* Agency Breakdown */}
          {Object.keys(agencyBreakdown).length > 0 && (
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Agency Breakdown
              </h3>
              <div className="space-y-2">
                {Object.entries(agencyBreakdown).map(([agency, stats]: [string, any]) => (
                  <div key={agency} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{agency}</span>
                    <div className="flex gap-2">
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">{stats.pass || 0} pass</Badge>
                      {stats.fail > 0 && <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-xs">{stats.fail} fail</Badge>}
                      {stats.conditional > 0 && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs">{stats.conditional} conditional</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repeat Failure Patterns */}
          {repeatPatterns.length > 0 && (
            <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-4 h-4" /> Repeat Failure Patterns
              </h3>
              <div className="space-y-1">
                {repeatPatterns.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.finding}</span>
                    <Badge variant="outline" className="text-red-500 border-red-500/40 text-xs">{p.occurrences}x</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filterAgency || "all"} onValueChange={(v) => setFilterAgency(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All Agencies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {AGENCIES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterResult || "all"} onValueChange={(v) => setFilterResult(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Results" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterYear || "all"} onValueChange={(v) => setFilterYear(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="All Years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterAgency || filterResult || filterYear) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterAgency(''); setFilterResult(''); setFilterYear(''); }}>
                Clear filters
              </Button>
            )}
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No audit reports found</p>
              <p className="text-sm mt-1">Upload your first report to start building your compliance library</p>
              <Button className="mt-4" size="sm" onClick={() => setView('upload')}>
                <Upload className="w-4 h-4 mr-1" /> Upload Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => <ReportCard key={r.reportId} r={r} />)}
            </div>
          )}
        </div>
      )}

      {/* Upload View */}
      {view === 'upload' && (
        <div className="space-y-6">
          <div
            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-primary/50 mx-auto mb-3" />
            {selectedFile ? (
              <div>
                <p className="font-semibold text-primary">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to select audit report</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG supported</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* AI Narrative notice */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-medium">AI Compliance Narrative</span> will be automatically generated based on your agency, result, findings, and system types.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agency *</Label>
              <Select onValueChange={(v) => setForm(f => ({ ...f, agency: v }))}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  {AGENCIES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audit Type</Label>
              <Select defaultValue="annual" onValueChange={(v) => setForm(f => ({ ...f, auditType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audit Date *</Label>
              <Input type="date" onChange={(e) => setForm(f => ({ ...f, auditDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Result *</Label>
              <Select onValueChange={(v) => setForm(f => ({ ...f, result: v }))}>
                <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">✅ Pass</SelectItem>
                  <SelectItem value="conditional">⚠️ Conditional Pass</SelectItem>
                  <SelectItem value="fail">❌ Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inspector Name</Label>
              <Input placeholder="e.g., James Moore" onChange={(e) => setForm(f => ({ ...f, inspector: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Inspector License #</Label>
              <Input placeholder="e.g., NJ-BL-004421" className="font-mono" onChange={(e) => setForm(f => ({ ...f, inspectorLicense: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Next Inspection Date</Label>
              <Input type="date" onChange={(e) => setForm(f => ({ ...f, nextInspectionDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Systems Covered</Label>
              <Select onValueChange={(v) => setForm(f => ({ ...f, systemTypes: [...f.systemTypes, v] }))}>
                <SelectTrigger><SelectValue placeholder="Add system type" /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.systemTypes.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {form.systemTypes.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs cursor-pointer"
                      onClick={() => setForm(f => ({ ...f, systemTypes: f.systemTypes.filter((_, j) => j !== i) }))}>
                      {s} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Findings / Deficiencies</Label>
            <Textarea
              placeholder={"One finding per line e.g.\nPressure relief valve past test date\nNo blowdown log for Q3"}
              rows={4}
              onChange={(e) => setForm(f => ({ ...f, findings: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">One finding per line — used for repeat pattern detection and AI narrative</p>
          </div>

          <div className="space-y-2">
            <Label>Required Corrective Actions</Label>
            <Textarea placeholder="One action per line" rows={3} onChange={(e) => setForm(f => ({ ...f, correctiveActions: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Additional context, special conditions, etc." rows={2} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setView('library')}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleUpload} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  Uploading & Generating Narrative...
                </span>
              ) : 'Upload Audit Report'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Compliance ──────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  facility:   'Facility Compliance Logger',
  retail:     'Retail Compliance Logger',
  government: 'Public Safety Compliance Logger',
};

export default function Compliance() {
  const [searchParams] = useSearchParams();
  // When navigated from Custodian "Log Maintenance" button, restrict to low/medium severity only
  const isCustodianMode = searchParams.get('role') === 'custodian';
  const custodianSeverityOptions = SEVERITY_OPTIONS.filter(s => s.value === 'low' || s.value === 'medium');

  const orgType = localStorage.getItem('nexum_org_type') || 'facility';
  const pageTitle = isCustodianMode ? 'Log Maintenance Issue' : (PAGE_TITLES[orgType] ?? PAGE_TITLES.facility);

  const [activeTab, setActiveTab] = useState('violation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastVirtuousScore, setLastVirtuousScore] = useState<number | null>(null);

  const [issues, setIssues] = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const loadIssues = async () => {
    setIssuesLoading(true);
    try {
      const res = await listIssues({ limit: 50 });
      setIssues(res.issues || []);
    } catch (e) { console.warn('Issues load failed:', e); }
    finally { setIssuesLoading(false); }
  };

  const violationForm = useForm({ defaultValues: { operatorId: '', severity: isCustodianMode ? 'low' : 'medium' } });
  const pmForm = useForm({ defaultValues: { operatorId: '' } });
  const safetyForm = useForm({ defaultValues: { operatorId: '' } });

  const [otherTypeNotes, setOtherTypeNotes] = useState('');
  const [notifyRecipients, setNotifyRecipients] = useState<NotifyRecipient[]>(['all_leaders']);

  // Build orgType-filtered, subcategory-grouped violation types (built-in + custom)
  const orgViolationGroups = useMemo(() => {
    const filtered = violationTypeConfigs.filter(c => !c.sector || c.sector === orgType);
    const groups: Record<string, typeof violationTypeConfigs> = {};
    for (const cfg of filtered) {
      const sub = cfg.subcategory ?? 'General';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(cfg);
    }
    // Merge in organization-defined custom violation types
    const customs = loadCustomViolations();
    for (const cv of customs) {
      const cfg = customToConfig(cv) as any;
      const sub = cfg.subcategory ?? 'Custom';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(cfg);
    }
    return groups;
  }, [orgType]);

  const handleViolationSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      const facilityId = localStorage.getItem('nexum_facility_id') || 'facility-001';
      const severityScore = SEVERITY_OPTIONS.find(s => s.value === data.severity)?.score ?? 50;

      // POST to /violations endpoint
      await fetch(`${API_BASE}/violations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          facilityId,
          orgType,
          type:             data.violationType,
          severity:         data.severity,
          severityScore,
          operatorId:       data.operatorId,
          operator:         data.operator || data.operatorId,
          description:      data.violationType === 'other_custom' && otherTypeNotes
            ? `[${otherTypeNotes}] ${data.description}`.trim()
            : data.description,
          equipmentId:      data.equipmentId,
          equipmentType:    data.equipmentType,
          location:         data.location,
          staffInvolved:    data.staffInvolved,
          notes:            data.notes,
          correctiveAction: data.correctiveAction,
          policyReference:  data.policyReference,
          timestamp:        new Date().toISOString(),
          notifyRecipients: notifyRecipients.length > 0 ? notifyRecipients : undefined,
        }),
      }).catch(() => {}); // fire-and-forget if endpoint unavailable

      // Also log via legacy compliance event for backward compat
      const response = await logComplianceEvent({
        type:             data.violationType,
        operatorId:       data.operatorId,
        operator:         data.operator || data.operatorId,
        description:      data.violationType === 'other_custom' && otherTypeNotes
          ? `[${otherTypeNotes}] ${data.description}`.trim()
          : data.description,
        equipmentId:      data.equipmentId,
        equipmentType:    data.equipmentType,
        notes:            data.notes,
        correctiveAction: data.correctiveAction,
      });
      const virtuousScore = response?.employeeScores?.virtuousScore || response?.virtuousScore || response?.score;
      if (virtuousScore !== undefined) setLastVirtuousScore(virtuousScore);
      toast({
        title: '✅ Violation Logged Successfully',
        description: virtuousScore !== undefined ? `Employee Virtuous Score: ${virtuousScore}%` : 'The violation has been recorded.',
      });
      // Create Issue Origin record for this compliance event
      try {
        await createIssue({
          title: data.violationType || 'Violation Observation',
          sourceType: (data.firstObservedSource as any) || 'manual_report',
          reportSourceCategory: (data.reportCategory as any) || 'human',
          confidenceLevel: data.confidenceLevel === 'high' ? 95 : data.confidenceLevel === 'low' ? 40 : 70,
          firstReporterName: data.operator || data.operatorId,
          firstReporterRole: data.firstObservedSource || 'operator',
          originalTimestamp: data.firstObservedTimestamp
            ? new Date(data.firstObservedTimestamp).toISOString()
            : new Date().toISOString(),
          originalDescription: data.description || '',
          assetId: data.equipmentId || null,
          systemType: data.equipmentType || null,
          severity: data.severity || 'medium',
          tags: ['compliance-logger', data.violationType || 'observation'].filter(Boolean),
        });
      } catch (issueErr) {
        console.warn('Issue Origin creation failed (non-critical):', issueErr);
        // Non-critical — don't fail the main submission
      }
      violationForm.reset({ operatorId: '', severity: 'medium' });
    } catch (error: any) {
      toast({ title: 'Error Logging Violation', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePMSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: 'MISSED_ROUND',
        operatorId: data.operatorId,
        operator: data.operator || data.operatorId,
        description: `PM Check: ${data.pmTask}`,
        equipmentId: data.equipmentId,
        equipmentType: data.equipmentType,
        notes: `Scheduled: ${data.scheduledDate}. ${!data.completedOnTime ? 'LATE: ' + data.missedReason : 'On time'}`,
        notifyRecipients: notifyRecipients.length > 0 ? notifyRecipients : undefined,
      };
      const response = await logComplianceEvent(payload);
      const virtuousScore = response?.employeeScores?.virtuousScore;
      if (virtuousScore !== undefined) setLastVirtuousScore(virtuousScore);
      toast({ title: '✅ PM Check Logged', description: virtuousScore !== undefined ? `Virtuous Score: ${virtuousScore}%` : 'PM check recorded.' });
      // Create Issue Origin record for this compliance event
      try {
        await createIssue({
          title: data.pmTask || 'PM Inspection',
          sourceType: (data.firstObservedSource as any) || 'manual_report',
          reportSourceCategory: (data.reportCategory as any) || 'human',
          confidenceLevel: data.confidenceLevel === 'high' ? 95 : data.confidenceLevel === 'low' ? 40 : 70,
          firstReporterName: data.operator || data.operatorId,
          firstReporterRole: data.firstObservedSource || 'operator',
          originalTimestamp: data.firstObservedTimestamp
            ? new Date(data.firstObservedTimestamp).toISOString()
            : new Date().toISOString(),
          originalDescription: data.description || '',
          assetId: data.equipmentId || null,
          systemType: data.equipmentType || null,
          severity: data.severity || 'medium',
          tags: ['compliance-logger', data.pmTask || 'pm-check'].filter(Boolean),
        });
      } catch (issueErr) {
        console.warn('Issue Origin creation failed (non-critical):', issueErr);
        // Non-critical — don't fail the main submission
      }
      pmForm.reset({ operatorId: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSafetySubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: data.immediateRisk ? 'SAFETY_VIOLATION' : 'PROACTIVE_REPORTING',
        operatorId: data.operatorId,
        operator: data.operator || data.operatorId,
        description: data.description,
        equipmentId: data.equipmentId,
        equipmentType: data.equipmentType,
        notes: `Hazard: ${data.hazardType}. Action: ${data.actionTaken}`,
        correctiveAction: data.actionTaken,
        notifyRecipients: notifyRecipients.length > 0 ? notifyRecipients : undefined,
      };
      const response = await logComplianceEvent(payload);
      const virtuousScore = response?.employeeScores?.virtuousScore;
      if (virtuousScore !== undefined) setLastVirtuousScore(virtuousScore);
      toast({ title: '✅ Safety Observation Logged', description: virtuousScore !== undefined ? `Virtuous Score: ${virtuousScore}%` : 'Safety observation recorded.' });
      // Create Issue Origin record for this compliance event
      try {
        await createIssue({
          title: 'Safety Observation',
          sourceType: (data.firstObservedSource as any) || 'manual_report',
          reportSourceCategory: (data.reportCategory as any) || 'human',
          confidenceLevel: data.confidenceLevel === 'high' ? 95 : data.confidenceLevel === 'low' ? 40 : 70,
          firstReporterName: data.operator || data.operatorId,
          firstReporterRole: data.firstObservedSource || 'operator',
          originalTimestamp: data.firstObservedTimestamp
            ? new Date(data.firstObservedTimestamp).toISOString()
            : new Date().toISOString(),
          originalDescription: data.description || '',
          assetId: data.equipmentId || null,
          systemType: data.equipmentType || null,
          severity: data.severity || 'medium',
          tags: ['compliance-logger', 'safety-observation'].filter(Boolean),
        });
      } catch (issueErr) {
        console.warn('Issue Origin creation failed (non-critical):', issueErr);
        // Non-critical — don't fail the main submission
      }
      safetyForm.reset({ operatorId: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-neon-cyan" />
              {pageTitle}
            </h1>
            <p className="text-muted-foreground mt-1">Immutable compliance event logging system</p>
          </div>
          <div className="flex items-center gap-3">
            {lastVirtuousScore !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Award className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Virtuous Score</p>
                  <p className="text-lg font-bold text-green-500">{lastVirtuousScore}%</p>
                </div>
              </div>
            )}
            <NexumBranding />
          </div>
        </div>

        <Card className="bg-card/80 border-border">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v);
              if (v === 'issue_history' && issues.length === 0) loadIssues();
            }} className="space-y-6">
              <TabsList className="grid grid-cols-5 w-full max-w-[950px] h-auto p-1">
                <TabsTrigger value="violation" className="flex items-center gap-2 py-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Violation</span>
                </TabsTrigger>
                <TabsTrigger value="pm_check" className="flex items-center gap-2 py-3">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">PM Check</span>
                </TabsTrigger>
                <TabsTrigger value="safety" className="flex items-center gap-2 py-3">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Safety</span>
                </TabsTrigger>
                <TabsTrigger value="audit_reports" className="flex items-center gap-2 py-3">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Audit Reports</span>
                </TabsTrigger>
                <TabsTrigger value="issue_history" className="flex items-center gap-2 py-3">
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">Issue History</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="violation">
                <form onSubmit={violationForm.handleSubmit(handleViolationSubmit)} className="space-y-6">
                  <GlobalFields register={violationForm.register} watch={violationForm.watch} errors={violationForm.formState.errors} setValue={violationForm.setValue} />
                  <div className="space-y-4 p-6 rounded-lg border border-warning/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <h3 className="font-semibold text-foreground">Violation Details</h3>
                    </div>
                    <div className="space-y-4">
                      {/* Violation Type — org-filtered & grouped */}
                      <div className="space-y-2">
                        <Label>Violation Type *</Label>
                        <Select onValueChange={(v) => {
                          violationForm.setValue('violationType', v);
                          if (v !== 'other_custom') setOtherTypeNotes('');
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select violation type" /></SelectTrigger>
                          <SelectContent className="max-h-[400px] bg-popover border-border">
                            {Object.entries(orgViolationGroups).map(([subcategory, configs]) => (
                              <div key={subcategory}>
                                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{subcategory}</div>
                                {configs.map(({ value, label }) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </div>
                            ))}
                            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-green-500 mt-1">Positive Behaviors</div>
                            {POSITIVE_BEHAVIORS.map(({ value, label }) => (
                              <SelectItem key={value} value={value} className="text-green-500">{label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mt-1">Other</div>
                            <SelectItem value="other_custom" className="italic text-muted-foreground">Other — specify below</SelectItem>
                          </SelectContent>
                        </Select>
                        {violationForm.watch('violationType') === 'other_custom' && (
                          <div className="pt-1 space-y-1">
                            <label className="text-xs text-muted-foreground">Specify violation type *</label>
                            <input
                              value={otherTypeNotes}
                              onChange={e => setOtherTypeNotes(e.target.value)}
                              placeholder="e.g. Unauthorized bypass, Label non-compliance…"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        )}
                      </div>

                      {/* Severity */}
                      <div className="space-y-2">
                        <Label>Severity *</Label>
                        {isCustodianMode && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                            <Shield className="w-3.5 h-3.5 shrink-0" />
                            Maintenance reports are capped at <strong>Low or Medium</strong>. For emergencies, contact your supervisor directly.
                          </div>
                        )}
                        <Select
                          defaultValue={isCustodianMode ? 'low' : 'medium'}
                          onValueChange={(v) => violationForm.setValue('severity', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {(isCustodianMode ? custodianSeverityOptions : SEVERITY_OPTIONS).map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                <span className={SEVERITY_COLORS[value]}>{label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Equipment / Location */}
                      <div className="space-y-2">
                        <Label>
                          {orgType === 'retail' ? 'Location (cooler, shelf, aisle…)' : orgType === 'government' ? 'Unit / Location' : 'Equipment / Location'}
                          <span className="text-muted-foreground ml-1 text-xs">(optional)</span>
                        </Label>
                        <input
                          {...violationForm.register('location')}
                          placeholder={orgType === 'retail' ? 'e.g. Walk-in Cooler, Deli Case' : orgType === 'government' ? 'e.g. Engine 1, Station 2' : 'e.g. Boiler Room, AHU-3'}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Staff Involved */}
                      <div className="space-y-2">
                        <Label>Staff Involved <span className="text-muted-foreground ml-1 text-xs">(optional)</span></Label>
                        <input
                          {...violationForm.register('staffInvolved')}
                          placeholder="Names of additional staff involved"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Policy Reference */}
                      <div className="space-y-2">
                        <Label>Policy / Code Reference <span className="text-muted-foreground ml-1 text-xs">(optional)</span></Label>
                        <Select onValueChange={(v) => violationForm.setValue('policyReference', v)}>
                          <SelectTrigger><SelectValue placeholder="Select policy or code" /></SelectTrigger>
                          <SelectContent className="max-h-[300px] bg-popover border-border">
                            {POLICY_REFERENCES.map(({ value, label }) => (
                              <SelectItem key={value} value={value} className="font-mono text-sm">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Send Notification To</Label>
                    <NotifySelect value={notifyRecipients} onChange={setNotifyRecipients} orgType={orgType} />
                    <p className="text-[11px] text-muted-foreground">Selected leaders will be notified when this entry is submitted.</p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-destructive hover:bg-destructive/90">
                    <Scale className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging Violation...' : 'Log Violation Entry'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="pm_check">
                <form onSubmit={pmForm.handleSubmit(handlePMSubmit)} className="space-y-6">
                  <GlobalFields register={pmForm.register} watch={pmForm.watch} errors={pmForm.formState.errors} setValue={pmForm.setValue} />
                  <div className="space-y-4 p-6 rounded-lg border border-green-500/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardCheck className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-foreground">PM Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>PM Task *</Label>
                        <Input {...pmForm.register('pmTask', { required: true })} placeholder="e.g., Quarterly Filter Replacement" />
                      </div>
                      <div className="space-y-2">
                        <Label>Scheduled Date *</Label>
                        <Input type="date" {...pmForm.register('scheduledDate', { required: true })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                      <Label>Completed On Time</Label>
                      <Switch checked={pmForm.watch('completedOnTime')} onCheckedChange={(checked) => pmForm.setValue('completedOnTime', checked)} />
                    </div>
                    {!pmForm.watch('completedOnTime') && (
                      <Textarea {...pmForm.register('missedReason')} placeholder="Reason for delay..." rows={2} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Send Notification To</Label>
                    <NotifySelect value={notifyRecipients} onChange={setNotifyRecipients} orgType={orgType} />
                    <p className="text-[11px] text-muted-foreground">Selected leaders will be notified when this entry is submitted.</p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging PM Check...' : 'Log PM Check'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="safety">
                <form onSubmit={safetyForm.handleSubmit(handleSafetySubmit)} className="space-y-6">
                  <GlobalFields register={safetyForm.register} watch={safetyForm.watch} errors={safetyForm.formState.errors} setValue={safetyForm.setValue} />
                  <div className="space-y-4 p-6 rounded-lg border border-primary/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Safety Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hazard Type *</Label>
                        <Select onValueChange={(v) => safetyForm.setValue('hazardType', v)}>
                          <SelectTrigger><SelectValue placeholder="Select hazard type" /></SelectTrigger>
                          <SelectContent>
                            {HAZARD_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                        <Label>Immediate Risk</Label>
                        <Switch checked={safetyForm.watch('immediateRisk')} onCheckedChange={(checked) => safetyForm.setValue('immediateRisk', checked)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Action Taken *</Label>
                      <Textarea {...safetyForm.register('actionTaken', { required: true })} placeholder="Corrective/preventive action..." rows={3} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Send Notification To</Label>
                    <NotifySelect value={notifyRecipients} onChange={setNotifyRecipients} orgType={orgType} />
                    <p className="text-[11px] text-muted-foreground">Selected leaders will be notified when this entry is submitted.</p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-primary hover:bg-primary/90">
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging Safety Observation...' : 'Log Safety Observation'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="audit_reports">
                <AuditReportsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
