import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Flame, Zap, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotWaterHeaterFormData {
  supplyTemp: string;
  returnTemp: string;
  setpointTemp: string;
  verifiedFlow: string;
  currentLoad: string;
  gasInput: string;
  blowdownPerformed: boolean;
  safetyStatus: string;
  // Energy
  runtimeHours: string;
  kwDraw: string;
}

interface HotWaterHeaterFormProps {
  data: HotWaterHeaterFormData;
  onChange: (data: HotWaterHeaterFormData) => void;
  errors: Record<string, string>;
}

const safetyStatusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  alert: 'bg-warning/20 border-warning/50 text-warning',
  lockout: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function HotWaterHeaterForm({ data, onChange, errors }: HotWaterHeaterFormProps) {
  const updateField = (field: keyof HotWaterHeaterFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  const deltaT =
    data.supplyTemp && data.returnTemp
      ? (Number(data.supplyTemp) - Number(data.returnTemp)).toFixed(1)
      : null;

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-orange-500/20">
          <Flame className="h-4 w-4 text-orange-400" />
        </div>
        Hot Water Heater Operating Data
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Supply Temp"
          name="supplyTemp"
          type="number"
          value={data.supplyTemp}
          onChange={(v) => updateField('supplyTemp', v)}
          required
          error={errors.supplyTemp}
          unit="°F"
          min={0}
          max={250}
          step={0.1}
          placeholder="120"
        />
        <FormField
          label="Return Temp"
          name="returnTemp"
          type="number"
          value={data.returnTemp}
          onChange={(v) => updateField('returnTemp', v)}
          required
          error={errors.returnTemp}
          unit="°F"
          min={0}
          max={250}
          step={0.1}
          placeholder="105"
        />
        {/* Auto ΔT */}
        <div className="input-group">
          <Label className="text-sm font-medium text-muted-foreground">Supply / Return ΔT</Label>
          <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
            <span className={cn('font-mono text-sm', deltaT ? 'text-foreground' : 'text-muted-foreground')}>
              {deltaT ? `${deltaT}°F` : '—'}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">Auto</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Setpoint Temp"
          name="setpointTemp"
          type="number"
          value={data.setpointTemp}
          onChange={(v) => updateField('setpointTemp', v)}
          required
          error={errors.setpointTemp}
          unit="°F"
          min={80}
          max={200}
          step={0.5}
          placeholder="120"
        />
        <FormField
          label="Verified Flow"
          name="verifiedFlow"
          type="number"
          value={data.verifiedFlow}
          onChange={(v) => updateField('verifiedFlow', v)}
          required
          error={errors.verifiedFlow}
          unit="GPM"
          min={0}
          step={0.1}
          placeholder="35"
          helperText="Measured GPM — not rated"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Current Load"
          name="currentLoad"
          type="number"
          value={data.currentLoad}
          onChange={(v) => updateField('currentLoad', v)}
          required
          error={errors.currentLoad}
          unit="%"
          min={0}
          max={100}
          placeholder="65"
        />
        <FormField
          label="Gas Input"
          name="gasInput"
          type="number"
          value={data.gasInput}
          onChange={(v) => updateField('gasInput', v)}
          unit="Therms/hr"
          min={0}
          step={0.01}
          placeholder="1.5"
          helperText="Leave blank if electric"
        />
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
            placeholder="18.0"
            icon={Timer}
          />
          <FormField
            label="Electric Draw"
            name="kwDraw"
            type="number"
            value={data.kwDraw}
            onChange={(v) => updateField('kwDraw', v)}
            unit="kW"
            min={0}
            step={0.1}
            placeholder="4.5"
            helperText="Controls & ignition draw"
          />
        </div>
      </div>

      {/* Safety Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Safety Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'alert', 'lockout'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('safetyStatus', status)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.safetyStatus === status
                  ? safetyStatusColors[status]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  status === 'normal' && 'bg-success',
                  status === 'alert' && 'bg-warning animate-pulse',
                  status === 'lockout' && 'bg-destructive animate-pulse'
                )} />
                {status}
              </div>
            </button>
          ))}
        </div>
        {errors.safetyStatus && <p className="text-xs text-destructive">{errors.safetyStatus}</p>}
      </div>

      {/* Blowdown */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
        <div>
          <p className="font-medium text-sm">Blowdown Performed</p>
          <p className="text-xs text-muted-foreground">Was blowdown completed this shift?</p>
        </div>
        <Switch
          checked={data.blowdownPerformed}
          onCheckedChange={(v) => updateField('blowdownPerformed', v)}
        />
      </div>
    </div>
  );
}

export const initialHotWaterHeaterData: HotWaterHeaterFormData = {
  supplyTemp: '',
  returnTemp: '',
  setpointTemp: '',
  verifiedFlow: '',
  currentLoad: '',
  gasInput: '',
  blowdownPerformed: false,
  safetyStatus: '',
  runtimeHours: '',
  kwDraw: '',
};

export function validateHotWaterHeaterForm(data: HotWaterHeaterFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.supplyTemp) errors.supplyTemp = 'Required';
  if (!data.returnTemp) errors.returnTemp = 'Required';
  if (!data.setpointTemp) errors.setpointTemp = 'Required';
  if (!data.verifiedFlow) errors.verifiedFlow = 'Required';
  if (!data.currentLoad) errors.currentLoad = 'Required';
  if (!data.safetyStatus) errors.safetyStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }
  if (data.supplyTemp && (Number(data.supplyTemp) < 0 || Number(data.supplyTemp) > 250)) {
    errors.supplyTemp = 'Must be 0-250°F';
  }
  if (data.returnTemp && (Number(data.returnTemp) < 0 || Number(data.returnTemp) > 250)) {
    errors.returnTemp = 'Must be 0-250°F';
  }
  if (data.currentLoad && (Number(data.currentLoad) < 0 || Number(data.currentLoad) > 100)) {
    errors.currentLoad = 'Must be 0-100%';
  }
  return errors;
}
