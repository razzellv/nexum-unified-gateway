// ── NEXUM SUUM CONTINUITY INTELLIGENCE™ ──────────────────────────────────────
// Measures organizational resilience against disruption, personnel turnover,
// knowledge loss, leadership changes, vendor dependency, compliance failures,
// and decision breakdowns.
//
// "Facility Intelligence measures how operations perform.
//  Operational Intelligence measures whether operations CAN CONTINUE performing."

export type ContinuityHealth = 'Strong' | 'Moderate' | 'At Risk' | 'Critical';

export type SectorType =
  | 'facility' | 'retail' | 'property' | 'government'
  | 'public_safety' | 'healthcare' | 'manufacturing' | 'education' | 'entrepreneurship';

// ── Per-Component Input Shapes ────────────────────────────────────────────────
export interface KnowledgeInputs {
  sopCompleteness: number;        // 0-100
  documentationQuality: number;   // 0-100
  procedureCoverage: number;      // 0-100
  operationalRecords: number;     // 0-100
}
export interface WorkforceInputs {
  trainingCompletion: number;     // 0-100
  crossTraining: number;          // 0-100
  certifications: number;         // 0-100
  successionReadiness: number;    // 0-100
}
export interface OperationalInputs {
  pmCompletion: number;           // 0-100
  workOrderCompletion: number;    // 0-100
  equipmentReliability: number;   // 0-100
  inspectionCompliance: number;   // 0-100
}
export interface DecisionInputs {
  leadershipEngagement: number;   // 0-100
  riskReviews: number;            // 0-100
  escalationResolution: number;   // 0-100
  correctiveActionClosure: number;// 0-100
}
export interface DataInputs {
  assetRecords: number;           // 0-100
  logs: number;                   // 0-100
  baselines: number;              // 0-100
  historicalTrendRetention: number;// 0-100
}

export interface GlobalContinuityInputs {
  knowledge: KnowledgeInputs;
  workforce: WorkforceInputs;
  operational: OperationalInputs;
  decision: DecisionInputs;
  data: DataInputs;
}

// ── Employee Continuity ───────────────────────────────────────────────────────
export interface EmployeeContinuityRecord {
  employeeId: string;
  name: string;
  role: string;
  department: string;
  knowledgeContribution: number;  // 0-100
  documentationScore: number;     // 0-100
  trainingScore: number;          // 0-100
  reliabilityScore: number;       // 0-100
  crossFunctionalScore: number;   // 0-100
}
export interface EmployeeContinuityResult extends EmployeeContinuityRecord {
  overallScore: number;
  health: ContinuityHealth;
}

// ── Full Record (stored in DynamoDB) ─────────────────────────────────────────
export interface ContinuityRecord {
  facilityId: string;
  sector: SectorType;
  globalInputs: GlobalContinuityInputs;
  sectorFactors: Record<string, number>;
  employees: EmployeeContinuityRecord[];
  updatedAt?: string;
}

// ── Scoring Results ───────────────────────────────────────────────────────────
export interface ComponentScores {
  knowledge: number;
  workforce: number;
  operational: number;
  decision: number;
  data: number;
}

export interface ForecastScenario {
  score: number;
  label: string;
  condition: string;
  operationalImpact: string;
  financialImpact: string;
  complianceImpact: string;
  serviceImpact: string;
  continuityImpact: string;
}

export interface ContinuityScoreResult {
  globalScore: number;
  components: ComponentScores;
  health: ContinuityHealth;
  sectorScore: number;
  sectorHealth: ContinuityHealth;
  forecast: { optimistic: ForecastScenario; mostLikely: ForecastScenario; pessimistic: ForecastScenario };
  topRisks: string[];
}

// ── Sector Factor Definitions ─────────────────────────────────────────────────
export interface SectorFactor { key: string; label: string; description: string }

export const SECTOR_LABELS: Record<SectorType, string> = {
  facility:         'Facility Intelligence',
  retail:           'Retail Intelligence',
  property:         'Property Intelligence',
  government:       'Government Intelligence',
  public_safety:    'Public Safety Intelligence',
  healthcare:       'Healthcare Intelligence',
  manufacturing:    'Manufacturing Intelligence',
  education:        'Education Intelligence',
  entrepreneurship: 'Entrepreneurship Intelligence',
};

export const SECTOR_OUTPUT_LABEL: Record<SectorType, string> = {
  facility:         'Facility Continuity Score',
  retail:           'Retail Continuity Score',
  property:         'Property Continuity Score',
  government:       'Government Continuity Score',
  public_safety:    'Public Safety Continuity Score',
  healthcare:       'Healthcare Continuity Score',
  manufacturing:    'Manufacturing Continuity Score',
  education:        'Education Continuity Score',
  entrepreneurship: 'Business Continuity Score',
};

export const SECTOR_FACTORS: Record<SectorType, SectorFactor[]> = {
  facility: [],
  retail: [
    { key: 'inventoryAccuracy',  label: 'Inventory Accuracy',    description: 'How accurately inventory is tracked and reconciled' },
    { key: 'shrinkageControl',   label: 'Shrinkage Control',     description: 'Shrinkage trending (higher = lower shrinkage rate)' },
    { key: 'staffRetention',     label: 'Staff Retention',       description: 'Staff retention rate (100 = no turnover)' },
    { key: 'posUptime',          label: 'POS Uptime',            description: 'Point-of-sale system availability' },
    { key: 'vendorReliability',  label: 'Vendor Reliability',    description: 'Vendor on-time delivery and quality' },
  ],
  property: [
    { key: 'tenantRetention',     label: 'Tenant Retention',          description: 'Tenant renewal and retention rate' },
    { key: 'complaintResolution', label: 'Complaint Resolution',      description: 'Tenant complaint resolution rate' },
    { key: 'leaseCompliance',     label: 'Lease Compliance',          description: 'Tenant lease compliance adherence' },
    { key: 'capitalPlanning',     label: 'Capital Planning Readiness',description: 'Capital improvement plan readiness and funding' },
    { key: 'systemReliability',   label: 'Building System Reliability',description: 'Building systems uptime and reliability' },
  ],
  government: [
    { key: 'regulatoryCompliance',  label: 'Regulatory Compliance',       description: 'Compliance with applicable mandates' },
    { key: 'auditReadiness',        label: 'Audit Readiness',             description: 'Readiness for internal or external audit' },
    { key: 'documentationComplete', label: 'Documentation Completeness',  description: 'Completeness of required government documentation' },
    { key: 'publicServiceContinuity', label: 'Public Service Continuity', description: 'Ability to maintain services through disruptions' },
    { key: 'emergencyPreparedness', label: 'Emergency Preparedness',      description: 'Crisis and emergency scenario readiness' },
  ],
  public_safety: [
    { key: 'incidentReadiness',      label: 'Incident Response Readiness', description: 'Readiness to respond at full capacity' },
    { key: 'shiftCoverage',          label: 'Shift Coverage',              description: 'Staffing coverage across all shifts' },
    { key: 'trainingCurrency',       label: 'Training Currency',           description: 'Up-to-date certifications and training' },
    { key: 'equipmentReadiness',     label: 'Equipment Readiness',         description: 'Equipment serviceability and deployment readiness' },
    { key: 'commandResilience',      label: 'Chain-of-Command Resilience', description: 'Command structure resilience during key personnel loss' },
  ],
  healthcare: [
    { key: 'lifeSafetyCompliance',   label: 'Life Safety Compliance',      description: 'Compliance with life safety codes and standards' },
    { key: 'systemRedundancy',       label: 'Critical System Redundancy',  description: 'Backup systems for critical infrastructure' },
    { key: 'staffCompetency',        label: 'Staff Competency',            description: 'Clinical and operational staff competency' },
    { key: 'emergencyPreparedness',  label: 'Emergency Preparedness',      description: 'Healthcare-specific disaster readiness' },
    { key: 'regulatoryReadiness',    label: 'Regulatory Readiness',        description: 'Readiness for CMS, TJC, or state reviews' },
  ],
  manufacturing: [
    { key: 'productionUptime',       label: 'Production Uptime',           description: 'Production line availability and uptime' },
    { key: 'sparePartsReadiness',    label: 'Spare Parts Readiness',       description: 'Critical spare parts availability' },
    { key: 'pmHealth',               label: 'PM Program Health',           description: 'Preventive maintenance completion and health' },
    { key: 'skillRedundancy',        label: 'Workforce Skill Redundancy',  description: 'Multiple operators trained for critical processes' },
    { key: 'processStability',       label: 'Process Stability',           description: 'Process control and consistency metrics' },
  ],
  education: [
    { key: 'campusReadiness',        label: 'Campus Readiness',            description: 'Facilities readiness for operations' },
    { key: 'deferredMaintenanceIdx', label: 'Deferred Maintenance Index',  description: 'Low deferred maintenance = higher score' },
    { key: 'safetyCompliance',       label: 'Safety Compliance',           description: 'Campus safety and regulatory compliance' },
    { key: 'staffingCoverage',       label: 'Staffing Coverage',           description: 'Adequate instructional and support staffing' },
    { key: 'studentServiceContinuity', label: 'Student Service Continuity',description: 'Service continuity through disruptions' },
  ],
  entrepreneurship: [
    { key: 'founderIndependence',    label: 'Founder Independence',        description: 'Operations can continue if founder is unavailable (100 = fully independent)' },
    { key: 'documentationMaturity',  label: 'Documentation Maturity',      description: 'Business process and operational documentation maturity' },
    { key: 'processRepeatability',   label: 'Process Repeatability',       description: 'Processes can execute without founder involvement' },
    { key: 'revenueDiversification', label: 'Revenue Diversification',     description: 'Revenue spread across multiple sources (100 = fully diversified)' },
    { key: 'customerDiversification',label: 'Customer Diversification',    description: 'Customer base spread (100 = highly diversified)' },
    { key: 'leadershipRedundancy',   label: 'Leadership Redundancy',       description: 'Depth of leadership bench beyond the founder' },
  ],
};

// ── Global component metadata ─────────────────────────────────────────────────
export const COMPONENT_META = [
  {
    key: 'knowledge' as const,
    label: 'Knowledge Preservation',
    weight: 0.20,
    description: 'SOP completeness, documentation quality, procedure coverage, operational records',
    icon: 'BookOpen',
    fields: [
      { key: 'sopCompleteness',      label: 'SOP Completeness',       description: 'Standard Operating Procedures documented and current' },
      { key: 'documentationQuality', label: 'Documentation Quality',  description: 'Quality and accessibility of operational documentation' },
      { key: 'procedureCoverage',    label: 'Procedure Coverage',     description: 'Percentage of processes with written procedures' },
      { key: 'operationalRecords',   label: 'Operational Records',    description: 'Completeness of historical operational records' },
    ],
  },
  {
    key: 'workforce' as const,
    label: 'Workforce Continuity',
    weight: 0.20,
    description: 'Training completion, cross-training, certifications, succession readiness',
    icon: 'Users',
    fields: [
      { key: 'trainingCompletion',   label: 'Training Completion',    description: 'Required training completed on schedule' },
      { key: 'crossTraining',        label: 'Cross-Training Coverage',description: 'Personnel trained to perform multiple roles' },
      { key: 'certifications',       label: 'Certification Currency', description: 'Certifications current and not at risk of expiring' },
      { key: 'successionReadiness',  label: 'Succession Readiness',   description: 'Identified and prepared successors for key roles' },
    ],
  },
  {
    key: 'operational' as const,
    label: 'Operational Continuity',
    weight: 0.20,
    description: 'PM completion, work order completion, equipment reliability, inspection compliance',
    icon: 'Wrench',
    fields: [
      { key: 'pmCompletion',          label: 'PM Completion Rate',     description: 'Preventive maintenance tasks completed on schedule' },
      { key: 'workOrderCompletion',   label: 'Work Order Completion',  description: 'Work orders resolved on time' },
      { key: 'equipmentReliability',  label: 'Equipment Reliability',  description: 'Equipment uptime and mean time between failures' },
      { key: 'inspectionCompliance',  label: 'Inspection Compliance',  description: 'Inspection schedules met and findings resolved' },
    ],
  },
  {
    key: 'decision' as const,
    label: 'Decision Continuity',
    weight: 0.20,
    description: 'Leadership engagement, risk reviews, escalation resolution, corrective action closure',
    icon: 'Brain',
    fields: [
      { key: 'leadershipEngagement',      label: 'Leadership Engagement',       description: 'Leadership participation in operational reviews' },
      { key: 'riskReviews',               label: 'Risk Review Completion',      description: 'Risk reviews conducted on schedule' },
      { key: 'escalationResolution',      label: 'Escalation Resolution Rate',  description: 'Escalated issues resolved within SLA' },
      { key: 'correctiveActionClosure',   label: 'Corrective Action Closure',   description: 'Corrective actions completed and verified' },
    ],
  },
  {
    key: 'data' as const,
    label: 'Data Continuity',
    weight: 0.20,
    description: 'Asset records, logs, baselines, historical trend retention',
    icon: 'Database',
    fields: [
      { key: 'assetRecords',             label: 'Asset Record Completeness', description: 'Asset records complete, current, and accessible' },
      { key: 'logs',                     label: 'Log Completeness',          description: 'Operational logs captured and retained' },
      { key: 'baselines',                label: 'Performance Baselines',     description: 'Established baselines for critical operational metrics' },
      { key: 'historicalTrendRetention', label: 'Historical Trend Retention',description: 'Historical data retained and usable for trend analysis' },
    ],
  },
];

// ── Engine functions ──────────────────────────────────────────────────────────

function avg(...values: number[]): number {
  const v = values.filter(n => n > 0);
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : 0;
}

export function getHealth(score: number): ContinuityHealth {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

export function calcComponentScores(g: GlobalContinuityInputs): ComponentScores {
  return {
    knowledge:   avg(g.knowledge.sopCompleteness, g.knowledge.documentationQuality, g.knowledge.procedureCoverage, g.knowledge.operationalRecords),
    workforce:   avg(g.workforce.trainingCompletion, g.workforce.crossTraining, g.workforce.certifications, g.workforce.successionReadiness),
    operational: avg(g.operational.pmCompletion, g.operational.workOrderCompletion, g.operational.equipmentReliability, g.operational.inspectionCompliance),
    decision:    avg(g.decision.leadershipEngagement, g.decision.riskReviews, g.decision.escalationResolution, g.decision.correctiveActionClosure),
    data:        avg(g.data.assetRecords, g.data.logs, g.data.baselines, g.data.historicalTrendRetention),
  };
}

export function calcGlobalScore(c: ComponentScores): number {
  return c.knowledge * 0.20 + c.workforce * 0.20 + c.operational * 0.20 + c.decision * 0.20 + c.data * 0.20;
}

export function calcSectorScore(globalScore: number, factors: Record<string, number>, sectorType: SectorType): number {
  const defs = SECTOR_FACTORS[sectorType];
  if (!defs.length) return globalScore;
  const vals = defs.map(d => factors[d.key] || 0);
  const sectorAvg = avg(...vals);
  return globalScore * 0.60 + sectorAvg * 0.40;
}

export function calcEmployeeScore(r: EmployeeContinuityRecord): EmployeeContinuityResult {
  const overallScore = avg(r.knowledgeContribution, r.documentationScore, r.trainingScore, r.reliabilityScore, r.crossFunctionalScore);
  return { ...r, overallScore: Math.round(overallScore), health: getHealth(overallScore) };
}

function scoreImpacts(score: number) {
  if (score >= 80) return {
    operationalImpact:  'Minimal disruption risk from personnel or knowledge changes',
    financialImpact:    'Reduced emergency spend exposure; lower unplanned turnover cost',
    complianceImpact:   'Audit-ready posture; minimal regulatory exposure',
    serviceImpact:      'Service delivery maintained through leadership or staffing changes',
    continuityImpact:   'Organization can withstand unexpected disruption without loss of core function',
  };
  if (score >= 60) return {
    operationalImpact:  'Moderate disruption possible; 30–60 day recovery window',
    financialImpact:    'Some emergency spend risk; moderate unplanned cost exposure',
    complianceImpact:   'Some compliance gaps; audit findings likely in 1–2 areas',
    serviceImpact:      'Service delivery at risk if key personnel leave unexpectedly',
    continuityImpact:   'Organization can recover from disruption but may experience operational setbacks',
  };
  if (score >= 40) return {
    operationalImpact:  'Significant disruption likely; 60–120 day recovery window',
    financialImpact:    'High unplanned cost exposure; emergency spend likely',
    complianceImpact:   'Material compliance gaps; regulatory action risk elevated',
    serviceImpact:      'Service delivery failures likely during any transition',
    continuityImpact:   'Organization is vulnerable with limited recovery capacity',
  };
  return {
    operationalImpact:  'Severe operational disruption; potential breakdown of core functions',
    financialImpact:    'Critical financial exposure; unbudgeted emergency costs imminent',
    complianceImpact:   'Regulatory violations likely; citations or penalties at risk',
    serviceImpact:      'Service delivery failures expected during any disruption',
    continuityImpact:   'Organization lacks resilience to sustain operations through disruption',
  };
}

export function calcAIForecast(globalScore: number) {
  const headroom = 100 - globalScore;
  const opt  = Math.min(100, Math.round(globalScore + headroom * 0.45));
  const most = Math.round(Math.max(0, globalScore + (globalScore >= 60 ? 2 : -3)));
  const pess = Math.max(0, Math.round(globalScore - 22));

  return {
    optimistic:  { score: opt,  label: 'Optimistic',  condition: 'If identified improvements are implemented within 90 days', ...scoreImpacts(opt) },
    mostLikely:  { score: most, label: 'Most Likely',  condition: 'If operations remain unchanged at current trajectory', ...scoreImpacts(most) },
    pessimistic: { score: pess, label: 'Pessimistic', condition: 'If current risks materialize and no corrective action is taken', ...scoreImpacts(pess) },
  };
}

export function calcTopRisks(components: ComponentScores, sectorFactors: Record<string, number>, sector: SectorType): string[] {
  const risks: Array<{ label: string; score: number }> = [
    { label: 'Knowledge Preservation gap — SOPs and documentation below threshold', score: components.knowledge },
    { label: 'Workforce Continuity gap — training completion and succession below threshold', score: components.workforce },
    { label: 'Operational Continuity gap — PM and work order completion below threshold', score: components.operational },
    { label: 'Decision Continuity gap — leadership engagement and corrective actions lagging', score: components.decision },
    { label: 'Data Continuity gap — asset records and historical data below threshold', score: components.data },
  ];
  const defs = SECTOR_FACTORS[sector];
  defs.forEach(d => {
    if ((sectorFactors[d.key] || 0) < 60) {
      risks.push({ label: `${d.label} sector risk — score below acceptable threshold`, score: sectorFactors[d.key] || 0 });
    }
  });
  return risks.filter(r => r.score < 70).sort((a, b) => a.score - b.score).slice(0, 6).map(r => r.label);
}

export function calcFullScore(record: ContinuityRecord): ContinuityScoreResult {
  const components  = calcComponentScores(record.globalInputs);
  const globalScore = Math.round(calcGlobalScore(components));
  const sectorScore = Math.round(calcSectorScore(globalScore, record.sectorFactors, record.sector));
  const forecast    = calcAIForecast(globalScore);
  const topRisks    = calcTopRisks(components, record.sectorFactors, record.sector);
  return {
    globalScore,
    components: { knowledge: Math.round(components.knowledge), workforce: Math.round(components.workforce), operational: Math.round(components.operational), decision: Math.round(components.decision), data: Math.round(components.data) },
    health:       getHealth(globalScore),
    sectorScore,
    sectorHealth: getHealth(sectorScore),
    forecast,
    topRisks,
  };
}

export const EMPTY_RECORD = (facilityId: string): ContinuityRecord => ({
  facilityId,
  sector: 'facility',
  globalInputs: {
    knowledge:   { sopCompleteness: 0, documentationQuality: 0, procedureCoverage: 0, operationalRecords: 0 },
    workforce:   { trainingCompletion: 0, crossTraining: 0, certifications: 0, successionReadiness: 0 },
    operational: { pmCompletion: 0, workOrderCompletion: 0, equipmentReliability: 0, inspectionCompliance: 0 },
    decision:    { leadershipEngagement: 0, riskReviews: 0, escalationResolution: 0, correctiveActionClosure: 0 },
    data:        { assetRecords: 0, logs: 0, baselines: 0, historicalTrendRetention: 0 },
  },
  sectorFactors: {},
  employees: [],
});
