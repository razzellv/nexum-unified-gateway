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

export function KanbanBoard() {
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
      setTasks(wos.map(wo => {
        const t = woToTask(wo);
        if (overrides[t.id]) t.status = overrides[t.id];
        return t;
      }));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading work orders...
      </div>
    );
  }

  return (
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
  );
}
