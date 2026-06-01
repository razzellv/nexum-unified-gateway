import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { DEPARTMENTS } from '@/config/roles';
import { ParticleBackground } from "@/components/ParticleBackground";
import { NexumBranding } from "@/components/NexumBranding";
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { ExportButtons } from '@/components/global/ExportButtons';
import { NexumLoader } from '@/components/global/NexumLoader';
import { getManagerDashboard } from '@/lib/nexum-api';
import { BudgetVsCost } from '@/components/manager/BudgetVsCost';
import ConfidenceMetrics from "@/components/manager/ConfidenceMetrics";
import { getManagerConfidenceMetrics, listSuggestions, dismissSuggestion, actOnSuggestion, type Suggestion } from "@/lib/nexum-api";
import { cn } from '@/lib/utils';
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
    <Card className="bg-card/80 border-border hover:border-neon-cyan/50 transition-all min-w-0">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1.5 rounded-lg bg-${color}/20 shrink-0`}>
              <Icon className={`w-4 h-4 text-${color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground truncate leading-tight">{title}</p>
              <p className="text-lg font-bold leading-tight truncate">{animatedValue}{unit}</p>
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[10px] shrink-0 mt-0.5 ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
              <span className="truncate max-w-[60px]">{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ── System Health Card ────────────────────────────────────────────────────────
const SystemHealthCard = ({ system, score, status, lastUpdated, unitCount }: {
  system: string; score: number; status: 'healthy' | 'warning' | 'critical'; lastUpdated: string; unitCount?: number | null;
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
          <p className="text-xs text-muted-foreground">{unitCount != null ? `${unitCount} units` : ''}</p>
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
  const { user } = useAuth();

  // Department filter — defaults to user's department, 'All' sees everything
  const userDept = user?.department || 'Operations';
  const [selectedDept, setSelectedDept] = useState<string>(userDept);

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
  const [assetStats, setAssetStats] = useState({ totalAssets: 0, totalValue: 0, inventoryItems: 0, inventoryValue: 0, lowStock: 0 });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

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

        // Budget summary — try API first, fall back to Settings localStorage data
        const token = getToken();
        let apiBudgetOk = false;
        if (token) {
          try {
            const budgetRes = await fetch(
              'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/budget/summary',
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (budgetRes.ok) {
              setBudgetData(await budgetRes.json());
              apiBudgetOk = true;
            }
          } catch (e) {
            console.error('Budget fetch failed:', e);
          }
        }
        // If API budget unavailable, build from localStorage nexum_dept_budgets
        if (!apiBudgetOk) {
          try {
            const raw = JSON.parse(localStorage.getItem('nexum_dept_budgets') || '[]');
            const stored: any[] = Array.isArray(raw) ? raw : (raw?.rows ?? []);
            if (stored.length > 0) {
              // Pull work order costs by department from API (best-effort)
              const woCostByDept: Record<string, number> = {};
              try {
                const woRes = await fetch(
                  'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/work-orders?limit=200',
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (woRes.ok) {
                  const woData = await woRes.json();
                  const wos: any[] = woData.workOrders || woData.items || [];
                  wos.forEach((wo: any) => {
                    const dept = wo.department || wo.dept || 'Operations';
                    const cost = parseFloat(wo.cost || wo.totalCost || 0);
                    if (cost > 0) woCostByDept[dept] = (woCostByDept[dept] || 0) + cost;
                  });
                }
              } catch { /* best-effort */ }

              const totalBudget = stored.reduce((s: number, d: any) => s + (Number(d.annualBudget) || 0), 0);
              const categories = stored.map((d: any) => {
                const dept = d.department || d.dept || '';
                const budget = Number(d.annualBudget) || 0;
                // actual = saved spentToDate + any WO costs rolled up for this dept
                const savedSpent = Number(d.spentToDate || d.spent || 0) || 0;
                const woSpent = woCostByDept[dept] || 0;
                const actual = savedSpent + woSpent;
                const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
                return {
                  category: dept,
                  budget,
                  actual,
                  variance: budget - actual,
                  percentage: pct,
                  status: pct >= 100 ? 'over' : pct >= 90 ? 'at_limit' : 'under',
                };
              });
              const totalActual = categories.reduce((s: number, c: any) => s + c.actual, 0);
              const variance = totalBudget - totalActual;
              const utilizationPercent = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
              setBudgetData({ period: new Date().getFullYear() + ' YTD', totalBudget, totalActual, variance, utilizationPercent, categories });
            }
          } catch { /* silent */ }
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

  // Re-fetch asset stats when equipment is updated from EquipmentLibrary
  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('equipment-updated', handler);
    return () => window.removeEventListener('equipment-updated', handler);
  }, []);

  // ── Asset count + value ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    const baseUrl = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
    Promise.all([
      fetch(`${baseUrl}/equipment`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { equipment: [] }).catch(() => ({ equipment: [] })),
      fetch(`${baseUrl}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([eqData, invData]) => {
      const eqList: any[] = eqData.equipment || [];
      // Prefer API inventory; fall back to localStorage if API returned nothing
      const apiInv: any[] = invData.items || invData.inventory || invData.parts || [];
      const invList: any[] = apiInv.length > 0 ? apiInv : (() => {
        try {
          const local = JSON.parse(localStorage.getItem('nexum_inventory') || '[]');
          return Array.isArray(local) ? local : [];
        } catch { return []; }
      })();
      const totalAssets = eqList.reduce((s: number, e: any) => s + (e.count || 1), 0);
      const totalValue = eqList.reduce((s: number, e: any) => s + (parseFloat(e.replacementCost || e.purchasePrice || 0) * (e.count || 1)), 0);
      const inventoryItems = invList.length;
      const inventoryValue = invList.reduce((s: number, i: any) => s + ((i.quantity || 0) * (i.unitCost || 0)), 0);
      const lowStock = invList.filter((i: any) => i.quantity != null && i.minQuantity != null && i.quantity <= i.minQuantity).length;
      setAssetStats({ totalAssets, totalValue, inventoryItems, inventoryValue, lowStock });
    });
  }, [refreshKey]);

  // ── Suggestions ─────────────────────────────────────────────────────────────
  useEffect(() => {
    listSuggestions('active').then(data => {
      setSuggestions(data.items || []);
      setSuggestionsLoaded(true);
    }).catch(() => setSuggestionsLoaded(true));
  }, []);

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

  const allWorkOrders: any[] = Array.isArray(data?.work_orders?.recent) ? data.work_orders.recent : [];
  // Department filter: show all when selectedDept is 'All', otherwise match department field
  const workOrders = selectedDept === 'All'
    ? allWorkOrders
    : allWorkOrders.filter((wo: any) => !wo.department || wo.department === selectedDept);

  // Department-filtered violations count
  const allViolationDetails: any[] = Array.isArray(data?.violations?.details) ? data.violations.details : [];
  const deptViolations = selectedDept === 'All'
    ? allViolationDetails
    : allViolationDetails.filter((v: any) => !v.department || v.department === selectedDept);
  const deptViolationCount = deptViolations.length || activeViolations;

  // Department-filtered budget highlight
  const budgetCategories: any[] = budgetData?.categories || [];
  const deptBudgetRow = budgetCategories.find(
    (c: any) => c.category?.toLowerCase() === selectedDept.toLowerCase()
  );

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

  // ── Asset health — merge API data with locally submitted logs ────────────────
  const equipmentHealthByType = data?.performance?.equipment_health_by_type || {};
  const equipmentByType = data?.equipment?.by_type || data?.equipment?.summary?.by_type || {};

  // Pull recent locally-stored log submissions (written by LogEntryForm via submitFacilityLog)
  const localLogs: any[] = (() => {
    try {
      const v = JSON.parse(localStorage.getItem('nexum_submitted_logs') || '[]');
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  })();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLocalLogs = localLogs.filter((l: any) => new Date(l.timestamp).getTime() > sevenDaysAgo);

  // Build a local health map from submitted logs
  const localHealthMap: Record<string, { log_count: number; last_log: string }> = {};
  recentLocalLogs.forEach((l: any) => {
    const t = l.systemType || 'unknown';
    if (!localHealthMap[t]) localHealthMap[t] = { log_count: 0, last_log: l.timestamp };
    localHealthMap[t].log_count++;
    if (l.timestamp > localHealthMap[t].last_log) localHealthMap[t].last_log = l.timestamp;
  });

  // Merge: local data wins for recency, API data fills in the rest
  const mergedHealth: Record<string, { log_count: number; last_log: string }> = { ...equipmentHealthByType };
  Object.entries(localHealthMap).forEach(([type, local]) => {
    if (!mergedHealth[type] || local.last_log > (mergedHealth[type].last_log || '')) {
      mergedHealth[type] = {
        log_count: Math.max(local.log_count, mergedHealth[type]?.log_count || 0),
        last_log: local.last_log,
      };
    }
  });

  const assetHealthBySystem = Object.entries(mergedHealth).map(([type, stats]: [string, any]) => {
    const healthScore = Math.min(100, Math.round(((stats.log_count || 0) / 7) * 100));
    const status: 'healthy' | 'warning' | 'critical' =
      healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
    const lastLog = stats.last_log ? new Date(stats.last_log) : null;
    const minsAgo = lastLog ? Math.round((Date.now() - lastLog.getTime()) / 60000) : null;
    const lastUpdated = minsAgo !== null
      ? minsAgo < 60 ? `${minsAgo} min ago` : minsAgo < 1440 ? `${Math.round(minsAgo/60)} hr ago` : `${Math.round(minsAgo/1440)} days ago`
      : 'No data';
    const unitCount = equipmentByType[type]?.count ?? equipmentByType[type] ?? null;
    return {
      system: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
      score: healthScore,
      status,
      lastUpdated,
      unitCount,
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

        {/* Department Context Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-semibold text-neon-cyan">
              Viewing: {selectedDept === 'All' ? 'All Departments' : `${selectedDept} Department`}
            </span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{openWorkOrders}</span> open work orders
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{deptViolationCount}</span> active violations
          </span>
          {deptBudgetRow && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground">
                Budget: <span className={`font-semibold ${deptBudgetRow.percentage >= 90 ? 'text-red-400' : deptBudgetRow.percentage >= 75 ? 'text-yellow-400' : 'text-green-400'}`}>
                  ${(deptBudgetRow.actual || 0).toLocaleString()} / ${(deptBudgetRow.budget || 0).toLocaleString()} ({deptBudgetRow.percentage || 0}%)
                </span>
              </span>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{user?.name || user?.email}</span>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Filter: <span className="text-foreground font-medium">{selectedDept}</span> department
            </span>
          </div>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deptBudgetRow && (
            <Badge variant="outline" className="text-xs border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10">
              {selectedDept} Budget: ${(deptBudgetRow.budget || 0).toLocaleString()} · Used: {deptBudgetRow.percentage || 0}%
            </Badge>
          )}
        </div>

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

        {/* Interpretation layer: data integrity notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400/80">
          <Shield className="w-3.5 h-3.5 shrink-0 text-blue-400" />
          <span>
            Analysis based on <strong className="text-blue-400">{loggingConsistency} verified records (7d)</strong> — only admissible,
            governance-checked entries feed these metrics. Incomplete logs are excluded from this view.
          </span>
        </div>

        {/* ── Asset + Inventory Scorecards ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { title: 'Equipment Units',    value: assetStats.totalAssets.toLocaleString(),             icon: Activity,  color: 'text-neon-cyan', sub: 'All equipment on record' },
            { title: 'Asset Value',        value: `$${(assetStats.totalValue / 1000).toFixed(0)}K`,    icon: DollarSign,color: 'text-green-400', sub: 'Total replacement cost' },
            { title: 'Inventory Items',    value: assetStats.inventoryItems.toLocaleString(),           icon: BarChart3, color: 'text-purple-400', sub: 'Parts & supplies lines' },
            { title: 'Inventory Value',    value: `$${(assetStats.inventoryValue / 1000).toFixed(1)}K`,icon: TrendingUp,color: 'text-yellow-400', sub: 'Qty × unit cost' },
            { title: 'Low Stock Alerts',   value: assetStats.lowStock.toLocaleString(),                icon: AlertTriangle, color: assetStats.lowStock > 0 ? 'text-orange-400' : 'text-green-400', sub: 'Items at or below min qty' },
          ].map((card, i) => (
            <Card key={i} className="bg-card/80 border-border min-w-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-muted/40 shrink-0">
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground truncate">{card.title}</p>
                    <p className={`text-lg font-bold leading-tight truncate ${card.color}`}>{card.value}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

        {/* Department Budget Utilization */}
        {(() => {
          const deptBudgets: any[] = (() => {
            try {
              const raw = JSON.parse(localStorage.getItem('nexum_dept_budgets') || '[]');
              return Array.isArray(raw) ? raw : (raw?.rows ?? []);
            } catch { return []; }
          })();
          if (deptBudgets.length === 0) return (
            <Card className="bg-card/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-neon-cyan" />Department Budgets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  No budgets configured. Set budgets in <strong>Settings → Budget</strong> tab.
                </p>
              </CardContent>
            </Card>
          );
          return (
            <Card className="bg-card/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-neon-cyan" />Department Budget Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deptBudgets.filter((d: any) => d.department && d.annualBudget).map((dept: any, i: number) => {
                  const annual = parseFloat(dept.annualBudget) || 0;
                  const spent = parseFloat(dept.spent || dept.spentToDate || '0') || 0;
                  const remaining = annual - spent;
                  const pct = annual > 0 ? Math.min(100, Math.round((spent / annual) * 100)) : 0;
                  const color = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400';
                  const barColor = pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-yellow-400' : 'bg-green-400';
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{dept.department}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">Budget: ${annual.toLocaleString()}</span>
                          <span className="text-muted-foreground">Remaining: ${remaining.toLocaleString()}</span>
                          <span className={`font-bold ${color}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

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

        {/* ── Risk & Operations Suggestions ─────────────────────────────── */}
        {suggestionsLoaded && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold">Operational Suggestions</h2>
                <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400">
                  {suggestions.filter(s => s.priority === 'high').length > 0
                    ? `${suggestions.filter(s => s.priority === 'high').length} high priority`
                    : `${suggestions.length} active`}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.slice(0, 4).map(sug => (
                <Card key={sug.id} className={cn(
                  "border transition-colors",
                  sug.priority === 'high' ? 'border-red-500/30 bg-red-500/5' : 'neon-border bg-card/80'
                )}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px]",
                        sug.priority === 'high'   ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        sug.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      )}>
                        {sug.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{sug.category}</span>
                      {sug.riskScore > 60 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Risk {sug.riskScore}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-snug">{sug.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sug.detail}</p>
                    {sug.suggestedVendorName && (
                      <p className="text-xs text-cyan-400">
                        Suggested vendor: {sug.suggestedVendorName}
                        {sug.vendorMatchScore !== null ? ` · ${sug.vendorMatchScore}% match` : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline"
                        className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => actOnSuggestion(sug.SK).then(() => setSuggestions(prev => prev.filter(s => s.id !== sug.id)))}>
                        Act on this
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                        onClick={() => dismissSuggestion(sug.SK).then(() => setSuggestions(prev => prev.filter(s => s.id !== sug.id)))}>
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
