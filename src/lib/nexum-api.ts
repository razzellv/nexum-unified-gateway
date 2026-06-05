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

// ============================================================================
// BMS INTEGRATION + SKIDS APIs
// ============================================================================

export type BMSProtocol =
  | 'rest_webhook' | 'mqtt' | 'bacnet_ip' | 'modbus_tcp'
  | 'opc_ua' | 'niagara' | 'metasys' | 'desigo';

export interface BMSFeed {
  feedId: string;
  facilityId: string;
  name: string;
  protocol: BMSProtocol;
  bmsVendor?: string;
  description?: string;
  apiKey: string;
  ingestUrl: string;
  status: 'active' | 'inactive' | 'error';
  lastSeenAt?: string | null;
  pointCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BMSDataPoint {
  value: number | boolean | string | null;
  unit: string;
  label: string;
  inAlarm: boolean;
  updatedAt: string;
}

export interface BMSEquipmentData {
  feedId: string;
  facilityId: string;
  equipmentId: string;
  equipmentType: string;
  timestamp: string;
  receivedAt: string;
  points: Record<string, BMSDataPoint>;
  inAlarm: boolean;
  runStatus: boolean | null;
}

export interface SkidEquipment {
  equipmentId: string;
  equipmentType: string;
  role: string;
  label: string;
  bmsPointMap?: Record<string, string> | null;
  pointSchema?: any[];
  livePoints?: Record<string, BMSDataPoint> | null;
  inAlarm?: boolean;
  runStatus?: boolean | null;
  lastUpdated?: string | null;
}

export interface Skid {
  skidId: string;
  facilityId: string;
  skidName: string;
  skidType: string;
  description?: string;
  location?: string;
  bmsIntegrationId?: string | null;
  equipment: SkidEquipment[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  liveData?: BMSEquipmentData[] | null;
  alarmCount?: number;
}

// BMS Feed management
export async function createBMSFeed(data: {
  name: string;
  protocol: BMSProtocol;
  bmsVendor?: string;
  description?: string;
  settings?: Record<string, any>;
}) {
  return await apiRequest<{ feedId: string; feed: BMSFeed; apiKey: string; ingestUrl: string; instructions: string[] }>(
    '/bms/feeds', { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function listBMSFeeds() {
  return await apiRequest<{ feeds: BMSFeed[]; count: number; protocols: Record<string, any> }>('/bms/feeds');
}

export async function getBMSFeed(feedId: string) {
  return await apiRequest<{ feed: BMSFeed; latestData: any; pointSchemas: Record<string, any> }>(`/bms/feeds/${feedId}`);
}

export async function updateBMSFeed(feedId: string, data: Partial<BMSFeed>) {
  return await apiRequest<{ message: string }>(`/bms/feeds/${feedId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  });
}

export async function deleteBMSFeed(feedId: string) {
  return await apiRequest<{ message: string }>(`/bms/feeds/${feedId}`, { method: 'DELETE' });
}

export async function getBMSFeedData(feedId: string) {
  return await apiRequest<{
    feedId: string;
    equipment: BMSEquipmentData[];
    count: number;
    alarmCount: number;
    runningCount: number;
    lastUpdated: string | null;
    pointSchemas: Record<string, any>;
  }>(`/bms/data/${feedId}`);
}

export async function getBMSMetadata() {
  return await apiRequest<{
    protocols: Record<string, any>;
    skidTypes: Record<string, any>;
    pointSchemas: Record<string, any>;
    equipmentTypes: string[];
  }>('/bms/metadata');
}

// Skid management
export async function createSkid(data: {
  skidName: string;
  skidType: string;
  description?: string;
  location?: string;
  bmsIntegrationId?: string;
  equipment: Partial<SkidEquipment>[];
}) {
  return await apiRequest<{ skidId: string; skid: Skid; skidTypes: Record<string, any> }>(
    '/skids', { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function listSkids() {
  return await apiRequest<{ skids: Skid[]; count: number; skidTypes: Record<string, any> }>('/skids');
}

export async function getSkid(skidId: string) {
  return await apiRequest<{
    skid: Skid;
    alarmCount: number;
    bmsConnected: boolean;
    lastDataReceived: string | null;
    skidTypes: Record<string, any>;
    pointSchemas: Record<string, any>;
  }>(`/skids/${skidId}`);
}

export async function updateSkid(skidId: string, data: Partial<Skid>) {
  return await apiRequest<{ skid: Skid; message: string }>(`/skids/${skidId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  });
}

export async function deleteSkid(skidId: string) {
  return await apiRequest<{ message: string }>(`/skids/${skidId}`, { method: 'DELETE' });
}

export async function getSkidData(skidId: string) {
  return await apiRequest<{
    skidId: string;
    skidName: string;
    liveData: BMSEquipmentData[];
    bmsConnected: boolean;
    alarmCount: number;
    runningCount: number;
    lastUpdated: string | null;
    pointSchemas: Record<string, any>;
  }>(`/skids/${skidId}/data`);
}

// ─── Risk Tolerance ───────────────────────────────────────────────────────────

export interface RiskThresholds {
  safety: number;
  compliance: number;
  operational: number;
  financial: number;
  reputational: number;
}

export async function getRiskTolerance() {
  return await apiRequest<{ facilityId: string; thresholds: RiskThresholds }>('/risk/tolerance');
}

export async function updateRiskTolerance(thresholds: Partial<RiskThresholds>) {
  return await apiRequest<{ facilityId: string; thresholds: RiskThresholds }>('/risk/tolerance', {
    method: 'PATCH', body: JSON.stringify({ thresholds }),
  });
}

// ─── Risk Acceptance ──────────────────────────────────────────────────────────

export interface RiskAcceptance {
  id: string;
  facilityId: string;
  category: string;
  riskTitle: string;
  justification: string;
  riskScore: number;
  acceptedBy: string;
  acceptedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired';
  relatedIssueId?: string | null;
  relatedWOId?: string | null;
  SK: string;
}

export async function listRiskAcceptance() {
  return await apiRequest<{ items: RiskAcceptance[]; count: number }>('/risk/acceptance');
}

export async function createRiskAcceptance(data: {
  riskTitle: string;
  justification: string;
  category: string;
  riskScore: number;
  expiresAt?: string;
  relatedIssueId?: string;
  relatedWOId?: string;
}) {
  return await apiRequest<RiskAcceptance>('/risk/acceptance', {
    method: 'POST', body: JSON.stringify(data),
  });
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

export interface Suggestion {
  id: string;
  facilityId: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  riskScore: number;
  status: 'active' | 'dismissed' | 'acted_on' | 'expired';
  priority: 'low' | 'medium' | 'high';
  triggeredBy: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  suggestedVendorId?: string | null;
  suggestedVendorName?: string | null;
  vendorMatchScore?: number | null;
  visibleToServiceTech: boolean;
  createdAt: string;
  SK: string;
}

export async function listSuggestions(status = 'active') {
  return await apiRequest<{ items: Suggestion[]; count: number }>(`/suggestions?status=${status}`);
}

export async function generateSuggestions() {
  return await apiRequest<{ generated: number; items: Suggestion[] }>('/suggestions/generate', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function dismissSuggestion(sk: string, note?: string) {
  return await apiRequest<{ message: string }>(`/suggestions/${encodeURIComponent(sk)}/dismiss`, {
    method: 'POST', body: JSON.stringify({ note: note || '' }),
  });
}

export async function actOnSuggestion(sk: string, note?: string) {
  return await apiRequest<{ message: string }>(`/suggestions/${encodeURIComponent(sk)}/act`, {
    method: 'POST', body: JSON.stringify({ note: note || '' }),
  });
}

// ─── Vendors + Plucks ─────────────────────────────────────────────────────────

export interface VendorProfile {
  vendorOrgId: string;
  orgName: string;
  ownerName: string;
  ownerTitle: string;
  email: string;
  phone: string;
  website: string;
  services: string[];
  serviceAreas: string[];
  bio: string;
  licenseNumber: string;
  certifications: string[];
  tier: 'basic' | 'pro' | 'enterprise';
  updatedAt: string;
}

export interface VendorPluck {
  id: string;
  facilityId: string;
  vendorId: string;
  sentBy: string;
  serviceType: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDate: string | null;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'responded';
  vendorResponse: string | null;
  respondedAt: string | null;
  vendorMessage: string;
  matchScore: number | null;
  relatedSuggestionId: string | null;
  relatedWOId: string | null;
  createdAt: string;
  SK: string;
}

export async function listVendors(serviceType?: string) {
  const qs = serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : '';
  return await apiRequest<{ items: any[]; count: number }>(`/vendors${qs}`);
}

export async function sendPluck(vendorId: string, data: {
  serviceType: string;
  description: string;
  urgency?: string;
  preferredDate?: string;
  matchScore?: number;
  relatedSuggestionId?: string;
  relatedWOId?: string;
}) {
  return await apiRequest<VendorPluck>(`/vendors/${vendorId}/pluck`, {
    method: 'POST', body: JSON.stringify(data),
  });
}

export async function listSentPlucks() {
  return await apiRequest<{ items: VendorPluck[]; count: number }>('/vendors/plucks');
}

export async function getVendorProfile() {
  return await apiRequest<VendorProfile>('/vendor/profile');
}

export async function updateVendorProfile(data: Partial<VendorProfile>) {
  return await apiRequest<VendorProfile>('/vendor/profile', {
    method: 'PATCH', body: JSON.stringify(data),
  });
}

export async function listReceivedPlucks() {
  return await apiRequest<{ items: VendorPluck[]; count: number }>('/vendor/plucks');
}

export async function respondToPluck(sk: string, response: {
  response: 'accepted' | 'declined' | 'responded';
  message: string;
  status?: string;
}) {
  return await apiRequest<{ message: string; status: string }>(
    `/vendor/plucks/${encodeURIComponent(sk)}/respond`,
    { method: 'POST', body: JSON.stringify(response) }
  );
}

// ============================================================================
// OBSERVATION JOURNAL APIs
// ============================================================================

export interface Observation {
  PK: string; SK: string; observationId: string; facilityId: string;
  organizationId: string; assetId: string; equipmentId: string;
  locationId: string; systemType: string; department: string;
  building: string; area: string; reporterName: string;
  reporterUserId: string; reporterRole: string; reporterOrganization: string;
  observationTimestamp: string; observationSource: string;
  originalText: string; originalPhotos: string[]; originalVideos: string[];
  originalAudio: string[]; originalDocuments: string[];
  originalAttachments: string[]; originalSensorReadings: any;
  originalBMSData: any; originalEnvironmentalConditions: any;
  originalSeverity: number | null; originalRisk: number | null;
  status: string; currentSeverity: number | null; assignedTo: string | null;
  linkedWorkOrders: string[]; linkedViolations: string[];
  linkedRiskAcceptances: string[]; linkedVendorActions: string[];
  createdAt: string; updatedAt: string; tags: string[]; priority: string;
}

export interface ObservationEvent {
  PK: string; SK: string; eventId: string; observationId: string;
  eventType: string; timestamp: string; actor: string; actorRole: string;
  title?: string; summary?: string; notes?: string; evidence?: any;
  [key: string]: any;
}

export interface ObservationTimelineEntry {
  timestamp: string; eventType: string; title: string;
  actor: string; role: string; summary: string;
  evidence?: any; eventId?: string;
}

export interface ObservationScores {
  integrityScore: number; chainOfCustodyScore: number;
  validationScore: number; escalationScore: number;
  ownershipScore: number; correctiveActionScore: number;
  verificationScore: number; decisionDefensibilityScore: number;
  operationalContinuityScore: number; facilityIntelligenceScore: number;
}

export async function listObservations(params?: {
  status?: string; dateFrom?: string; dateTo?: string; limit?: number;
}) {
  const qs = params
    ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  return await apiRequest<{ observations: Observation[]; count: number }>(`/observations${qs}`);
}

export async function createObservation(data: Partial<Observation>) {
  return await apiRequest<{ success: boolean; observationId: string; SK: string; observation: Observation }>(
    '/observations',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getObservation(sk: string) {
  return await apiRequest<{
    observation: Observation;
    events: ObservationEvent[];
    timeline: ObservationTimelineEntry[];
    scores: ObservationScores;
  }>(`/observations/${encodeURIComponent(sk)}`);
}

export async function getObservationScore(sk: string) {
  return await apiRequest<ObservationScores>(`/observations/${encodeURIComponent(sk)}/score`);
}

export async function validateObservation(sk: string, data: {
  notes?: string; evidence?: string; validationMethod?: string;
}) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/validate`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function escalateObservation(sk: string, data: {
  escalateTo: string; escalateToRole?: string; reason: string; notes?: string; urgency?: string;
}) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/escalate`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function assignObservation(sk: string, data: {
  assignedTo: string; assignedToRole?: string; assignedToId?: string; notes?: string;
}) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/assign`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function addObservationAction(sk: string, data: {
  actionDescription: string; actionType?: string; linkedWorkOrderId?: string;
  vendorId?: string; vendorName?: string; notes?: string;
}) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/action`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function verifyObservation(sk: string, data: {
  verificationMethod?: string; passed?: boolean; evidence?: string; notes?: string;
}) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/verify`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function closeObservation(sk: string, data: { resolution: string; notes?: string }) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/close`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function reopenObservation(sk: string, data: { reason: string; notes?: string }) {
  return await apiRequest<{ success: boolean; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/reopen`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function amendObservation(sk: string, data: {
  field: string; correctedValue: any; reason: string; notes?: string;
}) {
  return await apiRequest<{ success: boolean; originalValue: any; event: ObservationEvent }>(
    `/observations/${encodeURIComponent(sk)}/amend`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getObservationAISummary(
  observation: Observation,
  events: ObservationEvent[],
  scores: ObservationScores
) {
  return await apiRequest<{ narrative: string }>(
    '/observations/ai-summary',
    { method: 'POST', body: JSON.stringify({ observation, events, scores }) }
  );
}

// ── Cost Intelligence ─────────────────────────────────────────────────────────

export interface CostTransaction {
  transactionId: string;
  SK: string;
  facilityId: string;
  amount: number;
  category: string;
  costType: 'capex' | 'opex';
  description: string;
  department: string;
  systemType: string;
  equipmentId: string;
  workOrderId: string;
  vendor: string;
  invoiceNumber: string;
  poNumber: string;
  transactionDate: string;
  createdAt: string;
  createdByName: string;
}

export interface AssetValuation {
  SK: string;
  equipmentId: string;
  equipmentName: string;
  systemType: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLifeYears: number;
  depreciationMethod: string;
  residualValue: number;
  replacementCost: number;
  insuranceValue: number;
  notes: string;
  facilityId: string;
  depreciation?: {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    currentBookValue: number;
    remainingLifeYears: number;
    depreciationPercent: number;
    ageYears: number;
  };
}

export interface CostSummary {
  totalCostYTD: number;
  totalCostThisMonth: number;
  totalCostAllTime: number;
  capex: number;
  opex: number;
  capexPercent: number;
  opexPercent: number;
  byCategory: Record<string, number>;
  byCategoryPercent: Record<string, number>;
  byDepartment: Record<string, number>;
  byDepartmentPercent: Record<string, number>;
  bySystemType: Record<string, number>;
  bySystemTypePercent: Record<string, number>;
  totalAssetValue: number;
  totalBookValue: number;
  totalDepreciationYTD: number;
  totalAccumulatedDepreciation: number;
  assetCount: number;
  avgCostPerTransaction: number;
  transactionCount: number;
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  percent: number;
  transactionCount: number;
}

export interface CostBreakdown {
  byCategory: CostBreakdownItem[];
  byDepartment: CostBreakdownItem[];
  bySystemType: CostBreakdownItem[];
  topCostDrivers: CostBreakdownItem[];
}

export async function getCostSummary() {
  return await apiRequest<CostSummary>('/costs/summary');
}

export async function getCostTransactions(params?: {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  department?: string;
  limit?: number;
}) {
  const qs = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return await apiRequest<{ transactions: CostTransaction[]; count: number }>(`/costs/transactions${qs}`);
}

export async function createCostTransaction(data: Partial<CostTransaction>) {
  return await apiRequest<{ success: boolean; transactionId: string }>(
    '/costs/transactions',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getCostValuations() {
  return await apiRequest<{ valuations: AssetValuation[]; count: number }>('/costs/valuations');
}

export async function createAssetValuation(data: Partial<AssetValuation>) {
  return await apiRequest<{ success: boolean }>(
    '/costs/valuations',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getCostDepreciation() {
  return await apiRequest<{ assets: AssetValuation[]; totalBookValue: number; totalDepreciationYTD: number }>(
    '/costs/depreciation'
  );
}

export async function getCostBreakdown() {
  return await apiRequest<CostBreakdown>('/costs/breakdown');
}

// ── Work Integrity Engine ─────────────────────────────────────────────────────

export interface WorkIntegrityTask {
  PK: string; SK: string; taskId: string; facilityId: string;
  taskType: 'wo' | 'pm' | 'report' | 'check' | 'compliance' | 'inspection';
  title: string; description: string; systemType: string; department: string;
  assignedTo: string; assignedToId: string; assignedToCompetencyScore: number;
  deadline: string; estimatedDurationHours: number; actualDurationHours: number | null;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending_review' | 'approved' | 'in_progress' | 'completed' | 'overdue' | 'at_risk' | 'cancelled';
  deadlineStatus: 'overdue' | 'at_risk' | 'on_track';
  reviewRequired: boolean;
  reviews: { userId: string; userName: string; role: string; timestamp: string; approved: boolean; note: string }[];
  criticalPath: boolean;
  dependencies: string[];
  linkedWOId: string; linkedPMId: string; linkedViolationId: string;
  tags: string[];
  aiCritique: any | null;
  createdBy: string; createdByName: string; createdAt: string; updatedAt: string; completedAt: string | null;
}

export interface CompetencyRecommendation {
  employeeId: string; employeeName: string; competencyScore: number;
  reliability: number; completionRate: number; currentWorkload: number; reasoning: string;
}

export interface CriticalPathData {
  tasks: WorkIntegrityTask[]; criticalTasks: WorkIntegrityTask[];
  atRisk: WorkIntegrityTask[]; overdue: WorkIntegrityTask[];
  totalEstimatedHours: number; earliestCompletion: string;
  overdueCount: number; atRiskCount: number; completedThisWeek: number;
}

export interface AICritiqueResult {
  assumptions: { text: string; risk: string; recommendation: string }[];
  efficiencyGains: { description: string; estimatedTimeSavingHours: number }[];
  simplifications: string[];
  estimatedOptimisticHours: number; estimatedPessimisticHours: number;
  criticalPathRisk: string; competencyNotes: string;
  overallRisk: string; deadlineViability: string;
}

export async function listWITasks(params?: { status?: string; taskType?: string; department?: string }) {
  const qs = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return await apiRequest<{ tasks: WorkIntegrityTask[]; count: number }>(`/work-integrity/tasks${qs}`);
}

export async function createWITask(data: Partial<WorkIntegrityTask>) {
  return await apiRequest<{ success: boolean; taskId: string; SK: string }>(
    '/work-integrity/tasks',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function updateWITask(sk: string, data: Partial<WorkIntegrityTask>) {
  return await apiRequest<{ success: boolean }>(
    `/work-integrity/tasks/${encodeURIComponent(sk)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
}

export async function reviewWITask(sk: string, data: { approved: boolean; note?: string }) {
  return await apiRequest<{ success: boolean }>(
    `/work-integrity/tasks/${encodeURIComponent(sk)}/review`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getWIDeadlines() {
  return await apiRequest<{ overdue: WorkIntegrityTask[]; due_today: WorkIntegrityTask[]; due_this_week: WorkIntegrityTask[]; upcoming: WorkIntegrityTask[] }>(
    '/work-integrity/deadlines'
  );
}

export async function getCriticalPath() {
  return await apiRequest<CriticalPathData>('/work-integrity/critical-path');
}

export async function getCompetencyMatch(taskType: string, systemType?: string, department?: string) {
  return await apiRequest<{ taskType: string; recommendations: CompetencyRecommendation[] }>(
    `/work-integrity/competency-match?taskType=${taskType}${systemType ? '&systemType=' + systemType : ''}${department ? '&department=' + department : ''}`
  );
}

export async function getWIPerformance() {
  return await apiRequest<{ employees: any[]; facilityStats: any }>('/work-integrity/performance');
}

export async function runAICritique(data: {
  title: string;
  description: string;
  taskType?: string;
  systemType?: string;
  estimatedDurationHours?: number;
  deadline?: string;
}) {
  return await apiRequest<AICritiqueResult>(
    '/work-integrity/ai-critique',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

// ── Resource Planning ─────────────────────────────────────────────────────────

export interface ResourceVendor {
  vendorId: string;
  name: string;
  specialty: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  avgLeadTimeDays: number;
  partsSupplied: string[];
  linkedSystems: string[];
  certifications: string[];
  rating: number;
  notes: string;
  facilityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourcePart {
  partId: string;
  name: string;
  category: string;
  quantity?: number;
  minQuantity?: number;
  supplier?: string;
  unitCost?: number;
  location?: string;
  vendorId: string;
  vendorName: string;
  floatDays: number | null;
  reorderLeadDays: number;
  atRisk: boolean;
  openWOCount: number;
  lastOrderedAt: string | null;
}

export interface FloatTimeData {
  systemType: string;
  avgFloatDays: number | null;
  completedWOs: number;
  openWOs: number;
  referencedParts: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PMInterval {
  equipmentId: string;
  equipmentName: string;
  systemType: string;
  pmCount: number;
  avgIntervalDays: number | null;
  suggestedIntervalDays: number;
  trend: 'stable' | 'worsening' | 'improving';
  lastPMDate: string | null;
  nextDueDate: string | null;
  daysUntilDue: number | null;
  openCount: number;
  status: 'overdue' | 'due_soon' | 'on_schedule';
}

export interface ResourceSummary {
  vendorCount: number;
  trackedPartsCount: number;
  totalInventoryParts: number;
  openWOCount: number;
  avgVendorLeadTimeDays: number;
  atRiskParts: number;
}

export async function getResourceSummary() {
  return await apiRequest<ResourceSummary>('/resources/summary');
}

export async function getResourceVendors() {
  return await apiRequest<{ vendors: ResourceVendor[]; count: number }>('/resources/vendors');
}

export async function createResourceVendor(data: Partial<ResourceVendor>) {
  return await apiRequest<{ success: boolean; vendorId: string }>(
    '/resources/vendors',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getResourceParts() {
  return await apiRequest<{ parts: ResourcePart[]; count: number }>('/resources/parts');
}

export async function updateResourcePart(data: Partial<ResourcePart> & { partId: string }) {
  return await apiRequest<{ success: boolean; partId: string }>(
    '/resources/parts',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function getFloatTime() {
  return await apiRequest<{
    floatData: FloatTimeData[];
    summary: { totalSystems: number; overallAvgDays: number; highRiskSystems: number; totalOpenWOs: number };
  }>('/resources/float-time');
}

export async function getPMIntervals() {
  return await apiRequest<{
    intervals: PMInterval[];
    summary: { total: number; overdue: number; dueSoon: number; onSchedule: number; worsening: number };
  }>('/resources/intervals');
}
