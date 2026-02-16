import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Filter } from 'lucide-react';
import { workloadData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { toast } from '@/hooks/use-toast';

const Workload = () => {
  const totalTasks = workloadData.reduce((sum, p) => sum + p.tasks, 0);
  const totalHours = workloadData.reduce((sum, p) => sum + p.hours, 0);
  const averageCapacity = Math.round(workloadData.reduce((sum, p) => sum + p.capacity, 0) / workloadData.length);

  const priorityData = [
    { name: 'Critical', value: 2, color: 'hsl(0, 72%, 51%)' },
    { name: 'High', value: 8, color: 'hsl(38, 92%, 50%)' },
    { name: 'Medium', value: 10, color: 'hsl(199, 89%, 48%)' },
    { name: 'Low', value: 4, color: 'hsl(215, 20%, 55%)' }
  ];

  const systemData = [
    { name: 'Boiler', tasks: 5 }, { name: 'Chiller', tasks: 4 }, { name: 'HVAC', tasks: 6 },
    { name: 'Electrical', tasks: 3 }, { name: 'Production', tasks: 4 }, { name: 'Other', tasks: 2 }
  ];

  const handleFilter = () => toast({ title: 'Filter', description: 'Opening workload filters...' });
  const handleExport = () => toast({ title: 'Export', description: 'Exporting workload report...' });
  const handleWeek = () => toast({ title: 'Date Range', description: 'Showing this week\'s data' });

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Workload</h1>
            <p className="text-sm text-muted-foreground">{workloadData.length} team members • {totalTasks} tasks • {totalHours} hours</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleWeek}><Calendar className="w-4 h-4 mr-2" /><span className="hidden sm:inline">This Week</span></Button>
            <Button variant="outline" size="sm" onClick={handleFilter}><Filter className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Filter</span></Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Export</span></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="metric-card"><p className="text-xs md:text-sm text-muted-foreground">Total Tasks</p><p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{totalTasks}</p></div>
          <div className="metric-card"><p className="text-xs md:text-sm text-muted-foreground">Hours Allocated</p><p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{totalHours}h</p></div>
          <div className="metric-card"><p className="text-xs md:text-sm text-muted-foreground">Avg. Capacity</p><p className={cn("text-2xl md:text-3xl font-bold mt-2", averageCapacity >= 80 ? "text-critical" : averageCapacity >= 60 ? "text-warning" : "text-success")}>{averageCapacity}%</p></div>
          <div className="metric-card"><p className="text-xs md:text-sm text-muted-foreground">Team Members</p><p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{workloadData.length}</p></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-panel p-4">
            <h3 className="text-base md:text-lg font-semibold mb-4">Individual Workload</h3>
            <div className="space-y-3 md:space-y-4">
              {workloadData.map((person) => (
                <div key={person.name} className="flex items-center gap-3 md:gap-4">
                  <div className="w-24 md:w-32 shrink-0">
                    <p className="text-xs md:text-sm font-medium truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.tasks} tasks • {person.hours}h</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 md:h-4 bg-muted/30 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", person.capacity >= 80 ? "bg-critical" : person.capacity >= 60 ? "bg-warning" : "bg-success")} style={{ width: `${person.capacity}%` }} />
                    </div>
                  </div>
                  <span className={cn("text-xs md:text-sm font-medium w-10 md:w-12 text-right shrink-0", person.capacity >= 80 ? "text-critical" : person.capacity >= 60 ? "text-warning" : "text-success")}>{person.capacity}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-base md:text-lg font-semibold mb-4">Priority Distribution</h3>
            <div className="h-[200px] md:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={priorityData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">{priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px', color: 'hsl(210, 40%, 96%)' }} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4">{priorityData.map((item) => <div key={item.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name} ({item.value})</span></div>)}</div>
          </div>

          <div className="glass-panel p-4 lg:col-span-2">
            <h3 className="text-base md:text-lg font-semibold mb-4">Tasks by System</h3>
            <div className="h-[180px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemData}><XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(222, 47%, 16%)' }} /><YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(222, 47%, 16%)' }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px', color: 'hsl(210, 40%, 96%)' }} /><Bar dataKey="tasks" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Workload;
