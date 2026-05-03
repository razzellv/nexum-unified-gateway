import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Plus, Trash2, AlertTriangle, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

type CTS = 'CTS1' | 'CTS2' | 'CTS3' | 'CTS4' | 'CTS5';

interface RawLog {
  id: string;
  date: string;
  system: string;
  parameter: string;
  value: string;
  unit: string;
  cts: CTS;
  note: string;
}

interface CorrelationEntry {
  id: string;
  systemA: string;
  systemB: string;
  score: number; // 0-100
  impact: 'High' | 'Medium' | 'Low';
  finding: string;
}

interface Flag {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  system: string;
  description: string;
}

interface CTS3State {
  rawLogs: RawLog[];
  correlations: CorrelationEntry[];
  flags: Flag[];
  boilerReadings: { id: string; date: string; pressure: string; temp: string; efficiency: string; note: string }[];
}

const SYSTEMS = ['HVAC', 'Boiler', 'Chiller', 'Electrical', 'Plumbing', 'Lighting', 'Controls', 'BAS', 'Other'];
const CTS_LEVELS: CTS[] = ['CTS1', 'CTS2', 'CTS3', 'CTS4', 'CTS5'];

const IMPACT_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#22c55e',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'text-red-500',
  Warning: 'text-yellow-500',
  Info: 'text-blue-400',
};

const EMPTY: CTS3State = { rawLogs: [], correlations: [], flags: [], boilerReadings: [] };

function blankLog(): RawLog {
  return { id: `log-${Date.now()}`, date: new Date().toISOString().split('T')[0], system: 'HVAC', parameter: '', value: '', unit: '', cts: 'CTS3', note: '' };
}
function blankCorr(): CorrelationEntry {
  return { id: `corr-${Date.now()}`, systemA: 'HVAC', systemB: 'Boiler', score: 0, impact: 'Medium', finding: '' };
}
function blankFlag(): Flag {
  return { id: `flag-${Date.now()}`, severity: 'Warning', system: 'HVAC', description: '' };
}
function blankBoiler() {
  return { id: `br-${Date.now()}`, date: new Date().toISOString().split('T')[0], pressure: '', temp: '', efficiency: '', note: '' };
}

export default function CTS3Model() {
  const [state, setState] = useState<CTS3State>(EMPTY);
  const [tab, setTab] = useState('raw');

  useEffect(() => {
    syncRead<CTS3State>('nexum_cts3', '/cts3', facilityId).then(d => {
      if (d) setState(d);
    });
  }, []);

  const save = (next: CTS3State) => {
    setState(next);
    syncWrite('nexum_cts3', next, '/cts3', facilityId);
  };

  // ── Raw Log ──────────────────────────────────────────────────────────────────
  const addLog = () => save({ ...state, rawLogs: [blankLog(), ...state.rawLogs] });
  const updateLog = (id: string, field: keyof RawLog, val: string) =>
    save({ ...state, rawLogs: state.rawLogs.map(r => r.id === id ? { ...r, [field]: val } : r) });
  const deleteLog = (id: string) =>
    save({ ...state, rawLogs: state.rawLogs.filter(r => r.id !== id) });

  // ── Correlations ─────────────────────────────────────────────────────────────
  const addCorr = () => save({ ...state, correlations: [blankCorr(), ...state.correlations] });
  const updateCorr = (id: string, field: keyof CorrelationEntry, val: string | number) =>
    save({ ...state, correlations: state.correlations.map(c => c.id === id ? { ...c, [field]: val } : c) });
  const deleteCorr = (id: string) =>
    save({ ...state, correlations: state.correlations.filter(c => c.id !== id) });

  // ── Flags ────────────────────────────────────────────────────────────────────
  const addFlag = () => save({ ...state, flags: [blankFlag(), ...state.flags] });
  const updateFlag = (id: string, field: keyof Flag, val: string) =>
    save({ ...state, flags: state.flags.map(f => f.id === id ? { ...f, [field]: val } : f) });
  const deleteFlag = (id: string) =>
    save({ ...state, flags: state.flags.filter(f => f.id !== id) });

  // ── Boiler ───────────────────────────────────────────────────────────────────
  const addBoiler = () => save({ ...state, boilerReadings: [blankBoiler(), ...state.boilerReadings] });
  const updateBoiler = (id: string, field: string, val: string) =>
    save({ ...state, boilerReadings: state.boilerReadings.map(b => b.id === id ? { ...b, [field]: val } : b) });
  const deleteBoiler = (id: string) =>
    save({ ...state, boilerReadings: state.boilerReadings.filter(b => b.id !== id) });

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportXLSX = async () => {
    try {
      const xlsx = await import('xlsx');
      const wb = xlsx.utils.book_new();
      const addSheet = (name: string, rows: object[]) => {
        const ws = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(wb, ws, name);
      };
      addSheet('Raw Input Log', state.rawLogs);
      addSheet('Correlation Engine', state.correlations);
      addSheet('Flags & Diagnostics', state.flags);
      addSheet('Boiler Readings', state.boilerReadings);
      xlsx.writeFile(wb, `CTS3-Model-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Exported to Excel.');
    } catch {
      toast.error('xlsx library not available.');
    }
  };

  // ── Audit summary ────────────────────────────────────────────────────────────
  const criticals = state.flags.filter(f => f.severity === 'Critical').length;
  const warnings = state.flags.filter(f => f.severity === 'Warning').length;
  const avgCorr = state.correlations.length
    ? Math.round(state.correlations.reduce((s, c) => s + c.score, 0) / state.correlations.length)
    : 0;
  const chartData = SYSTEMS.map(sys => ({
    sys,
    logs: state.rawLogs.filter(r => r.system === sys).length,
  })).filter(d => d.logs > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">CTS-3 Correlation Model</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Track, correlate, and flag cross-system performance data.</p>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Raw Logs', val: state.rawLogs.length, color: 'text-foreground' },
            { label: 'Correlations', val: state.correlations.length, color: 'text-foreground' },
            { label: 'Critical Flags', val: criticals, color: criticals > 0 ? 'text-red-500' : 'text-foreground' },
            { label: 'Avg Corr Score', val: `${avgCorr}%`, color: 'text-foreground' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-4 px-4">
                <p className={cn('text-2xl font-bold', s.color)}>{s.val}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={exportXLSX}>
            <Download className="w-4 h-4 mr-2" />Export Excel
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="raw">Raw Input Log</TabsTrigger>
            <TabsTrigger value="correlations">Correlation Engine</TabsTrigger>
            <TabsTrigger value="impact">System Impact</TabsTrigger>
            <TabsTrigger value="boiler">Boiler</TabsTrigger>
            <TabsTrigger value="flags">Flags & Diagnostics</TabsTrigger>
            <TabsTrigger value="audit">Audit Summary</TabsTrigger>
            <TabsTrigger value="calcs">Calculations</TabsTrigger>
          </TabsList>

          {/* ── Raw Input Log ── */}
          <TabsContent value="raw" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{state.rawLogs.length} entries</p>
              <Button size="sm" onClick={addLog}><Plus className="w-4 h-4 mr-1" />Add Row</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground uppercase">
                    {['Date', 'System', 'Parameter', 'Value', 'Unit', 'CTS Level', 'Note', ''].map(h => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rawLogs.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No logs yet.</td></tr>
                  )}
                  {state.rawLogs.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-2 py-1"><Input type="date" value={r.date} onChange={e => updateLog(r.id, 'date', e.target.value)} className="h-7 text-xs w-32" /></td>
                      <td className="px-2 py-1">
                        <Select value={r.system} onValueChange={v => updateLog(r.id, 'system', v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1"><Input value={r.parameter} onChange={e => updateLog(r.id, 'parameter', e.target.value)} className="h-7 text-xs w-28" placeholder="Parameter" /></td>
                      <td className="px-2 py-1"><Input value={r.value} onChange={e => updateLog(r.id, 'value', e.target.value)} className="h-7 text-xs w-20" placeholder="Value" /></td>
                      <td className="px-2 py-1"><Input value={r.unit} onChange={e => updateLog(r.id, 'unit', e.target.value)} className="h-7 text-xs w-16" placeholder="Unit" /></td>
                      <td className="px-2 py-1">
                        <Select value={r.cts} onValueChange={v => updateLog(r.id, 'cts', v)}>
                          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{CTS_LEVELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1"><Input value={r.note} onChange={e => updateLog(r.id, 'note', e.target.value)} className="h-7 text-xs w-40" placeholder="Note" /></td>
                      <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => deleteLog(r.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Correlation Engine ── */}
          <TabsContent value="correlations" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Cross-system correlation mapping</p>
              <Button size="sm" onClick={addCorr}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-3">
              {state.correlations.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">No correlations logged.</p>
              )}
              {state.correlations.map(c => (
                <Card key={c.id}>
                  <CardContent className="py-3 px-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                      <div>
                        <Label className="text-xs">System A</Label>
                        <Select value={c.systemA} onValueChange={v => updateCorr(c.id, 'systemA', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">System B</Label>
                        <Select value={c.systemB} onValueChange={v => updateCorr(c.id, 'systemB', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Corr. Score (0-100)</Label>
                        <Input type="number" min={0} max={100} value={c.score} onChange={e => updateCorr(c.id, 'score', Number(e.target.value))} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Impact</Label>
                        <Select value={c.impact} onValueChange={v => updateCorr(c.id, 'impact', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Finding</Label>
                          <Input value={c.finding} onChange={e => updateCorr(c.id, 'finding', e.target.value)} className="h-8 text-xs" placeholder="Brief finding…" />
                        </div>
                        <Button variant="ghost" size="sm" className="self-end" onClick={() => deleteCorr(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: IMPACT_COLORS[c.impact] }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: IMPACT_COLORS[c.impact] }}>{c.score}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── System Impact ── */}
          <TabsContent value="impact" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Log Volume by System</CardTitle></CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Add raw logs to see system impact.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="sys" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="logs" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {CTS_LEVELS.map(cts => {
                const count = state.rawLogs.filter(r => r.cts === cts).length;
                return (
                  <Card key={cts}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <Badge variant="outline">{cts}</Badge>
                      <span className="text-xl font-bold">{count}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Boiler ── */}
          <TabsContent value="boiler" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Boiler performance readings</p>
              <Button size="sm" onClick={addBoiler}><Plus className="w-4 h-4 mr-1" />Add Reading</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground uppercase">
                    {['Date', 'Pressure (PSI)', 'Temp (°F)', 'Efficiency (%)', 'Note', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.boilerReadings.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No readings yet.</td></tr>
                  )}
                  {state.boilerReadings.map(b => (
                    <tr key={b.id} className="border-t border-border/50">
                      <td className="px-2 py-1"><Input type="date" value={b.date} onChange={e => updateBoiler(b.id, 'date', e.target.value)} className="h-7 text-xs w-32" /></td>
                      <td className="px-2 py-1"><Input value={b.pressure} onChange={e => updateBoiler(b.id, 'pressure', e.target.value)} className="h-7 text-xs w-24" placeholder="PSI" /></td>
                      <td className="px-2 py-1"><Input value={b.temp} onChange={e => updateBoiler(b.id, 'temp', e.target.value)} className="h-7 text-xs w-24" placeholder="°F" /></td>
                      <td className="px-2 py-1"><Input value={b.efficiency} onChange={e => updateBoiler(b.id, 'efficiency', e.target.value)} className="h-7 text-xs w-24" placeholder="%" /></td>
                      <td className="px-2 py-1"><Input value={b.note} onChange={e => updateBoiler(b.id, 'note', e.target.value)} className="h-7 text-xs w-48" placeholder="Note" /></td>
                      <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => deleteBoiler(b.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Flags & Diagnostics ── */}
          <TabsContent value="flags" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{criticals} critical · {warnings} warnings</p>
              <Button size="sm" onClick={addFlag}><Plus className="w-4 h-4 mr-1" />Add Flag</Button>
            </div>
            <div className="space-y-2">
              {state.flags.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">No flags logged.</p>
              )}
              {state.flags.map(f => (
                <div key={f.id} className="flex items-center gap-3 border border-border/50 rounded p-2">
                  <Select value={f.severity} onValueChange={v => updateFlag(f.id, 'severity', v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={f.system} onValueChange={v => updateFlag(f.id, 'system', v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={f.description} onChange={e => updateFlag(f.id, 'description', e.target.value)} className="h-7 text-xs flex-1" placeholder="Flag description…" />
                  <AlertTriangle className={cn('w-4 h-4 shrink-0', SEVERITY_COLORS[f.severity])} />
                  <Button variant="ghost" size="sm" onClick={() => deleteFlag(f.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Audit Summary ── */}
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Audit Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-border rounded p-3">
                    <p className="text-xs text-muted-foreground">Total Logs</p>
                    <p className="text-xl font-bold">{state.rawLogs.length}</p>
                  </div>
                  <div className="border border-border rounded p-3">
                    <p className="text-xs text-muted-foreground">Correlations</p>
                    <p className="text-xl font-bold">{state.correlations.length}</p>
                  </div>
                  <div className="border border-border rounded p-3">
                    <p className="text-xs text-red-500">Critical Flags</p>
                    <p className="text-xl font-bold text-red-500">{criticals}</p>
                  </div>
                  <div className="border border-border rounded p-3">
                    <p className="text-xs text-muted-foreground">Avg Correlation</p>
                    <p className="text-xl font-bold">{avgCorr}%</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">Systems Logged</p>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(state.rawLogs.map(r => r.system))].map(s => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>

                {state.flags.filter(f => f.severity === 'Critical').length > 0 && (
                  <div>
                    <p className="font-medium text-red-500 mb-2">Critical Issues</p>
                    <ul className="space-y-1">
                      {state.flags.filter(f => f.severity === 'Critical').map(f => (
                        <li key={f.id} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                          <span>[{f.system}] {f.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  <Button onClick={exportXLSX} className="w-full">
                    <Download className="w-4 h-4 mr-2" />Export Full Model to Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Calculations ── */}
          <TabsContent value="calcs" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Auto-Calculations</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CTS_LEVELS.map(cts => {
                    const logs = state.rawLogs.filter(r => r.cts === cts);
                    const numericVals = logs.map(r => parseFloat(r.value)).filter(n => !isNaN(n));
                    const avg = numericVals.length ? (numericVals.reduce((s, v) => s + v, 0) / numericVals.length).toFixed(2) : 'N/A';
                    const max = numericVals.length ? Math.max(...numericVals).toFixed(2) : 'N/A';
                    const min = numericVals.length ? Math.min(...numericVals).toFixed(2) : 'N/A';
                    return (
                      <Card key={cts} className="border-border/50">
                        <CardContent className="py-3 px-4">
                          <p className="font-medium mb-2">{cts} — {logs.length} entries</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Avg: </span><span>{avg}</span></div>
                            <div><span className="text-muted-foreground">Max: </span><span>{max}</span></div>
                            <div><span className="text-muted-foreground">Min: </span><span>{min}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="font-medium mb-2">High-Impact Correlations</p>
                    {state.correlations.filter(c => c.impact === 'High').length === 0 ? (
                      <p className="text-xs text-muted-foreground">No high-impact correlations logged.</p>
                    ) : (
                      <ul className="space-y-1">
                        {state.correlations.filter(c => c.impact === 'High').map(c => (
                          <li key={c.id} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-red-500 shrink-0" />
                            <span>{c.systemA} ↔ {c.systemB}: {c.score}% — {c.finding}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
