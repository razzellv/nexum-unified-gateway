import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, ChevronDown, ChevronUp, Search, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

type DecisionType = 'Equipment Selection' | 'Capital Project' | 'Emergency Response' | 'Policy Change' | 'Contract Award' | 'Infrastructure Investment' | 'Personnel' | 'Other';

interface Decision {
  id: string;
  title: string;
  date: string;
  type: DecisionType;
  department: string;
  decisionMakers: string;
  reasoning: string;
  supportingEvidence: string;
  expectedOutcome: string;
  lessonsLearned: string;
}

const EMPTY_DECISION: Omit<Decision, 'id'> = {
  title: '', date: '', type: 'Capital Project', department: '',
  decisionMakers: '', reasoning: '', supportingEvidence: '', expectedOutcome: '', lessonsLearned: '',
};

const DECISION_TYPES: DecisionType[] = [
  'Equipment Selection', 'Capital Project', 'Emergency Response', 'Policy Change',
  'Contract Award', 'Infrastructure Investment', 'Personnel', 'Other',
];

function defensibilityScore(d: Decision): number {
  let score = 0;
  if (d.reasoning.trim()) score += 25;
  if (d.supportingEvidence.trim()) score += 25;
  if (d.expectedOutcome.trim()) score += 25;
  if (d.lessonsLearned.trim()) score += 25;
  return score;
}

function scoreBadge(score: number): string {
  if (score >= 75) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

function typeBadge(t: string): string {
  const map: Record<string, string> = {
    'Capital Project': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Emergency Response': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Equipment Selection': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Infrastructure Investment': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Policy Change': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'Contract Award': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Personnel': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  };
  return map[t] || 'bg-muted text-muted-foreground border-border';
}

function generateGovernanceHealth(decisions: Decision[]): string[] {
  if (decisions.length === 0) return ['Add decisions to generate governance health assessment.'];
  const insights: string[] = [];
  const avgScore = decisions.length > 0
    ? Math.round(decisions.reduce((s, d) => s + defensibilityScore(d), 0) / decisions.length)
    : 0;
  const missingEvidence = decisions.filter(d => !d.supportingEvidence.trim()).length;
  const missingLessons = decisions.filter(d => !d.lessonsLearned.trim()).length;
  const missingReasoning = decisions.filter(d => !d.reasoning.trim()).length;

  insights.push(`Average Decision Defensibility Score: ${avgScore}/100 — ${avgScore >= 75 ? 'Strong governance posture' : avgScore >= 50 ? 'Moderate — improve documentation' : 'Weak — decisions are vulnerable to challenge'}.`);
  if (missingEvidence > 0) insights.push(`${missingEvidence} decision(s) lack supporting evidence — these are most vulnerable to legal or audit challenge.`);
  if (missingLessons > 0) insights.push(`${missingLessons} decision(s) missing lessons learned — institutional knowledge loss risk.`);
  if (missingReasoning > 0) insights.push(`${missingReasoning} decision(s) have no documented reasoning — add rationale to improve defensibility.`);
  insights.push(`${decisions.length} total decisions archived — a complete registry supports leadership transitions and OPRA/FOIA requests.`);
  return insights.slice(0, 5);
}

export default function GovDecisionRegistry() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [form, setForm] = useState({ ...EMPTY_DECISION });
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_decisions');
    if (raw) { try { setDecisions(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save(list: Decision[]) {
    localStorage.setItem('nexum_gov_decisions', JSON.stringify(list));
    setDecisions(list);
  }

  function addDecision() {
    if (!form.title.trim()) return;
    save([{ ...form, id: Date.now().toString() }, ...decisions]);
    setForm({ ...EMPTY_DECISION });
    setShowForm(false);
  }

  function removeDecision(id: string) { save(decisions.filter(d => d.id !== id)); }

  const allDepts = [...new Set(decisions.map(d => d.department).filter(Boolean))];

  const filtered = decisions.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.department.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.type === filterType;
    const matchDept = filterDept === 'all' || d.department === filterDept;
    return matchSearch && matchType && matchDept;
  });

  const avgScore = decisions.length > 0
    ? Math.round(decisions.reduce((s, d) => s + defensibilityScore(d), 0) / decisions.length) : 0;
  const missingEvidence = decisions.filter(d => !d.supportingEvidence.trim()).length;
  const missingLessons = decisions.filter(d => !d.lessonsLearned.trim()).length;
  const insights = generateGovernanceHealth(decisions);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Decision Continuity Registry™</h1>
              <p className="text-muted-foreground text-sm">Permanent archive of major government decisions with defensibility scoring</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Decision
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{decisions.length}</div>
              <div className="text-xs text-muted-foreground">Total Decisions</div>
            </CardContent>
          </Card>
          <Card className="border-violet-500/30 bg-violet-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{avgScore}</div>
              <div className="text-xs text-muted-foreground">Avg Defensibility</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{missingEvidence}</div>
              <div className="text-xs text-muted-foreground">Missing Evidence</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{missingLessons}</div>
              <div className="text-xs text-muted-foreground">Missing Lessons</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Record New Decision</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Decision Title *</label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Concise decision title" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Decision Type</label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as DecisionType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DECISION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Department</label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. DPW, Finance" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Decision Makers</label>
                <Input value={form.decisionMakers} onChange={e => setForm(p => ({ ...p, decisionMakers: e.target.value }))} placeholder="Names/titles" />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Reasoning (+25 points)</label>
                <Textarea value={form.reasoning} onChange={e => setForm(p => ({ ...p, reasoning: e.target.value }))} placeholder="Why was this decision made?" className="h-16 text-xs" />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Supporting Evidence (+25 points)</label>
                <Textarea value={form.supportingEvidence} onChange={e => setForm(p => ({ ...p, supportingEvidence: e.target.value }))} placeholder="Data, reports, studies that supported this decision" className="h-16 text-xs" />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Expected Outcome (+25 points)</label>
                <Textarea value={form.expectedOutcome} onChange={e => setForm(p => ({ ...p, expectedOutcome: e.target.value }))} placeholder="What outcome is expected from this decision?" className="h-16 text-xs" />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Lessons Learned (+25 points)</label>
                <Textarea value={form.lessonsLearned} onChange={e => setForm(p => ({ ...p, lessonsLearned: e.target.value }))} placeholder="What was learned from this decision?" className="h-16 text-xs" />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button onClick={addDecision} className="flex-1">Save Decision</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter/Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search decisions..." className="pl-8 h-8 text-xs" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DECISION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {allDepts.length > 0 && (
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Depts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {allDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Decision Cards */}
        {filtered.length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {decisions.length === 0 ? 'No decisions recorded yet. Click "Add Decision" to begin.' : 'No decisions match your filters.'}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map(d => {
            const score = defensibilityScore(d);
            const isExp = expanded[d.id];
            return (
              <Card key={d.id} className="border-border bg-card">
                <button className="w-full text-left" onClick={() => setExpanded(prev => ({ ...prev, [d.id]: !prev[d.id] }))}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5" />}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{d.title}</span>
                            <Badge variant="outline" className={cn('text-xs border', typeBadge(d.type))}>{d.type}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {d.date && <span>{d.date}</span>}
                            {d.department && <span>{d.department}</span>}
                            {d.decisionMakers && <span>By: {d.decisionMakers}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-xs border shrink-0', scoreBadge(score))}>
                        {score}/100
                      </Badge>
                    </div>
                  </CardHeader>
                </button>

                {isExp && (
                  <CardContent className="pt-0 space-y-3">
                    {d.reasoning && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reasoning</h4>
                        <p className="text-xs text-foreground">{d.reasoning}</p>
                      </div>
                    )}
                    {d.supportingEvidence && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Supporting Evidence</h4>
                        <p className="text-xs text-foreground">{d.supportingEvidence}</p>
                      </div>
                    )}
                    {d.expectedOutcome && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected Outcome</h4>
                        <p className="text-xs text-foreground">{d.expectedOutcome}</p>
                      </div>
                    )}
                    {d.lessonsLearned && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lessons Learned</h4>
                        <p className="text-xs text-foreground">{d.lessonsLearned}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => removeDecision(d.id)} className="text-xs text-destructive hover:underline">Remove</button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* AI Governance Health */}
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-violet-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> AI Governance Health Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground">
                  <span className="text-violet-400 font-bold shrink-0">•</span> {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
