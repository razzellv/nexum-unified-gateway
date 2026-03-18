import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Droplets, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CondensateSystemFormData {
  waterLevel: string;
  tankTemperature: string;
  conductivity: string;
  returnFlowObservation: string;
  pumpStatus: string;
  alarmStatus: string;
  // Energy
  runtimeHours: string;
  pumpKw: string;
}

interface CondensateSystemFormProps {
  data: CondensateSystemFormData;
  onChange: (data: CondensateSystemFormData) => void;
  errors: Record<string, string>;
}

const waterLevelColors = {
  low: 'bg-destructive/20 border-destructive/50 text-destructive',
  normal: 'bg-success/20 border-success/50 text-success',
  high: 'bg-warning/20 border-warning/50 text-warning',
};

const pumpStatusColors = {
  active: 'bg-success/20 border-success/50 text-success',
  inactive: 'bg-muted border-border text-muted-foreground',
  standby: 'bg-primary/20 border-primary/50 text-primary',
  fault: 'bg-destructive/20 border-destructive/50 text-destructive',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
};

const returnFlowColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  reduced: 'bg-warning/20 border-warning/50 text-warning',
  none: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function CondensateSystemForm({ data, onChange, errors }: CondensateSystemFormProps) {
  const updateField = (field: keyof CondensateSystemFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-chiller/20">
          <Droplets className="h-4 w-4 text-chiller" />
        </div>
        Condensate System Operating Data
      </h3>

      {/* Tank Readings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Tank Temperature"
          name="tankTemperature"
          type="number"
          value={data.tankTemperature}
          onChange={(v) => updateField('tankTemperature', v)}
          required
          error={errors.tankTemperature}
          unit="°F"
          min={60}
          max={220}
          step={0.1}
          placeholder="180"
        />
        <FormField
          label="Conductivity"
          name="conductivity"
          type="number"
          value={data.conductivity}
          onChange={(v) => updateField('conductivity', v)}
          unit="µS/cm"
          min={0}
          max={5000}
          step={0.1}
          placeholder="250"
          helperText="Water quality indicator"
        />
      </div>

      {/* Water Level */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Water Level <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'normal', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateField('waterLevel', level)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.waterLevel === level
                  ? waterLevelColors[level]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  level === 'low' && 'bg-destructive animate-pulse',
                  level === 'normal' && 'bg-success',
                  level === 'high' && 'bg-warning',
                )} />
                {level}
              </div>
            </button>
          ))}
        </div>
        {errors.waterLevel && (
          <p className="text-xs text-destructive">{errors.waterLevel}</p>
        )}
      </div>

      {/* Return Flow Observation */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Return Flow <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'reduced', 'none'] as const).map((flow) => (
            <button
              key={flow}
              type="button"
              onClick={() => updateField('returnFlowObservation', flow)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.returnFlowObservation === flow
                  ? returnFlowColors[flow]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {flow === 'none' ? 'No Flow' : flow}
            </button>
          ))}
        </div>
        {errors.returnFlowObservation && (
          <p className="text-xs text-destructive">{errors.returnFlowObservation}</p>
        )}
      </div>

      {/* Pump Status */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Pump Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'standby', label: 'Standby' },
            { value: 'fault', label: 'Fault' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateField('pumpStatus', s.value)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm transition-all',
                data.pumpStatus === s.value
                  ? pumpStatusColors[s.value]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  s.value === 'active' && 'bg-success',
                  s.value === 'inactive' && 'bg-muted-foreground',
                  s.value === 'standby' && 'bg-primary',
                  s.value === 'fault' && 'bg-destructive animate-pulse',
                )} />
                {s.label}
              </div>
            </button>
          ))}
        </div>
        {errors.pumpStatus && (
          <p className="text-xs text-destructive">{errors.pumpStatus}</p>
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
            placeholder="20.0"
            icon={Timer}
          />
          <FormField
            label="Pump Power"
            name="pumpKw"
            type="number"
            value={data.pumpKw}
            onChange={(v) => updateField('pumpKw', v)}
            unit="kW"
            min={0}
            max={100}
            step={0.1}
            placeholder="3.5"
            helperText="Condensate pump motor kW"
          />
        </div>
      </div>
    </div>
  );
}

export const initialCondensateSystemData: CondensateSystemFormData = {
  waterLevel: '',
  tankTemperature: '',
  conductivity: '',
  returnFlowObservation: '',
  pumpStatus: '',
  alarmStatus: '',
  runtimeHours: '',
  pumpKw: '',
};

export function validateCondensateSystemForm(data: CondensateSystemFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.tankTemperature) errors.tankTemperature = 'Required';
  if (!data.waterLevel) errors.waterLevel = 'Required';
  if (!data.returnFlowObservation) errors.returnFlowObservation = 'Required';
  if (!data.pumpStatus) errors.pumpStatus = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.tankTemperature && (Number(data.tankTemperature) < 60 || Number(data.tankTemperature) > 220)) {
    errors.tankTemperature = 'Must be 60-220°F';
  }
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
