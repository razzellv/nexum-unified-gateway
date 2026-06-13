import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Trash2, Zap } from 'lucide-react';
import { useTier } from '@/hooks/useTier';

const TRIAL_DAYS = 7;
const GRACE_DAYS = 30;

function getTrialStatus(): {
  phase: 'active' | 'grace' | 'expired' | 'none';
  daysLeft: number;
  daysIn: number;
} {
  const start = localStorage.getItem('nexum_trial_start');
  if (!start) return { phase: 'none', daysLeft: 0, daysIn: 0 };
  const daysIn = Math.floor((Date.now() - new Date(start).getTime()) / 86_400_000);
  if (daysIn < TRIAL_DAYS)  return { phase: 'active', daysLeft: TRIAL_DAYS - daysIn, daysIn };
  if (daysIn < TRIAL_DAYS + GRACE_DAYS) return { phase: 'grace', daysLeft: TRIAL_DAYS + GRACE_DAYS - daysIn, daysIn };
  return { phase: 'expired', daysLeft: 0, daysIn };
}

export function TrialBanner() {
  const navigate = useNavigate();
  const { tier, isAdmin } = useTier();

  if (isAdmin || tier !== 'trial') return null;

  const { phase, daysLeft } = getTrialStatus();
  if (phase === 'none') return null;

  const configs = {
    active: {
      bg:   'bg-blue-950/60 border-blue-500/40',
      icon: <Clock className="w-4 h-4 text-blue-400 shrink-0" />,
      text: <><span className="font-semibold text-blue-300">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span> in your free trial.</>,
      cta:  'Upgrade Now',
      ctaCls: 'bg-blue-600 hover:bg-blue-500',
    },
    grace: {
      bg:   'bg-amber-950/60 border-amber-500/40',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      text: <><span className="font-semibold text-amber-300">Trial expired.</span> Your data is saved for <span className="font-semibold text-amber-300">{daysLeft} more day{daysLeft !== 1 ? 's' : ''}</span>. Upgrade to keep access.</>,
      cta:  'Upgrade & Keep Data',
      ctaCls: 'bg-amber-600 hover:bg-amber-500',
    },
    expired: {
      bg:   'bg-red-950/60 border-red-500/40',
      icon: <Trash2 className="w-4 h-4 text-red-400 shrink-0" />,
      text: <><span className="font-semibold text-red-300">Account scheduled for deletion.</span> Upgrade immediately to save your data.</>,
      cta:  'Upgrade Now',
      ctaCls: 'bg-red-600 hover:bg-red-500',
    },
  } as const;

  const cfg = configs[phase];

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-sm ${cfg.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        {cfg.icon}
        <span className="text-muted-foreground truncate">{cfg.text}</span>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className={`flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-md text-white text-xs font-semibold transition-colors ${cfg.ctaCls}`}
      >
        <Zap className="w-3 h-3" />
        {cfg.cta}
      </button>
    </div>
  );
}
