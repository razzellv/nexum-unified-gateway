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
  Bar
} from 'recharts';
import { 
  Flame, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  ClipboardList,
  Building2,
  Users,
  RefreshCw,
  Activity
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

// Violation Card
function ViolationCard({ violation, index }: { violation: any; index: number }) {
  const severityColor = violation.severity >= 80 ? 'destructive' : violation.severity >= 50 ? 'warning' : 'default';
  
  return (
    <div 
      className={cn(
        'p-4 rounded-lg border',
        violation.severity >= 80 ? 'border-destructive/50 bg-destructive/10' : 
        violation.severity >= 50 ? 'border-yellow-500/50 bg-yellow-500/10' :
        'border-border/50'
      )}
      style={{ animationDelay: `${800 + index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant={severityColor as any}>
          {violation.type || 'Unknown Type'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(violation.timestamp).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm font-medium mb-1">{violation.description || 'No description'}</p>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>Operator: {violation.operator || 'Unknown'}</span>
        <span>Equipment: {violation.equipmentId || 'N/A'}</span>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { isAuthenticated, loading, user } = useAuth();
  const currentRole = "executive";
  const roleScope = { facilityScope: "multi" };
  const [data, setData] = useState<any>(null);
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
      
      // Set the raw data - no transformation needed
      setData(apiData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('❌ Executive Dashboard Error:', err);
      setError(err.message || 'Failed to load executive dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
      const interval = setInterval(fetchData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, fetchData]);

  if (loading) {
    return <NexumPageLoader message="Loading..." />;
  }

  const availableFacilities = getAvailableFacilities(currentRole);
  const showMultiFacility = roleScope.facilityScope === 'multi';

  // Calculate overall score
  const overallScore = data ? Math.round(
    ((data.summary?.active_equipment / (data.summary?.total_equipment || 1)) * 100 + 
     (100 - ((data.violations?.active || 0) / Math.max(data.summary?.total_equipment || 1, 1)) * 100)) / 2
  ) : 0;

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Facility-wide intelligence and performance metrics
            </p>
          </div>
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
                  { label: 'Total Equipment', value: String(data.summary?.total_equipment || 0) },
                  { label: 'Active Equipment', value: String(data.summary?.active_equipment || 0) },
                  { label: 'Open Work Orders', value: String(data.work_orders?.open || 0) },
                  { label: 'Active Violations', value: String(data.violations?.active || 0) },
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
        ) : data && (
          <>
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard 
                title="Total Equipment" 
                value={data.summary?.total_equipment || 0} 
                icon={Activity} 
                delay={0} 
              />
              <KPICard 
                title="Active Equipment" 
                value={data.summary?.active_equipment || 0} 
                icon={TrendingUp} 
                delay={50}
                trend="up"
              />
              <KPICard 
                title="Open Work Orders" 
                value={data.work_orders?.open || 0} 
                icon={ClipboardList} 
                delay={100}
              />
              <KPICard 
                title="Active Violations" 
                value={data.violations?.active || 0} 
                icon={AlertTriangle} 
                delay={150}
                trend="down"
              />
            </div>

            {/* Facility Intelligence Score */}
            <div className="flex justify-center">
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '400ms' }}>
                <FacilityGauge value={overallScore} label="Overall Facility Intelligence Score" size="lg" />
              </Card>
            </div>

            {/* Equipment Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="executive-card neon-border p-6" style={{ animationDelay: '450ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Equipment by Type
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(data.equipment?.by_type || {}).map(([type, count]) => ({
                    type: type.replace(/_/g, ' ').replace(/\*\*/g, '').trim(),
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="type" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10} 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="executive-card neon-border p-6" style={{ animationDelay: '500ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Violations by Severity
                </h3>
                <div className="space-y-4">
                  {Object.entries(data.violations?.by_severity || {}).map(([severity, count], i) => (
                    <div key={severity} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{severity}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full transition-all",
                            severity === 'high' ? 'bg-destructive' : 
                            severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ 
                            width: `${((count as number) / (data.violations?.total || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Violations */}
            {data.violations?.recent && data.violations.recent.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Recent Violations
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {data.violations.recent.map((violation: any, i: number) => (
                    <ViolationCard key={violation.id || i} violation={violation} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {data.recent_logs && data.recent_logs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Equipment Logs
                </h2>
                <div className="grid gap-3">
                  {data.recent_logs.slice(0, 5).map((log: any, i: number) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Flame className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{log.equipmentId || 'Unknown Equipment'}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.equipmentType || 'Unknown Type'} • {log.data?.operator?.name || 'Unknown Operator'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
