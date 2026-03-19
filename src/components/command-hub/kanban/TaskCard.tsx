import { useState } from 'react';
import { Clock, Building2, Paperclip, MessageSquare, AlertTriangle, X, User, Calendar, Wrench, CheckCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Task } from '@/types/facility';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onRefresh?: () => void;
}

const priorityStyles = {
  low:      'border-l-muted-foreground',
  medium:   'border-l-primary',
  high:     'border-l-warning',
  critical: 'border-l-critical animate-pulse',
};

const priorityBadge = {
  low:      'bg-muted/50 text-muted-foreground',
  medium:   'bg-primary/20 text-primary border-primary/30',
  high:     'bg-warning/20 text-warning border-warning/30',
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
};

const systemIcons: Record<string, string> = {
  boiler: '🔥', chiller: '❄️', pump: '💧', electrical: '⚡',
  hvac: '🌡️', water: '💦', gas: '🔵', production: '🏭',
  safety: '🛡️', compressor: '🔧', ahu: '🌀', rtu: '📦', general: '🔧',
};

const statusColors: Record<string, string> = {
  backlog:        'bg-muted/50 text-muted-foreground',
  ready:          'bg-primary/20 text-primary border-primary/30',
  'in-progress':  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'waiting-vendor': 'bg-warning/20 text-warning border-warning/30',
  qa:             'bg-chart-2/20 text-chart-2 border-chart-2/30',
  completed:      'bg-success/20 text-success border-success/30',
  archived:       'bg-muted/30 text-muted-foreground',
};

function WorkOrderDetailDialog({
  task,
  open,
  onClose,
  onRefresh,
}: {
  task: Task;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/work-orders/${task.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error('Update failed');
      toast({ title: 'Status Updated', description: `Work order moved to ${newStatus}` });
      onRefresh?.();
      onClose();
    } catch (err) {
      toast({ title: 'Update Failed', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const nextStatuses = [
    { label: 'Mark Ready',         value: 'ready' },
    { label: 'Start Work',         value: 'in-progress' },
    { label: 'Waiting on Vendor',  value: 'waiting-vendor' },
    { label: 'Send to QA',         value: 'qa' },
    { label: 'Mark Complete',      value: 'completed' },
  ].filter(s => s.value !== task.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="text-xl">{systemIcons[task.system] || '🔧'}</span>
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status & Priority row */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn('capitalize', statusColors[task.status] || '')}>{task.status.replace('-', ' ')}</Badge>
            <Badge className={cn('capitalize', priorityBadge[task.priority])}>{task.priority}</Badge>
            <Badge variant="outline" className="capitalize">{task.system}</Badge>
            <Badge variant="outline" className={cn(
              'capitalize',
              task.riskCategory === 'safety' && 'border-destructive/50 text-destructive',
              task.riskCategory === 'compliance' && 'border-warning/50 text-warning',
            )}>
              {task.riskCategory}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {task.assignedPersonnel.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Assigned To
                </p>
                <p className="text-sm font-medium">{task.assignedPersonnel.join(', ')}</p>
              </div>
            )}
            {task.dueDate && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due Date
                </p>
                <p className={cn(
                  'text-sm font-medium',
                  new Date(task.dueDate) < new Date() ? 'text-destructive' : ''
                )}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {task.estimatedHours > 0 && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hours
                </p>
                <p className="text-sm font-medium">{task.actualHours || 0} / {task.estimatedHours}h</p>
              </div>
            )}
            {task.location && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Location
                </p>
                <p className="text-sm font-medium">{task.location}</p>
              </div>
            )}
          </div>

          {/* Update Status */}
          {task.status !== 'completed' && task.status !== 'archived' && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={s.value === 'completed' ? 'default' : 'outline'}
                    onClick={() => updateStatus(s.value)}
                    disabled={updating}
                    className={s.value === 'completed' ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}
                  >
                    {updating
                      ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      : s.value === 'completed'
                        ? <CheckCircle className="w-3 h-3 mr-1" />
                        : <Wrench className="w-3 h-3 mr-1" />
                    }
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {task.status === 'completed' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-success">This work order is completed</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskCard({ task, onClick, onRefresh }: TaskCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div
        className={cn('task-card border-l-4 mb-3 cursor-pointer', priorityStyles[task.priority])}
        onClick={() => setShowDetail(true)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{systemIcons[task.system] || '🔧'}</span>
            <Badge variant="outline" className="text-xs capitalize">{task.system}</Badge>
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
              'text-xs',
              task.riskCategory === 'safety' && 'border-critical/50 text-critical',
              task.riskCategory === 'compliance' && 'border-warning/50 text-warning',
              task.riskCategory === 'production' && 'border-primary/50 text-primary'
            )}
          >
            {task.riskCategory}
          </Badge>
          {task.estimatedHours > 0 && (
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
              <Building2 className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {task.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Paperclip className="w-3 h-3" />{task.attachments.length}
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare className="w-3 h-3" />{task.comments.length}
              </span>
            )}
          </div>
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className={cn(
            'mt-2 pt-2 border-t border-border/50 text-xs flex items-center gap-1',
            new Date(task.dueDate) < new Date() ? 'text-critical' : 'text-muted-foreground'
          )}>
            <Clock className="w-3 h-3" />
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      <WorkOrderDetailDialog
        task={task}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onRefresh={onRefresh}
      />
    </>
  );
}
