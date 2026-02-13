import { Violation } from '@/types/facility';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { User, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSeverityColor, getSeverityBgColor } from '@/lib/violationService';

interface ViolationCardProps {
  violation: Violation;
}

const categoryLabels: Record<string, string> = {
  safety: 'Safety',
  operational: 'Operational',
  regulatory: 'Regulatory',
  environmental: 'Environmental',
  quality: 'Quality'
};

const typeLabels: Record<string, string> = {
  'safety-protocol': 'Safety Protocol',
  'equipment-misuse': 'Equipment Misuse',
  'attendance': 'Attendance',
  'documentation': 'Documentation',
  'procedure-deviation': 'Procedure Deviation',
  'ppe-compliance': 'PPE Compliance',
  'lockout-tagout': 'LOTO',
  'chemical-handling': 'Chemical Handling',
  'unauthorized-access': 'Unauthorized Access',
  'quality-control': 'Quality Control',
  'time-reporting': 'Time Reporting',
  'housekeeping': 'Housekeeping'
};

export function ViolationCard({ violation }: ViolationCardProps) {
  const severityColor = getSeverityColor(violation.severityScore);
  const severityBg = getSeverityBgColor(violation.severityScore);

  return (
    <Card className="p-4 bg-card/50 border-border/50 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs", severityColor, severityBg)}
            >
              Severity: {violation.severityScore}/10
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {categoryLabels[violation.complianceCategory]}
            </Badge>
            {violation.weightFactor > 1 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  violation.weightFactor >= 2 ? "text-orange-500 bg-orange-500/20" : "text-warning bg-warning/20"
                )}
              >
                {violation.weightFactor}x
              </Badge>
            )}
          </div>

          <h4 className="font-medium text-foreground mb-1">
            {typeLabels[violation.type]}
          </h4>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {violation.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{violation.employeeName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(violation.issuedAt, 'MMM d, yyyy')}</span>
            </div>
            {violation.workOrderId && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>WO #{violation.workOrderId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {violation.acknowledged ? (
            <div className="flex items-center gap-1 text-success text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Acknowledged</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-warning text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Pending</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            by {violation.issuedBy}
          </span>
        </div>
      </div>
    </Card>
  );
}
