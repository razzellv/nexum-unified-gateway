import { AlertCircle, Calendar, Clock, MoreVertical, Eye, Edit, Trash2, Copy, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WorkOrder } from '@/types/command-hub/workOrder';
import { mockEquipment } from '@/data/command-hub/workOrderData';
import { 
  getPriorityBgColor, 
  getStatusBgColor, 
  getEquipmentIcon, 
  getWorkOrderTypeLabel,
  getPriorityLabel,
  getStatusLabel,
  isOverdue,
  formatDate 
} from '@/lib/command-hub/workOrderService';
import { cn } from '@/lib/utils';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onView: (workOrder: WorkOrder) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onDuplicate: (workOrder: WorkOrder) => void;
}

export function WorkOrderCard({ workOrder, onView, onEdit, onDelete, onDuplicate }: WorkOrderCardProps) {
  const equipment = mockEquipment.find(e => e.id === workOrder.equipmentId);
  const EquipmentIcon = getEquipmentIcon(workOrder.equipmentType);
  const overdue = isOverdue(workOrder);

  return (
    <div 
      className={cn(
        'glass-panel p-4 border transition-all duration-200 hover:border-primary/50 cursor-pointer group',
        overdue && 'border-critical/50',
        workOrder.priority === 'emergency' && 'animate-pulse-slow border-critical/30'
      )}
      onClick={() => onView(workOrder)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{workOrder.workOrderId.toUpperCase()}</span>
          {workOrder.violationId && (
            <Badge variant="outline" className="text-xs bg-critical/10 text-critical border-critical/30">
              Violation
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(workOrder); }}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(workOrder); }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(workOrder); }}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(workOrder); }}
              className="text-critical focus:text-critical"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h3 className="font-medium text-foreground mb-2 line-clamp-2">{workOrder.title}</h3>

      {/* Equipment */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-muted">
          <EquipmentIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground truncate">
          {equipment?.name || workOrder.equipmentId}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge className={cn('text-xs border', getPriorityBgColor(workOrder.priority))}>
          {getPriorityLabel(workOrder.priority)}
        </Badge>
        <Badge className={cn('text-xs border', getStatusBgColor(workOrder.status))}>
          {getStatusLabel(workOrder.status)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {getWorkOrderTypeLabel(workOrder.type)}
        </Badge>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {/* Assigned To */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground truncate max-w-[100px]">
            {workOrder.assignedToName || 'Unassigned'}
          </span>
        </div>

        {/* Due Date */}
        <div className={cn(
          'flex items-center gap-1 text-sm',
          overdue ? 'text-critical' : 'text-muted-foreground'
        )}>
          {overdue && <AlertCircle className="w-3.5 h-3.5" />}
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(workOrder.dueDate)}</span>
        </div>
      </div>

      {/* Estimated Hours */}
      {workOrder.estimatedHours && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{workOrder.estimatedHours}h estimated</span>
          {workOrder.actualHours && (
            <span className="text-foreground">• {workOrder.actualHours}h actual</span>
          )}
        </div>
      )}
    </div>
  );
}
