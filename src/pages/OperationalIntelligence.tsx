import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TierGate } from '@/components/TierGate';
import { useAuth } from '@/hooks/useAuth';
import {
  BrainCircuit, RefreshCw, ShieldCheck, Zap, Activity,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Minus, Info, ChevronDown, ChevronUp, ClipboardList, Eye,
} from 'lucide-react';
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
  const raw = {
    logs:       JSON.parse(localStorage.getItem('nexum_facility_logs')       ?? '[]'),
    workOrders: JSON.parse(localStorage.getItem('nexum_work_orders')         ?? '[]'),
    equipment:  JSON.parse(localStorage.getItem('nexum_equipment_library')   ?? '[]'),
    violations: JSON.parse(localStorage.getItem('nexum_violation_events')    ?? '[]'),
  };
  return raw;
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
        {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

function OIGContent() {
  const { user } = useAuth();
  const facilityId = (user as any)?.facilityId || (user as any)?.['custom:facilityId'] || 'facility-001';
  const [result, setResult]     = useState<OIGAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [govLimit, setGovLimit] = useState(50);
  const [expandedBlind, setExpandedBlind] = useState(false);

  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    const data = loadSampleData();
    setTimeout(() => {
      const r = runOIGAnalysis({ facilityId, ...data });
      setResult(r);
      setAnalyzing(false);
    }, 600);
  }, [facilityId]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

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
              {result && <span className="ml-2 opacity-60">· Last run {new Date(result.analysisTimestamp).toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runAnalysis} disabled={analyzing} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </Button>
      </div>

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
          </TabsList>

          {/* ── TAB 1: Intelligence Overview ─────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
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
        </Tabs>
      )}
    </div>
  );
}

// ── Exported Page ─────────────────────────────────────────────────────────────

export default function OperationalIntelligence() {
  return <OIGContent />;
}
