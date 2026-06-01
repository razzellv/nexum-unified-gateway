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

// ============================================================================
// ISSUE ORIGIN & REPORTING INTELLIGENCE APIs
// ============================================================================

export type IssueSourceType =
  | 'operator_log' | 'pm' | 'work_order' | 'violation' | 'inspection'
  | 'photo' | 'ai_detection' | 'vendor_note' | 'bas_alarm' | 'manual_report';

export type IssueReportSourceCategory = 'human' | 'sensor' | 'ai_inferred' | 'system_generated';

export type IssueAttemptType =
  | 'duplicate' | 'escalation' | 'clarification' | 'repair_attempt'
  | 'pm_note' | 'closure_note' | 'reopen';

export interface IssueOrigin {
  issueId: string;
  facilityId: string;
  title: string;
  sourceType: IssueSourceType;
  reportSourceCategory: IssueReportSourceCategory;
  confidenceLevel: number;
  firstReporterName: string;
  firstReporterRole: string;
  firstReporterId: string;
  originalTimestamp: string;
  originalDescription: string;
  originalAttachment?: string | null;
  assetId?: string | null;
  systemType?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  closureEvidence?: string | null;
}

export interface IssueReportAttempt {
  attemptId: string;
  issueId: string;
  reporterName: string;
  reporterRole: string;
  reporterId: string;
  timestamp: string;
  description: string;
  attemptType: IssueAttemptType;
  attachment?: string | null;
  isDuplicate: boolean;
  isEscalation: boolean;
}

export interface IssueContinuityScores {
  issueContinuityScore: number;
  visibilityGapScore: number;
  escalationRiskScore: number;
  reportingFrictionScore: number;
  repeatFailureRiskScore: number;
  decisionDefensibilityScore: number;
  computedAt: string;
  factors: {
    uniqueReporters: number;
    totalAttempts: number;
    repairAttempts: number;
    reopens: number;
    escalations: number;
    duplicates: number;
    totalLinkedRecords: number;
    linkedPMs: number;
    linkedWOs: number;
    linkedViolations: number;
    ageHours: number;
    hasClosureEvidence: boolean;
  };
}

export interface LinkedHistoricalRecord {
  linkId: string;
  issueId: string;
  recordType: 'pm' | 'work_order' | 'violation' | 'operator_log' | 'bas_alarm'
            | 'vendor_note' | 'inspection' | 'photo' | 'repair' | 'reopen' | 'manual';
  recordId: string;
  recordTimestamp?: string;
  recordDescription: string;
  linkedAt: string;
  linkedByName: string;
}

export interface IssueDashboardFields {
  firstReportedBy: string;
  firstReportedAt: string;
  firstReporterRole: string;
  lastReportedBy: string;
  lastReportedAt: string;
  totalReports: number;
  uniqueReporters: number;
  repairAttempts: number;
  reopenEvents: number;
  linkedPMRecords: number;
  linkedWORecords: number;
  linkedViolationRecords: number;
  totalLinkedRecords: number;
  defensibilityStatus: 'Strong' | 'Moderate' | 'Weak';
  continuityStatus: 'Well-documented' | 'Partial' | 'Sparse';
  visibilityStatus: 'High Gap' | 'Moderate Gap' | 'Visible';
}

// Create a new issue
export async function createIssue(data: Partial<IssueOrigin> & { title: string }) {
  return await apiRequest<{ issueId: string; issue: IssueOrigin }>('/issues', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// List all issues for the current facility
export async function listIssues(params?: { status?: string; severity?: string; limit?: number }) {
  const qs = params
    ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  return await apiRequest<{ issues: IssueOrigin[]; count: number }>(`/issues${qs}`);
}

// Full issue detail: origin + timeline + scores + AI summary
export async function getIssue(issueId: string) {
  return await apiRequest<{
    issue: IssueOrigin;
    timeline: any[];
    attempts: IssueReportAttempt[];
    links: LinkedHistoricalRecord[];
    scores: IssueContinuityScores;
    aiSummary: string;
    dashboardFields: IssueDashboardFields;
  }>(`/issues/${issueId}`);
}

// Add a report attempt to an existing issue
export async function addIssueReport(issueId: string, data: {
  reporterName?: string;
  reporterRole?: string;
  description: string;
  attemptType: IssueAttemptType;
  isDuplicate?: boolean;
  isEscalation?: boolean;
  attachment?: string;
}) {
  return await apiRequest<{ attemptId: string; attempt: IssueReportAttempt }>(
    `/issues/${issueId}/report`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

// All report attempts + reporter breakdown
export async function getIssueReports(issueId: string) {
  return await apiRequest<{
    attempts: IssueReportAttempt[];
    totalAttempts: number;
    uniqueReporters: number;
    byReporter: Record<string, any>;
    attemptTypes: Record<string, number>;
  }>(`/issues/${issueId}/reports`);
}

// Continuity scores only
export async function getIssueContinuityScores(issueId: string) {
  return await apiRequest<IssueContinuityScores>(`/issues/${issueId}/continuity`);
}

// Attach a historical record
export async function linkIssueRecord(issueId: string, data: Partial<LinkedHistoricalRecord>) {
  return await apiRequest<{ linkId: string; link: LinkedHistoricalRecord }>(
    `/issues/${issueId}/link`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

// All linked historical records
export async function getIssueLinks(issueId: string) {
  return await apiRequest<{
    links: LinkedHistoricalRecord[];
    totalLinks: number;
    byType: Record<string, LinkedHistoricalRecord[]>;
  }>(`/issues/${issueId}/links`);
}

// AI-ready summary + dashboard fields
export async function getIssueSummary(issueId: string) {
  return await apiRequest<{
    issueId: string;
    aiSummary: string;
    scores: IssueContinuityScores;
    dashboardFields: IssueDashboardFields;
  }>(`/issues/${issueId}/summary`);
}

// Update issue status / severity / closure
export async function updateIssue(issueId: string, data: {
  status?: IssueOrigin['status'];
  severity?: IssueOrigin['severity'];
  title?: string;
  closureEvidence?: string;
  tags?: string[];
}) {
  return await apiRequest<{ issue: IssueOrigin }>(`/issues/${issueId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
