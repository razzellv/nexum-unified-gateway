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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { FileOutput, ChevronRight, ChevronLeft, Printer, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

type DocType = 'FIAS Assessment Report' | 'VVFI Summary' | 'Audit Report' | 'Gap Analysis' | 'Proposal' | 'Executive Summary';

interface GeneratedDoc {
  id: string;
  clientFacilityId: string;
  docType: DocType;
  date: string;
  preparedBy: string;
  execNotes: string;
  sections: string[];
  sourceKeys: string[];
}

const DOC_TYPES: DocType[] = ['FIAS Assessment Report', 'VVFI Summary', 'Audit Report', 'Gap Analysis', 'Proposal', 'Executive Summary'];

const SECTIONS_BY_TYPE: Record<DocType, string[]> = {
  'FIAS Assessment Report': ['Assessment Summary', 'Operational Performance Score', 'Organizational Gaps', 'Equipment Issues Summary', 'Recommended Stage', 'Action Items'],
  'VVFI Summary': ['Retainer Overview', 'Score Trend', 'Top Gaps This Period', 'Progress vs Last Period', 'Recommended Actions'],
  'Audit Report': ['Audit Overview', 'Scope Summary', 'Pass/Fail Results', 'Failures & Notes', 'Photo References', 'Priority Fixes'],
  'Gap Analysis': ['Operational Gaps', 'Root Cause Mapping', 'Impact Assessment', 'Gap Priority Matrix', 'Recommended Actions'],
  'Proposal': ['Executive Summary', 'Problem Statement', 'Proposed Solution', 'Scope of Work', 'Pricing', 'Next Steps'],
  'Executive Summary': ['Operational Performance Score', 'Top 3 Risks', 'Recommended Investment', 'ROI Estimate', 'Next Steps'],
};

function getSourceKeys(clientFacilityId: string): string[] {
  return Object.keys(localStorage)
    .filter(k => k.includes(clientFacilityId) && (k.startsWith('nexum_fias') || k.startsWith('nexum_vvfi') || k.startsWith('nexum_audit')));
}

export default function DocGenerator() {
  const [tab, setTab] = useState('generate');
  const [step, setStep] = useState(1);
  const [docs, setDocs] = useState<GeneratedDoc[]>([]);

  // Step form state
  const [clientId, setClientId] = useState('');
  const [docType, setDocType] = useState<DocType>('FIAS Assessment Report');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [execNotes, setExecNotes] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [preparedBy, setPreparedBy] = useState('');

  const availableSources = clientId ? getSourceKeys(clientId) : [];
  const availableSections = SECTIONS_BY_TYPE[docType] || [];

  useEffect(() => {
    syncRead<GeneratedDoc[]>('nexum_generated_docs', '/docs', facilityId).then(d => {
      if (d) setDocs(d);
    });
  }, []);

  useEffect(() => {
    setEnabledSections(availableSections);
  }, [docType]);

  const save = (next: GeneratedDoc[]) => {
    setDocs(next);
    syncWrite('nexum_generated_docs', next, '/docs', facilityId);
  };

  const handleSave = () => {
    if (!clientId || !docType) { toast.error('Client and document type required.'); return; }
    const doc: GeneratedDoc = {
      id: `doc-${Date.now()}`,
      clientFacilityId: clientId,
      docType,
      date: reportDate,
      preparedBy,
      execNotes,
      sections: enabledSections,
      sourceKeys: selectedSources,
    };
    save([doc, ...docs]);
    toast.success('Document saved to history.');
    setStep(1);
    setClientId('');
    setExecNotes('');
    setSelectedSources([]);
    setTab('history');
  };

  const regenFrom = (doc: GeneratedDoc) => {
    setClientId(doc.clientFacilityId);
    setDocType(doc.docType);
    setSelectedSources(doc.sourceKeys);
    setEnabledSections(doc.sections);
    setExecNotes(doc.execNotes);
    setPreparedBy(doc.preparedBy);
    setReportDate(new Date().toISOString().split('T')[0]);
    setStep(1);
    setTab('generate');
  };

  const toggleSection = (s: string) =>
    setEnabledSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleSource = (s: string) =>
    setSelectedSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileOutput className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Doc Generator</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Generate client-facing reports from saved assessment data.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history">History ({docs.length})</TabsTrigger>
          </TabsList>

          {/* ── Generate Tab ── */}
          <TabsContent value="generate" className="mt-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {['Select Client', 'Doc Type', 'Source Data', 'Customize'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
                  <span className={cn('text-sm whitespace-nowrap', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle>Step 1 — Select Client</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Client FacilityId</Label>
                    <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="facility-001" />
                    <p className="text-xs text-muted-foreground mt-1">Saved assessment data will be loaded for this client.</p>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)} disabled={!clientId}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <Card>
                <CardHeader><CardTitle>Step 2 — Document Type</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    {DOC_TYPES.map(dt => (
                      <button
                        key={dt}
                        onClick={() => setDocType(dt)}
                        className={cn(
                          'text-left px-4 py-3 rounded-lg border text-sm transition-colors',
                          docType === dt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-border/80',
                        )}
                      >
                        <p className="font-medium">{dt}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {SECTIONS_BY_TYPE[dt].length} sections
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <Card>
                <CardHeader><CardTitle>Step 3 — Source Data</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {availableSources.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <p>No saved assessment data found for <strong>{clientId}</strong>.</p>
                      <p className="text-xs mt-1">Complete a FIAS assessment or VVFI report first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Select data sources to include:</p>
                      {availableSources.map(k => (
                        <button
                          key={k}
                          onClick={() => toggleSource(k)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded border text-xs font-mono transition-colors',
                            selectedSources.includes(k) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80',
                          )}
                        >{k}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                    <Button className="flex-1" onClick={() => setStep(4)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Customize + Preview */}
            {step === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Step 4 — Customize</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Report Date</Label>
                        <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Prepared By</Label>
                        <Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Nexum Suum" />
                      </div>
                    </div>
                    <div>
                      <Label>Executive Notes</Label>
                      <Textarea value={execNotes} onChange={e => setExecNotes(e.target.value)} rows={3} placeholder="Add context, observations, or recommendations…" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Toggle Sections</p>
                      <div className="flex flex-wrap gap-2">
                        {availableSections.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleSection(s)}
                            className={cn(
                              'px-3 py-1 rounded-full text-xs border transition-colors',
                              enabledSections.includes(s) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                            )}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card className="border-primary/20">
                  <CardHeader><CardTitle className="text-sm">Document Preview</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="border-b border-border pb-3">
                      <p className="text-lg font-bold">{docType}</p>
                      <p className="text-muted-foreground text-xs">Client: {clientId} · Date: {reportDate} · Prepared by: {preparedBy || 'Nexum Suum'}</p>
                    </div>
                    {execNotes && (
                      <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs italic text-muted-foreground">{execNotes}</div>
                    )}
                    <div className="space-y-1">
                      {enabledSections.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-primary font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    {selectedSources.length > 0 && (
                      <p className="text-xs text-muted-foreground">Sources: {selectedSources.length} data set(s)</p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <Button className="flex-1" onClick={handleSave}>
                    <FileOutput className="w-4 h-4 mr-2" />Save Document
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1" />Print
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history" className="mt-4">
            {docs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileOutput className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No generated documents yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs uppercase">
                      {['Client', 'Doc Type', 'Date', 'Sections', 'Prepared By', 'Actions'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-xs">{d.clientFacilityId}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-xs">{d.docType}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{d.date}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.sections.length}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.preparedBy || 'Nexum Suum'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => regenFrom(d)}>
                              <RefreshCw className="w-3 h-3 mr-1" />Re-gen
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.print()}>
                              <Printer className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
