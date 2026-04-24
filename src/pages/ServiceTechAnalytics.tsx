import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle2,
  Users,
  Star,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d';
type Efficiency = 'Top' | 'Good' | 'Avg';

interface KPIData {
  revenue: number;
  revChange: number;
  jobsCompleted: number;
  jobsChange: number;
  avgCompletionHrs: number;
  retentionRate: number;
}

interface ServiceRevenue {
  type: string;
  amount: number;
}

interface TechPerformance {
  id: string;
  name: string;
  jobs: number;
  rating: number;
  completionRate: number;
  revenue: number;
  efficiency: Efficiency;
}

interface TopClient {
  id: string;
  name: string;
  revenue: number;
  jobs: number;
  satisfaction: number;
  trend: 'up' | 'down' | 'flat';
}

interface AtRiskClient {
  id: string;
  name: string;
  issue: string;
  daysSinceVisit: number;
  satisfaction: number;
}

interface MonthlyTrend {
  month: string;
  jobs: number;
  revenue: number;
}

// ─── Mock Data per range ──────────────────────────────────────────────────────

const KPI_DATA: Record<DateRange, KPIData> = {
  '7d': {
    revenue: 12400,
    revChange: 8.2,
    jobsCompleted: 23,
    jobsChange: 4.5,
    avgCompletionHrs: 3.1,
    retentionRate: 94,
  },
  '30d': {
    revenue: 50400,
    revChange: 12.0,
    jobsCompleted: 98,
    jobsChange: 9.1,
    avgCompletionHrs: 3.4,
    retentionRate: 92,
  },
  '90d': {
    revenue: 148200,
    revChange: 6.5,
    jobsCompleted: 287,
    jobsChange: 3.2,
    avgCompletionHrs: 3.6,
    retentionRate: 91,
  },
};

const SERVICE_REVENUE: ServiceRevenue[] = [
  { type: 'HVAC Maintenance', amount: 18400 },
  { type: 'Boiler / Heating', amount: 12200 },
  { type: 'Plumbing', amount: 8900 },
  { type: 'Electrical', amount: 6100 },
  { type: 'General Maintenance', amount: 4800 },
];

const MAX_SERVICE_REV = Math.max(...SERVICE_REVENUE.map((s) => s.amount));

const TECH_PERFORMANCE: TechPerformance[] = [
  { id: 't1', name: 'Marcus Rivera', jobs: 22, rating: 4.9, completionRate: 98, revenue: 11200, efficiency: 'Top' },
  { id: 't2', name: 'Dana Chen', jobs: 19, rating: 4.7, completionRate: 95, revenue: 9800, efficiency: 'Top' },
  { id: 't3', name: 'James Obi', jobs: 18, rating: 4.6, completionRate: 94, revenue: 9100, efficiency: 'Good' },
  { id: 't4', name: 'Kevin Walsh', jobs: 15, rating: 4.4, completionRate: 91, revenue: 7600, efficiency: 'Good' },
  { id: 't5', name: 'Priya Nair', jobs: 13, rating: 4.2, completionRate: 88, revenue: 6500, efficiency: 'Avg' },
  { id: 't6', name: 'Sofia Bauer', jobs: 11, rating: 4.0, completionRate: 85, revenue: 6200, efficiency: 'Avg' },
];

const TOP_CLIENTS: TopClient[] = [
  { id: 'c1', name: 'Apex Tower LLC', revenue: 14200, jobs: 18, satisfaction: 97, trend: 'up' },
  { id: 'c2', name: 'Metro Medical Center', revenue: 12800, jobs: 14, satisfaction: 95, trend: 'up' },
  { id: 'c3', name: 'Lakewood Industrial', revenue: 9600, jobs: 12, satisfaction: 91, trend: 'flat' },
  { id: 'c4', name: 'Harbor View Hotel', revenue: 7400, jobs: 9, satisfaction: 89, trend: 'up' },
  { id: 'c5', name: 'Riverfront Lofts', revenue: 6400, jobs: 8, satisfaction: 86, trend: 'down' },
];

const AT_RISK_CLIENTS: AtRiskClient[] = [
  { id: 'r1', name: 'Westside Schools Dist.', issue: 'No visit in 67 days', daysSinceVisit: 67, satisfaction: 74 },
  { id: 'r2', name: 'Riverfront Lofts', issue: 'Low satisfaction score', daysSinceVisit: 2, satisfaction: 62 },
  { id: 'r3', name: 'Central Park Plaza', issue: 'Overdue maintenance', daysSinceVisit: 82, satisfaction: 78 },
];

const MONTHLY_TREND: MonthlyTrend[] = [
  { month: 'Nov 25', jobs: 72, revenue: 38400 },
  { month: 'Dec 25', jobs: 58, revenue: 30200 },
  { month: 'Jan 26', jobs: 81, revenue: 43800 },
  { month: 'Feb 26', jobs: 88, revenue: 46100 },
  { month: 'Mar 26', jobs: 95, revenue: 49700 },
  { month: 'Apr 26', jobs: 98, revenue: 50400 },
];

const MAX_JOBS = Math.max(...MONTHLY_TREND.map((m) => m.jobs));
const MAX_REVENUE = Math.max(...MONTHLY_TREND.map((m) => m.revenue));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const efficiencyColor: Record<Efficiency, string> = {
  Top: 'bg-green-500/20 text-green-400 border-green-500/30',
  Good: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Avg: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const formatCurrency = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceTechAnalytics() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>('30d');
  const kpi = KPI_DATA[range];

  const RANGES: { label: string; value: DateRange }[] = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/service-tech')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 mt-1">
              Service Intelligence
            </h1>
            <p className="text-muted-foreground text-sm">Analytics &amp; performance insights</p>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? 'default' : 'outline'}
                className={cn(
                  range === r.value
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600'
                    : 'border-border/50'
                )}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(kpi.revenue)}</p>
              <div className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="h-3 w-3" />
                +{kpi.revChange}% vs prev period
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Jobs Completed</span>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold">{kpi.jobsCompleted}</p>
              <div className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="h-3 w-3" />
                +{kpi.jobsChange}% vs prev period
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg Completion Time</span>
                <Clock className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{kpi.avgCompletionHrs}h</p>
              <p className="text-xs text-muted-foreground">per job average</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Client Retention</span>
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">{kpi.retentionRate}%</p>
              <p className="text-xs text-muted-foreground">active client base</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Revenue by Service Type ───────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Revenue by Service Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SERVICE_REVENUE.map((s) => {
              const pct = (s.amount / MAX_SERVICE_REV) * 100;
              return (
                <div key={s.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{s.type}</span>
                    <span className="font-semibold text-xs">
                      ${s.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-6 bg-muted/30 rounded overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/40 rounded transition-all duration-500 flex items-center px-2"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Row 3: Technician Performance Table ──────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-cyan-400" />
              Technician Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Jobs</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Rating</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">
                    Completion
                  </th>
                  <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Revenue</th>
                  <th className="text-left px-4 py-2 font-medium">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {TECH_PERFORMANCE.map((tech) => (
                  <tr
                    key={tech.id}
                    className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                          {tech.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <span className="text-sm font-medium">{tech.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{tech.jobs}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        {tech.rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted/40 rounded overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded"
                            style={{ width: `${tech.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {tech.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs font-medium">
                      ${tech.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-medium',
                          efficiencyColor[tech.efficiency]
                        )}
                      >
                        {tech.efficiency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Row 4: Client Health Matrix ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top clients */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Top Clients by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TOP_CLIENTS.map((client, idx) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.jobs} jobs · {client.satisfaction}% satisfaction
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(client.revenue)}</p>
                    <span className="text-xs">
                      {client.trend === 'up' && (
                        <TrendingUp className="h-3 w-3 text-green-400 inline" />
                      )}
                      {client.trend === 'down' && (
                        <TrendingDown className="h-3 w-3 text-red-400 inline" />
                      )}
                      {client.trend === 'flat' && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* At-risk clients */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Clients Needing Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {AT_RISK_CLIENTS.map((client) => (
                <div
                  key={client.id}
                  className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{client.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      At Risk
                    </span>
                  </div>
                  <p className="text-xs text-amber-400">{client.issue}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{client.daysSinceVisit}d since last visit</span>
                    <span>·</span>
                    <span>
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400 inline mr-0.5" />
                      {client.satisfaction}% satisfied
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 5: Monthly Trend Chart ────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Monthly Trend — Nov 2025 to Apr 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 overflow-x-auto pb-2">
              {MONTHLY_TREND.map((m) => {
                const jobsPct = (m.jobs / MAX_JOBS) * 100;
                const revPct = (m.revenue / MAX_REVENUE) * 100;
                return (
                  <div
                    key={m.month}
                    className="flex flex-col items-center gap-1 min-w-[56px]"
                  >
                    {/* bars */}
                    <div className="flex items-end gap-1 h-32">
                      <div className="flex flex-col justify-end h-full">
                        <div
                          className="w-5 bg-cyan-500/50 rounded-t transition-all duration-500"
                          style={{ height: `${jobsPct}%` }}
                          title={`${m.jobs} jobs`}
                        />
                      </div>
                      <div className="flex flex-col justify-end h-full">
                        <div
                          className="w-5 bg-teal-400/40 rounded-t transition-all duration-500"
                          style={{ height: `${revPct}%` }}
                          title={`$${m.revenue.toLocaleString()}`}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{m.month}</p>
                    <p className="text-xs font-semibold text-cyan-400">{m.jobs} jobs</p>
                    <p className="text-xs text-teal-400">{formatCurrency(m.revenue)}</p>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-cyan-500/50" />
                Jobs Completed
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-teal-400/40" />
                Revenue
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
