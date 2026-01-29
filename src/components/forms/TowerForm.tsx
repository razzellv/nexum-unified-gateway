import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Waves, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TowerFormData {
  basinLevel: string;
  approachTemp: string;
  fanStatus: string;
  makeUpWaterStatus: string;
  driftObservation: string;
  // ✅ NEW: Energy calculation fields
  runtimeHours: string;
  fanKw: string;
  waterUsageGallons: string;
}

interface TowerFormProps {
  data: TowerFormData;
  onChange: (data: TowerFormData) => void;
  errors: Record<string, string>;
}

const basinLevelColors = {
  low: 'bg-destructive/20 border-destructive/50 text-destructive',
  normal: 'bg-success/20 border-success/50 text-success',
  high: 'bg-warning/20 border-warning/50 text-warning',
};

const driftColors = {
  none: 'bg-success/20 border-success/50 text-success',
  minor: 'bg-warning/20 border-warning/50 text-warning',
  significant: 'bg-destructive/20 border-destructive/50 text-destructive',
};

export function TowerForm({ data, onChange, errors }: TowerFormProps) {
  const updateField = (field: keyof TowerFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-tower/20">
          <Waves className="h-4 w-4 text-tower" />
        </div>
        Cooling Tower Operating Data
      </h3>

      {/* Basin Level */}
      <div className="input-group">
        <Label className="text-sm font-medium">
          Basin Level <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'normal', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateField('basinLevel', level)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.basinLevel === level
                  ? basinLevelColors[level]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {level}
            </button>
          ))}
        </div>
        {errors.basinLevel && (
          <p className="text-xs text-destructive">{errors.basinLevel}</p>
        )}
      </div>

      <FormField
        label="Approach Temp"
        name="approachTemp"
        type="number"
        value={data.approachTemp}
        onChange={(v) => updateField('approachTemp', v)}
        required
        error={errors.approachTemp}
        unit="°F"
        min={0}
        max={50}
        step={0.1}
        placeholder="8.5"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fan Status */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Fan Status <span className="text-destructive">*</span>
          </Label>
          <Select value={data.fanStatus} onValueChange={(v) => updateField('fanStatus', v)}>
            <SelectTrigger className={cn(errors.fanStatus && 'border-destructive')}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="low">Low Speed</SelectItem>
              <SelectItem value="high">High Speed</SelectItem>
              <SelectItem value="vfd">VFD Controlled</SelectItem>
            </SelectContent>
          </Select>
          {errors.fanStatus && (
            <p className="text-xs text-destructive">{errors.fanStatus}</p>
          )}
        </div>

        {/* Make-Up Water Status */}
        <div className="input-group">
          <Label className="text-sm font-medium">
            Make-Up Water <span className="text-destructive">*</span>
          </Label>
          <Select value={data.makeUpWaterStatus} onValueChange={(v) => updateField('makeUpWaterStatus', v)}>
            <SelectTrigger className={cn(errors.makeUpWaterStatus && 'border-destructive')}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {errors.makeUpWaterStatus && (
            <p className="text-xs text-destructive">{errors.makeUpWaterStatus}</p>
          )}
        </div>
      </div>

      {/* ✅ NEW: Energy & Water Usage Section */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          Energy & Water Usage Data
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
            placeholder="18.5"
            icon={Timer}
          />

          <FormField
            label="Fan Power"
            name="fanKw"
            type="number"
            value={data.fanKw}
            onChange={(v) => updateField('fanKw', v)}
            unit="kW"
            min={0}
            max={100}
            step={0.1}
            placeholder="7.5"
            helperText="Fan motor kW draw"
          />

          <FormField
            label="Water Usage"
            name="waterUsageGallons"
            type="number"
            value={data.waterUsageGallons}
            onChange={(v) => updateField('waterUsageGallons', v)}
            unit="gal"
            min={0}
            step={1}
            placeholder="5000"
            helperText="Make-up + blowdown"
          />
        </div>
      </div>

      {/* Drift Observation */}
      <div className="input-group mt-6">
        <Label className="text-sm font-medium">
          Drift / Splash Observation <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['none', 'minor', 'significant'] as const).map((drift) => (
            <button
              key={drift}
              type="button"
              onClick={() => updateField('driftObservation', drift)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                data.driftObservation === drift
                  ? driftColors[drift]
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {drift}
            </button>
          ))}
        </div>
        {errors.driftObservation && (
          <p className="text-xs text-destructive">{errors.driftObservation}</p>
        )}
      </div>
    </div>
  );
}

export const initialTowerData: TowerFormData = {
  basinLevel: '',
  approachTemp: '',
  fanStatus: '',
  makeUpWaterStatus: '',
  driftObservation: '',
  // ✅ NEW: Energy fields
  runtimeHours: '',
  fanKw: '',
  waterUsageGallons: '',
};

export function validateTowerForm(data: TowerFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.basinLevel) errors.basinLevel = 'Required';
  if (!data.approachTemp) errors.approachTemp = 'Required';
  if (!data.fanStatus) errors.fanStatus = 'Required';
  if (!data.makeUpWaterStatus) errors.makeUpWaterStatus = 'Required';
  if (!data.driftObservation) errors.driftObservation = 'Required';
  
  // ✅ NEW: Runtime required for energy tracking
  if (!data.runtimeHours) errors.runtimeHours = 'Required for energy tracking';

  if (data.approachTemp && (Number(data.approachTemp) < 0 || Number(data.approachTemp) > 50)) {
    errors.approachTemp = 'Must be 0-50°F';
  }
  
  // ✅ NEW: Runtime validation
  if (data.runtimeHours && (Number(data.runtimeHours) < 0 || Number(data.runtimeHours) > 24)) {
    errors.runtimeHours = 'Must be 0-24 hours';
  }

  return errors;
}
