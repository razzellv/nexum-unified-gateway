// ─────────────────────────────────────────────────────────────────────────────
// MPCCPanel.tsx
// Drop this into src/components/energy/MPCCPanel.tsx
// Add to EnergyDashboard.tsx as a new tab: "MPCC / Main Power"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Zap, DollarSign, TrendingUp, TrendingDown, Activity,
  AlertTriangle, RefreshCw, BarChart3, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
                 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const NJ_RATE = 0.18;

interface MPCCReading {
  logId: string;
  timestamp: string;
  equipmentId: string;
  currentLoadKW: number;
  peakDemandKW: number;
  kwhReading: number;
  demandIntervalKWH: number;
  incomingAmpsL1: number;
  incomingAmpsL2: number;
  incomingAmpsL3: number;
  powerFactor: number | null;
  busbarTemp: number | null;
  safetyStatus: string;
  runtimeHours: number;
  kwDraw: number;
  estimatedCost: number;
}

interface MPCCAggregate {
  totalReadings: number;
  totalKWH: number;
  estimatedCost: number;
  avgLoadKW: number;
  peakDemandKW: number;
  avgPowerFactor: number | null;
  electricRate: number;
}

interface MonthlySummary {
  month: string;
  totalKWH: number;
  estimatedCost: number;
  peakDemandKW: number;
  readings: number;
}

export function MPCCPanel() {
  const { user } = useAuth();
  const [readings, setReadings]     = useState<MPCCReading[]>([]);
  const [aggregate, setAggregate]   = useState<MPCCAggregate | null>(null);
  const [monthly, setMonthly]       = useState<MonthlySummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [days, setDays]             = useState(30);

  const fetchData = async () => {
    if (!user?.facilityId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [readingsRes, summaryRes] = await Promise.allSettled([
        fetch(`${API_BASE}/mpcc/readings?facilityId=${user.facilityId}&days=${days}`, { headers }),
        fetch(`${API_BASE}/mpcc/summary?facilityId=${user.facilityId}&months=3`, { headers }),
      ]);

      if (readingsRes.status === 'fulfilled' && readingsRes.value.ok) {
        const data = await readingsRes.value.json();
        setReadings(data.readings || []);
        setAggregate(data.aggregate || null);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const data = await summaryRes.value.json();
        setMonthly(data.monthlySummary || []);
      }
    } catch (e) {
      console.error('MPCCPanel fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.facilityId, days]);

  const latest = readings[0];
  const prev   = readings[1];

  const loadTrend = latest && prev
    ? ((latest.currentLoadKW - prev.currentLoadKW) / (prev.currentLoadKW || 1)) * 100
    : null;

  const safetyColor = (status: string) => {
    if (status === 'alarm' || status === 'lockout') return 'text-destructive';
    if (status === 'warning') return 'text-yellow-400';
    return 'text-success';
  };

  const maxKWH = Math.max(...monthly.map(m => m.totalKWH), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading MPCC data...
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-3">
        <Zap className="w-12 h-12 mx-auto opacity-30" />
        <p className="font-medium">No MPCC readings yet</p>
        <p className="text-sm">Log MPCC data via Equipment Logging to see energy analytics here.</p>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm text-left max-w-md mx-auto">
          <p className="font-semibold text-primary mb-1">To get started:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Add your MPCC in Equipment Library (type: MPCC)</li>
            <li>Set the baseline (rated voltage, amps, kW)</li>
            <li>Log readings via Facility Data Source → MPCC</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel neon-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Total kWh ({days}d)</p>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{aggregate?.totalKWH.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">kWh consumed</p>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">${aggregate?.estimatedCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">@ ${NJ_RATE}/kWh</p>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Peak Demand</p>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{aggregate?.peakDemandKW}</p>
            <p className="text-xs text-muted-foreground mt-1">kW peak</p>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Avg Load</p>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{aggregate?.avgLoadKW}</p>
            <p className="text-xs text-muted-foreground mt-1">kW average</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest reading */}
      {latest && (
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Latest MPCC Reading
              </CardTitle>
              <div className="flex items-center gap-2">
                <Shield className={cn('w-4 h-4', safetyColor(latest.safetyStatus))} />
                <Badge variant="outline" className={cn('text-xs capitalize',
                  latest.safetyStatus === 'normal' ? 'border-success/30 text-success bg-success/10' :
                  latest.safetyStatus === 'warning' ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' :
                  'border-destructive/30 text-destructive bg-destructive/10'
                )}>
                  {latest.safetyStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(latest.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current Load',    value: `${latest.currentLoadKW} kW`,   trend: loadTrend },
                { label: 'Peak Demand',     value: `${latest.peakDemandKW} kW`,    trend: null },
                { label: 'Interval kWh',    value: `${latest.demandIntervalKWH} kWh`, trend: null },
                { label: 'Estimated Cost',  value: `$${latest.estimatedCost.toFixed(2)}`, trend: null },
              ].map(({ label, value, trend }) => (
                <div key={label} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-bold">{value}</p>
                    {trend !== null && (
                      <span className={cn('text-xs', trend > 0 ? 'text-destructive' : 'text-success')}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 3-phase amps */}
            {(latest.incomingAmpsL1 || latest.incomingAmpsL2 || latest.incomingAmpsL3) > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  3-Phase Amperage
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'L1', value: latest.incomingAmpsL1 },
                    { label: 'L2', value: latest.incomingAmpsL2 },
                    { label: 'L3', value: latest.incomingAmpsL3 },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">A</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Power factor */}
            {latest.powerFactor && (
              <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Power Factor</p>
                  <Badge variant="outline" className={cn('text-xs',
                    latest.powerFactor >= 0.95 ? 'border-success/30 text-success bg-success/10' :
                    latest.powerFactor >= 0.85 ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' :
                    'border-destructive/30 text-destructive bg-destructive/10'
                  )}>
                    {latest.powerFactor >= 0.95 ? 'Excellent' : latest.powerFactor >= 0.85 ? 'Acceptable' : 'Poor — Penalty Risk'}
                  </Badge>
                </div>
                <Progress value={latest.powerFactor * 100} className="h-2" />
                <p className="text-lg font-bold mt-1">{latest.powerFactor.toFixed(2)} PF</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      {monthly.length > 0 && (
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Monthly kWh Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthly.map(m => (
                <div key={m.month}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground font-medium">{m.month}</span>
                    <div className="flex gap-4 text-xs">
                      <span className="font-bold">{m.totalKWH.toLocaleString()} kWh</span>
                      <span className="text-muted-foreground">${m.estimatedCost.toLocaleString()}</span>
                      <span className="text-muted-foreground">Peak: {m.peakDemandKW} kW</span>
                    </div>
                  </div>
                  <Progress value={(m.totalKWH / maxKWH) * 100} className="h-2" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">3-month total</span>
              <div className="flex gap-4">
                <span className="font-bold">{monthly.reduce((s, m) => s + m.totalKWH, 0).toLocaleString()} kWh</span>
                <span className="text-muted-foreground">${monthly.reduce((s, m) => s + m.estimatedCost, 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent readings table */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Readings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {['Timestamp', 'Load kW', 'Peak kW', 'kWh', 'L1 Amps', 'PF', 'Status', 'Est. Cost'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 10).map(r => (
                  <tr key={r.logId} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 font-medium">{r.currentLoadKW}</td>
                    <td className="px-4 py-2">{r.peakDemandKW}</td>
                    <td className="px-4 py-2">{r.demandIntervalKWH}</td>
                    <td className="px-4 py-2">{r.incomingAmpsL1}</td>
                    <td className="px-4 py-2">{r.powerFactor ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={cn('text-[10px] capitalize',
                        r.safetyStatus === 'normal' ? 'border-success/30 text-success' :
                        r.safetyStatus === 'warning' ? 'border-yellow-400/30 text-yellow-400' :
                        'border-destructive/30 text-destructive'
                      )}>
                        {r.safetyStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">${r.estimatedCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
