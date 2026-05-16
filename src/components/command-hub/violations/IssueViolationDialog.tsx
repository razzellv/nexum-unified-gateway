import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ViolationType, ViolationTypeConfig, ComplianceCategory, Violation } from '@/types/facility';
import { mockEmployees, mockTasks } from '@/data/mockData';
import { loadCustomViolations } from '@/lib/customViolations';
import { ViolationTypeSelect } from './ViolationTypeSelect';
import { cn } from '@/lib/utils';
import { getSeverityColor, getSeverityBgColor } from '@/lib/command-hub/violationService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface IssueViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (violation: Omit<Violation, 'id' | 'issuedAt' | 'acknowledged' | 'attachments'>) => void;
  orgType?: 'facility' | 'retail' | 'government';
}

const weightFactors = [
  { value: '1',   label: '1.0x — Standard' },
  { value: '1.5', label: '1.5x — Elevated' },
  { value: '2',   label: '2.0x — Serious' },
  { value: '2.5', label: '2.5x — Critical' },
];

const categoryLabels: Record<ComplianceCategory, string> = {
  safety:        'Safety',
  operational:   'Operational',
  regulatory:    'Regulatory',
  environmental: 'Environmental',
  quality:       'Quality',
};

const LOCATION_LABEL: Record<string, string> = {
  facility:   'Equipment / Location',
  retail:     'Location (aisle, cooler, shelf, etc.)',
  government: 'Unit / Location',
};

export function IssueViolationDialog({ open, onOpenChange, onSubmit, orgType = 'facility' }: IssueViolationDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [employeeId,      setEmployeeId]      = useState('');
  const [violationType,   setViolationType]   = useState<string>('');
  const [otherNotes,      setOtherNotes]      = useState('');
  const [category,        setCategory]        = useState<ComplianceCategory>('operational');
  const [severityScore,   setSeverityScore]   = useState(5);
  const [weightFactor,    setWeightFactor]    = useState('1');
  const [description,     setDescription]     = useState('');
  const [location,        setLocation]        = useState('');
  const [staffInvolved,   setStaffInvolved]   = useState('');
  const [correctiveAction,setCorrectiveAction]= useState('');
  const [workOrderId,     setWorkOrderId]     = useState('');
  const [submitting,      setSubmitting]      = useState(false);

  const isOther  = violationType === 'other_custom';
  const isCustom = violationType.startsWith('custom_');

  const handleTypeChange = (type: string, config: ViolationTypeConfig) => {
    setViolationType(type);
    setCategory(config.defaultCategory);
    setSeverityScore(config.defaultSeverity);
    setWeightFactor(config.weightFactor.toString());
    // Pre-fill description with custom type's description if available
    if (type.startsWith('custom_')) {
      const id = type.replace('custom_', '');
      const cv = loadCustomViolations().find(c => c.id === id);
      if (cv?.description) setDescription(cv.description);
    }
  };

  const resetForm = () => {
    setEmployeeId(''); setViolationType(''); setOtherNotes(''); setCategory('operational');
    setSeverityScore(5); setWeightFactor('1'); setDescription('');
    setLocation(''); setStaffInvolved(''); setCorrectiveAction(''); setWorkOrderId('');
  };

  const handleSubmit = async () => {
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee || !violationType || !description) return;

    const facilityId = user?.facilityId || (user as any)?.['custom:facilityId'] || 'facility-001';
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');

    const payload = {
      facilityId,
      orgType,
      type:             violationType,
      complianceCategory: category,
      severityScore,
      weightFactor:     parseFloat(weightFactor),
      employeeId,
      employeeName:     employee.name,
      description,
      location:         location || undefined,
      staffInvolved:    staffInvolved || undefined,
      correctiveAction: correctiveAction || undefined,
      workOrderId:      workOrderId || undefined,
      issuedBy:         user?.email || 'Current User',
      issuedByRole:     'supervisor' as const,
      timestamp:        new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.warn('POST /violations returned', res.status);
    } catch (err) {
      console.warn('POST /violations error (optimistic update still applied):', err);
    } finally {
      setSubmitting(false);
    }

    // Always call local onSubmit for optimistic UI update
    const finalDescription = isOther && otherNotes
      ? `[${otherNotes}] ${description}`.trim()
      : description;

    onSubmit({
      employeeId,
      employeeName:       employee.name,
      type:               (isOther ? 'other_custom' : violationType) as ViolationType,
      complianceCategory: category,
      severityScore,
      weightFactor:       parseFloat(weightFactor),
      description:        finalDescription,
      workOrderId:        workOrderId || undefined,
      issuedBy:           user?.email || 'Current User',
      issuedByRole:       'supervisor',
    });

    resetForm();
    onOpenChange(false);
  };

  const isValid = employeeId && violationType && description.length > 0 &&
    (!isOther || otherNotes.trim().length > 0);
  const locationLabel = LOCATION_LABEL[orgType] ?? 'Equipment / Location';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Issue Violation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee */}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {mockEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Violation Type — filtered to orgType sector */}
          <div className="space-y-2">
            <Label>Violation Type *</Label>
            <ViolationTypeSelect
              value={violationType}
              onValueChange={handleTypeChange}
              filterSector={orgType}
            />
            {isOther && (
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">Specify violation type *</Label>
                <input
                  value={otherNotes}
                  onChange={e => setOtherNotes(e.target.value)}
                  placeholder="e.g. Unauthorized equipment modification, Label mislabeling…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            {isCustom && (
              <p className="text-xs text-primary/70 mt-1">
                Custom violation type — description pre-filled from your organization's definition.
              </p>
            )}
          </div>

          {/* Compliance Category */}
          <div className="space-y-2">
            <Label>Compliance Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as ComplianceCategory)}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {Object.entries(categoryLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Severity Score</Label>
              <span className={cn('text-sm font-medium px-2 py-0.5 rounded', getSeverityColor(severityScore), getSeverityBgColor(severityScore))}>
                {severityScore}/10
              </span>
            </div>
            <Slider value={[severityScore]} onValueChange={([v]) => setSeverityScore(v)} min={1} max={10} step={1} className="py-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Low (1-3)</span><span>Medium (4-6)</span><span>High (7-9)</span><span>Critical (10)</span>
            </div>
          </div>

          {/* Weight Factor */}
          <div className="space-y-2">
            <Label>Weight Factor</Label>
            <Select value={weightFactor} onValueChange={setWeightFactor}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {weightFactors.map(wf => <SelectItem key={wf.value} value={wf.value}>{wf.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment / Location */}
          <div className="space-y-2">
            <Label>{locationLabel} <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={orgType === 'retail' ? 'e.g. Walk-in Cooler, Shelf B2' : orgType === 'government' ? 'e.g. Engine 1, Station 2' : 'e.g. Boiler Room, AHU-3'}
              className="bg-background"
            />
          </div>

          {/* Staff Involved */}
          <div className="space-y-2">
            <Label>Staff Involved <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={staffInvolved}
              onChange={e => setStaffInvolved(e.target.value)}
              placeholder="Names of additional staff involved"
              className="bg-background"
            />
          </div>

          {/* Link to Work Order */}
          <div className="space-y-2">
            <Label>Link to Work Order <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select work order..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {mockTasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    #{task.id} — {task.title.substring(0, 40)}...
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
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the violation in detail..."
              className="min-h-[80px] bg-background"
            />
          </div>

          {/* Corrective Action */}
          <div className="space-y-2">
            <Label>Corrective Action Taken <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={correctiveAction}
              onChange={e => setCorrectiveAction(e.target.value)}
              placeholder="What action was taken or is planned..."
              className="min-h-[60px] bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? 'Submitting...' : 'Issue Violation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
