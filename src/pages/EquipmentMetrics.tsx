import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { 
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Flame,
  Snowflake,
  Wind,
  Droplets,
  Waves
} from 'lucide-react';

interface EquipmentMetric {
  equipment_id: string;
  name: string;
  type: 'boiler' | 'chiller' | 'ahu' | 'pump' | 'cooling_tower';
  status: 'operational' | 'warning' | 'critical' | 'offline';
  metrics: {
    // Temperature readings
    supply_temp?: number;
    return_temp?: number;
    
    // Performance metrics
    rated_efficiency?: number; // Manufacturer rated
    actual_efficiency?: number; // Current performance
    performance_efficiency?: number; // (actual/rated) * 100
    
    // Boiler specific
    input_btuh?: number;
    output_btuh?: number;
    
    // Chiller specific
    cop?: number; // Coefficient of Performance
    rated_cop?: number;
    
    // General metrics
    runtime_hours?: number;
    kw?: number;
    pressure?: number;
    flow_rate?: number;
  };
  last_reading: string;
  trend: 'up' | 'down' | 'stable';
}

export default function EquipmentMetrics() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Connect to real API endpoint
      // For now, using enhanced placeholder data
      const mockData: EquipmentMetric[] = [
        {
          equipment_id: 'boiler-001',
          name: 'Boiler #1',
          type: 'boiler',
          status: 'operational',
          metrics: {
            supply_temp: 180,
            return_temp: 160,
            input_btuh: 2500000,
            output_btuh: 2187500,
            rated_efficiency: 85,
            actual_efficiency: 87.5,
            performance_efficiency: 102.9, // (87.5/85) * 100
            runtime_hours: 1245,
            pressure: 85
          },
          last_reading: new Date().toISOString(),
          trend: 'up'
        },
        {
          equipment_id: 'chiller-001',
          name: 'Chiller #1',
          type: 'chiller',
          status: 'operational',
          metrics: {
            supply_temp: 42,
            return_temp: 54,
            rated_cop: 4.5,
            cop: 4.8,
            performance_efficiency: 106.7, // (4.8/4.5) * 100
            runtime_hours: 2100,
            kw: 45.2,
            flow_rate: 350
          },
          last_reading: new Date().toISOString(),
          trend: 'up'
        },
        {
          equipment_id: 'ahu-002',
          name: 'Air Handler Unit #2',
          type: 'ahu',
          status: 'operational',
          metrics: {
            supply_temp: 55,
            return_temp: 72,
            rated_efficiency: 90,
            actual_efficiency: 88.5,
            performance_efficiency: 98.3, // (88.5/90) * 100
            runtime_hours: 1800,
            kw: 8.3,
            flow_rate: 12000
          },
          last_reading: new Date().toISOString(),
          trend: 'stable'
        },
        {
          equipment_id: 'pump-003',
          name: 'Chilled Water Pump #3',
          type: 'pump',
          status: 'warning',
          metrics: {
            rated_efficiency: 85,
            actual_efficiency: 68.5,
            performance_efficiency: 80.6, // (68.5/85) * 100
            runtime_hours: 3200,
            kw: 12.5,
            flow_rate: 250,
            pressure: 45
          },
          last_reading: new Date().toISOString(),
          trend: 'down'
        },
        {
          equipment_id: 'ct-001',
          name: 'Cooling Tower #1',
          type: 'cooling_tower',
          status: 'operational',
          metrics: {
            supply_temp: 85,
            return_temp: 95,
            rated_efficiency: 92,
            actual_efficiency: 89.5,
            performance_efficiency: 97.3, // (89.5/92) * 100
            runtime_hours: 2500,
            kw: 15.2,
            flow_rate: 400
          },
          last_reading: new Date().toISOString(),
          trend: 'stable'
        }
      ];
      
      setEquipment(mockData);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load equipment metrics');
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

  if (authLoading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'operational': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSystemIcon = (type: string) => {
    switch(type) {
      case 'boiler': return <Flame className="w-6 h-6 text-orange-500" />;
      case 'chiller': return <Snowflake className="w-6 h-6 text-blue-500" />;
      case 'ahu': return <Wind className="w-6 h-6 text-cyan-500" />;
      case 'pump': return <Droplets className="w-6 h-6 text-indigo-500" />;
      case 'cooling_tower': return <Waves className="w-6 h-6 text-teal-500" />;
      default: return <Activity className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 95) return 'text-green-500';
    if (performance >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment Metrics</h1>
            <p className="text-muted-foreground mt-1">
              Real-time performance monitoring and operational data
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading equipment data..." />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {equipment.map((eq) => (
              <Card key={eq.equipment_id} className="neon-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getSystemIcon(eq.type)}
                      <div>
                        <CardTitle className="text-lg">{eq.name}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">{eq.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${getStatusColor(eq.status)}`}>
                      {getStatusIcon(eq.status)}
                      <span className="text-xs capitalize">{eq.status}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  
                  {/* Performance Efficiency - PROMINENT */}
                  {eq.metrics.performance_efficiency && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Gauge className="w-4 h-4" />
                          Performance Efficiency
                        </span>
                        <span className={`text-lg font-bold ${getPerformanceColor(eq.metrics.performance_efficiency)}`}>
                          {eq.metrics.performance_efficiency.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Rated: {eq.type === 'chiller' ? 
                          `${eq.metrics.rated_cop} COP` : 
                          `${eq.metrics.rated_efficiency}%`
                        } | Actual: {eq.type === 'chiller' ? 
                          `${eq.metrics.cop} COP` : 
                          `${eq.metrics.actual_efficiency}%`
                        }
                      </div>
                    </div>
                  )}

                  {/* Supply & Return Temps */}
                  {(eq.metrics.supply_temp && eq.metrics.return_temp) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-blue-500/10">
                        <div className="text-xs text-muted-foreground">Supply</div>
                        <div className="font-semibold">{eq.metrics.supply_temp}°F</div>
                      </div>
                      <div className="p-2 rounded bg-orange-500/10">
                        <div className="text-xs text-muted-foreground">Return</div>
                        <div className="font-semibold">{eq.metrics.return_temp}°F</div>
                      </div>
                    </div>
                  )}

                  {/* Boiler Specific: Input/Output */}
                  {eq.type === 'boiler' && eq.metrics.input_btuh && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Input</span>
                        <span className="font-semibold">{(eq.metrics.input_btuh / 1000000).toFixed(2)}M BTU/h</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Output</span>
                        <span className="font-semibold">{(eq.metrics.output_btuh! / 1000000).toFixed(2)}M BTU/h</span>
                      </div>
                    </div>
                  )}

                  {/* Runtime */}
                  {eq.metrics.runtime_hours && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Runtime</span>
                      <span className="font-semibold">{eq.metrics.runtime_hours.toLocaleString()} hrs</span>
                    </div>
                  )}

                  {/* Power */}
                  {eq.metrics.kw && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Power</span>
                      <span className="font-semibold">{eq.metrics.kw} kW</span>
                    </div>
                  )}

                  {/* Pressure */}
                  {eq.metrics.pressure && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pressure</span>
                      <span className="font-semibold">{eq.metrics.pressure} PSI</span>
                    </div>
                  )}

                  {/* Flow Rate */}
                  {eq.metrics.flow_rate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Flow Rate</span>
                      <span className="font-semibold">{eq.metrics.flow_rate.toLocaleString()} GPM</span>
                    </div>
                  )}

                  {/* Trend */}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Trend</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(eq.trend)}
                      <span className="text-xs capitalize">{eq.trend}</span>
                    </div>
                  </div>

                  {/* Last Reading */}
                  <div className="text-xs text-muted-foreground text-center">
                    Updated: {new Date(eq.last_reading).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
