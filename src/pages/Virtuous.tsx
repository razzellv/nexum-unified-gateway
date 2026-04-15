import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Target, BarChart3, Shield, AlertTriangle, CheckCircle,
  AlertOctagon, ArrowRight, Clock, Zap, FileText, RefreshCw,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
type RiskStatus = 'open' | 'mitigated' | 'monitoring';

interface RiskItem {
  id: string;
  title: string;
  category: string;
  level: RiskLevel;
  status: RiskStatus;
  score: number;
  description: string;
  lastAssessed: string;
  mitigation?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_RISKS: RiskItem[] = [
  {
    id: 'r1', title: 'Boiler Pressure Variance', category: 'Mechanical',
    level: 'critical', status: 'open', score: 91,
    description: 'Operating pressure trending 8% above baseline — safety interlock may activate.',
    lastAssessed: '2026-04-14', mitigation: 'Schedule immediate pressure relief valve inspection.',
  },
  {
    id: 'r2', title: 'HVAC Filter Overdue', category: 'HVAC',
    level: 'high', status: 'open', score: 74,
    description: 'AHU-3 filter replacement 22 days past scheduled date, IAQ degradation risk.',
    lastAssessed: '2026-04-13', mitigation: 'Replace filters and log corrective action.',
  },
  {
    id: 'r3', title: 'Compliance Doc Expiry', category: 'Compliance',
    level: 'high', status: 'monitoring', score: 68,
    description: 'Fire suppression system inspection certificate expires in 18 days.',
    lastAssessed: '2026-04-12', mitigation: 'Schedule third-party inspection before expiry.',
  },
  {
    id: 'r4', title: 'Chiller Efficiency Drop', category: 'Mechanical',
    level: 'medium', status: 'monitoring', score: 52,
    description: 'COP declined 12% over past 30 days — condenser fouling suspected.',
    lastAssessed: '2026-04-11', mitigation: 'Condenser cleaning scheduled for next PM cycle.',
  },
  {
    id: 'r5', title: 'Electrical Panel Load', category: 'Electrical',
    level: 'medium', status: 'open', score: 48,
    description: 'Panel 3B running at 88% capacity — headroom below safe threshold.',
    lastAssessed: '2026-04-10',
  },
  {
    id: 'r6', title: 'Roof Drain Blockage Risk', category: 'Building',
    level: 'low', status: 'mitigated', score: 22,
    description: 'Seasonal debris accumulation — quarterly cleaning completed.',
    lastAssessed: '2026-04-09', mitigation: 'Drains cleared, next service scheduled Q3.',
  },
];

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  low:      { label: 'Low',      color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30' },
};

const STATUS_META: Record<RiskStatus, { label: string; icon: React.ElementType; color: string }> = {
  open:       { label: 'Open',       icon: AlertOctagon, color: 'text-red-400' },
  monitoring: { label: 'Monitoring', icon: Clock,         color: 'text-yellow-400' },
  mitigated:  { label: 'Mitigated',  icon: CheckCircle,   color: 'text-green-400' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Virtuous() {
  const [risks, setRisks]           = useState<RiskItem[]>(MOCK_RISKS);
  const [filter, setFilter]         = useState<'all' | RiskLevel | RiskStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const mitigate = (id: string) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, status: 'mitigated' as RiskStatus } : r));
  };

  const overallScore = Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length);
  const openCount      = risks.filter(r => r.status === 'open').length;
  const criticalCount  = risks.filter(r => r.level === 'critical').length;
  const mitigatedCount = risks.filter(r => r.status === 'mitigated').length;

  const filtered = risks.filter(r => {
    if (filter === 'all') return true;
    return r.level === filter || r.status === filter;
  });

  const FILTERS = [
    { key: 'all',       label: 'All Risks' },
    { key: 'critical',  label: 'Critical' },
    { key: 'high',      label: 'High' },
    { key: 'medium',    label: 'Medium' },
    { key: 'open',      label: 'Open' },
    { key: 'mitigated', label: 'Mitigated' },
  ] as const;

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Virtuous Risk Analyzer</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">AI-Assisted</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Risk identification, scoring, and mitigation tracking</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh Analysis
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Composite Risk Score', value: `${overallScore}`,
              icon: BarChart3,
              color: overallScore >= 70 ? 'text-red-400' : overallScore >= 50 ? 'text-yellow-400' : 'text-green-400',
              sub: overallScore >= 70 ? 'High risk environment' : overallScore >= 50 ? 'Moderate risk' : 'Well managed',
            },
            { label: 'Open Risks',      value: openCount,      icon: AlertTriangle, color: openCount > 0 ? 'text-orange-400' : 'text-green-400',  sub: 'require action' },
            { label: 'Critical Items',  value: criticalCount,  icon: AlertOctagon,  color: criticalCount > 0 ? 'text-red-400' : 'text-green-400',  sub: 'immediate attention' },
            { label: 'Mitigated',       value: mitigatedCount, icon: Shield,        color: 'text-green-400', sub: 'resolved this period' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="neon-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Risk score breakdown */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map(level => {
                const count = risks.filter(r => r.level === level).length;
                const meta  = RISK_META[level];
                const pct   = risks.length > 0 ? Math.round((count / risks.length) * 100) : 0;
                return (
                  <div key={level} className={cn('p-3 rounded-lg border', meta.bg, meta.border)}>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider mb-1', meta.color)}>{meta.label}</p>
                    <p className={cn('text-2xl font-bold', meta.color)}>{count}</p>
                    <Progress value={pct} className="h-1.5 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters + Risk list */}
        <div>
          <div className="flex gap-1 mb-4 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                  filter === f.key
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map(risk => {
              const levelMeta  = RISK_META[risk.level];
              const statusMeta = STATUS_META[risk.status];
              const StatusIcon = statusMeta.icon;
              return (
                <Card key={risk.id} className={cn('neon-border transition-all', risk.level === 'critical' && 'border-red-500/20')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={cn('text-[10px]', levelMeta.color, levelMeta.border)}>
                            {levelMeta.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{risk.category}</Badge>
                          <span className={cn('flex items-center gap-1 text-[10px]', statusMeta.color)}>
                            <StatusIcon className="w-3 h-3" />{statusMeta.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold">{risk.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{risk.description}</p>
                        {risk.mitigation && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <Zap className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-primary/80">{risk.mitigation}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                          <FileText className="w-3 h-3" />Last assessed: {risk.lastAssessed}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <p className={cn('text-xl font-bold', levelMeta.color)}>{risk.score}</p>
                          <p className="text-[10px] text-muted-foreground">risk score</p>
                        </div>
                        {risk.status !== 'mitigated' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-green-400/30 text-green-400 hover:bg-green-400/10"
                            onClick={() => mitigate(risk.id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />Mark Mitigated
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No risks match this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="glass-panel rounded-2xl p-6 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-bold">Full Virtuous Intelligence</p>
              <p className="text-sm text-muted-foreground mt-1">Upgrade to Business or higher to unlock AI-predicted risk scoring, automated mitigation playbooks, and audit-ready risk reports.</p>
            </div>
            <Button className="bg-primary text-primary-foreground shrink-0">
              Unlock Full Access <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
