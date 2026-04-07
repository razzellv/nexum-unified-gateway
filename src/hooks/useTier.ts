import { useAuth } from './useAuth';
import { hasFeature, getTierFromRole, TIERS, type TierFeature, type SubscriptionTier, type OrgType } from '@/config/tiers';

function getOrgType(): OrgType {
  const stored = localStorage.getItem('nexum_org_type') || sessionStorage.getItem('nexum_org_type') || '';
  if (stored === 'retail') return 'retail';
  if (stored === 'government') return 'government';
  return 'facility';
}

export function useTier() {
  const { user } = useAuth();
  const role = user?.role || 'operator';
  const isAdmin = role === 'admin';
  const subscription = user?.['custom:tier'] || user?.['custom:subscription'] || user?.subscription || user?.tier;
  const tier: SubscriptionTier = getTierFromRole(role, subscription);
  const tierConfig = TIERS[tier];
  // Prefer orgType from the decoded user object, fall back to localStorage
  const orgType: OrgType = (user?.orgType as OrgType) || getOrgType();

  return {
    tier,
    tierConfig,
    orgType,
    isAdmin,
    // Admin bypasses all feature gates
    can: (feature: TierFeature) => isAdmin || hasFeature(tier, feature, orgType),
    canAll: (...features: TierFeature[]) => isAdmin || features.every(f => hasFeature(tier, f, orgType)),
    canAny: (...features: TierFeature[]) => isAdmin || features.some(f => hasFeature(tier, f, orgType)),
  };
}
