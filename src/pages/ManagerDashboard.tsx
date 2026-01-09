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
import { getMasterExecutive } from '@/lib/nexum-api';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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
    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Gauge className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{system}</p>
          <p className="text-xs text-muted-foreground">{lastUpdated}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24">
          <Progress value={score} className="h-2" />
        </div>
        <Badge className={statusColors[status]}>
          {score}%
        </Badge>
      </div>
    </div>
  );
};

export default function ManagerDashboard() {
  const { currentRole, roleScope } = useRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getMasterExecutive();
        setData(result.data);
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

  if (loading) {
    return (
      <MainLayout>
      <ParticleBackground />
        <NexumLoader message="Loading Manager Dashboard..." />
      </MainLayout>
    );
  }

  // Mock data for manager-specific metrics
  const assetHealthBySystem = [
    { system: 'Boilers', score: 87, status: 'healthy' as const, lastUpdated: '2 min ago' },
    { system: 'Chillers', score: 92, status: 'healthy' as const, lastUpdated: '5 min ago' },
    { system: 'Pumps', score: 78, status: 'warning' as const, lastUpdated: '3 min ago' },
    { system: 'AHU/RTU', score: 85, status: 'healthy' as const, lastUpdated: '8 min ago' },
    { system: 'Cooling Towers', score: 65, status: 'warning' as const, lastUpdated: '12 min ago' },
    { system: 'Compressors', score: 91, status: 'healthy' as const, lastUpdated: '1 min ago' },
  ];

  const complianceRisk30Day = 12;
  const complianceRisk90Day = 8;
  const pmCompletionRate = 87;
  const avgWorkOrderAge = 4.2;
  const downtimeFrequency = 3;
  const loggingConsistency = 94;

  const energyTrend = [
    { day: 'Mon', usage: 2400, cost: 180 },
    { day: 'Tue', usage: 2210, cost: 165 },
    { day: 'Wed', usage: 2290, cost: 172 },
    { day: 'Thu', usage: 2000, cost: 150 },
    { day: 'Fri', usage: 2181, cost: 164 },
    { day: 'Sat', usage: 1500, cost: 112 },
    { day: 'Sun', usage: 1200, cost: 90 },
  ];

  const workOrderAging = [
    { range: '0-3 days', count: 12, color: '#00f2ea' },
    { range: '4-7 days', count: 8, color: '#22c55e' },
    { range: '8-14 days', count: 5, color: '#eab308' },
    { range: '15+ days', count: 2, color: '#ef4444' },
  ];

  const teamLogging = [
    { team: 'Day Shift', consistency: 96 },
    { team: 'Night Shift', consistency: 89 },
    { team: 'Weekend', consistency: 92 },
    { team: 'Maintenance', consistency: 98 },
  ];

  // Filter data based on selected system
  const filteredAssetHealth = selectedSystem === 'all' 
    ? assetHealthBySystem
    : assetHealthBySystem.filter(item => 
        item.system.toLowerCase().replace(/\//g, '-').includes(selectedSystem.toLowerCase())
      );

  const overallAssetHealth = Math.round(
    filteredAssetHealth.reduce((acc, s) => acc + s.score, 0) / filteredAssetHealth.length
  );

  return (
    <MainLayout>
      <ParticleBackground />
        <NexumBranding />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neon-cyan">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Full facility monitoring — {roleScope.assignedFacilities[0] || 'Main Campus'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <ExportButtons title="Manager Dashboard" />
          </div>
        </div>

        {/* Scope Filters */}
        <ScopeFilters
          selectedFacility="all"
          selectedBuilding={selectedBuilding}
          selectedSystem={selectedSystem}
          onFacilityChange={() => {}}
          onBuildingChange={setSelectedBuilding}
          onSystemChange={setSelectedSystem}
          showFacility={false}
        />

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            title="Asset Health"
            value={overallAssetHealth}
            unit="%"
            icon={Activity}
            trend="up"
            trendValue="+2.3%"
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
            trend="up"
            trendValue="+5%"
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
            value={loggingConsistency}
            unit="%"
            icon={Users}
            trend="up"
            trendValue="+1.2%"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Health by System */}
          <Card className="lg:col-span-1 bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-neon-cyan" />
                Asset Health by System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredAssetHealth.map((system) => (
                <SystemHealthCard
                  key={system.system}
                  system={system.system}
                  score={system.score}
                  status={system.status}
                  lastUpdated={system.lastUpdated}
                />
              ))}
            </CardContent>
          </Card>

          {/* Energy Trend Summary */}
          <Card className="lg:col-span-2 bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-neon-cyan" />
                Weekly Energy Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#00f2ea" 
                      strokeWidth={2}
                      dot={{ fill: '#00f2ea', strokeWidth: 0 }}
                      name="Usage (kWh)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 0 }}
                      name="Cost ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {workOrderAging.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
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
                    <span className="text-muted-foreground">30-Day Risk</span>
                    <span className={complianceRisk30Day > 15 ? 'text-yellow-400' : 'text-green-400'}>
                      {complianceRisk30Day}%
                    </span>
                  </div>
                  <Progress 
                    value={complianceRisk30Day} 
                    className="h-3"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">90-Day Risk</span>
                    <span className={complianceRisk90Day > 15 ? 'text-yellow-400' : 'text-green-400'}>
                      {complianceRisk90Day}%
                    </span>
                  </div>
                  <Progress 
                    value={complianceRisk90Day} 
                    className="h-3"
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Target: &lt;10%</span>
                    <Badge variant="outline" className="text-xs">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Improving
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Logging Consistency */}
          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-neon-cyan" />
                Logging Consistency by Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamLogging.map((team) => (
                  <div key={team.team} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{team.team}</span>
                      <span className={team.consistency >= 90 ? 'text-green-400' : 'text-yellow-400'}>
                        {team.consistency}%
                      </span>
                    </div>
                    <Progress value={team.consistency} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3 h-3" />
            <span>Scope: Full Facility ({roleScope.assignedFacilities[0] || 'Main Campus'})</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
