import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockEmployees } from '@/data/mockData';
import { Priority, SystemType } from '@/types/facility';

interface AssignWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (workOrder: {
    title: string;
    employeeId: string;
    system: SystemType;
    priority: Priority;
    description: string;
    estimatedHours: number;
  }) => void;
}

const systems: { value: SystemType; label: string }[] = [
  { value: 'boiler', label: 'Boiler' },
  { value: 'chiller', label: 'Chiller' },
  { value: 'pump', label: 'Pump' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'production', label: 'Production' },
  { value: 'safety', label: 'Safety' },
  { value: 'compressor', label: 'Compressor' },
  { value: 'ahu', label: 'AHU' },
  { value: 'rtu', label: 'RTU' },
];

const priorities: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function AssignWorkOrderDialog({ open, onOpenChange, onSubmit }: AssignWorkOrderDialogProps) {
  const [title, setTitle] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [system, setSystem] = useState<SystemType>('hvac');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('2');

  const handleSubmit = () => {
    if (!title || !employeeId) return;

    onSubmit({
      title,
      employeeId,
      system,
      priority,
      description,
      estimatedHours: parseFloat(estimatedHours) || 2,
    });

    // Reset form
    setTitle('');
    setEmployeeId('');
    setSystem('hvac');
    setPriority('medium');
    setDescription('');
    setEstimatedHours('2');
    onOpenChange(false);
  };

  const isValid = title.length > 0 && employeeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Assign Work Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Work order title..."
              className="bg-background"
            />
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Assign To *</Label>
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

          {/* System */}
          <div className="space-y-2">
            <Label>System</Label>
            <Select value={system} onValueChange={(v) => setSystem(v as SystemType)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {systems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label>Estimated Hours</Label>
            <Input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              min="0.5"
              step="0.5"
              className="bg-background"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Work order details..."
              className="min-h-[80px] bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
