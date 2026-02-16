import { useState, useEffect } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkOrder, WorkOrderType, WorkOrderPriority, EquipmentType } from '@/types/command-hub/workOrder';
import { mockEquipment } from '@/data/command-hub/workOrderData';
import { mockEmployees } from '@/data/mockData';
import { getEquipmentTypeLabel } from '@/lib/command-hub/workOrderService';

interface WorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder?: WorkOrder | null;
  onSave: (workOrder: Partial<WorkOrder>) => void;
}

export function WorkOrderModal({ open, onOpenChange, workOrder, onSave }: WorkOrderModalProps) {
  const isEditing = !!workOrder;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkOrderType>('corrective');
  const [priority, setPriority] = useState<WorkOrderPriority>('normal');
  const [equipmentId, setEquipmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [partsRequired, setPartsRequired] = useState<string[]>([]);
  const [newPart, setNewPart] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [safetyPrecautions, setSafetyPrecautions] = useState('');

  // Get equipment type from selected equipment
  const selectedEquipment = mockEquipment.find(e => e.id === equipmentId);
  const equipmentType = selectedEquipment?.type;

  // Get assigned employee name
  const assignedEmployee = mockEmployees.find(e => e.id === assignedTo);

  // Reset form when opening/closing or when workOrder changes
  useEffect(() => {
    if (open && workOrder) {
      setTitle(workOrder.title);
      setDescription(workOrder.description);
      setType(workOrder.type);
      setPriority(workOrder.priority);
      setEquipmentId(workOrder.equipmentId);
      setAssignedTo(workOrder.assignedTo || '');
      setDueDate(new Date(workOrder.dueDate));
      setScheduledDate(workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : undefined);
      setEstimatedHours(workOrder.estimatedHours?.toString() || '');
      setEstimatedCost(workOrder.estimatedCost?.toString() || '');
      setPartsRequired(workOrder.partsRequired || []);
      setTags(workOrder.tags || []);
      setSafetyPrecautions(workOrder.safetyPrecautions || '');
    } else if (open && !workOrder) {
      // Reset for new work order
      setTitle('');
      setDescription('');
      setType('corrective');
      setPriority('normal');
      setEquipmentId('');
      setAssignedTo('');
      setDueDate(undefined);
      setScheduledDate(undefined);
      setEstimatedHours('');
      setEstimatedCost('');
      setPartsRequired([]);
      setTags([]);
      setSafetyPrecautions('');
    }
  }, [open, workOrder]);

  const addPart = () => {
    if (newPart.trim() && !partsRequired.includes(newPart.trim())) {
      setPartsRequired([...partsRequired, newPart.trim()]);
      setNewPart('');
    }
  };

  const removePart = (part: string) => {
    setPartsRequired(partsRequired.filter(p => p !== part));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (!title || !description || !equipmentId || !dueDate) {
      return;
    }

    onSave({
      ...(workOrder && { workOrderId: workOrder.workOrderId }),
      title,
      description,
      type,
      priority,
      equipmentId,
      equipmentType: equipmentType as EquipmentType,
      assignedTo: assignedTo || undefined,
      assignedToName: assignedEmployee?.name,
      dueDate: dueDate.toISOString(),
      scheduledDate: scheduledDate?.toISOString(),
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      partsRequired,
      tags,
      safetyPrecautions: safetyPrecautions || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit Work Order' : 'Create Work Order'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter work order title"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work to be performed..."
                rows={3}
                className="bg-background border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as WorkOrderType)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as WorkOrderPriority)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Equipment</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipment *</Label>
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEquipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Input
                  value={equipmentType ? getEquipmentTypeLabel(equipmentType) : ''}
                  disabled
                  className="bg-muted border-border"
                />
              </div>
            </div>

            {selectedEquipment && (
              <div className="text-sm text-muted-foreground">
                Location: {selectedEquipment.location}
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Scheduling</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background border-border',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background border-border',
                        !scheduledDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <!-- Unassigned option removed - use placeholder instead -->
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
            
            <div className="space-y-2">
              <Label>Parts Required</Label>
              <div className="flex gap-2">
                <Input
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  placeholder="Add part..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPart())}
                  className="bg-background border-border"
                />
                <Button type="button" variant="outline" size="icon" onClick={addPart}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {partsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {partsRequired.map((part) => (
                    <Badge key={part} variant="secondary" className="gap-1">
                      {part}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-critical" 
                        onClick={() => removePart(part)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="bg-background border-border"
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-critical" 
                        onClick={() => removeTag(tag)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Safety Precautions
              </Label>
              <Textarea
                id="safety"
                value={safetyPrecautions}
                onChange={(e) => setSafetyPrecautions(e.target.value)}
                placeholder="Document any safety requirements, PPE, LOTO, etc..."
                rows={2}
                className="bg-background border-border border-warning/30"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title || !description || !equipmentId || !dueDate}
          >
            {isEditing ? 'Update Work Order' : 'Create Work Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
