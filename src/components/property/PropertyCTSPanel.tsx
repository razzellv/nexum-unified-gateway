import type { PropertyCTSInsight } from '@/types/property';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIM_COLORS: Record<PropertyCTSInsight['dimension'], { text: string; border: string; bg: string }> = {
  reliability:  { text: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/5' },
  relevance:    { text: 'text-purple-400',  border: 'border-purple-400/30',  bg: 'bg-purple-400/5' },
  scalability:  { text: 'text-[#00FFE1]',   border: 'border-[#00FFE1]/30',   bg: 'bg-[#00FFE1]/5' },
  volatility:   { text: 'text-yellow-400',  border: 'border-yellow-400/30',  bg: 'bg-yellow-400/5' },
  validation:   { text: 'text-green-400',   border: 'border-green-400/30',   bg: 'bg-green-400/5' },
};

const SCORE_COLOR = (s: number) =>
  s >= 85 ? 'text-green-400' : s >= 70 ? 'text-yellow-400' : s >= 50 ? 'text-orange-400' : 'text-red-400';

const TrendIcon = ({ trend }: { trend: PropertyCTSInsight['trend'] }) => {
  if (trend === 'improving') return <TrendingUp className="w-3 h-3 text-green-400" />;
  if (trend === 'declining') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-yellow-400" />;
};

interface Props {
  insights: PropertyCTSInsight[];
  compact?: boolean;
}

export function PropertyCTSPanel({ insights, compact = false }: Props) {
  const avgScore = Math.round(insights.reduce((s, i) => s + i.score, 0) / Math.max(insights.length, 1));

  return (
    <Card className="border-[#00FFE1]/20 bg-[#00FFE1]/2">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-[#00FFE1]">
            <ShieldCheck className="w-3.5 h-3.5" />
            CTS™ — Corrective Tracking Analysis
            <Badge variant="outline" className="text-[10px] border-[#00FFE1]/30 text-[#00FFE1] ml-1">
              Property Intelligence
            </Badge>
          </CardTitle>
          <div className={cn('text-lg font-bold', SCORE_COLOR(avgScore))}>
            {avgScore}<span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Portfolio operational health cross-referenced across reliability, relevance, scalability, volatility, and validation.
          Aligned to institutional property management and real estate investment standards.
        </p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          {insights.map(insight => {
            const colors = DIM_COLORS[insight.dimension];
            return (
              <div key={insight.dimension} className={cn('border rounded-lg p-3', colors.border, colors.bg)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wider', colors.text)}>
                    {insight.dimension}
                  </span>
                  <span className={cn('text-base font-bold', SCORE_COLOR(insight.score))}>
                    {insight.score}
                  </span>
                </div>
                <Progress value={insight.score} className="h-1 mb-2" />
                <div className="flex items-center gap-1 mb-1.5">
                  <TrendIcon trend={insight.trend} />
                  <span className="text-[10px] text-muted-foreground capitalize">{insight.trend}</span>
                </div>
                <div className={cn('text-[10px] font-medium mb-1', colors.text)}>{insight.keyMetric}</div>
                {!compact && (
                  <div className="text-[10px] text-muted-foreground italic line-clamp-2">
                    {insight.interpretation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {insights.map(insight => (
                insight.correctiveActions.length > 0 && (
                  <div key={`ca-${insight.dimension}`} className="space-y-1">
                    <div className={cn('text-[10px] font-semibold uppercase tracking-wider', DIM_COLORS[insight.dimension].text)}>
                      {insight.dimension} — Corrective Actions
                    </div>
                    {insight.correctiveActions.slice(0, 2).map((a, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                        <span className="text-orange-400 mt-0.5 shrink-0">›</span>{a}
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#00FFE1] mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Preserved Knowledge
              </div>
              {insights.flatMap(i => i.preservedKnowledge).slice(0, 5).map((k, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-[#00FFE1] mt-0.5 shrink-0" />{k}
                </div>
              ))}
            </div>

            <div className="mt-3 border-t border-white/5 pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Benchmark Comparison
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {insights.map(i => (
                  <div key={`bm-${i.dimension}`} className="text-[10px] text-muted-foreground">
                    <span className={cn('font-medium', DIM_COLORS[i.dimension].text)}>{i.dimension}: </span>
                    {i.benchmarkComparison}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
