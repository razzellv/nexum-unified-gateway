import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NexumLoader } from '@/components/global/NexumLoader';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Cpu, TrendingUp, CheckCircle, Clock, BarChart3,
  Trophy, Target, RefreshCw, Lightbulb, FileText,
  Activity, Zap, AlertTriangle, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getGreeting = (user: any) => {
  const name = user?.name || user?.email?.split('@')[0] || 'there';
  const parts = name.split(' ');
  const first = parts[0];
  const lastInitial = parts[1]?.[0] ? `${parts[1][0]}.` : '';
  const empId = `EMP-${(user?.sub || '').slice(-6).toUpperCase()}`;
  return { displayName: `${first} ${lastInitial}`.trim(), empId };
};

const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No activity in the last 7 days</p>
      </div>
    );
  }
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div
              className={cn(
                'w-full rounded-t transition-all duration-300',
                item.count > 0 ? 'bg-gradient-to-t from-purple-500 to-purple-500/50' : 'bg-muted/20'
              )}
              style={{
                height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`,
                minHeight: '4px',
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-purple-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function EngineerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { displayName, empId } = getGreeting(user);

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<Array<{ date: string; count: number }>>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [scheduleShifts] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_staff_schedule') || '[]'); } catch { return []; }
  });
  const today = new Date().toDateString();
  const todayShifts = scheduleShifts.filter(s => s.role && ['engineer','operator','supervisor'].some(r => (s.role||'').toLowerCase().includes(r)) && new Date(s.shiftStart).toDateString() === today);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Work orders
      const token = localStorage.getItem('nexum_access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const [woRes, logsRes, violationsRes, eqRes] = await Promise.allSettled([
        fetch(`${baseUrl}/work-orders`, { headers }),
        fetch(`${baseUrl}/facility-logs?facilityId=${user?.facilityId}&limit=50`, { headers }),
        fetch(`${baseUrl}/violations?facilityId=${user?.facilityId}`, { headers }),
        fetch(`${baseUrl}/equipment`, { headers }),
      ]);

      // Work orders
      if (woRes.status === 'fulfilled' && woRes.value.ok) {
        const d = await woRes.value.json();
        setWorkOrders(d.workOrders || d.items || []);
      }

      // Activity — build 7-day chart from logs
      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const d = await logsRes.value.json();
        const logs: any[] = d.logs || d.items || [];
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(Date.now() - (6 - i) * 86400000);
          const dateStr = date.toISOString().split('T')[0];
          const count = logs.filter(l => (l.timestamp || l.createdAt || '').startsWith(dateStr)).length;
          return { date: dateStr, count };
        });
        setActivityData(last7);
      } else {
        // Fallback: empty chart (no random data)
        setActivityData(
          Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
            count: 0,
          }))
        );
      }

      // Violations
      if (violationsRes.status === 'fulfilled' && violationsRes.value.ok) {
        const d = await violationsRes.value.json();
        setViolations(d.violations || d.items || []);
      }

      // Equipment count
      if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
        const d = await eqRes.value.json();
        setEquipmentCount((d.equipment || d.items || []).length);
      }
    } catch (err) {
      console.error('EngineerDashboard fetch error:', err);
      toast({ title: 'Error', description: 'Failed to load some dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived metrics
  const activeWOs = workOrders.filter(wo => !['completed', 'closed', 'done'].includes(wo.status?.toLowerCase()));
  const completedWOs = workOrders.filter(wo => ['completed', 'closed', 'done'].includes(wo.status?.toLowerCase()));
  const overdueWOs = workOrders.filter(wo => wo.dueDate && new Date(wo.dueDate) < new Date() && !['completed', 'closed', 'done'].includes(wo.status?.toLowerCase()));
  const openViolations = violations.filter(v => v.status?.toLowerCase() === 'open' || !v.status);
  const recentWOs = [...workOrders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 4);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Cpu className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hello, {displayName}</p>
              <h1 className="text-3xl font-bold">Engineer Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">{empId}</Badge>
                <Badge variant="outline">Engineering Department</Badge>
                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Technical Lead</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading engineer data..." />
          </div>
        ) : (
          <>
            {/* Top 2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="inline-flex p-4 rounded-full bg-purple-500/20 mb-4">
                      <Trophy className="w-12 h-12 text-purple-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Work Order Summary</h3>
                  <p className="text-5xl font-bold text-purple-500">{completedWOs.length}</p>
                  <p className="text-muted-foreground mt-2">Work orders completed</p>
                </CardContent>
              </Card>

              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Operations Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Work Orders</span>
                      <span className="text-2xl font-bold">{activeWOs.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <span className="text-2xl font-bold text-green-500">{completedWOs.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Open Violations</span>
                      <span className={cn('text-2xl font-bold', openViolations.length > 0 ? 'text-orange-400' : 'text-green-500')}>
                        {openViolations.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Equipment Registered</span>
                      <span className="text-2xl font-bold text-blue-500">{equipmentCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Work Orders</p>
                      <p className="text-2xl font-bold text-purple-500">{activeWOs.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue WOs</p>
                      <p className={cn('text-2xl font-bold', overdueWOs.length > 0 ? 'text-destructive' : 'text-green-500')}>
                        {overdueWOs.length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Equipment Registered</p>
                      <p className="text-2xl font-bold text-orange-500">{equipmentCount}</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed WOs</p>
                      <p className="text-2xl font-bold text-green-500">{completedWOs.length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shift Coverage */}
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Shift Coverage Today
                  {todayShifts.length === 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs ml-auto">No Schedule Loaded</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayShifts.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No shift data for today. Configure staff scheduling in the Schedule page or via UKG integration.</p>
                    <button onClick={() => window.location.href = '/staff-scheduling'} className="text-xs text-primary hover:underline">Open Staff Scheduling →</button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {todayShifts.map((s: any, i: number) => {
                      const start = new Date(s.shiftStart);
                      const end = new Date(s.shiftEnd);
                      const now = new Date();
                      const isActive = now >= start && now <= end;
                      return (
                        <div key={i} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium">{s.employeeName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{s.role} · {s.area || 'General'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono">{start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} – {end.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</p>
                            <Badge className={`text-[10px] ${isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground'}`}>{isActive ? 'On Shift' : 'Off'}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Recommendations */}
            {(() => {
              const complianceRecs: Array<{title: string; severity: string; count: number}> = (() => {
                try {
                  const violations2: any[] = JSON.parse(localStorage.getItem('nexum_violation_events') || '[]');
                  const logs: any[] = JSON.parse(localStorage.getItem('nexum_facility_logs') || '[]');
                  const recent = logs.filter(l => Date.now() - new Date(l.timestamp || l.createdAt || 0).getTime() < 7 * 86400000);
                  const recs: Array<{title: string; severity: string; count: number}> = [];
                  const openViolations2 = violations2.filter(v => v.status !== 'resolved' && v.status !== 'completed');
                  if (openViolations2.length > 0) recs.push({ title: `${openViolations2.length} open violation${openViolations2.length>1?'s':''} require attention`, severity: 'high', count: openViolations2.length });
                  const highPressure = recent.filter(l => (l.systemPsi || l.pressure || 0) > 150);
                  if (highPressure.length > 0) recs.push({ title: `${highPressure.length} log${highPressure.length>1?'s':''} with elevated system pressure (>150 PSI)`, severity: 'high', count: highPressure.length });
                  const highKw = recent.filter(l => ((l.currentKw || l.kw || 0) / (l.estimatedTons || l.tons || 1)) > 0.66 && (l.estimatedTons || l.tons || 0) > 0);
                  if (highKw.length > 0) recs.push({ title: `${highKw.length} log${highKw.length>1?'s':''} with kW/Ton above design efficiency`, severity: 'moderate', count: highKw.length });
                  const pmMissed = violations2.filter(v => v.type === 'MISSED_ROUND' && v.status !== 'resolved');
                  if (pmMissed.length > 0) recs.push({ title: `${pmMissed.length} missed PM round${pmMissed.length>1?'s':''} logged`, severity: 'moderate', count: pmMissed.length });
                  return recs.slice(0, 5);
                } catch { return []; }
              })();
              return complianceRecs.length > 0 ? (
                <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Compliance Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {complianceRecs.map((rec, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${rec.severity === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${rec.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                        <p className="text-sm">{rec.title}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Activity Chart */}
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Log Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={activityData} />
              </CardContent>
            </Card>

            {/* Recent Work Orders */}
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-500" />
                  Recent Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentWOs.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">No work orders found</p>
                ) : (
                  <div className="space-y-3">
                    {recentWOs.map((wo, i) => {
                      const isOverdue = wo.dueDate && new Date(wo.dueDate) < new Date() && !['completed', 'closed'].includes(wo.status?.toLowerCase());
                      return (
                        <div key={wo.workOrderId || wo.id || i} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-sm">{wo.title || wo.description || 'Work Order'}</h3>
                            <div className="flex gap-2">
                              {isOverdue && (
                                <Badge className="bg-destructive/20 text-destructive text-xs">Overdue</Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">{wo.status || 'open'}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {wo.priority && <span>Priority: <span className="capitalize">{wo.priority}</span></span>}
                            {wo.assignedTo && <span>Assigned: {wo.assignedTo}</span>}
                            {wo.dueDate && <span>Due: {new Date(wo.dueDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Violations */}
            {openViolations.length > 0 && (
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Open Violations
                    <Badge className="ml-auto bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {openViolations.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {openViolations.slice(0, 3).map((v, i) => (
                      <div key={v.violationId || i} className="p-3 border border-orange-500/20 rounded-lg bg-orange-500/5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{v.violationType || v.type || 'Violation'}</h3>
                          <Badge className="bg-orange-500/20 text-orange-400 text-xs">Open</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{v.description || v.notes || ''}</p>
                        {v.timestamp && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {new Date(v.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button onClick={() => window.location.href = '/data-source'}>
                  <Activity className="w-4 h-4 mr-2" />View System Data
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>
                  Technical Compliance
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/equipment-library'}>
                  Equipment Library
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/messages'}>
                  My Messages
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
