import { useState } from 'react';
import { saveMeter } from '@/lib/energy-engine';
import type { EnergyMeter, UtilityType, CommMethod } from '@/types/energy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Zap, Droplets, Flame, Wind, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const UTILITY_TYPES: { value: UtilityType; label: string }[] = [
  { value: 'electric',        label: 'Electric' },
  { value: 'water',           label: 'Water' },
  { value: 'natural_gas',     label: 'Natural Gas' },
  { value: 'steam',           label: 'Steam' },
  { value: 'condensate',      label: 'Condensate' },
  { value: 'fuel_oil',        label: 'Fuel Oil' },
  { value: 'diesel',          label: 'Diesel' },
  { value: 'propane',         label: 'Propane' },
  { value: 'chilled_water',   label: 'Chilled Water' },
  { value: 'hot_water',       label: 'Hot Water' },
  { value: 'compressed_air',  label: 'Compressed Air' },
  { value: 'ups',             label: 'UPS' },
  { value: 'generator_fuel',  label: 'Generator Fuel' },
  { value: 'solar_production',label: 'Solar Production' },
  { value: 'battery_storage', label: 'Battery Storage' },
  { value: 'power_quality',   label: 'Power Quality' },
  { value: 'demand_meter',    label: 'Demand Meter' },
  { value: 'submeter',        label: 'Submeter' },
];

const COMM_METHODS: CommMethod[] = ['BACnet', 'Modbus', 'API', 'Manual', 'SCADA', 'BMS'];

const UTILITY_UNITS: Partial<Record<UtilityType, string>> = {
  electric: 'kWh', water: 'gallons', natural_gas: 'therms', steam: 'lbs',
  condensate: 'lbs', fuel_oil: 'gallons', diesel: 'gallons', propane: 'gallons',
  chilled_water: 'ton-hrs', hot_water: 'MMBtu', compressed_air: 'SCF',
  ups: 'kWh', generator_fuel: 'gallons', solar_production: 'kWh',
  battery_storage: 'kWh', power_quality: 'kVAR', demand_meter: 'kW', submeter: 'kWh',
};

const UTILITY_ICON: Partial<Record<UtilityType, any>> = {
  electric: Zap, water: Droplets, natural_gas: Flame, steam: Wind,
  solar_production: Activity, ups: Activity, submeter: Activity,
};

const UTILITY_COLOR: Partial<Record<UtilityType, string>> = {
  electric: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  water:    'text-blue-400 border-blue-400/30 bg-blue-400/5',
  natural_gas: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  steam:    'text-purple-400 border-purple-400/30 bg-purple-400/5',
  solar_production: 'text-[#00FFE1] border-[#00FFE1]/30 bg-[#00FFE1]/5',
};

const BLANK_METER: Omit<EnergyMeter, 'meterId' | 'createdAt'> = {
  utilityType: 'electric', label: '', meterNumber: '', manufacturer: '',
  serialNumber: '', building: '', floor: '', mechanicalRoom: '',
  equipmentServed: '', utilityCompany: '', rateSchedule: '',
  meterMultiplier: 1, hasDemandCharges: false, touEnabled: false,
  billingCycle: 'monthly', commMethod: 'Manual',
  installationDate: '', calibrationDate: '', unit: 'kWh', active: true, notes: '',
};

interface Props {
  facilityId: string;
  meters: EnergyMeter[];
  onSaved: () => void;
}

export function MeterRegistry({ facilityId, meters, onSaved }: Props) {
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<EnergyMeter | null>(null);
  const [form, setForm]       = useState<typeof BLANK_METER>(BLANK_METER);

  function openNew() {
    setEditing(null);
    setForm({ ...BLANK_METER, unit: UTILITY_UNITS['electric'] || 'kWh' });
    setOpen(true);
  }
  function openEdit(m: EnergyMeter) {
    setEditing(m);
    setForm({ ...m });
    setOpen(true);
  }
  function set(k: string, v: any) {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'utilityType') updated.unit = UTILITY_UNITS[v as UtilityType] || '';
      return updated;
    });
  }
  function save() {
    const meter: EnergyMeter = {
      ...form,
      meterId:   editing?.meterId || `meter-${Date.now()}`,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    saveMeter(facilityId, meter);
    onSaved();
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{meters.length} registered meter{meters.length !== 1 ? 's' : ''}</div>
        </div>
        <Button size="sm" onClick={openNew} className="bg-[#00FFE1]/10 text-[#00FFE1] border border-[#00FFE1]/30 hover:bg-[#00FFE1]/20">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Meter
        </Button>
      </div>

      {meters.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-white/10 rounded-lg">
          No meters registered. Add your first meter to begin tracking utility data.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meters.map(m => {
            const Icon  = UTILITY_ICON[m.utilityType] || Activity;
            const color = UTILITY_COLOR[m.utilityType] || 'text-white border-white/20 bg-white/5';
            return (
              <Card key={m.meterId} className={cn('border cursor-pointer hover:border-[#00FFE1]/30 transition-all', color)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{m.label || m.meterNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn('text-[9px] px-1', color)}>
                        {UTILITY_TYPES.find(u => u.value === m.utilityType)?.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(m)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    {m.meterNumber && <div>Meter #: {m.meterNumber}</div>}
                    {m.building    && <div>Building: {m.building}{m.floor ? ` / ${m.floor}` : ''}</div>}
                    {m.utilityCompany && <div>Utility: {m.utilityCompany}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1">{m.commMethod}</Badge>
                      <Badge variant="outline" className="text-[9px] px-1">{m.unit}</Badge>
                      {!m.active && <Badge variant="outline" className="text-[9px] px-1 text-red-400">Inactive</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-white/10">
          <DialogHeader>
            <DialogTitle className="text-[#00FFE1]">{editing ? 'Edit Meter' : 'Register New Meter'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Display Label</Label>
              <Input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Main Building Electric" className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Utility Type</Label>
              <Select value={form.utilityType} onValueChange={v => set('utilityType', v)}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UTILITY_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Input value={form.unit} onChange={e => set('unit', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meter Number</Label>
              <Input value={form.meterNumber} onChange={e => set('meterNumber', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Serial Number</Label>
              <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Manufacturer</Label>
              <Input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meter Multiplier</Label>
              <Input type="number" value={form.meterMultiplier} onChange={e => set('meterMultiplier', parseFloat(e.target.value) || 1)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Building</Label>
              <Input value={form.building} onChange={e => set('building', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Floor / Zone</Label>
              <Input value={form.floor} onChange={e => set('floor', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mechanical Room</Label>
              <Input value={form.mechanicalRoom} onChange={e => set('mechanicalRoom', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Equipment Served</Label>
              <Input value={form.equipmentServed} onChange={e => set('equipmentServed', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Utility Company</Label>
              <Input value={form.utilityCompany} onChange={e => set('utilityCompany', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rate Schedule</Label>
              <Input value={form.rateSchedule} onChange={e => set('rateSchedule', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Communication Method</Label>
              <Select value={form.commMethod} onValueChange={v => set('commMethod', v)}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Billing Cycle</Label>
              <Select value={form.billingCycle} onValueChange={v => set('billingCycle', v)}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Installation Date</Label>
              <Input type="date" value={form.installationDate} onChange={e => set('installationDate', e.target.value)} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Calibration Date</Label>
              <Input type="date" value={form.calibrationDate} onChange={e => set('calibrationDate', e.target.value)} className="h-8 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} className="bg-[#00FFE1]/10 text-[#00FFE1] border border-[#00FFE1]/30 hover:bg-[#00FFE1]/20">
              {editing ? 'Update Meter' : 'Register Meter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
