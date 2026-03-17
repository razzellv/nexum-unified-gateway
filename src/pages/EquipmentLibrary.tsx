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
import { Plus, Search, Edit, Settings, Loader2, Send } from 'lucide-react';
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
  baseline?: any;
  equipmentName?: string;
}

const cleanText = (text: string) => {
  if (!text) return 'N/A';
  return text.replace(/\*\*/g, '').replace(/™/g, '').replace(/®/g, '').split('(')[0].trim() || 'N/A';
};

const equipmentTypes = [
  'boiler','chiller','pump','ahu','cooling_tower','fan','vav',
  'air_handler','heat_exchanger','compressor','condenser','evaporator',
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
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Role gating ──────────────────────────────────────────────────────────────
  const role = user?.role?.toLowerCase() || '';
  const canEdit = ['admin', 'executive', 'manager'].includes(role);
  const isEngineer = role === 'engineer';
  const canRequest = isEngineer; // engineers submit requests, not direct adds

  const [formData, setFormData] = useState({
    equipmentType: '', manufacturer: '', model: '', serialNumber: '',
    location: '', installDate: '', buildingId: '', status: 'active', equipmentName: '',
  });

  const [requestReason, setRequestReason] = useState('');

  const [baselineData, setBaselineData] = useState<any>({
    mawp:'', capacity:'', minTemp:'', maxTemp:'', efficiency:'', firingRate:'',
    tons:'', kwPerTon:'', minChilledTemp:'', maxChilledTemp:'',
    minCondenserTemp:'', maxCondenserTemp:'', refrigerant:'',
    gpm:'', head:'', motorHp:'', operatingPressure:'',
    cfm:'', staticPressure:'', supplyTemp:'', returnTemp:'',
    fanHp:'', approachTemp:'', rangeTemp:'', notes:'',
  });

  useEffect(() => {
  loadEquipment();
}, [user?.facilityId]);

  const loadEquipment = async () => {
    if (!user?.facilityId) return;
    try {
      setLoading(true);
      const data = await apiRequest(`/equipment?facility_id=${user.facilityId}`);
      setEquipment(data.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      toast({ title: 'Error', description: 'Failed to load equipment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.equipmentType || !formData.manufacturer || !formData.model) {
      toast({ title: 'Validation Error', description: 'Equipment type, manufacturer, and model are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest('/equipment', { method: 'POST', body: JSON.stringify(formData) });
      toast({ title: 'Success', description: 'Equipment added successfully' });
      setAddDialogOpen(false);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add equipment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAdd = async () => {
    if (!formData.equipmentType || !formData.manufacturer || !formData.model) {
      toast({ title: 'Validation Error', description: 'Equipment type, manufacturer, and model are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      // Log as a facility log entry for manager review
      const token = localStorage.getItem('nexum_access_token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/facility-log-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: `Equipment Add Request: ${formData.equipmentType} — ${formData.manufacturer} ${formData.model}`,
          notes: requestReason || 'Engineer-submitted equipment addition request pending manager approval.',
          logType: 'equipment_request',
          facilityId: user?.facilityId,
          submittedBy: user?.name || user?.email,
          requestData: formData,
          requiresApproval: true,
        }),
      });
      toast({ title: 'Request submitted', description: 'Your equipment addition request has been sent for manager approval.' });
      setRequestDialogOpen(false);
      setRequestReason('');
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to submit request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEquipment) return;
    try {
      setSubmitting(true);
      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT', body: JSON.stringify(formData),
      });
      toast({ title: 'Success', description: 'Equipment updated successfully' });
      setEditDialogOpen(false);
      setSelectedEquipment(null);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update equipment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!selectedEquipment) return;
    try {
      setSubmitting(true);
      const baseline: any = { notes: baselineData.notes || undefined };
      if (selectedEquipment.equipmentType === 'boiler') {
        baseline.mawp = baselineData.mawp ? parseFloat(baselineData.mawp) : undefined;
        baseline.capacity = baselineData.capacity ? parseFloat(baselineData.capacity) : undefined;
        baseline.minTemp = baselineData.minTemp ? parseFloat(baselineData.minTemp) : undefined;
        baseline.maxTemp = baselineData.maxTemp ? parseFloat(baselineData.maxTemp) : undefined;
        baseline.efficiency = baselineData.efficiency ? parseFloat(baselineData.efficiency) : undefined;
        baseline.firingRate = baselineData.firingRate ? parseFloat(baselineData.firingRate) : undefined;
      } else if (selectedEquipment.equipmentType === 'chiller') {
        baseline.tons = baselineData.tons ? parseFloat(baselineData.tons) : undefined;
        baseline.kwPerTon = baselineData.kwPerTon ? parseFloat(baselineData.kwPerTon) : undefined;
        baseline.minChilledTemp = baselineData.minChilledTemp ? parseFloat(baselineData.minChilledTemp) : undefined;
        baseline.maxChilledTemp = baselineData.maxChilledTemp ? parseFloat(baselineData.maxChilledTemp) : undefined;
        baseline.minCondenserTemp = baselineData.minCondenserTemp ? parseFloat(baselineData.minCondenserTemp) : undefined;
        baseline.maxCondenserTemp = baselineData.maxCondenserTemp ? parseFloat(baselineData.maxCondenserTemp) : undefined;
        baseline.refrigerant = baselineData.refrigerant || undefined;
      } else if (selectedEquipment.equipmentType === 'pump') {
        baseline.gpm = baselineData.gpm ? parseFloat(baselineData.gpm) : undefined;
        baseline.head = baselineData.head ? parseFloat(baselineData.head) : undefined;
        baseline.motorHp = baselineData.motorHp ? parseFloat(baselineData.motorHp) : undefined;
        baseline.operatingPressure = baselineData.operatingPressure ? parseFloat(baselineData.operatingPressure) : undefined;
      } else if (['ahu','air_handler'].includes(selectedEquipment.equipmentType)) {
        baseline.cfm = baselineData.cfm ? parseFloat(baselineData.cfm) : undefined;
        baseline.staticPressure = baselineData.staticPressure ? parseFloat(baselineData.staticPressure) : undefined;
        baseline.supplyTemp = baselineData.supplyTemp ? parseFloat(baselineData.supplyTemp) : undefined;
        baseline.returnTemp = baselineData.returnTemp ? parseFloat(baselineData.returnTemp) : undefined;
      } else if (selectedEquipment.equipmentType === 'cooling_tower') {
        baseline.gpm = baselineData.gpm ? parseFloat(baselineData.gpm) : undefined;
        baseline.fanHp = baselineData.fanHp ? parseFloat(baselineData.fanHp) : undefined;
        baseline.approachTemp = baselineData.approachTemp ? parseFloat(baselineData.approachTemp) : undefined;
        baseline.rangeTemp = baselineData.rangeTemp ? parseFloat(baselineData.rangeTemp) : undefined;
      }
      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT', body: JSON.stringify({ baseline }),
      });
      toast({ title: 'Success', description: 'Baseline saved successfully' });
      setBaselineDialogOpen(false);
      setSelectedEquipment(null);
      resetBaselineForm();
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save baseline', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setFormData({
      equipmentType: eq.equipmentType, manufacturer: eq.manufacturer, model: eq.model,
      serialNumber: eq.serialNumber || '', location: eq.location || '',
      installDate: eq.installDate || '', buildingId: eq.buildingId || '',
      status: eq.status || 'active', equipmentName: eq.equipmentName || '',
    });
    setEditDialogOpen(true);
  };

  const openBaselineDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    if (eq.baseline) {
      setBaselineData({
        ...baselineData, ...eq.baseline,
        mawp: eq.baseline.mawp?.toString() || '', capacity: eq.baseline.capacity?.toString() || '',
        minTemp: eq.baseline.minTemp?.toString() || '', maxTemp: eq.baseline.maxTemp?.toString() || '',
        efficiency: eq.baseline.efficiency?.toString() || '', firingRate: eq.baseline.firingRate?.toString() || '',
        tons: eq.baseline.tons?.toString() || '', kwPerTon: eq.baseline.kwPerTon?.toString() || '',
        minChilledTemp: eq.baseline.minChilledTemp?.toString() || '', maxChilledTemp: eq.baseline.maxChilledTemp?.toString() || '',
        minCondenserTemp: eq.baseline.minCondenserTemp?.toString() || '', maxCondenserTemp: eq.baseline.maxCondenserTemp?.toString() || '',
        refrigerant: eq.baseline.refrigerant || '', gpm: eq.baseline.gpm?.toString() || '',
        head: eq.baseline.head?.toString() || '', motorHp: eq.baseline.motorHp?.toString() || '',
        operatingPressure: eq.baseline.operatingPressure?.toString() || '', cfm: eq.baseline.cfm?.toString() || '',
        staticPressure: eq.baseline.staticPressure?.toString() || '', supplyTemp: eq.baseline.supplyTemp?.toString() || '',
        returnTemp: eq.baseline.returnTemp?.toString() || '', fanHp: eq.baseline.fanHp?.toString() || '',
        approachTemp: eq.baseline.approachTemp?.toString() || '', rangeTemp: eq.baseline.rangeTemp?.toString() || '',
        notes: eq.baseline.notes || '',
      });
    } else { resetBaselineForm(); }
    setBaselineDialogOpen(true);
  };

  const resetForm = () => setFormData({
    equipmentType:'', manufacturer:'', model:'', serialNumber:'',
    location:'', installDate:'', buildingId:'', status:'active', equipmentName:'',
  });

  const resetBaselineForm = () => setBaselineData({
    mawp:'', capacity:'', minTemp:'', maxTemp:'', efficiency:'', firingRate:'',
    tons:'', kwPerTon:'', minChilledTemp:'', maxChilledTemp:'',
    minCondenserTemp:'', maxCondenserTemp:'', refrigerant:'',
    gpm:'', head:'', motorHp:'', operatingPressure:'',
    cfm:'', staticPressure:'', supplyTemp:'', returnTemp:'',
    fanHp:'', approachTemp:'', rangeTemp:'', notes:'',
  });

  const filteredEquipment = equipment.filter(eq =>
    eq.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Shared form fields ────────────────────────────────────────────────────────
  const EquipmentFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Equipment Type *</Label>
          <Select value={formData.equipmentType} onValueChange={v => setFormData({ ...formData, equipmentType: v })}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {equipmentTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="decommissioned">Decommissioned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Equipment Name/Nickname</Label>
        <Input value={formData.equipmentName} onChange={e => setFormData({ ...formData, equipmentName: e.target.value })} placeholder="e.g., Main Boiler, Chiller #1" />
        <p className="text-xs text-muted-foreground">Optional: Give this equipment a friendly name</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Manufacturer *</Label><Input value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} placeholder="e.g., Trane" /></div>
        <div className="space-y-2"><Label>Model *</Label><Input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., RTAC-150" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Serial Number</Label><Input value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} /></div>
        <div className="space-y-2"><Label>Install Date</Label><Input type="date" value={formData.installDate} onChange={e => setFormData({ ...formData, installDate: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Mechanical Room 2" /></div>
        <div className="space-y-2"><Label>Building ID</Label><Input value={formData.buildingId} onChange={e => setFormData({ ...formData, buildingId: e.target.value })} placeholder="e.g., BLDG-A" /></div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Library</h1>
            <p className="text-muted-foreground">Manage facility equipment and baselines</p>
          </div>
          <div className="flex gap-2">
            {/* Direct add — admin/executive/manager only */}
            {canEdit && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Equipment</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Equipment</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <EquipmentFormFields />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
                      <Button onClick={handleAdd} disabled={submitting}>
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Equipment
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Request add — engineer only */}
            {canRequest && (
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Send className="w-4 h-4 mr-2" />Request Equipment Add</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Request Equipment Addition</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
                      This request will be sent to your manager for approval before the equipment is added.
                    </div>
                    <EquipmentFormFields />
                    <div className="space-y-2">
                      <Label>Reason for Addition</Label>
                      <Textarea
                        value={requestReason}
                        onChange={e => setRequestReason(e.target.value)}
                        placeholder="Explain why this equipment needs to be added to the library..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setRequestDialogOpen(false); resetForm(); setRequestReason(''); }} disabled={submitting}>Cancel</Button>
                      <Button onClick={handleRequestAdd} disabled={submitting}>
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Send className="w-4 h-4 mr-2" />Submit Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search equipment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="outline">{filteredEquipment.length} items</Badge>
        </div>

        {loading ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Loading equipment...
          </CardContent></Card>
        ) : filteredEquipment.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            No equipment found. {canEdit ? 'Add your first equipment to get started.' : canRequest ? 'Submit a request to add equipment.' : ''}
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filteredEquipment.map((eq) => (
              <Card key={eq.equipmentId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{eq.equipmentName || eq.equipmentId}</h3>
                        <Badge>{eq.equipmentType?.replace(/_/g, ' ').toUpperCase()}</Badge>
                        {eq.status && <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>{eq.status}</Badge>}
                        {eq.baseline && <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Baseline Set</Badge>}
                      </div>
                      {eq.equipmentName && <p className="text-xs text-muted-foreground font-mono mb-1">ID: {eq.equipmentId}</p>}
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
                        <Button variant="outline" size="sm" onClick={() => openBaselineDialog(eq)}>
                          <Settings className="w-4 h-4 mr-2" />{eq.baseline ? 'Edit Baseline' : 'Set Baseline'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(eq)}>
                          <Edit className="w-4 h-4 mr-2" />Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <EquipmentFormFields />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedEquipment(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button onClick={handleEdit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
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
                Set Equipment Baseline — {selectedEquipment?.equipmentName || selectedEquipment?.equipmentId}
                <Badge className="ml-2" variant="outline">{selectedEquipment?.equipmentType?.toUpperCase()}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Set baseline operational parameters. Used for performance comparison and anomaly detection.</p>

              {selectedEquipment?.equipmentType === 'boiler' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>MAWP (PSI) *</Label><Input type="number" step="0.1" value={baselineData.mawp} onChange={e => setBaselineData({...baselineData, mawp: e.target.value})} placeholder="e.g., 150" /></div>
                    <div className="space-y-2"><Label>Capacity (MBH)</Label><Input type="number" step="1" value={baselineData.capacity} onChange={e => setBaselineData({...baselineData, capacity: e.target.value})} placeholder="e.g., 5000" /></div>
                    <div className="space-y-2"><Label>Min Operating Temp (°F)</Label><Input type="number" step="1" value={baselineData.minTemp} onChange={e => setBaselineData({...baselineData, minTemp: e.target.value})} placeholder="e.g., 140" /></div>
                    <div className="space-y-2"><Label>Max Operating Temp (°F)</Label><Input type="number" step="1" value={baselineData.maxTemp} onChange={e => setBaselineData({...baselineData, maxTemp: e.target.value})} placeholder="e.g., 200" /></div>
                    <div className="space-y-2"><Label>Combustion Efficiency (%)</Label><Input type="number" step="0.1" value={baselineData.efficiency} onChange={e => setBaselineData({...baselineData, efficiency: e.target.value})} placeholder="e.g., 82.5" /></div>
                    <div className="space-y-2"><Label>Max Firing Rate (MBH)</Label><Input type="number" step="1" value={baselineData.firingRate} onChange={e => setBaselineData({...baselineData, firingRate: e.target.value})} placeholder="e.g., 5500" /></div>
                  </div>
                </div>
              )}

              {selectedEquipment?.equipmentType === 'chiller' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Capacity (Tons) *</Label><Input type="number" step="0.1" value={baselineData.tons} onChange={e => setBaselineData({...baselineData, tons: e.target.value})} placeholder="e.g., 400" /></div>
                    <div className="space-y-2"><Label>kW/Ton (Efficiency)</Label><Input type="number" step="0.01" value={baselineData.kwPerTon} onChange={e => setBaselineData({...baselineData, kwPerTon: e.target.value})} placeholder="e.g., 0.58" /></div>
                    <div className="space-y-2"><Label>Min Chilled Water Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.minChilledTemp} onChange={e => setBaselineData({...baselineData, minChilledTemp: e.target.value})} placeholder="e.g., 42" /></div>
                    <div className="space-y-2"><Label>Max Chilled Water Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.maxChilledTemp} onChange={e => setBaselineData({...baselineData, maxChilledTemp: e.target.value})} placeholder="e.g., 54" /></div>
                    <div className="space-y-2"><Label>Min Condenser Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.minCondenserTemp} onChange={e => setBaselineData({...baselineData, minCondenserTemp: e.target.value})} placeholder="e.g., 75" /></div>
                    <div className="space-y-2"><Label>Max Condenser Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.maxCondenserTemp} onChange={e => setBaselineData({...baselineData, maxCondenserTemp: e.target.value})} placeholder="e.g., 95" /></div>
                    <div className="col-span-2 space-y-2"><Label>Refrigerant Type</Label><Input value={baselineData.refrigerant} onChange={e => setBaselineData({...baselineData, refrigerant: e.target.value})} placeholder="e.g., R-134a" /></div>
                  </div>
                </div>
              )}

              {selectedEquipment?.equipmentType === 'pump' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Flow Rate (GPM) *</Label><Input type="number" step="1" value={baselineData.gpm} onChange={e => setBaselineData({...baselineData, gpm: e.target.value})} placeholder="e.g., 500" /></div>
                  <div className="space-y-2"><Label>Head (Feet)</Label><Input type="number" step="0.1" value={baselineData.head} onChange={e => setBaselineData({...baselineData, head: e.target.value})} placeholder="e.g., 100" /></div>
                  <div className="space-y-2"><Label>Motor HP</Label><Input type="number" step="0.1" value={baselineData.motorHp} onChange={e => setBaselineData({...baselineData, motorHp: e.target.value})} placeholder="e.g., 15" /></div>
                  <div className="space-y-2"><Label>Operating Pressure (PSI)</Label><Input type="number" step="0.1" value={baselineData.operatingPressure} onChange={e => setBaselineData({...baselineData, operatingPressure: e.target.value})} placeholder="e.g., 50" /></div>
                </div>
              )}

              {['ahu','air_handler'].includes(selectedEquipment?.equipmentType || '') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Airflow (CFM) *</Label><Input type="number" step="1" value={baselineData.cfm} onChange={e => setBaselineData({...baselineData, cfm: e.target.value})} placeholder="e.g., 10000" /></div>
                  <div className="space-y-2"><Label>Static Pressure (in. w.c.)</Label><Input type="number" step="0.01" value={baselineData.staticPressure} onChange={e => setBaselineData({...baselineData, staticPressure: e.target.value})} placeholder="e.g., 1.5" /></div>
                  <div className="space-y-2"><Label>Supply Air Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.supplyTemp} onChange={e => setBaselineData({...baselineData, supplyTemp: e.target.value})} placeholder="e.g., 55" /></div>
                  <div className="space-y-2"><Label>Return Air Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.returnTemp} onChange={e => setBaselineData({...baselineData, returnTemp: e.target.value})} placeholder="e.g., 72" /></div>
                </div>
              )}

              {selectedEquipment?.equipmentType === 'cooling_tower' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Flow Rate (GPM) *</Label><Input type="number" step="1" value={baselineData.gpm} onChange={e => setBaselineData({...baselineData, gpm: e.target.value})} placeholder="e.g., 1200" /></div>
                  <div className="space-y-2"><Label>Fan HP</Label><Input type="number" step="0.1" value={baselineData.fanHp} onChange={e => setBaselineData({...baselineData, fanHp: e.target.value})} placeholder="e.g., 25" /></div>
                  <div className="space-y-2"><Label>Approach Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.approachTemp} onChange={e => setBaselineData({...baselineData, approachTemp: e.target.value})} placeholder="e.g., 7" /></div>
                  <div className="space-y-2"><Label>Range Temp (°F)</Label><Input type="number" step="0.1" value={baselineData.rangeTemp} onChange={e => setBaselineData({...baselineData, rangeTemp: e.target.value})} placeholder="e.g., 10" /></div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={baselineData.notes} onChange={e => setBaselineData({...baselineData, notes: e.target.value})} placeholder="Add any relevant notes about baseline conditions, source documents (Certificate of Inspection), or operational context..." rows={3} />
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <strong>Note:</strong> Baseline values should come from Certificate of Inspection (nameplate MAWP, capacity), manufacturer specifications, or verified operational readings under normal conditions.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setBaselineDialogOpen(false); setSelectedEquipment(null); resetBaselineForm(); }} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSaveBaseline} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Baseline
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
