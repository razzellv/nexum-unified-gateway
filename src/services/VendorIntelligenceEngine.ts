/**
 * VendorIntelligenceEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes the Vendor Intelligence Score (VIS) — a 0-100 composite metric
 * evaluating every external service provider across seven weighted dimensions.
 *
 * Data sources (read-only):
 *   nexum_vendors               — vendor records
 *   nexum_contractor_jobs       — ContractorInstalls job history
 *   nexum_work_orders           — work order history
 *   nexum_facility_logs         — facility operational logs
 *   nexum_vendor_ratings        — optional manual rating overrides
 *
 * Output:
 *   nexum_vendor_intelligence   — VendorIntelligenceSummary (write)
 *
 * Event dispatched:
 *   nexum_vendor_intelligence_update
 */

const STORE_KEY = 'nexum_vendor_intelligence';

// ── VIS Weight Model ──────────────────────────────────────────────────────────
const WEIGHTS = {
  responseIntelligence:  0.20,
  diagnosticIntelligence: 0.20,
  operationalReliability: 0.15,
  knowledgeRetention:    0.15,
  costPredictability:    0.10,
  communicationQuality:  0.10,
  continuityContribution: 0.10,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type FacilityFamiliarityLabel =
  | 'New'
  | 'Low Familiarity'
  | 'Growing Familiarity'
  | 'High Familiarity'
  | 'Institutional Asset';

export type VISRating =
  | 'Institutional Asset'
  | 'High Performer'
  | 'Reliable Partner'
  | 'Developing'
  | 'At Risk';

export type RiskLevel = 'high' | 'medium' | 'low';
export type TrendDir  = 'improving' | 'stable' | 'declining';

export interface ResponseIntelligence {
  score: number;
  avgResponseTimeHours:    number;
  emergencyReadinessScore: number;
  priorityComplianceScore: number;
  responseTrend:           TrendDir;
}

export interface DiagnosticIntelligence {
  score: number;
  firstTimeDiagnosisRate:  number; // %
  repeatFailureRate:       number; // % — lower is better
  rootCauseSuccessScore:   number;
  callbacksPerTenJobs:     number;
  correctiveEffectiveness: number;
}

export interface OperationalReliability {
  score: number;
  completionRate:       number; // %
  onTimeRate:           number; // %
  qualityScore:         number;
  serviceConsistency:   number;
}

export interface KnowledgeRetention {
  score: number;
  facilityFamiliarityScore:  number;
  assetFamiliarityScore:     number;
  historicalKnowledgeScore:  number;
  operationalContextScore:   number;
  yearsOfService:            number;
  uniqueAssetsServiced:      number;
  systemsServiced:           string[];
  familiarityLabel:          FacilityFamiliarityLabel;
}

export interface CostPredictability {
  score: number;
  costVarianceScore:    number;
  invoiceAccuracyScore: number;
}

export interface CommunicationQuality {
  score: number;
  documentationScore:    number;
  updateFrequencyScore:  number;
}

export interface ContinuityContribution {
  score: number;
  proactiveIdentificationScore: number;
  knowledgePreservationScore:   number;
  onboardingAssistanceScore:    number;
  lessonLearningScore:          number;
  resilienceContribution:       number;
}

export interface TechnicianIntelligenceProfile {
  id:                   string;
  name:                 string;
  vendorId:             string;
  vendorName:           string;
  certifications:       string[];
  visitsCompleted:      number;
  assetsServiced:       string[];
  systemsServiced:      string[];
  diagnosticAccuracy:   number; // %
  responsePerformance:  number; // 0-100
  familiarityScore:     number; // 0-100
  familiarityLabel:     FacilityFamiliarityLabel;
  reliabilityScore:     number; // 0-100
  knowledgeScore:       number; // 0-100
  continuityScore:      number; // 0-100
  overallScore:         number; // 0-100
  lessonsLearned:       string[];
  lastVisit:            string | null;
}

export interface VendorRiskProfile {
  singlePointDependency:  boolean;
  retirementRisk:         RiskLevel;
  turnoverRisk:           RiskLevel;
  knowledgeConcentration: RiskLevel;
  dependencyCategory:     'critical' | 'important' | 'supplemental';
  riskScore:              number; // 0-100, higher = more risk
}

export interface VendorIntelligenceProfile {
  vendorId:   string;
  vendorName: string;
  specialty:  string;

  // Composite score
  visScore: number;
  visRating: VISRating;
  dataConfidence: 'high' | 'medium' | 'low'; // how much real data backs this

  // Component scores
  responseIntelligence:   ResponseIntelligence;
  diagnosticIntelligence: DiagnosticIntelligence;
  operationalReliability: OperationalReliability;
  knowledgeRetention:     KnowledgeRetention;
  costPredictability:     CostPredictability;
  communicationQuality:   CommunicationQuality;
  continuityContribution: ContinuityContribution;

  // Risk
  risk: VendorRiskProfile;

  // Technicians
  technicians: TechnicianIntelligenceProfile[];

  // AI-generated insights
  aiInsights: string[];

  // Meta
  totalJobsCompleted: number;
  totalCallbacks:     number;
  lastServiceDate:    string | null;
  firstServiceDate:   string | null;
  assetsServiced:     string[];
  systemsServiced:    string[];
}

export interface VendorIntelligenceSummary {
  computedAt:              string;
  totalVendors:            number;
  profiles:                VendorIntelligenceProfile[];
  topPerformers:           string[]; // vendorIds
  knowledgeLeaders:        string[];
  highRiskVendors:         string[];
  mostValuable:            string[];
  avgVIS:                  number;
  portfolioRiskScore:      number; // 0-100 overall risk of vendor portfolio
  portfolioContinuityScore: number;
  aiPortfolioInsights:     string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson<T>(key: string, fb: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch { return fb; }
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function familiarityLabel(score: number): FacilityFamiliarityLabel {
  if (score >= 85) return 'Institutional Asset';
  if (score >= 65) return 'High Familiarity';
  if (score >= 40) return 'Growing Familiarity';
  if (score >= 15) return 'Low Familiarity';
  return 'New';
}

function visRating(score: number): VISRating {
  if (score >= 85) return 'Institutional Asset';
  if (score >= 70) return 'High Performer';
  if (score >= 55) return 'Reliable Partner';
  if (score >= 40) return 'Developing';
  return 'At Risk';
}

function yearsFromDate(dateStr: string | null): number {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000);
}

// ── VIS computation per vendor ────────────────────────────────────────────────

function computeProfile(
  vendor: any,
  jobs:   any[],
  wos:    any[],
  logs:   any[],
): VendorIntelligenceProfile {
  const vid   = String(vendor.id || vendor.vendorId || vendor.PK || vendor.name || '');
  const vname = String(vendor.name || vendor.companyName || vendor.vendorName || 'Unknown');
  const spec  = Array.isArray(vendor.specialty) ? vendor.specialty.join(', ') : String(vendor.specialty || '');

  // ── Vendor-specific data ───────────────────────────────────────────────────
  const vendorJobs = jobs.filter(j => {
    const jVendor = (j.vendor || j.company || j.contractor || '').toLowerCase();
    return jVendor === vname.toLowerCase() || jVendor.includes(vname.toLowerCase().split(' ')[0]);
  });
  const vendorWOs = wos.filter(w => {
    const wVendor = (w.assignedTo || w.vendor || w.contractor || '').toLowerCase();
    return wVendor.includes(vname.toLowerCase().split(' ')[0]);
  });

  const totalJobs = vendorJobs.length;
  const completedJobs = vendorJobs.filter(j => ['completed', 'passed', 'closed'].includes((j.status || '').toLowerCase())).length;
  const callbacks = vendorJobs.filter(j => j.hasCallback || j.callbackCount > 0).length;
  const totalCallbacks = vendorJobs.reduce((s: number, j: any) => s + (j.callbackCount || (j.hasCallback ? 1 : 0)), 0);

  // Dates
  const jobDates = [...vendorJobs.map((j: any) => j.startDate || j.date || j.createdAt),
                    ...vendorWOs.map((w: any)  => w.createdAt || w.date)]
    .filter(Boolean)
    .sort();
  const firstServiceDate = jobDates[0] || null;
  const lastServiceDate  = jobDates[jobDates.length - 1] || null;
  const yearsService     = yearsFromDate(firstServiceDate);

  // Assets + systems
  const assetsServiced  = [...new Set<string>(vendorJobs.map((j: any) => j.equipment || j.asset || j.equipmentId).filter(Boolean))];
  const systemsServiced = [...new Set<string>(vendorJobs.map((j: any) => j.system || j.systemType || j.jobType).filter(Boolean))];

  // Performance checks (ContractorInstalls)
  const allChecks   = vendorJobs.flatMap((j: any) => j.checks || j.performanceChecks || []);
  const passedChecks = allChecks.filter((c: any) => c.passed || c.result === 'pass').length;
  const qualityPct   = allChecks.length > 0 ? (passedChecks / allChecks.length) * 100 : 70;

  // Vendor API fields (already aggregated in vendor object)
  const apiCompletionRate = typeof vendor.completionRate === 'number' ? vendor.completionRate : null;
  const apiOnTime         = typeof vendor.onTime === 'number' ? vendor.onTime : null;

  // ── Data confidence ────────────────────────────────────────────────────────
  const dataPoints = totalJobs + vendorWOs.length + (apiCompletionRate !== null ? 5 : 0);
  const dataConfidence: 'high' | 'medium' | 'low' =
    dataPoints >= 15 ? 'high' : dataPoints >= 5 ? 'medium' : 'low';

  // ── 1. Response Intelligence (20%) ────────────────────────────────────────
  const avgResponseTimeHours = vendor.avgResponseTime || (dataConfidence === 'low' ? 4 : 2.5);
  const emergencyReadiness   = vendor.emergencyContact ? 80 : 60;
  const responseTrend: TrendDir = vendorWOs.length >= 3 ? 'stable' : 'stable';
  const responseScore = clamp(
    (Math.max(0, 100 - avgResponseTimeHours * 8)) * 0.4 +
    emergencyReadiness * 0.3 +
    (apiOnTime ?? 75) * 0.3
  );

  // ── 2. Diagnostic Intelligence (20%) ─────────────────────────────────────
  const firstTimeDiagnosisRate = totalJobs > 0
    ? clamp(((totalJobs - callbacks) / totalJobs) * 100)
    : (apiCompletionRate ?? 75);
  const repeatFailureRate    = clamp(totalJobs > 0 ? (callbacks / totalJobs) * 100 : 15);
  const rootCauseScore       = clamp(firstTimeDiagnosisRate * 0.7 + (100 - repeatFailureRate) * 0.3);
  const callbacksPer10       = totalJobs > 0 ? (totalCallbacks / totalJobs) * 10 : 1.5;
  const diagnosticScore      = clamp(firstTimeDiagnosisRate * 0.5 + rootCauseScore * 0.3 + Math.max(0, 100 - callbacksPer10 * 15) * 0.2);

  // ── 3. Operational Reliability (15%) ──────────────────────────────────────
  const completionRate  = apiCompletionRate ?? (totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 72);
  const onTimeRate      = apiOnTime ?? 75;
  const serviceConsistency = clamp(completionRate * 0.5 + onTimeRate * 0.5);
  const reliabilityScore = clamp(completionRate * 0.4 + onTimeRate * 0.35 + qualityPct * 0.25);

  // ── 4. Knowledge Retention (15%) ──────────────────────────────────────────
  // Years of service drives baseline; assets/systems breadth scales it up
  const yearScore      = clamp(Math.min(yearsService * 20, 80) + (assetsServiced.length >= 3 ? 15 : assetsServiced.length * 5));
  const assetScore     = clamp(Math.min(assetsServiced.length * 12, 80) + (systemsServiced.length * 5));
  const historyScore   = clamp(Math.min(totalJobs * 4, 60) + yearScore * 0.4);
  const contextScore   = clamp((yearScore + assetScore) / 2);
  const knowledgeScore = clamp(yearScore * 0.35 + assetScore * 0.25 + historyScore * 0.25 + contextScore * 0.15);
  const famLabel       = familiarityLabel(knowledgeScore);

  // ── 5. Cost Predictability (10%) ──────────────────────────────────────────
  const costVariance    = vendor.costVariancePct ?? (dataConfidence === 'high' ? 10 : 20);
  const invoiceAccuracy = clamp(100 - costVariance * 1.5);
  const costScore       = clamp(invoiceAccuracy * 0.5 + Math.max(0, 100 - costVariance * 2) * 0.5);

  // ── 6. Communication Quality (10%) ────────────────────────────────────────
  const docScore    = clamp(totalJobs > 0 ? Math.min(totalJobs * 8, 80) + (vendor.notes ? 15 : 0) : 50);
  const updateScore = clamp(vendorWOs.length > 0 ? 70 : 55);
  const commScore   = clamp(docScore * 0.6 + updateScore * 0.4);

  // ── 7. Continuity Contribution (10%) ─────────────────────────────────────
  const proactiveScore   = clamp(knowledgeScore * 0.6 + diagnosticScore * 0.4);
  const knowledgePresScore = clamp(yearScore * 0.7 + docScore * 0.3);
  const onboardingScore  = yearsService >= 2 ? clamp(knowledgeScore * 0.8) : 30;
  const lessonScore      = clamp(totalJobs >= 5 ? Math.min(totalJobs * 5, 70) + 20 : totalJobs * 5);
  const resilienceScore  = clamp((proactiveScore + knowledgePresScore + onboardingScore) / 3);
  const continuityScore  = clamp(proactiveScore * 0.25 + knowledgePresScore * 0.25 + onboardingScore * 0.2 + lessonScore * 0.15 + resilienceScore * 0.15);

  // ── Composite VIS ─────────────────────────────────────────────────────────
  const vis = clamp(
    responseScore       * WEIGHTS.responseIntelligence +
    diagnosticScore     * WEIGHTS.diagnosticIntelligence +
    reliabilityScore    * WEIGHTS.operationalReliability +
    knowledgeScore      * WEIGHTS.knowledgeRetention +
    costScore           * WEIGHTS.costPredictability +
    commScore           * WEIGHTS.communicationQuality +
    continuityScore     * WEIGHTS.continuityContribution
  );

  // ── Risk profile ─────────────────────────────────────────────────────────
  const systemCount     = systemsServiced.length || 1;
  const isOnlyVendor    = systemCount >= 3 && yearsService >= 3;
  const turnoverRisk: RiskLevel = yearsService > 5 && knowledgeScore > 70 ? 'high' : yearsService > 2 ? 'medium' : 'low';
  const retirementRisk: RiskLevel = yearsService > 8 ? 'high' : yearsService > 4 ? 'medium' : 'low';
  const knowledgeConc: RiskLevel = knowledgeScore > 75 && systemCount >= 2 ? 'high' : knowledgeScore > 50 ? 'medium' : 'low';
  const riskScore = clamp(
    (turnoverRisk === 'high' ? 40 : turnoverRisk === 'medium' ? 25 : 10) +
    (retirementRisk === 'high' ? 30 : retirementRisk === 'medium' ? 20 : 8) +
    (knowledgeConc === 'high' ? 20 : knowledgeConc === 'medium' ? 12 : 5) +
    (isOnlyVendor ? 10 : 0)
  );

  // ── Technician profiles ───────────────────────────────────────────────────
  const rawTechs: string[] = [
    ...new Set<string>([
      ...vendorJobs.map((j: any) => j.techName || j.technician || j.tech || '').filter(Boolean),
      ...(vendor.technicians || []).map((t: any) => t.name || t),
    ])
  ];
  const technicians: TechnicianIntelligenceProfile[] = rawTechs.map((tname, idx) => {
    const techJobs = vendorJobs.filter((j: any) => {
      const jtech = (j.techName || j.technician || j.tech || '').toLowerCase();
      return jtech === tname.toLowerCase() || jtech.includes(tname.toLowerCase().split(' ')[0]);
    });
    const tv    = techJobs.length;
    const tcbs  = techJobs.filter((j: any) => j.hasCallback).length;
    const tda   = tv > 0 ? clamp(((tv - tcbs) / tv) * 100) : clamp(diagnosticScore + (idx % 3 === 0 ? 5 : -5));
    const tfam  = clamp(Math.min(tv * 10, 70) + (yearsService > 2 ? 20 : 5));
    const trel  = clamp(tda * 0.5 + (apiOnTime ?? 75) * 0.3 + tfam * 0.2);
    const tkno  = clamp(tfam * 0.6 + tda * 0.4);
    const tcon  = clamp((tfam + trel + tkno) / 3);
    return {
      id:                  `tech-${vid}-${idx}`,
      name:                tname,
      vendorId:            vid,
      vendorName:          vname,
      certifications:      vendor.certifications || [],
      visitsCompleted:     tv,
      assetsServiced:      techJobs.map((j: any) => j.equipment || j.asset).filter(Boolean),
      systemsServiced:     techJobs.map((j: any) => j.system || j.jobType).filter(Boolean),
      diagnosticAccuracy:  tda,
      responsePerformance: responseScore,
      familiarityScore:    tfam,
      familiarityLabel:    familiarityLabel(tfam),
      reliabilityScore:    trel,
      knowledgeScore:      tkno,
      continuityScore:     tcon,
      overallScore:        clamp((tda + trel + tkno + tcon + tfam) / 5),
      lessonsLearned:      [],
      lastVisit:           lastServiceDate,
    };
  });

  // ── AI Insights ───────────────────────────────────────────────────────────
  const ai: string[] = [];
  if (yearsService >= 5 && knowledgeScore >= 70) {
    ai.push(`${vname} has provided service for ${yearsService.toFixed(0)} years and possesses significant institutional knowledge. Replacement risk is elevated — ensure documented handoff protocols exist.`);
  }
  if (diagnosticScore >= 80) {
    ai.push(`${vname} demonstrates strong first-time diagnostic accuracy (${firstTimeDiagnosisRate.toFixed(0)}%). This reduces operational downtime and repeat service costs.`);
  } else if (diagnosticScore < 55) {
    ai.push(`${vname}'s callback rate is ${callbacksPer10.toFixed(1)} per 10 jobs — above acceptable thresholds. Investigate root cause quality and require corrective action documentation.`);
  }
  if (responseScore >= 80) {
    ai.push(`${vname} has strong emergency response performance. Prioritize retaining this vendor for critical system coverage.`);
  }
  if (riskScore >= 65) {
    ai.push(`${vname} represents elevated dependency risk. The combination of institutional knowledge concentration and ${turnoverRisk} turnover exposure creates continuity vulnerability.`);
  }
  if (continuityScore >= 75) {
    ai.push(`${vname} actively contributes to operational continuity through knowledge preservation and proactive issue identification.`);
  }
  if (technicians.length > 0) {
    const best = technicians.reduce((a, b) => a.overallScore > b.overallScore ? a : b);
    ai.push(`Technician ${best.name} demonstrates the highest performance profile within ${vname}'s team (score: ${best.overallScore}/100, diagnostic accuracy: ${best.diagnosticAccuracy.toFixed(0)}%).`);
  }
  if (commScore < 50) {
    ai.push(`${vname} shows limited documentation quality. Require detailed service reports and lessons-learned documentation going forward.`);
  }

  return {
    vendorId:   vid,
    vendorName: vname,
    specialty:  spec,
    visScore:   vis,
    visRating:  visRating(vis),
    dataConfidence,
    responseIntelligence: {
      score: responseScore,
      avgResponseTimeHours,
      emergencyReadinessScore: emergencyReadiness,
      priorityComplianceScore: clamp(apiOnTime ?? 75),
      responseTrend,
    },
    diagnosticIntelligence: {
      score:                  diagnosticScore,
      firstTimeDiagnosisRate,
      repeatFailureRate,
      rootCauseSuccessScore:  rootCauseScore,
      callbacksPerTenJobs:    parseFloat(callbacksPer10.toFixed(1)),
      correctiveEffectiveness: clamp(rootCauseScore * 0.8),
    },
    operationalReliability: {
      score:              reliabilityScore,
      completionRate,
      onTimeRate,
      qualityScore:       clamp(qualityPct),
      serviceConsistency,
    },
    knowledgeRetention: {
      score:                    knowledgeScore,
      facilityFamiliarityScore: yearScore,
      assetFamiliarityScore:    assetScore,
      historicalKnowledgeScore: historyScore,
      operationalContextScore:  contextScore,
      yearsOfService:           parseFloat(yearsService.toFixed(1)),
      uniqueAssetsServiced:     assetsServiced.length,
      systemsServiced,
      familiarityLabel:         famLabel,
    },
    costPredictability: {
      score:             costScore,
      costVarianceScore: clamp(100 - costVariance * 2),
      invoiceAccuracyScore: invoiceAccuracy,
    },
    communicationQuality: {
      score:                commScore,
      documentationScore:   docScore,
      updateFrequencyScore: updateScore,
    },
    continuityContribution: {
      score:                        continuityScore,
      proactiveIdentificationScore: proactiveScore,
      knowledgePreservationScore:   knowledgePresScore,
      onboardingAssistanceScore:    onboardingScore,
      lessonLearningScore:          lessonScore,
      resilienceContribution:       resilienceScore,
    },
    risk: {
      singlePointDependency:  isOnlyVendor,
      retirementRisk,
      turnoverRisk,
      knowledgeConcentration: knowledgeConc,
      dependencyCategory: vis >= 70 ? 'critical' : vis >= 50 ? 'important' : 'supplemental',
      riskScore,
    },
    technicians,
    aiInsights: ai,
    totalJobsCompleted: completedJobs,
    totalCallbacks,
    lastServiceDate,
    firstServiceDate,
    assetsServiced,
    systemsServiced,
  };
}

// ── Main engine ───────────────────────────────────────────────────────────────

class VendorIntelligenceEngineClass {
  private running = false;

  compute(): VendorIntelligenceSummary {
    if (this.running) return this.getLast();
    this.running = true;
    try {
      const vendors = readJson<any[]>('nexum_vendors', []);
      const jobs    = readJson<any[]>('nexum_contractor_jobs', []);
      const wos     = readJson<any[]>('nexum_work_orders', []);
      const logs    = readJson<any[]>('nexum_facility_logs', []);

      if (vendors.length === 0) {
        const summary = this.buildSummary([]);
        this.save(summary);
        return summary;
      }

      const profiles = vendors.map(v => computeProfile(v, jobs, wos, logs));
      const summary  = this.buildSummary(profiles);
      this.save(summary);
      this.dispatch();
      return summary;
    } finally {
      this.running = false;
    }
  }

  getLast(): VendorIntelligenceSummary {
    return readJson<VendorIntelligenceSummary>(STORE_KEY, {
      computedAt: new Date().toISOString(),
      totalVendors: 0,
      profiles: [],
      topPerformers: [],
      knowledgeLeaders: [],
      highRiskVendors: [],
      mostValuable: [],
      avgVIS: 0,
      portfolioRiskScore: 0,
      portfolioContinuityScore: 0,
      aiPortfolioInsights: [],
    });
  }

  private buildSummary(profiles: VendorIntelligenceProfile[]): VendorIntelligenceSummary {
    const sorted = [...profiles].sort((a, b) => b.visScore - a.visScore);
    const avgVIS = profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.visScore, 0) / profiles.length)
      : 0;

    const portfolioRisk = profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.risk.riskScore, 0) / profiles.length)
      : 0;

    const portfolioContinuity = profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.continuityContribution.score, 0) / profiles.length)
      : 0;

    const singlePointCount = profiles.filter(p => p.risk.singlePointDependency).length;
    const highKnowledge    = profiles.filter(p => p.knowledgeRetention.score >= 70).length;

    const aiPortfolio: string[] = [];
    if (singlePointCount > 0) {
      aiPortfolio.push(`${singlePointCount} vendor${singlePointCount > 1 ? 's are' : ' is'} classified as single-point-of-dependency. Operational continuity is at risk if any are unavailable.`);
    }
    if (highKnowledge >= 2) {
      aiPortfolio.push(`${highKnowledge} vendors carry high institutional knowledge. Structured knowledge capture sessions are recommended before any contract renewals or transitions.`);
    }
    if (avgVIS < 60) {
      aiPortfolio.push(`Portfolio average VIS (${avgVIS}) is below the recommended threshold of 60. Review vendor selection criteria and performance expectations.`);
    }
    if (portfolioContinuity < 50) {
      aiPortfolio.push(`Vendor portfolio shows low continuity contribution (${portfolioContinuity}/100). Require knowledge documentation and onboarding assistance in future contracts.`);
    }

    return {
      computedAt:               new Date().toISOString(),
      totalVendors:             profiles.length,
      profiles:                 sorted,
      topPerformers:            sorted.slice(0, 3).map(p => p.vendorId),
      knowledgeLeaders:         [...profiles].sort((a, b) => b.knowledgeRetention.score - a.knowledgeRetention.score).slice(0, 3).map(p => p.vendorId),
      highRiskVendors:          profiles.filter(p => p.risk.riskScore >= 60).map(p => p.vendorId),
      mostValuable:             profiles.filter(p => p.visScore >= 70 && p.knowledgeRetention.score >= 60).map(p => p.vendorId),
      avgVIS,
      portfolioRiskScore:       portfolioRisk,
      portfolioContinuityScore: portfolioContinuity,
      aiPortfolioInsights:      aiPortfolio,
    };
  }

  private save(s: VendorIntelligenceSummary): void {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
  }

  private dispatch(): void {
    try { window.dispatchEvent(new CustomEvent('nexum_vendor_intelligence_update')); } catch {}
  }
}

export const VendorIntelligenceEngine = new VendorIntelligenceEngineClass();
