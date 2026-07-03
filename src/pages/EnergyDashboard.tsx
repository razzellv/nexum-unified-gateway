import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { MeterRegistry }       from '@/components/energy/MeterRegistry';
import { ReadingDialog }        from '@/components/energy/ReadingDialog';
import { EnergyTimeline }       from '@/components/energy/EnergyTimeline';
import { ExecutiveSummaryPanel } from '@/components/energy/ExecutiveSummary';
import { MPCCPanel }            from '@/components/energy/MPCCPanel';

import {
  loadMeters, saveMeter, loadCostConfig, saveCostConfig,
  buildForecast, buildBenchmarks, rollingConsumption,
  detectEvents, KEYS,
} from '@/lib/energy-engine';
import type {
  EnergyMeter, EnergyReading, EnergyEvent, CostConfig,
  UtilityType, BenchmarkResult, ForecastSummary,
} from '@/types/energy';

import {
  Zap, Droplets, Flame, Wind, Activity, DollarSign,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, Target, Clock, Settings2, Plus, RefreshCw,
  Leaf, Shield, Brain, Gauge, Calendar, FileText,
  Building2, Thermometer, Radio, ChevronRight,
} from 'lucide-react';

// ── Storage read helpers ──────────────────────────────────────────────────────

function readJson<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}

// ── Utility display config ────────────────────────────────────────────────────

const UTIL_META: Partial<Record<UtilityType, { icon: any; color: string; label: string }>> = {
  electric:       { icon: Zap,         color: '#FFD600',  label: 'Electric' },
  water:          { icon: Droplets,    color: '#60B4FF',  label: 'Water' },
  natural_gas:    { icon: Flame,       color: '#FF8C42',  label: 'Natural Gas' },
  steam:          { icon: Wind,        color: '#C084FC',  label: 'Steam' },
  solar_production:{ icon: Zap,        color: '#00FFE1',  label: 'Solar' },
  chilled_water:  { icon: Thermometer, color: '#67E8F9',  label: 'Chilled Water' },
  hot_water:      { icon: Thermometer, color: '#F97316',  label: 'Hot Water' },
  compressed_air: { icon: Radio,       color: '#94A3B8',  label: 'Compressed Air' },
  generator_fuel: { icon: Gauge,       color: '#FCA5A5',  label: 'Generator Fuel' },
};

// ── Event type colors ─────────────────────────────────────────────────────────

const EVENT_COLORS: Record<EnergyEvent['severity'], string> = {
  critical: 'border-red-500/40 bg-red-500/5 text-red-400',
  warning:  'border-yellow-500/40 bg-yellow-500/5 text-yellow-400',
  info:     'border-white/15 bg-white/2 text-muted-foreground',
};

// ── Benchmark status badge ────────────────────────────────────────────────────

function BenchBadge({ status }: { status: BenchmarkResult['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    below_target: { label: 'Below Target ✓',  cls: 'text-green-400 border-green-400/30' },
    on_target:    { label: 'On Target',        cls: 'text-[#00FFE1] border-[#00FFE1]/30' },
    above_target: { label: 'Above Target',     cls: 'text-yellow-400 border-yellow-400/30' },
    improving:    { label: 'Improving',        cls: 'text-blue-400 border-blue-400/30' },
    declining:    { label: 'Declining',        cls: 'text-orange-400 border-orange-400/30' },
    critical:     { label: 'Critical',         cls: 'text-red-400 border-red-400/30' },
  };
  const m = map[status] || map.on_target;
  return <Badge variant="outline" className={cn('text-[10px] px-1.5', m.cls)}>{m.label}</Badge>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EnergyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const operator   = user?.name || user?.email || 'Operator';

  // ── Core state ────────────────────────────────────────────────────────────

  const [meters,   setMeters]   = useState<EnergyMeter[]>([]);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [events,   setEvents]   = useState<EnergyEvent[]>([]);
  const [config,   setConfig]   = useState<CostConfig>(() => loadCostConfig(facilityId));

  const [activeMeter,  setActiveMeter]  = useState<EnergyMeter | null>(null);
  const [readingOpen,  setReadingOpen]  = useState(false);
  const [costEditOpen, setCostEditOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | any>('all');

  // ── Load from localStorage ────────────────────────────────────────────────

  const reload = useCallback(() => {
    setMeters(loadMeters(facilityId));
    setReadings(readJson<EnergyReading[]>(KEYS.readings(facilityId), []));
    setEvents(readJson<EnergyEvent[]>(KEYS.events(facilityId), []));
    setConfig(loadCostConfig(facilityId));
  }, [facilityId]);

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener('nexum_energy_update', onUpdate);
    return () => window.removeEventListener('nexum_energy_update', onUpdate);
  }, [reload]);

  // ── Derived metrics ───────────────────────────────────────────────────────

  const byUtility = useMemo(() => {
    const map: Record<string, EnergyReading[]> = {};
    readings.forEach(r => {
      if (!map[r.utilityType]) map[r.utilityType] = [];
      map[r.utilityType].push(r);
    });
    return map;
  }, [readings]);

  const totalCost30 = useMemo(() =>
    readings.filter(r => {
      const age = Date.now() - new Date(r.timestamp).getTime();
      return age < 30 * 86400000;
    }).reduce((s, r) => s + r.cost, 0),
  [readings]);

  const totalCarbon = useMemo(() =>
    readings.reduce((s, r) => s + r.carbonLbs, 0),
  [readings]);

  const openEvents = events.filter(e => !e.acknowledged);

  const primaryMeter = meters.find(m => m.utilityType === 'electric') || meters[0];

  const forecast: ForecastSummary | null = useMemo(() =>
    primaryMeter ? buildForecast(readings, primaryMeter.meterId, config) : null,
  [readings, primaryMeter, config]);

  const benchmarks: BenchmarkResult[] = useMemo(() =>
    primaryMeter ? buildBenchmarks(readings, primaryMeter.meterId, config) : [],
  [readings, primaryMeter, config]);

  // ── Cost config save ──────────────────────────────────────────────────────

  function saveConfig() {
    saveCostConfig(facilityId, config);
    toast({ title: 'Cost configuration saved' });
    setCostEditOpen(false);
    reload();
  }

  // ── Acknowledge event ─────────────────────────────────────────────────────

  function ackEvent(eventId: string) {
    const updated = events.map(e => e.eventId === eventId ? { ...e, acknowledged: true } : e);
    try { localStorage.setItem(KEYS.events(facilityId), JSON.stringify(updated)); } catch {}
    setEvents(updated);
  }

  // ── Stat card ─────────────────────────────────────────────────────────────

  function StatCard({ label, value, sub, icon: Icon, color = '#00FFE1', alert = false }: any) {
    return (
      <Card className={cn('border-white/10 transition-all', alert && 'border-red-500/40')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div className="text-xl font-bold" style={{ color }}>{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </CardContent>
      </Card>
    );
  }

  // ── Reading row sub-component ─────────────────────────────────────────────

  function ReadingRow({ r }: { r: EnergyReading }) {
    const meta = UTIL_META[r.utilityType] || { icon: Activity, color: '#00FFE1', label: r.utilityType };
    const Icon = meta.icon;
    return (
      <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            {r.consumption.toFixed(1)} {r.unit}
            {r.abnormalEvent && <Badge variant="outline" className="ml-2 text-[9px] text-orange-400 border-orange-400/30">{r.abnormalEvent}</Badge>}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {new Date(r.timestamp).toLocaleString()} | {r.operator} | {r.building || 'N/A'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold" style={{ color: meta.color }}>${r.cost.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">{r.season}</div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 p-4 md:p-6 max-w-screen-2xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#00FFE1]">Energy Intelligence™ 2.0</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Operational Energy Intelligence™ — every reading contributes to Decision Defensibility™
            </p>
          </div>
          <div className="flex items-center gap-2">
            {openEvents.length > 0 && (
              <Badge variant="outline" className="text-red-400 border-red-400/30 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />{openEvents.length} Event{openEvents.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (meters.length > 0) { setActiveMeter(meters[0]); setReadingOpen(true); } }}
              disabled={meters.length === 0}
              className="text-[#00FFE1] border-[#00FFE1]/30 hover:bg-[#00FFE1]/10"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />Log Reading
            </Button>
            <Button size="sm" variant="ghost" onClick={reload}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Top-level KPIs ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Meters Registered"   value={meters.length}                     sub={`${meters.filter(m => m.active).length} active`}          icon={Gauge}       color="#00FFE1" />
          <StatCard label="Total Readings"       value={readings.length}                   sub="Append-only history"                                        icon={Activity}    color="#00FFE1" />
          <StatCard label="30-Day Cost"          value={`$${totalCost30.toFixed(0)}`}      sub="All utilities"                                              icon={DollarSign}  color="#FFD600" />
          <StatCard label="Open Events"          value={openEvents.length}                 sub="Require attention"                                          icon={AlertTriangle} color={openEvents.length > 0 ? '#EF4444' : '#00FFE1'} alert={openEvents.length > 0} />
          <StatCard label="Carbon YTD"           value={`${(totalCarbon/2000).toFixed(1)}t`} sub="CO₂ equivalent"                                         icon={Leaf}        color="#4ADE80" />
          <StatCard label="Annual Forecast"      value={forecast ? `$${(forecast.annualProjection/1000).toFixed(0)}K` : '—'} sub="Projected cost"         icon={TrendingUp}  color="#C084FC" />
        </div>

        {/* ── Main tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
            <TabsTrigger value="overview"   className="text-xs"><BarChart3    className="w-3 h-3 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="meters"     className="text-xs"><Gauge        className="w-3 h-3 mr-1" />Meters</TabsTrigger>
            <TabsTrigger value="readings"   className="text-xs"><Activity     className="w-3 h-3 mr-1" />Reading Log</TabsTrigger>
            <TabsTrigger value="events"     className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Events {openEvents.length > 0 && `(${openEvents.length})`}</TabsTrigger>
            <TabsTrigger value="forecast"   className="text-xs"><TrendingUp   className="w-3 h-3 mr-1" />Forecast</TabsTrigger>
            <TabsTrigger value="benchmark"  className="text-xs"><Target       className="w-3 h-3 mr-1" />Benchmark</TabsTrigger>
            <TabsTrigger value="timeline"   className="text-xs"><Clock        className="w-3 h-3 mr-1" />Intelligence Timeline</TabsTrigger>
            <TabsTrigger value="executive"  className="text-xs"><Brain        className="w-3 h-3 mr-1" />Executive</TabsTrigger>
            <TabsTrigger value="cost"       className="text-xs"><DollarSign   className="w-3 h-3 mr-1" />Cost Engine</TabsTrigger>
            <TabsTrigger value="mpcc"       className="text-xs"><Radio        className="w-3 h-3 mr-1" />MPCC</TabsTrigger>
          </TabsList>

          {/* ── Overview ────────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {meters.length === 0 ? (
              <Card className="border-dashed border-white/20">
                <CardContent className="p-8 text-center">
                  <Gauge className="w-10 h-10 mx-auto mb-3 text-[#00FFE1] opacity-50" />
                  <h3 className="text-base font-semibold text-[#00FFE1] mb-1">No Meters Registered</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Register your first utility meter to begin capturing operational energy data.
                    Every reading builds your Decision Defensibility™ record.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {}}
                    className="bg-[#00FFE1]/10 text-[#00FFE1] border border-[#00FFE1]/30"
                  >
                    Go to Meter Registry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(byUtility).map(([utilType, utReadings]) => {
                  const meta  = UTIL_META[utilType as UtilityType] || { icon: Activity, color: '#00FFE1', label: utilType };
                  const Icon  = meta.icon;
                  const total = utReadings.reduce((s, r) => s + r.consumption, 0);
                  const cost  = utReadings.reduce((s, r) => s + r.cost, 0);
                  const last  = utReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                  const unit  = last?.unit || '';
                  return (
                    <Card key={utilType} className="border-white/10 hover:border-[#00FFE1]/30 transition-all">
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                          <span style={{ color: meta.color }}>{meta.label}</span>
                          <Badge variant="outline" className="ml-auto text-[9px]">{utReadings.length} readings</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] text-muted-foreground">Total Consumption</div>
                            <div className="text-base font-bold" style={{ color: meta.color }}>
                              {total > 1000 ? `${(total/1000).toFixed(1)}K` : total.toFixed(1)} {unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">Total Cost</div>
                            <div className="text-base font-bold text-yellow-400">
                              ${cost >= 1000 ? `${(cost/1000).toFixed(1)}K` : cost.toFixed(0)}
                            </div>
                          </div>
                        </div>
                        {last && (
                          <div className="text-[10px] text-muted-foreground border-t border-white/5 pt-2">
                            Last reading: {new Date(last.timestamp).toLocaleDateString()} | {last.consumption.toFixed(1)} {unit}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-[10px] h-7 text-[#00FFE1] hover:bg-[#00FFE1]/10"
                          onClick={() => {
                            const m = meters.find(m => m.utilityType === utilType);
                            if (m) { setActiveMeter(m); setReadingOpen(true); }
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />Log Reading
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Meters ──────────────────────────────────────────────────────── */}
          <TabsContent value="meters" className="mt-4">
            <MeterRegistry facilityId={facilityId} meters={meters} onSaved={reload} />
          </TabsContent>

          {/* ── Reading Log ─────────────────────────────────────────────────── */}
          <TabsContent value="readings" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{readings.length} total readings — append-only, never overwritten</div>
              {meters.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select onValueChange={v => { const m = meters.find(m => m.meterId === v); if (m) { setActiveMeter(m); setReadingOpen(true); }}}>
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue placeholder="Select meter to log" />
                    </SelectTrigger>
                    <SelectContent>
                      {meters.map(m => <SelectItem key={m.meterId} value={m.meterId}>{m.label || m.meterNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Card className="border-white/10">
              <CardContent className="p-3">
                {readings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No readings yet. Log your first reading to begin building operational history.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {readings.slice(0, 100).map(r => <ReadingRow key={r.readingId} r={r} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Events ──────────────────────────────────────────────────────── */}
          <TabsContent value="events" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {events.length} total events | <span className="text-red-400">{openEvents.length} open</span>
              </div>
            </div>
            {events.length === 0 ? (
              <Card className="border-white/10">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-50" />
                  No events detected. The system continuously monitors every reading for anomalies.
                </CardContent>
              </Card>
            ) : (
              events.map(e => (
                <Card key={e.eventId} className={cn('border', EVENT_COLORS[e.severity])}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-sm font-semibold">{e.title}</span>
                          <Badge variant="outline" className={cn('text-[9px] ml-auto', EVENT_COLORS[e.severity])}>
                            {e.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{e.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{new Date(e.timestamp).toLocaleString()}</span>
                          <span>Measured: {e.measuredValue.toFixed(1)} {e.unit}</span>
                          <span>Expected: {e.expectedValue.toFixed(1)} {e.unit}</span>
                          <span className={e.deviation > 0 ? 'text-red-400' : 'text-green-400'}>
                            {e.deviation > 0 ? '+' : ''}{e.deviation.toFixed(1)}%
                          </span>
                        </div>
                        {/* Decision Defensibility evidence trail */}
                        <div className="mt-2 p-2 bg-white/3 rounded text-[10px] text-muted-foreground border border-white/5">
                          <span className="text-[#00FFE1] font-semibold">Evidence: </span>
                          Event type {e.type} | Detected {new Date(e.detectedAt).toLocaleString()} | Meter {e.meterId}
                        </div>
                      </div>
                      {!e.acknowledged && (
                        <Button size="sm" variant="outline" className="shrink-0 h-7 text-[10px]" onClick={() => ackEvent(e.eventId)}>
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Forecast ────────────────────────────────────────────────────── */}
          <TabsContent value="forecast" className="mt-4 space-y-4">
            {!forecast ? (
              <Card className="border-white/10">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  Register a meter and log readings to generate predictive analytics.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Next Month Forecast', value: `$${forecast.nextMonthCost.toLocaleString()}`,   sub: `${forecast.nextMonthConsumption.toLocaleString()} ${primaryMeter?.unit || 'units'}` },
                    { label: 'Annual Projection',   value: `$${(forecast.annualProjection/1000).toFixed(1)}K`, sub: 'Next 12 months' },
                    { label: 'Annual Budget',       value: `$${(forecast.annualBudget/1000).toFixed(1)}K`,    sub: 'Set in Cost Engine' },
                    { label: 'Budget Variance',
                      value: `${forecast.budgetVariance >= 0 ? '+' : ''}$${(Math.abs(forecast.budgetVariance)/1000).toFixed(1)}K`,
                      sub:   `${forecast.budgetVariancePct >= 0 ? 'Over' : 'Under'} budget` },
                  ].map(s => (
                    <Card key={s.label} className="border-white/10">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                        <div className="text-xl font-bold text-[#00FFE1]">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border-white/10">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#00FFE1]" />12-Month Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      {forecast.points.map((p, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 text-xs items-center">
                          <span className="text-muted-foreground">{p.label}</span>
                          <div className="col-span-2">
                            <Progress value={p.budgetAmount ? Math.min(100, (p.predictedCost / p.budgetAmount) * 100) : 50} className="h-1.5" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#00FFE1] font-medium">${p.predictedCost.toLocaleString()}</span>
                            <Badge variant="outline" className="text-[9px] px-1">{p.confidence}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Benchmark ───────────────────────────────────────────────────── */}
          <TabsContent value="benchmark" className="mt-4 space-y-4">
            {config.squareFeet === 0 ? (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4 text-sm text-yellow-400">
                  Set facility square footage in the Cost Engine tab to enable benchmarking.
                </CardContent>
              </Card>
            ) : benchmarks.length === 0 ? (
              <Card className="border-white/10">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  Log readings to generate benchmark comparisons.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {benchmarks.map(b => (
                  <Card key={b.metricLabel} className="border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">{b.metricLabel}</span>
                        <BenchBadge status={b.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Current</div>
                          <div className="text-lg font-bold text-[#00FFE1]">{b.currentValue} <span className="text-xs">{b.unit}</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Target</div>
                          <div className="text-lg font-bold text-green-400">{b.targetValue} <span className="text-xs">{b.unit}</span></div>
                        </div>
                        {b.energyStarMedian && (
                          <div>
                            <div className="text-[10px] text-muted-foreground">ENERGY STAR Median</div>
                            <div className="text-lg font-bold text-yellow-400">{b.energyStarMedian} <span className="text-xs">{b.unit}</span></div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>vs Target</span>
                          <span className={b.percentFromTarget > 0 ? 'text-red-400' : 'text-green-400'}>
                            {b.percentFromTarget > 0 ? '+' : ''}{b.percentFromTarget}%
                          </span>
                        </div>
                        <Progress value={Math.min(100, Math.max(0, 100 - b.percentFromTarget))} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Intelligence Timeline ────────────────────────────────────────── */}
          <TabsContent value="timeline" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Filter:</span>
              {(['all', 'meter_reading', 'energy_event', 'maintenance', 'violation', 'observation', 'bms'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTimelineFilter(f)}
                  className={cn(
                    'text-[10px] px-2.5 py-0.5 rounded border transition-all',
                    timelineFilter === f
                      ? 'border-[#00FFE1]/60 bg-[#00FFE1]/10 text-[#00FFE1]'
                      : 'border-white/10 text-muted-foreground hover:border-white/30'
                  )}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
            <EnergyTimeline facilityId={facilityId} filterSource={timelineFilter} maxItems={150} />
          </TabsContent>

          {/* ── Executive Summary ────────────────────────────────────────────── */}
          <TabsContent value="executive" className="mt-4">
            <ExecutiveSummaryPanel readings={readings} events={events} config={config} />
          </TabsContent>

          {/* ── Cost Engine ─────────────────────────────────────────────────── */}
          <TabsContent value="cost" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#00FFE1]">Utility Cost Engine</h3>
                <p className="text-xs text-muted-foreground">Rate schedules used for all real-time cost calculations</p>
              </div>
              <Button size="sm" onClick={() => setCostEditOpen(!costEditOpen)} variant="outline" className="text-xs border-[#00FFE1]/30 text-[#00FFE1]">
                <Settings2 className="w-3.5 h-3.5 mr-1" />{costEditOpen ? 'Close' : 'Edit Config'}
              </Button>
            </div>

            {costEditOpen && (
              <Card className="border-[#00FFE1]/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {/* Electric */}
                    <div className="col-span-full text-xs font-semibold text-yellow-400 uppercase tracking-wider pt-1">Electric</div>
                    {[
                      { key: 'electricBaseRate',     label: 'Base Rate ($/kWh)' },
                      { key: 'electricDemandRate',   label: 'Demand Rate ($/kW)' },
                      { key: 'electricFixedFee',     label: 'Fixed Fee ($/mo)' },
                      { key: 'electricTaxRate',      label: 'Tax Rate (%)' },
                      { key: 'electricFuelAdjustment', label: 'Fuel Adj ($/kWh)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-[10px] text-muted-foreground">{label}</Label>
                        <Input
                          type="number" step="0.001"
                          value={(config as any)[key]}
                          onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                          className="h-7 mt-0.5 text-xs"
                        />
                      </div>
                    ))}
                    {/* Gas */}
                    <div className="col-span-full text-xs font-semibold text-orange-400 uppercase tracking-wider pt-1">Natural Gas</div>
                    {[
                      { key: 'gasBaseRate',  label: 'Base Rate ($/therm)' },
                      { key: 'gasFixedFee',  label: 'Fixed Fee ($/mo)' },
                      { key: 'gasTaxRate',   label: 'Tax Rate (%)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-[10px] text-muted-foreground">{label}</Label>
                        <Input
                          type="number" step="0.01"
                          value={(config as any)[key]}
                          onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                          className="h-7 mt-0.5 text-xs"
                        />
                      </div>
                    ))}
                    {/* Water */}
                    <div className="col-span-full text-xs font-semibold text-blue-400 uppercase tracking-wider pt-1">Water</div>
                    {[
                      { key: 'waterBaseRate', label: 'Base Rate ($/unit)' },
                      { key: 'waterFixedFee', label: 'Fixed Fee ($/mo)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-[10px] text-muted-foreground">{label}</Label>
                        <Input
                          type="number" step="0.001"
                          value={(config as any)[key]}
                          onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                          className="h-7 mt-0.5 text-xs"
                        />
                      </div>
                    ))}
                    {/* Facility */}
                    <div className="col-span-full text-xs font-semibold text-[#00FFE1] uppercase tracking-wider pt-1">Facility</div>
                    {[
                      { key: 'squareFeet',    label: 'Square Footage' },
                      { key: 'occupantCount', label: 'Occupant Count' },
                      { key: 'annualBudget',  label: 'Annual Utility Budget ($)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-[10px] text-muted-foreground">{label}</Label>
                        <Input
                          type="number"
                          value={(config as any)[key]}
                          onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                          className="h-7 mt-0.5 text-xs"
                        />
                      </div>
                    ))}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Building Type</Label>
                      <Select value={config.buildingType} onValueChange={v => setConfig(c => ({ ...c, buildingType: v }))}>
                        <SelectTrigger className="h-7 mt-0.5 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['office', 'hospital', 'school', 'retail', 'warehouse', 'hotel', 'multifamily'].map(t => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setCostEditOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveConfig} className="bg-[#00FFE1]/10 text-[#00FFE1] border border-[#00FFE1]/30">
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current config display */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Electric Rate',   value: `$${config.electricBaseRate}/kWh`,    color: 'text-yellow-400' },
                { label: 'Demand Charge',   value: `$${config.electricDemandRate}/kW`,   color: 'text-yellow-400' },
                { label: 'Gas Rate',        value: `$${config.gasBaseRate}/therm`,        color: 'text-orange-400' },
                { label: 'Water Rate',      value: `$${config.waterBaseRate}/${config.waterUnit}`, color: 'text-blue-400' },
                { label: 'Annual Budget',   value: `$${(config.annualBudget/1000).toFixed(0)}K`, color: 'text-[#00FFE1]' },
                { label: 'Facility Size',   value: config.squareFeet > 0 ? `${config.squareFeet.toLocaleString()} sqft` : 'Not set', color: 'text-[#00FFE1]' },
              ].map(r => (
                <div key={r.label} className="bg-white/3 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] text-muted-foreground mb-0.5">{r.label}</div>
                  <div className={cn('text-base font-semibold', r.color)}>{r.value}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── MPCC ────────────────────────────────────────────────────────── */}
          <TabsContent value="mpcc" className="mt-4">
            <MPCCPanel />
          </TabsContent>
        </Tabs>

        {/* ── Reading Dialog ────────────────────────────────────────────────── */}
        {activeMeter && readingOpen && (
          <ReadingDialog
            open={readingOpen}
            onClose={() => { setReadingOpen(false); setActiveMeter(null); }}
            meter={activeMeter}
            history={readings}
            config={config}
            facilityId={facilityId}
            operator={operator}
            onSaved={reload}
          />
        )}
      </div>
    </MainLayout>
  );
}
