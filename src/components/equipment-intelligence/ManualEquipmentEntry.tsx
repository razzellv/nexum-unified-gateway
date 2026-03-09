import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Flame, Snowflake, Wind, Droplets, Waves, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const EQUIPMENT_TYPES = [
  { value: 'boiler', label: 'Boiler', icon: Flame, color: 'text-orange-500' },
  { value: 'chiller', label: 'Chiller', icon: Snowflake, color: 'text-blue-500' },
  { value: 'ahu', label: 'Air Handler (AHU)', icon: Wind, color: 'text-cyan-500' },
  { value: 'pump', label: 'Pump', icon: Droplets, color: 'text-green-500' },
  { value: 'cooling_tower', label: 'Cooling Tower', icon: Waves, color: 'text-purple-500' },
];

interface ManualEquipmentData {
  equipmentId: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  installDate: string;
  capacity: string;
  voltage: string;
  phase: string;
  notes: string;
}

const ManualEquipmentEntry = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [formData, setFormData] = useState<ManualEquipmentData>({
    equipmentId: '',
    type: 'boiler',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    installDate: '',
    capacity: '',
    voltage: '',
    phase: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      if (!user?.facilityId) return;
      try {
        const token = localStorage.getItem('nexum_access_token');
        const url = `${import.meta.env.VITE_API_BASE_URL}/buildings?facilityId=${user.facilityId}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBuildings(data.buildings || []);
          if (data.buildings?.length > 0) {
            setSelectedBuilding(data.buildings[0].buildingId);
          }
        }
      } catch (error) {
        console.error('Error loading buildings:', error);
      }
    };
    loadBuildings();
  }, [user?.facilityId]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.equipmentId || !formData.manufacturer || !formData.model) {
    toast({
      title: 'Missing Information',
      description: 'Please fill in Equipment ID, Manufacturer, and Model',
      variant: 'destructive'
    });
    return;
  }

  setIsSubmitting(true);

  try {
    const token = localStorage.getItem('nexum_access_token');
    
    // ✅ CORRECT ENDPOINT - NOT /equipment/intelligence!
    const url = `https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/equipment`;
    
    const equipmentData = {
      facilityId: user?.facilityId || 'facility-001',
      buildingId: selectedBuilding || 'building-001',
      equipmentId: formData.equipmentId,
      equipmentType: formData.type,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber || null,
      location: selectedFloor && selectedZone 
        ? `Floor ${selectedFloor}, Zone ${selectedZone}` 
        : selectedFloor 
          ? `Floor ${selectedFloor}` 
          : 'Not specified',
      installDate: formData.installDate || null,
      capacity: formData.capacity || null,
      voltage: formData.voltage || null,
      phase: formData.phase || null,
      notes: formData.notes || `Manually added via Equipment Intelligence on ${new Date().toLocaleDateString()}`,
      status: 'active',
      source: 'manual-entry',
    };

    console.log('📤 Submitting equipment:', equipmentData);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(equipmentData)
    });

    const result = await response.json();
    console.log('📥 Response:', result);

    if (response.ok) {
      toast({
        title: '✅ Equipment Added',
        description: `${formData.manufacturer} ${formData.model} saved successfully`,
      });

      // Reset form
      setFormData({
        equipmentId: '',
        type: 'boiler',
        manufacturer: '',
        model: '',
        serialNumber: '',
        location: '',
        installDate: '',
        capacity: '',
        voltage: '',
        phase: '',
        notes: '',
      });
      setSelectedFloor('');
      setSelectedZone('');

      // Trigger refresh
      window.dispatchEvent(new CustomEvent('equipment-updated'));
    } else {
      throw new Error(result.message || 'Failed to save equipment');
    }
  } catch (error: any) {
    console.error('❌ Error saving equipment:', error);
    toast({
      title: '⚠️ Save Failed',
      description: error.message || 'Could not save equipment. Please try again.',
      variant: 'destructive'
    });
  } finally {
    setIsSubmitting(false);
  }
};
  const selectedBuildingData = buildings.find(b => b.buildingId === selectedBuilding);

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Manual Equipment Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Building Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-border bg-muted/20">
                <div>
                  <Label className="mb-2 block">Building *</Label>
                  <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(building => (
                        <SelectItem key={building.buildingId} value={building.buildingId}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Floor (Optional)</Label>
                  <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedBuildingData && Array.from(
                        { length: selectedBuildingData.floors || 0 },
                        (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Floor {i + 1}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Zone (Optional)</Label>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedBuildingData?.zones?.map((zone: string) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equipment Type */}
              <div>
                <Label className="mb-2 block">Equipment Type *</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {EQUIPMENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                          formData.type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <Icon className={cn('w-5 h-5', type.color)} />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Equipment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipmentId" className="mb-2 block">Equipment ID *</Label>
                  <Input
                    id="equipmentId"
                    placeholder="e.g. BOILER-001"
                    value={formData.equipmentId}
                    onChange={e => setFormData(prev => ({ ...prev, equipmentId: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="manufacturer" className="mb-2 block">Manufacturer *</Label>
                  <Input
                    id="manufacturer"
                    placeholder="e.g. Cleaver-Brooks"
                    value={formData.manufacturer}
                    onChange={e => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="mb-2 block">Model *</Label>
                  <Input
                    id="model"
                    placeholder="e.g. CB-700"
                    value={formData.model}
                    onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="serialNumber" className="mb-2 block">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    placeholder="e.g. SN-2024-001"
                    value={formData.serialNumber}
                    onChange={e => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="capacity" className="mb-2 block">Capacity</Label>
                  <Input
                    id="capacity"
                    placeholder="e.g. 500 MBH, 100 Tons"
                    value={formData.capacity}
                    onChange={e => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="installDate" className="mb-2 block">Install Date</Label>
                  <Input
                    id="installDate"
                    type="date"
                    value={formData.installDate}
                    onChange={e => setFormData(prev => ({ ...prev, installDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="voltage" className="mb-2 block">Voltage</Label>
                  <Input
                    id="voltage"
                    placeholder="e.g. 460V"
                    value={formData.voltage}
                    onChange={e => setFormData(prev => ({ ...prev, voltage: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="phase" className="mb-2 block">Phase</Label>
                  <Input
                    id="phase"
                    placeholder="e.g. 3-Phase"
                    value={formData.phase}
                    onChange={e => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="mb-2 block">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this equipment..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Add Equipment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ManualEquipmentEntry;
