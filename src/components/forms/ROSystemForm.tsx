import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Droplets, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ROSystemFormData {
  feedPressure: string;
  productPressure: string;
  rejectPressure: string;
  feedFlow: string;
  productFlow: string;
  rejectFlow: string;
  feedTDS: string;
  productTDS: string;
  recoveryRate: string;
  operationalStatus: string;
  alarmStatus: string;
  // Energy
  runtimeHours: string;
  pumpKw: string;
}

interface ROSystemFormProps {
  data: ROSystemFormData;
  onChange: (data: ROSystemFormData) => void;
  errors: Record<string, string>;
}

const statusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  'low-recovery': 'bg-warning/20 border-warning/50 text-warning',
  'high-tds': 'bg-warning/20 border-warning/50 text-warning',
  fouling: 'bg-destructive/20 border-destructive/50 text-destructive',
  offline: 'bg-muted border-border text-muted-foreground',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function ROSystemForm({ data, onChange, errors }: ROSystemFormProps) {
  const updateField = (field: keyof ROSystemFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Auto-calculate recovery rate from flows if not manually entered
  const autoRecovery =
    data.feedFlow && data.productFlow && Number(data.feedFlow) > 0
      ? ((Number(data.productFlow) / Number(data.feedFlow)) * 100).toFixed(1)
      : null;

  // TDS rejection %
  const tdsRejection =
    data.feedTDS && data.productTDS && Number(data.feedTDS) > 0
      ? (((Number(data.feedTDS) - Number(data.productTDS)) / Number(data.feedTDS)) * 100).toFixed(1)
      : null;

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-chiller/20">
          <Droplets className="h-4 w-4 text-chiller" />
        </div>
        RO System Operating Data
      </h3>

      {/* Pressures */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Pressures (PSI)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Feed Pressure"
            name="feedPressure"
            type="number"
            value={data.feedPressure}
            onChange={(v) => updateField('feedPressure', v)}
            required
            error={errors.feedPressure}
            unit="PSI"
            min={0}
            max={1200}
            step={0.1}
            placeholder="150"
          />
          <FormField
            label="Product Pressure"
            name="productPressure"
            type="number"
            value={data.productPressure}
            onChange={(v) => updateField('productPressure', v)}
            required
            error={errors.productPressure}
            unit="PSI"
            min={0}
            max={1200}
            step={0.1}
            placeholder="60"
          />
          <FormField
            label="Reject Pressure"
            name="rejectPressure"
            type="number"
            value={data.rejectPressure}
            onChange={(v) => updateField('rejectPressure', v)}
            unit="PSI"
            min={0}
            max={1200}
            step={0.1}
            placeholder="145"
          />
        </div>
      </div>

      {/* Flows */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Flows (GPM)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Feed Flow"
            name="feedFlow"
            type="number"
            value={data.feedFlow}
            onChange={(v) => updateField('feedFlow', v)}
            required
            error={errors.feedFlow}
            unit="GPM"
            min={0}
            max={10000}
            step={0.1}
            placeholder="100"
          />
          <FormField
            label="Product Flow"
            name="productFlow"
            type="number"
            value={data.productFlow}
            onChange={(v) => updateField('productFlow', v)}
            required
            error={errors.productFlow}
            unit="GPM"
            min={0}
            max={10000}
            step={0.1}
            placeholder="75"
          />
          <FormField
            label="Reject Flow"
            name="rejectFlow"
            type="number"
            value={data.rejectFlow}
            onChange={(v) => updateField('rejectFlow', v)}
            required
            error={errors.rejectFlow}
            unit="GPM"
            min={0}
            max={10000}
            step={0.1}
            placeholder="25"
          />
        </div>
      </div>

      {/* Water Quality */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Water Quality
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Feed TDS"
            name="feedTDS"
            type="number"
            value={data.feedTDS}
            onChange={(v) => updateField('feedTDS', v)}
            required
            error={errors.feedTDS}
            unit="ppm"
            min={0}
            max={50000}
            placeholder="500"
          />
          <FormField
            label="Product TDS"
            name="productTDS"
            type="number"
            value={data.productTDS}
            onChange={(v) => updateField('productTDS', v)}
            required
            error={errors.productTDS}
            unit="ppm"
            min={0}
            max={1000}
            placeholder="15"
          />
          {/* Auto TDS Rejection */}
          <div className="input-group">
            <Label className="text-sm font-medium text-muted-foreground">TDS Rejection</Label>
            <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
              <span className={cn('font-mono text-sm', tdsRejection ? 'text-foreground' : 'text-muted-foreground')}>
                {tdsRejection ? `${tdsRejection}%` : '—'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Auto</span>
            </div>
            <p className="text-xs text-muted-foreground">(Feed − Product) / Feed</p>
          </div>
        </div>

        {/* Recovery Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FormField
            label="Recovery Rate"
            name="recoveryRate"
            type="number"
            value={data.recoveryRate}
            onChange={(v) => updateField('recoveryRate', v)}
            unit="%"
            min={0}
            max={100}
            step={0.1}
            placeholder={autoRecovery || '75'}
            helperText="Override auto-calc if needed"
          />
          {/* Auto Recovery */}
          <div className="input-group">
            <Label className="text-sm font-medium text-muted-foreground">Calculated Recovery</Label>
            <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
              <span className={cn('font-mono text-sm', autoRecovery ? 'text-foreground' : 'text-muted-foreground')}>
                {autoRecovery ? `${autoRecovery}%` : '—'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Auto</span>
            </div>
            <p className="text-xs text-muted-foreground">Product / Feed × 100</p>
          </div>
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
            placeholder="22.0"
            icon={Timer}
          />
          <FormField
            label="High-Pressure Pump Power"
            name="pumpKw"
            type="number"
            value={data.pumpKw}
            onChange={(v) => updateField('pumpKw', v)}
            unit="kW"
            min={0}
            max={500}
            step={0.1}
            placeholder="18.5"
            helperText="HP pump motor kW draw"
          />
        </div>
      </div>

      {/* Operational Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Operational Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { value: 'normal', label: 'Normal' },
            { value: 'low-recovery', label: 'Low Recovery' },
            { value: 'high-tds', label: 'High Product TDS' },
            { value: 'fouling', label: 'Membrane Fouling' },
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

export const initialROSystemData: ROSystemFormData = {
  feedPressure: '',
  productPressure: '',
  rejectPressure: '',
  feedFlow: '',
  productFlow: '',
  rejectFlow: '',
  feedTDS: '',
  productTDS: '',
  recoveryRate: '',
  operationalStatus: '',
  alarmStatus: '',
  runtimeHours: '',
  pumpKw: '',
};

export function validateROSystemForm(data: ROSystemFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.feedPressure) errors.feedPressure = 'Required';
  if (!data.productPressure) errors.productPressure = 'Required';
  if (!data.feedFlow) errors.feedFlow = 'Required';
  if (!data.productFlow) errors.productFlow = 'Required';
  if (!data.rejectFlow) errors.rejectFlow = 'Required';
  if (!data.feedTDS) errors.feedTDS = 'Required';
  if (!data.productTDS) errors.productTDS = 'Required';
  if (!data.operationalStatus) errors.operationalStatus = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }
  if (data.recoveryRate && (Number(data.recoveryRate) < 0 || Number(data.recoveryRate) > 100)) {
    errors.recoveryRate = 'Must be 0-100%';
  }

  return errors;
}
