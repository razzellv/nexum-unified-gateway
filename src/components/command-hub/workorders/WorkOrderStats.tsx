import { ClipboardList, AlertTriangle, CalendarClock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkOrderStatsProps {
  totalOpen: number;
  urgentEmergency: number;
  dueThisWeek: number;
  overdue: number;
}

export function WorkOrderStats({ totalOpen, urgentEmergency, dueThisWeek, overdue }: WorkOrderStatsProps) {
  const stats = [
    {
      label: 'Total Open',
      value: totalOpen,
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
    {
      label: 'Urgent/Emergency',
      value: urgentEmergency,
      icon: AlertTriangle,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
      borderColor: 'border-critical/30',
      pulse: urgentEmergency > 0,
    },
    {
      label: 'Due This Week',
      value: dueThisWeek,
      icon: CalendarClock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    {
      label: 'Overdue',
      value: overdue,
      icon: AlertCircle,
      color: overdue > 0 ? 'text-critical' : 'text-success',
      bgColor: overdue > 0 ? 'bg-critical/10' : 'bg-success/10',
      borderColor: overdue > 0 ? 'border-critical/30' : 'border-success/30',
      pulse: overdue > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'glass-panel p-4 border transition-all duration-300 hover:scale-[1.02]',
              stat.borderColor
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <Icon className={cn('w-5 h-5', stat.color)} />
              </div>
              {stat.pulse && (
                <span className="relative flex h-3 w-3">
                  <span className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    stat.value > 0 ? 'bg-critical' : 'bg-success'
                  )} />
                  <span className={cn(
                    'relative inline-flex rounded-full h-3 w-3',
                    stat.value > 0 ? 'bg-critical' : 'bg-success'
                  )} />
                </span>
              )}
            </div>
            <div>
              <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
