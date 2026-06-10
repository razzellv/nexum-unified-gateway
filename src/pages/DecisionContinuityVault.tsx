import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, Lock, FileText, Brain, Target, CheckCircle2, BookOpen,
  Wrench, GraduationCap, Plus, RefreshCw, ChevronRight, X, Loader2,
  AlertTriangle, Lightbulb, ArrowRight, Hash, Eye, TrendingUp,
  ShieldCheck, Link2, Clock, User, Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
const getToken = () =>
  localStorage.getItem('nexum_id_token') ||
  localStorage.getItem('nexum_access_token') || '';

const SIGNAL_PHASES: { key: string; label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string; desc: string }[] = [
  { key: 'observation',     label: 'Signal',        icon: Eye,          color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   desc: 'Raw observation — what was seen or detected' },
  { key: 'assessment',      label: 'Judgment',       icon: Brain,        color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', desc: 'Assessment — how it was interpreted at the time' },
  { key: 'authorization',   label: 'Authorization',  icon: FileText,     color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30', desc: 'Decision authorization — who approved the course of action' },
  { key: 'execution',       label: 'Execution',      icon: Wrench,       color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', desc: 'Work performed — actions taken in response' },
  { key: 'outcome',         label: 'Outcome',        icon: Target,       color: 'text-teal-400',   bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   desc: 'Business result — what actually happened after execution' },
  { key: 'validation',      label: 'Validation',     icon: ShieldCheck,  color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   desc: 'Verification — independent confirmation of outcome' },
  { key: 'lessons_learned', label: 'Lessons Learned',icon: GraduationCap,color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  desc: 'Knowledge preservation — what future teams must know' },
];

const SOURCE_TYPES = ['system_violation', 'observation_journal', 'work_order', 'compliance', 'manual'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChainMetrics {
  knowledgePreservationScore: number;
  authorizationQuality: number;
  assessmentAccuracy: number | null;
  decisionAccuracyRate: number | null;
  repeatFailureRisk: number;
  admissibilityRate: number;
}

interface Chain {
  id: string;
  facilityId?: string;
  title: string;
  sourceType: string;
  sourceId?: string;
  description?: string;
  phases: Record<string, string>;
  signalCount: number;
  headHash?: string;
  metrics: ChainMetrics;
  admissibilityVerified: boolean;
  status: 'active' | 'complete';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

interface Signal {
  id: string;
  chainId: string;
  signalType: string;
  sourceType: string;
  sourceId?: string;
  // Raw layer
  rawContent: string;
  actor: string;
  actorRole?: string;
  recordedAt: string;
  assetId?: string;
  assetName?: string;
  department?: string;
  building?: string;
  area?: string;
  // Chain of custody
  contentHash: string;
  chainHash: string;
  prevSignalId?: string;
  // Layers
  normalized?: {
    assetCategory?: string;
    riskCategory?: string;
    violationType?: string;
    workOrderType?: string;
    complianceCategory?: string;
  };
  interpretation?: {
    summary?: string;
    finding?: string;
    recommendation?: string;
    defensibilityScore?: number;
    continuityScore?: number;
  } | null;
  assessmentOutcomeMatch?: 'yes' | 'partially' | 'no' | null;
  admissibilityStatus: 'raw' | 'normalized' | 'interpreted';
  createdAt: string;
}

interface VaultStats {
  totalChains: number;
  activeChains: number;
  completeChains: number;
  admissibleChains: number;
  avgKPS: number;
  avgDAR: number | null;
  totalSignals: number;
  signalsByType: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ageLabel(ts: string): string {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago`;
}

function scoreColor(n: number | null): string {
  if (n === null) return 'text-muted-foreground';
  if (n >= 80) return 'text-green-400';
  if (n >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function admissibilityInfo(status: Signal['admissibilityStatus']) {
  switch (status) {
    case 'interpreted': return { label: 'ADMISSIBLE', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' };
    case 'normalized':  return { label: 'NORMALIZED', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    default:            return { label: 'RAW ONLY',   color: 'text-red-400',   bg: 'bg-red-500/15',   border: 'border-red-500/30' };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhaseProgressDots({ phases }: { phases: Record<string, string> }) {
  return (
    <div className="flex items-center gap-1">
      {SIGNAL_PHASES.map(p => {
        const filled = !!phases[p.key];
        return (
          <div
            key={p.key}
            title={p.label}
            className={cn(
              'w-2.5 h-2.5 rounded-full border transition-all',
              filled ? cn(p.bg, p.border) : 'bg-transparent border-white/20',
            )}
          />
        );
      })}
    </div>
  );
}

function AdmissibilityBadge({ status }: { status: Signal['admissibilityStatus'] }) {
  const info = admissibilityInfo(status);
  return (
    <Badge className={cn('text-[10px] px-1.5 py-0 border font-semibold tracking-wide', info.bg, info.border, info.color)}>
      {status === 'interpreted' && <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />}
      {info.label}
    </Badge>
  );
}

function ChainAdmissibilityBadge({ verified, rate }: { verified: boolean; rate: number }) {
  if (verified) return (
    <Badge className="text-[10px] px-1.5 py-0 border bg-green-500/15 border-green-500/30 text-green-400 font-semibold">
      <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />FULLY ADMISSIBLE
    </Badge>
  );
  if (rate > 0) return (
    <Badge className="text-[10px] px-1.5 py-0 border bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold">
      {rate}% ADMISSIBLE
    </Badge>
  );
  return (
    <Badge className="text-[10px] px-1.5 py-0 border bg-red-500/15 border-red-500/30 text-red-400 font-semibold">
      NOT ADMISSIBLE
    </Badge>
  );
}

// ── Admissibility Chain Diagram ───────────────────────────────────────────────

function AdmissibilityChainDiagram({ signal }: { signal: Signal | null }) {
  if (!signal) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/3 p-4 text-center text-xs text-muted-foreground">
        No signal recorded for this phase.
      </div>
    );
  }

  const hasNorm   = !!signal.normalized;
  const hasInterp = !!signal.interpretation;
  const info = admissibilityInfo(signal.admissibilityStatus);

  const layers = [
    {
      label: 'RAW SIGNAL',
      sublabel: 'Immutable original record',
      done: true,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    {
      label: 'NORMALIZED',
      sublabel: 'Structured categories applied',
      done: hasNorm,
      color: hasNorm ? 'text-blue-400' : 'text-white/30',
      bg: hasNorm ? 'bg-blue-500/10' : 'bg-transparent',
      border: hasNorm ? 'border-blue-500/30' : 'border-white/15',
    },
    {
      label: 'INTERPRETED',
      sublabel: 'ATI finding + recommendation',
      done: hasInterp,
      color: hasInterp ? 'text-purple-400' : 'text-white/30',
      bg: hasInterp ? 'bg-purple-500/10' : 'bg-transparent',
      border: hasInterp ? 'border-purple-500/30' : 'border-white/15',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Admissibility Engine™</span>
        <ChainAdmissibilityBadge verified={signal.admissibilityStatus === 'interpreted'} rate={signal.admissibilityStatus === 'normalized' ? 66 : 33} />
      </div>

      <div className="flex items-center gap-1">
        {layers.map((layer, i) => (
          <div key={layer.label} className="flex items-center gap-1 flex-1">
            <div className={cn('flex-1 rounded-lg border p-2.5 space-y-0.5', layer.bg, layer.border)}>
              <div className="flex items-center gap-1.5">
                {layer.done
                  ? <CheckCircle2 className={cn('w-3 h-3', layer.color)} />
                  : <div className="w-3 h-3 rounded-full border border-white/20" />}
                <span className={cn('text-[10px] font-bold tracking-wider', layer.color)}>{layer.label}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">{layer.sublabel}</p>
            </div>
            {i < layers.length - 1 && (
              <ArrowRight className={cn('w-3.5 h-3.5 flex-shrink-0', i === 0 || layers[i + 1].done ? 'text-white/40' : 'text-white/15')} />
            )}
          </div>
        ))}
      </div>

      {/* Hash verification */}
      <div className="flex items-center gap-2 bg-white/3 rounded px-2.5 py-1.5">
        <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-[9px] text-muted-foreground">Content Hash: </span>
          <span className="text-[9px] font-mono text-white/50 break-all">{signal.contentHash}</span>
        </div>
      </div>
    </div>
  );
}

// ── Signal Block (3-layer display) ────────────────────────────────────────────

function SignalBlock({ signal, onAddInterpretation }: {
  signal: Signal | null;
  onAddInterpretation?: (sigId: string) => void;
}) {
  if (!signal) return null;

  return (
    <div className="space-y-3">
      {/* Layer 1: Raw (immutable) */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Immutable Raw Signal</span>
          </div>
          <AdmissibilityBadge status={signal.admissibilityStatus} />
        </div>
        <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{signal.rawContent || '—'}</p>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {signal.actor && (
            <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{signal.actor}</span>
          )}
          {signal.actorRole && (
            <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" />{signal.actorRole}</span>
          )}
          {signal.recordedAt && (
            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{formatDate(signal.recordedAt)}</span>
          )}
          {signal.building && (
            <span className="flex items-center gap-1"><Building2 className="w-2.5 h-2.5" />{signal.building}{signal.area ? ` / ${signal.area}` : ''}</span>
          )}
          {signal.assetName && (
            <span className="flex items-center gap-1"><Wrench className="w-2.5 h-2.5" />{signal.assetName}</span>
          )}
        </div>
        {signal.prevSignalId && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
            <Link2 className="w-2.5 h-2.5" />Chain links to previous signal: {signal.prevSignalId.slice(0, 8)}…
          </div>
        )}
      </div>

      {/* Layer 2: Normalization */}
      {signal.normalized && Object.values(signal.normalized).some(Boolean) && (
        <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Normalization Layer</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {signal.normalized.assetCategory && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5">
                Asset: {signal.normalized.assetCategory}
              </Badge>
            )}
            {signal.normalized.riskCategory && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5">
                Risk: {signal.normalized.riskCategory}
              </Badge>
            )}
            {signal.normalized.violationType && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5">
                Type: {signal.normalized.violationType}
              </Badge>
            )}
            {signal.normalized.workOrderType && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5">
                WO: {signal.normalized.workOrderType}
              </Badge>
            )}
            {signal.normalized.complianceCategory && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5">
                Compliance: {signal.normalized.complianceCategory}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Layer 3: Interpretation */}
      {signal.interpretation ? (
        <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Interpretation Layer</span>
            <Badge className="text-[10px] bg-green-500/15 text-green-300 border border-green-500/30 px-1.5 py-0 ml-auto">
              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />ADMISSIBLE
            </Badge>
          </div>
          {signal.interpretation.finding && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">ATI Finding:</p>
              <p className="text-xs leading-relaxed">{signal.interpretation.finding}</p>
            </div>
          )}
          {signal.interpretation.summary && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Summary:</p>
              <p className="text-xs leading-relaxed text-white/80">{signal.interpretation.summary}</p>
            </div>
          )}
          {signal.interpretation.recommendation && (
            <div className="bg-purple-500/8 rounded p-2">
              <p className="text-[10px] text-purple-300 font-semibold mb-0.5 flex items-center gap-1">
                <Lightbulb className="w-2.5 h-2.5" />Recommendation:
              </p>
              <p className="text-xs leading-relaxed">{signal.interpretation.recommendation}</p>
            </div>
          )}
          {(signal.interpretation.defensibilityScore != null || signal.interpretation.continuityScore != null) && (
            <div className="flex gap-4 text-xs">
              {signal.interpretation.defensibilityScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Defensibility:</span>
                  <span className={scoreColor(signal.interpretation.defensibilityScore)}>{signal.interpretation.defensibilityScore}/100</span>
                </div>
              )}
              {signal.interpretation.continuityScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Continuity:</span>
                  <span className={scoreColor(signal.interpretation.continuityScore)}>{signal.interpretation.continuityScore}/100</span>
                </div>
              )}
            </div>
          )}
          {signal.signalType === 'outcome' && signal.assessmentOutcomeMatch && (
            <div className={cn('rounded px-2.5 py-1.5 text-xs font-semibold text-center', {
              yes:       'bg-green-500/15 text-green-300 border border-green-500/30',
              partially: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
              no:        'bg-red-500/15 text-red-300 border border-red-500/30',
            }[signal.assessmentOutcomeMatch])}>
              Assessment was: {signal.assessmentOutcomeMatch.toUpperCase()}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/3 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Brain className="w-3 h-3" />
            <span className="text-xs">Interpretation not yet added — signal is not yet admissible</span>
          </div>
          {onAddInterpretation && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] border-purple-500/40 text-purple-300 hover:bg-purple-500/10 ml-2"
              onClick={() => onAddInterpretation(signal.id)}
            >
              + Interpret
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Metrics Panel ─────────────────────────────────────────────────────────────

function MetricsPanel({ metrics }: { metrics: ChainMetrics }) {
  const items = [
    { label: 'Decision Accuracy Rate™',    val: metrics.decisionAccuracyRate,      icon: Target },
    { label: 'Assessment Accuracy™',        val: metrics.assessmentAccuracy,         icon: Brain },
    { label: 'Authorization Quality™',      val: metrics.authorizationQuality,       icon: FileText },
    { label: 'Repeat Failure Risk™',        val: metrics.repeatFailureRisk,          icon: AlertTriangle, invert: true },
    { label: 'Knowledge Preservation Score™', val: metrics.knowledgePreservationScore, icon: GraduationCap },
  ];

  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map(({ label, val, icon: Icon, invert }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-muted-foreground truncate pr-2">{label}</span>
              <span className={cn('text-xs font-bold flex-shrink-0', val === null ? 'text-muted-foreground' : invert ? scoreColor(100 - (val ?? 0)) : scoreColor(val ?? 0))}>
                {val === null ? '—' : `${val}/100`}
              </span>
            </div>
            {val !== null && (
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', invert
                    ? (val <= 25 ? 'bg-green-500' : val <= 50 ? 'bg-amber-500' : 'bg-red-500')
                    : (val >= 80 ? 'bg-green-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500')
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chain Card ────────────────────────────────────────────────────────────────

function ChainCard({ chain, selected, onClick }: { chain: Chain; selected: boolean; onClick: () => void }) {
  const phaseFilled = Object.keys(chain.phases || {}).length;
  const sourceTypeLabel: Record<string, string> = {
    system_violation: 'System Violation',
    observation_journal: 'Observation Journal',
    work_order: 'Work Order',
    compliance: 'Compliance',
    manual: 'Manual',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        selected
          ? 'bg-cyan-500/10 border-cyan-500/40'
          : 'bg-white/3 border-white/10 hover:bg-white/5 hover:border-white/20',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{chain.title}</p>
        </div>
        <ChainAdmissibilityBadge verified={chain.admissibilityVerified} rate={chain.metrics.admissibilityRate} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge className="text-[10px] bg-white/10 text-white/50 border-white/20 border px-1.5 py-0 capitalize">
          {sourceTypeLabel[chain.sourceType] || chain.sourceType}
        </Badge>
        <Badge className={cn('text-[10px] border px-1.5 py-0 capitalize', chain.status === 'complete' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30')}>
          {chain.status}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{ageLabel(chain.createdAt)}</span>
      </div>
      <div className="flex items-center justify-between">
        <PhaseProgressDots phases={chain.phases || {}} />
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{phaseFilled}/7 phases</span>
          <span className={scoreColor(chain.metrics.knowledgePreservationScore)}>
            KPS: {chain.metrics.knowledgePreservationScore}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Create Chain Modal ────────────────────────────────────────────────────────

function CreateChainModal({ onClose, onCreate }: { onClose: () => void; onCreate: (chain: Chain) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<string>('manual');
  const [sourceId, setSourceId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/dc-vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title, sourceType, sourceId, description }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { chain: Chain };
      toast({ title: 'Chain created' });
      onCreate(data.chain);
    } catch {
      toast({ title: 'Failed to create chain', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border/60 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold">New Continuity Chain</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Chain Title <span className="text-red-400">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chiller #2 Discharge Pressure Event" className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Source Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Source Record ID (optional)</Label>
            <Input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="UUID of linked record" className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the event chain..." className="mt-1 text-sm resize-none" rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()} className="w-full" size="sm">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Create Chain
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Signal Modal ──────────────────────────────────────────────────────────

function AddSignalModal({ chainId, onClose, onAdded }: { chainId: string; onClose: () => void; onAdded: (sig: Signal) => void }) {
  const { toast } = useToast();
  const [signalType, setSignalType] = useState('observation');
  const [rawContent, setRawContent] = useState('');
  const [actor, setActorName] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [assetName, setAssetName] = useState('');
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
  const [assessmentOutcomeMatch, setAssessmentOutcomeMatch] = useState<'yes' | 'partially' | 'no' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!rawContent.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        signalType, rawContent, actor, actorRole,
        recordedAt: recordedAt ? new Date(recordedAt).toISOString() : undefined,
        assetName, building, area,
      };
      if (signalType === 'outcome' && assessmentOutcomeMatch) {
        body.assessmentOutcomeMatch = assessmentOutcomeMatch;
      }
      const res = await fetch(`${API_BASE}/dc-vault/${chainId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { signal: Signal };
      toast({ title: 'Signal recorded' });
      onAdded(data.signal);
    } catch {
      toast({ title: 'Failed to record signal', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  const phase = SIGNAL_PHASES.find(p => p.key === signalType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border/60 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold">Record Signal</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Signal Type <span className="text-red-400">*</span></Label>
            <Select value={signalType} onValueChange={setSignalType}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIGNAL_PHASES.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {phase && <p className="text-[10px] text-muted-foreground mt-1">{phase.desc}</p>}
          </div>
          <div>
            <Label className="text-xs">Raw Content <span className="text-red-400">*</span> — verbatim, exactly as stated</Label>
            <Textarea
              value={rawContent}
              onChange={e => setRawContent(e.target.value)}
              placeholder="Enter the original, unmodified record exactly as it was stated or observed..."
              className="mt-1 text-sm resize-none border-amber-500/30 focus:border-amber-500/60"
              rows={4}
            />
            <p className="text-[9px] text-amber-400/70 mt-0.5">This content will be hashed and cannot be changed after submission.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Recorded By</Label>
              <Input value={actor} onChange={e => setActorName(e.target.value)} placeholder="Name" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Input value={actorRole} onChange={e => setActorRole(e.target.value)} placeholder="Title" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Recorded At</Label>
              <Input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Asset / Equipment</Label>
              <Input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Chiller #2" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Building</Label>
              <Input value={building} onChange={e => setBuilding(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Area</Label>
              <Input value={area} onChange={e => setArea(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          {signalType === 'outcome' && (
            <div>
              <Label className="text-xs mb-2 block">Was the original assessment correct?</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['yes', 'partially', 'no'] as const).map(opt => {
                  const colorMap = { yes: 'bg-green-500/20 border-green-500/50 text-green-300', partially: 'bg-amber-500/20 border-amber-500/50 text-amber-300', no: 'bg-red-500/20 border-red-500/50 text-red-300' };
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAssessmentOutcomeMatch(opt)}
                      className={cn('py-2 rounded-lg border text-xs font-semibold transition-all', assessmentOutcomeMatch === opt ? colorMap[opt] : 'bg-white/5 border-white/15 text-white/40 hover:bg-white/10')}
                    >
                      {opt.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={submitting || !rawContent.trim()} className="w-full bg-amber-600 hover:bg-amber-700" size="sm">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
            Record & Hash Signal
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Interpretation Modal ──────────────────────────────────────────────────

function AddInterpretationModal({ chainId, signalId, onClose, onAdded }: {
  chainId: string; signalId: string; onClose: () => void; onAdded: (sig: Signal) => void;
}) {
  const { toast } = useToast();
  const [summary, setSummary] = useState('');
  const [finding, setFinding] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [defensibilityScore, setDefensibilityScore] = useState('');
  const [continuityScore, setContinuityScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!finding.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/dc-vault/${chainId}/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          interpretation: {
            summary, finding, recommendation,
            defensibilityScore: defensibilityScore ? Number(defensibilityScore) : undefined,
            continuityScore:    continuityScore    ? Number(continuityScore)    : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { signal: Signal };
      toast({ title: 'Interpretation added — signal is now admissible' });
      onAdded(data.signal);
    } catch {
      toast({ title: 'Failed to add interpretation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border/60 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />Add Interpretation Layer
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-purple-500/8 border border-purple-500/20 rounded p-2 text-xs text-purple-300">
            Adding an interpretation makes this signal fully admissible. The raw content and normalization are not affected.
          </div>
          <div>
            <Label className="text-xs">ATI Finding <span className="text-red-400">*</span></Label>
            <Textarea value={finding} onChange={e => setFinding(e.target.value)} placeholder="State the ATI finding that references this original signal..." className="mt-1 text-sm resize-none" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Executive Summary</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="One-paragraph summary for executive reports..." className="mt-1 text-sm resize-none" rows={2} />
          </div>
          <div>
            <Label className="text-xs">Recommendation</Label>
            <Textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} placeholder="Action recommendation based on this signal..." className="mt-1 text-sm resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Defensibility Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={defensibilityScore} onChange={e => setDefensibilityScore(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Continuity Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={continuityScore} onChange={e => setContinuityScore(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !finding.trim()} className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
            Submit Interpretation — Mark Admissible
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DecisionContinuityVault() {
  const { authState } = useAuth();
  const { toast }     = useToast();

  const [chains, setChains] = useState<Chain[]>([]);
  const [stats, setStats]   = useState<VaultStats | null>(null);
  const [selected, setSelected] = useState<{ chain: Chain; signals: Signal[] } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter]   = useState<'all' | 'active' | 'complete'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showSignal, setShowSignal] = useState(false);
  const [interpretTarget, setInterpretTarget] = useState<string | null>(null);

  const loadChains = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dc-vault`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { chains: Chain[] };
      setChains(data.chains || []);
    } catch {
      setChains([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dc-vault/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setStats(await res.json() as VaultStats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (chainId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dc-vault/${chainId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { chain: Chain; signals: Signal[] };
      setSelected(data);
    } catch {
      toast({ title: 'Failed to load chain', variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChains();
    loadStats();
  }, [loadChains, loadStats]);

  const filteredChains = chains.filter(c => filter === 'all' || c.status === filter);

  return (
    <MainLayout>
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Decision Continuity™ Vault</h1>
                  <p className="text-xs text-cyan-400 font-medium">Admissibility Engine™</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Preserve operational judgment exactly as it existed at the moment decisions were made. Original signals are immutable, hashed, and chain-linked.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Chain
            </Button>
          </div>

          {/* Stats bar */}
          {!statsLoading && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              {[
                { label: 'Total Chains',      val: stats.totalChains,      color: 'text-foreground' },
                { label: 'Active',            val: stats.activeChains,     color: 'text-blue-400' },
                { label: 'Admissible',        val: stats.admissibleChains, color: 'text-green-400' },
                { label: 'Avg KPS',           val: stats.avgKPS != null ? `${stats.avgKPS}/100` : '—', color: scoreColor(stats.avgKPS) },
                { label: 'Total Signals',     val: stats.totalSignals,     color: 'text-muted-foreground' },
              ].map(({ label, val, color }) => (
                <Card key={label} className="bg-white/3 border-white/10">
                  <CardContent className="p-3 text-center">
                    <p className={cn('text-lg font-bold', color)}>{val}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className={cn('flex gap-4 flex-1 min-h-0', selected ? 'flex-row' : 'flex-col')}>

          {/* Chain list */}
          <div className={cn('flex flex-col', selected ? 'w-80 flex-shrink-0' : 'flex-1')}>
            {/* Filter tabs */}
            <div className="flex gap-1 mb-3">
              {(['all', 'active', 'complete'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors',
                    filter === f ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                  )}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => loadChains()}
                className="ml-auto p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : filteredChains.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Lock className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground">No chains found.</p>
                  <p className="text-xs text-muted-foreground/60">Create a chain to begin preserving decision continuity.</p>
                </div>
              ) : (
                filteredChains.map(chain => (
                  <ChainCard
                    key={chain.id}
                    chain={chain}
                    selected={selected?.chain.id === chain.id}
                    onClick={() => loadDetail(chain.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 min-w-0 flex flex-col border border-white/10 rounded-xl bg-white/3 overflow-hidden max-h-[calc(100vh-16rem)]">
              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : (
                <>
                  {/* Detail header */}
                  <div className="flex-shrink-0 p-4 border-b border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <ChainAdmissibilityBadge verified={selected.chain.admissibilityVerified} rate={selected.chain.metrics.admissibilityRate} />
                          <Badge className={cn('text-[10px] border px-1.5 py-0 capitalize', selected.chain.status === 'complete' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30')}>
                            {selected.chain.status}
                          </Badge>
                        </div>
                        <p className="text-base font-semibold leading-snug">{selected.chain.title}</p>
                        {selected.chain.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{selected.chain.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <PhaseProgressDots phases={selected.chain.phases || {}} />
                          <span className="text-[10px] text-muted-foreground">{Object.keys(selected.chain.phases || {}).length}/7 phases • {selected.signals.length} signals</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                          onClick={() => setShowSignal(true)}
                        >
                          <Plus className="w-3 h-3 mr-1" />Signal
                        </Button>
                        <button
                          onClick={() => setSelected(null)}
                          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="overview" className="h-full flex flex-col">
                      <TabsList className="flex-shrink-0 w-full justify-start rounded-none border-b border-white/10 bg-transparent h-9 px-4 gap-0 overflow-x-auto">
                        <TabsTrigger
                          value="overview"
                          className="text-xs px-3 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent data-[state=active]:text-cyan-300 gap-1 flex-shrink-0"
                        >
                          <BookOpen className="w-3 h-3" />Overview
                        </TabsTrigger>
                        {SIGNAL_PHASES.map(phase => {
                          const Icon = phase.icon;
                          const hasSig = !!selected.chain.phases[phase.key];
                          return (
                            <TabsTrigger
                              key={phase.key}
                              value={phase.key}
                              className={cn(
                                'text-xs px-3 h-9 rounded-none border-b-2 border-transparent gap-1 flex-shrink-0',
                                'data-[state=active]:border-b-2 data-[state=active]:bg-transparent',
                                hasSig
                                  ? `data-[state=active]:${phase.color} data-[state=active]:border-current`
                                  : 'opacity-40 data-[state=active]:text-muted-foreground',
                              )}
                            >
                              <Icon className="w-3 h-3" />{phase.label}
                              {hasSig && <div className={cn('w-1.5 h-1.5 rounded-full ml-0.5', phase.bg.replace('/15', '/60'))} />}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>

                      <div className="flex-1 overflow-y-auto">

                        {/* Overview tab */}
                        <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/3 border-white/10">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Intelligence Metrics</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <MetricsPanel metrics={selected.chain.metrics} />
                              </CardContent>
                            </Card>

                            <div className="space-y-3">
                              <Card className="bg-white/3 border-white/10">
                                <CardContent className="p-3 space-y-2">
                                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Phase Completion</p>
                                  {SIGNAL_PHASES.map(phase => {
                                    const Icon = phase.icon;
                                    const sigId = selected.chain.phases[phase.key];
                                    const sig = sigId ? selected.signals.find(s => s.id === sigId) : null;
                                    return (
                                      <div key={phase.key} className="flex items-center gap-2 py-0.5">
                                        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', sigId ? phase.color : 'text-white/20')} />
                                        <span className={cn('text-xs flex-1', sigId ? 'text-foreground' : 'text-white/30')}>{phase.label}</span>
                                        {sig ? (
                                          <AdmissibilityBadge status={sig.admissibilityStatus} />
                                        ) : (
                                          <Badge className="text-[10px] px-1.5 py-0 bg-white/5 text-white/20 border-white/10 border">Missing</Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                                </CardContent>
                              </Card>
                              {selected.chain.headHash && (
                                <Card className="bg-white/3 border-white/10">
                                  <CardContent className="p-3 space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                      <Hash className="w-3 h-3" />Chain Head Hash
                                    </p>
                                    <p className="text-[9px] font-mono text-white/40 break-all">{selected.chain.headHash}</p>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        {/* Phase tabs */}
                        {SIGNAL_PHASES.map(phase => {
                          const sigId = selected.chain.phases[phase.key];
                          const sig   = sigId ? selected.signals.find(s => s.id === sigId) : null;
                          const Icon  = phase.icon;
                          return (
                            <TabsContent key={phase.key} value={phase.key} className="p-4 space-y-4 mt-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className={cn('w-4 h-4', phase.color)} />
                                <span className={cn('text-sm font-semibold', phase.color)}>{phase.label}</span>
                                <span className="text-xs text-muted-foreground">— {phase.desc}</span>
                              </div>

                              {sig ? (
                                <>
                                  <SignalBlock
                                    signal={sig}
                                    onAddInterpretation={(id) => setInterpretTarget(id)}
                                  />
                                  <AdmissibilityChainDiagram signal={sig} />
                                </>
                              ) : (
                                <div className={cn('rounded-lg border p-6 text-center space-y-3', phase.bg, phase.border)}>
                                  <Icon className={cn('w-8 h-8 mx-auto opacity-30', phase.color)} />
                                  <p className="text-sm text-muted-foreground">No {phase.label.toLowerCase()} signal recorded yet.</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={cn('border', phase.border, phase.color)}
                                    onClick={() => setShowSignal(true)}
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" />Record {phase.label}
                                  </Button>
                                </div>
                              )}
                            </TabsContent>
                          );
                        })}

                      </div>
                    </Tabs>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateChainModal
          onClose={() => setShowCreate(false)}
          onCreate={chain => {
            setChains(prev => [chain, ...prev]);
            setShowCreate(false);
            loadStats();
          }}
        />
      )}

      {showSignal && selected && (
        <AddSignalModal
          chainId={selected.chain.id}
          onClose={() => setShowSignal(false)}
          onAdded={sig => {
            setSelected(prev => prev ? {
              chain: {
                ...prev.chain,
                phases: { ...prev.chain.phases, [sig.signalType]: sig.id },
                signalCount: prev.chain.signalCount + 1,
              },
              signals: [...prev.signals, sig],
            } : null);
            setShowSignal(false);
          }}
        />
      )}

      {interpretTarget && selected && (
        <AddInterpretationModal
          chainId={selected.chain.id}
          signalId={interpretTarget}
          onClose={() => setInterpretTarget(null)}
          onAdded={updatedSig => {
            setSelected(prev => prev ? {
              ...prev,
              signals: prev.signals.map(s => s.id === updatedSig.id ? updatedSig : s),
            } : null);
            setInterpretTarget(null);
          }}
        />
      )}
    </MainLayout>
  );
}
