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
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

type JobStatus = 'Scheduled' | 'In Progress' | 'Complete' | 'Callback Required';
type CheckResult = 'Pass' | 'Fail' | 'N/A';

interface PerformanceCheck {
  label: string;
  result: CheckResult;
  note: string;
}

interface Job {
  id: string;
  clientFacilityId: string;
  contractorName: string;
  jobType: string;
  system: string;
  scheduledDate: string;
  completedDate: string;
  status: JobStatus;
  techName: string;
  checks: PerformanceCheck[];
  notes: string;
  callbackReason: string;
  photoRefs: string[];
}

interface CallbackRecord {
  id: string;
  jobId: string;
  clientFacilityId: string;
  contractorName: string;
  reason: string;
  reportedDate: string;
  resolvedDate: string;
  resolved: boolean;
}

const JOB_TYPES = ['HVAC Install', 'Boiler Replacement', 'Chiller Service', 'Electrical Upgrade', 'Plumbing', 'Controls/BAS', 'Lighting Retrofit', 'Other'];
const SYSTEMS = ['HVAC', 'Boiler', 'Chiller', 'Electrical', 'Plumbing', 'Lighting', 'Controls', 'Other'];
const STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Complete', 'Callback Required'];

const DEFAULT_CHECKS: PerformanceCheck[] = [
  { label: 'Equipment installed per spec', result: 'N/A', note: '' },
  { label: 'System startup / test run completed', result: 'N/A', note: '' },
  { label: 'No leaks / electrical faults observed', result: 'N/A', note: '' },
  { label: 'Controls / BAS integration verified', result: 'N/A', note: '' },
];

function blankJob(): Job {
  return {
    id: `job-${Date.now()}`,
    clientFacilityId: '',
    contractorName: '',
    jobType: 'HVAC Install',
    system: 'HVAC',
    scheduledDate: new Date().toISOString().split('T')[0],
    completedDate: '',
    status: 'Scheduled',
    techName: '',
    checks: DEFAULT_CHECKS.map(c => ({ ...c })),
    notes: '',
    callbackReason: '',
    photoRefs: [],
  };
}

const STATUS_COLORS: Record<JobStatus, string> = {
  Scheduled: 'bg-blue-500/10 text-blue-400 border-blue-400/30',
  'In Progress': 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30',
  Complete: 'bg-green-500/10 text-green-400 border-green-400/30',
  'Callback Required': 'bg-red-500/10 text-red-400 border-red-400/30',
};

export default function ContractorInstalls() {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackRecord[]>([]);
  const [newJobStep, setNewJobStep] = useState(1);
  const [draft, setDraft] = useState<Job>(blankJob());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    syncRead<Job[]>('nexum_contractor_jobs', '/contractor/jobs', facilityId).then(d => { if (d) setJobs(d); });
    syncRead<CallbackRecord[]>('nexum_contractor_callbacks', '/contractor/callbacks', facilityId).then(d => { if (d) setCallbacks(d); });
  }, []);

  const saveJobs = (next: Job[]) => {
    setJobs(next);
    syncWrite('nexum_contractor_jobs', next, '/contractor/jobs', facilityId);
  };

  const saveCallbacks = (next: CallbackRecord[]) => {
    setCallbacks(next);
    syncWrite('nexum_contractor_callbacks', next, '/contractor/callbacks', facilityId);
  };

  const updateDraft = (field: keyof Job, val: unknown) => setDraft(d => ({ ...d, [field]: val }));

  const updateCheck = (i: number, field: keyof PerformanceCheck, val: string) =>
    setDraft(d => {
      const checks = d.checks.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
      return { ...d, checks };
    });

  const submitJob = () => {
    if (!draft.clientFacilityId || !draft.contractorName) {
      toast.error('Client ID and contractor name required.');
      return;
    }
    const next = [draft, ...jobs];
    saveJobs(next);
    // auto-create callback record if any check failed
    const failed = draft.checks.filter(c => c.result === 'Fail');
    if (failed.length > 0 || draft.status === 'Callback Required') {
      const cb: CallbackRecord = {
        id: `cb-${Date.now()}`,
        jobId: draft.id,
        clientFacilityId: draft.clientFacilityId,
        contractorName: draft.contractorName,
        reason: draft.callbackReason || failed.map(c => c.label).join('; '),
        reportedDate: new Date().toISOString().split('T')[0],
        resolvedDate: '',
        resolved: false,
      };
      saveCallbacks([cb, ...callbacks]);
      toast.warning('Callback record created for failed checks.');
    }
    toast.success('Job saved.');
    setDraft(blankJob());
    setNewJobStep(1);
    setTab('jobs');
  };

  const resolveCallback = (id: string) =>
    saveCallbacks(callbacks.map(c => c.id === id ? { ...c, resolved: true, resolvedDate: new Date().toISOString().split('T')[0] } : c));

  const deleteJob = (id: string) => saveJobs(jobs.filter(j => j.id !== id));

  const filteredJobs = jobs.filter(j => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    if (filterSystem !== 'all' && j.system !== filterSystem) return false;
    if (search && !j.clientFacilityId.toLowerCase().includes(search.toLowerCase()) && !j.contractorName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Dashboard data
  const byStatus = STATUSES.map(s => ({ name: s, count: jobs.filter(j => j.status === s).length }));
  const bySystem = SYSTEMS.map(s => ({ name: s, count: jobs.filter(j => j.system === s).length })).filter(d => d.count > 0);
  const passRate = (() => {
    const all = jobs.flatMap(j => j.checks);
    const graded = all.filter(c => c.result !== 'N/A');
    if (!graded.length) return 0;
    return Math.round((graded.filter(c => c.result === 'Pass').length / graded.length) * 100);
  })();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Wrench className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Contractor Installs</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Track contractor jobs, performance checks, and callbacks.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="new">New Install</TabsTrigger>
            <TabsTrigger value="callbacks">
              Callbacks
              {callbacks.filter(c => !c.resolved).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{callbacks.filter(c => !c.resolved).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          {/* ── Jobs List ── */}
          <TabsContent value="jobs" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or contractor…" className="w-56" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSystem} onValueChange={setFilterSystem}>
                <SelectTrigger className="w-36"><SelectValue placeholder="System" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => { setTab('new'); setNewJobStep(1); setDraft(blankJob()); }}>
                <Plus className="w-4 h-4 mr-1" />New Job
              </Button>
            </div>

            {filteredJobs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wrench className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No jobs found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs uppercase">
                      {['Client', 'Contractor', 'Job Type', 'System', 'Date', 'Tech', 'Status', 'Checks', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(j => {
                      const pass = j.checks.filter(c => c.result === 'Pass').length;
                      const fail = j.checks.filter(c => c.result === 'Fail').length;
                      return (
                        <tr key={j.id} className="border-t border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs">{j.clientFacilityId}</td>
                          <td className="px-3 py-2">{j.contractorName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{j.jobType}</td>
                          <td className="px-3 py-2"><Badge variant="secondary" className="text-xs">{j.system}</Badge></td>
                          <td className="px-3 py-2 text-muted-foreground">{j.scheduledDate}</td>
                          <td className="px-3 py-2 text-muted-foreground">{j.techName || '—'}</td>
                          <td className="px-3 py-2">
                            <Badge className={cn('text-xs border', STATUS_COLORS[j.status])}>{j.status}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="text-green-500">{pass}✓</span>
                            {fail > 0 && <span className="text-red-500 ml-1">{fail}✗</span>}
                          </td>
                          <td className="px-3 py-2">
                            <Button variant="ghost" size="sm" onClick={() => deleteJob(j.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── New Install (4-step) ── */}
          <TabsContent value="new" className="mt-4">
            {/* Stepper */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {['Job Info', 'Schedule', 'Performance Checks', 'Notes & Submit'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', newJobStep === i + 1 ? 'bg-primary text-primary-foreground' : newJobStep > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
                  <span className={cn('text-sm whitespace-nowrap', newJobStep === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>

            {newJobStep === 1 && (
              <Card>
                <CardHeader><CardTitle>Step 1 — Job Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Client FacilityId</Label>
                      <Input value={draft.clientFacilityId} onChange={e => updateDraft('clientFacilityId', e.target.value)} placeholder="facility-001" />
                    </div>
                    <div>
                      <Label>Contractor Name</Label>
                      <Input value={draft.contractorName} onChange={e => updateDraft('contractorName', e.target.value)} placeholder="ABC Mechanical" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Job Type</Label>
                      <Select value={draft.jobType} onValueChange={v => updateDraft('jobType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>System</Label>
                      <Select value={draft.system} onValueChange={v => updateDraft('system', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Technician Name</Label>
                    <Input value={draft.techName} onChange={e => updateDraft('techName', e.target.value)} placeholder="John Smith" />
                  </div>
                  <Button className="w-full" onClick={() => setNewJobStep(2)} disabled={!draft.clientFacilityId || !draft.contractorName}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {newJobStep === 2 && (
              <Card>
                <CardHeader><CardTitle>Step 2 — Schedule</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Scheduled Date</Label>
                      <Input type="date" value={draft.scheduledDate} onChange={e => updateDraft('scheduledDate', e.target.value)} />
                    </div>
                    <div>
                      <Label>Completed Date</Label>
                      <Input type="date" value={draft.completedDate} onChange={e => updateDraft('completedDate', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={v => updateDraft('status', v as JobStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setNewJobStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setNewJobStep(3)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {newJobStep === 3 && (
              <Card>
                <CardHeader><CardTitle>Step 3 — Performance Checks</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {draft.checks.map((c, i) => (
                      <div key={c.label} className="border border-border rounded p-3 space-y-2">
                        <p className="text-sm font-medium">{c.label}</p>
                        <div className="flex gap-2">
                          {(['Pass', 'Fail', 'N/A'] as CheckResult[]).map(r => (
                            <button
                              key={r}
                              onClick={() => updateCheck(i, 'result', r)}
                              className={cn(
                                'px-3 py-1 rounded text-xs border transition-colors',
                                c.result === r
                                  ? r === 'Pass' ? 'border-green-500 bg-green-500/10 text-green-500'
                                    : r === 'Fail' ? 'border-red-500 bg-red-500/10 text-red-500'
                                    : 'border-border bg-muted text-foreground'
                                  : 'border-border text-muted-foreground hover:border-border/80',
                              )}
                            >
                              {r === 'Pass' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                              {r === 'Fail' && <XCircle className="w-3 h-3 inline mr-1" />}
                              {r}
                            </button>
                          ))}
                        </div>
                        {c.result === 'Fail' && (
                          <Input
                            value={c.note}
                            onChange={e => updateCheck(i, 'note', e.target.value)}
                            placeholder="Failure note…"
                            className="text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setNewJobStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setNewJobStep(4)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {newJobStep === 4 && (
              <Card>
                <CardHeader><CardTitle>Step 4 — Notes & Submit</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Install Notes</Label>
                    <Textarea value={draft.notes} onChange={e => updateDraft('notes', e.target.value)} rows={3} placeholder="General install notes…" />
                  </div>
                  {draft.checks.some(c => c.result === 'Fail') && (
                    <div>
                      <Label>Callback Reason</Label>
                      <Input value={draft.callbackReason} onChange={e => updateDraft('callbackReason', e.target.value)} placeholder="Describe reason for callback…" />
                    </div>
                  )}
                  <div className="bg-muted/40 rounded p-3 text-sm space-y-1">
                    <p className="font-medium">{draft.jobType} — {draft.clientFacilityId}</p>
                    <p className="text-muted-foreground text-xs">{draft.contractorName} · {draft.scheduledDate} · {draft.status}</p>
                    <p className="text-xs">
                      Checks: <span className="text-green-500">{draft.checks.filter(c => c.result === 'Pass').length} pass</span>
                      {' · '}<span className="text-red-500">{draft.checks.filter(c => c.result === 'Fail').length} fail</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setNewJobStep(3)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={submitJob}>
                      <Wrench className="w-4 h-4 mr-2" />Save Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Callbacks ── */}
          <TabsContent value="callbacks" className="mt-4 space-y-3">
            {callbacks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Phone className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No callbacks recorded.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {callbacks.map(c => (
                  <Card key={c.id} className={cn('border', c.resolved ? 'border-green-500/20' : 'border-red-500/20')}>
                    <CardContent className="py-3 px-4 flex items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={c.resolved ? 'secondary' : 'destructive'} className="text-xs">
                            {c.resolved ? 'Resolved' : 'Open'}
                          </Badge>
                          <span className="text-sm font-medium">{c.contractorName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.clientFacilityId}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.reason}</p>
                        <p className="text-xs text-muted-foreground">Reported: {c.reportedDate}{c.resolvedDate && ` · Resolved: ${c.resolvedDate}`}</p>
                      </div>
                      {!c.resolved && (
                        <Button size="sm" variant="outline" onClick={() => resolveCallback(c.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Dashboard ── */}
          <TabsContent value="dashboard" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Jobs', val: jobs.length },
                { label: 'Complete', val: jobs.filter(j => j.status === 'Complete').length },
                { label: 'Open Callbacks', val: callbacks.filter(c => !c.resolved).length },
                { label: 'Check Pass Rate', val: `${passRate}%` },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="py-4 px-4">
                    <p className="text-2xl font-bold">{s.val}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Jobs by Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byStatus}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Jobs by System</CardTitle></CardHeader>
                <CardContent>
                  {bySystem.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No jobs yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bySystem}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
