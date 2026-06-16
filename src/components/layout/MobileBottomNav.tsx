import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Command, BookOpen, AlertTriangle, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',            icon: Home,          label: 'Home' },
  { href: '/command-hub', icon: Command,        label: 'Command' },
  { href: '/observations',icon: BookOpen,       label: 'Journal' },
  { href: '/violations',  icon: AlertTriangle,  label: 'Violations' },
  { href: '/work-orders', icon: ClipboardList,  label: 'Work Orders' },
];

interface MobileBottomNavProps {
  onNavigate?: () => void;
}

export function MobileBottomNav({ onNavigate }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 h-16 bg-card/95 backdrop-blur-md border-t border-border/60 flex items-center safe-area-pb">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = location.pathname === href;
        return (
          <button
            key={href}
            onClick={() => { onNavigate?.(); navigate(href); }}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]')} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
            {active && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
          </button>
        );
      })}
    </nav>
  );
}
