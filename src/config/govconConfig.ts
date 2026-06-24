// Master CLIN definitions, rate cards, sector configs, and access control rules.
// This config drives the quote engine, procurement package generator, SOW builder,
// and CLIN-based feature access control.

export type CLINType = 'software' | 'services' | 'training' | 'assessment' | 'support' | 'option_year';
export type ProcurementModel = 'commercial' | 'govcon' | 'enterprise' | 'utility' | 'healthcare' | 'education';
export type Sector = 'government' | 'utility' | 'healthcare' | 'education' | 'manufacturing' | 'infrastructure' | 'facility' | 'retail' | 'property' | 'public_safety';
export type LaborCategory = 'PM' | 'SCA' | 'BD' | 'TS' | 'SME' | 'ADMIN';

export interface CLIN {
  id: string;           // 'CLIN_0001'
  number: string;       // '0001'
  title: string;
  description: string;
  type: CLINType;
  unitPrice: {
    commercial: number;
    govcon: number;
    enterprise: number;
  };
  unit: string;         // 'per year', 'per user/year', 'one-time', 'per month'
  minQty: number;
  maxQty: number | null;
  laborCategory?: LaborCategory;
  periodOfPerformance?: string; // '12 months', '1 day', etc.
  sectors: Sector[];
  featureFlags: string[]; // features unlocked by purchasing this CLIN
  deliverables: string[];
  isOptionYear?: boolean;
  baseCliN?: string;    // for option years, reference to base CLIN
  stripe?: boolean;     // can also be purchased via Stripe
}

export const CLINS: CLIN[] = [
  {
    id: 'CLIN_0001',
    number: '0001',
    title: 'Facility Intelligence™ Platform License',
    description: 'Annual platform license for Facility Intelligence™ SaaS. Includes core operational logging, equipment library, compliance tracking, work orders, and command hub access.',
    type: 'software',
    unitPrice: { commercial: 4970, govcon: 7470, enterprise: 9970 },
    unit: 'per agency/year',
    minQty: 1, maxQty: null,
    periodOfPerformance: '12 months',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['core_platform', 'equipment_library', 'compliance_logger', 'work_orders', 'command_hub', 'facility_data_source'],
    deliverables: ['Platform access credentials', 'Admin onboarding documentation', 'System configuration guide'],
  },
  {
    id: 'CLIN_0002',
    number: '0002',
    title: 'Implementation Services',
    description: 'Guided platform implementation including system configuration, data migration support, integration setup, and deployment validation.',
    type: 'services',
    unitPrice: { commercial: 4999, govcon: 7500, enterprise: 12000 },
    unit: 'one-time',
    minQty: 1, maxQty: 1,
    laborCategory: 'PM',
    periodOfPerformance: '60 days',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['implementation_center', 'deployment_dashboard', 'onboarding_status'],
    deliverables: ['Deployment plan', 'System configuration documentation', 'Integration test report', 'Go-live sign-off'],
  },
  {
    id: 'CLIN_0003',
    title: 'Training Services',
    number: '0003',
    description: 'Platform training program for operations teams. Includes role-based training modules, hands-on sessions, and certification documentation.',
    type: 'training',
    unitPrice: { commercial: 3500, govcon: 4500, enterprise: 6500 },
    unit: 'per cohort',
    minQty: 1, maxQty: null,
    laborCategory: 'TS',
    periodOfPerformance: '30 days',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['training_portal', 'lms_access', 'optimize_learn'],
    deliverables: ['Training curriculum', 'Role-based training sessions', 'Completion certificates', 'Training completion report'],
  },
  {
    id: 'CLIN_0004',
    number: '0004',
    title: 'Operational Trust Assessment™ (OTA)',
    description: 'On-site structured assessment evaluating an organization\'s ability to reliably execute and sustain its operational commitments. Produces an Operational Readiness Score, risk register, and executive briefing.',
    type: 'assessment',
    unitPrice: { commercial: 7500, govcon: 12500, enterprise: 24999 },
    unit: 'per engagement',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '1–5 days on-site + 14 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['operational_trust_workspace', 'ota_assessment', 'risk_register_ota', 'ota_executive_report'],
    deliverables: [
      'Operational Risk Register',
      'Knowledge Loss Assessment',
      'Deferred Maintenance Analysis',
      'Decision Continuity Assessment',
      'Workforce Risk Analysis',
      'Operational Readiness Score (0–100)',
      'Executive Briefing document',
    ],
  },
  {
    id: 'CLIN_0005',
    number: '0005',
    title: 'Knowledge Preservation Assessment™ (KPA)',
    description: 'Structured assessment identifying critical knowledge at risk of being lost due to retirement, turnover, or inadequate documentation. Includes dependency mapping and succession planning recommendations.',
    type: 'assessment',
    unitPrice: { commercial: 5000, govcon: 9970, enterprise: 19970 },
    unit: 'per engagement',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '2–3 days + 10 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'public_safety'],
    featureFlags: ['knowledge_capture_engine', 'retirement_risk_analytics', 'dc_vault', 'knowledge_preservation'],
    deliverables: [
      'Critical employee knowledge map',
      'Retirement exposure report',
      'Knowledge dependency matrix',
      'Documentation gap analysis',
      'Succession planning recommendations',
      'Knowledge Risk Score',
    ],
  },
  {
    id: 'CLIN_0006',
    number: '0006',
    title: 'Facility Intelligence Deployment',
    description: 'Physical on-site engagement to validate virtual assessments, conduct operator interviews, map systems, and generate live operational intelligence. Includes FIWE™ walkthrough.',
    type: 'services',
    unitPrice: { commercial: 2500, govcon: 4970, enterprise: 9970 },
    unit: 'per facility',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '1 day on-site + 7 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['deployment_dashboard', 'facility_memory', 'operational_dna'],
    deliverables: [
      'Physical walkthrough documentation',
      'Operator interview transcripts',
      'System map update',
      'Audit trail generation',
      'Deployment validation report',
    ],
  },
  {
    id: 'CLIN_0007',
    number: '0007',
    title: 'Compliance Readiness Assessment™ (CRA)',
    description: 'Comprehensive compliance gap analysis across OSHA, EPA, NFPA, local regulations, and sector-specific standards. Produces a prioritized remediation roadmap.',
    type: 'assessment',
    unitPrice: { commercial: 3500, govcon: 7500, enterprise: 14970 },
    unit: 'per engagement',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '2 days + 10 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['compliance_analyzer', 'compliance_documents', 'compliance_logger', 'osha_300'],
    deliverables: [
      'Compliance gap register',
      'Regulatory requirements matrix',
      'Prioritized remediation roadmap',
      'Compliance Readiness Score',
      'Regulatory calendar',
    ],
  },
  {
    id: 'CLIN_0008',
    number: '0008',
    title: 'Operational Intelligence Consulting',
    description: 'Ongoing advisory retainer providing strategic operational guidance, quarterly reviews, weekly improvement reports, custom SOPs, and executive intelligence briefings.',
    type: 'services',
    unitPrice: { commercial: 997, govcon: 1970, enterprise: 4970 },
    unit: 'per month',
    minQty: 3, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '12 months (3-month minimum)',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['operational_intelligence', 'vvfi_access', 'executive_briefing_portal'],
    deliverables: [
      'Quarterly strategy meeting',
      'Custom operational questionnaire',
      'Weekly Analysis to Improve reports',
      'Custom SOPs and checklists on demand',
      '1 VVFI report + 2 copies within 72hrs',
      'Executive intelligence brief (monthly)',
    ],
  },
  {
    id: 'CLIN_0009',
    number: '0009',
    title: 'Annual Support & Maintenance',
    description: 'Priority technical support, platform updates, system monitoring, and quarterly business reviews. Includes dedicated support channel and guaranteed response SLA.',
    type: 'support',
    unitPrice: { commercial: 3000, govcon: 5970, enterprise: 9970 },
    unit: 'per year',
    minQty: 1, maxQty: null,
    laborCategory: 'ADMIN',
    periodOfPerformance: '12 months',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['priority_support', 'dedicated_support_channel', 'quarterly_business_review'],
    deliverables: [
      'Dedicated support channel',
      '4-hour response SLA',
      'Platform update notifications',
      'Quarterly business review',
      'Annual system health report',
    ],
  },
  {
    id: 'CLIN_0010',
    number: '0010',
    title: 'Option Year 1',
    description: 'Option Year 1 renewal pricing for all base period CLINs. Priced at base period rates with annual escalation cap of 3%.',
    type: 'option_year',
    unitPrice: { commercial: 0, govcon: 0, enterprise: 0 }, // calculated at 103% of base
    unit: 'per year',
    minQty: 1, maxQty: 1,
    periodOfPerformance: '12 months',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: [],
    deliverables: ['Continuation of all base period deliverables at Option Year 1 rates'],
    isOptionYear: true,
    baseCliN: 'CLIN_0001',
  },
  {
    id: 'CLIN_0011',
    number: '0011',
    title: 'Option Year 2',
    description: 'Option Year 2 renewal pricing. Priced at 103% of Option Year 1 rates.',
    type: 'option_year',
    unitPrice: { commercial: 0, govcon: 0, enterprise: 0 },
    unit: 'per year',
    minQty: 1, maxQty: 1,
    periodOfPerformance: '12 months',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: [],
    deliverables: ['Continuation of all base period deliverables at Option Year 2 rates'],
    isOptionYear: true,
    baseCliN: 'CLIN_0001',
  },
  {
    id: 'CLIN_0012',
    number: '0012',
    title: 'Option Year 3',
    description: 'Option Year 3 renewal pricing. Priced at 103% of Option Year 2 rates.',
    type: 'option_year',
    unitPrice: { commercial: 0, govcon: 0, enterprise: 0 },
    unit: 'per year',
    minQty: 1, maxQty: 1,
    periodOfPerformance: '12 months',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: [],
    deliverables: ['Continuation of all base period deliverables at Option Year 3 rates'],
    isOptionYear: true,
    baseCliN: 'CLIN_0001',
  },
  // ── On-Site Service CLINs (from existing service cards) ──────────────────────
  {
    id: 'CLIN_S001',
    number: 'S001',
    title: 'FI™ Assessment',
    description: '1-day structured facility assessment. Produces operational risk scoring, compliance gap identification, knowledge continuity review, and executive findings report.',
    type: 'assessment',
    unitPrice: { commercial: 5000, govcon: 7500, enterprise: 12500 },
    unit: 'per engagement',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '1 day on-site + 14 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['fias_access', 'fi_assessment_workspace'],
    deliverables: ['1-day structured facility assessment', 'Operational risk scoring', 'Compliance gap identification', 'Knowledge continuity review', 'Executive findings report'],
  },
  {
    id: 'CLIN_S002',
    number: 'S002',
    title: 'Onsite Lite — FIWE™',
    description: 'Physical walkthrough validating virtual assessments. Includes operator interviews, live audit trail generation, and 60-day Basic FI Platform access.',
    type: 'services',
    unitPrice: { commercial: 2500, govcon: 3970, enterprise: 5970 },
    unit: 'per facility',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '1 day on-site',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['deployment_dashboard', 'fiwe_workspace'],
    deliverables: ['Physical walkthrough report', 'Operator interview summary', 'Live audit trail', '60-day Basic FI Platform access'],
  },
  {
    id: 'CLIN_S003',
    number: 'S003',
    title: 'Full Engagement',
    description: 'Comprehensive multi-day engagement covering all staff roles, system troubleshooting, safety testing, compliance faults, permits, HVAC & energy reports, and full AI operational intelligence report.',
    type: 'services',
    unitPrice: { commercial: 7500, govcon: 12500, enterprise: 24999 },
    unit: 'per engagement',
    minQty: 1, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '2–5 days on-site + 21 days report',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['full_engagement_workspace', 'operational_intelligence', 'deployment_dashboard'],
    deliverables: ['All Onsite Lite deliverables', 'All-staff role documentation', 'Safety testing report', 'Compliance fault remediation plan', 'Permits inventory', 'HVAC & energy efficiency report', 'Full AI operational intelligence report'],
  },
  {
    id: 'CLIN_S004',
    number: 'S004',
    title: 'VVFI Retainer — Consulting',
    description: 'Ongoing monthly advisory retainer. Includes quarterly strategy meetings, weekly improvement reports, custom SOPs, 1 VVFI report + 2 copies, and 20% discount on first-year FI Platform license.',
    type: 'services',
    unitPrice: { commercial: 997, govcon: 1970, enterprise: 3970 },
    unit: 'per month',
    minQty: 3, maxQty: null,
    laborCategory: 'SME',
    periodOfPerformance: '12 months (3-month minimum)',
    sectors: ['government', 'facility', 'utility', 'healthcare', 'education', 'manufacturing', 'infrastructure', 'public_safety'],
    featureFlags: ['vvfi_access', 'consulting_portal'],
    deliverables: ['Quarterly strategy meeting', 'Weekly Analysis to Improve reports', 'Custom SOPs on demand', '1 VVFI report + 2 copies within 72hrs', 'Executive intelligence brief monthly'],
  },
];

export interface RateCard {
  id: string;
  name: string;
  model: ProcurementModel;
  description: string;
  multiplier: number; // relative to commercial base
  laborRates: Record<LaborCategory, number>; // $/hour
  overhead: number;   // %
  ga: number;         // G&A %
  profit: number;     // profit %
  validThrough: string;
}

export const RATE_CARDS: RateCard[] = [
  {
    id: 'rc_commercial',
    name: 'Commercial Rate Card',
    model: 'commercial',
    description: 'Direct purchase pricing for commercial, municipal, and small organizations via Stripe checkout.',
    multiplier: 1.0,
    laborRates: { PM: 150, SCA: 125, BD: 175, TS: 100, SME: 200, ADMIN: 75 },
    overhead: 0, ga: 0, profit: 0,
    validThrough: '2026-12-31',
  },
  {
    id: 'rc_govcon',
    name: 'GovCon Rate Card',
    model: 'govcon',
    description: 'Government contracting pricing for federal, state, county, and municipal procurement via solicitations, IDIQs, and contract vehicles.',
    multiplier: 1.5,
    laborRates: { PM: 185, SCA: 155, BD: 215, TS: 130, SME: 245, ADMIN: 95 },
    overhead: 15, ga: 8, profit: 10,
    validThrough: '2026-12-31',
  },
  {
    id: 'rc_enterprise',
    name: 'Enterprise Rate Card',
    model: 'enterprise',
    description: 'Enterprise pricing for large utilities, healthcare systems, universities, and multi-site organizations.',
    multiplier: 2.0,
    laborRates: { PM: 195, SCA: 165, BD: 225, TS: 140, SME: 265, ADMIN: 105 },
    overhead: 12, ga: 7, profit: 12,
    validThrough: '2026-12-31',
  },
  {
    id: 'rc_utility',
    name: 'Utility & Infrastructure Rate Card',
    model: 'utility',
    description: 'Rate card for regulated utilities, water authorities, transit agencies, and port authorities.',
    multiplier: 1.75,
    laborRates: { PM: 190, SCA: 160, BD: 220, TS: 135, SME: 255, ADMIN: 100 },
    overhead: 14, ga: 7.5, profit: 11,
    validThrough: '2026-12-31',
  },
  {
    id: 'rc_healthcare',
    name: 'Healthcare Rate Card',
    model: 'healthcare',
    description: 'Rate card for hospitals, health systems, and healthcare facility management organizations.',
    multiplier: 1.8,
    laborRates: { PM: 195, SCA: 165, BD: 225, TS: 140, SME: 260, ADMIN: 100 },
    overhead: 13, ga: 7, profit: 11,
    validThrough: '2026-12-31',
  },
  {
    id: 'rc_education',
    name: 'Higher Education Rate Card',
    model: 'education',
    description: 'Rate card for universities, community colleges, and K-12 facility management.',
    multiplier: 1.4,
    laborRates: { PM: 170, SCA: 140, BD: 200, TS: 120, SME: 230, ADMIN: 85 },
    overhead: 12, ga: 6, profit: 9,
    validThrough: '2026-12-31',
  },
];

export const CLIN_ACCESS_RULES: Record<string, string[]> = {
  CLIN_0001: ['core_platform', 'equipment_library', 'compliance_logger', 'work_orders', 'command_hub', 'facility_data_source'],
  CLIN_0002: ['implementation_center', 'deployment_dashboard', 'onboarding_status'],
  CLIN_0003: ['training_portal', 'lms_access', 'optimize_learn'],
  CLIN_0004: ['operational_trust_workspace', 'ota_assessment', 'risk_register_ota', 'ota_executive_report'],
  CLIN_0005: ['knowledge_capture_engine', 'retirement_risk_analytics', 'dc_vault', 'knowledge_preservation'],
  CLIN_0006: ['deployment_dashboard', 'facility_memory', 'operational_dna'],
  CLIN_0007: ['compliance_analyzer', 'compliance_documents', 'compliance_logger', 'osha_300'],
  CLIN_0008: ['operational_intelligence', 'vvfi_access', 'executive_briefing_portal'],
  CLIN_0009: ['priority_support', 'dedicated_support_channel', 'quarterly_business_review'],
  CLIN_S001: ['fias_access', 'fi_assessment_workspace'],
  CLIN_S002: ['deployment_dashboard', 'fiwe_workspace'],
  CLIN_S003: ['full_engagement_workspace', 'operational_intelligence', 'deployment_dashboard'],
  CLIN_S004: ['vvfi_access', 'consulting_portal'],
};

// DynamoDB table schemas (for backend implementation reference)
export const DYNAMODB_SCHEMAS = {
  NexumContracts: {
    PK: 'CONTRACT#<contractId>',
    SK: 'META',
    attributes: ['contractId', 'orgId', 'vehicleType', 'status', 'totalValue', 'startDate', 'endDate', 'basePeriod', 'optionYears', 'clins', 'procurementModel', 'sector', 'contactName', 'contactEmail', 'createdAt', 'updatedAt'],
  },
  NexumCLINInstances: {
    PK: 'CONTRACT#<contractId>',
    SK: 'CLIN#<clinId>#<seq>',
    attributes: ['contractId', 'clinId', 'title', 'unitPrice', 'quantity', 'totalPrice', 'fundingSource', 'periodOfPerformance', 'status', 'deliverablesDue'],
  },
  NexumQuotes: {
    PK: 'ORG#<orgId>',
    SK: 'QUOTE#<timestamp>',
    attributes: ['quoteId', 'orgId', 'orgName', 'contactEmail', 'procurementModel', 'sector', 'selectedClins', 'totalCommercial', 'totalGovcon', 'totalEnterprise', 'optionYearPricing', 'expiresAt', 'status', 'notes'],
  },
  NexumRateCards: {
    PK: 'RATECARD#<id>',
    SK: 'META',
    attributes: ['id', 'model', 'laborRates', 'overhead', 'ga', 'profit', 'validThrough'],
  },
  NexumContractAccessRules: {
    PK: 'CONTRACT#<contractId>',
    SK: 'ACCESS',
    attributes: ['contractId', 'purchasedClins', 'unlockedFeatures', 'userLimit', 'storageLimit', 'supportLevel'],
  },
  NexumProcurementPackages: {
    PK: 'ORG#<orgId>',
    SK: 'PACKAGE#<packageId>',
    attributes: ['packageId', 'orgId', 'quoteId', 'documents', 'sowText', 'romEstimate', 'clinProposal', 'capabilityStatementRef', 'createdAt'],
  },
};
