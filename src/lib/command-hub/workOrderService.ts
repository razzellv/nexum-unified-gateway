import { Flame, Snowflake, Wind, Droplets, Gauge, Zap, Thermometer, Wrench, ShieldAlert, Cpu, LucideIcon, Fan } from 'lucide-react';
import { WorkOrder, WorkOrderPriority, WorkOrderStatus, EquipmentType, WorkOrderNote } from '@/types/command-hub/workOrder';
import { mockWorkOrders } from '@/data/command-hub/workOrderData';

// TODO: Replace with actual API configuration
// const API_BASE_URL = 'https://your-api-gateway.execute-api.region.amazonaws.com/prod';
// const FACILITY_ID = 'facility-001';

// Priority color helpers
export function getPriorityColor(priority: WorkOrderPriority): string {
  switch (priority) {
    case 'emergency': return 'text-critical';
    case 'urgent': return 'text-orange-500';
    case 'normal': return 'text-primary';
    case 'routine': return 'text-muted-foreground';
    default: return 'text-foreground';
  }
}

export function getPriorityBgColor(priority: WorkOrderPriority): string {
  switch (priority) {
    case 'emergency': return 'bg-critical/20 text-critical border-critical/30';
    case 'urgent': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'normal': return 'bg-primary/20 text-primary border-primary/30';
    case 'routine': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
}

// Status color helpers
export function getStatusColor(status: WorkOrderStatus): string {
  switch (status) {
    case 'open': return 'text-warning';
    case 'assigned': return 'text-blue-400';
    case 'in_progress': return 'text-primary';
    case 'on_hold': return 'text-orange-400';
    case 'completed': return 'text-success';
    case 'cancelled': return 'text-muted-foreground';
    default: return 'text-foreground';
  }
}

export function getStatusBgColor(status: WorkOrderStatus): string {
  switch (status) {
    case 'open': return 'bg-warning/20 text-warning border-warning/30';
    case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'in_progress': return 'bg-primary/20 text-primary border-primary/30';
    case 'on_hold': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'completed': return 'bg-success/20 text-success border-success/30';
    case 'cancelled': return 'bg-muted text-muted-foreground border-border line-through';
    default: return 'bg-muted text-foreground border-border';
  }
}

// Equipment icon mapping
export function getEquipmentIcon(type: EquipmentType): LucideIcon {
  switch (type) {
    case 'boiler': return Flame;
    case 'chiller': return Snowflake;
    case 'ahu': return Wind;
    case 'rtu': return Fan;
    case 'pump': return Droplets;
    case 'compressor': return Gauge;
    case 'electrical': return Zap;
    case 'hvac': return Thermometer;
    case 'plumbing': return Wrench;
    case 'fire_safety': return ShieldAlert;
    case 'controls': return Cpu;
    default: return Wrench;
  }
}

// Equipment type labels
export function getEquipmentTypeLabel(type: EquipmentType): string {
  switch (type) {
    case 'boiler': return 'Boiler';
    case 'chiller': return 'Chiller';
    case 'ahu': return 'Air Handling Unit';
    case 'rtu': return 'Rooftop Unit';
    case 'pump': return 'Pump';
    case 'compressor': return 'Compressor';
    case 'electrical': return 'Electrical';
    case 'hvac': return 'HVAC';
    case 'plumbing': return 'Plumbing';
    case 'fire_safety': return 'Fire Safety';
    case 'controls': return 'Controls';
    default: return type;
  }
}

// Work order type labels
export function getWorkOrderTypeLabel(type: WorkOrder['type']): string {
  switch (type) {
    case 'corrective': return 'Corrective';
    case 'preventive': return 'Preventive';
    case 'predictive': return 'Predictive';
    case 'inspection': return 'Inspection';
    default: return type;
  }
}

// Priority labels
export function getPriorityLabel(priority: WorkOrderPriority): string {
  switch (priority) {
    case 'emergency': return 'Emergency';
    case 'urgent': return 'Urgent';
    case 'normal': return 'Normal';
    case 'routine': return 'Routine';
    default: return priority;
  }
}

// Status labels
export function getStatusLabel(status: WorkOrderStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'assigned': return 'Assigned';
    case 'in_progress': return 'In Progress';
    case 'on_hold': return 'On Hold';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

// Check if work order is overdue
export function isOverdue(workOrder: WorkOrder): boolean {
  if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
    return false;
  }
  return new Date(workOrder.dueDate) < new Date();
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// API Functions with mock fallbacks

export async function fetchWorkOrders(facilityId: string): Promise<WorkOrder[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/workorders?facilityId=${facilityId}`, {
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Content-Type': 'application/json',
  //   },
  // });
  // if (!response.ok) throw new Error('Failed to fetch work orders');
  // return response.json();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockWorkOrders;
}

export async function fetchWorkOrder(workOrderId: string, facilityId: string): Promise<WorkOrder | null> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/workorders/${workOrderId}?facilityId=${facilityId}`);
  // if (!response.ok) throw new Error('Failed to fetch work order');
  // return response.json();
  
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockWorkOrders.find(wo => wo.workOrderId === workOrderId) || null;
}

export async function createWorkOrder(workOrder: Partial<WorkOrder>): Promise<WorkOrder> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/workorders`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(workOrder),
  // });
  // if (!response.ok) throw new Error('Failed to create work order');
  // return response.json();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  const newWorkOrder: WorkOrder = {
    workOrderId: `wo-2026-${String(mockWorkOrders.length + 1).padStart(3, '0')}`,
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: workOrder.equipmentId || '',
    equipmentType: workOrder.equipmentType || 'hvac',
    type: workOrder.type || 'corrective',
    priority: workOrder.priority || 'normal',
    status: 'open',
    title: workOrder.title || '',
    description: workOrder.description || '',
    assignedTo: workOrder.assignedTo,
    assignedToName: workOrder.assignedToName,
    createdBy: 'current-user',
    createdByName: 'Current User',
    createdAt: new Date().toISOString(),
    dueDate: workOrder.dueDate || new Date().toISOString(),
    scheduledDate: workOrder.scheduledDate,
    estimatedHours: workOrder.estimatedHours,
    partsRequired: workOrder.partsRequired || [],
    estimatedCost: workOrder.estimatedCost,
    tags: workOrder.tags || [],
    attachments: [],
    notes: [],
    safetyPrecautions: workOrder.safetyPrecautions,
    violationId: workOrder.violationId,
  };
  return newWorkOrder;
}

export async function updateWorkOrder(workOrderId: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/workorders/${workOrderId}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates),
  // });
  // if (!response.ok) throw new Error('Failed to update work order');
  // return response.json();
  
  await new Promise(resolve => setTimeout(resolve, 300));
  const existing = mockWorkOrders.find(wo => wo.workOrderId === workOrderId);
  if (!existing) throw new Error('Work order not found');
  return { ...existing, ...updates };
}

export async function deleteWorkOrder(workOrderId: string): Promise<void> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/workorders/${workOrderId}`, {
  //   method: 'DELETE',
  // });
  // if (!response.ok) throw new Error('Failed to delete work order');
  
  await new Promise(resolve => setTimeout(resolve, 300));
}

export async function addWorkOrderNote(
  workOrderId: string,
  content: string,
  author: string,
  authorName: string
): Promise<WorkOrderNote> {
  // TODO: Implement via API - append note to work order
  await new Promise(resolve => setTimeout(resolve, 200));
  return {
    id: `note-${Date.now()}`,
    content,
    author,
    authorName,
    createdAt: new Date().toISOString(),
  };
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus
): Promise<void> {
  // TODO: Replace with actual API call
  await new Promise(resolve => setTimeout(resolve, 200));
}
