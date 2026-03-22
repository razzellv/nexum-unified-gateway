import { useState, useEffect } from 'react';
import { Clock, User, Building2, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface WorkOrder {
  id: string;
  title: string;
  system: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
}

const priorityBar: Record<string, string> = {
  critical: 'bg-critical',
  high:     'bg-warning',
  medium:   'bg-primary',
  low:      'bg-muted-foreground',
};

const statusLabels: Record<string, string> = {
  'backlog':        'Backlog',
  'ready':          'Ready',
  'in-progress':    'In Progress',
  'in_progress':    'In Progress',
  'waiting-vendor': 'Waiting Vendor',
  'qa':             'QA',
  'completed':      'Completed',
  'open':           'Open',
};

function TaskRow({ task }: { task: WorkOrder }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className={cn(
        'w-1 h-12 rounded-full shrink-0',
        priorityBar[task.priority?.toLowerCase()] || 'bg-muted-foreground'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <Badge variant="outline" className="text-xs capitalize">
            {task.system?.replace(/_/g, ' ') || 'general'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {statusLabels[task.status] || task.status}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {task.assignedTo && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{task.assignedTo}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
        <Link to="/kanban"><ArrowRight className="w-4 h-4" /></Link>
      </Button>
    </div>
  );
}

export function RecentTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const wos = (data.workOrders || data.items || [])
          .filter((wo: any) => !['completed', 'done', 'closed'].includes(wo.status?.toLowerCase()))
          .slice(0, 6)
          .map((wo: any) => ({
            id: wo.workOrderId || wo.id,
            title: wo.title || wo.description || 'Work Order',
            system: wo.systemType || wo.equipmentType || 'general',
            status: wo.status || 'open',
            priority: wo.priority || 'medium',
            assignedTo: wo.assignedTo,
            dueDate: wo.dueDate,
          }));
        setTasks(wos);
      }
    } catch (err) {
      console.error('RecentTasks fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Work Orders</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchTasks}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/kanban">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading work orders...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No active work orders</div>
        ) : (
          tasks.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
