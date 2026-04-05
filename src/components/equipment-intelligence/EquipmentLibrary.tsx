import { useEffect, useState } from 'react';
import { Library, Trash2, Download, Brain, Loader2, Package, Scan } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';

interface Equipment {
  equipmentId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  location: string;
  photos: string[];
  aiExtracted: boolean;
  source: string;
  createdAt: string;
  voltage?: string;
  capacity?: string;
  specifications?: any;
  isDuplicate: boolean;
}

interface EquipmentSummary {
  [type: string]: {
    count: number;
    aiExtracted: number;
    manual: number;
  };
}

const EquipmentLibrary = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
      const accessToken = localStorage.getItem('nexum_access_token');
      
      console.log('📥 Fetching equipment from /equipment/intelligence...');
      
      const response = await fetch(
        `${API_BASE_URL}/equipment/intelligence?facilityId=${user?.facilityId || 'facility-001'}&limit=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📡 Equipment fetch response:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Equipment data received:', result);
        
        setEquipment(result.equipment || []);
        setSummary(result.summary || {});
      } else {
        const errorData = await response.json();
        console.error('❌ Equipment fetch failed:', errorData);
        setError(errorData.error || 'Failed to load equipment');
      }
    } catch (err) {
      console.error('❌ Equipment fetch error:', err);
      setError('Network error loading equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();

    // Listen for equipment updates (from nameplate upload)
    const handleUpdate = () => {
      console.log('🔄 Equipment updated event received, refreshing...');
      fetchEquipment();
    };
    
    window.addEventListener('equipment-updated', handleUpdate);

    return () => {
      window.removeEventListener('equipment-updated', handleUpdate);
    };
  }, [user?.facilityId]);

  const handleExportAll = () => {
    const data = equipment.map(item => ({
      equipmentId: item.equipmentId,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      equipmentType: item.equipmentType,
      location: item.location,
      voltage: item.voltage,
      capacity: item.capacity,
      specifications: item.specifications,
      aiExtracted: item.aiExtracted,
      source: item.source,
      createdAt: item.createdAt,
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-library-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "📁 Library Exported",
      description: `Exported ${equipment.length} equipment records.`,
    });
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading equipment...</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={fetchEquipment} className="mt-4">
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  if (equipment.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No equipment added yet</p>
                  <p className="text-sm">Upload equipment nameplates to get started</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/50 flex items-center justify-center">
                <Library className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Equipment Library</h2>
                <p className="text-sm text-muted-foreground">
                  {equipment.length} equipment profile{equipment.length !== 1 ? 's' : ''} registered
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAll}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(summary).map(([type, stats]) => (
                <Card key={type} className="bg-card/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{type}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Scan className="inline w-3 h-3 mr-1" />
                      {stats.aiExtracted} AI · {stats.manual} Manual
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((item) => (
              <Card key={item.equipmentId} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">
                        {item.equipmentType}
                      </CardTitle>
                    </div>
                    {item.aiExtracted && (
                      <Badge variant="secondary" className="text-xs">
                        <Scan className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer</span>
                      <span className="font-medium">{item.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{item.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial</span>
                      <span className="font-medium text-xs">{item.serialNumber}</span>
                    </div>
                    {item.voltage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Voltage</span>
                        <span className="font-medium">{item.voltage}</span>
                      </div>
                    )}
                    {item.capacity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-medium">{item.capacity}</span>
                      </div>
                    )}
                    {item.location && item.location !== 'Not specified' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium text-xs">{item.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {item.photos && item.photos.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <img
                        src={item.photos[0]}
                        alt="Equipment nameplate"
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.source === 'nameplate-scan' ? 'Nameplate Scan' : 'Manual Entry'}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EquipmentLibrary;
