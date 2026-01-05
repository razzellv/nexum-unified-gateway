import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign, Lightbulb } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SavingsScoreWidgetProps {
  score: number; // 0-100
  percentImprovement: number;
  annualSavings: number;
  recommendations: string[];
}

export function SavingsScoreWidget({
  score,
  percentImprovement,
  annualSavings,
  recommendations,
}: SavingsScoreWidgetProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };
  
  return (
    <Card className="border-neon-teal/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-neon-teal" />
          Performance & Savings Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className={`text-5xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
          
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={getScoreColor(score)}
                strokeDasharray={`${(score / 100) * 351.86} 351.86`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        
        <Progress value={score} className="h-2" />
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Efficiency Improvement</span>
            </div>
            <p className={`text-2xl font-bold ${percentImprovement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {percentImprovement > 0 ? '+' : ''}{percentImprovement.toFixed(1)}%
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Annual Impact</span>
            </div>
            <p className={`text-2xl font-bold ${annualSavings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {annualSavings >= 0 ? '+' : '-'}{formatCurrency(annualSavings)}
            </p>
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span>Optimization Recommendations</span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-neon-cyan mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}