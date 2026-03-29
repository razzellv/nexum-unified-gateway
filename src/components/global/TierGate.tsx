import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTier } from '@/hooks/useTier';
import { FEATURE_TIER, TIER_NAMES, TIER_COLORS, type TierFeature } from '@/config/tiers';
import { cn } from '@/lib/utils';

interface TierGateProps {
  feature: TierFeature;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'blur' | 'overlay';
}

export function TierGate({ feature, children, fallback, mode = 'overlay' }: TierGateProps) {
  const { can, isAdmin } = useTier();
  const navigate = useNavigate();

  if (isAdmin || can(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const requiredTier = FEATURE_TIER[feature];
  const tierColor = TIER_COLORS[requiredTier];

  if (mode === 'hide') return null;

  const UpgradePrompt = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-xl border border-border/30 bg-card/30">
      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">Upgrade Required</p>
        <p className="text-sm text-muted-foreground mt-1">
          This feature is available on the{' '}
          <span className={cn('font-bold', tierColor.split(' ')[0])}>
            {TIER_NAMES[requiredTier]}
          </span>{' '}
          plan and above.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/settings/billing')}>
          View Plans
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate('/settings/billing')}>
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Upgrade to {TIER_NAMES[requiredTier]}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );

  if (mode === 'blur') return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <UpgradePrompt />
      </div>
    </div>
  );

  return <UpgradePrompt />;
}

// Inline lock badge for nav items
export function TierBadge({ feature }: { feature: TierFeature }) {
  const { can, isAdmin } = useTier();
  if (isAdmin || can(feature)) return null;
  const requiredTier = FEATURE_TIER[feature];
  const color = TIER_COLORS[requiredTier];
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium ml-auto', color)}>
      {TIER_NAMES[requiredTier]}
    </span>
  );
}
