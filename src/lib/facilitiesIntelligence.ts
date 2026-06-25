export interface FacilitiesIntelligence {
  // Ceiling tiles
  totalTiles: number;
  tilesNeedingReplacement: number;
  tilesReplaced: number;
  tileHealthPct: number;
  tileReplacementCost: number;
  floorsTracked: number;
  // Supplies
  supplyOnHandValue: number;
  supplyAtRiskValue: number;
  supplyOutCount: number;
  supplyLowCount: number;
  floorsWithSupplyGap: number;
  // Staffing
  shiftsToday: number;
  activeNow: number;
  coveragePct: number;
  coverageGaps: string[]; // role names with zero coverage
  ukgConnected: boolean;
  lastUKGSync?: string;
  // Correlation
  riskScore: number; // 0–100 derived from above
  riskFactors: string[];
}

export function getFacilitiesIntelligence(facilityId: string): FacilitiesIntelligence {
  const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

  // ── Ceiling tiles ──────────────────────────────────────────────────────────
  const floorTiles: any[] = safe(() => JSON.parse(localStorage.getItem('nexum_ceiling_tiles') || '[]'), []);
  const workOrders: any[] = safe(() => JSON.parse(localStorage.getItem('nexum_work_orders') || '[]'), []);
  const violations: any[] = safe(() => JSON.parse(localStorage.getItem('nexum_violation_events') || '[]'), []);
  const CEILING_KW = /ceiling|tile|drop\s*ceil|acoustic|grid panel/i;

  let totalTiles = 0, tilesNeedingReplacement = 0, tilesReplaced = 0;
  for (const floor of floorTiles) {
    totalTiles += floor.totalTiles || 0;
    const WO_MATCH = (wo: any) => CEILING_KW.test(`${wo.title} ${wo.description}`);
    tilesNeedingReplacement += workOrders.filter(wo => WO_MATCH(wo) && ['open','on_hold'].includes(wo.status)).length;
    tilesReplaced += workOrders.filter(wo => WO_MATCH(wo) && wo.status === 'completed').length
      + violations.filter(v => CEILING_KW.test(`${v.type} ${v.description}`) && v.type === 'PM_COMPLETED').length;
  }
  const tilesGood = Math.max(0, totalTiles - tilesNeedingReplacement - tilesReplaced);
  const tileHealthPct = totalTiles > 0 ? Math.round((tilesGood / totalTiles) * 100) : 100;
  const tileUnitCost = floorTiles.length > 0
    ? floorTiles.reduce((s: number, f: any) => s + (f.tileUnitCost || 4.5), 0) / floorTiles.length
    : 4.5;
  const tileReplacementCost = tilesNeedingReplacement * tileUnitCost;

  // ── Supplies ───────────────────────────────────────────────────────────────
  const rawInv = safe(() => {
    const r = localStorage.getItem(`nexum_inventory_${facilityId}`);
    if (!r) return [];
    const p = JSON.parse(r);
    return (Array.isArray(p) ? p : p.items || []) as any[];
  }, []);
  const CUSTODIAL_KW = /mop|broom|bucket|plunger|toilet|soap|paper|towel|sponge|cleaner|disinfect|trash|bag|glove|spray/i;
  const CUSTODIAL_CAT = ['JANITORIAL','CUSTODIAL','CLEANING','TOILETRIES','PAPER','SANITATION'];
  const custodialItems = rawInv.filter((it: any) =>
    CUSTODIAL_CAT.some(c => (it.category||'').toUpperCase().includes(c) || (it.subcategory||'').toUpperCase().includes(c)) ||
    CUSTODIAL_KW.test(it.name || '')
  );
  const supplyOnHandValue = custodialItems.reduce((s: number, it: any) => s + (it.quantity || 0) * (it.unitCost || 0), 0);
  const supplyOutItems = custodialItems.filter((it: any) => it.quantity === 0);
  const supplyLowItems = custodialItems.filter((it: any) => it.quantity > 0 && it.quantity <= (it.minQuantity || 2));
  const supplyAtRiskValue = [...supplyOutItems, ...supplyLowItems].reduce((s: number, it: any) => s + (it.minQuantity || 2) * (it.unitCost || 0), 0);

  const floorAssignments: any[] = safe(() => JSON.parse(localStorage.getItem('nexum_floor_assignments') || '[]'), []);
  const floorsWithSupplyGap = floorAssignments.filter((fa: any) => {
    const floorItems = custodialItems.filter((it: any) =>
      !it.location || it.location.toLowerCase().includes((fa.floorLabel||'').toLowerCase())
    );
    return floorItems.some((it: any) => it.quantity === 0);
  }).length;

  // ── Staffing ───────────────────────────────────────────────────────────────
  const allShifts: any[] = safe(() => JSON.parse(localStorage.getItem('nexum_staff_schedule') || '[]'), []);
  const today = new Date().toDateString();
  const todayShifts = allShifts.filter((s: any) => new Date(s.shiftStart).toDateString() === today);
  const now = new Date();
  const activeShifts = todayShifts.filter((s: any) => now >= new Date(s.shiftStart) && now <= new Date(s.shiftEnd));
  const coveragePct = todayShifts.length > 0 ? Math.round((activeShifts.length / todayShifts.length) * 100) : 0;
  const KEY_ROLES = ['engineer','operator','custodian','supervisor'];
  const coverageGaps = KEY_ROLES.filter(role =>
    !activeShifts.some((s: any) => (s.role||'').toLowerCase().includes(role))
  );
  const ukgCfg = safe(() => { const r = localStorage.getItem('nexum_integrations'); return r ? JSON.parse(r).ukg : null; }, null);
  const ukgConnected = !!(ukgCfg?.enabled && ukgCfg?.baseUrl);

  // ── Risk score ─────────────────────────────────────────────────────────────
  const riskFactors: string[] = [];
  let risk = 0;
  if (tileHealthPct < 70) { risk += 20; riskFactors.push(`Ceiling tile health at ${tileHealthPct}%`); }
  if (tilesNeedingReplacement > 50) { risk += 15; riskFactors.push(`${tilesNeedingReplacement} tiles need replacement`); }
  if (supplyOutItems.length > 0) { risk += 25; riskFactors.push(`${supplyOutItems.length} supply item${supplyOutItems.length>1?'s':''} out of stock`); }
  if (supplyLowItems.length > 3) { risk += 10; riskFactors.push(`${supplyLowItems.length} supply items low`); }
  if (coverageGaps.length > 0) { risk += 20; riskFactors.push(`No ${coverageGaps.join(', ')} coverage on current shift`); }
  if (floorsWithSupplyGap > 0) { risk += 10; riskFactors.push(`${floorsWithSupplyGap} floor${floorsWithSupplyGap>1?'s':''} out of supplies`); }

  return {
    totalTiles, tilesNeedingReplacement, tilesReplaced, tileHealthPct, tileReplacementCost, floorsTracked: floorTiles.length,
    supplyOnHandValue, supplyAtRiskValue, supplyOutCount: supplyOutItems.length, supplyLowCount: supplyLowItems.length, floorsWithSupplyGap,
    shiftsToday: todayShifts.length, activeNow: activeShifts.length, coveragePct, coverageGaps, ukgConnected, lastUKGSync: ukgCfg?.lastSync,
    riskScore: Math.min(100, risk), riskFactors,
  };
}
