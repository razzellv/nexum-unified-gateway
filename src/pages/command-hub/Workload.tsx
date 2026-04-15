import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, Users, AlertTriangle, Clock, Wrench, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PersonLoad {
  name: string;
  tasks: number;
  hours: number;
  capacity: number;
  critical: number;
  high: number;
  overdue: number;
  pm: number;
  emergency: number;
  compliance: number;
  other: number;
}

const WORK_TYPE_COLORS = {
  pm:         { label: 'Preventive PM', color: '#3b82f6' },
  emergency:  { label: 'Emergency',     color: '#ef4444' },
  compliance: { label: 'Compliance',    color: '#f59e0b' },
  other:      { label: 'General',       color: '#6b7280' },
};

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#3b82f6',
  Low:      '#6b7280',
};

function classifyWO(wo: any): 'pm' | 'emergency' | 'compliance' | 'other' {
  const cat = (wo.category || '').toLowerCase();
  const title = (wo.title || '').toLowerCase();
  if (cat.includes('compliance') || title.includes('compliance') || title.includes('inspection')) return 'compliance';
  if (cat.includes('emergency') || cat.includes('urgent') || wo.priority?.toLowerCase() === 'critical') return 'emergency';
  if (cat.includes('pm') || cat.includes('preventive') || title.includes('pm ') || title.includes('preventive')) return 'pm';
  return 'other';
}

// ── Fallback mock data (shown when API is down) ───────────────────────────────
const MOCK_WORKLOAD: PersonLoad[] = [
  { name: 'T. Rodriguez',  tasks: 8, hours: 28, capacity: 70,  critical: 1, high: 3, overdue: 1, pm: 4, emergency: 1, compliance: 2, other: 1 },
  { name: 'M. Johnson',    tasks: 5, hours: 22, capacity: 55,  critical: 0, high: 2, overdue: 0, pm: 3, emergency: 0, compliance: 1, other: 1 },
  { name: 'K. Patel',      tasks: 12, hours: 44, capacity: 110, critical: 2, high: 4, overdue: 3, pm: 5, emergency: 3, compliance: 2, other: 2 },
  { name: 'J. Williams',   tasks: 3, hours: 9,  capacity: 22,  critical: 0, high: 1, overdue: 0, pm: 2, emergency: 0, compliance: 1, other: 0 },
  { name: 'Unassigned',    tasks: 6, hours: 18, capacity: 0,   critical: 1, high: 2, overdue: 2, pm: 2, emergency: 2, compliance: 1, other: 1 },
];
const MOCK_PRIORITY = [
  { name: 'Critical', value: 4,  color: PRIORITY_COLORS.Critical },
  { name: 'High',     value: 12, color: PRIORITY_COLORS.High },
  { name: 'Medium',   value: 9,  color: PRIORITY_COLORS.Medium },
  { name: 'Low',      value: 9,  color: PRIORITY_COLORS.Low },
];
const MOCK_SYSTEM = [
  { name: 'Boiler',  tasks: 7 }, { name: 'HVAC',  tasks: 9 },
  { name: 'Chiller', tasks: 5 }, { name: 'Electrical', tasks: 4 }, { name: 'Other', tasks: 9 },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Workload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workloadData, setWorkloadData] = useState<PersonLoad[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [systemData, setSystemData]     = useState<any[]>([]);
  const [typeData, setTypeData]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [usingMock, setUsingMock]       = useState(false);

  useEffect(() => { fetchWorkload(); }, []);

  const fetchWorkload = async () => {
    setLoading(true);
    try {
      const [woData, usersData] = await Promise.allSettled([
        apiRequest('/work-orders'),
        apiRequest('/users-list'),
      ]);

      const wos: any[] = woData.status === 'fulfilled'
        ? (woData.value?.workOrders || woData.value?.items || [])
        : [];

      if (wos.length === 0) throw new Error('no data');

      // User ID → display name
      const userMap: Record<string, string> = {};
      if (usersData.status === 'fulfilled') {
        (usersData.value?.users || []).forEach((u: any) => {
          const name = u.name || u.email || u.username || u.userId;
          if (u.userId)   userMap[u.userId]   = name;
          if (u.email)    userMap[u.email]     = name;
          if (u.username) userMap[u.username]  = name;
        });
      }
      const resolveName = (a: string) => userMap[a] || a || 'Unassigned';

      // Aggregate by assignee
      const byPerson: Record<string, { tasks: number; hours: number; wos: any[] }> = {};
      wos.filter((wo: any) => wo.status !== 'completed').forEach((wo: any) => {
        const name = resolveName(wo.assignedTo || wo.operatorId || 'Unassigned');
        if (!byPerson[name]) byPerson[name] = { tasks: 0, hours: 0, wos: [] };
        byPerson[name].tasks += 1;
        byPerson[name].hours += parseFloat(wo.estimatedHours || 4);
        byPerson[name].wos.push(wo);
      });

      const workload: PersonLoad[] = Object.entries(byPerson).map(([name, d]) => ({
        name: name.length > 22 ? name.slice(0, 22) + '…' : name,
        tasks: d.tasks,
        hours: Math.round(d.hours),
        capacity: Math.min(120, Math.round((d.hours / 40) * 100)),
        critical: d.wos.filter((w: any) => w.priority?.toLowerCase() === 'critical').length,
        high:     d.wos.filter((w: any) => w.priority?.toLowerCase() === 'high').length,
        overdue:  d.wos.filter((w: any) => w.dueDate && new Date(w.dueDate) < new Date()).length,
        pm:         d.wos.filter((w: any) => classifyWO(w) === 'pm').length,
        emergency:  d.wos.filter((w: any) => classifyWO(w) === 'emergency').length,
        compliance: d.wos.filter((w: any) => classifyWO(w) === 'compliance').length,
        other:      d.wos.filter((w: any) => classifyWO(w) === 'other').length,
      })).sort((a, b) => b.hours - a.hours);

      // Priority breakdown
      const priorities: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      wos.forEach((wo: any) => {
        const p = wo.priority?.toLowerCase();
        if (p === 'critical') priorities.Critical++;
        else if (p === 'high') priorities.High++;
        else if (p === 'low') priorities.Low++;
        else priorities.Medium++;
      });

      // System breakdown
      const systems: Record<string, number> = {};
      wos.forEach((wo: any) => {
        const s = wo.systemType || wo.equipmentType || 'Other';
        systems[s.charAt(0).toUpperCase() + s.slice(1)] = (systems[s] || 0) + 1;
      });

      // Work type breakdown
      const types = { pm: 0, emergency: 0, compliance: 0, other: 0 };
      wos.forEach((wo: any) => { types[classifyWO(wo)]++; });

      setWorkloadData(workload);
      setPriorityData(Object.entries(priorities).map(([name, value]) => ({ name, value, color: (PRIORITY_COLORS as any)[name] })));
      setSystemData(Object.entries(systems).map(([name, tasks]) => ({ name, tasks })).sort((a, b) => b.tasks - a.tasks));
      setTypeData(Object.entries(types).map(([key, value]) => ({ name: (WORK_TYPE_COLORS as any)[key].label, value, color: (WORK_TYPE_COLORS as any)[key].color })));
      setUsingMock(false);
    } catch {
      setWorkloadData(MOCK_WORKLOAD);
      setPriorityData(MOCK_PRIORITY);
      setSystemData(MOCK_SYSTEM);
      setTypeData(Object.entries(WORK_TYPE_COLORS).map(([, v]) => ({ name: v.label, value: Math.floor(Math.random() * 8) + 1, color: v.color })));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  const totalTasks   = workloadData.reduce((s, p) => s + p.tasks, 0);
  const totalHours   = workloadData.reduce((s, p) => s + p.hours, 0);
  const avgCapacity  = workloadData.filter(p => p.name !== 'Unassigned').length > 0
    ? Math.round(workloadData.filter(p => p.name !== 'Unassigned').reduce((s, p) => s + p.capacity, 0) / workloadData.filter(p => p.name !== 'Unassigned').length)
    : 0;
  const overdueTotal = workloadData.reduce((s, p) => s + p.overdue, 0);
  const unassigned   = workloadData.find(p => p.name === 'Unassigned');

  const overloaded   = workloadData.filter(p => p.capacity >= 90 && p.name !== 'Unassigned');
  const underloaded  = workloadData.filter(p => p.capacity < 40 && p.name !== 'Unassigned' && p.tasks > 0);

  const getCapColor  = (c: number) => c >= 90 ? 'text-red-400' : c >= 75 ? 'text-yellow-400' : 'text-green-400';
  const getCapBg     = (c: number) => c >= 90 ? 'bg-red-400' : c >= 75 ? 'bg-yellow-400' : 'bg-primary';

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Workload</h1>
            <p className="text-sm text-muted-foreground">
              {workloadData.filter(p => p.name !== 'Unassigned').length} team members · {totalTasks} active tasks · {totalHours}h est.
              {usingMock && <span className="ml-2 text-xs text-yellow-400">(demo data)</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWorkload} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: 'Export', description: 'Exporting workload report…' })}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Tasks',   value: totalTasks,            icon: Wrench,        color: 'text-primary', sub: 'open work orders' },
                { label: 'Avg Capacity',   value: `${avgCapacity}%`,     icon: Users,         color: getCapColor(avgCapacity), sub: avgCapacity >= 90 ? 'team at risk' : avgCapacity >= 75 ? 'moderate load' : 'healthy load' },
                { label: 'Overdue Tasks',  value: overdueTotal,          icon: AlertTriangle, color: overdueTotal > 0 ? 'text-orange-400' : 'text-green-400', sub: 'past due date' },
                { label: 'Unassigned',     value: unassigned?.tasks || 0, icon: Clock,        color: (unassigned?.tasks || 0) > 0 ? 'text-yellow-400' : 'text-green-400', sub: 'need assignment' },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <Card key={label} className="glass-panel">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <Icon className={cn('w-4 h-4', color)} />
                    </div>
                    <p className={cn('text-2xl font-bold', color)}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Rebalancing alerts */}
            {(overloaded.length > 0 || (unassigned?.tasks || 0) > 0) && (
              <Card className="glass-panel border-yellow-400/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                    <Zap className="w-4 h-4" />Workload Rebalancing Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overloaded.map(p => (
                    <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="font-medium text-red-400">{p.name}</span>
                      <span className="text-muted-foreground">is at {p.capacity}% capacity ({p.tasks} tasks, {p.hours}h). Consider redistributing {Math.max(1, Math.round(p.tasks * 0.3))} task(s) to lighten load.</span>
                    </div>
                  ))}
                  {underloaded.map(p => (
                    <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-400/10 border border-blue-400/20 text-xs">
                      <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-medium text-blue-400">{p.name}</span>
                      <span className="text-muted-foreground">has capacity ({p.capacity}% utilized). Can absorb additional tasks from overloaded team members.</span>
                    </div>
                  ))}
                  {(unassigned?.tasks || 0) > 0 && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-xs">
                      <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span className="text-muted-foreground"><span className="font-medium text-yellow-400">{unassigned?.tasks} unassigned task(s)</span> need to be assigned. {overloaded.length === 0 && underloaded.length > 0 ? `Recommend assigning to ${underloaded[0]?.name}.` : ''}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Staff workload + type breakdown */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />Workload by Team Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workloadData} layout="vertical">
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={90} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(v: any, name: string) => [v, name === 'tasks' ? 'Tasks' : 'Hours']}
                        />
                        <Bar dataKey="tasks" name="tasks" radius={[0, 4, 4, 0]}>
                          {workloadData.map((p, i) => (
                            <Cell key={i} fill={p.capacity >= 90 ? '#ef4444' : p.capacity >= 75 ? '#f59e0b' : 'hsl(var(--primary))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Work Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                          label={({ name, value }) => value > 0 ? `${name.split(' ')[0]}: ${value}` : ''}>
                          {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {typeData.map(t => (
                      <span key={t.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />{t.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Priority + System breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Priority Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}
                          label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                          {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tasks by System</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={systemData.slice(0, 6)}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff capacity detail table */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />Staff Capacity Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workloadData.map((person, i) => (
                    <div key={i} className={cn('p-3 rounded-lg bg-muted/30 space-y-2', person.name === 'Unassigned' && 'border border-yellow-400/20')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{person.name}</p>
                            {person.critical > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">{person.critical} critical</span>}
                            {person.overdue  > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/20 text-orange-400 border border-orange-400/30">{person.overdue} overdue</span>}
                          </div>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {person.pm         > 0 && <span className="text-[10px] text-blue-400">{person.pm} PM</span>}
                            {person.emergency  > 0 && <span className="text-[10px] text-red-400">{person.emergency} Emergency</span>}
                            {person.compliance > 0 && <span className="text-[10px] text-yellow-400">{person.compliance} Compliance</span>}
                            {person.other      > 0 && <span className="text-[10px] text-muted-foreground">{person.other} General</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn('text-sm font-bold', getCapColor(person.capacity))}>{person.name === 'Unassigned' ? '—' : `${person.capacity}%`}</p>
                          <p className="text-xs text-muted-foreground">{person.tasks}t · {person.hours}h</p>
                        </div>
                      </div>
                      {person.name !== 'Unassigned' && (
                        <div className="space-y-1">
                          <Progress value={Math.min(person.capacity, 100)} className="h-1.5" />
                          {person.capacity > 100 && (
                            <p className="text-[10px] text-red-400">⚠ Over capacity by {person.capacity - 100}%</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Workload;
