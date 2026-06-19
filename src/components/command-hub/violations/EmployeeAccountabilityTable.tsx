import { EmployeeAccountability } from '@/types/facility';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusColor, getStatusBgColor } from '@/lib/command-hub/violationService';

interface EmployeeAccountabilityTableProps {
  data: EmployeeAccountability[];
}

export function EmployeeAccountabilityTable({ data }: EmployeeAccountabilityTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Employee</TableHead>
            <TableHead className="text-muted-foreground text-center">30 Days</TableHead>
            <TableHead className="text-muted-foreground text-center">60 Days</TableHead>
            <TableHead className="text-muted-foreground text-center">90 Days</TableHead>
            <TableHead className="text-muted-foreground text-center">Weighted Score</TableHead>
            <TableHead className="text-muted-foreground text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((employee) => (
            <TableRow key={employee.employeeId} className="border-border/50">
              <TableCell>
                <div>
                  <div className="font-medium text-foreground">
                    {typeof employee.employeeName === 'string' ? employee.employeeName : (employee.employeeName as any)?.name || String(employee.employeeId || 'Unknown')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {typeof employee.role === 'string' ? employee.role : 'Staff'} • {typeof employee.department === 'string' ? employee.department : 'Maintenance'}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  "font-medium",
                  employee.violations30Days > 1 ? "text-warning" : "text-foreground"
                )}>
                  {employee.violations30Days}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  "font-medium",
                  employee.violations60Days > 2 ? "text-warning" : "text-foreground"
                )}>
                  {employee.violations60Days}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  "font-medium",
                  employee.violations90Days > 3 ? "text-warning" : "text-foreground"
                )}>
                  {employee.violations90Days}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center">
                  <span className={cn(
                    "font-semibold",
                    employee.weightedScore90Days > 20 ? "text-critical" : 
                    employee.weightedScore90Days > 10 ? "text-warning" : "text-foreground"
                  )}>
                    {employee.weightedScore90Days.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">90-day</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs capitalize",
                    getStatusColor(employee.performanceStatus),
                    getStatusBgColor(employee.performanceStatus)
                  )}
                >
                  {employee.performanceStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
