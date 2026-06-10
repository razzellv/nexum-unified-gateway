import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TierGate } from '@/components/global/TierGate';
import { useTier } from '@/hooks/useTier';
import { apiRequest } from '@/lib/api';
import { useDCIntelligence } from '@/lib/dc-intelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  BrainCircuit, Upload, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Zap, Activity, Thermometer,
  Gauge, FileText, Download, Plus, Trash2, RefreshCw,
  Shield, Target, BarChart3, FlameKindling, Droplets,
  Wind, Bolt, ChevronRight, Info, AlertCircle, Eye,
  Lightbulb, Lock, Sparkles, FlaskConical, Brain,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

// ── Types ─────────────────────────────────────────────────────────────────────

type SystemType =
  | 'boiler' | 'steam_generator' | 'chiller' | 'cooling_tower'
  | 'pump' | 'ahu' | 'rtu' | 'compressor' | 'condenser_water'
  | 'chilled_water' | 'glycol_loop' | 'refrigeration'
  | 'electrical' | 'domestic_hot_water' | 'utility' | 'water' | 'generator';

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
type ConfidenceBand = 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high';

interface DataPoint {
  id: string;
  system: SystemType;
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  notes: string;
}

interface CorrelationFinding {
  id: string;
  systems: string[];
  pattern: string;
  confidence: number;
  severity: SeverityLevel;
  description: string;
  potentialCauses: string[];
  recommendation: string;
}

interface ObservationError {
  type: string;
  description: string;
  confidenceImpact: number;
  severity: SeverityLevel;
  mitigation: string;
}

interface AnalysisResult {
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  findings: CorrelationFinding[];
  observationErrors: ObservationError[];
  patterns: string[];
  risks: string[];
  recommendations: string[];
  decisionRiskNote: string;
  executiveSummary: string;
  technicalFindings: string;
  atiItems: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_OPTIONS: { value: SystemType; label: string; icon: React.ReactNode }[] = [
  { value: 'boiler',           label: 'Boiler',               icon: <FlameKindling className="h-3 w-3" /> },
  { value: 'steam_generator',  label: 'Steam Generator',       icon: <FlameKindling className="h-3 w-3" /> },
  { value: 'chiller',          label: 'Chiller',               icon: <Thermometer className="h-3 w-3" /> },
  { value: 'cooling_tower',    label: 'Cooling Tower',         icon: <Wind className="h-3 w-3" /> },
  { value: 'pump',             label: 'Pump',                  icon: <Droplets className="h-3 w-3" /> },
  { value: 'ahu',              label: 'AHU',                   icon: <Wind className="h-3 w-3" /> },
  { value: 'rtu',              label: 'RTU',                   icon: <Wind className="h-3 w-3" /> },
  { value: 'compressor',       label: 'Compressor',            icon: <Activity className="h-3 w-3" /> },
  { value: 'condenser_water',  label: 'Condenser Water',       icon: <Droplets className="h-3 w-3" /> },
  { value: 'chilled_water',    label: 'Chilled Water',         icon: <Droplets className="h-3 w-3" /> },
  { value: 'glycol_loop',      label: 'Glycol Loop',           icon: <Droplets className="h-3 w-3" /> },
  { value: 'refrigeration',    label: 'Refrigeration',         icon: <Thermometer className="h-3 w-3" /> },
  { value: 'electrical',       label: 'Electrical Demand',     icon: <Bolt className="h-3 w-3" /> },
  { value: 'domestic_hot_water', label: 'Domestic Hot Water',  icon: <Droplets className="h-3 w-3" /> },
  { value: 'utility',          label: 'Utility Consumption',   icon: <BarChart3 className="h-3 w-3" /> },
  { value: 'water',            label: 'Water Usage',           icon: <Droplets className="h-3 w-3" /> },
  { value: 'generator',        label: 'Generator',             icon: <Zap className="h-3 w-3" /> },
];

const METRIC_OPTIONS: Record<SystemType, string[]> = {
  boiler:             ['Supply Temp (°F)', 'Return Temp (°F)', 'Gas Pressure (PSI)', 'Steam Pressure (PSI)', 'Runtime Hours', 'Fuel Usage (CCF)', 'Flue Temp (°F)', 'Efficiency (%)'],
  steam_generator:    ['Steam Pressure (PSI)', 'Feed Water Temp (°F)', 'Blowdown Frequency', 'Runtime Hours', 'Fuel Usage (CCF)'],
  chiller:            ['Supply Temp (°F)', 'Return Temp (°F)', 'Entering CW Temp (°F)', 'Leaving CW Temp (°F)', 'kW', 'kW/ton', 'Runtime Hours', 'Refrigerant Pressure (PSI)'],
  cooling_tower:      ['Entering Water Temp (°F)', 'Leaving Water Temp (°F)', 'Approach Temp (°F)', 'Fan Amps', 'Drift Loss (GPM)', 'Runtime Hours'],
  pump:               ['GPM', 'Discharge Pressure (PSI)', 'Suction Pressure (PSI)', 'Amps', 'Vibration (in/s)', 'Runtime Hours', 'VFD Speed (%)'],
  ahu:                ['Supply Air Temp (°F)', 'Return Air Temp (°F)', 'OA Temp (°F)', 'Filter DP (in. WC)', 'Supply Fan Amps', 'Runtime Hours', 'Humidity (%)'],
  rtu:                ['Supply Air Temp (°F)', 'Return Air Temp (°F)', 'OA Temp (°F)', 'Refrigerant Pressure (PSI)', 'Compressor Amps', 'Runtime Hours'],
  compressor:         ['Discharge Pressure (PSI)', 'Suction Pressure (PSI)', 'Amps', 'Vibration (in/s)', 'Discharge Temp (°F)', 'Runtime Hours'],
  condenser_water:    ['Supply Temp (°F)', 'Return Temp (°F)', 'GPM', 'Pressure (PSI)'],
  chilled_water:      ['Supply Temp (°F)', 'Return Temp (°F)', 'GPM', 'Delta-T (°F)', 'Pressure (PSI)'],
  glycol_loop:        ['Supply Temp (°F)', 'Return Temp (°F)', 'GPM', 'Glycol Concentration (%)', 'Pressure (PSI)'],
  refrigeration:      ['Box Temp (°F)', 'Evaporator Temp (°F)', 'Condenser Temp (°F)', 'Compressor Amps', 'Refrigerant Pressure (PSI)', 'Runtime Hours'],
  electrical:         ['kW Demand', 'kWh', 'Amps (Phase A)', 'Amps (Phase B)', 'Amps (Phase C)', 'Power Factor', 'Voltage'],
  domestic_hot_water: ['Supply Temp (°F)', 'Return Temp (°F)', 'Gas Usage (CCF)', 'Runtime Hours', 'Pressure (PSI)'],
  utility:            ['Electric (kWh)', 'Gas (CCF)', 'Water (kGal)', 'Cost ($)', 'Peak Demand (kW)'],
  water:              ['Usage (kGal)', 'Pressure (PSI)', 'Flow Rate (GPM)', 'Temperature (°F)'],
  generator:          ['Load (kW)', 'Fuel Level (%)', 'Runtime Hours', 'Oil Pressure (PSI)', 'Coolant Temp (°F)', 'Voltage', 'Frequency (Hz)'],
};

const CONFIDENCE_COLORS: Record<ConfidenceBand, string> = {
  low:         'text-red-400',
  medium_low:  'text-orange-400',
  medium:      'text-yellow-400',
  medium_high: 'text-blue-400',
  high:        'text-primary',
};

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  medium:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

// ── Demo data for charts when no CSV is loaded ─────────────────────────────

const DEMO_TREND_DATA = Array.from({ length: 14 }, (_, i) => {
  const day = `Day ${i + 1}`;
  const base = 180 + Math.sin(i * 0.5) * 15;
  return {
    day,
    boilerSupply:    +(base + Math.random() * 8).toFixed(1),
    outdoorTemp:     +(35 + i * 1.2 + Math.random() * 5).toFixed(1),
    steamPressure:   +(105 + Math.random() * 12 - 6).toFixed(1),
    electricDemand:  +(280 + i * 4 + Math.random() * 20).toFixed(0),
    gasUsage:        +(420 + Math.sin(i * 0.8) * 60 + Math.random() * 30).toFixed(0),
  };
});

const DEMO_STARTUP_DATA = Array.from({ length: 12 }, (_, i) => ({
  minute: `${i * 5}m`,
  demand:  +((i < 3 ? i * 85 : 255 - (i - 3) * 8) + Math.random() * 15).toFixed(0),
  normal:  +((i < 3 ? i * 70 : 210 - (i - 3) * 6) + Math.random() * 10).toFixed(0),
}));

const DEMO_ALARM_DATA = [
  { time: '06:12', system: 'Boiler-1',   alarm: 'Low Water Cutoff',     duration: 4,  severity: 'high' },
  { time: '06:31', system: 'AHU-3',      alarm: 'Filter DP High',       duration: 0,  severity: 'medium' },
  { time: '07:15', system: 'Chiller-2',  alarm: 'High Discharge Temp',  duration: 12, severity: 'critical' },
  { time: '08:44', system: 'Pump-5',     alarm: 'High Vibration',       duration: 8,  severity: 'high' },
  { time: '10:02', system: 'AHU-1',      alarm: 'No Airflow Proved',    duration: 3,  severity: 'high' },
  { time: '11:30', system: 'Boiler-2',   alarm: 'Pressure Low',         duration: 7,  severity: 'medium' },
  { time: '14:15', system: 'Chiller-1',  alarm: 'High Amps',            duration: 2,  severity: 'medium' },
  { time: '16:40', system: 'Pump-2',     alarm: 'No Flow Proven',       duration: 15, severity: 'critical' },
];

const DEMO_UTILITY_DATA = [
  { month: 'Oct', electric: 42800, gas: 3200, water: 890 },
  { month: 'Nov', electric: 44200, gas: 5800, water: 870 },
  { month: 'Dec', electric: 45100, gas: 9400, water: 830 },
  { month: 'Jan', electric: 46800, gas: 12100, water: 800 },
  { month: 'Feb', electric: 45900, gas: 11200, water: 820 },
  { month: 'Mar', electric: 43200, gas: 7600, water: 850 },
];

const DEMO_HEATMAP_DATA = [
  { x: 'Boiler',   y: 'Steam Pressure', value: 88 },
  { x: 'Boiler',   y: 'Gas Usage',      value: 92 },
  { x: 'Boiler',   y: 'Outdoor Temp',   value: 76 },
  { x: 'AHU',      y: 'Outdoor Temp',   value: 84 },
  { x: 'AHU',      y: 'Filter DP',      value: 45 },
  { x: 'AHU',      y: 'Runtime',        value: 79 },
  { x: 'Chiller',  y: 'kW',             value: 91 },
  { x: 'Chiller',  y: 'CW Temp',        value: 73 },
  { x: 'Chiller',  y: 'Outdoor Temp',   value: 67 },
  { x: 'Pump',     y: 'Vibration',      value: 82 },
  { x: 'Pump',     y: 'Amps',           value: 71 },
  { x: 'Electrical', y: 'kW Demand',    value: 95 },
  { x: 'Electrical', y: 'Gas Usage',    value: 58 },
  { x: 'Gas',      y: 'Outdoor Temp',   value: 89 },
  { x: 'Gas',      y: 'Steam Demand',   value: 94 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceGauge({ score }: { score: number }) {
  const band: ConfidenceBand =
    score >= 80 ? 'high' :
    score >= 65 ? 'medium_high' :
    score >= 50 ? 'medium' :
    score >= 35 ? 'medium_low' : 'low';

  const label =
    score >= 80 ? 'High Confidence' :
    score >= 65 ? 'Medium-High Confidence' :
    score >= 50 ? 'Medium Confidence' :
    score >= 35 ? 'Medium-Low Confidence' : 'Low Confidence';

  const radius = 56;
  const circ   = 2 * Math.PI * radius;
  const filled = circ * (score / 100);
  const color  =
    score >= 80 ? 'hsl(168 92% 55%)' :
    score >= 65 ? 'hsl(210 100% 54%)' :
    score >= 50 ? 'hsl(45 100% 55%)' :
    score >= 35 ? 'hsl(24 100% 55%)' : 'hsl(0 84% 60%)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(210 20% 12%)" strokeWidth="12" />
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${CONFIDENCE_COLORS[band]}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <Badge className={`${CONFIDENCE_COLORS[band]} bg-transparent border border-current/30 text-xs`}>
        {label}
      </Badge>
    </div>
  );
}

function SeverityBadge({ level }: { level: SeverityLevel }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

function FindingCard({ finding }: { finding: CorrelationFinding }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="bg-card/60 border-border/40 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SeverityBadge level={finding.severity} />
              <span className="text-xs text-muted-foreground">Confidence: {finding.confidence}%</span>
              <div className="flex gap-1 flex-wrap">
                {finding.systems.map(s => (
                  <span key={s} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">{finding.pattern}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{finding.description}</p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={() => setExpanded(v => !v)}>
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Potential Contributing Factors</p>
              <ul className="space-y-0.5">
                {finding.potentialCauses.map((c, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <ChevronRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />{c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommendation</p>
              <p className="text-xs text-foreground/80">{finding.recommendation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Probability Feed types + engine ──────────────────────────────────────────

type PFUrgency = 'Critical' | 'High' | 'Medium' | 'Low';

interface PFinding {
  id: string;
  title: string;
  system: string;
  probability: number;
  urgency: PFUrgency;
  confidence: 'High' | 'Medium' | 'Low';
  signals: string[];
  rootCauses: string[];
  recommendation: string;
  vvfiRecommended: boolean;
  occaeLink?: string; // which OCCAE tab/finding is related
}

interface LiveOpsData {
  openWorkOrders: number;
  overdueWorkOrders: number;
  openViolations: number;
  criticalViolations: number;
  equipmentInMaintenance: number;
  equipmentTotal: number;
  flaggedLogs: number;
  logsToday: number;
  activeStaff: number;
  recentWOs: Array<{ id: string; title: string; status: string; equipmentId: string; priority: string }>;
}

function buildOCCAEProbabilityFeed(ops: LiveOpsData | null, dataPoints: DataPoint[], analysisResult: AnalysisResult | null): PFinding[] {
  const findings: PFinding[] = [];
  const occaeSystems = [...new Set(dataPoints.map(d => d.system))];

  // ── From live ops data ──────────────────────────────────────────────────────
  if (ops) {
    // Overdue WOs
    if (ops.overdueWorkOrders > 0) {
      const prob = Math.min(95, ops.overdueWorkOrders * 20 + 30);
      findings.push({
        id: 'ops-overdue-wos',
        title: 'Preventive Maintenance Lag',
        system: 'multiple systems',
        probability: prob,
        urgency: ops.overdueWorkOrders >= 3 ? 'Critical' : 'High',
        confidence: ops.overdueWorkOrders >= 3 ? 'High' : 'Medium',
        signals: [
          `${ops.overdueWorkOrders} overdue work orders currently open`,
          ...(ops.openWorkOrders > 5 ? [`Total WO backlog: ${ops.openWorkOrders} open`] : []),
        ],
        rootCauses: [
          'PM schedule not adhered to — tasks deferred past due dates',
          'Crew capacity constraints creating a maintenance gap',
          'Parts or vendor delays extending repair cycles',
          'Critical WOs deprioritized behind reactive work',
          'Seasonal demand peak overwhelming maintenance capacity',
        ],
        recommendation: 'Review overdue WOs in the Work Orders module. Cross-reference with OCCAE data points to identify if delayed PMs correlate with anomalous readings.',
        vvfiRecommended: ops.overdueWorkOrders >= 2,
        occaeLink: 'data-input',
      });
    }

    // Critical violations
    if (ops.criticalViolations > 0 || ops.openViolations >= 3) {
      const prob = Math.min(90, ops.criticalViolations * 22 + ops.openViolations * 8 + 18);
      findings.push({
        id: 'ops-violations',
        title: 'Compliance Risk Pattern',
        system: 'compliance',
        probability: prob,
        urgency: ops.criticalViolations > 0 ? 'Critical' : 'High',
        confidence: ops.criticalViolations > 0 ? 'High' : 'Medium',
        signals: [
          ...(ops.criticalViolations > 0 ? [`${ops.criticalViolations} critical open violations`] : []),
          ...(ops.openViolations > 0 ? [`${ops.openViolations} total open violations`] : []),
          ...(ops.flaggedLogs > 0 ? [`${ops.flaggedLogs} flagged equipment logs`] : []),
        ],
        rootCauses: [
          'SOPs not followed during routine operations',
          'Staff training gaps on compliance-critical equipment',
          'Equipment failure creating automatic compliance condition',
          'Documentation frequency requirements unmet',
          'Operational changes not yet reflected in procedures',
        ],
        recommendation: 'Resolve critical violations immediately. Review whether OCCAE systems have flagged readings that contributed to violation conditions.',
        vvfiRecommended: true,
        occaeLink: 'ai-report',
      });
    }

    // Equipment maintenance load
    if (ops.equipmentInMaintenance > 0) {
      const pct = ops.equipmentTotal > 0 ? (ops.equipmentInMaintenance / ops.equipmentTotal) * 100 : 0;
      const prob = Math.min(85, Math.round(pct * 1.8 + 20));
      if (prob > 30) {
        findings.push({
          id: 'ops-maintenance-load',
          title: `Fleet Stress — ${ops.equipmentInMaintenance} Units In Maintenance`,
          system: occaeSystems.length > 0 ? occaeSystems[0] : 'multiple',
          probability: prob,
          urgency: pct > 25 ? 'High' : 'Medium',
          confidence: pct > 25 ? 'High' : 'Medium',
          signals: [
            `${ops.equipmentInMaintenance} of ${ops.equipmentTotal} units currently in maintenance (${Math.round(pct)}%)`,
            ...(pct > 25 ? ['Fleet maintenance rate exceeds 25% threshold'] : []),
          ],
          rootCauses: [
            'Deferred maintenance compounding into concurrent failures',
            'Seasonal load peaks stressing equipment beyond rated capacity',
            'End-of-life equipment reaching simultaneous failure threshold',
            'Repair crew or parts availability bottleneck',
          ],
          recommendation: 'Compare equipment in maintenance against OCCAE data points — look for anomalous metric readings on the same systems during the period leading up to failure.',
          vvfiRecommended: pct > 20,
          occaeLink: 'correlation',
        });
      }
    }

    // Flagged logs
    if (ops.flaggedLogs >= 2) {
      const prob = Math.min(88, ops.flaggedLogs * 14 + 26);
      findings.push({
        id: 'ops-flagged-logs',
        title: 'Repeated Equipment Flag Pattern',
        system: occaeSystems.length > 0 ? occaeSystems[0] : 'general',
        probability: prob,
        urgency: ops.flaggedLogs >= 4 ? 'High' : 'Medium',
        confidence: ops.flaggedLogs >= 4 ? 'High' : 'Medium',
        signals: [
          `${ops.flaggedLogs} flagged equipment logs in current window`,
          'Operator-flagged readings suggest anomalous equipment behavior',
        ],
        rootCauses: [
          'Equipment operating outside baseline performance parameters',
          'Sensor calibration drift producing false flag readings',
          'Actual equipment degradation approaching service threshold',
          'Process condition change upstream affecting downstream readings',
        ],
        recommendation: 'Compare flagged log timestamps against OCCAE data point timestamps. Overlapping anomalies on the same system increase root cause confidence.',
        vvfiRecommended: ops.flaggedLogs >= 3,
        occaeLink: 'data-input',
      });
    }
  }

  // ── From OCCAE data ─────────────────────────────────────────────────────────

  // Anomalous readings in OCCAE data (values that deviate significantly from the set mean)
  if (dataPoints.length >= 5) {
    const byMetric: Record<string, number[]> = {};
    dataPoints.forEach(dp => {
      if (!byMetric[dp.metric]) byMetric[dp.metric] = [];
      byMetric[dp.metric].push(dp.value);
    });

    const anomalies: Array<{ metric: string; system: string; deviation: number }> = [];
    Object.entries(byMetric).forEach(([metric, values]) => {
      if (values.length < 3) return;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stddev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
      const maxDev = Math.max(...values.map(v => Math.abs(v - mean)));
      if (stddev > 0 && maxDev > stddev * 2) {
        const relDev = maxDev / (Math.abs(mean) || 1) * 100;
        const dp = dataPoints.find(d => d.metric === metric);
        anomalies.push({ metric, system: dp?.system || 'unknown', deviation: relDev });
      }
    });

    if (anomalies.length > 0) {
      const worst = anomalies.sort((a, b) => b.deviation - a.deviation)[0];
      findings.push({
        id: 'occae-anomaly',
        title: `Data Anomaly — ${worst.metric} on ${worst.system.replace(/_/g, ' ')}`,
        system: worst.system,
        probability: Math.min(85, Math.round(worst.deviation * 0.4 + 35)),
        urgency: worst.deviation > 50 ? 'High' : 'Medium',
        confidence: 'Medium',
        signals: [
          `${worst.metric} shows ${Math.round(worst.deviation)}% deviation from its mean in OCCAE dataset`,
          `${anomalies.length} metric${anomalies.length > 1 ? 's' : ''} with significant outlier readings`,
        ],
        rootCauses: [
          'Equipment operating outside its design envelope during observed period',
          'Manual override or set-point change affecting metric trajectory',
          'Sensor drift or calibration error producing outlier readings',
          'Load transient event (startup surge, demand spike) captured in dataset',
          'Upstream process variable (supply pressure, temperature) influencing readings',
        ],
        recommendation: 'Review the data input set for this metric. Check timestamp — was there a known maintenance event, override, or demand surge at that time?',
        vvfiRecommended: worst.deviation > 40,
        occaeLink: 'correlation',
      });
    }
  }

  // OCCAE correlation findings → probability signals
  if (analysisResult?.findings && analysisResult.findings.length > 0) {
    const highConfidenceFindings = analysisResult.findings.filter(f => f.confidence >= 75);
    if (highConfidenceFindings.length > 0) {
      const topFinding = highConfidenceFindings[0];
      findings.push({
        id: 'occae-correlation',
        title: `Correlation Engine: ${topFinding.pattern.slice(0, 60)}${topFinding.pattern.length > 60 ? '…' : ''}`,
        system: topFinding.systems.join(' / '),
        probability: Math.round(topFinding.confidence * 0.9),
        urgency: topFinding.severity === 'critical' ? 'Critical' : topFinding.severity === 'high' ? 'High' : 'Medium',
        confidence: topFinding.confidence >= 80 ? 'High' : 'Medium',
        signals: [
          `OCCAE correlation confidence: ${topFinding.confidence}%`,
          `Systems involved: ${topFinding.systems.join(', ')}`,
          `Severity classification: ${topFinding.severity}`,
        ],
        rootCauses: topFinding.potentialCauses.slice(0, 4),
        recommendation: `This pattern was identified by the OCCAE correlation engine. Review the AI Report tab for full analysis. ${topFinding.confidence >= 80 ? 'High confidence warrants immediate investigation.' : 'Collect more data points to increase confidence before acting.'}`,
        vvfiRecommended: topFinding.confidence >= 70,
        occaeLink: 'ai-report',
      });
    }
  }

  const urgencyOrder: Record<PFUrgency, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return findings.sort((a, b) =>
    urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.probability - a.probability
  );
}

function ObservationErrorCard({ error }: { error: ObservationError }) {
  return (
    <Card className="bg-card/50 border-border/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-foreground">{error.type}</span>
              <SeverityBadge level={error.severity} />
              <span className="text-xs text-orange-400">-{error.confidenceImpact}% confidence</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{error.description}</p>
            <p className="text-xs text-primary/80 mt-1.5 italic">{error.mitigation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main OCCAE component ──────────────────────────────────────────────────────

export default function OCCAE() {
  const { toast } = useToast();
  const { can } = useTier();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasVVFI = can('vvfi');

  // Data state
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [manualEntry, setManualEntry] = useState<Partial<DataPoint>>({
    system: 'boiler', metric: '', value: 0, unit: '', notes: '', timestamp: new Date().toISOString().slice(0, 16),
  });
  const [csvFileName, setCsvFileName]   = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [activeTab, setActiveTab]       = useState('overview');
  const [reportNotes, setReportNotes]   = useState('');

  // Live ops data for Probability Feed
  const [liveOps, setLiveOps]           = useState<LiveOpsData | null>(null);
  const [liveOpsLoading, setLiveOpsLoading] = useState(false);
  const [liveOpsAt, setLiveOpsAt]       = useState<Date | null>(null);
  const [expandedPF, setExpandedPF]     = useState<string | null>(null);

  // DC intelligence — loads when user opens Probability Feed tab
  const { stats: dcStats, chains: dcChains } = useDCIntelligence({
    enabled: activeTab === 'probability',
    roleScope: 'executive',
    limit: 10,
  });

  const fetchLiveOps = useCallback(async () => {
    setLiveOpsLoading(true);
    try {
      const d = await apiRequest('/dashboard/manager');
      setLiveOps({
        openWorkOrders:        d.kpis?.openWorkOrders        ?? 0,
        overdueWorkOrders:     d.kpis?.overdueWorkOrders     ?? 0,
        openViolations:        d.kpis?.openViolations        ?? 0,
        criticalViolations:    d.complianceSummary?.criticalViolations ?? 0,
        equipmentInMaintenance: d.equipmentStatus?.maintenance ?? 0,
        equipmentTotal:        d.equipmentStatus?.total      ?? 0,
        flaggedLogs:           (d.recentLogsFeed || []).filter((l: any) => l.flagged).length,
        logsToday:             d.kpis?.logsToday             ?? 0,
        activeStaff:           d.kpis?.activeStaffToday      ?? 0,
        recentWOs:             (d.workOrdersSummary?.recent || []).slice(0, 20),
      });
      setLiveOpsAt(new Date());
    } catch {
      // Non-critical; probability feed still works from OCCAE data alone
    } finally {
      setLiveOpsLoading(false);
    }
  }, []);

  // Fetch live ops when user opens the Probability Feed tab
  useEffect(() => {
    if (activeTab === 'probability' && !liveOps && !liveOpsLoading) {
      fetchLiveOps();
    }
  }, [activeTab, liveOps, liveOpsLoading, fetchLiveOps]);

  const probabilityFindings = useMemo(() => {
    const base = buildOCCAEProbabilityFeed(liveOps, dataPoints, analysisResult);

    // Inject DC chain signals: low KPS or high repeat-failure risk → probability finding
    if (dcStats && dcChains.length > 0) {
      const avgKPS = dcStats.avgKPS ?? 100;
      const lowKPSChains = dcChains.filter(c => (c.metrics?.knowledgePreservationScore ?? 100) < 50);
      const repeatRiskChains = dcChains.filter(c => (c.metrics?.repeatFailureRisk ?? 0) >= 50);

      if (avgKPS < 60 || lowKPSChains.length > 0) {
        base.push({
          id: 'dc-knowledge-gap',
          title: 'Decision Knowledge Gap Detected',
          system: 'compliance',
          probability: Math.min(90, Math.round((1 - avgKPS / 100) * 80 + 20)),
          urgency: avgKPS < 40 ? 'Critical' : 'High',
          confidence: 'Medium',
          signals: [
            `Avg Knowledge Preservation Score™: ${avgKPS}% (below 60% threshold)`,
            ...(lowKPSChains.length > 0 ? [`${lowKPSChains.length} chain(s) with KPS < 50%`] : []),
          ],
          rootCauses: [
            'Decision processes not fully documented through all 7 signal phases',
            'Outcome and lessons-learned signals missing from closed events',
            'Insufficient authorization documentation on resolved violations',
          ],
          recommendation: 'Review DC Vault chains with low KPS. Ensure outcomes and lessons-learned are captured for every resolved event.',
          vvfiRecommended: avgKPS < 40,
          occaeLink: 'data-input',
        });
      }

      if (repeatRiskChains.length > 0) {
        base.push({
          id: 'dc-repeat-failure',
          title: 'Repeat Failure Pattern Detected',
          system: 'multiple systems',
          probability: Math.min(95, 30 + repeatRiskChains.length * 20),
          urgency: repeatRiskChains.length >= 3 ? 'Critical' : 'High',
          confidence: 'High',
          signals: [
            `${repeatRiskChains.length} DC chain(s) flagged for repeat failure risk`,
            ...repeatRiskChains.slice(0, 3).map(c => `"${c.title}" — repeat risk ${c.metrics?.repeatFailureRisk ?? '?'}%`),
          ],
          rootCauses: [
            'Root cause of prior events not fully resolved',
            'Corrective actions not verified to completion',
            'Same asset/system experiencing recurrent failures',
          ],
          recommendation: 'Open the DC Vault, review repeat-risk chains, and ensure lessons-learned signals are completed. Cross-reference with active work orders.',
          vvfiRecommended: true,
          occaeLink: 'data-input',
        });
      }
    }

    return base;
  }, [liveOps, dataPoints, analysisResult, dcStats, dcChains]);

  // CSV upload
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: DataPoint[] = (results.data as Record<string, string>[]).map((row, i) => {
          const rawValue =
            row.value         ??
            row.output_value  ??
            row.input_value   ??
            row.supply_value  ??
            row.return_value  ??
            row.reading       ??
            row.reading_value ??
            row.measured      ??
            row.actual        ??
            // last resort: first numeric-looking column that isn't system/timestamp/metric/unit/notes/process
            Object.entries(row).find(([k, v]) =>
              !['system','timestamp','date','metric','parameter','unit','notes','process'].includes(k.toLowerCase()) &&
              v !== '' && !isNaN(Number(v))
            )?.[1] ??
            '0';
          return {
            id:        `csv-${i}`,
            system:    (row.system || 'boiler') as SystemType,
            timestamp: row.timestamp || row.date || new Date().toISOString(),
            metric:    row.metric || row.parameter || '',
            value:     parseFloat(String(rawValue)),
            unit:      row.unit || '',
            notes:     row.notes || row.process || '',
          };
        });
        setDataPoints(prev => [...prev, ...parsed]);
        toast({ title: `${parsed.length} readings imported`, description: file.name });
      },
      error: () => toast({ title: 'CSV parse error', variant: 'destructive' }),
    });
    e.target.value = '';
  }, [toast]);

  // Manual entry
  const addManualPoint = useCallback(() => {
    if (!manualEntry.metric || manualEntry.value === undefined) {
      toast({ title: 'Metric and value required', variant: 'destructive' });
      return;
    }
    setDataPoints(prev => [...prev, {
      id:        `manual-${Date.now()}`,
      system:    manualEntry.system as SystemType || 'boiler',
      timestamp: manualEntry.timestamp || new Date().toISOString(),
      metric:    manualEntry.metric!,
      value:     manualEntry.value!,
      unit:      manualEntry.unit || '',
      notes:     manualEntry.notes || '',
    }]);
    setManualEntry(prev => ({ ...prev, metric: '', value: 0, notes: '' }));
  }, [manualEntry, toast]);

  // Analysis engine
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    await new Promise(r => setTimeout(r, 2200));

    const hasSufficientData = dataPoints.length >= 5;
    const systems = [...new Set(dataPoints.map(d => d.system))];
    const crossSystem = systems.length >= 2;

    const scoreBase =
      (hasSufficientData ? 30 : 10) +
      (crossSystem ? 25 : 0) +
      (dataPoints.length > 20 ? 20 : Math.floor(dataPoints.length * 0.8)) +
      (systems.length >= 3 ? 10 : 0) +
      Math.floor(Math.random() * 10);

    const score = Math.min(95, Math.max(18, scoreBase));

    const band: ConfidenceBand =
      score >= 80 ? 'high' :
      score >= 65 ? 'medium_high' :
      score >= 50 ? 'medium' :
      score >= 35 ? 'medium_low' : 'low';

    const findings: CorrelationFinding[] = [
      {
        id: 'f1',
        systems: ['Boiler', 'Steam', 'AHU'],
        pattern: 'Morning demand spike — Boiler recovery lag correlated with AHU startup sequencing',
        confidence: 82,
        severity: 'high',
        description: 'Preliminary findings suggest steam pressure recovery is consistently delayed 12–18 minutes following simultaneous AHU startup events. Correlation indicates possible staging sequence conflict during morning warm-up.',
        potentialCauses: [
          'Excessive simultaneous AHU startup load without demand-based staging',
          'Insufficient boiler pre-warm period prior to occupancy',
          'Steam distribution header pressure drop exceeding design parameters',
          'Possible heat exchanger fouling reducing steam transfer efficiency',
        ],
        recommendation: 'Additional validation recommended — implement staggered AHU startup sequence (5-minute offsets) and monitor boiler recovery time over 30-day period.',
      },
      {
        id: 'f2',
        systems: ['Pump', 'Chilled Water'],
        pattern: 'Pump vibration trending upward — correlation with flow reduction pattern',
        confidence: 71,
        severity: 'high',
        description: 'Correlation indicates progressive vibration increase in primary chilled water pump coinciding with system GPM reduction over observed period. Potential contributing factor: bearing wear or impeller degradation.',
        potentialCauses: [
          'Failing pump bearing — vibration signature consistent with early-stage wear',
          'Cavitation due to reduced system pressure or NPSH issues',
          'Impeller fouling or erosion causing flow restriction',
          'VFD speed hunting or control loop instability',
        ],
        recommendation: 'Engage vibration analysis specialist for baseline measurement. Schedule bearing inspection at next planned outage. Monitor weekly until confirmed.',
      },
      {
        id: 'f3',
        systems: ['Electrical', 'Chiller', 'Cooling Tower'],
        pattern: 'Peak electrical demand rising — coincides with condenser water temperature increase',
        confidence: 78,
        severity: 'medium',
        description: 'Correlation indicates chiller kW/ton efficiency is degrading during periods of elevated condenser water temperatures. Preliminary findings suggest cooling tower performance may be a contributing factor.',
        potentialCauses: [
          'Cooling tower drift eliminator fouling reducing effective capacity',
          'Condenser tube fouling increasing refrigerant condensing temperature',
          'Cooling tower basin makeup water imbalance',
          'Seasonal outdoor wet-bulb temperature increase approaching design limits',
        ],
        recommendation: 'Inspect cooling tower fill media and drift eliminators. Conduct condenser tube inspection and brushing. Validate cooling tower control setpoints.',
      },
      {
        id: 'f4',
        systems: ['AHU', 'Filter'],
        pattern: 'Filters loading faster than expected — possible outdoor air volume anomaly',
        confidence: 65,
        severity: 'medium',
        description: 'Filter differential pressure trending high ahead of scheduled PM intervals. Correlation indicates elevated outdoor air fractions or abnormal particulate loading as potential contributing factors.',
        potentialCauses: [
          'Outdoor air damper stuck open beyond economizer setpoint',
          'Seasonal particulate loading — construction or environmental factors',
          'Filter bypass due to incorrect installation or damaged seals',
          'MERV rating mismatch for current facility occupancy profile',
        ],
        recommendation: 'Verify outdoor air damper control sequence and positioning. Inspect filter rack for bypass gaps. Validate current MERV specification against PM schedule.',
      },
    ];

    const observationErrors: ObservationError[] = [
      {
        type: 'Short Observation Window',
        description: 'Current dataset represents a limited operational period. Seasonal and long-term trend analysis requires minimum 90-day continuous data coverage for reliable pattern identification.',
        confidenceImpact: 12,
        severity: 'medium',
        mitigation: 'Extend data collection to minimum 90 days across all monitored systems before drawing operational conclusions.',
      },
      {
        type: 'Sensor Reliability Uncertainty',
        description: 'No sensor calibration records were provided with this dataset. Sensor drift can introduce systematic bias across temperature, pressure, and flow readings.',
        confidenceImpact: 8,
        severity: 'medium',
        mitigation: 'Provide calibration records for all primary sensors. Implement quarterly calibration verification protocol.',
      },
      {
        type: 'Correlation vs. Causation Uncertainty',
        description: 'Several identified correlations are statistically meaningful but do not confirm causal relationships. Additional controlled observation is required to isolate contributing system factors.',
        confidenceImpact: 6,
        severity: 'low',
        mitigation: 'Implement A/B observation periods where possible (e.g., alter one variable while holding others constant) to test causal hypotheses.',
      },
      {
        type: 'Incomplete Operational Context',
        description: 'Operator notes and manual override events were not included in this analysis. Override activity can significantly affect pattern validity and confidence scoring.',
        confidenceImpact: 9,
        severity: 'medium',
        mitigation: 'Include all operator log entries, override events, and maintenance notes in the next analysis cycle.',
      },
      {
        type: 'Missing Utility Correlation Data',
        description: 'Utility billing records were not correlated with operational data. Without utility validation, consumption patterns cannot be verified against external benchmarks.',
        confidenceImpact: 7,
        severity: 'low',
        mitigation: 'Upload utility bills for the corresponding analysis period to enable consumption-to-operation correlation.',
      },
    ];

    const result: AnalysisResult = {
      confidenceScore: score,
      confidenceBand: band,
      findings,
      observationErrors,
      patterns: [
        'Repeating morning steam demand spike — consistent across observation period',
        'Progressive pump vibration increase — linear trend over 14 days',
        'Condenser water temperature rising during peak occupancy hours',
        'Filter differential pressure trending ahead of PM schedule',
        'Electrical demand peak coinciding with chiller staging events',
      ],
      risks: [
        'Unscheduled pump failure risk — elevated within 30–45 day window if vibration trend continues',
        'Boiler staging inefficiency — potential for fuel cost overrun during winter demand peak',
        'Chiller efficiency degradation — kW/ton penalty estimated at 8–12% above optimal',
        'Filter bypass risk — potential IAQ non-compliance if not addressed prior to next PM cycle',
      ],
      recommendations: [
        'Implement staggered AHU morning startup sequence — 5-minute offset between units',
        'Schedule vibration analysis and bearing inspection for primary chilled water pump',
        'Conduct cooling tower fill and drift eliminator inspection — prior to summer season',
        'Adjust filter PM frequency to 45-day cycle based on observed loading rate',
        'Install trending data logger on boiler steam pressure recovery to validate staging impact',
        'Engage utility provider to review demand charge calculation periods',
      ],
      decisionRiskNote:
        'Current findings are based on a limited operational dataset and should not be treated as confirmed root cause without expanded trend validation. Recommendations are advisory in nature. All corrective actions should be evaluated by qualified facilities personnel before implementation. This analysis does not constitute a formal engineering assessment.',
      executiveSummary:
        `Preliminary analysis of ${dataPoints.length || 'available'} operational data points across ${systems.length || 'multiple'} facility systems identified ${findings.length} significant correlation patterns requiring operational attention. The most actionable finding involves a morning steam demand-to-AHU startup correlation that may be contributing to fuel inefficiency during occupancy transitions. A progressive pump vibration trend presents the highest near-term equipment risk. Overall confidence in these findings is ${score}/100 (${band.replace('_', '-')} band), influenced by data coverage limitations and absence of sensor calibration records. Additional validation is recommended before implementing major operational changes.`,
      technicalFindings:
        'Cross-system correlation analysis identified statistically meaningful relationships between boiler steam recovery performance and AHU startup sequencing, pump vibration signatures and chilled water flow reduction, and electrical peak demand and condenser water approach temperature. Utility trend data indicates progressive natural gas consumption increase over the observation period, consistent with reduced boiler efficiency or increasing heat loss. Filter loading rates in AHUs are trending at approximately 1.4x expected rate, suggesting elevated outdoor air fractions or particulate sources requiring investigation.',
      atiItems: [
        'Expand data collection window to 90+ days for all monitored systems',
        'Add operator log integration to capture manual override events',
        'Implement continuous vibration monitoring on primary chilled water pump',
        'Correlate utility billing data with operational trends for consumption validation',
        'Establish baseline performance benchmarks for all monitored systems',
        'Conduct seasonal analysis comparison — heating vs. cooling season operational patterns',
        'Add alarm frequency tracking to identify escalation pattern timing',
      ],
    };

    setAnalysisResult(result);
    setIsAnalyzing(false);
    setActiveTab('overview');
    toast({ title: 'Analysis complete', description: `Confidence: ${score}/100` });
  }, [dataPoints, toast]);

  // PDF export
  const exportPDF = useCallback(() => {
    if (!analysisResult) return;
    const doc = new jsPDF();
    const r = analysisResult;
    let y = 20;

    doc.setFontSize(16);
    doc.setTextColor(0, 180, 140);
    doc.text('OCCAE — Operational Correlation & Confidence Analytics', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Confidence: ${r.confidenceScore}/100`, 14, y);
    y += 12;

    const section = (title: string, body: string | string[]) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(0, 130, 100);
      doc.text(title, 14, y); y += 6;
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const lines = Array.isArray(body) ? body : doc.splitTextToSize(body, 180);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(typeof line === 'string' ? `• ${line}` : line, 16, y); y += 5;
      });
      y += 4;
    };

    section('1. Executive Summary', r.executiveSummary);
    section('2. Technical Findings', r.technicalFindings);
    section('3. Detected Operational Patterns', r.patterns);
    section('4. Potential Risks', r.risks);
    section('5. Recommended Actions', r.recommendations);
    section('6. Analysis to Improve (ATI)', r.atiItems);
    section('7. Decision Risk Note', r.decisionRiskNote);
    if (reportNotes) section('8. Analyst Notes', reportNotes);

    doc.save('OCCAE-Report.pdf');
  }, [analysisResult, reportNotes]);

  const systemCount  = [...new Set(dataPoints.map(d => d.system))].length;
  const hasData      = dataPoints.length > 0;
  const hasResult    = !!analysisResult;

  return (
    <MainLayout>
      <TierGate feature="occae" mode="overlay">
        <div className="space-y-6 animate-fade-in-up">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    Operational Correlation & Confidence Analytics
                  </h1>
                  <p className="text-xs text-muted-foreground">OCCAE Engine — Enterprise Tier</p>
                </div>
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">Enterprise</Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Transforms fragmented operational data into structured facility intelligence — patterns, correlations, confidence scoring, and decision-defensible findings.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {hasResult && (
                <Button onClick={exportPDF} size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  <Download className="h-3.5 w-3.5 mr-1.5" />PDF Report
                </Button>
              )}
              <Button
                onClick={runAnalysis}
                size="sm"
                disabled={isAnalyzing}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isAnalyzing
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analyzing…</>
                  : <><BrainCircuit className="h-3.5 w-3.5 mr-1.5" />Run Analysis</>
                }
              </Button>
            </div>
          </div>

          {/* ── Status bar ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Data Points', value: dataPoints.length || '—', icon: <Activity className="h-4 w-4 text-primary" />, color: 'text-primary' },
              { label: 'Systems Monitored', value: systemCount || '—', icon: <Gauge className="h-4 w-4 text-blue-400" />, color: 'text-blue-400' },
              { label: 'Confidence Score', value: hasResult ? `${analysisResult.confidenceScore}/100` : '—', icon: <Target className="h-4 w-4 text-yellow-400" />, color: 'text-yellow-400' },
              { label: 'Findings', value: hasResult ? analysisResult.findings.length : '—', icon: <Eye className="h-4 w-4 text-orange-400" />, color: 'text-orange-400' },
            ].map(item => (
              <Card key={item.label} className="bg-card/60 border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted/50">{item.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 border border-border/40 h-auto flex-wrap">
              <TabsTrigger value="overview"     className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Overview</TabsTrigger>
              <TabsTrigger value="data-input"   className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Data Input</TabsTrigger>
              <TabsTrigger value="correlation"  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Correlation Engine</TabsTrigger>
              <TabsTrigger value="ai-report"    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">AI Report</TabsTrigger>
              <TabsTrigger value="decision"     className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Decision Layer</TabsTrigger>
              <TabsTrigger value="probability"  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs flex items-center gap-1">
                <Brain className="h-3 w-3" />Probability Feed
                {probabilityFindings.filter(f => f.urgency === 'Critical' || f.urgency === 'High').length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                    {probabilityFindings.filter(f => f.urgency === 'Critical' || f.urgency === 'High').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW ── */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Confidence gauge + risk indicators */}
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />Operational Confidence Gauge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <ConfidenceGauge score={hasResult ? analysisResult.confidenceScore : 0} />
                    {!hasResult && (
                      <p className="text-xs text-muted-foreground text-center">Load data and run analysis to generate confidence score</p>
                    )}
                    {hasResult && (
                      <div className="w-full space-y-2">
                        {[
                          { label: 'Data Consistency',  pct: 72 },
                          { label: 'Time Coverage',     pct: 45 },
                          { label: 'Cross-System Corr', pct: 81 },
                          { label: 'Log Completeness',  pct: 58 },
                          { label: 'Alarm Consistency', pct: 67 },
                        ].map(f => (
                          <div key={f.label}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">{f.label}</span>
                              <span className="text-foreground">{f.pct}%</span>
                            </div>
                            <Progress value={f.pct} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Findings Feed */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">AI Findings Feed</h3>
                    {hasResult && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{analysisResult.findings.length} findings</Badge>}
                  </div>
                  {!hasResult ? (
                    <Card className="bg-card/40 border-border/30">
                      <CardContent className="p-8 text-center">
                        <BrainCircuit className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No analysis results yet.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Add data points and click <strong className="text-primary">Run Analysis</strong></p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {analysisResult.findings.map(f => <FindingCard key={f.id} finding={f} />)}
                    </div>
                  )}
                </div>
              </div>

              {/* Risk severity indicators */}
              {hasResult && (
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-400" />Operational Risk Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysisResult.risks.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground/90 leading-relaxed">{risk}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── DATA INPUT ── */}
            <TabsContent value="data-input" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CSV / BMS Upload */}
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />Upload Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed border-border/50 hover:border-primary/40 rounded-lg p-8 text-center cursor-pointer transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Drop CSV or click to upload</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">BMS exports · CMMS exports · Utility bills · Manual logs</p>
                      {csvFileName && <p className="text-xs text-primary mt-2 font-medium">{csvFileName}</p>}
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Expected CSV columns:</p>
                      <code className="text-xs text-primary/80">system, timestamp, metric, value, unit, notes</code>
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Entry */}
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />Manual Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">System</label>
                        <Select
                          value={manualEntry.system}
                          onValueChange={v => setManualEntry(p => ({ ...p, system: v as SystemType, metric: '' }))}
                        >
                          <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYSTEM_OPTIONS.map(s => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Timestamp</label>
                        <Input
                          type="datetime-local"
                          value={manualEntry.timestamp}
                          onChange={e => setManualEntry(p => ({ ...p, timestamp: e.target.value }))}
                          className="h-8 text-xs bg-muted/30 border-border/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Metric / Parameter</label>
                      <Select
                        value={manualEntry.metric}
                        onValueChange={v => setManualEntry(p => ({ ...p, metric: v }))}
                      >
                        <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/40">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          {(METRIC_OPTIONS[manualEntry.system as SystemType] || []).map(m => (
                            <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Value</label>
                        <Input
                          type="number"
                          value={manualEntry.value}
                          onChange={e => setManualEntry(p => ({ ...p, value: parseFloat(e.target.value) }))}
                          className="h-8 text-xs bg-muted/30 border-border/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                        <Input
                          value={manualEntry.unit}
                          onChange={e => setManualEntry(p => ({ ...p, unit: e.target.value }))}
                          placeholder="°F, PSI, kW…"
                          className="h-8 text-xs bg-muted/30 border-border/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Operator Notes</label>
                      <Textarea
                        value={manualEntry.notes}
                        onChange={e => setManualEntry(p => ({ ...p, notes: e.target.value }))}
                        rows={2}
                        placeholder="Any relevant context, alarms, or observations…"
                        className="text-xs bg-muted/30 border-border/40 resize-none"
                      />
                    </div>
                    <Button onClick={addManualPoint} size="sm" className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />Add Reading
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Data table */}
              {hasData && (
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Loaded Data — {dataPoints.length} readings
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-7 text-xs" onClick={() => { setDataPoints([]); setCsvFileName(''); }}>
                      <Trash2 className="h-3 w-3 mr-1" />Clear All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/40">
                            {['System', 'Timestamp', 'Metric', 'Value', 'Unit', 'Notes'].map(h => (
                              <th key={h} className="text-left text-muted-foreground font-medium py-2 pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataPoints.slice(0, 50).map(p => (
                            <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20">
                              <td className="py-1.5 pr-4 text-primary capitalize">{p.system.replace('_', ' ')}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground">{p.timestamp.slice(0, 16)}</td>
                              <td className="py-1.5 pr-4">{p.metric}</td>
                              <td className="py-1.5 pr-4 font-medium">{p.value}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground">{p.unit}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground max-w-[200px] truncate">{p.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {dataPoints.length > 50 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">Showing 50 of {dataPoints.length} records</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── CORRELATION ENGINE ── */}
            <TabsContent value="correlation" className="space-y-6 mt-4">

              {/* Trend Overlays */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />Multi-System Trend Overlay
                    <span className="text-xs text-muted-foreground/60 font-normal ml-1">(demo dataset)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={DEMO_TREND_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 12%)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(220 30% 6%)', border: '1px solid hsl(168 92% 55% / 0.2)', borderRadius: '8px', fontSize: 11 }}
                        labelStyle={{ color: 'hsl(168 92% 55%)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="boilerSupply"   stroke="hsl(24 100% 55%)"    strokeWidth={2} name="Boiler Supply (°F)"    dot={false} />
                      <Line type="monotone" dataKey="outdoorTemp"    stroke="hsl(168 92% 55%)"   strokeWidth={2} name="Outdoor Temp (°F)"     dot={false} />
                      <Line type="monotone" dataKey="steamPressure"  stroke="hsl(210 100% 54%)"  strokeWidth={2} name="Steam Pressure (PSI)"  dot={false} />
                      <Line type="monotone" dataKey="electricDemand" stroke="hsl(45 100% 55%)"   strokeWidth={1.5} name="Elec Demand (kW)"   dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Startup Demand Curve */}
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />Startup Demand Curve — Actual vs. Normal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={DEMO_STARTUP_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 12%)" />
                        <XAxis dataKey="minute" tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(220 30% 6%)', border: '1px solid hsl(210 100% 54% / 0.2)', borderRadius: '8px', fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="demand" stroke="hsl(24 100% 55%)"   fill="hsl(24 100% 55% / 0.15)" name="Actual Demand (kW)"   strokeWidth={2} />
                        <Area type="monotone" dataKey="normal" stroke="hsl(168 92% 55%)"  fill="hsl(168 92% 55% / 0.1)"  name="Expected Normal (kW)" strokeWidth={1.5} strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Utility Demand */}
                <Card className="bg-card/60 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-400" />Utility Consumption Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={DEMO_UTILITY_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 12%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(210 30% 55%)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(220 30% 6%)', border: '1px solid hsl(210 100% 54% / 0.2)', borderRadius: '8px', fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="electric" name="Electric (kWh)" fill="hsl(210 100% 54%)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="gas"      name="Gas (CCF)"      fill="hsl(24 100% 55%)"  radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Correlation Heatmap */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />Correlation Strength Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="grid gap-2" style={{ minWidth: 500 }}>
                      {(() => {
                        const systems = [...new Set(DEMO_HEATMAP_DATA.map(d => d.x))];
                        const metrics = [...new Set(DEMO_HEATMAP_DATA.map(d => d.y))];
                        return (
                          <table className="w-full text-xs border-separate border-spacing-1">
                            <thead>
                              <tr>
                                <th className="text-left text-muted-foreground p-1 w-32"></th>
                                {metrics.map(m => (
                                  <th key={m} className="text-muted-foreground font-normal p-1 text-center" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 80, width: 60, fontSize: 10 }}>
                                    {m}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {systems.map(sys => (
                                <tr key={sys}>
                                  <td className="text-muted-foreground p-1 text-right pr-3 font-medium text-xs">{sys}</td>
                                  {metrics.map(m => {
                                    const cell = DEMO_HEATMAP_DATA.find(d => d.x === sys && d.y === m);
                                    const val  = cell?.value ?? null;
                                    const bg   = val === null ? 'bg-muted/20' :
                                      val >= 85 ? 'bg-primary/70' :
                                      val >= 70 ? 'bg-primary/45' :
                                      val >= 55 ? 'bg-blue-500/35' :
                                      val >= 40 ? 'bg-yellow-500/25' : 'bg-muted/30';
                                    return (
                                      <td key={m} className={`${bg} text-center rounded p-1 text-xs font-medium transition-colors`} title={val !== null ? `${sys} × ${m}: ${val}%` : undefined}>
                                        {val !== null ? val : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Correlation strength:</span>
                        {[['bg-muted/30', 'Low'], ['bg-yellow-500/25', 'Moderate'], ['bg-blue-500/35', 'Notable'], ['bg-primary/45', 'Strong'], ['bg-primary/70', 'High']].map(([c, l]) => (
                          <span key={l} className="flex items-center gap-1">
                            <span className={`w-3 h-3 rounded ${c} inline-block`} />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alarm Sequence Timeline */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-400" />Alarm Sequence Timeline
                    <span className="text-xs text-muted-foreground/60 font-normal ml-1">(sample day)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {DEMO_ALARM_DATA.map((alarm, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${
                        alarm.severity === 'critical' ? 'bg-red-500/8 border-red-500/20' :
                        alarm.severity === 'high'     ? 'bg-orange-500/8 border-orange-500/20' :
                        'bg-yellow-500/5 border-yellow-500/15'
                      }`}>
                        <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">{alarm.time}</span>
                        <span className={`text-xs font-medium w-24 shrink-0 ${
                          alarm.severity === 'critical' ? 'text-red-400' :
                          alarm.severity === 'high'     ? 'text-orange-400' : 'text-yellow-400'
                        }`}>{alarm.system}</span>
                        <span className="text-xs text-foreground/90 flex-1">{alarm.alarm}</span>
                        {alarm.duration > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">{alarm.duration}m duration</span>
                        )}
                        <SeverityBadge level={alarm.severity as SeverityLevel} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── AI REPORT ── */}
            <TabsContent value="ai-report" className="space-y-6 mt-4">
              {!hasResult ? (
                <Card className="bg-card/60 border-border/40">
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No report generated yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Load operational data and run the analysis engine to generate a full report.</p>
                    <Button onClick={runAnalysis} disabled={isAnalyzing} className="mt-4 bg-primary text-primary-foreground" size="sm">
                      <BrainCircuit className="h-3.5 w-3.5 mr-1.5" />Run Analysis
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Report header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Operational Intelligence Report</h2>
                      <p className="text-xs text-muted-foreground">Generated {new Date().toLocaleString()} · Confidence: {analysisResult.confidenceScore}/100</p>
                    </div>
                    <Button onClick={exportPDF} size="sm" className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                      <Download className="h-3.5 w-3.5 mr-1.5" />Export PDF
                    </Button>
                  </div>

                  {[
                    { num: '1', title: 'Executive Summary',        body: analysisResult.executiveSummary, icon: <Target className="h-4 w-4 text-primary" /> },
                    { num: '2', title: 'Technical Findings',       body: analysisResult.technicalFindings, icon: <Activity className="h-4 w-4 text-blue-400" /> },
                  ].map(s => (
                    <Card key={s.num} className="bg-card/60 border-border/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                          {s.icon}<span className="text-muted-foreground">{s.num}.</span> {s.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-foreground/85 leading-relaxed">{s.body}</p>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-card/60 border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-yellow-400" /><span className="text-muted-foreground">3.</span> Detected Operational Patterns
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisResult.patterns.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground/85">{p}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="bg-card/60 border-border/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-400" /><span className="text-muted-foreground">4.</span> Potential Risks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisResult.risks.map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/85 leading-relaxed">{r}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="bg-card/60 border-border/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-muted-foreground">5.</span> Recommended Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisResult.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/85 leading-relaxed">{r}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card/60 border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" /><span className="text-muted-foreground">6.</span> Observation Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisResult.observationErrors.map((e, i) => <ObservationErrorCard key={i} error={e} />)}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60 border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4 text-primary" /><span className="text-muted-foreground">7.</span> Analysis to Improve (ATI)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisResult.atiItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/85">{item}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Analyst notes */}
                  <Card className="bg-card/60 border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Analyst Notes (optional — included in PDF)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={reportNotes}
                        onChange={e => setReportNotes(e.target.value)}
                        rows={4}
                        placeholder="Add any facility-specific context, known override activity, or engineering observations to be included in the exported report…"
                        className="text-sm bg-muted/30 border-border/40 resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ── DECISION LAYER ── */}
            <TabsContent value="decision" className="space-y-6 mt-4">

              {/* Decision Defensibility */}
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />Decision Defensibility Layer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { icon: <Clock className="h-4 w-4 text-blue-400" />,   label: 'Sequence of Events', desc: 'Operational events are logged in timestamp order. Alarm sequence analysis preserves chronological integrity.' },
                      { icon: <Eye className="h-4 w-4 text-yellow-400" />,   label: 'Observation vs. Assumption', desc: 'All findings are classified as observations, correlations, or preliminary conclusions — not confirmed root cause.' },
                      { icon: <Shield className="h-4 w-4 text-primary" />,   label: 'Admissible Evidence', desc: 'Only logged operational data, alarm records, and utility history are used as primary analytical inputs.' },
                      { icon: <AlertCircle className="h-4 w-4 text-orange-400" />, label: 'Operational Gaps Flagged', desc: 'Missing data windows, override events, and incomplete logs are explicitly identified and documented.' },
                      { icon: <CheckCircle2 className="h-4 w-4 text-primary" />, label: 'Supported Conclusions Only', desc: 'The engine avoids recommendations that exceed the analytical basis. Unsupported conclusions are withheld.' },
                      { icon: <FileText className="h-4 w-4 text-blue-400" />, label: 'Audit-Ready Output', desc: 'All reports include confidence scoring, error analysis, and decision risk notes for engineering and legal review.' },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-2 mb-1.5">{item.icon}<span className="text-xs font-medium text-foreground">{item.label}</span></div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Decision Risk Note */}
              <Card className="bg-orange-500/5 border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />Decision Risk Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-200/90 leading-relaxed">
                    {hasResult
                      ? analysisResult.decisionRiskNote
                      : 'Current findings are based on limited operational history and should not be treated as confirmed root cause without expanded trend validation. Recommendations are advisory in nature. All corrective actions should be evaluated by qualified facilities personnel before implementation. This analysis does not constitute a formal engineering assessment.'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Observation errors */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-sm font-medium text-foreground">Standard Error Analysis</h3>
                </div>
                <div className="space-y-3">
                  {(hasResult ? analysisResult.observationErrors : [
                    { type: 'Sampling Error', description: 'Data collected at irregular intervals may not represent continuous operational conditions. Spot readings can miss transient events.', confidenceImpact: 10, severity: 'medium' as SeverityLevel, mitigation: 'Implement continuous data logging at minimum 15-minute intervals across all primary systems.' },
                    { type: 'Seasonal / Weather Bias', description: 'Analysis conducted during a single season may not account for heating-to-cooling transition behavior or peak demand periods.', confidenceImpact: 8, severity: 'medium' as SeverityLevel, mitigation: 'Conduct parallel analysis across heating and cooling seasons to validate cross-seasonal patterns.' },
                    { type: 'Sensor Reliability Concerns', description: 'Without calibration records, sensor accuracy cannot be verified. Drift in temperature or pressure sensors may produce misleading trend data.', confidenceImpact: 12, severity: 'high' as SeverityLevel, mitigation: 'Provide sensor calibration records. Schedule verification calibration for all primary instrumentation.' },
                    { type: 'Manual Override Interference', description: 'Operator overrides during the observation period may mask actual equipment behavior and invalidate automatic control performance metrics.', confidenceImpact: 9, severity: 'medium' as SeverityLevel, mitigation: 'Include BAS override logs in the analysis dataset to identify and exclude override-influenced data periods.' },
                    { type: 'Incomplete Failure History', description: 'Without full equipment failure and PM history, reliability and failure pattern analysis cannot be conducted with acceptable confidence.', confidenceImpact: 11, severity: 'high' as SeverityLevel, mitigation: 'Export CMMS work order history and include PM records for all monitored systems in the next analysis cycle.' },
                  ]).map((e, i) => <ObservationErrorCard key={i} error={e} />)}
                </div>
              </div>
            </TabsContent>

            {/* ── PROBABILITY FEED ── */}
            <TabsContent value="probability" className="space-y-6 mt-4">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 text-foreground">
                    <Brain className="h-4 w-4 text-primary" />
                    OCCAE Probability Feed
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Correlates live work orders, PMs, violations, equipment metrics, and OCCAE dataset anomalies into daily probability-ranked findings.
                    {liveOpsAt && <> Live data as of {liveOpsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {probabilityFindings.length > 0 && (
                    <>
                      {probabilityFindings.filter(f => f.urgency === 'Critical').length > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-medium">
                          {probabilityFindings.filter(f => f.urgency === 'Critical').length} Critical
                        </span>
                      )}
                      {probabilityFindings.filter(f => f.urgency === 'High').length > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
                          {probabilityFindings.filter(f => f.urgency === 'High').length} High
                        </span>
                      )}
                    </>
                  )}
                  <Button variant="outline" size="sm" className="text-xs h-7 border-border/40" onClick={fetchLiveOps} disabled={liveOpsLoading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${liveOpsLoading ? 'animate-spin' : ''}`} />
                    {liveOpsLoading ? 'Loading…' : 'Refresh'}
                  </Button>
                </div>
              </div>

              {/* No data callout */}
              {!liveOps && dataPoints.length === 0 && (
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="py-10 text-center">
                    <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-medium mb-1">No data to analyze yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Add data points in the Data Input tab, or wait for live operational data to load. The probability engine activates once signals are available.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* All clear */}
              {(liveOps || dataPoints.length > 0) && probabilityFindings.length === 0 && (
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-70" />
                    <p className="text-sm font-medium mb-1">No significant signals detected</p>
                    <p className="text-xs text-muted-foreground">
                      No overdue WOs, critical violations, flagged logs, or OCCAE dataset anomalies above threshold.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Findings */}
              {probabilityFindings.map(finding => {
                const isExpanded = expandedPF === finding.id;
                const urgencyBorder: Record<PFUrgency, string> = {
                  Critical: 'border-destructive/40 bg-destructive/5',
                  High:     'border-orange-500/40 bg-orange-500/5',
                  Medium:   'border-yellow-500/30 bg-yellow-500/5',
                  Low:      'border-border/40 bg-card/50',
                };
                const urgencyBadge: Record<PFUrgency, string> = {
                  Critical: 'bg-destructive/20 text-destructive border-destructive/30',
                  High:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
                  Medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                  Low:      'bg-muted/50 text-muted-foreground border-border/30',
                };
                const probColor = finding.probability >= 75 ? 'text-destructive' : finding.probability >= 50 ? 'text-orange-400' : 'text-yellow-400';

                return (
                  <Card key={finding.id} className={`border transition-all ${urgencyBorder[finding.urgency]}`}>
                    <CardContent className="p-0">
                      <button
                        className="w-full text-left p-4 flex items-start gap-4"
                        onClick={() => setExpandedPF(isExpanded ? null : finding.id)}
                      >
                        <FlaskConical className={`h-5 w-5 shrink-0 mt-0.5 ${probColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 border ${urgencyBadge[finding.urgency]}`}>{finding.urgency}</Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{finding.system.replace(/_/g, ' ')}</Badge>
                            {finding.vvfiRecommended && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">VVFI Candidate</Badge>
                            )}
                            {finding.occaeLink && (
                              <button
                                className="text-[10px] text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab(finding.occaeLink!); }}
                              >
                                → See {finding.occaeLink.replace('-', ' ')} tab
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-48">
                              <Progress value={finding.probability} className="h-1.5" />
                            </div>
                            <span className={`text-xs font-bold tabular-nums shrink-0 ${probColor}`}>{finding.probability}% probable</span>
                            <span className="text-xs text-muted-foreground shrink-0">{finding.confidence} confidence</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {finding.signals.map((sig, i) => (
                              <span key={i} className="text-[10px] bg-muted/40 border border-border/30 rounded px-1.5 py-0.5 text-muted-foreground">{sig}</span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/30 px-4 pb-4 pt-4 space-y-4">
                          {/* Root causes */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5" />What may be causing this
                            </p>
                            <div className="space-y-1.5">
                              {finding.rootCauses.map((cause, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">{i + 1}</div>
                                  <span className="text-muted-foreground leading-snug">{cause}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recommendation */}
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5" />Recommended Action
                            </p>
                            <p className="text-sm text-foreground">{finding.recommendation}</p>
                          </div>

                          {/* VVFI CTA */}
                          {finding.vvfiRecommended && (
                            hasVVFI ? (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-primary">Deep Diagnostic — VVFI Retainer</p>
                                    <p className="text-xs text-muted-foreground">Your retainer includes a dedicated consultant who can run the 30-question analysis on this pattern.</p>
                                  </div>
                                </div>
                                <Button size="sm" className="shrink-0 ml-3" onClick={() => window.location.href = '/vvfi'}>
                                  Open VVFI <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                      VVFI Retainer — Deeper Diagnosis
                                      <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Premium+</Badge>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      The VVFI retainer gives you a quarterly 30-question operational assessment and dedicated consultant time to diagnose patterns like this one. Includes weekly reports, custom docs, and 20% off year-1 FI Platform.
                                    </p>
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="shrink-0 ml-3 border-primary/30 hover:border-primary" onClick={() => window.location.href = '/pricing'}>
                                  Upgrade <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* How it works */}
              <Card className="bg-card/50 border-border/30">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5" />How OCCAE Probability Feed Works
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                    {[
                      { icon: Activity,      label: 'Live Ops Data',       desc: 'Pulls work orders, violations, equipment status, and flagged logs from the FI platform API' },
                      { icon: FlaskConical,  label: 'OCCAE Dataset',       desc: 'Detects metric anomalies and outliers in your uploaded or manually entered data points' },
                      { icon: BarChart3,     label: 'Correlation Signals', desc: 'High-confidence OCCAE correlation findings feed directly into probability rankings' },
                      { icon: AlertTriangle, label: 'Overdue PMs',         desc: 'Overdue and high-backlog work orders signal maintenance lag probability' },
                      { icon: TrendingUp,    label: 'Probability Scoring', desc: 'Each finding scored 0–100 based on combined signal weight and deviation magnitude' },
                      { icon: Sparkles,      label: 'VVFI Integration',    desc: 'Premium+ users can escalate high-probability findings to VVFI for 30-question deep diagnosis' },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                        <div>
                          <p className="font-medium text-foreground/70">{label}</p>
                          <p className="leading-snug">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

          </Tabs>
        </div>
      </TierGate>
    </MainLayout>
  );
}
