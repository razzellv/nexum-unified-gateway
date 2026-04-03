import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { FacilityGauge } from '@/components/global/FacilityGauge';
import { ExportButtons } from '@/components/global/ExportButtons';
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { TierGate } from '@/components/TierGate';
import { getExecutiveDashboard } from '@/lib/nexum-api';
import { getAvailableFacilities } from '@/lib/role-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Flame, DollarSign, AlertTriangle, Clock,
  TrendingUp, BarChart3, ClipboardList, Building2, Users, RefreshCw, Shield, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(end: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);
  return count;
}

function operatorName(op: any): string {
  if (!op) return 'Unknown';
  if (typeof op === 'string') {
    if (op === '[object Object]') return 'Unknown';
    return op;
  }
  if (typeof op === 'object') return op.name || op.id || 'Unknown';
  return String(op);
}

function KPICard({ title, value, unit, icon: Icon, trend, delay }: {
  title: string; value: number; unit?: string;
  icon: React.ElementType; trend?: 'up' | 'down'; delay: number;
}) {
  const animated = useCountUp(value);
  return (
    <Card className="executive-card neon-border" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
            {trend === 'up' ? '↑' : '↓'}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <span className="text-3xl font-bold text-foreground text-glow count-glow">
          {unit === '$' && '$'}{animated.toLocaleString()}{unit === '%' && '%'}
        </span>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </Card>
  );
}

function SiteCard({ site, index }: { site: any; index: number }) {
  const health = site.facilityIntegrity || 0;
  const healthColor = health >= 80 ? 'text-green-400' : health >= 60 ? 'text-yellow-400' : 'text-destructive';
  const compliance = site.complianceScore || 0;
  const compColor = compliance >= 80 ? 'text-green-400' : compliance >= 60 ? 'text-yellow-400' : 'text-destructive';
  return (
    <div className="p-4 rounded-xl border border-border/40 bg-card/50 hover:border-primary/30 transition-all space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{site.name}</p>
          {site.facilityId && <p className="text-[10px] text-muted-foreground font-mono">{site.facilityId}</p>}
        </div>
        <div className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', health >= 80 ? 'border-green-400/30 text-green-400 bg-green-400/10' : health >= 60 ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' : 'border-destructive/30 text-destructive bg-destructive/10')}>
          {health >= 80 ? 'Healthy' : health >= 60 ? 'Monitor' : 'At Risk'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Boiler Eff.</p>
          <p className="font-bold text-sm text-primary mt-0.5">{site.boilerEfficiency || 0}%</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Facility Health</p>
          <p className={cn('font-bold text-sm mt-0.5', healthColor)}>{health}%</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Cost</p>
          <p className="font-bold text-sm text-yellow-400 mt-0.5">${(site.dailyCost || 0).toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compliance</p>
          <p className={cn('font-bold text-sm mt-0.5', compColor)}>{compliance}%</p>
        </div>
      </div>
      {site.violations > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
          <span className="text-xs text-destructive font-medium">{site.violations} open violation{site.violations !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}


function EmployeeRiskCard({ employee, index }: { employee: any; index: number }) {
  const riskColors = {
    Low:      'bg-green-500/20 text-green-400 border-green-500/30',
    Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    High:     'bg-destructive/20 text-destructive border-destructive/30',
  };
  const level = employee.riskLevel as keyof typeof riskColors;
  return (
    <div className={cn('p-4 rounded-lg border', riskColors[level])} style={{ animationDelay: `${800 + index * 100}ms` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4" />
          <span className="font-medium">{employee.name}</span>
        </div>
        <Badge className={riskColors[level]}>{employee.riskLevel}</Badge>
      </div>
      <div className="flex gap-4 mt-2 text-sm">
        <span>Score: {employee.complianceScore}%</span>
        <span>Violations: {employee.violations}</span>
        {employee.category && <span className="text-xs opacity-70">{employee.category}</span>}
      </div>
    </div>
  );
}

function ComplianceBar({ label, count, total, color }: { label: string; count: number; total: number; color: string; }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── OVPI Tab ──────────────────────────────────────────────────────────────────
function OVPITab() {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<any>(null);

  useEffect(() => { fetchOVPI(); }, []);

  const fetchOVPI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const [woRes, vioRes] = await Promise.all([
        fetch(`${baseUrl}/work-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/violations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const woData = woRes.ok ? await woRes.json() : { workOrders: [] };
      const vioData = vioRes.ok ? await vioRes.json() : { violations: [] };
      const wos = woData.workOrders || [];
      const violations = vioData.violations || [];
      const completed = wos.filter((w: any) => w.status === 'completed').length;
      const total = wos.length || 1;
      const onTime = wos.filter((w: any) => w.status === 'completed' && w.priority !== 'critical').length;
      const openVio = violations.filter((v: any) => v.status === 'open').length;
      const highVio = violations.filter((v: any) => v.severity === 'high').length;
      const repairScore  = Math.min(100, Math.round((completed / total) * 100));
      const woScore      = Math.min(100, Math.round((onTime / (completed || 1)) * 100));
      const stewardScore = Math.max(0, 100 - (openVio * 5) - (highVio * 10));
      const orgScore     = Math.max(0, 100 - (violations.length * 2));
      const overall      = Math.round((repairScore + woScore + stewardScore + orgScore) / 4);
      setScores({
        overall,
        domains: [
          { name: 'Repair & Maintenance',  score: repairScore,   detail: `${completed}/${total} WOs completed`,   trend: repairScore >= 80 ? 'up' : 'down' },
          { name: 'Work Order Discipline', score: woScore,       detail: `${onTime} on-time completions`,         trend: woScore >= 80 ? 'up' : 'down' },
          { name: 'System Stewardship',    score: stewardScore,  detail: `${openVio} open violations`,            trend: openVio === 0 ? 'up' : 'down' },
          { name: 'Organizational Virtue', score: orgScore,      detail: `${violations.length} total violations`, trend: violations.length < 5 ? 'up' : 'down' },
        ],
      });
    } catch (err) {
      console.error('OVPI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good Standing';
    if (score >= 60) return 'Needs Attention';
    return 'At Risk';
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Operational Virtue & Performance Intelligence</h2>
          <p className="text-muted-foreground mt-1">Executive-level facility performance scoring across 4 operational domains</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Executive Only</Badge>
          <Button variant="outline" size="sm" onClick={fetchOVPI} className="border-primary/30 hover:border-primary">
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {scores && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="executive-card neon-border p-6 text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                    strokeDasharray={`${(scores.overall / 100) * 339} 339`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute text-center">
                  <p className={`text-4xl font-bold ${getScoreColor(scores.overall)}`}>{scores.overall}</p>
                  <p className="text-xs text-muted-foreground">SCORE</p>
                </div>
              </div>
              <h3 className="text-lg font-bold">Operational Virtue Score</h3>
              <Badge className={`mt-2 ${scores.overall >= 75 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                {getScoreLabel(scores.overall)}
              </Badge>
            </Card>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {scores.domains.map((domain: any, i: number) => (
                <Card key={i} className="executive-card neon-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{domain.name}</p>
                    <Badge variant="outline" className={`text-xs ${domain.trend === 'up' ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30'}`}>
                      {domain.trend === 'up' ? '↑' : '↓'}
                    </Badge>
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(domain.score)}`}>
                    {domain.score}<span className="text-sm text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{domain.detail}</p>
                  <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${domain.score}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="executive-card neon-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />Performance Interpretation
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              {scores.domains.map((domain: any, i: number) => (
                <div key={i} className="space-y-1">
                  <p className="font-medium text-muted-foreground">{domain.name}</p>
                  <p className={`text-xl font-bold ${getScoreColor(domain.score)}`}>{getScoreLabel(domain.score)}</p>
                  <p className="text-xs text-muted-foreground">{domain.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="executive-card neon-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />Scoring Guide
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { range: '90–100', label: 'Excellent',        color: 'text-green-400',  desc: 'Exceptional facility performance' },
                { range: '75–89',  label: 'Good Standing',    color: 'text-primary',    desc: 'Above average with minor gaps' },
                { range: '60–74',  label: 'Needs Attention',  color: 'text-yellow-400', desc: 'Improvement required' },
                { range: '0–59',   label: 'At Risk',          color: 'text-red-400',    desc: 'Immediate action needed' },
              ].map((g, i) => (
                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border space-y-1">
                  <p className={`text-lg font-bold ${g.color}`}>{g.range}</p>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { isAuthenticated, loading, user } = useAuth();
  const facilityId = user?.facilityId || user?.["custom:facilityId"] || "facility-001";
  const currentRole = 'executive';
  const roleScope = { facilityScope: 'multi' };

  const [data, setData]               = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedBuilding, setSelectedBuilding]  = useState('all');
  const [selectedSystem,   setSelectedSystem]    = useState('all');
  const [assetStats, setAssetStats] = useState({ totalAssets: 0, totalValue: 0, inventoryValue: 0, inventoryItems: 0 });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const api = await getExecutiveDashboard();
      const complianceScore   = api.compliance?.score               ?? api.kpis?.compliance_score ?? 0;
      const totalViolations   = api.compliance?.total_violations     ?? 0;
      const openViolations    = api.compliance?.open_violations      ?? 0;
      const highSeverity      = api.compliance?.high_severity_violations ?? 0;
      const uptime            = api.kpis?.uptime_percentage          ?? 95.5;
      const openWorkOrders    = api.operations?.work_orders_open     ?? 0;
      const completedWOs      = api.operations?.work_orders_completed ?? 0;
      const totalReadings     = api.operations?.total_readings        ?? 0;
      const monthlyCost       = api.financial?.estimated_monthly_energy_cost ?? 35000;
      const dailyCost         = Math.round(monthlyCost / 30);
      const roi               = api.financial?.roi_percentage        ?? 15.2;
      const avgEfficiency     = api.kpis?.overall_efficiency;
      const riskIndex         = Math.min(100, Math.round(openViolations * 2 + highSeverity * 5));

      const byOperator: Record<string, { name: string; violations: number; totalSeverity: number; categories: Set<string> }> = {};
      (api.compliance?.recent_violations || []).forEach((v: any) => {
        const name = operatorName(v.operator || v.operatorId);
        if (!byOperator[name]) byOperator[name] = { name, violations: 0, totalSeverity: 0, categories: new Set() };
        byOperator[name].violations++;
        byOperator[name].totalSeverity += v.severity || 0;
        if (v.category) byOperator[name].categories.add(v.category);
      });

      const topEmployees = Object.values(byOperator)
        .sort((a, b) => b.totalSeverity - a.totalSeverity)
        .slice(0, 6)
        .map(e => {
          const avgSev = e.totalSeverity / e.violations;
          return {
            name: e.name, violations: e.violations,
            complianceScore: Math.max(0, 100 - Math.round(avgSev)),
            riskLevel: avgSev >= 70 ? 'High' : avgSev >= 40 ? 'Moderate' : 'Low',
            category: [...e.categories].join(', '),
          };
        });

      if (topEmployees.length === 0) {
        topEmployees.push({ name: 'No violations recorded', violations: 0, complianceScore: 100, riskLevel: 'Low', category: '' });
      }

      const trendBase    = Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0] }));
      const boilerTrend  = trendBase.map(d => ({ ...d, value: avgEfficiency ?? 85 }));
      const savingsTrend = trendBase.map(d => ({ ...d, value: Math.round(monthlyCost / 30 * 0.05) }));

      setData({
        metrics: {
          complianceScore, uptime: Math.round(uptime),
          openWorkOrders, completedWOs, totalReadings,
          dailyCost, riskIndex, roi,
          avgEfficiency: avgEfficiency ?? 85,
          openViolations, totalViolations, highSeverity,
        },
        trends: { boiler: boilerTrend, savings: savingsTrend },
        topEmployees,
        violationsByType:     api.compliance?.violations_by_type     || {},
        violationsByCategory: api.compliance?.violations_by_category || {},
        topSites: (() => {
          const allFacilities = api.all_facilities || [];
          if (allFacilities.length > 1) {
            return allFacilities.map((f: any, i: number) => ({
              name: f.name || f.facilityId || `Facility ${i+1}`,
              facilityId: f.facilityId,
              boilerEfficiency: Math.round((avgEfficiency || 85) - i * 1.5),
              cop: parseFloat((4.2 - i * 0.1).toFixed(1)),
              dailyCost: Math.round(dailyCost / Math.max(allFacilities.length, 1)),
              facilityIntegrity: Math.round((uptime || 95) - i),
              violations: Math.max(0, Math.round((openViolations || 0) / Math.max(allFacilities.length, 1))),
              complianceScore: Math.round((api.compliance?.compliance_score || 85) - i * 1.5),
            }));
          }
          // Single facility — show with full data
          return [{ name: 'Main Campus', facilityId, boilerEfficiency: Math.round(avgEfficiency ?? 85), cop: 4.2, dailyCost, facilityIntegrity: Math.round(uptime), violations: openViolations, complianceScore: Math.round(api.compliance?.compliance_score || 85) }];
        })(),
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load executive dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  // Fetch asset count + value for scorecards
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('nexum_access_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    Promise.all([
      fetch(`${baseUrl}/equipment?facility_id=${facilityId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { equipment: [] }).catch(() => ({ equipment: [] })),
      fetch(`${baseUrl}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([eqData, invData]) => {
      const eqList: any[] = eqData.equipment || [];
      const invList: any[] = invData.items || invData.inventory || [];
      const totalAssets = eqList.reduce((s: number, e: any) => s + (e.count || 1), 0);
      const totalValue = eqList.reduce((s: number, e: any) => s + (parseFloat(e.replacementCost || e.purchasePrice || 0) * (e.count || 1)), 0);
      const inventoryItems = invList.length;
      const inventoryValue = invList.reduce((s: number, i: any) => s + ((i.quantity || 0) * (i.unitCost || 0)), 0);
      setAssetStats({ totalAssets, totalValue, inventoryItems, inventoryValue });
    });
  }, [isAuthenticated, facilityId]);

  if (loading) return <NexumPageLoader message="Loading..." />;

  const filteredSites  = data?.topSites?.filter((s: any) => selectedFacility === 'all' || s.name === selectedFacility) || [];
  const overallScore   = data?.metrics ? Math.round((data.metrics.avgEfficiency + data.metrics.uptime + data.metrics.complianceScore) / 3) : 0;
  const availableFacilities = getAvailableFacilities(currentRole);
  const showMultiFacility   = roleScope.facilityScope === 'multi';
  const typeColors = ['#00f2ea', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#f97316'];

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-8">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />Executive Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              30-day facility intelligence overview
              {lastUpdated && <span className="ml-2 text-xs">· Updated {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="border-primary/30 hover:border-primary">
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />Refresh
            </Button>
            {data && (
              <ExportButtons title="Executive Report" metrics={[
                { label: 'Compliance Score', value: `${data.metrics.complianceScore}%` },
                { label: 'Daily Cost',       value: `$${data.metrics.dailyCost.toLocaleString()}` },
                { label: 'Uptime',           value: `${data.metrics.uptime}%` },
                { label: 'Open WOs',         value: String(data.metrics.openWorkOrders) },
              ]} />
            )}
          </div>
        </div>

        <Card className="p-4 border-border/50">
          <ScopeFilters
            selectedFacility={selectedFacility} selectedBuilding={selectedBuilding} selectedSystem={selectedSystem}
            onFacilityChange={(v) => { setSelectedFacility(v); setSelectedBuilding('all'); }}
            onBuildingChange={setSelectedBuilding} onSystemChange={setSelectedSystem}
            showFacility={availableFacilities.length > 0}
          />
        </Card>

        {error && <NexumError message={error} onRetry={fetchData} />}

        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />Operations
            </TabsTrigger>
            <TabsTrigger value="ovpi" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />OVPI
            </TabsTrigger>
          </TabsList>

          {/* ── Operations Tab ── */}
          <TabsContent value="operations">
            {isLoading ? (
              <div className="flex justify-center py-20"><NexumLoader message="Loading executive metrics..." /></div>
            ) : data?.metrics && (
              <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  <KPICard title="Compliance Score"  value={data.metrics.complianceScore}  unit="%"  icon={Shield}        delay={0}   trend="up" />
                  <KPICard title="Avg Efficiency"    value={data.metrics.avgEfficiency}    unit="%"  icon={Flame}         delay={50}  trend="up" />
                  <KPICard title="Daily Cost"        value={data.metrics.dailyCost}        unit="$"  icon={DollarSign}    delay={100} />
                  <KPICard title="Risk Index"        value={data.metrics.riskIndex}               icon={AlertTriangle}  delay={150} trend="down" />
                  <KPICard title="Uptime %"          value={data.metrics.uptime}           unit="%"  icon={TrendingUp}    delay={200} trend="up" />
                  <KPICard title="ROI %"             value={data.metrics.roi}              unit="%"  icon={BarChart3}     delay={250} />
                  <KPICard title="Open Work Orders"  value={data.metrics.openWorkOrders}          icon={ClipboardList}  delay={300} />
                  <KPICard title="Total Readings"    value={data.metrics.totalReadings}           icon={Clock}          delay={350} />
                </div>

                {/* ── Asset + Inventory Scorecards ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Equipment Units', value: assetStats.totalAssets.toLocaleString(), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', desc: 'Across all equipment types' },
                    { label: 'Equipment Asset Value', value: `$${(assetStats.totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', desc: 'Total replacement cost on record' },
                    { label: 'Inventory Line Items', value: assetStats.inventoryItems.toLocaleString(), icon: Building2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', desc: 'Parts, supplies & materials' },
                    { label: 'Inventory Stock Value', value: `$${(assetStats.inventoryValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', desc: 'Based on qty × unit cost' },
                  ].map((card, i) => (
                    <Card key={i} className="executive-card neon-border p-4">
                      <div className={cn('inline-flex p-2 rounded-lg border mb-3', card.bg)}>
                        <card.icon className={cn('w-5 h-5', card.color)} />
                      </div>
                      <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{card.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Card className="executive-card neon-border p-6" style={{ animationDelay: '400ms' }}>
                    <FacilityGauge value={overallScore} label="Overall Facility Intelligence Score" size="lg" />
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />Compliance Overview — Last 30 Days
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {[
                        { label: 'Compliance Score', value: `${data.metrics.complianceScore}%`, color: data.metrics.complianceScore >= 70 ? 'text-green-400' : 'text-red-400' },
                        { label: 'Total Violations', value: data.metrics.totalViolations,        color: 'text-foreground' },
                        { label: 'Open Violations',  value: data.metrics.openViolations,         color: data.metrics.openViolations > 0 ? 'text-yellow-400' : 'text-green-400' },
                        { label: 'High Severity',    value: data.metrics.highSeverity,           color: data.metrics.highSeverity > 0 ? 'text-red-400' : 'text-green-400' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-background/50 border border-border">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {Object.entries(data.violationsByCategory).map(([cat, count]: [string, any], i) => (
                        <ComplianceBar key={cat} label={cat} count={count} total={data.metrics.totalViolations} color={typeColors[i % typeColors.length]} />
                      ))}
                    </div>
                  </Card>

                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />Violations by Type
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(data.violationsByType)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([type, count]: [string, any], i) => (
                          <ComplianceBar key={type} label={type} count={count} total={data.metrics.totalViolations} color={typeColors[i % typeColors.length]} />
                        ))}
                    </div>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />Efficiency Trend (30d)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.trends.boiler}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => v.slice(5)} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[70, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="executive-card neon-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />Est. Daily Savings Opportunity
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.trends.savings}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => v.slice(5)} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`$${v}`, 'Est. Savings']} />
                        <Area type="monotone" dataKey="value" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.3)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {showMultiFacility && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredSites.map((site: any, i: number) => <SiteCard key={i} site={site} index={i} />)}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />Employee Compliance Risk
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {data.topEmployees.map((e: any, i: number) => <EmployeeRiskCard key={i} employee={e} index={i} />)}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── OVPI Tab — Premium gated ── */}
          <TabsContent value="ovpi">
            <TierGate
              featureName="OVPI Performance Intelligence"
              requiredTier="PREMIUM"
              description="Operational Virtue & Performance Intelligence scoring is available on the Premium plan."
            >
              <OVPITab />
            </TierGate>
          </TabsContent>
        </Tabs>

      </div>
    </MainLayout>
  );
}
