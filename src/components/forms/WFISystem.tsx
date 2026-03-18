import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Droplets, Timer, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WFISystemFormData {
  distributionTemp: string;
  storageTemp: string;
  conductivity: string;
  toc: string;
  productionRate: string;
  storageLevel: string;
  loopPressure: string;
  operationalStatus: string;
  sanitizationStatus: string;
  alarmStatus: string;
  // Energy
  runtimeHours: string;
  pumpKw: string;
  heaterKw: string;
}

interface WFISystemFormProps {
  data: WFISystemFormData;
  onChange: (data: WFISystemFormData) => void;
  errors: Record<string, string>;
}

const statusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  'out-of-spec': 'bg-destructive/20 border-destructive/50 text-destructive',
  sanitizing: 'bg-warning/20 border-warning/50 text-warning',
  offline: 'bg-muted border-border text-muted-foreground',
};

const sanitizationColors = {
  current: 'bg-success/20 border-success/50 text-success',
  due: 'bg-warning/20 border-warning/50 text-warning',
  overdue: 'bg-destructive/20 border-destructive/50 text-destructive',
  'in-progress': 'bg-primary/20 border-primary/50 text-primary',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function WFISystemForm({ data, onChange, errors }: WFISystemFormProps) {
  const updateField = (field: keyof WFISystemFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-chiller/20">
          <Droplets className="h-4 w-4 text-chiller" />
        </div>
        WFI System Operating Data
      </h3>

      {/* Quality Parameters */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Quality Parameters
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Conductivity"
            name="conductivity"
            type="number"
            value={data.conductivity}
            onChange={(v) => updateField('conductivity', v)}
            required
            error={errors.conductivity}
            unit="µS/cm"
            min={0}
            max={10}
            step={0.01}
            placeholder="0.8"
            helperText="USP limit ≤ 1.3 µS/cm @ 25°C"
          />
          <FormField
            label="TOC"
            name="toc"
            type="number"
            value={data.toc}
            onChange={(v) => updateField('toc', v)}
            required
            error={errors.toc}
            unit="ppb"
            min={0}
            max={500}
            step={0.1}
            placeholder="45"
            helperText="USP limit ≤ 500 ppb"
          />
        </div>
      </div>

      {/* Temperature & Flow */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Temperature & Flow
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Distribution Temp"
            name="distributionTemp"
            type="number"
            value={data.distributionTemp}
            onChange={(v) => updateField('distributionTemp', v)}
            required
            error={errors.distributionTemp}
            unit="°C"
            min={0}
            max={100}
            step={0.1}
            placeholder="80"
            helperText="Hot loop: ≥ 70°C"
          />
          <FormField
            label="Storage Temp"
            name="storageTemp"
            type="number"
            value={data.storageTemp}
            onChange={(v) => updateField('storageTemp', v)}
            required
            error={errors.storageTemp}
            unit="°C"
            min={0}
            max={100}
            step={0.1}
            placeholder="80"
          />
          <FormField
            label="Production Rate"
            name="productionRate"
            type="number"
            value={data.productionRate}
            onChange={(v) => updateField('productionRate', v)}
            unit="L/hr"
            min={0}
            max={100000}
            placeholder="500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FormField
            label="Storage Level"
            name="storageLevel"
            type="number"
            value={data.storageLevel}
            onChange={(v) => updateField('storageLevel', v)}
            required
            error={errors.storageLevel}
            unit="%"
            min={0}
            max={100}
            placeholder="65"
          />
          <FormField
            label="Loop Pressure"
            name="loopPressure"
            type="number"
            value={data.loopPressure}
            onChange={(v) => updateField('loopPressure', v)}
            required
            error={errors.loopPressure}
            unit="PSI"
            min={0}
            max={150}
            step={0.1}
            placeholder="25"
          />
        </div>
      </div>

      {/* Energy & Runtime */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          Energy & Runtime Data
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Runtime Hours"
            name="runtimeHours"
            type="number"
            value={data.runtimeHours}
            onChange={(v) => updateField('runtimeHours', v)}
            required
            error={errors.runtimeHours}
            unit="hrs"
            min={0}
            max={24}
            step={0.1}
            placeholder="24.0"
            icon={Timer}
          />
          <FormField
            label="Loop Pump Power"
            name="pumpKw"
            type="number"
            value={data.pumpKw}
            onChange={(v) => updateField('pumpKw', v)}
            unit="kW"
            min={0}
            max={100}
            step={0.1}
            placeholder="8.5"
            helperText="Circulation pump kW"
          />
          <FormField
            label="Heater Power"
            name="heaterKw"
            type="number"
            value={data.heaterKw}
            onChange={(v) => updateField('heaterKw', v)}
            unit="kW"
            min={0}
            max={500}
            step={0.1}
            placeholder="35.0"
            helperText="Still / heater kW draw"
          />
        </div>
      </div>

      {/* Sanitization Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Sanitization Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'current', label: 'Current' },
            { value: 'due', label: 'Due Soon' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'in-progress', label: 'In Progress' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('sanitizationStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.sanitizationStatus === s.value
                  ? sanitizationColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.sanitizationStatus && (
          <p className="text-xs text-destructive">{errors.sanitizationStatus}</p>
        )}
      </div>

      {/* Operational Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Operational Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'normal', label: 'Normal' },
            { value: 'out-of-spec', label: 'Out of Spec' },
            { value: 'sanitizing', label: 'Sanitizing' },
            { value: 'offline', label: 'Offline' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('operationalStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.operationalStatus === s.value
                  ? statusColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.operationalStatus && (
          <p className="text-xs text-destructive">{errors.operationalStatus}</p>
        )}
      </div>

      {/* Alarm Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Alarm Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'none', label: 'No Alarms' },
            { value: 'warning', label: 'Warning' },
            { value: 'alarm', label: 'Alarm' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('alarmStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.alarmStatus === s.value
                  ? alarmStatusColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.alarmStatus && (
          <p className="text-xs text-destructive">{errors.alarmStatus}</p>
        )}
      </div>
    </div>
  );
}

export const initialWFISystemData: WFISystemFormData = {
  distributionTemp: '',
  storageTemp: '',
  conductivity: '',
  toc: '',
  productionRate: '',
  storageLevel: '',
  loopPressure: '',
  operationalStatus: '',
  sanitizationStatus: '',
  alarmStatus: '',
  runtimeHours: '',
  pumpKw: '',
  heaterKw: '',
};

export function validateWFISystemForm(data: WFISystemFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.distributionTemp) errors.distributionTemp = 'Required';
  if (!data.storageTemp) errors.storageTemp = 'Required';
  if (!data.conductivity) errors.conductivity = 'Required';
  if (!data.toc) errors.toc = 'Required';
  if (!data.storageLevel) errors.storageLevel = 'Required';
  if (!data.loopPressure) errors.loopPressure = 'Required';
  if (!data.operationalStatus) errors.operationalStatus = 'Required';
  if (!data.sanitizationStatus) errors.sanitizationStatus = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.conductivity && Number(data.conductivity) > 1.3) {
    errors.conductivity = 'Exceeds USP limit of 1.3 µS/cm';
  }
  if (data.toc && Number(data.toc) > 500) {
    errors.toc = 'Exceeds USP limit of 500 ppb';
  }
  if (data.distributionTemp && Number(data.distributionTemp) < 70) {
    errors.distributionTemp = 'Hot loop must be ≥ 70°C';
  }
  if (data.storageLevel && (Number(data.storageLevel) < 0 || Number(data.storageLevel) > 100)) {
    errors.storageLevel = 'Must be 0-100%';
  }
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
