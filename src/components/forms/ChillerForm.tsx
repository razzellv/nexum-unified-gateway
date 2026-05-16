import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Snowflake, Droplets, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PumpSelector } from '@/components/equipment/PumpSelector';
import { ConnectedToBanner } from '@/components/equipment/ConnectedToBanner';
import { deriveChiller } from '@/lib/engineeringCalcs';

interface ChillerFormData {
  chillerType: string;
  enteringWaterTemp: string;
  leavingWaterTemp: string;
  enteringCondenserWaterTemp: string;
  leavingCondenserWaterTemp: string;
  estimatedTons: string;
  refrigerantType: string;
  suctionPressure: string;
  dischargePressure: string;
  currentKw: string;
  runStatus: string;
  alarmStatus: string;
  runtimeHours: string;
  linkedPumpIds: string[];
}

interface ChillerFormProps {
  data: ChillerFormData;
  onChange: (data: ChillerFormData) => void;
  errors: Record<string, string>;
  equipmentId?: string;
  facilityId?: string;
}

const runStatusColors = {
  running: 'bg-success/20 border-success/50 text-success',
  stopped: 'bg-muted border-border text-muted-foreground',
  starting: 'bg-primary/20 border-primary/50 text-primary',
  stopping: 'bg-warning/20 border-warning/50 text-warning',
};

const alarmStatusColors = {
  none: 'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm: 'bg-destructive/20 border-destructive/50 text-destructive',
  shutdown: 'bg-destructive/30 border-destructive text-destructive',
};

const isWaterCooled = (type: string) => {
  return type && type !== 'air-cooled';
};

export function ChillerForm({ data, onChange, errors, equipmentId, facilityId }: ChillerFormProps) {
  const updateField = (field: keyof ChillerFormData, value: string | string[]) => {
    const next = { ...data, [field]: value };
    if (typeof value === 'string') {
      const derived = deriveChiller(next as Record<string, string>, field);
      // Only auto-fill editable fields the user hasn't just set
      if (derived.motorKw !== undefined && field !== 'motorKw') (next as any).motorKw = derived.motorKw;
    }
    onChange(next);
  };

  // Live-derived display values (never stored — shown as read-only badges)
  const derived = deriveChiller(data as Record<string, string>, '');
  const chilledDeltaT   = derived._chilledDeltaT || null;
  const condenserDeltaT = derived._condenserDeltaT ||
    (data.enteringCondenserWaterTemp && data.leavingCondenserWaterTemp
      ? (Number(data.leavingCondenserWaterTemp) - Number(data.enteringCondenserWaterTemp)).toFixed(1)
      : null);
  const btuHr    = derived._btuHr    || null;
  const kwPerTon = derived._kwPerTon  || null;
  const copVal   = derived._cop       || null;

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-chiller/20">
          <Snowflake className="h-4 w-4 text-chiller" />
        </div>
        Chiller Operating Data
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chiller Type */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Chiller Type <span className="text-destructive">*</span>
          </Label>
          <Select value={data.chillerType} onValueChange={(v) => updateField('chillerType', v)}>
            <SelectTrigger className={cn(errors.chillerType && 'border-destructive')}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="centrifugal">Centrifugal</SelectItem>
              <SelectItem value="screw">Screw</SelectItem>
              <SelectItem value="scroll">Scroll</SelectItem>
              <SelectItem value="reciprocating">Reciprocating</SelectItem>
              <SelectItem value="absorption">Absorption</SelectItem>
              <SelectItem value="air-cooled">Air-Cooled</SelectItem>
            </SelectContent>
          </Select>
          {errors.chillerType && (
            <p className="text-xs text-destructive">{errors.chillerType}</p>
          )}
        </div>

        <FormField
          label="Estimated Tons"
          name="estimatedTons"
          type="number"
          value={data.estimatedTons}
          onChange={(v) => updateField('estimatedTons', v)}
          required
          error={errors.estimatedTons}
          unit="tons"
          min={0}
          max={5000}
          placeholder="500"
        />
      </div>

      {/* Chilled Water Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Entering Chilled Water Temp"
          name="enteringWaterTemp"
          type="number"
          value={data.enteringWaterTemp}
          onChange={(v) => updateField('enteringWaterTemp', v)}
          required
          error={errors.enteringWaterTemp}
          unit="°F"
          min={30}
          max={100}
          step={0.1}
          placeholder="54"
        />

        <FormField
          label="Leaving Chilled Water Temp"
          name="leavingWaterTemp"
          type="number"
          value={data.leavingWaterTemp}
          onChange={(v) => updateField('leavingWaterTemp', v)}
          required
          error={errors.leavingWaterTemp}
          unit="°F"
          min={30}
          max={100}
          step={0.1}
          placeholder="44"
        />
      </div>

      {/* Auto-derived metrics strip */}
      {(chilledDeltaT || btuHr || kwPerTon || copVal) && (
        <div className="flex flex-wrap gap-2 px-1">
          {chilledDeltaT && <AutoBadge label="Chilled ΔT" value={`${chilledDeltaT} °F`} hint="EWT − LWT" />}
          {btuHr        && <AutoBadge label="BTU/hr"     value={Number(btuHr).toLocaleString()} hint="tons × 12,000" />}
          {kwPerTon     && <AutoBadge label="kW/Ton"     value={kwPerTon} hint="kW ÷ tons" />}
          {copVal       && <AutoBadge label="COP"        value={copVal}   hint="tons × 3.517 ÷ kW" />}
        </div>
      )}

      {/* Condenser Water Section - Only for water-cooled chillers */}
      {isWaterCooled(data.chillerType) && (
        <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
          <h4 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <div className="p-1 rounded bg-chiller/10">
              <Droplets className="h-3.5 w-3.5 text-chiller" />
            </div>
            Condenser Water
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Entering CW Temp (ECWT)"
              name="enteringCondenserWaterTemp"
              type="number"
              value={data.enteringCondenserWaterTemp}
              onChange={(v) => updateField('enteringCondenserWaterTemp', v)}
              required
              error={errors.enteringCondenserWaterTemp}
              unit="°F"
              min={50}
              max={120}
              step={0.1}
              placeholder="85"
            />

            <FormField
              label="Leaving CW Temp (LCWT)"
              name="leavingCondenserWaterTemp"
              type="number"
              value={data.leavingCondenserWaterTemp}
              onChange={(v) => updateField('leavingCondenserWaterTemp', v)}
              required
              error={errors.leavingCondenserWaterTemp}
              unit="°F"
              min={50}
              max={120}
              step={0.1}
              placeholder="95"
            />

            {/* Auto-calculated Delta T */}
            <div className="input-group">
              <Label className="text-sm font-medium text-muted-foreground">
                Condenser Water ΔT
              </Label>
              <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 border border-border/50">
                <span className={cn(
                  "font-mono text-sm",
                  condenserDeltaT ? "text-foreground" : "text-muted-foreground"
                )}>
                  {condenserDeltaT ? `${condenserDeltaT}°F` : '—'}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">Auto</span>
              </div>
              <p className="text-xs text-muted-foreground">LCWT - ECWT</p>
            </div>
          </div>
        </div>
      )}

      {/* Refrigerant & Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Refrigerant Type */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Refrigerant Type <span className="text-destructive">*</span>
          </Label>
          <Select value={data.refrigerantType} onValueChange={(v) => updateField('refrigerantType', v)}>
            <SelectTrigger className={cn(errors.refrigerantType && 'border-destructive')}>
              <SelectValue placeholder="Select refrigerant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="R-134a">R-134a</SelectItem>
              <SelectItem value="R-410A">R-410A</SelectItem>
              <SelectItem value="R-407C">R-407C</SelectItem>
              <SelectItem value="R-22">R-22 (Legacy)</SelectItem>
              <SelectItem value="R-32">R-32</SelectItem>
              <SelectItem value="R-513A">R-513A</SelectItem>
            </SelectContent>
          </Select>
          {errors.refrigerantType && (
            <p className="text-xs text-destructive">{errors.refrigerantType}</p>
          )}
        </div>

        {/* Current kW */}
        <FormField
          label="Current Power Draw"
          name="currentKw"
          type="number"
          value={data.currentKw}
          onChange={(v) => updateField('currentKw', v)}
          required
          error={errors.currentKw}
          unit="kW"
          min={0}
          max={5000}
          step={0.1}
          placeholder="450"
        />
      </div>

      {/* Refrigerant Pressures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Suction Pressure"
          name="suctionPressure"
          type="number"
          value={data.suctionPressure}
          onChange={(v) => updateField('suctionPressure', v)}
          required
          error={errors.suctionPressure}
          unit="PSIG"
          min={0}
          max={200}
          step={0.1}
          placeholder="68"
        />

        <FormField
          label="Discharge Pressure"
          name="dischargePressure"
          type="number"
          value={data.dischargePressure}
          onChange={(v) => updateField('dischargePressure', v)}
          required
          error={errors.dischargePressure}
          unit="PSIG"
          min={0}
          max={500}
          step={0.1}
          placeholder="245"
        />
      </div>

      {/* ✅ NEW: Runtime Section */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          Energy & Runtime Data
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
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
            placeholder="12.5"
            icon={Timer}
            helperText="Hours of operation for kWh calculation (kWh = kW × hours)"
          />
        </div>
      </div>

      {/* Linked Pumps */}
      {facilityId && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Snowflake className="h-4 w-4 text-primary" />
            </div>
            Linked Pumps
          </h3>
          <ConnectedToBanner linkedPumpIds={data.linkedPumpIds} />
          <div className="mt-3">
            <PumpSelector
              facilityId={facilityId}
              currentEquipmentId={equipmentId}
              selectedIds={data.linkedPumpIds}
              onChange={(ids) => updateField('linkedPumpIds', ids)}
            />
          </div>
        </div>
      )}

      {/* Run Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Run Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['running', 'stopped', 'starting', 'stopping'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('runStatus', status)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.runStatus === status
                  ? runStatusColors[status]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    status === 'running' && 'bg-success',
                    status === 'stopped' && 'bg-muted-foreground',
                    status === 'starting' && 'bg-primary animate-pulse',
                    status === 'stopping' && 'bg-warning animate-pulse'
                  )}
                />
                {status}
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
          {(['none', 'warning', 'alarm', 'shutdown'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('alarmStatus', status)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.alarmStatus === status
                  ? alarmStatusColors[status]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {status === 'none' ? 'No Alarms' : status}
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

function AutoBadge({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs" title={hint ? `Auto-calculated: ${hint}` : undefined}>
      <Zap className="w-3 h-3 text-blue-400 shrink-0" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-blue-400">{value}</span>
    </div>
  );
}

export const initialChillerData: ChillerFormData = {
  chillerType: '',
  enteringWaterTemp: '',
  leavingWaterTemp: '',
  enteringCondenserWaterTemp: '',
  leavingCondenserWaterTemp: '',
  estimatedTons: '',
  runStatus: '',
  refrigerantType: '',
  suctionPressure: '',
  dischargePressure: '',
  currentKw: '',
  alarmStatus: '',
  runtimeHours: '',
  linkedPumpIds: [],
};

export function validateChillerForm(data: ChillerFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.chillerType) errors.chillerType = 'Required';
  if (!data.enteringWaterTemp) errors.enteringWaterTemp = 'Required';
  if (!data.leavingWaterTemp) errors.leavingWaterTemp = 'Required';
  if (!data.estimatedTons) errors.estimatedTons = 'Required';
  if (!data.runStatus) errors.runStatus = 'Required';
  if (!data.refrigerantType) errors.refrigerantType = 'Required';
  if (!data.suctionPressure) errors.suctionPressure = 'Required';
  if (!data.dischargePressure) errors.dischargePressure = 'Required';
  if (!data.currentKw) errors.currentKw = 'Required';
  if (!data.alarmStatus) errors.alarmStatus = 'Required';
  
  // ✅ NEW: Runtime is required for energy calculations
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  // Condenser water temps required for water-cooled chillers
  if (data.chillerType && data.chillerType !== 'air-cooled') {
    if (!data.enteringCondenserWaterTemp) errors.enteringCondenserWaterTemp = 'Required for water-cooled';
    if (!data.leavingCondenserWaterTemp) errors.leavingCondenserWaterTemp = 'Required for water-cooled';
  }

  // ✅ NEW: Runtime validation
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
