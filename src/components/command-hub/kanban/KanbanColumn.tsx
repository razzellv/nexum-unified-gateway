import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task, TaskStatus } from '@/types/facility';
import { TaskCard } from './TaskCard';
import { NewTaskDialog } from '@/components/command-hub/dialogs/NewTaskDialog';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskCreated?: () => void;
  onLocalStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const statusColors: Record<TaskStatus, string> = {
  'backlog':        'bg-muted-foreground/20',
  'ready':          'bg-primary/20',
  'in-progress':    'bg-chart-4/20',
  'waiting-vendor': 'bg-warning/20',
  'qa':             'bg-chart-2/20',
  'completed':      'bg-success/20',
  'archived':       'bg-muted/20',
};

const statusDotColors: Record<TaskStatus, string> = {
  'backlog':        'bg-muted-foreground',
  'ready':          'bg-primary',
  'in-progress':    'bg-chart-4',
  'waiting-vendor': 'bg-warning',
  'qa':             'bg-chart-2',
  'completed':      'bg-success',
  'archived':       'bg-muted',
};

export function KanbanColumn({ title, status, tasks, onTaskCreated, onLocalStatusChange }: KanbanColumnProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const criticalCount = tasks.filter(t => t.priority === 'critical').length;

  const handleTaskCreated = () => {
    setShowNewTask(false);
    onTaskCreated?.();
  };

  return (
    <>
      <div className="kanban-column min-w-[300px] flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', statusDotColors[status])} />
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowNewTask(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Tasks */}
        <div className="space-y-0">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onRefresh={onTaskCreated} onLocalStatusChange={onLocalStatusChange} />
          ))}
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowNewTask(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      <NewTaskDialog
        open={showNewTask}
        onOpenChange={(open) => {
          setShowNewTask(open);
          if (!open) onTaskCreated?.();
        }}
      />
    </>
  );
}
