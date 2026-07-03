// Property Intelligence™ type definitions — Nexum Suum FI Platform

export type PropertyClass = 'class_a' | 'class_b' | 'class_c' | 'class_d';
export type PropertySector = 'residential' | 'commercial' | 'mixed_use' | 'industrial' | 'land';
export type PropertySubtype =
  | 'single_family' | 'duplex' | 'triplex' | 'fourplex' | 'small_multifamily'
  | 'large_multifamily' | 'apartment_complex' | 'condo' | 'townhome'
  | 'office' | 'retail_strip' | 'retail_pad' | 'industrial_warehouse'
  | 'flex_space' | 'self_storage' | 'mobile_home_park' | 'land_lot'
  | 'vacation_rental' | 'mixed_use_live_work';

export type TenantRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type MaintenancePriority = 'emergency' | 'urgent' | 'routine' | 'deferred' | 'cosmetic';
export type CapexCategory =
  | 'roof' | 'hvac' | 'plumbing' | 'electrical' | 'foundation'
  | 'exterior' | 'interior' | 'appliances' | 'landscaping' | 'parking'
  | 'safety_compliance' | 'energy_efficiency' | 'technology' | 'other';

// ── Rent & income tracking ────────────────────────────────────────────────────
export interface RentRoll {
  rollId: string;
  propertyId: string;
  unitId?: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit: number;
  actualPaidLastMonth?: number;
  daysLate?: number;           // 0 = on time
  lateFeesCharged?: number;
  paymentHistory: PaymentRecord[];
  notes?: string;
  updatedAt: string;
}

export interface PaymentRecord {
  period: string;              // 'YYYY-MM'
  amountDue: number;
  amountPaid: number;
  datePaid?: string;
  daysLate: number;
  lateFeePaid: number;
}

// ── Expense tracking ──────────────────────────────────────────────────────────
export interface PropertyExpense {
  expenseId: string;
  propertyId: string;
  date: string;
  category: 'mortgage' | 'taxes' | 'insurance' | 'utilities' | 'maintenance'
          | 'management' | 'landscaping' | 'capex' | 'legal' | 'other';
  vendor?: string;
  description: string;
  amount: number;
  recurring: boolean;
  notes?: string;
  createdAt: string;
}

// ── Maintenance intelligence ──────────────────────────────────────────────────
export interface MaintenanceRecord {
  recordId: string;
  propertyId: string;
  unitId?: string;
  reportedDate: string;
  completedDate?: string;
  priority: MaintenancePriority;
  system: 'hvac' | 'plumbing' | 'electrical' | 'appliance' | 'structural'
        | 'exterior' | 'interior' | 'pest' | 'landscaping' | 'safety' | 'other';
  description: string;
  vendor?: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  preventable: boolean;        // was this a preventable failure?
  rootCause?: string;
  warranty?: boolean;
  notes?: string;
  createdAt: string;
}

// ── Capital planning ──────────────────────────────────────────────────────────
export interface CapexItem {
  itemId: string;
  propertyId: string;
  category: CapexCategory;
  description: string;
  estimatedYear: number;       // e.g. 2026
  estimatedCost: number;
  urgency: 'critical' | 'recommended' | 'optional';
  expectedLifeExtensionYears: number;
  expectedROI?: number;        // pct
  funded: boolean;
  notes?: string;
  createdAt: string;
}

// ── Market snapshot ───────────────────────────────────────────────────────────
export interface MarketSnapshot {
  snapshotId: string;
  propertyId: string;
  date: string;
  marketRentPerUnit?: number;
  currentRentPerUnit?: number;
  vacancyRateMarket?: number;  // pct
  vacancyRatePortfolio?: number;
  capRateMarket?: number;
  capRateProperty?: number;
  pricePerSqFtMarket?: number;
  medianDaysOnMarket?: number;
  recentComparableSales?: ComparableSale[];
  notes?: string;
  createdAt: string;
}

export interface ComparableSale {
  address: string;
  salePrice: number;
  sqFt: number;
  saleDate: string;
  pricePerSqFt: number;
}

// ── Regulatory compliance ─────────────────────────────────────────────────────
export interface PropertyCompliance {
  recordId: string;
  propertyId: string;
  type: 'rental_license' | 'certificate_of_occupancy' | 'fire_inspection'
      | 'elevator_inspection' | 'boiler_inspection' | 'lead_paint'
      | 'asbestos' | 'radon' | 'insurance' | 'property_tax' | 'hoa' | 'other';
  description: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'non_compliant' | 'not_applicable';
  costToRenew?: number;
  notes?: string;
  updatedAt: string;
}

// ── Intelligence output types ─────────────────────────────────────────────────
export interface PortfolioKPI {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down' | 'flat';
  color: string;
  alert?: boolean;
}

export interface FinancialIntelligence {
  totalPortfolioValue: number;
  totalMonthlyGrossRent: number;
  totalMonthlyExpenses: number;
  noi: number;                  // net operating income/mo
  capRate: number;              // NOI / value, annualized
  cashOnCashReturn?: number;
  expenseRatio: number;         // expenses / gross rent
  rentCollectionRate: number;   // pct collected on time
  delinquencyValue: number;     // $ past due
  averageDaysLate: number;
  noiForecast12Mo: number;
  noiForecastTrend: 'improving' | 'stable' | 'declining';
  topExpenseCategory: string;
  costPerUnit: number;
}

export interface TenantIntelligence {
  totalTenants: number;
  activeTenants: number;
  expiringLease30Days: number;
  expiringLease90Days: number;
  vacantUnits: number;
  occupancyRate: number;
  avgTenancyMonths: number;
  tenantTurnoverCostAvg: number; // avg cost to re-lease
  delinquentTenants: number;
  highRiskTenants: TenantRiskProfile[];
  renewalOpportunities: string[];
  retentionActions: string[];
}

export interface TenantRiskProfile {
  tenantName: string;
  unitId: string;
  riskLevel: TenantRiskLevel;
  riskFactors: string[];
  leaseEnds: string;
  monthlyRent: number;
}

export interface MaintenanceIntelligence {
  totalMaintenanceCostYTD: number;
  costPerUnit: number;
  preventableFailurePct: number;
  avgDaysToComplete: number;
  emergencyCallRate: number;    // emergencies / total
  topSystem: string;            // most frequent system
  deferredMaintenanceLiability: number;
  recurringIssues: string[];
  preventionRecommendations: string[];
}

export interface CapexIntelligence {
  totalForecast5Year: number;
  criticalItems: number;
  recommendedItems: number;
  optionalItems: number;
  yearByYear: Array<{ year: number; amount: number; items: string[] }>;
  fundedPct: number;
  biggestItem: string;
  biggestCost: number;
  avgROI: number;
}

export interface PropertyCTSInsight {
  dimension: 'reliability' | 'relevance' | 'scalability' | 'volatility' | 'validation';
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  keyMetric: string;
  interpretation: string;
  correctiveActions: string[];
  preservedKnowledge: string[];
  benchmarkComparison: string;
}

export interface PropertyExecutiveSummary {
  periodLabel: string;
  portfolioHealthScore: number;   // 0–100 composite
  totalPortfolioValue: number;
  monthlyNOI: number;
  annualNOI: number;
  capRate: number;
  occupancyRate: number;
  rentCollectionRate: number;
  maintenanceCostPerUnit: number;
  deferredMaintenanceLiability: number;
  expiringLeases90Days: number;
  complianceAlerts: number;
  topRisks: string[];
  quickWins: string[];
  capitalProjects: string[];
  fiveYearNOIProjection: number;
  fiveYearCapexRequired: number;
}

export interface PropertyTimelineEntry {
  id: string;
  timestamp: string;
  source: 'financial' | 'maintenance' | 'tenant' | 'compliance' | 'market' | 'capex' | 'cts';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  propertyId?: string;
  value?: string;
}
