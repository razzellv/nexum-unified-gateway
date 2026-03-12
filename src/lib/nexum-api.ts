import { apiRequest } from './api';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo: string;
  equipment: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export interface ExecutiveData {
  facilities: any[];
  metrics: {
    totalFacilities: number;
    totalEmployees: number;
    activeWorkOrders: number;
    complianceScore: number;
  };
  alerts: any[];
  performanceMetrics: {
    energyEfficiency: number;
    equipmentUptime: number;
    costSavings: number;
  };
}

export interface ManagerData {
  facilities: any[];
  metrics: any;
  alerts: any[];
  performanceMetrics: any;
}

export interface SupervisorData {
  facility: any;
  teams: any[];
  metrics: any;
  workOrders: WorkOrder[];
}

export interface EmployeePortalData {
  employee: {
    name: string;
    id: string;
    role: string;
    department: string;
    shift: string;
    certifications?: string[];
  };
  virtuousScore: number;
  metrics: any;
  workOrders: WorkOrder[];
  complianceEvents: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    resolved: boolean;
  }>;
  latestBoilerLog?: {
    equipment_id: string;
    date: string;
    time: string;
    steam_pressure: number;
    water_level: string;
    fuel_pressure: number;
    stack_temp?: number;
    feedwater_temp?: number;
    flue_gas_temp?: number;
    blowdown_performed: boolean;
    notes?: string;
  };
  latestChillerLog?: {
    equipment_id: string;
    date: string;
    time: string;
    evap_supply_temp: number;
    evap_return_temp: number;
    cond_supply_temp: number;
    cond_return_temp: number;
    efficiency: string;
    refrigerant_type: string;
  };
}

// ============================================================================
// DASHBOARD APIs - All use real data, no mock fallbacks
// ============================================================================

export async function getMasterExecutive() {
  return await apiRequest<ExecutiveData>('/dashboard/manager');
}

export async function getMasterWorkOrders() {
  return await apiRequest<any>('/work-orders');
}

export async function getManagerDashboard(filters?: {
  facilityId?: string;
  buildingId?: string;
  systemType?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.facilityId) params.append('facilityId', filters.facilityId);
  if (filters?.buildingId) params.append('buildingId', filters.buildingId);
  if (filters?.systemType) params.append('systemType', filters.systemType);
  const query = params.toString();
  return await apiRequest<ExecutiveData>(query ? `/dashboard/manager?${query}` : '/dashboard/manager');
}

export async function getWorkOrders() {
  return await apiRequest<any>('/work-orders');
}

export async function getSupervisorDashboard(facilityId?: string) {
  const query = facilityId ? `?facilityId=${facilityId}` : '';
  return await apiRequest<any>(`/dashboard/supervisor${query}`);
}

export async function getExecutiveDashboard() {
  return await apiRequest<ExecutiveData>('/dashboard/executive');
}

export async function getEnergyDashboard() {
  return await apiRequest<any>('/dashboard/energy');
}

export async function getEmployeeDashboard(employeeId?: string) {
  const endpoint = employeeId
    ? `/dashboard/employee/${employeeId}`
    : '/dashboard/employee';
  return await apiRequest<EmployeePortalData>(endpoint);
}
// ============================================================================
// FACILITY LOGS API
// ============================================================================

export interface FacilityLog {
  PK: string;
  SK: string;
  equipmentId: string;
  equipmentType: string;
  timestamp: string;
  operator: string;
  operatorId: string;
  data: any;
  notes?: string;
}

export async function getFacilityLogs(options?: {
  startDate?: string;
  endDate?: string;
  equipmentType?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  if (options?.equipmentType) params.append('system_type', options.equipmentType);
  if (options?.limit) params.append('limit', options.limit.toString());
  
  const query = params.toString();
  const endpoint = query ? `/logs/latest?${query}` : '/logs/latest';
  
  return await apiRequest<{ logs: FacilityLog[] }>(endpoint);
}

// ============================================================================
// COMPLIANCE LOGGER API
// ============================================================================

export interface ComplianceLogPayload {
  type: string;
  facility: string;
  building: string;
  systemType: string;
  systemId: string;
  employeeInvolved: string;
  complianceCategory: string;
  severityLevel: number;
  description: string;
  correctiveActionRequired: boolean;
  violationType?: string;
  policyReference?: string;
  estimatedImpactLevel?: string;
  repeatOffense?: boolean;
  pmTask?: string;
  scheduledDate?: string;
  completedOnTime?: boolean;
  missedReason?: string;
  hazardType?: string;
  immediateRisk?: boolean;
  actionTaken?: string;
}

export async function logComplianceEvent(payload: ComplianceLogPayload) {
  return await apiRequest<any>('/compliance/log', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ============================================================================
// EQUIPMENT APIs
// ============================================================================

export async function getRecentEquipment(facilityId: string, days: number = 7) {
  return await apiRequest<any>(`/equipment?facilityId=${facilityId}&days=${days}&sort=recent`);
}

export async function getManagerConfidenceMetrics(facilityId: string = 'facility-001', days: number = 7) {
  return await apiRequest<any>(`/manager/confidence-metrics?facilityId=${facilityId}&days=${days}`);
}
