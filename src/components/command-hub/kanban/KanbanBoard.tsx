import { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { Task, TaskStatus } from '@/types/facility';
import { useAuth } from '@/hooks/useAuth';

const columns: { title: string; status: TaskStatus }[] = [
  { title: 'Backlog',             status: 'backlog' },
  { title: 'Ready',               status: 'ready' },
  { title: 'In Progress',         status: 'in-progress' },
  { title: 'Waiting for Vendor',  status: 'waiting-vendor' },
  { title: 'QA/Verification',     status: 'qa' },
  { title: 'Completed',           status: 'completed' },
];

// Map WO status → Kanban status
function mapStatus(woStatus: string): TaskStatus {
  const s = woStatus?.toLowerCase();
  if (s === 'completed' || s === 'done' || s === 'closed') return 'completed';
  if (s === 'in_progress' || s === 'in-progress' || s === 'active') return 'in-progress';
  if (s === 'waiting' || s === 'waiting_vendor' || s === 'pending_vendor') return 'waiting-vendor';
  if (s === 'qa' || s === 'verification' || s === 'review') return 'qa';
  if (s === 'ready' || s === 'assigned') return 'ready';
  return 'backlog';
}

// Map WO priority → Task priority
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const wos = data.workOrders || data.items || [];
        setTasks(wos.map(woToTask));
      }
    } catch (err) {
      console.error('Kanban fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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
        />
      ))}
    </div>
  );
}
