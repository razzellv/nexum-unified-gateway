import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingDown, TrendingUp, Minus, RefreshCw, Download, Clock,
  AlertTriangle, CheckCircle2, Activity, Zap, Wrench, Layers,
  ChevronDown, ChevronUp, Shield, BarChart3, Target, ThermometerSun,
  Wind, Droplets, AlertCircle, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ── Types ────────────────────────────────────────────────────────────────────

interface DriftScores {
  performance_drift: number;
  sequencing_drift: number;
  reliability_drift: number;
  optimization_potential: number;
  energy_waste: number;
  maintenance_risk: number;
  asset_health: number;
  facility_intelligence: number;
}

interface TripleStage {
  stage: number;
  label: string;
  time: string;
  cost: string;
  scope: string;
}

interface DriftFinding {
  id: string;
  category: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  causes: string[];
  impact: string;
  triple_constraint?: TripleStage[];
  low_load_protected: boolean;
  recommendation?: string;
  parameter?: string;
  trend_summary?: {
    current: number; baseline: number; direction: string;
    slope_pct_per_reading: number; r_squared: number; reading_count: number;
    confidence: string;
  };
}

interface LowLoadProtection {
  active: boolean;
  factors: { lowOAT: boolean; highOAT: boolean; lowOccup: boolean; lowCool: boolean; lowHeat: boolean };
}

interface DriftAnalysis {
  scores: DriftScores;
  findings: DriftFinding[];
  category_distribution: Record<string, number>;
  recommendations: { priority: string; action: string; detail: string; category: string }[];
  low_load_protection: LowLoadProtection;
  data_points: { reading_count: number; parameters_tracked: number; staging_chillers: number; staging_pumps: number };
  analyzed_at: string;
  has_readings: boolean;
}

// ── Finding categories ────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  A: { label: 'Operationally Normal',        color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/30',   icon: CheckCircle2  },
  B: { label: 'Optimization Opportunity',    color: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: Target        },
  C: { label: 'Performance Drift',           color: 'text-yellow-400', bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  icon: TrendingDown  },
  D: { label: 'Reliability Drift',           color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  icon: Activity      },
  E: { label: 'Sequencing Drift',            color: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  icon: Layers        },
  F: { label: 'Maintenance Compliance',      color: 'text-red-300',    bg: 'bg-red-400/10',     border: 'border-red-400/30',     icon: Wrench        },
  G: { label: 'Confirmed Fault',             color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: AlertTriangle },
  H: { label: 'Critical Risk',               color: 'text-red-500',    bg: 'bg-red-600/10',     border: 'border-red-600/30',     icon: Zap           },
};

const SCORE_META = [
  { key: 'performance_drift',      label: 'Performance Drift',       icon: TrendingDown,   color: 'text-yellow-400', bar: 'bg-yellow-500', inverted: true,  tip: 'CHW/HW Delta-T, kW/Ton, boiler efficiency trends' },
  { key: 'sequencing_drift',       label: 'Sequencing Drift',        icon: Layers,         color: 'text-purple-400', bar: 'bg-purple-500', inverted: true,  tip: 'Chiller, pump, and boiler staging analysis' },
  { key: 'reliability_drift',      label: 'Reliability Drift',       icon: Activity,       color: 'text-orange-400', bar: 'bg-orange-500', inverted: true,  tip: 'Bearing temperature, vibration, oil pressure trends' },
  { key: 'optimization_potential', label: 'Optimization Potential',  icon: Target,         color: 'text-blue-400',   bar: 'bg-blue-500',   inverted: false, tip: 'Estimated performance improvement opportunity' },
  { key: 'energy_waste',           label: 'Energy Waste',            icon: Zap,            color: 'text-red-400',    bar: 'bg-red-500',    inverted: true,  tip: 'Sequencing and Delta-T related energy losses' },
  { key: 'maintenance_risk',       label: 'Maintenance Risk',        icon: Wrench,         color: 'text-red-300',    bar: 'bg-red-400',    inverted: true,  tip: 'Overdue PMs and recurring failure patterns' },
  { key: 'asset_health',           label: 'Asset Health',            icon: Shield,         color: 'text-green-400',  bar: 'bg-green-500',  inverted: false, tip: 'Composite health across all monitored assets' },
  { key: 'facility_intelligence',  label: 'Facility Intelligence',   icon: BarChart3,      color: 'text-primary',    bar: 'bg-primary',    inverted: false, tip: 'Overall facility operational intelligence score' },
];

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-600/10 border-red-600/30 text-red-400',
  high:     'bg-red-500/10 border-red-500/30 text-red-300',
  medium:   'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low:      'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

// ── Facility score gauge ──────────────────────────────────────────────────────

function FIGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Fair' : score >= 40 ? 'Degrading' : 'At Risk';
  const r = 54; const circ = 2 * Math.PI * r;
  return (
    <div className="bg-card border border-border/40 rounded-xl p-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold">Facility Intelligence Score</span>
      </div>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
        <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${circ * (score / 100)} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 0.7s ease' }} />
        <text x={65} y={60} textAnchor="middle" fill={color} fontSize={28} fontWeight="bold">{score}</text>
        <text x={65} y={78} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={11}>/100</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      <p className="text-xs text-muted-foreground text-center">Composite operational intelligence across all drift dimensions</p>
    </div>
  );
}

// ── Category distribution ─────────────────────────────────────────────────────

function CategoryDistribution({ dist }: { dist: Record<string, number> }) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Finding Categories</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(CAT_META).map(([cat, meta]) => {
          const count = dist[cat] || 0;
          const Icon = meta.icon;
          return (
            <div key={cat}
              className={`rounded-lg border p-2.5 flex flex-col items-center gap-1 ${count > 0 ? `${meta.bg} ${meta.border}` : 'bg-muted/10 border-border/20 opacity-40'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${count > 0 ? meta.color : 'text-muted-foreground'}`}>{cat}</span>
                <Icon className={`w-3.5 h-3.5 ${count > 0 ? meta.color : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-lg font-bold ${count > 0 ? meta.color : 'text-muted-foreground'}`}>{count}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Low Load Protection badge ─────────────────────────────────────────────────

function LLPBadge({ llp }: { llp: LowLoadProtection }) {
  const factors = Object.entries(llp.factors).filter(([, v]) => v).map(([k]) =>
    k === 'lowOAT' ? 'Low OAT' : k === 'highOAT' ? 'High OAT' : k === 'lowOccup' ? 'Low Occupancy' :
    k === 'lowCool' ? 'Low Cooling Demand' : 'Low Heating Demand'
  );
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${llp.active ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-muted/10 border-border/20'}`}>
      <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${llp.active ? 'text-cyan-400' : 'text-muted-foreground'}`} />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Low Load Protection</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${llp.active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted/20 text-muted-foreground'}`}>
            {llp.active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {llp.active
            ? `Flow-related drift findings suppressed from fault classification. Conditions: ${factors.join(', ')}.`
            : 'Normal operating conditions. All drift findings are being evaluated at full sensitivity.'}
        </p>
      </div>
    </div>
  );
}

// ── Triple constraint ─────────────────────────────────────────────────────────

function TripleConstraintView({ stages }: { stages: TripleStage[] }) {
  const stageColors = ['border-green-500/40 bg-green-500/5', 'border-yellow-500/40 bg-yellow-500/5', 'border-orange-500/40 bg-orange-500/5', 'border-red-500/40 bg-red-500/5'];
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Triple Constraint Analysis</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stages.map((s, i) => (
          <div key={s.stage} className={`rounded-lg border p-2.5 ${stageColors[Math.min(i, 3)]}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stage {s.stage}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">{s.label}</span>
            </div>
            <div className="space-y-1">
              <div className="flex gap-1.5 text-xs"><span className="text-muted-foreground w-8">Time</span><span className="font-medium">{s.time}</span></div>
              <div className="flex gap-1.5 text-xs"><span className="text-muted-foreground w-8">Cost</span><span className="font-medium">{s.cost}</span></div>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1">{s.scope}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────

function FindingCard({ f }: { f: DriftFinding }) {
  const [open, setOpen] = useState(false);
  const meta = CAT_META[f.category] || CAT_META.A;
  const Icon = meta.icon;
  const ts = f.trend_summary;

  return (
    <div className={`border rounded-xl overflow-hidden ${meta.border}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-start gap-3 p-4 hover:opacity-90 transition-opacity text-left ${meta.bg}`}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${meta.bg} border ${meta.border}`}>
          <span className={`text-xs font-bold ${meta.color}`}>{f.category}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${meta.color}`}>{f.title}</span>
            {f.low_load_protected && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium">LLP</span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ml-auto ${
              f.severity === 'critical' ? 'bg-red-600/20 text-red-400 border-red-600/30' :
              f.severity === 'high'     ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              f.severity === 'medium'   ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>{f.severity}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{f.description}</p>
        </div>
        <div className="shrink-0">{open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</div>
      </button>

      {open && (
        <div className="p-4 border-t border-border/20 space-y-3 bg-card/50">
          {/* Trend stats */}
          {ts && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Current: <span className="text-foreground font-medium">{ts.current}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Baseline: <span className="text-foreground font-medium">{ts.baseline}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Slope: <span className={`font-medium ${ts.direction === 'decreasing' ? 'text-orange-400' : 'text-red-400'}`}>
                  {ts.slope_pct_per_reading > 0 ? '+' : ''}{ts.slope_pct_per_reading}%/reading
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                R²: <span className="text-foreground font-medium">{ts.r_squared}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Readings: <span className="text-foreground font-medium">{ts.reading_count}</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                ts.confidence === 'high' ? 'bg-red-500/10 text-red-400' :
                ts.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>{ts.confidence} confidence</span>
            </div>
          )}

          {/* Potential causes */}
          {f.causes && f.causes.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Potential Causes</p>
              <div className="flex flex-wrap gap-1.5">
                {f.causes.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded bg-background/40 border border-border/30">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Impact */}
          <div className="flex items-start gap-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-orange-400 mt-0.5" />
            <span className="text-muted-foreground">{f.impact}</span>
          </div>

          {/* Recommendation */}
          {f.recommendation && (
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-400 mt-0.5" />
              <span className="text-muted-foreground">{f.recommendation}</span>
            </div>
          )}

          {/* Triple constraint */}
          {f.triple_constraint && f.triple_constraint.length > 0 && (
            <TripleConstraintView stages={f.triple_constraint} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Submit readings modal (inline form) ──────────────────────────────────────

const READABLE_PARAMS: { key: string; label: string; unit: string; placeholder: string }[] = [
  { key: 'chw_delta_t',    label: 'CHW Delta-T',          unit: '°F',      placeholder: '10.5' },
  { key: 'hw_delta_t',     label: 'HW Delta-T',           unit: '°F',      placeholder: '22.0' },
  { key: 'kw_per_ton',     label: 'kW/Ton',               unit: 'kW/ton',  placeholder: '0.65' },
  { key: 'boiler_efficiency', label: 'Boiler Efficiency', unit: '%',       placeholder: '85'   },
  { key: 'bearing_temp',   label: 'Bearing Temperature',  unit: '°F',      placeholder: '140'  },
  { key: 'vibration_ips',  label: 'Vibration',            unit: 'in/s',    placeholder: '0.05' },
  { key: 'pump_speed_pct', label: 'Pump Speed',           unit: '%',       placeholder: '72'   },
  { key: 'vfd_frequency',  label: 'VFD Frequency',        unit: 'Hz',      placeholder: '45'   },
  { key: 'oil_differential_pressure', label: 'Oil Diff Pressure', unit: 'psi', placeholder: '12' },
];

function ReadingsForm({ onSubmit, onClose }: { onSubmit: (data: any) => Promise<void>; onClose: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [assetId, setAssetId] = useState('');
  const [oat, setOat] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const readings = READABLE_PARAMS
      .filter(p => vals[p.key] && vals[p.key].trim())
      .map(p => ({ parameter: p.key, value: parseFloat(vals[p.key]), unit: p.unit, asset_id: assetId || 'facility' }));
    if (readings.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({ readings, oat: oat ? parseFloat(oat) : undefined, occupancy_pct: occupancy ? parseFloat(occupancy) : undefined });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ThermometerSun className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold">Submit Readings</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕ Cancel</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {READABLE_PARAMS.map(p => (
          <div key={p.key} className="space-y-1">
            <label className="text-xs text-muted-foreground">{p.label} <span className="opacity-60">({p.unit})</span></label>
            <input
              type="number" step="0.01" placeholder={p.placeholder}
              value={vals[p.key] || ''}
              onChange={e => setVals(v => ({ ...v, [p.key]: e.target.value }))}
              className="w-full text-sm bg-background border border-border/40 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Asset ID <span className="opacity-60">(optional)</span></label>
          <input value={assetId} onChange={e => setAssetId(e.target.value)} placeholder="e.g. CHILLER-01"
            className="w-full text-sm bg-background border border-border/40 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">OAT (°F) <span className="opacity-60">optional</span></label>
          <input type="number" value={oat} onChange={e => setOat(e.target.value)} placeholder="72"
            className="w-full text-sm bg-background border border-border/40 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Occupancy % <span className="opacity-60">optional</span></label>
          <input type="number" value={occupancy} onChange={e => setOccupancy(e.target.value)} placeholder="65"
            className="w-full text-sm bg-background border border-border/40 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Submit Readings'}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DriftIntelligence() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<DriftAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showReadingsForm, setShowReadingsForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/drift-intelligence');
      setAnalysis(data as DriftAnalysis);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const data = await apiRequest('/drift-intelligence/analyze', { method: 'POST' });
      setAnalysis(data as DriftAnalysis);
      toast({ title: 'Analysis Complete', description: `${(data as DriftAnalysis).findings.length} finding(s) identified.` });
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err?.message || 'Try again', variant: 'destructive' });
    } finally { setRunning(false); }
  };

  const submitReadings = async (payload: any) => {
    await apiRequest('/drift-intelligence/readings', { method: 'POST', body: JSON.stringify(payload) });
    toast({ title: 'Readings Submitted', description: 'Run an analysis to update drift scores.' });
  };

  const exportReport = () => {
    if (!analysis) return;
    const s = analysis.scores;
    const lines = [
      'NEXUM SUUM — PERFORMANCE & SEQUENCING DRIFT INTELLIGENCE REPORT',
      `Generated: ${new Date(analysis.analyzed_at).toLocaleString()}`,
      `Readings: ${analysis.data_points.reading_count} · Parameters: ${analysis.data_points.parameters_tracked}`,
      '',
      '── FACILITY INTELLIGENCE SCORES ─────────────────────────────────────',
      `Facility Intelligence Score:  ${s.facility_intelligence}/100`,
      `Performance Drift:            ${s.performance_drift}/100 (higher = more drift)`,
      `Sequencing Drift:             ${s.sequencing_drift}/100`,
      `Reliability Drift:            ${s.reliability_drift}/100`,
      `Optimization Potential:       ${s.optimization_potential}/100`,
      `Energy Waste:                 ${s.energy_waste}/100`,
      `Maintenance Risk:             ${s.maintenance_risk}/100`,
      `Asset Health:                 ${s.asset_health}/100`,
      '',
      `Low Load Protection: ${analysis.low_load_protection.active ? 'ACTIVE' : 'INACTIVE'}`,
      '',
      '── CATEGORY DISTRIBUTION ─────────────────────────────────────────────',
      ...Object.entries(analysis.category_distribution).map(([c, n]) =>
        `Cat ${c} (${CAT_META[c]?.label}): ${n}`
      ),
      '',
      '── FINDINGS ──────────────────────────────────────────────────────────',
      ...analysis.findings.map(f =>
        `[${f.category}/${f.severity.toUpperCase()}] ${f.title}\n  ${f.description}\n  Causes: ${f.causes.join(', ')}\n  Action: ${f.recommendation || f.impact}`
      ),
      '',
      '── RECOMMENDED ACTIONS ───────────────────────────────────────────────',
      ...analysis.recommendations.map(r => `[${r.priority.toUpperCase()}] ${r.action}\n  ${r.detail}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `drift-intelligence-${Date.now()}.txt`;
    a.click();
  };

  const visibleFindings = analysis?.findings.filter(f => !activeFilter || f.category === activeFilter) || [];
  const s = analysis?.scores;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <TrendingDown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Performance & Sequencing Drift Intelligence</h1>
              <p className="text-sm text-muted-foreground">
                Detects gradual degradation before alarms — faults are sudden, drifts are gradual
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {analysis && <Button variant="outline" size="sm" onClick={exportReport} className="gap-2"><Download className="w-4 h-4" />Export</Button>}
            <Button variant="outline" size="sm" onClick={() => setShowReadingsForm(v => !v)} className="gap-2">
              <ThermometerSun className="w-4 h-4" />
              {showReadingsForm ? 'Cancel' : 'Submit Readings'}
            </Button>
            <Button onClick={runAnalysis} disabled={running} className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
              {running ? 'Analyzing…' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Last analyzed */}
        {analysis && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Last analyzed {new Date(analysis.analyzed_at).toLocaleString()}</span>
            <span>{analysis.data_points.reading_count} readings · {analysis.data_points.parameters_tracked} parameters</span>
            {!analysis.has_readings && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <Info className="w-3.5 h-3.5" />
                No sensor readings submitted — analysis based on work order patterns only
              </span>
            )}
          </div>
        )}

        {/* Readings form */}
        {showReadingsForm && <ReadingsForm onSubmit={submitReadings} onClose={() => setShowReadingsForm(false)} />}

        {/* Main scores: FI gauge + 8 metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            {loading ? <div className="h-64 rounded-xl bg-muted/20 animate-pulse" /> : <FIGauge score={s?.facility_intelligence ?? 0} />}
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SCORE_META.map(m => {
              const val = s?.[m.key as keyof DriftScores] ?? 0;
              const Icon = m.icon;
              const displayVal = m.inverted ? val : val; // all shown as raw score
              return (
                <div key={m.key} className="bg-card border border-border/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground leading-tight">{m.label}</span>
                  </div>
                  {loading ? <div className="h-6 w-12 rounded bg-muted/30 animate-pulse" /> : (
                    <>
                      <div className={`text-2xl font-bold ${m.color}`}>{displayVal}</div>
                      <Progress value={displayVal} className="h-1.5" />
                      <p className="text-[9px] text-muted-foreground leading-tight">{m.tip}</p>
                      {m.inverted && <span className="text-[9px] text-muted-foreground opacity-60">higher = more drift</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category distribution + LLP side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {loading ? <div className="h-48 rounded-xl bg-muted/20 animate-pulse" /> : analysis && <CategoryDistribution dist={analysis.category_distribution} />}
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
            {analysis && <LLPBadge llp={analysis.low_load_protection} />}
            {/* Data quality summary */}
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Data Sources</span>
              {loading ? <div className="h-16 bg-muted/20 rounded animate-pulse" /> : analysis && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Readings submitted</span><span className="font-medium">{analysis.data_points.reading_count}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Parameters tracked</span><span className="font-medium">{analysis.data_points.parameters_tracked}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Chillers monitored</span><span className="font-medium">{analysis.data_points.staging_chillers}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pumps monitored</span><span className="font-medium">{analysis.data_points.staging_pumps}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-semibold">Drift Findings</h2>
              {analysis && <Badge variant="secondary">{analysis.findings.length}</Badge>}
            </div>
            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              <button
                onClick={() => setActiveFilter(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!activeFilter ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border/30 text-muted-foreground hover:text-foreground'}`}
              >All</button>
              {Object.entries(CAT_META).map(([cat, meta]) => {
                const count = analysis?.category_distribution[cat] || 0;
                if (count === 0) return null;
                return (
                  <button key={cat} onClick={() => setActiveFilter(f => f === cat ? null : cat)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeFilter === cat ? `${meta.bg} ${meta.border} ${meta.color}` : 'border-border/30 text-muted-foreground hover:text-foreground'}`}
                  >{cat} ({count})</button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)}</div>
          ) : visibleFindings.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {analysis ? 'No findings in selected category' : 'Run an analysis to detect drift patterns'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {visibleFindings.map(f => <FindingCard key={f.id} f={f} />)}
            </div>
          )}
        </div>

        {/* Recommended actions */}
        {analysis && analysis.recommendations.length > 0 && (
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              <h2 className="text-base font-semibold">Recommended Actions</h2>
              <Badge variant="secondary" className="ml-auto">{analysis.recommendations.length}</Badge>
            </div>
            <div className="space-y-2">
              {analysis.recommendations.map((r, i) => (
                <div key={i} className={`rounded-lg border p-3.5 ${PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.medium}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">[{r.category}] {r.priority}</span>
                    <span className="text-sm font-semibold">{r.action}</span>
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">{r.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !analysis && (
          <div className="bg-card border border-border/40 rounded-xl p-10 text-center space-y-4">
            <TrendingDown className="w-12 h-12 text-yellow-400 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Drift Analysis Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                Submit parameter readings (CHW Delta-T, kW/Ton, bearing temperature, etc.) then run an analysis
                to detect performance drift, sequencing inefficiencies, and reliability risks before alarms occur.
                The engine requires at least 3 readings per parameter to detect trends.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setShowReadingsForm(true)} className="gap-2">
                <ThermometerSun className="w-4 h-4" /> Submit First Readings
              </Button>
              <Button onClick={runAnalysis} disabled={running} className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">
                {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                Run Analysis
              </Button>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
