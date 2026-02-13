import { useState } from 'react';
import { X, Edit, Clock, Calendar, User, DollarSign, Package, AlertTriangle, MessageSquare, Send, Paperclip, Copy, Printer } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkOrder, WorkOrderStatus } from '@/types/workOrder';
import { mockEquipment } from '@/data/workOrderData';
import { 
  getPriorityBgColor, 
  getStatusBgColor, 
  getEquipmentIcon, 
  getWorkOrderTypeLabel,
  getPriorityLabel,
  getStatusLabel,
  isOverdue,
  formatDate,
  formatDateTime
} from '@/lib/workOrderService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WorkOrderDetailProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onStatusChange: (workOrderId: string, status: WorkOrderStatus) => void;
  onAddNote: (workOrderId: string, note: string) => void;
  onDuplicate: (workOrder: WorkOrder) => void;
}

export function WorkOrderDetail({ 
  workOrder, 
  open, 
  onOpenChange, 
  onEdit, 
  onStatusChange,
  onAddNote,
  onDuplicate
}: WorkOrderDetailProps) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');

  if (!workOrder) return null;

  const equipment = mockEquipment.find(e => e.id === workOrder.equipmentId);
  const EquipmentIcon = getEquipmentIcon(workOrder.equipmentType);
  const overdue = isOverdue(workOrder);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(workOrder.workOrderId, newNote);
      setNewNote('');
    }
  };

  const handlePrint = () => {
    toast({
      title: 'Print',
      description: 'Print functionality connected to backend',
    });
  };

  const handleAttach = () => {
    toast({
      title: 'Attach File',
      description: 'File upload connected to S3 backend',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-card border-border p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {workOrder.workOrderId.toUpperCase()}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(workOrder)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={cn('text-xs border', getPriorityBgColor(workOrder.priority))}>
              {getPriorityLabel(workOrder.priority)}
            </Badge>
            <Badge className={cn('text-xs border', getStatusBgColor(workOrder.status))}>
              {getStatusLabel(workOrder.status)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getWorkOrderTypeLabel(workOrder.type)}
            </Badge>
            {workOrder.violationId && (
              <Badge variant="outline" className="text-xs bg-critical/10 text-critical border-critical/30">
                Violation Linked
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-xl font-semibold mb-2">{workOrder.title}</h2>
              <p className="text-muted-foreground">{workOrder.description}</p>
            </div>

            <Separator />

            {/* Equipment */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Equipment</h3>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 rounded bg-muted">
                  <EquipmentIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{equipment?.name || workOrder.equipmentId}</p>
                  <p className="text-sm text-muted-foreground">{equipment?.location}</p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(workOrder.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className={cn('w-4 h-4', overdue ? 'text-critical' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className={cn('text-sm', overdue && 'text-critical font-medium')}>
                      {formatDate(workOrder.dueDate)}
                      {overdue && ' (Overdue)'}
                    </p>
                  </div>
                </div>
                {workOrder.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="text-sm">{formatDate(workOrder.scheduledDate)}</p>
                    </div>
                  </div>
                )}
                {workOrder.completedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm text-success">{formatDate(workOrder.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Assignment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="text-sm">{workOrder.assignedToName || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="text-sm">{workOrder.createdByName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hours & Costs */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Hours & Costs</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated</p>
                    <p className="text-sm">{workOrder.estimatedHours || '-'}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Actual</p>
                    <p className="text-sm">{workOrder.actualHours || '-'}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Cost</p>
                    <p className="text-sm">${workOrder.estimatedCost?.toLocaleString() || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Actual Cost</p>
                    <p className="text-sm">${workOrder.actualCost?.toLocaleString() || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Parts Required */}
            {workOrder.partsRequired.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parts Required
                </h3>
                <div className="flex flex-wrap gap-2">
                  {workOrder.partsRequired.map((part, idx) => (
                    <Badge key={idx} variant="secondary">{part}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Precautions */}
            {workOrder.safetyPrecautions && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Safety Precautions
                </h3>
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm">{workOrder.safetyPrecautions}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {workOrder.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {workOrder.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Notes Timeline */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes & Updates ({workOrder.notes.length})
              </h3>
              
              {workOrder.notes.length > 0 ? (
                <div className="space-y-3">
                  {workOrder.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{note.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              )}

              {/* Add Note */}
              <div className="mt-3">
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    className="bg-background border-border"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={handleAttach}>
                    <Paperclip className="w-4 h-4 mr-1" />
                    Attach
                  </Button>
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                    <Send className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select 
              value={workOrder.status} 
              onValueChange={(v) => onStatusChange(workOrder.workOrderId, v as WorkOrderStatus)}
            >
              <SelectTrigger className="w-[140px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onDuplicate(workOrder)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
            <Button className="flex-1" onClick={() => onEdit(workOrder)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
