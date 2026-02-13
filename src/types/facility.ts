export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 'safety' | 'compliance' | 'energy' | 'reliability' | 'comfort' | 'production';
export type SystemType = 'boiler' | 'chiller' | 'pump' | 'electrical' | 'hvac' | 'water' | 'gas' | 'production' | 'safety' | 'compressor' | 'ahu' | 'rtu';
export type TaskStatus = 'backlog' | 'ready' | 'in-progress' | 'waiting-vendor' | 'qa' | 'completed' | 'archived';
export type EmergencyType = 'fire' | 'flood' | 'power-loss' | 'chiller-fail' | 'boiler-lockout' | 'production-shutdown' | 'chemical-spill';
export type UserRole = 'admin' | 'executive' | 'manager' | 'supervisor' | 'technician' | 'vendor';
export type VendorSpecialty = 'chillers' | 'boilers' | 'electrical' | 'controls' | 'general' | 'safety' | 'hvac' | 'plumbing';

export interface Task {
  id: string;
  title: string;
  description?: string;
  system: SystemType;
  priority: Priority;
  riskCategory: RiskCategory;
  status: TaskStatus;
  assignedPersonnel: string[];
  assignedVendor?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  attachments: Attachment[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  workflowId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  mentions: string[];
}

export interface Vendor {
  id: string;
  name: string;
  specialty: VendorSpecialty[];
  contactName: string;
  email: string;
  phone: string;
  onCall: boolean;
  responseTimeRating: number;
  insuranceExpiry?: Date;
  activeContracts: number;
  totalSpend: number;
  notes?: string;
}

export interface Emergency {
  id: string;
  type: EmergencyType;
  title: string;
  description: string;
  status: 'active' | 'contained' | 'resolved';
  location: string;
  startTime: Date;
  endTime?: Date;
  personnelNotified: string[];
  vendorsContacted: string[];
  resources: string[];
  timeline: EmergencyEvent[];
  attachments: Attachment[];
}

export interface EmergencyEvent {
  id: string;
  timestamp: Date;
  action: string;
  author: string;
}

export interface Signal {
  id: string;
  type: string;
  system: SystemType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  acknowledged: boolean;
  taskCreated?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  system: SystemType;
  steps: WorkflowStep[];
  triggers: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  assignTo: UserRole[];
  estimatedHours: number;
  notifications: string[];
}

export interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'success' | 'warning' | 'critical';
}

// Violation types (predefined list)
export type ViolationType = 
  | 'safety-protocol' | 'equipment-misuse' | 'attendance' 
  | 'documentation' | 'procedure-deviation' | 'ppe-compliance' 
  | 'lockout-tagout' | 'chemical-handling' | 'unauthorized-access' 
  | 'quality-control' | 'time-reporting' | 'housekeeping';

// Compliance categories
export type ComplianceCategory = 'safety' | 'operational' | 'regulatory' | 'environmental' | 'quality';

// Violation interface with full metadata
export interface Violation {
  id: string;
  employeeId: string;
  employeeName: string;
  type: ViolationType;
  complianceCategory: ComplianceCategory;
  severityScore: number;
  weightFactor: number;
  description: string;
  workOrderId?: string;
  issuedBy: string;
  issuedByRole: 'manager' | 'supervisor';
  issuedAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  notes?: string;
  attachments: Attachment[];
}

// Employee accountability summary
export interface EmployeeAccountability {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  violations30Days: number;
  violations60Days: number;
  violations90Days: number;
  weightedScore30Days: number;
  weightedScore60Days: number;
  weightedScore90Days: number;
  lastViolationDate?: Date;
  performanceStatus: 'good' | 'warning' | 'critical';
}

// Predefined violation type config
export interface ViolationTypeConfig {
  value: ViolationType;
  label: string;
  defaultSeverity: number;
  defaultCategory: ComplianceCategory;
  weightFactor: number;
}

// Employee for dropdowns
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
}
