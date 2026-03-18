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
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

// ── Grouped equipment types ────────────────────────────────────────────────────
const equipmentTypeGroups = [
  {
    label: 'HVAC',
    types: ['boiler', 'chiller', 'ahu', 'air_handler', 'cooling_tower', 'fan', 'vav'],
  },
  {
    label: 'Mechanical',
    types: ['heat_exchanger', 'hot_water_heater', 'turbine', 'condenser', 'evaporator'],
  },
  {
    label: 'Steam & Condensate',
    types: ['condensate_system'],
  },
  {
    label: 'Water Treatment',
    types: ['ro_system', 'wfi_system', 'water_softener'],
  },
  {
    label: 'Medical & Lab',
    types: ['autoclave'],
  },
  {
    label: 'Pumping',
    types: ['pump', 'compressor'],
  },
  {
    label: 'Cogeneration & Electrical',
    types: ['generator'],
  },
];

const formatTypeName = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

  const role = user?.role?.toLowerCase() || '';
  const canEdit = ['admin', 'executive', 'manager'].includes(role);
  const isEngineer = role === 'engineer';
  const canRequest = isEngineer;

  const [formData, setFormData] = useState({
    equipmentType: '', manufacturer: '', model: '', serialNumber: '',
    location: '', installDate: '', buildingId: '', status: 'active', equipmentName: '',
  });

  const [requestReason, setRequestReason] = useState('');

  const emptyBaseline = {
    // Boiler
    mawp: '', capacity: '', minTemp: '', maxTemp: '', efficiency: '', firingRate: '',
    // Chiller
    tons: '', kwPerTon: '', minChilledTemp: '', maxChilledTemp: '',
    minCondenserTemp: '', maxCondenserTemp: '', refrigerant: '',
    // Pump
    gpm: '', head: '', motorHp: '', operatingPressure: '',
    // AHU
    cfm: '', staticPressure: '', supplyTemp: '', returnTemp: '',
    // Cooling Tower
    fanHp: '', approachTemp: '', rangeTemp: '',
    // Heat Exchanger
    htxType: '', primaryFluid: '', secondaryFluid: '',
    designPrimaryTempIn: '', designPrimaryTempOut: '',
    designSecondaryTempIn: '', designSecondaryTempOut: '',
    surfaceArea: '', heatDuty: '',
    // Hot Water Heater
    heaterType: '', fuelType: '', tankCapacity: '', inputBTU: '',
    setpointTemp: '', verifiedFlow: '', blowdownFrequency: '',
    // Turbine
    turbineType: '', ratedRPM: '', ratedKW: '',
    steamPressureIn: '', steamPressureOut: '', steamTempIn: '',
    // Condensate System
    tankCapacityGal: '', returnLineSize: '', conductivity: '',
    // Generator
    generatorType: '', generatorFuelType: '', ratedKWGen: '', ratedKVA: '',
    voltage: '', frequency: '', phases: '', autoTransferSwitch: '',
    // RO System
    feedFlow: '', productFlow: '', rejectFlow: '',
    feedTDS: '', productTDS: '', recoveryRate: '',
    membraneCount: '', membraneType: '',
    // WFI System
    distillationType: '', productionRate: '', storageCapacity: '',
    distributionTemp: '', wfiConductivity: '', endotoxinLimit: '',
    // Autoclave
    chamberSize: '', maxPressure: '', maxTempAutoclave: '',
    cycleType: '', steamSource: '',
    // Shared
    notes: '',
  };

  const [baselineData, setBaselineData] = useState<any>(emptyBaseline);

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
      const type = selectedEquipment.equipmentType;
      const n = (k: string) => baselineData[k] ? parseFloat(baselineData[k]) : undefined;
      const s = (k: string) => baselineData[k] || undefined;

      let baseline: any = { notes: s('notes') };

      if (type === 'boiler') {
        Object.assign(baseline, { mawp: n('mawp'), capacity: n('capacity'), minTemp: n('minTemp'), maxTemp: n('maxTemp'), efficiency: n('efficiency'), firingRate: n('firingRate') });
      } else if (type === 'chiller') {
        Object.assign(baseline, { tons: n('tons'), kwPerTon: n('kwPerTon'), minChilledTemp: n('minChilledTemp'), maxChilledTemp: n('maxChilledTemp'), minCondenserTemp: n('minCondenserTemp'), maxCondenserTemp: n('maxCondenserTemp'), refrigerant: s('refrigerant') });
      } else if (type === 'pump') {
        Object.assign(baseline, { gpm: n('gpm'), head: n('head'), motorHp: n('motorHp'), operatingPressure: n('operatingPressure') });
      } else if (['ahu', 'air_handler'].includes(type)) {
        Object.assign(baseline, { cfm: n('cfm'), staticPressure: n('staticPressure'), supplyTemp: n('supplyTemp'), returnTemp: n('returnTemp') });
      } else if (type === 'cooling_tower') {
        Object.assign(baseline, { gpm: n('gpm'), fanHp: n('fanHp'), approachTemp: n('approachTemp'), rangeTemp: n('rangeTemp') });
      } else if (type === 'heat_exchanger') {
        Object.assign(baseline, { htxType: s('htxType'), primaryFluid: s('primaryFluid'), secondaryFluid: s('secondaryFluid'), designPrimaryTempIn: n('designPrimaryTempIn'), designPrimaryTempOut: n('designPrimaryTempOut'), designSecondaryTempIn: n('designSecondaryTempIn'), designSecondaryTempOut: n('designSecondaryTempOut'), surfaceArea: n('surfaceArea'), heatDuty: n('heatDuty') });
      } else if (type === 'hot_water_heater') {
        Object.assign(baseline, { heaterType: s('heaterType'), fuelType: s('fuelType'), tankCapacity: n('tankCapacity'), inputBTU: n('inputBTU'), setpointTemp: n('setpointTemp'), verifiedFlow: n('verifiedFlow'), blowdownFrequency: s('blowdownFrequency') });
      } else if (type === 'turbine') {
        Object.assign(baseline, { turbineType: s('turbineType'), ratedRPM: n('ratedRPM'), ratedKW: n('ratedKW'), steamPressureIn: n('steamPressureIn'), steamPressureOut: n('steamPressureOut'), steamTempIn: n('steamTempIn') });
      } else if (type === 'condensate_system') {
        Object.assign(baseline, { tankCapacity: n('tankCapacityGal'), returnLineSize: s('returnLineSize'), conductivity: n('conductivity') });
      } else if (type === 'generator') {
        Object.assign(baseline, { generatorType: s('generatorType'), fuelType: s('generatorFuelType'), ratedKW: n('ratedKWGen'), ratedKVA: n('ratedKVA'), voltage: n('voltage'), frequency: n('frequency'), phases: s('phases'), autoTransferSwitch: s('autoTransferSwitch') });
      } else if (type === 'ro_system') {
        Object.assign(baseline, { feedFlow: n('feedFlow'), productFlow: n('productFlow'), rejectFlow: n('rejectFlow'), feedTDS: n('feedTDS'), productTDS: n('productTDS'), recoveryRate: n('recoveryRate'), membraneCount: n('membraneCount'), membraneType: s('membraneType') });
      } else if (type === 'wfi_system') {
        Object.assign(baseline, { distillationType: s('distillationType'), productionRate: n('productionRate'), storageCapacity: n('storageCapacity'), distributionTemp: n('distributionTemp'), conductivity: n('wfiConductivity'), endotoxinLimit: n('endotoxinLimit') });
      } else if (type === 'autoclave') {
        Object.assign(baseline, { chamberSize: n('chamberSize'), maxPressure: n('maxPressure'), maxTemp: n('maxTempAutoclave'), cycleType: s('cycleType'), steamSource: s('steamSource') });
      }

      // Strip undefined keys before sending
      Object.keys(baseline).forEach(k => baseline[k] === undefined && delete baseline[k]);

      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT', body: JSON.stringify({ baseline }),
      });
      toast({ title: 'Success', description: 'Baseline saved successfully' });
      setBaselineDialogOpen(false);
      setSelectedEquipment(null);
      setBaselineData(emptyBaseline);
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
    const b = eq.baseline || {};
    const t = (v: any) => v?.toString() || '';
    setBaselineData({
      ...emptyBaseline,
      mawp: t(b.mawp), capacity: t(b.capacity), minTemp: t(b.minTemp), maxTemp: t(b.maxTemp),
      efficiency: t(b.efficiency), firingRate: t(b.firingRate),
      tons: t(b.tons), kwPerTon: t(b.kwPerTon), minChilledTemp: t(b.minChilledTemp),
      maxChilledTemp: t(b.maxChilledTemp), minCondenserTemp: t(b.minCondenserTemp),
      maxCondenserTemp: t(b.maxCondenserTemp), refrigerant: b.refrigerant || '',
      gpm: t(b.gpm), head: t(b.head), motorHp: t(b.motorHp), operatingPressure: t(b.operatingPressure),
      cfm: t(b.cfm), staticPressure: t(b.staticPressure), supplyTemp: t(b.supplyTemp), returnTemp: t(b.returnTemp),
      fanHp: t(b.fanHp), approachTemp: t(b.approachTemp), rangeTemp: t(b.rangeTemp),
      htxType: b.htxType || '', primaryFluid: b.primaryFluid || '', secondaryFluid: b.secondaryFluid || '',
      designPrimaryTempIn: t(b.designPrimaryTempIn), designPrimaryTempOut: t(b.designPrimaryTempOut),
      designSecondaryTempIn: t(b.designSecondaryTempIn), designSecondaryTempOut: t(b.designSecondaryTempOut),
      surfaceArea: t(b.surfaceArea), heatDuty: t(b.heatDuty),
      heaterType: b.heaterType || '', fuelType: b.fuelType || '',
      tankCapacity: t(b.tankCapacity), inputBTU: t(b.inputBTU),
      setpointTemp: t(b.setpointTemp), verifiedFlow: t(b.verifiedFlow),
      blowdownFrequency: b.blowdownFrequency || '',
      turbineType: b.turbineType || '', ratedRPM: t(b.ratedRPM), ratedKW: t(b.ratedKW),
      steamPressureIn: t(b.steamPressureIn), steamPressureOut: t(b.steamPressureOut), steamTempIn: t(b.steamTempIn),
      tankCapacityGal: t(b.tankCapacity), returnLineSize: b.returnLineSize || '', conductivity: t(b.conductivity),
      generatorType: b.generatorType || '', generatorFuelType: b.fuelType || '',
      ratedKWGen: t(b.ratedKW), ratedKVA: t(b.ratedKVA),
      voltage: t(b.voltage), frequency: t(b.frequency), phases: b.phases || '',
      autoTransferSwitch: b.autoTransferSwitch || '',
      feedFlow: t(b.feedFlow), productFlow: t(b.productFlow), rejectFlow: t(b.rejectFlow),
      feedTDS: t(b.feedTDS), productTDS: t(b.productTDS), recoveryRate: t(b.recoveryRate),
      membraneCount: t(b.membraneCount), membraneType: b.membraneType || '',
      distillationType: b.distillationType || '', productionRate: t(b.productionRate),
      storageCapacity: t(b.storageCapacity), distributionTemp: t(b.distributionTemp),
      wfiConductivity: t(b.conductivity), endotoxinLimit: t(b.endotoxinLimit),
      chamberSize: t(b.chamberSize), maxPressure: t(b.maxPressure),
      maxTempAutoclave: t(b.maxTemp), cycleType: b.cycleType || '', steamSource: b.steamSource || '',
      notes: b.notes || '',
    });
    setBaselineDialogOpen(true);
  };

  const resetForm = () => setFormData({
    equipmentType: '', manufacturer: '', model: '', serialNumber: '',
    location: '', installDate: '', buildingId: '', status: 'active', equipmentName: '',
  });

  const filteredEquipment = equipment.filter(eq =>
    eq.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bd = baselineData;
  const setBD = (k: string, v: string) => setBaselineData((prev: any) => ({ ...prev, [k]: v }));

  // ── Grouped type selector ────────────────────────────────────────────────────
  const EquipmentTypeSelect = () => (
    <Select value={formData.equipmentType} onValueChange={v => setFormData(f => ({ ...f, equipmentType: v }))}>
      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
      <SelectContent>
        {equipmentTypeGroups.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              {group.label}
            </SelectLabel>
            {group.types.map(t => (
              <SelectItem key={t} value={t}>{formatTypeName(t)}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );

  // ── Shared add/edit form fields ──────────────────────────────────────────────
  const EquipmentFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Equipment Type *</Label>
          <EquipmentTypeSelect />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
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
        <Input value={formData.equipmentName} onChange={e => setFormData(f => ({ ...f, equipmentName: e.target.value }))} placeholder="e.g., Main Boiler, Chiller #1" />
        <p className="text-xs text-muted-foreground">Optional: Give this equipment a friendly name</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Manufacturer *</Label><Input value={formData.manufacturer} onChange={e => setFormData(f => ({ ...f, manufacturer: e.target.value }))} placeholder="e.g., Trane" /></div>
        <div className="space-y-2"><Label>Model *</Label><Input value={formData.model} onChange={e => setFormData(f => ({ ...f, model: e.target.value }))} placeholder="e.g., RTAC-150" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Serial Number</Label><Input value={formData.serialNumber} onChange={e => setFormData(f => ({ ...f, serialNumber: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Install Date</Label><Input type="date" value={formData.installDate} onChange={e => setFormData(f => ({ ...f, installDate: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Mechanical Room 2" /></div>
        <div className="space-y-2"><Label>Building ID</Label><Input value={formData.buildingId} onChange={e => setFormData(f => ({ ...f, buildingId: e.target.value }))} placeholder="e.g., BLDG-A" /></div>
      </div>
    </div>
  );

  // ── Baseline fields by type ──────────────────────────────────────────────────
  const renderBaselineFields = () => {
    const type = selectedEquipment?.equipmentType;
    if (!type) return null;

    if (type === 'boiler') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>MAWP (PSI) *</Label><Input type="number" step="0.1" value={bd.mawp} onChange={e => setBD('mawp', e.target.value)} placeholder="150" /></div>
        <div className="space-y-2"><Label>Capacity (MBH)</Label><Input type="number" value={bd.capacity} onChange={e => setBD('capacity', e.target.value)} placeholder="5000" /></div>
        <div className="space-y-2"><Label>Min Operating Temp (°F)</Label><Input type="number" value={bd.minTemp} onChange={e => setBD('minTemp', e.target.value)} placeholder="140" /></div>
        <div className="space-y-2"><Label>Max Operating Temp (°F)</Label><Input type="number" value={bd.maxTemp} onChange={e => setBD('maxTemp', e.target.value)} placeholder="200" /></div>
        <div className="space-y-2"><Label>Combustion Efficiency (%)</Label><Input type="number" step="0.1" value={bd.efficiency} onChange={e => setBD('efficiency', e.target.value)} placeholder="82.5" /></div>
        <div className="space-y-2"><Label>Max Firing Rate (MBH)</Label><Input type="number" value={bd.firingRate} onChange={e => setBD('firingRate', e.target.value)} placeholder="5500" /></div>
      </div>
    );

    if (type === 'chiller') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Capacity (Tons) *</Label><Input type="number" step="0.1" value={bd.tons} onChange={e => setBD('tons', e.target.value)} placeholder="400" /></div>
        <div className="space-y-2"><Label>kW/Ton (Efficiency)</Label><Input type="number" step="0.01" value={bd.kwPerTon} onChange={e => setBD('kwPerTon', e.target.value)} placeholder="0.58" /></div>
        <div className="space-y-2"><Label>Min Chilled Water Temp (°F)</Label><Input type="number" step="0.1" value={bd.minChilledTemp} onChange={e => setBD('minChilledTemp', e.target.value)} placeholder="42" /></div>
        <div className="space-y-2"><Label>Max Chilled Water Temp (°F)</Label><Input type="number" step="0.1" value={bd.maxChilledTemp} onChange={e => setBD('maxChilledTemp', e.target.value)} placeholder="54" /></div>
        <div className="space-y-2"><Label>Min Condenser Temp (°F)</Label><Input type="number" step="0.1" value={bd.minCondenserTemp} onChange={e => setBD('minCondenserTemp', e.target.value)} placeholder="75" /></div>
        <div className="space-y-2"><Label>Max Condenser Temp (°F)</Label><Input type="number" step="0.1" value={bd.maxCondenserTemp} onChange={e => setBD('maxCondenserTemp', e.target.value)} placeholder="95" /></div>
        <div className="col-span-2 space-y-2"><Label>Refrigerant Type</Label><Input value={bd.refrigerant} onChange={e => setBD('refrigerant', e.target.value)} placeholder="e.g., R-134a" /></div>
      </div>
    );

    if (type === 'pump') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Flow Rate (GPM) *</Label><Input type="number" value={bd.gpm} onChange={e => setBD('gpm', e.target.value)} placeholder="500" /></div>
        <div className="space-y-2"><Label>Head (Feet)</Label><Input type="number" step="0.1" value={bd.head} onChange={e => setBD('head', e.target.value)} placeholder="100" /></div>
        <div className="space-y-2"><Label>Motor HP</Label><Input type="number" step="0.1" value={bd.motorHp} onChange={e => setBD('motorHp', e.target.value)} placeholder="15" /></div>
        <div className="space-y-2"><Label>Operating Pressure (PSI)</Label><Input type="number" step="0.1" value={bd.operatingPressure} onChange={e => setBD('operatingPressure', e.target.value)} placeholder="50" /></div>
      </div>
    );

    if (['ahu', 'air_handler'].includes(type)) return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Airflow (CFM) *</Label><Input type="number" value={bd.cfm} onChange={e => setBD('cfm', e.target.value)} placeholder="10000" /></div>
        <div className="space-y-2"><Label>Static Pressure (in. w.c.)</Label><Input type="number" step="0.01" value={bd.staticPressure} onChange={e => setBD('staticPressure', e.target.value)} placeholder="1.5" /></div>
        <div className="space-y-2"><Label>Supply Air Temp (°F)</Label><Input type="number" step="0.1" value={bd.supplyTemp} onChange={e => setBD('supplyTemp', e.target.value)} placeholder="55" /></div>
        <div className="space-y-2"><Label>Return Air Temp (°F)</Label><Input type="number" step="0.1" value={bd.returnTemp} onChange={e => setBD('returnTemp', e.target.value)} placeholder="72" /></div>
      </div>
    );

    if (type === 'cooling_tower') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Flow Rate (GPM) *</Label><Input type="number" value={bd.gpm} onChange={e => setBD('gpm', e.target.value)} placeholder="1200" /></div>
        <div className="space-y-2"><Label>Fan HP</Label><Input type="number" step="0.1" value={bd.fanHp} onChange={e => setBD('fanHp', e.target.value)} placeholder="25" /></div>
        <div className="space-y-2"><Label>Approach Temp (°F)</Label><Input type="number" step="0.1" value={bd.approachTemp} onChange={e => setBD('approachTemp', e.target.value)} placeholder="7" /></div>
        <div className="space-y-2"><Label>Range Temp (°F)</Label><Input type="number" step="0.1" value={bd.rangeTemp} onChange={e => setBD('rangeTemp', e.target.value)} placeholder="10" /></div>
      </div>
    );

    if (type === 'heat_exchanger') return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>HX Type</Label>
            <Select value={bd.htxType} onValueChange={v => setBD('htxType', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {['Shell & Tube', 'Plate & Frame', 'Brazed Plate', 'Double Pipe', 'Air Cooled'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Primary Fluid</Label><Input value={bd.primaryFluid} onChange={e => setBD('primaryFluid', e.target.value)} placeholder="e.g., Chilled Water" /></div>
          <div className="space-y-2"><Label>Secondary Fluid</Label><Input value={bd.secondaryFluid} onChange={e => setBD('secondaryFluid', e.target.value)} placeholder="e.g., Process Water" /></div>
          <div className="space-y-2"><Label>Surface Area (ft²)</Label><Input type="number" value={bd.surfaceArea} onChange={e => setBD('surfaceArea', e.target.value)} placeholder="250" /></div>
          <div className="space-y-2"><Label>Heat Duty (BTU/hr)</Label><Input type="number" value={bd.heatDuty} onChange={e => setBD('heatDuty', e.target.value)} placeholder="500000" /></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Design Temperatures (°F)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Primary In</Label><Input type="number" value={bd.designPrimaryTempIn} onChange={e => setBD('designPrimaryTempIn', e.target.value)} placeholder="180" /></div>
          <div className="space-y-2"><Label>Primary Out</Label><Input type="number" value={bd.designPrimaryTempOut} onChange={e => setBD('designPrimaryTempOut', e.target.value)} placeholder="140" /></div>
          <div className="space-y-2"><Label>Secondary In</Label><Input type="number" value={bd.designSecondaryTempIn} onChange={e => setBD('designSecondaryTempIn', e.target.value)} placeholder="120" /></div>
          <div className="space-y-2"><Label>Secondary Out</Label><Input type="number" value={bd.designSecondaryTempOut} onChange={e => setBD('designSecondaryTempOut', e.target.value)} placeholder="155" /></div>
        </div>
      </div>
    );

    if (type === 'hot_water_heater') return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Heater Type</Label>
            <Select value={bd.heaterType} onValueChange={v => setBD('heaterType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Storage', 'Tankless / Instantaneous', 'Heat Pump', 'Indirect', 'Solar Assisted', 'Steam to Water'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select value={bd.fuelType} onValueChange={v => setBD('fuelType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Natural Gas', 'Electric', 'Oil', 'Steam', 'Propane'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Tank Capacity (gal)</Label><Input type="number" value={bd.tankCapacity} onChange={e => setBD('tankCapacity', e.target.value)} placeholder="120" /></div>
          <div className="space-y-2"><Label>Input Rating (BTU/hr)</Label><Input type="number" value={bd.inputBTU} onChange={e => setBD('inputBTU', e.target.value)} placeholder="199000" /></div>
          <div className="space-y-2"><Label>Setpoint Temp (°F)</Label><Input type="number" value={bd.setpointTemp} onChange={e => setBD('setpointTemp', e.target.value)} placeholder="140" /></div>
          <div className="space-y-2">
            <Label>Verified Flow (GPM)</Label>
            <Input type="number" value={bd.verifiedFlow} onChange={e => setBD('verifiedFlow', e.target.value)} placeholder="Measured GPM" />
            <p className="text-xs text-muted-foreground">Measured — not rated</p>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Blowdown Frequency</Label>
            <Select value={bd.blowdownFrequency} onValueChange={v => setBD('blowdownFrequency', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'As Needed'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );

    if (type === 'turbine') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Turbine Type</Label>
          <Select value={bd.turbineType} onValueChange={v => setBD('turbineType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Steam – Back Pressure', 'Steam – Condensing', 'Gas', 'Micro', 'Combined Cycle'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Rated RPM</Label><Input type="number" value={bd.ratedRPM} onChange={e => setBD('ratedRPM', e.target.value)} placeholder="3600" /></div>
        <div className="space-y-2"><Label>Rated Output (kW)</Label><Input type="number" value={bd.ratedKW} onChange={e => setBD('ratedKW', e.target.value)} placeholder="1500" /></div>
        <div className="space-y-2"><Label>Inlet Steam Pressure (PSI)</Label><Input type="number" value={bd.steamPressureIn} onChange={e => setBD('steamPressureIn', e.target.value)} placeholder="600" /></div>
        <div className="space-y-2"><Label>Exhaust Steam Pressure (PSI)</Label><Input type="number" value={bd.steamPressureOut} onChange={e => setBD('steamPressureOut', e.target.value)} placeholder="15" /></div>
        <div className="space-y-2"><Label>Inlet Steam Temp (°F)</Label><Input type="number" value={bd.steamTempIn} onChange={e => setBD('steamTempIn', e.target.value)} placeholder="750" /></div>
      </div>
    );

    if (type === 'condensate_system') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Tank Capacity (gal)</Label><Input type="number" value={bd.tankCapacityGal} onChange={e => setBD('tankCapacityGal', e.target.value)} placeholder="500" /></div>
        <div className="space-y-2"><Label>Return Line Size (in)</Label><Input value={bd.returnLineSize} onChange={e => setBD('returnLineSize', e.target.value)} placeholder='e.g. 2"' /></div>
        <div className="space-y-2"><Label>Design Conductivity (µS/cm)</Label><Input type="number" step="0.1" value={bd.conductivity} onChange={e => setBD('conductivity', e.target.value)} placeholder="250" /></div>
      </div>
    );

    if (type === 'generator') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Generator Type</Label>
          <Select value={bd.generatorType} onValueChange={v => setBD('generatorType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Standby', 'Prime / Continuous', 'Cogeneration (CHP)', 'Micro-Turbine CHP', 'Fuel Cell CHP'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fuel Type</Label>
          <Select value={bd.generatorFuelType} onValueChange={v => setBD('generatorFuelType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Natural Gas', 'Diesel', 'Propane', 'Bi-Fuel', 'Hydrogen'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Rated Output (kW) *</Label><Input type="number" value={bd.ratedKWGen} onChange={e => setBD('ratedKWGen', e.target.value)} placeholder="750" /></div>
        <div className="space-y-2"><Label>Rated (kVA)</Label><Input type="number" value={bd.ratedKVA} onChange={e => setBD('ratedKVA', e.target.value)} placeholder="937" /></div>
        <div className="space-y-2"><Label>Voltage (V)</Label><Input type="number" value={bd.voltage} onChange={e => setBD('voltage', e.target.value)} placeholder="480" /></div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={bd.frequency} onValueChange={v => setBD('frequency', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="60">60 Hz</SelectItem>
              <SelectItem value="50">50 Hz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phases</Label>
          <Select value={bd.phases} onValueChange={v => setBD('phases', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Single Phase</SelectItem>
              <SelectItem value="3">Three Phase</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Auto Transfer Switch</Label>
          <Select value={bd.autoTransferSwitch} onValueChange={v => setBD('autoTransferSwitch', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );

    if (type === 'ro_system') return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Design Flows (GPM)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Feed Flow</Label><Input type="number" value={bd.feedFlow} onChange={e => setBD('feedFlow', e.target.value)} placeholder="100" /></div>
          <div className="space-y-2"><Label>Product Flow</Label><Input type="number" value={bd.productFlow} onChange={e => setBD('productFlow', e.target.value)} placeholder="75" /></div>
          <div className="space-y-2"><Label>Reject Flow</Label><Input type="number" value={bd.rejectFlow} onChange={e => setBD('rejectFlow', e.target.value)} placeholder="25" /></div>
          <div className="space-y-2"><Label>Design Recovery (%)</Label><Input type="number" value={bd.recoveryRate} onChange={e => setBD('recoveryRate', e.target.value)} placeholder="75" /></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Design Water Quality</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Feed TDS (ppm)</Label><Input type="number" value={bd.feedTDS} onChange={e => setBD('feedTDS', e.target.value)} placeholder="500" /></div>
          <div className="space-y-2"><Label>Product TDS (ppm)</Label><Input type="number" value={bd.productTDS} onChange={e => setBD('productTDS', e.target.value)} placeholder="15" /></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Membrane Configuration</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Membrane Count</Label><Input type="number" value={bd.membraneCount} onChange={e => setBD('membraneCount', e.target.value)} placeholder="6" /></div>
          <div className="space-y-2"><Label>Membrane Type / Size</Label><Input value={bd.membraneType} onChange={e => setBD('membraneType', e.target.value)} placeholder="e.g. 4040" /></div>
        </div>
      </div>
    );

    if (type === 'wfi_system') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Distillation Type</Label>
          <Select value={bd.distillationType} onValueChange={v => setBD('distillationType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Multi-Effect Distillation (MED)', 'Vapor Compression', 'Membrane-Based'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Production Rate (L/hr)</Label><Input type="number" value={bd.productionRate} onChange={e => setBD('productionRate', e.target.value)} placeholder="500" /></div>
        <div className="space-y-2"><Label>Storage Capacity (L)</Label><Input type="number" value={bd.storageCapacity} onChange={e => setBD('storageCapacity', e.target.value)} placeholder="5000" /></div>
        <div className="space-y-2"><Label>Distribution Temp (°C)</Label><Input type="number" value={bd.distributionTemp} onChange={e => setBD('distributionTemp', e.target.value)} placeholder="80" /></div>
        <div className="space-y-2"><Label>Design Conductivity (µS/cm)</Label><Input type="number" step="0.01" value={bd.wfiConductivity} onChange={e => setBD('wfiConductivity', e.target.value)} placeholder="0.8" /></div>
        <div className="space-y-2"><Label>Endotoxin Limit (EU/mL)</Label><Input type="number" step="0.01" value={bd.endotoxinLimit} onChange={e => setBD('endotoxinLimit', e.target.value)} placeholder="0.25" /></div>
      </div>
    );

    if (type === 'autoclave') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Chamber Size (L)</Label><Input type="number" value={bd.chamberSize} onChange={e => setBD('chamberSize', e.target.value)} placeholder="120" /></div>
        <div className="space-y-2"><Label>Max Pressure (PSI)</Label><Input type="number" value={bd.maxPressure} onChange={e => setBD('maxPressure', e.target.value)} placeholder="30" /></div>
        <div className="space-y-2"><Label>Max Temp (°F)</Label><Input type="number" value={bd.maxTempAutoclave} onChange={e => setBD('maxTempAutoclave', e.target.value)} placeholder="275" /></div>
        <div className="space-y-2">
          <Label>Primary Cycle Type</Label>
          <Select value={bd.cycleType} onValueChange={v => setBD('cycleType', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Gravity', 'Pre-Vacuum', 'Liquid', 'Bowie-Dick Test', 'Flash'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2"><Label>Steam Source</Label><Input value={bd.steamSource} onChange={e => setBD('steamSource', e.target.value)} placeholder="e.g. House steam, Self-generating" /></div>
      </div>
    );

    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No baseline configuration available for {formatTypeName(type)}.
      </p>
    );
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Library</h1>
            <p className="text-muted-foreground">Manage facility equipment and baselines</p>
          </div>
          <div className="flex gap-2">
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
            {canRequest && (
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Send className="w-4 h-4 mr-2" />Request Equipment Add</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Request Equipment Addition</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
                      This request will be sent to your manager for approval before the equipment is added.
                    </div>
                    <EquipmentFormFields />
                    <div className="space-y-2">
                      <Label>Reason for Addition</Label>
                      <Textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Explain why this equipment needs to be added..." rows={3} />
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
                        <Badge>{formatTypeName(eq.equipmentType)}</Badge>
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
                <Badge className="ml-2" variant="outline">{formatTypeName(selectedEquipment?.equipmentType || '')}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Set baseline operational parameters. Used for performance comparison and anomaly detection.
              </p>

              {renderBaselineFields()}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={bd.notes}
                  onChange={e => setBD('notes', e.target.value)}
                  placeholder="Add notes about baseline conditions, source documents (Certificate of Inspection), or operational context..."
                  rows={3}
                />
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <strong>Note:</strong> Baseline values should come from Certificate of Inspection, manufacturer specifications, or verified operational readings under normal conditions.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setBaselineDialogOpen(false); setSelectedEquipment(null); setBaselineData(emptyBaseline); }} disabled={submitting}>Cancel</Button>
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
