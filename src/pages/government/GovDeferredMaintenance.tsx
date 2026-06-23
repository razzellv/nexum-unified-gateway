import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Plus, Lightbulb, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeferredItem {
  id: string;
  asset: string;
  location: string;
  description: string;
  yearDeferred: number;
  estimatedCost: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  operationalImpact: string;
  publicImpact: string;
  failureProbability: 'Low' | 'Medium' | 'High';
}

const EMPTY_ITEM: Omit<DeferredItem, 'id'> = {
  asset: '', location: '', description: '', yearDeferred: new Date().getFullYear(),
  estimatedCost: 0, riskLevel: 'Medium', operationalImpact: '', publicImpact: '', failureProbability: 'Medium',
};

function calcExposureScore(items: DeferredItem[]): number {
  const total = items.reduce((sum, item) => {
    const pts = item.riskLevel === 'Critical' ? 25 : item.riskLevel === 'High' ? 15 : item.riskLevel === 'Medium' ? 8 : 3;
    return sum + pts;
  }, 0);
  return Math.min(100, total);
}

function riskBadge(risk: string) {
  if (risk === 'Critical') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (risk === 'High') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (risk === 'Medium') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
}

function scoreColor(n: number): string {
  if (n >= 80) return 'text-red-400';
  if (n >= 60) return 'text-orange-400';
  if (n >= 40) return 'text-amber-400';
  return 'text-emerald-400';
}

function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function generateRiskAssessment(items: DeferredItem[]): string[] {
  if (items.length === 0) return ['Add deferred maintenance items to generate risk assessment.'];
  const critical = items.filter(i => i.riskLevel === 'Critical');
  const high = items.filter(i => i.riskLevel === 'High');
  const insights: string[] = [];
  if (critical.length > 0) insights.push(`${critical.length} CRITICAL item(s) require immediate funding authorization — failure risk is imminent.`);
  if (high.length > 0) insights.push(`${high.length} HIGH risk item(s) should be addressed within the next budget cycle.`);
  const totalCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  insights.push(`Total deferred maintenance exposure: ${fmt$(totalCost)} across ${items.length} item(s).`);
  const oldest = items.reduce((a, b) => a.yearDeferred < b.yearDeferred ? a : b, items[0]);
  if (oldest) insights.push(`Oldest deferred item (${oldest.asset}) has been deferred since ${oldest.yearDeferred} — ${new Date().getFullYear() - oldest.yearDeferred} years.`);
  insights.push('Document public and operational impact for each item to support emergency appropriations requests.');
  return insights.slice(0, 5);
}

export default function GovDeferredMaintenance() {
  const [items, setItems] = useState<DeferredItem[]>([]);
  const [form, setForm] = useState({ ...EMPTY_ITEM });
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'riskLevel' | 'estimatedCost' | 'yearDeferred'>('riskLevel');

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_deferred_items');
    if (raw) { try { setItems(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save(list: DeferredItem[]) {
    localStorage.setItem('nexum_gov_deferred_items', JSON.stringify(list));
    setItems(list);
  }

  function addItem() {
    if (!form.asset.trim()) return;
    save([...items, { ...form, id: Date.now().toString() }]);
    setForm({ ...EMPTY_ITEM });
    setShowForm(false);
  }

  function removeItem(id: string) { save(items.filter(i => i.id !== id)); }

  const exposureScore = calcExposureScore(items);
  const criticalCount = items.filter(i => i.riskLevel === 'Critical').length;
  const highCount = items.filter(i => i.riskLevel === 'High').length;
  const totalCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  const insights = generateRiskAssessment(items);

  const RISK_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'riskLevel') return RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
    if (sortBy === 'estimatedCost') return b.estimatedCost - a.estimatedCost;
    return a.yearDeferred - b.yearDeferred;
  });

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Deferred Maintenance Intelligence™</h1>
              <p className="text-muted-foreground text-sm">Track and score deferred maintenance exposure and risk</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>

        {/* Exposure Score */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Deferred Maintenance Exposure Score™</h2>
                <p className="text-xs text-muted-foreground">Higher score = greater financial and operational risk</p>
              </div>
              <span className={cn('text-4xl font-bold', scoreColor(exposureScore))}>{exposureScore}</span>
            </div>
            <Progress value={exposureScore} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">Critical ×25 + High ×15 + Medium ×8 + Low ×3, capped at 100</p>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{items.length}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
              <div className="text-xs text-muted-foreground">Critical Items</div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{highCount}</div>
              <div className="text-xs text-muted-foreground">High-Risk Items</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-amber-400">{fmt$(totalCost)}</div>
              <div className="text-xs text-muted-foreground">Total Estimated</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Add Deferred Maintenance Item</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Asset/System *</label>
                <Input value={form.asset} onChange={e => setForm(p => ({ ...p, asset: e.target.value }))} placeholder="e.g. Roof Section B" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Location</label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Building / address" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Year Deferred</label>
                <Input type="number" value={form.yearDeferred} onChange={e => setForm(p => ({ ...p, yearDeferred: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estimated Cost ($)</label>
                <Input type="number" value={form.estimatedCost} onChange={e => setForm(p => ({ ...p, estimatedCost: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Risk Level</label>
                <Select value={form.riskLevel} onValueChange={v => setForm(p => ({ ...p, riskLevel: v as DeferredItem['riskLevel'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Failure Probability</label>
                <Select value={form.failureProbability} onValueChange={v => setForm(p => ({ ...p, failureProbability: v as 'Low' | 'Medium' | 'High' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground">Description</label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of deferred work" />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Operational Impact</label>
                <Textarea value={form.operationalImpact} onChange={e => setForm(p => ({ ...p, operationalImpact: e.target.value }))} placeholder="How does this affect operations?" className="h-16 text-xs" />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Public Impact</label>
                <Textarea value={form.publicImpact} onChange={e => setForm(p => ({ ...p, publicImpact: e.target.value }))} placeholder="How does this affect the public?" className="h-16 text-xs" />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button onClick={addItem} className="flex-1">Add Item</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        {items.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Deferred Items ({items.length})</CardTitle>
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="riskLevel">Sort by Risk</SelectItem>
                    <SelectItem value="estimatedCost">Sort by Cost</SelectItem>
                    <SelectItem value="yearDeferred">Sort by Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Asset', 'Location', 'Year', 'Cost', 'Risk', 'Failure Prob', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map(item => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground">{item.asset}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.location || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.yearDeferred}</td>
                        <td className="px-3 py-2 text-foreground">{fmt$(item.estimatedCost)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className={cn('text-xs border', riskBadge(item.riskLevel))}>{item.riskLevel}</Badge></td>
                        <td className="px-3 py-2"><Badge variant="outline" className={cn('text-xs border', riskBadge(item.failureProbability))}>{item.failureProbability}</Badge></td>
                        <td className="px-3 py-2"><button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Risk Assessment */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> AI Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((i, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-foreground">
                  <span className="text-red-400 font-bold shrink-0">•</span> {i}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
