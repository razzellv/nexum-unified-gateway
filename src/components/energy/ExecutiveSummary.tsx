import { buildExecutiveSummary, buildCTSInsights } from '@/lib/energy-engine';
import type { EnergyReading, EnergyEvent, CostConfig, CTSInsight } from '@/types/energy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, Zap, Leaf, Target, ShieldCheck, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CTS_COLORS: Record<CTSInsight['dimension'], string> = {
  reliability:  'text-blue-400 border-blue-400/30',
  relevance:    'text-purple-400 border-purple-400/30',
  scalability:  'text-[#00FFE1] border-[#00FFE1]/30',
  volatility:   'text-yellow-400 border-yellow-400/30',
  validation:   'text-green-400 border-green-400/30',
};

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : s >= 40 ? 'text-orange-400' : 'text-red-400';

interface Props {
  readings: EnergyReading[];
  events: EnergyEvent[];
  config: CostConfig;
}

export function ExecutiveSummaryPanel({ readings, events, config }: Props) {
  const summary = buildExecutiveSummary(readings, config);
  const cts     = buildCTSInsights(readings, events);

  const fmtUSD = (v: number) =>
    v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(0)}`;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Utility Cost',   value: fmtUSD(summary.totalCost),       sub: summary.periodLabel,    icon: DollarSign,   color: 'text-yellow-400' },
          { label: 'Total Consumption',    value: `${(summary.totalConsumptionKwh/1000).toFixed(1)}K kWh`, sub: 'Electric YTD', icon: Zap, color: 'text-[#00FFE1]' },
          { label: 'Carbon Footprint',     value: `${(summary.totalCarbonLbs/2000).toFixed(1)} tons`, sub: 'CO₂ equivalent', icon: Leaf, color: 'text-green-400' },
          { label: 'Performance Score',    value: `${summary.performanceScore}/100`, sub: 'Operational efficiency', icon: Target, color: 'text-purple-400' },
        ].map(k => (
          <Card key={k.label} className="border-white/10 bg-white/2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={cn('w-3.5 h-3.5', k.color)} />
                <span className="text-[10px] text-muted-foreground">{k.label}</span>
              </div>
              <div className={cn('text-xl font-bold', k.color)}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Cost Drivers */}
        <Card className="border-white/10">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-yellow-400" />Top Cost Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {summary.topCostDrivers.map((d, i) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground truncate">{d.label}</span>
                  <span className="font-medium text-yellow-400 ml-2">{fmtUSD(d.cost)} <span className="text-muted-foreground">({d.pct}%)</span></span>
                </div>
                <Progress value={d.pct} className="h-1" />
              </div>
            ))}
            {summary.topCostDrivers.length === 0 && (
              <p className="text-xs text-muted-foreground">Log readings to generate cost analysis.</p>
            )}
          </CardContent>
        </Card>

        {/* Budget vs Forecast */}
        <Card className="border-white/10">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-[#00FFE1]" />Budget Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {[
              { label: 'Budget Forecast',     value: fmtUSD(summary.budgetForecast),    sub: 'Annual estimate' },
              { label: '5-Year Projection',   value: fmtUSD(summary.fiveYearProjection),sub: 'At current trajectory' },
              { label: 'Potential Savings',   value: fmtUSD(summary.potentialSavings),  sub: 'From quick wins' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground text-xs">{r.label}</span>
                <div className="text-right">
                  <div className="font-semibold text-[#00FFE1]">{r.value}</div>
                  <div className="text-[10px] text-muted-foreground">{r.sub}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Wins & Risk Areas */}
        <Card className="border-white/10">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {summary.quickWins.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {summary.riskAreas.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Capital Projects */}
      <Card className="border-white/10">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />Capital Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex flex-wrap gap-2">
            {summary.capitalProjects.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs text-purple-400 border-purple-400/30">{p}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTS™ Operational Intelligence */}
      <Card className="border-[#00FFE1]/20 bg-[#00FFE1]/2">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-[#00FFE1]">
            <ShieldCheck className="w-3.5 h-3.5" />CTS™ — Corrective Tracking Analysis
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Operational performance cross-referenced across reliability, relevance, scalability, volatility, and validation.
          </p>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {cts.map(insight => (
              <div key={insight.dimension} className={cn('border rounded-lg p-3', CTS_COLORS[insight.dimension], 'border-opacity-30')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider capitalize">{insight.dimension}</span>
                  <span className={cn('text-base font-bold', SCORE_COLOR(insight.score))}>{insight.score}</span>
                </div>
                <Progress value={insight.score} className="h-1 mb-2" />
                <div className="text-[10px] text-muted-foreground mb-2">
                  Trend: <span className={insight.trend === 'improving' ? 'text-green-400' : insight.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'}>
                    {insight.trend}
                  </span>
                </div>
                {insight.correctiveActions.slice(0, 1).map((a, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground italic">{a}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {cts.flatMap(i => i.preservedKnowledge).slice(0, 4).map((k, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <ShieldCheck className="w-3 h-3 text-[#00FFE1] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
