import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Plus, ArrowLeft, CheckCircle, AlertTriangle, UserCheck, Wrench,
  ShieldCheck, Lock, RefreshCw, Edit3, Lightbulb, FileText, Clock,
  Shield, Activity, ChevronRight, X, Loader2,
} from 'lucide-react';
import {
  listObservations, createObservation, getObservation,
  validateObservation, escalateObservation, assignObservation,
  addObservationAction, verifyObservation, closeObservation,
  reopenObservation, amendObservation, getObservationAISummary,
} from '@/lib/nexum-api';
import type {
  Observation, ObservationEvent, ObservationTimelineEntry, ObservationScores,
} from '@/lib/nexum-api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function severityBadge(sev: number | null) {
  if (sev === null || sev === undefined) return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs">N/A</Badge>;
  if (sev <= 3) return <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">{sev}</Badge>;
  if (sev <= 6) return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">{sev}</Badge>;
  return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">{sev}</Badge>;
}

const STATUS_COLORS: Record<string, string> = {
  open:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
  validated:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  escalated:    'bg-red-500/20 text-red-300 border-red-500/30',
  assigned:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'in-progress':'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  verified:     'bg-teal-500/20 text-teal-300 border-teal-500/30',
  closed:       'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return <Badge className={`${cls} border text-xs`}>{status}</Badge>;
}

function ageLabel(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = diff / 3600000;
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function scoreColor(n: number) {
  if (n >= 80) return 'text-green-400';
  if (n >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBarColor(n: number) {
  if (n >= 80) return '[&>div]:bg-green-500';
  if (n >= 60) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  created:   <BookOpen className="h-4 w-4 text-primary" />,
  validated: <CheckCircle className="h-4 w-4 text-purple-400" />,
  escalated: <AlertTriangle className="h-4 w-4 text-red-400" />,
  assigned:  <UserCheck className="h-4 w-4 text-orange-400" />,
  action:    <Wrench className="h-4 w-4 text-yellow-400" />,
  verified:  <ShieldCheck className="h-4 w-4 text-teal-400" />,
  closed:    <Lock className="h-4 w-4 text-gray-400" />,
  reopened:  <RefreshCw className="h-4 w-4 text-blue-400" />,
  amended:   <Edit3 className="h-4 w-4 text-indigo-400" />,
};

// ── Score display ──────────────────────────────────────────────────────────────

const SCORE_LABELS: { key: keyof ObservationScores; label: string }[] = [
  { key: 'integrityScore',             label: 'Record Integrity' },
  { key: 'chainOfCustodyScore',        label: 'Chain of Custody' },
  { key: 'validationScore',            label: 'Validation Speed' },
  { key: 'escalationScore',            label: 'Escalation' },
  { key: 'ownershipScore',             label: 'Ownership' },
  { key: 'correctiveActionScore',      label: 'Corrective Action' },
  { key: 'verificationScore',          label: 'Verification' },
  { key: 'decisionDefensibilityScore', label: 'Decision Defensibility' },
  { key: 'operationalContinuityScore', label: 'Operational Continuity' },
  { key: 'facilityIntelligenceScore',  label: 'Facility Intelligence' },
];

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border/60 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ObservationJournal() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selected, setSelected] = useState<{
    observation: Observation;
    events: ObservationEvent[];
    timeline: ObservationTimelineEntry[];
    scores: ObservationScores;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [dialogForm, setDialogForm] = useState<Record<string, any>>({});
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadObservations = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const res = await listObservations(status ? { status } : undefined);
      setObservations(res.observations || []);
    } catch {
      setObservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSelected(null);
    loadObservations(tab === 'all' ? undefined : tab);
  }, [loadObservations]);

  const handleSelectRow = useCallback(async (sk: string) => {
    setDetailLoading(true);
    try {
      const res = await getObservation(sk);
      setSelected(res);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(async () => {
    if (!selected) return;
    const res = await getObservation(selected.observation.SK);
    setSelected(res);
  }, [selected]);

  const openDialog = (name: string) => {
    setDialogForm({});
    setAiNarrative('');
    setActiveDialog(name);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setDialogForm({});
  };

  const setField = (k: string, v: any) => setDialogForm(f => ({ ...f, [k]: v }));

  const handleSubmit = useCallback(async () => {
    if (!selected || !activeDialog) return;
    const sk = selected.observation.SK;
    setDialogSubmitting(true);
    try {
      if (activeDialog === 'create') {
        const tags = dialogForm.tags ? dialogForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
        await createObservation({ ...dialogForm, tags });
        await loadObservations(activeTab === 'all' ? undefined : activeTab);
        closeDialog();
        return;
      }
      if (activeDialog === 'validate')  await validateObservation(sk, dialogForm);
      if (activeDialog === 'escalate')  await escalateObservation(sk, dialogForm);
      if (activeDialog === 'assign')    await assignObservation(sk, dialogForm);
      if (activeDialog === 'action')    await addObservationAction(sk, dialogForm);
      if (activeDialog === 'verify')    await verifyObservation(sk, { ...dialogForm, passed: dialogForm.passed !== false });
      if (activeDialog === 'close')     await closeObservation(sk, dialogForm);
      if (activeDialog === 'reopen')    await reopenObservation(sk, dialogForm);
      if (activeDialog === 'amend')     await amendObservation(sk, dialogForm);
      await refreshSelected();
      closeDialog();
    } catch {
      // submit failed silently; leave dialog open
    } finally {
      setDialogSubmitting(false);
    }
  }, [selected, activeDialog, dialogForm, loadObservations, activeTab, refreshSelected]);

  const handleCreateSubmit = useCallback(async () => {
    setDialogSubmitting(true);
    try {
      const tags = dialogForm.tags ? dialogForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      await createObservation({ ...dialogForm, tags });
      await loadObservations(activeTab === 'all' ? undefined : activeTab);
      closeDialog();
    } catch {
      // ignore
    } finally {
      setDialogSubmitting(false);
    }
  }, [dialogForm, loadObservations, activeTab]);

  const handleAISummary = useCallback(async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiNarrative('');
    try {
      const res = await getObservationAISummary(selected.observation, selected.events, selected.scores);
      setAiNarrative(res.narrative || '');
    } catch {
      setAiNarrative('Failed to generate AI summary.');
    } finally {
      setAiLoading(false);
    }
  }, [selected]);

  const TABS = ['all', 'open', 'validated', 'escalated', 'in-progress', 'verified', 'closed'];

  // ── Detail view ───────────────────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (selected) {
    const { observation: obs, timeline, scores } = selected;
    const status = obs.status;

    const showValidate  = status === 'open';
    const showEscalate  = ['open', 'validated'].includes(status);
    const showAssign    = ['open', 'validated', 'escalated'].includes(status);
    const showAction    = ['validated', 'escalated', 'assigned', 'in-progress'].includes(status);
    const showVerify    = ['assigned', 'in-progress'].includes(status);
    const showClose     = status === 'verified';
    const showReopen    = status === 'closed';

    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">{obs.observationId}</span>
            {statusBadge(obs.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left 60% */}
            <div className="lg:col-span-3 space-y-6">
              {/* Immutable Original Record */}
              <Card className="bg-card/60 border-amber-500/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="h-4 w-4" />Immutable Original Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Observation Timestamp</p>
                      <p className="text-foreground">{obs.observationTimestamp ? new Date(obs.observationTimestamp).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-foreground">{obs.observationSource || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reporter</p>
                      <p className="text-foreground">{obs.reporterName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Role / Org</p>
                      <p className="text-foreground">{obs.reporterRole || '—'} {obs.reporterOrganization ? `/ ${obs.reporterOrganization}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">System Type</p>
                      <p className="text-foreground">{obs.systemType || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-foreground">{obs.department || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Building / Area</p>
                      <p className="text-foreground">{obs.building || '—'}{obs.area ? ` / ${obs.area}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Asset ID</p>
                      <p className="text-foreground font-mono">{obs.assetId || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Severity:</span>
                    {severityBadge(obs.originalSeverity)}
                    <span className="text-xs text-muted-foreground ml-2">Risk:</span>
                    {severityBadge(obs.originalRisk)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Original Observation Text (verbatim)</p>
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{obs.originalText || 'No text recorded.'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />Lifecycle Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events recorded.</p>
                  ) : (
                    <div className="space-y-0">
                      {timeline.map((entry, i) => (
                        <div key={i} className="flex gap-3 pb-4">
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-muted/50 border border-border/40">
                              {TIMELINE_ICONS[entry.eventType] || <FileText className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            {i < timeline.length - 1 && <div className="w-px flex-1 bg-border/30 my-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-medium text-foreground">{entry.title}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{entry.actor}{entry.role ? ` — ${entry.role}` : ''}</p>
                            {entry.summary && <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{entry.summary}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right 40% */}
            <div className="lg:col-span-2 space-y-6">
              {/* Scores */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />Decision Defensibility Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground mb-1">Facility Intelligence Score</p>
                    <p className={`text-4xl font-bold ${scoreColor(scores.facilityIntelligenceScore)}`}>
                      {scores.facilityIntelligenceScore}
                    </p>
                    <p className="text-xs text-muted-foreground">/100</p>
                  </div>
                  <div className="space-y-2">
                    {SCORE_LABELS.map(({ key, label }) => {
                      const val = scores[key] as number;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={scoreColor(val)}>{val}</span>
                          </div>
                          <Progress value={val} className={`h-1.5 ${scoreBarColor(val)}`} />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />Lifecycle Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {showValidate  && <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs" onClick={() => openDialog('validate')}><CheckCircle className="h-3.5 w-3.5 mr-1" />Validate</Button>}
                    {showEscalate  && <Button size="sm" variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs" onClick={() => openDialog('escalate')}><AlertTriangle className="h-3.5 w-3.5 mr-1" />Escalate</Button>}
                    {showAssign    && <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-xs" onClick={() => openDialog('assign')}><UserCheck className="h-3.5 w-3.5 mr-1" />Assign</Button>}
                    {showAction    && <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 text-xs" onClick={() => openDialog('action')}><Wrench className="h-3.5 w-3.5 mr-1" />Add Action</Button>}
                    {showVerify    && <Button size="sm" variant="outline" className="border-teal-500/40 text-teal-300 hover:bg-teal-500/10 text-xs" onClick={() => openDialog('verify')}><ShieldCheck className="h-3.5 w-3.5 mr-1" />Verify</Button>}
                    {showClose     && <Button size="sm" variant="outline" className="border-gray-500/40 text-gray-300 hover:bg-gray-500/10 text-xs" onClick={() => openDialog('close')}><Lock className="h-3.5 w-3.5 mr-1" />Close</Button>}
                    {showReopen    && <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 text-xs" onClick={() => openDialog('reopen')}><RefreshCw className="h-3.5 w-3.5 mr-1" />Reopen</Button>}
                    <Button size="sm" variant="outline" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs" onClick={() => openDialog('amend')}><Edit3 className="h-3.5 w-3.5 mr-1" />Amend</Button>
                    <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 text-xs" onClick={() => { openDialog('ai-summary'); handleAISummary(); }}><Lightbulb className="h-3.5 w-3.5 mr-1" />AI Summary</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Items */}
              {(obs.linkedWorkOrders?.length > 0 || obs.linkedViolations?.length > 0 || obs.linkedVendorActions?.length > 0) && (
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Linked Records</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {obs.linkedWorkOrders?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Work Orders</p>
                        {obs.linkedWorkOrders.map(id => <p key={id} className="font-mono text-foreground/80">{id}</p>)}
                      </div>
                    )}
                    {obs.linkedViolations?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Violations</p>
                        {obs.linkedViolations.map(id => <p key={id} className="font-mono text-foreground/80">{id}</p>)}
                      </div>
                    )}
                    {obs.linkedVendorActions?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Vendor Actions</p>
                        {obs.linkedVendorActions.map(id => <p key={id} className="font-mono text-foreground/80">{id}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* ── Dialogs ── */}

        {activeDialog === 'validate' && (
          <Modal title="Validate Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Validation Method</label>
                <Select value={dialogForm.validationMethod || ''} onValueChange={v => setField('validationMethod', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={3} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-primary text-primary-foreground" onClick={handleSubmit} disabled={dialogSubmitting}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Validate
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'escalate' && (
          <Modal title="Escalate Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Escalate To *</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.escalateTo || ''} onChange={e => setField('escalateTo', e.target.value)} placeholder="Name or role" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Escalate To Role</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.escalateToRole || ''} onChange={e => setField('escalateToRole', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
                <Textarea rows={3} className="text-xs bg-muted/30 border-border/40" value={dialogForm.reason || ''} onChange={e => setField('reason', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Urgency</label>
                <Select value={dialogForm.urgency || 'normal'} onValueChange={v => setField('urgency', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full bg-red-500 text-white hover:bg-red-600" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.escalateTo || !dialogForm.reason}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Escalate
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'assign' && (
          <Modal title="Assign Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assign To *</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.assignedTo || ''} onChange={e => setField('assignedTo', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.assignedToRole || ''} onChange={e => setField('assignedToRole', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-orange-500 text-white hover:bg-orange-600" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.assignedTo}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Assign
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'action' && (
          <Modal title="Log Corrective Action" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Action Description *</label>
                <Textarea rows={3} className="text-xs bg-muted/30 border-border/40" value={dialogForm.actionDescription || ''} onChange={e => setField('actionDescription', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Action Type</label>
                <Select value={dialogForm.actionType || 'corrective'} onValueChange={v => setField('actionType', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Linked Work Order ID</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.linkedWorkOrderId || ''} onChange={e => setField('linkedWorkOrderId', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Vendor Name</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.vendorName || ''} onChange={e => setField('vendorName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-yellow-500 text-black hover:bg-yellow-600" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.actionDescription}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Log Action
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'verify' && (
          <Modal title="Verify Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Verification Method</label>
                <Select value={dialogForm.verificationMethod || 'visual'} onValueChange={v => setField('verificationMethod', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="passed" checked={dialogForm.passed !== false} onChange={e => setField('passed', e.target.checked)} className="h-4 w-4" />
                <label htmlFor="passed" className="text-xs text-foreground">Verification Passed</label>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-teal-500 text-white hover:bg-teal-600" onClick={handleSubmit} disabled={dialogSubmitting}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Verify
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'close' && (
          <Modal title="Close Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resolution *</label>
                <Textarea rows={3} className="text-xs bg-muted/30 border-border/40" value={dialogForm.resolution || ''} onChange={e => setField('resolution', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-gray-600 text-white hover:bg-gray-700" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.resolution}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Close Observation
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'reopen' && (
          <Modal title="Reopen Observation" onClose={closeDialog}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
                <Textarea rows={3} className="text-xs bg-muted/30 border-border/40" value={dialogForm.reason || ''} onChange={e => setField('reason', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-blue-500 text-white hover:bg-blue-600" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.reason}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Reopen
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'amend' && (
          <Modal title="Amend Record" onClose={closeDialog}>
            <div className="space-y-3">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                Amend only modifies mutable fields. Immutable original evidence fields cannot be changed.
              </p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Field Name *</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" placeholder="e.g. systemType, department, priority" value={dialogForm.field || ''} onChange={e => setField('field', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Corrected Value *</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.correctedValue || ''} onChange={e => setField('correctedValue', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.reason || ''} onChange={e => setField('reason', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Textarea rows={2} className="text-xs bg-muted/30 border-border/40" value={dialogForm.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
              <Button size="sm" className="w-full bg-indigo-500 text-white hover:bg-indigo-600" onClick={handleSubmit} disabled={dialogSubmitting || !dialogForm.field || !dialogForm.correctedValue || !dialogForm.reason}>
                {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Amend Record
              </Button>
            </div>
          </Modal>
        )}

        {activeDialog === 'ai-summary' && (
          <Modal title="AI Narrative Summary" onClose={closeDialog}>
            <div className="space-y-3">
              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />Generating narrative…
                </div>
              )}
              {!aiLoading && aiNarrative && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiNarrative}</p>
                </div>
              )}
              {!aiLoading && !aiNarrative && (
                <p className="text-xs text-muted-foreground">Click Generate to produce an AI narrative for this observation.</p>
              )}
              {!aiLoading && (
                <Button size="sm" className="w-full bg-primary text-primary-foreground" onClick={handleAISummary}>
                  <Lightbulb className="h-3.5 w-3.5 mr-1" />{aiNarrative ? 'Regenerate' : 'Generate'} Narrative
                </Button>
              )}
            </div>
          </Modal>
        )}
      </MainLayout>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Observation Journal™</h1>
                <p className="text-xs text-muted-foreground">Immutable System of Origin</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Capture, validate, and track facility observations with full chain of custody scoring and decision defensibility.
            </p>
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0" onClick={() => openDialog('create')}>
            <Plus className="h-4 w-4 mr-1.5" />New Observation
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border/40 pb-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-1.5 text-xs rounded-t font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {tab === 'all' ? 'All' : tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* List */}
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : observations.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No observations found.</p>
                <p className="text-xs text-muted-foreground/60">Create your first observation to begin building a defensible record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      {['ID', 'Timestamp', 'Reporter', 'System', 'Severity', 'Status', 'Age', 'Defensibility', ''].map(h => (
                        <th key={h} className="text-left text-muted-foreground font-medium py-3 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map(obs => (
                      <tr
                        key={obs.SK}
                        className="border-b border-border/20 hover:bg-muted/20 cursor-pointer"
                        onClick={() => handleSelectRow(obs.SK)}
                      >
                        <td className="py-2 px-3 font-mono text-primary">{obs.observationId?.split('-')[1] || obs.observationId?.slice(-8) || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{obs.observationTimestamp ? new Date(obs.observationTimestamp).toLocaleDateString() : '—'}</td>
                        <td className="py-2 px-3">{obs.reporterName || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{obs.systemType || '—'}</td>
                        <td className="py-2 px-3">{severityBadge(obs.originalSeverity)}</td>
                        <td className="py-2 px-3">{statusBadge(obs.status)}</td>
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{ageLabel(obs.observationTimestamp || obs.createdAt)}</td>
                        <td className="py-2 px-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Progress value={0} className="h-1.5 flex-1" />
                            <span className="text-muted-foreground/60">—</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      {activeDialog === 'create' && (
        <Modal title="New Observation" onClose={closeDialog}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Source</label>
                <Select value={dialogForm.observationSource || 'manual'} onValueChange={v => setField('observationSource', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="bms">BMS</SelectItem>
                    <SelectItem value="work_order">Work Order</SelectItem>
                    <SelectItem value="patrol">Patrol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={dialogForm.priority || 'normal'} onValueChange={v => setField('priority', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">System Type</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.systemType || ''} onChange={e => setField('systemType', e.target.value)} placeholder="HVAC, Boiler…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.department || ''} onChange={e => setField('department', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Building</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.building || ''} onChange={e => setField('building', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Area</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.area || ''} onChange={e => setField('area', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Asset ID</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.assetId || ''} onChange={e => setField('assetId', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Location ID</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.locationId || ''} onChange={e => setField('locationId', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reporter Name</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.reporterName || ''} onChange={e => setField('reporterName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reporter Role</label>
                <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.reporterRole || ''} onChange={e => setField('reporterRole', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reporter Organization</label>
              <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.reporterOrganization || ''} onChange={e => setField('reporterOrganization', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observation Timestamp</label>
              <Input type="datetime-local" className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.observationTimestamp || ''} onChange={e => setField('observationTimestamp', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Original Observation Text *</label>
              <Textarea rows={4} className="text-xs bg-muted/30 border-border/40" value={dialogForm.originalText || ''} onChange={e => setField('originalText', e.target.value)} placeholder="Describe exactly what was observed — verbatim, unmodified…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Original Severity (1-10)</label>
                <Input type="number" min={1} max={10} className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.originalSeverity || ''} onChange={e => setField('originalSeverity', parseInt(e.target.value) || null)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Original Risk (1-10)</label>
                <Input type="number" min={1} max={10} className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.originalRisk || ''} onChange={e => setField('originalRisk', parseInt(e.target.value) || null)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
              <Input className="h-8 text-xs bg-muted/30 border-border/40" value={dialogForm.tags || ''} onChange={e => setField('tags', e.target.value)} placeholder="hvac, urgent, building-a" />
            </div>
            <Button size="sm" className="w-full bg-primary text-primary-foreground" onClick={handleCreateSubmit} disabled={dialogSubmitting || !dialogForm.originalText}>
              {dialogSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create Observation
            </Button>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
