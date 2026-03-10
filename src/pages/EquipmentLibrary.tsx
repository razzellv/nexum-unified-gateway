import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Settings, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Equipment {
  equipmentId: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  location?: string;
  installDate?: string;
  status?: string;
  buildingId?: string;
  baseline?: {
    temperature?: number;
    pressure?: number;
    flowRate?: number;
    powerConsumption?: number;
    efficiency?: number;
    notes?: string;
  };
}

// Helper to clean equipment names
const cleanText = (text: string) => {
  if (!text) return 'N/A';
  return text
    .replace(/\*\*/g, '')
    .replace(/™/g, '')
    .replace(/®/g, '')
    .split('(')[0]
    .trim() || 'N/A';
};

const equipmentTypes = [
  'boiler',
  'chiller',
  'pump',
  'ahu',
  'cooling_tower',
  'fan',
  'vav',
  'air_handler',
  'heat_exchanger',
  'compressor',
  'condenser',
  'evaporator',
];

export default function EquipmentLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    equipmentType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    installDate: '',
    buildingId: '',
    status: 'active',
  });

// Baseline form state (expanded for all equipment types)
const [baselineData, setBaselineData] = useState<any>({
  // Boiler
  mawp: '',
  capacity: '',
  minTemp: '',
  maxTemp: '',
  efficiency: '',
  firingRate: '',
  
  // Chiller
  tons: '',
  kwPerTon: '',
  minChilledTemp: '',
  maxChilledTemp: '',
  minCondenserTemp: '',
  maxCondenserTemp: '',
  refrigerant: '',
  
  // Pump
  gpm: '',
  head: '',
  motorHp: '',
  operatingPressure: '',
  
  // AHU
  cfm: '',
  staticPressure: '',
  supplyTemp: '',
  returnTemp: '',
  
  // Cooling Tower
  fanHp: '',
  approachTemp: '',
  rangeTemp: '',
  
  // Common
  notes: '',
});

  useEffect(() => {
    loadEquipment();
  }, [user]);

  const loadEquipment = async () => {
    if (!user?.facilityId) return;
    
    try {
      setLoading(true);
      const data = await apiRequest(`/equipment?facility_id=${user.facilityId}`);
      setEquipment(data.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.equipmentType || !formData.manufacturer || !formData.model) {
      toast({
        title: 'Validation Error',
        description: 'Equipment type, manufacturer, and model are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/equipment', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      toast({
        title: 'Success',
        description: 'Equipment added successfully',
      });

      setAddDialogOpen(false);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      console.error('Failed to add equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add equipment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEquipment) return;

    try {
      setSubmitting(true);
      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedEquipment(null);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      console.error('Failed to update equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!selectedEquipment) return;

    try {
      setSubmitting(true);
      const baseline = {
        temperature: baselineData.temperature ? parseFloat(baselineData.temperature) : undefined,
        pressure: baselineData.pressure ? parseFloat(baselineData.pressure) : undefined,
        flowRate: baselineData.flowRate ? parseFloat(baselineData.flowRate) : undefined,
        powerConsumption: baselineData.powerConsumption ? parseFloat(baselineData.powerConsumption) : undefined,
        efficiency: baselineData.efficiency ? parseFloat(baselineData.efficiency) : undefined,
        notes: baselineData.notes || undefined,
      };

      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ baseline }),
      });

      toast({
        title: 'Success',
        description: 'Baseline saved successfully',
      });

      setBaselineDialogOpen(false);
      setSelectedEquipment(null);
      resetBaselineForm();
      loadEquipment();
    } catch (error: any) {
      console.error('Failed to save baseline:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save baseline',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setFormData({
      equipmentType: eq.equipmentType,
      manufacturer: eq.manufacturer,
      model: eq.model,
      serialNumber: eq.serialNumber || '',
      location: eq.location || '',
      installDate: eq.installDate || '',
      buildingId: eq.buildingId || '',
      status: eq.status || 'active',
    });
    setEditDialogOpen(true);
  };

  const openBaselineDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setBaselineData({
      temperature: eq.baseline?.temperature?.toString() || '',
      pressure: eq.baseline?.pressure?.toString() || '',
      flowRate: eq.baseline?.flowRate?.toString() || '',
      powerConsumption: eq.baseline?.powerConsumption?.toString() || '',
      efficiency: eq.baseline?.efficiency?.toString() || '',
      notes: eq.baseline?.notes || '',
    });
    setBaselineDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      equipmentType: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      location: '',
      installDate: '',
      buildingId: '',
      status: 'active',
    });
  };

  const resetBaselineForm = () => {
    setBaselineData({
      temperature: '',
      pressure: '',
      flowRate: '',
      powerConsumption: '',
      efficiency: '',
      notes: '',
    });
  };

  const filteredEquipment = equipment.filter(eq =>
    eq.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = ['admin', 'executive', 'manager'].includes(user?.role || '');

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Library</h1>
            <p className="text-muted-foreground">Manage facility equipment and baselines</p>
          </div>
          {canEdit && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipmentType">Equipment Type *</Label>
                      <Select
                        value={formData.equipmentType}
                        onValueChange={(value) => setFormData({ ...formData, equipmentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ').toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="decommissioned">Decommissioned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer *</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="e.g., Trane, Carrier, York"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Model *</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="e.g., RTAC-150"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Mechanical Room 2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buildingId">Building ID</Label>
                      <Input
                        id="buildingId"
                        value={formData.buildingId}
                        onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                        placeholder="e.g., BLDG-A"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddDialogOpen(false);
                        resetForm();
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Equipment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
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
                        <Badge>{eq.equipmentType?.replace(/_/g, ' ').toUpperCase()}</Badge>
                        {eq.status && (
                          <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                            {eq.status}
                          </Badge>
                        )}
                        {eq.baseline && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            Baseline Set
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Manufacturer:</strong> {cleanText(eq.manufacturer)}</p>
                        <p><strong>Model:</strong> {cleanText(eq.model)}</p>
                        {eq.serialNumber && <p><strong>Serial:</strong> {cleanText(eq.serialNumber)}</p>}
                        {eq.location && <p><strong>Location:</strong> {eq.location}</p>}
                        {eq.installDate && <p><strong>Installed:</strong> {eq.installDate}</p>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openBaselineDialog(eq)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          {eq.baseline ? 'Edit Baseline' : 'Set Baseline'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(eq)}
                        >
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

        {/* Edit Equipment Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Equipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Same form fields as Add dialog */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-equipmentType">Equipment Type *</Label>
                  <Select
                    value={formData.equipmentType}
                    onValueChange={(value) => setFormData({ ...formData, equipmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-manufacturer">Manufacturer *</Label>
                  <Input
                    id="edit-manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-model">Model *</Label>
                  <Input
                    id="edit-model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-serialNumber">Serial Number</Label>
                  <Input
                    id="edit-serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-installDate">Install Date</Label>
                  <Input
                    id="edit-installDate"
                    type="date"
                    value={formData.installDate}
                    onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-buildingId">Building ID</Label>
                  <Input
                    id="edit-buildingId"
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedEquipment(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

{/* Baseline Dialog */}
<Dialog open={baselineDialogOpen} onOpenChange={setBaselineDialogOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        Set Equipment Baseline - {selectedEquipment?.equipmentId}
        <Badge className="ml-2" variant="outline">
          {selectedEquipment?.equipmentType?.toUpperCase()}
        </Badge>
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Set baseline operational parameters for this equipment. These will be used for performance comparison and anomaly detection.
      </p>

      {/* BOILER BASELINE */}
      {selectedEquipment?.equipmentType === 'boiler' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-mawp">MAWP (PSI) *</Label>
              <Input
                id="baseline-mawp"
                type="number"
                step="0.1"
                value={baselineData.mawp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, mawp: e.target.value })}
                placeholder="e.g., 150"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-capacity">Capacity (MBH)</Label>
              <Input
                id="baseline-capacity"
                type="number"
                step="1"
                value={baselineData.capacity || ''}
                onChange={(e) => setBaselineData({ ...baselineData, capacity: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-min-temp">Min Operating Temp (°F)</Label>
              <Input
                id="baseline-min-temp"
                type="number"
                step="1"
                value={baselineData.minTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, minTemp: e.target.value })}
                placeholder="e.g., 140"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-max-temp">Max Operating Temp (°F)</Label>
              <Input
                id="baseline-max-temp"
                type="number"
                step="1"
                value={baselineData.maxTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, maxTemp: e.target.value })}
                placeholder="e.g., 200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-efficiency">Combustion Efficiency (%)</Label>
              <Input
                id="baseline-efficiency"
                type="number"
                step="0.1"
                value={baselineData.efficiency || ''}
                onChange={(e) => setBaselineData({ ...baselineData, efficiency: e.target.value })}
                placeholder="e.g., 82.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-firing-rate">Max Firing Rate (MBH)</Label>
              <Input
                id="baseline-firing-rate"
                type="number"
                step="1"
                value={baselineData.firingRate || ''}
                onChange={(e) => setBaselineData({ ...baselineData, firingRate: e.target.value })}
                placeholder="e.g., 5500"
              />
            </div>
          </div>
        </div>
      )}

      {/* CHILLER BASELINE */}
      {selectedEquipment?.equipmentType === 'chiller' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-tons">Capacity (Tons) *</Label>
              <Input
                id="baseline-tons"
                type="number"
                step="0.1"
                value={baselineData.tons || ''}
                onChange={(e) => setBaselineData({ ...baselineData, tons: e.target.value })}
                placeholder="e.g., 400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-kw-ton">kW/Ton (Efficiency)</Label>
              <Input
                id="baseline-kw-ton"
                type="number"
                step="0.01"
                value={baselineData.kwPerTon || ''}
                onChange={(e) => setBaselineData({ ...baselineData, kwPerTon: e.target.value })}
                placeholder="e.g., 0.58"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-min-chwt">Min Chilled Water Temp (°F)</Label>
              <Input
                id="baseline-min-chwt"
                type="number"
                step="0.1"
                value={baselineData.minChilledTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, minChilledTemp: e.target.value })}
                placeholder="e.g., 42"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-max-chwt">Max Chilled Water Temp (°F)</Label>
              <Input
                id="baseline-max-chwt"
                type="number"
                step="0.1"
                value={baselineData.maxChilledTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, maxChilledTemp: e.target.value })}
                placeholder="e.g., 54"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-min-cond">Min Condenser Temp (°F)</Label>
              <Input
                id="baseline-min-cond"
                type="number"
                step="0.1"
                value={baselineData.minCondenserTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, minCondenserTemp: e.target.value })}
                placeholder="e.g., 75"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-max-cond">Max Condenser Temp (°F)</Label>
              <Input
                id="baseline-max-cond"
                type="number"
                step="0.1"
                value={baselineData.maxCondenserTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, maxCondenserTemp: e.target.value })}
                placeholder="e.g., 95"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseline-refrigerant">Refrigerant Type</Label>
            <Input
              id="baseline-refrigerant"
              value={baselineData.refrigerant || ''}
              onChange={(e) => setBaselineData({ ...baselineData, refrigerant: e.target.value })}
              placeholder="e.g., R-134a"
            />
          </div>
        </div>
      )}

      {/* PUMP BASELINE */}
      {selectedEquipment?.equipmentType === 'pump' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-gpm">Flow Rate (GPM) *</Label>
              <Input
                id="baseline-gpm"
                type="number"
                step="1"
                value={baselineData.gpm || ''}
                onChange={(e) => setBaselineData({ ...baselineData, gpm: e.target.value })}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-head">Head (Feet)</Label>
              <Input
                id="baseline-head"
                type="number"
                step="0.1"
                value={baselineData.head || ''}
                onChange={(e) => setBaselineData({ ...baselineData, head: e.target.value })}
                placeholder="e.g., 100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-motor-hp">Motor HP</Label>
              <Input
                id="baseline-motor-hp"
                type="number"
                step="0.1"
                value={baselineData.motorHp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, motorHp: e.target.value })}
                placeholder="e.g., 15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-operating-pressure">Operating Pressure (PSI)</Label>
              <Input
                id="baseline-operating-pressure"
                type="number"
                step="0.1"
                value={baselineData.operatingPressure || ''}
                onChange={(e) => setBaselineData({ ...baselineData, operatingPressure: e.target.value })}
                placeholder="e.g., 50"
              />
            </div>
          </div>
        </div>
      )}

      {/* AHU/RTU BASELINE */}
      {(selectedEquipment?.equipmentType === 'ahu' || selectedEquipment?.equipmentType === 'air_handler') && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-cfm">Airflow (CFM) *</Label>
              <Input
                id="baseline-cfm"
                type="number"
                step="1"
                value={baselineData.cfm || ''}
                onChange={(e) => setBaselineData({ ...baselineData, cfm: e.target.value })}
                placeholder="e.g., 10000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-static">Static Pressure (in. w.c.)</Label>
              <Input
                id="baseline-static"
                type="number"
                step="0.01"
                value={baselineData.staticPressure || ''}
                onChange={(e) => setBaselineData({ ...baselineData, staticPressure: e.target.value })}
                placeholder="e.g., 1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-supply-temp">Supply Air Temp (°F)</Label>
              <Input
                id="baseline-supply-temp"
                type="number"
                step="0.1"
                value={baselineData.supplyTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, supplyTemp: e.target.value })}
                placeholder="e.g., 55"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-return-temp">Return Air Temp (°F)</Label>
              <Input
                id="baseline-return-temp"
                type="number"
                step="0.1"
                value={baselineData.returnTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, returnTemp: e.target.value })}
                placeholder="e.g., 72"
              />
            </div>
          </div>
        </div>
      )}

      {/* COOLING TOWER BASELINE */}
      {selectedEquipment?.equipmentType === 'cooling_tower' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-tower-gpm">Flow Rate (GPM) *</Label>
              <Input
                id="baseline-tower-gpm"
                type="number"
                step="1"
                value={baselineData.gpm || ''}
                onChange={(e) => setBaselineData({ ...baselineData, gpm: e.target.value })}
                placeholder="e.g., 1200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-fan-hp">Fan HP</Label>
              <Input
                id="baseline-fan-hp"
                type="number"
                step="0.1"
                value={baselineData.fanHp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, fanHp: e.target.value })}
                placeholder="e.g., 25"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-approach">Approach Temp (°F)</Label>
              <Input
                id="baseline-approach"
                type="number"
                step="0.1"
                value={baselineData.approachTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, approachTemp: e.target.value })}
                placeholder="e.g., 7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline-range">Range Temp (°F)</Label>
              <Input
                id="baseline-range"
                type="number"
                step="0.1"
                value={baselineData.rangeTemp || ''}
                onChange={(e) => setBaselineData({ ...baselineData, rangeTemp: e.target.value })}
                placeholder="e.g., 10"
              />
            </div>
          </div>
        </div>
      )}

      {/* NOTES (ALL EQUIPMENT TYPES) */}
      <div className="space-y-2">
        <Label htmlFor="baseline-notes">Notes</Label>
        <Textarea
          id="baseline-notes"
          value={baselineData.notes || ''}
          onChange={(e) => setBaselineData({ ...baselineData, notes: e.target.value })}
          placeholder="Add any relevant notes about baseline conditions, source documents (Certificate of Inspection), or operational context..."
          rows={3}
        />
      </div>

      <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
        <strong>Note:</strong> Baseline values should come from:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Certificate of Inspection (nameplate MAWP, capacity, etc.)</li>
          <li>Manufacturer specifications</li>
          <li>Verified operational readings under normal conditions</li>
        </ul>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setBaselineDialogOpen(false);
            setSelectedEquipment(null);
            resetBaselineForm();
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveBaseline} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Baseline
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
      </div>
    </MainLayout>
  );
}
