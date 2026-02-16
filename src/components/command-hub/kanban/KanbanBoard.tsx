import { KanbanColumn } from './KanbanColumn';
import { Task, TaskStatus } from '@/types/facility';
import { mockTasks } from '@/data/mockData';

const columns: { title: string; status: TaskStatus }[] = [
  { title: 'Backlog', status: 'backlog' },
  { title: 'Ready', status: 'ready' },
  { title: 'In Progress', status: 'in-progress' },
  { title: 'Waiting for Vendor', status: 'waiting-vendor' },
  { title: 'QA/Verification', status: 'qa' },
  { title: 'Completed', status: 'completed' },
];

export function KanbanBoard() {
  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return mockTasks.filter(task => task.status === status);
  };

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
