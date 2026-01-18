import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyFormData {
  electricMeterReading: string;
  waterMeterReading: string;
  primaryGasUsage: string;
  secondaryGasUsage: string;
  gasUnit: string;
  fuelOilUsage: string;
}

interface EnergyFormProps {
  data: EnergyFormData;
  onChange: (data: EnergyFormData) => void;
  errors: Record<string, string>;
}

export function EnergyForm({ data, onChange, errors }: EnergyFormProps) {
  const updateField = (field: keyof EnergyFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-energy/20">
          <Zap className="h-4 w-4 text-energy" />
        </div>
        Energy & Utilities Reading
      </h3>

      <FormField
        label="Electric Meter Reading"
        name="electricMeterReading"
        type="number"
        value={data.electricMeterReading}
        onChange={(v) => updateField('electricMeterReading', v)}
        required
        error={errors.electricMeterReading}
        unit="kWh"
        min={0}
        placeholder="125000"
      />

      <FormField
        label="Water Meter Reading"
        name="waterMeterReading"
        type="number"
        value={data.waterMeterReading}
        onChange={(v) => updateField('waterMeterReading', v)}
        required
        error={errors.waterMeterReading}
        unit="gal"
        min={0}
        placeholder="50000"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Primary Gas Usage"
          name="primaryGasUsage"
          type="number"
          value={data.primaryGasUsage}
          onChange={(v) => updateField('primaryGasUsage', v)}
          required
          error={errors.primaryGasUsage}
          min={0}
          placeholder="1500"
          unit="therms"
        />

        <FormField
          label="Secondary Gas Usage"
          name="secondaryGasUsage"
          type="number"
          value={data.secondaryGasUsage}
          onChange={(v) => updateField("secondaryGasUsage", v)}
          min={0}
          placeholder="12.5"
      </div>

        />
        <div className="input-group">
          <Label className="text-sm font-medium">
            Gas Unit <span className="text-destructive">*</span>
          </Label>
          <Select value={data.gasUnit} onValueChange={(v) => updateField('gasUnit', v)}>
            <SelectTrigger className={cn(errors.gasUnit && 'border-destructive')}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="therms">Therms</SelectItem>
              <SelectItem value="ccf">CCF</SelectItem>
            </SelectContent>
          </Select>
          {errors.gasUnit && (
            <p className="text-xs text-destructive">{errors.gasUnit}</p>
          )}
        </div>
      </div>

      <FormField
        label="Fuel Oil Usage"
        name="fuelOilUsage"
        type="number"
        value={data.fuelOilUsage}
        onChange={(v) => updateField('fuelOilUsage', v)}
        unit="gal"
        min={0}
        placeholder="0"
      />
      <p className="text-xs text-muted-foreground -mt-2">Optional - only if applicable</p>
    </div>
  );
}

export const initialEnergyData: EnergyFormData = {
  electricMeterReading: '',
  waterMeterReading: '',
  primaryGasUsage: '',
  secondaryGasUsage: '',
  gasUnit: '',
  fuelOilUsage: '',
};

export function validateEnergyForm(data: EnergyFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.electricMeterReading) errors.electricMeterReading = 'Required';
  if (!data.waterMeterReading) errors.waterMeterReading = 'Required';
  if (!data.primaryGasUsage) errors.primaryGasUsage = 'Required';
  if (!data.gasUnit) errors.gasUnit = 'Required';

  if (data.electricMeterReading && Number(data.electricMeterReading) < 0) {
    errors.electricMeterReading = 'Must be positive';
  }
  if (data.waterMeterReading && Number(data.waterMeterReading) < 0) {
    errors.waterMeterReading = 'Must be positive';
  }
  if (data.primaryGasUsage && Number(data.primaryGasUsage) < 0) {
    errors.primaryGasUsage = 'Must be positive';
  }

  return errors;
}
