import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Award, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeStatus {
  employeeId: string;
  employeeName: string | { name: string; id: string };
  role: string;
  department?: string;
  violationCount: number;
  avgSeverity: number;
  riskScore: number;
  virtuousScore: number;
  complianceRate: number;
  trend?: 'improving' | 'worsening' | 'stable';
  lastActivity?: string;
}

interface EmployeeStatusTableProps {
  employees: EmployeeStatus[];
}

// CRITICAL: Safe string extraction
const safeString = (value: any, fallback: string = 'Unknown'): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.name) return value.name;
  if (typeof value === 'object' && value.id) return value.id;
  return String(value);
};

export function EmployeeStatusTable({ employees }: EmployeeStatusTableProps) {
  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'bg-destructive text-destructive-foreground';
    if (riskScore >= 40) return 'bg-yellow-500 text-yellow-950';
    return 'bg-green-500 text-green-950';
  };

  const getVirtuousColor = (virtuousScore: number) => {
    if (virtuousScore >= 80) return 'text-green-500';
    if (virtuousScore >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === 'worsening') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getPerformanceLevel = (virtuousScore: number) => {
    if (virtuousScore >= 90) return 'Excellent';
    if (virtuousScore >= 80) return 'Good';
    if (virtuousScore >= 70) return 'Fair';
    if (virtuousScore >= 60) return 'Needs Attention';
    return 'Critical';
  };

  const sortedEmployees = [...employees].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card className="neon-border bg-card/80" style={{ animationDelay: '800ms' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Employee Compliance Status
          <Badge variant="outline" className="ml-auto">
            {employees.length} Employees
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No employee compliance data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">High Performers</span>
                  <Award className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {employees.filter(e => e.virtuousScore >= 80).length}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Needs Attention</span>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-500">
                  {employees.filter(e => e.virtuousScore >= 60 && e.virtuousScore < 80).length}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">At Risk</span>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold text-destructive">
                  {employees.filter(e => e.riskScore >= 70).length}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Virtuous</span>
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">
                  {(employees.reduce((sum, e) => sum + e.virtuousScore, 0) / employees.length).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Employee</th>
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Role</th>
                    <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Violations</th>
                    <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Risk Score</th>
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Virtuous Score</th>
                    <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Compliance</th>
                    <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Trend</th>
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((employee) => (
                    <tr
                      key={employee.employeeId}
                      className="border-b border-border/30 hover:bg-accent/50 transition-colors neon-glow-row"
                    >
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{safeString(employee.employeeName, employee.employeeId)}</span>
                          <span className="text-xs text-muted-foreground font-mono">{employee.employeeId}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">
                          {employee.role}
                        </Badge>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge 
                            variant={employee.violationCount > 5 ? 'destructive' : employee.violationCount > 2 ? 'default' : 'secondary'}
                          >
                            {employee.violationCount}
                          </Badge>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <Badge className={getRiskColor(employee.riskScore)}>
                          {employee.riskScore.toFixed(0)}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <div className="space-y-1 min-w-[150px]">
                          <div className="flex items-center justify-between">
                            <span className={cn('text-sm font-bold', getVirtuousColor(employee.virtuousScore))}>
                              {employee.virtuousScore.toFixed(1)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getPerformanceLevel(employee.virtuousScore)}
                            </span>
                          </div>
                          <Progress 
                            value={employee.virtuousScore} 
                            className="h-2"
                          />
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={cn(
                          'font-semibold',
                          employee.complianceRate >= 90 ? 'text-green-500' :
                          employee.complianceRate >= 75 ? 'text-yellow-500' :
                          'text-destructive'
                        )}>
                          {employee.complianceRate.toFixed(0)}%
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {getTrendIcon(employee.trend)}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {employee.riskScore >= 70 && (
                            <Badge variant="destructive" className="text-xs">
                              High Risk
                            </Badge>
                          )}
                          {employee.virtuousScore >= 90 && (
                            <Badge className="bg-green-500 text-white text-xs">
                              Exemplary
                            </Badge>
                          )}
                          {employee.violationCount === 0 && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              Zero Violations
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">Risk Score:</strong> Combination of violation severity and frequency (0-100)
                </div>
                <div>
                  <strong className="text-foreground">Virtuous Score:</strong> Inverse of risk score, measures positive compliance (0-100%)
                </div>
                <div>
                  <strong className="text-foreground">Compliance Rate:</strong> Percentage of compliant behaviors vs total activities
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
