import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatExchangerFormData {
  primaryTempIn: string;
  primaryTempOut: string;
  secondaryTempIn: string;
  secondaryTempOut: string;
  primaryFlow: string;
  differentialPressure: string;
  operationalStatus: string;
  foulingNotes: string;
  // Energy
  runtimeHours: string;
  primaryPumpKw: string;
}

interface HeatExchangerFormProps {
  data: HeatExchangerFormData;
  onChange: (data: HeatExchangerFormData) => void;
  errors: Record<string, string>;
}

const statusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  reduced: 'bg-warning/20 border-warning/50 text-warning',
  fouling: 'bg-warning/20 border-warning/50 text-warning',
  offline: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function HeatExchangerForm({ data, onChange, errors }: HeatExchangerFormProps) {
  const updateField = (field: keyof HeatExchangerFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const primaryDeltaT =
    data.primaryTempIn && data.primaryTempOut
      ? (Number(data.primaryTempIn) - Number(data.primaryTempOut)).toFixed(1)
      : null;

  const secondaryDeltaT =
    data.secondaryTempIn && data.secondaryTempOut
      ? (Number(data.secondaryTempOut) - Number(data.secondaryTempIn)).toFixed(1)
      : null;

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/20">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
        </div>
        Heat Exchanger Operating Data
      </h3>

      {/* Primary Side */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Primary Side
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Primary Inlet Temp"
            name="primaryTempIn"
            type="number"
            value={data.primaryTempIn}
            onChange={(v) => updateField('primaryTempIn', v)}
            required
            error={errors.primaryTempIn}
            unit="°F"
            min={0}
            max={500}
            step={0.1}
            placeholder="180"
          />
          <FormField
            label="Primary Outlet Temp"
            name="primaryTempOut"
            type="number"
            value={data.primaryTempOut}
            onChange={(v) => updateField('primaryTempOut', v)}
            required
            error={errors.primaryTempOut}
            unit="°F"
            min={0}
            max={500}
            step={0.1}
            placeholder="140"
          />
          {/* Auto ΔT */}
          <div className="input-group">
            <Label className="text-sm font-medium text-muted-foreground">Primary ΔT</Label>
            <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
              <span className={cn('font-mono text-sm', primaryDeltaT ? 'text-foreground' : 'text-muted-foreground')}>
                {primaryDeltaT ? `${primaryDeltaT}°F` : '—'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Auto</span>
            </div>
            <p className="text-xs text-muted-foreground">In − Out</p>
          </div>
        </div>
      </div>

      {/* Secondary Side */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Secondary Side
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Secondary Inlet Temp"
            name="secondaryTempIn"
            type="number"
            value={data.secondaryTempIn}
            onChange={(v) => updateField('secondaryTempIn', v)}
            required
            error={errors.secondaryTempIn}
            unit="°F"
            min={0}
            max={500}
            step={0.1}
            placeholder="120"
          />
          <FormField
            label="Secondary Outlet Temp"
            name="secondaryTempOut"
            type="number"
            value={data.secondaryTempOut}
            onChange={(v) => updateField('secondaryTempOut', v)}
            required
            error={errors.secondaryTempOut}
            unit="°F"
            min={0}
            max={500}
            step={0.1}
            placeholder="155"
          />
          <div className="input-group">
            <Label className="text-sm font-medium text-muted-foreground">Secondary ΔT</Label>
            <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
              <span className={cn('font-mono text-sm', secondaryDeltaT ? 'text-foreground' : 'text-muted-foreground')}>
                {secondaryDeltaT ? `${secondaryDeltaT}°F` : '—'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Auto</span>
            </div>
            <p className="text-xs text-muted-foreground">Out − In</p>
          </div>
        </div>
      </div>

      {/* Flow & Pressure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <FormField
          label="Primary Flow"
          name="primaryFlow"
          type="number"
          value={data.primaryFlow}
          onChange={(v) => updateField('primaryFlow', v)}
          required
          error={errors.primaryFlow}
          unit="GPM"
          min={0}
          max={10000}
          placeholder="350"
        />
        <FormField
          label="Differential Pressure"
          name="differentialPressure"
          type="number"
          value={data.differentialPressure}
          onChange={(v) => updateField('differentialPressure', v)}
          unit="PSI"
          min={0}
          max={200}
          step={0.1}
          placeholder="12.5"
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
            label="Primary Pump Power"
            name="primaryPumpKw"
            type="number"
            value={data.primaryPumpKw}
            onChange={(v) => updateField('primaryPumpKw', v)}
            unit="kW"
            min={0}
            max={500}
            step={0.1}
            placeholder="12.5"
            helperText="Associated pump motor kW"
          />
        </div>
      </div>

      {/* Operational Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Operational Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'normal', label: 'Normal' },
            { value: 'reduced', label: 'Reduced Cap.' },
            { value: 'fouling', label: 'High Fouling' },
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

      {/* Fouling Notes */}
      <div className="input-group">
        <Label className="text-sm font-medium">Fouling / Condition Notes</Label>
        <FormField
          label=""
          name="foulingNotes"
          type="text"
          value={data.foulingNotes}
          onChange={(v) => updateField('foulingNotes', v)}
          placeholder="Any deposits, blockage, abnormal readings..."
        />
      </div>
    </div>
  );
}

export const initialHeatExchangerData: HeatExchangerFormData = {
  primaryTempIn: '',
  primaryTempOut: '',
  secondaryTempIn: '',
  secondaryTempOut: '',
  primaryFlow: '',
  differentialPressure: '',
  operationalStatus: '',
  foulingNotes: '',
  runtimeHours: '',
  primaryPumpKw: '',
};

export function validateHeatExchangerForm(data: HeatExchangerFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.primaryTempIn) errors.primaryTempIn = 'Required';
  if (!data.primaryTempOut) errors.primaryTempOut = 'Required';
  if (!data.secondaryTempIn) errors.secondaryTempIn = 'Required';
  if (!data.secondaryTempOut) errors.secondaryTempOut = 'Required';
  if (!data.primaryFlow) errors.primaryFlow = 'Required';
  if (!data.operationalStatus) errors.operationalStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }
  if (data.primaryTempIn && (Number(data.primaryTempIn) < 0 || Number(data.primaryTempIn) > 500)) {
    errors.primaryTempIn = 'Must be 0-500°F';
  }
  if (data.primaryTempOut && (Number(data.primaryTempOut) < 0 || Number(data.primaryTempOut) > 500)) {
    errors.primaryTempOut = 'Must be 0-500°F';
  }

  return errors;
}
