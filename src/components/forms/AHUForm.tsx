import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wind, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AHUFormData {
  supplyAirTemp: string;
  returnAirTemp: string;
  fanSpeed: string;
  filterStatus: string;
  damperPosition: string;
  occupancyMode: string;
  // ✅ NEW: Energy calculation fields
  runtimeHours: string;
  fanKw: string;
}

interface AHUFormProps {
  data: AHUFormData;
  onChange: (data: AHUFormData) => void;
  errors: Record<string, string>;
}

const filterStatusColors = {
  clean: 'bg-success/20 border-success/50 text-success',
  dirty: 'bg-warning/20 border-warning/50 text-warning',
  replace: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function AHUForm({ data, onChange, errors }: AHUFormProps) {
  const updateField = (field: keyof AHUFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-ahu/20">
          <Wind className="h-4 w-4 text-ahu" />
        </div>
        AHU / RTU Operating Data
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Supply Air Temp"
          name="supplyAirTemp"
          type="number"
          value={data.supplyAirTemp}
          onChange={(v) => updateField('supplyAirTemp', v)}
          required
          error={errors.supplyAirTemp}
          unit="°F"
          min={0}
          max={150}
          placeholder="55"
        />

        <FormField
          label="Return Air Temp"
          name="returnAirTemp"
          type="number"
          value={data.returnAirTemp}
          onChange={(v) => updateField('returnAirTemp', v)}
          required
          error={errors.returnAirTemp}
          unit="°F"
          min={0}
          max={150}
          placeholder="72"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Fan Speed"
          name="fanSpeed"
          type="number"
          value={data.fanSpeed}
          onChange={(v) => updateField('fanSpeed', v)}
          required
          error={errors.fanSpeed}
          unit="%"
          min={0}
          max={100}
          placeholder="75"
        />

        <FormField
          label="Damper Position"
          name="damperPosition"
          type="number"
          value={data.damperPosition}
          onChange={(v) => updateField('damperPosition', v)}
          required
          error={errors.damperPosition}
          unit="%"
          min={0}
          max={100}
          placeholder="50"
        />
      </div>

      {/* ✅ NEW: Energy & Runtime Section */}
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
            placeholder="16.5"
            icon={Timer}
            helperText="Hours of operation this shift"
          />

          <FormField
            label="Fan Power Draw"
            name="fanKw"
            type="number"
            value={data.fanKw}
            onChange={(v) => updateField('fanKw', v)}
            required
            error={errors.fanKw}
            unit="kW"
            min={0}
            max={100}
            step={0.1}
            placeholder="15.5"
            helperText="Current fan motor kW"
          />
        </div>
      </div>

      {/* Filter Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Filter Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['clean', 'dirty', 'replace'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('filterStatus', status)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.filterStatus === status
                  ? filterStatusColors[status]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {status}
            </button>
          ))}
        </div>
        {errors.filterStatus && (
          <p className="text-xs text-destructive">{errors.filterStatus}</p>
        )}
      </div>

      {/* Occupancy Mode */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Occupancy Mode <span className="text-destructive">*</span>
        </Label>
        <Select value={data.occupancyMode} onValueChange={(v) => updateField('occupancyMode', v)}>
          <SelectTrigger className={cn(errors.occupancyMode && 'border-destructive')}>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="unoccupied">Unoccupied</SelectItem>
            <SelectItem value="standby">Standby</SelectItem>
          </SelectContent>
        </Select>
        {errors.occupancyMode && (
          <p className="text-xs text-destructive">{errors.occupancyMode}</p>
        )}
      </div>
    </div>
  );
}

export const initialAHUData: AHUFormData = {
  supplyAirTemp: '',
  returnAirTemp: '',
  fanSpeed: '',
  filterStatus: '',
  damperPosition: '',
  occupancyMode: '',
  // ✅ NEW: Energy fields
  runtimeHours: '',
  fanKw: '',
};

export function validateAHUForm(data: AHUFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.supplyAirTemp) errors.supplyAirTemp = 'Required';
  if (!data.returnAirTemp) errors.returnAirTemp = 'Required';
  if (!data.fanSpeed) errors.fanSpeed = 'Required';
  if (!data.filterStatus) errors.filterStatus = 'Required';
  if (!data.damperPosition) errors.damperPosition = 'Required';
  if (!data.occupancyMode) errors.occupancyMode = 'Required';
  
  // ✅ NEW: Runtime and kW required for energy calculations
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';
  if (!data.fanKw) errors.fanKw = 'Required for energy tracking';

  if (data.supplyAirTemp && (Number(data.supplyAirTemp) < 0 || Number(data.supplyAirTemp) > 150)) {
    errors.supplyAirTemp = 'Must be 0-150°F';
  }
  if (data.returnAirTemp && (Number(data.returnAirTemp) < 0 || Number(data.returnAirTemp) > 150)) {
    errors.returnAirTemp = 'Must be 0-150°F';
  }
  if (data.fanSpeed && (Number(data.fanSpeed) < 0 || Number(data.fanSpeed) > 100)) {
    errors.fanSpeed = 'Must be 0-100%';
  }
  if (data.damperPosition && (Number(data.damperPosition) < 0 || Number(data.damperPosition) > 100)) {
    errors.damperPosition = 'Must be 0-100%';
  }
  
  // ✅ NEW: Runtime validation
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }
  if (data.fanKw && (Number(data.fanKw) < 0 || Number(data.fanKw) > 100)) {
    errors.fanKw = 'Must be 0-100 kW';
  }

  return errors;
}
