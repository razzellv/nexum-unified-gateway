import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRole } from '@/contexts/RoleContext';
import { ParticleBackground } from "@/components/ParticleBackground";
import { NexumBranding } from "@/components/NexumBranding";
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { ExportButtons } from '@/components/global/ExportButtons';
import { NexumLoader } from '@/components/global/NexumLoader';
import { getManagerDashboard } from '@/lib/nexum-api';
import { BudgetVsCost } from '@/components/manager/BudgetVsCost';
import ConfidenceMetrics from "@/components/manager/ConfidenceMetrics";
import { getManagerConfidenceMetrics } from "@/lib/nexum-api";
import {
  Activity,
  Shield,
  Wrench,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  DollarSign,
  Droplets,
  Flame,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LabelList
} from 'recharts';

// ── Animated count-up ────────────────────────────────────────────────────────
const useCountUp = (target: number, duration = 1500) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * easeOut));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return count;
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

const KPICard = ({ title, value, unit = '', icon: Icon, trend, trendValue, color = 'neon-cyan' }: KPICardProps) => {
  const animatedValue = useCountUp(value);
  return (
    <Card className="bg-card/80 border-border hover:border-neon-cyan/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}/20`}>
              <Icon className={`w-5 h-5 text-${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{animatedValue}{unit}</p>
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ── System Health Card ────────────────────────────────────────────────────────
const SystemHealthCard = ({ system, score, status, lastUpdated }: {
  system: string; score: number; status: 'healthy' | 'warning' | 'critical'; lastUpdated: string;
}) => {
  const statusColors = {
    healthy: 'text-green-400 bg-green-400/20',
    warning: 'text-yellow-400 bg-yellow-400/20',
    critical: 'text-red-400 bg-red-400/20',
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
      <div className="flex-1">
        <p className="text-sm font-medium">{system}</p>
        <p className="text-xs text-muted-foreground">Updated {lastUpdated}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-bold">{score}</p>
          <Badge variant="outline" className={statusColors[status]}>{status}</Badge>
        </div>
      </div>
    </div>
  );
};

// ── Safe age calculation ──────────────────────────────────────────────────────
function getWOAge(wo: any): number | null {
  const dateStr = wo.created_at || wo.createdAt;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

// ── Token helper ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { currentRole } = useRole();

  // Filter state — wired into API calls
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedSystem, setSelectedSystem]     = useState('all');

  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [energyTrend, setEnergyTrend] = useState<any[]>([]);
  const [budgetData, setBudgetData]   = useState<any>(null);
  const [confidenceData, setConfidenceData] = useState<any>(null);

  // ── Main data load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Build query params from active filters
        const params: Record<string, string> = {};
        if (selectedFacility !== 'all') params.facilityId  = selectedFacility;
        if (selectedBuilding !== 'all') params.buildingId  = selectedBuilding;
        if (selectedSystem   !== 'all') params.systemType  = selectedSystem;

        const result = await getManagerDashboard(Object.keys(params).length ? params : undefined);
        console.log('📊 Manager Dashboard Data:', result);
        setData(result);

        // Confidence metrics
        try {
          const confidence = await getManagerConfidenceMetrics();
          setConfidenceData(confidence);
        } catch (e) {
          console.error('Confidence metrics failed:', e);
        }

        // Budget summary
        const token = getToken();
        if (token) {
          try {
            const budgetRes = await fetch(
              'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/budget/summary',
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (budgetRes.ok) setBudgetData(await budgetRes.json());
          } catch (e) {
            console.error('Budget fetch failed:', e);
          }
        }
      } catch (err) {
        console.error('Manager dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(() => setRefreshKey(k => k + 1), 60000);
    return () => clearInterval(interval);
  }, [refreshKey, selectedFacility, selectedBuilding, selectedSystem]);

  // ── Energy / utility trend ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchEnergy = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(
          'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/equipment/readings?equipmentId=energy-log&limit=14',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        if (result.readings?.length) {
          // Group by date and pick latest reading per day
          const byDay: Record<string, any> = {};
          result.readings.forEach((r: any) => {
            const day = new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!byDay[day]) {
              byDay[day] = {
                day,
                electric: 0,
                gas: 0,
                water: 0,
                timestamp: r.timestamp,
              };
            }
            byDay[day].electric += parseFloat(r.data?.electricMeterReading || 0);
            byDay[day].gas      += parseFloat(r.data?.primaryGasUsage || 0);
            byDay[day].water    += parseFloat(r.data?.waterMeterReading || 0);
          });

          const chartData = Object.values(byDay)
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-7);

          setEnergyTrend(chartData);
        }
      } catch (err) {
        console.error('Energy fetch failed:', err);
      }
    };
    fetchEnergy();
  }, [refreshKey]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout>
        <NexumLoader message="Loading Manager Dashboard..." />
      </MainLayout>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalEquipment    = data?.summary?.total_equipment        || 0;
  const activeEquipment   = data?.summary?.active_equipment       || 0;
  const recentLogsCount   = data?.summary?.recent_logs_count      || 0;
  const openWorkOrders    = data?.work_orders?.open               || 0;
  const totalWorkOrders   = data?.work_orders?.total              || 0;
  const activeViolations  = data?.violations?.active              || 0;
  const avgWorkOrderAge   = data?.summary?.avg_work_order_age_days || 0;
  const equipmentWithData = data?.performance?.equipment_with_recent_data || 0;

  const overallAssetHealth = totalEquipment > 0
    ? Math.min(100, Math.round((equipmentWithData / totalEquipment) * 100))
    : 0;

  // ✅ Compliance risk: -15 to 100 scale
  // Starts at 0, increases with violations, decreases with resolved items
  const resolvedViolations = (data?.violations?.total || 0) - activeViolations;
  const rawRisk = activeViolations > 0
    ? Math.round(((activeViolations - resolvedViolations * 0.5) / Math.max(totalEquipment, 1)) * 100)
    : -15;
  const complianceRisk30Day = Math.min(100, Math.max(-15, rawRisk));

  const closedWO = data?.work_orders?.by_status?.Completed || data?.work_orders?.by_status?.completed || 0;
  const pmCompletionRate = totalWorkOrders > 0 ? Math.round((closedWO / totalWorkOrders) * 100) : 0;

  const loggingConsistency   = data?.performance?.logs_last_7_days || 0;
  const logConsistencyPercent = Math.min(100, Math.round((loggingConsistency / 7) * 100));

  const workOrders = data?.work_orders?.recent || [];

  // ✅ WO aging — safe date handling (created_at AND createdAt)
  const workOrderAging = [
    { range: '0-3 days',   min: 0,  max: 3,   color: '#00f2ea' },
    { range: '4-7 days',   min: 3,  max: 7,   color: '#22c55e' },
    { range: '8-14 days',  min: 7,  max: 14,  color: '#eab308' },
    { range: '15+ days',   min: 14, max: Infinity, color: '#ef4444' },
  ].map(bucket => {
    const matching = workOrders.filter((wo: any) => {
      const age = getWOAge(wo);
      if (age === null) return false;
      return age > bucket.min && age <= bucket.max;
    });
    return {
      ...bucket,
      count: matching.length,
      workOrders: matching,
    };
  });

  const equipmentHealthByType = data?.performance?.equipment_health_by_type || {};
  const assetHealthBySystem = Object.entries(equipmentHealthByType).map(([type, stats]: [string, any]) => {
    const healthScore = Math.min(100, Math.round(((stats.log_count || 0) / 7) * 100));
    const status: 'healthy' | 'warning' | 'critical' =
      healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
    const lastLog   = stats.last_log ? new Date(stats.last_log) : null;
    const minsAgo   = lastLog ? Math.round((Date.now() - lastLog.getTime()) / 60000) : null;
    const lastUpdated = minsAgo !== null
      ? minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)} hr ago`
      : 'No data';
    return {
      system: type.charAt(0).toUpperCase() + type.slice(1) + 's',
      score: healthScore,
      status,
      lastUpdated,
    };
  });

  // ── Utility cost summary (latest day) ──────────────────────────────────────
  const latestEnergy = energyTrend[energyTrend.length - 1];
  const ELECTRIC_RATE = 0.18;   // $/kWh NJ avg
  const GAS_RATE      = 1.52;   // $/therm NJ avg
  const WATER_RATE    = 0.004;  // $/gallon NJ avg
  const totalUtilityCost = latestEnergy
    ? latestEnergy.electric * ELECTRIC_RATE + latestEnergy.gas * GAS_RATE + latestEnergy.water * WATER_RATE
    : 0;

  // ── Custom tooltips ─────────────────────────────────────────────────────────
  const CustomWOTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d   = payload[0].payload;
    const wos = d.workOrders || [];
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
        <p className="font-semibold text-sm mb-1">{d.range}</p>
        <p className="text-xs text-muted-foreground mb-2">{d.count} work orders</p>
        {wos.slice(0, 4).map((wo: any, i: number) => (
          <div key={i} className="text-xs border-t border-border pt-1 mt-1">
            <p className="font-medium truncate">{wo.title || wo.id}</p>
            <p className="text-muted-foreground">
              {wo.priority && <span className="capitalize">{wo.priority} • </span>}
              {wo.status}
            </p>
          </div>
        ))}
        {wos.length > 4 && <p className="text-xs text-muted-foreground mt-1">+{wos.length - 4} more</p>}
      </div>
    );
  };

  const CustomEnergyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const electricCost = (d.electric || 0) * ELECTRIC_RATE;
    const gasCost      = (d.gas     || 0) * GAS_RATE;
    const waterCost    = (d.water   || 0) * WATER_RATE;
    const total        = electricCost + gasCost + waterCost;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[220px]">
        <p className="font-semibold text-sm mb-2">{d.day}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Electric:</span>
            <span>{(d.electric || 0).toLocaleString()} kWh — <span className="text-yellow-400">${electricCost.toFixed(2)}</span></span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gas:</span>
            <span>{(d.gas || 0).toLocaleString()} therms — <span className="text-orange-400">${gasCost.toFixed(2)}</span></span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Water:</span>
            <span>{(d.water || 0).toLocaleString()} gal — <span className="text-blue-400">${waterCost.toFixed(2)}</span></span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between gap-4 font-semibold">
            <span>Total Est. Cost:</span>
            <span className="text-neon-cyan">${total.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Rates: $0.18/kWh · $1.52/therm · $0.004/gal (NJ avg)
        </p>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <ParticleBackground />

      <div className="relative z-10 max-w-[1800px] mx-auto p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-neon-cyan" />
              Manager Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Operations overview and facility management</p>
          </div>
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/staff-performance'}
              className="border-primary/30 hover:border-primary"
            >
              <Users className="w-4 h-4 mr-2" />
              Staff Performance
            </Button>
            <ExportButtons data={data} filename="manager-dashboard" title="Manager Dashboard Report" />
            <NexumBranding />
          </div>
        </div>

        {/* ✅ Scope Filters — now wired with state */}
        <ScopeFilters
          selectedFacility={selectedFacility}
          selectedBuilding={selectedBuilding}
          selectedSystem={selectedSystem}
          onFacilityChange={(v) => { setSelectedFacility(v); setSelectedBuilding('all'); }}
          onBuildingChange={setSelectedBuilding}
          onSystemChange={setSelectedSystem}
        />

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Asset Health"        value={overallAssetHealth}      unit="%" icon={Activity}     trend={overallAssetHealth >= 80 ? 'up' : 'down'}    trendValue={overallAssetHealth >= 80 ? 'Good' : 'Needs Attention'} />
          <KPICard
            title="Compliance Risk (30d)"
            value={Math.max(0, complianceRisk30Day)}
            unit="%"
            icon={Shield}
            trend={complianceRisk30Day > 15 ? 'down' : complianceRisk30Day < 0 ? 'up' : 'neutral'}
            trendValue={complianceRisk30Day < 0 ? 'Excellent' : complianceRisk30Day > 15 ? 'High Risk' : 'Low Risk'}
            color={complianceRisk30Day > 15 ? 'yellow-400' : 'neon-cyan'}
          />
          <KPICard title="PM Completion"       value={pmCompletionRate}         unit="%" icon={CheckCircle2} trend={pmCompletionRate >= 85 ? 'up' : 'down'}       trendValue={pmCompletionRate >= 85 ? 'On Track' : 'Behind'} />
          <KPICard title="Avg WO Age"           value={Math.round(avgWorkOrderAge)} unit=" days" icon={Clock} trend={avgWorkOrderAge > 5 ? 'down' : 'up'}        trendValue={avgWorkOrderAge > 5 ? 'Aging' : 'On Track'} />
          <KPICard title="Downtime Events"      value={0}                        unit="/mo" icon={AlertTriangle} trend="neutral" trendValue="Stable" />
          <KPICard title="Log Consistency"      value={logConsistencyPercent}    unit="%" icon={Users}      trend={logConsistencyPercent >= 90 ? 'up' : 'down'}  trendValue={`${loggingConsistency} logs/7d`} />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Asset Health by System */}
          <Card className="lg:col-span-1 bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-neon-cyan" />
                Asset Health by System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assetHealthBySystem.length > 0 ? (
                assetHealthBySystem.map((s, i) => <SystemHealthCard key={i} {...s} />)
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No equipment data available</p>
              )}
            </CardContent>
          </Card>

          {/* Work Order Aging */}
          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-neon-cyan" />
                Work Order Aging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workOrderAging} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                    <Tooltip content={<CustomWOTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {workOrderAging.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList dataKey="count" position="inside" fill="#ffffff" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Risk */}
          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-neon-cyan" />
                Compliance Risk Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {/* Risk score gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className={
                      complianceRisk30Day < 0 ? 'text-green-400' :
                      complianceRisk30Day < 15 ? 'text-neon-cyan' :
                      complianceRisk30Day < 40 ? 'text-yellow-400' : 'text-red-400'
                    }>
                      {complianceRisk30Day < 0 ? complianceRisk30Day : complianceRisk30Day}%
                      {' '}({complianceRisk30Day < 0 ? 'Excellent' : complianceRisk30Day < 15 ? 'Low' : complianceRisk30Day < 40 ? 'Medium' : 'High'})
                    </span>
                  </div>
                  <Progress value={Math.max(0, complianceRisk30Day)} className="h-2" />
                  <p className="text-xs text-muted-foreground">Scale: -15 (excellent) to 100 (critical)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Violations</span>
                    <span className={activeViolations > 0 ? 'text-yellow-400' : 'text-green-400'}>{activeViolations}</span>
                  </div>
                  <Progress value={(activeViolations / Math.max(activeViolations + 10, 1)) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open Work Orders</span>
                    <span className="text-neon-cyan">{openWorkOrders}</span>
                  </div>
                  <Progress value={(openWorkOrders / Math.max(totalWorkOrders, 1)) * 100} className="h-2" />
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  <p>Total Equipment: {totalEquipment} · Resolved: {resolvedViolations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Utility Trend — Electric + Gas + Water + Total Cost */}
        <Card className="bg-card/80 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-neon-cyan" />
                Utility Trend — Last 7 Days
              </CardTitle>
              {latestEnergy && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">
                    Est. Daily Cost: ${totalUtilityCost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {energyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip content={<CustomEnergyTooltip />} />
                    <Line type="monotone" dataKey="electric" stroke="#facc15" strokeWidth={2} name="Electric (kWh)"   dot={{ fill: '#facc15', r: 3 }} />
                    <Line type="monotone" dataKey="gas"      stroke="#f97316" strokeWidth={2} name="Gas (therms)"    dot={{ fill: '#f97316', r: 3 }} />
                    <Line type="monotone" dataKey="water"    stroke="#38bdf8" strokeWidth={2} name="Water (gallons)" dot={{ fill: '#38bdf8', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No energy logs yet — submit readings via Facility Data Source
                </div>
              )}
            </div>
            {energyTrend.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <div>
                    <p className="text-muted-foreground">Electric</p>
                    <p className="font-medium text-yellow-400">{(latestEnergy?.electric || 0).toLocaleString()} kWh</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-400/10 border border-orange-400/20">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <div>
                    <p className="text-muted-foreground">Gas</p>
                    <p className="font-medium text-orange-400">{(latestEnergy?.gas || 0).toLocaleString()} therms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <div>
                    <p className="text-muted-foreground">Water</p>
                    <p className="font-medium text-blue-400">{(latestEnergy?.water || 0).toLocaleString()} gal</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget vs Cost */}
        <BudgetVsCost budgetData={budgetData} isLoading={loading} />

        {/* Confidence Metrics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Weekly System Confidence Levels</h2>
            <Badge variant="outline" className="text-sm">
              <BarChart3 className="w-4 h-4 mr-1" />
              Last 7 Days
            </Badge>
          </div>
          {loading ? (
            <Card className="neon-border">
              <CardContent className="p-12"><NexumLoader message="Loading confidence metrics..." /></CardContent>
            </Card>
          ) : confidenceData ? (
            <ConfidenceMetrics data={confidenceData} />
          ) : (
            <Card className="neon-border">
              <CardContent className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No confidence data available</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
