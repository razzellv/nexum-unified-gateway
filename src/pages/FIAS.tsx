import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Activity, Plus, ChevronRight, ChevronLeft, CheckCircle2, XCircle, MinusCircle, FileText, Users, Wrench, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

type Answer = 'Yes' | 'No' | 'Partial' | 'N/A';
type Stage = 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5';

interface Question {
  id: string;
  category: string;
  text: string;
  weight: number;
}

interface AnswerMap {
  [questionId: string]: { answer: Answer; note: string };
}

interface EquipmentIssue {
  id: string;
  system: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  age: string;
  recommendation: string;
}

interface StakeholderFeedback {
  id: string;
  role: string;
  feedback: string;
  rating: number;
}

interface FIASAssessment {
  id: string;
  clientFacilityId: string;
  date: string;
  mode: 'Quick' | 'Full';
  preparedBy: string;
  answers: AnswerMap;
  equipmentIssues: EquipmentIssue[];
  stakeholderFeedback: StakeholderFeedback[];
  execNotes: string;
  stage: Stage;
  ops: number;
}

const QUESTIONS: Question[] = [
  // Operations (weight 3)
  { id: 'q1', category: 'Operations', text: 'Are PM schedules documented and followed for all major systems?', weight: 3 },
  { id: 'q2', category: 'Operations', text: 'Are work orders tracked and completed within defined SLAs?', weight: 3 },
  { id: 'q3', category: 'Operations', text: 'Is there a written emergency response plan for equipment failures?', weight: 3 },
  { id: 'q4', category: 'Operations', text: 'Are operational logs maintained for HVAC, boiler, and chiller systems?', weight: 2 },
  { id: 'q5', category: 'Operations', text: 'Do staff receive annual training on equipment operation?', weight: 2 },
  { id: 'q6', category: 'Operations', text: 'Is there a formal vendor/contractor management process?', weight: 2 },
  // Energy (weight 3)
  { id: 'q7', category: 'Energy', text: 'Is utility consumption tracked monthly against a baseline?', weight: 3 },
  { id: 'q8', category: 'Energy', text: 'Has an energy audit been performed in the last 3 years?', weight: 3 },
  { id: 'q9', category: 'Energy', text: 'Are BAS/controls set points reviewed and optimized at least annually?', weight: 2 },
  { id: 'q10', category: 'Energy', text: 'Is lighting on occupancy-based controls?', weight: 2 },
  { id: 'q11', category: 'Energy', text: 'Is there a documented energy reduction goal in place?', weight: 2 },
  // Compliance (weight 4)
  { id: 'q12', category: 'Compliance', text: 'Are all required inspections (fire, elevator, boiler, etc.) current?', weight: 4 },
  { id: 'q13', category: 'Compliance', text: 'Is a compliance calendar maintained with due dates and reminders?', weight: 3 },
  { id: 'q14', category: 'Compliance', text: 'Are certificates of occupancy and permits filed and accessible?', weight: 3 },
  { id: 'q15', category: 'Compliance', text: 'Has a formal safety audit been conducted in the last 12 months?', weight: 3 },
  { id: 'q16', category: 'Compliance', text: 'Are hazmat/chemical storage areas in compliance?', weight: 3 },
  // Infrastructure (weight 3)
  { id: 'q17', category: 'Infrastructure', text: 'Has a condition assessment been performed on HVAC equipment?', weight: 3 },
  { id: 'q18', category: 'Infrastructure', text: 'Is boiler/chiller equipment within manufacturer service life?', weight: 3 },
  { id: 'q19', category: 'Infrastructure', text: 'Are electrical panels and distribution systems up to code?', weight: 3 },
  { id: 'q20', category: 'Infrastructure', text: 'Is the roof in good condition (no active leaks, recent inspection)?', weight: 2 },
  { id: 'q21', category: 'Infrastructure', text: 'Are plumbing systems (domestic hot water, drains) operating without issues?', weight: 2 },
  // Financial (weight 2)
  { id: 'q22', category: 'Financial', text: 'Is there a capital replacement plan (CRP) for major equipment?', weight: 3 },
  { id: 'q23', category: 'Financial', text: 'Is there a documented operating budget for facility maintenance?', weight: 2 },
  { id: 'q24', category: 'Financial', text: 'Are maintenance costs tracked and benchmarked per sqft?', weight: 2 },
  // Technology (weight 2)
  { id: 'q25', category: 'Technology', text: 'Is a CMMS or digital work order system in use?', weight: 3 },
  { id: 'q26', category: 'Technology', text: 'Is the BAS accessible remotely for monitoring?', weight: 2 },
  { id: 'q27', category: 'Technology', text: 'Are IoT sensors or submeters in place for energy monitoring?', weight: 2 },
  { id: 'q28', category: 'Technology', text: 'Is operational data stored and retrievable for at least 3 years?', weight: 2 },
  // Leadership (weight 2)
  { id: 'q29', category: 'Leadership', text: 'Is there a dedicated facility manager or director in role?', weight: 2 },
  { id: 'q30', category: 'Leadership', text: 'Does leadership receive regular facility performance reporting?', weight: 2 },
];

const QUICK_QUESTIONS = QUESTIONS.filter(q => q.weight >= 3);

const CATEGORIES = [...new Set(QUESTIONS.map(q => q.category))];

const SYSTEMS = ['HVAC', 'Boiler', 'Chiller', 'Electrical', 'Plumbing', 'Roof', 'Lighting', 'Controls', 'Other'];

const STAGE_LABELS: Record<Stage, string> = {
  'Stage 1': 'Reactive — No formal process',
  'Stage 2': 'Developing — Partial systems',
  'Stage 3': 'Managed — Most processes in place',
  'Stage 4': 'Optimized — Proactive, data-driven',
  'Stage 5': 'Advanced — AI/intelligence layer',
};

const OPS_STAGE: { min: number; max: number; stage: Stage }[] = [
  { min: 0, max: 39, stage: 'Stage 1' },
  { min: 40, max: 54, stage: 'Stage 2' },
  { min: 55, max: 69, stage: 'Stage 3' },
  { min: 70, max: 84, stage: 'Stage 4' },
  { min: 85, max: 100, stage: 'Stage 5' },
];

function calcOPS(questions: Question[], answers: AnswerMap): number {
  let earned = 0, total = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (!a || a.answer === 'N/A') continue;
    total += q.weight * 2;
    if (a.answer === 'Yes') earned += q.weight * 2;
    else if (a.answer === 'Partial') earned += q.weight;
  }
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}

function stageFromOPS(ops: number): Stage {
  return OPS_STAGE.find(s => ops >= s.min && ops <= s.max)?.stage ?? 'Stage 1';
}

function blankIssue(): EquipmentIssue {
  return { id: `issue-${Date.now()}`, system: 'HVAC', description: '', severity: 'Medium', age: '', recommendation: '' };
}

function blankFeedback(): StakeholderFeedback {
  return { id: `fb-${Date.now()}`, role: '', feedback: '', rating: 3 };
}

const ANSWER_STYLE: Record<Answer, string> = {
  Yes: 'border-green-500 bg-green-500/10 text-green-500',
  No: 'border-red-500 bg-red-500/10 text-red-500',
  Partial: 'border-yellow-500 bg-yellow-500/10 text-yellow-500',
  'N/A': 'border-border bg-muted text-muted-foreground',
};

const SEV_COLORS: Record<string, string> = {
  Critical: 'text-red-500 border-red-500/30 bg-red-500/5',
  High: 'text-orange-500 border-orange-500/30 bg-orange-500/5',
  Medium: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5',
  Low: 'text-green-500 border-green-500/30 bg-green-500/5',
};

export default function FIAS() {
  const [tab, setTab] = useState('assessment');
  const [assessments, setAssessments] = useState<FIASAssessment[]>([]);
  const [mode, setMode] = useState<'Quick' | 'Full'>('Quick');
  const [step, setStep] = useState(1);

  // Assessment form state
  const [clientId, setClientId] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [equipmentIssues, setEquipmentIssues] = useState<EquipmentIssue[]>([]);
  const [stakeholderFeedback, setStakeholderFeedback] = useState<StakeholderFeedback[]>([]);
  const [execNotes, setExecNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const activeQuestions = mode === 'Quick' ? QUICK_QUESTIONS : QUESTIONS;
  const filteredQuestions = categoryFilter === 'All' ? activeQuestions : activeQuestions.filter(q => q.category === categoryFilter);

  const ops = calcOPS(activeQuestions, answers);
  const stage = stageFromOPS(ops);
  const answered = Object.keys(answers).filter(k => answers[k]?.answer !== undefined).length;
  const progress = Math.round((answered / activeQuestions.length) * 100);

  useEffect(() => {
    syncRead<FIASAssessment[]>('nexum_fias_assessments', '/fias/assessments', facilityId).then(d => {
      if (d) setAssessments(d);
    });
  }, []);

  const saveAssessments = (next: FIASAssessment[]) => {
    setAssessments(next);
    syncWrite('nexum_fias_assessments', next, '/fias/assessments', facilityId);
  };

  const setAnswer = (qId: string, answer: Answer) =>
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], answer, note: prev[qId]?.note || '' } }));
  const setNote = (qId: string, note: string) =>
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], note, answer: prev[qId]?.answer || 'N/A' } }));

  const addIssue = () => setEquipmentIssues(prev => [blankIssue(), ...prev]);
  const updateIssue = (id: string, field: keyof EquipmentIssue, val: string) =>
    setEquipmentIssues(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  const deleteIssue = (id: string) =>
    setEquipmentIssues(prev => prev.filter(i => i.id !== id));

  const addFeedback = () => setStakeholderFeedback(prev => [...prev, blankFeedback()]);
  const updateFeedback = (id: string, field: keyof StakeholderFeedback, val: string | number) =>
    setStakeholderFeedback(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  const deleteFeedback = (id: string) =>
    setStakeholderFeedback(prev => prev.filter(f => f.id !== id));

  const saveAssessment = () => {
    if (!clientId) { toast.error('Client ID required.'); return; }
    const a: FIASAssessment = {
      id: `fias-${Date.now()}`,
      clientFacilityId: clientId,
      date: reportDate,
      mode,
      preparedBy,
      answers,
      equipmentIssues,
      stakeholderFeedback,
      execNotes,
      stage,
      ops,
    };
    saveAssessments([a, ...assessments]);
    toast.success(`Assessment saved — OPS: ${ops}, ${stage}`);
    // Reset
    setClientId(''); setAnswers({}); setEquipmentIssues([]); setStakeholderFeedback([]); setExecNotes('');
    setStep(1); setTab('pipeline');
  };

  // Category score data for radar
  const radarData = CATEGORIES.map(cat => {
    const qs = activeQuestions.filter(q => q.category === cat);
    const score = calcOPS(qs, answers);
    return { category: cat.slice(0, 6), score };
  });

  // Category bar data
  const catBarData = CATEGORIES.map(cat => {
    const qs = activeQuestions.filter(q => q.category === cat);
    const score = calcOPS(qs, answers);
    return { name: cat, score };
  });

  const OPS_COLOR = ops >= 70 ? '#22c55e' : ops >= 55 ? '#f97316' : '#ef4444';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">FIAS Assessment</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Facility Intelligence Assessment System — score clients across 30 performance indicators.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="equipment">Equipment Issues</TabsTrigger>
            <TabsTrigger value="scores">Scores & Feedback</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline ({assessments.length})</TabsTrigger>
          </TabsList>

          {/* ── Assessment Tab ── */}
          <TabsContent value="assessment" className="mt-4 space-y-4">
            {/* Header card */}
            <Card>
              <CardContent className="py-3 px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label className="text-xs">Client FacilityId</Label>
                    <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="facility-001" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Prepared By</Label>
                    <Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Nexum Suum" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Mode</Label>
                    <div className="flex gap-2">
                      {(['Quick', 'Full'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => { setMode(m); setAnswers({}); }}
                          className={cn('flex-1 px-3 py-1.5 text-xs rounded border transition-colors', mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
                        >
                          {m} ({m === 'Quick' ? QUICK_QUESTIONS.length : QUESTIONS.length}Q)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{answered}/{activeQuestions.length} answered</span>
                  <span>{progress}% complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-bold" style={{ color: OPS_COLOR }}>{ops}</p>
                <p className="text-xs text-muted-foreground">OPS Score</p>
              </div>
              <Badge className={cn('text-xs', ops >= 70 ? 'bg-green-500/10 text-green-500 border-green-500/30' : ops >= 55 ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30')}>
                {stage}
              </Badge>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              {['All', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn('px-3 py-1 text-xs rounded-full border transition-colors', categoryFilter === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {filteredQuestions.map(q => {
                const a = answers[q.id];
                return (
                  <Card key={q.id} className={cn('transition-colors', a?.answer ? 'border-border' : 'border-border/40')}>
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{q.category}</Badge>
                        <p className="text-sm flex-1">{q.text}</p>
                        <span className="text-xs text-muted-foreground shrink-0">×{q.weight}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(['Yes', 'Partial', 'No', 'N/A'] as Answer[]).map(ans => (
                          <button
                            key={ans}
                            onClick={() => setAnswer(q.id, ans)}
                            className={cn(
                              'px-3 py-1 rounded text-xs border transition-colors',
                              a?.answer === ans ? ANSWER_STYLE[ans] : 'border-border text-muted-foreground hover:border-border/80',
                            )}
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                      {(a?.answer === 'No' || a?.answer === 'Partial') && (
                        <Input
                          value={a.note || ''}
                          onChange={e => setNote(q.id, e.target.value)}
                          placeholder="Add note or gap description…"
                          className="text-xs h-7"
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button className="w-full" onClick={() => setTab('equipment')}>
              Continue to Equipment Issues <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </TabsContent>

          {/* ── Equipment Issues ── */}
          <TabsContent value="equipment" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Document equipment deficiencies observed during assessment.</p>
              <Button size="sm" onClick={addIssue}><Plus className="w-4 h-4 mr-1" />Add Issue</Button>
            </div>

            {equipmentIssues.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Wrench className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No equipment issues logged.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {equipmentIssues.map(issue => (
                  <Card key={issue.id}>
                    <CardContent className="py-3 px-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">System</Label>
                          <Select value={issue.system} onValueChange={v => updateIssue(issue.id, 'system', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Severity</Label>
                          <Select value={issue.severity} onValueChange={v => updateIssue(issue.id, 'severity', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['Critical', 'High', 'Medium', 'Low'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Equipment Age</Label>
                          <Input value={issue.age} onChange={e => updateIssue(issue.id, 'age', e.target.value)} className="h-8 text-xs" placeholder="e.g. 15 yrs" />
                        </div>
                        <div className="flex items-end">
                          <Button variant="ghost" size="sm" onClick={() => deleteIssue(issue.id)} className="text-destructive">
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Issue Description</Label>
                          <Textarea value={issue.description} onChange={e => updateIssue(issue.id, 'description', e.target.value)} rows={2} className="text-xs resize-none" placeholder="Describe the issue…" />
                        </div>
                        <div>
                          <Label className="text-xs">Recommendation</Label>
                          <Textarea value={issue.recommendation} onChange={e => updateIssue(issue.id, 'recommendation', e.target.value)} rows={2} className="text-xs resize-none" placeholder="Recommended action…" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTab('assessment')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
              <Button className="flex-1" onClick={() => setTab('scores')}>Continue to Scores <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </TabsContent>

          {/* ── Scores & Feedback ── */}
          <TabsContent value="scores" className="mt-4 space-y-6">
            {/* OPS Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1">
                <CardContent className="py-6 text-center">
                  <div className="w-24 h-24 rounded-full border-4 mx-auto flex items-center justify-center mb-3" style={{ borderColor: OPS_COLOR }}>
                    <span className="text-3xl font-bold" style={{ color: OPS_COLOR }}>{ops}</span>
                  </div>
                  <p className="font-bold">{stage}</p>
                  <p className="text-xs text-muted-foreground mt-1">{STAGE_LABELS[stage]}</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Category Scores</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={catBarData} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Stage pipeline visual */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Stage Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {(['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'] as Stage[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-1 shrink-0">
                      <div className={cn('px-3 py-2 rounded text-xs text-center min-w-[100px]', s === stage ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <p className="font-bold">{s}</p>
                        <p className="text-[10px]">{OPS_STAGE[i].min}–{OPS_STAGE[i].max}</p>
                      </div>
                      {i < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stakeholder Feedback */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Stakeholder Feedback</CardTitle>
                  <Button size="sm" variant="outline" onClick={addFeedback}><Plus className="w-4 h-4 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stakeholderFeedback.length === 0 && (
                  <p className="text-xs text-muted-foreground">No stakeholder feedback recorded.</p>
                )}
                {stakeholderFeedback.map(f => (
                  <div key={f.id} className="border border-border/50 rounded p-3 space-y-2">
                    <div className="flex gap-3 items-center">
                      <Input value={f.role} onChange={e => updateFeedback(f.id, 'role', e.target.value)} className="h-7 text-xs w-36" placeholder="Role / Title" />
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => updateFeedback(f.id, 'rating', n)} className={cn('text-sm', n <= f.rating ? 'text-yellow-400' : 'text-muted-foreground')}>★</button>
                        ))}
                      </div>
                      <button onClick={() => deleteFeedback(f.id)} className="text-muted-foreground hover:text-destructive ml-auto text-xs">✕</button>
                    </div>
                    <Textarea value={f.feedback} onChange={e => updateFeedback(f.id, 'feedback', e.target.value)} rows={2} className="text-xs resize-none" placeholder="Stakeholder comments…" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Exec Notes */}
            <div>
              <Label>Executive Notes</Label>
              <Textarea value={execNotes} onChange={e => setExecNotes(e.target.value)} rows={3} placeholder="Observations, context, recommended next steps…" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTab('equipment')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
              <Button className="flex-1" onClick={saveAssessment}>
                <FileText className="w-4 h-4 mr-2" />Save Assessment
              </Button>
            </div>
          </TabsContent>

          {/* ── Pipeline / Report ── */}
          <TabsContent value="pipeline" className="mt-4 space-y-4">
            {assessments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No assessments saved yet.</p>
                  <Button variant="outline" className="mt-3" onClick={() => setTab('assessment')}>Start Assessment</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Assessments', val: assessments.length },
                    { label: 'Avg OPS', val: Math.round(assessments.reduce((s, a) => s + a.ops, 0) / assessments.length) },
                    { label: 'Stage 1-2 Clients', val: assessments.filter(a => ['Stage 1', 'Stage 2'].includes(a.stage)).length },
                    { label: 'Stage 4-5 Clients', val: assessments.filter(a => ['Stage 4', 'Stage 5'].includes(a.stage)).length },
                  ].map(s => (
                    <Card key={s.label}>
                      <CardContent className="py-4 px-4">
                        <p className="text-2xl font-bold">{s.val}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-muted-foreground text-xs uppercase">
                        {['Client', 'Date', 'Mode', 'OPS', 'Stage', 'Issues', 'Prepared By'].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map(a => (
                        <tr key={a.id} className="border-t border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs">{a.clientFacilityId}</td>
                          <td className="px-3 py-2 text-muted-foreground">{a.date}</td>
                          <td className="px-3 py-2"><Badge variant="secondary" className="text-xs">{a.mode}</Badge></td>
                          <td className="px-3 py-2 font-bold" style={{ color: a.ops >= 70 ? '#22c55e' : a.ops >= 55 ? '#f97316' : '#ef4444' }}>{a.ops}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{a.stage}</Badge></td>
                          <td className="px-3 py-2 text-muted-foreground">{a.equipmentIssues.length}</td>
                          <td className="px-3 py-2 text-muted-foreground">{a.preparedBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
