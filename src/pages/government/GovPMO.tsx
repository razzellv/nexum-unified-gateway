import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Plus, ChevronDown, ChevronUp, X, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectPhase {
  name: string;
  status: 'Not Started' | 'In Progress' | 'Complete';
  notes: string;
  completion: number;
}

interface RiskEntry {
  id: string;
  description: string;
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

interface LessonEntry {
  id: string;
  lesson: string;
  phase: string;
}

interface PMOProject {
  id: string;
  name: string;
  agency: string;
  projectType: string;
  description: string;
  budget: number;
  startDate: string;
  expectedCompletion: string;
  projectManager: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  phases: ProjectPhase[];
  risks: RiskEntry[];
  lessons: LessonEntry[];
}

const PHASE_NAMES = [
  'Phase 1: Assessment',
  'Phase 2: Strategic Planning',
  'Phase 3: Funding Alignment',
  'Phase 4: Execution Planning',
  'Phase 5: Program Governance',
  'Phase 6: Outcome Verification',
];

function defaultPhases(): ProjectPhase[] {
  return PHASE_NAMES.map(name => ({ name, status: 'Not Started', notes: '', completion: 0 }));
}

const EMPTY_PROJECT: Omit<PMOProject, 'id' | 'phases' | 'risks' | 'lessons'> = {
  name: '', agency: '', projectType: 'Capital', description: '',
  budget: 0, startDate: '', expectedCompletion: '', projectManager: '', priority: 'Medium',
};

function priorityBadge(p: string): string {
  if (p === 'Critical') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (p === 'High') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (p === 'Medium') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
}

function typeBadge(t: string): string {
  if (t === 'Capital') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (t === 'Emergency') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (t === 'Compliance') return 'bg-green-500/20 text-green-300 border-green-500/30';
  if (t === 'Infrastructure') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function daysRemaining(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function avgPhaseProgress(phases: ProjectPhase[]): number {
  if (phases.length === 0) return 0;
  return Math.round(phases.reduce((s, p) => s + p.completion, 0) / phases.length);
}

export default function GovPMO() {
  const [projects, setProjects] = useState<PMOProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PROJECT });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('projects');

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_pmo_projects');
    if (raw) { try { setProjects(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save(list: PMOProject[]) {
    localStorage.setItem('nexum_gov_pmo_projects', JSON.stringify(list));
    setProjects(list);
  }

  function addProject() {
    if (!form.name.trim()) return;
    const project: PMOProject = {
      ...form, id: Date.now().toString(),
      phases: defaultPhases(), risks: [], lessons: [],
    };
    save([...projects, project]);
    setForm({ ...EMPTY_PROJECT });
    setShowForm(false);
  }

  function removeProject(id: string) { save(projects.filter(p => p.id !== id)); }

  function updatePhase(projectId: string, phaseIdx: number, updates: Partial<ProjectPhase>) {
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      const phases = p.phases.map((ph, i) => i === phaseIdx ? { ...ph, ...updates } : ph);
      return { ...p, phases };
    });
    save(updated);
  }

  function addRisk(projectId: string, risk: Omit<RiskEntry, 'id'>) {
    const updated = projects.map(p => p.id === projectId
      ? { ...p, risks: [...p.risks, { ...risk, id: Date.now().toString() }] }
      : p);
    save(updated);
  }

  function addLesson(projectId: string, lesson: Omit<LessonEntry, 'id'>) {
    const updated = projects.map(p => p.id === projectId
      ? { ...p, lessons: [...p.lessons, { ...lesson, id: Date.now().toString() }] }
      : p);
    save(updated);
  }

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const activeProjects = projects.filter(p => p.phases.some(ph => ph.status === 'In Progress')).length;
  const avgProgress = projects.length === 0 ? 0 : Math.round(projects.reduce((s, p) => s + avgPhaseProgress(p.phases), 0) / projects.length);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Government PMO™</h1>
              <p className="text-muted-foreground text-sm">Multi-phase project management for government programs</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Create Project
          </Button>
        </div>

        {/* Dashboard Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{projects.length}</div>
              <div className="text-xs text-muted-foreground">Total Projects</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{activeProjects}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-amber-400">{fmt$(totalBudget)}</div>
              <div className="text-xs text-muted-foreground">Total Budget</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{avgProgress}%</div>
              <div className="text-xs text-muted-foreground">Avg Progress</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Project Form */}
        {showForm && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">New Government Project</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Project Name *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Project name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Agency/Department</label>
                <Input value={form.agency} onChange={e => setForm(p => ({ ...p, agency: e.target.value }))} placeholder="Department name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Project Type</label>
                <Select value={form.projectType} onValueChange={v => setForm(p => ({ ...p, projectType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Capital', 'Operational', 'Compliance', 'Emergency', 'Infrastructure'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Budget ($)</label>
                <Input type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Expected Completion</label>
                <Input type="date" value={form.expectedCompletion} onChange={e => setForm(p => ({ ...p, expectedCompletion: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Project Manager</label>
                <Input value={form.projectManager} onChange={e => setForm(p => ({ ...p, projectManager: e.target.value }))} placeholder="PM name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as PMOProject['priority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Critical', 'High', 'Medium', 'Low'].map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Project description" className="h-16 text-xs" />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button onClick={addProject} className="flex-1">Create Project</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="risks">Risk Register</TabsTrigger>
            <TabsTrigger value="lessons">Knowledge Capture</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4 space-y-4">
            {projects.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  No projects yet. Click "Create Project" to get started.
                </CardContent>
              </Card>
            ) : projects.map(project => {
              const isExpanded = expanded[project.id];
              const avgProg = avgPhaseProgress(project.phases);
              const days = daysRemaining(project.expectedCompletion);
              const activePhaseIdx = project.phases.findIndex(ph => ph.status === 'In Progress');
              return (
                <Card key={project.id} className="border-border bg-card">
                  <button className="w-full text-left" onClick={() => setExpanded(prev => ({ ...prev, [project.id]: !prev[project.id] }))}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5" />}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{project.name}</span>
                              <Badge variant="outline" className={cn('text-xs border', typeBadge(project.projectType))}>{project.projectType}</Badge>
                              <Badge variant="outline" className={cn('text-xs border', priorityBadge(project.priority))}>{project.priority}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">{project.agency}</span>
                              <span className="text-xs text-muted-foreground">PM: {project.projectManager}</span>
                              {project.expectedCompletion && (
                                <span className={cn('text-xs', days < 30 ? 'text-red-400' : days < 90 ? 'text-amber-400' : 'text-muted-foreground')}>
                                  {days > 0 ? `${days}d remaining` : 'Overdue'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">{fmt$(project.budget)}</div>
                            <div className="text-xs text-muted-foreground">Budget</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-400">{avgProg}%</div>
                            <div className="text-xs text-muted-foreground">Progress</div>
                          </div>
                        </div>
                      </div>
                      <Progress value={avgProg} className="h-1.5 mt-2" />
                      {activePhaseIdx >= 0 && (
                        <p className="text-xs text-primary mt-1">Active: {project.phases[activePhaseIdx].name}</p>
                      )}
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}

                      {/* Phases */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Project Phases</h4>
                        <div className="space-y-3">
                          {project.phases.map((phase, idx) => (
                            <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">{phase.name}</span>
                                <Select
                                  value={phase.status}
                                  onValueChange={v => updatePhase(project.id, idx, { status: v as ProjectPhase['status'] })}
                                >
                                  <SelectTrigger className="w-32 h-6 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Started">Not Started</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-12">Completion</span>
                                <input
                                  type="range" min={0} max={100} value={phase.completion}
                                  onChange={e => updatePhase(project.id, idx, { completion: +e.target.value })}
                                  className="flex-1 h-1.5 accent-primary"
                                />
                                <span className="text-xs text-foreground w-8">{phase.completion}%</span>
                              </div>
                              <Input
                                value={phase.notes}
                                onChange={e => updatePhase(project.id, idx, { notes: e.target.value })}
                                placeholder="Phase notes..."
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); removeProject(project.id); }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove Project
                      </button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            <div className="space-y-4">
              {projects.map(project => (
                <Card key={project.id} className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{project.name} — Risk Register</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.risks.map(risk => (
                      <div key={risk.id} className="border border-border rounded p-2 text-xs">
                        <p className="text-foreground font-medium">{risk.description}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-muted-foreground">Prob: <span className={risk.probability === 'High' ? 'text-red-400' : risk.probability === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}>{risk.probability}</span></span>
                          <span className="text-muted-foreground">Impact: <span className={risk.impact === 'High' ? 'text-red-400' : risk.impact === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}>{risk.impact}</span></span>
                        </div>
                        {risk.mitigation && <p className="text-muted-foreground mt-1">Mitigation: {risk.mitigation}</p>}
                      </div>
                    ))}
                    <AddRiskForm onAdd={(r) => addRisk(project.id, r)} />
                  </CardContent>
                </Card>
              ))}
              {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Create projects first to manage risks.</p>}
            </div>
          </TabsContent>

          <TabsContent value="lessons" className="mt-4">
            <div className="space-y-4">
              {projects.map(project => (
                <Card key={project.id} className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{project.name} — Lessons Learned</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.lessons.map(lesson => (
                      <div key={lesson.id} className="border border-border rounded p-2 text-xs">
                        <p className="text-foreground">{lesson.lesson}</p>
                        {lesson.phase && <p className="text-muted-foreground mt-1">Phase: {lesson.phase}</p>}
                      </div>
                    ))}
                    <AddLessonForm onAdd={(l) => addLesson(project.id, l)} />
                  </CardContent>
                </Card>
              ))}
              {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Create projects first to capture lessons learned.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function AddRiskForm({ onAdd }: { onAdd: (r: Omit<RiskEntry, 'id'>) => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ description: '', probability: 'Medium' as RiskEntry['probability'], impact: 'Medium' as RiskEntry['impact'], mitigation: '' });

  function submit() {
    if (!form.description.trim()) return;
    onAdd(form);
    setForm({ description: '', probability: 'Medium', impact: 'Medium', mitigation: '' });
    setShow(false);
  }

  if (!show) return <Button variant="outline" size="sm" onClick={() => setShow(true)} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" />Add Risk</Button>;

  return (
    <div className="border border-border rounded p-3 space-y-2">
      <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Risk description" className="h-7 text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.probability} onValueChange={v => setForm(p => ({ ...p, probability: v as RiskEntry['probability'] }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Probability" /></SelectTrigger>
          <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
        </Select>
        <Select value={form.impact} onValueChange={v => setForm(p => ({ ...p, impact: v as RiskEntry['impact'] }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Impact" /></SelectTrigger>
          <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
        </Select>
      </div>
      <Input value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))} placeholder="Mitigation strategy" className="h-7 text-xs" />
      <div className="flex gap-2">
        <Button onClick={submit} size="sm" className="h-7 text-xs">Add</Button>
        <Button variant="outline" size="sm" onClick={() => setShow(false)} className="h-7 text-xs"><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

function AddLessonForm({ onAdd }: { onAdd: (l: Omit<LessonEntry, 'id'>) => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ lesson: '', phase: '' });

  function submit() {
    if (!form.lesson.trim()) return;
    onAdd(form);
    setForm({ lesson: '', phase: '' });
    setShow(false);
  }

  if (!show) return <Button variant="outline" size="sm" onClick={() => setShow(true)} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" />Add Lesson</Button>;

  return (
    <div className="border border-border rounded p-3 space-y-2">
      <Textarea value={form.lesson} onChange={e => setForm(p => ({ ...p, lesson: e.target.value }))} placeholder="Lesson learned..." className="h-16 text-xs" />
      <Input value={form.phase} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))} placeholder="Related phase (optional)" className="h-7 text-xs" />
      <div className="flex gap-2">
        <Button onClick={submit} size="sm" className="h-7 text-xs">Add</Button>
        <Button variant="outline" size="sm" onClick={() => setShow(false)} className="h-7 text-xs"><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}
