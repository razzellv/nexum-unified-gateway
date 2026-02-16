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

export default function ManualEquipmentEntry() {
  const { toast } = useToast();
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

  const [buildings, setBuildings] = useState<any[]>([]);

  const [selectedBuilding, setSelectedBuilding] = useState('');

  const { user } = useAuth();

  // Load buildings

  useEffect(() => {

    const loadBuildings = async () => {

      if (!user?.facilityId) return;

      try {

        const response = await fetch(


        const response = await fetch(

          ${import.meta.env.VITE_API_BASE_URL}/buildings?facilityId=${user.facilityId},

          { headers: { 'Authorization': Bearer ${localStorage.getItem('nexum_access_token')} } }

        );


        );

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
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/equipment`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...formData,
      //     addedMethod: 'manual_entry',
      //     addedAt: new Date().toISOString()
      //   })
      // });

      console.log('📝 Manual equipment entry:', formData);

      toast({
        title: 'Success!',
        description: `${formData.type.toUpperCase()} ${formData.equipmentId} added to equipment library`,
      });

      // ✅ Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('equipmentAdded', { 
        detail: { 
          ...formData,
          addedMethod: 'manual_entry',
          addedAt: new Date().toISOString()
        }
      }));

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

    } catch (error) {
      console.error('Error adding equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add equipment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = EQUIPMENT_TYPES.find(t => t.value === formData.type);
  const Icon = selectedType?.icon || Edit;

  return (
    <Card className="neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5 text-primary" />
          Manual Equipment Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Equipment Type Selection */}
          <div className="grid gap-3">
            <Label>Equipment Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {EQUIPMENT_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = formData.type === type.value;
                
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-primary/50'
                    )}
                  >
                    <TypeIcon className={cn('w-8 h-8', isSelected ? 'text-primary' : type.color)} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipmentId">Equipment ID *</Label>
              <Input
                id="equipmentId"
                value={formData.equipmentId}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                placeholder="B-01, CH-02, AHU-03"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="SN123456789"
              />
            </div>
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Cleaver-Brooks, Trane, Carrier"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="CB-700-150, CVHE-500"
                required
              />
            </div>
          </div>

          {/* Location & Install Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Mechanical Room 1, Roof"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installDate">Install Date</Label>
              <Input
                id="installDate"
                type="date"
                value={formData.installDate}
                onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="500 tons, 1000 MBH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voltage">Voltage</Label>
              <Input
                id="voltage"
                value={formData.voltage}
                onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                placeholder="480V, 208V"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select
                value={formData.phase}
                onValueChange={(value) => setFormData({ ...formData, phase: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Single Phase</SelectItem>
                  <SelectItem value="3">Three Phase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes, maintenance history, special requirements..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
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
              })}
            >
              Clear Form
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Equipment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
