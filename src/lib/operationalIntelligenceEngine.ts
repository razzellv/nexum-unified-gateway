// Operational Intelligence & Governance Engine (OIG)
// Transforms raw facility activity into boardroom-grade operational intelligence.
// Never analyzes metrics independently — always correlates time, sequence, context, and history.

export interface OIGLog {
  timestamp: string;
  logType?: string;
  action?: string;
  notes?: string;
  equipmentId?: string;
  equipmentType?: string;
  operator?: string;
  facilityId?: string;
  severity?: string;
  value?: number;
  metric?: string;
  efficiency?: number;
  kw?: number;
  tons?: number;
  kwPerTon?: number;
  ampDraw?: number;
  vibration?: number;
  pressure?: number;
  condApproach?: number;
  deltaT?: number;
  alarmCode?: string;
  overrideFlag?: boolean;
}

export interface OIGWorkOrder {
  workOrderId: string;
  title: string;
  type?: string;
  status?: string;
  priority?: string;
  equipmentId?: string;
  equipmentType?: string;
  createdAt?: string;
  completedAt?: string;
  assignedTo?: string;
}

export interface OIGEquipment {
  equipmentId: string;
  equipmentName?: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  status?: string;
  installDate?: string;
  purchaseDate?: string;
  lastPMDate?: string;
  lastInspectionDate?: string;
  certificationExpiry?: string;
  warrantyExpiry?: string;
  currentRuntimeHours?: number;
  designLifeHours?: number;
  currentEfficiency?: number;
  efficiencyBaseline?: number;
  maintenanceCostAccumulated?: number;
  maintenanceCostTrend?: string;
  usefulLifeYears?: number;
  purchasePrice?: number;
  baseline?: any;
}

export interface OIGViolation {
  violationId: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  equipmentId?: string;
  createdAt?: string;
  resolvedAt?: string;
  operator?: string;
}

// ── Output types ──────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'High' | 'Moderate' | 'Low';
export type ImpactDomain = 'Energy' | 'Reliability' | 'Compliance' | 'Safety' | 'Operations' | 'Financial';
export type FindingSeverity = 'Critical' | 'High' | 'Moderate' | 'Low' | 'Informational';

export interface CorrelatedFinding {
  id: string;
  title: string;
  narrative: string;
  severity: FindingSeverity;
  confidence: ConfidenceLevel;
  affectedEquipment: string[];
  affectedDomains: ImpactDomain[];
  evidencePoints: string[];
  rootCauseHypothesis: string;
  recommendedAction: string;
  operationalImpact: string;
  energyImpact?: string;
  timeframe?: string;
}

export interface ReliabilityFinding {
  equipmentId: string;
  equipmentName: string;
  reliabilityScore: number;
  degradationRate: 'Stable' | 'Gradual' | 'Accelerating' | 'Critical';
  alarmFrequency: number;
  overrideCount: number;
  pmAlignmentStatus: 'Current' | 'Overdue' | 'Significantly Overdue' | 'Unknown';
  runtimeImbalanceFlag: boolean;
  repeatFaultPattern: boolean;
  narrative: string;
  recommendation: string;
}

export interface ComplianceRisk {
  id: string;
  type: 'Expiring Certification' | 'Overdue Inspection' | 'Missing PM Record' | 'Documentation Gap' | 'Regulatory Risk' | 'Operational Authorization';
  equipmentId?: string;
  equipmentName?: string;
  description: string;
  daysUntilImpact: number | null;
  severity: FindingSeverity;
  regulatoryExposure: boolean;
}

export interface PredictiveInsight {
  id: string;
  category: 'PM Timing' | 'Energy Optimization' | 'Load Balancing' | 'Failure Prevention' | 'Startup Optimization' | 'Utility Reduction';
  title: string;
  narrative: string;
  confidence: ConfidenceLevel;
  affectedEquipment: string[];
  estimatedImpact: string;
  recommendedAction: string;
  urgency: 'Immediate' | '30 Days' | '90 Days' | 'Ongoing';
}

export interface GovernanceEntry {
  timestamp: string;
  eventType: 'Log Entry' | 'Override' | 'Alarm' | 'PM Event' | 'Inspection' | 'Violation' | 'Work Order' | 'Anomaly Detected';
  actor: string;
  description: string;
  equipmentId?: string;
  auditIntegrity: 'Verified' | 'Gap Detected' | 'Missing Attribution';
}

export interface OIGAnalysisResult {
  analysisTimestamp: string;
  facilityId: string;
  overallHealthScore: number;
  reliabilityScore: number;
  complianceScore: number;
  efficiencyScore: number;
  governanceScore: number;
  executiveSummary: string;
  correlatedFindings: CorrelatedFinding[];
  reliabilityFindings: ReliabilityFinding[];
  complianceRisks: ComplianceRisk[];
  predictiveInsights: PredictiveInsight[];
  governanceLog: GovernanceEntry[];
  operationalBlindSpots: string[];
  normalizationOfDeviance: string[];
  dataQualityNotes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string = new Date().toISOString()): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  return arr.reduce((acc, x) => {
    const k = key(x);
    if (!acc[k]) acc[k] = [];
    acc[k].push(x);
    return acc;
  }, {} as Record<string, T[]>);
}

function recurrenceInterval(timestamps: string[]): number | null {
  if (timestamps.length < 2) return null;
  const sorted = timestamps.slice().sort();
  const intervals = sorted.slice(1).map((t, i) => daysBetween(sorted[i], t));
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

// ── Core Analysis Functions ───────────────────────────────────────────────────

function analyzeCorrelations(
  logs: OIGLog[],
  workOrders: OIGWorkOrder[],
  equipment: OIGEquipment[],
  violations: OIGViolation[],
): CorrelatedFinding[] {
  const findings: CorrelatedFinding[] = [];

  // ── 1. Repeat work order pattern — same equipment, same type ─────────────────
  const woByEquip = groupBy(workOrders.filter(w => w.equipmentId), w => `${w.equipmentId}|${w.type || 'general'}`);
  Object.entries(woByEquip).forEach(([key, wos]) => {
    if (wos.length >= 3) {
      const [eqId, woType] = key.split('|');
      const eq = equipment.find(e => e.equipmentId === eqId);
      const name = eq?.equipmentName || eqId;
      const interval = recurrenceInterval(wos.map(w => w.createdAt || '').filter(Boolean));
      const intervalStr = interval ? `every ~${Math.round(interval)} days` : 'recurrently';
      findings.push({
        id: `repeat-wo-${eqId}`,
        title: `Repeated Work Orders — ${name}`,
        narrative: `${wos.length} ${woType} work orders have been raised against ${name} ${intervalStr}. Recurring work orders on the same equipment-type pair indicate an unresolved root cause rather than isolated incidents.`,
        severity: wos.length >= 5 ? 'High' : 'Moderate',
        confidence: 'High',
        affectedEquipment: [name],
        affectedDomains: ['Reliability', 'Operations'],
        evidencePoints: [
          `${wos.length} work orders of type "${woType}" on ${name}`,
          interval ? `Average recurrence interval: ${Math.round(interval)} days` : 'Multiple occurrences detected',
          `Open WOs in set: ${wos.filter(w => w.status !== 'completed').length}`,
        ],
        rootCauseHypothesis: 'Symptomatic repair without root-cause elimination. The underlying mechanical, electrical, or procedural issue has not been identified or resolved.',
        recommendedAction: `Commission a root-cause investigation on ${name}. Review PM history, operating parameters, and maintenance logs for patterns preceding each work order creation.`,
        operationalImpact: `Repeated reactive maintenance on ${name} increases unplanned downtime risk and accumulated lifecycle cost.`,
      });
    }
  });

  // ── 2. Escalating violation frequency by category ─────────────────────────────
  const vioByCategory = groupBy(violations, v => v.category || 'uncategorized');
  Object.entries(vioByCategory).forEach(([category, vios]) => {
    const recent90 = vios.filter(v => v.createdAt && daysBetween(v.createdAt) <= 90);
    const prior90  = vios.filter(v => v.createdAt && daysBetween(v.createdAt) > 90 && daysBetween(v.createdAt) <= 180);
    if (recent90.length >= 3 && recent90.length > prior90.length * 1.4) {
      findings.push({
        id: `violation-escalation-${category}`,
        title: `Escalating Violation Pattern — ${category}`,
        narrative: `${category} violations have increased ${Math.round(((recent90.length / Math.max(prior90.length, 1)) - 1) * 100)}% over the prior 90-day period (${prior90.length} → ${recent90.length}). Escalating violation frequency signals systemic operational breakdown rather than isolated events.`,
        severity: recent90.length >= 6 ? 'Critical' : 'High',
        confidence: 'High',
        affectedEquipment: [...new Set(vios.map(v => v.equipmentId).filter(Boolean) as string[])],
        affectedDomains: ['Compliance', 'Safety', 'Operations'],
        evidencePoints: [
          `Last 90 days: ${recent90.length} violations in "${category}"`,
          `Prior 90 days: ${prior90.length} violations`,
          `Open violations: ${recent90.filter(v => v.status === 'open').length}`,
        ],
        rootCauseHypothesis: 'Either operational practices have deteriorated, environmental/seasonal conditions are creating systemic stress, or a policy/training gap exists in this compliance category.',
        recommendedAction: `Conduct a cross-functional review of ${category} violations. Identify common preceding conditions. Evaluate whether operator training, SOPs, or equipment maintenance protocols require revision.`,
        operationalImpact: `Continued escalation increases regulatory exposure and may trigger mandatory reporting requirements.`,
      });
    }
  });

  // ── 3. Efficiency drift + rising maintenance cost correlation ─────────────────
  equipment.forEach(eq => {
    const effLoss = eq.efficiencyBaseline && eq.currentEfficiency
      ? ((eq.efficiencyBaseline - eq.currentEfficiency) / eq.efficiencyBaseline) * 100
      : null;
    const maintenanceTrend = eq.maintenanceCostTrend;
    if (effLoss !== null && effLoss >= 10 && (maintenanceTrend === 'accelerating' || maintenanceTrend === 'critical')) {
      const name = eq.equipmentName || eq.equipmentId;
      findings.push({
        id: `eff-drift-${eq.equipmentId}`,
        title: `Efficiency Drift + Accelerating Maintenance Cost — ${name}`,
        narrative: `${name} is operating at ${Math.round(effLoss)}% below baseline efficiency while maintenance costs are trending ${maintenanceTrend}. The co-occurrence of efficiency degradation and rising maintenance cost is a leading indicator of reliability failure.`,
        severity: effLoss >= 25 ? 'High' : 'Moderate',
        confidence: effLoss >= 20 ? 'High' : 'Moderate',
        affectedEquipment: [name],
        affectedDomains: ['Energy', 'Reliability', 'Financial'],
        evidencePoints: [
          `Efficiency: ${eq.currentEfficiency}% vs baseline ${eq.efficiencyBaseline}% (−${Math.round(effLoss)}%)`,
          `Maintenance cost trend: ${maintenanceTrend}`,
          eq.maintenanceCostAccumulated ? `Accumulated maintenance cost: $${eq.maintenanceCostAccumulated.toLocaleString()}` : 'Maintenance cost on record',
        ],
        rootCauseHypothesis: 'Compounding degradation — efficiency loss increases operational stress which accelerates component wear, increasing maintenance demand and cost in a reinforcing cycle.',
        recommendedAction: `Perform a comprehensive operational assessment on ${name}. Evaluate refrigerant charge (if applicable), heat transfer surfaces, lubrication, alignment, and control sequencing. Compare current operating parameters to manufacturer design intent.`,
        operationalImpact: 'Continued operation in this state increases energy cost and accelerates time to unplanned failure.',
        energyImpact: `A ${Math.round(effLoss)}% efficiency loss translates to proportional energy overconsumption versus design-rated performance.`,
      });
    }
  });

  // ── 4. High alarm log density for specific equipment (alarm normalization risk) ─
  const alarmLogs = logs.filter(l => l.logType === 'alarm' || l.alarmCode || l.severity === 'critical' || l.severity === 'high');
  const alarmsByEquip = groupBy(alarmLogs.filter(l => l.equipmentId), l => l.equipmentId!);
  Object.entries(alarmsByEquip).forEach(([eqId, alarms]) => {
    if (alarms.length >= 5) {
      const eq = equipment.find(e => e.equipmentId === eqId);
      const name = eq?.equipmentName || eqId;
      const interval = recurrenceInterval(alarms.map(a => a.timestamp).filter(Boolean));
      findings.push({
        id: `alarm-norm-${eqId}`,
        title: `Alarm Normalization Risk — ${name}`,
        narrative: `${alarms.length} alarm-level events have been logged for ${name}${interval ? ` at an average interval of ${Math.round(interval)} days` : ''}. High-frequency alarm activity for a single asset is the primary precursor to alarm normalization — where operators begin discounting legitimate warning signals.`,
        severity: alarms.length >= 10 ? 'Critical' : 'High',
        confidence: 'High',
        affectedEquipment: [name],
        affectedDomains: ['Safety', 'Reliability', 'Operations'],
        evidencePoints: [
          `${alarms.length} alarm events logged for ${name}`,
          interval ? `Average alarm interval: ${Math.round(interval)} days` : 'Multiple alarms recorded',
          `Unique alarm types: ${new Set(alarms.map(a => a.alarmCode || a.action).filter(Boolean)).size}`,
        ],
        rootCauseHypothesis: 'Either a persistent unresolved fault condition is generating repeated alarms, or control setpoints are misaligned with current operating conditions.',
        recommendedAction: `Review alarm history for ${name} in sequence. Identify if alarms are recurring within the same operational phase (startup, loading, steady-state). Evaluate whether control system setpoints require recalibration or whether a mechanical root cause exists.`,
        operationalImpact: 'Alarm normalization creates operational blind spots and delays response to genuine fault conditions, increasing catastrophic failure risk.',
      });
    }
  });

  // ── 5. Operator override pattern ─────────────────────────────────────────────
  const overrideLogs = logs.filter(l => l.overrideFlag || l.logType === 'override' || (l.notes && l.notes.toLowerCase().includes('override')));
  if (overrideLogs.length >= 4) {
    const operators = groupBy(overrideLogs.filter(l => l.operator), l => l.operator!);
    const topOperator = Object.entries(operators).sort((a, b) => b[1].length - a[1].length)[0];
    findings.push({
      id: 'operator-overrides',
      title: 'Repeated Operator Override Pattern Detected',
      narrative: `${overrideLogs.length} operator overrides have been logged. Recurring overrides indicate that automatic sequences or setpoints do not match actual operating conditions, or that operators are bypassing protective controls.`,
      severity: overrideLogs.length >= 8 ? 'High' : 'Moderate',
      confidence: 'Moderate',
      affectedEquipment: [...new Set(overrideLogs.map(l => l.equipmentId).filter(Boolean) as string[])],
      affectedDomains: ['Safety', 'Operations', 'Compliance'],
      evidencePoints: [
        `${overrideLogs.length} override events in log history`,
        topOperator ? `Highest override frequency: ${topOperator[0]} (${topOperator[1].length} overrides)` : 'Multiple operators involved',
        `Unique equipment involved: ${new Set(overrideLogs.map(l => l.equipmentId).filter(Boolean)).size}`,
      ],
      rootCauseHypothesis: 'Control sequences may not reflect current equipment condition or operational requirements. Alternatively, operators may lack training on correct response protocols.',
      recommendedAction: 'Audit all override events by equipment and operator. Validate whether override conditions point to equipment drift (setpoints need updating) or protocol failures (operators bypassing controls improperly).',
      operationalImpact: 'Unchecked overrides remove protective layers from equipment operation and erode governance integrity of the operational record.',
    });
  }

  // ── 6. PM timing vs runtime misalignment ─────────────────────────────────────
  equipment.forEach(eq => {
    if (!eq.lastPMDate || !eq.currentRuntimeHours || !eq.designLifeHours) return;
    const daysSincePM = daysBetween(eq.lastPMDate);
    const runtimePct = eq.currentRuntimeHours / eq.designLifeHours;
    if (daysSincePM > 180 && runtimePct > 0.6) {
      const name = eq.equipmentName || eq.equipmentId;
      findings.push({
        id: `pm-misalign-${eq.equipmentId}`,
        title: `PM Timing Misaligned with Runtime — ${name}`,
        narrative: `${name} has not received a PM event in ${Math.round(daysSincePM)} days while operating at ${Math.round(runtimePct * 100)}% of design life runtime. PM intervals based on calendar time alone can fail to reflect actual equipment stress accumulation.`,
        severity: daysSincePM > 365 ? 'High' : 'Moderate',
        confidence: 'High',
        affectedEquipment: [name],
        affectedDomains: ['Reliability', 'Operations'],
        evidencePoints: [
          `Last PM: ${eq.lastPMDate} (${Math.round(daysSincePM)} days ago)`,
          `Current runtime: ${eq.currentRuntimeHours?.toLocaleString()} hrs (${Math.round(runtimePct * 100)}% of design life)`,
        ],
        rootCauseHypothesis: 'PM scheduling may be based on calendar intervals rather than runtime-hour thresholds. High-runtime equipment requires PM frequency adjusted to actual operational load.',
        recommendedAction: `Schedule immediate PM for ${name}. Revise PM protocol to use runtime-hour triggers in addition to calendar-based scheduling.`,
        operationalImpact: 'Deferred maintenance on high-runtime equipment dramatically increases unplanned failure probability and shortens remaining useful life.',
      });
    }
  });

  // ── 7. Environmental-operational correlation (chilled water delta-T / condenser approach drift) ─
  const deltaLogs = logs.filter(l => typeof l.deltaT === 'number' && typeof l.condApproach === 'number');
  if (deltaLogs.length >= 5) {
    const avgDeltaT = deltaLogs.reduce((s, l) => s + (l.deltaT || 0), 0) / deltaLogs.length;
    const avgApproach = deltaLogs.reduce((s, l) => s + (l.condApproach || 0), 0) / deltaLogs.length;
    if (avgDeltaT < 8 || avgApproach > 8) {
      findings.push({
        id: 'thermal-drift',
        title: 'Thermal Performance Drift — Chilled Water ΔT and Condenser Approach',
        narrative: `Analysis of ${deltaLogs.length} logged readings shows average chilled water delta-T of ${avgDeltaT.toFixed(1)}°F and average condenser approach of ${avgApproach.toFixed(1)}°F. ${avgDeltaT < 8 ? 'Low delta-T syndrome reduces chiller efficiency and indicates flow/load imbalance.' : ''} ${avgApproach > 8 ? 'Elevated condenser approach indicates heat transfer degradation.' : ''}`,
        severity: (avgDeltaT < 6 || avgApproach > 12) ? 'High' : 'Moderate',
        confidence: 'Moderate',
        affectedEquipment: [...new Set(deltaLogs.map(l => l.equipmentId).filter(Boolean) as string[])],
        affectedDomains: ['Energy', 'Reliability'],
        evidencePoints: [
          `Avg chilled water ΔT: ${avgDeltaT.toFixed(1)}°F (design target: 8–12°F)`,
          `Avg condenser approach: ${avgApproach.toFixed(1)}°F (design target: <5°F)`,
          `Sample size: ${deltaLogs.length} operational readings`,
        ],
        rootCauseHypothesis: `${avgDeltaT < 8 ? 'Low delta-T suggests excessive chilled water flow, coil bypass, or load distribution imbalance. ' : ''}${avgApproach > 8 ? 'High condenser approach indicates fouled condenser tubes, water treatment issues, or refrigerant overcharge.' : ''}`,
        recommendedAction: 'Inspect condenser tubes for fouling. Review chilled water flow balance. Evaluate pump VFD settings and coil valve operation. Test refrigerant charge.',
        operationalImpact: 'Thermal inefficiency increases compressor lift and energy consumption.',
        energyImpact: 'Each 1°F of condenser approach elevation above design increases chiller energy consumption by approximately 1.5–2%.',
      });
    }
  }

  return findings.slice(0, 12);
}

function scoreReliability(equipment: OIGEquipment[], logs: OIGLog[], workOrders: OIGWorkOrder[]): { score: number; findings: ReliabilityFinding[] } {
  const findings: ReliabilityFinding[] = [];
  let totalScore = 0;

  equipment.forEach(eq => {
    const eqLogs = logs.filter(l => l.equipmentId === eq.equipmentId);
    const eqWOs = workOrders.filter(w => w.equipmentId === eq.equipmentId);
    const alarmCount = eqLogs.filter(l => l.logType === 'alarm' || l.severity === 'critical').length;
    const overrideCount = eqLogs.filter(l => l.overrideFlag || l.logType === 'override').length;
    const repeatFaultPattern = eqWOs.length >= 3 && new Set(eqWOs.map(w => w.type)).size <= 2;

    // Runtime balance check
    const runtimePct = eq.designLifeHours && eq.currentRuntimeHours
      ? (eq.currentRuntimeHours / eq.designLifeHours)
      : null;

    // PM alignment
    let pmAlignmentStatus: ReliabilityFinding['pmAlignmentStatus'] = 'Unknown';
    if (eq.lastPMDate) {
      const daysSincePM = daysBetween(eq.lastPMDate);
      if (daysSincePM <= 90)  pmAlignmentStatus = 'Current';
      else if (daysSincePM <= 180) pmAlignmentStatus = 'Overdue';
      else pmAlignmentStatus = 'Significantly Overdue';
    }

    // Efficiency degradation
    const effLoss = eq.efficiencyBaseline && eq.currentEfficiency
      ? (eq.efficiencyBaseline - eq.currentEfficiency) / eq.efficiencyBaseline
      : 0;

    // Reliability score for this asset (100 = perfect)
    let score = 100;
    score -= Math.min(30, alarmCount * 4);
    score -= Math.min(15, overrideCount * 3);
    if (pmAlignmentStatus === 'Overdue') score -= 10;
    if (pmAlignmentStatus === 'Significantly Overdue') score -= 25;
    if (repeatFaultPattern) score -= 15;
    if (runtimePct && runtimePct > 0.8) score -= 15;
    score -= Math.min(20, effLoss * 40);
    if (eq.maintenanceCostTrend === 'accelerating') score -= 10;
    if (eq.maintenanceCostTrend === 'critical') score -= 20;
    score = Math.max(0, Math.round(score));

    // Degradation rate
    let degradationRate: ReliabilityFinding['degradationRate'] = 'Stable';
    if (score < 40) degradationRate = 'Critical';
    else if (score < 60) degradationRate = 'Accelerating';
    else if (score < 80) degradationRate = 'Gradual';

    const name = eq.equipmentName || eq.equipmentId;
    const narrative = score >= 80
      ? `${name} is operating with acceptable reliability. PM alignment is ${pmAlignmentStatus.toLowerCase()} and no significant alarm patterns detected.`
      : score >= 60
      ? `${name} shows ${degradationRate.toLowerCase()} reliability degradation. ${alarmCount > 0 ? `${alarmCount} alarm events logged. ` : ''}${pmAlignmentStatus !== 'Current' ? `PM is ${pmAlignmentStatus.toLowerCase()}. ` : ''}Monitoring recommended.`
      : `${name} is exhibiting ${degradationRate.toLowerCase()} reliability decline. Immediate operational review required. ${repeatFaultPattern ? 'Repeat fault patterns detected. ' : ''}${effLoss > 0.15 ? `Efficiency has degraded ${Math.round(effLoss * 100)}% from baseline. ` : ''}`;

    findings.push({
      equipmentId: eq.equipmentId,
      equipmentName: name,
      reliabilityScore: score,
      degradationRate,
      alarmFrequency: alarmCount,
      overrideCount,
      pmAlignmentStatus,
      runtimeImbalanceFlag: !!(runtimePct && runtimePct > 0.8),
      repeatFaultPattern,
      narrative,
      recommendation: score < 60
        ? `Immediate: Schedule inspection and root-cause analysis for ${name}. Prioritize PM if overdue.`
        : score < 80
        ? `Within 30 days: Review PM schedule, alarm history, and operator logs for ${name}.`
        : `Continue scheduled maintenance program for ${name}.`,
    });

    totalScore += score;
  });

  const avgScore = equipment.length > 0 ? Math.round(totalScore / equipment.length) : 75;
  return { score: avgScore, findings: findings.sort((a, b) => a.reliabilityScore - b.reliabilityScore) };
}

function validateCompliance(equipment: OIGEquipment[], violations: OIGViolation[], logs: OIGLog[]): ComplianceRisk[] {
  const risks: ComplianceRisk[] = [];
  const today = new Date().toISOString().split('T')[0];

  equipment.forEach(eq => {
    const name = eq.equipmentName || eq.equipmentId;

    // Certification expiry
    if (eq.certificationExpiry) {
      const days = daysUntil(eq.certificationExpiry);
      if (days <= 60) {
        risks.push({
          id: `cert-exp-${eq.equipmentId}`,
          type: 'Expiring Certification',
          equipmentId: eq.equipmentId,
          equipmentName: name,
          description: `${name} certification expires ${days <= 0 ? `${Math.abs(days)} days ago (EXPIRED)` : `in ${days} days`}. Operating with expired certification creates direct regulatory exposure.`,
          daysUntilImpact: days,
          severity: days <= 0 ? 'Critical' : days <= 14 ? 'High' : 'Moderate',
          regulatoryExposure: true,
        });
      }
    }

    // Inspection overdue
    if (eq.lastInspectionDate) {
      const daysSince = daysBetween(eq.lastInspectionDate);
      if (daysSince > 365) {
        risks.push({
          id: `insp-overdue-${eq.equipmentId}`,
          type: 'Overdue Inspection',
          equipmentId: eq.equipmentId,
          equipmentName: name,
          description: `${name} last inspected ${Math.round(daysSince)} days ago. Annual inspection interval has been exceeded by ${Math.round(daysSince - 365)} days.`,
          daysUntilImpact: null,
          severity: daysSince > 730 ? 'High' : 'Moderate',
          regulatoryExposure: daysSince > 545,
        });
      }
    }

    // PM overdue — significant
    if (eq.lastPMDate && daysBetween(eq.lastPMDate) > 270) {
      risks.push({
        id: `pm-overdue-${eq.equipmentId}`,
        type: 'Missing PM Record',
        equipmentId: eq.equipmentId,
        equipmentName: name,
        description: `${name} has no PM record in the last ${Math.round(daysBetween(eq.lastPMDate))} days. Documentation gap compromises maintenance defensibility.`,
        daysUntilImpact: null,
        severity: daysBetween(eq.lastPMDate) > 365 ? 'High' : 'Moderate',
        regulatoryExposure: false,
      });
    }

    // Operating outside design intent
    if (eq.efficiencyBaseline && eq.currentEfficiency) {
      const loss = (eq.efficiencyBaseline - eq.currentEfficiency) / eq.efficiencyBaseline;
      if (loss > 0.3) {
        risks.push({
          id: `design-intent-${eq.equipmentId}`,
          type: 'Operational Authorization',
          equipmentId: eq.equipmentId,
          equipmentName: name,
          description: `${name} is operating at ${Math.round(loss * 100)}% below design efficiency. Operating conditions this far outside design intent may void warranty provisions and requires documented operational authorization.`,
          daysUntilImpact: null,
          severity: loss > 0.4 ? 'High' : 'Moderate',
          regulatoryExposure: false,
        });
      }
    }
  });

  // Unresolved high-severity violations
  const openHighVio = violations.filter(v => v.status === 'open' && (v.severity === 'high' || v.severity === 'critical'));
  openHighVio.slice(0, 5).forEach(v => {
    risks.push({
      id: `open-vio-${v.violationId}`,
      type: 'Regulatory Risk',
      equipmentId: v.equipmentId,
      description: `Open ${v.severity}-severity violation: "${v.description || v.category || 'Unspecified'}". Unresolved violations create cumulative regulatory exposure and compliance record gaps.`,
      daysUntilImpact: v.createdAt ? Math.round(daysBetween(v.createdAt)) : null,
      severity: v.severity === 'critical' ? 'Critical' : 'High',
      regulatoryExposure: true,
    });
  });

  // Logs without operator attribution
  const unattributedLogs = logs.filter(l => !l.operator && l.logType !== 'system').slice(0, 3);
  if (unattributedLogs.length > 5) {
    risks.push({
      id: 'doc-gap-attribution',
      type: 'Documentation Gap',
      description: `${unattributedLogs.length}+ log entries lack operator attribution. Operational records without individual attribution fail audit admissibility standards.`,
      daysUntilImpact: null,
      severity: 'Moderate',
      regulatoryExposure: false,
    });
  }

  return risks.sort((a, b) => {
    const order: Record<FindingSeverity, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3, Informational: 4 };
    return order[a.severity] - order[b.severity];
  });
}

function generatePredictiveInsights(
  equipment: OIGEquipment[],
  workOrders: OIGWorkOrder[],
  logs: OIGLog[],
  violations: OIGViolation[],
): PredictiveInsight[] {
  const insights: PredictiveInsight[] = [];

  // ── Energy optimization ──────────────────────────────────────────────────────
  const kwLogs = logs.filter(l => typeof l.kw === 'number' && typeof l.tons === 'number' && l.tons > 0);
  if (kwLogs.length >= 5) {
    const avgKwPerTon = kwLogs.reduce((s, l) => s + (l.kw! / l.tons!), 0) / kwLogs.length;
    const DESIGN_KW_PER_TON = 0.6;
    if (avgKwPerTon > DESIGN_KW_PER_TON * 1.1) {
      insights.push({
        id: 'energy-kwton',
        category: 'Energy Optimization',
        title: 'Cooling System Energy Intensity Above Design',
        narrative: `Average measured kW/Ton of ${avgKwPerTon.toFixed(2)} exceeds design target of ${DESIGN_KW_PER_TON} kW/Ton by ${Math.round(((avgKwPerTon / DESIGN_KW_PER_TON) - 1) * 100)}%. Sustained operation above design energy intensity indicates degraded system performance.`,
        confidence: kwLogs.length >= 10 ? 'High' : 'Moderate',
        affectedEquipment: [...new Set(kwLogs.map(l => l.equipmentId).filter(Boolean) as string[])],
        estimatedImpact: `${Math.round(((avgKwPerTon / DESIGN_KW_PER_TON) - 1) * 100)}% energy overconsumption vs design intent`,
        recommendedAction: 'Inspect refrigerant charge, condenser heat transfer surface, chilled water flow rates, and compressor performance curves.',
        urgency: '30 Days',
      });
    }
  }

  // ── Startup optimization ──────────────────────────────────────────────────────
  const startupLogs = logs.filter(l => l.logType === 'startup' || (l.action && l.action.toLowerCase().includes('start')));
  if (startupLogs.length >= 4) {
    const unscheduledStarts = startupLogs.filter(l => {
      const h = new Date(l.timestamp).getHours();
      return h < 5 || h > 22;
    });
    if (unscheduledStarts.length >= 2) {
      insights.push({
        id: 'startup-timing',
        category: 'Startup Optimization',
        title: 'Off-Schedule Equipment Starts Detected',
        narrative: `${unscheduledStarts.length} startup events were logged outside standard operating hours. Off-schedule cold starts increase demand charges and thermal stress, particularly for compressor-driven equipment.`,
        confidence: 'Moderate',
        affectedEquipment: [...new Set(startupLogs.map(l => l.equipmentId).filter(Boolean) as string[])],
        estimatedImpact: 'Elevated demand charges and increased thermal fatigue per start',
        recommendedAction: 'Review BAS scheduling. Implement pre-cool strategies to eliminate off-peak cold starts. Evaluate demand response programming.',
        urgency: '30 Days',
      });
    }
  }

  // ── Failure prevention — high-runtime + no PM ────────────────────────────────
  const failureRisk = equipment.filter(eq => {
    const runtimePct = eq.designLifeHours && eq.currentRuntimeHours ? eq.currentRuntimeHours / eq.designLifeHours : 0;
    const pmOverdue = !eq.lastPMDate || daysBetween(eq.lastPMDate) > 180;
    return runtimePct > 0.75 && pmOverdue;
  });
  if (failureRisk.length > 0) {
    insights.push({
      id: 'failure-prevention-runtime',
      category: 'Failure Prevention',
      title: `${failureRisk.length} Asset${failureRisk.length > 1 ? 's' : ''} in High-Risk Runtime Zone with Overdue PM`,
      narrative: `${failureRisk.map(e => e.equipmentName || e.equipmentId).join(', ')} ${failureRisk.length > 1 ? 'are' : 'is'} operating above 75% of design life runtime without a current PM record. The probability of unplanned failure increases significantly in this zone without proactive maintenance.`,
      confidence: 'High',
      affectedEquipment: failureRisk.map(e => e.equipmentName || e.equipmentId),
      estimatedImpact: 'High unplanned failure probability within next 60–90 days',
      recommendedAction: 'Schedule and execute PM for all identified assets before next 30-day window. Include vibration analysis and thermal imaging where applicable.',
      urgency: 'Immediate',
    });
  }

  // ── Load balancing ───────────────────────────────────────────────────────────
  const runtimeByType = groupBy(equipment.filter(e => e.currentRuntimeHours), e => e.equipmentType || 'other');
  Object.entries(runtimeByType).forEach(([type, eqs]) => {
    if (eqs.length < 2) return;
    const runtimes = eqs.map(e => e.currentRuntimeHours!);
    const max = Math.max(...runtimes);
    const min = Math.min(...runtimes);
    if (min > 0 && (max / min) > 2.5) {
      insights.push({
        id: `load-balance-${type}`,
        category: 'Load Balancing',
        title: `${type.replace(/_/g, ' ')} Fleet Runtime Imbalance`,
        narrative: `Runtime hours across ${type.replace(/_/g, ' ')} assets range from ${min.toLocaleString()} to ${max.toLocaleString()} hours — a ${Math.round((max / min - 1) * 100)}% imbalance. Unbalanced runtime accelerates wear on lead units while underutilizing lag units.`,
        confidence: 'High',
        affectedEquipment: eqs.map(e => e.equipmentName || e.equipmentId),
        estimatedImpact: 'Premature lead unit failure; reduced standby redundancy reliability',
        recommendedAction: 'Implement lead/lag rotation schedule. Review BAS sequencing logic to achieve balanced runtime distribution across redundant equipment.',
        urgency: '90 Days',
      });
    }
  });

  // ── Utility reduction ────────────────────────────────────────────────────────
  const highAmpLogs = logs.filter(l => typeof l.ampDraw === 'number' && l.ampDraw > 0);
  if (highAmpLogs.length >= 5) {
    const avgAmp = highAmpLogs.reduce((s, l) => s + l.ampDraw!, 0) / highAmpLogs.length;
    const trend = highAmpLogs.length >= 10
      ? (() => {
          const recent = highAmpLogs.slice(-5).reduce((s, l) => s + l.ampDraw!, 0) / 5;
          const prior = highAmpLogs.slice(0, 5).reduce((s, l) => s + l.ampDraw!, 0) / 5;
          return recent > prior * 1.05 ? 'increasing' : 'stable';
        })()
      : 'stable';
    if (trend === 'increasing') {
      insights.push({
        id: 'amp-draw-trend',
        category: 'Utility Reduction',
        title: 'Increasing Amp Draw Trend Detected',
        narrative: `Logged amp draw values show an increasing trend (avg ${avgAmp.toFixed(0)}A). Rising amp draw on mechanical equipment is a precursor to efficiency loss and indicates increased electrical demand charges.`,
        confidence: 'Moderate',
        affectedEquipment: [...new Set(highAmpLogs.map(l => l.equipmentId).filter(Boolean) as string[])],
        estimatedImpact: 'Elevated demand charges and potential motor overload condition',
        recommendedAction: 'Check motor insulation resistance, bearing condition, power factor, and supply voltage quality. Compare current draw to nameplate %FLA.',
        urgency: '30 Days',
      });
    }
  }

  return insights.slice(0, 10);
}

function buildGovernanceLog(logs: OIGLog[], workOrders: OIGWorkOrder[], violations: OIGViolation[]): GovernanceEntry[] {
  const entries: GovernanceEntry[] = [];

  // Sample logs → governance entries
  const recentLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);
  recentLogs.forEach(l => {
    entries.push({
      timestamp: l.timestamp,
      eventType: l.logType === 'override' ? 'Override' : l.alarmCode ? 'Alarm' : l.logType === 'pm' ? 'PM Event' : 'Log Entry',
      actor: l.operator || 'Unknown',
      description: l.action || l.notes || `${l.logType || 'Activity'} recorded`,
      equipmentId: l.equipmentId,
      auditIntegrity: l.operator ? 'Verified' : 'Missing Attribution',
    });
  });

  // Work orders → governance entries
  workOrders.slice(0, 15).forEach(wo => {
    entries.push({
      timestamp: wo.createdAt || new Date().toISOString(),
      eventType: 'Work Order',
      actor: wo.assignedTo || 'System',
      description: `WO ${wo.workOrderId}: ${wo.title} [${wo.status}]`,
      equipmentId: wo.equipmentId,
      auditIntegrity: wo.assignedTo ? 'Verified' : 'Missing Attribution',
    });
  });

  // Violations → governance entries
  violations.slice(0, 10).forEach(v => {
    entries.push({
      timestamp: v.createdAt || new Date().toISOString(),
      eventType: 'Violation',
      actor: v.operator || 'Unknown',
      description: `${v.severity?.toUpperCase()} ${v.category || 'Violation'}: ${v.description || v.violationId}`,
      equipmentId: v.equipmentId,
      auditIntegrity: v.operator ? 'Verified' : 'Missing Attribution',
    });
  });

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
}

function computeScores(
  correlated: CorrelatedFinding[],
  reliability: { score: number },
  complianceRisks: ComplianceRisk[],
  logs: OIGLog[],
): { compliance: number; efficiency: number; governance: number } {
  // Compliance score
  const criticalRisks = complianceRisks.filter(r => r.severity === 'Critical').length;
  const highRisks = complianceRisks.filter(r => r.severity === 'High').length;
  const complianceScore = Math.max(0, 100 - criticalRisks * 20 - highRisks * 10 - complianceRisks.filter(r => r.severity === 'Moderate').length * 4);

  // Efficiency score
  const energyFindings = correlated.filter(f => f.affectedDomains.includes('Energy')).length;
  const efficiencyScore = Math.max(40, 100 - energyFindings * 15);

  // Governance score
  const unattributed = logs.filter(l => !l.operator).length;
  const total = Math.max(logs.length, 1);
  const attributionRate = (total - unattributed) / total;
  const governanceScore = Math.round(attributionRate * 100);

  return {
    compliance: Math.round(complianceScore),
    efficiency: Math.round(efficiencyScore),
    governance: Math.round(governanceScore),
  };
}

function buildExecutiveSummary(
  overallScore: number,
  correlated: CorrelatedFinding[],
  reliability: { score: number; findings: ReliabilityFinding[] },
  complianceRisks: ComplianceRisk[],
  insights: PredictiveInsight[],
): string {
  const criticalFindings = correlated.filter(f => f.severity === 'Critical').length;
  const highFindings = correlated.filter(f => f.severity === 'High').length;
  const criticalCompliance = complianceRisks.filter(r => r.severity === 'Critical' || r.severity === 'High').length;
  const immediateInsights = insights.filter(i => i.urgency === 'Immediate').length;
  const lowReliabilityAssets = reliability.findings.filter(f => f.reliabilityScore < 60).length;

  const scoreDesc = overallScore >= 85 ? 'operating in good standing' : overallScore >= 70 ? 'performing at acceptable levels with identified risk areas' : overallScore >= 55 ? 'exhibiting meaningful operational risk requiring management attention' : 'operating in a high-risk state requiring immediate executive action';

  let summary = `Facility operational intelligence analysis indicates a system-wide health score of ${overallScore}/100 — ${scoreDesc}. `;

  if (criticalFindings > 0 || highFindings > 0) {
    summary += `The correlation engine identified ${criticalFindings + highFindings} high-priority operational patterns requiring intervention${criticalFindings > 0 ? ', including critical conditions' : ''}. `;
  }

  if (lowReliabilityAssets > 0) {
    summary += `${lowReliabilityAssets} asset${lowReliabilityAssets > 1 ? 's are' : ' is'} exhibiting accelerating or critical reliability degradation. `;
  }

  if (criticalCompliance > 0) {
    summary += `${criticalCompliance} compliance risk${criticalCompliance > 1 ? 's' : ''} with regulatory exposure ${criticalCompliance > 1 ? 'have' : 'has'} been flagged. `;
  }

  if (immediateInsights > 0) {
    summary += `${immediateInsights} predictive action${immediateInsights > 1 ? 's' : ''} require immediate execution to prevent escalation. `;
  }

  summary += overallScore >= 80
    ? 'Continue current operational discipline and address identified opportunities to sustain performance.'
    : 'Immediate executive review of prioritized findings and corrective action assignment is recommended.';

  return summary;
}

// ── Primary Entry Point ────────────────────────────────────────────────────────

export function runOIGAnalysis(params: {
  facilityId: string;
  logs: OIGLog[];
  workOrders: OIGWorkOrder[];
  equipment: OIGEquipment[];
  violations: OIGViolation[];
}): OIGAnalysisResult {
  const { facilityId, logs, workOrders, equipment, violations } = params;

  const correlatedFindings = analyzeCorrelations(logs, workOrders, equipment, violations);
  const reliability = scoreReliability(equipment, logs, workOrders);
  const complianceRisks = validateCompliance(equipment, violations, logs);
  const predictiveInsights = generatePredictiveInsights(equipment, workOrders, logs, violations);
  const governanceLog = buildGovernanceLog(logs, workOrders, violations);

  const { compliance, efficiency, governance } = computeScores(correlatedFindings, reliability, complianceRisks, logs);

  const overallHealthScore = Math.round(
    reliability.score * 0.3 +
    compliance * 0.25 +
    efficiency * 0.2 +
    governance * 0.15 +
    Math.max(0, 100 - correlatedFindings.filter(f => f.severity === 'Critical' || f.severity === 'High').length * 8) * 0.1,
  );

  // Operational blind spots
  const blindSpots: string[] = [];
  if (equipment.filter(e => !e.lastInspectionDate).length > 2)
    blindSpots.push('Multiple assets have no inspection date on record — operational state unknown');
  if (logs.filter(l => !l.operator).length > logs.length * 0.3)
    blindSpots.push('More than 30% of log entries lack operator attribution — accountability gap exists');
  if (equipment.filter(e => !e.baseline).length > equipment.length * 0.5)
    blindSpots.push('Majority of equipment has no baseline parameters set — anomaly detection is limited');
  if (violations.filter(v => v.status === 'open' && v.createdAt && daysBetween(v.createdAt) > 30).length > 0)
    blindSpots.push('Violations open for >30 days suggest escalation procedures are not being followed');

  // Normalization of deviance
  const deviance: string[] = [];
  const woByEquip = groupBy(workOrders.filter(w => w.equipmentId), w => w.equipmentId!);
  Object.entries(woByEquip).forEach(([id, wos]) => {
    if (wos.length >= 4) {
      const eq = equipment.find(e => e.equipmentId === id);
      deviance.push(`${eq?.equipmentName || id}: ${wos.length} work orders accepted as routine — underlying fault may be normalized`);
    }
  });
  const alarmEqs = groupBy(logs.filter(l => l.logType === 'alarm' && l.equipmentId), l => l.equipmentId!);
  Object.entries(alarmEqs).forEach(([id, alarms]) => {
    if (alarms.length >= 6) {
      const eq = equipment.find(e => e.equipmentId === id);
      deviance.push(`${eq?.equipmentName || id}: ${alarms.length} logged alarms may indicate alarm fatigue and normalized response`);
    }
  });

  return {
    analysisTimestamp: new Date().toISOString(),
    facilityId,
    overallHealthScore: Math.min(100, Math.max(0, overallHealthScore)),
    reliabilityScore: reliability.score,
    complianceScore: compliance,
    efficiencyScore: efficiency,
    governanceScore: governance,
    executiveSummary: buildExecutiveSummary(overallHealthScore, correlatedFindings, reliability, complianceRisks, predictiveInsights),
    correlatedFindings,
    reliabilityFindings: reliability.findings,
    complianceRisks,
    predictiveInsights,
    governanceLog,
    operationalBlindSpots: blindSpots,
    normalizationOfDeviance: deviance,
    dataQualityNotes: [
      `${logs.length} facility log records analyzed`,
      `${workOrders.length} work orders correlated`,
      `${equipment.length} equipment assets evaluated`,
      `${violations.length} violation records cross-referenced`,
    ],
  };
}
