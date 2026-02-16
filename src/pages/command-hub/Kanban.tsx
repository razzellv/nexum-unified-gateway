import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { KanbanBoard } from '@/components/command-hub/kanban/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, SortAsc, Search } from 'lucide-react';
import { mockTasks } from '@/data/mockData';
import { NewTaskDialog } from '@/components/command-hub/dialogs/NewTaskDialog';
import { FilterDialog } from '@/components/command-hub/dialogs/FilterDialog';
import { toast } from '@/hooks/use-toast';

const Kanban = () => {
  const [showNewTask, setShowNewTask] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const criticalCount = mockTasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length;
  const activeCount = mockTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length;

  const handleSort = () => {
    toast({ title: 'Sorted', description: 'Tasks sorted by priority' });
  };

  const handleQuickFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    toast({ title: 'Filter Applied', description: filter === 'all' ? 'Showing all tasks' : `Filtering by ${filter}` });
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Agile/Lean Board</h1>
              <p className="text-sm text-muted-foreground">
                {activeCount} active tasks 
                {criticalCount > 0 && (
                  <span className="text-critical"> • {criticalCount} critical</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tasks..." 
                  className="pl-10 w-full sm:w-48 md:w-64 bg-muted/50"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilter(true)}>
                <Filter className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSort}>
                <SortAsc className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
              <Button size="sm" onClick={() => setShowNewTask(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'all' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('all')}
          >
            All Systems
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'boiler' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('boiler')}
          >
            🔥 Boilers
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'chiller' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('chiller')}
          >
            ❄️ Chillers
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'electrical' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('electrical')}
          >
            ⚡ Electrical
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'hvac' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('hvac')}
          >
            🌡️ HVAC
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted shrink-0 ${activeFilter === 'production' ? 'bg-muted' : ''}`}
            onClick={() => handleQuickFilter('production')}
          >
            🏭 Production
          </Badge>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:bg-muted border-critical/50 text-critical shrink-0 ${activeFilter === 'critical' ? 'bg-critical/20' : ''}`}
            onClick={() => handleQuickFilter('critical')}
          >
            Critical Only
          </Badge>
        </div>

        {/* Kanban Board */}
        <KanbanBoard />
      </div>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} />
      <FilterDialog open={showFilter} onOpenChange={setShowFilter} title="Filter Tasks" />
    </MainLayout>
  );
};

export default Kanban;
