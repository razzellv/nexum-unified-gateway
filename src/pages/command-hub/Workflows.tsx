import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Play, Copy, Settings } from 'lucide-react';
import { mockWorkflowTemplates } from '@/data/mockData';
import { CreateWorkflowDialog } from '@/components/command-hub/dialogs/CreateWorkflowDialog';
import { toast } from '@/hooks/use-toast';

const Workflows = () => {
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);

  const systemIcons: Record<string, string> = {
    boiler: '🔥',
    chiller: '❄️',
    pump: '💧',
    electrical: '⚡',
    hvac: '🌡️'
  };

  const handleClone = (name: string) => {
    toast({ title: 'Workflow Cloned', description: `"${name}" has been duplicated.` });
  };

  const handleSettings = (name: string) => {
    toast({ title: 'Workflow Settings', description: `Opening settings for "${name}"...` });
  };

  const handleRun = (name: string) => {
    toast({ title: 'Workflow Started', description: `"${name}" is now running.` });
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Workflow Templates</h1>
              <p className="text-sm text-muted-foreground">
                {mockWorkflowTemplates.length} templates available
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search workflows..." 
                  className="pl-10 w-full sm:w-48 md:w-64 bg-muted/50"
                />
              </div>
              <Button size="sm" onClick={() => setShowCreateWorkflow(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Create Workflow</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Workflow Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {mockWorkflowTemplates.map((workflow) => (
            <div key={workflow.id} className="glass-panel p-4 md:p-5 transition-all duration-200 hover:border-primary/50">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl md:text-2xl shrink-0">{systemIcons[workflow.system] || '⚙️'}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{workflow.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize mt-1">
                      {workflow.system}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{workflow.description}</p>

              {/* Steps Preview */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">{workflow.steps.length} Steps</p>
                <div className="space-y-2">
                  {workflow.steps.slice(0, 3).map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate text-muted-foreground">{step.name}</span>
                    </div>
                  ))}
                  {workflow.steps.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-7">
                      +{workflow.steps.length - 3} more steps
                    </p>
                  )}
                </div>
              </div>

              {/* Triggers */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Triggers</p>
                <div className="flex flex-wrap gap-1">
                  {workflow.triggers.map((trigger, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border/50">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleClone(workflow.name)}>
                  <Copy className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Clone</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSettings(workflow.name)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button size="sm" className="flex-1" onClick={() => handleRun(workflow.name)}>
                  <Play className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Run</span>
                </Button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div 
            className="glass-panel p-4 md:p-5 border-dashed border-2 flex flex-col items-center justify-center text-center min-h-[280px] md:min-h-[300px] cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowCreateWorkflow(true)}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Create New Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Build a custom workflow template for your facility operations
            </p>
          </div>
        </div>
      </div>

      <CreateWorkflowDialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow} />
    </MainLayout>
  );
};

export default Workflows;
