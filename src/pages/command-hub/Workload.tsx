import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Download, Filter, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const Workload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [systemData, setSystemData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const [woRes, usersRes] = await Promise.all([
        fetch(`${baseUrl}/work-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/users-list`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (!woRes.ok) throw new Error('Failed to fetch work orders');
      const data = await woRes.json();
      const wos = data.workOrders || data.items || [];

      // Build user ID -> name map from Cognito users
      const usersData = usersRes?.ok ? await usersRes.json() : {};
      const userMap: Record<string, string> = {};
      (usersData.users || []).forEach((u: any) => {
        const name = u.name || u.email || u.username || u.userId;
        if (u.userId) userMap[u.userId] = name;
        if (u.email) userMap[u.email] = name;
        if (u.username) userMap[u.username] = name;
      });

      const resolveName = (assignedTo: string) => userMap[assignedTo] || assignedTo || 'Unassigned';

      // Aggregate by assignee
      const byPerson: Record<string, { tasks: number; hours: number; wos: any[] }> = {};
      wos.filter((wo: any) => wo.status !== 'completed').forEach((wo: any) => {
        const name = resolveName(wo.assignedTo || wo.operatorId || 'Unassigned');
        if (!byPerson[name]) byPerson[name] = { tasks: 0, hours: 0, wos: [] };
        byPerson[name].tasks += 1;
        byPerson[name].hours += parseFloat(wo.estimatedHours || 4);
        byPerson[name].wos.push(wo);
      });

      const workload = Object.entries(byPerson).map(([name, d]) => ({
        name: name.length > 22 ? name.slice(0, 22) + '...' : name,
        tasks: d.tasks,
        hours: Math.round(d.hours),
        capacity: Math.min(100, Math.round((d.hours / 40) * 100)),
        critical: d.wos.filter((w: any) => w.priority?.toLowerCase() === 'critical').length,
        high: d.wos.filter((w: any) => w.priority?.toLowerCase() === 'high').length,
        overdue: d.wos.filter((w: any) => w.dueDate && new Date(w.dueDate) < new Date()).length,
      })).sort((a, b) => b.tasks - a.tasks);

      // Priority breakdown
      const priorities = { Critical: 0, High: 0, Medium: 0, Low: 0 };
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
        const label = s.charAt(0).toUpperCase() + s.slice(1);
        systems[label] = (systems[label] || 0) + 1;
      });

      setWorkloadData(workload.length > 0 ? workload : [{ name: 'No assignments', tasks: 0, hours: 0, capacity: 0 }]);
      setPriorityData([
        { name: 'Critical', value: priorities.Critical, color: 'hsl(0, 72%, 51%)' },
        { name: 'High',     value: priorities.High,     color: 'hsl(38, 92%, 50%)' },
        { name: 'Medium',   value: priorities.Medium,   color: 'hsl(199, 89%, 48%)' },
        { name: 'Low',      value: priorities.Low,      color: 'hsl(215, 20%, 55%)' },
      ]);
      setSystemData(Object.entries(systems).map(([name, tasks]) => ({ name, tasks })));
    } catch (err) {
      console.error('Workload fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalTasks  = workloadData.reduce((sum, p) => sum + p.tasks, 0);
  const totalHours  = workloadData.reduce((sum, p) => sum + p.hours, 0);
  const avgCapacity = workloadData.length > 0
    ? Math.round(workloadData.reduce((sum, p) => sum + p.capacity, 0) / workloadData.length)
    : 0;

  const getCapacityColor = (capacity: number) =>
    capacity >= 90 ? 'text-red-400' : capacity >= 75 ? 'text-yellow-400' : 'text-green-400';

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Workload</h1>
            <p className="text-sm text-muted-foreground">
              {workloadData.length} team members · {totalTasks} active tasks · {totalHours} estimated hours
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWorkload} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: 'Export', description: 'Exporting workload report...' })}>
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
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass-panel"><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Active Tasks</p>
              </CardContent></Card>
              <Card className="glass-panel"><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{totalHours}h</p>
                <p className="text-xs text-muted-foreground">Est. Hours</p>
              </CardContent></Card>
              <Card className="glass-panel"><CardContent className="p-4 text-center">
                <p className={cn('text-2xl font-bold', getCapacityColor(avgCapacity))}>{avgCapacity}%</p>
                <p className="text-xs text-muted-foreground">Avg Capacity</p>
              </CardContent></Card>
            </div>

            {/* Staff workload bar chart */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Workload by Staff Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} layout="vertical">
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(v: any, name: string) => [v, name === 'tasks' ? 'Tasks' : 'Hours']}
                      />
                      <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Priority + System breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Priority Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                          {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tasks by System</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={systemData}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff capacity table */}
            <Card className="glass-panel">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Staff Capacity Details</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workloadData.map((person, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{person.tasks} tasks · {person.hours}h</span>
                          {person.critical > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">{person.critical} critical</span>}
                          {person.overdue > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/20 text-orange-400 border border-orange-400/30">{person.overdue} overdue</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-bold', getCapacityColor(person.capacity))}>{person.capacity}%</p>
                        <p className="text-xs text-muted-foreground">capacity</p>
                      </div>
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
