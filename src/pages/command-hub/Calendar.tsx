import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddEventDialog } from '@/components/command-hub/dialogs/AddEventDialog';
import { useToast } from '@/hooks/use-toast';

interface CalEvent {
  day: number;
  month: number;
  year: number;
  title: string;
  type: string;
  priority: string;
  location?: string;
  assignedTo?: string;
  id?: string;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
};

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${baseUrl}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const wos = data.workOrders || data.items || [];

      const mapped: CalEvent[] = wos
        .filter((wo: any) => wo.dueDate || wo.scheduledDate || wo.createdAt)
        .map((wo: any) => {
          const dateStr = wo.dueDate || wo.scheduledDate || wo.createdAt;
          const d = new Date(dateStr);
          return {
            id: wo.workOrderId || wo.id,
            day: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            title: wo.title || wo.description || 'Work Order',
            type: wo.type === 'PM' ? 'maintenance' : wo.category || 'maintenance',
            priority: wo.priority?.toLowerCase() || 'medium',
            location: wo.location || wo.buildingId || '',
            assignedTo: wo.assignedTo || '',
          };
        });

      setEvents(mapped);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) =>
    events.filter(e =>
      e.day === day &&
      e.month === currentDate.getMonth() &&
      e.year === currentDate.getFullYear()
    );

  const upcomingEvents = events
    .filter(e =>
      e.year > today.getFullYear() ||
      (e.year === today.getFullYear() && e.month > today.getMonth()) ||
      (e.year === today.getFullYear() && e.month === today.getMonth() && e.day >= today.getDate())
    )
    .sort((a, b) => new Date(a.year, a.month, a.day).getTime() - new Date(b.year, b.month, b.day).getTime())
    .slice(0, 6);

  const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">PM & Work Order Calendar</h1>
            <p className="text-sm text-muted-foreground">{events.length} scheduled events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddEvent(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Event
            </Button>
          </div>
        </div>

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

          {/* Upcoming events */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Upcoming Events</h3>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming events</p>
            ) : (
              upcomingEvents.map((ev, i) => (
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
                        {ev.assignedTo && (
                          <p className="text-xs text-muted-foreground mt-0.5">→ {ev.assignedTo}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0', priorityColors[ev.priority] || priorityColors.medium)}>
                        {ev.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
      {showAddEvent && <AddEventDialog open={showAddEvent} onClose={() => { setShowAddEvent(false); fetchEvents(); }} />}
    </MainLayout>
  );
};

export default Calendar;
