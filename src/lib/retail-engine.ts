// Retail Intelligence™ Engine — Nexum Suum FI Platform
// Operational standards aligned with enterprise retail (big-box, grocery, specialty)

import type {
  InventorySnapshot, ShrinkEvent, FoodSafetyLog, ComplianceRecord,
  VendorPerformanceLog, OperationalTask, StoreEnergySnapshot, StoreProfile,
  InventoryHealthSummary, ShrinkSummary, VendorIntelligenceSummary,
  FoodSafetyScore, OperationalEfficiency, RetailCTSInsight,
  RetailExecutiveSummary, RetailTimelineEntry, ShrinkCategory,
} from '@/types/retail';

// ── Storage keys ──────────────────────────────────────────────────────────────
export const RETAIL_KEYS = {
  profile:     (sid: string) => `nexum_retail_profile_${sid}`,
  inventory:   (sid: string) => `nexum_retail_inventory_${sid}`,
  shrink:      (sid: string) => `nexum_retail_shrink_${sid}`,
  foodSafety:  (sid: string) => `nexum_retail_food_safety_${sid}`,
  compliance:  (sid: string) => `nexum_retail_compliance_${sid}`,
  vendors:     (sid: string) => `nexum_retail_vendors_${sid}`,
  tasks:       (sid: string) => `nexum_retail_tasks_${sid}`,
  energy:      (sid: string) => `nexum_retail_energy_${sid}`,
};

// ── Persist helpers ───────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function append<T>(key: string, item: T): void {
  const arr = load<T>(key);
  arr.unshift(item as any);
  localStorage.setItem(key, JSON.stringify(arr));
}

export function saveInventorySnapshot(storeId: string, snap: InventorySnapshot): void {
  append(RETAIL_KEYS.inventory(storeId), snap);
  dispatchRetailUpdate();
}
export function saveShrinkEvent(storeId: string, evt: ShrinkEvent): void {
  append(RETAIL_KEYS.shrink(storeId), evt);
  dispatchRetailUpdate();
}
export function saveFoodSafetyLog(storeId: string, log: FoodSafetyLog): void {
  append(RETAIL_KEYS.foodSafety(storeId), log);
  dispatchRetailUpdate();
}
export function saveComplianceRecord(storeId: string, rec: ComplianceRecord): void {
  const all = load<ComplianceRecord>(RETAIL_KEYS.compliance(storeId));
  const idx = all.findIndex(r => r.recordId === rec.recordId);
  if (idx >= 0) all[idx] = rec; else all.unshift(rec);
  localStorage.setItem(RETAIL_KEYS.compliance(storeId), JSON.stringify(all));
  dispatchRetailUpdate();
}
export function saveVendorLog(storeId: string, log: VendorPerformanceLog): void {
  append(RETAIL_KEYS.vendors(storeId), log);
  dispatchRetailUpdate();
}
export function saveTask(storeId: string, task: OperationalTask): void {
  const all = load<OperationalTask>(RETAIL_KEYS.tasks(storeId));
  const idx = all.findIndex(t => t.taskId === task.taskId);
  if (idx >= 0) all[idx] = task; else all.unshift(task);
  localStorage.setItem(RETAIL_KEYS.tasks(storeId), JSON.stringify(all));
  dispatchRetailUpdate();
}
export function saveEnergySnapshot(storeId: string, snap: StoreEnergySnapshot): void {
  append(RETAIL_KEYS.energy(storeId), snap);
  dispatchRetailUpdate();
}
export function saveStoreProfile(storeId: string, profile: StoreProfile): void {
  localStorage.setItem(RETAIL_KEYS.profile(storeId), JSON.stringify(profile));
  dispatchRetailUpdate();
}

export function loadStoreProfile(storeId: string): StoreProfile {
  try {
    const raw = localStorage.getItem(RETAIL_KEYS.profile(storeId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    storeId, storeName: 'My Store', format: 'other',
    squareFeet: 10000, salesFloorSqFt: 7000, backroomSqFt: 3000,
    numberOfCheckouts: 6, numberOfSelfCheckouts: 4, numberOfDepartments: 8,
    openDate: '2020-01-01', targetWeeklySales: 100000,
    targetShrinkPct: 1.5, targetInventoryTurnDays: 14,
    targetFoodSafetyScore: 90, targetOnTimeTaskCompletion: 85,
  };
}
export function loadInventory(storeId: string): InventorySnapshot[] {
  return load<InventorySnapshot>(RETAIL_KEYS.inventory(storeId));
}
export function loadShrink(storeId: string): ShrinkEvent[] {
  return load<ShrinkEvent>(RETAIL_KEYS.shrink(storeId));
}
export function loadFoodSafety(storeId: string): FoodSafetyLog[] {
  return load<FoodSafetyLog>(RETAIL_KEYS.foodSafety(storeId));
}
export function loadCompliance(storeId: string): ComplianceRecord[] {
  return load<ComplianceRecord>(RETAIL_KEYS.compliance(storeId));
}
export function loadVendorLogs(storeId: string): VendorPerformanceLog[] {
  return load<VendorPerformanceLog>(RETAIL_KEYS.vendors(storeId));
}
export function loadTasks(storeId: string): OperationalTask[] {
  return load<OperationalTask>(RETAIL_KEYS.tasks(storeId));
}
export function loadEnergy(storeId: string): StoreEnergySnapshot[] {
  return load<StoreEnergySnapshot>(RETAIL_KEYS.energy(storeId));
}

function dispatchRetailUpdate(): void {
  window.dispatchEvent(new CustomEvent('nexum_retail_update'));
}

// ── Inventory health analysis ─────────────────────────────────────────────────
export function buildInventoryHealth(snapshots: InventorySnapshot[]): InventoryHealthSummary {
  if (snapshots.length === 0) {
    return {
      totalSkus: 0, totalValue: 0, outOfStockRate: 0, lowStockRate: 0,
      overStockRate: 0, deadStockValue: 0, turnDays: 0,
      topDeadStockDept: 'N/A', topOutOfStockDept: 'N/A', expiryRisk: 0,
      recommendedMarkdowns: [], reorderAlerts: [],
    };
  }

  const latest = snapshots[0];
  const prev30 = snapshots.filter(s => {
    const d = new Date(s.timestamp);
    return Date.now() - d.getTime() <= 30 * 24 * 3600 * 1000;
  });

  const totalSkus = latest.skuCount;
  const totalValue = latest.totalCostValue;
  const outOfStockRate = totalSkus > 0 ? (latest.outOfStockSkus / totalSkus) * 100 : 0;
  const lowStockRate   = totalSkus > 0 ? (latest.lowStockSkus   / totalSkus) * 100 : 0;
  const overStockRate  = totalSkus > 0 ? (latest.overStockSkus  / totalSkus) * 100 : 0;

  const avgDailySales = latest.unitsSoldLast30Days / 30;
  const turnDays = avgDailySales > 0 ? latest.totalUnits / avgDailySales : 0;

  // Aggregate dead stock value estimate (10% of cost value when deadStockSkus is high)
  const deadStockRatio = totalSkus > 0 ? latest.deadStockSkus / totalSkus : 0;
  const deadStockValue = totalValue * deadStockRatio;

  const expiryRisk = (latest.nearExpiryUnits || 0) * (totalValue / Math.max(totalSkus, 1));

  // Find worst depts by scanning all recent snapshots
  const deptOOS: Record<string, number> = {};
  const deptDead: Record<string, number> = {};
  prev30.forEach(s => {
    deptOOS[s.department] = (deptOOS[s.department] || 0) + s.outOfStockSkus;
    deptDead[s.department] = (deptDead[s.department] || 0) + s.deadStockSkus;
  });
  const topOOSDept  = Object.entries(deptOOS).sort((a,b) => b[1]-a[1])[0]?.[0]  || 'N/A';
  const topDeadDept = Object.entries(deptDead).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

  const recommendedMarkdowns: string[] = [];
  if (deadStockRatio > 0.05) recommendedMarkdowns.push(`${topDeadDept}: dead stock exceeds 5% — consider 20–40% markdown to recover value`);
  if (overStockRate > 15) recommendedMarkdowns.push(`${latest.department}: overstock rate ${overStockRate.toFixed(1)}% — review reorder points`);
  if ((latest.nearExpiryUnits || 0) > 0) recommendedMarkdowns.push(`${latest.nearExpiryUnits} near-expiry units — priority markdown or donation before loss`);

  const reorderAlerts: string[] = [];
  if (outOfStockRate > 5) reorderAlerts.push(`${topOOSDept}: out-of-stock rate ${outOfStockRate.toFixed(1)}% — immediate reorder`);
  if (turnDays > 30) reorderAlerts.push(`Turn days ${turnDays.toFixed(0)}d exceeds 30d target — review slow movers`);
  if (latest.unitsSoldLast7Days < latest.unitsSoldLast30Days / 5)
    reorderAlerts.push('Sales velocity slowing — validate planogram compliance and facings');

  return {
    totalSkus, totalValue, outOfStockRate, lowStockRate, overStockRate,
    deadStockValue, turnDays, topDeadStockDept: topDeadDept,
    topOutOfStockDept: topOOSDept, expiryRisk, recommendedMarkdowns, reorderAlerts,
  };
}

// ── Shrink intelligence ───────────────────────────────────────────────────────
export function buildShrinkSummary(events: ShrinkEvent[], inventory: InventorySnapshot[]): ShrinkSummary {
  const EMPTY_CAT: Record<ShrinkCategory, number> = {
    employee_theft: 0, shoplifting: 0, vendor_fraud: 0,
    admin_error: 0, damage: 0, unknown: 0,
  };

  if (events.length === 0) {
    return {
      totalShrinkValue: 0, shrinkPct: 0, byCategoryValue: EMPTY_CAT,
      topDepartment: 'N/A', topCategory: 'unknown', weekOverWeekChange: 0,
      recoveredValue: 0, openCases: 0, riskAlerts: [], preventionActions: [],
    };
  }

  const now = Date.now();
  const last30 = events.filter(e => now - new Date(e.timestamp).getTime() <= 30 * 86400000);
  const last7  = events.filter(e => now - new Date(e.timestamp).getTime() <= 7  * 86400000);
  const prev7  = events.filter(e => {
    const age = now - new Date(e.timestamp).getTime();
    return age > 7 * 86400000 && age <= 14 * 86400000;
  });

  const totalShrinkValue = last30.reduce((s, e) => s + e.totalValue, 0);
  const recoveredValue   = last30.reduce((s, e) => s + (e.recoveryValue || 0), 0);
  const openCases        = events.filter(e => e.status === 'open').length;

  const byCategoryValue = { ...EMPTY_CAT };
  last30.forEach(e => { byCategoryValue[e.category] = (byCategoryValue[e.category] || 0) + e.totalValue; });

  const topCategory = (Object.entries(byCategoryValue).sort((a,b) => b[1]-a[1])[0]?.[0] || 'unknown') as ShrinkCategory;

  const deptTotals: Record<string, number> = {};
  last30.forEach(e => { deptTotals[e.department] = (deptTotals[e.department] || 0) + e.totalValue; });
  const topDepartment = Object.entries(deptTotals).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

  const latestInv = inventory[0];
  const totalRetailValue = latestInv?.totalRetailValue || 0;
  const shrinkPct = totalRetailValue > 0 ? (totalShrinkValue / totalRetailValue) * 100 : 0;

  const thisWeekValue = last7.reduce((s,e) => s + e.totalValue, 0);
  const prevWeekValue = prev7.reduce((s,e) => s + e.totalValue, 0);
  const weekOverWeekChange = prevWeekValue > 0 ? ((thisWeekValue - prevWeekValue) / prevWeekValue) * 100 : 0;

  const riskAlerts: string[] = [];
  if (shrinkPct > 2.0) riskAlerts.push(`Shrink rate ${shrinkPct.toFixed(2)}% exceeds 2.0% national retail threshold`);
  if (weekOverWeekChange > 20) riskAlerts.push(`Shrink up ${weekOverWeekChange.toFixed(0)}% week-over-week — investigate immediately`);
  if (byCategoryValue.employee_theft > byCategoryValue.shoplifting) riskAlerts.push('Internal theft exceeding external theft — escalate LP review');
  if (openCases > 5) riskAlerts.push(`${openCases} open cases unresolved — prioritize LP closure`);

  const preventionActions: string[] = [];
  const topCatLabel: Record<ShrinkCategory, string> = {
    employee_theft: 'Internal controls: cash handling audits, POS exception reporting, inventory cycle counts',
    shoplifting: 'EAS tag high-value SKUs, review camera blind spots, increase floor presence at peak hours',
    vendor_fraud: 'Audit all delivery counts at receiving dock, compare POs to invoices, rotate receiving staff',
    admin_error: 'Retrain on receiving procedures, audit markdown logs, verify cycle count accuracy',
    damage: 'Improve backroom handling procedures, review packaging, add protective fixtures',
    unknown: 'Conduct comprehensive inventory audit to identify shrink category source',
  };
  preventionActions.push(preventionActions.length === 0 ? topCatLabel[topCategory] : '');
  if (topDepartment !== 'N/A') preventionActions.push(`Focus LP assets on ${topDepartment} department — highest shrink concentration`);

  return {
    totalShrinkValue, shrinkPct, byCategoryValue, topDepartment, topCategory,
    weekOverWeekChange, recoveredValue, openCases,
    riskAlerts: riskAlerts.filter(Boolean),
    preventionActions: preventionActions.filter(Boolean),
  };
}

// ── Food safety scoring ───────────────────────────────────────────────────────
export function buildFoodSafetyScore(logs: FoodSafetyLog[], compliance: ComplianceRecord[]): FoodSafetyScore {
  const now = Date.now();
  const last30 = logs.filter(l => now - new Date(l.timestamp).getTime() <= 30 * 86400000);

  if (last30.length === 0) {
    return {
      overallScore: 100, passRate: 100, criticalViolations: 0,
      majorViolations: 0, minorViolations: 0, temperatureCompliance: 100,
      sanitationCompliance: 100, dateRotationCompliance: 100,
      expiringPermits: [], correctiveActions: [],
    };
  }

  const passed = last30.filter(l => l.passed).length;
  const passRate = (passed / last30.length) * 100;

  const tempLogs   = last30.filter(l => l.checkType === 'temperature');
  const sanitLogs  = last30.filter(l => l.checkType === 'sanitation');
  const dateLogs   = last30.filter(l => l.checkType === 'date_rotation');

  const tempCompliance   = tempLogs.length   > 0 ? (tempLogs.filter(l => l.passed).length   / tempLogs.length)   * 100 : 100;
  const sanitCompliance  = sanitLogs.length  > 0 ? (sanitLogs.filter(l => l.passed).length  / sanitLogs.length)  * 100 : 100;
  const dateCompliance   = dateLogs.length   > 0 ? (dateLogs.filter(l => l.passed).length   / dateLogs.length)   * 100 : 100;

  // Classify violations by check type criticality
  const failed = last30.filter(l => !l.passed);
  const criticalTypes = new Set(['temperature', 'pest', 'employee_hygiene']);
  const majorTypes    = new Set(['sanitation', 'date_rotation']);
  const criticalViolations = failed.filter(l => criticalTypes.has(l.checkType)).length;
  const majorViolations    = failed.filter(l => majorTypes.has(l.checkType)).length;
  const minorViolations    = failed.length - criticalViolations - majorViolations;

  // Health dept scoring model: 100 - (critical×5) - (major×2) - (minor×1)
  const overallScore = Math.max(0, Math.min(100,
    100 - criticalViolations * 5 - majorViolations * 2 - minorViolations
  ));

  const expiringPermits: string[] = compliance
    .filter(r => {
      if (!r.expiryDate) return false;
      const daysLeft = (new Date(r.expiryDate).getTime() - now) / 86400000;
      return daysLeft >= 0 && daysLeft <= 60;
    })
    .map(r => `${r.itemDescription} expires ${r.expiryDate}`);

  const correctiveActions: string[] = [];
  if (tempCompliance < 95) correctiveActions.push('Temperature deviations detected — calibrate thermometers, verify refrigeration setpoints');
  if (sanitCompliance < 90) correctiveActions.push('Sanitation compliance below 90% — reinforce 4-step sanitization protocol');
  if (dateCompliance < 95)  correctiveActions.push('Date rotation failures — enforce FIFO training and spot-check frequency');
  if (criticalViolations > 0) correctiveActions.push(`${criticalViolations} critical violations require same-day corrective documentation`);

  return {
    overallScore, passRate, criticalViolations, majorViolations, minorViolations,
    temperatureCompliance: tempCompliance, sanitationCompliance: sanitCompliance,
    dateRotationCompliance: dateCompliance, expiringPermits, correctiveActions,
  };
}

// ── Vendor intelligence ───────────────────────────────────────────────────────
export function buildVendorIntelligence(logs: VendorPerformanceLog[]): VendorIntelligenceSummary {
  if (logs.length === 0) {
    return {
      totalVendors: 0, avgFillRate: 100, avgOnTimeRate: 100, preferredVendorCount: 0,
      probationCount: 0, topPerformer: 'N/A', underperformer: 'N/A',
      totalShortageValue: 0, recommendations: [],
    };
  }

  const now = Date.now();
  const last90 = logs.filter(l => now - new Date(l.timestamp).getTime() <= 90 * 86400000);

  const vendorMap: Record<string, { onTime: number; total: number; fillRates: number[]; shortages: number }> = {};
  last90.forEach(l => {
    if (!vendorMap[l.vendorName]) vendorMap[l.vendorName] = { onTime: 0, total: 0, fillRates: [], shortages: 0 };
    vendorMap[l.vendorName].total++;
    if (l.deliveryOnTime) vendorMap[l.vendorName].onTime++;
    vendorMap[l.vendorName].fillRates.push(l.fillRate);
    vendorMap[l.vendorName].shortages += l.shortages;
  });

  const totalVendors = Object.keys(vendorMap).length;
  const avgFillRate  = last90.reduce((s,l) => s + l.fillRate, 0) / last90.length;
  const avgOnTimeRate = last90.filter(l => l.deliveryOnTime).length / last90.length * 100;

  const vendorScores = Object.entries(vendorMap).map(([name, d]) => ({
    name,
    score: (d.onTime / d.total) * 0.5 + (d.fillRates.reduce((s,r)=>s+r,0) / d.fillRates.length / 100) * 0.5,
  })).sort((a,b) => b.score - a.score);

  const topPerformer   = vendorScores[0]?.name || 'N/A';
  const underperformer = vendorScores[vendorScores.length - 1]?.name || 'N/A';
  const underScore     = vendorScores[vendorScores.length - 1]?.score || 1;

  const preferredVendorCount = vendorScores.filter(v => v.score >= 0.90).length;
  const probationCount       = vendorScores.filter(v => v.score < 0.75).length;
  const totalShortageValue   = last90.reduce((s,l) => s + l.shortages * 10, 0); // estimate $10/unit shortage impact

  const recommendations: string[] = [];
  if (avgFillRate < 95)  recommendations.push(`Avg fill rate ${avgFillRate.toFixed(1)}% — target 98%+ per enterprise standards; review with underperforming vendors`);
  if (avgOnTimeRate < 90) recommendations.push(`On-time delivery ${avgOnTimeRate.toFixed(1)}% — negotiate lead-time SLAs, consider backup supplier for top SKUs`);
  if (probationCount > 0) recommendations.push(`${probationCount} vendor(s) on probation performance — schedule QBR, issue improvement plan`);
  if (underScore < 0.70)  recommendations.push(`${underperformer} performing below acceptable threshold — evaluate contract renewal`);

  return {
    totalVendors, avgFillRate, avgOnTimeRate, preferredVendorCount,
    probationCount, topPerformer, underperformer, totalShortageValue, recommendations,
  };
}

// ── Operational efficiency ────────────────────────────────────────────────────
export function buildOperationalEfficiency(tasks: OperationalTask[]): OperationalEfficiency {
  const now = Date.now();
  const last30 = tasks.filter(t => now - new Date(t.createdAt).getTime() <= 30 * 86400000);

  if (last30.length === 0) {
    return {
      taskCompletionRate: 0, onTimeCompletionRate: 0, criticalTasksMissed: 0,
      avgTasksPerShift: 0, bestShift: 'opening', worstShift: 'closing',
      topMissedCategory: 'N/A', recommendations: [],
    };
  }

  const completed    = last30.filter(t => t.status === 'completed');
  const completionRate = (completed.length / last30.length) * 100;

  const onTime = completed.filter(t => {
    if (!t.dueTime || !t.completedAt) return true;
    return new Date(t.completedAt) <= new Date(t.dueTime);
  });
  const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;

  const criticalMissed = last30.filter(t =>
    t.priority === 'critical' && (t.status === 'pending' || t.status === 'skipped')
  ).length;

  const shiftCounts: Record<string, number> = {};
  const shiftCompleted: Record<string, number> = {};
  const deptMissed: Record<string, number> = {};

  last30.forEach(t => {
    shiftCounts[t.shift]    = (shiftCounts[t.shift] || 0) + 1;
    if (t.status === 'completed') shiftCompleted[t.shift] = (shiftCompleted[t.shift] || 0) + 1;
    if (t.status !== 'completed') deptMissed[t.department] = (deptMissed[t.department] || 0) + 1;
  });

  const shiftRates = Object.entries(shiftCounts).map(([shift, cnt]) => ({
    shift, rate: ((shiftCompleted[shift] || 0) / cnt) * 100,
  })).sort((a,b) => b.rate - a.rate);

  const bestShift  = (shiftRates[0]?.shift  || 'opening') as any;
  const worstShift = (shiftRates[shiftRates.length-1]?.shift || 'closing') as any;
  const topMissedCategory = Object.entries(deptMissed).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';
  const avgTasksPerShift = last30.length / Math.max(Object.keys(shiftCounts).length, 1);

  const recommendations: string[] = [];
  if (completionRate < 85) recommendations.push(`Task completion ${completionRate.toFixed(0)}% — below 85% target; review workload distribution`);
  if (onTimeRate < 80) recommendations.push(`On-time rate ${onTimeRate.toFixed(0)}% — reassign or reschedule high-priority tasks`);
  if (criticalMissed > 0) recommendations.push(`${criticalMissed} critical task(s) missed — immediate follow-up and root cause required`);
  if (topMissedCategory !== 'N/A') recommendations.push(`${topMissedCategory} department missing most tasks — add supervisor check-in`);

  return {
    taskCompletionRate: completionRate, onTimeCompletionRate: onTimeRate,
    criticalTasksMissed: criticalMissed, avgTasksPerShift, bestShift, worstShift,
    topMissedCategory, recommendations,
  };
}

// ── CTS™ Retail Intelligence ──────────────────────────────────────────────────
export function buildRetailCTS(
  inventory: InventorySnapshot[],
  shrink: ShrinkEvent[],
  foodSafety: FoodSafetyLog[],
  compliance: ComplianceRecord[],
  vendors: VendorPerformanceLog[],
  tasks: OperationalTask[],
): RetailCTSInsight[] {
  const invHealth = buildInventoryHealth(inventory);
  const shrinkSum = buildShrinkSummary(shrink, inventory);
  const fsScore   = buildFoodSafetyScore(foodSafety, compliance);
  const vendorInt = buildVendorIntelligence(vendors);
  const opsEff    = buildOperationalEfficiency(tasks);

  // RELIABILITY: Are core store systems reliably executing?
  // Key: task completion, equipment uptime, on-time delivery, cold chain
  const reliabilityScore = Math.round(
    opsEff.taskCompletionRate * 0.3 +
    fsScore.temperatureCompliance * 0.3 +
    vendorInt.avgOnTimeRate * 0.2 +
    Math.max(0, 100 - shrinkSum.openCases * 5) * 0.2
  );

  // RELEVANCE: Is inventory and product mix aligned to demand?
  // Key: OOS rate, dead stock, turn days vs. target
  const turnScore = invHealth.turnDays > 0 ? Math.max(0, 100 - Math.max(0, invHealth.turnDays - 14) * 3) : 60;
  const relevanceScore = Math.round(
    Math.max(0, 100 - invHealth.outOfStockRate * 3) * 0.35 +
    Math.max(0, 100 - invHealth.overStockRate * 1.5) * 0.25 +
    turnScore * 0.25 +
    Math.max(0, 100 - invHealth.deadStockValue / Math.max(invHealth.totalValue, 1) * 500) * 0.15
  );

  // SCALABILITY: Can the store absorb demand surges?
  // Key: vendor fill rate, task capacity, inventory depth
  const scalabilityScore = Math.round(
    vendorInt.avgFillRate * 0.4 +
    Math.max(0, 100 - invHealth.outOfStockRate * 5) * 0.3 +
    Math.min(100, opsEff.avgTasksPerShift * 10) * 0.15 +
    (vendorInt.preferredVendorCount / Math.max(vendorInt.totalVendors, 1)) * 100 * 0.15
  );

  // VOLATILITY: Is performance stable or swinging unpredictably?
  // Key: WoW shrink change, OOS rate stability, compliance violations
  const volatilityScore = Math.round(
    Math.max(0, 100 - Math.abs(shrinkSum.weekOverWeekChange) * 2) * 0.35 +
    Math.max(0, 100 - fsScore.criticalViolations * 10) * 0.35 +
    Math.max(0, 100 - vendorInt.probationCount * 15) * 0.30
  );

  // VALIDATION: Are regulatory and compliance standards met?
  // Key: food safety score, permits current, health inspection compliance
  const expiredCompliance = compliance.filter(r => r.status === 'expired' || r.status === 'non_compliant').length;
  const validationScore = Math.round(
    fsScore.overallScore * 0.4 +
    fsScore.sanitationCompliance * 0.2 +
    Math.max(0, 100 - expiredCompliance * 20) * 0.25 +
    (fsScore.expiringPermits.length === 0 ? 100 : 70) * 0.15
  );

  const trend = (score: number, prev: number): 'improving' | 'stable' | 'declining' =>
    score > prev + 3 ? 'improving' : score < prev - 3 ? 'declining' : 'stable';

  return [
    {
      dimension: 'reliability',
      score: reliabilityScore,
      trend: trend(reliabilityScore, 70),
      keyMetric: `${opsEff.taskCompletionRate.toFixed(0)}% task completion`,
      interpretation: reliabilityScore >= 80
        ? 'Store operations executing consistently. Systems reliable.'
        : 'Reliability gaps in task execution or temperature compliance. Address before peak periods.',
      correctiveActions: [
        opsEff.taskCompletionRate < 85 ? 'Conduct shift briefings to close task completion gap' : null,
        fsScore.temperatureCompliance < 95 ? 'Calibrate cold chain monitoring — temperature drift detected' : null,
        vendorInt.avgOnTimeRate < 90 ? 'Negotiate delivery SLAs with underperforming vendors' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Enterprise standard: 95%+ task completion rate per shift (Target, Walmart internal benchmarks)',
        'FDA Food Code requires temperature logs every 4 hours for critical control points',
        `Best shift: ${opsEff.bestShift} — replicate that shift\'s scheduling model across others`,
      ],
      benchmarkComparison: reliabilityScore >= 90 ? 'Exceeds national retail average' : reliabilityScore >= 75 ? 'Near national retail average' : 'Below national retail standards',
    },
    {
      dimension: 'relevance',
      score: relevanceScore,
      trend: trend(relevanceScore, 65),
      keyMetric: `${invHealth.outOfStockRate.toFixed(1)}% OOS rate`,
      interpretation: relevanceScore >= 80
        ? 'Inventory mix well-aligned to demand. Strong planogram execution.'
        : 'OOS or dead stock signals misalignment between buying and demand patterns.',
      correctiveActions: [
        invHealth.outOfStockRate > 3 ? `Reduce OOS in ${invHealth.topOutOfStockDept} — immediate replenishment review` : null,
        invHealth.deadStockValue > 0 ? `Mark down dead stock in ${invHealth.topDeadStockDept} — capital tied up` : null,
        invHealth.turnDays > 21 ? `Turn days ${invHealth.turnDays.toFixed(0)}d — review reorder quantities against velocity` : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Walmart\'s in-stock rate target: 95%+. Dollar Tree target: 97%+ on core SKUs',
        `Turn days target ${14}d — current ${invHealth.turnDays.toFixed(0)}d`,
        'Dead stock > 5% of SKU count signals buying pattern misalignment',
      ],
      benchmarkComparison: relevanceScore >= 88 ? 'Big-box standard met' : relevanceScore >= 70 ? 'Regional standard — room to improve' : 'Below enterprise threshold',
    },
    {
      dimension: 'scalability',
      score: scalabilityScore,
      trend: trend(scalabilityScore, 70),
      keyMetric: `${vendorInt.avgFillRate.toFixed(1)}% vendor fill rate`,
      interpretation: scalabilityScore >= 80
        ? 'Store supply chain and capacity can absorb demand surges.'
        : 'Vendor fill rate or inventory depth may limit ability to scale for promotional periods.',
      correctiveActions: [
        vendorInt.avgFillRate < 95 ? 'Negotiate fill rate minimums in vendor contracts — target 98%' : null,
        vendorInt.probationCount > 0 ? `${vendorInt.probationCount} vendors underperforming — develop secondary suppliers` : null,
        invHealth.lowStockRate > 10 ? 'Build safety stock on top-velocity SKUs before seasonal peaks' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Home Depot standard: 98%+ fill rate from key vendors, 30-day safety stock on critical items',
        'During Q4 peak, preferred-vendor ratio should exceed 80% of purchase volume',
        `Current preferred vendors: ${vendorInt.preferredVendorCount} of ${vendorInt.totalVendors}`,
      ],
      benchmarkComparison: scalabilityScore >= 85 ? 'Enterprise ready for peak' : 'Needs supply chain reinforcement before peak periods',
    },
    {
      dimension: 'volatility',
      score: volatilityScore,
      trend: trend(volatilityScore, 70),
      keyMetric: `Shrink Δ ${shrinkSum.weekOverWeekChange > 0 ? '+' : ''}${shrinkSum.weekOverWeekChange.toFixed(0)}% WoW`,
      interpretation: volatilityScore >= 80
        ? 'Performance metrics stable week-over-week. Low operational variance.'
        : 'Significant swings in shrink, compliance, or vendor reliability indicate instability.',
      correctiveActions: [
        Math.abs(shrinkSum.weekOverWeekChange) > 20 ? 'Shrink spike detected — deploy LP coverage immediately' : null,
        fsScore.criticalViolations > 0 ? 'Critical food safety violations create regulatory volatility — same-day corrective' : null,
        vendorInt.probationCount > 1 ? 'Multiple vendor performance issues create supply volatility risk' : null,
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Acceptable WoW shrink variance: ±10%. Above 20% triggers LP investigation protocol',
        'Food safety critical violations must be documented and corrected within 4 hours per FDA',
        'Stable operations reduce regulatory risk and improve customer experience scores',
      ],
      benchmarkComparison: volatilityScore >= 80 ? 'Low variance — stable operation' : 'Elevated variance — reduce controllable variation',
    },
    {
      dimension: 'validation',
      score: validationScore,
      trend: trend(validationScore, 72),
      keyMetric: `Food Safety Score: ${fsScore.overallScore}/100`,
      interpretation: validationScore >= 85
        ? 'Regulatory validation strong. Compliance posture defensible for health inspections.'
        : 'Compliance gaps expose store to regulatory action. Permits or standards need attention.',
      correctiveActions: [
        fsScore.overallScore < 85 ? `Food safety score ${fsScore.overallScore} — below 85 threshold; review critical violation log` : null,
        expiredCompliance > 0 ? `${expiredCompliance} expired compliance items — renew immediately` : null,
        ...fsScore.correctiveActions.slice(0, 1),
      ].filter(Boolean) as string[],
      preservedKnowledge: [
        'Health inspection scores below 85 typically require re-inspection within 30 days',
        'Expired permits: immediate violation risk — schedule renewals 90 days in advance',
        `${fsScore.expiringPermits.length} permit(s) expiring within 60 days — proactive renewal window`,
      ],
      benchmarkComparison: validationScore >= 90 ? 'Exceeds regulatory minimum' : validationScore >= 80 ? 'Meets regulatory minimum' : 'Below regulatory minimum — corrective action required',
    },
  ];
}

// ── Executive summary ─────────────────────────────────────────────────────────
export function buildRetailExecutiveSummary(
  profile: StoreProfile,
  inventory: InventorySnapshot[],
  shrink: ShrinkEvent[],
  foodSafety: FoodSafetyLog[],
  compliance: ComplianceRecord[],
  vendors: VendorPerformanceLog[],
  tasks: OperationalTask[],
  energy: StoreEnergySnapshot[],
): RetailExecutiveSummary {
  const invHealth = buildInventoryHealth(inventory);
  const shrinkSum = buildShrinkSummary(shrink, inventory);
  const fsScore   = buildFoodSafetyScore(foodSafety, compliance);
  const vendorInt = buildVendorIntelligence(vendors);
  const opsEff    = buildOperationalEfficiency(tasks);
  const cts       = buildRetailCTS(inventory, shrink, foodSafety, compliance, vendors, tasks);

  const avgCTSScore = cts.reduce((s,c) => s + c.score, 0) / cts.length;
  const storePerformanceIndex = Math.round(avgCTSScore);

  const latestEnergy = energy[0];
  const energyIntensity = latestEnergy?.intensityKwhPerSqFt || 0;

  const topRisks: string[] = [
    shrinkSum.shrinkPct > profile.targetShrinkPct ? `Shrink ${shrinkSum.shrinkPct.toFixed(2)}% exceeds target ${profile.targetShrinkPct}%` : null,
    invHealth.outOfStockRate > 5 ? `OOS rate ${invHealth.outOfStockRate.toFixed(1)}% — revenue impact estimated` : null,
    fsScore.criticalViolations > 0 ? `${fsScore.criticalViolations} critical food safety violations — regulatory risk` : null,
    opsEff.taskCompletionRate < 75 ? `Task completion ${opsEff.taskCompletionRate.toFixed(0)}% — operational discipline gap` : null,
    vendorInt.probationCount > 0 ? `${vendorInt.probationCount} vendor(s) underperforming — supply risk` : null,
  ].filter(Boolean) as string[];

  const quickWins: string[] = [
    invHealth.expiryRisk > 0 ? `Mark down ${invHealth.expiryRisk > 500 ? '$' + Math.round(invHealth.expiryRisk) : ''} near-expiry inventory before loss` : null,
    invHealth.deadStockValue > 1000 ? `Clear dead stock in ${invHealth.topDeadStockDept} — recover estimated $${Math.round(invHealth.deadStockValue * 0.3)}` : null,
    shrinkSum.openCases > 0 ? `Close ${shrinkSum.openCases} open shrink case(s) — complete documentation within 48hrs` : null,
    opsEff.criticalTasksMissed > 0 ? `Reassign ${opsEff.criticalTasksMissed} critical missed task(s) before next shift` : null,
    fsScore.expiringPermits.length > 0 ? `Renew ${fsScore.expiringPermits.length} expiring permit(s) now to avoid gaps` : null,
  ].filter(Boolean) as string[];

  const capitalProjects: string[] = [
    energyIntensity > 25 ? 'LED lighting retrofit — typical 30% energy reduction, 18-month ROI' : null,
    'Self-checkout expansion — 4+ units reduces labor cost 12–18% per enterprise standards',
    invHealth.turnDays > 21 ? 'Inventory management software upgrade to automate reorder triggers' : null,
    'Refrigeration monitoring system — IoT sensors for cold chain compliance, reduce spoilage 40%',
  ].filter(Boolean) as string[];

  return {
    periodLabel: 'Last 30 Days',
    storePerformanceIndex,
    totalSalesEstimate: profile.targetWeeklySales * 4,
    shrinkRatePct: shrinkSum.shrinkPct,
    inventoryTurnDays: invHealth.turnDays,
    foodSafetyScore: fsScore.overallScore,
    taskCompletionRate: opsEff.taskCompletionRate,
    energyIntensity,
    vendorFillRate: vendorInt.avgFillRate,
    topRisks: topRisks.slice(0, 4),
    quickWins: quickWins.slice(0, 4),
    capitalProjects: capitalProjects.slice(0, 4),
    fiveYearProjection: `Optimized store SPI improvement to ${Math.min(storePerformanceIndex + 15, 100)}/100 delivers estimated $${((profile.targetWeeklySales * 52 * 0.03) / 1000).toFixed(0)}K+ in annual savings via shrink, energy, and labor efficiency.`,
  };
}

// ── Intelligence Timeline ─────────────────────────────────────────────────────
export function buildRetailTimeline(
  inventory: InventorySnapshot[],
  shrink: ShrinkEvent[],
  foodSafety: FoodSafetyLog[],
  compliance: ComplianceRecord[],
  vendors: VendorPerformanceLog[],
  tasks: OperationalTask[],
): RetailTimelineEntry[] {
  const entries: RetailTimelineEntry[] = [];

  shrink.slice(0, 5).forEach(e => entries.push({
    id: e.eventId, timestamp: e.timestamp, source: 'shrink',
    title: `Shrink Event — ${e.category.replace(/_/g, ' ')}`,
    description: `${e.department}: ${e.itemDescription} | $${e.totalValue.toFixed(2)} loss`,
    severity: e.totalValue > 500 ? 'critical' : e.totalValue > 100 ? 'warning' : 'info',
    department: e.department, value: `$${e.totalValue.toFixed(2)}`,
  }));

  foodSafety.filter(l => !l.passed).slice(0, 5).forEach(l => entries.push({
    id: l.logId, timestamp: l.timestamp, source: 'food_safety',
    title: `Food Safety Fail — ${l.checkType.replace(/_/g, ' ')}`,
    description: `${l.area}: ${l.corrective || 'Corrective action required'}`,
    severity: ['temperature','pest','employee_hygiene'].includes(l.checkType) ? 'critical' : 'warning',
    department: l.area,
  }));

  vendors.filter(l => !l.deliveryOnTime || l.fillRate < 90).slice(0, 3).forEach(l => entries.push({
    id: l.logId, timestamp: l.timestamp, source: 'vendor',
    title: `Vendor Issue — ${l.vendorName}`,
    description: `Fill rate: ${l.fillRate}% | ${l.deliveryOnTime ? 'On time' : 'Late delivery'} | Shortages: ${l.shortages}`,
    severity: l.fillRate < 80 ? 'warning' : 'info',
    value: `Fill: ${l.fillRate}%`,
  }));

  compliance.filter(r => r.status === 'expired' || r.status === 'expiring_soon').forEach(r => entries.push({
    id: r.recordId, timestamp: r.updatedAt, source: 'compliance',
    title: `Compliance ${r.status === 'expired' ? 'Expired' : 'Expiring'} — ${r.itemDescription}`,
    description: r.expiryDate ? `Expires ${r.expiryDate}` : 'Review required',
    severity: r.status === 'expired' ? 'critical' : 'warning',
  }));

  tasks.filter(t => t.status === 'skipped' || (t.priority === 'critical' && t.status === 'pending')).slice(0, 4).forEach(t => entries.push({
    id: t.taskId, timestamp: t.createdAt, source: 'operations',
    title: `Task ${t.status === 'skipped' ? 'Skipped' : 'Overdue'} — ${t.taskName}`,
    description: `${t.department} | Priority: ${t.priority} | Shift: ${t.shift}`,
    severity: t.priority === 'critical' ? 'critical' : 'warning',
    department: t.department,
  }));

  inventory.slice(0, 2).forEach(s => entries.push({
    id: s.snapshotId, timestamp: s.timestamp, source: 'inventory',
    title: `Inventory Snapshot — ${s.department}`,
    description: `${s.skuCount} SKUs | OOS: ${s.outOfStockSkus} | Turn: ${(s.unitsSoldLast30Days > 0 ? s.totalUnits/(s.unitsSoldLast30Days/30) : 0).toFixed(0)}d`,
    severity: s.outOfStockSkus > s.skuCount * 0.05 ? 'warning' : 'info',
    department: s.department, value: `$${(s.totalCostValue/1000).toFixed(1)}K`,
  }));

  return entries.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 25);
}
