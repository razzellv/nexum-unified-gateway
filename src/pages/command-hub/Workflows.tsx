import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Play, Copy, Trash2, RefreshCw, CheckCircle, Clock, Users, BarChart3, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface WFStep { name: string; assignTo: string; estimatedHours: number; }
interface WorkflowTemplate {
  id: string; name: string; system: string; description: string;
  triggers: string[]; steps: WFStep[]; builtIn?: boolean;
  totalRuns?: number; lastRun?: string; avgCompletionH?: number;
}

const systemIcons: Record<string, string> = {
  boiler: '🔥', chiller: '❄️', pump: '💧', electrical: '⚡', hvac: '🌡️', ahu: '🌀', general: '🔧',
};

const SLA_TARGETS: Record<string, number> = {
  emergency: 4, compliance: 24, pm: 72, general: 168,
};

// ── Built-in templates ────────────────────────────────────────────────────────
const BUILT_IN: WorkflowTemplate[] = [
  {
    id: 'tpl-1', name: 'Boiler Emergency Response', system: 'boiler', builtIn: true,
    description: 'Standard response workflow for boiler alarms and failures',
    triggers: ['High stack temperature', 'Low water cutoff', 'Flame failure'],
    steps: [
      { name: 'Verify alarm and assess severity',    assignTo: 'technician', estimatedHours: 0.5 },
      { name: 'Implement immediate safety measures', assignTo: 'supervisor', estimatedHours: 1.0 },
      { name: 'Contact vendor if required',          assignTo: 'supervisor', estimatedHours: 0.5 },
      { name: 'Document and analyze root cause',     assignTo: 'technician', estimatedHours: 2.0 },
    ],
    totalRuns: 12, avgCompletionH: 3.8,
  },
  {
    id: 'tpl-2', name: 'Chiller Performance Issue', system: 'chiller', builtIn: true,
    description: 'Workflow for chiller efficiency drops and performance issues',
    triggers: ['High discharge pressure', 'Low suction pressure', 'Efficiency drop >5%'],
    steps: [
      { name: 'Review operating parameters',            assignTo: 'technician', estimatedHours: 1.0 },
      { name: 'Check refrigerant levels and pressures', assignTo: 'technician', estimatedHours: 2.0 },
      { name: 'Inspect condenser and evaporator',       assignTo: 'technician', estimatedHours: 3.0 },
      { name: 'Schedule cleaning if required',          assignTo: 'supervisor', estimatedHours: 1.0 },
    ],
    totalRuns: 7, avgCompletionH: 6.2,
  },
  {
    id: 'tpl-3', name: 'PM Work Order Creation', system: 'general', builtIn: true,
    description: 'Preventive maintenance scheduling and assignment workflow',
    triggers: ['Scheduled PM date', 'Equipment hours threshold', 'Manual trigger'],
    steps: [
      { name: 'Generate PM work order',                assignTo: 'supervisor', estimatedHours: 0.25 },
      { name: 'Assign to qualified technician',        assignTo: 'manager',    estimatedHours: 0.25 },
      { name: 'Confirm parts and materials available', assignTo: 'technician', estimatedHours: 0.5  },
      { name: 'Execute PM and log readings',           assignTo: 'technician', estimatedHours: 2.0  },
      { name: 'Manager sign-off and close WO',         assignTo: 'manager',    estimatedHours: 0.25 },
    ],
    totalRuns: 34, avgCompletionH: 4.1,
  },
  {
    id: 'tpl-4', name: 'Compliance Violation Response', system: 'general', builtIn: true,
    description: 'Structured response workflow for compliance violations',
    triggers: ['Violation logged', 'Inspector finding', 'Self-audit result'],
    steps: [
      { name: 'Document violation details',         assignTo: 'supervisor', estimatedHours: 0.5  },
      { name: 'Notify relevant leadership',         assignTo: 'supervisor', estimatedHours: 0.25 },
      { name: 'Implement corrective action',        assignTo: 'technician', estimatedHours: 2.0  },
      { name: 'Verify correction and re-inspect',   assignTo: 'engineer',   estimatedHours: 1.0  },
      { name: 'Update compliance logger',           assignTo: 'supervisor', estimatedHours: 0.25 },
    ],
    totalRuns: 19, avgCompletionH: 22.4,
  },
];

const CUSTOM_KEY = 'nexum_custom_workflows';
const RUN_LOG_KEY = 'nexum_workflow_run_log';

const loadCustom = (): WorkflowTemplate[] => {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
};
const loadRunLog = (): any[] => {
  try { return JSON.parse(localStorage.getItem(RUN_LOG_KEY) || '[]'); } catch { return []; }
};

// ── Empty form ────────────────────────────────────────────────────────────────
const emptyTemplate = (): Omit<WorkflowTemplate, 'id'> => ({
  name: '', system: 'general', description: '', triggers: [''],
  steps: [{ name: '', assignTo: 'technician', estimatedHours: 1 }],
});

// ── Component ─────────────────────────────────────────────────────────────────
const Workflows = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch]         = useState('');
  const [runningId, setRunningId]   = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [runLog, setRunLog]         = useState<any[]>(loadRunLog());
  const [customTemplates, setCustomTemplates] = useState<WorkflowTemplate[]>(loadCustom());
  const [showCreate, setShowCreate] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState(emptyTemplate());
  const [activeTab, setActiveTab]   = useState<'templates' | 'history' | 'insights'>('templates');

  useEffect(() => { fetchRecentRuns(); }, []);

  const fetchRecentRuns = async () => {
    try {
      const data = await apiRequest('/work-orders');
      const wos = (data.workOrders || data.items || []).slice(0, 10);
      setRecentRuns(wos);
    } catch { /* keep empty */ }
  };

  const allTemplates = [...BUILT_IN, ...customTemplates];
  const filtered = allTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.system.toLowerCase().includes(search.toLowerCase())
  );

  const handleRun = async (template: WorkflowTemplate) => {
    setRunningId(template.id);
    const firstStep = template.steps[0];
    const totalHours = template.steps.reduce((s, st) => s + st.estimatedHours, 0);
    const slaType = template.name.toLowerCase().includes('emergency') ? 'emergency'
                  : template.name.toLowerCase().includes('compliance') ? 'compliance'
                  : template.name.toLowerCase().includes('pm') ? 'pm' : 'general';
    const slaHours = SLA_TARGETS[slaType];
    const dueDate = new Date(Date.now() + slaHours * 3600000).toISOString();

    try {
      await apiRequest('/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          title: `[WF] ${template.name} — ${firstStep.name}`,
          description: template.description,
          systemType: template.system,
          priority: slaType === 'emergency' ? 'critical' : 'high',
          status: 'backlog',
          facilityId: user?.facilityId,
          estimatedHours: totalHours,
          category: 'workflow',
          workflowTemplate: template.name,
          dueDate,
        }),
      });

      // Auto-create an Evidence Board draft for compliance/emergency workflows
      if (slaType === 'compliance' || slaType === 'emergency') {
        try {
          const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
          const baseUrl = import.meta.env.VITE_API_BASE_URL;
          await fetch(baseUrl + '/evidence-boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              title: `Investigation: ${template.name}`,
              description: `Auto-created from workflow run. ${template.description}`,
              category: slaType === 'compliance' ? 'compliance' : 'safety',
              priority: slaType === 'emergency' ? 'critical' : 'high',
            }),
          });
          toast({ title: 'Workflow Started', description: `"${template.name}" WO created + Evidence Board opened. SLA: ${slaHours}h.` });
        } catch {
          toast({ title: 'Workflow Started', description: `"${template.name}" WO created. SLA: ${slaHours}h.` });
        }
      } else {
        toast({ title: 'Workflow Started', description: `"${template.name}" WO created. SLA: ${slaHours}h.` });
      }

      const entry = { id: Date.now(), templateId: template.id, templateName: template.name, startedAt: new Date().toISOString(), slaHours, status: 'running' };
      const updated = [entry, ...runLog].slice(0, 50);
      setRunLog(updated);
      localStorage.setItem(RUN_LOG_KEY, JSON.stringify(updated));
      await fetchRecentRuns();
    } catch {
      // Fallback: log locally even if API failed
      const entry = { id: Date.now(), templateId: template.id, templateName: template.name, startedAt: new Date().toISOString(), slaHours, status: 'local' };
      const updated = [entry, ...runLog].slice(0, 50);
      setRunLog(updated);
      localStorage.setItem(RUN_LOG_KEY, JSON.stringify(updated));
      toast({ title: 'Workflow Logged Locally', description: 'API unavailable — run logged locally.', variant: 'default' });
    } finally {
      setRunningId(null);
    }
  };

  const handleClone = (template: WorkflowTemplate) => {
    const clone: WorkflowTemplate = { ...template, id: `custom-${Date.now()}`, name: `${template.name} (Copy)`, builtIn: false };
    const updated = [...customTemplates, clone];
    setCustomTemplates(updated);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    toast({ title: 'Workflow Cloned', description: 'Edit the copy and save it as your custom template.' });
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  };

  const handleSaveCustom = () => {
    if (!draftTemplate.name || draftTemplate.steps.some(s => !s.name)) {
      toast({ title: 'Incomplete', description: 'Name and all step names are required.', variant: 'destructive' });
      return;
    }
    const newTemplate: WorkflowTemplate = { ...draftTemplate, id: `custom-${Date.now()}` };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    setDraftTemplate(emptyTemplate());
    setShowCreate(false);
    toast({ title: 'Workflow Saved', description: `"${newTemplate.name}" is now available.` });
  };

  // Insights: runs per template
  const runCounts: Record<string, number> = {};
  runLog.forEach(r => { runCounts[r.templateName] = (runCounts[r.templateName] || 0) + 1; });
  const topRun = Object.entries(runCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const TABS = [
    { key: 'templates', label: `Templates (${allTemplates.length})` },
    { key: 'history',   label: `Run Log (${runLog.length})` },
    { key: 'insights',  label: 'Insights' },
  ] as const;

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Workflows</h1>
            <p className="text-sm text-muted-foreground">{BUILT_IN.length} built-in · {customTemplates.length} custom · Run to create work orders automatically</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-40" />
            </div>
            <Button size="sm" onClick={() => setShowCreate(v => !v)}>
              <Plus className="w-4 h-4 mr-1" />New
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/40">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Create form ────────────────────────────────────────────────────── */}
        {showCreate && activeTab === 'templates' && (
          <Card className="glass-panel border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">Create Custom Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Workflow name *" value={draftTemplate.name}
                  onChange={e => setDraftTemplate(d => ({ ...d, name: e.target.value }))} />
                <select className="text-sm bg-background border border-border/40 rounded px-2 py-1.5"
                  value={draftTemplate.system} onChange={e => setDraftTemplate(d => ({ ...d, system: e.target.value }))}>
                  {['general', 'boiler', 'chiller', 'hvac', 'electrical', 'pump', 'ahu'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Input placeholder="Description" value={draftTemplate.description}
                onChange={e => setDraftTemplate(d => ({ ...d, description: e.target.value }))} />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Steps</p>
                {draftTemplate.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <span className="text-xs text-muted-foreground w-4 pt-2">{i + 1}</span>
                    <Input className="flex-1 text-xs" placeholder="Step name *" value={step.name}
                      onChange={e => setDraftTemplate(d => ({ ...d, steps: d.steps.map((s, j) => j === i ? { ...s, name: e.target.value } : s) }))} />
                    <select className="text-xs bg-background border border-border/40 rounded px-1.5 py-1"
                      value={step.assignTo} onChange={e => setDraftTemplate(d => ({ ...d, steps: d.steps.map((s, j) => j === i ? { ...s, assignTo: e.target.value } : s) }))}>
                      {['technician', 'supervisor', 'manager', 'engineer', 'operator'].map(r => <option key={r}>{r}</option>)}
                    </select>
                    <Input type="number" className="w-16 text-xs" min={0.25} step={0.25} value={step.estimatedHours}
                      onChange={e => setDraftTemplate(d => ({ ...d, steps: d.steps.map((s, j) => j === i ? { ...s, estimatedHours: parseFloat(e.target.value) || 1 } : s) }))} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      onClick={() => setDraftTemplate(d => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs mt-1"
                  onClick={() => setDraftTemplate(d => ({ ...d, steps: [...d.steps, { name: '', assignTo: 'technician', estimatedHours: 1 }] }))}>
                  <Plus className="w-3 h-3 mr-1" />Add Step
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveCustom}>Save Workflow</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setDraftTemplate(emptyTemplate()); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Templates tab ─────────────────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(template => {
              const totalH = template.steps.reduce((s, st) => s + st.estimatedHours, 0);
              const slaType = template.name.toLowerCase().includes('emergency') ? 'emergency'
                            : template.name.toLowerCase().includes('compliance') ? 'compliance'
                            : template.name.toLowerCase().includes('pm') ? 'pm' : 'general';
              const slaH = SLA_TARGETS[slaType];
              const slaColor = slaType === 'emergency' ? 'text-red-400 border-red-400/30' :
                               slaType === 'compliance' ? 'text-yellow-400 border-yellow-400/30' : 'text-green-400 border-green-400/30';
              return (
                <Card key={template.id} className="glass-panel hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{systemIcons[template.system] || '🔧'}</span>
                        <div>
                          <p className="text-sm font-semibold">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{template.builtIn ? 'Built-in' : 'Custom'}</Badge>
                        <Badge variant="outline" className={cn('text-[10px]', slaColor)}>SLA {slaH}h</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Steps */}
                    <div className="space-y-1.5">
                      {template.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-medium shrink-0">{i + 1}</div>
                          <span className="flex-1 truncate">{step.name}</span>
                          <span className="shrink-0 opacity-60 text-[10px]">{step.assignTo}</span>
                          <span className="shrink-0 opacity-60">{step.estimatedHours}h</span>
                        </div>
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalH}h est.</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{[...new Set(template.steps.map(s => s.assignTo))].join(', ')}</span>
                      {(template.totalRuns || 0) > 0 && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{template.totalRuns} runs</span>}
                      {template.avgCompletionH && <span className="flex items-center gap-1 text-green-400">avg {template.avgCompletionH}h</span>}
                    </div>

                    {/* Triggers */}
                    <div className="flex flex-wrap gap-1">
                      {template.triggers.map((t, i) => <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => handleRun(template)} disabled={runningId === template.id}>
                        {runningId === template.id
                          ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
                          : <><Play className="w-3.5 h-3.5 mr-1.5" />Run Workflow</>
                        }
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleClone(template)} title="Clone"><Copy className="w-3.5 h-3.5" /></Button>
                      {!template.builtIn && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCustom(template.id)} className="text-destructive hover:bg-destructive/10" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── History tab ────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {runLog.length === 0 && recentRuns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No workflow runs yet. Run a template above.</div>
            ) : (
              <>
                {runLog.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Workflow Run Log</h3>
                    <div className="space-y-2">
                      {runLog.slice(0, 20).map((run, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{run.templateName}</p>
                            <p className="text-xs text-muted-foreground">SLA: {run.slaHours}h · Started: {new Date(run.startedAt).toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className={cn('text-[10px]', run.status === 'running' ? 'text-blue-400 border-blue-400/30' : 'text-muted-foreground')}>{run.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {recentRuns.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold mt-4">Recent Work Orders</h3>
                    <div className="space-y-2">
                      {recentRuns.map((wo: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="flex-1 truncate">{wo.title || wo.description}</span>
                          <Badge variant="outline" className="text-xs">{wo.status || 'open'}</Badge>
                          <span className="text-xs text-muted-foreground shrink-0">{wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Insights tab ──────────────────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Runs',      value: runLog.length, color: 'text-primary' },
                { label: 'This Week',       value: runLog.filter(r => Date.now() - new Date(r.startedAt).getTime() < 7*86400000).length, color: 'text-blue-400' },
                { label: 'Templates Used',  value: Object.keys(runCounts).length, color: 'text-green-400' },
                { label: 'SLA Types',       value: Object.keys(SLA_TARGETS).length, color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <Card key={label} className="glass-panel">
                  <CardContent className="p-4 text-center">
                    <p className={cn('text-2xl font-bold', color)}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-panel">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Most-Used Templates</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {topRun.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No runs yet.</p>
                ) : topRun.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm flex-1 truncate">{name}</span>
                    <span className="text-sm font-semibold text-primary">{count}×</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="pb-2"><CardTitle className="text-sm">SLA Targets by Work Type</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(SLA_TARGETS).map(([type, hours]) => {
                  const color = type === 'emergency' ? 'text-red-400' : type === 'compliance' ? 'text-yellow-400' : 'text-green-400';
                  return (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className={cn('capitalize font-medium', color)}>{type}</span>
                      <span className="text-muted-foreground">{hours}h SLA</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Workflows;
