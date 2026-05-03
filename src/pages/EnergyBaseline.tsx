import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Zap, Plus, Trash2, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

interface UtilityRow {
  id: string;
  month: string;
  electric_kwh: string;
  gas_therms: string;
  water_kgal: string;
  hdd: string;
  cdd: string;
  sqft: string;
  occupancy: string;
  note: string;
}

interface CTSPanel {
  id: 'CTS1' | 'CTS2' | 'CTS3' | 'CTS4' | 'CTS5';
  label: string;
  baseline: string;
  current: string;
  unit: string;
  status: 'Optimal' | 'Monitor' | 'Action Required';
  notes: string;
}

interface BaselineState {
  clientId: string;
  sqft: string;
  buildingType: string;
  rows: UtilityRow[];
  ctsData: CTSPanel[];
  defensibilityNotes: string;
}

const BUILDING_TYPES = ['Office', 'Retail', 'Industrial', 'Healthcare', 'Education', 'Hospitality', 'Mixed Use', 'Government'];

const DEFAULT_CTS: CTSPanel[] = [
  { id: 'CTS1', label: 'Boiler Efficiency', baseline: '', current: '', unit: '%', status: 'Monitor', notes: '' },
  { id: 'CTS2', label: 'HVAC Load Factor', baseline: '', current: '', unit: 'kBTU/sqft', status: 'Monitor', notes: '' },
  { id: 'CTS3', label: 'Chiller COP', baseline: '', current: '', unit: 'ratio', status: 'Monitor', notes: '' },
  { id: 'CTS4', label: 'Lighting W/sqft', baseline: '', current: '', unit: 'W/sqft', status: 'Monitor', notes: '' },
  { id: 'CTS5', label: 'Plug Load Index', baseline: '', current: '', unit: 'kWh/occupant', status: 'Monitor', notes: '' },
];

const STATUS_COLORS: Record<string, string> = {
  Optimal: 'text-green-500 border-green-500/30 bg-green-500/10',
  Monitor: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
  'Action Required': 'text-red-500 border-red-500/30 bg-red-500/10',
};

const EMPTY: BaselineState = {
  clientId: '',
  sqft: '',
  buildingType: 'Office',
  rows: [],
  ctsData: DEFAULT_CTS.map(c => ({ ...c })),
  defensibilityNotes: '',
};

function blankRow(): UtilityRow {
  return {
    id: `row-${Date.now()}`,
    month: new Date().toISOString().slice(0, 7),
    electric_kwh: '', gas_therms: '', water_kgal: '',
    hdd: '', cdd: '', sqft: '', occupancy: '', note: '',
  };
}

export default function EnergyBaseline() {
  const [tab, setTab] = useState('input');
  const [state, setState] = useState<BaselineState>(EMPTY);

  useEffect(() => {
    syncRead<BaselineState>('nexum_energy_baseline', '/energy-baseline', facilityId).then(d => {
      if (d) setState(d);
    });
  }, []);

  const save = (next: BaselineState) => {
    setState(next);
    syncWrite('nexum_energy_baseline', next, '/energy-baseline', facilityId);
  };

  const updateField = (field: keyof BaselineState, val: string) =>
    save({ ...state, [field]: val });

  const addRow = () => save({ ...state, rows: [...state.rows, blankRow()] });
  const updateRow = (id: string, field: keyof UtilityRow, val: string) =>
    save({ ...state, rows: state.rows.map(r => r.id === id ? { ...r, [field]: val } : r) });
  const deleteRow = (id: string) =>
    save({ ...state, rows: state.rows.filter(r => r.id !== id) });

  const updateCTS = (id: string, field: keyof CTSPanel, val: string) =>
    save({ ...state, ctsData: state.ctsData.map(c => c.id === id ? { ...c, [field]: val } : c) });

  // Normalization calculations
  const numRows = state.rows.filter(r => r.electric_kwh && r.sqft).length;
  const sqft = parseFloat(state.sqft) || 1;
  const totalKwh = state.rows.reduce((s, r) => s + (parseFloat(r.electric_kwh) || 0), 0);
  const totalGas = state.rows.reduce((s, r) => s + (parseFloat(r.gas_therms) || 0), 0);
  const eui = numRows > 0 ? ((totalKwh * 3.412 + totalGas * 100) / sqft).toFixed(1) : 'N/A';
  const ekwh_sqft = sqft > 1 ? (totalKwh / sqft).toFixed(2) : 'N/A';

  const chartData = state.rows
    .filter(r => r.month && r.electric_kwh)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(r => ({
      month: r.month.slice(5),
      electric: parseFloat(r.electric_kwh) || 0,
      gas: parseFloat(r.gas_therms) || 0,
    }));

  const kpiData = [
    { kpi: 'EUI (kBTU/sqft)', value: eui },
    { kpi: 'Electric (kWh/sqft)', value: ekwh_sqft },
    { kpi: 'Total Electric (kWh)', value: totalKwh.toLocaleString() },
    { kpi: 'Total Gas (therms)', value: totalGas.toLocaleString() },
  ];

  const exportData = () => {
    const csv = [
      ['Month', 'Electric kWh', 'Gas Therms', 'Water kGal', 'HDD', 'CDD', 'Sqft', 'Occupancy', 'Note'],
      ...state.rows.map(r => [r.month, r.electric_kwh, r.gas_therms, r.water_kgal, r.hdd, r.cdd, r.sqft, r.occupancy, r.note]),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-baseline-${state.clientId || 'export'}.csv`;
    a.click();
    toast.success('Exported to CSV.');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Zap className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Energy Baseline</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Nexum Internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Establish energy baselines, normalize KPIs, and integrate CTS data.</p>
        </div>

        {/* Client header */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Client FacilityId</Label>
                <Input value={state.clientId} onChange={e => updateField('clientId', e.target.value)} placeholder="facility-001" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Building Type</Label>
                <Select value={state.buildingType} onValueChange={v => updateField('buildingType', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{BUILDING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Building Sqft</Label>
                <Input value={state.sqft} onChange={e => updateField('sqft', e.target.value)} placeholder="50000" className="h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="input">Data Input</TabsTrigger>
            <TabsTrigger value="normalization">Normalization</TabsTrigger>
            <TabsTrigger value="cts">CTS Integration</TabsTrigger>
            <TabsTrigger value="defensibility">Decision Defensibility</TabsTrigger>
            <TabsTrigger value="report">Baseline Report</TabsTrigger>
          </TabsList>

          {/* ── Data Input ── */}
          <TabsContent value="input" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{state.rows.length} months entered</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportData}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
                <Button size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1" />Add Month</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground uppercase">
                    {['Month', 'Electric (kWh)', 'Gas (therms)', 'Water (kGal)', 'HDD', 'CDD', 'Sqft', 'Occupancy', 'Note', ''].map(h => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rows.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-6 text-muted-foreground">No data yet. Click "Add Month" to begin.</td></tr>
                  )}
                  {state.rows.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-2 py-1"><Input type="month" value={r.month} onChange={e => updateRow(r.id, 'month', e.target.value)} className="h-7 w-32 text-xs" /></td>
                      <td className="px-2 py-1"><Input value={r.electric_kwh} onChange={e => updateRow(r.id, 'electric_kwh', e.target.value)} className="h-7 w-24 text-xs" placeholder="kWh" /></td>
                      <td className="px-2 py-1"><Input value={r.gas_therms} onChange={e => updateRow(r.id, 'gas_therms', e.target.value)} className="h-7 w-24 text-xs" placeholder="therms" /></td>
                      <td className="px-2 py-1"><Input value={r.water_kgal} onChange={e => updateRow(r.id, 'water_kgal', e.target.value)} className="h-7 w-20 text-xs" placeholder="kGal" /></td>
                      <td className="px-2 py-1"><Input value={r.hdd} onChange={e => updateRow(r.id, 'hdd', e.target.value)} className="h-7 w-16 text-xs" placeholder="HDD" /></td>
                      <td className="px-2 py-1"><Input value={r.cdd} onChange={e => updateRow(r.id, 'cdd', e.target.value)} className="h-7 w-16 text-xs" placeholder="CDD" /></td>
                      <td className="px-2 py-1"><Input value={r.sqft} onChange={e => updateRow(r.id, 'sqft', e.target.value)} className="h-7 w-20 text-xs" placeholder="sqft" /></td>
                      <td className="px-2 py-1"><Input value={r.occupancy} onChange={e => updateRow(r.id, 'occupancy', e.target.value)} className="h-7 w-20 text-xs" placeholder="%" /></td>
                      <td className="px-2 py-1"><Input value={r.note} onChange={e => updateRow(r.id, 'note', e.target.value)} className="h-7 w-36 text-xs" placeholder="Note" /></td>
                      <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => deleteRow(r.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Normalization ── */}
          <TabsContent value="normalization" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiData.map(k => (
                <Card key={k.kpi}>
                  <CardContent className="py-4 px-4">
                    <p className="text-xl font-bold">{k.value}</p>
                    <p className="text-xs text-muted-foreground">{k.kpi}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {chartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Monthly Consumption Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="electric" stroke="#6366f1" strokeWidth={2} dot={false} name="Electric (kWh)" />
                      <Line type="monotone" dataKey="gas" stroke="#f97316" strokeWidth={2} dot={false} name="Gas (therms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartData.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">Enter monthly data in the Data Input tab to see trends.</p>
            )}
          </TabsContent>

          {/* ── CTS Integration ── */}
          <TabsContent value="cts" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">CTS-1 through CTS-5 system performance panels. Set baseline and current values to track drift.</p>
            <div className="space-y-3">
              {state.ctsData.map(c => (
                <Card key={c.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline">{c.id}</Badge>
                      <p className="font-medium text-sm">{c.label}</p>
                      <Badge className={cn('ml-auto text-xs border', STATUS_COLORS[c.status])}>{c.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs">Baseline</Label>
                        <Input value={c.baseline} onChange={e => updateCTS(c.id, 'baseline', e.target.value)} className="h-8 text-xs" placeholder={c.unit} />
                      </div>
                      <div>
                        <Label className="text-xs">Current</Label>
                        <Input value={c.current} onChange={e => updateCTS(c.id, 'current', e.target.value)} className="h-8 text-xs" placeholder={c.unit} />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Input value={c.unit} onChange={e => updateCTS(c.id, 'unit', e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={c.status} onValueChange={v => updateCTS(c.id, 'status', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Optimal">Optimal</SelectItem>
                            <SelectItem value="Monitor">Monitor</SelectItem>
                            <SelectItem value="Action Required">Action Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input value={c.notes} onChange={e => updateCTS(c.id, 'notes', e.target.value)} className="h-8 text-xs" placeholder="Notes" />
                      </div>
                    </div>
                    {c.baseline && c.current && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Drift:</span>
                        <span className={cn('font-mono font-medium', parseFloat(c.current) > parseFloat(c.baseline) ? 'text-red-500' : 'text-green-500')}>
                          {((parseFloat(c.current) - parseFloat(c.baseline)) / parseFloat(c.baseline) * 100).toFixed(1)}%
                        </span>
                        {parseFloat(c.current) <= parseFloat(c.baseline) && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Decision Defensibility ── */}
          <TabsContent value="defensibility" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Auto-generated defensibility statements based on your data. Edit or expand as needed.</p>

            <div className="space-y-3">
              {/* Auto-statements */}
              {[
                state.rows.length >= 12
                  ? `✓ 12 months of utility data collected for ${state.clientId || 'this facility'} — sufficient for baseline period under ASHRAE 14.`
                  : `⚠ Only ${state.rows.length} months logged — collect 12 months minimum for a defensible baseline.`,
                state.sqft
                  ? `✓ Building area documented at ${parseFloat(state.sqft).toLocaleString()} sqft — EUI calculation of ${eui} kBTU/sqft/yr on file.`
                  : '⚠ Building sqft not entered — EUI cannot be calculated.',
                state.ctsData.filter(c => c.baseline && c.current).length > 0
                  ? `✓ ${state.ctsData.filter(c => c.baseline && c.current).length} CTS system(s) have baseline and current readings logged.`
                  : '⚠ No CTS baseline readings entered — complete CTS Integration tab.',
                state.ctsData.some(c => c.status === 'Action Required')
                  ? `⚠ ${state.ctsData.filter(c => c.status === 'Action Required').length} CTS system(s) require action — review and document corrective plan.`
                  : '✓ All CTS systems are within acceptable range (no Action Required status).',
              ].map((stmt, i) => (
                <div key={i} className={cn('border rounded p-3 text-sm', stmt.startsWith('✓') ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5')}>
                  {stmt}
                </div>
              ))}
            </div>

            <div>
              <Label>Additional Defensibility Notes</Label>
              <Textarea
                value={state.defensibilityNotes}
                onChange={e => updateField('defensibilityNotes', e.target.value)}
                rows={5}
                placeholder="Document any additional context, observations, or justifications for baseline decisions…"
              />
            </div>
            <Button onClick={() => { save(state); toast.success('Notes saved.'); }}>Save Notes</Button>
          </TabsContent>

          {/* ── Baseline Report ── */}
          <TabsContent value="report" className="mt-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">Energy Baseline Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="border-b border-border pb-3">
                  <p className="text-lg font-bold">Energy Baseline Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Client: {state.clientId || 'N/A'} · {state.buildingType} · {state.sqft ? `${parseFloat(state.sqft).toLocaleString()} sqft` : 'Sqft TBD'} · Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {kpiData.map(k => (
                    <div key={k.kpi} className="border border-border rounded p-2">
                      <p className="text-xs text-muted-foreground">{k.kpi}</p>
                      <p className="font-bold">{k.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="font-medium mb-2">CTS System Status</p>
                  <div className="space-y-1">
                    {state.ctsData.map(c => (
                      <div key={c.id} className="flex items-center gap-3 text-xs">
                        <Badge variant="outline" className="text-xs">{c.id}</Badge>
                        <span className="flex-1">{c.label}</span>
                        {c.baseline && c.current && (
                          <span className="text-muted-foreground">Baseline: {c.baseline} {c.unit} → Current: {c.current} {c.unit}</span>
                        )}
                        <Badge className={cn('text-xs border', STATUS_COLORS[c.status])}>{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {state.defensibilityNotes && (
                  <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs italic text-muted-foreground">
                    {state.defensibilityNotes}
                  </div>
                )}

                <Button variant="outline" onClick={() => window.print()} className="w-full">
                  Print / Export Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
