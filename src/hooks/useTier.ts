import { useAuth } from './useAuth';
import { hasFeature, getTierFromRole, TIERS, type TierFeature, type SubscriptionTier } from '@/config/tiers';

export function useTier() {
  const { user } = useAuth();
  const role = user?.role || 'operator';
  const subscription = user?.['custom:tier'] || user?.['custom:subscription'] || user?.subscription || user?.tier;
  const tier: SubscriptionTier = getTierFromRole(role, subscription);
  const tierConfig = TIERS[tier];

  return {
    tier,
    tierConfig,
    isAdmin: role === 'admin',
    can: (feature: TierFeature) => hasFeature(tier, feature),
    canAll: (...features: TierFeature[]) => features.every(f => hasFeature(tier, f)),
    canAny: (...features: TierFeature[]) => features.some(f => hasFeature(tier, f)),
  };
}
