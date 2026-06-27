import { useMemo } from 'react';

export interface SupplyAlert {
  id: string;
  itemName: string;
  location: string;       // floor label + building, or 'General Inventory'
  currentQty: number;
  minQty: number;
  unit: string;
  severity: 'critical' | 'low';  // critical = qty 0 or condition depleted; low = qty < minQty
  category?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getFacilityIdFromToken(): string {
  try {
    const token = localStorage.getItem('nexum_access_token');
    if (!token) return 'facility-001';
    const parts = token.split('.');
    if (parts.length < 2) return 'facility-001';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (
      payload['custom:facilityId'] ||
      payload['facilityId'] ||
      payload['custom:orgId'] ||
      'facility-001'
    );
  } catch {
    return 'facility-001';
  }
}

function getNameMinimum(name: string, category: string | undefined, supplyMins: Record<string, number>): number {
  // 1. Check category-specific override
  if (category && supplyMins[category] !== undefined) {
    return supplyMins[category];
  }
  // 2. Name-based heuristic
  if (/light|lamp|bulb|tube/i.test(name)) return 50;
  return 5;
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useSupplyAlerts(tick?: number): SupplyAlert[] {
  return useMemo(() => {
    const alerts: SupplyAlert[] = [];
    const seen = new Set<string>();

    const supplyMins: Record<string, number> = readLocalJSON<Record<string, number>>(
      'nexum_supply_minimums',
      {}
    );

    // ── 1. Floor assignment supplies ─────────────────────────────────────────
    interface FloorSupplyItem {
      itemId?: string;
      name?: string;
      quantity?: number;
      minQuantity?: number;
      unit?: string;
      condition?: string;
    }
    interface FloorAssignment {
      floorLabel?: string;
      building?: string;
      floor?: string;
      name?: string;
      supplies?: FloorSupplyItem[];
    }

    const floorAssignments = readLocalJSON<FloorAssignment[]>('nexum_floor_assignments', []);

    if (Array.isArray(floorAssignments)) {
      for (const fa of floorAssignments) {
        const locationLabel =
          [fa.floorLabel || fa.floor || fa.name, fa.building]
            .filter(Boolean)
            .join(' — ') || 'General Inventory';

        const supplies = Array.isArray(fa.supplies) ? fa.supplies : [];
        for (const supply of supplies) {
          const name = supply.name || supply.itemId || 'Unknown Item';
          const qty = Number(supply.quantity ?? 0);
          const minQty = Number(supply.minQuantity ?? 0);
          const unit = supply.unit || 'units';
          const isDepleted = supply.condition === 'depleted';
          const isLow = minQty > 0 && qty < minQty;

          if (!isDepleted && !isLow) continue;

          const severity: 'critical' | 'low' = isDepleted || qty === 0 ? 'critical' : 'low';
          const dedupeKey = `${name}|${locationLabel}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          alerts.push({
            id: `floor-${supply.itemId || name}-${locationLabel}`,
            itemName: name,
            location: locationLabel,
            currentQty: qty,
            minQty,
            unit,
            severity,
          });
        }
      }
    }

    // ── 2. General inventory ─────────────────────────────────────────────────
    const facilityId = getFacilityIdFromToken();
    const invKey = `nexum_inventory_${facilityId}`;

    interface InventoryItem {
      itemId?: string;
      id?: string;
      name?: string;
      itemName?: string;
      quantity?: number;
      qty?: number;
      minQuantity?: number;
      minQty?: number;
      unit?: string;
      category?: string;
      location?: string;
    }

    const inventory = readLocalJSON<InventoryItem[]>(invKey, []);

    if (Array.isArray(inventory)) {
      for (const item of inventory) {
        const name = item.name || item.itemName || item.itemId || item.id || 'Unknown Item';
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const minQty = item.minQuantity ?? item.minQty ?? getNameMinimum(name, item.category, supplyMins);
        const unit = item.unit || 'units';
        const location = item.location || 'General Inventory';
        const category = item.category;

        if (qty >= minQty) continue;

        const severity: 'critical' | 'low' = qty === 0 ? 'critical' : 'low';
        const dedupeKey = `${name}|${location}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        alerts.push({
          id: `inv-${item.itemId || item.id || name}-${location}`,
          itemName: name,
          location,
          currentQty: qty,
          minQty,
          unit,
          severity,
          category,
        });
      }
    }

    // ── 3. Sort: critical first, then low ────────────────────────────────────
    alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      return a.itemName.localeCompare(b.itemName);
    });

    return alerts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}
