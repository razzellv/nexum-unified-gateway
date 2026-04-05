import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Flame, Snowflake, Wind, Droplets, Waves, Camera, FileText, Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface RecentEquipmentItem {
  equipmentId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  aiExtracted: boolean;
  source: string;
  createdAt: string;
  confidence?: number;
}

const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const getEquipmentIcon = (type: string) => {
  const icons: Record<string, any> = {
    boiler: Flame,
    chiller: Snowflake,
    ahu: Wind,
    'air handler': Wind,
    pump: Droplets,
    'cooling tower': Waves,
    'cooling_tower': Waves,
    tower: Waves,
  };
  return icons[type?.toLowerCase()] || Activity;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    boiler: 'text-orange-500 bg-orange-500/10',
    chiller: 'text-blue-500 bg-blue-500/10',
    ahu: 'text-cyan-500 bg-cyan-500/10',
    'air handler': 'text-cyan-500 bg-cyan-500/10',
    pump: 'text-green-500 bg-green-500/10',
    'cooling tower': 'text-purple-500 bg-purple-500/10',
    'cooling_tower': 'text-purple-500 bg-purple-500/10',
    tower: 'text-purple-500 bg-purple-500/10',
  };
  return colors[type?.toLowerCase()] || 'text-primary bg-primary/10';
};

const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const added = new Date(timestamp);
  const diffMs = now.getTime() - added.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

export default function RecentEquipment() {
  const { user } = useAuth();
  const [recentEquipment, setRecentEquipment] = useState<RecentEquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentEquipment = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('nexum_access_token');
      
      console.log('📥 Fetching recent equipment from /equipment/intelligence...');
      
      const response = await fetch(
        `${API_BASE_URL}/equipment/intelligence?facilityId=${user?.facilityId || 'facility-001'}&recent=true&limit=5`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Recent equipment received:', data);
        
        const equipment = data.equipment || [];
        setRecentEquipment(equipment);
      } else {
        console.warn('⚠️ API returned error, using empty list');
        setRecentEquipment([]);
      }
    } catch (error) {
      console.error('❌ Error fetching recent equipment:', error);
      setRecentEquipment([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentEquipment();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRecentEquipment, 30000);
    
    // Listen for equipment-updated event
    const handleEquipmentAdded = () => {
      console.log('🔄 Equipment added, refreshing recent...');
      fetchRecentEquipment();
    };
    
    window.addEventListener('equipment-updated', handleEquipmentAdded);
    window.addEventListener('equipmentAdded', handleEquipmentAdded); // Legacy support
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('equipment-updated', handleEquipmentAdded);
      window.removeEventListener('equipmentAdded', handleEquipmentAdded);
    };
  }, [user?.facilityId]);

  return (
    <Card className="neon-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recently Added Equipment
            {recentEquipment.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {recentEquipment.length} Added
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecentEquipment}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading recent equipment...</p>
            </div>
          </div>
        ) : recentEquipment.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No equipment added yet</p>
            <p className="text-xs text-muted-foreground">
              Equipment added through scanning or manual entry will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentEquipment.map((item, index) => {
              const Icon = getEquipmentIcon(item.equipmentType);
              const typeColors = getTypeColor(item.equipmentType);
              const isNameplateScan = item.source === 'nameplate-scan' || item.aiExtracted;

              return (
                <div
                  key={item.equipmentId}
                  className="p-4 rounded-lg border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Header: Icon & Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn('p-2.5 rounded-lg', typeColors)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant={isNameplateScan ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                      {isNameplateScan ? (
                        <>
                          <Camera className="w-2.5 h-2.5 mr-1" />
                          Scan
                        </>
                      ) : (
                        <>
                          <FileText className="w-2.5 h-2.5 mr-1" />
                          Manual
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Equipment Details */}
                  <div className="space-y-1 mb-3">
                    <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {item.manufacturer} {item.model}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {item.equipmentType}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      SN: {item.serialNumber}
                    </p>
                  </div>

                  {/* Confidence Bar */}
                  {item.confidence && (
                    <div className="mb-3 pb-3 border-b border-border/30">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className={cn(
                          'font-semibold',
                          item.confidence >= 95 ? 'text-green-500' :
                          item.confidence >= 85 ? 'text-yellow-500' :
                          'text-orange-500'
                        )}>
                          {item.confidence}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            item.confidence >= 95 ? 'bg-green-500' :
                            item.confidence >= 85 ? 'bg-yellow-500' :
                            'bg-orange-500'
                          )}
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer: Time */}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(item.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
