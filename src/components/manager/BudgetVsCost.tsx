import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  status: 'under' | 'over' | 'at_limit';
  percentage: number;
}

interface BudgetData {
  period: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  utilizationPercent: number;
  categories: BudgetCategory[];
}

interface BudgetVsCostProps {
  budgetData: BudgetData | null;
  isLoading?: boolean;
}

export function BudgetVsCost({ budgetData, isLoading }: BudgetVsCostProps) {
  
  if (isLoading) {
    return (
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Budget vs Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!budgetData) {
    return (
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Budget vs Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No budget data available</p>
            <p className="text-sm mt-1">Configure budget tracking to see financial metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'under') return 'text-green-400';
    if (status === 'at_limit') return 'text-yellow-400';
    return 'text-destructive';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'under') return { variant: 'secondary' as const, icon: '🟢', label: 'Under Budget' };
    if (status === 'at_limit') return { variant: 'outline' as const, icon: '🟡', label: 'At Limit' };
    return { variant: 'destructive' as const, icon: '🔴', label: 'Over Budget' };
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingDown className="h-4 w-4 text-green-400" />;
    if (variance < 0) return <TrendingUp className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent <= 75) return 'bg-green-500';
    if (percent <= 90) return 'bg-yellow-500';
    if (percent <= 100) return 'bg-orange-500';
    return 'bg-destructive';
  };

  return (
    <Card className="bg-card/80 border-border" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-5 w-5 text-neon-cyan" />
            Budget vs Cost - {budgetData.period}
          </CardTitle>
          <Badge 
            variant={budgetData.variance >= 0 ? 'secondary' : 'destructive'}
            className="text-sm"
          >
            {budgetData.variance >= 0 ? '✓ On Track' : '⚠ Over Budget'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(budgetData.totalBudget)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Actual Cost</p>
            <p className="text-2xl font-bold">
              {formatCurrency(budgetData.totalActual)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Variance</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                budgetData.variance >= 0 ? "text-green-400" : "text-destructive"
              )}>
                {budgetData.variance >= 0 ? '+' : ''}
                {formatCurrency(budgetData.variance)}
              </p>
              {getVarianceIcon(budgetData.variance)}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Utilization</p>
            <p className={cn(
              "text-2xl font-bold",
              budgetData.utilizationPercent <= 90 ? "text-green-400" :
              budgetData.utilizationPercent <= 100 ? "text-yellow-400" : "text-destructive"
            )}>
              {budgetData.utilizationPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget Utilization</span>
            <span className="font-medium">
              {formatCurrency(budgetData.totalActual)} / {formatCurrency(budgetData.totalBudget)}
            </span>
          </div>
          <Progress 
            value={Math.min(budgetData.utilizationPercent, 100)} 
            className={cn("h-3", getUtilizationColor(budgetData.utilizationPercent))}
          />
          {budgetData.utilizationPercent > 100 && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Budget exceeded by {formatCurrency(Math.abs(budgetData.variance))}
            </p>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Category Breakdown</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetData.categories.map((cat) => {
                  const statusBadge = getStatusBadge(cat.status);
                  return (
                    <TableRow key={cat.category}>
                      <TableCell className="font-medium">
                        {cat.category}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(cat.budget)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cat.actual)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        getStatusColor(cat.status)
                      )}>
                        {cat.variance >= 0 ? '+' : ''}
                        {formatCurrency(cat.variance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-mono text-sm",
                          cat.percentage > 100 ? "text-destructive" :
                          cat.percentage > 90 ? "text-yellow-400" : "text-green-400"
                        )}>
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusBadge.variant} className="text-xs">
                          {statusBadge.icon} {statusBadge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground mb-1">Categories Under Budget</p>
              <p className="text-2xl font-bold text-green-400">
                {budgetData.categories.filter(c => c.status === 'under').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground mb-1">Categories At Limit</p>
              <p className="text-2xl font-bold text-yellow-400">
                {budgetData.categories.filter(c => c.status === 'at_limit').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground mb-1">Categories Over Budget</p>
              <p className="text-2xl font-bold text-destructive">
                {budgetData.categories.filter(c => c.status === 'over').length}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {budgetData.categories.filter(c => c.status === 'over').length > 0 && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Budget Alerts</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {budgetData.categories
                    .filter(c => c.status === 'over')
                    .map(c => (
                      <li key={c.category}>
                        • {c.category}: {formatCurrency(Math.abs(c.variance))} over budget
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
