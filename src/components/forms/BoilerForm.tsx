import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Flame, Shield, Zap, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PumpSelector } from '@/components/equipment/PumpSelector';
import { ConnectedToBanner } from '@/components/equipment/ConnectedToBanner';
import { deriveBoiler } from '@/lib/engineeringCalcs';

interface BoilerFormData {
  operatingMode: string;
  supplyTemp: string;
  returnTemp: string;
  stackTemp: string;
  o2Level: string;
  co2Level: string;
  fuelType: string;
  firingRate: string;
  fuelPsi: string;
  systemPsi: string;
  primaryGasUsage: string;
  secondaryGasUsage: string;
  makeUpWater: boolean;
  safetyStatus: string;
  lwcoTestResult: 'pass' | 'fail' | '';
  blowdownPerformed: boolean;
  runtimeHours: string;
  gasCCF: string;
  kwDraw: string;
  linkedPumpIds: string[];
}

interface BoilerFormProps {
  data: BoilerFormData;
  onChange: (data: BoilerFormData) => void;
  errors: Record<string, string>;
  equipmentId?: string;
  facilityId?: string;
}

const safetyStatusColors = {
  normal: 'bg-success/20 border-success/50 text-success',
  alarm: 'bg-warning/20 border-warning/50 text-warning',
  lockout: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function BoilerForm({ data, onChange, errors, equipmentId, facilityId }: BoilerFormProps) {
  const updateField = (field: keyof BoilerFormData, value: string | boolean | string[]) => {
    onChange({ ...data, [field]: value });
  };

  // Live-derived display values
  const derived = deriveBoiler(data as Record<string, string>, '');
  const deltaT     = derived._deltaT     || null;
  const inputBtuHr = derived._inputBtuHr || null;

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-boiler/20">
          <Flame className="h-4 w-4 text-boiler" />
        </div>
        Boiler Operating Data
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Operating Mode */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Operating Mode <span className="text-destructive">*</span>
          </Label>
          <Select value={data.operatingMode} onValueChange={(v) => updateField('operatingMode', v)}>
            <SelectTrigger className={cn(errors.operatingMode && 'border-destructive')}>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standby">Standby</SelectItem>
              <SelectItem value="low-fire">Low Fire</SelectItem>
              <SelectItem value="high-fire">High Fire</SelectItem>
              <SelectItem value="modulating">Modulating</SelectItem>
            </SelectContent>
          </Select>
          {errors.operatingMode && (
            <p className="text-xs text-destructive">{errors.operatingMode}</p>
          )}
        </div>

        {/* Fuel Type */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Fuel Type <span className="text-destructive">*</span>
          </Label>
          <Select value={data.fuelType} onValueChange={(v) => updateField('fuelType', v)}>
            <SelectTrigger className={cn(errors.fuelType && 'border-destructive')}>
              <SelectValue placeholder="Select fuel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural-gas">Natural Gas</SelectItem>
              <SelectItem value="fuel-oil">Fuel Oil</SelectItem>
              <SelectItem value="dual-fuel">Dual Fuel</SelectItem>
              <SelectItem value="electric">Electric</SelectItem>
            </SelectContent>
          </Select>
          {errors.fuelType && (
            <p className="text-xs text-destructive">{errors.fuelType}</p>
          )}
        </div>
      </div>

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
          max={500}
          placeholder="180"
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
          max={500}
          placeholder="160"
        />

        {/* Auto ΔT */}
        {deltaT && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs self-end mb-1" title="Supply − Return temperature difference">
            <Zap className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="text-muted-foreground">ΔT</span>
            <span className="font-semibold text-blue-400">{deltaT} °F</span>
          </div>
        )}

        <FormField
          label="Stack Temp"
          name="stackTemp"
          type="number"
          value={data.stackTemp}
          onChange={(v) => updateField('stackTemp', v)}
          required
          error={errors.stackTemp}
          unit="°F"
          min={0}
          max={1000}
          placeholder="350"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="O₂ Level"
          name="o2Level"
          type="number"
          value={data.o2Level}
          onChange={(v) => updateField('o2Level', v)}
          unit="%"
          min={0}
          max={21}
          step={0.1}
          placeholder="3.5"
        />

        <FormField
          label="CO₂ Level"
          name="co2Level"
          type="number"
          value={data.co2Level}
          onChange={(v) => updateField('co2Level', v)}
          unit="%"
          min={0}
          max={20}
          step={0.1}
          placeholder="12.0"
        />

        <FormField
          label="Firing Rate"
          name="firingRate"
          type="number"
          value={data.firingRate}
          onChange={(v) => updateField('firingRate', v)}
          required
          error={errors.firingRate}
          unit="%"
          min={0}
          max={100}
          placeholder="75"
        />
      </div>

      {/* Auto BTU/hr from firing rate (MBH) or derived metrics */}
      {inputBtuHr && (
        <div className="flex flex-wrap gap-2 px-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs" title="MBH × 1,000">
            <Zap className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="text-muted-foreground">Input BTU/hr</span>
            <span className="font-semibold text-blue-400">{Number(inputBtuHr).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Fuel Gas Pressure"
          name="fuelPsi"
          type="number"
          value={data.fuelPsi}
          onChange={(v) => updateField("fuelPsi", v)}
          required
          error={errors.fuelPsi}
          unit="PSI"
          min={0}
          max={50}
          step={0.1}
          placeholder="3.5"
        />

        <FormField
          label="System Pressure"
          name="systemPsi"
          type="number"
          value={data.systemPsi}
          onChange={(v) => updateField("systemPsi", v)}
          required
          error={errors.systemPsi}
          unit="PSI"
          min={0}
          max={300}
          step={0.5}
          placeholder="125"
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
            placeholder="8.5"
            icon={Timer}
          />

          <FormField
            label="Gas Consumption"
            name="gasCCF"
            type="number"
            value={data.gasCCF}
            onChange={(v) => updateField('gasCCF', v)}
            unit="CCF"
            min={0}
            step={0.1}
            placeholder="25.5"
            helperText="Hundred cubic feet of gas"
          />

          <FormField
            label="Electric Draw"
            name="kwDraw"
            type="number"
            value={data.kwDraw}
            onChange={(v) => updateField('kwDraw', v)}
            unit="kW"
            min={0}
            max={100}
            step={0.1}
            placeholder="2.5"
            helperText="For controls & auxiliaries"
          />
        </div>
      </div>

      {/* Linked Pumps */}
      {facilityId && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Flame className="h-4 w-4 text-primary" />
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

      {/* Safety Status */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Safety Status <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'alarm', 'lockout'] as const).map((status) => (
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
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    status === 'normal' && 'bg-success',
                    status === 'alarm' && 'bg-warning animate-pulse',
                    status === 'lockout' && 'bg-destructive animate-pulse'
                  )}
                />
                {status}
              </div>
            </button>
          ))}
        </div>
        {errors.safetyStatus && (
          <p className="text-xs text-destructive">{errors.safetyStatus}</p>
        )}
      </div>

      {/* Make-Up Water */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
        <div>
          <p className="font-medium text-sm">Make-Up Water Indicator</p>
          <p className="text-xs text-muted-foreground">Is make-up water system active?</p>
        </div>
        <Switch
          checked={data.makeUpWater}
          onCheckedChange={(v) => updateField('makeUpWater', v)}
        />
      </div>

      {/* LWCO Verification Section */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-warning/20">
            <Shield className="h-4 w-4 text-warning" />
          </div>
          Low Water Cutoff (LWCO) Verification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* LWFCO Test Toggle */}
          <div className="input-group">
            <Label className="text-sm font-medium">
              LWFCO Test <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(['pass', 'fail'] as const).map((result) => (
                <button
                  key={result}
                  type="button"
                  onClick={() => updateField('lwcoTestResult', result)}
                  className={cn(
                    'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                    data.lwcoTestResult === result
                      ? result === 'pass'
                        ? 'bg-success/20 border-success/50 text-success'
                        : 'bg-destructive/20 border-destructive/50 text-destructive'
                      : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  {result}
                </button>
              ))}
            </div>
            {errors.lwcoTestResult && (
              <p className="text-xs text-destructive">{errors.lwcoTestResult}</p>
            )}
          </div>

          {/* Blowdown Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 h-fit">
            <div>
              <p className="font-medium text-sm">Blowdown Performed</p>
              <p className="text-xs text-muted-foreground">Was blowdown done this shift?</p>
            </div>
            <Switch
              checked={data.blowdownPerformed}
              onCheckedChange={(v) => updateField('blowdownPerformed', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const initialBoilerData: BoilerFormData = {
  operatingMode: '',
  supplyTemp: '',
  returnTemp: '',
  stackTemp: '',
  o2Level: '',
  co2Level: '',
  fuelType: '',
  firingRate: '',
  fuelPsi: '',
  systemPsi: '',
  primaryGasUsage: '',
  secondaryGasUsage: '',
  makeUpWater: false,
  safetyStatus: '',
  lwcoTestResult: '',
  blowdownPerformed: false,
  runtimeHours: '',
  gasCCF: '',
  kwDraw: '',
  linkedPumpIds: [],
};

export function validateBoilerForm(data: BoilerFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.operatingMode) errors.operatingMode = 'Required';
  if (!data.fuelType) errors.fuelType = 'Required';
  if (!data.supplyTemp) errors.supplyTemp = 'Required';
  if (!data.returnTemp) errors.returnTemp = 'Required';
  if (!data.stackTemp) errors.stackTemp = 'Required';
  if (!data.firingRate) errors.firingRate = 'Required';
  if (!data.fuelPsi) errors.fuelPsi = 'Required';
  if (!data.systemPsi) errors.systemPsi = 'Required';
  if (!data.safetyStatus) errors.safetyStatus = 'Required';
  if (!data.lwcoTestResult) errors.lwcoTestResult = 'Required';
  
  // ✅ NEW: Runtime is required for energy calculations
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  // Numeric validations
  if (data.supplyTemp && (Number(data.supplyTemp) < 0 || Number(data.supplyTemp) > 500)) {
    errors.supplyTemp = 'Must be 0-500°F';
  }
  if (data.returnTemp && (Number(data.returnTemp) < 0 || Number(data.returnTemp) > 500)) {
    errors.returnTemp = 'Must be 0-500°F';
  }
  if (data.stackTemp && (Number(data.stackTemp) < 0 || Number(data.stackTemp) > 1000)) {
    errors.stackTemp = 'Must be 0-1000°F';
  }
  if (data.firingRate && (Number(data.firingRate) < 0 || Number(data.firingRate) > 100)) {
    errors.firingRate = 'Must be 0-100%';
  }
  if (data.fuelPsi && (Number(data.fuelPsi) < 0 || Number(data.fuelPsi) > 50)) {
    errors.fuelPsi = 'Must be 0-50 PSI';
  }
  if (data.systemPsi && (Number(data.systemPsi) < 0 || Number(data.systemPsi) > 300)) {
    errors.systemPsi = 'Must be 0-300 PSI';
  }
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
