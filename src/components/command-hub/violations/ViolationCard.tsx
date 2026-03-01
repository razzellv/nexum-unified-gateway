import { Violation } from '@/types/facility';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { User, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSeverityColor, getSeverityBgColor } from '@/lib/command-hub/violationService';

interface ViolationCardProps {
  violation: Violation;
}

const categoryLabels: Record<string, string> = {
  safety: 'Safety',
  operational: 'Operational',
  regulatory: 'Regulatory',
  environmental: 'Environmental',
  quality: 'Quality',
  EQUIPMENT: 'Equipment',
  COMPLIANCE: 'Compliance',
  OPERATIONAL: 'Operational',
  UNETHICAL: 'Unethical',
  VIRTUOUS: 'Virtuous'
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
  'housekeeping': 'Housekeeping',
  'MISSING_LOG': 'Missing Log',
  'LATE_LOG': 'Late Log',
  'INCOMPLETE_DATA': 'Incomplete Data',
  'OUT_OF_RANGE': 'Out of Range',
  'CRITICAL_FAILURE': 'Critical Failure',
  'UNSAFE_OPERATION': 'Unsafe Operation',
  'MISSED_ROUND': 'Missed Round',
  'DOCUMENTATION_ERROR': 'Documentation Error',
  'UNAUTHORIZED_CHANGE': 'Unauthorized Change',
  'SAFETY_VIOLATION': 'Safety Violation',
  'TRAINING_LAPSE': 'Training Lapse',
  'PROCEDURE_DEVIATION': 'Procedure Deviation',
  'POOR_COMMUNICATION': 'Poor Communication',
  'QUALITY_ISSUE': 'Quality Issue',
  'RESPONSE_DELAY': 'Response Delay',
  'UNETHICAL_CONDUCT': 'Unethical Conduct',
  'DISHONESTY': 'Dishonesty',
  'POLICY_VIOLATION': 'Policy Violation',
  'EXEMPLARY_SAFETY': 'Exemplary Safety',
  'PROACTIVE_REPORTING': 'Proactive Reporting',
  'EXCELLENCE': 'Excellence',
  'MENTORSHIP': 'Mentorship'
};

// Safe date formatter
function formatDate(dateValue: any): string {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle different date formats
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Date formatting error:', error, dateValue);
    return 'Invalid Date';
  }
}

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
              Severity: {violation.severityScore || violation.severity || 0}/100
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {categoryLabels[violation.complianceCategory || violation.category] || violation.category || 'Unknown'}
            </Badge>
            {violation.weightFactor && violation.weightFactor > 1 && (
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
            {typeLabels[violation.type] || violation.type || 'Unknown Type'}
          </h4>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {violation.description || 'No description provided'}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>
                {violation.employeeName || 
                 (typeof violation.operator === 'string' ? violation.operator : violation.operator?.name) || 
                 (typeof violation.operatorId === 'string' ? violation.operatorId : violation.operatorId?.name) || 
                 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(violation.issuedAt || violation.timestamp || violation.createdAt)}</span>
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
            by {(typeof violation.issuedBy === 'string' ? violation.issuedBy : violation.issuedBy?.name) || 
                (typeof violation.loggedBy === 'string' ? violation.loggedBy : violation.loggedBy?.name) || 
                'System'}
          </span>
        </div>
      </div>
    </Card>
  );
}
