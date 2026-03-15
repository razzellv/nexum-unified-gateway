import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Loader2, Network, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EquipmentSystem {
  systemId: string;
  systemName: string;
  systemType: string;
  parentEquipment: string;
  connectedEquipment: Array<{
    equipmentId: string;
    role: string;
  }>;
  description?: string;
  createdAt: string;
}

interface Equipment {
  equipmentId: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
}

const systemTypes = [
  { value: 'boiler_system', label: 'Boiler System' },
  { value: 'chiller_system', label: 'Chiller System' },
  { value: 'hvac_system', label: 'HVAC System' },
  { value: 'pump_system', label: 'Pump System' },
  { value: 'cooling_tower_system', label: 'Cooling Tower System' },
  { value: 'air_handler_system', label: 'Air Handler System' },
  { value: 'custom', label: 'Custom System' },
];

const equipmentRoles = [
  'primary',
  'secondary',
  'backup',
  'supply_pump',
  'return_pump',
  'feedwater_tank',
  'condensate_tank',
  'expansion_tank',
  'deaerator',
  'chemical_tank',
  'compressor',
  'condenser',
  'evaporator',
  'control_panel',
  'vfd',
  'other',
];

export default function EquipmentSystems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [systems, setSystems] = useState<EquipmentSystem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<EquipmentSystem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    systemName: '',
    systemType: '',
    description: '',
    parentEquipment: '',
    connectedEquipment: [] as Array<{ equipmentId: string; role: string }>,
  });

useEffect(() => {
  loadSystems();
  loadEquipment();
}, [user?.facilityId]);
  
  const loadSystems = async () => {
    if (!user?.facilityId) return;

    try {
      setLoading(true);
      const data = await apiRequest('/equipment-systems');
      setSystems(data.systems || []);
    } catch (error) {
      console.error('Failed to load systems:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment systems',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    if (!user?.facilityId) return;

    try {
      const data = await apiRequest(`/equipment?facility_id=${user.facilityId}`);
      setEquipment(data.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.systemName || !formData.systemType || formData.connectedEquipment.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'System name, type, and at least one equipment are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/equipment-systems', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      toast({
        title: 'Success',
        description: 'Equipment system created successfully',
      });

      setCreateDialogOpen(false);
      resetForm();
      loadSystems();
    } catch (error: any) {
      console.error('Failed to create system:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create system',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSystem) return;

    try {
      setSubmitting(true);
      await apiRequest('/equipment-systems/update', {
        method: 'POST',
        body: JSON.stringify({
          systemId: selectedSystem.systemId,
          ...formData,
        }),
      });

      toast({
        title: 'Success',
        description: 'Equipment system updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedSystem(null);
      resetForm();
      loadSystems();
    } catch (error: any) {
      console.error('Failed to update system:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update system',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (system: EquipmentSystem) => {
    setSelectedSystem(system);
    setFormData({
      systemName: system.systemName,
      systemType: system.systemType,
      description: system.description || '',
      parentEquipment: system.parentEquipment,
      connectedEquipment: system.connectedEquipment,
    });
    setEditDialogOpen(true);
  };

  const addEquipmentToSystem = () => {
    setFormData({
      ...formData,
      connectedEquipment: [
        ...formData.connectedEquipment,
        { equipmentId: '', role: 'other' },
      ],
    });
  };

  const updateEquipmentInSystem = (index: number, field: 'equipmentId' | 'role', value: string) => {
    const updated = [...formData.connectedEquipment];
    updated[index][field] = value;
    setFormData({ ...formData, connectedEquipment: updated });
  };

  const removeEquipmentFromSystem = (index: number) => {
    const updated = formData.connectedEquipment.filter((_, i) => i !== index);
    setFormData({ ...formData, connectedEquipment: updated });
  };

  const resetForm = () => {
    setFormData({
      systemName: '',
      systemType: '',
      description: '',
      parentEquipment: '',
      connectedEquipment: [],
    });
  };

  const filteredSystems = systems.filter(sys =>
    sys.systemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sys.systemType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = ['admin', 'executive', 'manager'].includes(user?.role || '');

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Systems</h1>
            <p className="text-muted-foreground">Manage connected equipment packages and workflows</p>
          </div>
          {canEdit && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create System
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Equipment System</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>System Name *</Label>
                      <Input
                        value={formData.systemName}
                        onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                        placeholder="e.g., Boiler Plant 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>System Type *</Label>
                      <Select value={formData.systemType} onValueChange={(value) => setFormData({ ...formData, systemType: value })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {systemTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional system description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Connected Equipment *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEquipmentToSystem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Equipment
                      </Button>
                    </div>

                    {formData.connectedEquipment.length === 0 && (
                      <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        No equipment added yet. Click "Add Equipment" to start.
                      </div>
                    )}

                    {formData.connectedEquipment.map((eq, index) => (
                      <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                        <Select
                          value={eq.equipmentId}
                          onValueChange={(value) => updateEquipmentInSystem(index, 'equipmentId', value)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                          <SelectContent>
                            {equipment.map(e => (
                              <SelectItem key={e.equipmentId} value={e.equipmentId}>
                                {e.equipmentId} - {e.equipmentType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={eq.role}
                          onValueChange={(value) => updateEquipmentInSystem(index, 'role', value)}
                        >
                          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                          <SelectContent>
                            {equipmentRoles.map(role => (
                              <SelectItem key={role} value={role}>
                                {role.replace(/_/g, ' ').toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeEquipmentFromSystem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create System
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit System: {selectedSystem?.systemName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>System Name *</Label>
                  <Input value={formData.systemName} onChange={(e) => setFormData({ ...formData, systemName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>System Type *</Label>
                  <Select value={formData.systemType} onValueChange={(value) => setFormData({ ...formData, systemType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {systemTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Connected Equipment *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEquipmentToSystem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Equipment
                  </Button>
                </div>

                {formData.connectedEquipment.map((eq, index) => (
                  <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                    <Select value={eq.equipmentId} onValueChange={(value) => updateEquipmentInSystem(index, 'equipmentId', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {equipment.map(e => (
                          <SelectItem key={e.equipmentId} value={e.equipmentId}>{e.equipmentId} - {e.equipmentType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={eq.role} onValueChange={(value) => updateEquipmentInSystem(index, 'role', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {equipmentRoles.map(role => (
                          <SelectItem key={role} value={role}>{role.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="outline" size="icon" onClick={() => removeEquipmentFromSystem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedSystem(null); resetForm(); }} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search systems..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="outline">{filteredSystems.length} systems</Badge>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading systems...
            </CardContent>
          </Card>
        ) : filteredSystems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">No equipment systems yet</p>
              <p className="text-sm">Create your first system to bundle connected equipment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSystems.map((system) => (
              <Card key={system.systemId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{system.systemName}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge>{system.systemType.replace(/_/g, ' ').toUpperCase()}</Badge>
                        <Badge variant="outline">{system.connectedEquipment.length} Equipment</Badge>
                      </div>
                    </div>
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(system)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {system.description && (
                    <p className="text-sm text-muted-foreground mb-3">{system.description}</p>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Connected Equipment:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {system.connectedEquipment.map((eq, idx) => (
                        <div key={idx} className="text-sm border rounded-lg p-2">
                          <div className="font-medium">{eq.equipmentId}</div>
                          <div className="text-xs text-muted-foreground">{eq.role.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
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
