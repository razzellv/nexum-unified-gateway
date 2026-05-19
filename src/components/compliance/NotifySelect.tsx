import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, ChevronDown, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockEmployees } from '@/data/mockData';
import { ROLES_BY_ORG_TYPE } from '@/config/roles';

export type NotifyRecipient = 'all_leaders' | string; // string = employee id

interface NotifySelectProps {
  value: NotifyRecipient[];
  onChange: (val: NotifyRecipient[]) => void;
  orgType?: string;
  className?: string;
}

// Roles considered leadership for notification purposes
const LEADERSHIP_ROLES = new Set([
  ...ROLES_BY_ORG_TYPE.facility.leadership,
  ...ROLES_BY_ORG_TYPE.retail.leadership,
  ...ROLES_BY_ORG_TYPE.government.leadership,
  'admin',
]);

function isLeader(role: string) {
  return LEADERSHIP_ROLES.has(role.toLowerCase());
}

export function NotifySelect({ value, onChange, orgType, className }: NotifySelectProps) {
  const [open, setOpen] = useState(false);

  // Filter mock employees to leadership only
  const leaders = mockEmployees.filter(e => isLeader(e.role));

  const allLeadersSelected = value.includes('all_leaders');

  const toggle = (id: NotifyRecipient) => {
    if (id === 'all_leaders') {
      // Toggle "All Leaders" — when selected, clear individual picks
      onChange(allLeadersSelected ? [] : ['all_leaders']);
      return;
    }
    if (allLeadersSelected) {
      // Switch from "all" to specific selection: deselect all, select just this one
      onChange([id]);
      return;
    }
    onChange(
      value.includes(id) ? value.filter(v => v !== id) : [...value, id]
    );
  };

  const label = () => {
    if (value.length === 0) return 'No notification';
    if (allLeadersSelected) return 'All Leaders';
    const names = value
      .map(id => mockEmployees.find(e => e.id === id)?.name ?? id)
      .join(', ');
    return names.length > 36 ? names.slice(0, 36) + '…' : names;
  };

  const badgeCount = allLeadersSelected
    ? 'All'
    : value.length > 0
    ? String(value.length)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-between font-normal text-sm bg-background h-9 px-3', className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Bell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate text-left">{label()}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 ml-2">
            {badgeCount && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">
                {badgeCount}
              </Badge>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3 bg-popover border-border" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Send notification to
        </p>

        {/* All Leaders shortcut */}
        <div
          onClick={() => toggle('all_leaders')}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors mb-1',
            allLeadersSelected
              ? 'bg-primary/10 border border-primary/30'
              : 'hover:bg-muted/50 border border-transparent',
          )}
        >
          <Checkbox
            checked={allLeadersSelected}
            onCheckedChange={() => toggle('all_leaders')}
            className="pointer-events-none"
          />
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium leading-none">All Leaders</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Notify every supervisor, manager &amp; above
              </p>
            </div>
          </div>
        </div>

        {leaders.length > 0 && (
          <>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or specific person</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
              {leaders.map(emp => {
                const checked = !allLeadersSelected && value.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                      checked
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/40 border border-transparent',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(emp.id)}
                      className="pointer-events-none"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{emp.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {emp.role} · {emp.department}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center mt-2 pt-2 border-t border-border/30"
          >
            Clear — no notification
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
