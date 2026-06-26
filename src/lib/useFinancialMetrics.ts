import { useMemo } from 'react';

export interface FinancialMetrics {
  totalAssetValue: number;       // sum of purchasePrice or replacementCost
  totalMaintenanceCost: number;  // sum of all accumulated cost fields
  dailyCost: number;             // totalMaintenanceCost / 365
  avgEfficiency: number;         // average currentEfficiency of active equipment
  totalEquipmentCount: number;
  workOrderSpend: number;        // sum of cost/estimatedCost from all WOs
  openWorkOrderCount: number;
  openWorkOrderCost: number;     // cost of open/in-progress WOs
  completedWorkOrderCost: number;
  budgetUtilization: number;     // workOrderSpend / totalBudget * 100
  complianceRate: number;        // % violations resolved
  departmentBudgets: Record<string, { budget: number; spent: number; remaining: number }>;
}

export function useFinancialMetrics(tick?: number): FinancialMetrics {
  return useMemo(() => {
    // Equipment
    let equipment: any[] = [];
    try { equipment = JSON.parse(localStorage.getItem('nexum_equipment_library') || '[]'); } catch {}
    const financials: Record<string, any> = {};
    try { Object.assign(financials, JSON.parse(localStorage.getItem('nexum_equipment_financials') || '{}')); } catch {}

    // Merge financials into equipment (in case loadEquipment hasn't merged yet)
    const equipWithFinancials = equipment.map((eq: any) => ({ ...eq, ...(financials[eq.equipmentId] || {}) }));

    let totalAssetValue = 0;
    let totalMaintenanceCost = 0;
    let totalEfficiency = 0;
    let efficiencyCount = 0;

    for (const eq of equipWithFinancials) {
      const price = Number(eq.purchasePrice || eq.replacementCost || 0);
      totalAssetValue += price;
      totalMaintenanceCost += Number(eq.maintenanceCostAccumulated || 0)
        + Number(eq.laborCostAccumulated || 0)
        + Number(eq.partsConsumedValue || 0)
        + Number(eq.contractorCostAccumulated || 0);
      if (eq.currentEfficiency && (eq.status === 'active' || !eq.status)) {
        totalEfficiency += Number(eq.currentEfficiency);
        efficiencyCount++;
      }
    }

    // Work orders
    let workOrders: any[] = [];
    try { workOrders = JSON.parse(localStorage.getItem('nexum_work_orders') || '[]'); } catch {}

    let workOrderSpend = 0;
    let openWorkOrderCount = 0;
    let openWorkOrderCost = 0;
    let completedWorkOrderCost = 0;
    const deptSpend: Record<string, number> = {};

    for (const wo of workOrders) {
      const cost = Number(wo.cost || wo.estimatedCost || wo.laborCost || 0)
        + Number(wo.partsCost || 0);
      const dept = wo.department || wo.assignedDepartment || 'General';
      workOrderSpend += cost;
      deptSpend[dept] = (deptSpend[dept] || 0) + cost;
      const isOpen = !['completed', 'closed', 'cancelled'].includes((wo.status || '').toLowerCase());
      if (isOpen) { openWorkOrderCount++; openWorkOrderCost += cost; }
      else { completedWorkOrderCost += cost; }
    }

    // Department budgets
    let deptBudgets: Record<string, number> = {};
    try { deptBudgets = JSON.parse(localStorage.getItem('nexum_dept_budgets') || '{}'); } catch {}

    const departmentBudgets: Record<string, { budget: number; spent: number; remaining: number }> = {};
    const allDepts = new Set([...Object.keys(deptBudgets), ...Object.keys(deptSpend)]);
    for (const dept of allDepts) {
      const budget = Number(deptBudgets[dept] || 0);
      const spent = Number(deptSpend[dept] || 0);
      departmentBudgets[dept] = { budget, spent, remaining: Math.max(0, budget - spent) };
    }

    // Violations
    let violations: any[] = [];
    try { violations = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]'); } catch {}
    const resolvedCount = violations.filter((v: any) => ['resolved', 'closed'].includes((v.status || '').toLowerCase())).length;
    const complianceRate = violations.length > 0 ? (resolvedCount / violations.length) * 100 : 100;

    // Total budget across all departments
    const totalBudget = Object.values(deptBudgets).reduce((a: number, b: any) => a + Number(b), 0);

    return {
      totalAssetValue,
      totalMaintenanceCost,
      dailyCost: totalMaintenanceCost > 0 ? totalMaintenanceCost / 365 : 0,
      avgEfficiency: efficiencyCount > 0 ? totalEfficiency / efficiencyCount : 0,
      totalEquipmentCount: equipWithFinancials.length,
      workOrderSpend,
      openWorkOrderCount,
      openWorkOrderCost,
      completedWorkOrderCost,
      budgetUtilization: totalBudget > 0 ? (workOrderSpend / totalBudget) * 100 : 0,
      complianceRate,
      departmentBudgets,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}
