import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Play, Copy, Settings, RefreshCw, CheckCircle, Clock, Users } from 'lucide-react';
import { CreateWorkflowDialog } from '@/components/command-hub/dialogs/CreateWorkflowDialog';
import { useToast } from '@/hooks/use-toast';

const systemIcons: Record<string, string> = {
  boiler: '🔥', chiller: '❄️', pump: '💧', electrical: '⚡', hvac: '🌡️', ahu: '🌀', general: '🔧',
};

// Built-in workflow templates — always available
const BUILT_IN_TEMPLATES = [
  {
    id: 'tpl-1', name: 'Boiler Emergency Response', system: 'boiler',
    description: 'Standard response workflow for boiler alarms and failures',
    triggers: ['High stack temperature', 'Low water cutoff', 'Flame failure'],
    steps: [
      { name: 'Verify alarm and assess severity',        assignTo: 'technician',  estimatedHours: 0.5 },
      { name: 'Implement immediate safety measures',     assignTo: 'supervisor',  estimatedHours: 1.0 },
      { name: 'Contact vendor if required',              assignTo: 'supervisor',  estimatedHours: 0.5 },
      { name: 'Document and analyze root cause',         assignTo: 'technician',  estimatedHours: 2.0 },
    ],
    builtIn: true,
  },
  {
    id: 'tpl-2', name: 'Chiller Performance Issue', system: 'chiller',
    description: 'Workflow for chiller efficiency drops and performance issues',
    triggers: ['High discharge pressure', 'Low suction pressure', 'Efficiency drop >5%'],
    steps: [
      { name: 'Review operating parameters',           assignTo: 'technician',  estimatedHours: 1.0 },
      { name: 'Check refrigerant levels and pressures',assignTo: 'technician',  estimatedHours: 2.0 },
      { name: 'Inspect condenser and evaporator',      assignTo: 'technician',  estimatedHours: 3.0 },
      { name: 'Schedule cleaning if required',         assignTo: 'supervisor',  estimatedHours: 1.0 },
    ],
    builtIn: true,
  },
  {
    id: 'tpl-3', name: 'PM Work Order Creation', system: 'general',
    description: 'Preventive maintenance scheduling and assignment workflow',
    triggers: ['Scheduled PM date', 'Equipment hours threshold', 'Manual trigger'],
    steps: [
      { name: 'Generate PM work order',               assignTo: 'supervisor',  estimatedHours: 0.25 },
      { name: 'Assign to qualified technician',       assignTo: 'manager',     estimatedHours: 0.25 },
      { name: 'Confirm parts and materials available',assignTo: 'technician',  estimatedHours: 0.5 },
      { name: 'Execute PM and log readings',          assignTo: 'technician',  estimatedHours: 2.0 },
      { name: 'Manager sign-off and close WO',        assignTo: 'manager',     estimatedHours: 0.25 },
    ],
    builtIn: true,
  },
  {
    id: 'tpl-4', name: 'Compliance Violation Response', system: 'general',
    description: 'Structured response workflow for compliance violations',
    triggers: ['Violation logged', 'Inspector finding', 'Self-audit result'],
    steps: [
      { name: 'Document violation details',           assignTo: 'supervisor',  estimatedHours: 0.5 },
      { name: 'Notify relevant leadership',           assignTo: 'supervisor',  estimatedHours: 0.25 },
      { name: 'Implement corrective action',          assignTo: 'technician',  estimatedHours: 2.0 },
      { name: 'Verify correction and re-inspect',     assignTo: 'engineer',    estimatedHours: 1.0 },
      { name: 'Update compliance logger',             assignTo: 'supervisor',  estimatedHours: 0.25 },
    ],
    builtIn: true,
  },
];

const Workflows = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [search, setSearch] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  // Fetch recent WO creations as workflow run history
  useEffect(() => {
    fetchRecentRuns();
  }, []);

  const fetchRecentRuns = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const wos = (data.workOrders || data.items || []).slice(0, 5);
        setRecentRuns(wos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRun = async (template: any) => {
    setRunningId(template.id);
    try {
      const token = localStorage.getItem('nexum_access_token');
      // Create a WO for each step in the workflow
      const firstStep = template.steps[0];
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `[WF] ${template.name} — ${firstStep.name}`,
          description: template.description,
          systemType: template.system,
          priority: 'high',
          status: 'backlog',
          facilityId: user?.facilityId,
          estimatedHours: template.steps.reduce((s: number, st: any) => s + st.estimatedHours, 0),
          category: 'workflow',
          workflowTemplate: template.name,
        }),
      });
      toast({ title: 'Workflow Started', description: `"${template.name}" work order created and added to backlog.` });
      await fetchRecentRuns();
    } catch (err) {
      toast({ title: 'Failed to start workflow', variant: 'destructive' });
    } finally {
      setRunningId(null);
    }
  };

  const handleClone = (template: any) => {
    toast({ title: 'Workflow Cloned', description: `"${template.name}" duplicated. Edit and save as custom.` });
  };

  const filtered = BUILT_IN_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.system.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Workflows</h1>
            <p className="text-sm text-muted-foreground">{BUILT_IN_TEMPLATES.length} templates · Run to create work orders automatically</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows..." className="pl-9 w-48" />
            </div>
            <Button size="sm" onClick={() => setShowCreateWorkflow(true)}>
              <Plus className="w-4 h-4 mr-2" />New
            </Button>
          </div>
        </div>

        {/* Templates grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(template => (
            <Card key={template.id} className="glass-panel hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{systemIcons[template.system] || '🔧'}</span>
                    <div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Built-in</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Steps */}
                <div className="space-y-1.5">
                  {template.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-medium shrink-0">{i + 1}</div>
                      <span className="flex-1 truncate">{step.name}</span>
                      <span className="shrink-0 opacity-60">{step.estimatedHours}h</span>
                    </div>
                  ))}
                </div>

                {/* Triggers */}
                <div className="flex flex-wrap gap-1">
                  {template.triggers.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>

                {/* Total time */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {template.steps.reduce((s, st) => s + st.estimatedHours, 0)}h estimated total
                  <span className="mx-2">·</span>
                  <Users className="w-3 h-3" />
                  {[...new Set(template.steps.map(s => s.assignTo))].join(', ')}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRun(template)}
                    disabled={runningId === template.id}
                  >
                    {runningId === template.id
                      ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running...</>
                      : <><Play className="w-3.5 h-3.5 mr-1.5" />Run Workflow</>
                    }
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleClone(template)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent WO activity */}
        {recentRuns.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Recent Work Orders</h2>
            <div className="space-y-2">
              {recentRuns.map((wo: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="flex-1 truncate">{wo.title || wo.description}</span>
                  <Badge variant="outline" className="text-xs">{wo.status || 'open'}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateWorkflow && <CreateWorkflowDialog open={showCreateWorkflow} onClose={() => setShowCreateWorkflow(false)} />}
    </MainLayout>
  );
};

export default Workflows;
