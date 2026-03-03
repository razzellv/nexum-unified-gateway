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
import { getExecutiveDashboard } from '@/lib/nexum-api';
import { getAvailableFacilities } from '@/lib/role-filters';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { 
  Flame, 
  Snowflake, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  BarChart3,
  ClipboardList,
  Building2,
  Users,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Animated count-up hook
function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

// KPI Card component
function KPICard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend,
  delay 
}: { 
  title: string; 
  value: number; 
  unit?: string; 
  icon: React.ElementType; 
  trend?: 'up' | 'down';
  delay: number;
}) {
  const animatedValue = useCountUp(value);
  
  return (
    <Card 
      className="executive-card neon-border"
      style={{ animationDelay: `${delay}ms` }}
    >
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
          {unit === '$' && '$'}{animatedValue.toLocaleString()}{unit === '%' && '%'}
        </span>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </Card>
  );
}

// Site Card component
function SiteCard({ site, index }: { site: any; index: number }) {
  return (
    <Card 
      className="executive-card neon-border p-4"
      style={{ animationDelay: `${600 + index * 100}ms` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">{site.name || "Unknown Site"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Boiler Eff.</p>
          <p className="font-medium text-primary">{site.boilerEfficiency || 0}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Chiller COP</p>
          <p className="font-medium text-secondary">{site.cop || 0}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Daily Cost</p>
          <p className="font-medium">${(site.dailyCost || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Integrity</p>
          <p className={cn(
            'font-medium',
            (site.facilityIntegrity || 0) >= 80 ? 'text-green-400' : (site.facilityIntegrity || 0) >= 60 ? 'text-yellow-400' : 'text-destructive'
          )}>
            {site.facilityIntegrity || 0}%
          </p>
        </div>
      </div>
    </Card>
  );
}

// Employee Risk Card
function EmployeeRiskCard({ employee, index }: { employee: any; index: number }) {
  const riskColors = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    High: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border',
        riskColors[employee.riskLevel as keyof typeof riskColors]
      )}
      style={{ animationDelay: `${800 + index * 100}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4" />
          <span className="font-medium">{employee.name || "Unknown Employee"}</span>
        </div>
        <Badge className={riskColors[employee.riskLevel as keyof typeof riskColors]}>
          {employee.riskLevel}
        </Badge>
      </div>
      <div className="flex gap-4 mt-2 text-sm">
        <span>Score: {employee.complianceScore || 0}%</span>
        <span>Violations: {employee.violations || 0}</span>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const currentRole = "executive";
  const roleScope = { facilityScope: "multi" };
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Scope filters
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Fetching executive dashboard data...");
      const apiData = await getExecutiveDashboard();
      console.log("✅ Executive API data:", apiData);
      
      // Calculate metrics from real API data
      const boilerLogs = apiData.recent_logs?.filter((log: any) => log.equipmentType === 'boiler') || [];
      const avgBoilerEfficiency = boilerLogs.length > 0
        ? Math.round(boilerLogs.reduce((sum: number, log: any) => {
            const supplyTemp = parseFloat(log.data?.supplyTemp || 0);
            const returnTemp = parseFloat(log.data?.returnTemp || 0);
            const efficiency = supplyTemp > 0 ? ((supplyTemp - returnTemp) / supplyTemp) * 100 : 85;
            return sum + efficiency;
          }, 0) / boilerLogs.length)
        : 85;

      // Transform API data to dashboard format
      const transformedData = {
        metrics: {
          boilerAvgEfficiency: avgBoilerEfficiency,
          chillerCOP: 4.2, // TODO: Calculate from chiller logs when available
          dailyCost: Math.round(1200 + Math.random() * 400), // TODO: Get from energy dashboard
          riskIndex: Math.round((apiData.violations?.active || 0) * 10),
          mttr: 4.5, // TODO: Calculate from work orders
          uptime: Math.round(((apiData.summary?.active_equipment || 0) / Math.max(apiData.summary?.total_equipment || 1, 1)) * 100),
          roi: 15.2, // TODO: Calculate from financial data
          openWorkOrders: apiData.work_orders?.open || 0,
        },
        trends: {
          boiler: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            value: avgBoilerEfficiency + (Math.random() - 0.5) * 5,
          })),
          chiller: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            value: 3.8 + Math.random() * 0.8,
          })),
          savings: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            value: 800 + Math.random() * 400,
          })),
        },
        topSites: [
          { 
            name: 'Main Campus', 
            boilerEfficiency: avgBoilerEfficiency, 
            cop: 4.3, 
            dailyCost: 1200, 
            facilityIntegrity: Math.round(((apiData.summary?.active_equipment || 0) / Math.max(apiData.summary?.total_equipment || 1, 1)) * 100)
          },
        ],
        topEmployees: (apiData.violations?.recent || []).slice(0, 5).map((v: any, i: number) => ({
          id: v.id || String(i),
          name: v.operator || 'Unknown Operator',
          riskLevel: v.severity >= 80 ? 'High' : v.severity >= 50 ? 'Moderate' : 'Low',
          complianceScore: 100 - (v.severity || 0),
          violations: 1,
        })),
      };
      
      // Add fallback if no violations
      if (transformedData.topEmployees.length === 0) {
        transformedData.topEmployees = [
          { id: '1', name: 'No violations recorded', riskLevel: 'Low', complianceScore: 100, violations: 0 }
        ];
      }
      
      setData(transformedData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('❌ Executive Dashboard Error:', err);
      setError(err.message || 'Failed to load executive dashboard data');
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

  if (loading) {
    return <NexumPageLoader message="Loading..." />;
  }

  // Filter sites based on role scope
  const filteredSites = data?.topSites?.filter((site: any) => {
    if (selectedFacility === 'all') return true;
    return site.name === selectedFacility;
  }) || [];

  const overallScore = (data && data.metrics) ? Math.round(
    (data.metrics.boilerAvgEfficiency + data.metrics.uptime + (100 - data.metrics.riskIndex)) / 3
  ) : 0;

  const availableFacilities = getAvailableFacilities(currentRole);
  const showMultiFacility = roleScope.facilityScope === 'multi';

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-end">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="border-primary/30 hover:border-primary"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            {data && (
              <ExportButtons 
                title="Executive Report"
                metrics={[
                  { label: 'Daily Cost', value: `$${data.metrics.dailyCost.toLocaleString()}` },
                  { label: 'Boiler Efficiency', value: `${data.metrics.boilerAvgEfficiency}%` },
                  { label: 'Chiller COP', value: `${data.metrics.chillerCOP}` },
                  { label: 'Uptime', value: `${data.metrics.uptime}%` },
                ]}
              />
            )}
          </div>
        </div>

        {/* Scope Filters */}
        <Card className="p-4 border-border/50">
          <ScopeFilters
            selectedFacility={selectedFacility}
            selectedBuilding={selectedBuilding}
            selectedSystem={selectedSystem}
            onFacilityChange={setSelectedFacility}
            onBuildingChange={setSelectedBuilding}
            onSystemChange={setSelectedSystem}
            showFacility={availableFacilities.length > 0}
          />
        </Card>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading executive metrics..." />
          </div>
        ) : data && data.metrics && (
          <>
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <KPICard title="Boiler Avg Efficiency" value={data.metrics.boilerAvgEfficiency} unit="%" icon={Flame} delay={0} trend="up" />
              <KPICard title="Chiller COP" value={Math.round(data.metrics.chillerCOP * 10) / 10} icon={Snowflake} delay={50} />
              <KPICard title="Daily Cost" value={data.metrics.dailyCost} unit="$" icon={DollarSign} delay={100} />
              <KPICard title="Risk Index" value={data.metrics.riskIndex} icon={AlertTriangle} delay={150} trend="down" />
              <KPICard title="MTTR (hrs)" value={data.metrics.mttr} icon={Clock} delay={200} />
              <KPICard title="Uptime %" value={data.metrics.uptime} unit="%" icon={TrendingUp} delay={250} trend="up" />
              <KPICard title="ROI %" value={data.metrics.roi} unit="%" icon={BarChart3} delay={300} />
              <KPICard title="Open Work Orders" value={data.metrics.openWorkOrders} icon={ClipboardList} delay={350} />
            </div>

            {/* Facility Gauge */}
            <div className="flex justify-center">
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '400ms' }}>
                <FacilityGauge value={overallScore} label="Overall Facility Intelligence Score" size="lg" />
              </Card>
            </div>

            {/* Trends Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Boiler Trend */}
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '450ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  Boiler Efficiency Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.trends.boiler}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[70, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Chiller Trend */}
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '500ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-secondary" />
                  Chiller COP Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.trends.chiller}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[3, 5]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Savings Trend */}
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '550ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  30-Day Savings Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.trends.savings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Savings']} />
                    <Area type="monotone" dataKey="value" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.3)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Top Sites - filtered by role */}
            {showMultiFacility && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSites.map((site: any, i: number) => (
                    <SiteCard key={i} site={site} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Employees (Compliance Risk) */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Employee Compliance Risk
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.topEmployees.map((employee: any, i: number) => (
                  <EmployeeRiskCard key={i} employee={employee} index={i} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
