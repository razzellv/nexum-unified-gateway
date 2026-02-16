import { Clock, User, Building2, Paperclip, MessageSquare, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task } from '@/types/facility';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityStyles = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-primary',
  high: 'border-l-warning',
  critical: 'border-l-critical animate-pulse'
};

const systemIcons: Record<string, string> = {
  boiler: '🔥',
  chiller: '❄️',
  pump: '💧',
  electrical: '⚡',
  hvac: '🌡️',
  water: '💦',
  gas: '🔵',
  production: '🏭',
  safety: '🛡️',
  compressor: '🔧',
  ahu: '🌀',
  rtu: '📦'
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div 
      className={cn(
        "task-card border-l-4 mb-3",
        priorityStyles[task.priority]
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{systemIcons[task.system] || '🔧'}</span>
          <Badge variant="outline" className="text-xs capitalize">
            {task.system}
          </Badge>
        </div>
        {task.priority === 'critical' && (
          <AlertTriangle className="w-4 h-4 text-critical animate-pulse" />
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium mb-2 line-clamp-2">{task.title}</h4>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            task.riskCategory === 'safety' && "border-critical/50 text-critical",
            task.riskCategory === 'compliance' && "border-warning/50 text-warning",
            task.riskCategory === 'production' && "border-primary/50 text-primary"
          )}
        >
          {task.riskCategory}
        </Badge>
        {task.estimatedHours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.actualHours || 0}/{task.estimatedHours}h
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          {task.assignedPersonnel.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignedPersonnel.slice(0, 3).map((person, i) => (
                <div 
                  key={i}
                  className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-xs font-medium text-primary"
                  title={person}
                >
                  {person.charAt(0)}
                </div>
              ))}
            </div>
          )}
          {task.assignedVendor && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}
        </div>
      </div>

      {/* Due date */}
      {task.dueDate && (
        <div className={cn(
          "mt-2 pt-2 border-t border-border/50 text-xs flex items-center gap-1",
          new Date(task.dueDate) < new Date() ? "text-critical" : "text-muted-foreground"
        )}>
          <Clock className="w-3 h-3" />
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
