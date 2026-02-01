import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  Flame,
  Snowflake,
  Wind,
  Droplets,
  Waves,
  Package,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const getEquipmentIcon = (type: string) => {
  const icons: Record<string, any> = {
    boiler: Flame,
    chiller: Snowflake,
    ahu: Wind,
    pump: Droplets,
    cooling_tower: Waves,
    tower: Waves,
  };
  return icons[type?.toLowerCase()] || Package;
};

const getEquipmentColor = (type: string) => {
  const colors: Record<string, string> = {
    boiler: 'text-orange-500 bg-orange-500/10',
    chiller: 'text-blue-500 bg-blue-500/10',
    ahu: 'text-cyan-500 bg-cyan-500/10',
    pump: 'text-green-500 bg-green-500/10',
    cooling_tower: 'text-purple-500 bg-purple-500/10',
    tower: 'text-purple-500 bg-purple-500/10',
  };
  return colors[type?.toLowerCase()] || 'text-primary bg-primary/10';
};

export default function Index() {
  const [equipmentRegistry, setEquipmentRegistry] = useState<any[]>([]);
  const [facilityTelemetry, setFacilityTelemetry] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(true);

  const fetchEquipmentRegistry = async () => {
    setIsLoadingEquipment(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/equipment?sort=recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const equipment = data.equipment || data.items || data || [];
        console.log('✅ Equipment registry loaded:', equipment.length);
        setEquipmentRegistry(equipment);
      } else {
        console.warn('⚠️ Equipment API error, showing empty');
        setEquipmentRegistry([]);
      }
    } catch (error) {
      console.error('❌ Error loading equipment:', error);
      setEquipmentRegistry([]);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const fetchFacilityTelemetry = async () => {
    setIsLoadingTelemetry(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Get recent logs (last 10)
      const response = await fetch(`${API_BASE_URL}/logs?limit=10&sort=recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || data.items || data || [];
        console.log('✅ Facility telemetry loaded:', logs.length);
        setFacilityTelemetry(logs);
      } else {
        setFacilityTelemetry([]);
      }
    } catch (error) {
      console.error('❌ Error loading telemetry:', error);
      setFacilityTelemetry([]);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchEquipmentRegistry();
    fetchFacilityTelemetry();

    // Auto-refresh every 3 seconds for telemetry
    const telemetryInterval = setInterval(fetchFacilityTelemetry, 3000);
    
    // Refresh equipment every 30 seconds
    const equipmentInterval = setInterval(fetchEquipmentRegistry, 30000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(equipmentInterval);
    };
  }, []);

  // ✅ Listen for equipmentAdded events
  useEffect(() => {
    const handleEquipmentAdded = () => {
      console.log('🔄 Equipment added, refreshing registry...');
      fetchEquipmentRegistry();
    };

    window.addEventListener('equipmentAdded', handleEquipmentAdded);
    return () => window.removeEventListener('equipmentAdded', handleEquipmentAdded);
  }, []);

  // Group equipment by type
  const equipmentByType = equipmentRegistry.reduce((acc, eq) => {
    const type = eq.type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(eq);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />

      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Operations Hub
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time facility intelligence and equipment management
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Equipment</p>
                  <p className="text-3xl font-bold">{equipmentRegistry.length}</p>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Systems</p>
                  <p className="text-3xl font-bold">{Object.keys(equipmentByType).length}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Logs</p>
                  <p className="text-3xl font-bold">{facilityTelemetry.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <p className="text-3xl font-bold text-green-500">98%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Library */}
        <Card className="neon-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Equipment Registry
                <Badge variant="outline">{equipmentRegistry.length} Total</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchEquipmentRegistry}
                  disabled={isLoadingEquipment}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingEquipment ? 'animate-spin' : ''}`} />
                </Button>
                <Link to="/equipment-intelligence">
                  <Button size="sm">
                    View Full Library
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEquipment ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : equipmentRegistry.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No equipment registered</p>
                <p className="text-xs text-muted-foreground">
                  Add equipment via Equipment Intelligence page
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(equipmentByType).map(([type, items]) => {
                  const Icon = getEquipmentIcon(type);
                  const colors = getEquipmentColor(type);
                  
                  return (
                    <div key={type} className="border border-border/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colors}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize">
                              {type.replace('_', ' ')}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {items.length} {items.length === 1 ? 'unit' : 'units'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.slice(0, 6).map((eq) => (
                          <div
                            key={eq.equipmentId}
                            className="text-sm p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="font-mono text-xs text-primary">
                              {eq.equipmentId}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {eq.name || `${eq.manufacturer} ${eq.model}`}
                            </div>
                          </div>
                        ))}
                        {items.length > 6 && (
                          <div className="text-sm p-2 rounded bg-muted/20 flex items-center justify-center text-muted-foreground">
                            +{items.length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Facility Telemetry */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              Live Facility Telemetry
              <Badge variant="outline" className="animate-pulse">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTelemetry ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : facilityTelemetry.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent telemetry data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facilityTelemetry.map((event, idx) => {
                  const Icon = getEquipmentIcon(event.systemType);
                  const colors = getEquipmentColor(event.systemType);
                  const timestamp = new Date(event.timestamp);
                  
                  return (
                    <div
                      key={event.logId || idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card/50"
                    >
                      <div className={`p-2 rounded ${colors}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {event.equipmentId}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.systemType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {event.operator?.name || event.operatorId || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
