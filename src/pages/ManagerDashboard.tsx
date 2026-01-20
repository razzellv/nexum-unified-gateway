import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRole } from '@/contexts/RoleContext';
import { ParticleBackground } from "@/components/ParticleBackground";
import { NexumBranding } from "@/components/NexumBranding";
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { ExportButtons } from '@/components/global/ExportButtons';
import { NexumLoader } from '@/components/global/NexumLoader';
import { getManagerDashboard } from '@/lib/nexum-api';
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
  Calendar,
  Users,
  Gauge
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';

// Custom hook for animated count-up effect
const useCountUp = (target: number, duration: number = 1500) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const startValue = 0;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startValue + (target - startValue) * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);
  
  return count;
};

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
              <p className="text-2xl font-bold">
                {animatedValue}{unit}
              </p>
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
               trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface SystemHealthCardProps {
  system: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

const SystemHealthCard = ({ system, score, status, lastUpdated }: SystemHealthCardProps) => {
  const statusColors = {
    healthy: 'text-green-400 bg-green-400/20',
    warning: 'text-yellow-400 bg-yellow-400/20',
    critical: 'text-red-400 bg-red-400/20'
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
          <Badge variant="outline" className={statusColors[status]}>
            {status}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default function ManagerDashboard() {
  const { role } = useRole();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [energyTrend, setEnergyTrend] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getManagerDashboard();
        console.log('📊 Manager Dashboard Data:', result);
        setData(result);
      } catch (error) {
        console.error('Failed to load manager data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Fetch energy logs
  useEffect(() => {
    const fetchEnergyLogs = async () => {
      const token = localStorage.getItem('nexum_id_token');
      if (!token) return;
      
      try {
        const response = await fetch(
          'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/equipment/readings?equipmentId=energy-log&limit=7',
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const result = await response.json();
        
        if (result.readings) {
          const chartData = result.readings.reverse().map((r: any) => ({
            day: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            primary: parseFloat(r.data?.primaryGasUsage || r.primaryGasUsage || 0),
            secondary: parseFloat(r.data?.secondaryGasUsage || r.secondaryGasUsage || 0)
          }));
          setEnergyTrend(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch energy logs:', error);
      }
    };
    
    fetchEnergyLogs();
  }, [refreshKey]);

  if (loading) {
    return (
      <MainLayout>
        <NexumLoader message="Loading Manager Dashboard..." />
      </MainLayout>
    );
  }

  // Calculate KPIs from real data
  const totalEquipment = data?.summary?.total_equipment || 0;
  const activeEquipment = data?.summary?.active_equipment || 0;
  const recentLogsCount = data?.summary?.recent_logs_count || 0;
  const openWorkOrders = data?.work_orders?.open || 0;
  const totalWorkOrders = data?.work_orders?.total || 0;
  const activeViolations = data?.violations?.active || 0;
  
  // Asset Health: Based on equipment with recent data
  const equipmentWithData = data?.performance?.equipment_with_recent_data || 0;
  const overallAssetHealth = totalEquipment > 0 
    ? Math.min(100, Math.round((equipmentWithData / totalEquipment) * 100)) 
    : 0;

  // Compliance Risk: Based on active violations
  const complianceRisk30Day = totalEquipment > 0
    ? Math.round((activeViolations / totalEquipment) * 100)
    : 0;

  // PM Completion: Based on closed work orders
  const closedWO = data?.work_orders?.by_status?.Completed || 0;
  const pmCompletionRate = totalWorkOrders > 0
    ? Math.round((closedWO / totalWorkOrders) * 100)
    : 0;

  // Calculate Work Order Age from real data
  const workOrders = data?.work_orders?.recent || [];
  const avgWorkOrderAge = workOrders.length > 0
    ? workOrders.reduce((sum: number, wo: any) => {
        const createdDate = new Date(wo.createdAt);
        const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum + ageInDays;
      }, 0) / workOrders.length
    : 0;

  // Group work orders by age range with hover data
  const workOrderAging = [
    { 
      range: '0-3 days', 
      count: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age <= 3;
      }).length,
      color: '#00f2ea',
      workOrders: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age <= 3;
      })
    },
    { 
      range: '4-7 days', 
      count: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 3 && age <= 7;
      }).length,
      color: '#22c55e',
      workOrders: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 3 && age <= 7;
      })
    },
    { 
      range: '8-14 days', 
      count: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 7 && age <= 14;
      }).length,
      color: '#eab308',
      workOrders: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 7 && age <= 14;
      })
    },
    { 
      range: '15+ days', 
      count: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 14;
      }).length,
      color: '#ef4444',
      workOrders: workOrders.filter((wo: any) => {
        const age = (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return age > 14;
      })
    },
  ];

  // Log Consistency: Based on recent logs
  const loggingConsistency = data?.performance?.logs_last_7_days || 0;
  const expectedLogs = 7;
  const logConsistencyPercent = Math.min(100, Math.round((loggingConsistency / expectedLogs) * 100));

  // Downtime: Currently mock
  const downtimeFrequency = 0;

  // Equipment by type for health scores - based on recent logs
  const equipmentHealthByType = data?.performance?.equipment_health_by_type || {};
  const recentLogs = data?.summary?.recent_logs_count || 0;
  
  const assetHealthBySystem = Object.entries(equipmentHealthByType).map(([type, stats]: [string, any]) => {
    const logsCount = stats.log_count || 0;
    const expectedLogsPerWeek = 7;
    const healthScore = Math.min(100, Math.round((logsCount / expectedLogsPerWeek) * 100));
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (healthScore < 60) status = 'critical';
    else if (healthScore < 80) status = 'warning';
    
    const lastLogDate = stats.last_log ? new Date(stats.last_log) : null;
    const minutesAgo = lastLogDate ? Math.round((Date.now() - lastLogDate.getTime()) / 60000) : null;
    const lastUpdated = minutesAgo !== null 
      ? (minutesAgo < 60 ? `${minutesAgo} min ago` : `${Math.round(minutesAgo / 60)} hr ago`)
      : 'No recent data';
    
    return {
      system: type.charAt(0).toUpperCase() + type.slice(1) + 's',
      score: healthScore,
      status,
      lastUpdated
    };
  });

  // Custom tooltip for work order aging
  const CustomWorkOrderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const wos = data.workOrders || [];
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.range}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.count} work orders</p>
          {wos.length > 0 && (
            <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
              {wos.slice(0, 5).map((wo: any, idx: number) => (
                <div key={idx} className="text-xs border-t border-border pt-1">
                  <p className="font-medium">{wo.title}</p>
                  <p className="text-muted-foreground">
                    Created: {new Date(wo.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {wos.length > 5 && (
                <p className="text-xs text-muted-foreground italic">+{wos.length - 5} more...</p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for energy costs
  const CustomEnergyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const primaryGas = data.primary || 0;
      const secondaryGas = data.secondary || 0;
      
      
      const THERM_COST = 1.52;
      const primaryCost = primaryGas * THERM_COST;
      const secondaryCost = secondaryGas * THERM_COST;
      const totalCost = primaryCost + secondaryCost;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
          <p className="font-semibold text-sm mb-2">{data.day}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Primary Gas:</span>
              <span className="font-medium">{primaryGas.toLocaleString()} therms</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Est. Cost:</span>
              <span className="font-medium text-green-400">${primaryCost.toFixed(2)}</span>
            </div>
            
            <div className="h-px bg-border my-2"></div>
            
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Secondary Gas:</span>
              <span className="font-medium">{secondaryGas.toLocaleString()} SCFH</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Est. Cost:</span>
              <span className="font-medium text-green-400">${secondaryCost.toFixed(2)}</span>
            </div>
            
            <div className="h-px bg-border my-2"></div>
            
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-semibold">Total Est. Cost:</span>
              <span className="font-bold text-neon-cyan">${totalCost.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Rate: $1.52/therm (NJ avg)
          </p>
        </div>
      );
    }
    return null;
  };

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
            <ExportButtons 
              data={data} 
              filename="manager-dashboard" 
              title="Manager Dashboard Report"
            />
            <NexumBranding />
          </div>
        </div>

        {/* Scope Filters */}
        <ScopeFilters />

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            title="Asset Health"
            value={overallAssetHealth}
            unit="%"
            icon={Activity}
            trend={overallAssetHealth >= 80 ? "up" : "down"}
            trendValue={overallAssetHealth >= 80 ? "Good" : "Needs Attention"}
          />
          <KPICard
            title="Compliance Risk (30d)"
            value={complianceRisk30Day}
            unit="%"
            icon={Shield}
            trend={complianceRisk30Day > 15 ? 'down' : 'up'}
            trendValue={complianceRisk30Day > 15 ? 'High' : 'Low'}
            color={complianceRisk30Day > 15 ? 'yellow-400' : 'neon-cyan'}
          />
          <KPICard
            title="PM Completion"
            value={pmCompletionRate}
            unit="%"
            icon={CheckCircle2}
            trend={pmCompletionRate >= 85 ? "up" : "down"}
            trendValue={pmCompletionRate >= 85 ? "On Track" : "Behind"}
          />
          <KPICard
            title="Avg WO Age"
            value={Math.round(avgWorkOrderAge)}
            unit=" days"
            icon={Clock}
            trend={avgWorkOrderAge > 5 ? 'down' : 'up'}
            trendValue={avgWorkOrderAge > 5 ? 'Aging' : 'On Track'}
          />
          <KPICard
            title="Downtime Events"
            value={downtimeFrequency}
            unit="/mo"
            icon={AlertTriangle}
            trend="neutral"
            trendValue="Stable"
          />
          <KPICard
            title="Log Consistency"
            value={logConsistencyPercent}
            unit="%"
            icon={Users}
            trend={logConsistencyPercent >= 90 ? "up" : "down"}
            trendValue={`${loggingConsistency} logs/7d`}
          />
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
                assetHealthBySystem.map((system, idx) => (
                  <SystemHealthCard key={idx} {...system} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No equipment data available
                </p>
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
                    <Tooltip content={<CustomWorkOrderTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {workOrderAging.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="count" position="inside" fill="#ffffff" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Risk Comparison */}
          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-neon-cyan" />
                Compliance Risk Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Violations</span>
                    <span className={activeViolations > 0 ? 'text-yellow-400' : 'text-green-400'}>
                      {activeViolations}
                    </span>
                  </div>
                  <Progress value={complianceRisk30Day} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open Work Orders</span>
                    <span className="text-neon-cyan">{openWorkOrders}</span>
                  </div>
                  <Progress value={(openWorkOrders / Math.max(totalWorkOrders, 1)) * 100} className="h-2" />
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  <p>Risk Score: {complianceRisk30Day < 10 ? 'Low' : complianceRisk30Day < 20 ? 'Medium' : 'High'}</p>
                  <p className="mt-1">Total Equipment: {totalEquipment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Energy Trend */}
        <Card className="bg-card/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-cyan" />
              Utility Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {energyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                    />
                    <Tooltip content={<CustomEnergyTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="primary" 
                      stroke="#00f2ea" 
                      strokeWidth={2}
                      name="Primary Gas (therms)"
                      dot={{ fill: '#00f2ea', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="secondary" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Secondary Gas (SCFH)"
                      dot={{ fill: '#22c55e', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No energy logs available - Submit energy logs via Facility Data Source
                </div>
              )}
            </div>
            {energyTrend.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00f2ea]"></div>
                  <span className="text-muted-foreground">Primary Gas (Main Burner - therms)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                  <span className="text-muted-foreground">Secondary Gas (Pilot - SCFH)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
