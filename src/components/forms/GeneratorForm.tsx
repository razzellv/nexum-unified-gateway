import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Zap, Timer, Battery } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratorFormData {
  runStatus: string;
  outputKw: string;
  voltage: string;
  frequency: string;
  fuelLevel: string;
  coolantTemp: string;
  oilPressure: string;
  transferSwitchStatus: string;
  alarmStatus: string;
  // Energy
  runtimeHours: string;
  fuelConsumed: string;
}

interface GeneratorFormProps {
  data: GeneratorFormData;
  onChange: (data: GeneratorFormData) => void;
  errors: Record<string, string>;
}

const runStatusColors = {
  'standby-ready': 'bg-success/20 border-success/50 text-success',
  'running-load': 'bg-primary/20 border-primary/50 text-primary',
  'running-test': 'bg-primary/20 border-primary/50 text-primary',
  fault: 'bg-destructive/20 border-destructive/50 text-destructive',
  offline: 'bg-muted border-border text-muted-foreground',
};

const transferStatusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  generator: 'bg-warning/20 border-warning/50 text-warning',
  test: 'bg-primary/20 border-primary/50 text-primary',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function GeneratorForm({ data, onChange, errors }: GeneratorFormProps) {
  const updateField = (field: keyof GeneratorFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-energy/20">
          <Battery className="h-4 w-4 text-energy" />
        </div>
        Generator / Cogeneration Operating Data
      </h3>

      {/* Electrical Output */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Electrical Output
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Output Power"
            name="outputKw"
            type="number"
            value={data.outputKw}
            onChange={(v) => updateField('outputKw', v)}
            required
            error={errors.outputKw}
            unit="kW"
            min={0}
            max={50000}
            step={0.1}
            placeholder="750"
          />
          <FormField
            label="Voltage"
            name="voltage"
            type="number"
            value={data.voltage}
            onChange={(v) => updateField('voltage', v)}
            required
            error={errors.voltage}
            unit="V"
            min={0}
            max={15000}
            placeholder="480"
          />
          <FormField
            label="Frequency"
            name="frequency"
            type="number"
            value={data.frequency}
            onChange={(v) => updateField('frequency', v)}
            required
            error={errors.frequency}
            unit="Hz"
            min={45}
            max={65}
            step={0.1}
            placeholder="60.0"
          />
        </div>
      </div>

      {/* Engine Vitals */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Engine Vitals
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Fuel Level"
            name="fuelLevel"
            type="number"
            value={data.fuelLevel}
            onChange={(v) => updateField('fuelLevel', v)}
            required
            error={errors.fuelLevel}
            unit="%"
            min={0}
            max={100}
            placeholder="85"
          />
          <FormField
            label="Coolant Temp"
            name="coolantTemp"
            type="number"
            value={data.coolantTemp}
            onChange={(v) => updateField('coolantTemp', v)}
            required
            error={errors.coolantTemp}
            unit="°F"
            min={0}
            max={300}
            step={0.1}
            placeholder="195"
          />
          <FormField
            label="Oil Pressure"
            name="oilPressure"
            type="number"
            value={data.oilPressure}
            onChange={(v) => updateField('oilPressure', v)}
            required
            error={errors.oilPressure}
            unit="PSI"
            min={0}
            max={200}
            step={0.1}
            placeholder="55"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            placeholder="8.0"
            icon={Timer}
          />
          <FormField
            label="Fuel Consumed"
            name="fuelConsumed"
            type="number"
            value={data.fuelConsumed}
            onChange={(v) => updateField('fuelConsumed', v)}
            unit="gal"
            min={0}
            step={0.1}
            placeholder="45.5"
            helperText="This shift / period"
          />
        </div>
      </div>

      {/* Run Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Run Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { value: 'standby-ready', label: 'Standby – Ready' },
            { value: 'running-load', label: 'Running – Load' },
            { value: 'running-test', label: 'Running – Test' },
            { value: 'fault', label: 'Fault' },
            { value: 'offline', label: 'Offline' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('runStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.runStatus === s.value
                  ? runStatusColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  s.value === 'standby-ready' && 'bg-success',
                  s.value === 'running-load' && 'bg-primary animate-pulse',
                  s.value === 'running-test' && 'bg-primary',
                  s.value === 'fault' && 'bg-destructive animate-pulse',
                  s.value === 'offline' && 'bg-muted-foreground',
                )} />
                {s.label}
              </div>
            </button>
          ))}
        </div>
        {errors.runStatus && (
          <p className="text-xs text-destructive">{errors.runStatus}</p>
        )}
      </div>

      {/* Transfer Switch Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Transfer Switch Position <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'normal', label: 'Normal (Utility)' },
            { value: 'generator', label: 'Generator' },
            { value: 'test', label: 'Test' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('transferSwitchStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.transferSwitchStatus === s.value
                  ? transferStatusColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.transferSwitchStatus && (
          <p className="text-xs text-destructive">{errors.transferSwitchStatus}</p>
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

export const initialGeneratorData: GeneratorFormData = {
  runStatus: '',
  outputKw: '',
  voltage: '',
  frequency: '',
  fuelLevel: '',
  coolantTemp: '',
  oilPressure: '',
  transferSwitchStatus: '',
  alarmStatus: '',
  runtimeHours: '',
  fuelConsumed: '',
};

export function validateGeneratorForm(data: GeneratorFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.runStatus) errors.runStatus = 'Required';
  if (!data.outputKw) errors.outputKw = 'Required';
  if (!data.voltage) errors.voltage = 'Required';
  if (!data.frequency) errors.frequency = 'Required';
  if (!data.fuelLevel) errors.fuelLevel = 'Required';
  if (!data.coolantTemp) errors.coolantTemp = 'Required';
  if (!data.oilPressure) errors.oilPressure = 'Required';
  if (!data.transferSwitchStatus) errors.transferSwitchStatus = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.fuelLevel && (Number(data.fuelLevel) < 0 || Number(data.fuelLevel) > 100)) {
    errors.fuelLevel = 'Must be 0-100%';
  }
  if (data.coolantTemp && (Number(data.coolantTemp) < 0 || Number(data.coolantTemp) > 300)) {
    errors.coolantTemp = 'Must be 0-300°F';
  }
  if (data.frequency && (Number(data.frequency) < 45 || Number(data.frequency) > 65)) {
    errors.frequency = 'Must be 45-65 Hz';
  }
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
