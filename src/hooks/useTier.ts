import { useAuth } from './useAuth';
import { hasFeature, getTierFromRole, TIERS, type TierFeature, type SubscriptionTier, type OrgType } from '@/config/tiers';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

function getOrgType(): OrgType {
  const stored = localStorage.getItem('nexum_org_type') || sessionStorage.getItem('nexum_org_type') || '';
  if (stored === 'retail') return 'retail';
  if (stored === 'government') return 'government';
  return 'facility';
}

export interface TierLimits {
  maxUsers: number | 'unlimited';
  maxEquipment: number | 'unlimited';
  maxFacilities: number | 'unlimited';
}

export function useTier() {
  const { user } = useAuth();
  const role = user?.role || 'operator';
  const isAdmin = role === 'admin';
  const subscription = user?.['custom:tier'] || user?.['custom:subscription'] || user?.subscription || user?.tier;
  const tier: SubscriptionTier = getTierFromRole(role, subscription);
  const tierConfig = TIERS[tier];
  const orgType: OrgType = (user?.orgType as OrgType) || getOrgType();

  const limits: TierLimits = isAdmin
    ? { maxUsers: 'unlimited', maxEquipment: 'unlimited', maxFacilities: 'unlimited' }
    : {
        maxUsers:      tierConfig?.maxUsers      ?? 10,
        maxEquipment:  tierConfig?.maxEquipment  ?? 50,
        maxFacilities: tierConfig?.maxFacilities ?? 1,
      };

  // Check if a numeric count is at or near the limit (>= 90% = warning, >= 100% = blocked)
  function checkLimit(type: keyof TierLimits, current: number): 'ok' | 'warning' | 'blocked' {
    if (isAdmin) return 'ok';
    const max = limits[type];
    if (max === 'unlimited') return 'ok';
    if (current >= (max as number)) return 'blocked';
    if (current >= (max as number) * 0.9) return 'warning';
    return 'ok';
  }

  // Format limit for display: "10" or "Unlimited"
  function limitLabel(type: keyof TierLimits): string {
    const max = limits[type];
    return max === 'unlimited' ? 'Unlimited' : String(max);
  }

  return {
    tier,
    tierConfig,
    orgType,
    isAdmin,
    limits,
    checkLimit,
    limitLabel,
    can: (feature: TierFeature) => isAdmin || hasFeature(tier, feature, orgType),
    canAll: (...features: TierFeature[]) => isAdmin || features.every(f => hasFeature(tier, f, orgType)),
    canAny: (...features: TierFeature[]) => isAdmin || features.some(f => hasFeature(tier, f, orgType)),
  };
}

// Standalone async helper — call from components to get live counts from API
export async function fetchUsageCounts(facilityId: string): Promise<{ equipment: number; users: number }> {
  const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [eqRes, usersRes] = await Promise.allSettled([
      fetch(`${API_BASE}/equipment?facilityId=${facilityId}&countOnly=true`, { headers }),
      fetch(`${API_BASE}/users?countOnly=true`, { headers }),
    ]);
    const equipment = eqRes.status === 'fulfilled' && eqRes.value.ok
      ? ((await eqRes.value.json()).count ?? 0) : 0;
    const users = usersRes.status === 'fulfilled' && usersRes.value.ok
      ? ((await usersRes.value.json()).count ?? 0) : 0;
    return { equipment, users };
  } catch {
    return { equipment: 0, users: 0 };
  }
}
