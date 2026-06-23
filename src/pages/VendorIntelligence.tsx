import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { NexumPageLoader } from '@/components/global/NexumLoader';
import { useAuth } from '@/hooks/useAuth';
import { getVendors } from '@/lib/nexum-api';
import {
  VendorIntelligenceEngine,
  type VendorIntelligenceSummary,
  type VendorIntelligenceProfile,
  type TechnicianIntelligenceProfile,
} from '@/services/VendorIntelligenceEngine';
import {
  BrainCircuit, ShieldCheck, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Users, Building2, Clock, Zap, Target, Award, BookOpen, Activity,
  RefreshCw, Search, ChevronDown, ChevronUp, Eye, Star,
  AlertOctagon, CheckCircle2, Lightbulb, Network, Database,
  UserCheck, Wrench, BarChart3, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(n: number): string {
  if (n >= 80) return 'text-emerald-400';
  if (n >= 65) return 'text-green-400';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 35) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(n: number): string {
  if (n >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
  if (n >= 65) return 'bg-green-500/10 border-green-500/30';
  if (n >= 50) return 'bg-yellow-500/10 border-yellow-500/30';
  if (n >= 35) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function riskColor(level: string): string {
  if (level === 'high')   return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (level === 'medium') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  return 'text-green-400 bg-green-500/10 border-green-500/30';
}

function ratingBadge(rating: string): string {
  if (rating === 'Institutional Asset') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  if (rating === 'High Performer')       return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (rating === 'Reliable Partner')     return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (rating === 'Developing')           return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

function famBadge(label: string): string {
  if (label === 'Institutional Asset') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  if (label === 'High Familiarity')    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (label === 'Growing Familiarity') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (label === 'Low Familiarity')     return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function trendIcon(dir: string) {
  if (dir === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (dir === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ── Score Bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className={cn('font-bold', scoreColor(value))}>{value}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-muted-foreground/60">{(weight * 100).toFixed(0)}%</span>
        </span>
      </div>
      <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', value >= 80 ? 'bg-emerald-500' : value >= 65 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : value >= 35 ? 'bg-orange-500' : 'bg-red-500')}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── VIS Gauge ─────────────────────────────────────────────────────────────────

function VISGauge({ score, rating, size = 'md' }: { score: number; rating: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-24 h-24 text-2xl' : size === 'sm' ? 'w-12 h-12 text-sm' : 'w-16 h-16 text-base';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('rounded-full border-4 flex items-center justify-center font-bold', sz, scoreBg(score), score >= 80 ? 'border-emerald-500/40' : score >= 65 ? 'border-green-500/40' : score >= 50 ? 'border-yellow-500/40' : score >= 35 ? 'border-orange-500/40' : 'border-red-500/40')}>
        <span className={scoreColor(score)}>{score}</span>
      </div>
      {size !== 'sm' && (
        <Badge className={cn('text-[10px] border', ratingBadge(rating))}>{rating}</Badge>
      )}
    </div>
  );
}

// ── Vendor Card (collapsed + expanded) ────────────────────────────────────────

function VendorCard({ profile }: { profile: VendorIntelligenceProfile }) {
  const [expanded, setExpanded] = useState(false);

  const SCORE_DIMS = [
    { label: 'Response Intelligence',   value: profile.responseIntelligence.score,   weight: 0.20 },
    { label: 'Diagnostic Intelligence', value: profile.diagnosticIntelligence.score, weight: 0.20 },
    { label: 'Operational Reliability', value: profile.operationalReliability.score, weight: 0.15 },
    { label: 'Knowledge Retention',     value: profile.knowledgeRetention.score,     weight: 0.15 },
    { label: 'Cost Predictability',     value: profile.costPredictability.score,     weight: 0.10 },
    { label: 'Communication Quality',   value: profile.communicationQuality.score,   weight: 0.10 },
    { label: 'Continuity Contribution', value: profile.continuityContribution.score, weight: 0.10 },
  ];

  return (
    <Card className={cn('border transition-all', scoreBg(profile.visScore))}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <VISGauge score={profile.visScore} rating={profile.visRating} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">{profile.vendorName}</h3>
                <p className="text-xs text-muted-foreground">{profile.specialty || 'General Services'}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {profile.risk.singlePointDependency && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Single Point</Badge>
                )}
                <Badge className={cn('text-[10px] border', famBadge(profile.knowledgeRetention.familiarityLabel))}>
                  {profile.knowledgeRetention.familiarityLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {profile.dataConfidence} confidence
                </Badge>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{profile.totalJobsCompleted} jobs</span>
              {profile.totalCallbacks > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-400" />{profile.totalCallbacks} callbacks</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{profile.knowledgeRetention.yearsOfService.toFixed(1)} yr service</span>
              {trendIcon(profile.responseIntelligence.responseTrend)}
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-muted-foreground" />Risk: {profile.risk.riskScore}</span>
            </div>
          </div>

          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Mini score bars (always shown) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SCORE_DIMS.map(d => (
            <ScoreBar key={d.label} label={d.label} value={d.value} weight={d.weight} />
          ))}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
            {/* Response detail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">Response Intelligence</p>
                <p className="text-muted-foreground">Avg Response: <strong>{profile.responseIntelligence.avgResponseTimeHours}h</strong></p>
                <p className="text-muted-foreground">Emergency Readiness: <strong className={scoreColor(profile.responseIntelligence.emergencyReadinessScore)}>{profile.responseIntelligence.emergencyReadinessScore}</strong></p>
                <p className="text-muted-foreground">Priority Compliance: <strong className={scoreColor(profile.responseIntelligence.priorityComplianceScore)}>{profile.responseIntelligence.priorityComplianceScore}%</strong></p>
                <p className="text-muted-foreground flex items-center gap-1">Trend: {trendIcon(profile.responseIntelligence.responseTrend)} {profile.responseIntelligence.responseTrend}</p>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">Diagnostic Intelligence</p>
                <p className="text-muted-foreground">1st-Time Diagnosis: <strong className={scoreColor(profile.diagnosticIntelligence.firstTimeDiagnosisRate)}>{profile.diagnosticIntelligence.firstTimeDiagnosisRate.toFixed(0)}%</strong></p>
                <p className="text-muted-foreground">Repeat Failure Rate: <strong>{profile.diagnosticIntelligence.repeatFailureRate.toFixed(0)}%</strong></p>
                <p className="text-muted-foreground">Callbacks/10 Jobs: <strong>{profile.diagnosticIntelligence.callbacksPerTenJobs}</strong></p>
                <p className="text-muted-foreground">Root Cause Score: <strong className={scoreColor(profile.diagnosticIntelligence.rootCauseSuccessScore)}>{profile.diagnosticIntelligence.rootCauseSuccessScore}</strong></p>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">Continuity Contribution</p>
                <p className="text-muted-foreground">Proactive ID: <strong className={scoreColor(profile.continuityContribution.proactiveIdentificationScore)}>{profile.continuityContribution.proactiveIdentificationScore}</strong></p>
                <p className="text-muted-foreground">Knowledge Preservation: <strong className={scoreColor(profile.continuityContribution.knowledgePreservationScore)}>{profile.continuityContribution.knowledgePreservationScore}</strong></p>
                <p className="text-muted-foreground">Onboarding Support: <strong className={scoreColor(profile.continuityContribution.onboardingAssistanceScore)}>{profile.continuityContribution.onboardingAssistanceScore}</strong></p>
                <p className="text-muted-foreground">Lesson Learning: <strong className={scoreColor(profile.continuityContribution.lessonLearningScore)}>{profile.continuityContribution.lessonLearningScore}</strong></p>
              </div>
            </div>

            {/* Risk flags */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Risk Factors</p>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn('text-[10px] border', riskColor(profile.risk.turnoverRisk))}>Turnover Risk: {profile.risk.turnoverRisk}</Badge>
                <Badge className={cn('text-[10px] border', riskColor(profile.risk.retirementRisk))}>Retirement Risk: {profile.risk.retirementRisk}</Badge>
                <Badge className={cn('text-[10px] border', riskColor(profile.risk.knowledgeConcentration))}>Knowledge Concentration: {profile.risk.knowledgeConcentration}</Badge>
                <Badge className="text-[10px] bg-muted text-muted-foreground border-border">{profile.risk.dependencyCategory} dependency</Badge>
              </div>
            </div>

            {/* AI insights */}
            {profile.aiInsights.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5 text-primary" /> AI Insights</p>
                <div className="space-y-1">
                  {profile.aiInsights.map((ins, i) => (
                    <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">{ins}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Systems & assets */}
            {(profile.systemsServiced.length > 0 || profile.assetsServiced.length > 0) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {profile.systemsServiced.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Systems Serviced</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.systemsServiced.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {profile.assetsServiced.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Assets Serviced</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.assetsServiced.slice(0, 6).map(a => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                      {profile.assetsServiced.length > 6 && <Badge variant="outline" className="text-[10px]">+{profile.assetsServiced.length - 6}</Badge>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Technician Card ───────────────────────────────────────────────────────────

function TechCard({ tech }: { tech: TechnicianIntelligenceProfile }) {
  return (
    <Card className="border border-border/60 bg-card/60">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{tech.name}</p>
            <p className="text-xs text-muted-foreground">{tech.vendorName}</p>
          </div>
          <VISGauge score={tech.overallScore} rating="" size="sm" />
        </div>
        <Badge className={cn('text-[10px] border', famBadge(tech.familiarityLabel))}>{tech.familiarityLabel}</Badge>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="space-y-1">
            <ScoreBar label="Diagnostic Accuracy" value={tech.diagnosticAccuracy} weight={0} />
            <ScoreBar label="Reliability" value={tech.reliabilityScore} weight={0} />
          </div>
          <div className="space-y-1">
            <ScoreBar label="Knowledge" value={tech.knowledgeScore} weight={0} />
            <ScoreBar label="Continuity" value={tech.continuityScore} weight={0} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <span>{tech.visitsCompleted} visits</span>
          {tech.assetsServiced.length > 0 && <span>{tech.assetsServiced.length} assets</span>}
          {tech.lastVisit && <span>Last: {new Date(tech.lastVisit).toLocaleDateString()}</span>}
        </div>
        {tech.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tech.certifications.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Risk Heatmap ──────────────────────────────────────────────────────────────

function RiskHeatmap({ profiles }: { profiles: VendorIntelligenceProfile[] }) {
  const quadrants = [
    { label: 'Institutional Assets',     xMin: 60, yMin: 60, desc: 'High VIS + High Knowledge', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    { label: 'Reliable Performers',      xMin: 60, yMin: 0,  yMax: 60, desc: 'High VIS + Lower Knowledge', color: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    { label: 'Knowledge Concentration',  xMin: 0,  xMax: 60, yMin: 60, desc: 'Lower VIS + High Knowledge', color: 'bg-orange-500/10 border-orange-500/30 text-orange-300' },
    { label: 'Development Priority',     xMin: 0,  xMax: 60, yMin: 0,  yMax: 60, desc: 'Lower VIS + Lower Knowledge', color: 'bg-red-500/10 border-red-500/30 text-red-300' },
  ];

  const classify = (p: VendorIntelligenceProfile) => {
    const highVIS  = p.visScore >= 60;
    const highKno  = p.knowledgeRetention.score >= 60;
    if (highVIS && highKno)  return 0;
    if (highVIS && !highKno) return 1;
    if (!highVIS && highKno) return 2;
    return 3;
  };

  const grouped = quadrants.map((q, qi) => ({
    ...q,
    vendors: profiles.filter(p => classify(p) === qi),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vendor Risk Heatmap</h3>
          <p className="text-xs text-muted-foreground">Classified by VIS performance × knowledge retention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grouped.map(q => (
          <div key={q.label} className={cn('border rounded-lg p-3 space-y-2', q.color)}>
            <div>
              <p className="text-xs font-bold">{q.label}</p>
              <p className="text-[10px] opacity-70">{q.desc}</p>
            </div>
            {q.vendors.length === 0 ? (
              <p className="text-[10px] opacity-50 italic">No vendors in this quadrant</p>
            ) : (
              <div className="space-y-1">
                {q.vendors.map(v => (
                  <div key={v.vendorId} className="flex items-center justify-between text-xs bg-black/20 rounded px-2 py-1">
                    <span className="font-medium">{v.vendorName}</span>
                    <span className="opacity-70">VIS {v.visScore} · K {v.knowledgeRetention.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Risk Concentration */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Concentration Flags</h4>
        <div className="space-y-1.5">
          {profiles.filter(p => p.risk.singlePointDependency).map(p => (
            <div key={p.vendorId} className="flex items-center justify-between text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              <span className="flex items-center gap-2"><AlertOctagon className="w-3.5 h-3.5 text-red-400" /><strong>{p.vendorName}</strong> — Single Point of Dependency</span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Critical</Badge>
            </div>
          ))}
          {profiles.filter(p => p.risk.turnoverRisk === 'high').map(p => (
            <div key={p.vendorId} className="flex items-center justify-between text-xs bg-orange-500/10 border border-orange-500/20 rounded px-3 py-2">
              <span className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /><strong>{p.vendorName}</strong> — High Turnover Risk</span>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">High Risk</Badge>
            </div>
          ))}
          {profiles.filter(p => p.risk.knowledgeConcentration === 'high').map(p => (
            <div key={p.vendorId} className="flex items-center justify-between text-xs bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
              <span className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-yellow-400" /><strong>{p.vendorName}</strong> — Knowledge Concentration Risk</span>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Moderate</Badge>
            </div>
          ))}
          {profiles.filter(p => p.risk.singlePointDependency === false && p.risk.turnoverRisk !== 'high' && p.risk.knowledgeConcentration !== 'high').length === profiles.length && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> No critical risk concentrations detected in vendor portfolio
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Decision Intelligence Panel ────────────────────────────────────────────────

function DecisionPanel({ summary }: { summary: VendorIntelligenceSummary }) {
  const riskVendors   = summary.profiles.filter(p => p.risk.riskScore >= 60);
  const singlePoints  = summary.profiles.filter(p => p.risk.singlePointDependency);
  const highKnowledge = summary.profiles.filter(p => p.knowledgeRetention && p.knowledgeRetention.score >= 70);
  const lowPerformers = summary.profiles.filter(p => p.visScore < 45);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Executive Decision Intelligence</h3>
        <p className="text-xs text-muted-foreground">Operational dependency, continuity exposure, and strategic vendor risk</p>
      </div>

      {/* Portfolio summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Portfolio VIS', value: summary.avgVIS, icon: Award, sub: 'avg score', color: scoreColor(summary.avgVIS) },
          { label: 'Portfolio Risk', value: summary.portfolioRiskScore, icon: Shield, sub: 'risk index', color: summary.portfolioRiskScore >= 60 ? 'text-red-400' : summary.portfolioRiskScore >= 40 ? 'text-orange-400' : 'text-green-400' },
          { label: 'Continuity Score', value: summary.portfolioContinuityScore, icon: Network, sub: 'contribution', color: scoreColor(summary.portfolioContinuityScore) },
          { label: 'High-Risk Vendors', value: riskVendors.length, icon: AlertOctagon, sub: 'need attention', color: riskVendors.length > 0 ? 'text-red-400' : 'text-green-400' },
        ].map(c => (
          <Card key={c.label} className="border border-border/40 bg-card/60">
            <CardContent className="p-3 text-center">
              <c.icon className={cn('w-5 h-5 mx-auto mb-1', c.color)} />
              <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
              <p className="text-[10px] font-medium text-foreground">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exposure panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border border-red-500/20 bg-red-500/5">
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-red-400 flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5" />Operational Dependency Risk</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {singlePoints.length === 0 ? (
              <p className="text-xs text-muted-foreground">No single-point-of-dependency vendors identified.</p>
            ) : singlePoints.map(p => (
              <div key={p.vendorId} className="text-xs">
                <span className="font-medium text-foreground">{p.vendorName}</span>
                <span className="text-muted-foreground"> — {p.specialty || 'Multi-system'} · {p.systemsServiced.length} systems</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-orange-500/20 bg-orange-500/5">
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-orange-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" />Knowledge Loss Exposure</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {highKnowledge.length === 0 ? (
              <p className="text-xs text-muted-foreground">No vendors with elevated knowledge concentration.</p>
            ) : highKnowledge.map(p => (
              <div key={p.vendorId} className="text-xs">
                <span className="font-medium text-foreground">{p.vendorName}</span>
                <span className="text-muted-foreground"> — {p.knowledgeRetention.yearsOfService.toFixed(0)}yr service · {p.knowledgeRetention.familiarityLabel}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Contractor Turnover Exposure</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {riskVendors.length === 0 ? (
              <p className="text-xs text-muted-foreground">Contractor portfolio is stable.</p>
            ) : riskVendors.map(p => (
              <div key={p.vendorId} className="text-xs">
                <span className="font-medium text-foreground">{p.vendorName}</span>
                <span className="text-muted-foreground"> — Risk score: {p.risk.riskScore} · {p.risk.turnoverRisk} turnover risk</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-purple-500/20 bg-purple-500/5">
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-purple-400 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Operational Resilience Score</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Portfolio Continuity</span>
              <span className={cn('font-bold', scoreColor(summary.portfolioContinuityScore))}>{summary.portfolioContinuityScore}/100</span>
            </div>
            <Progress value={summary.portfolioContinuityScore} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {summary.portfolioContinuityScore >= 70 ? 'Vendor portfolio strongly supports operational continuity.'
               : summary.portfolioContinuityScore >= 50 ? 'Moderate continuity support. Consider knowledge documentation requirements.'
               : 'Low continuity contribution. Immediate action needed to reduce institutional knowledge risk.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Portfolio Insights */}
      {summary.aiPortfolioInsights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5 text-primary" />Portfolio Intelligence Findings</h4>
          {summary.aiPortfolioInsights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{ins}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom action items */}
      {lowPerformers.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendors Requiring Performance Review</h4>
          {lowPerformers.map(p => (
            <div key={p.vendorId} className="flex items-center justify-between text-xs bg-muted/30 border border-border/40 rounded px-3 py-2">
              <span><strong>{p.vendorName}</strong> — VIS {p.visScore} ({p.visRating})</span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Review</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function VendorIntelligence() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<VendorIntelligenceSummary | null>(null);
  const [computing, setComputing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'vis' | 'knowledge' | 'risk' | 'continuity'>('vis');

  const run = useCallback(async () => {
    setComputing(true);
    try {
      // Load vendors from API first, cache to localStorage for engine
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod'}/vendors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token')}` },
      }).then(r => r.ok ? r.json() : { vendors: [] }).catch(() => ({ vendors: [] }));
      const vendors = res.vendors || res.items || res.data || [];
      if (vendors.length > 0) {
        try { localStorage.setItem('nexum_vendors', JSON.stringify(vendors)); } catch {}
      }
    } catch {}
    const result = VendorIntelligenceEngine.compute();
    setSummary(result);
    setComputing(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    // Try cached first, then compute
    const cached = VendorIntelligenceEngine.getLast();
    if (cached.totalVendors > 0) setSummary(cached);
    run();
    const onUpdate = () => setSummary(VendorIntelligenceEngine.getLast());
    window.addEventListener('nexum_vendor_intelligence_update', onUpdate);
    return () => window.removeEventListener('nexum_vendor_intelligence_update', onUpdate);
  }, [isAuthenticated, authLoading, run]);

  if (authLoading) return <NexumPageLoader message="Authenticating..." />;

  const profiles = summary?.profiles ?? [];
  const allTechs = profiles.flatMap(p => p.technicians);

  const filtered = profiles
    .filter(p => !search || p.vendorName.toLowerCase().includes(search.toLowerCase()) || p.specialty.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === 'knowledge'   ? b.knowledgeRetention.score - a.knowledgeRetention.score
      : sortBy === 'risk'      ? b.risk.riskScore - a.risk.riskScore
      : sortBy === 'continuity'? b.continuityContribution.score - a.continuityContribution.score
      : b.visScore - a.visScore
    );

  const techsFiltered = allTechs
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.vendorName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.overallScore - a.overallScore);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Vendor Intelligence™</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Measure and preserve operational knowledge, service quality, reliability, and continuity generated by every external service provider.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/vendors')} className="border-border/40 text-xs">
              <Building2 className="w-3.5 h-3.5 mr-1.5" /> Vendor Hub
            </Button>
            <Button size="sm" onClick={run} disabled={computing} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', computing && 'animate-spin')} />
              {computing ? 'Computing…' : 'Re-compute'}
            </Button>
          </div>
        </div>

        {/* Top scorecards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Vendors Analyzed', value: summary.totalVendors, sub: 'in portfolio', icon: Building2, color: 'text-primary' },
              { label: 'Portfolio VIS', value: summary.avgVIS, sub: 'avg score', icon: Award, color: scoreColor(summary.avgVIS) },
              { label: 'Service Technicians', value: allTechs.length, sub: 'tracked', icon: UserCheck, color: 'text-cyan-400' },
              { label: 'High-Risk Vendors', value: summary.highRiskVendors.length, sub: 'need review', icon: AlertTriangle, color: summary.highRiskVendors.length > 0 ? 'text-red-400' : 'text-green-400' },
            ].map(c => (
              <Card key={c.label} className="border border-border/40 bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <c.icon className={cn('w-8 h-8 shrink-0', c.color)} />
                  <div>
                    <p className={cn('text-2xl font-bold', c.color)}>{c.value}</p>
                    <p className="text-xs font-medium text-foreground">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No vendors state */}
        {!computing && summary && summary.totalVendors === 0 && (
          <Card className="border border-border/40 bg-card/60">
            <CardContent className="py-16 text-center space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Vendor Data Found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Add vendors through the Vendor Hub to begin generating Vendor Intelligence Scores and operational profiles.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendors')}>Go to Vendor Hub</Button>
            </CardContent>
          </Card>
        )}

        {/* Main tabs */}
        {summary && summary.totalVendors > 0 && (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/30">
              <TabsTrigger value="dashboard" className="text-xs">Intelligence Dashboard</TabsTrigger>
              <TabsTrigger value="scores" className="text-xs">
                Vendor Scores
                {summary.totalVendors > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[9px]">{summary.totalVendors}</span>}
              </TabsTrigger>
              <TabsTrigger value="technicians" className="text-xs">
                Technician Intelligence
                {allTechs.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[9px]">{allTechs.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="risk" className="text-xs">Risk Analysis</TabsTrigger>
              <TabsTrigger value="knowledge" className="text-xs">Knowledge Map</TabsTrigger>
              <TabsTrigger value="decision" className="text-xs">Decision Intelligence</TabsTrigger>
            </TabsList>

            {/* ── TAB 1: Dashboard ─────────────────────────────────────────── */}
            <TabsContent value="dashboard" className="space-y-4">
              {/* Rankings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Top Performers */}
                <Card className="border border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Award className="w-3.5 h-3.5" />Top Performers</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {profiles.slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className={cn('font-bold', scoreColor(p.visScore))}>{p.visScore}</span>
                      </div>
                    ))}
                    {profiles.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
                  </CardContent>
                </Card>

                {/* Knowledge Leaders */}
                <Card className="border border-purple-500/20 bg-purple-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-purple-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />Knowledge Leaders</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {[...profiles].sort((a, b) => b.knowledgeRetention.score - a.knowledgeRetention.score).slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className={cn('font-bold', scoreColor(p.knowledgeRetention.score))}>{p.knowledgeRetention.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Response Leaders */}
                <Card className="border border-cyan-500/20 bg-cyan-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Response Leaders</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {[...profiles].sort((a, b) => b.responseIntelligence.score - a.responseIntelligence.score).slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className={cn('font-bold', scoreColor(p.responseIntelligence.score))}>{p.responseIntelligence.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Continuity Contributors */}
                <Card className="border border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-blue-400 flex items-center gap-1.5"><Network className="w-3.5 h-3.5" />Continuity Leaders</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {[...profiles].sort((a, b) => b.continuityContribution.score - a.continuityContribution.score).slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className={cn('font-bold', scoreColor(p.continuityContribution.score))}>{p.continuityContribution.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Cost Predictability */}
                <Card className="border border-green-500/20 bg-green-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-green-400 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Cost Predictability</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {[...profiles].sort((a, b) => b.costPredictability.score - a.costPredictability.score).slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-500/30 text-green-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className={cn('font-bold', scoreColor(p.costPredictability.score))}>{p.costPredictability.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Highest Risk */}
                <Card className="border border-red-500/20 bg-red-500/5">
                  <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold text-red-400 flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5" />Highest Risk</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {[...profiles].sort((a, b) => b.risk.riskScore - a.risk.riskScore).slice(0, 3).map((p, i) => (
                      <div key={p.vendorId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 text-[10px] flex items-center justify-center">{i + 1}</span>{p.vendorName}</span>
                        <span className="font-bold text-red-400">{p.risk.riskScore}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* AI Portfolio Insights */}
              {summary.aiPortfolioInsights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5 text-primary" />AI Portfolio Intelligence</h3>
                  {summary.aiPortfolioInsights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
                      <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{ins}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-vendor AI insights */}
              {profiles.some(p => p.aiInsights.length > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400" />Vendor-Specific Findings</h3>
                  <div className="space-y-1.5">
                    {profiles.flatMap(p => p.aiInsights.map((ins, i) => ({ ins, vendor: p.vendorName, flag: p.visScore >= 70 ? 'positive' : p.visScore < 45 ? 'risk' : 'neutral', key: `${p.vendorId}-${i}` }))).slice(0, 10).map(({ ins, vendor, flag, key }) => (
                      <div key={key} className={cn('flex items-start gap-2 text-xs rounded-lg px-3 py-2 border',
                        flag === 'positive' ? 'bg-emerald-500/5 border-emerald-500/20' : flag === 'risk' ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/30 border-border/40')}>
                        <Lightbulb className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', flag === 'positive' ? 'text-emerald-400' : flag === 'risk' ? 'text-red-400' : 'text-muted-foreground')} />
                        <span className="text-muted-foreground">{ins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── TAB 2: Vendor Scores ─────────────────────────────────────── */}
            <TabsContent value="scores" className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…" className="pl-8 h-8 text-xs bg-muted/30 border-border/40" />
                </div>
                <div className="flex items-center gap-1">
                  {(['vis', 'knowledge', 'risk', 'continuity'] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className={cn('px-2.5 py-1 text-xs rounded-full border transition-colors', sortBy === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground')}>
                      {s === 'vis' ? 'VIS' : s === 'knowledge' ? 'Knowledge' : s === 'risk' ? 'Risk' : 'Continuity'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filtered.map(p => <VendorCard key={p.vendorId} profile={p} />)}
                {filtered.length === 0 && (
                  <Card className="border border-border"><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No vendors match your search.</p></CardContent></Card>
                )}
              </div>
            </TabsContent>

            {/* ── TAB 3: Technician Intelligence ───────────────────────────── */}
            <TabsContent value="technicians" className="space-y-4">
              {allTechs.length === 0 ? (
                <Card className="border border-border"><CardContent className="py-16 text-center space-y-2">
                  <UserCheck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold">No Technicians Tracked Yet</p>
                  <p className="text-xs text-muted-foreground/60">Technician names are captured from contractor install job records. Log jobs in Contractor Installs to build technician profiles.</p>
                </CardContent></Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{techsFiltered.length} technician{techsFiltered.length !== 1 ? 's' : ''} tracked across {profiles.length} vendor{profiles.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {techsFiltered.map(t => <TechCard key={t.id} tech={t} />)}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── TAB 4: Risk Analysis ─────────────────────────────────────── */}
            <TabsContent value="risk" className="space-y-4">
              <RiskHeatmap profiles={profiles} />
            </TabsContent>

            {/* ── TAB 5: Knowledge Map ─────────────────────────────────────── */}
            <TabsContent value="knowledge" className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Facility Familiarity Index</h3>
                <p className="text-xs text-muted-foreground">How well each vendor knows your buildings, systems, equipment, and operational history</p>
              </div>
              <div className="space-y-2">
                {[...profiles].sort((a, b) => b.knowledgeRetention.score - a.knowledgeRetention.score).map(p => (
                  <Card key={p.vendorId} className="border border-border/40 bg-card/60">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-foreground">{p.vendorName}</p>
                            <Badge className={cn('text-[10px] border', famBadge(p.knowledgeRetention.familiarityLabel))}>{p.knowledgeRetention.familiarityLabel}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.knowledgeRetention.yearsOfService.toFixed(1)} years · {p.knowledgeRetention.uniqueAssetsServiced} assets · {p.knowledgeRetention.systemsServiced.length} system types</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <div className="text-center">
                            <p className={cn('font-bold text-base', scoreColor(p.knowledgeRetention.facilityFamiliarityScore))}>{p.knowledgeRetention.facilityFamiliarityScore}</p>
                            <p className="text-[10px] text-muted-foreground">Facility</p>
                          </div>
                          <div className="text-center">
                            <p className={cn('font-bold text-base', scoreColor(p.knowledgeRetention.assetFamiliarityScore))}>{p.knowledgeRetention.assetFamiliarityScore}</p>
                            <p className="text-[10px] text-muted-foreground">Asset</p>
                          </div>
                          <div className="text-center">
                            <p className={cn('font-bold text-base', scoreColor(p.knowledgeRetention.historicalKnowledgeScore))}>{p.knowledgeRetention.historicalKnowledgeScore}</p>
                            <p className="text-[10px] text-muted-foreground">History</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <ScoreBar label="Facility Familiarity" value={p.knowledgeRetention.facilityFamiliarityScore} weight={0} />
                        <ScoreBar label="Asset Familiarity" value={p.knowledgeRetention.assetFamiliarityScore} weight={0} />
                        <ScoreBar label="Historical Knowledge" value={p.knowledgeRetention.historicalKnowledgeScore} weight={0} />
                        <ScoreBar label="Operational Context" value={p.knowledgeRetention.operationalContextScore} weight={0} />
                      </div>
                      {p.knowledgeRetention.systemsServiced.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.knowledgeRetention.systemsServiced.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── TAB 6: Decision Intelligence ─────────────────────────────── */}
            <TabsContent value="decision" className="space-y-4">
              <DecisionPanel summary={summary} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
