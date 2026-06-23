import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Plus, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapitalAsset {
  id: string;
  name: string;
  category: string;
  yearInstalled: number;
  lifecycle: number;
  replacementCost: number;
  condition: number;
  notes: string;
}

const CATEGORIES = ['HVAC', 'Boilers', 'Chillers', 'Roofing', 'Electrical', 'Fire Systems', 'Water Systems', 'Fleet', 'Roads', 'Stormwater Infrastructure'];

const EMPTY_ASSET: Omit<CapitalAsset, 'id'> = {
  name: '', category: 'HVAC', yearInstalled: 2000, lifecycle: 20, replacementCost: 0, condition: 7, notes: '',
};

function replacementYear(asset: CapitalAsset): number {
  return asset.yearInstalled + asset.lifecycle;
}

function yearsUntilReplacement(asset: CapitalAsset): number {
  return replacementYear(asset) - new Date().getFullYear();
}

function capitalRiskIndex(assets: CapitalAsset[]): string {
  if (assets.length === 0) return 'Unknown';
  const pastDue = assets.filter(a => yearsUntilReplacement(a) <= 0).length;
  const within3 = assets.filter(a => yearsUntilReplacement(a) > 0 && yearsUntilReplacement(a) <= 3).length;
  const ratio = (pastDue * 2 + within3) / assets.length;
  if (ratio > 0.5 || pastDue > 2) return 'Critical';
  if (ratio > 0.3 || pastDue > 0) return 'High';
  if (ratio > 0.15 || within3 > 1) return 'Moderate';
  return 'Low';
}

function riskBadge(risk: string) {
  if (risk === 'Critical') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (risk === 'High') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (risk === 'Moderate') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (risk === 'Low') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function conditionColor(c: number): string {
  if (c >= 8) return 'text-emerald-400';
  if (c >= 6) return 'text-amber-400';
  if (c >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function assetsInWindow(assets: CapitalAsset[], years: number): CapitalAsset[] {
  return assets.filter(a => {
    const ytr = yearsUntilReplacement(a);
    return ytr <= years;
  }).sort((a, b) => yearsUntilReplacement(a) - yearsUntilReplacement(b));
}

function generatePriorities(assets: CapitalAsset[]): string[] {
  if (assets.length === 0) return ['Add assets to generate capital priority recommendations.'];
  const sorted = [...assets].sort((a, b) => {
    const scoreA = (10 - a.condition) * 2 + Math.max(0, 10 - yearsUntilReplacement(a));
    const scoreB = (10 - b.condition) * 2 + Math.max(0, 10 - yearsUntilReplacement(b));
    return scoreB - scoreA;
  });
  return sorted.slice(0, 5).map((a, i) => {
    const ytr = yearsUntilReplacement(a);
    const urgency = ytr <= 0 ? 'PAST DUE' : ytr <= 2 ? `due in ${ytr}yr` : `due in ${ytr}yrs`;
    return `${i + 1}. ${a.name} (${a.category}) — ${fmt$(a.replacementCost)}, ${urgency}, condition ${a.condition}/10`;
  });
}

export default function GovCapitalPlanning() {
  const [assets, setAssets] = useState<CapitalAsset[]>([]);
  const [form, setForm] = useState({ ...EMPTY_ASSET });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_capital_assets');
    if (raw) { try { setAssets(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save(list: CapitalAsset[]) {
    localStorage.setItem('nexum_gov_capital_assets', JSON.stringify(list));
    setAssets(list);
  }

  function addAsset() {
    if (!form.name.trim()) return;
    save([...assets, { ...form, id: Date.now().toString() }]);
    setForm({ ...EMPTY_ASSET });
    setShowForm(false);
  }

  function removeAsset(id: string) { save(assets.filter(a => a.id !== id)); }

  const risk = capitalRiskIndex(assets);
  const priorities = generatePriorities(assets);

  const WINDOWS = [
    { label: '1 Year', years: 1 },
    { label: '3 Year', years: 3 },
    { label: '5 Year', years: 5 },
    { label: '10 Year', years: 10 },
  ];

  // Build bar chart data (cost by year bucket)
  const currentYear = new Date().getFullYear();
  const barData: { year: number; cost: number }[] = [];
  for (let y = currentYear; y <= currentYear + 10; y++) {
    const cost = assets.filter(a => replacementYear(a) === y).reduce((s, a) => s + a.replacementCost, 0);
    if (cost > 0) barData.push({ year: y, cost });
  }
  const maxCost = Math.max(...barData.map(b => b.cost), 1);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-orange-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Capital Planning Intelligence™</h1>
              <p className="text-muted-foreground text-sm">Multi-year capital replacement forecasting and risk analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm px-3 py-1 border', riskBadge(risk))}>Capital Risk: {risk}</Badge>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Asset
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{assets.length}</div>
              <div className="text-xs text-muted-foreground">Total Assets</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{assets.filter(a => yearsUntilReplacement(a) <= 0).length}</div>
              <div className="text-xs text-muted-foreground">Past Due</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{assets.filter(a => yearsUntilReplacement(a) > 0 && yearsUntilReplacement(a) <= 5).length}</div>
              <div className="text-xs text-muted-foreground">Due ≤5 Years</div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-400">{fmt$(assets.reduce((s, a) => s + a.replacementCost, 0))}</div>
              <div className="text-xs text-muted-foreground">Total Exposure</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Add Capital Asset</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Asset Name *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HVAC Unit #3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Year Installed</label>
                <Input type="number" value={form.yearInstalled} onChange={e => setForm(p => ({ ...p, yearInstalled: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Expected Lifecycle (years)</label>
                <Input type="number" value={form.lifecycle} onChange={e => setForm(p => ({ ...p, lifecycle: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estimated Replacement Cost ($)</label>
                <Input type="number" value={form.replacementCost} onChange={e => setForm(p => ({ ...p, replacementCost: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Current Condition (1-10)</label>
                <Input type="number" min={1} max={10} value={form.condition} onChange={e => setForm(p => ({ ...p, condition: Math.min(10, Math.max(1, +e.target.value)) }))} />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button onClick={addAsset} className="flex-1">Add Asset</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast Tabs */}
        <Tabs defaultValue="1">
          <TabsList className="grid grid-cols-4 w-full max-w-sm">
            {WINDOWS.map(w => <TabsTrigger key={w.years} value={String(w.years)}>{w.label}</TabsTrigger>)}
          </TabsList>
          {WINDOWS.map(w => {
            const windowAssets = assetsInWindow(assets, w.years);
            const total = windowAssets.reduce((s, a) => s + a.replacementCost, 0);
            const windowRisk = windowAssets.length === 0 ? 'Low' : windowAssets.length >= 5 ? 'Critical' : windowAssets.length >= 3 ? 'High' : windowAssets.length >= 1 ? 'Moderate' : 'Low';
            return (
              <TabsContent key={w.years} value={String(w.years)} className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">{w.label} Capital Forecast</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs border', riskBadge(windowRisk))}>{windowRisk} Risk</Badge>
                        <span className="text-sm font-bold text-orange-400">{fmt$(total)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {windowAssets.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No assets due within {w.label.toLowerCase()}</p>
                    ) : (
                      <div className="space-y-2">
                        {windowAssets.map(a => (
                          <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <span className="text-sm font-medium text-foreground">{a.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{a.category}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={conditionColor(a.condition)}>Condition {a.condition}/10</span>
                              <span className={cn(yearsUntilReplacement(a) <= 0 ? 'text-red-400' : yearsUntilReplacement(a) <= 2 ? 'text-amber-400' : 'text-muted-foreground')}>
                                {yearsUntilReplacement(a) <= 0 ? 'PAST DUE' : `${replacementYear(a)}`}
                              </span>
                              <span className="font-medium text-foreground">{fmt$(a.replacementCost)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* CSS Bar Chart */}
        {barData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Replacement Cost Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {barData.map(b => (
                  <div key={b.year} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-muted-foreground">{fmt$(b.cost).replace('$', '$').replace(',000,000', 'M').replace(',000', 'K')}</span>
                    <div
                      className="w-full bg-orange-500/60 rounded-t border border-orange-500/30"
                      style={{ height: `${Math.round((b.cost / maxCost) * 100)}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-muted-foreground">{b.year}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Priority List */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-orange-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> AI Capital Priority List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {priorities.map((p, i) => (
                <li key={i} className="text-xs text-foreground">{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Asset List */}
        {assets.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">All Assets ({assets.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Asset', 'Category', 'Installed', 'Lifecycle', 'Replacement Yr', 'Condition', 'Cost', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground">{a.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.category}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.yearInstalled}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.lifecycle}yr</td>
                        <td className="px-3 py-2">
                          <span className={cn(yearsUntilReplacement(a) <= 0 ? 'text-red-400 font-bold' : yearsUntilReplacement(a) <= 3 ? 'text-amber-400' : 'text-muted-foreground')}>
                            {replacementYear(a)} {yearsUntilReplacement(a) <= 0 && '⚠'}
                          </span>
                        </td>
                        <td className="px-3 py-2"><span className={conditionColor(a.condition)}>{a.condition}/10</span></td>
                        <td className="px-3 py-2 text-foreground">{fmt$(a.replacementCost)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeAsset(a.id)} className="text-muted-foreground hover:text-destructive">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
