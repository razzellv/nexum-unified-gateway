/**
 * Decision Outcome Tracking™ (DOT)
 * Measures whether organizational decisions produced their intended outcomes.
 * Core of Nexum's Decision Continuity Intelligence™ platform.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, AlertTriangle, Plus, Save, Trash2, RefreshCw,
  Target, FileText, Brain, Shield, TrendingUp, TrendingDown, Minus,
  Lightbulb, Eye, ChevronRight, Info, BarChart3, Zap, Pencil,
  ClipboardList, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// ── Types ──────────────────────────────────────────────────────────────────────
export type DOTStatus      = 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
export type OutcomeHealth  = 'Green' | 'Yellow' | 'Red';
export type ConfidenceLevel = 'High' | 'Moderate' | 'Low';

export type DecisionType =
  | 'Project' | 'Work Order' | 'Assessment Finding' | 'Compliance Action'
  | 'Executive Decision' | 'Energy Initiative' | 'Asset Replacement'
  | 'Risk Mitigation' | 'Operational Improvement';

export interface ExpectedOutcome {
  id: string;
  category: string;
  description: string;
  metric: string;
  baseline: string;
  target: string;
  unit: string;
}

export interface ActualOutcome {
  id: string;
  expectedId: string;
  description: string;
  achievedValue: string;
  unit: string;
  verifiedDate: string;
  achieved: boolean;
}

export interface ConfidenceScores {
  evidenceQuality: number;        // 0–5
  dataCompleteness: number;
  operationalValidation: number;
  historicalSuccessRate: number;
  riskAssessmentQuality: number;
  stakeholderAgreement: number;
  fieldVerification: number;
}

export interface DOTRecord {
  decisionId: string;
  facilityId: string;
  // Core record
  decisionName: string;
  decisionType: DecisionType | '';
  decisionDate: string;
  decisionOwner: string;
  approver: string;
  relatedFacility: string;
  relatedAssets: string;
  relatedProjects: string;
  businessJustification: string;
  expectedOutcomeStatement: string;
  successCriteria: string;
  expectedBenefits: string;
  riskReductionGoal: string;
  operationalImprovementGoal: string;
  financialImprovementGoal: string;
  energyImprovementGoal: string;
  complianceImprovementGoal: string;
  targetCompletionDate: string;
  actualCompletionDate: string;
  status: DOTStatus;
  // Outcomes
  expectedOutcomes: ExpectedOutcome[];
  actualOutcomes: ActualOutcome[];
  // Confidence Engine
  confidence: ConfidenceScores;
  // Decision Continuity
  whyDecided: string;
  alternativesConsidered: string;
  risksAccepted: string;
  assumptions: string;
  // Lessons Learned
  whatWorked: string;
  whatFailed: string;
  unexpectedOutcomes: string;
  financialLessons: string;
  operationalLessons: string;
  complianceLessons: string;
  energyLessons: string;
  recommendedFutureActions: string;
  futureRiskConsiderations: string;
  // Meta
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY_CONFIDENCE: ConfidenceScores = {
  evidenceQuality: 0, dataCompleteness: 0, operationalValidation: 0,
  historicalSuccessRate: 0, riskAssessmentQuality: 0, stakeholderAgreement: 0, fieldVerification: 0,
};

function emptyRecord(facilityId: string): DOTRecord {
  return {
    decisionId: `dec-${Date.now()}`, facilityId,
    decisionName: 'New Decision', decisionType: '', decisionDate: '',
    decisionOwner: '', approver: '', relatedFacility: '', relatedAssets: '',
    relatedProjects: '', businessJustification: '', expectedOutcomeStatement: '',
    successCriteria: '', expectedBenefits: '', riskReductionGoal: '',
    operationalImprovementGoal: '', financialImprovementGoal: '',
    energyImprovementGoal: '', complianceImprovementGoal: '',
    targetCompletionDate: '', actualCompletionDate: '', status: 'Open',
    expectedOutcomes: [], actualOutcomes: [],
    confidence: { ...EMPTY_CONFIDENCE },
    whyDecided: '', alternativesConsidered: '', risksAccepted: '', assumptions: '',
    whatWorked: '', whatFailed: '', unexpectedOutcomes: '',
    financialLessons: '', operationalLessons: '', complianceLessons: '',
    energyLessons: '', recommendedFutureActions: '', futureRiskConsiderations: '',
  };
}

// ── Performance Engine ────────────────────────────────────────────────────────
export function calcDOTPerformance(record: DOTRecord) {
  const { expectedOutcomes, actualOutcomes, confidence } = record;
  const total = expectedOutcomes.length;
  const achieved = actualOutcomes.filter(a => a.achieved).length;
  const outcomeAchievementPct = total > 0 ? (achieved / total) * 100 : 0;

  // Confidence score (0–100)
  const confKeys = Object.values(confidence);
  const maxConf  = confKeys.length * 5;
  const confSum  = confKeys.reduce((s, v) => s + v, 0);
  const confidenceScore = maxConf > 0 ? (confSum / maxConf) * 100 : 0;
  const confidenceLevel: ConfidenceLevel = confidenceScore >= 70 ? 'High' : confidenceScore >= 40 ? 'Moderate' : 'Low';

  // Derive sub-scores from available data
  const completionScore  = record.actualCompletionDate ? (record.actualCompletionDate <= record.targetCompletionDate ? 100 : 60) : (record.status === 'Open' ? 50 : 70);
  const outcomeScore     = outcomeAchievementPct;
  const justifScore      = record.businessJustification.length > 50 ? 90 : record.businessJustification.length > 20 ? 60 : 30;
  const continuityScore  = [record.whyDecided, record.alternativesConsidered, record.risksAccepted].filter(s => s.length > 20).length / 3 * 100;
  const lessonsScore     = [record.whatWorked, record.whatFailed, record.recommendedFutureActions].filter(s => s.length > 20).length / 3 * 100;

  const overallScore = record.status === 'Completed'
    ? (outcomeScore * 0.40 + confidenceScore * 0.20 + completionScore * 0.15 + continuityScore * 0.15 + lessonsScore * 0.10)
    : (confidenceScore * 0.40 + justifScore * 0.30 + continuityScore * 0.30);

  const health: OutcomeHealth = overallScore >= 80 ? 'Green' : overallScore >= 60 ? 'Yellow' : 'Red';

  return {
    outcomeAchievementPct,
    confidenceScore,
    confidenceLevel,
    completionScore,
    overallScore,
    health,
    achieved,
    total,
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DECISION_TYPES: DecisionType[] = [
  'Project', 'Work Order', 'Assessment Finding', 'Compliance Action',
  'Executive Decision', 'Energy Initiative', 'Asset Replacement',
  'Risk Mitigation', 'Operational Improvement',
];

const OUTCOME_CATEGORIES = ['Downtime Reduction', 'Energy Savings', 'Maintenance Cost', 'Compliance Score', 'Reliability', 'Occupant Comfort', 'Operational Efficiency', 'Emergency Work Orders', 'Equipment Reliability', 'Other'];

const CONFIDENCE_FIELDS: { key: keyof ConfidenceScores; label: string; tip: string }[] = [
  { key: 'evidenceQuality',        label: 'Evidence Quality',          tip: 'Quality of data and documentation supporting the decision' },
  { key: 'dataCompleteness',       label: 'Data Completeness',         tip: 'Completeness of performance data and baseline measurements' },
  { key: 'operationalValidation',  label: 'Operational Validation',    tip: 'Validation through operational checks and field observation' },
  { key: 'historicalSuccessRate',  label: 'Historical Success Rate',   tip: 'Track record of similar decisions in similar contexts' },
  { key: 'riskAssessmentQuality',  label: 'Risk Assessment Quality',   tip: 'Rigor of risk identification and mitigation planning' },
  { key: 'stakeholderAgreement',   label: 'Stakeholder Agreement',     tip: 'Level of consensus and buy-in from relevant stakeholders' },
  { key: 'fieldVerification',      label: 'Field Verification',        tip: 'On-site validation by qualified technicians or engineers' },
];

// ── UI Helpers ────────────────────────────────────────────────────────────────
const healthColors: Record<OutcomeHealth, { bg: string; badge: string; text: string }> = {
  Green:  { bg: 'bg-green-950/50 border-green-600/40',  badge: 'bg-green-600',  text: 'text-green-400' },
  Yellow: { bg: 'bg-yellow-950/40 border-yellow-600/40', badge: 'bg-yellow-600', text: 'text-yellow-400' },
  Red:    { bg: 'bg-red-950/40 border-red-600/40',      badge: 'bg-red-600',    text: 'text-red-400' },
};

const confColors: Record<ConfidenceLevel, string> = {
  High: 'text-green-400', Moderate: 'text-yellow-400', Low: 'text-red-400',
};

function ScoreBar({ label, value, max = 100, tip }: { label: string; value: number; max?: number; tip?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const clr = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
              <TooltipContent className="text-xs max-w-xs">{tip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={cn('text-sm font-bold font-mono', pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400')}>
          {Math.round(value)}{max === 5 ? '/5' : '%'}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', clr)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FieldBlock({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-semibold">{label}</Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DecisionOutcomeTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const token = localStorage.getItem('nexum_access_token') || '';

  const [records, setRecords]       = useState<DOTRecord[]>([]);
  const [activeId, setActiveId]     = useState<string>('');
  const [record, setRecord]         = useState<DOTRecord>(emptyRecord(facilityId));
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [activeTab, setActiveTab]   = useState('record');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/decision-outcomes?facilityId=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: DOTRecord[] = await res.json();
        setRecords(data);
        const wantId = searchParams.get('decisionId') || localStorage.getItem('nexum_active_dot_id');
        const target = data.find(r => r.decisionId === wantId) || data[0];
        if (target) { setActiveId(target.decisionId); setRecord({ ...target }); }
        else startNew(false);
      } else throw new Error();
    } catch {
      const cached = localStorage.getItem(`nexum_dot_${facilityId}`);
      if (cached) {
        const data: DOTRecord[] = JSON.parse(cached);
        setRecords(data);
        if (data[0]) { setActiveId(data[0].decisionId); setRecord({ ...data[0] }); }
        else startNew(false);
      } else startNew(false);
    } finally { setLoading(false); }
  }, [facilityId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const r = records.find(r => r.decisionId === activeId);
    if (r) { setRecord({ ...r }); setSaved(false); }
  }, [activeId]);

  function startNew(commit = true) {
    const r = emptyRecord(facilityId);
    if (commit) { setRecords(prev => [...prev, r]); setActiveId(r.decisionId); setRecord(r); }
  }

  async function deleteRecord() {
    if (!activeId || records.length <= 1) return;
    try {
      await fetch(`${API_BASE}/decision-outcomes/${activeId}?facilityId=${facilityId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* best effort */ }
    const rest = records.filter(r => r.decisionId !== activeId);
    setRecords(rest); setActiveId(rest[0]?.decisionId || '');
    toast({ title: 'Decision record deleted' });
  }

  async function save() {
    setSaving(true);
    const payload: DOTRecord = { ...record, updatedAt: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE}/decision-outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const updated = records.map(r => r.decisionId === activeId ? { ...payload } : r);
      setRecords(updated);
      localStorage.setItem(`nexum_dot_${facilityId}`, JSON.stringify(updated));
      localStorage.setItem('nexum_active_dot_id', activeId);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast({ title: 'Decision saved', description: record.decisionName });
    } catch {
      const updated = records.map(r => r.decisionId === activeId ? { ...payload } : r);
      setRecords(updated);
      localStorage.setItem(`nexum_dot_${facilityId}`, JSON.stringify(updated));
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast({ title: 'Saved locally', description: 'API unreachable.' });
    } finally { setSaving(false); }
  }

  function set<K extends keyof DOTRecord>(field: K, val: DOTRecord[K]) {
    setRecord(prev => ({ ...prev, [field]: val }));
  }

  // Outcome helpers
  function addExpected() {
    const o: ExpectedOutcome = { id: `eo-${Date.now()}`, category: '', description: '', metric: '', baseline: '', target: '', unit: '' };
    set('expectedOutcomes', [...record.expectedOutcomes, o]);
  }
  function updateExpected(id: string, field: keyof ExpectedOutcome, val: string) {
    set('expectedOutcomes', record.expectedOutcomes.map(o => o.id === id ? { ...o, [field]: val } : o));
  }
  function removeExpected(id: string) {
    set('expectedOutcomes', record.expectedOutcomes.filter(o => o.id !== id));
    set('actualOutcomes', record.actualOutcomes.filter(a => a.expectedId !== id));
  }
  function addActual(expectedId: string) {
    const a: ActualOutcome = { id: `ao-${Date.now()}`, expectedId, description: '', achievedValue: '', unit: '', verifiedDate: '', achieved: false };
    set('actualOutcomes', [...record.actualOutcomes, a]);
  }
  function updateActual(id: string, field: keyof ActualOutcome, val: any) {
    set('actualOutcomes', record.actualOutcomes.map(a => a.id === id ? { ...a, [field]: val } : a));
  }

  function setConf(field: keyof ConfidenceScores, val: number) {
    set('confidence', { ...record.confidence, [field]: val });
  }

  const perf = useMemo(() => calcDOTPerformance(record), [record]);

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mr-2" />
        <span className="text-muted-foreground">Loading Decision Outcome Tracking™…</span>
      </div>
    </MainLayout>
  );

  const healthCfg = healthColors[perf.health];

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Decision Outcome Tracking™</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Decision Continuity Intelligence™ — Measure whether decisions produced intended outcomes
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={activeId} onValueChange={id => { setActiveId(id); localStorage.setItem('nexum_active_dot_id', id); }}>
                <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Select decision" /></SelectTrigger>
                <SelectContent>
                  {records.map(r => <SelectItem key={r.decisionId} value={r.decisionId}>{r.decisionName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => startNew()}>
                <Plus className="w-4 h-4 mr-1" />New
              </Button>
              {records.length > 1 && (
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={deleteRecord}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                {saved ? 'Saved ✓' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Name + Status */}
          <div className="flex flex-wrap items-center gap-3">
            {editingName ? (
              <Input autoFocus className="max-w-sm h-8 text-base font-semibold"
                value={record.decisionName}
                onChange={e => set('decisionName', e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold">{record.decisionName}</h2>
                <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {record.decisionType && <Badge variant="outline" className="text-xs">{record.decisionType}</Badge>}
            <Badge className={cn('text-white text-xs',
              record.status === 'Completed' ? 'bg-green-600' :
              record.status === 'In Progress' ? 'bg-blue-600' :
              record.status === 'Cancelled' ? 'bg-gray-600' : 'bg-yellow-600'
            )}>{record.status}</Badge>
          </div>

          {/* ── Health / Performance Banner ── */}
          <div className={cn('flex items-center gap-4 p-4 rounded-xl border', healthCfg.bg)}>
            {perf.health === 'Green' ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> :
             perf.health === 'Yellow' ? <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" /> :
             <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {perf.health === 'Green' ? 'Decision On Track' : perf.health === 'Yellow' ? 'Monitoring Required' : 'Decision At Risk'}
                </span>
                <Badge className={cn('text-white text-xs px-2', healthCfg.badge)}>
                  {perf.health.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Overall Score: {Math.round(perf.overallScore)} / 100 &nbsp;·&nbsp;
                Outcomes Achieved: {perf.achieved}/{perf.total} &nbsp;·&nbsp;
                Confidence: <span className={confColors[perf.confidenceLevel]}>{perf.confidenceLevel}</span>
              </p>
            </div>
            <div className="hidden sm:flex gap-6 shrink-0 text-xs text-muted-foreground">
              <div>Score <span className={cn('font-bold', healthCfg.text)}>{Math.round(perf.overallScore)}</span></div>
              <div>Confidence <span className={cn('font-bold', confColors[perf.confidenceLevel])}>{Math.round(perf.confidenceScore)}%</span></div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-5 max-w-2xl">
              <TabsTrigger value="record" className="text-xs"><ClipboardList className="w-3.5 h-3.5 mr-1" />Record</TabsTrigger>
              <TabsTrigger value="outcomes" className="text-xs"><Target className="w-3.5 h-3.5 mr-1" />Outcomes</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs"><BarChart3 className="w-3.5 h-3.5 mr-1" />Performance</TabsTrigger>
              <TabsTrigger value="continuity" className="text-xs"><Eye className="w-3.5 h-3.5 mr-1" />Continuity</TabsTrigger>
              <TabsTrigger value="lessons" className="text-xs"><Lightbulb className="w-3.5 h-3.5 mr-1" />Lessons</TabsTrigger>
            </TabsList>

            {/* ─── TAB 1: Decision Record ─── */}
            <TabsContent value="record" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Decision Identity</CardTitle>
                    <CardDescription>Core classification and ownership</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FieldBlock label="Decision Type" tip="The category of organizational decision being tracked">
                      <Select value={record.decisionType} onValueChange={v => set('decisionType', v as DecisionType)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{DECISION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FieldBlock>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldBlock label="Decision Date">
                        <Input type="date" className="h-8 text-sm" value={record.decisionDate} onChange={e => set('decisionDate', e.target.value)} />
                      </FieldBlock>
                      <FieldBlock label="Status">
                        <Select value={record.status} onValueChange={v => set('status', v as DOTStatus)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Open', 'In Progress', 'Completed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FieldBlock>
                    </div>
                    <FieldBlock label="Decision Owner" tip="Person responsible for implementing and tracking the decision">
                      <Input className="h-8 text-sm" placeholder="Name & role" value={record.decisionOwner} onChange={e => set('decisionOwner', e.target.value)} />
                    </FieldBlock>
                    <FieldBlock label="Approver" tip="Person with authority who approved this decision">
                      <Input className="h-8 text-sm" placeholder="Name & title" value={record.approver} onChange={e => set('approver', e.target.value)} />
                    </FieldBlock>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldBlock label="Target Completion">
                        <Input type="date" className="h-8 text-sm" value={record.targetCompletionDate} onChange={e => set('targetCompletionDate', e.target.value)} />
                      </FieldBlock>
                      <FieldBlock label="Actual Completion">
                        <Input type="date" className="h-8 text-sm" value={record.actualCompletionDate} onChange={e => set('actualCompletionDate', e.target.value)} />
                      </FieldBlock>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Scope & Context</CardTitle>
                    <CardDescription>Related assets, projects, and business context</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FieldBlock label="Related Assets" tip="Equipment, systems, or physical assets impacted by this decision">
                      <Input className="h-8 text-sm" placeholder="Chiller-001, AHU-3, Boiler-2…" value={record.relatedAssets} onChange={e => set('relatedAssets', e.target.value)} />
                    </FieldBlock>
                    <FieldBlock label="Related Projects" tip="Project IDs or names linked to this decision">
                      <Input className="h-8 text-sm" placeholder="Project name or ID" value={record.relatedProjects} onChange={e => set('relatedProjects', e.target.value)} />
                    </FieldBlock>
                    <FieldBlock label="Business Justification" tip="Why this decision was necessary and what organizational need it addresses">
                      <Textarea className="text-sm min-h-[80px] resize-none" placeholder="Describe the business case and need…" value={record.businessJustification} onChange={e => set('businessJustification', e.target.value)} />
                    </FieldBlock>
                    <FieldBlock label="Success Criteria" tip="Specific, measurable criteria that define successful implementation">
                      <Textarea className="text-sm min-h-[60px] resize-none" placeholder="How will we know if this decision succeeded?" value={record.successCriteria} onChange={e => set('successCriteria', e.target.value)} />
                    </FieldBlock>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Improvement Goals</CardTitle>
                    <CardDescription>Specific targets across operational dimensions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { field: 'riskReductionGoal' as const,             label: 'Risk Reduction Goal',            ph: 'e.g. Reduce critical failures by 30%' },
                        { field: 'operationalImprovementGoal' as const,     label: 'Operational Improvement Goal',   ph: 'e.g. Reduce work order backlog by 20%' },
                        { field: 'financialImprovementGoal' as const,       label: 'Financial Improvement Goal',     ph: 'e.g. Reduce maintenance costs by $50k/yr' },
                        { field: 'energyImprovementGoal' as const,          label: 'Energy Improvement Goal',        ph: 'e.g. Reduce energy use by 15%' },
                        { field: 'complianceImprovementGoal' as const,      label: 'Compliance Improvement Goal',    ph: 'e.g. Achieve 98% compliance score' },
                        { field: 'expectedBenefits' as const,               label: 'Expected Benefits',              ph: 'Describe the full range of expected benefits' },
                      ].map(({ field, label, ph }) => (
                        <FieldBlock key={field} label={label}>
                          <Textarea className="text-xs min-h-[60px] resize-none" placeholder={ph}
                            value={record[field] as string} onChange={e => set(field, e.target.value)} />
                        </FieldBlock>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── TAB 2: Outcomes ─── */}
            <TabsContent value="outcomes" className="space-y-6">
              {/* Expected Outcomes */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Expected Outcomes</CardTitle>
                      <CardDescription>Define measurable outcomes this decision should produce</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={addExpected}>
                      <Plus className="w-4 h-4 mr-1" />Add Outcome
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {record.expectedOutcomes.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-border/60 rounded-lg">
                      <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No expected outcomes defined yet.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Examples: "Reduce downtime by 20%", "Reduce energy by 15%"</p>
                    </div>
                  )}
                  {record.expectedOutcomes.map((o, i) => (
                    <div key={o.id} className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Outcome {i + 1}</span>
                        <button onClick={() => removeExpected(o.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldBlock label="Category">
                          <Select value={o.category} onValueChange={v => updateExpected(o.id, 'category', v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{OUTCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </FieldBlock>
                        <FieldBlock label="Description">
                          <Input className="h-7 text-xs" placeholder='e.g. "Reduce downtime by 20%"' value={o.description} onChange={e => updateExpected(o.id, 'description', e.target.value)} />
                        </FieldBlock>
                        <FieldBlock label="Baseline">
                          <Input className="h-7 text-xs" placeholder="Current value" value={o.baseline} onChange={e => updateExpected(o.id, 'baseline', e.target.value)} />
                        </FieldBlock>
                        <FieldBlock label="Target">
                          <Input className="h-7 text-xs" placeholder="Target value" value={o.target} onChange={e => updateExpected(o.id, 'target', e.target.value)} />
                        </FieldBlock>
                      </div>

                      {/* Linked actual outcomes */}
                      {record.actualOutcomes.filter(a => a.expectedId === o.id).map(a => (
                        <div key={a.id} className="mt-2 p-3 rounded-lg bg-green-950/30 border border-green-600/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-green-400">Actual Result</span>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={a.achieved} onChange={e => updateActual(a.id, 'achieved', e.target.checked)} className="rounded" />
                              Achieved
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <FieldBlock label="Description">
                              <Input className="h-7 text-xs" placeholder='e.g. "Reduced by 23%"' value={a.description} onChange={e => updateActual(a.id, 'description', e.target.value)} />
                            </FieldBlock>
                            <FieldBlock label="Achieved Value">
                              <Input className="h-7 text-xs" placeholder="Actual measured result" value={a.achievedValue} onChange={e => updateActual(a.id, 'achievedValue', e.target.value)} />
                            </FieldBlock>
                          </div>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => addActual(o.id)}>
                        <Plus className="w-3 h-3 mr-1" />Record Actual Result
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── TAB 3: Performance Engine ─── */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Score */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Overall Outcome Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-2">
                      <div className={cn('text-5xl font-bold font-mono', healthCfg.text)}>
                        {Math.round(perf.overallScore)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                      <Badge className={cn('mt-2 text-white text-xs', healthCfg.badge)}>{perf.health.toUpperCase()}</Badge>
                    </div>
                    <Separator />
                    <ScoreBar label="Outcome Achievement" value={perf.outcomeAchievementPct} tip="% of expected outcomes with confirmed actual results" />
                    <ScoreBar label="Confidence Score" value={perf.confidenceScore} tip="Weighted average of all confidence dimension ratings" />
                    <ScoreBar label="Completion Performance" value={perf.completionScore} tip="On-time completion relative to target date" />
                  </CardContent>
                </Card>

                {/* Confidence Engine */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Decision Confidence Score
                    </CardTitle>
                    <CardDescription>
                      Rate each dimension 0–5 &nbsp;·&nbsp;
                      Level: <span className={cn('font-bold', confColors[perf.confidenceLevel])}>{perf.confidenceLevel} ({Math.round(perf.confidenceScore)}%)</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {CONFIDENCE_FIELDS.map(({ key, label, tip }) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <Tooltip>
                              <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                              <TooltipContent className="text-xs max-w-xs">{tip}</TooltipContent>
                            </Tooltip>
                          </div>
                          <span className={cn('text-sm font-bold font-mono', record.confidence[key] >= 4 ? 'text-green-400' : record.confidence[key] >= 2 ? 'text-yellow-400' : 'text-red-400')}>
                            {record.confidence[key]}/5
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setConf(key, n)}
                              className={cn('flex-1 h-6 rounded text-xs font-bold transition-colors',
                                n <= record.confidence[key]
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                              )}
                            >{n}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── TAB 4: Decision Continuity ─── */}
            <TabsContent value="continuity" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Decision Continuity Engine™
                  </CardTitle>
                  <CardDescription>Preserve the complete decision record — why, who, what evidence, what risks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[
                      { field: 'whyDecided' as const, label: 'Why the Decision Was Made', tip: 'The organizational need, trigger event, or condition that necessitated this decision', ph: 'Describe the problem, condition, or strategic need that drove this decision…' },
                      { field: 'alternativesConsidered' as const, label: 'Alternatives Considered', tip: 'Other options that were evaluated before this decision was made', ph: 'List alternatives and why they were not chosen…' },
                      { field: 'risksAccepted' as const, label: 'Risks Accepted', tip: 'Known risks that were accepted when making this decision', ph: 'Describe risks that were identified and accepted…' },
                      { field: 'assumptions' as const, label: 'Assumptions Made', tip: 'Assumptions that underpin the expected outcomes and success criteria', ph: 'List key assumptions made at the time of the decision…' },
                    ].map(({ field, label, tip, ph }) => (
                      <FieldBlock key={field} label={label} tip={tip}>
                        <Textarea className="text-xs min-h-[100px] resize-none" placeholder={ph}
                          value={record[field] as string} onChange={e => set(field, e.target.value)} />
                      </FieldBlock>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary font-semibold">Decision Defensibility™ Traceability</p>
                    <p className="text-xs text-muted-foreground mt-1">This record preserves: Decision → Evidence → Risk → Approval → Implementation → Outcome → Lessons. Records are permanent and never overwritten.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── TAB 5: Lessons Learned ─── */}
            <TabsContent value="lessons" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Lessons Learned Repository
                  </CardTitle>
                  <CardDescription>Organizational knowledge captured for future decision-making</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[
                      { field: 'whatWorked' as const, label: 'What Worked', ph: 'Describe what went well and should be repeated…' },
                      { field: 'whatFailed' as const, label: 'What Failed', ph: 'Describe what went wrong or underperformed…' },
                      { field: 'unexpectedOutcomes' as const, label: 'Unexpected Outcomes', ph: 'Describe any outcomes — positive or negative — that were not anticipated…' },
                      { field: 'financialLessons' as const, label: 'Financial Lessons', ph: 'Cost surprises, budget insights, ROI lessons…' },
                      { field: 'operationalLessons' as const, label: 'Operational Lessons', ph: 'Process insights, scheduling, resource allocation lessons…' },
                      { field: 'complianceLessons' as const, label: 'Compliance Lessons', ph: 'Regulatory, code, or inspection lessons learned…' },
                      { field: 'energyLessons' as const, label: 'Energy Lessons', ph: 'Energy performance insights and metering accuracy…' },
                      { field: 'recommendedFutureActions' as const, label: 'Recommended Future Actions', ph: 'Specific recommendations for future decisions of this type…' },
                      { field: 'futureRiskConsiderations' as const, label: 'Future Risk Considerations', ph: 'Risks to watch for in similar future decisions…' },
                    ].map(({ field, label, ph }) => (
                      <FieldBlock key={field} label={label}>
                        <Textarea className="text-xs min-h-[70px] resize-none" placeholder={ph}
                          value={record[field] as string} onChange={e => set(field, e.target.value)} />
                      </FieldBlock>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
