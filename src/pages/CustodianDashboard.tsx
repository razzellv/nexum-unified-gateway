import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, CheckCircle, Clock, BarChart3, Trophy, MapPin, RefreshCw, ClipboardList, Target, Award, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmployeeActivityFeed } from '@/components/employee/EmployeeActivityFeed';

const getGreeting = (user: any) => {
  const name = user?.name || user?.email?.split('@')[0] || 'there';
  const parts = name.split(' ');
  const first = parts[0];
  const lastInitial = parts[1]?.[0] ? `${parts[1][0]}.` : '';
  const empId = `EMP-${(user?.sub || '').slice(-6).toUpperCase()}`;
  return { displayName: `${first} ${lastInitial}`.trim(), empId };
};

const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-32 text-muted-foreground"><p className="text-sm">No activity data for the last 7 days</p></div>;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div className={cn("w-full rounded-t transition-all duration-300", item.count > 0 ? "bg-gradient-to-t from-orange-500 to-orange-500/50" : "bg-muted/20")}
              style={{ height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`, minHeight: '4px' }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-orange-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AreaCoverage = () => {
  const areas = [
    { name: 'Building A - Floors 1-3', tasks: 12, completed: 10 },
    { name: 'Building A - Floors 4-6', tasks: 8, completed: 8 },
    { name: 'Mechanical Rooms', tasks: 5, completed: 4 },
    { name: 'Common Areas', tasks: 15, completed: 12 },
  ];
  return (
    <div className="space-y-4">
      {areas.map((area, i) => {
        const percentage = (area.completed / area.tasks) * 100;
        return (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /><span className="text-sm font-medium">{area.name}</span></div>
              <span className="text-sm text-muted-foreground">{area.completed}/{area.tasks} tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={percentage} className="flex-1" />
              <span className="text-sm font-semibold text-orange-500">{Math.round(percentage)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function CustodianDashboard() {
  const { user } = useAuth();
  const { displayName, empId } = getGreeting(user);
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const floorAssignments: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('nexum_floor_assignments') || '[]'); } catch { return []; }
  })();
  const inventoryItems: any[] = (() => {
    try {
      const raw = localStorage.getItem(`nexum_inventory_${facilityId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return (Array.isArray(parsed) ? parsed : parsed.items || []).filter((it: any) =>
        ['JANITORIAL','CUSTODIAL','CLEANING','TOILETRIES','PAPER','SANITATION'].some(cat =>
          (it.category||'').toUpperCase().includes(cat) || (it.subcategory||'').toUpperCase().includes(cat)
        ) || (it.name||'').toLowerCase().match(/mop|broom|bucket|plunger|toilet|soap|paper|towel|sponge|cleaner|disinfect|trash|bag|glove|spray/)
      );
    } catch { return []; }
  })();
  const tasksToday = 12;
  const tasksCompleted = 8;
  const areasAssigned = 6;
  const cleanlinessScore = 96;
  const activityData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count: Math.floor(Math.random() * 6) + 4
  }));
  const completionRate = Math.round((tasksCompleted / tasksToday) * 100);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <Sparkles className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hello, {displayName}</p>
              <h1 className="text-3xl font-bold">Custodian Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">{empId}</Badge>
                <Badge variant="outline">Facilities Department</Badge>
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Day Shift</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>

        {/* My Floor Assignment */}
        {floorAssignments.length > 0 && (
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-orange-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-500" />My Floor Assignments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {floorAssignments.map((fa: any) => {
                const floorItems = inventoryItems.filter((it: any) =>
                  !it.location || it.location.toLowerCase().includes(fa.floorLabel?.toLowerCase()) || it.location.toLowerCase().includes(fa.building?.toLowerCase())
                );
                const outCount = floorItems.filter((it: any) => it.quantity === 0).length;
                const lowCount = floorItems.filter((it: any) => it.quantity > 0 && it.quantity <= (it.minQuantity || 2)).length;
                const okCount = floorItems.length - outCount - lowCount;
                return (
                  <div key={fa.floorId} className="p-4 rounded-lg border border-border/40 bg-card/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{fa.floorLabel}</h3>
                          <Badge variant="outline" className="text-xs">{fa.building}</Badge>
                          <Badge className={`text-[10px] ${fa.shift === 'day' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : fa.shift === 'evening' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>{fa.shift} shift</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Assigned to: <span className="text-foreground font-medium">{fa.custodianName}</span></p>
                      </div>
                      <div className="flex gap-2">
                        {outCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{outCount} Out</Badge>}
                        {lowCount > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{lowCount} Low</Badge>}
                        {outCount === 0 && lowCount === 0 && floorItems.length > 0 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Stocked</Badge>}
                      </div>
                    </div>
                    {/* Supply grid */}
                    {floorItems.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {floorItems.slice(0, 9).map((item: any) => {
                          const isOut = item.quantity === 0;
                          const isLow = item.quantity > 0 && item.quantity <= (item.minQuantity || 2);
                          return (
                            <div key={item.id} className={`p-2 rounded border text-xs ${isOut ? 'border-red-500/30 bg-red-500/10' : isLow ? 'border-amber-500/30 bg-amber-500/10' : 'border-border/30 bg-muted/10'}`}>
                              <p className="font-medium truncate">{item.name}</p>
                              <p className={`font-bold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-green-400'}`}>
                                {isOut ? 'OUT' : isLow ? `${item.quantity} (Low)` : `${item.quantity} OK`}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No supply items logged for this floor. Log items in the Inventory Library with this floor as location.</p>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t border-border/20">
                      <span><span className="text-green-400 font-semibold">{okCount}</span> stocked</span>
                      <span><span className="text-amber-400 font-semibold">{lowCount}</span> low</span>
                      <span><span className="text-red-400 font-semibold">{outCount}</span> out</span>
                      <a href="/equipment-library?tab=supplies" className="ml-auto text-primary hover:underline">Manage Supplies →</a>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="mb-4"><div className="inline-flex p-4 rounded-full bg-orange-500/20 mb-4"><Trophy className="w-12 h-12 text-orange-500" /></div></div>
              <h3 className="text-2xl font-bold mb-2">Cleanliness Score</h3>
              <p className="text-5xl font-bold text-orange-500">{cleanlinessScore}%</p>
              <p className="text-muted-foreground mt-2">Facility-wide rating</p>
            </CardContent>
          </Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Today's Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Tasks Assigned</span><span className="text-2xl font-bold">{tasksToday}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Completed</span><span className="text-2xl font-bold text-green-500">{tasksCompleted}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Pending</span><span className="text-2xl font-bold text-yellow-500">{tasksToday - tasksCompleted}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Completion Rate</span><span className="text-2xl font-bold text-orange-500">{completionRate}%</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tasks This Week</p><p className="text-2xl font-bold text-orange-500">52</p></div><ClipboardList className="w-8 h-8 text-orange-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Task Time</p><p className="text-2xl font-bold text-blue-500">18m</p></div><Clock className="w-8 h-8 text-blue-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Areas Assigned</p><p className="text-2xl font-bold text-green-500">{areasAssigned}</p></div><MapPin className="w-8 h-8 text-green-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Quality Rating</p><p className="text-2xl font-bold text-purple-500">4.9/5</p></div><Award className="w-8 h-8 text-purple-500 opacity-50" /></div></CardContent></Card>
        </div>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500" />Task Activity (Last 7 Days)</CardTitle></CardHeader>
          <CardContent><SimpleBarChart data={activityData} /></CardContent>
        </Card>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-orange-500" />Area Coverage Today</CardTitle></CardHeader>
          <CardContent><AreaCoverage /></CardContent>
        </Card>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-orange-500" />Today's Tasks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/5">
                <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><div><p className="font-medium">Building A - Floor 1 Restrooms</p><p className="text-xs text-muted-foreground">Completed 2 hours ago</p></div></div>
                <Badge className="bg-green-500/20 text-green-500">Done</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-yellow-500" /><div><p className="font-medium">Common Area Vacuuming</p><p className="text-xs text-muted-foreground">In progress</p></div></div>
                <Badge className="bg-yellow-500/20 text-yellow-500">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-muted-foreground" /><div><p className="font-medium">Mechanical Room Cleaning</p><p className="text-xs text-muted-foreground">Scheduled for 2:00 PM</p></div></div>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/compliance-logger?role=custodian'}>
              <ClipboardList className="w-4 h-4 mr-2" />Log Maintenance
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}><Shield className="w-4 h-4 mr-2" />Safety Checks</Button>
            <Button variant="outline" onClick={() => window.location.href = '/messages'}>My Messages</Button>
            <Button variant="outline" onClick={() => window.location.href = '/observations'}>Observation Journal</Button>
            <Button variant="outline" onClick={() => window.location.href = '/violations'}>Report Violation</Button>
          </CardContent>
        </Card>

        <EmployeeActivityFeed accentColor="text-orange-400" />
      </div>
    </MainLayout>
  );
}
