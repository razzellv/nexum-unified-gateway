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
import { FileSearch, Plus, ChevronRight, ChevronLeft, Printer, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

type AuditType = 'Routine' | 'Compliance' | 'Performance' | 'Emergency';
type CheckResult = 'Pass' | 'Fail' | 'N/A' | '';

interface SubItem {
  label: string;
  result: CheckResult;
  notes: string;
}

interface ScopeArea {
  key: string;
  label: string;
  items: SubItem[];
}

interface Audit {
  id: string;
  facilityId: string;
  auditType: AuditType;
  leadAuditor: string;
  targetDate: string;
  startDate: string;
  completedDate: string | null;
  status: 'Active' | 'Completed';
  selectedScope: string[];
  scopeData: ScopeArea[];
  photoNotes: Record<string, string>;
  percentComplete: number;
}

const SCOPE_TEMPLATES: Record<string, string[]> = {
  'HVAC Systems': ['Filter condition', 'Coil condition', 'Belt/drive', 'Refrigerant charge', 'Controls calibration', 'Airflow measurement', 'Thermostat setpoints'],
  'Boilers': ['Burner operation', 'Water chemistry', 'Pressure relief', 'Controls', 'Flue/venting', 'Fuel supply', 'Annual cert status'],
  'Chillers': ['Entering/leaving water temps', 'Refrigerant log', 'Condenser approach', 'Evaporator approach', 'Unit controls', 'Insulation condition'],
  'Plumbing': ['Backflow preventer', 'Pressure reducing valve', 'Pipe insulation', 'Drain condition', 'Leak indicators'],
  'Electrical': ['Panel labeling', 'Breaker condition', 'Grounding', 'Motor nameplate vs actual draw', 'Disconnect condition'],
  'Fire Suppression': ['Sprinkler head condition', 'Water supply pressure', 'Alarm test', 'Signage & access', 'Last inspection cert'],
  'Ductwork/Air Distribution': ['Duct leakage test', 'Damper operation', 'Diffuser condition', 'Sound levels', 'Pressure balance'],
  'Refrigeration': ['Temperature log review', 'Compressor operation', 'Condenser coil', 'Door seals', 'Refrigerant compliance'],
  'IAQ': ['CO2 levels', 'Humidity range', 'Air filter loading', 'Ventilation rate', 'Odor complaints log'],
  'Energy': ['Meter readings', 'Demand charge review', 'After-hours load', 'Lighting controls', 'Variable frequency drives'],
  'Compliance Docs': ['Inspection certs current', 'Chemical handling logs', 'Permits on file', 'Training records', 'Corrective action log'],
  'Staff Interviews': ['PM program awareness', 'Complaint log use', 'Emergency procedure knowledge', 'Training up to date', 'Equipment familiarity'],
  'Equipment Records': ['Asset register current', 'PM log completeness', 'Service history', 'Warranty documentation', 'Nameplate data captured'],
};

const SCOPE_KEYS = Object.keys(SCOPE_TEMPLATES);

function buildScopeArea(key: string): ScopeArea {
  return {
    key,
    label: key,
    items: (SCOPE_TEMPLATES[key] || []).map(label => ({ label, result: '' as CheckResult, notes: '' })),
  };
}

function calcProgress(areas: ScopeArea[]): number {
  const allItems = areas.flatMap(a => a.items);
  if (allItems.length === 0) return 0;
  return Math.round((allItems.filter(i => i.result !== '').length / allItems.length) * 100);
}

export default function AuditModule() {
  const [tab, setTab] = useState('active');
  const [audits, setAudits] = useState<Audit[]>([]);
  const [step, setStep] = useState(1);

  // New audit form state
  const [newAudit, setNewAudit] = useState<Partial<Audit>>({
    facilityId: '',
    auditType: 'Routine',
    leadAuditor: '',
    targetDate: '',
    selectedScope: [],
    scopeData: [],
    photoNotes: {},
  });

  // Archive filter
  const [archSearch, setArchSearch] = useState('');

  useEffect(() => {
    syncRead<Audit[]>('nexum_audits', '/audits', facilityId).then(d => {
      if (d) setAudits(d);
    });
  }, []);

  const save = (next: Audit[]) => {
    setAudits(next);
    syncWrite('nexum_audits', next, '/audits', facilityId);
  };

  const toggleScope = (key: string) => {
    const sel = newAudit.selectedScope || [];
    setNewAudit(a => ({
      ...a,
      selectedScope: sel.includes(key) ? sel.filter(k => k !== key) : [...sel, key],
    }));
  };

  const updateCheckItem = (areaKey: string, itemIdx: number, field: 'result' | 'notes', val: string) => {
    setNewAudit(a => ({
      ...a,
      scopeData: (a.scopeData || []).map(area =>
        area.key === areaKey
          ? { ...area, items: area.items.map((it, i) => i === itemIdx ? { ...it, [field]: val } : it) }
          : area,
      ),
    }));
  };

  const buildScopeData = () => {
    const existing = newAudit.scopeData || [];
    const existingKeys = existing.map(a => a.key);
    const toAdd = (newAudit.selectedScope || []).filter(k => !existingKeys.includes(k));
    return [...existing.filter(a => (newAudit.selectedScope || []).includes(a.key)), ...toAdd.map(buildScopeArea)];
  };

  const handleSubmit = () => {
    if (!newAudit.facilityId || !newAudit.leadAuditor) {
      toast.error('FacilityId and Lead Auditor are required.');
      return;
    }
    const scopeData = buildScopeData();
    const audit: Audit = {
      id: `audit-${Date.now()}`,
      facilityId: newAudit.facilityId!,
      auditType: newAudit.auditType as AuditType || 'Routine',
      leadAuditor: newAudit.leadAuditor!,
      targetDate: newAudit.targetDate || '',
      startDate: new Date().toISOString().split('T')[0],
      completedDate: null,
      status: 'Active',
      selectedScope: newAudit.selectedScope || [],
      scopeData,
      photoNotes: newAudit.photoNotes || {},
      percentComplete: calcProgress(scopeData),
    };
    save([audit, ...audits]);
    setNewAudit({ facilityId: '', auditType: 'Routine', leadAuditor: '', targetDate: '', selectedScope: [], scopeData: [], photoNotes: {} });
    setStep(1);
    toast.success(`Audit started for ${audit.facilityId}`);
    setTab('active');
  };

  const RESULT_BTN = (res: CheckResult, cur: CheckResult, onClick: () => void) => (
    <button
      key={res}
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
        cur === res
          ? res === 'Pass' ? 'bg-green-500/20 text-green-400 border-green-500/40'
            : res === 'Fail' ? 'bg-red-500/20 text-red-400 border-red-500/40'
            : 'bg-muted text-muted-foreground border-border'
          : 'border-border/40 text-muted-foreground hover:border-border',
      )}
    >{res}</button>
  );

  const activeAudits = audits.filter(a => a.status === 'Active');
  const archivedAudits = audits.filter(a => a.status === 'Completed' &&
    (!archSearch || a.facilityId.includes(archSearch) || a.auditType.includes(archSearch)));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileSearch className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Audit Module</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">On-site facility audit workflow — scope, checklist, archive.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Active Audits ({activeAudits.length})</TabsTrigger>
            <TabsTrigger value="new">New Audit</TabsTrigger>
            <TabsTrigger value="archive">Archive ({audits.filter(a => a.status === 'Completed').length})</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Active Audits ── */}
          <TabsContent value="active" className="mt-4 space-y-3">
            {activeAudits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileSearch className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No active audits. Start one in New Audit.</p>
                </CardContent>
              </Card>
            ) : activeAudits.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{a.facilityId}</span>
                        <Badge variant="outline">{a.auditType}</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Lead: {a.leadAuditor} · Started: {a.startDate} · Target: {a.targetDate || 'TBD'}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{a.selectedScope.length} scope areas</span>
                          <span>{a.percentComplete}% complete</span>
                        </div>
                        <Progress value={a.percentComplete} className="h-1.5" />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = audits.map(x => x.id === a.id ? { ...x, status: 'Completed' as const, completedDate: new Date().toISOString().split('T')[0], percentComplete: 100 } : x);
                        save(updated);
                        toast.success('Audit marked complete.');
                      }}
                    >Complete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Tab 2: New Audit (4-step wizard) ── */}
          <TabsContent value="new" className="mt-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {['Client & Type', 'Scope', 'Checklist', 'Photos'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
                  <span className={cn('text-sm', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </div>

            {/* Step 1: Client & Type */}
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle>Step 1 — Client & Audit Type</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Client FacilityId *</Label>
                      <Input value={newAudit.facilityId} onChange={e => setNewAudit(a => ({ ...a, facilityId: e.target.value }))} placeholder="facility-001" />
                    </div>
                    <div>
                      <Label>Audit Type</Label>
                      <Select value={newAudit.auditType} onValueChange={v => setNewAudit(a => ({ ...a, auditType: v as AuditType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Routine', 'Compliance', 'Performance', 'Emergency'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Lead Auditor *</Label>
                      <Input value={newAudit.leadAuditor} onChange={e => setNewAudit(a => ({ ...a, leadAuditor: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Target Date</Label>
                      <Input type="date" value={newAudit.targetDate} onChange={e => setNewAudit(a => ({ ...a, targetDate: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={() => setStep(2)} className="w-full" disabled={!newAudit.facilityId || !newAudit.leadAuditor}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Scope selection */}
            {step === 2 && (
              <Card>
                <CardHeader><CardTitle>Step 2 — Audit Scope</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select all system areas to audit:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SCOPE_KEYS.map(k => (
                      <button
                        key={k}
                        onClick={() => toggleScope(k)}
                        className={cn(
                          'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                          (newAudit.selectedScope || []).includes(k)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-border/80 text-foreground',
                        )}
                      >{k}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{(newAudit.selectedScope || []).length} area(s) selected</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setNewAudit(a => ({ ...a, scopeData: buildScopeData() }));
                        setStep(3);
                      }}
                      disabled={(newAudit.selectedScope || []).length === 0}
                    >Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Checklist */}
            {step === 3 && (
              <div className="space-y-4">
                {(newAudit.scopeData || []).map(area => (
                  <Card key={area.key}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{area.label}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {area.items.map((item, idx) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm">{item.label}</span>
                            <div className="flex gap-1">
                              {(['Pass', 'Fail', 'N/A'] as CheckResult[]).map(r =>
                                RESULT_BTN(r, item.result, () => updateCheckItem(area.key, idx, 'result', item.result === r ? '' : r))
                              )}
                            </div>
                          </div>
                          {item.result === 'Fail' && (
                            <Input
                              placeholder="Notes on failure…"
                              value={item.notes}
                              onChange={e => updateCheckItem(area.key, idx, 'notes', e.target.value)}
                              className="text-xs"
                            />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <Button className="flex-1" onClick={() => setStep(4)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 4: Photo notes */}
            {step === 4 && (
              <Card>
                <CardHeader><CardTitle>Step 4 — Photo Notes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Record photo filenames or notes per scope area:</p>
                  {(newAudit.selectedScope || []).map(k => (
                    <div key={k}>
                      <Label>{k}</Label>
                      <Input
                        placeholder="photo_boiler_01.jpg, notes…"
                        value={(newAudit.photoNotes || {})[k] || ''}
                        onChange={e => setNewAudit(a => ({ ...a, photoNotes: { ...(a.photoNotes || {}), [k]: e.target.value } }))}
                      />
                    </div>
                  ))}
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={handleSubmit}>
                      <Clipboard className="w-4 h-4 mr-2" />Submit Audit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 3: Archive ── */}
          <TabsContent value="archive" className="mt-4 space-y-3">
            <Input placeholder="Filter by facilityId or type…" value={archSearch} onChange={e => setArchSearch(e.target.value)} className="max-w-sm" />
            {archivedAudits.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground text-sm">No completed audits yet.</CardContent></Card>
            ) : archivedAudits.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{a.facilityId}</span>
                        <Badge variant="outline">{a.auditType}</Badge>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Lead: {a.leadAuditor} · Completed: {a.completedDate || 'N/A'} · {a.selectedScope.length} scope areas</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {a.scopeData.flatMap(s => s.items.filter(i => i.result === 'Fail')).slice(0, 3).map((item, i) => (
                          <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{item.label}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="w-3 h-3 mr-1" />Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
