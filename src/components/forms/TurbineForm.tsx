import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wind, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TurbineFormData {
  rpmReading: string;
  outputKw: string;
  inletSteamPressure: string;
  exhaustPressure: string;
  inletSteamTemp: string;
  vibrationLevel: string;
  oilPressure: string;
  runStatus: string;
  alarmStatus: string;
  // Energy
  runtimeHours: string;
  steamFlowLbs: string;
}

interface TurbineFormProps {
  data: TurbineFormData;
  onChange: (data: TurbineFormData) => void;
  errors: Record<string, string>;
}

const runStatusColors = {
  running: 'bg-success/20 border-success/50 text-success',
  standby: 'bg-muted border-border text-muted-foreground',
  tripped: 'bg-destructive/20 border-destructive/50 text-destructive',
  offline: 'bg-destructive/20 border-destructive/50 text-destructive',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  watch: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
  trip: 'bg-destructive/30 border-destructive text-destructive',
};

const vibrationColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  elevated: 'bg-warning/20 border-warning/50 text-warning',
  high: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function TurbineForm({ data, onChange, errors }: TurbineFormProps) {
  const updateField = (field: keyof TurbineFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/20">
          <Wind className="h-4 w-4 text-primary" />
        </div>
        Turbine Operating Data
      </h3>

      {/* Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="RPM Reading"
          name="rpmReading"
          type="number"
          value={data.rpmReading}
          onChange={(v) => updateField('rpmReading', v)}
          required
          error={errors.rpmReading}
          unit="RPM"
          min={0}
          max={50000}
          placeholder="3600"
        />
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
          placeholder="1500"
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
          placeholder="25"
        />
      </div>

      {/* Steam Conditions */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Steam Conditions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Inlet Steam Pressure"
            name="inletSteamPressure"
            type="number"
            value={data.inletSteamPressure}
            onChange={(v) => updateField('inletSteamPressure', v)}
            required
            error={errors.inletSteamPressure}
            unit="PSI"
            min={0}
            max={2000}
            step={0.1}
            placeholder="600"
          />
          <FormField
            label="Exhaust Pressure"
            name="exhaustPressure"
            type="number"
            value={data.exhaustPressure}
            onChange={(v) => updateField('exhaustPressure', v)}
            required
            error={errors.exhaustPressure}
            unit="PSI"
            min={0}
            max={500}
            step={0.1}
            placeholder="15"
          />
          <FormField
            label="Inlet Steam Temp"
            name="inletSteamTemp"
            type="number"
            value={data.inletSteamTemp}
            onChange={(v) => updateField('inletSteamTemp', v)}
            required
            error={errors.inletSteamTemp}
            unit="°F"
            min={0}
            max={1200}
            step={0.1}
            placeholder="750"
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
            placeholder="12.0"
            icon={Timer}
          />
          <FormField
            label="Steam Flow"
            name="steamFlowLbs"
            type="number"
            value={data.steamFlowLbs}
            onChange={(v) => updateField('steamFlowLbs', v)}
            unit="lbs/hr"
            min={0}
            max={500000}
            placeholder="25000"
            helperText="Inlet steam mass flow"
          />
        </div>
      </div>

      {/* Vibration Level */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Vibration Level <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'elevated', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateField('vibrationLevel', level)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.vibrationLevel === level
                  ? vibrationColors[level]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  level === 'normal' && 'bg-success',
                  level === 'elevated' && 'bg-warning',
                  level === 'high' && 'bg-destructive animate-pulse',
                )} />
                {level}
              </div>
            </button>
          ))}
        </div>
        {errors.vibrationLevel && (
          <p className="text-xs text-destructive">{errors.vibrationLevel}</p>
        )}
      </div>

      {/* Run Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Run Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'running', label: 'Running' },
            { value: 'standby', label: 'Standby' },
            { value: 'tripped', label: 'Tripped' },
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
                  s.value === 'running' && 'bg-success',
                  s.value === 'standby' && 'bg-muted-foreground',
                  s.value === 'tripped' && 'bg-destructive animate-pulse',
                  s.value === 'offline' && 'bg-destructive',
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

      {/* Alarm Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Alarm Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'none', label: 'No Alarms' },
            { value: 'watch', label: 'Watch' },
            { value: 'alarm', label: 'Alarm' },
            { value: 'trip', label: 'Trip' },
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

export const initialTurbineData: TurbineFormData = {
  rpmReading: '',
  outputKw: '',
  inletSteamPressure: '',
  exhaustPressure: '',
  inletSteamTemp: '',
  vibrationLevel: '',
  oilPressure: '',
  runStatus: '',
  alarmStatus: '',
  runtimeHours: '',
  steamFlowLbs: '',
};

export function validateTurbineForm(data: TurbineFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.rpmReading) errors.rpmReading = 'Required';
  if (!data.outputKw) errors.outputKw = 'Required';
  if (!data.inletSteamPressure) errors.inletSteamPressure = 'Required';
  if (!data.exhaustPressure) errors.exhaustPressure = 'Required';
  if (!data.inletSteamTemp) errors.inletSteamTemp = 'Required';
  if (!data.vibrationLevel) errors.vibrationLevel = 'Required';
  if (!data.oilPressure) errors.oilPressure = 'Required';
  if (!data.runStatus) errors.runStatus = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }
  if (data.inletSteamTemp && (Number(data.inletSteamTemp) < 0 || Number(data.inletSteamTemp) > 1200)) {
    errors.inletSteamTemp = 'Must be 0-1200°F';
  }

  return errors;
}
