import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TierGate } from '@/components/TierGate';
import { useAuth } from '@/hooks/useAuth';
import {
  BrainCircuit, RefreshCw, ShieldCheck, Zap, Activity,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Minus, Info, ChevronDown, ChevronUp, ClipboardList, Eye,
  Target, PowerOff, Wrench, Plus, Timer, BarChart3,
} from 'lucide-react';
import { getCriticalPath, type CriticalPathData } from '@/lib/nexum-api';
import { DataCorrelationEngine, type CorrelationSummary, type CorrelationInsight } from '@/services/DataCorrelationEngine';
import { ObservationEngine, type SystemObservation } from '@/services/ObservationEngine';
import {
  analyzeDowntime,
  type DowntimeAnalysisResult,
  type DowntimeEvent,
  type TimelineBucket,
} from '@/lib/downtimeAnalysisEngine';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  runOIGAnalysis,
  type OIGAnalysisResult,
  type CorrelatedFinding,
  type ReliabilityFinding,
  type ComplianceRisk,
  type PredictiveInsight,
  type GovernanceEntry,
} from '@/lib/operationalIntelligenceEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(n: number) {
  if (n >= 80) return 'text-emerald-400';
  if (n >= 60) return 'text-yellow-400';
  if (n >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(n: number) {
  if (n >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
  if (n >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
  if (n >= 40) return 'bg-orange-500/20 border-orange-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

function scoreLabel(n: number) {
  if (n >= 85) return 'Excellent';
  if (n >= 70) return 'Good';
  if (n >= 55) return 'Acceptable';
  if (n >= 40) return 'At Risk';
  return 'Critical';
}

function severityBadge(s: string) {
  const map: Record<string, string> = {
    Critical:      'bg-red-500/20 text-red-400 border-red-500/30',
    High:          'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Moderate:      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low:           'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Informational: 'bg-muted text-muted-foreground border-border',
  };
  return map[s] ?? 'bg-muted text-muted-foreground border-border';
}

function confidenceDot(c: string) {
  if (c === 'High')     return 'bg-emerald-400';
  if (c === 'Moderate') return 'bg-yellow-400';
  return 'bg-muted-foreground';
}

function urgencyBadge(u: string) {
  const map: Record<string, string> = {
    Immediate: 'bg-red-500/20 text-red-400 border-red-500/30',
    '30 Days':  'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '90 Days':  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Ongoing:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return map[u] ?? 'bg-muted text-muted-foreground border-border';
}

function integrityBadge(a: string) {
  if (a === 'Verified')           return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (a === 'Gap Detected')       return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function loadSampleData() {
  const stored: any[]  = JSON.parse(localStorage.getItem('nexum_facility_logs')    ?? '[]');
  const submitted: any[] = JSON.parse(localStorage.getItem('nexum_submitted_logs') ?? '[]');
  // Merge submitted logs with stored logs, deduplicate by SK
  const seen = new Set(stored.map((l: any) => l.SK));
  const merged = [...stored, ...submitted.filter((l: any) => !seen.has(l.SK))];
  return {
    logs:       merged,
    workOrders: JSON.parse(localStorage.getItem('nexum_work_orders')       ?? '[]'),
    equipment:  JSON.parse(localStorage.getItem('nexum_equipment_library') ?? '[]'),
    violations: JSON.parse(localStorage.getItem('nexum_violation_events')  ?? '[]'),
  };
}

// ── Score Gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct  = Math.min(100, Math.max(0, score));
  const dash = 2 * Math.PI * 44;
  const fill = dash * (pct / 100);
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
        <circle
          cx="50" cy="50" r="44" fill="none" strokeWidth="8"
          strokeDasharray={`${fill} ${dash}`}
          strokeLinecap="round"
          className={pct >= 80 ? 'text-emerald-400 stroke-current' : pct >= 60 ? 'text-yellow-400 stroke-current' : pct >= 40 ? 'text-orange-400 stroke-current' : 'text-red-400 stroke-current'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

// ── Sub-score bar ─────────────────────────────────────────────────────────────

function SubScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-yellow-400' : score >= 40 ? 'bg-orange-400' : 'bg-red-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Correlated Finding card ───────────────────────────────────────────────────

function FindingCard({ f }: { f: CorrelatedFinding }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border border-border bg-card/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge className={`text-[10px] border ${severityBadge(f.severity)}`}>{f.severity}</Badge>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot(f.confidence)}`} />
                {f.confidence} confidence
              </span>
              {f.timeframe && <span className="text-[10px] text-muted-foreground">{f.timeframe}</span>}
            </div>
            <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.narrative}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 w-6 h-6" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {open && (
          <div className="space-y-3 pt-1 border-t border-border">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Root Cause Hypothesis</p>
              <p className="text-xs text-foreground">{f.rootCauseHypothesis}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</p>
              <p className="text-xs text-foreground">{f.recommendedAction}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operational Impact</p>
              <p className="text-xs text-foreground">{f.operationalImpact}</p>
            </div>
            {f.energyImpact && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Energy Impact</p>
                <p className="text-xs text-foreground">{f.energyImpact}</p>
              </div>
            )}
            {f.evidencePoints.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evidence</p>
                <ul className="space-y-0.5">
                  {f.evidencePoints.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {f.affectedEquipment.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {f.affectedEquipment.map(eq => (
                  <Badge key={eq} variant="outline" className="text-[10px]">{eq}</Badge>
                ))}
              </div>
            )}
            {f.affectedDomains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {f.affectedDomains.map(d => (
                  <Badge key={d} className="text-[10px] bg-primary/10 text-primary border-primary/20">{d}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Reliability card ──────────────────────────────────────────────────────────

function ReliabilityCard({ r }: { r: ReliabilityFinding }) {
  const rateIcon = r.degradationRate === 'Stable' ? Minus :
                   r.degradationRate === 'Gradual' ? TrendingDown :
                   r.degradationRate === 'Accelerating' ? TrendingDown : AlertTriangle;
  const rateColor = r.degradationRate === 'Stable'       ? 'text-emerald-400' :
                    r.degradationRate === 'Gradual'       ? 'text-yellow-400' :
                    r.degradationRate === 'Accelerating'  ? 'text-orange-400' : 'text-red-400';

  const DegIcon = rateIcon;
  return (
    <Card className="border border-border bg-card/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">{r.equipmentName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <DegIcon className={`w-3.5 h-3.5 ${rateColor}`} />
              <span className={`text-xs font-medium ${rateColor}`}>{r.degradationRate}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg border text-center ${scoreBg(r.reliabilityScore)}`}>
            <div className={`text-lg font-bold ${scoreColor(r.reliabilityScore)}`}>{r.reliabilityScore}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Score</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/20 rounded-lg p-2">
            <div className="text-sm font-bold text-foreground">{r.alarmFrequency}</div>
            <div className="text-[9px] text-muted-foreground">Alarms</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2">
            <div className="text-sm font-bold text-foreground">{r.overrideCount}</div>
            <div className="text-[9px] text-muted-foreground">Overrides</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2">
            <div className={`text-sm font-bold ${r.pmAlignmentStatus === 'Current' ? 'text-emerald-400' : 'text-orange-400'}`}>
              {r.pmAlignmentStatus === 'Current' ? '✓' : '!'}
            </div>
            <div className="text-[9px] text-muted-foreground">PM Status</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {r.repeatFaultPattern && <Badge className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">Repeat Faults</Badge>}
          {r.runtimeImbalanceFlag && <Badge className="text-[10px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Runtime Imbalance</Badge>}
          <Badge className="text-[10px] bg-muted/30 text-muted-foreground border-border">{r.pmAlignmentStatus}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">{r.narrative}</p>
        <div className="pt-1 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-xs text-foreground">{r.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Compliance Risk card ──────────────────────────────────────────────────────

function ComplianceCard({ r }: { r: ComplianceRisk }) {
  const dayLabel = r.daysUntilImpact === null ? '—' :
                   r.daysUntilImpact < 0      ? `${Math.abs(r.daysUntilImpact)}d overdue` :
                   `${r.daysUntilImpact}d`;
  return (
    <Card className={`border bg-card/50 ${r.severity === 'Critical' || r.severity === 'High' ? 'border-red-500/30' : r.severity === 'Moderate' ? 'border-yellow-500/30' : 'border-border'}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className={`text-[10px] border ${severityBadge(r.severity)}`}>{r.severity}</Badge>
              {r.regulatoryExposure && <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">Regulatory</Badge>}
              <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
            </div>
            {r.equipmentName && <p className="text-xs font-semibold text-foreground">{r.equipmentName}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
          </div>
          {r.daysUntilImpact !== null && (
            <div className={`text-center px-2 py-1 rounded border text-xs font-bold shrink-0 ${r.daysUntilImpact < 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : r.daysUntilImpact < 30 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-muted/20 text-muted-foreground border-border'}`}>
              {dayLabel}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Predictive Insight card ───────────────────────────────────────────────────

function InsightCard({ ins }: { ins: PredictiveInsight }) {
  return (
    <Card className="border border-border bg-card/50">
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className={`text-[10px] border ${urgencyBadge(ins.urgency)}`}>{ins.urgency}</Badge>
              <Badge variant="outline" className="text-[10px]">{ins.category}</Badge>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot(ins.confidence)}`} />
                {ins.confidence}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-foreground">{ins.title}</h4>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{ins.narrative}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Est. Impact</p>
            <p className="text-xs font-semibold text-foreground">{ins.estimatedImpact}</p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Action</p>
            <p className="text-xs font-semibold text-foreground">{ins.recommendedAction}</p>
          </div>
        </div>
        {ins.affectedEquipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ins.affectedEquipment.map(eq => (
              <Badge key={eq} variant="outline" className="text-[10px]">{eq}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Governance row ────────────────────────────────────────────────────────────

function GovernanceRow({ entry }: { entry: GovernanceEntry }) {
  const eventColor: Record<string, string> = {
    'Alarm':            'text-red-400',
    'Override':         'text-orange-400',
    'Violation':        'text-yellow-400',
    'Anomaly Detected': 'text-purple-400',
    'PM Event':         'text-blue-400',
    'Inspection':       'text-cyan-400',
    'Work Order':       'text-emerald-400',
    'Log Entry':        'text-muted-foreground',
  };
  return (
    <div className="grid grid-cols-[7rem_1fr_auto] gap-3 py-2 border-b border-border/50 last:border-0 text-xs items-start">
      <div className="text-muted-foreground font-mono text-[10px] pt-0.5">
        {(() => { const d = new Date(entry.timestamp); return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); })()}
      </div>
      <div>
        <span className={`font-semibold ${eventColor[entry.eventType] ?? 'text-muted-foreground'}`}>{entry.eventType}</span>
        {' · '}
        <span className="text-foreground">{entry.description}</span>
        {entry.actor !== 'System' && (
          <span className="text-muted-foreground"> — {entry.actor}</span>
        )}
      </div>
      <Badge className={`text-[9px] shrink-0 border ${integrityBadge(entry.auditIntegrity)}`}>
        {entry.auditIntegrity === 'Verified' ? '✓' : entry.auditIntegrity === 'Gap Detected' ? '⚠' : '✗'}
      </Badge>
    </div>
  );
}

// ── Downtime types ────────────────────────────────────────────────────────────

interface DowntimeTouch {
  id: string;
  timestamp: string;
  action: string;
  tech: string;
  outcome: 'cleared' | 'no_change' | 'partial' | 'escalated';
}

interface DowntimeEntry {
  id: string;
  equipmentName: string;
  location?: string;
  startedAt: string;
  resolvedAt?: string;
  severity: 'critical' | 'major' | 'minor';
  causeCategory: string;
  causeDetail: string;
  touches: DowntimeTouch[];
  resolution?: string;
  status: 'active' | 'resolved';
  loggedBy: string;
}

const CAUSE_CATEGORIES = [
  'Mechanical Failure',
  'Electrical Fault',
  'Controls / Automation',
  'Operator Error',
  'Maintenance Gap',
  'External / Utility',
  'Wear & Tear',
  'Unknown',
];

const TOUCH_OUTCOMES: { value: DowntimeTouch['outcome']; label: string }[] = [
  { value: 'cleared', label: 'Cleared — issue resolved' },
  { value: 'partial', label: 'Partial — improvement, not resolved' },
  { value: 'no_change', label: 'No change' },
  { value: 'escalated', label: 'Escalated' },
];

const CAUSE_COLORS: Record<string, string> = {
  'Mechanical Failure': 'text-red-400 bg-red-500/10 border-red-500/30',
  'Electrical Fault': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Controls / Automation': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'Operator Error': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'Maintenance Gap': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'External / Utility': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Wear & Tear': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'Unknown': 'text-muted-foreground bg-muted/20 border-border',
};

function downtimeDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DowntimeCard({ entry, onAddTouch, onResolve }: {
  entry: DowntimeEntry;
  onAddTouch: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const duration = downtimeDuration(entry.startedAt, entry.resolvedAt);

  return (
    <Card className={`border ${entry.status === 'active' ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card/50'}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {entry.status === 'active' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-400">Active</span>
                </div>
              )}
              <Badge variant="outline" className={`text-[10px] border ${entry.severity === 'critical' ? 'text-red-400 border-red-400/40' : entry.severity === 'major' ? 'text-orange-400 border-orange-400/40' : 'text-yellow-400 border-yellow-400/40'} capitalize`}>
                {entry.severity}
              </Badge>
              <Badge variant="outline" className={`text-[10px] border ${CAUSE_COLORS[entry.causeCategory] || ''}`}>
                {entry.causeCategory}
              </Badge>
            </div>
            <h4 className="text-sm font-semibold">{entry.equipmentName}</h4>
            {entry.location && <p className="text-xs text-muted-foreground">{entry.location}</p>}
            <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.causeDetail}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-sm font-bold text-foreground justify-end">
              <Timer className="w-3.5 h-3.5 text-muted-foreground" />
              {duration}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {(() => { const d = new Date(entry.startedAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}
              {' '}
              {(() => { const d = new Date(entry.startedAt); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); })()}
            </p>
          </div>
        </div>

        {/* Touch count summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Wrench className="w-3.5 h-3.5" />
            {entry.touches.length} touch{entry.touches.length !== 1 ? 'es' : ''} logged
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <span className="text-[10px]">By {entry.loggedBy}</span>
        </div>

        {/* Touch timeline */}
        {expanded && entry.touches.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            {entry.touches.map((t, i) => (
              <div key={t.id} className="grid grid-cols-[1.5rem_1fr] gap-2 text-xs">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[9px] font-bold text-primary">{i + 1}</div>
                  {i < entry.touches.length - 1 && <div className="w-px flex-1 bg-border/50 my-1" />}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-foreground">{t.action}</span>
                    <Badge variant="outline" className={`text-[9px] ml-auto ${t.outcome === 'cleared' ? 'text-green-400 border-green-400/40' : t.outcome === 'partial' ? 'text-yellow-400 border-yellow-400/40' : t.outcome === 'escalated' ? 'text-red-400 border-red-400/40' : 'text-muted-foreground border-border'}`}>
                      {TOUCH_OUTCOMES.find(o => o.value === t.outcome)?.label.split(' — ')[0]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t.tech} · {(() => { const d = new Date(t.timestamp); return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); })()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resolution */}
        {entry.status === 'resolved' && entry.resolution && (
          <div className="pt-2 border-t border-border/50 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-400">{entry.resolution}</p>
          </div>
        )}

        {/* Actions */}
        {entry.status === 'active' && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => onAddTouch(entry.id)}>
              <Wrench className="w-3 h-3 mr-1" />Add Touch
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 flex-1 text-green-400 border-green-400/40 hover:bg-green-500/10" onClick={() => onResolve(entry.id)}>
              <CheckCircle2 className="w-3 h-3 mr-1" />Mark Resolved
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Piping Recommender ────────────────────────────────────────────────────────

interface PipingInputs {
  systemType: 'hot_water' | 'chilled_water' | 'steam' | 'condenser_water';
  btuLoad: string;
  supplyTemp: string;
  returnTemp: string;
  headPressure: string;
  heatingSurface: string;
  pipeMatl: 'copper' | 'steel' | 'pex';
}

interface PipingResult {
  gpM: number;
  deltaT: number;
  recommendedPipeSize: string;
  maxRunLength: number;
  assetCapacity: number | null;
  assetAdequate: boolean | null;
  frictionLoss: number;
  headFt: number;
  velocity: number;
  warnings: string[];
}

function calcPiping(inputs: PipingInputs): PipingResult | null {
  const btu = parseFloat(inputs.btuLoad);
  const supply = parseFloat(inputs.supplyTemp);
  const ret = parseFloat(inputs.returnTemp);
  const psi = parseFloat(inputs.headPressure);
  const hs = parseFloat(inputs.heatingSurface);

  if (!btu || !supply || !ret || !psi || isNaN(btu) || isNaN(supply) || isNaN(ret) || isNaN(psi)) return null;

  const deltaT = Math.abs(supply - ret);
  if (deltaT < 1) return null;

  // GPM = BTU/hr ÷ (500 × ΔT)
  const gpm = btu / (500 * deltaT);

  // Pipe sizing table: [size label, max GPM at ≤4fps, friction loss ft/100ft at that flow]
  const PIPES: [string, number, number][] = [
    ['3/4 inch',   4,   2.8],
    ['1 inch',     8,   2.2],
    ['1-1/4 inch', 12,  1.8],
    ['1-1/2 inch', 18,  1.5],
    ['2 inch',     32,  1.2],
    ['2-1/2 inch', 50,  1.0],
    ['3 inch',     80,  0.85],
    ['4 inch',     160, 0.65],
    ['6 inch',     400, 0.45],
  ];

  const frictionMult = inputs.pipeMatl === 'copper' ? 0.85 : inputs.pipeMatl === 'pex' ? 1.10 : 1.0;

  const selected = PIPES.find(([, maxGpm]) => maxGpm >= gpm) ?? PIPES[PIPES.length - 1];
  const [sizeName, maxGpmSelected, baseFriction] = selected;
  const frictionLoss = parseFloat((baseFriction * frictionMult).toFixed(2));

  const headFt = parseFloat((psi * 2.31).toFixed(1));

  const maxRunLength = Math.round((headFt / frictionLoss) * 100 / 2);

  const velocity = parseFloat(((gpm / maxGpmSelected) * 4).toFixed(2));

  let assetCapacity: number | null = null;
  let assetAdequate: boolean | null = null;
  if (!isNaN(hs) && hs > 0) {
    const btuPerSqFt = inputs.systemType === 'steam' ? 140 : 10;
    assetCapacity = Math.round(hs * btuPerSqFt);
    assetAdequate = assetCapacity >= btu;
  }

  const warnings: string[] = [];
  if (gpm > 400) warnings.push('Flow rate exceeds 400 GPM — consider parallel piping trains or a larger pipe schedule.');
  if (velocity > 4) warnings.push('Estimated velocity exceeds 4 fps — risk of erosion and noise. Upsize pipe or split the circuit.');
  if (maxRunLength < 50) warnings.push('Head pressure limits run length to under 50 ft — consider increasing pump head or reducing circuit length.');
  if (assetAdequate === false) warnings.push('Heating surface appears undersized for the stated BTU load — verify asset nameplate capacity.');
  if (deltaT < 10) warnings.push('Low ΔT (under 10°F) increases required flow rate significantly — review system design temperatures.');

  return { gpM: parseFloat(gpm.toFixed(1)), deltaT, recommendedPipeSize: sizeName, maxRunLength, assetCapacity, assetAdequate, frictionLoss, headFt, velocity, warnings };
}

const PIPING_DEFAULTS: PipingInputs = {
  systemType: 'hot_water',
  btuLoad: '',
  supplyTemp: '180',
  returnTemp: '160',
  headPressure: '15',
  heatingSurface: '',
  pipeMatl: 'steel',
};

function PipingRecommenderTab() {
  const [inputs, setInputs] = useState<PipingInputs>(PIPING_DEFAULTS);
  const [result, setResult] = useState<PipingResult | null>(null);

  function setField<K extends keyof PipingInputs>(key: K, value: PipingInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  function handleCalculate() {
    setResult(calcPiping(inputs));
  }

  const velocityBadge = result
    ? result.velocity <= 2.5
      ? 'bg-emerald-500/20 text-emerald-400'
      : result.velocity <= 4
      ? 'bg-yellow-500/20 text-yellow-400'
      : 'bg-red-500/20 text-red-400'
    : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-sm font-semibold">Hydronic / Steam Piping Recommender</h2>
          <p className="text-xs text-muted-foreground">Pipe sizing, flow rate, and run length calculator for hydronic and steam distribution systems.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Inputs ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">System Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* System Type */}
            <div className="space-y-1">
              <Label className="text-xs">System Type</Label>
              <Select value={inputs.systemType} onValueChange={(v) => setField('systemType', v as PipingInputs['systemType'])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot_water">Hot Water</SelectItem>
                  <SelectItem value="chilled_water">Chilled Water</SelectItem>
                  <SelectItem value="steam">Steam</SelectItem>
                  <SelectItem value="condenser_water">Condenser Water</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* BTU Load */}
            <div className="space-y-1">
              <Label className="text-xs">BTU/hr Load <span className="text-muted-foreground">(required)</span></Label>
              <Input
                className="h-8 text-xs"
                type="number"
                placeholder="e.g. 500000"
                value={inputs.btuLoad}
                onChange={e => setField('btuLoad', e.target.value)}
              />
            </div>

            {/* Temps */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Supply Temp °F</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  value={inputs.supplyTemp}
                  onChange={e => setField('supplyTemp', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Return Temp °F</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  value={inputs.returnTemp}
                  onChange={e => setField('returnTemp', e.target.value)}
                />
              </div>
            </div>

            {/* Head Pressure */}
            <div className="space-y-1">
              <Label className="text-xs">Available Head Pressure (PSI)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={inputs.headPressure}
                onChange={e => setField('headPressure', e.target.value)}
              />
            </div>

            {/* Heating Surface */}
            <div className="space-y-1">
              <Label className="text-xs">Heating Surface sq ft <span className="text-muted-foreground">(optional — asset adequacy check)</span></Label>
              <Input
                className="h-8 text-xs"
                type="number"
                placeholder="Boiler / HX heating surface"
                value={inputs.heatingSurface}
                onChange={e => setField('heatingSurface', e.target.value)}
              />
            </div>

            {/* Pipe Material */}
            <div className="space-y-1">
              <Label className="text-xs">Pipe Material</Label>
              <Select value={inputs.pipeMatl} onValueChange={(v) => setField('pipeMatl', v as PipingInputs['pipeMatl'])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="steel">Steel</SelectItem>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="pex">PEX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleCalculate}>
              <Wrench className="w-4 h-4 mr-2" />Calculate
            </Button>

            {/* Engineering note */}
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
              GPM = BTU/hr ÷ (500 × ΔT). Pipe sized for ≤4 fps velocity. Max run = head (ft) ÷ friction loss (ft/100ft) × 100 ÷ 2 (supply + return). Steel pipe defaults. All values are estimates — verify with licensed mechanical engineer.
            </p>
          </CardContent>
        </Card>

        {/* ── Results ── */}
        <div className="sticky top-4">
          {result ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sizing Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Required Flow Rate</p>
                    <p className="font-semibold text-sm">{result.gpM.toLocaleString()} GPM</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Temperature Differential</p>
                    <p className="font-semibold text-sm">{result.deltaT}°F</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Recommended Pipe Size</p>
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{result.recommendedPipeSize}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Est. Velocity</p>
                    <Badge className={`text-xs ${velocityBadge}`}>{result.velocity} fps</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Friction Loss</p>
                    <p className="font-semibold text-sm">{result.frictionLoss} ft/100 ft</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available Head</p>
                    <p className="font-semibold text-sm">{result.headFt} ft</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Single Run Length</p>
                    <p className="font-semibold text-sm">{result.maxRunLength.toLocaleString()} ft</p>
                    <p className="text-[10px] text-muted-foreground">each leg</p>
                  </div>
                  {result.assetAdequate !== null && (
                    <>
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-1">Asset Adequacy</p>
                        {result.assetAdequate ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />Adequate
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />Undersized
                          </div>
                        )}
                      </div>
                      {result.assetCapacity !== null && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Estimated Asset Capacity</p>
                          <p className="font-semibold text-sm">{result.assetCapacity.toLocaleString()} BTU/hr</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {result.warnings.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-yellow-300">{w}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Enter system parameters and click Calculate to see pipe sizing recommendations.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function OIGContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const facilityId = (user as any)?.facilityId || (user as any)?.['custom:facilityId'] || 'facility-001';
  const [result, setResult]     = useState<OIGAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [govLimit, setGovLimit] = useState(50);
  const [expandedBlind, setExpandedBlind] = useState(false);
  const [wiCriticalPath, setWiCriticalPath] = useState<CriticalPathData | null>(null);

  // Downtime analysis state
  const [downtimeAnalysis, setDowntimeAnalysis] = useState<DowntimeAnalysisResult | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<TimelineBucket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DowntimeEvent | null>(null);
  const [downtimeView, setDowntimeView] = useState<'analysis' | 'log'>('analysis');

  const runDowntimeAnalysis = useCallback(() => {
    const data = loadSampleData();
    const manualEntries = JSON.parse(localStorage.getItem('nexum_downtime_log') || '[]');
    const r = analyzeDowntime({ facilityId, ...data, manualEntries });
    setDowntimeAnalysis(r);
  }, [facilityId]);

  // Downtime log state
  const [downtimeEntries, setDowntimeEntries] = useState<DowntimeEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_downtime_log') || '[]'); } catch { return []; }
  });
  const [downtimeFormOpen, setDowntimeFormOpen] = useState(false);
  const [touchFormOpen, setTouchFormOpen] = useState(false);
  const [resolveFormOpen, setResolveFormOpen] = useState(false);
  const [activeTouchEntryId, setActiveTouchEntryId] = useState<string | null>(null);
  const [downtimeForm, setDowntimeForm] = useState({ equipmentName: '', location: '', severity: 'major' as const, causeCategory: '', causeDetail: '', startedAt: new Date().toISOString().slice(0, 16), loggedBy: user?.name || user?.email || '' });
  const [touchForm, setTouchForm] = useState({ action: '', tech: '', outcome: 'no_change' as DowntimeTouch['outcome'] });
  const [resolveNote, setResolveNote] = useState('');
  const [bmsCorrelation, setBmsCorrelation] = useState<CorrelationSummary | null>(() => DataCorrelationEngine.getLastResults());
  const [topSysObs, setTopSysObs] = useState<SystemObservation[]>(() =>
    ObservationEngine.getAll().filter(o => !o.acknowledged).slice(0, 5)
  );

  // Keep BMS cross-source correlation + system observations fresh
  useEffect(() => {
    const refresh = () => setBmsCorrelation(DataCorrelationEngine.getLastResults());
    window.addEventListener('nexum_correlation_update', refresh);
    return () => window.removeEventListener('nexum_correlation_update', refresh);
  }, []);

  useEffect(() => {
    const refresh = () => setTopSysObs(ObservationEngine.getAll().filter(o => !o.acknowledged).slice(0, 5));
    window.addEventListener('nexum_observation_update', refresh);
    return () => window.removeEventListener('nexum_observation_update', refresh);
  }, []);

  const saveDowntime = (entries: DowntimeEntry[]) => {
    setDowntimeEntries(entries);
    try { localStorage.setItem('nexum_downtime_log', JSON.stringify(entries)); } catch {}
  };

  const handleLogDowntime = () => {
    if (!downtimeForm.equipmentName || !downtimeForm.causeCategory) return;
    const entry: DowntimeEntry = { id: `dt-${Date.now()}`, ...downtimeForm, touches: [], status: 'active' };
    saveDowntime([entry, ...downtimeEntries]);
    setDowntimeFormOpen(false);
    setDowntimeForm({ equipmentName: '', location: '', severity: 'major', causeCategory: '', causeDetail: '', startedAt: new Date().toISOString().slice(0, 16), loggedBy: user?.name || user?.email || '' });
  };

  const handleAddTouch = (entryId: string) => { setActiveTouchEntryId(entryId); setTouchForm({ action: '', tech: '', outcome: 'no_change' }); setTouchFormOpen(true); };

  const handleSaveTouch = () => {
    if (!touchForm.action || !activeTouchEntryId) return;
    const touch: DowntimeTouch = { id: `t-${Date.now()}`, timestamp: new Date().toISOString(), ...touchForm };
    saveDowntime(downtimeEntries.map(e => e.id === activeTouchEntryId ? { ...e, touches: [...e.touches, touch] } : e));
    setTouchFormOpen(false);
  };

  const handleResolve = (entryId: string) => { setActiveTouchEntryId(entryId); setResolveNote(''); setResolveFormOpen(true); };

  const handleSaveResolve = () => {
    if (!activeTouchEntryId) return;
    saveDowntime(downtimeEntries.map(e => e.id === activeTouchEntryId ? { ...e, status: 'resolved', resolvedAt: new Date().toISOString(), resolution: resolveNote } : e));
    setResolveFormOpen(false);
  };

  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    const data = loadSampleData();
    setTimeout(() => {
      const r = runOIGAnalysis({ facilityId, ...data });
      setResult(r);
      setAnalyzing(false);
    }, 600);
  }, [facilityId]);

  useEffect(() => {
    runAnalysis();
    runDowntimeAnalysis();
    window.addEventListener('facility-log-submitted', runAnalysis);
    window.addEventListener('facility-log-submitted', runDowntimeAnalysis);
    // Re-analyze when the 3-hour BMS / CMMS / BAS poll completes
    window.addEventListener('nexum_bms_poll_update', runAnalysis);
    window.addEventListener('nexum_bms_poll_update', runDowntimeAnalysis);
    return () => {
      window.removeEventListener('facility-log-submitted', runAnalysis);
      window.removeEventListener('facility-log-submitted', runDowntimeAnalysis);
      window.removeEventListener('nexum_bms_poll_update', runAnalysis);
      window.removeEventListener('nexum_bms_poll_update', runDowntimeAnalysis);
    };
  }, [runAnalysis, runDowntimeAnalysis]);

  useEffect(() => {
    getCriticalPath()
      .then(cp => setWiCriticalPath(cp as CriticalPathData))
      .catch(() => {});
  }, []);

  const critical = result
    ? result.correlatedFindings.filter(f => f.severity === 'Critical' || f.severity === 'High').length
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Operational Intelligence &amp; Governance</h1>
            <p className="text-xs text-muted-foreground">
              Sequence-aware · Correlated · Defensible
              {result && <span className="ml-2 opacity-60">· Last run {(() => { const d = new Date(result.analysisTimestamp); return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString(); })()}</span>}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runAnalysis} disabled={analyzing} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </Button>
      </div>

      {/* Work Integrity Section */}
      {wiCriticalPath && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border">
              <CardContent className="p-3 flex items-center gap-2">
                <Target className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <div className="text-xl font-bold text-primary">{wiCriticalPath.tasks.length}</div>
                  <div className="text-[10px] text-muted-foreground">Open Tasks</div>
                </div>
              </CardContent>
            </Card>
            <Card className={wiCriticalPath.overdueCount > 0 ? 'border-red-500/30' : 'border-border'}>
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className={`w-6 h-6 shrink-0 ${wiCriticalPath.overdueCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
                <div>
                  <div className={`text-xl font-bold ${wiCriticalPath.overdueCount > 0 ? 'text-red-400' : ''}`}>{wiCriticalPath.overdueCount}</div>
                  <div className="text-[10px] text-muted-foreground">Overdue</div>
                </div>
              </CardContent>
            </Card>
            <Card className={wiCriticalPath.atRiskCount > 0 ? 'border-amber-500/30' : 'border-border'}>
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className={`w-6 h-6 shrink-0 ${wiCriticalPath.atRiskCount > 0 ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <div>
                  <div className={`text-xl font-bold ${wiCriticalPath.atRiskCount > 0 ? 'text-amber-400' : ''}`}>{wiCriticalPath.atRiskCount}</div>
                  <div className="text-[10px] text-muted-foreground">At Risk</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/work-integrity')}>
              <CardContent className="p-3 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-primary">
                    {wiCriticalPath.earliestCompletion
                      ? (() => { const d = new Date(wiCriticalPath.earliestCompletion!); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()
                      : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Optimistic Completion</div>
                </div>
              </CardContent>
            </Card>
          </div>
          {wiCriticalPath.atRisk.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-amber-400">At Risk: </span>
                <span className="text-muted-foreground">{wiCriticalPath.atRisk.map(t => t.title).join(' · ')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {analyzing && !result && (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Running correlation analysis…</span>
        </div>
      )}

      {result && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/30">
            <TabsTrigger value="overview" className="text-xs">Intelligence Overview</TabsTrigger>
            <TabsTrigger value="correlation" className="text-xs">
              Correlation Engine
              {critical > 0 && <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{critical}</span>}
            </TabsTrigger>
            <TabsTrigger value="reliability" className="text-xs">Reliability</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">Compliance &amp; Governance</TabsTrigger>
            <TabsTrigger value="predictive" className="text-xs">Predictive Intelligence</TabsTrigger>
            <TabsTrigger value="downtime" className="text-xs">
              Downtime Log
              {downtimeEntries.filter(e => e.status === 'active').length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {downtimeEntries.filter(e => e.status === 'active').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="piping" className="text-xs">Piping Recommender</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Intelligence Overview ─────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            {/* System Observations strip */}
            {topSysObs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                    System-Learned Observations
                  </h3>
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs h-7 px-2 text-cyan-400 hover:text-cyan-300"
                    onClick={() => navigate('/observations?tab=system-insights')}
                  >
                    <Eye className="w-3 h-3 mr-1" /> View All in Journal
                  </Button>
                </div>
                {topSysObs.map(obs => {
                  const flagColor = obs.flag === 'critical' ? 'border-red-500/30 bg-red-500/5'
                    : obs.flag === 'warning' ? 'border-orange-500/30 bg-orange-500/5'
                    : obs.flag === 'pattern' ? 'border-cyan-500/30 bg-cyan-500/5'
                    : 'border-yellow-500/30 bg-yellow-500/5';
                  const badgeColor = obs.flag === 'critical' ? 'bg-red-500/20 text-red-400'
                    : obs.flag === 'warning' ? 'bg-orange-500/20 text-orange-400'
                    : obs.flag === 'pattern' ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-yellow-500/20 text-yellow-400';
                  return (
                    <div key={obs.id} className={`border rounded-lg p-3 flex items-start justify-between gap-2 ${flagColor}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-2">{obs.interpretation}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{obs.equipmentId} · {(() => { const d = new Date(obs.detectedAt); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })()}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`${badgeColor} text-[10px]`}>{obs.flag}</Badge>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => navigate(`/observations?tab=system-insights&id=${obs.id}`)}>
                          <Eye className="w-3 h-3 mr-1" /> Journal
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overall gauge */}
              <Card className={`border-2 ${scoreBg(result.overallHealthScore)} col-span-1 sm:col-span-2 lg:col-span-1`}>
                <CardContent className="p-5 text-center space-y-3">
                  <ScoreGauge score={result.overallHealthScore} label="Overall Health" />
                  <div>
                    <Badge className={`text-xs ${scoreBg(result.overallHealthScore)} border`}>
                      {scoreLabel(result.overallHealthScore)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Composite of reliability, compliance, efficiency &amp; governance</p>
                </CardContent>
              </Card>

              {/* Sub-scores */}
              <Card className="border border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance Dimensions</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <SubScoreBar label="Reliability" score={result.reliabilityScore} icon={Activity} />
                  <SubScoreBar label="Compliance" score={result.complianceScore} icon={ShieldCheck} />
                  <SubScoreBar label="Efficiency" score={result.efficiencyScore} icon={Zap} />
                  <SubScoreBar label="Governance" score={result.governanceScore} icon={ClipboardList} />
                </CardContent>
              </Card>

              {/* Summary cards */}
              <Card className="border border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Findings', value: result.correlatedFindings.length, icon: Eye, color: 'text-primary' },
                    { label: 'Critical/High', value: critical, icon: AlertTriangle, color: critical > 0 ? 'text-red-400' : 'text-muted-foreground' },
                    { label: 'Reliability Assets', value: result.reliabilityFindings.length, icon: Activity, color: 'text-blue-400' },
                    { label: 'Compliance Risks', value: result.complianceRisks.length, icon: ShieldCheck, color: result.complianceRisks.filter(r => r.severity === 'Critical' || r.severity === 'High').length > 0 ? 'text-orange-400' : 'text-muted-foreground' },
                    { label: 'Predictions', value: result.predictiveInsights.length, icon: TrendingUp, color: 'text-emerald-400' },
                    { label: 'Audit Entries', value: result.governanceLog.length, icon: Clock, color: 'text-cyan-400' },
                  ].map(({ label, value, icon: Ic, color }) => (
                    <div key={label} className="bg-muted/20 rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Ic className={`w-3.5 h-3.5 ${color}`} />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                      <div className={`text-lg font-bold ${color}`}>{value}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Executive Summary */}
            <Card className="border border-border">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{result.executiveSummary}</p>
              </CardContent>
            </Card>

            {/* Blind Spots + NoD */}
            {(result.operationalBlindSpots.length > 0 || result.normalizationOfDeviance.length > 0 || result.dataQualityNotes.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.operationalBlindSpots.length > 0 && (
                  <Card className="border border-yellow-500/20 bg-yellow-500/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Operational Blind Spots
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      {(expandedBlind ? result.operationalBlindSpots : result.operationalBlindSpots.slice(0, 3)).map((b, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400/60 shrink-0" />{b}
                        </p>
                      ))}
                      {result.operationalBlindSpots.length > 3 && (
                        <button onClick={() => setExpandedBlind(o => !o)} className="text-[10px] text-primary hover:underline">
                          {expandedBlind ? 'Show less' : `+${result.operationalBlindSpots.length - 3} more`}
                        </button>
                      )}
                    </CardContent>
                  </Card>
                )}
                {result.normalizationOfDeviance.length > 0 && (
                  <Card className="border border-orange-500/20 bg-orange-500/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Normalization of Deviance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      {result.normalizationOfDeviance.map((n, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-orange-400/60 shrink-0" />{n}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {result.dataQualityNotes.length > 0 && (
                  <Card className="border border-border bg-muted/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Data Quality Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      {result.dataQualityNotes.map((n, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />{n}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: Correlation Engine ─────────────────────────────────── */}
          <TabsContent value="correlation" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Correlated Findings</h2>
                <p className="text-xs text-muted-foreground">Cross-system pattern analysis — time, sequence, and operational state</p>
              </div>
              <Badge variant="outline" className="text-xs">{result.correlatedFindings.length} findings</Badge>
            </div>

            {result.correlatedFindings.length === 0 ? (
              <Card className="border border-border">
                <CardContent className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No Correlated Patterns Detected</p>
                  <p className="text-xs text-muted-foreground">No cross-system anomalies found. Continue logging to improve analysis depth.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {['Critical', 'High', 'Moderate', 'Low', 'Informational'].map(sev => {
                  const group = result.correlatedFindings.filter(f => f.severity === sev);
                  if (group.length === 0) return null;
                  return (
                    <div key={sev} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sev === 'Critical' ? 'bg-red-400' : sev === 'High' ? 'bg-orange-400' : sev === 'Moderate' ? 'bg-yellow-400' : sev === 'Low' ? 'bg-blue-400' : 'bg-muted-foreground'}`} />
                        {sev} · {group.length}
                      </h3>
                      {group.map(f => <FindingCard key={f.id} f={f} />)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── BMS Cross-Source Correlation ──────────────────────────── */}
            {bmsCorrelation && bmsCorrelation.totalInsights > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      BMS ↔ Manual Log Cross-Source Analysis
                    </h2>
                    <p className="text-xs text-muted-foreground">Divergence, blind spots, and leading indicators between sensor data and field logs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bmsCorrelation.byCriticality.critical > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{bmsCorrelation.byCriticality.critical} critical</Badge>
                    )}
                    {bmsCorrelation.byCriticality.high > 0 && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">{bmsCorrelation.byCriticality.high} high</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{bmsCorrelation.totalInsights} total</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {bmsCorrelation.insights.slice(0, 20).map(ins => {
                    const sevColor = ins.severity === 'critical' ? 'border-red-500/30 bg-red-500/5'
                      : ins.severity === 'high'     ? 'border-orange-500/30 bg-orange-500/5'
                      : ins.severity === 'medium'   ? 'border-yellow-500/30 bg-yellow-500/5'
                      : ins.severity === 'low'      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-border bg-card';
                    const badge = ins.severity === 'critical' ? 'bg-red-500/20 text-red-400'
                      : ins.severity === 'high'   ? 'bg-orange-500/20 text-orange-400'
                      : ins.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                      : ins.severity === 'low'    ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-muted text-muted-foreground';
                    const typeLabel: Record<string, string> = {
                      DIVERGENCE: 'Divergence', ALARM_MATCH: 'Alarm Match',
                      BLIND_SPOT: 'Blind Spot', LEADING_INDICATOR: 'Leading Indicator', LAGGING_RESPONSE: 'Lagging Response',
                    };
                    return (
                      <Card key={ins.id} className={`border ${sevColor}`}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{ins.title}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge className={`${badge} text-xs`}>{ins.severity}</Badge>
                              <Badge variant="outline" className="text-xs">{typeLabel[ins.type] || ins.type}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{ins.detail}</p>
                          {(ins.bmsValue !== undefined || ins.manualValue !== undefined) && (
                            <div className="flex items-center gap-4 text-xs pt-1">
                              {ins.bmsValue !== undefined && <span className="text-cyan-400">BMS: <strong>{ins.bmsValue}</strong></span>}
                              {ins.manualValue !== undefined && <span className="text-amber-400">Manual: <strong>{ins.manualValue}</strong></span>}
                            </div>
                          )}
                          {ins.recommendedAction && (
                            <p className="text-xs text-primary/80 border-t border-border/50 pt-1 mt-1">→ {ins.recommendedAction}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60">Equipment: {ins.equipmentId} · Detected {(() => { const d = new Date(ins.detectedAt); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })()}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── TAB 3: Reliability Performance ───────────────────────────── */}
          <TabsContent value="reliability" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Reliability Performance Model</h2>
                <p className="text-xs text-muted-foreground">Per-asset scoring: alarms, overrides, PM alignment, fault patterns</p>
              </div>
              <Badge variant="outline" className="text-xs">{result.reliabilityFindings.length} assets</Badge>
            </div>

            {result.reliabilityFindings.length === 0 ? (
              <Card className="border border-border">
                <CardContent className="py-12 text-center space-y-2">
                  <Activity className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold">No Equipment Data</p>
                  <p className="text-xs text-muted-foreground">Add equipment records to the Equipment Library to enable reliability scoring.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.reliabilityFindings
                  .slice()
                  .sort((a, b) => a.reliabilityScore - b.reliabilityScore)
                  .map(r => <ReliabilityCard key={r.equipmentId} r={r} />)}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 4: Compliance & Governance ───────────────────────────── */}
          <TabsContent value="compliance" className="space-y-4">
            {/* Compliance Risks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Compliance Performance Model</h2>
                  <p className="text-xs text-muted-foreground">Certifications, inspections, PM records, regulatory exposure</p>
                </div>
                <Badge variant="outline" className="text-xs">{result.complianceRisks.length} risks</Badge>
              </div>

              {result.complianceRisks.length === 0 ? (
                <Card className="border border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Compliance Risks Found</p>
                    <p className="text-xs text-muted-foreground">All monitored certifications and inspection records appear current.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {result.complianceRisks
                    .slice()
                    .sort((a, b) => {
                      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3, Informational: 4 };
                      return (order[a.severity as keyof typeof order] ?? 5) - (order[b.severity as keyof typeof order] ?? 5);
                    })
                    .map(r => <ComplianceCard key={r.id} r={r} />)}
                </div>
              )}
            </div>

            {/* Governance Audit Log */}
            <Card className="border border-border">
              <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Governance Audit Trail</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{result.governanceLog.length} entries</span>
                  <div className="flex gap-1">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Verified</span>
                    <span className="flex items-center gap-1 text-[10px] text-yellow-400 ml-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Gap</span>
                    <span className="flex items-center gap-1 text-[10px] text-red-400 ml-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Missing</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {result.governanceLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No governance entries. Start logging facility activity to build an audit trail.</p>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto">
                      {result.governanceLog.slice(0, govLimit).map((entry, i) => (
                        <GovernanceRow key={i} entry={entry} />
                      ))}
                    </div>
                    {result.governanceLog.length > govLimit && (
                      <div className="pt-3 text-center">
                        <Button variant="outline" size="sm" onClick={() => setGovLimit(l => l + 50)} className="text-xs">
                          Load more ({result.governanceLog.length - govLimit} remaining)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 5: Predictive Intelligence ───────────────────────────── */}
          <TabsContent value="predictive" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Predictive Operational Intelligence</h2>
                <p className="text-xs text-muted-foreground">Pattern-derived recommendations — energy, PM timing, failure prevention</p>
              </div>
              <Badge variant="outline" className="text-xs">{result.predictiveInsights.length} insights</Badge>
            </div>

            {result.predictiveInsights.length === 0 ? (
              <Card className="border border-border">
                <CardContent className="py-12 text-center space-y-2">
                  <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold">Insufficient Data for Predictions</p>
                  <p className="text-xs text-muted-foreground">Continue logging operational data to unlock predictive intelligence.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Immediate first */}
                {['Immediate', '30 Days', '90 Days', 'Ongoing'].map(urgency => {
                  const group = result.predictiveInsights.filter(i => i.urgency === urgency);
                  if (group.length === 0) return null;
                  return (
                    <div key={urgency} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${urgency === 'Immediate' ? 'bg-red-400' : urgency === '30 Days' ? 'bg-orange-400' : urgency === '90 Days' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                        {urgency} · {group.length}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.map(ins => <InsightCard key={ins.id} ins={ins} />)}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
          {/* ── TAB 6: Downtime Analysis ──────────────────────────────────── */}
          <TabsContent value="downtime" className="space-y-4">
            {/* View toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
                <button onClick={() => setDowntimeView('analysis')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${downtimeView === 'analysis' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Downtime Analysis
                </button>
                <button onClick={() => setDowntimeView('log')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${downtimeView === 'log' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ClipboardList className="w-3.5 h-3.5 inline mr-1.5" />Manual Log
                  {downtimeEntries.filter(e => e.status === 'active').length > 0 && (
                    <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] inline-flex items-center justify-center">{downtimeEntries.filter(e => e.status === 'active').length}</span>
                  )}
                </button>
              </div>
              {downtimeView === 'log' && (
                <Button size="sm" onClick={() => setDowntimeFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Log Downtime
                </Button>
              )}
              {downtimeView === 'analysis' && (
                <Button size="sm" variant="outline" onClick={runDowntimeAnalysis}>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />Re-analyze
                </Button>
              )}
            </div>

            {/* ── ANALYSIS VIEW ── */}
            {downtimeView === 'analysis' && downtimeAnalysis && (
              <div className="space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-border"><CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Events (90d)</p>
                    <p className="text-2xl font-bold">{downtimeAnalysis.totalEvents}</p>
                  </CardContent></Card>
                  <Card className={downtimeAnalysis.criticalCount > 0 ? 'border-red-500/40' : 'border-border'}><CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Critical</p>
                    <p className={`text-2xl font-bold ${downtimeAnalysis.criticalCount > 0 ? 'text-red-400' : ''}`}>{downtimeAnalysis.criticalCount}</p>
                  </CardContent></Card>
                  <Card className="border-border"><CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Equipment Affected</p>
                    <p className="text-2xl font-bold text-primary">{downtimeAnalysis.totalEquipmentAffected}</p>
                  </CardContent></Card>
                  <Card className="border-border"><CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg / Week</p>
                    <p className="text-2xl font-bold text-orange-400">{downtimeAnalysis.avgEventsPerWeek}</p>
                  </CardContent></Card>
                </div>

                {/* Executive summary */}
                <Card className="border-border">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Analysis Summary</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{downtimeAnalysis.executiveSummary}</p>
                  </CardContent>
                </Card>

                {/* Timeline chart */}
                <Card className="border-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Downtime Timeline — Past 90 Days
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Click any week bar to see that week's events and lead-up context</p>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={downtimeAnalysis.timelineBuckets}
                        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        onClick={(data) => {
                          if (data?.activePayload?.[0]) {
                            const bucket = data.activePayload[0].payload as TimelineBucket;
                            setSelectedBucket(bucket.total > 0 ? bucket : null);
                            setSelectedEvent(null);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-background border border-border rounded-lg p-2 text-xs shadow-lg">
                              <p className="font-semibold mb-1">Week of {label}</p>
                              {payload.map((p: any) => p.value > 0 && (
                                <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
                              ))}
                              <p className="text-muted-foreground mt-1">Click to view events</p>
                            </div>
                          ) : null}
                        />
                        <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="major" stackId="a" fill="#f97316" name="Major" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="minor" stackId="a" fill="#eab308" name="Minor" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 justify-center mt-1">
                      {[['#ef4444', 'Critical'], ['#f97316', 'Major'], ['#eab308', 'Minor']].map(([color, label]) => (
                        <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Selected week events */}
                {selectedBucket && selectedBucket.events.length > 0 && (
                  <Card className="border-primary/40 bg-primary/5">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Week of {selectedBucket.label} — {selectedBucket.total} Event{selectedBucket.total !== 1 ? 's' : ''}</CardTitle>
                        <button onClick={() => setSelectedBucket(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">✕ Close</button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-2">
                      {selectedBucket.events.map(evt => (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className="w-full text-left p-3 rounded-lg border border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${evt.severity === 'critical' ? 'bg-red-500' : evt.severity === 'major' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                <span className="text-sm font-semibold">{evt.equipmentName}</span>
                                {evt.leadUpEvents.length > 0 && (
                                  <Badge variant="outline" className="text-[9px] text-primary border-primary/40 ml-auto">{evt.leadUpEvents.length} lead-up signal{evt.leadUpEvents.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{evt.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-muted-foreground">{(() => { const d = new Date(evt.occurredAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}</p>
                              <p className="text-[10px] text-muted-foreground">{(() => { const d = new Date(evt.occurredAt); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); })()}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top offenders */}
                {downtimeAnalysis.topOffenders.length > 0 && (
                  <Card className="border-border">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold">Top Recurring Equipment</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-2">
                      {downtimeAnalysis.topOffenders.map((o, i) => (
                        <div key={o.equipmentName} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium">{o.equipmentName}</span>
                              <span className={`text-xs font-bold ${o.highestSeverity === 'critical' ? 'text-red-400' : o.highestSeverity === 'major' ? 'text-orange-400' : 'text-yellow-400'}`}>{o.count} event{o.count > 1 ? 's' : ''}</span>
                            </div>
                            <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${o.highestSeverity === 'critical' ? 'bg-red-500' : o.highestSeverity === 'major' ? 'bg-orange-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, (o.count / downtimeAnalysis.topOffenders[0].count) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Patterns */}
                {downtimeAnalysis.patterns.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />Operational Patterns Detected
                    </h3>
                    {downtimeAnalysis.patterns.map(p => (
                      <Card key={p.id} className="border border-yellow-500/20 bg-yellow-500/5">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant="outline" className={`text-[9px] ${p.confidence === 'High' ? 'text-green-400 border-green-400/40' : p.confidence === 'Moderate' ? 'text-yellow-400 border-yellow-400/40' : 'text-muted-foreground border-border'}`}>{p.confidence} confidence</Badge>
                                <span className="text-[10px] text-muted-foreground capitalize">{p.type.replace(/_/g, ' ')}</span>
                              </div>
                              <p className="text-sm font-semibold">{p.title}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">{p.occurrenceCount}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                          <div className="pt-1 border-t border-border/30">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Recommendation</p>
                            <p className="text-xs text-foreground">{p.recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Global suggestions */}
                {downtimeAnalysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />Suggestions to Reduce Downtime
                    </h3>
                    {downtimeAnalysis.suggestions.map(s => (
                      <Card key={s.id} className={`border ${s.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' : s.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-card/50'}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${s.priority === 'critical' ? 'text-red-400 border-red-400/40' : s.priority === 'high' ? 'text-orange-400 border-orange-400/40' : s.priority === 'medium' ? 'text-yellow-400 border-yellow-400/40' : 'text-muted-foreground border-border'}`}>{s.priority}</Badge>
                            <p className="text-sm font-semibold">{s.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{s.detail}</p>
                          <div className="text-[10px] text-primary font-medium">Est. impact: {s.estimatedImpact}</div>
                          {s.actionItems.length > 0 && (
                            <ul className="space-y-0.5 pt-1 border-t border-border/30">
                              {s.actionItems.map((item, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="mt-1 w-1 h-1 rounded-full bg-primary/50 shrink-0" />{item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MANUAL LOG VIEW ── */}
            {downtimeView === 'log' && (
              <div className="space-y-4">
                {/* Cause breakdown */}
                {downtimeEntries.length > 0 && (
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Root Cause</p>
                      <div className="flex flex-wrap gap-2">
                        {CAUSE_CATEGORIES.filter(c => downtimeEntries.some(e => e.causeCategory === c)).map(cat => {
                          const count = downtimeEntries.filter(e => e.causeCategory === cat).length;
                          return (
                            <div key={cat} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${CAUSE_COLORS[cat] || ''}`}>
                              <span>{cat}</span><span className="font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {downtimeEntries.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center space-y-2">
                      <PowerOff className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold">No Manual Entries</p>
                      <p className="text-xs text-muted-foreground">Log a downtime event to track touches and root causes. The Analysis tab shows auto-detected events from your facility data.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {[...downtimeEntries].sort((a, b) => {
                      if (a.status === 'active' && b.status !== 'active') return -1;
                      if (b.status === 'active' && a.status !== 'active') return 1;
                      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
                    }).map(entry => (
                      <DowntimeCard key={entry.id} entry={entry} onAddTouch={handleAddTouch} onResolve={handleResolve} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="piping" className="space-y-4">
            <PipingRecommenderTab />
          </TabsContent>
        </Tabs>
      )}

      {renderDowntimeDialogs()}
    </div>
  );

  // ── Downtime dialogs ────────────────────────────────────────────────────────

  function renderDowntimeDialogs() {
    return (
      <>
        {/* Log Downtime */}
        <Dialog open={downtimeFormOpen} onOpenChange={setDowntimeFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><PowerOff className="w-5 h-5 text-red-400" />Log Downtime Event</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Equipment / Asset *</Label>
                  <Input className="text-xs" value={downtimeForm.equipmentName} onChange={e => setDowntimeForm(f => ({ ...f, equipmentName: e.target.value }))} placeholder="e.g., Chiller CH-01, VFD-3" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input className="text-xs" value={downtimeForm.location} onChange={e => setDowntimeForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Mech Room 2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Severity *</Label>
                  <Select value={downtimeForm.severity} onValueChange={v => setDowntimeForm(f => ({ ...f, severity: v as any }))}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Cause Category *</Label>
                  <Select value={downtimeForm.causeCategory} onValueChange={v => setDowntimeForm(f => ({ ...f, causeCategory: v }))}>
                    <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select cause…" /></SelectTrigger>
                    <SelectContent>{CAUSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Cause Detail</Label>
                  <Input className="text-xs" value={downtimeForm.causeDetail} onChange={e => setDowntimeForm(f => ({ ...f, causeDetail: e.target.value }))} placeholder="e.g., Bearing failure on drive end" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Down Since *</Label>
                  <Input type="datetime-local" className="text-xs" value={downtimeForm.startedAt} onChange={e => setDowntimeForm(f => ({ ...f, startedAt: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Logged By</Label>
                  <Input className="text-xs" value={downtimeForm.loggedBy} onChange={e => setDowntimeForm(f => ({ ...f, loggedBy: e.target.value }))} placeholder="Your name" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDowntimeFormOpen(false)}>Cancel</Button>
              <Button onClick={handleLogDowntime} disabled={!downtimeForm.equipmentName || !downtimeForm.causeCategory} className="bg-red-500 hover:bg-red-600 text-white">
                <PowerOff className="w-4 h-4 mr-2" />Log Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Touch */}
        <Dialog open={touchFormOpen} onOpenChange={setTouchFormOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" />Add Touch</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Action Performed *</Label>
                <Input className="text-xs" value={touchForm.action} onChange={e => setTouchForm(f => ({ ...f, action: e.target.value }))} placeholder="e.g., Checked contactors, reset VFD fault, replaced fuse" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tech / Name</Label>
                <Input className="text-xs" value={touchForm.tech} onChange={e => setTouchForm(f => ({ ...f, tech: e.target.value }))} placeholder="Who performed this" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outcome</Label>
                <Select value={touchForm.outcome} onValueChange={v => setTouchForm(f => ({ ...f, outcome: v as any }))}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TOUCH_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTouchFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTouch} disabled={!touchForm.action}><Wrench className="w-4 h-4 mr-2" />Save Touch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Downtime Event Detail */}
        <Dialog open={!!selectedEvent} onOpenChange={o => { if (!o) setSelectedEvent(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PowerOff className="w-5 h-5 text-red-400" />
                    {selectedEvent.equipmentName}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline" className={`text-xs capitalize ${selectedEvent.severity === 'critical' ? 'text-red-400 border-red-400/40' : selectedEvent.severity === 'major' ? 'text-orange-400 border-orange-400/40' : 'text-yellow-400 border-yellow-400/40'}`}>{selectedEvent.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{selectedEvent.causeCategory}</Badge>
                    <span className="text-xs text-muted-foreground self-center">
                      {(() => { const d = new Date(selectedEvent.occurredAt); return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}
                    </span>
                  </div>
                </DialogHeader>
                <div className="space-y-4 py-1">
                  {/* Description */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedEvent.description}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {selectedEvent.durationMin && <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{selectedEvent.durationMin >= 60 ? `${Math.floor(selectedEvent.durationMin / 60)}h ${selectedEvent.durationMin % 60}m` : `${selectedEvent.durationMin}m`} downtime</span>}
                      <span className="flex items-center gap-1 capitalize">{selectedEvent.systemType} system</span>
                      <span className={`font-medium ${selectedEvent.recurrenceCount >= 3 ? 'text-red-400' : selectedEvent.recurrenceCount >= 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>{selectedEvent.recurrenceLabel}</span>
                    </div>
                  </div>

                  {/* Lead-up timeline */}
                  {selectedEvent.leadUpEvents.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />Lead-Up Signals ({selectedEvent.leadUpEvents.length})
                      </p>
                      <div className="space-y-2">
                        {selectedEvent.leadUpEvents.map((l, i) => (
                          <div key={i} className="grid grid-cols-[1.5rem_1fr] gap-2 text-xs">
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${l.type === 'violation' ? 'bg-yellow-500/20 text-yellow-400' : l.type === 'alarm' ? 'bg-red-500/20 text-red-400' : 'bg-muted/40 text-muted-foreground'}`}>
                                {l.type === 'violation' ? '!' : l.type === 'alarm' ? '⚡' : '●'}
                              </div>
                              {i < selectedEvent.leadUpEvents.length - 1 && <div className="w-px flex-1 bg-border/40 my-0.5" />}
                            </div>
                            <div className="pb-1">
                              <p className="text-foreground">{l.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{l.hoursBeforeEvent}h before · {l.source}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-xs text-red-400 font-medium ml-6">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          DOWNTIME EVENT
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compliance context */}
                  {selectedEvent.relatedCompliance.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" />Related Compliance ({selectedEvent.relatedCompliance.length})
                      </p>
                      <div className="space-y-1.5">
                        {selectedEvent.relatedCompliance.map((c, i) => (
                          <div key={i} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/40">{c.type}</Badge>
                              <span className="text-[10px] text-muted-foreground">{(() => { const d = new Date(c.timestamp); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); })()}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{c.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {selectedEvent.suggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" />Suggestions
                      </p>
                      <div className="space-y-1.5">
                        {selectedEvent.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                            <span className="text-muted-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Mark Resolved */}
        <Dialog open={resolveFormOpen} onOpenChange={setResolveFormOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400" />Mark Resolved</DialogTitle></DialogHeader>
            <div className="py-2 space-y-1">
              <Label className="text-xs">Resolution Notes</Label>
              <Textarea className="text-xs" value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="What fixed it? Parts replaced, adjustments made, root cause confirmed…" rows={3} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResolveFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveResolve} className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle2 className="w-4 h-4 mr-2" />Mark Resolved</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}

// ── Exported Page ─────────────────────────────────────────────────────────────

export default function OperationalIntelligence() {
  return <OIGContent />;
}
