import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddEventDialog } from '@/components/command-hub/dialogs/AddEventDialog';
import { toast } from '@/hooks/use-toast';

const Calendar = () => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const events = [
    { day: 10, title: 'Chiller PM', type: 'maintenance', priority: 'high' },
    { day: 12, title: 'Vendor Meeting', type: 'meeting', priority: 'medium' },
    { day: 15, title: 'Boiler Inspection', type: 'maintenance', priority: 'critical' },
    { day: 18, title: 'Thermal Scan', type: 'inspection', priority: 'medium' },
    { day: 20, title: 'AHU Belt Replace', type: 'maintenance', priority: 'low' },
    { day: today.getDate(), title: 'Emergency Drill', type: 'emergency', priority: 'high' }
  ];

  const getEventsForDay = (day: number) => events.filter(e => e.day === day);
  const upcomingEvents = events.filter(e => e.day >= today.getDate()).slice(0, 5);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground">Schedule and upcoming events</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-medium min-w-[120px] md:min-w-[150px] text-center text-sm md:text-base">{currentMonth}</span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" onClick={() => setShowAddEvent(true)}><Plus className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Add Event</span></Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 glass-panel p-3 md:p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                return (
                  <div key={index} className={cn("min-h-[60px] md:min-h-[100px] p-1 md:p-2 rounded-lg border transition-colors", day ? "border-border/50 hover:border-primary/50 cursor-pointer" : "border-transparent", isToday && "bg-primary/10 border-primary/50")}>
                    {day && (
                      <>
                        <span className={cn("text-xs md:text-sm font-medium", isToday && "text-primary")}>{day}</span>
                        <div className="mt-1 space-y-1 hidden md:block">
                          {dayEvents.slice(0, 2).map((event, i) => (
                            <div key={i} className={cn("text-xs p-1 rounded truncate", event.priority === 'critical' && "bg-critical/20 text-critical", event.priority === 'high' && "bg-warning/20 text-warning", event.priority === 'medium' && "bg-primary/20 text-primary", event.priority === 'low' && "bg-muted text-muted-foreground")}>{event.title}</div>
                          ))}
                          {dayEvents.length > 2 && <span className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</span>}
                        </div>
                        {dayEvents.length > 0 && <div className="flex gap-0.5 mt-1 md:hidden">{dayEvents.slice(0, 3).map((e, i) => <div key={i} className={cn("w-1.5 h-1.5 rounded-full", e.priority === 'critical' && "bg-critical", e.priority === 'high' && "bg-warning", e.priority === 'medium' && "bg-primary")} />)}</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="glass-panel p-4">
              <h3 className="font-semibold mb-3">Today</h3>
              <div className="text-center py-3 md:py-4">
                <p className="text-3xl md:text-4xl font-bold text-primary">{today.getDate()}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{today.toLocaleDateString('default', { weekday: 'long' })}</p>
              </div>
            </div>
            <div className="glass-panel p-4">
              <h3 className="font-semibold mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn("w-2 h-2 mt-2 rounded-full shrink-0", event.priority === 'critical' && "bg-critical", event.priority === 'high' && "bg-warning", event.priority === 'medium' && "bg-primary", event.priority === 'low' && "bg-muted-foreground")} />
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{event.title}</p><p className="text-xs text-muted-foreground">{currentMonth.split(' ')[0]} {event.day}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AddEventDialog open={showAddEvent} onOpenChange={setShowAddEvent} />
    </MainLayout>
  );
};

export default Calendar;
