import { Clock, User, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task } from '@/types/facility';
import { mockTasks } from '@/data/mockData';
import { Link } from 'react-router-dom';

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-warning/20 text-warning',
  critical: 'bg-critical/20 text-critical'
};

const statusLabels = {
  'backlog': 'Backlog',
  'ready': 'Ready',
  'in-progress': 'In Progress',
  'waiting-vendor': 'Waiting for Vendor',
  'qa': 'QA/Verification',
  'completed': 'Completed',
  'archived': 'Archived'
};

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className={cn(
        "w-1 h-12 rounded-full",
        task.priority === 'critical' && "bg-critical",
        task.priority === 'high' && "bg-warning",
        task.priority === 'medium' && "bg-primary",
        task.priority === 'low' && "bg-muted-foreground"
      )} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <Badge variant="outline" className="text-xs capitalize">
            {task.system}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {statusLabels[task.status]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {task.assignedPersonnel.length > 0 && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{task.assignedPersonnel[0]}</span>
          </div>
        )}
        {task.assignedVendor && (
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            <span>{task.assignedVendor}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function RecentTasks() {
  const recentTasks = mockTasks
    .filter(t => t.status !== 'completed' && t.status !== 'archived')
    .slice(0, 5);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Tasks</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/kanban">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="space-y-1">
        {recentTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
