// Quality Intelligence & Cost Intelligence framework for the Decision Intelligence Engine
// Evaluates: Cost Efficiency, Cost Defensibility, Cost Offensibility, Quality Stability, Predictable Drift

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, TrendingDown, TrendingUp, Activity, AlertTriangle,
  CheckCircle, Shield, Eye, FileText, Info, Clock,
  ChevronDown, ChevronUp, BarChart3, AlertCircle, Repeat,
  Target, Lock, Zap, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta as any).env?.VITE_API_BASE
  || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

function getToken() {
  return localStorage.getItem('nexum_access_token') || '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriftIndicator {
  metric: string;
  description: string;
  direction: 'rising' | 'falling' | 'recurring';
  severity: 'low' | 'medium' | 'high';
  estimate?: string;
}

export interface CostSignal {
  category: 'direct' | 'hidden';
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  estimatedImpact?: string;
}

export interface QIInsight {
  id: string;
  category: 'quality' | 'continuity' | 'cost' | 'drift';
  severity: 'info' | 'warning' | 'critical';
  text: string;
}

export interface QIScores {
  costEfficiency: number;
  costDefensibility: number;
  costOffensibility: number;
  qualityStability: number;
  predictableDrift: number;
  hiddenCostEstimate: number;
  preventedCostEstimate: number;
  insights: QIInsight[];
  driftIndicators: DriftIndicator[];
  costSignals: CostSignal[];
  defensibilityNote: {
    why: string;
    confidence: 'low' | 'medium' | 'high';
    confidenceScore: number;
    evidence: string[];
    assumptions: string[];
    interventionPath: string[];
  };
}

// ── Scoring Engine ─────────────────────────────────────────────────────────────

export function computeQualityIntelligence(allLogs: any[], allDiagnoses: any[]): QIScores {
  if (allLogs.length === 0) {
    return {
      costEfficiency: 75, costDefensibility: 35, costOffensibility: 0,
      qualityStability: 70, predictableDrift: 20,
      hiddenCostEstimate: 0, preventedCostEstimate: 0,
      insights: [{ id: 'no-data', category: 'quality', severity: 'info',
        text: 'Insufficient data for Quality & Cost Intelligence analysis. Log equipment readings to generate operational scores.' }],
      driftIndicators: [], costSignals: [],
      defensibilityNote: {
        why: 'Insufficient operational data to generate a defensibility position.',
        confidence: 'low', confidenceScore: 10, evidence: [],
        assumptions: ['Efficiency baseline: 88.9% (Nexum FI threshold)', 'Labor rate: $65/hr blended estimate'],
        interventionPath: ['Begin logging equipment readings consistently to enable intelligence scoring'],
      },
    };
  }

  const criticalCount = allDiagnoses.filter((d: any) => d.severity === 'critical').length;
  const warningCount  = allDiagnoses.filter((d: any) => d.severity === 'warning').length;
  const goodCount     = allDiagnoses.filter((d: any) => d.severity === 'good').length;

  // Efficiency
  const effLogs = allLogs.filter((l: any) => (l.efficiency || 0) > 0);
  const avgEff  = effLogs.length > 0
    ? effLogs.reduce((s: number, l: any) => s + l.efficiency, 0) / effLogs.length
    : 82;

  // Recurring diagnostic patterns (same id across different equipment)
  const diagIds = allDiagnoses.map((d: any) => d.id);
  const recurringDiags = diagIds.filter((id: string, i: number) => diagIds.indexOf(id) !== i);

  // Documentation completeness
  const keyFields = ['efficiency', 'systemType', 'equipmentId', 'timestamp'];
  const avgCompleteness = allLogs.reduce((s: number, l: any) =>
    s + keyFields.filter(f => l[f] != null && l[f] !== '').length / keyFields.length, 0) / allLogs.length;

  // Timestamp gap analysis
  const timestamps = allLogs
    .map((l: any) => new Date(l.timestamp).getTime())
    .filter((t: number) => !isNaN(t))
    .sort((a: number, b: number) => b - a);
  const maxGapDays = timestamps.length > 1
    ? Math.max(...timestamps.slice(0, -1).map((t: number, i: number) => (t - timestamps[i + 1]) / 86400000))
    : 0;
  const dataSpanDays = timestamps.length > 1
    ? Math.round((timestamps[0] - timestamps[timestamps.length - 1]) / 86400000)
    : 0;

  // Trend analysis
  const stackTemps = allLogs.filter((l: any) => (l.stackTemp || 0) > 0).slice(0, 10).map((l: any) => l.stackTemp as number);
  const risingStack = stackTemps.length >= 3 && stackTemps[0] - stackTemps[stackTemps.length - 1] < -15;

  const recentEff    = effLogs.slice(0, 3);
  const olderEff     = effLogs.slice(3, 6);
  const recentEffAvg = recentEff.length > 0 ? recentEff.reduce((s: number, l: any) => s + l.efficiency, 0) / recentEff.length : avgEff;
  const olderEffAvg  = olderEff.length > 0  ? olderEff.reduce((s: number, l: any)  => s + l.efficiency, 0) / olderEff.length  : avgEff;
  const effDeclining = recentEffAvg - olderEffAvg < -3;

  const filterIssues = allLogs.filter((l: any) => l.filterStatus === 'dirty' || l.filterStatus === 'replace').length;

  // ── Scores ───────────────────────────────────────────────────────────────────

  // Cost Efficiency (higher = better)
  const costEfficiency = Math.max(0, Math.min(100, Math.round(
    avgEff - criticalCount * 8 - warningCount * 3 + goodCount * 2
  )));

  // Quality Stability (higher = better)
  const qualityStability = Math.max(0, Math.min(100, Math.round(
    100
    - criticalCount * 12
    - warningCount * 6
    - recurringDiags.length * 8
    - filterIssues * 4
    - (maxGapDays > 30 ? 15 : maxGapDays > 14 ? 8 : 0)
    + (avgCompleteness - 0.5) * 20
  )));

  // Cost Defensibility (higher = better — evidence richness)
  const costDefensibility = Math.min(100, Math.round(
    (Math.min(allLogs.length / 20, 1) * 35)
    + (avgCompleteness * 30)
    + (allDiagnoses.length > 0 ? 20 : 0)
    + (timestamps.length > 5 ? 15 : timestamps.length * 3)
  ));

  // Cost Offensibility (higher = more proactive risk identified)
  const costOffensibility = Math.min(100,
    (criticalCount > 0 ? 25 : 0)
    + (warningCount > 0 ? 15 : 0)
    + recurringDiags.length * 20
    + (effDeclining ? 15 : 0)
    + (risingStack ? 10 : 0)
    + (filterIssues >= 2 ? 10 : 0)
    + (maxGapDays > 14 ? 10 : 0)
    + (avgCompleteness < 0.7 ? 10 : 0)
  );

  // Predictable Drift (higher = more drift risk)
  const predictableDrift = Math.min(100,
    (effDeclining ? 25 : 0)
    + (risingStack ? 20 : 0)
    + recurringDiags.length * 15
    + (filterIssues >= 2 ? 15 : 0)
    + (maxGapDays > 30 ? 15 : 0)
    + (warningCount >= 2 ? 10 : 0)
  );

  // ── Cost Estimates ─────────────────────────────────────────────────────────────

  const effGap           = Math.max(0, 88.9 - avgEff);
  const critDowntime     = criticalCount * 4 * 65;
  const warnDelay        = warningCount * 1.5 * 65;
  const effLossMonthly   = (effGap / 100) * 1200;
  const recurringCost    = recurringDiags.length * 350;
  const docGapCost       = avgCompleteness < 0.7 ? 500 : 0;
  const pmDelayCost      = maxGapDays > 14 ? 800 : 0;

  const hiddenCostEstimate = Math.round(critDowntime + warnDelay + effLossMonthly + recurringCost + docGapCost + pmDelayCost);
  const preventedCostEstimate = Math.round(
    criticalCount * 2800
    + warningCount * 800
    + recurringDiags.length * 1200
    + (effDeclining ? 3600 : 0)
  );

  // ── Drift Indicators ──────────────────────────────────────────────────────────

  const driftIndicators: DriftIndicator[] = [];
  if (risingStack) {
    driftIndicators.push({
      metric: 'Stack Temperature',
      description: 'Stack temperature rising across recent readings — heat transfer surface fouling trend detected',
      direction: 'rising', severity: 'high',
      estimate: '~1% efficiency loss per 40°F rise if unaddressed',
    });
  }
  if (effDeclining) {
    driftIndicators.push({
      metric: 'Equipment Efficiency',
      description: `Efficiency declining ${Math.abs(Math.round(recentEffAvg - olderEffAvg))}% over recent period — predictable degradation path`,
      direction: 'falling',
      severity: recentEffAvg < 80 ? 'high' : 'medium',
      estimate: `~$${Math.round(effGap / 100 * 1200)}/mo in excess operating cost`,
    });
  }
  if (filterIssues >= 2) {
    driftIndicators.push({
      metric: 'Filter Loading Rate',
      description: 'Recurring dirty/replace filter events — accelerated loading or insufficient PM frequency',
      direction: 'recurring',
      severity: filterIssues >= 3 ? 'high' : 'medium',
    });
  }
  if (recurringDiags.length > 0) {
    driftIndicators.push({
      metric: 'Recurring Diagnostic Patterns',
      description: `${recurringDiags.length} pattern(s) appearing across multiple equipment — system-wide drift signal`,
      direction: 'recurring', severity: 'medium',
    });
  }
  if (maxGapDays > 14) {
    driftIndicators.push({
      metric: 'Documentation Continuity',
      description: `Largest data gap: ${Math.round(maxGapDays)} days between readings — PM delay or handoff failure risk`,
      direction: 'recurring',
      severity: maxGapDays > 30 ? 'high' : 'low',
    });
  }

  // ── Cost Signals ──────────────────────────────────────────────────────────────

  const costSignals: CostSignal[] = [];
  if (criticalCount > 0) {
    costSignals.push({ category: 'direct', label: 'Emergency Labor',
      description: `${criticalCount} critical issue(s) likely requiring unplanned contractor or overtime response`,
      severity: 'high', estimatedImpact: `~$${criticalCount * 350}–$${criticalCount * 800}` });
  }
  if (avgEff < 88) {
    costSignals.push({ category: 'direct', label: 'Utility Overspend',
      description: `Average efficiency ${Math.round(avgEff)}% vs 88.9% Nexum performance threshold`,
      severity: avgEff < 75 ? 'high' : 'medium',
      estimatedImpact: `~$${Math.round(effLossMonthly)}/mo` });
  }
  if (recurringDiags.length > 0) {
    costSignals.push({ category: 'hidden', label: 'Recurring Issue Labor',
      description: 'Same patterns repeating — root cause unaddressed, incremental labor accumulating each cycle',
      severity: 'medium', estimatedImpact: `~$${recurringDiags.length * 350}/cycle` });
  }
  if (effDeclining) {
    costSignals.push({ category: 'hidden', label: 'Degradation Trajectory',
      description: 'Declining efficiency trend opens a predictable future maintenance or capital replacement window',
      severity: 'medium' });
  }
  if (maxGapDays > 14) {
    costSignals.push({ category: 'hidden', label: 'PM Delay Risk',
      description: `${Math.round(maxGapDays)}-day documentation gap increases deferred PM cost probability`,
      severity: 'low', estimatedImpact: '~$800/incident' });
  }
  if (avgCompleteness < 0.7) {
    costSignals.push({ category: 'hidden', label: 'Compliance Exposure',
      description: 'Incomplete log documentation — defensibility gap for regulatory review or liability event',
      severity: 'medium', estimatedImpact: 'Varies by regulation' });
  }
  if (filterIssues >= 2) {
    costSignals.push({ category: 'hidden', label: 'Coil Fouling Risk',
      description: 'Recurring filter events may be loading coils — delayed action increases cleaning or replacement cost',
      severity: 'medium', estimatedImpact: '$500–$2,500 coil cleaning' });
  }

  // ── Insights ──────────────────────────────────────────────────────────────────

  const insights: QIInsight[] = [];
  if (criticalCount > 0 && recurringDiags.length > 0) {
    insights.push({ id: 'recurring-critical', category: 'cost', severity: 'critical',
      text: 'Repeated critical patterns with no resolved root cause indicate hidden cost accumulation — each unresolved cycle adds unplanned labor and deferred capital exposure.' });
  }
  if (effDeclining && avgEff < 88) {
    insights.push({ id: 'eff-declining', category: 'drift', severity: 'warning',
      text: `PM completion rates declining while energy intensity increases — efficiency at ${Math.round(recentEffAvg)}% and trending downward. Intervention within 30 days prevents cost gap widening.` });
  }
  if (filterIssues >= 2) {
    insights.push({ id: 'filter-recurring', category: 'quality', severity: 'warning',
      text: 'Recurring filter load events suggest PM frequency is insufficient for actual operating conditions — quality drift likely contributing to future maintenance costs.' });
  }
  if (maxGapDays > 30) {
    insights.push({ id: 'doc-gap-30', category: 'continuity', severity: 'warning',
      text: `Documentation gap of ${Math.round(maxGapDays)} days detected — potential handoff failure or PM delay. Shift turnover information loss may be masking operational drift.` });
  }
  if (avgCompleteness < 0.65) {
    insights.push({ id: 'doc-incomplete', category: 'quality', severity: 'warning',
      text: `Log documentation completeness is ${Math.round(avgCompleteness * 100)}% — workflow inconsistency may create downstream operational expense through reduced decision defensibility.` });
  }
  if (criticalCount > 0) {
    insights.push({ id: 'alarm-ack', category: 'cost', severity: 'warning',
      text: 'Repeated alarm acknowledgement with no corrective action resolution indicates potential hidden cost accumulation — unresolved patterns become deferred capital.' });
  }
  if (risingStack) {
    insights.push({ id: 'rising-stack', category: 'drift', severity: 'warning',
      text: 'Rising stack temperature trend detected — increasing energy intensity consistent with heat transfer surface fouling. Quality drift likely contributing to future maintenance costs.' });
  }
  if (predictableDrift > 50) {
    insights.push({ id: 'drift-elevated', category: 'drift', severity: 'warning',
      text: `Predictable drift risk is elevated at ${predictableDrift}/100 — multiple early indicators present. Potential future cost avoided if intervention occurs within recommended window.` });
  }
  if (preventedCostEstimate > 3000) {
    insights.push({ id: 'prevented-value', category: 'cost', severity: 'info',
      text: `Proactive identification of current patterns has preserved an estimated $${preventedCostEstimate.toLocaleString()} in reactive maintenance and downtime costs.` });
  }
  if (qualityStability > 80 && costDefensibility > 70) {
    insights.push({ id: 'strong-position', category: 'quality', severity: 'info',
      text: 'Quality stability and defensibility scores are strong — operational record supports evidence-based decision making and regulatory defensibility.' });
  }
  if (insights.length === 0) {
    insights.push({ id: 'baseline-ok', category: 'quality', severity: 'info',
      text: 'Operational patterns are within acceptable limits. Continue logging to build longitudinal defensibility data.' });
  }

  // ── Defensibility Note ────────────────────────────────────────────────────────

  const evidence: string[] = [];
  if (allLogs.length > 0) evidence.push(`${allLogs.length} equipment reading(s) analyzed`);
  if (effLogs.length > 0) evidence.push(`Average efficiency: ${Math.round(avgEff)}% (${effLogs.length} readings)`);
  if (criticalCount > 0) evidence.push(`${criticalCount} critical diagnostic pattern(s) identified`);
  if (warningCount > 0) evidence.push(`${warningCount} warning-level pattern(s) identified`);
  if (recurringDiags.length > 0) evidence.push(`${recurringDiags.length} recurring diagnostic pattern(s) across equipment`);
  if (dataSpanDays > 0) evidence.push(`Operational data spans ${dataSpanDays} days`);
  evidence.push(`Documentation completeness: ${Math.round(avgCompleteness * 100)}%`);

  const assumptions = [
    'Efficiency baseline: 88.9% (Nexum FI standard threshold)',
    'Labor rate: $65/hr blended (in-house + contractor estimate)',
    'Utility baseline: $1,200/mo for modeled equipment set',
    'PM interval: 30-day standard unless logs indicate otherwise',
    'Cost estimates are approximations — actual costs vary by facility size, contractor rates, and utility pricing',
  ];

  const interventionPath: string[] = [];
  if (criticalCount > 0) interventionPath.push('Address critical equipment issues within 24–72 hours — document corrective action with timestamps and technician name');
  if (effDeclining) interventionPath.push('Schedule combustion analysis or system tune-up — target efficiency recovery within 30 days');
  if (maxGapDays > 14) interventionPath.push('Establish consistent logging cadence — minimum weekly readings for all critical equipment');
  if (avgCompleteness < 0.7) interventionPath.push('Complete required log fields — priority: efficiency, timestamps, operator identification');
  if (recurringDiags.length > 0) interventionPath.push('Initiate root cause analysis for recurring patterns — address root cause, not symptoms');
  if (interventionPath.length === 0) interventionPath.push('Continue current PM schedule — increase logging frequency during seasonal transitions and equipment changeovers');

  const confidenceScore = Math.min(100, Math.round(
    (Math.min(allLogs.length / 30, 1) * 40)
    + (avgCompleteness * 35)
    + (timestamps.length > 5 ? 25 : timestamps.length * 5)
  ));
  const confidence: 'low' | 'medium' | 'high' = confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low';

  const whyParts: string[] = [];
  if (costOffensibility > 40) whyParts.push(`${costSignals.length} active cost driver(s) identified`);
  if (predictableDrift > 30) whyParts.push(`predictable drift indicators present in ${driftIndicators.length} metric(s)`);
  if (qualityStability < 70) whyParts.push('quality stability is below the 70-point threshold');
  const why = whyParts.length > 0
    ? `This recommendation exists because ${whyParts.join(', ')}. Early intervention prevents compounding cost accumulation and maintains operational defensibility.`
    : 'Current operational data supports continued PM schedule. No immediate escalation required based on available evidence.';

  return {
    costEfficiency, costDefensibility, costOffensibility,
    qualityStability, predictableDrift,
    hiddenCostEstimate, preventedCostEstimate,
    insights, driftIndicators, costSignals,
    defensibilityNote: { why, confidence, confidenceScore, evidence, assumptions, interventionPath },
  };
}

// ── Score Widget ───────────────────────────────────────────────────────────────

function ScoreWidget({ label, score, icon: Icon, iconColor, description, inverted = false }: {
  label: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  description: string;
  inverted?: boolean;
}) {
  const effective = inverted ? 100 - score : score;
  const color    = effective >= 75 ? 'text-green-400' : effective >= 50 ? 'text-yellow-400' : 'text-red-500';
  const barColor = effective >= 75 ? 'bg-green-500'   : effective >= 50 ? 'bg-yellow-400'   : 'bg-red-500';
  return (
    <Card className="neon-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
          <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
        </div>
        <p className={cn('text-2xl font-bold', color)}>{score}</p>
        <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${score}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{description}</p>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function QualityCostIntelligence({ logs, allDiagnoses }: { logs: any[]; allDiagnoses: any[] }) {
  const qi = computeQualityIntelligence(logs, allDiagnoses);
  const [defOpen,  setDefOpen]  = useState(false);
  const [driftOpen, setDriftOpen] = useState(true);
  const [costOpen,  setCostOpen]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savedAt,  setSavedAt]  = useState<string | null>(null);

  const saveSnapshot = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/quality-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          scores: {
            costEfficiency: qi.costEfficiency,
            costDefensibility: qi.costDefensibility,
            costOffensibility: qi.costOffensibility,
            qualityStability: qi.qualityStability,
            predictableDrift: qi.predictableDrift,
          },
          hiddenCostEstimate: qi.hiddenCostEstimate,
          preventedCostEstimate: qi.preventedCostEstimate,
          insights: qi.insights,
          driftIndicators: qi.driftIndicators,
          costSignals: qi.costSignals,
          defensibilityNote: qi.defensibilityNote,
          logCount: logs.length,
        }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (_) {}
    setSaving(false);
  };

  const INSIGHT_META: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
    quality:    { color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',    icon: Activity },
    continuity: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Repeat },
    cost:       { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: DollarSign },
    drift:      { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: TrendingDown },
  };

  const INSIGHT_SEV: Record<string, string> = {
    critical: 'text-red-500',
    warning:  'text-yellow-400',
    info:     'text-blue-400',
  };

  const DRIFT_DIR: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    rising:    { icon: TrendingUp,   color: 'text-red-500' },
    falling:   { icon: TrendingDown, color: 'text-orange-400' },
    recurring: { icon: Repeat,       color: 'text-yellow-400' },
  };

  const DRIFT_SEV: Record<string, string> = {
    high:   'border-red-500/30 bg-red-500/5',
    medium: 'border-yellow-400/30 bg-yellow-400/5',
    low:    'border-blue-400/30 bg-blue-400/5',
  };

  return (
    <div className="space-y-6">

      {/* ── Score Widgets ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ScoreWidget label="Cost Efficiency"    score={qi.costEfficiency}    icon={DollarSign}  iconColor="text-green-400"  description="Resource use vs performance" />
        <ScoreWidget label="Cost Defensibility" score={qi.costDefensibility} icon={Shield}      iconColor="text-blue-400"   description="Evidentiary justification strength" />
        <ScoreWidget label="Cost Offensibility" score={qi.costOffensibility} icon={Eye}         iconColor="text-orange-400" description="Proactive risk factors identified" inverted />
        <ScoreWidget label="Quality Stability"  score={qi.qualityStability}  icon={Activity}    iconColor="text-cyan-400"   description="Process consistency within limits" />
        <ScoreWidget label="Predictable Drift"  score={qi.predictableDrift}  icon={BarChart3}   iconColor="text-yellow-400" description="Future degradation risk level" inverted />
      </div>

      {/* ── Cost Estimate Widgets ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 shrink-0">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Hidden Cost Estimate</p>
              <p className="text-2xl font-bold text-red-500">${qi.hiddenCostEstimate.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unplanned labor · efficiency loss · deferred PM (current cycle)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Prevented Cost Estimate</p>
              <p className="text-2xl font-bold text-green-400">${qi.preventedCostEstimate.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Value of proactive identification vs reactive response</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Insights ── */}
      <Card className="neon-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Quality &amp; Cost Insights
            <Badge variant="outline" className="ml-auto text-[10px] border-border/40">
              {qi.insights.length} signal{qi.insights.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {qi.insights.map(ins => {
            const meta = INSIGHT_META[ins.category];
            const IcnComp = meta.icon;
            return (
              <div key={ins.id} className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', meta.bg)}>
                <IcnComp className={cn('w-4 h-4 mt-0.5 shrink-0', meta.color)} />
                <p className="flex-1 text-sm leading-relaxed">{ins.text}</p>
                <Badge variant="outline" className={cn('text-[10px] shrink-0 capitalize border-0 bg-transparent', INSIGHT_SEV[ins.severity])}>
                  {ins.severity}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Drift Indicators ── */}
      {qi.driftIndicators.length > 0 && (
        <Card className="neon-border">
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setDriftOpen(o => !o)}>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Predictable Drift Indicators
              <Badge variant="outline" className="ml-auto text-[10px] border-yellow-400/30 text-yellow-400 bg-yellow-400/10">
                {qi.driftIndicators.length} active
              </Badge>
              {driftOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {driftOpen && (
            <CardContent className="space-y-2">
              {qi.driftIndicators.map((d, i) => {
                const dir = DRIFT_DIR[d.direction];
                const DirIcon = dir.icon;
                return (
                  <div key={i} className={cn('rounded-xl border p-3 space-y-1', DRIFT_SEV[d.severity])}>
                    <div className="flex items-center gap-2">
                      <DirIcon className={cn('w-3.5 h-3.5 shrink-0', dir.color)} />
                      <span className="text-sm font-semibold">{d.metric}</span>
                      <Badge variant="outline" className={cn('text-[10px] ml-auto capitalize',
                        d.severity === 'high'   ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                        d.severity === 'medium' ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' :
                                                   'border-blue-400/30 text-blue-400 bg-blue-400/10'
                      )}>{d.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
                    {d.estimate && <p className="text-xs text-orange-400 font-medium">{d.estimate}</p>}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Cost Signals ── */}
      {qi.costSignals.length > 0 && (
        <Card className="neon-border">
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setCostOpen(o => !o)}>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              Cost Signal Analysis
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500 bg-red-500/10">
                  {qi.costSignals.filter(s => s.category === 'direct').length} direct
                </Badge>
                <Badge variant="outline" className="text-[10px] border-orange-400/30 text-orange-400 bg-orange-400/10">
                  {qi.costSignals.filter(s => s.category === 'hidden').length} hidden
                </Badge>
                {costOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardTitle>
          </CardHeader>
          {costOpen && (
            <CardContent className="space-y-4">
              {(['direct', 'hidden'] as const).map(cat => {
                const signals = qi.costSignals.filter(s => s.category === cat);
                if (signals.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {cat === 'direct' ? 'Direct Costs' : 'Hidden Costs'}
                    </p>
                    <div className="space-y-2">
                      {signals.map((s, i) => (
                        <div key={i} className={cn('rounded-lg border p-3',
                          s.severity === 'high'   ? 'border-red-500/30 bg-red-500/5' :
                          s.severity === 'medium' ? 'border-yellow-400/20 bg-yellow-400/5' :
                                                     'border-border/30 bg-muted/10'
                        )}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold">{s.label}</span>
                            {s.estimatedImpact && (
                              <span className="text-xs font-mono text-orange-400 shrink-0">{s.estimatedImpact}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Decision Defensibility Notes ── */}
      <Card className="neon-border border-primary/20">
        <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setDefOpen(o => !o)}>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Decision Defensibility Notes
            <Badge variant="outline" className={cn('ml-auto text-[10px]',
              qi.defensibilityNote.confidence === 'high'   ? 'border-green-500/30 text-green-400 bg-green-500/10' :
              qi.defensibilityNote.confidence === 'medium' ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' :
                                                              'border-red-500/30 text-red-500 bg-red-500/10'
            )}>
              {qi.defensibilityNote.confidence.charAt(0).toUpperCase() + qi.defensibilityNote.confidence.slice(1)} Confidence · {qi.defensibilityNote.confidenceScore}/100
            </Badge>
            {defOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {defOpen && (
          <CardContent className="space-y-4">

            {/* Why */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">Why This Recommendation Exists</p>
              <p className="text-sm leading-relaxed">{qi.defensibilityNote.why}</p>
            </div>

            {/* Confidence bar */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confidence Level</p>
              <div className="flex items-center gap-3">
                <Progress value={qi.defensibilityNote.confidenceScore} className="flex-1 h-2" />
                <span className={cn('text-sm font-bold shrink-0',
                  qi.defensibilityNote.confidence === 'high'   ? 'text-green-400' :
                  qi.defensibilityNote.confidence === 'medium' ? 'text-yellow-400' : 'text-red-500'
                )}>{qi.defensibilityNote.confidenceScore}/100</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Based on data volume, field completeness, and longitudinal coverage</p>
            </div>

            {/* Evidence */}
            {qi.defensibilityNote.evidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Evidence Used
                </p>
                <ul className="space-y-1">
                  {qi.defensibilityNote.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-green-400 shrink-0">✓</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assumptions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />Assumptions
              </p>
              <ul className="space-y-1">
                {qi.defensibilityNote.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/50 shrink-0">—</span>{a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Intervention Path */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />Recommended Intervention Path
              </p>
              <ol className="space-y-2">
                {qi.defensibilityNote.interventionPath.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

          </CardContent>
        )}
      </Card>

      {/* ── Longitudinal Save ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/20 pt-4">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          <span>{savedAt ? `Snapshot saved at ${savedAt}` : 'Save findings for longitudinal trend analysis'}</span>
        </div>
        <button
          onClick={saveSnapshot}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {saving
            ? <><Clock className="w-3.5 h-3.5 animate-spin" />Saving…</>
            : <><AlertTriangle className="w-3.5 h-3.5" />Save Snapshot</>}
        </button>
      </div>

    </div>
  );
}
