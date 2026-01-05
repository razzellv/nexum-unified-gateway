import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface CostAnalyticsCardProps {
  gasCost: number;
  electricCost: number;
  waterCost: number;
  totalCost: number;
  monthlyProjection: number;
  annualProjection: number;
  trend?: number; // percentage change from previous period
}

export function CostAnalyticsCard({
  gasCost,
  electricCost,
  waterCost,
  totalCost,
  monthlyProjection,
  annualProjection,
  trend = 0,
}: CostAnalyticsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <Card className="border-neon-cyan/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-neon-cyan" />
          Daily Energy Cost Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Natural Gas</p>
            <p className="text-lg font-bold text-orange-500">{formatCurrency(gasCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Electricity</p>
            <p className="text-lg font-bold text-yellow-500">{formatCurrency(electricCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Water/Sewer</p>
            <p className="text-lg font-bold text-blue-500">{formatCurrency(waterCost)}</p>
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Daily Cost</span>
            <span className="text-2xl font-bold text-neon-teal">{formatCurrency(totalCost)}</span>
          </div>
          
          {trend !== 0 && (
            <div className="flex items-center gap-1 text-sm">
              {trend < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">{Math.abs(trend).toFixed(1)}% decrease</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{trend.toFixed(1)}% increase</span>
                </>
              )}
              <span className="text-muted-foreground">vs. last period</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Monthly Projection</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(monthlyProjection)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Annual Projection</p>
            <p className="text-xl font-bold text-neon-cyan">{formatCurrency(annualProjection)}</p>
          </div>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
          <p>Based on current operational patterns and utility rates. Projections assume consistent usage and rates.</p>
        </div>
      </CardContent>
    </Card>
  );
}