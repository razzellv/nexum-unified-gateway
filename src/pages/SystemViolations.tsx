import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertOctagon, Plus, ChevronRight, ChevronDown, Clock, User, Building2,
  Wrench, FileText, CheckCircle2, XCircle, AlertTriangle, Brain, TrendingUp,
  Shield, RefreshCw, Search, X, Loader2, ArrowRight, Lightbulb, Target,
  Zap, BarChart3, Calendar, History, GitBranch, Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const getToken = () =>
  localStorage.getItem('nexum_id_token') ||
  localStorage.getItem('nexum_access_token') ||
  '';

// ── Constants ─────────────────────────────────────────────────────────────────

const OBSERVATION_OPTIONS: string[] = [
  // Chiller/Refrigeration (16)
  'Condenser supply temperature elevated',
  'Condenser return temperature elevated',
  'High condenser approach temperature',
  'Low chilled water ΔT',
  'High evaporator approach temperature',
  'Frequent compressor cycling',
  'Excessive compressor starts/stops',
  'Low refrigerant pressure',
  'High discharge pressure',
  'High suction pressure',
  'Compressor overheating',
  'Low oil pressure',
  'High oil temperature',
  'Oil leakage',
  'Refrigerant leak suspected',
  'Low condenser flow',
  // Boiler/Steam (14)
  'High stack O₂',
  'Low stack O₂',
  'High CO in flue gas',
  'High boiler conductivity',
  'Excessive makeup water',
  'Boiler flame instability',
  'Boiler short cycling',
  'Combustion air issue',
  'Low feedwater temperature',
  'Steam leak',
  'Pressure relief discharge',
  'Abnormal combustion readings',
  'Low boiler efficiency',
  'Frequent boiler lockouts',
  // Pumps/Piping (5)
  'Condensate pump making unusual noise',
  'Pump cavitation signs',
  'Low pump differential pressure',
  'High pump differential pressure',
  'Pump overheating',
  // Mechanical (5)
  'High vibration',
  'Bearing noise',
  'Fan imbalance',
  'Motor overheating',
  'High motor amperage',
  // Controls/Electrical (7)
  'Actuator failure',
  'Control sequence failure',
  'Valve hunting',
  'Sensor mismatch',
  'Control override active',
  'VFD fault indication',
  'Electrical fault indication',
  // Cooling Tower (2)
  'Cooling tower basin overflow',
  'Cooling tower fan fault',
  // Energy/Performance (6)
  'Unexpected energy increase',
  'Excessive runtime',
  'High kW/Ton',
  'Low efficiency reading',
  'Poor indoor comfort',
  'Indoor air quality concern',
  // Water Treatment (2)
  'Water chemistry excursion',
  'Chemical feed failure',
  // Other
  'Water leak',
  'Unusual odor',
  'Low differential pressure',
  'High differential pressure',
  'Abnormal trend pattern detected',
  'System alarm active',
  'Other (specify below)',
];

const ASSUMPTION_OPTIONS: string[] = [
  'Sensor issue',
  'Valve issue',
  'Refrigerant leak',
  'Control issue',
  'Operator error',
  'Pump failure',
  'Motor failure',
  'Water quality issue',
  'Combustion issue',
  'Maintenance overdue',
  'Design deficiency',
  'Unknown',
];

const ROOT_CAUSE_CATEGORIES: string[] = [
  'Mechanical',
  'Electrical',
  'Controls',
  'Water Treatment',
  'Operator Error',
  'Vendor Error',
  'Installation Error',
  'Design Issue',
  'Maintenance Deficiency',
  'Documentation Deficiency',
  'Training Deficiency',
  'Other',
];

interface StatusPhase {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  icon: React.FC<{ className?: string }>;
}

const STATUS_PHASES: StatusPhase[] = [
  { key: 'open',          label: 'Open',          shortLabel: 'Open',    color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    icon: AlertTriangle },
  { key: 'investigating', label: 'Investigating',  shortLabel: 'Invest',  color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', icon: Search },
  { key: 'wo_created',    label: 'WO Created',     shortLabel: 'WO',      color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', icon: Wrench },
  { key: 'in_progress',   label: 'In Progress',    shortLabel: 'Active',  color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   icon: Zap },
  { key: 'resolved',      label: 'Resolved',       shortLabel: 'Resolv',  color: 'text-teal-400',   bg: 'bg-teal-500/20',   border: 'border-teal-500/40',   icon: CheckCircle2 },
  { key: 'verified',      label: 'Verified',       shortLabel: 'Verif',   color: 'text-cyan-400',   bg: 'bg-cyan-500/20',   border: 'border-cyan-500/40',   icon: Shield },
  { key: 'closed',        label: 'Closed',         shortLabel: 'Closed',  color: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/40',   icon: XCircle },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineEntry {
  phase: string;
  action: string;
  by: string;
  byRole?: string;
  at: string;
  note: string;
  personnel?: { name: string; role: string }[];
  assumptions?: string[];
}

interface SystemViolation {
  id: string;
  PK?: string;
  SK?: string;
  facilityId?: string;
  status: string;
  priority: string;
  severity: string;
  building: string;
  area: string;
  equipment: string;
  equipmentId?: string;
  system?: string;
  systemType?: string;
  observation: string;
  observationCustom?: string;
  observedAt: string;
  reportedBy: string;
  reportedByRole?: string;
  description?: string;
  assumptions: string[];
  assumptionsText?: string;
  assumedAt?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  assignedTo?: string;
  department?: string;
  contractor?: string;
  targetCompletion?: string;
  actualCompletion?: string;
  rootCauseCategory?: string;
  actualIssueFound?: string;
  rootCauseDetail?: string;
  rcaCompletedAt?: string;
  rcaCompletedBy?: string;
  howResolved?: string;
  partsReplaced?: string;
  laborHours?: number;
  contractorHours?: number;
  downtime?: number;
  estimatedCost?: number;
  actualCost?: number;
  operationalImpact?: string;
  safetyImpact?: string;
  complianceImpact?: string;
  energyImpact?: string;
  wasAssumptionCorrect?: 'yes' | 'partially' | 'no';
  missingInformation?: string;
  futureCaptureRecommendation?: string;
  lessonsLearned?: string;
  verificationNotes?: string;
  confirmedBy?: string;
  timeline: TimelineEntry[];
  violationScore?: number;
  riskScore?: number;
  defensibilityScore?: number;
  rootCauseConfidence?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  resolvedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
  investigationStartedAt?: string;
  investigatedBy?: string;
  workStartedAt?: string;
  resolvedBy?: string;
  verifiedBy?: string;
  closedBy?: string;
  // Contextual evidence at time of event
  knownAtTime?: MetricReading[];
  confinedSpace?: ConfinedSpaceData;
  bmsSnapshot?: Record<string, string>;
}

interface MetricReading {
  label: string;
  value: string;
  unit: string;
  source: 'manual' | 'bms' | 'historian';
}

interface ConfinedSpaceData {
  isConfinedSpace: boolean;
  spaceType: string;
  permitRequired: boolean;
  permitNumber: string;
  o2Pct: string;
  lelPct: string;
  coPpm: string;
  h2sPpm: string;
  notes: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  critical: number;
  pendingRca: number;
  avgResolutionDays: number | null;
  topObservations: { obs: string; cnt: number }[];
  topRootCauses: { cat: string; cnt: number }[];
  assumptionAccuracy: { yes: number; partially: number; no: number; total: number } | null;
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getStatusPhase(status: string): StatusPhase {
  return STATUS_PHASES.find(p => p.key === status) || STATUS_PHASES[0];
}

function getNextStatus(current: string): string | null {
  const idx = STATUS_PHASES.findIndex(p => p.key === current);
  if (idx === -1 || idx >= STATUS_PHASES.length - 1) return null;
  return STATUS_PHASES[idx + 1].key;
}

function formatAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hrs  = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs} hrs`;
  return `${Math.floor(hrs / 24)} days`;
}

function phaseIndex(status: string): number {
  return STATUS_PHASES.findIndex(p => p.key === status);
}

function formatDate(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ScoreBarProps { score: number; label: string; color: string; }
function ScoreBar({ score, label, color }: ScoreBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-bold', color)}>{score}</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color.replace('text-', 'bg-'))}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

interface PhaseTimelineProps { status: string; }
function PhaseTimeline({ status }: PhaseTimelineProps) {
  const currentIdx = phaseIndex(status);
  return (
    <div className="flex items-center gap-0 w-full py-2 overflow-x-auto">
      {STATUS_PHASES.map((phase, i) => {
        const Icon = phase.icon;
        const isPast    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture  = i > currentIdx;
        return (
          <div key={phase.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all',
                isPast    && 'bg-white/20 border-white/30',
                isCurrent && cn(phase.bg, phase.border, 'border-2'),
                isFuture  && 'bg-transparent border-white/20',
              )}>
                <Icon className={cn(
                  'w-3.5 h-3.5',
                  isPast    && 'text-white/50',
                  isCurrent && phase.color,
                  isFuture  && 'text-white/20',
                )} />
              </div>
              <span className={cn(
                'text-[9px] font-medium whitespace-nowrap',
                isCurrent && phase.color,
                (isPast || isFuture) && 'text-white/30',
              )}>
                {phase.shortLabel}
              </span>
            </div>
            {i < STATUS_PHASES.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-1 mb-4',
                i < currentIdx ? 'bg-white/30' : 'bg-white/10',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AssumptionTagsProps { assumptions: string[]; assumptionsText?: string; }
function AssumptionTags({ assumptions, assumptionsText }: AssumptionTagsProps) {
  if (!assumptions?.length && !assumptionsText) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-semibold text-yellow-300">Initial Assumptions</span>
      </div>
      {assumptions?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assumptions.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs">
              {a}
            </span>
          ))}
        </div>
      )}
      {assumptionsText && (
        <p className="text-xs text-yellow-200/70 bg-yellow-500/5 border border-yellow-500/20 rounded p-2 leading-relaxed">
          {assumptionsText}
        </p>
      )}
    </div>
  );
}

interface PersonnelRowProps { label: string; name?: string; role?: string; at?: string; }
function PersonnelRow({ label, name, role, at }: PersonnelRowProps) {
  if (!name) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="text-xs font-medium text-foreground">{name}</span>
          {role && (
            <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/60 border-white/20 border">
              {role}
            </Badge>
          )}
        </div>
        {at && <span className="text-[10px] text-muted-foreground">{formatDate(at)}</span>}
      </div>
    </div>
  );
}

interface ViolationCardProps {
  violation: SystemViolation;
  selected: boolean;
  onClick: () => void;
}
function ViolationCard({ violation, selected, onClick }: ViolationCardProps) {
  const severityBorderMap: Record<string, string> = {
    critical: 'border-l-red-500',
    high:     'border-l-orange-500',
    medium:   'border-l-yellow-500',
    low:      'border-l-blue-500',
  };
  const severityBadgeMap: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/40',
    high:     'bg-orange-500/20 text-orange-300 border-orange-500/40',
    medium:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    low:      'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };
  const sev  = (violation.severity || 'low').toLowerCase();
  const phase = getStatusPhase(violation.status);
  const obsText = violation.observation || violation.observationCustom || '—';

  return (
    <div
      onClick={onClick}
      className={cn(
        'border-l-4 rounded-lg p-3 cursor-pointer transition-all border border-white/10',
        'hover:bg-white/5',
        selected ? 'bg-white/8 ring-1 ring-white/20' : 'bg-white/3',
        severityBorderMap[sev] || 'border-l-gray-500',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          <Badge className={cn('text-[10px] border px-1.5 py-0', severityBadgeMap[sev])}>
            {violation.severity}
          </Badge>
          <Badge className={cn('text-[10px] border px-1.5 py-0', severityBadgeMap[sev])}>
            P:{violation.priority}
          </Badge>
        </div>
        <Badge className={cn('text-[10px] border px-1.5 py-0 flex-shrink-0', phase.bg, phase.border, phase.color)}>
          {phase.label}
        </Badge>
      </div>

      <p className="text-xs font-medium text-foreground truncate mb-1.5">{obsText}</p>

      <div className="flex flex-wrap gap-1 mb-1.5">
        {violation.equipment && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-white/8 rounded px-1.5 py-0.5 text-white/60">
            <Wrench className="w-2.5 h-2.5" />{violation.equipment}
          </span>
        )}
        {violation.building && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-white/8 rounded px-1.5 py-0.5 text-white/60">
            <Building2 className="w-2.5 h-2.5" />{violation.building}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />{formatAge(violation.createdAt)}
        </span>
        <div className="flex gap-2">
          {violation.violationScore !== undefined && (
            <span className="text-[10px] text-orange-400 font-bold">VS:{violation.violationScore}</span>
          )}
          {violation.defensibilityScore !== undefined && (
            <span className="text-[10px] text-cyan-400 font-bold">DS:{violation.defensibilityScore}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CreateModal ───────────────────────────────────────────────────────────────

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (v: SystemViolation) => void;
  userEmail?: string;
  userRole?: string;
}

function CreateModal({ open, onClose, onCreated, userEmail = '', userRole = '' }: CreateModalProps) {
  const { toast } = useToast();
  const [step, setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectKey, setSelectKey] = useState(0);

  // Step 1
  const [building, setBuilding]           = useState('');
  const [area, setArea]                   = useState('');
  const [equipment, setEquipment]         = useState('');
  const [system, setSystem]               = useState('');
  const [priority, setPriority]           = useState('medium');
  const [severity, setSeverity]           = useState('medium');
  const [reportedBy, setReportedBy]       = useState(userEmail);
  const [observedAt, setObservedAt]       = useState('');

  // Step 2
  const [observation, setObservation]     = useState('');
  const [otherText, setOtherText]         = useState('');
  const [description, setDescription]    = useState('');

  // Step 3
  const [assumptions, setAssumptions]     = useState<string[]>([]);
  const [assumptionsText, setAssumptionsText] = useState('');
  const [personnelText, setPersonnelText] = useState('');

  // Step 4 — Evidence at time of event
  const [metricRows, setMetricRows]           = useState<MetricReading[]>([]);
  const [bmsSnapshot, setBmsSnapshot]         = useState('');
  const [isConfinedSpace, setIsConfinedSpace] = useState(false);
  const [csSpaceType, setCsSpaceType]         = useState('');
  const [csPermitRequired, setCsPermitRequired] = useState(false);
  const [csPermitNumber, setCsPermitNumber]   = useState('');
  const [csO2, setCsO2]                       = useState('');
  const [csLel, setCsLel]                     = useState('');
  const [csCo, setCsCo]                       = useState('');
  const [csH2s, setCsH2s]                     = useState('');
  const [csNotes, setCsNotes]                 = useState('');

  function addMetricRow() {
    setMetricRows(r => [...r, { label: '', value: '', unit: '', source: 'manual' }]);
  }
  function updateMetricRow(i: number, field: keyof MetricReading, val: string) {
    setMetricRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function removeMetricRow(i: number) {
    setMetricRows(r => r.filter((_, idx) => idx !== i));
  }

  function resetAll() {
    setStep(1);
    setBuilding(''); setArea(''); setEquipment(''); setSystem('');
    setPriority('medium'); setSeverity('medium');
    setReportedBy(userEmail); setObservedAt('');
    setObservation(''); setOtherText(''); setDescription('');
    setAssumptions([]); setAssumptionsText(''); setPersonnelText('');
    setMetricRows([]); setBmsSnapshot('');
    setIsConfinedSpace(false); setCsSpaceType(''); setCsPermitRequired(false);
    setCsPermitNumber(''); setCsO2(''); setCsLel(''); setCsCo(''); setCsH2s(''); setCsNotes('');
    setSelectKey(k => k + 1);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function toggleAssumption(opt: string) {
    setAssumptions(prev =>
      prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt],
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const obsValue = observation === 'Other (specify below)' ? 'Other (specify below)' : observation;
      const obsCustom = observation === 'Other (specify below)' ? otherText : description;

      const body = {
        building,
        area,
        equipment,
        system,
        priority,
        severity,
        reportedBy,
        reportedByRole: userRole,
        observedAt:    observedAt || undefined,
        observation:   obsValue,
        observationCustom: obsCustom,
        description,
        assumptions,
        assumptionsText,
        knownAtTime: metricRows.filter(r => r.label && r.value),
        bmsSnapshot: bmsSnapshot ? { note: bmsSnapshot } : undefined,
        confinedSpace: isConfinedSpace ? {
          isConfinedSpace: true,
          spaceType: csSpaceType,
          permitRequired: csPermitRequired,
          permitNumber: csPermitNumber,
          o2Pct: csO2, lelPct: csLel, coPpm: csCo, h2sPpm: csH2s,
          notes: csNotes,
        } : undefined,
      };

      const res = await fetch(`${API_BASE}/system-violations`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { violation: SystemViolation };
      toast({ title: 'Violation created', description: data.violation.observation });
      onCreated(data.violation);
      handleClose();
    } catch (err) {
      toast({ title: 'Failed to create violation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const steps = [
    { n: 1, label: 'Location & Info' },
    { n: 2, label: 'Observation' },
    { n: 3, label: 'Assumptions' },
    { n: 4, label: 'Evidence' },
    { n: 5, label: 'Review' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background border border-white/15 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-semibold">New System Violation</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-white/10 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border',
                s.n === step   ? 'bg-blue-500/30 border-blue-400 text-blue-300' :
                s.n < step     ? 'bg-green-500/30 border-green-400 text-green-300' :
                                 'bg-white/5 border-white/20 text-white/30',
              )}>{s.n < step ? '✓' : s.n}</div>
              <span className={cn(
                'ml-1.5 text-xs hidden sm:block',
                s.n === step ? 'text-blue-300' : s.n < step ? 'text-green-400' : 'text-white/30',
              )}>{s.label}</span>
              {i < steps.length - 1 && <div className={cn('flex-1 h-px mx-2', s.n < step ? 'bg-green-500/30' : 'bg-white/10')} />}
            </div>
          ))}
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Building</Label>
                  <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder="e.g. Building A" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Area / Floor</Label>
                  <Input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Mechanical Room" className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Equipment</Label>
                  <Input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="e.g. Chiller-1" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">System</Label>
                  <Input value={system} onChange={e => setSystem(e.target.value)} placeholder="e.g. HVAC / Chiller Plant" className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select key={`priority-${selectKey}`} value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['critical','high','medium','low'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Severity</Label>
                  <Select key={`severity-${selectKey}`} value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['critical','high','medium','low'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Reported By</Label>
                  <Input value={reportedBy} onChange={e => setReportedBy(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Observed At</Label>
                  <Input type="datetime-local" value={observedAt} onChange={e => setObservedAt(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Select Observation <span className="text-red-400">*</span></Label>
                <div className="max-h-80 overflow-y-auto pr-1 space-y-1">
                  {OBSERVATION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setObservation(opt)}
                      className={cn(
                        'w-full text-left text-xs px-3 py-2 rounded-md border transition-colors',
                        observation === opt
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                          : 'bg-white/3 border-white/10 text-white/70 hover:bg-white/8 hover:border-white/20',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {observation === 'Other (specify below)' && (
                <div>
                  <Label className="text-xs">Specify <span className="text-red-400">*</span></Label>
                  <Input
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    placeholder="Describe the observation"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Additional Description / Context</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Provide any additional context, readings, observations..."
                  className="mt-1 text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <Label className="text-xs text-yellow-300">What did you suspect? (select all that apply)</Label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ASSUMPTION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleAssumption(opt)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        assumptions.includes(opt)
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                          : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">What was believed at the time? What information was available?</Label>
                <Textarea
                  value={assumptionsText}
                  onChange={e => setAssumptionsText(e.target.value)}
                  placeholder="Describe what was believed/known at the time of observation..."
                  className="mt-1 text-sm resize-none"
                  rows={4}
                />
              </div>
              <div>
                <Label className="text-xs">Involved Personnel (comma-separated names)</Label>
                <Textarea
                  value={personnelText}
                  onChange={e => setPersonnelText(e.target.value)}
                  placeholder="e.g. John Smith, Maria Garcia"
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4 — Evidence at time of event */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-300">What Was Known at the Time?</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Capture all readings, metrics, BMS data, and environmental conditions observed when this violation was identified.
              </p>

              {/* Metric readings table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Asset / Equipment Readings</Label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMetricRows(r => [...r,
                        { label: 'Supply Temp', value: '', unit: '°F', source: 'manual' },
                        { label: 'Return Temp', value: '', unit: '°F', source: 'manual' },
                        { label: 'ΔT',          value: '', unit: '°F', source: 'manual' },
                        { label: 'Pressure',    value: '', unit: 'PSI', source: 'manual' },
                      ])}
                      className="text-[10px] px-2 py-1 rounded border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    >
                      + Temp/Pressure
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricRows(r => [...r,
                        { label: 'Discharge Pressure', value: '', unit: 'PSI', source: 'manual' },
                        { label: 'Suction Pressure',   value: '', unit: 'PSI', source: 'manual' },
                        { label: 'Superheat',          value: '', unit: '°F',  source: 'manual' },
                        { label: 'Subcooling',         value: '', unit: '°F',  source: 'manual' },
                        { label: 'Oil Pressure',       value: '', unit: 'PSI', source: 'manual' },
                      ])}
                      className="text-[10px] px-2 py-1 rounded border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    >
                      + Chiller
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricRows(r => [...r,
                        { label: 'Stack O₂%',      value: '', unit: '%',   source: 'manual' },
                        { label: 'CO ppm (flue)',   value: '', unit: 'ppm', source: 'manual' },
                        { label: 'Steam Pressure',  value: '', unit: 'PSI', source: 'manual' },
                        { label: 'Conductivity',    value: '', unit: 'µS',  source: 'manual' },
                      ])}
                      className="text-[10px] px-2 py-1 rounded border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    >
                      + Boiler
                    </button>
                    <button
                      type="button"
                      onClick={addMetricRow}
                      className="text-[10px] px-2 py-1 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                    >
                      + Row
                    </button>
                  </div>
                </div>

                {metricRows.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_80px_60px_90px_24px] gap-1.5 text-[10px] text-muted-foreground px-1">
                      <span>Label</span><span>Value</span><span>Unit</span><span>Source</span><span />
                    </div>
                    {metricRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_60px_90px_24px] gap-1.5 items-center">
                        <Input
                          value={row.label}
                          onChange={e => updateMetricRow(i, 'label', e.target.value)}
                          placeholder="e.g. Supply Temp"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={row.value}
                          onChange={e => updateMetricRow(i, 'value', e.target.value)}
                          placeholder="42.5"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={row.unit}
                          onChange={e => updateMetricRow(i, 'unit', e.target.value)}
                          placeholder="°F"
                          className="h-7 text-xs"
                        />
                        <select
                          value={row.source}
                          onChange={e => updateMetricRow(i, 'source', e.target.value as MetricReading['source'])}
                          className="h-7 text-xs bg-background border border-input rounded-md px-1.5 text-foreground"
                        >
                          <option value="manual">Manual</option>
                          <option value="bms">BMS</option>
                          <option value="historian">Historian</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMetricRow(i)}
                          className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {metricRows.length === 0 && (
                  <div className="border border-dashed border-white/15 rounded-lg p-4 text-center text-xs text-muted-foreground">
                    No readings added. Use preset buttons above or + Row to add readings manually.
                  </div>
                )}
              </div>

              {/* BMS snapshot note */}
              <div>
                <Label className="text-xs">BMS / Historian Note</Label>
                <Textarea
                  value={bmsSnapshot}
                  onChange={e => setBmsSnapshot(e.target.value)}
                  placeholder="Describe any BMS alarms, trends, or historian data observed at the time..."
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>

              {/* Confined Space toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfinedSpace(v => !v)}
                    className={cn(
                      'flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors',
                      isConfinedSpace
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10',
                    )}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Confined Space Entry
                    {isConfinedSpace && <span className="font-bold ml-1">ACTIVE</span>}
                  </button>
                </div>

                {isConfinedSpace && (
                  <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-orange-300 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Confined Space Atmospheric Data
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Space Type</Label>
                        <Input value={csSpaceType} onChange={e => setCsSpaceType(e.target.value)} placeholder="e.g. Vault, Pit, Crawlspace" className="mt-1 h-8 text-sm" />
                      </div>
                      <div className="flex items-center gap-2 mt-5">
                        <button
                          type="button"
                          onClick={() => setCsPermitRequired(v => !v)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-full border transition-colors',
                            csPermitRequired
                              ? 'bg-red-500/20 border-red-500/50 text-red-300 font-semibold'
                              : 'bg-white/5 border-white/15 text-white/50',
                          )}
                        >
                          Permit Required
                        </button>
                      </div>
                    </div>
                    {csPermitRequired && (
                      <div>
                        <Label className="text-xs">Permit Number</Label>
                        <Input value={csPermitNumber} onChange={e => setCsPermitNumber(e.target.value)} placeholder="Enter permit #" className="mt-1 h-8 text-sm" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-green-400">O₂ % <span className="text-muted-foreground">(19.5–23.5% normal)</span></Label>
                        <Input value={csO2} onChange={e => setCsO2(e.target.value)} placeholder="20.9" type="number" step="0.1" className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-yellow-400">LEL % <span className="text-muted-foreground">(&lt;10% safe)</span></Label>
                        <Input value={csLel} onChange={e => setCsLel(e.target.value)} placeholder="0" type="number" step="0.1" className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-orange-400">CO ppm <span className="text-muted-foreground">(&lt;35 ppm safe)</span></Label>
                        <Input value={csCo} onChange={e => setCsCo(e.target.value)} placeholder="0" type="number" className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-red-400">H₂S ppm <span className="text-muted-foreground">(&lt;10 ppm safe)</span></Label>
                        <Input value={csH2s} onChange={e => setCsH2s(e.target.value)} placeholder="0" type="number" className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Confined Space Notes</Label>
                      <Textarea value={csNotes} onChange={e => setCsNotes(e.target.value)} placeholder="Entry team, monitor used, atmospheric checks timeline..." className="mt-1 text-sm resize-none" rows={2} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/80">Review & Confirm</h3>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Building:</span> <span className="font-medium">{building || '—'}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Area:</span> <span className="font-medium">{area || '—'}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Equipment:</span> <span className="font-medium">{equipment || '—'}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">System:</span> <span className="font-medium">{system || '—'}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Priority:</span> <span className="font-medium capitalize">{priority}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Severity:</span> <span className="font-medium capitalize">{severity}</span></div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <span className="text-muted-foreground">Observation:</span>
                  <p className="font-medium mt-0.5">{observation || '—'}{observation === 'Other (specify below)' && otherText ? ` — ${otherText}` : ''}</p>
                </div>
                {assumptions.length > 0 && (
                  <div className="bg-yellow-500/8 border border-yellow-500/20 rounded p-2">
                    <span className="text-yellow-400">Assumptions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assumptions.map(a => (
                        <span key={a} className="px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 text-[10px]">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {description && (
                  <div className="bg-white/5 rounded p-2">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="mt-0.5">{description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 flex-shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={step > 1 ? () => setStep(s => s - 1) : handleClose}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <div className="flex gap-2">
            {step < 5 ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 2 && !observation}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !observation}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Submit Violation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PhaseAdvanceForm ──────────────────────────────────────────────────────────

interface PhaseAdvanceFormProps {
  violation: SystemViolation;
  onUpdated: (v: SystemViolation) => void;
}

function PhaseAdvanceForm({ violation, onUpdated }: PhaseAdvanceFormProps) {
  const { toast } = useToast();
  const next = getNextStatus(violation.status);
  const nextPhase = next ? getStatusPhase(next) : null;
  const [submitting, setSubmitting] = useState(false);
  const [selectKey, setSelectKey] = useState(0);

  // Common
  const [phaseNote, setPhaseNote]               = useState('');
  const [involvedPersonnel, setInvolvedPersonnel] = useState('');

  // wo_created
  const [workOrderNumber, setWorkOrderNumber]   = useState('');
  const [assignedTo, setAssignedTo]             = useState('');
  const [department, setDepartment]             = useState('');
  const [contractor, setContractor]             = useState('');
  const [targetCompletion, setTargetCompletion] = useState('');

  // resolved — RCA
  const [rootCauseCategory, setRootCauseCategory] = useState('');
  const [actualIssueFound, setActualIssueFound]   = useState('');
  const [rootCauseDetail, setRootCauseDetail]     = useState('');
  // resolved — resolution
  const [howResolved, setHowResolved]             = useState('');
  const [partsReplaced, setPartsReplaced]         = useState('');
  const [laborHours, setLaborHours]               = useState('');
  const [contractorHours, setContractorHours]     = useState('');
  const [downtime, setDowntime]                   = useState('');
  const [estimatedCost, setEstimatedCost]         = useState('');
  const [actualCost, setActualCost]               = useState('');
  // resolved — impacts
  const [operationalImpact, setOperationalImpact] = useState('');
  const [safetyImpact, setSafetyImpact]           = useState('');
  const [complianceImpact, setComplianceImpact]   = useState('');
  const [energyImpact, setEnergyImpact]           = useState('');

  // verified
  const [verificationNotes, setVerificationNotes] = useState('');
  const [confirmedBy, setConfirmedBy]             = useState('');

  // closed — defensibility
  const [wasAssumptionCorrect, setWasAssumptionCorrect] = useState<'yes' | 'partially' | 'no' | ''>('');
  const [missingInformation, setMissingInformation]     = useState('');
  const [futureCaptureRec, setFutureCaptureRec]         = useState('');
  const [lessonsLearned, setLessonsLearned]             = useState('');

  if (!next || !nextPhase) return null;

  const NextIcon = nextPhase.icon;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status: next, phaseNote, involvedPersonnel };

      if (next === 'wo_created') {
        Object.assign(body, { workOrderNumber, assignedTo, department, contractor, targetCompletion });
      }
      if (next === 'resolved') {
        Object.assign(body, {
          rootCauseCategory, actualIssueFound, rootCauseDetail,
          howResolved, partsReplaced,
          laborHours:     laborHours     ? Number(laborHours)     : undefined,
          contractorHours: contractorHours ? Number(contractorHours) : undefined,
          downtime:       downtime       ? Number(downtime)       : undefined,
          estimatedCost:  estimatedCost  ? Number(estimatedCost)  : undefined,
          actualCost:     actualCost     ? Number(actualCost)     : undefined,
          operationalImpact, safetyImpact, complianceImpact, energyImpact,
        });
      }
      if (next === 'verified') {
        Object.assign(body, { verificationNotes, confirmedBy });
      }
      if (next === 'closed') {
        Object.assign(body, {
          wasAssumptionCorrect: wasAssumptionCorrect || undefined,
          missingInformation, futureCaptureRecommendation: futureCaptureRec, lessonsLearned,
        });
      }

      const res = await fetch(`${API_BASE}/system-violations/${violation.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { violation: SystemViolation };
      toast({ title: `Advanced to ${nextPhase.label}` });
      onUpdated(data.violation);
      setSelectKey(k => k + 1);
    } catch (err) {
      toast({ title: 'Failed to advance phase', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn('border rounded-lg p-4 mt-4 space-y-4', nextPhase.border, nextPhase.bg)}>
      <div className="flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-white/40" />
        <NextIcon className={cn('w-4 h-4', nextPhase.color)} />
        <span className={cn('text-sm font-semibold', nextPhase.color)}>Advance to: {nextPhase.label}</span>
      </div>

      {/* investigating */}
      {next === 'investigating' && (
        <>
          <div>
            <Label className="text-xs">Investigation Notes</Label>
            <Textarea value={phaseNote} onChange={e => setPhaseNote(e.target.value)} placeholder="Describe initial investigation findings..." className="mt-1 text-sm resize-none" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Involved Personnel (comma-separated)</Label>
            <Textarea value={involvedPersonnel} onChange={e => setInvolvedPersonnel(e.target.value)} placeholder="e.g. John Smith, Maria Garcia" className="mt-1 text-sm resize-none" rows={2} />
          </div>
        </>
      )}

      {/* wo_created */}
      {next === 'wo_created' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Work Order #</Label>
              <Input value={workOrderNumber} onChange={e => setWorkOrderNumber(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Assigned To</Label>
              <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Contractor</Label>
              <Input value={contractor} onChange={e => setContractor(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Target Completion</Label>
            <Input type="date" value={targetCompletion} onChange={e => setTargetCompletion(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
        </>
      )}

      {/* in_progress */}
      {next === 'in_progress' && (
        <div>
          <Label className="text-xs">Work Notes</Label>
          <Textarea value={phaseNote} onChange={e => setPhaseNote(e.target.value)} placeholder="Describe work being performed..." className="mt-1 text-sm resize-none" rows={3} />
        </div>
      )}

      {/* resolved */}
      {next === 'resolved' && (
        <>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Root Cause Analysis</p>
          </div>
          <div>
            <Label className="text-xs">Root Cause Category</Label>
            <Select key={`rcc-${selectKey}`} value={rootCauseCategory} onValueChange={setRootCauseCategory}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {ROOT_CAUSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Actual Issue Found <span className="text-red-400">*</span></Label>
            <Textarea value={actualIssueFound} onChange={e => setActualIssueFound(e.target.value)} placeholder="What was actually causing the issue?" className="mt-1 text-sm resize-none" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Root Cause Detail</Label>
            <Textarea value={rootCauseDetail} onChange={e => setRootCauseDetail(e.target.value)} placeholder="Detailed root cause analysis..." className="mt-1 text-sm resize-none" rows={2} />
          </div>
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Resolution Details</p>
          </div>
          <div>
            <Label className="text-xs">How Was It Resolved? <span className="text-red-400">*</span></Label>
            <Textarea value={howResolved} onChange={e => setHowResolved(e.target.value)} placeholder="Describe the resolution steps taken..." className="mt-1 text-sm resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Parts Replaced</Label>
              <Input value={partsReplaced} onChange={e => setPartsReplaced(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Labor Hours</Label>
              <Input type="number" value={laborHours} onChange={e => setLaborHours(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Contractor Hours</Label>
              <Input type="number" value={contractorHours} onChange={e => setContractorHours(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Downtime (hours)</Label>
              <Input type="number" value={downtime} onChange={e => setDowntime(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Estimated Cost ($)</Label>
              <Input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Actual Cost ($)</Label>
              <Input type="number" value={actualCost} onChange={e => setActualCost(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Impacts</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Operational Impact</Label>
              <Input value={operationalImpact} onChange={e => setOperationalImpact(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Safety Impact</Label>
              <Input value={safetyImpact} onChange={e => setSafetyImpact(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Compliance Impact</Label>
              <Input value={complianceImpact} onChange={e => setComplianceImpact(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Energy Impact</Label>
              <Input value={energyImpact} onChange={e => setEnergyImpact(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Involved Personnel (comma-separated)</Label>
            <Textarea value={involvedPersonnel} onChange={e => setInvolvedPersonnel(e.target.value)} className="mt-1 text-sm resize-none" rows={2} />
          </div>
        </>
      )}

      {/* verified */}
      {next === 'verified' && (
        <>
          <div>
            <Label className="text-xs">Verification Notes</Label>
            <Textarea value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} placeholder="Describe verification checks performed..." className="mt-1 text-sm resize-none" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Confirmed By</Label>
            <Input value={confirmedBy} onChange={e => setConfirmedBy(e.target.value)} placeholder="Name of person who verified" className="mt-1 h-8 text-sm" />
          </div>
        </>
      )}

      {/* closed */}
      {next === 'closed' && (
        <>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Decision Defensibility™
            </p>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Was the original assumption correct?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['yes', 'partially', 'no'] as const).map(opt => {
                const colorMap = {
                  yes:       'bg-green-500/20 border-green-500/50 text-green-300',
                  partially: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
                  no:        'bg-red-500/20 border-red-500/50 text-red-300',
                };
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setWasAssumptionCorrect(opt)}
                    className={cn(
                      'py-2.5 rounded-lg border font-semibold text-sm transition-all',
                      wasAssumptionCorrect === opt
                        ? colorMap[opt]
                        : 'bg-white/5 border-white/15 text-white/40 hover:bg-white/10',
                    )}
                  >
                    {opt.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
          {wasAssumptionCorrect === 'no' && (
            <div>
              <Label className="text-xs">What information was missing? <span className="text-red-400">*</span></Label>
              <Textarea value={missingInformation} onChange={e => setMissingInformation(e.target.value)} placeholder="What information, had it been available, would have changed the initial assumption?" className="mt-1 text-sm resize-none" rows={3} />
            </div>
          )}
          <div>
            <Label className="text-xs">Future Capture Recommendation</Label>
            <Textarea value={futureCaptureRec} onChange={e => setFutureCaptureRec(e.target.value)} placeholder="How should future teams capture this type of information differently?" className="mt-1 text-sm resize-none" rows={2} />
          </div>
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Lessons Learned</p>
          </div>
          <div>
            <Label className="text-xs">Lessons Learned <span className="text-red-400">*</span></Label>
            <Textarea value={lessonsLearned} onChange={e => setLessonsLearned(e.target.value)} placeholder="What should future teams know about this issue?" className="mt-1 text-sm resize-none" rows={4} />
          </div>
          <div>
            <Label className="text-xs">Involved Personnel (comma-separated)</Label>
            <Textarea value={involvedPersonnel} onChange={e => setInvolvedPersonnel(e.target.value)} className="mt-1 text-sm resize-none" rows={2} />
          </div>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || (next === 'resolved' && (!actualIssueFound || !howResolved)) || (next === 'closed' && !lessonsLearned)}
          className={cn('gap-1.5', nextPhase.bg, nextPhase.color, 'border', nextPhase.border)}
          size="sm"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <NextIcon className="w-3.5 h-3.5" />}
          Advance to {nextPhase.label}
        </Button>
      </div>
    </div>
  );
}

// ── DetailPanel ───────────────────────────────────────────────────────────────

interface DetailPanelProps {
  violation: SystemViolation;
  onUpdated: (v: SystemViolation) => void;
  onClose: () => void;
}

function DetailPanel({ violation, onUpdated, onClose }: DetailPanelProps) {
  const phase     = getStatusPhase(violation.status);
  const PhaseIcon = phase.icon;
  const lastEntry = violation.timeline?.[violation.timeline.length - 1];

  const allPersonnel: { name: string; role: string; phase: string; at: string }[] = [];
  for (const entry of violation.timeline || []) {
    for (const p of entry.personnel || []) {
      if (p.name && !allPersonnel.find(x => x.name === p.name && x.phase === entry.phase)) {
        allPersonnel.push({ name: p.name, role: p.role || '', phase: entry.phase, at: entry.at });
      }
    }
  }

  const wacColorMap: Record<string, string> = {
    yes:       'text-green-300 bg-green-500/15 border-green-500/30',
    partially: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30',
    no:        'text-red-300 bg-red-500/15 border-red-500/30',
  };

  return (
    <div className="bg-white/3 border border-white/10 rounded-xl flex flex-col overflow-hidden h-full max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cn('text-xs border px-2 py-0.5', phase.bg, phase.border, phase.color)}>
              <PhaseIcon className="w-3 h-3 mr-1" />{phase.label}
            </Badge>
            <Badge className="text-xs bg-white/10 text-white/60 border border-white/20 px-2 py-0.5 capitalize">
              {violation.severity} severity
            </Badge>
            <Badge className="text-xs bg-white/10 text-white/60 border border-white/20 px-2 py-0.5 capitalize">
              {violation.priority} priority
            </Badge>
          </div>
          <p className="text-sm font-semibold leading-snug line-clamp-2">
            {violation.observation || violation.observationCustom || '—'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Phase timeline */}
      <div className="px-4 border-b border-white/10 flex-shrink-0">
        <PhaseTimeline status={violation.status} />
      </div>

      {/* Current phase info */}
      {lastEntry && (
        <div className="px-4 py-2 border-b border-white/10 flex-shrink-0 bg-white/2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDate(lastEntry.at)}</span>
            {lastEntry.by && <><span>·</span><span>{lastEntry.by}</span></>}
            {lastEntry.note && <><span>·</span><span className="italic">{lastEntry.note}</span></>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="flex-shrink-0 w-full justify-start rounded-none border-b border-white/10 bg-transparent h-9 px-4 gap-0 overflow-x-auto">
            {[
              { value: 'overview',     label: 'Overview',      icon: BarChart3 },
              { value: 'assumptions',  label: 'Assumptions',   icon: Lightbulb },
              { value: 'context',      label: 'Context',       icon: TrendingUp },
              { value: 'investigation',label: 'Investigation',  icon: Search },
              { value: 'resolution',   label: 'Resolution',    icon: CheckCircle2 },
              { value: 'defensibility',label: 'Defensibility', icon: Shield },
              { value: 'timeline',     label: 'Timeline',      icon: History },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs px-3 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400 data-[state=active]:bg-transparent data-[state=active]:text-blue-300 gap-1 flex-shrink-0"
              >
                <t.icon className="w-3 h-3" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto">

            {/* Overview tab */}
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Building',   val: violation.building,  icon: Building2 },
                  { label: 'Area',       val: violation.area,       icon: Target },
                  { label: 'Equipment',  val: violation.equipment,  icon: Wrench },
                  { label: 'System',     val: violation.system,     icon: GitBranch },
                ].map(({ label, val, icon: Icon }) => val ? (
                  <div key={label} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground text-[10px]">{label}</span>
                      <p className="font-medium truncate">{val}</p>
                    </div>
                  </div>
                ) : null)}
              </div>

              {/* Scores */}
              <div className="space-y-3 bg-white/5 rounded-lg p-3">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Intelligence Scores</p>
                <ScoreBar score={violation.violationScore ?? 0}      label="Violation Score"      color="text-orange-400" />
                <ScoreBar score={violation.riskScore ?? 0}           label="Risk Score"           color="text-red-400" />
                <ScoreBar score={violation.defensibilityScore ?? 0}  label="Defensibility Score"  color="text-cyan-400" />
                <ScoreBar score={violation.rootCauseConfidence ?? 0} label="RCA Confidence"       color="text-purple-400" />
              </div>

              {violation.description && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed">{violation.description}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex gap-4">
                  <span>Created: {formatDate(violation.createdAt)}</span>
                </div>
                {violation.observedAt && <span>Observed: {formatDate(violation.observedAt)}</span>}
              </div>
            </TabsContent>

            {/* Assumptions & Personnel tab */}
            <TabsContent value="assumptions" className="p-4 space-y-4 mt-0">
              {/* Original assumptions */}
              <AssumptionTags assumptions={violation.assumptions} assumptionsText={violation.assumptionsText} />

              {/* All personnel across phases */}
              {allPersonnel.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-300">Personnel Across All Phases</span>
                  </div>
                  <div className="space-y-0.5">
                    {allPersonnel.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                        <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium flex-1">{p.name}</span>
                        {p.role && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/60 border border-white/20">{p.role}</Badge>
                        )}
                        <Badge className={cn('text-[10px] px-1.5 py-0 border', getStatusPhase(p.phase).bg, getStatusPhase(p.phase).border, getStatusPhase(p.phase).color)}>
                          {getStatusPhase(p.phase).label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(p.at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assumption outcome */}
              {violation.wasAssumptionCorrect && (
                <div className={cn('border rounded-lg p-3 space-y-2', wacColorMap[violation.wasAssumptionCorrect])}>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-semibold">Assumption Outcome</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Was assumption correct?</span>
                    <span className="text-sm font-bold uppercase">{violation.wasAssumptionCorrect}</span>
                  </div>
                  {violation.missingInformation && (
                    <div>
                      <p className="text-xs text-muted-foreground">Missing Information:</p>
                      <p className="text-xs mt-0.5">{violation.missingInformation}</p>
                    </div>
                  )}
                  {violation.futureCaptureRecommendation && (
                    <div>
                      <p className="text-xs text-muted-foreground">Future Capture Recommendation:</p>
                      <p className="text-xs mt-0.5">{violation.futureCaptureRecommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reporter info */}
              <div className="space-y-0.5">
                <PersonnelRow label="Reported By" name={violation.reportedBy} role={violation.reportedByRole} at={violation.createdAt} />
                {violation.investigatedBy && (
                  <PersonnelRow label="Investigated By" name={violation.investigatedBy} at={violation.investigationStartedAt} />
                )}
                {violation.resolvedBy && (
                  <PersonnelRow label="Resolved By" name={violation.resolvedBy} at={violation.resolvedAt} />
                )}
                {violation.verifiedBy && (
                  <PersonnelRow label="Verified By" name={violation.verifiedBy} at={violation.verifiedAt} />
                )}
              </div>
            </TabsContent>

            {/* Context tab — What Was Known at the Time */}
            <TabsContent value="context" className="p-4 space-y-4 mt-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-base font-semibold text-blue-300">What Was Known at the Time?</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Readings, metrics, and environmental data captured at the moment this violation was identified.
              </p>

              {/* Metric readings */}
              {violation.knownAtTime && violation.knownAtTime.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Asset / Equipment Readings</p>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_60px_90px] gap-0 text-[10px] text-muted-foreground bg-white/5 px-3 py-1.5 border-b border-white/10">
                      <span>Reading</span><span>Value</span><span>Unit</span><span>Source</span>
                    </div>
                    {violation.knownAtTime.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_60px_90px] gap-0 text-xs px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/3">
                        <span className="font-medium">{r.label}</span>
                        <span className="font-bold tabular-nums">{r.value}</span>
                        <span className="text-muted-foreground">{r.unit}</span>
                        <span>
                          <Badge className={cn(
                            'text-[10px] border px-1.5 py-0',
                            r.source === 'bms'      && 'bg-blue-500/15 border-blue-500/30 text-blue-300',
                            r.source === 'historian' && 'bg-purple-500/15 border-purple-500/30 text-purple-300',
                            r.source === 'manual'   && 'bg-white/10 border-white/20 text-white/60',
                          )}>
                            {r.source}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-white/15 rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No equipment readings were captured at time of event.
                </div>
              )}

              {/* BMS snapshot */}
              {violation.bmsSnapshot?.note && (
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <Zap className="w-3 h-3" /> BMS / Historian Note
                  </p>
                  <p className="text-sm leading-relaxed">{violation.bmsSnapshot.note}</p>
                </div>
              )}

              {/* Confined space */}
              {violation.confinedSpace?.isConfinedSpace && (
                <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-orange-300 uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Confined Space Entry Recorded
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {violation.confinedSpace.spaceType && (
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-muted-foreground">Space Type:</span>
                        <p className="font-medium">{violation.confinedSpace.spaceType}</p>
                      </div>
                    )}
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-muted-foreground">Permit Required:</span>
                      <p className={cn('font-bold', violation.confinedSpace.permitRequired ? 'text-red-400' : 'text-green-400')}>
                        {violation.confinedSpace.permitRequired ? 'YES' : 'No'}
                      </p>
                    </div>
                    {violation.confinedSpace.permitNumber && (
                      <div className="bg-white/5 rounded p-2 col-span-2">
                        <span className="text-muted-foreground">Permit #:</span>
                        <p className="font-medium">{violation.confinedSpace.permitNumber}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'O₂ %', val: violation.confinedSpace.o2Pct, safeMin: 19.5, safeMax: 23.5, unit: '%', color: 'text-green-400' },
                      { label: 'LEL %', val: violation.confinedSpace.lelPct, safeMin: 0, safeMax: 10, unit: '%', color: 'text-yellow-400' },
                      { label: 'CO ppm', val: violation.confinedSpace.coPpm, safeMin: 0, safeMax: 35, unit: 'ppm', color: 'text-orange-400' },
                      { label: 'H₂S ppm', val: violation.confinedSpace.h2sPpm, safeMin: 0, safeMax: 10, unit: 'ppm', color: 'text-red-400' },
                    ].map(({ label, val, unit, color }) => val ? (
                      <div key={label} className="bg-black/20 rounded-lg p-2.5 text-center border border-white/10">
                        <p className={cn('text-xl font-black tabular-nums', color)}>{val}</p>
                        <p className="text-[10px] text-muted-foreground">{unit}</p>
                        <p className={cn('text-[10px] font-semibold', color)}>{label}</p>
                      </div>
                    ) : null)}
                  </div>

                  {violation.confinedSpace.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Notes:</p>
                      <p className="text-sm leading-relaxed">{violation.confinedSpace.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {!violation.knownAtTime?.length && !violation.bmsSnapshot?.note && !violation.confinedSpace?.isConfinedSpace && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No contextual evidence was captured for this violation.
                </div>
              )}
            </TabsContent>

            {/* Investigation tab */}
            <TabsContent value="investigation" className="p-4 space-y-4 mt-0">
              {violation.workOrderNumber || violation.workOrderId ? (
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-300">Work Order</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {violation.workOrderNumber && <div><span className="text-muted-foreground">WO #:</span> <span className="font-medium">{violation.workOrderNumber}</span></div>}
                    {violation.assignedTo      && <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{violation.assignedTo}</span></div>}
                    {violation.department      && <div><span className="text-muted-foreground">Dept:</span> <span className="font-medium">{violation.department}</span></div>}
                    {violation.contractor      && <div><span className="text-muted-foreground">Contractor:</span> <span className="font-medium">{violation.contractor}</span></div>}
                    {violation.targetCompletion && <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{violation.targetCompletion}</span></div>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No work order created yet.</p>
              )}

              {violation.rootCauseCategory && (
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-300">Root Cause Analysis</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div><span className="text-muted-foreground">Category:</span> <Badge className="ml-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px]">{violation.rootCauseCategory}</Badge></div>
                    {violation.actualIssueFound && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Actual Issue Found:</p>
                        <p className="text-sm leading-relaxed">{violation.actualIssueFound}</p>
                      </div>
                    )}
                    {violation.rootCauseDetail && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Detail:</p>
                        <p className="text-sm leading-relaxed">{violation.rootCauseDetail}</p>
                      </div>
                    )}
                    {violation.rcaCompletedAt && (
                      <p className="text-[10px] text-muted-foreground">RCA completed: {formatDate(violation.rcaCompletedAt)}</p>
                    )}
                  </div>
                </div>
              )}

              {!violation.rootCauseCategory && violation.status !== 'open' && violation.status !== 'investigating' && (
                <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-300">RCA not yet completed. Required before closing.</p>
                </div>
              )}
            </TabsContent>

            {/* Resolution tab */}
            <TabsContent value="resolution" className="p-4 space-y-4 mt-0">
              {violation.howResolved ? (
                <>
                  <div className="bg-teal-500/8 border border-teal-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      <span className="text-sm font-semibold text-teal-300">Resolution</span>
                    </div>
                    <p className="text-sm leading-relaxed">{violation.howResolved}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {violation.partsReplaced    && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Parts:</span> <span>{violation.partsReplaced}</span></div>}
                    {violation.laborHours       !== undefined && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Labor hrs:</span> <span className="font-medium">{violation.laborHours}</span></div>}
                    {violation.contractorHours  !== undefined && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Contractor hrs:</span> <span className="font-medium">{violation.contractorHours}</span></div>}
                    {violation.downtime         !== undefined && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Downtime hrs:</span> <span className="font-medium">{violation.downtime}</span></div>}
                    {violation.estimatedCost    !== undefined && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Est. Cost:</span> <span className="font-medium">${violation.estimatedCost?.toLocaleString()}</span></div>}
                    {violation.actualCost       !== undefined && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Actual Cost:</span> <span className="font-medium">${violation.actualCost?.toLocaleString()}</span></div>}
                  </div>

                  {(violation.operationalImpact || violation.safetyImpact || violation.complianceImpact || violation.energyImpact) && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Impacts</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {violation.operationalImpact && <div className="bg-white/5 rounded p-2"><span className="text-muted-foreground">Operational:</span><p>{violation.operationalImpact}</p></div>}
                        {violation.safetyImpact      && <div className="bg-red-500/8 border border-red-500/20 rounded p-2"><span className="text-red-400">Safety:</span><p>{violation.safetyImpact}</p></div>}
                        {violation.complianceImpact  && <div className="bg-orange-500/8 border border-orange-500/20 rounded p-2"><span className="text-orange-400">Compliance:</span><p>{violation.complianceImpact}</p></div>}
                        {violation.energyImpact      && <div className="bg-yellow-500/8 border border-yellow-500/20 rounded p-2"><span className="text-yellow-400">Energy:</span><p>{violation.energyImpact}</p></div>}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No resolution details yet.</p>
              )}
            </TabsContent>

            {/* Defensibility tab */}
            <TabsContent value="defensibility" className="p-4 space-y-4 mt-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-base font-semibold text-cyan-300">Decision Defensibility™</span>
              </div>

              {violation.wasAssumptionCorrect ? (
                <div className={cn('rounded-xl p-4 border text-center', wacColorMap[violation.wasAssumptionCorrect])}>
                  <p className="text-xs text-muted-foreground mb-1">Was the original assumption correct?</p>
                  <p className="text-2xl font-black uppercase tracking-widest">{violation.wasAssumptionCorrect}</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-3 text-xs text-muted-foreground">
                  Assumption outcome not yet recorded.
                </div>
              )}

              {violation.missingInformation && (
                <div className="bg-white/5 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Missing Information</p>
                  <p className="text-sm leading-relaxed">{violation.missingInformation}</p>
                </div>
              )}

              {violation.futureCaptureRecommendation && (
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Future Capture Recommendation
                  </p>
                  <p className="text-sm leading-relaxed">{violation.futureCaptureRecommendation}</p>
                </div>
              )}

              {violation.lessonsLearned && (
                <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wide flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Lessons Learned
                  </p>
                  <p className="text-sm leading-relaxed">{violation.lessonsLearned}</p>
                </div>
              )}

              <ScoreBar score={violation.defensibilityScore ?? 0}  label="Overall Defensibility Score"  color="text-cyan-400" />
              <ScoreBar score={violation.rootCauseConfidence ?? 0} label="Root Cause Confidence"        color="text-purple-400" />
            </TabsContent>

            {/* Timeline tab */}
            <TabsContent value="timeline" className="p-4 mt-0">
              <div className="space-y-3">
                {(violation.timeline || []).map((entry, i) => {
                  const ep = getStatusPhase(entry.phase);
                  const EpIcon = ep.icon;
                  return (
                    <div key={i} className={cn('border rounded-lg p-3 space-y-2', ep.bg, ep.border)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <EpIcon className={cn('w-4 h-4 flex-shrink-0', ep.color)} />
                          <div>
                            <p className={cn('text-xs font-semibold', ep.color)}>{ep.label}</p>
                            <p className="text-xs text-muted-foreground">{entry.action}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(entry.at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{entry.by}</span>
                        {entry.byRole && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/60 border border-white/20">{entry.byRole}</Badge>
                        )}
                      </div>

                      {entry.note && (
                        <p className="text-xs text-white/70 italic border-l-2 border-white/20 pl-2">{entry.note}</p>
                      )}

                      {entry.assumptions && entry.assumptions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] text-yellow-400/70 flex items-center gap-0.5">
                            <Lightbulb className="w-2.5 h-2.5" />Assumptions:
                          </span>
                          {entry.assumptions.map((a, ai) => (
                            <span key={ai} className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-300/70">{a}</span>
                          ))}
                        </div>
                      )}

                      {entry.personnel && entry.personnel.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] text-blue-400/70 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />Personnel:
                          </span>
                          {entry.personnel.map((p, pi) => (
                            <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300/70">
                              {p.name}{p.role ? ` (${p.role})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Phase advance form */}
      {violation.status !== 'closed' && (
        <div className="px-4 pb-4 flex-shrink-0 border-t border-white/10 pt-3 overflow-y-auto max-h-96">
          <PhaseAdvanceForm violation={violation} onUpdated={onUpdated} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SystemViolations() {
  const { authState } = useAuth();
  const { toast }     = useToast();

  const user      = authState?.tokens ? (() => {
    try {
      const t = localStorage.getItem('nexum_id_token') || '';
      if (!t) return null;
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, string>;
    } catch { return null; }
  })() : null;

  const userEmail = user?.email || '';
  const userRole  = user?.['custom:role'] || '';

  const [violations,        setViolations]        = useState<SystemViolation[]>([]);
  const [stats,             setStats]             = useState<Stats | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [statsLoading,      setStatsLoading]      = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<SystemViolation | null>(null);
  const [showCreate,        setShowCreate]        = useState(false);
  const [filterStatus,      setFilterStatus]      = useState<string>('all');
  const [filterSeverity,    setFilterSeverity]    = useState<string>('all');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [selectKey,         setSelectKey]         = useState(0);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/system-violations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { violations: SystemViolation[] };
      setViolations(data.violations || []);
    } catch (err) {
      toast({ title: 'Failed to load violations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/system-violations/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Stats;
      setStats(data);
    } catch {
      // stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchBoth = useCallback(() => {
    fetchViolations();
    fetchStats();
  }, [fetchViolations, fetchStats]);

  useEffect(() => { fetchBoth(); }, [fetchBoth]);

  function handleViolationUpdated(updated: SystemViolation) {
    setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
    setSelectedViolation(updated);
  }

  function handleCreated(v: SystemViolation) {
    setViolations(prev => [v, ...prev]);
    setSelectedViolation(v);
    fetchStats();
  }

  const filteredViolations = violations.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && (v.severity || '').toLowerCase() !== filterSeverity) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        v.observation?.toLowerCase().includes(q) ||
        v.observationCustom?.toLowerCase().includes(q) ||
        v.equipment?.toLowerCase().includes(q) ||
        v.building?.toLowerCase().includes(q) ||
        v.area?.toLowerCase().includes(q) ||
        v.reportedBy?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOpen    = violations.filter(v => v.status !== 'closed' && v.status !== 'verified').length;
  const totalCritical = violations.filter(v => (v.severity || '').toLowerCase() === 'critical').length;

  return (
    <MainLayout>
      <div className="space-y-5 p-1">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">System Violations™</h1>
              <p className="text-xs text-muted-foreground">Resolution Intelligence & Decision Defensibility</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBoth}
              className="gap-1.5 h-8"
              disabled={loading}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="gap-1.5 h-8 bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-3.5 h-3.5" />
              New Violation
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Open',
              value: statsLoading ? '—' : String(totalOpen),
              icon: AlertOctagon,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
            },
            {
              label: 'Critical',
              value: statsLoading ? '—' : String(stats?.critical ?? totalCritical),
              icon: AlertTriangle,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
            {
              label: 'Pending RCA',
              value: statsLoading ? '—' : String(stats?.pendingRca ?? 0),
              icon: Brain,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
            {
              label: 'Avg Resolution',
              value: statsLoading ? '—' : (stats?.avgResolutionDays != null ? `${stats.avgResolutionDays}d` : 'N/A'),
              icon: Clock,
              color: 'text-teal-400',
              bg: 'bg-teal-500/10',
            },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={cn('border-white/10', stat.bg)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className={cn('w-7 h-7 flex-shrink-0', stat.color)} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status chips */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                filterStatus === 'all'
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10',
              )}
            >
              All
            </button>
            {STATUS_PHASES.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => setFilterStatus(p.key)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1',
                    filterStatus === p.key
                      ? cn(p.bg, p.border, p.color)
                      : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10',
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />{p.label}
                </button>
              );
            })}
          </div>

          {/* Severity select */}
          <Select key={`sev-filter-${selectKey}`} value={filterSeverity} onValueChange={v => { setFilterSeverity(v); setSelectKey(k => k + 1); }}>
            <SelectTrigger className="h-7 text-xs w-32 border-white/20">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {['critical', 'high', 'medium', 'low'].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-40 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search violations..."
              className="w-full h-7 pl-8 pr-7 text-xs bg-white/5 border border-white/15 rounded-md focus:outline-none focus:border-white/30 focus:bg-white/8"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {filteredViolations.length} of {violations.length}
          </span>
        </div>

        {/* Main grid: list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Violation list */}
          <div className="lg:col-span-1 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && filteredViolations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertOctagon className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No violations found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {violations.length === 0 ? 'Create your first system violation' : 'Try adjusting filters'}
                </p>
              </div>
            )}
            {!loading && filteredViolations.map(v => (
              <ViolationCard
                key={v.id}
                violation={v}
                selected={selectedViolation?.id === v.id}
                onClick={() => setSelectedViolation(v)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {selectedViolation ? (
              <DetailPanel
                violation={selectedViolation}
                onUpdated={handleViolationUpdated}
                onClose={() => setSelectedViolation(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border border-white/10 rounded-xl bg-white/2">
                <AlertOctagon className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Select a violation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click a violation on the left to view details and advance its phase
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        userEmail={userEmail}
        userRole={userRole}
      />
    </MainLayout>
  );
}
