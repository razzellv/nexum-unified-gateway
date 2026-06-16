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

const statusDotColors: Record<TaskStatus, string> = {
  'backlog':        'bg-muted-foreground',
  'ready':          'bg-primary',
  'in-progress':    'bg-chart-4',
  'waiting-vendor': 'bg-warning',
  'qa':             'bg-chart-2',
  'completed':      'bg-success',
  'archived':       'bg-muted',
};

const statusBorderColors: Record<TaskStatus, string> = {
  'backlog':        'border-t-slate-400',
  'ready':          'border-t-primary',
  'in-progress':    'border-t-amber-400',
  'waiting-vendor': 'border-t-orange-400',
  'qa':             'border-t-violet-400',
  'completed':      'border-t-emerald-400',
  'archived':       'border-t-slate-300',
};

const statusBadgeColors: Record<TaskStatus, string> = {
  'backlog':        'bg-slate-400/20 text-slate-400',
  'ready':          'bg-primary/20 text-primary',
  'in-progress':    'bg-amber-400/20 text-amber-400',
  'waiting-vendor': 'bg-orange-400/20 text-orange-400',
  'qa':             'bg-violet-400/20 text-violet-400',
  'completed':      'bg-emerald-400/20 text-emerald-400',
  'archived':       'bg-slate-300/20 text-slate-400',
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
      <div className={cn(
        'flex flex-col bg-muted/20 rounded-xl p-3 min-w-[280px] max-w-[320px] flex-shrink-0',
        'border border-border/30 border-t-4',
        statusBorderColors[status],
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-2 h-2 rounded-full shrink-0', statusDotColors[status])} />
            <h3 className="text-sm font-bold truncate">{title}</h3>
            <span className={cn(
              'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold shrink-0',
              statusBadgeColors[status],
            )}>
              {tasks.length}
            </span>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse shrink-0">
                {criticalCount}!
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setShowNewTask(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable task area */}
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onRefresh={onTaskCreated} onLocalStatusChange={onLocalStatusChange} />
          ))}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border/30 rounded-lg text-muted-foreground cursor-pointer hover:border-border/60 transition-colors"
              onClick={() => setShowNewTask(true)}
            >
              <Plus className="w-4 h-4 mb-1 opacity-50" />
              <p className="text-xs">Drop here</p>
            </div>
          )}
        </div>
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
