import { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { Task, TaskStatus } from '@/types/facility';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';

const LOCAL_OVERRIDES_KEY = 'nexum_kanban_status_overrides';

const columns: { title: string; status: TaskStatus }[] = [
  { title: 'Backlog',            status: 'backlog' },
  { title: 'Ready',              status: 'ready' },
  { title: 'In Progress',        status: 'in-progress' },
  { title: 'Waiting for Vendor', status: 'waiting-vendor' },
  { title: 'QA/Verification',    status: 'qa' },
  { title: 'Completed',          status: 'completed' },
];

function mapStatus(woStatus: string): TaskStatus {
  const s = woStatus?.toLowerCase();
  if (s === 'completed' || s === 'done' || s === 'closed') return 'completed';
  if (s === 'in_progress' || s === 'in-progress' || s === 'active') return 'in-progress';
  if (s === 'waiting' || s === 'waiting_vendor' || s === 'pending_vendor') return 'waiting-vendor';
  if (s === 'qa' || s === 'verification' || s === 'review') return 'qa';
  if (s === 'ready' || s === 'assigned') return 'ready';
  return 'backlog';
}

function mapPriority(p: string): 'low' | 'medium' | 'high' | 'critical' {
  const v = p?.toLowerCase();
  if (v === 'critical' || v === 'emergency') return 'critical';
  if (v === 'high') return 'high';
  if (v === 'low') return 'low';
  return 'medium';
}

function woToTask(wo: any): Task {
  return {
    id: wo.workOrderId || wo.id,
    title: wo.title || wo.description || 'Work Order',
    description: wo.description || wo.reason || '',
    system: wo.systemType || wo.equipmentType || 'general',
    priority: mapPriority(wo.priority),
    riskCategory: wo.category || 'operational',
    status: mapStatus(wo.status),
    assignedPersonnel: wo.assignedTo ? [wo.assignedTo] : [],
    assignedVendor: wo.vendorId || undefined,
    dueDate: wo.dueDate ? new Date(wo.dueDate) : undefined,
    estimatedHours: parseFloat(wo.estimatedHours || wo.estimatedCost / 100 || 0),
    actualHours: parseFloat(wo.actualHours || 0),
    attachments: [],
    comments: [],
    createdAt: new Date(wo.createdAt || Date.now()),
    updatedAt: new Date(wo.updatedAt || Date.now()),
    location: wo.location || wo.buildingId || '',
  };
}

interface KanbanBoardProps {
  onStatsChange?: (active: number, critical: number) => void;
}

export function KanbanBoard({ onStatsChange }: KanbanBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Load local overrides (applied when API call fails due to CORS/network)
  function getLocalOverrides(): Record<string, TaskStatus> {
    try { return JSON.parse(localStorage.getItem(LOCAL_OVERRIDES_KEY) || '{}'); } catch { return {}; }
  }

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiRequest('/work-orders');
      const wos: any[] = data.workOrders || data.items || [];
      const overrides = getLocalOverrides();
      // Merge API data with any locally-saved status overrides
      const mapped = wos.map(wo => {
        const t = woToTask(wo);
        if (overrides[t.id]) t.status = overrides[t.id];
        return t;
      });
      setTasks(mapped);
      const active   = mapped.filter(t => t.status !== 'completed').length;
      const critical = mapped.filter(t => t.priority === 'critical' && t.status !== 'completed').length;
      onStatsChange?.(active, critical);
    } catch (err) {
      console.error('Kanban fetch error:', err);
      // If API is down, try localStorage fallback
      const saved = localStorage.getItem('nexum_kanban_tasks');
      if (saved) {
        try { setTasks(JSON.parse(saved)); } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Called by TaskCard when API update fails — optimistically updates local state
  const handleLocalStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      localStorage.setItem('nexum_kanban_tasks', JSON.stringify(next));
      // Also store the override so it survives a fetch-refresh
      const overrides = getLocalOverrides();
      overrides[taskId] = newStatus;
      localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(overrides));
      return next;
    });
  }, []);

  const getTasksByStatus = (status: TaskStatus): Task[] =>
    tasks.filter(t => t.status === status);

  // Read workflow baselines from localStorage for banner
  const workflowBaselines: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('nexum_workflow_baselines') || '[]'); } catch { return []; }
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton: 3 columns, 2 placeholder cards each */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {[1, 2, 3].map(col => (
            <div key={col} className="flex flex-col bg-muted/20 rounded-xl p-3 min-w-[280px] max-w-[320px] flex-shrink-0 border border-border/30 border-t-4 border-t-muted-foreground/30 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <div className="h-4 w-24 rounded bg-muted-foreground/20" />
                <div className="h-4 w-6 rounded-full bg-muted-foreground/20" />
              </div>
              {[1, 2].map(card => (
                <div key={card} className="mb-3 rounded-xl border border-border/30 bg-card/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
                    <div className="h-4 w-16 rounded bg-muted-foreground/20" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/15" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Workflow baselines banner */}
      {workflowBaselines.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground overflow-x-auto">
          <span className="shrink-0 font-medium text-primary">Baselines:</span>
          {workflowBaselines.slice(0, 5).map((b: any) => (
            <span key={b.id} className="shrink-0 px-2 py-0.5 rounded-md bg-muted/50 border border-border/40">
              {b.workflowName} · {b.targetHours ?? '?'}h target
            </span>
          ))}
          {workflowBaselines.length > 5 && (
            <span className="shrink-0 text-muted-foreground">+{workflowBaselines.length - 5} more</span>
          )}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={getTasksByStatus(column.status)}
            onTaskCreated={fetchTasks}
            onLocalStatusChange={handleLocalStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
