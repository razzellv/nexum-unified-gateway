import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, MapPin, CalendarDays, AlignLeft, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddEventDialog } from '@/components/command-hub/dialogs/AddEventDialog';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CalEvent {
  day: number; month: number; year: number;
  title: string; type: string; priority: string;
  location?: string; assignedTo?: string; id?: string;
}

interface GanttTask {
  id: string; title: string;
  startDate: Date; endDate: Date;
  priority: string; type: string;
  assignedTo: string; system: string; status: string;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
};

const barColors: Record<string, string> = {
  critical: 'bg-red-500/80 border-red-400 text-red-100',
  high:     'bg-orange-500/80 border-orange-400 text-orange-100',
  medium:   'bg-blue-500/80 border-blue-400 text-blue-100',
  low:      'bg-green-500/80 border-green-400 text-green-100',
};

const DAYS = 28;

// ── Gantt sub-component ───────────────────────────────────────────────────────
function GanttView({ tasks, loading }: { tasks: GanttTask[]; loading: boolean }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const [windowStart, setWindowStart] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay()); // start of current week (Sunday)
    return d;
  });
  const [groupBy, setGroupBy] = useState<'none' | 'system' | 'assignee'>('none');

  const days = useMemo(() =>
    Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [windowStart]);

  const windowEnd = days[DAYS - 1];

  function snapToday() {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    setWindowStart(d);
  }
  function shiftWeek(n: number) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + n * 7);
    setWindowStart(d);
  }

  // Bar position helpers
  function dayIdx(d: Date) {
    return Math.round((d.getTime() - windowStart.getTime()) / 86400000);
  }
  function barCols(task: GanttTask): string {
    const start = Math.max(0, dayIdx(task.startDate));
    const end   = Math.min(DAYS - 1, dayIdx(task.endDate));
    const cs = start + 1;
    const ce = Math.max(cs + 1, end + 2);
    return `${cs} / ${ce}`;
  }

  // Today line position (as % of total width)
  const todayPct = useMemo(() => {
    const idx = dayIdx(today);
    if (idx < 0 || idx >= DAYS) return null;
    return `${((idx + 0.5) / DAYS) * 100}%`;
  }, [days, today]);

  // Filter tasks visible in window
  const visible = useMemo(() =>
    tasks.filter(t => t.startDate <= windowEnd && t.endDate >= windowStart),
    [tasks, windowStart, windowEnd]);

  // Conflict detection: same assignee + same day + critical
  const conflictPeople = useMemo(() => {
    const byPerson: Record<string, GanttTask[]> = {};
    visible.forEach(t => {
      if (!t.assignedTo || t.assignedTo === 'Unassigned') return;
      (byPerson[t.assignedTo] = byPerson[t.assignedTo] || []).push(t);
    });
    const conflicts = new Set<string>();
    Object.entries(byPerson).forEach(([person, pts]) => {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          if (a.startDate <= b.endDate && b.startDate <= a.endDate &&
              (a.priority === 'critical' || b.priority === 'critical')) {
            conflicts.add(person);
          }
        }
      }
    });
    return conflicts;
  }, [visible]);

  // Groups
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ label: '', tasks: visible }];
    const map: Record<string, GanttTask[]> = {};
    visible.forEach(t => {
      const key = groupBy === 'system'
        ? (t.system || 'Other')
        : (t.assignedTo || 'Unassigned');
      (map[key] = map[key] || []).push(t);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, tasks]) => ({ label, tasks }));
  }, [visible, groupBy]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const rangeLabel = `${windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">{rangeLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftWeek(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={snapToday}>Today</Button>
        </div>

        <div className="flex items-center gap-1 ml-auto flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Group:</span>
          {(['none', 'system', 'assignee'] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={cn('text-xs px-2.5 py-1 rounded border transition-all',
                groupBy === g
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border')}>
              {g === 'none' ? 'Flat' : g === 'system' ? 'System' : 'Assignee'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {(['critical','high','medium','low'] as const).map(p => (
            <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
              <span className={cn('w-3 h-3 rounded border', barColors[p])} />{p}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 ml-auto">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-6 h-3 rounded border border-dashed border-red-400 opacity-60" />Overdue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-px h-3 bg-primary" />Today
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3 text-red-400" />Conflict
          </span>
        </div>
      </div>

      {/* Conflict alerts */}
      {conflictPeople.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...conflictPeople].map(person => (
            <div key={person} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-medium">{person}</span> has overlapping critical tasks
            </div>
          ))}
        </div>
      )}

      {/* Gantt grid */}
      <div className="glass-panel rounded-xl overflow-hidden border border-border/30">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${DAYS * 38 + 220}px` }}>

            {/* Day header */}
            <div className="flex border-b border-border/40 bg-muted/20">
              <div className="w-[220px] shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border/20">
                Task
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
                {days.map((d, i) => {
                  const isTod  = d.toDateString() === today.toDateString();
                  const isMon  = d.getDay() === 1;
                  const isSun  = d.getDay() === 0;
                  return (
                    <div key={i} className={cn(
                      'py-1.5 text-center border-r border-border/10 last:border-0',
                      isMon  && 'border-l border-border/30',
                      isSun  && 'bg-muted/10',
                      isTod  && 'bg-primary/10'
                    )}>
                      <div className="text-[9px] font-medium text-muted-foreground/70">
                        {['S','M','T','W','T','F','S'][d.getDay()]}
                      </div>
                      <div className={cn(
                        'text-[10px]',
                        isTod ? 'text-primary font-bold' : 'text-muted-foreground/60'
                      )}>
                        {d.getDate()}
                      </div>
                      {isMon && (
                        <div className="text-[8px] text-muted-foreground/40 truncate px-0.5">
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task rows */}
            {groups.map((group, gi) => (
              <div key={gi}>
                {/* Swim lane header */}
                {group.label && (
                  <div className="flex bg-muted/30 border-b border-border/30">
                    <div className="w-[220px] shrink-0 px-3 py-1.5 border-r border-border/20 flex items-center gap-2">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground/80">{group.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{group.tasks.length}</span>
                    </div>
                    <div className="flex-1 relative">
                      {todayPct && (
                        <div className="absolute top-0 bottom-0 w-px bg-primary/30 z-10 pointer-events-none" style={{ left: todayPct }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {group.tasks.length === 0 && (
                  <div className="flex border-b border-border/10">
                    <div className="w-[220px] shrink-0 px-3 py-3 text-xs text-muted-foreground/50 border-r border-border/20 italic">
                      No tasks in window
                    </div>
                    <div className="flex-1 bg-muted/5" />
                  </div>
                )}

                {group.tasks.map((task, ti) => {
                  const isOverdue   = task.endDate < today && task.status !== 'completed';
                  const isCompleted = task.status === 'completed' || task.status === 'done' || task.status === 'closed';
                  const isInProg    = task.status === 'in-progress' || task.status === 'in_progress' || task.status === 'active';
                  const hasConflict = conflictPeople.has(task.assignedTo);

                  return (
                    <div key={`${gi}-${ti}`} className={cn(
                      'flex border-b border-border/10 hover:bg-muted/10 transition-colors group',
                      hasConflict && task.priority === 'critical' && 'bg-red-500/5'
                    )}>
                      {/* Label column */}
                      <div className="w-[220px] shrink-0 px-3 py-2 border-r border-border/20">
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors leading-snug">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {isCompleted && <span className="text-[9px] text-green-400 font-medium">✓ Done</span>}
                          {isOverdue   && <span className="text-[9px] text-red-400 font-medium">Overdue</span>}
                          {isInProg    && !isOverdue && <span className="text-[9px] text-blue-400 font-medium">In Progress</span>}
                          {task.assignedTo && groupBy !== 'assignee' && (
                            <span className="text-[9px] text-muted-foreground truncate">{task.assignedTo}</span>
                          )}
                          {task.system && groupBy !== 'system' && (
                            <span className="text-[9px] text-muted-foreground/60">{task.system}</span>
                          )}
                        </div>
                      </div>

                      {/* Bar track */}
                      <div className="flex-1 relative py-2 px-0" style={{ minHeight: '40px' }}>
                        {/* Today vertical line */}
                        {todayPct && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-primary/50 z-10 pointer-events-none"
                            style={{ left: todayPct }}
                          />
                        )}

                        {/* Grid columns (background grid) */}
                        <div
                          className="absolute inset-0 grid pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
                        >
                          {days.map((d, di) => (
                            <div key={di} className={cn(
                              'border-r border-border/10 last:border-0 h-full',
                              d.getDay() === 0 && 'bg-muted/10',
                              d.toDateString() === today.toDateString() && 'bg-primary/5'
                            )} />
                          ))}
                        </div>

                        {/* Task bar */}
                        <div
                          className="relative z-20 grid h-full"
                          style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
                        >
                          <div
                            className={cn(
                              'self-center h-6 rounded border text-[10px] flex items-center px-1.5 truncate cursor-default transition-all',
                              barColors[task.priority] || barColors.medium,
                              isCompleted && 'opacity-35',
                              isOverdue   && 'border-dashed opacity-70',
                              isInProg    && 'ring-1 ring-offset-1 ring-offset-transparent ring-primary/30',
                              hasConflict && task.priority === 'critical' && 'ring-1 ring-red-400/60'
                            )}
                            style={{ gridColumn: barCols(task) }}
                            title={`${task.title}\n${task.startDate.toLocaleDateString()} → ${task.endDate.toLocaleDateString()}\nAssigned: ${task.assignedTo || 'Unassigned'} · ${task.priority} priority · ${task.status}`}
                          >
                            <span className="truncate leading-none">{task.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Empty overall state */}
            {tasks.length === 0 && !loading && (
              <div className="flex">
                <div className="w-[220px] shrink-0 px-3 py-8 text-xs text-muted-foreground border-r border-border/20 italic">
                  No work orders found
                </div>
                <div className="flex-1 py-8 text-center text-sm text-muted-foreground">
                  Add work orders with due dates to populate the Gantt chart.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary footer */}
      {visible.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{visible.length} tasks in view</span>
          <span className="text-red-400">{visible.filter(t => t.endDate < today && t.status !== 'completed').length} overdue</span>
          <span className="text-blue-400">{visible.filter(t => t.status === 'in-progress' || t.status === 'in_progress' || t.status === 'active').length} in progress</span>
          <span className="text-green-400">{visible.filter(t => t.status === 'completed' || t.status === 'done' || t.status === 'closed').length} completed</span>
          {conflictPeople.size > 0 && <span className="text-red-400 font-medium">{conflictPeople.size} scheduling conflict{conflictPeople.size > 1 ? 's' : ''}</span>}
        </div>
      )}
    </div>
  );
}

// ── Main Calendar component ───────────────────────────────────────────────────
const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddEvent, setShowAddEvent]  = useState(false);
  const [activeView, setActiveView]      = useState<'month' | 'gantt'>('month');
  const [currentDate, setCurrentDate]    = useState(new Date());
  const [events, setEvents]              = useState<CalEvent[]>([]);
  const [ganttTasks, setGanttTasks]      = useState<GanttTask[]>([]);
  const [loading, setLoading]            = useState(true);

  const today = new Date();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token   = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${baseUrl}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const wos  = data.workOrders || data.items || [];

      // Month view events
      const mapped: CalEvent[] = wos
        .filter((wo: any) => wo.dueDate || wo.scheduledDate || wo.createdAt)
        .map((wo: any) => {
          const dateStr = wo.dueDate || wo.scheduledDate || wo.createdAt;
          const d = new Date(dateStr);
          return {
            id:         wo.workOrderId || wo.id,
            day:        d.getDate(),
            month:      d.getMonth(),
            year:       d.getFullYear(),
            title:      wo.title || wo.description || 'Work Order',
            type:       wo.type === 'PM' ? 'maintenance' : wo.category || 'maintenance',
            priority:   wo.priority?.toLowerCase() || 'medium',
            location:   wo.location || wo.buildingId || '',
            assignedTo: wo.assignedTo || '',
          };
        });
      setEvents(mapped);

      // Gantt tasks — need start + end dates
      const gantt: GanttTask[] = wos.map((wo: any) => {
        const startRaw = wo.createdAt || wo.startDate || wo.scheduledDate || new Date().toISOString();
        const endRaw   = wo.dueDate   || wo.scheduledDate || startRaw;
        const start    = new Date(startRaw);
        const end      = new Date(endRaw);
        // Ensure end >= start
        if (end < start) end.setTime(start.getTime() + 86400000);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return {
          id:         wo.workOrderId || wo.id || String(Math.random()),
          title:      wo.title || wo.description || 'Work Order',
          startDate:  start,
          endDate:    end,
          priority:   wo.priority?.toLowerCase() || 'medium',
          type:       wo.category || wo.type || 'general',
          assignedTo: typeof wo.assignedTo === 'object' ? (wo.assignedTo?.name || '') : (wo.assignedTo || ''),
          system:     wo.systemType || wo.equipmentType || 'General',
          status:     wo.status || 'backlog',
        };
      });
      setGanttTasks(gantt);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Month view helpers
  const daysInMonth    = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) =>
    events.filter(e =>
      e.day   === day &&
      e.month === currentDate.getMonth() &&
      e.year  === currentDate.getFullYear()
    );

  const upcomingEvents = events
    .filter(e =>
      e.year  > today.getFullYear() ||
      (e.year === today.getFullYear() && e.month > today.getMonth()) ||
      (e.year === today.getFullYear() && e.month === today.getMonth() && e.day >= today.getDate())
    )
    .sort((a, b) => new Date(a.year, a.month, a.day).getTime() - new Date(b.year, b.month, b.day).getTime())
    .slice(0, 6);

  const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">PM & Work Order Calendar</h1>
            <p className="text-sm text-muted-foreground">{events.length} scheduled events</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border/40 overflow-hidden">
              <button
                onClick={() => setActiveView('month')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all',
                  activeView === 'month'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />Month
              </button>
              <button
                onClick={() => setActiveView('gantt')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all border-l border-border/40',
                  activeView === 'gantt'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                )}
              >
                <AlignLeft className="w-3.5 h-3.5" />Gantt
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddEvent(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Event
            </Button>
          </div>
        </div>

        {/* ── Month View ───────────────────────────────────────────────────── */}
        {activeView === 'month' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Calendar grid */}
            <div className="lg:col-span-2 glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-semibold">{currentMonthLabel}</h2>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dayEvents = getEventsForDay(day);
                  const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                  return (
                    <div key={i} className={cn(
                      'min-h-[60px] p-1 rounded-lg border border-transparent transition-colors cursor-pointer hover:border-primary/30 hover:bg-muted/30',
                      isToday && 'border-primary/50 bg-primary/5'
                    )}>
                      <p className={cn('text-xs font-medium mb-1', isToday && 'text-primary')}>{day}</p>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev, j) => (
                          <div key={j} className={cn('text-[10px] px-1 py-0.5 rounded truncate border', priorityColors[ev.priority] || priorityColors.medium)}>
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming sidebar */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Upcoming Events</h3>
              {loading ? (
                <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming events</p>
              ) : upcomingEvents.map((ev, i) => (
                <Card key={i} className="glass-panel">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.year, ev.month, ev.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {ev.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{ev.location}
                          </p>
                        )}
                        {ev.assignedTo && <p className="text-xs text-muted-foreground mt-0.5">→ {ev.assignedTo}</p>}
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0', priorityColors[ev.priority] || priorityColors.medium)}>
                        {ev.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Gantt View ───────────────────────────────────────────────────── */}
        {activeView === 'gantt' && (
          <GanttView tasks={ganttTasks} loading={loading} />
        )}
      </div>

      {showAddEvent && (
        <AddEventDialog
          open={showAddEvent}
          onOpenChange={(o) => { if (!o) { setShowAddEvent(false); fetchEvents(); } }}
        />
      )}
    </MainLayout>
  );
};

export default Calendar;
