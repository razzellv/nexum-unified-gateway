import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function EquipmentLibrary() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEquipment();
  }, [user]);

  const loadEquipment = async () => {
    if (!user?.facilityId) return;
    
    try {
      const data = await apiRequest(`/equipment?facilityId=${user.facilityId}`);
      setEquipment(data.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter(eq =>
    eq.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = ['admin', 'executive'].includes(user?.role || '');

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Library</h1>
            <p className="text-muted-foreground">Manage facility equipment and baselines</p>
          </div>
          {canEdit && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline">{filteredEquipment.length} items</Badge>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading equipment...
            </CardContent>
          </Card>
        ) : filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No equipment found. Add your first equipment to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEquipment.map((eq) => (
              <Card key={eq.equipmentId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{eq.equipmentId}</h3>
                        <Badge>{eq.equipmentType}</Badge>
                        {eq.status && (
                          <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                            {eq.status}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Manufacturer:</strong> {eq.manufacturer || 'N/A'}</p>
                        <p><strong>Model:</strong> {eq.model || 'N/A'}</p>
                        {eq.serialNumber && <p><strong>Serial:</strong> {eq.serialNumber}</p>}
                        {eq.location && <p><strong>Location:</strong> {eq.location}</p>}
                        {eq.installDate && <p><strong>Installed:</strong> {eq.installDate}</p>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Baseline
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    )}
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
