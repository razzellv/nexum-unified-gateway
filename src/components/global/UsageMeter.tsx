import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTier, fetchUsageCounts } from '@/hooks/useTier';
import { useAuth } from '@/hooks/useAuth';

// ── Inline usage bar (use inside pages next to headings) ──────────────────────

interface UsageBarProps {
  label: string;
  current: number;
  max: number | 'unlimited';
  className?: string;
}

export function UsageBar({ label, current, max, className }: UsageBarProps) {
  if (max === 'unlimited') return null;
  const pct     = Math.min((current / (max as number)) * 100, 100);
  const blocked = current >= (max as number);
  const warning = pct >= 90;
  const color   = blocked ? 'bg-red-500' : warning ? 'bg-yellow-500' : 'bg-primary';

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className="shrink-0">{label}</span>
      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('tabular-nums', blocked && 'text-red-500 font-semibold', warning && 'text-yellow-500 font-semibold')}>
        {current} / {max}
      </span>
    </div>
  );
}

// ── Full usage summary card (use in Settings) ────────────────────────────────

export function UsageSummaryCard() {
  const { user } = useAuth();
  const { tier, tierConfig, limits, checkLimit, isAdmin } = useTier();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ equipment: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fid = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
    fetchUsageCounts(fid).then(c => { setCounts(c); setLoading(false); });
  }, [user]);

  if (isAdmin) return null;

  const eqStatus   = checkLimit('maxEquipment', counts.equipment);
  const userStatus = checkLimit('maxUsers', counts.users);
  const anyWarning = eqStatus !== 'ok' || userStatus !== 'ok';

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', anyWarning ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border/40')}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Plan Usage</p>
        <span className="text-xs text-muted-foreground capitalize">{tierConfig?.name ?? tier} Plan</span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading usage…</p>
      ) : (
        <div className="space-y-2">
          <UsageRow label="Equipment Assets" current={counts.equipment} max={limits.maxEquipment} status={eqStatus} />
          <UsageRow label="Staff / Users"    current={counts.users}     max={limits.maxUsers}     status={userStatus} />
          <UsageRow label="Facilities"       current={1}                max={limits.maxFacilities} status="ok" />
        </div>
      )}

      {anyWarning && (
        <button
          onClick={() => navigate('/pricing')}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <TrendingUp className="w-3 h-3" /> Upgrade Plan
        </button>
      )}
    </div>
  );
}

function UsageRow({ label, current, max, status }: { label: string; current: number; max: number | 'unlimited'; status: 'ok' | 'warning' | 'blocked' }) {
  if (max === 'unlimited') {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-green-500 font-medium">{current} / Unlimited</span>
      </div>
    );
  }
  const pct   = Math.min((current / (max as number)) * 100, 100);
  const color = status === 'blocked' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-primary';
  const textColor = status === 'blocked' ? 'text-red-500' : status === 'warning' ? 'text-yellow-500' : 'text-muted-foreground';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', textColor)}>{current} / {max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Limit-reached toast/banner (shown when API returns 403 LIMIT_REACHED) ────

interface LimitBannerProps {
  type: 'equipment' | 'users';
  current: number;
  limit: number;
  tier: string;
  onDismiss: () => void;
}

export function LimitBanner({ type, current, limit, tier, onDismiss }: LimitBannerProps) {
  const navigate = useNavigate();
  const label = type === 'equipment' ? 'equipment assets' : 'staff members';
  const nextTierMsg = tier === 'basic' ? 'Standard' : tier === 'standard' ? 'Business' : 'Premium';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-background border border-red-500/40 rounded-xl shadow-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Plan Limit Reached</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You've hit your {label} limit ({current}/{limit}) on the {tier} plan.
              Upgrade to {nextTierMsg} to add more.
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/pricing')}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          View Upgrade Options
        </button>
        <button onClick={onDismiss} className="py-2 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Hook: detect 403 LIMIT_REACHED from any API response ─────────────────────

export function parseLimitError(response: { error?: string; code?: string; current?: number; limit?: number; tier?: string } | null) {
  if (!response || response.error !== 'LIMIT_REACHED') return null;
  return {
    type: response.code === 'equipment_limit' ? 'equipment' as const : 'users' as const,
    current: response.current ?? 0,
    limit:   response.limit   ?? 0,
    tier:    response.tier    ?? 'basic',
  };
}
