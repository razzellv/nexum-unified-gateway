// ─────────────────────────────────────────────────────────────────────────────
// FIAS — Facility Intelligence Assessment System
// Internal tool for Nexum Suum staff
// Used pre-onboarding and for periodic audits
// ─────────────────────────────────────────────────────────────────────────────

export type SystemType =
  | 'boiler'
  | 'chiller'
  | 'ahu'
  | 'cooling_tower'
  | 'pump'
  | 'generator'
  | 'electrical'
  | 'plumbing'
  | 'fire_safety'
  | 'general';

export type AssessmentType = 'pre_onboarding' | 'periodic' | 'incident' | 'inspection_prep';

export type DataConditionClass =
  | 'admissible'
  | 'observational'
  | 'degraded'
  | 're_entry_required';

export type RiskBand = 'critical' | 'action_required' | 'monitor' | 'standard';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ConditionQuestion {
  id: string;
  section: 'physical' | 'safety' | 'operational' | 'documentation';
  question: string;
  guidance: string; // field guidance for assessor
  weight: number;   // 1–3, higher = more critical to final score
}

export interface SystemQuestionSet {
  systemType: SystemType;
  label: string;
  icon: string;
  specificQuestions: ConditionQuestion[];
}

export interface FIASFinding {
  id: string;
  systemArea: string;
  observedCondition: string;
  recommendedAction: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  generateWorkOrder: boolean;
}

export interface FIASSession {
  sessionId: string;
  facilityId: string;
  facilityName: string;
  systemType: SystemType;
  assessmentType: AssessmentType;
  assessorId: string;
  assessorName: string;
  assessorEmail: string;
  conductedAt: string;
  location: string;
  equipmentId?: string;
  equipmentTag?: string;

  // Section scores (0–100 each)
  conditionScore: number;
  performanceScore: number;
  riskScore: number;

  // Final
  fiasScore: number;
  riskBand: RiskBand;

  // Responses
  conditionResponses: Record<string, { score: number; evidence: string; photoTag?: string }>;
  performanceNotes: string;
  riskNotes: string;

  findings: FIASFinding[];
  sealed: boolean;
  sealedAt?: string;
}

// ── Global Condition Questions (all systems share these) ──────────────────────

export const GLOBAL_CONDITION_QUESTIONS: ConditionQuestion[] = [
  // Physical
  {
    id: 'phys-1',
    section: 'physical',
    question: 'Is the equipment free of visible corrosion, leaks, or structural deterioration?',
    guidance: 'Check casing, welds, pipe connections, and base frame. Score 1 if severe damage present.',
    weight: 2,
  },
  {
    id: 'phys-2',
    section: 'physical',
    question: 'Are all access panels, covers, and enclosures intact and properly secured?',
    guidance: 'Missing panels expose internal components and create safety hazards.',
    weight: 1,
  },
  {
    id: 'phys-3',
    section: 'physical',
    question: 'Is the equipment and surrounding area free from debris, excessive dust, and oil accumulation?',
    guidance: 'Accumulation indicates missed PM. Note severity in evidence field.',
    weight: 1,
  },
  // Safety
  {
    id: 'safe-1',
    section: 'safety',
    question: 'Are all safety controls, interlocks, and cutoff devices present and functional?',
    guidance: 'Verify low-water cutoff, pressure relief, flame safeguard, or equivalent. Do not test if unsafe to do so — note condition observed.',
    weight: 3,
  },
  {
    id: 'safe-2',
    section: 'safety',
    question: 'Is safety signage, labeling, and lockout/tagout points clearly marked and visible?',
    guidance: 'Check for LOTO tags, hazard labels, and directional flow markers.',
    weight: 2,
  },
  {
    id: 'safe-3',
    section: 'safety',
    question: 'Is the equipment operating within its rated pressure, temperature, and load parameters?',
    guidance: 'Review gauges and recent log readings. If logs are unavailable, note as unverifiable.',
    weight: 3,
  },
  // Operational
  {
    id: 'ops-1',
    section: 'operational',
    question: 'Is equipment operating without abnormal noise, vibration, or odor?',
    guidance: 'Run equipment briefly if safe to do so. Document any abnormal conditions specifically.',
    weight: 2,
  },
  {
    id: 'ops-2',
    section: 'operational',
    question: 'Are all gauges, meters, and monitoring instruments readable and within expected range?',
    guidance: 'Cracked gauges, pegged needles, or missing instrumentation each warrant a deduction.',
    weight: 2,
  },
  {
    id: 'ops-3',
    section: 'operational',
    question: 'Is the equipment performing its intended function without manual overrides or workarounds?',
    guidance: 'Ask operating staff. Temporary workarounds in place longer than 30 days score 2 or below.',
    weight: 2,
  },
  // Documentation
  {
    id: 'doc-1',
    section: 'documentation',
    question: 'Is there a current, dated log entry within the last 7 days for this system?',
    guidance: 'Review on-site log book or platform log history. Absence of recent logs scores 1.',
    weight: 2,
  },
  {
    id: 'doc-2',
    section: 'documentation',
    question: 'Has preventive maintenance been performed within the manufacturer-recommended interval?',
    guidance: 'Check PM records. Overdue PM by more than 30 days scores 2; more than 90 days scores 1.',
    weight: 3,
  },
  {
    id: 'doc-3',
    section: 'documentation',
    question: 'Are there open work orders or unresolved violations associated with this system?',
    guidance: 'Check platform work orders. Critical or overdue WOs score 1–2 depending on severity.',
    weight: 2,
  },
];

// ── System-Specific Questions ─────────────────────────────────────────────────

export const SYSTEM_QUESTION_SETS: SystemQuestionSet[] = [
  {
    systemType: 'boiler',
    label: 'Boiler System',
    icon: '🔥',
    specificQuestions: [
      { id: 'boil-1', section: 'safety', question: 'Is the low-water cutoff device tested and documented within the last 30 days?', guidance: 'LWCO test logs are required. Absence scores 1.', weight: 3 },
      { id: 'boil-2', section: 'operational', question: 'Is steam pressure operating within 10% of rated working pressure?', guidance: 'Read pressure gauge. Record actual PSI vs nameplate rating.', weight: 3 },
      { id: 'boil-3', section: 'operational', question: 'Is flue gas stack temperature within expected range (typically 350–550°F)?', guidance: 'Excessive stack temp indicates combustion inefficiency or heat transfer fouling.', weight: 2 },
      { id: 'boil-4', section: 'physical', question: 'Is the burner flame pattern stable with no evidence of pulsation or lifting?', guidance: 'Unstable flame indicates combustion issues requiring immediate attention.', weight: 2 },
      { id: 'boil-5', section: 'documentation', question: 'Is there a valid boiler certificate of inspection on file and current?', guidance: 'Expired certificates are a compliance violation. Note expiry date.', weight: 3 },
    ],
  },
  {
    systemType: 'chiller',
    label: 'Chiller System',
    icon: '❄️',
    specificQuestions: [
      { id: 'chil-1', section: 'operational', question: 'Is the COP (coefficient of performance) within 15% of the unit\'s rated efficiency?', guidance: 'Calculate from entering/leaving water temps and compressor power if data is available.', weight: 3 },
      { id: 'chil-2', section: 'operational', question: 'Is refrigerant charge confirmed at nameplate levels with no evidence of leaks?', guidance: 'Check sight glass and superheat/subcooling. UV dye testing evidence is acceptable.', weight: 3 },
      { id: 'chil-3', section: 'physical', question: 'Is condenser and evaporator tube fouling within acceptable limits?', guidance: 'Condenser approach temperature >5°F above design indicates fouling.', weight: 2 },
      { id: 'chil-4', section: 'safety', question: 'Is the refrigerant leak detection system (where present) operational and tested?', guidance: 'Required for systems >50 lbs refrigerant in many jurisdictions.', weight: 2 },
      { id: 'chil-5', section: 'documentation', question: 'Is refrigerant tracking log current with all additions and recoveries recorded?', guidance: 'EPA Section 608 requires tracking for systems ≥50 lbs. Absence scores 1.', weight: 3 },
    ],
  },
  {
    systemType: 'ahu',
    label: 'Air Handling Unit',
    icon: '💨',
    specificQuestions: [
      { id: 'ahu-1', section: 'physical', question: 'Are filters installed correctly and within scheduled replacement interval?', guidance: 'Check differential pressure across filter bank. >1" wc typically indicates replacement needed.', weight: 2 },
      { id: 'ahu-2', section: 'operational', question: 'Is supply air temperature within ±3°F of setpoint?', guidance: 'Record actual vs setpoint. Persistent deviation indicates coil or controls issue.', weight: 2 },
      { id: 'ahu-3', section: 'operational', question: 'Is fan amperage within 10% of nameplate rating?', guidance: 'Elevated amps indicate belt wear, bearing failure, or static pressure issues.', weight: 2 },
      { id: 'ahu-4', section: 'physical', question: 'Is the drain pan clean, free of standing water, and properly pitched?', guidance: 'Standing water in drain pan = biological growth risk. Score 1 if present.', weight: 2 },
      { id: 'ahu-5', section: 'safety', question: 'Are duct smoke detectors and fire/smoke dampers present and tested within required interval?', guidance: 'NFPA 72 and local codes specify testing frequency. Check test records.', weight: 3 },
    ],
  },
  {
    systemType: 'cooling_tower',
    label: 'Cooling Tower',
    icon: '🌊',
    specificQuestions: [
      { id: 'tow-1', section: 'operational', question: 'Is water chemistry (pH, conductivity, biocide levels) within treatment program specifications?', guidance: 'Obtain most recent water treatment report. pH 7.0–8.5 is typical target range.', weight: 3 },
      { id: 'tow-2', section: 'physical', question: 'Is fill media free from biological growth, scale buildup, and structural damage?', guidance: 'Legionella risk is elevated with fouled fill. Document condition thoroughly.', weight: 3 },
      { id: 'tow-3', section: 'documentation', question: 'Is a current Legionella Water Management Plan in place and being followed?', guidance: 'Required by ASHRAE 188. Absence is a critical compliance gap. Score 1.', weight: 3 },
      { id: 'tow-4', section: 'operational', question: 'Are blowdown cycles operating correctly and conductivity within range?', guidance: 'Cycles of concentration should match treatment program. Record actual conductivity.', weight: 2 },
      { id: 'tow-5', section: 'physical', question: 'Is the tower basin free of sediment accumulation and properly drained for cleaning access?', guidance: 'Basin should be cleaned per treatment program schedule — typically annually.', weight: 2 },
    ],
  },
  {
    systemType: 'pump',
    label: 'Pump System',
    icon: '⚙️',
    specificQuestions: [
      { id: 'pump-1', section: 'operational', question: 'Is pump differential pressure within 10% of design head at rated flow?', guidance: 'Compare actual DP to pump curve. Significant deviation indicates wear or air issues.', weight: 2 },
      { id: 'pump-2', section: 'operational', question: 'Is motor amperage within nameplate FLA?', guidance: 'Elevated amps with normal flow may indicate bearing wear or impeller damage.', weight: 2 },
      { id: 'pump-3', section: 'physical', question: 'Is the mechanical seal free of leakage and the stuffing box properly adjusted?', guidance: 'Dripping seal packing is acceptable at low rate. Flowing leakage is not.', weight: 2 },
      { id: 'pump-4', section: 'operational', question: 'Is pump vibration within acceptable limits (typically <0.2 in/sec RMS)?', guidance: 'Use vibration meter if available. Tactile check is acceptable for pre-screening.', weight: 2 },
      { id: 'pump-5', section: 'physical', question: 'Are flexible couplings, isolation valves, and check valves in serviceable condition?', guidance: 'Cracked couplings, seized valves, or missing check valves each reduce score.', weight: 2 },
    ],
  },
  {
    systemType: 'generator',
    label: 'Emergency Generator',
    icon: '⚡',
    specificQuestions: [
      { id: 'gen-1', section: 'documentation', question: 'Has the generator been tested under load within the past 30 days with results logged?', guidance: 'NFPA 110 requires monthly testing. Absence of test logs scores 1.', weight: 3 },
      { id: 'gen-2', section: 'operational', question: 'Does the generator start and reach rated voltage and frequency within 10 seconds?', guidance: 'Required transfer time for life-safety systems. Test if safe to do so.', weight: 3 },
      { id: 'gen-3', section: 'physical', question: 'Is fuel level at or above 75% of tank capacity and fuel condition acceptable?', guidance: 'Diesel fuel degrades over 12–18 months. Check fuel treatment records.', weight: 2 },
      { id: 'gen-4', section: 'safety', question: 'Is automatic transfer switch (ATS) functional and transfer tested?', guidance: 'ATS failure during an outage is a critical failure. Verify last test date.', weight: 3 },
      { id: 'gen-5', section: 'documentation', question: 'Is the generator registered with the local utility and jurisdiction as required?', guidance: 'Some jurisdictions require registration of emergency generators. Verify locally.', weight: 1 },
    ],
  },
  {
    systemType: 'electrical',
    label: 'Electrical Distribution',
    icon: '🔌',
    specificQuestions: [
      { id: 'elec-1', section: 'safety', question: 'Are all electrical panels labeled accurately with breaker directory current?', guidance: 'Mislabeled panels create safety risk during emergencies. Score 1 if significantly outdated.', weight: 2 },
      { id: 'elec-2', section: 'physical', question: 'Are panel covers secured, knockouts intact, and no exposed wiring visible?', guidance: 'NEC violations are immediate compliance issues. Document any observed violations.', weight: 3 },
      { id: 'elec-3', section: 'operational', question: 'Is there evidence of overheating, discoloration, or burning odor in panels or switchgear?', guidance: 'Thermal imaging recommended. Visual evidence of heat damage scores 1.', weight: 3 },
      { id: 'elec-4', section: 'documentation', question: 'Has a licensed electrician performed an inspection within the past year?', guidance: 'Annual inspection is best practice. Note if this is the first inspection in over 3 years.', weight: 2 },
      { id: 'elec-5', section: 'safety', question: 'Is arc flash labeling present on all panels rated 240V and above?', guidance: 'NFPA 70E requires arc flash analysis and labeling. Absence is a compliance gap.', weight: 2 },
    ],
  },
  {
    systemType: 'fire_safety',
    label: 'Fire Safety Systems',
    icon: '🚒',
    specificQuestions: [
      { id: 'fire-1', section: 'documentation', question: 'Are all fire extinguishers inspected annually and tagged with current inspection date?', guidance: 'Monthly visual inspections are also required. Check tags on at least 10 units.', weight: 3 },
      { id: 'fire-2', section: 'operational', question: 'Is the fire alarm system monitored by a central station and last tested within 12 months?', guidance: 'NFPA 72 requires annual testing. Request certificate of inspection.', weight: 3 },
      { id: 'fire-3', section: 'operational', question: 'Is the sprinkler system (if present) free of obstructions and last tested per NFPA 25?', guidance: 'Check for items stored within 18 inches of sprinkler heads.', weight: 3 },
      { id: 'fire-4', section: 'safety', question: 'Are all exit signs and emergency lighting functional and tested within 30 days?', guidance: 'Monthly 30-second test is required. Check test log.', weight: 2 },
      { id: 'fire-5', section: 'documentation', question: 'Is there a current, approved fire safety plan on file with the local fire authority?', guidance: 'Some jurisdictions require annual filing. Verify local requirements.', weight: 2 },
    ],
  },
  {
    systemType: 'general',
    label: 'General Facility Assessment',
    icon: '🏢',
    specificQuestions: [
      { id: 'gen-f1', section: 'physical', question: 'Is the facility envelope (roof, walls, windows, doors) free of water intrusion evidence?', guidance: 'Check ceiling tiles, wall staining, window seals. Water intrusion leads to mold risk.', weight: 2 },
      { id: 'gen-f2', section: 'safety', question: 'Are all egress paths, stairwells, and emergency exits clear and unobstructed?', guidance: 'Obstructed egress is an immediate life-safety issue. Score 1 if any path blocked.', weight: 3 },
      { id: 'gen-f3', section: 'operational', question: 'Is the facility maintaining acceptable temperature and humidity ranges for its use type?', guidance: 'Record actual conditions. Persistent comfort complaints indicate HVAC issues.', weight: 1 },
      { id: 'gen-f4', section: 'documentation', question: 'Are current certificates of occupancy, operational permits, and licenses posted or on file?', guidance: 'Expired permits create liability. Check expiry dates.', weight: 2 },
      { id: 'gen-f5', section: 'physical', question: 'Is the mechanical/electrical room organized, labeled, and accessible?', guidance: 'Cluttered mechanical rooms indicate poor maintenance culture and increase response time during emergencies.', weight: 1 },
    ],
  },
];

// ── Scoring Engine ─────────────────────────────────────────────────────────────

/**
 * Score one section from condition responses.
 * Each answer is 1–5. Weighted average → normalized to 0–100.
 */
export function scoreSection(
  responses: Record<string, { score: number; evidence: string }>,
  questions: ConditionQuestion[]
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const q of questions) {
    const r = responses[q.id];
    if (r && r.score >= 1 && r.score <= 5) {
      weightedSum += r.score * q.weight;
      totalWeight += 5 * q.weight; // max possible per question
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}

/**
 * Final FIAS score formula:
 * Condition × 0.35 + Performance × 0.35 + Risk × 0.30
 */
export function computeFIASScore(
  conditionScore: number,
  performanceScore: number,
  riskScore: number
): number {
  return Math.round(
    conditionScore * 0.35 +
    performanceScore * 0.35 +
    riskScore * 0.30
  );
}

export function getRiskBand(score: number): RiskBand {
  if (score >= 85) return 'standard';
  if (score >= 70) return 'monitor';
  if (score >= 50) return 'action_required';
  return 'critical';
}

export const RISK_BAND_META: Record<RiskBand, {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  action: string;
}> = {
  standard: {
    label: 'Operating Within Standard',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'System is performing within acceptable parameters. Continue scheduled PM.',
    action: 'Schedule next periodic assessment per maintenance calendar.',
  },
  monitor: {
    label: 'Monitor — Schedule PM Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    description: 'Deficiencies noted. System functional but requires attention within 30 days.',
    action: 'Create work orders for identified deficiencies. Re-assess within 60 days.',
  },
  action_required: {
    label: 'Action Required',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    description: 'Significant issues identified. Corrective action required within 14 days.',
    action: 'Generate work orders immediately. Escalate to facility manager. Re-assess after remediation.',
  },
  critical: {
    label: 'Critical — Escalate Immediately',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    description: 'System poses safety, compliance, or operational risk. Immediate action required.',
    action: 'Notify facility manager and safety officer immediately. Consider system shutdown pending inspection.',
  },
};

// ── Score label display ────────────────────────────────────────────────────────

export const SCORE_LABEL: Record<number, string> = {
  1: 'Unacceptable',
  2: 'Poor',
  3: 'Acceptable',
  4: 'Good',
  5: 'Excellent',
};

export const SECTION_META: Record<string, { label: string; color: string }> = {
  physical:       { label: 'Physical Condition', color: 'text-blue-400' },
  safety:         { label: 'Safety Controls',    color: 'text-red-400' },
  operational:    { label: 'Operational State',  color: 'text-yellow-400' },
  documentation:  { label: 'Documentation',      color: 'text-purple-400' },
};

// ── Assessment type labels ─────────────────────────────────────────────────────

export const ASSESSMENT_TYPE_META: Record<AssessmentType, { label: string; description: string }> = {
  pre_onboarding:   { label: 'Pre-Onboarding',     description: 'Initial facility baseline assessment before platform activation.' },
  periodic:         { label: 'Periodic Audit',      description: 'Scheduled ongoing assessment for active platform clients.' },
  incident:         { label: 'Incident Response',   description: 'Assessment conducted following a system failure or compliance event.' },
  inspection_prep:  { label: 'Inspection Prep',     description: 'Pre-inspection readiness assessment before regulatory or insurance review.' },
};

export function getSystemQuestionSet(systemType: SystemType): SystemQuestionSet | undefined {
  return SYSTEM_QUESTION_SETS.find(s => s.systemType === systemType);
}

export function getAllQuestions(systemType: SystemType): ConditionQuestion[] {
  const specific = getSystemQuestionSet(systemType)?.specificQuestions ?? [];
  return [...GLOBAL_CONDITION_QUESTIONS, ...specific];
}
