// Property Intelligence™ Engine — Nexum Suum FI Platform
// Portfolio analytics aligned to professional property management standards

import type {
  RentRoll, PropertyExpense, MaintenanceRecord, CapexItem,
  MarketSnapshot, PropertyCompliance, FinancialIntelligence,
  TenantIntelligence, TenantRiskProfile, TenantRiskLevel,
  MaintenanceIntelligence, CapexIntelligence, PropertyCTSInsight,
  PropertyExecutiveSummary, PropertyTimelineEntry,
} from '@/types/property';

// ── Storage keys ──────────────────────────────────────────────────────────────
export const PROP_KEYS = {
  rentRolls:   (pid: string) => `nexum_prop_rentrolls_${pid}`,
  expenses:    (pid: string) => `nexum_prop_expenses_${pid}`,
  maintenance: (pid: string) => `nexum_prop_maintenance_${pid}`,
  capex:       (pid: string) => `nexum_prop_capex_${pid}`,
  market:      (pid: string) => `nexum_prop_market_${pid}`,
  compliance:  (pid: string) => `nexum_prop_compliance_${pid}`,
};

// ── Persist helpers ───────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function upsert<T extends { [k: string]: any }>(key: string, idField: string, item: T): void {
  const arr = load<T>(key);
  const idx = arr.findIndex((r: any) => r[idField] === item[idField]);
  if (idx >= 0) arr[idx] = item; else arr.unshift(item);
  localStorage.setItem(key, JSON.stringify(arr));
  dispatchPropertyUpdate();
}
function append<T>(key: string, item: T): void {
  const arr = load<T>(key);
  arr.unshift(item as any);
  localStorage.setItem(key, JSON.stringify(arr));
  dispatchPropertyUpdate();
}

export function saveRentRoll(propertyId: string, roll: RentRoll): void {
  upsert(PROP_KEYS.rentRolls(propertyId), 'rollId', roll);
}
export function saveExpense(propertyId: string, exp: PropertyExpense): void {
  append(PROP_KEYS.expenses(propertyId), exp);
}
export function saveMaintenanceRecord(propertyId: string, rec: MaintenanceRecord): void {
  upsert(PROP_KEYS.maintenance(propertyId), 'recordId', rec);
}
export function saveCapexItem(propertyId: string, item: CapexItem): void {
  upsert(PROP_KEYS.capex(propertyId), 'itemId', item);
}
export function saveMarketSnapshot(propertyId: string, snap: MarketSnapshot): void {
  append(PROP_KEYS.market(propertyId), snap);
}
export function savePropertyCompliance(propertyId: string, rec: PropertyCompliance): void {
  upsert(PROP_KEYS.compliance(propertyId), 'recordId', rec);
}

export function loadRentRolls(propertyId: string): RentRoll[] {
  return load<RentRoll>(PROP_KEYS.rentRolls(propertyId));
}
export function loadExpenses(propertyId: string): PropertyExpense[] {
  return load<PropertyExpense>(PROP_KEYS.expenses(propertyId));
}
export function loadMaintenance(propertyId: string): MaintenanceRecord[] {
  return load<MaintenanceRecord>(PROP_KEYS.maintenance(propertyId));
}
export function loadCapex(propertyId: string): CapexItem[] {
  return load<CapexItem>(PROP_KEYS.capex(propertyId));
}
export function loadMarket(propertyId: string): MarketSnapshot[] {
  return load<MarketSnapshot>(PROP_KEYS.market(propertyId));
}
export function loadPropertyCompliance(propertyId: string): PropertyCompliance[] {
  return load<PropertyCompliance>(PROP_KEYS.compliance(propertyId));
}

function dispatchPropertyUpdate(): void {
  window.dispatchEvent(new CustomEvent('nexum_property_update'));
}

// ── Financial intelligence ────────────────────────────────────────────────────
export function buildFinancialIntelligence(
  rentRolls: RentRoll[],
  expenses: PropertyExpense[],
  portfolioValue: number,
  unitCount: number,
): FinancialIntelligence {
  const now = Date.now();
  const thisMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const totalMonthlyGrossRent = rentRolls.reduce((s, r) => s + r.monthlyRent, 0);

  const monthlyExpenses = expenses
    .filter(e => e.date.startsWith(thisMonth) || e.recurring)
    .reduce((s, e) => s + e.amount, 0);

  const noi = totalMonthlyGrossRent - monthlyExpenses;
  const capRate = portfolioValue > 0 ? (noi * 12 / portfolioValue) * 100 : 0;
  const expenseRatio = totalMonthlyGrossRent > 0 ? (monthlyExpenses / totalMonthlyGrossRent) * 100 : 0;

  // Payment history analysis
  let totalDue = 0, totalCollected = 0, totalDaysLate = 0, lateCount = 0;
  let totalDelinquency = 0;
  rentRolls.forEach(r => {
    totalDue += r.monthlyRent;
    const paid = r.actualPaidLastMonth ?? r.monthlyRent;
    totalCollected += paid;
    const daysLate = r.daysLate || 0;
    if (daysLate > 0) { totalDaysLate += daysLate; lateCount++; }
    if (paid < r.monthlyRent) totalDelinquency += (r.monthlyRent - paid);
  });

  const rentCollectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 100;
  const avgDaysLate = lateCount > 0 ? totalDaysLate / lateCount : 0;

  // Find top expense category
  const expByCat: Record<string, number> = {};
  expenses.forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount; });
  const topExpenseCategory = Object.entries(expByCat).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

  // NOI forecast: trend from last 3 months of expenses
  const last3Months = [0,1,2].map(i => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const mo = d.toISOString().slice(0, 7);
    const spent = expenses.filter(e => e.date.startsWith(mo)).reduce((s,e)=>s+e.amount,0);
    return totalMonthlyGrossRent - spent;
  });
  const noiForecastTrend: 'improving' | 'stable' | 'declining' =
    last3Months[0] > last3Months[2] + 50 ? 'improving' :
    last3Months[0] < last3Months[2] - 50 ? 'declining' : 'stable';

  return {
    totalPortfolioValue: portfolioValue,
    totalMonthlyGrossRent,
    totalMonthlyExpenses: monthlyExpenses,
    noi,
    capRate,
    expenseRatio,
    rentCollectionRate,
    delinquencyValue: totalDelinquency,
    averageDaysLate: avgDaysLate,
    noiForecast12Mo: noi * 12,
    noiForecastTrend,
    topExpenseCategory,
    costPerUnit: unitCount > 0 ? monthlyExpenses / unitCount : 0,
  };
}

// ── Tenant intelligence ───────────────────────────────────────────────────────
export function buildTenantIntelligence(rentRolls: RentRoll[]): TenantIntelligence {
  const now = Date.now();

  const activeTenants = rentRolls.filter(r => {
    if (!r.leaseEnd) return true;
    return new Date(r.leaseEnd).getTime() > now;
  });

  const daysToExpiry = (r: RentRoll) => r.leaseEnd
    ? (new Date(r.leaseEnd).getTime() - now) / 86400000
    : Infinity;

  const expiring30  = activeTenants.filter(r => daysToExpiry(r) <= 30).length;
  const expiring90  = activeTenants.filter(r => daysToExpiry(r) <= 90).length;

  // Risk scoring
  const highRiskTenants: TenantRiskProfile[] = rentRolls
    .filter(r => {
      const late = r.daysLate || 0;
      const paid = r.actualPaidLastMonth ?? r.monthlyRent;
      const expiry = daysToExpiry(r);
      return late > 5 || paid < r.monthlyRent || expiry <= 30;
    })
    .map(r => {
      const late    = r.daysLate || 0;
      const paid    = r.actualPaidLastMonth ?? r.monthlyRent;
      const expiry  = daysToExpiry(r);
      const riskFactors: string[] = [];
      if (late > 15) riskFactors.push(`${late} days late last payment`);
      if (paid < r.monthlyRent) riskFactors.push(`$${(r.monthlyRent - paid).toFixed(0)} unpaid balance`);
      if (expiry <= 30) riskFactors.push(`Lease ends in ${Math.ceil(expiry)} days`);
      const riskLevel: TenantRiskLevel =
        riskFactors.length >= 2 || late > 30 ? 'high' :
        riskFactors.length === 1 ? 'moderate' : 'low';
      return {
        tenantName: r.tenantName,
        unitId: r.unitId || r.rollId,
        riskLevel,
        riskFactors,
        leaseEnds: r.leaseEnd || 'Month-to-month',
        monthlyRent: r.monthlyRent,
      };
    })
    .filter(r => r.riskLevel !== 'low');

  // Avg tenancy — use lease start dates
  const tenancyMonths = rentRolls.map(r => {
    if (!r.leaseStart) return 12;
    return Math.max(0, (now - new Date(r.leaseStart).getTime()) / (30 * 86400000));
  });
  const avgTenancyMonths = tenancyMonths.length > 0
    ? tenancyMonths.reduce((s,m) => s+m, 0) / tenancyMonths.length : 0;

  const renewalOpportunities = activeTenants
    .filter(r => daysToExpiry(r) <= 90 && daysToExpiry(r) > 0)
    .map(r => `${r.tenantName} (${r.unitId || 'unit'}) — lease ends ${r.leaseEnd}`);

  const retentionActions: string[] = [];
  if (expiring30 > 0) retentionActions.push(`Contact ${expiring30} tenant(s) expiring within 30 days — offer renewal incentive`);
  if (highRiskTenants.some(t => t.riskLevel === 'high')) retentionActions.push('High-risk tenants identified — initiate payment plan conversations before formal notice');
  if (avgTenancyMonths < 12) retentionActions.push('Avg tenancy below 12 months — review lease terms and property condition for retention improvements');

  return {
    totalTenants: rentRolls.length,
    activeTenants: activeTenants.length,
    expiringLease30Days: expiring30,
    expiringLease90Days: expiring90,
    vacantUnits: 0, // supplied by caller from property data
    occupancyRate: rentRolls.length > 0 ? (activeTenants.length / rentRolls.length) * 100 : 0,
    avgTenancyMonths,
    tenantTurnoverCostAvg: rentRolls.reduce((s,r) => s+r.monthlyRent, 0) / Math.max(rentRolls.length, 1) * 2, // 2-month avg turnover cost
    delinquentTenants: rentRolls.filter(r => (r.actualPaidLastMonth || r.monthlyRent) < r.monthlyRent).length,
    highRiskTenants,
    renewalOpportunities: renewalOpportunities.slice(0, 5),
    retentionActions,
  };
}

// ── Maintenance intelligence ──────────────────────────────────────────────────
export function buildMaintenanceIntelligence(
  records: MaintenanceRecord[],
  unitCount: number,
): MaintenanceIntelligence {
  const now = Date.now();
  const ytdStart = new Date(); ytdStart.setMonth(0, 1); ytdStart.setHours(0,0,0,0);

  const ytd = records.filter(r => new Date(r.reportedDate).getTime() >= ytdStart.getTime());

  const totalCostYTD = ytd.reduce((s,r) => s + r.totalCost, 0);
  const costPerUnit  = unitCount > 0 ? totalCostYTD / unitCount : 0;

  const preventable = ytd.filter(r => r.preventable).length;
  const preventableFailurePct = ytd.length > 0 ? (preventable / ytd.length) * 100 : 0;

  // Avg days to complete
  const completed = records.filter(r => r.completedDate);
  const avgDays = completed.length > 0
    ? completed.reduce((s,r) => {
        const days = (new Date(r.completedDate!).getTime() - new Date(r.reportedDate).getTime()) / 86400000;
        return s + days;
      }, 0) / completed.length
    : 0;

  const emergencies = records.filter(r => r.priority === 'emergency').length;
  const emergencyRate = records.length > 0 ? (emergencies / records.length) * 100 : 0;

  // Top system by frequency
  const systemCounts: Record<string, number> = {};
  records.forEach(r => { systemCounts[r.system] = (systemCounts[r.system] || 0) + 1; });
  const topSystem = Object.entries(systemCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

  // Deferred maintenance liability
  const deferred = records.filter(r => r.priority === 'deferred' && !r.completedDate);
  const deferredLiability = deferred.reduce((s,r) => s + (r.totalCost || 500), 0);

  // Recurring issues: same system 3+ times in 90 days
  const last90 = records.filter(r => now - new Date(r.reportedDate).getTime() <= 90 * 86400000);
  const sys90: Record<string, number> = {};
  last90.forEach(r => { sys90[r.system] = (sys90[r.system] || 0) + 1; });
  const recurringIssues = Object.entries(sys90)
    .filter(([, cnt]) => cnt >= 3)
    .map(([sys, cnt]) => `${sys.replace(/_/g,' ')} — ${cnt} incidents in 90 days`);

  const preventionRecommendations: string[] = [];
  if (preventableFailurePct > 30) preventionRecommendations.push(`${preventableFailurePct.toFixed(0)}% of failures preventable — implement quarterly PM schedule`);
  if (emergencyRate > 15) preventionRecommendations.push(`Emergency call rate ${emergencyRate.toFixed(0)}% — increase preventive inspection frequency`);
  if (avgDays > 7) preventionRecommendations.push(`Avg ${avgDays.toFixed(0)} days to complete — establish 48-hour response SLA for urgent items`);
  if (recurringIssues.length > 0) preventionRecommendations.push(`Recurring issues in ${topSystem.replace(/_/g,' ')} — root cause analysis and capital replacement evaluation`);
  if (deferredLiability > 5000) preventionRecommendations.push(`$${deferredLiability.toLocaleString()} deferred maintenance liability — schedule before further deterioration`);

  return {
    totalMaintenanceCostYTD: totalCostYTD,
    costPerUnit,
    preventableFailurePct,
    avgDaysToComplete: avgDays,
    emergencyCallRate: emergencyRate,
    topSystem,
    deferredMaintenanceLiability: deferredLiability,
    recurringIssues,
    preventionRecommendations,
  };
}

// ── Capital planning intelligence ─────────────────────────────────────────────
export function buildCapexIntelligence(items: CapexItem[]): CapexIntelligence {
  const currentYear = new Date().getFullYear();
  const window5yr = items.filter(i => i.estimatedYear >= currentYear && i.estimatedYear <= currentYear + 4);

  const totalForecast5Year = window5yr.reduce((s,i) => s + i.estimatedCost, 0);
  const criticalItems   = window5yr.filter(i => i.urgency === 'critical').length;
  const recommendedItems = window5yr.filter(i => i.urgency === 'recommended').length;
  const optionalItems   = window5yr.filter(i => i.urgency === 'optional').length;
  const fundedPct = window5yr.length > 0
    ? (window5yr.filter(i => i.funded).length / window5yr.length) * 100 : 0;

  const sorted = [...window5yr].sort((a,b) => b.estimatedCost - a.estimatedCost);
  const biggest = sorted[0];

  const yearByYear = Array.from({ length: 5 }, (_, i) => {
    const yr = currentYear + i;
    const yrItems = window5yr.filter(item => item.estimatedYear === yr);
    return {
      year: yr,
      amount: yrItems.reduce((s,item) => s + item.estimatedCost, 0),
      items: yrItems.map(item => item.description),
    };
  });

  const roiItems = window5yr.filter(i => i.expectedROI != null);
  const avgROI = roiItems.length > 0
    ? roiItems.reduce((s,i) => s + (i.expectedROI || 0), 0) / roiItems.length : 0;

  return {
    totalForecast5Year,
    criticalItems,
    recommendedItems,
    optionalItems,
    yearByYear,
    fundedPct,
    biggestItem: biggest?.description || 'N/A',
    biggestCost: biggest?.estimatedCost || 0,
    avgROI,
  };
}

// ── CTS™ Property Intelligence ────────────────────────────────────────────────
export function buildPropertyCTS(
  rentRolls: RentRoll[],
  expenses: PropertyExpense[],
  maintenance: MaintenanceRecord[],
  capex: CapexItem[],
  compliance: PropertyCompliance[],
  portfolioValue: number,
  unitCount: number,
): PropertyCTSInsight[] {
  const fin      = buildFinancialIntelligence(rentRolls, expenses, portfolioValue, unitCount);
  const tenants  = buildTenantIntelligence(rentRolls);
  const maint    = buildMaintenanceIntelligence(maintenance, unitCount);
  const capexInt = buildCapexIntelligence(capex);

  const expiredComp  = compliance.filter(r => r.status === 'expired' || r.status === 'non_compliant').length;
  const expiringComp = compliance.filter(r => r.status === 'expiring_soon').length;

  // RELIABILITY: Are assets and income reliably performing?
  // Key: rent collection rate, maintenance response, occupancy
  const reliabilityScore = Math.round(
    fin.rentCollectionRate * 0.35 +
    tenants.occupancyRate * 0.30 +
    Math.max(0, 100 - maint.emergencyCallRate * 2) * 0.20 +
    Math.max(0, 100 - maint.avgDaysToComplete * 5) * 0.15
  );

  // RELEVANCE: Is the portfolio positioned correctly in the market?
  // Key: cap rate vs. market, rent vs. market, vacancy vs. market
  const marketSnap = undefined; // market data fed separately
  const capRateScore = fin.capRate >= 6 ? 90 : fin.capRate >= 4 ? 70 : fin.capRate >= 2 ? 50 : 30;
  const relevanceScore = Math.round(
    capRateScore * 0.40 +
    tenants.occupancyRate * 0.35 +
    (fin.noiForecastTrend === 'improving' ? 85 : fin.noiForecastTrend === 'stable' ? 70 : 50) * 0.25
  );

  // SCALABILITY: Can the portfolio grow without structural risk?
  // Key: expense ratio, NOI margin, deferred maintenance vs. value
  const expRatioScore = Math.max(0, 100 - Math.max(0, fin.expenseRatio - 35) * 2);
  const deferredRatio = portfolioValue > 0 ? (maint.deferredMaintenanceLiability / portfolioValue) * 100 : 0;
  const scalabilityScore = Math.round(
    expRatioScore * 0.35 +
    Math.max(0, 100 - deferredRatio * 20) * 0.30 +
    capexInt.fundedPct * 0.35
  );

  // VOLATILITY: Is performance stable?
  // Key: delinquency rate, tenant turnover, market rent exposure
  const delinquencyPct = fin.totalMonthlyGrossRent > 0
    ? (fin.delinquencyValue / fin.totalMonthlyGrossRent) * 100 : 0;
  const volatilityScore = Math.round(
    Math.max(0, 100 - delinquencyPct * 5) * 0.35 +
    Math.max(0, 100 - tenants.expiringLease30Days * 15) * 0.30 +
    Math.max(0, 100 - tenants.highRiskTenants.length * 10) * 0.35
  );

  // VALIDATION: Regulatory and legal posture
  // Key: compliance records current, licenses valid, insurance current
  const validationScore = Math.round(
    Math.max(0, 100 - expiredComp * 25) * 0.45 +
    Math.max(0, 100 - expiringComp * 10) * 0.30 +
    (fin.rentCollectionRate >= 95 ? 100 : fin.rentCollectionRate >= 80 ? 75 : 50) * 0.25
  );

  const trend = (score: number, prev: number): 'improving' | 'stable' | 'declining' =>
    score > prev + 3 ? 'improving' : score < prev - 3 ? 'declining' : 'stable';

  return [
    {
      dimension: 'reliability',
      score: reliabilityScore,
      trend: trend(reliabilityScore, 70),
      keyMetric: `${fin.rentCollectionRate.toFixed(1)}% collection rate`,
      interpretation: reliabilityScore >= 80
        ? 'Portfolio generating reliable income with consistent tenant performance.'
        : 'Income reliability gaps — address collection issues and occupancy to stabilize cash flow.',
      correctiveActions: [
        fin.rentCollectionRate < 95 ? `Collection rate ${fin.rentCollectionRate.toFixed(1)}% — issue pay-or-quit notices for delinquent tenants` : null,
        tenants.occupancyRate < 90 ? `Occupancy ${tenants.occupancyRate.toFixed(0)}% — accelerate leasing for vacant units` : null,
        maint.emergencyCallRate > 20 ? 'High emergency maintenance rate — implement scheduled PM to reduce reactive costs' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Professional PM standard: 95%+ rent collection rate monthly',
        'Stabilized asset occupancy benchmark: 93–97% depending on market',
        `Avg days to complete maintenance: ${maint.avgDaysToComplete.toFixed(1)}d — target ≤3 days for urgent`,
      ],
      benchmarkComparison: reliabilityScore >= 88 ? 'Institutional-grade performance' : reliabilityScore >= 72 ? 'Regional average' : 'Below stabilized threshold',
    },
    {
      dimension: 'relevance',
      score: relevanceScore,
      trend: trend(relevanceScore, 65),
      keyMetric: `${fin.capRate.toFixed(1)}% cap rate`,
      interpretation: relevanceScore >= 80
        ? 'Portfolio well-positioned relative to market — rents and value aligned.'
        : 'Cap rate or occupancy signals pricing or positioning misalignment vs. market.',
      correctiveActions: [
        fin.capRate < 4 ? 'Cap rate below 4% — evaluate rent increase potential or expense reduction' : null,
        tenants.occupancyRate < 85 ? 'Below-market occupancy — review rent pricing vs. comparable listings' : null,
        fin.noiForecastTrend === 'declining' ? 'NOI declining — audit expense growth and lease renewal pricing' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Market cap rate benchmarks: residential 4–7%, commercial 5–9%, industrial 4–6%',
        'Properties priced 10%+ above market median see 45+ day vacancy on average',
        'Annual rent increase aligned to CPI + 1–2% preserves NOI without tenant turnover risk',
      ],
      benchmarkComparison: fin.capRate >= 6 ? 'Strong yield vs. market' : fin.capRate >= 4 ? 'Market rate' : 'Below market yield — re-evaluate asset strategy',
    },
    {
      dimension: 'scalability',
      score: scalabilityScore,
      trend: trend(scalabilityScore, 68),
      keyMetric: `${fin.expenseRatio.toFixed(0)}% expense ratio`,
      interpretation: scalabilityScore >= 80
        ? 'Portfolio expense structure and capital plan support growth.'
        : 'High expense ratio or unfunded capex limits portfolio scalability.',
      correctiveActions: [
        fin.expenseRatio > 50 ? `Expense ratio ${fin.expenseRatio.toFixed(0)}% — above 50% threshold; audit management fees, utilities, and insurance` : null,
        capexInt.fundedPct < 50 ? `Only ${capexInt.fundedPct.toFixed(0)}% of 5-year capex funded — build reserves or line of credit` : null,
        maint.deferredMaintenanceLiability > 0 ? `$${maint.deferredMaintenanceLiability.toLocaleString()} deferred — address before pursuing acquisition growth` : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Industry benchmark: expense ratio 35–45% for well-run residential portfolios',
        'Deferred maintenance exceeding 5% of asset value signals capital risk in next market cycle',
        `5-year capex forecast: $${capexInt.totalForecast5Year.toLocaleString()} — reserve planning required`,
      ],
      benchmarkComparison: scalabilityScore >= 80 ? 'Ready for portfolio expansion' : 'Resolve structural issues before scaling',
    },
    {
      dimension: 'volatility',
      score: volatilityScore,
      trend: trend(volatilityScore, 70),
      keyMetric: `${tenants.expiringLease30Days} leases expiring <30d`,
      interpretation: volatilityScore >= 80
        ? 'Income and tenancy stable with low near-term disruption risk.'
        : 'Lease expirations or delinquency create near-term cash flow volatility.',
      correctiveActions: [
        tenants.expiringLease30Days > 0 ? `${tenants.expiringLease30Days} lease(s) ending within 30 days — immediate renewal outreach` : null,
        delinquencyPct > 5 ? `Delinquency ${delinquencyPct.toFixed(1)}% of gross rent — escalate collection process` : null,
        tenants.highRiskTenants.length > 0 ? `${tenants.highRiskTenants.length} high-risk tenant(s) — build contingency reserve for vacancy scenario` : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Lease stagger strategy: no more than 20% of units expiring in any single quarter',
        'Delinquency above 5% of gross rent signals need for tenant screening review',
        `High-risk tenants identified: ${tenants.highRiskTenants.length} — maintain 2-month operating reserve`,
      ],
      benchmarkComparison: volatilityScore >= 82 ? 'Low volatility portfolio' : 'Moderate income risk — stabilize lease pipeline',
    },
    {
      dimension: 'validation',
      score: validationScore,
      trend: trend(validationScore, 72),
      keyMetric: `${expiredComp} expired compliance items`,
      interpretation: validationScore >= 85
        ? 'Regulatory and legal posture clean. Portfolio defensible.'
        : 'Compliance gaps create legal liability and tenant risk. Immediate action needed.',
      correctiveActions: [
        expiredComp > 0 ? `${expiredComp} expired permits/licenses — renew within 14 days to avoid fines` : null,
        expiringComp > 0 ? `${expiringComp} compliance items expiring soon — schedule renewals proactively` : null,
        fin.rentCollectionRate < 90 ? 'Low collection rate — ensure lease enforcement procedures are legally documented' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Rental license/COO renewal: 90-day advance is standard — calendar annual renewals',
        'Expired compliance exposes owner to tenant rent withholding rights in most jurisdictions',
        'Lease documentation and payment records: maintain 7-year retention per IRS guidelines',
      ],
      benchmarkComparison: validationScore >= 90 ? 'Full compliance posture' : validationScore >= 70 ? 'Near-compliant — close gaps' : 'Compliance risk — legal review recommended',
    },
  ];
}

// ── Executive summary ─────────────────────────────────────────────────────────
export function buildPropertyExecutiveSummary(
  propertyIds: string[],
  portfolioValue: number,
  unitCount: number,
): PropertyExecutiveSummary {
  // Aggregate across all properties
  const allRentRolls:  RentRoll[]           = propertyIds.flatMap(pid => loadRentRolls(pid));
  const allExpenses:   PropertyExpense[]     = propertyIds.flatMap(pid => loadExpenses(pid));
  const allMaint:      MaintenanceRecord[]   = propertyIds.flatMap(pid => loadMaintenance(pid));
  const allCapex:      CapexItem[]           = propertyIds.flatMap(pid => loadCapex(pid));
  const allCompliance: PropertyCompliance[]  = propertyIds.flatMap(pid => loadPropertyCompliance(pid));

  const fin     = buildFinancialIntelligence(allRentRolls, allExpenses, portfolioValue, unitCount);
  const tenants = buildTenantIntelligence(allRentRolls);
  const maint   = buildMaintenanceIntelligence(allMaint, unitCount);
  const capexI  = buildCapexIntelligence(allCapex);
  const cts     = buildPropertyCTS(allRentRolls, allExpenses, allMaint, allCapex, allCompliance, portfolioValue, unitCount);

  const avgCTS = cts.reduce((s,c) => s + c.score, 0) / cts.length;
  const portfolioHealthScore = Math.round(avgCTS);

  const complianceAlerts = allCompliance.filter(r =>
    r.status === 'expired' || r.status === 'non_compliant' || r.status === 'expiring_soon'
  ).length;

  const topRisks: string[] = [
    fin.delinquencyValue > 500 ? `$${fin.delinquencyValue.toFixed(0)} delinquent rent — collection action required` : null,
    tenants.expiringLease30Days > 0 ? `${tenants.expiringLease30Days} lease(s) expiring within 30 days — vacancy risk` : null,
    complianceAlerts > 0 ? `${complianceAlerts} compliance alerts — permit/license gaps` : null,
    maint.deferredMaintenanceLiability > 5000 ? `$${maint.deferredMaintenanceLiability.toLocaleString()} deferred maintenance — structural risk` : null,
    fin.expenseRatio > 55 ? `Expense ratio ${fin.expenseRatio.toFixed(0)}% — above sustainable threshold` : null,
  ].filter(Boolean) as string[];

  const quickWins: string[] = [
    tenants.expiringLease90Days > 0 ? `Send renewal offers to ${tenants.expiringLease90Days} tenants expiring within 90 days` : null,
    maint.recurringIssues.length > 0 ? `Address recurring ${maint.topSystem.replace(/_/g,' ')} issue to stop emergency calls` : null,
    complianceAlerts > 0 ? `Renew ${complianceAlerts} compliance items proactively` : null,
    fin.rentCollectionRate < 98 ? 'Implement auto-pay incentive to raise collection rate to 98%+' : null,
  ].filter(Boolean) as string[];

  const capitalProjects: string[] = allCapex
    .filter(i => i.urgency === 'critical' && !i.funded)
    .map(i => `${i.description} — $${i.estimatedCost.toLocaleString()} (${i.estimatedYear})`)
    .slice(0, 4);

  const currentNOI = fin.noi;
  const projectedNOI = currentNOI * (fin.noiForecastTrend === 'improving' ? 1.05 : fin.noiForecastTrend === 'declining' ? 0.95 : 1.02);

  return {
    periodLabel: 'Current Portfolio',
    portfolioHealthScore,
    totalPortfolioValue: portfolioValue,
    monthlyNOI: fin.noi,
    annualNOI: fin.noi * 12,
    capRate: fin.capRate,
    occupancyRate: tenants.occupancyRate,
    rentCollectionRate: fin.rentCollectionRate,
    maintenanceCostPerUnit: maint.costPerUnit,
    deferredMaintenanceLiability: maint.deferredMaintenanceLiability,
    expiringLeases90Days: tenants.expiringLease90Days,
    complianceAlerts,
    topRisks: topRisks.slice(0, 4),
    quickWins: quickWins.slice(0, 4),
    capitalProjects,
    fiveYearNOIProjection: projectedNOI * 12 * 5,
    fiveYearCapexRequired: capexI.totalForecast5Year,
  };
}

// ── Intelligence Timeline ─────────────────────────────────────────────────────
export function buildPropertyTimeline(
  rentRolls: RentRoll[],
  maintenance: MaintenanceRecord[],
  compliance: PropertyCompliance[],
  capex: CapexItem[],
): PropertyTimelineEntry[] {
  const entries: PropertyTimelineEntry[] = [];
  const now = Date.now();

  // Delinquency events
  rentRolls.filter(r => (r.actualPaidLastMonth ?? r.monthlyRent) < r.monthlyRent).forEach(r => {
    const owed = r.monthlyRent - (r.actualPaidLastMonth || 0);
    entries.push({
      id: `delinq-${r.rollId}`, timestamp: new Date().toISOString(), source: 'financial',
      title: `Delinquent Rent — ${r.tenantName}`,
      description: `$${owed.toFixed(0)} unpaid | ${r.daysLate || 0} days late`,
      severity: (r.daysLate || 0) > 15 ? 'critical' : 'warning',
      value: `-$${owed.toFixed(0)}`,
    });
  });

  // Lease expirations
  rentRolls.filter(r => {
    if (!r.leaseEnd) return false;
    const days = (new Date(r.leaseEnd).getTime() - now) / 86400000;
    return days >= 0 && days <= 90;
  }).forEach(r => {
    const days = Math.ceil((new Date(r.leaseEnd!).getTime() - now) / 86400000);
    entries.push({
      id: `lease-${r.rollId}`, timestamp: r.leaseEnd!, source: 'tenant',
      title: `Lease Expiring — ${r.tenantName}`,
      description: `${days} days remaining | $${r.monthlyRent}/mo`,
      severity: days <= 30 ? 'warning' : 'info',
      value: `${days}d`,
    });
  });

  // Maintenance events
  maintenance.filter(r => !r.completedDate).slice(0, 6).forEach(r => {
    entries.push({
      id: r.recordId, timestamp: r.reportedDate, source: 'maintenance',
      title: `Open Maintenance — ${r.system.replace(/_/g,' ')}`,
      description: `${r.description} | $${r.totalCost}`,
      severity: r.priority === 'emergency' ? 'critical' : r.priority === 'urgent' ? 'warning' : 'info',
      propertyId: r.propertyId,
      value: `$${r.totalCost}`,
    });
  });

  // Compliance alerts
  compliance.filter(r => r.status !== 'current' && r.status !== 'not_applicable').forEach(r => {
    entries.push({
      id: r.recordId, timestamp: r.updatedAt, source: 'compliance',
      title: `Compliance ${r.status.replace(/_/g,' ')} — ${r.type.replace(/_/g,' ')}`,
      description: r.expiryDate ? `Expires ${r.expiryDate}` : r.notes || '',
      severity: r.status === 'expired' || r.status === 'non_compliant' ? 'critical' : 'warning',
    });
  });

  // Upcoming capex
  const currentYear = new Date().getFullYear();
  capex.filter(i => i.estimatedYear <= currentYear + 1 && !i.funded).forEach(i => {
    entries.push({
      id: i.itemId, timestamp: `${i.estimatedYear}-01-01`, source: 'capex',
      title: `Capex Required — ${i.description}`,
      description: `${i.urgency} | ${i.estimatedYear} | $${i.estimatedCost.toLocaleString()}`,
      severity: i.urgency === 'critical' ? 'warning' : 'info',
      value: `$${(i.estimatedCost/1000).toFixed(0)}K`,
    });
  });

  return entries.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 25);
}
