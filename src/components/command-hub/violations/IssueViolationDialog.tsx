import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ViolationType, ViolationTypeConfig, ComplianceCategory, Violation } from '@/types/facility';
import { mockEmployees, mockTasks } from '@/data/mockData';
import { ViolationTypeSelect } from './ViolationTypeSelect';
import { cn } from '@/lib/utils';
import { getSeverityColor, getSeverityBgColor } from '@/lib/command-hub/violationService';

interface IssueViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (violation: Omit<Violation, 'id' | 'issuedAt' | 'acknowledged' | 'attachments'>) => void;
}

const weightFactors = [
  { value: '1', label: '1.0x - Standard' },
  { value: '1.5', label: '1.5x - Elevated' },
  { value: '2', label: '2.0x - Serious' },
  { value: '2.5', label: '2.5x - Critical' },
];

const categoryLabels: Record<ComplianceCategory, string> = {
  safety: 'Safety',
  operational: 'Operational',
  regulatory: 'Regulatory',
  environmental: 'Environmental',
  quality: 'Quality'
};

export function IssueViolationDialog({ open, onOpenChange, onSubmit }: IssueViolationDialogProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [violationType, setViolationType] = useState<ViolationType | ''>('');
  const [category, setCategory] = useState<ComplianceCategory>('operational');
  const [severityScore, setSeverityScore] = useState(5);
  const [weightFactor, setWeightFactor] = useState('1');
  const [description, setDescription] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');

  const handleTypeChange = (type: ViolationType, config: ViolationTypeConfig) => {
    setViolationType(type);
    setCategory(config.defaultCategory);
    setSeverityScore(config.defaultSeverity);
    setWeightFactor(config.weightFactor.toString());
  };

  const handleSubmit = () => {
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee || !violationType) return;

    onSubmit({
      employeeId,
      employeeName: employee.name,
      type: violationType,
      complianceCategory: category,
      severityScore,
      weightFactor: parseFloat(weightFactor),
      description,
      workOrderId: workOrderId || undefined,
      issuedBy: 'Current User', // Would come from auth context
      issuedByRole: 'supervisor',
    });

    // Reset form
    setEmployeeId('');
    setViolationType('');
    setCategory('operational');
    setSeverityScore(5);
    setWeightFactor('1');
    setDescription('');
    setWorkOrderId('');
    onOpenChange(false);
  };

  const isValid = employeeId && violationType && description.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Issue Violation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {mockEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} - {emp.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Violation Type */}
          <div className="space-y-2">
            <Label>Violation Type *</Label>
            <ViolationTypeSelect value={violationType} onValueChange={handleTypeChange} />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Compliance Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ComplianceCategory)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Severity Score</Label>
              <span className={cn(
                "text-sm font-medium px-2 py-0.5 rounded",
                getSeverityColor(severityScore),
                getSeverityBgColor(severityScore)
              )}>
                {severityScore}/10
              </span>
            </div>
            <Slider
              value={[severityScore]}
              onValueChange={([v]) => setSeverityScore(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
          </div>

          {/* Weight Factor */}
          <div className="space-y-2">
            <Label>Weight Factor</Label>
            <Select value={weightFactor} onValueChange={setWeightFactor}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {weightFactors.map((wf) => (
                  <SelectItem key={wf.value} value={wf.value}>{wf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Work Order */}
          <div className="space-y-2">
            <Label>Link to Work Order (optional)</Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select work order..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <!-- None option removed - use placeholder instead -->
                {mockTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    #{task.id} - {task.title.substring(0, 40)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the violation in detail..."
              className="min-h-[100px] bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Issue Violation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
