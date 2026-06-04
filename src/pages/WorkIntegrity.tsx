import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain, Clock, AlertTriangle, CheckCircle, XCircle, Target, Users, Zap,
  ArrowRight, Plus, RefreshCw, Calendar, Timer, Shield, TrendingUp,
  Lightbulb, ChevronDown, Check,
} from 'lucide-react';
import {
  listWITasks,
  createWITask,
  updateWITask,
  reviewWITask,
  getWIDeadlines,
  getCriticalPath,
  getCompetencyMatch,
  getWIPerformance,
  runAICritique,
  type WorkIntegrityTask,
  type CriticalPathData,
  type AICritiqueResult,
  type CompetencyRecommendation,
} from '@/lib/nexum-api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deadlineBadge(ds: string) {
  if (ds === 'overdue') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (ds === 'at_risk') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

function priorityBadge(p: string) {
  if (p === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (p === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (p === 'normal') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-muted/20 text-muted-foreground border-border';
}

function riskBadge(r: string) {
  if (r === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (r === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

function viabilityBadge(v: string) {
  if (v === 'unrealistic') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (v === 'tight') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

function formatDeadline(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreColor(n: number) {
  if (n >= 80) return 'text-green-400';
  if (n >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

const TASK_TYPES = ['wo', 'pm', 'report', 'check', 'compliance', 'inspection'];
const PRIORITIES = ['low', 'normal', 'high', 'critical'];

const emptyForm = {
  title: '',
  taskType: 'wo' as WorkIntegrityTask['taskType'],
  systemType: '',
  department: '',
  priority: 'normal' as WorkIntegrityTask['priority'],
  deadline: '',
  estimatedDurationHours: 4,
  description: '',
  assignedTo: '',
};

// ── Create Task Modal ─────────────────────────────────────────────────────────

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [competencyRecs, setCompetencyRecs] = useState<CompetencyRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const findBest = async () => {
    setLoadingRecs(true);
    setShowRecs(true);
    try {
      const res = await getCompetencyMatch(form.taskType, form.systemType, form.department);
      setCompetencyRecs((res as any).recommendations || []);
    } catch {
      setCompetencyRecs([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const submit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await createWITask(form as any);
      onCreated();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New Work Integrity Task</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><XCircle className="w-4 h-4" /></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <input
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Task Type</label>
            <select
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.taskType}
              onChange={e => set('taskType', e.target.value)}
            >
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
            <select
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">System Type</label>
            <input
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.systemType}
              onChange={e => set('systemType', e.target.value)}
              placeholder="e.g. HVAC, Electrical"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Department</label>
            <input
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="e.g. Engineering"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
            <input
              type="date"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Estimated Hours</label>
            <input
              type="number"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={form.estimatedDurationHours}
              onChange={e => set('estimatedDurationHours', Number(e.target.value))}
              min={0}
            />
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Assign To</label>
              <input
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.assignedTo}
                onChange={e => set('assignedTo', e.target.value)}
                placeholder="Name or ID"
              />
            </div>
            <Button variant="outline" size="sm" onClick={findBest} className="shrink-0 gap-1">
              <Brain className="w-3.5 h-3.5" />
              Find Best Assignee
            </Button>
          </div>

          {showRecs && (
            <div className="md:col-span-2 space-y-2">
              {loadingRecs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Finding best match...
                </div>
              ) : competencyRecs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found in system yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">Top Matches:</p>
                  {competencyRecs.map((r, i) => (
                    <div
                      key={r.employeeId}
                      className="p-3 rounded-lg border border-border bg-muted/20 cursor-pointer hover:border-primary/50 transition-all flex items-center justify-between"
                      onClick={() => set('assignedTo', r.employeeName)}
                    >
                      <div>
                        <span className="font-medium text-sm">{r.employeeName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.reasoning}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${scoreColor(r.competencyScore)}`}>{r.competencyScore}</span>
                        {i === 0 && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Best</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-24 resize-none"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the task..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title} className="gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Task
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Task Board ─────────────────────────────────────────────────────────

function TaskBoard({
  tasks,
  onRefresh,
}: {
  tasks: WorkIntegrityTask[];
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);

  const filtered = tasks.filter(t =>
    (!filterStatus || t.status === filterStatus) &&
    (!filterType || t.taskType === filterType) &&
    (!filterDept || t.department === filterDept)
  );

  const handleReview = async (sk: string, approved: boolean) => {
    setReviewing(sk);
    try {
      await reviewWITask(sk, { approved, note: '' });
      onRefresh();
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-4">
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={onRefresh}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['pending_review','approved','in_progress','completed','overdue','at_risk','cancelled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none w-32"
            placeholder="Department"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No tasks found. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground">Type</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Title</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Assigned To</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Deadline</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Est Hrs</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.SK} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.department && <p className="text-xs text-muted-foreground">{task.department}</p>}
                    </div>
                  </td>
                  <td className="p-3 text-sm">{task.assignedTo || '—'}</td>
                  <td className="p-3 text-sm">{formatDeadline(task.deadline)}</td>
                  <td className="p-3 text-sm">{task.estimatedDurationHours}h</td>
                  <td className="p-3">
                    <Badge className={`text-[10px] border ${deadlineBadge(task.deadlineStatus)}`}>
                      {task.deadlineStatus}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {task.status === 'pending_review' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 text-green-400 border-green-500/30"
                          disabled={reviewing === task.SK}
                          onClick={() => handleReview(task.SK, true)}
                        >
                          <Check className="w-3 h-3" /> Review
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Critical Path ──────────────────────────────────────────────────────

function CriticalPathTab({ data }: { data: CriticalPathData | null }) {
  if (!data) return (
    <Card><CardContent className="p-8 text-center text-muted-foreground">Loading critical path data...</CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Open Tasks', value: data.tasks.length, icon: Target, color: 'text-primary' },
          { label: 'Overdue', value: data.overdueCount, icon: XCircle, color: data.overdueCount > 0 ? 'text-red-400' : 'text-muted-foreground' },
          { label: 'At Risk', value: data.atRiskCount, icon: AlertTriangle, color: data.atRiskCount > 0 ? 'text-amber-400' : 'text-muted-foreground' },
          { label: 'Completed This Week', value: data.completedThisWeek, icon: CheckCircle, color: 'text-green-400' },
        ].map(({ label, value, icon: Ic, color }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Ic className={`w-8 h-8 ${color} shrink-0`} />
              <div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.earliestCompletion && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Optimistic Completion (all open tasks)</p>
              <p className="text-lg font-bold text-primary">
                {new Date(data.earliestCompletion).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-muted-foreground">Total estimated: {data.totalEstimatedHours}h</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.criticalTasks.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <Target className="w-4 h-4" /> Critical Tasks ({data.criticalTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.criticalTasks.map(t => (
              <div key={t.SK} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDeadline(t.deadline)}</span>
                    {t.assignedTo && <span className="text-xs text-muted-foreground">· {t.assignedTo}</span>}
                    <span className="text-xs text-muted-foreground">· {t.estimatedDurationHours}h</span>
                  </div>
                </div>
                <Badge className={`text-[10px] border shrink-0 ${deadlineBadge(t.deadlineStatus)}`}>
                  {t.deadlineStatus}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.atRisk.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" /> At Risk — Due within 48h ({data.atRisk.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.atRisk.map(t => (
              <div key={t.SK} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDeadline(t.deadline)}</span>
                    {t.assignedTo && <span className="text-xs text-muted-foreground">· {t.assignedTo}</span>}
                  </div>
                </div>
                <Badge className="text-[10px] border bg-amber-500/20 text-amber-400 border-amber-500/30">at_risk</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab 3: Deadlines ──────────────────────────────────────────────────────────

function DeadlinesTab({ deadlines }: { deadlines: any }) {
  if (!deadlines) return (
    <Card><CardContent className="p-8 text-center text-muted-foreground">Loading deadlines...</CardContent></Card>
  );

  const sections = [
    { key: 'overdue', label: 'Overdue', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5', items: deadlines.overdue || [] },
    { key: 'due_today', label: 'Due Today', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5', items: deadlines.due_today || [] },
    { key: 'due_this_week', label: 'This Week', color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', items: deadlines.due_this_week || [] },
    { key: 'upcoming', label: 'Upcoming', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5', items: deadlines.upcoming || [] },
  ];

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <Card key={section.key} className={`border ${section.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm flex items-center gap-2 ${section.color}`}>
              <Calendar className="w-4 h-4" />
              {section.label}
              <Badge className="ml-auto text-[10px]">{section.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          {section.items.length > 0 && (
            <CardContent className="space-y-2">
              {section.items.map((t: WorkIntegrityTask) => (
                <div key={t.SK} className={`p-3 rounded-lg ${section.bg} flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0">{t.taskType}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.assignedTo || 'Unassigned'} · {formatDeadline(t.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.reviews && t.reviews.some(r => r.approved) ? (
                      <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Reviewed</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-muted/20 text-muted-foreground border-border">Pending Review</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
          {section.items.length === 0 && (
            <CardContent>
              <p className="text-xs text-muted-foreground text-center py-2">None</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── Tab 4: AI Critique ────────────────────────────────────────────────────────

function AICritiqueTab() {
  const [form, setForm] = useState({
    title: '', description: '', taskType: 'wo', systemType: '',
    estimatedDurationHours: 4, deadline: '',
  });
  const [result, setResult] = useState<AICritiqueResult | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const runCritique = async () => {
    if (!form.title) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await runAICritique(form as any);
      setResult(r as AICritiqueResult);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> AI Assumption Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Task or requirement title"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Task Type</label>
              <select
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.taskType}
                onChange={e => set('taskType', e.target.value)}
              >
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">System Type</label>
              <input
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.systemType}
                onChange={e => set('systemType', e.target.value)}
                placeholder="e.g. HVAC"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estimated Hours</label>
              <input
                type="number"
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.estimatedDurationHours}
                onChange={e => set('estimatedDurationHours', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
              <input
                type="date"
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the task..."
              />
            </div>
          </div>
          <Button onClick={runCritique} disabled={loading || !form.title} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Run Critique
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Running AI analysis...</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall Risk:</span>
              <Badge className={`border ${riskBadge(result.overallRisk)}`}>{result.overallRisk}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Deadline Viability:</span>
              <Badge className={`border ${viabilityBadge(result.deadlineViability)}`}>{result.deadlineViability}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Critical Path Risk:</span>
              <Badge className={`border ${riskBadge(result.criticalPathRisk)}`}>{result.criticalPathRisk}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-blue-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Timer className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Optimistic Hours</p>
                  <p className="text-xl font-bold text-blue-400">{result.estimatedOptimisticHours}h</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Pessimistic Hours</p>
                  <p className="text-xl font-bold text-red-400">{result.estimatedPessimisticHours}h</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {result.assumptions && result.assumptions.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Assumptions ({result.assumptions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.assumptions.map((a, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium flex-1">{a.text}</p>
                      <Badge className={`text-[10px] border shrink-0 ${riskBadge(a.risk)}`}>{a.risk}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.efficiencyGains && result.efficiencyGains.length > 0 && (
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                  <Zap className="w-4 h-4" /> Efficiency Gains
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.efficiencyGains.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-500/20">
                    <span className="text-sm">{g.description}</span>
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                      -{g.estimatedTimeSavingHours}h
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.simplifications && result.simplifications.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" /> Simplifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.simplifications.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.competencyNotes && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Competency Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.competencyNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Team Performance ───────────────────────────────────────────────────

function TeamPerformanceTab() {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWIPerformance()
      .then(r => setPerformance(r))
      .catch(() => setPerformance(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Card><CardContent className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" /></CardContent></Card>
  );

  if (!performance) return (
    <Card><CardContent className="p-8 text-center text-muted-foreground">No performance data available.</CardContent></Card>
  );

  const stats = performance.facilityStats || {};
  const employees = performance.employees || [];

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Tasks', value: stats.totalTasks },
            { label: 'Completed', value: stats.completedTasks },
            { label: 'Overdue', value: stats.overdueCount },
            { label: 'On-Time Rate', value: `${stats.onTimeRate}%` },
            { label: 'Avg Competency', value: stats.avgCompetencyScore },
          ].map(({ label, value }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-primary">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {employees.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            No employee performance data yet. Complete tasks to see statistics.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground">Employee</th>
                <th className="text-left p-3 text-xs text-muted-foreground">Department</th>
                <th className="text-right p-3 text-xs text-muted-foreground">Completed</th>
                <th className="text-right p-3 text-xs text-muted-foreground">Overdue</th>
                <th className="text-right p-3 text-xs text-muted-foreground">On-Time %</th>
                <th className="text-right p-3 text-xs text-muted-foreground">Avg Hrs</th>
                <th className="text-right p-3 text-xs text-muted-foreground">Competency</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => (
                <tr key={emp.employeeId} className="border-b border-border/50 hover:bg-muted/10">
                  <td className="p-3 font-medium text-sm">{emp.employeeName}</td>
                  <td className="p-3 text-sm text-muted-foreground">{emp.department || '—'}</td>
                  <td className="p-3 text-right text-sm">{emp.tasksCompleted}</td>
                  <td className="p-3 text-right">
                    <span className={emp.tasksOverdue > 0 ? 'text-red-400 font-semibold' : 'text-sm'}>{emp.tasksOverdue}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`text-sm font-semibold ${emp.onTimeRate >= 80 ? 'text-green-400' : emp.onTimeRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {emp.onTimeRate}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm">{emp.avgDurationHours}h</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold text-sm ${scoreColor(emp.competencyScore)}`}>{emp.competencyScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'board', label: 'Task Board', icon: Shield },
  { id: 'critical', label: 'Critical Path', icon: Target },
  { id: 'deadlines', label: 'Deadlines', icon: Calendar },
  { id: 'critique', label: 'AI Critique', icon: Brain },
  { id: 'performance', label: 'Team Performance', icon: TrendingUp },
];

export default function WorkIntegrity() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<WorkIntegrityTask[]>([]);
  const [criticalPath, setCriticalPath] = useState<CriticalPathData | null>(null);
  const [deadlines, setDeadlines] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, cpRes, dlRes] = await Promise.allSettled([
        listWITasks(),
        getCriticalPath(),
        getWIDeadlines(),
      ]);
      if (tasksRes.status === 'fulfilled') setTasks((tasksRes.value as any).tasks || []);
      if (cpRes.status === 'fulfilled') setCriticalPath(cpRes.value as CriticalPathData);
      if (dlRes.status === 'fulfilled') setDeadlines(dlRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 text-primary" />
              Work Integrity Engine
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Deadline enforcement · Team review gates · AI assumption audit · Competency matching
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex gap-1 flex-wrap border-b border-border pb-0">
          {TABS.map(tab => {
            const Ic = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ic className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === 'board' && <TaskBoard tasks={tasks} onRefresh={loadData} />}
          {activeTab === 'critical' && <CriticalPathTab data={criticalPath} />}
          {activeTab === 'deadlines' && <DeadlinesTab deadlines={deadlines} />}
          {activeTab === 'critique' && <AICritiqueTab />}
          {activeTab === 'performance' && <TeamPerformanceTab />}
        </div>
      </div>
    </MainLayout>
  );
}
