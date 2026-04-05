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
import { Plus, Search, Edit, Settings, Loader2, Send, Minus, BarChart3, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ImportModal } from '@/components/ImportModal';

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
  count?: number;
  purchasePrice?: number;
  replacementCost?: number;
  warrantyExpiry?: string;
}

const cleanText = (text: string) => {
  if (!text) return 'N/A';
  return text.replace(/\*\*/g, '').replace(/™/g, '').replace(/®/g, '').split('(')[0].trim() || 'N/A';
};

const equipmentTypeGroups = [
  { label: 'HVAC', types: ['boiler', 'chiller', 'ahu', 'air_handler', 'cooling_tower', 'fan', 'vav'] },
  { label: 'Mechanical', types: ['heat_exchanger', 'hot_water_heater', 'turbine', 'condenser', 'evaporator'] },
  { label: 'Steam & Condensate', types: ['condensate_system'] },
  { label: 'Water Treatment', types: ['ro_system', 'wfi_system', 'water_softener'] },
  { label: 'Medical & Lab', types: ['autoclave'] },
  { label: 'Pumping', types: ['pump', 'compressor'] },
  { label: 'Electrical & Power', types: ['generator', 'mpcc', 'ups', 'transformer', 'ats'] },
  { label: 'Production', types: ['conveyor', 'spiral_freezer', 'mixer', 'press', 'packaging_line'] },
  { label: 'Other', types: ['other'] },
];

const formatTypeName = (t: string) => {
  if (!t) return '';
  if (t === 'mpcc') return 'MPCC';
  if (t === 'ahu') return 'AHU';
  if (t === 'ats') return 'ATS';
  if (t === 'ups') return 'UPS';
  if (t === 'ro_system') return 'RO System';
  if (t === 'wfi_system') return 'WFI System';
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

function TypeSummary({ equipment }: { equipment: Equipment[] }) {
  const byType = equipment.reduce((acc, eq) => {
    const t = eq.equipmentType || 'other';
    if (!acc[t]) acc[t] = { total: 0, active: 0, withBaseline: 0 };
    acc[t].total += eq.count || 1;
    if (eq.status === 'active') acc[t].active += eq.count || 1;
    if (eq.baseline) acc[t].withBaseline += 1;
    return acc;
  }, {} as Record<string, { total: number; active: number; withBaseline: number }>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([type, stats]) => (
        <div key={type} className="glass-panel rounded-lg p-3 border border-border/30">
          <p className="text-xs font-semibold text-muted-foreground truncate">{formatTypeName(type)}</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{stats.active} active</Badge>
            {stats.withBaseline > 0 && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{stats.withBaseline} baselined</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [showSummary, setShowSummary] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [countAdjustments, setCountAdjustments] = useState<Record<string, number>>({});

  const role = user?.role?.toLowerCase() || '';
  const canEdit = ['admin', 'executive', 'manager'].includes(role);
  const canRequest = role === 'engineer';

  const [formData, setFormData] = useState({
    equipmentType: '', manufacturer: '', model: '', serialNumber: '',
    location: '', installDate: '', buildingId: '', status: 'active',
    equipmentName: '', count: '1',
    purchasePrice: '', replacementCost: '', warrantyExpiry: '',
  });
  const [requestReason, setRequestReason] = useState('');

  const emptyBaseline: any = {
    mawp: '', capacity: '', minTemp: '', maxTemp: '', efficiency: '', firingRate: '',
    tons: '', kwPerTon: '', minChilledTemp: '', maxChilledTemp: '', minCondenserTemp: '', maxCondenserTemp: '', refrigerant: '',
    gpm: '', head: '', motorHp: '', operatingPressure: '',
    cfm: '', staticPressure: '', supplyTemp: '', returnTemp: '',
    fanHp: '', approachTemp: '', rangeTemp: '',
    htxType: '', primaryFluid: '', secondaryFluid: '',
    designPrimaryTempIn: '', designPrimaryTempOut: '', designSecondaryTempIn: '', designSecondaryTempOut: '',
    surfaceArea: '', heatDuty: '',
    heaterType: '', fuelType: '', tankCapacity: '', inputBTU: '', setpointTemp: '', verifiedFlow: '', blowdownFrequency: '',
    turbineType: '', ratedRPM: '', ratedKW: '', steamPressureIn: '', steamPressureOut: '', steamTempIn: '',
    tankCapacityGal: '', returnLineSize: '', conductivity: '',
    generatorType: '', generatorFuelType: '', ratedKWGen: '', ratedKVA: '', voltage: '', frequency: '', phases: '', autoTransferSwitch: '',
    feedFlow: '', productFlow: '', rejectFlow: '', feedTDS: '', productTDS: '', recoveryRate: '', membraneCount: '', membraneType: '',
    distillationType: '', productionRate: '', storageCapacity: '', distributionTemp: '', wfiConductivity: '', endotoxinLimit: '',
    chamberSize: '', maxPressure: '', maxTempAutoclave: '', cycleType: '', steamSource: '',
    mpccVoltage: '', mpccAmps: '', mpccPhases: '', mpccBusbarRating: '', mpccIncomingFeeder: '',
    mpccBreakers: '', mpccProtectionType: '', mpccControlVoltage: '', mpccMeteringType: '',
    notes: '',
  };
  const [baselineData, setBaselineData] = useState<any>(emptyBaseline);

  useEffect(() => { loadEquipment(); }, [user?.facilityId]);

  const loadEquipment = async () => {
    if (!user?.facilityId) return;
    try {
      setLoading(true);
      const data = await apiRequest(`/equipment?facility_id=${user.facilityId}`);
      setEquipment(data.equipment || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load equipment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const adjustCount = async (eq: Equipment, delta: number) => {
    const current = countAdjustments[eq.equipmentId] ?? (eq.count || 1);
    const newCount = Math.max(1, current + delta);
    setCountAdjustments(prev => ({ ...prev, [eq.equipmentId]: newCount }));
    try {
      await apiRequest(`/equipment/${eq.equipmentId}`, { method: 'PUT', body: JSON.stringify({ count: newCount }) });
      toast({ title: 'Count updated', description: `${eq.equipmentName || eq.equipmentId}: ${newCount} unit${newCount !== 1 ? 's' : ''}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update count', variant: 'destructive' });
      setCountAdjustments(prev => ({ ...prev, [eq.equipmentId]: current }));
    }
  };

  const handleAdd = async () => {
    if (!formData.equipmentType || !formData.manufacturer || !formData.model) {
      toast({ title: 'Validation Error', description: 'Equipment type, manufacturer, and model are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest('/equipment', { method: 'POST', body: JSON.stringify({
        ...formData,
        count: parseInt(formData.count) || 1,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        replacementCost: formData.replacementCost ? parseFloat(formData.replacementCost) : undefined,
      }) });
      toast({ title: 'Success', description: 'Equipment added successfully' });
      setAddDialogOpen(false);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add equipment', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleRequestAdd = async () => {
    if (!formData.equipmentType || !formData.manufacturer || !formData.model) {
      toast({ title: 'Validation Error', description: 'Type, manufacturer, and model required', variant: 'destructive' });
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
          logType: 'equipment_request', facilityId: user?.facilityId,
          submittedBy: user?.name || user?.email, requestData: formData, requiresApproval: true,
        }),
      });
      toast({ title: 'Request submitted', description: 'Sent for manager approval.' });
      setRequestDialogOpen(false);
      setRequestReason('');
      resetForm();
    } catch {
      toast({ title: 'Error', description: 'Failed to submit request', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedEquipment) return;
    try {
      setSubmitting(true);
      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, {
        method: 'PUT', body: JSON.stringify({
          ...formData,
          count: parseInt(formData.count) || 1,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
          replacementCost: formData.replacementCost ? parseFloat(formData.replacementCost) : undefined,
        }),
      });
      toast({ title: 'Success', description: 'Equipment updated' });
      setEditDialogOpen(false);
      setSelectedEquipment(null);
      resetForm();
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleSaveBaseline = async () => {
    if (!selectedEquipment) return;
    try {
      setSubmitting(true);
      const type = selectedEquipment.equipmentType;
      const n = (k: string) => baselineData[k] ? parseFloat(baselineData[k]) : undefined;
      const s = (k: string) => baselineData[k] || undefined;
      let baseline: any = { notes: s('notes') };

      if (type === 'boiler') Object.assign(baseline, { mawp: n('mawp'), capacity: n('capacity'), minTemp: n('minTemp'), maxTemp: n('maxTemp'), efficiency: n('efficiency'), firingRate: n('firingRate') });
      else if (type === 'chiller') Object.assign(baseline, { tons: n('tons'), kwPerTon: n('kwPerTon'), minChilledTemp: n('minChilledTemp'), maxChilledTemp: n('maxChilledTemp'), minCondenserTemp: n('minCondenserTemp'), maxCondenserTemp: n('maxCondenserTemp'), refrigerant: s('refrigerant') });
      else if (type === 'pump') Object.assign(baseline, { gpm: n('gpm'), head: n('head'), motorHp: n('motorHp'), operatingPressure: n('operatingPressure') });
      else if (['ahu', 'air_handler'].includes(type)) Object.assign(baseline, { cfm: n('cfm'), staticPressure: n('staticPressure'), supplyTemp: n('supplyTemp'), returnTemp: n('returnTemp') });
      else if (type === 'cooling_tower') Object.assign(baseline, { gpm: n('gpm'), fanHp: n('fanHp'), approachTemp: n('approachTemp'), rangeTemp: n('rangeTemp') });
      else if (type === 'heat_exchanger') Object.assign(baseline, { htxType: s('htxType'), primaryFluid: s('primaryFluid'), secondaryFluid: s('secondaryFluid'), designPrimaryTempIn: n('designPrimaryTempIn'), designPrimaryTempOut: n('designPrimaryTempOut'), designSecondaryTempIn: n('designSecondaryTempIn'), designSecondaryTempOut: n('designSecondaryTempOut'), surfaceArea: n('surfaceArea'), heatDuty: n('heatDuty') });
      else if (type === 'hot_water_heater') Object.assign(baseline, { heaterType: s('heaterType'), fuelType: s('fuelType'), tankCapacity: n('tankCapacity'), inputBTU: n('inputBTU'), setpointTemp: n('setpointTemp'), verifiedFlow: n('verifiedFlow'), blowdownFrequency: s('blowdownFrequency') });
      else if (type === 'turbine') Object.assign(baseline, { turbineType: s('turbineType'), ratedRPM: n('ratedRPM'), ratedKW: n('ratedKW'), steamPressureIn: n('steamPressureIn'), steamPressureOut: n('steamPressureOut'), steamTempIn: n('steamTempIn') });
      else if (type === 'condensate_system') Object.assign(baseline, { tankCapacity: n('tankCapacityGal'), returnLineSize: s('returnLineSize'), conductivity: n('conductivity') });
      else if (type === 'generator') Object.assign(baseline, { generatorType: s('generatorType'), fuelType: s('generatorFuelType'), ratedKW: n('ratedKWGen'), ratedKVA: n('ratedKVA'), voltage: n('voltage'), frequency: n('frequency'), phases: s('phases'), autoTransferSwitch: s('autoTransferSwitch') });
      else if (type === 'ro_system') Object.assign(baseline, { feedFlow: n('feedFlow'), productFlow: n('productFlow'), rejectFlow: n('rejectFlow'), feedTDS: n('feedTDS'), productTDS: n('productTDS'), recoveryRate: n('recoveryRate'), membraneCount: n('membraneCount'), membraneType: s('membraneType') });
      else if (type === 'wfi_system') Object.assign(baseline, { distillationType: s('distillationType'), productionRate: n('productionRate'), storageCapacity: n('storageCapacity'), distributionTemp: n('distributionTemp'), conductivity: n('wfiConductivity'), endotoxinLimit: n('endotoxinLimit') });
      else if (type === 'autoclave') Object.assign(baseline, { chamberSize: n('chamberSize'), maxPressure: n('maxPressure'), maxTemp: n('maxTempAutoclave'), cycleType: s('cycleType'), steamSource: s('steamSource') });
      else if (type === 'mpcc') Object.assign(baseline, { voltage: n('mpccVoltage'), ampRating: n('mpccAmps'), phases: s('mpccPhases'), busbarRating: n('mpccBusbarRating'), incomingFeeder: s('mpccIncomingFeeder'), breakerCount: n('mpccBreakers'), protectionType: s('mpccProtectionType'), controlVoltage: s('mpccControlVoltage'), meteringType: s('mpccMeteringType') });

      Object.keys(baseline).forEach(k => baseline[k] === undefined && delete baseline[k]);
      await apiRequest(`/equipment/${selectedEquipment.equipmentId}`, { method: 'PUT', body: JSON.stringify({ baseline }) });
      toast({ title: 'Success', description: 'Baseline saved' });
      setBaselineDialogOpen(false);
      setSelectedEquipment(null);
      setBaselineData(emptyBaseline);
      loadEquipment();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save baseline', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const openEditDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setFormData({ equipmentType: eq.equipmentType, manufacturer: eq.manufacturer, model: eq.model, serialNumber: eq.serialNumber || '', location: eq.location || '', installDate: eq.installDate || '', buildingId: eq.buildingId || '', status: eq.status || 'active', equipmentName: eq.equipmentName || '', count: String(eq.count || 1), purchasePrice: eq.purchasePrice ? String(eq.purchasePrice) : '', replacementCost: eq.replacementCost ? String(eq.replacementCost) : '', warrantyExpiry: eq.warrantyExpiry || '' });
    setEditDialogOpen(true);
  };

  const openBaselineDialog = (eq: Equipment) => {
    setSelectedEquipment(eq);
    const b = eq.baseline || {};
    const t = (v: any) => v?.toString() || '';
    setBaselineData({ ...emptyBaseline, mawp: t(b.mawp), capacity: t(b.capacity), minTemp: t(b.minTemp), maxTemp: t(b.maxTemp), efficiency: t(b.efficiency), firingRate: t(b.firingRate), tons: t(b.tons), kwPerTon: t(b.kwPerTon), minChilledTemp: t(b.minChilledTemp), maxChilledTemp: t(b.maxChilledTemp), minCondenserTemp: t(b.minCondenserTemp), maxCondenserTemp: t(b.maxCondenserTemp), refrigerant: b.refrigerant || '', gpm: t(b.gpm), head: t(b.head), motorHp: t(b.motorHp), operatingPressure: t(b.operatingPressure), cfm: t(b.cfm), staticPressure: t(b.staticPressure), supplyTemp: t(b.supplyTemp), returnTemp: t(b.returnTemp), fanHp: t(b.fanHp), approachTemp: t(b.approachTemp), rangeTemp: t(b.rangeTemp), htxType: b.htxType || '', primaryFluid: b.primaryFluid || '', secondaryFluid: b.secondaryFluid || '', designPrimaryTempIn: t(b.designPrimaryTempIn), designPrimaryTempOut: t(b.designPrimaryTempOut), designSecondaryTempIn: t(b.designSecondaryTempIn), designSecondaryTempOut: t(b.designSecondaryTempOut), surfaceArea: t(b.surfaceArea), heatDuty: t(b.heatDuty), heaterType: b.heaterType || '', fuelType: b.fuelType || '', tankCapacity: t(b.tankCapacity), inputBTU: t(b.inputBTU), setpointTemp: t(b.setpointTemp), verifiedFlow: t(b.verifiedFlow), blowdownFrequency: b.blowdownFrequency || '', turbineType: b.turbineType || '', ratedRPM: t(b.ratedRPM), ratedKW: t(b.ratedKW), steamPressureIn: t(b.steamPressureIn), steamPressureOut: t(b.steamPressureOut), steamTempIn: t(b.steamTempIn), tankCapacityGal: t(b.tankCapacity), returnLineSize: b.returnLineSize || '', conductivity: t(b.conductivity), generatorType: b.generatorType || '', generatorFuelType: b.fuelType || '', ratedKWGen: t(b.ratedKW), ratedKVA: t(b.ratedKVA), voltage: t(b.voltage), frequency: t(b.frequency), phases: b.phases || '', autoTransferSwitch: b.autoTransferSwitch || '', feedFlow: t(b.feedFlow), productFlow: t(b.productFlow), rejectFlow: t(b.rejectFlow), feedTDS: t(b.feedTDS), productTDS: t(b.productTDS), recoveryRate: t(b.recoveryRate), membraneCount: t(b.membraneCount), membraneType: b.membraneType || '', distillationType: b.distillationType || '', productionRate: t(b.productionRate), storageCapacity: t(b.storageCapacity), distributionTemp: t(b.distributionTemp), wfiConductivity: t(b.conductivity), endotoxinLimit: t(b.endotoxinLimit), chamberSize: t(b.chamberSize), maxPressure: t(b.maxPressure), maxTempAutoclave: t(b.maxTemp), cycleType: b.cycleType || '', steamSource: b.steamSource || '', mpccVoltage: t(b.voltage), mpccAmps: t(b.ampRating), mpccPhases: b.phases || '', mpccBusbarRating: t(b.busbarRating), mpccIncomingFeeder: b.incomingFeeder || '', mpccBreakers: t(b.breakerCount), mpccProtectionType: b.protectionType || '', mpccControlVoltage: b.controlVoltage || '', mpccMeteringType: b.meteringType || '', notes: b.notes || '' });
    setBaselineDialogOpen(true);
  };

  const resetForm = () => setFormData({ equipmentType: '', manufacturer: '', model: '', serialNumber: '', location: '', installDate: '', buildingId: '', status: 'active', equipmentName: '', count: '1', purchasePrice: '', replacementCost: '', warrantyExpiry: '' });

  const filteredEquipment = equipment.filter(eq =>
    eq.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bd = baselineData;
  const setBD = (k: string, v: string) => setBaselineData((prev: any) => ({ ...prev, [k]: v }));

  const EquipmentTypeSelect = () => (
    <Select value={formData.equipmentType} onValueChange={v => setFormData(f => ({ ...f, equipmentType: v }))}>
      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
      <SelectContent>
        {equipmentTypeGroups.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">{group.label}</SelectLabel>
            {group.types.map(t => <SelectItem key={t} value={t}>{formatTypeName(t)}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );

  const EquipmentFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Equipment Type *</Label><EquipmentTypeSelect /></div>
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
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Equipment Name / Nickname</Label>
          <Input value={formData.equipmentName} onChange={e => setFormData(f => ({ ...f, equipmentName: e.target.value }))} placeholder="e.g., Main Boiler, Chiller #1" />
        </div>
        <div className="space-y-2">
          <Label>Count / Qty</Label>
          <Input type="number" min="1" value={formData.count} onChange={e => setFormData(f => ({ ...f, count: e.target.value }))} placeholder="1" />
        </div>
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
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Purchase Price ($)</Label><Input type="number" value={formData.purchasePrice} onChange={e => setFormData(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="125000" /></div>
        <div className="space-y-2"><Label>Replacement Cost ($)</Label><Input type="number" value={formData.replacementCost} onChange={e => setFormData(f => ({ ...f, replacementCost: e.target.value }))} placeholder="180000" /></div>
        <div className="space-y-2"><Label>Warranty Expiry</Label><Input type="date" value={formData.warrantyExpiry} onChange={e => setFormData(f => ({ ...f, warrantyExpiry: e.target.value }))} /></div>
      </div>
    </div>
  );

  const renderBaselineFields = () => {
    const type = selectedEquipment?.equipmentType;
    if (!type) return null;
    if (type === 'mpcc') return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
          <strong>MPCC — Main Power Control Centre</strong>: Critical low-voltage electrical distribution board that manages, distributes, and protects main electrical supply lines in industrial, commercial, and infrastructure facilities.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Voltage Rating (V) *</Label><Input type="number" value={bd.mpccVoltage} onChange={e => setBD('mpccVoltage', e.target.value)} placeholder="480" /></div>
          <div className="space-y-2"><Label>Amp Rating (A) *</Label><Input type="number" value={bd.mpccAmps} onChange={e => setBD('mpccAmps', e.target.value)} placeholder="2000" /></div>
          <div className="space-y-2">
            <Label>Phases</Label>
            <Select value={bd.mpccPhases} onValueChange={v => setBD('mpccPhases', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3-Phase</SelectItem>
                <SelectItem value="1">Single Phase</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Busbar Rating (A)</Label><Input type="number" value={bd.mpccBusbarRating} onChange={e => setBD('mpccBusbarRating', e.target.value)} placeholder="2500" /></div>
          <div className="space-y-2"><Label>Incoming Feeder Size</Label><Input value={bd.mpccIncomingFeeder} onChange={e => setBD('mpccIncomingFeeder', e.target.value)} placeholder='e.g. 4/0 AWG' /></div>
          <div className="space-y-2"><Label>Number of Breakers</Label><Input type="number" value={bd.mpccBreakers} onChange={e => setBD('mpccBreakers', e.target.value)} placeholder="24" /></div>
          <div className="space-y-2">
            <Label>Protection Type</Label>
            <Select value={bd.mpccProtectionType} onValueChange={v => setBD('mpccProtectionType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Thermal Magnetic', 'Electronic Trip', 'Motor Protection', 'Ground Fault', 'Arc Flash Protection'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Control Voltage</Label><Input value={bd.mpccControlVoltage} onChange={e => setBD('mpccControlVoltage', e.target.value)} placeholder="e.g. 120V AC, 24V DC" /></div>
          <div className="col-span-2 space-y-2">
            <Label>Metering Type</Label>
            <Select value={bd.mpccMeteringType} onValueChange={v => setBD('mpccMeteringType', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Digital Power Meter', 'Analog Meter', 'Revenue Grade Meter', 'Power Quality Analyzer', 'SCADA Integrated'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
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
        <div className="space-y-2"><Label>kW/Ton</Label><Input type="number" step="0.01" value={bd.kwPerTon} onChange={e => setBD('kwPerTon', e.target.value)} placeholder="0.58" /></div>
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
    return <p className="text-sm text-muted-foreground py-4 text-center">No baseline configuration available for {formatTypeName(type)}. Contact support to add baseline fields for this type.</p>;
  };

  const totalUnits = equipment.reduce((sum, eq) => sum + (countAdjustments[eq.equipmentId] ?? eq.count ?? 1), 0);
  const totalAssetValue = equipment.reduce((sum, eq) => sum + ((eq.replacementCost || eq.purchasePrice || 0) * (eq.count || 1)), 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Equipment Library</h1>
            <p className="text-muted-foreground text-sm">
              {equipment.length} equipment type{equipment.length !== 1 ? 's' : ''} · {totalUnits} total unit{totalUnits !== 1 ? 's' : ''}{totalAssetValue > 0 ? ` · Asset Value: $${totalAssetValue.toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowSummary(s => !s)}>
              <BarChart3 className="w-4 h-4 mr-2" />{showSummary ? 'Hide' : 'Show'} Summary
            </Button>
            {canEdit && (
              <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />Import
              </Button>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Equipment</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Equipment</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <EquipmentFormFields />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
                      <Button onClick={handleAdd} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Equipment</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
            {canRequest && (
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild><Button variant="outline"><Send className="w-4 h-4 mr-2" />Request Add</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Request Equipment Addition</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">This request will be sent to your manager for approval.</div>
                    <EquipmentFormFields />
                    <div className="space-y-2"><Label>Reason for Addition</Label><Textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Explain why..." rows={3} /></div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setRequestDialogOpen(false); resetForm(); setRequestReason(''); }} disabled={submitting}>Cancel</Button>
                      <Button onClick={handleRequestAdd} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Send className="w-4 h-4 mr-2" />Submit</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Type summary */}
        {showSummary && equipment.length > 0 && <TypeSummary equipment={equipment} />}

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search equipment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="outline">{filteredEquipment.length} result{filteredEquipment.length !== 1 ? 's' : ''}</Badge>
        </div>

        {/* Equipment list */}
        {loading ? (
          <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /><p className="text-muted-foreground">Loading equipment...</p></CardContent></Card>
        ) : filteredEquipment.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">No equipment found.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filteredEquipment.map((eq) => {
              const currentCount = countAdjustments[eq.equipmentId] ?? eq.count ?? 1;
              return (
                <Card key={eq.equipmentId}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                          {eq.replacementCost ? (
                            <p><strong>Value:</strong> ${eq.replacementCost.toLocaleString()} (replacement cost)</p>
                          ) : eq.purchasePrice ? (
                            <p><strong>Purchase Price:</strong> ${eq.purchasePrice.toLocaleString()}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Count toggle */}
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Units:</span>
                            <div className="flex items-center border border-border rounded-lg overflow-hidden">
                              <button onClick={() => adjustCount(eq, -1)} disabled={currentCount <= 1} className="px-2 py-1.5 hover:bg-muted/50 disabled:opacity-30 transition-colors">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 py-1.5 text-sm font-bold border-x border-border min-w-[2.5rem] text-center">{currentCount}</span>
                              <button onClick={() => adjustCount(eq, 1)} className="px-2 py-1.5 hover:bg-muted/50 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {canEdit && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openBaselineDialog(eq)}>
                                <Settings className="w-4 h-4 mr-2" />{eq.baseline ? 'Edit Baseline' : 'Set Baseline'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(eq)}>
                                <Edit className="w-4 h-4 mr-2" />Edit
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Baseline Dialog */}
        <Dialog open={baselineDialogOpen} onOpenChange={setBaselineDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Set Baseline — {selectedEquipment?.equipmentName || selectedEquipment?.equipmentId}
                <Badge variant="outline">{formatTypeName(selectedEquipment?.equipmentType || '')}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Set baseline operational parameters for performance comparison and anomaly detection.</p>
              {renderBaselineFields()}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={bd.notes} onChange={e => setBD('notes', e.target.value)} placeholder="Add notes about baseline conditions, source documents, or operational context..." rows={3} />
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <strong>Note:</strong> Baseline values should come from Certificate of Inspection, manufacturer specifications, or verified operational readings.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setBaselineDialogOpen(false); setSelectedEquipment(null); setBaselineData(emptyBaseline); }} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSaveBaseline} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Baseline</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Equipment Import Modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Equipment"
        storageKey="equipment_import"
        templateHeaders={[
          'equipmentName', 'equipmentType', 'manufacturer', 'model', 'serialNumber',
          'assetTag', 'assetNumber', 'location', 'building', 'installDate',
          'purchasePrice', 'replacementCost', 'warrantyExpiry', 'status', 'notes',
        ]}
        fields={[
          { key: 'equipmentName', label: 'Equipment Name', required: true },
          { key: 'equipmentType', label: 'Equipment Type', required: true },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model' },
          { key: 'serialNumber', label: 'Serial Number' },
          { key: 'assetTag', label: 'Asset Tag' },
          { key: 'assetNumber', label: 'Asset Number' },
          { key: 'location', label: 'Location' },
          { key: 'building', label: 'Building' },
          { key: 'installDate', label: 'Install Date' },
          { key: 'purchasePrice', label: 'Purchase Price' },
          { key: 'replacementCost', label: 'Replacement Cost' },
          { key: 'warrantyExpiry', label: 'Warranty Expiry' },
          { key: 'status', label: 'Status' },
          { key: 'notes', label: 'Notes' },
        ]}
        onImportRow={async (row) => {
          await apiRequest('/equipment', {
            method: 'POST',
            body: JSON.stringify({
              equipmentName: row.equipmentName,
              equipmentType: row.equipmentType,
              manufacturer: row.manufacturer || '',
              model: row.model || '',
              serialNumber: row.serialNumber || undefined,
              assetTag: row.assetTag || undefined,
              assetNumber: row.assetNumber || undefined,
              location: row.location || undefined,
              buildingId: row.building || undefined,
              installDate: row.installDate || undefined,
              purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : undefined,
              replacementCost: row.replacementCost ? parseFloat(row.replacementCost) : undefined,
              warrantyExpiry: row.warrantyExpiry || undefined,
              status: row.status || 'active',
              notes: row.notes || undefined,
              facilityId: user?.facilityId,
            }),
          });
          loadEquipment();
        }}
      />
    </MainLayout>
  );
}
