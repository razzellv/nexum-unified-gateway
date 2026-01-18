import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PumpFormData {
  vfdFrequency: string;
  motorSpeed: string;
  motorCurrent: string;
  motorVoltage: string;
  loadPercent: string;
  vibrationIndicator: string;
  sealLeakIndicator: string;
}

interface PumpFormProps {
  data: PumpFormData;
  onChange: (data: PumpFormData) => void;
  errors: Record<string, string>;
}

const vibrationColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  elevated: 'bg-warning/20 border-warning/50 text-warning',
  high: 'bg-destructive/20 border-destructive/50 text-destructive',
};

const sealColors = {
  none: 'bg-success/20 border-success/50 text-success',
  minor: 'bg-warning/20 border-warning/50 text-warning',
  significant: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function PumpForm({ data, onChange, errors }: PumpFormProps) {
  const updateField = (field: keyof PumpFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-pump/20">
          <Gauge className="h-4 w-4 text-pump" />
        </div>
        Pump / Compressor Operating Data
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="VFD Frequency"
          name="vfdFrequency"
          type="number"
          value={data.vfdFrequency}
          onChange={(v) => updateField('vfdFrequency', v)}
          required
          error={errors.vfdFrequency}
          unit="Hz"
          min={0}
          max={100}
          step={0.1}
          placeholder="60"
        />

        <FormField
          label="Motor Speed"
          name="motorSpeed"
          type="number"
          value={data.motorSpeed}
          onChange={(v) => updateField('motorSpeed', v)}
          required
          error={errors.motorSpeed}
          unit="RPM"
          min={0}
          max={5000}
          placeholder="1750"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Motor Current"
          name="motorCurrent"
          type="number"
          value={data.motorCurrent}
          onChange={(v) => updateField('motorCurrent', v)}
          required
          error={errors.motorCurrent}
          unit="Amps"
          min={0}
          max={1000}
          step={0.1}
          placeholder="45.5"
        />

        <FormField
          label="Motor Voltage"
          name="motorVoltage"
          type="number"
          value={data.motorVoltage}
          onChange={(v) => updateField('motorVoltage', v)}
          required
          error={errors.motorVoltage}
          unit="V"
          min={0}
          max={600}
          placeholder="480"
        />

        <FormField
          label="Load / Torque"
          name="loadPercent"
          type="number"
          value={data.loadPercent}
          onChange={(v) => updateField('loadPercent', v)}
          required
          error={errors.loadPercent}
          unit="%"
          min={0}
          max={100}
          placeholder="75"
        />
      </div>

      {/* Vibration Indicator */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Vibration / Noise Indicator <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'elevated', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateField('vibrationIndicator', level)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.vibrationIndicator === level
                  ? vibrationColors[level]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    level === 'normal' && 'bg-success',
                    level === 'elevated' && 'bg-warning',
                    level === 'high' && 'bg-destructive animate-pulse'
                  )}
                />
                {level}
              </div>
            </button>
          ))}
        </div>
        {errors.vibrationIndicator && (
          <p className="text-xs text-destructive">{errors.vibrationIndicator}</p>
        )}
      </div>

      {/* Seal/Leak Indicator */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Seal / Leak Indicator <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['none', 'minor', 'significant'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateField('sealLeakIndicator', level)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.sealLeakIndicator === level
                  ? sealColors[level]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {level === 'none' ? 'No Leaks' : level}
            </button>
          ))}
        </div>
        {errors.sealLeakIndicator && (
          <p className="text-xs text-destructive">{errors.sealLeakIndicator}</p>
        )}
      </div>
    </div>
  );
}

export const initialPumpData: PumpFormData = {
  vfdFrequency: '',
  motorSpeed: '',
  motorCurrent: '',
  motorVoltage: '',
  loadPercent: '',
  vibrationIndicator: '',
  sealLeakIndicator: '',
};

export function validatePumpForm(data: PumpFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.vfdFrequency) errors.vfdFrequency = 'Required';
  if (!data.motorSpeed) errors.motorSpeed = 'Required';
  if (!data.motorCurrent) errors.motorCurrent = 'Required';
  if (!data.motorVoltage) errors.motorVoltage = 'Required';
  if (!data.loadPercent) errors.loadPercent = 'Required';
  if (!data.vibrationIndicator) errors.vibrationIndicator = 'Required';
  if (!data.sealLeakIndicator) errors.sealLeakIndicator = 'Required';

  return errors;
}
