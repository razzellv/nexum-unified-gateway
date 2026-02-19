import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { 
  Search,
  Filter,
  Download,
  Archive,
  Eye,
  Calendar,
  Tag,
  Building,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';

interface LibraryEquipment {
  equipmentId: string;
  facilityId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  yearManufactured?: number;
  scannedAt: string;
  scannedBy: string;
  photos: Array<{
    s3_url: string;
    type: string;
  }>;
  reports: Array<{
    generated_at: string;
    report_url: string;
  }>;
  ai_analysis?: {
    efficiency_rating: string;
    condition_assessment: string;
  };
  archived: boolean;
}

export default function EquipmentLibrary() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [equipment, setEquipment] = useState<LibraryEquipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<LibraryEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Connect to equipment-library Lambda
      // For now, using placeholder data
      const mockData: LibraryEquipment[] = [
        {
          equipmentId: 'eq-001',
          facilityId: 'facility-001',
          manufacturer: 'Cleaver-Brooks',
          model: 'CB-700-250',
          serialNumber: 'CB12345678',
          equipmentType: 'boiler',
          yearManufactured: 2018,
          scannedAt: '2026-01-05T10:30:00Z',
          scannedBy: 'John Smith',
          photos: [
            { s3_url: '/placeholder-nameplate.jpg', type: 'nameplate' }
          ],
          reports: [
            { generated_at: '2026-01-05T10:35:00Z', report_url: '/reports/eq-001.pdf' }
          ],
          ai_analysis: {
            efficiency_rating: '87.5%',
            condition_assessment: 'Good - Minor maintenance recommended'
          },
          archived: false
        },
        {
          equipmentId: 'eq-002',
          facilityId: 'facility-001',
          manufacturer: 'Trane',
          model: 'CVHE-500',
          serialNumber: 'TR87654321',
          equipmentType: 'chiller',
          yearManufactured: 2020,
          scannedAt: '2026-01-06T14:20:00Z',
          scannedBy: 'Jane Doe',
          photos: [
            { s3_url: '/placeholder-nameplate.jpg', type: 'nameplate' }
          ],
          reports: [
            { generated_at: '2026-01-06T14:25:00Z', report_url: '/reports/eq-002.pdf' }
          ],
          ai_analysis: {
            efficiency_rating: '4.8 COP',
            condition_assessment: 'Excellent'
          },
          archived: false
        },
        {
          equipmentId: 'eq-003',
          facilityId: 'facility-001',
          manufacturer: 'Armstrong',
          model: 'S-65',
          serialNumber: 'ARM55443322',
          equipmentType: 'pump',
          yearManufactured: 2015,
          scannedAt: '2025-12-20T09:15:00Z',
          scannedBy: 'Razzell Taylor1',
          photos: [
            { s3_url: '/placeholder-nameplate.jpg', type: 'nameplate' }
          ],
          reports: [
            { generated_at: '2025-12-20T09:20:00Z', report_url: '/reports/eq-003.pdf' }
          ],
          ai_analysis: {
            efficiency_rating: '68.5%',
            condition_assessment: 'Fair - Seal replacement needed'
          },
          archived: false
        }
      ];
      
      setEquipment(mockData);
      setFilteredEquipment(mockData);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load equipment library');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    let filtered = equipment;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(eq => 
        eq.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.equipmentType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(eq => eq.equipmentType === filterType);
    }

    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter(eq => !eq.archived);
    }

    setFilteredEquipment(filtered);
  }, [searchTerm, filterType, showArchived, equipment]);

  if (authLoading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const activeCount = equipment.filter(eq => !eq.archived).length;
  const isOverLimit = activeCount > 25;

  const equipmentTypes = Array.from(new Set(equipment.map(eq => eq.equipmentType)));

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment Library</h1>
            <p className="text-muted-foreground mt-1">
              {activeCount} equipment in library
              {isOverLimit && (
                <span className="ml-2 text-yellow-500 font-medium">
                  (+$10/mo for {activeCount - 25} over limit)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
          </div>
        </div>

        {/* Billing Alert */}
        {isOverLimit && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-500">Storage Limit Exceeded</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {activeCount} equipment in your library. The first 25 are included free. 
                  You'll be charged an additional <strong>$10/month</strong> for the extra {activeCount - 25} equipment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by manufacturer, model, serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-md border bg-background"
          >
            <option value="all">All Types</option>
            {equipmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {error && <NexumError message={error} onRetry={fetchData} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading equipment library..." />
          </div>
        ) : filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Equipment Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start scanning equipment to build your library'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.map((eq) => (
              <Card key={eq.equipmentId} className={`neon-border ${eq.archived ? 'opacity-50' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{eq.manufacturer}</CardTitle>
                      <p className="text-sm text-muted-foreground">{eq.model}</p>
                    </div>
                    <Badge variant={eq.archived ? 'secondary' : 'default'} className="capitalize">
                      {eq.equipmentType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial Number</span>
                      <span className="font-mono font-semibold">{eq.serialNumber}</span>
                    </div>
                    {eq.yearManufactured && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Year</span>
                        <span className="font-semibold">{eq.yearManufactured}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scanned</span>
                      <span className="font-semibold">
                        {new Date(eq.scannedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {eq.ai_analysis && (
                    <div className="p-2 rounded bg-muted/50 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Efficiency</span>
                        <span className="font-semibold">{eq.ai_analysis.efficiency_rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{eq.ai_analysis.condition_assessment}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {eq.reports.length > 0 && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                    )}
                  </div>

                  {eq.archived && (
                    <div className="text-center pt-2 border-t">
                      <Badge variant="secondary" className="text-xs">
                        <Archive className="w-3 h-3 mr-1" />
                        Archived
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
