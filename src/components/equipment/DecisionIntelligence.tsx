import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Flame, Snowflake, Wind, Droplets, Activity, ChevronDown, ChevronUp,
  Shield, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Diagnosis {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  pattern: string;
  meaning: string;
  decision: string;
  defensibility: string;
  metrics: { label: string; value: string; status: 'normal' | 'warning' | 'critical' }[];
}

function analyzeBoilerLogs(logs: any[]): Diagnosis[] {
  const diagnoses: Diagnosis[] = [];
  if (logs.length === 0) return diagnoses;
  const recent = logs.slice(0, 10);
  const avg = (key: string) => recent.reduce((s, l) => s + (l[key] || 0), 0) / recent.length;
  const avgStackTemp = avg('stackTemp');
  const o2Logs = recent.filter(l => l.o2Level);
  const avgO2 = o2Logs.length > 0 ? o2Logs.reduce((s, l) => s + l.o2Level, 0) / o2Logs.length : 0;
  const avgEfficiency = avg('efficiency') || 85;
  const avgFiringRate = avg('firingRate');
  const avgSupplyTemp = avg('supplyTemp');
  const avgReturnTemp = avg('returnTemp');
  const deltaT = avgSupplyTemp - avgReturnTemp;
  const stackTemps = recent.map(l => l.stackTemp || 0).filter(Boolean);
  const stackTrend = stackTemps.length > 2 ? stackTemps[0] - stackTemps[stackTemps.length - 1] : 0;

  if (avgStackTemp > 400 && avgO2 < 3 && avgO2 > 0) {
    diagnoses.push({ id: 'high-stack-low-o2', severity: 'critical', pattern: 'High stack temp + Low O₂',
      meaning: 'Combustion air deficiency detected. Incomplete combustion producing excess CO, reducing efficiency and creating a safety risk. Stack temp elevation with low O₂ indicates rich fuel mixture.',
      decision: 'Immediate combustion tune-up required. Inspect and clean burner assembly. Check combustion air supply and damper position. Do not defer — CO risk present.',
      defensibility: 'Log with stack temp readings, O₂ levels, and work order number. Document burner inspection findings.',
      metrics: [{ label: 'Stack Temp', value: Math.round(avgStackTemp)+'°F', status: 'critical' }, { label: 'O₂ Level', value: avgO2.toFixed(1)+'%', status: 'critical' }, { label: 'Efficiency', value: Math.round(avgEfficiency)+'%', status: avgEfficiency < 80 ? 'critical' : 'warning' }] });
  } else if (avgStackTemp > 350 && avgO2 > 8) {
    diagnoses.push({ id: 'high-stack-high-o2', severity: 'warning', pattern: 'High stack temp + Excess O₂',
      meaning: 'Too much combustion air supplied relative to fuel — excess air carries heat up the stack, reducing efficiency. May indicate air infiltration or damper issue.',
      decision: 'Schedule combustion adjustment — reduce excess air to target 3-5% O₂ at rated load. Inspect flue for air infiltration.',
      defensibility: 'Document air-to-fuel ratio readings and adjustment. Record O₂ before and after.',
      metrics: [{ label: 'Stack Temp', value: Math.round(avgStackTemp)+'°F', status: 'warning' }, { label: 'O₂ Level', value: avgO2.toFixed(1)+'%', status: 'warning' }, { label: 'Efficiency', value: Math.round(avgEfficiency)+'%', status: 'warning' }] });
  } else if (avgStackTemp > 300 && stackTrend < -20) {
    diagnoses.push({ id: 'rising-stack-temp', severity: 'warning', pattern: 'Stack temp rising trend',
      meaning: 'Stack temperature increasing over recent readings while firing rate remains consistent. Suggests heat transfer surface fouling — soot, scale, or debris on tubes.',
      decision: 'Schedule boiler inspection and tube cleaning. Each 40°F increase in stack temp above baseline = ~1% efficiency loss.',
      defensibility: 'Document temperature trend with dates. Work order should reference baseline stack temp from last tune-up.',
      metrics: [{ label: 'Stack Temp', value: Math.round(avgStackTemp)+'°F', status: 'warning' }, { label: 'Trend', value: '+'+Math.abs(Math.round(stackTrend))+'°F rise', status: 'warning' }, { label: 'Efficiency', value: Math.round(avgEfficiency)+'%', status: 'warning' }] });
  }

  if (deltaT < 20 && avgFiringRate > 60) {
    diagnoses.push({ id: 'low-delta-t', severity: 'warning', pattern: 'Low ΔT at high firing rate',
      meaning: 'Supply-to-return temperature differential lower than expected for current firing rate. Indicates poor heat transfer — possible flow issues, short-cycling, or oversized boiler.',
      decision: 'Check system flow rates. Inspect for bypassed zones or stuck balancing valves. Evaluate boiler sizing against actual load.',
      defensibility: 'Document supply/return temps and firing rate readings with timestamps.',
      metrics: [{ label: 'ΔT', value: Math.round(deltaT)+'°F', status: 'warning' }, { label: 'Firing Rate', value: Math.round(avgFiringRate)+'%', status: 'normal' }, { label: 'Supply Temp', value: Math.round(avgSupplyTemp)+'°F', status: 'normal' }] });
  }

  if (avgEfficiency < 75) {
    diagnoses.push({ id: 'low-efficiency', severity: 'critical', pattern: 'Efficiency below 75%',
      meaning: 'Boiler efficiency has dropped significantly below the 88.9% Nexum performance threshold. Typical causes: fouled heat exchanger, combustion mismatch, or thermal losses.',
      decision: 'Immediate: perform full combustion analysis, inspect heat exchanger surfaces, verify insulation integrity. Calculate dollar cost of current vs baseline efficiency.',
      defensibility: 'Document efficiency readings with date, operator name, and corrective action. Include cost impact calculation.',
      metrics: [{ label: 'Efficiency', value: Math.round(avgEfficiency)+'%', status: 'critical' }, { label: 'Target', value: '88.9%', status: 'normal' }, { label: 'Gap', value: (88.9 - avgEfficiency).toFixed(1)+'%', status: 'critical' }] });
  } else if (avgEfficiency >= 88) {
    diagnoses.push({ id: 'good-efficiency', severity: 'good', pattern: 'Efficiency at or above target',
      meaning: 'Boiler operating at or above the 88.9% Nexum performance threshold. Combustion is well-tuned and heat transfer surfaces are clean.',
      decision: 'Maintain current PM schedule. Next combustion analysis due per PM schedule.',
      defensibility: 'Log efficiency readings as confirmation of performance standard compliance.',
      metrics: [{ label: 'Efficiency', value: Math.round(avgEfficiency)+'%', status: 'normal' }, { label: 'Target', value: '88.9%', status: 'normal' }, { label: 'Status', value: 'On Target', status: 'normal' }] });
  }
  return diagnoses;
}

function analyzeChillerLogs(logs: any[]): Diagnosis[] {
  const diagnoses: Diagnosis[] = [];
  if (logs.length === 0) return diagnoses;
  const recent = logs.slice(0, 10);
  const avgApproach = recent.reduce((s, l) => s + ((l.leavingCondenserWaterTemp || 0) - (l.enteringWaterTemp || 0)), 0) / recent.length;
  const avgDeltaT = recent.reduce((s, l) => s + ((l.enteringWaterTemp || 0) - (l.leavingWaterTemp || 0)), 0) / recent.length;
  const avgTons = recent.reduce((s, l) => s + (l.estimatedTons || 0), 0) / recent.length;
  if (avgApproach > 10) {
    diagnoses.push({ id: 'high-condenser-approach', severity: avgApproach > 15 ? 'critical' : 'warning', pattern: 'High condenser approach temp',
      meaning: 'Condenser approach temperature elevated — indicating condenser tube fouling, scale buildup, or reduced cooling tower performance. Each degree of approach increase reduces efficiency ~1.5-2%.',
      decision: 'Inspect and clean condenser tubes. Check cooling tower performance. Review water treatment program.',
      defensibility: 'Document approach temps before and after cleaning. Attach water quality report.',
      metrics: [{ label: 'Approach Temp', value: Math.round(avgApproach)+'°F', status: avgApproach > 15 ? 'critical' : 'warning' }, { label: 'Target', value: '< 5°F', status: 'normal' }, { label: 'Delta-T', value: Math.round(avgDeltaT)+'°F', status: 'normal' }] });
  }
  if (avgDeltaT < 8 && avgTons > 50) {
    diagnoses.push({ id: 'low-chiller-delta-t', severity: 'warning', pattern: 'Low chilled water ΔT at load',
      meaning: 'Chilled water delta-T below 8°F under significant load. Flow rate too high relative to load — common with unoptimized variable flow systems or air in system.',
      decision: 'Review chilled water flow setpoints. Check differential pressure bypass valve. Purge air if present.',
      defensibility: 'Log entering/leaving water temps, flow rate, and tons alongside corrective action.',
      metrics: [{ label: 'Chilled Water ΔT', value: Math.round(avgDeltaT)+'°F', status: 'warning' }, { label: 'Load', value: Math.round(avgTons)+' tons', status: 'normal' }, { label: 'Target ΔT', value: '10-14°F', status: 'normal' }] });
  }
  return diagnoses;
}

function getEquipmentHealth(diagnoses: Diagnosis[]): number {
  if (diagnoses.length === 0) return 85;
  const c = diagnoses.filter(d => d.severity === 'critical').length;
  const w = diagnoses.filter(d => d.severity === 'warning').length;
  const g = diagnoses.filter(d => d.severity === 'good').length;
  return Math.max(10, Math.min(100, 100 - c * 25 - w * 10 + g * 5));
}

function getHealthTrend(logs: any[]): 'improving' | 'stable' | 'degrading' | 'critical' {
  if (logs.length < 4) return 'stable';
  const r = logs.slice(0, 3).map(l => l.efficiency || 85);
  const o = logs.slice(3, 6).map(l => l.efficiency || 85);
  const rAvg = r.reduce((s, v) => s + v, 0) / r.length;
  const oAvg = o.reduce((s, v) => s + v, 0) / o.length;
  if (rAvg < 70) return 'critical';
  if (rAvg - oAvg > 3) return 'improving';
  if (rAvg - oAvg < -3) return 'degrading';
  return 'stable';
}

const SEV: Record<string, any> = {
  critical: { card: 'border-red-500/40 bg-red-500/5', badge: 'border-red-500/30 text-red-500 bg-red-500/10', icon: 'AlertTriangle', iconColor: 'text-red-500' },
  warning:  { card: 'border-yellow-400/40 bg-yellow-400/5', badge: 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10', icon: 'AlertTriangle', iconColor: 'text-yellow-400' },
  info:     { card: 'border-blue-400/40 bg-blue-400/5', badge: 'border-blue-400/30 text-blue-400 bg-blue-400/10', icon: 'Activity', iconColor: 'text-blue-400' },
  good:     { card: 'border-green-400/40 bg-green-400/5', badge: 'border-green-400/30 text-green-400 bg-green-400/10', icon: 'CheckCircle', iconColor: 'text-green-400' },
};

const TREND: Record<string, any> = {
  critical:  { color: 'text-red-500',    label: 'Critical',  dir: 'down' },
  degrading: { color: 'text-yellow-400', label: 'Degrading', dir: 'down' },
  stable:    { color: 'text-blue-400',   label: 'Stable',    dir: 'flat' },
  improving: { color: 'text-green-400',  label: 'Improving', dir: 'up' },
};

interface Props { logs: any[]; }

export function DecisionIntelligence({ logs }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const equipmentMap = logs.reduce((acc: any, log: any) => {
    const key = log.equipmentId || log.systemType || 'unknown';
    if (!acc[key]) acc[key] = { equipmentId: key, equipmentType: log.systemType || 'unknown', systemName: log.systemName || log.equipmentId || key, readings: [], lastReading: log.timestamp || '' };
    acc[key].readings.push(log);
    return acc;
  }, {});

  const patterns = Object.values(equipmentMap).map((eq: any) => {
    const t = (eq.equipmentType || '').toLowerCase();
    const d = t === 'boiler' ? analyzeBoilerLogs(eq.readings) : t === 'chiller' ? analyzeChillerLogs(eq.readings) : [];
    return { ...eq, diagnoses: d, overallHealth: getEquipmentHealth(d), trend: getHealthTrend(eq.readings) };
  }).sort((a: any, b: any) => a.overallHealth - b.overallHealth);

  const totalCritical = patterns.reduce((s: number, e: any) => s + e.diagnoses.filter((d: Diagnosis) => d.severity === 'critical').length, 0);
  const totalWarning  = patterns.reduce((s: number, e: any) => s + e.diagnoses.filter((d: Diagnosis) => d.severity === 'warning').length, 0);
  const avgHealth = patterns.length > 0 ? Math.round(patterns.reduce((s: number, e: any) => s + e.overallHealth, 0) / patterns.length) : 0;

  if (patterns.length === 0) return (
    <div className="text-center py-16 text-muted-foreground space-y-3">
      <Brain className="w-14 h-14 mx-auto opacity-30" />
      <p className="font-medium">No equipment data to analyze</p>
      <p className="text-sm">Log equipment readings to see Decision Intelligence patterns</p>
    </div>
  );

  const SevIcon: Record<string, any> = { AlertTriangle, CheckCircle, Activity };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Equipment Analyzed', value: patterns.length, icon: Activity, color: 'text-primary' },
          { label: 'Critical Issues', value: totalCritical, icon: AlertTriangle, color: totalCritical > 0 ? 'text-red-500' : 'text-muted-foreground' },
          { label: 'Warnings', value: totalWarning, icon: Shield, color: totalWarning > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
          { label: 'Avg Health', value: avgHealth+'%', icon: Target, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="neon-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1"><p className="text-xs text-muted-foreground">{label}</p><Icon className={cn('w-4 h-4', color)} /></div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {patterns.map((eq: any) => {
          const ts = TREND[eq.trend];
          const isOpen = expanded[eq.equipmentId];
          const hasCritical = eq.diagnoses.some((d: Diagnosis) => d.severity === 'critical');
          return (
            <Card key={eq.equipmentId} className={cn('neon-border', hasCritical && 'border-red-500/30')}>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(p => ({...p, [eq.equipmentId]: !isOpen}))}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {eq.equipmentType === 'boiler' ? <Flame className="w-5 h-5 text-orange-400" /> : eq.equipmentType === 'chiller' ? <Snowflake className="w-5 h-5 text-blue-400" /> : eq.equipmentType === 'ahu' ? <Wind className="w-5 h-5 text-cyan-400" /> : eq.equipmentType === 'pump' ? <Droplets className="w-5 h-5 text-blue-300" /> : <Activity className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm capitalize">{eq.systemName || eq.equipmentId}</CardTitle>
                        <Badge variant="outline" className="text-[10px] capitalize border-border/40">{eq.equipmentType}</Badge>
                        {hasCritical && <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500 bg-red-500/10">Critical</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ts.dir === 'up' ? <TrendingUp className={cn('w-3 h-3', ts.color)} /> : ts.dir === 'down' ? <TrendingDown className={cn('w-3 h-3', ts.color)} /> : <Activity className={cn('w-3 h-3', ts.color)} />}
                        <span className={cn('text-xs', ts.color)}>{ts.label}</span>
                        <span className="text-xs text-muted-foreground">· {eq.readings.length} readings</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn('text-xl font-bold', eq.overallHealth >= 80 ? 'text-green-400' : eq.overallHealth >= 60 ? 'text-yellow-400' : 'text-red-500')}>{eq.overallHealth}%</p>
                      <p className="text-[10px] text-muted-foreground">Health</p>
                    </div>
                    <Progress value={eq.overallHealth} className="w-16 h-1.5 hidden md:block" />
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="pt-0 space-y-3">
                  {eq.diagnoses.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm"><CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-400 opacity-60" /><p>No issues detected</p></div>
                  ) : eq.diagnoses.map((d: Diagnosis) => {
                    const s = SEV[d.severity];
                    const DIcon = SevIcon[s.icon] || AlertTriangle;
                    return (
                      <div key={d.id} className={cn('rounded-xl border p-4 space-y-3', s.card)}>
                        <div className="flex items-center gap-2"><DIcon className={cn('w-4 h-4 shrink-0', s.iconColor)} /><span className="font-semibold text-sm">{d.pattern}</span><Badge variant="outline" className={cn('text-[10px] ml-auto capitalize', s.badge)}>{d.severity}</Badge></div>
                        <div className="grid grid-cols-3 gap-2">
                          {d.metrics.map((m: any) => (
                            <div key={m.label} className="p-2 rounded-lg bg-background/50 border border-border/20 text-center">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                              <p className={cn('text-sm font-bold mt-0.5', m.status === 'critical' ? 'text-red-500' : m.status === 'warning' ? 'text-yellow-400' : 'text-green-400')}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What This Means</p><p className="text-sm leading-relaxed">{d.meaning}</p></div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20"><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Decision</p><p className="text-sm leading-relaxed">{d.decision}</p></div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/20"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Decision Defensibility</p><p className="text-xs text-muted-foreground leading-relaxed">{d.defensibility}</p></div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
