// Work Order Types - matching AWS DynamoDB schema
export type WorkOrderType = 'corrective' | 'preventive' | 'predictive' | 'inspection';
export type WorkOrderPriority = 'routine' | 'normal' | 'urgent' | 'emergency';
export type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type EquipmentType = 'boiler' | 'chiller' | 'ahu' | 'rtu' | 'pump' | 'compressor' | 'electrical' | 'hvac' | 'plumbing' | 'fire_safety' | 'controls';
export type WorkOrderContextType = 'equipment' | 'location' | 'general';

export interface WorkOrderAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface WorkOrderNote {
  id: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
}

export interface WorkOrder {
  workOrderId: string;
  facilityId: string;
  orgId: string;
  contextType: WorkOrderContextType;
  locationContext?: string;
  equipmentId: string;
  equipmentType: EquipmentType;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  dueDate: string;
  scheduledDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  partsRequired: string[];
  estimatedCost?: number;
  actualCost?: number;
  violationId?: string;
  tags: string[];
  attachments: WorkOrderAttachment[];
  notes: WorkOrderNote[];
  safetyPrecautions?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  location: string;
}

export interface WorkOrderFilters {
  search: string;
  status: WorkOrderStatus | 'all';
  priority: WorkOrderPriority | 'all';
  type: WorkOrderType | 'all';
  equipmentType: EquipmentType | 'all';
  assignedTo: string | 'all' | 'unassigned';
}
