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
  const subscription = user?.['custom:tier'] || user?.['custom:subscription'] || user?.subscription || user?.tier;
  const tier: SubscriptionTier = getTierFromRole(role, subscription);
  const tierConfig = TIERS[tier];
  const orgType: OrgType = getOrgType();

  return {
    tier,
    tierConfig,
    orgType,
    isAdmin: role === 'admin',
    can: (feature: TierFeature) => hasFeature(tier, feature, orgType),
    canAll: (...features: TierFeature[]) => features.every(f => hasFeature(tier, f, orgType)),
    canAny: (...features: TierFeature[]) => features.some(f => hasFeature(tier, f, orgType)),
  };
}
