import { Search, X, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkOrderFilters as Filters, WorkOrderStatus, WorkOrderPriority, WorkOrderType, EquipmentType } from '@/types/workOrder';
import { mockEmployees } from '@/data/mockData';

interface WorkOrderFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
}

export function WorkOrderFilters({ filters, onFiltersChange, viewMode, onViewModeChange }: WorkOrderFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      priority: 'all',
      type: 'all',
      equipmentType: 'all',
      assignedTo: 'all',
    });
  };

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.type !== 'all' ||
    filters.equipmentType !== 'all' ||
    filters.assignedTo !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by WO#, title, or equipment..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('cards')}
              className="rounded-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v as WorkOrderStatus | 'all')}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => updateFilter('priority', v as WorkOrderPriority | 'all')}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => updateFilter('type', v as WorkOrderType | 'all')}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="corrective">Corrective</SelectItem>
            <SelectItem value="preventive">Preventive</SelectItem>
            <SelectItem value="predictive">Predictive</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.equipmentType} onValueChange={(v) => updateFilter('equipmentType', v as EquipmentType | 'all')}>
          <SelectTrigger className="w-[160px] bg-card border-border">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            <SelectItem value="boiler">Boiler</SelectItem>
            <SelectItem value="chiller">Chiller</SelectItem>
            <SelectItem value="ahu">AHU</SelectItem>
            <SelectItem value="rtu">RTU</SelectItem>
            <SelectItem value="pump">Pump</SelectItem>
            <SelectItem value="compressor">Compressor</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="fire_safety">Fire Safety</SelectItem>
            <SelectItem value="controls">Controls</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.assignedTo} onValueChange={(v) => updateFilter('assignedTo', v)}>
          <SelectTrigger className="w-[160px] bg-card border-border">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {mockEmployees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
