import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield, ClipboardCheck, Brain, TrendingUp, AlertTriangle,
  AlertOctagon, Wrench, Leaf, Briefcase, BookOpen,
  ChevronRight, Activity, Target, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GovScores {
  infrastructure: number;
  operational: number;
  decision: number;
  workforce: number;
  compliance: number;
  capitalPlanning: number;
  emergency: number;
  environmental: number;
}

const DEFAULT_SCORES: GovScores = {
  infrastructure: 0,
  operational: 0,
  decision: 0,
  workforce: 0,
  compliance: 0,
  capitalPlanning: 0,
  emergency: 0,
  environmental: 0,
};

function scoreColor(n: number): string {
  if (n >= 80) return 'text-emerald-400';
  if (n >= 60) return 'text-amber-400';
  if (n >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBorderBg(n: number): string {
  if (n >= 80) return 'border-emerald-500/30 bg-emerald-500/10';
  if (n >= 60) return 'border-amber-500/30 bg-amber-500/10';
  if (n >= 40) return 'border-orange-500/30 bg-orange-500/10';
  return 'border-red-500/30 bg-red-500/10';
}

function readinessLabel(n: number): string {
  if (n >= 80) return 'High Readiness';
  if (n >= 60) return 'Moderate Readiness';
  if (n >= 40) return 'Developing';
  return 'Critical Gaps';
}

const SUB_PAGES = [
  { title: 'Gov Assessment', href: '/gov-assessment', icon: ClipboardCheck, desc: 'Complete the scored readiness assessment across 6 categories', key: null, color: 'text-blue-400' },
  { title: 'Knowledge Preservation', href: '/gov-knowledge', icon: Brain, desc: 'Track critical employee knowledge at retirement risk', key: 'decision', color: 'text-violet-400' },
  { title: 'Capital Planning', href: '/gov-capital-planning', icon: TrendingUp, desc: '1/3/5/10-year capital replacement forecasting', key: 'capitalPlanning', color: 'text-orange-400' },
  { title: 'Deferred Maintenance', href: '/gov-deferred-maintenance', icon: AlertTriangle, desc: 'Track and score deferred maintenance exposure', key: 'infrastructure', color: 'text-red-400' },
  { title: 'Emergency Ops Intel™', href: '/gov-emergency-ops', icon: AlertOctagon, desc: 'Emergency readiness checklist and gap analysis', key: 'emergency', color: 'text-red-500' },
  { title: 'Public Works Intel™', href: '/gov-public-works', icon: Wrench, desc: 'Infrastructure reliability scoring across all systems', key: 'operational', color: 'text-teal-400' },
  { title: 'Environmental Intel™', href: '/gov-environmental', icon: Leaf, desc: 'Environmental compliance and exposure assessment', key: 'environmental', color: 'text-emerald-400' },
  { title: 'Government PMO™', href: '/gov-pmo', icon: Briefcase, desc: 'Multi-phase project management for government programs', key: null, color: 'text-amber-400' },
  { title: 'Decision Registry™', href: '/gov-decision-registry', icon: BookOpen, desc: 'Permanent decision archive with defensibility scoring', key: 'decision', color: 'text-violet-500' },
];

const SCORE_CARDS = [
  { key: 'infrastructure' as keyof GovScores, label: 'Infrastructure Continuity', color: 'text-blue-400', borderBg: 'border-blue-500/30 bg-blue-500/10', icon: Shield },
  { key: 'operational' as keyof GovScores, label: 'Operational Continuity', color: 'text-teal-400', borderBg: 'border-teal-500/30 bg-teal-500/10', icon: Activity },
  { key: 'decision' as keyof GovScores, label: 'Decision Continuity', color: 'text-violet-400', borderBg: 'border-violet-500/30 bg-violet-500/10', icon: BookOpen },
  { key: 'workforce' as keyof GovScores, label: 'Workforce Continuity', color: 'text-amber-400', borderBg: 'border-amber-500/30 bg-amber-500/10', icon: Brain },
  { key: 'compliance' as keyof GovScores, label: 'Compliance Readiness', color: 'text-green-400', borderBg: 'border-green-500/30 bg-green-500/10', icon: ClipboardCheck },
  { key: 'capitalPlanning' as keyof GovScores, label: 'Capital Planning Readiness', color: 'text-orange-400', borderBg: 'border-orange-500/30 bg-orange-500/10', icon: TrendingUp },
  { key: 'emergency' as keyof GovScores, label: 'Emergency Readiness', color: 'text-red-400', borderBg: 'border-red-500/30 bg-red-500/10', icon: AlertOctagon },
  { key: 'environmental' as keyof GovScores, label: 'Environmental Exposure', color: 'text-emerald-400', borderBg: 'border-emerald-500/30 bg-emerald-500/10', icon: Leaf },
];

function generateRisks(scores: GovScores): string[] {
  const risks: string[] = [];
  if (scores.emergency < 5) risks.push('Emergency readiness score critically low — immediate EOP review required');
  if (scores.infrastructure < 5) risks.push('Infrastructure continuity gaps threaten essential service delivery');
  if (scores.workforce < 5) risks.push('Workforce knowledge retention risk — retirements may cause operational disruption');
  if (scores.compliance < 5) risks.push('Compliance posture below acceptable threshold — regulatory exposure elevated');
  if (scores.capitalPlanning < 5) risks.push('Capital planning data insufficient to support budget justification');
  if (scores.decision < 5) risks.push('Decision continuity gaps expose agency to leadership transition vulnerability');
  if (scores.operational < 5) risks.push('SOPs and EOPs need review — operational continuity at risk');
  if (scores.environmental < 5) risks.push('Environmental compliance gaps may trigger regulatory enforcement');
  return risks.slice(0, 5);
}

function generateOpportunities(scores: GovScores): string[] {
  const opps: string[] = [];
  if (scores.emergency >= 8) opps.push('Strong emergency readiness — leverage as model for regional mutual aid agreements');
  if (scores.infrastructure >= 8) opps.push('Infrastructure documentation mature — ready for capital grant applications');
  if (scores.compliance >= 8) opps.push('High compliance posture — position agency as regulatory compliance leader');
  if (scores.capitalPlanning >= 8) opps.push('Capital planning data strong — pursue state infrastructure funding opportunities');
  if (scores.decision >= 8) opps.push('Decision registry complete — use as leadership transition planning asset');
  if (scores.workforce >= 8) opps.push('Workforce continuity documented — publish succession planning as best practice');
  opps.push('Complete all assessment categories to generate a full Government Readiness Index™ score');
  opps.push('Share readiness data with governing body to support budget requests');
  opps.push('Use Knowledge Preservation module to capture retiring employee expertise');
  return opps.slice(0, 5);
}

export default function GovIntelligenceHub() {
  const navigate = useNavigate();
  const [scores, setScores] = useState<GovScores>(DEFAULT_SCORES);
  const [agencyName, setAgencyName] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('nexum_gov_scores');
    if (raw) {
      try { setScores({ ...DEFAULT_SCORES, ...JSON.parse(raw) }); } catch { /* ignore */ }
    }
    const name = localStorage.getItem('nexum_gov_agency_name') || '';
    setAgencyName(name);
  }, []);

  const totalPossible = 8 * 13;
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const readinessIndex = Math.round((totalScore / totalPossible) * 100);

  const risks = generateRisks(scores);
  const opportunities = generateOpportunities(scores);

  const gaugeColor = readinessIndex >= 80 ? '#34d399' : readinessIndex >= 60 ? '#fbbf24' : readinessIndex >= 40 ? '#fb923c' : '#f87171';

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-7 h-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Government Intelligence Hub™</h1>
            </div>
            {agencyName && <p className="text-muted-foreground text-sm ml-10">{agencyName}</p>}
            <p className="text-muted-foreground text-sm ml-10">Executive command center for government facility readiness</p>
          </div>
          <Button onClick={() => navigate('/gov-assessment')} className="shrink-0">
            <Target className="w-4 h-4 mr-2" />
            Start Assessment
          </Button>
        </div>

        {/* Government Readiness Index™ Gauge */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Government Readiness Index™</h2>
              {/* Circular gauge */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth="10"
                    strokeDasharray={`${(readinessIndex / 100) * 263.9} 263.9`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold" style={{ color: gaugeColor }}>{readinessIndex}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Badge className={cn('text-sm px-3 py-1', scoreBorderBg(readinessIndex), scoreColor(readinessIndex), 'border')}>
                {readinessLabel(readinessIndex)}
              </Badge>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Based on {totalScore} / {totalPossible} points across 8 assessment categories
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 8 Score Cards */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Readiness Sub-Scores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SCORE_CARDS.map(card => {
              const val = scores[card.key];
              const pct = Math.round((val / 13) * 100);
              return (
                <Card key={card.key} className={cn('border', card.borderBg)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className={cn('w-4 h-4', card.color)} />
                      <span className="text-xs font-medium text-foreground leading-tight">{card.label}</span>
                    </div>
                    <div className={cn('text-2xl font-bold', card.color)}>{val}<span className="text-sm text-muted-foreground font-normal">/13</span></div>
                    <Progress value={pct} className="h-1.5 mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Recommendation Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Top 5 Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {risks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Complete your assessment to generate risk insights</p>
              ) : (
                <ul className="space-y-2">
                  {risks.map((r, i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground">
                      <span className="text-red-400 font-bold shrink-0">{i + 1}.</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Top 5 Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {opportunities.map((o, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground">
                    <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                    {o}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Intelligence Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUB_PAGES.map(page => {
              const scoreVal = page.key ? scores[page.key as keyof GovScores] : null;
              return (
                <Card key={page.href} className="border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(page.href)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <page.icon className={cn('w-5 h-5 shrink-0', page.color)} />
                        <span className="text-sm font-semibold text-foreground">{page.title}</span>
                      </div>
                      {scoreVal !== null && (
                        <Badge variant="outline" className={cn('text-xs', scoreColor(Math.round((scoreVal / 13) * 100)))}>
                          {scoreVal}/13
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{page.desc}</p>
                    <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(page.href); }}>
                      Open <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
