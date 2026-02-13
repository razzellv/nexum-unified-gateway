import { AlertCircle, Eye, Edit, Trash2, Copy, User, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onView: (workOrder: WorkOrder) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onDuplicate: (workOrder: WorkOrder) => void;
}

export function WorkOrderTable({ 
  workOrders, 
  selectedIds, 
  onSelectChange,
  onView, 
  onEdit, 
  onDelete, 
  onDuplicate 
}: WorkOrderTableProps) {
  const allSelected = workOrders.length > 0 && selectedIds.length === workOrders.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < workOrders.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(workOrders.map(wo => wo.workOrderId));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  return (
    <div className="glass-panel border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox 
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as HTMLButtonElement).dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                }}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead className="w-[120px]">WO Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[140px]">Equipment</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[130px]">Assigned To</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((workOrder) => {
            const equipment = mockEquipment.find(e => e.id === workOrder.equipmentId);
            const EquipmentIcon = getEquipmentIcon(workOrder.equipmentType);
            const overdue = isOverdue(workOrder);

            return (
              <TableRow 
                key={workOrder.workOrderId}
                className={cn(
                  'border-border cursor-pointer',
                  selectedIds.includes(workOrder.workOrderId) && 'bg-primary/5'
                )}
                onClick={() => onView(workOrder)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.includes(workOrder.workOrderId)}
                    onCheckedChange={() => toggleOne(workOrder.workOrderId)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {workOrder.workOrderId.toUpperCase()}
                    </span>
                    {workOrder.violationId && (
                      <Badge variant="outline" className="text-xs bg-critical/10 text-critical border-critical/30 px-1">
                        V
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="line-clamp-1">{workOrder.title}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <EquipmentIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{equipment?.name || workOrder.equipmentId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', getPriorityBgColor(workOrder.priority))}>
                    {getPriorityLabel(workOrder.priority)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', getStatusBgColor(workOrder.status))}>
                    {getStatusLabel(workOrder.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm truncate">{workOrder.assignedToName || 'Unassigned'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    'flex items-center gap-1 text-sm',
                    overdue ? 'text-critical' : 'text-muted-foreground'
                  )}>
                    {overdue && <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{formatDate(workOrder.dueDate)}</span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => onView(workOrder)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(workOrder)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(workOrder)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(workOrder)}
                        className="text-critical focus:text-critical"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {workOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                No work orders found matching your criteria
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
