import { FormField } from './FormField';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Shield, Activity, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MPCCFormData {
  // Incoming supply
  incomingVoltageL1L2: string;
  incomingVoltageL2L3: string;
  incomingVoltageL1L3: string;
  incomingAmpsL1: string;
  incomingAmpsL2: string;
  incomingAmpsL3: string;
  frequency: string;
  powerFactor: string;

  // Demand & consumption
  peakDemandKW: string;
  currentLoadKW: string;
  kwhReading: string;
  demandIntervalKWH: string;

  // Panel status
  mainBreakerStatus: string;
  busbarTemp: string;
  groundFaultStatus: string;
  arcFlashIndicator: boolean;

  // Safety & alarms
  safetyStatus: string;
  alarmActive: boolean;
  alarmDescription: string;

  // Energy & Runtime
  runtimeHours: string;
  kwDraw: string;

  // Notes
  operatorNotes: string;
}

export const initialMPCCData: MPCCFormData = {
  incomingVoltageL1L2: '', incomingVoltageL2L3: '', incomingVoltageL1L3: '',
  incomingAmpsL1: '', incomingAmpsL2: '', incomingAmpsL3: '',
  frequency: '60', powerFactor: '',
  peakDemandKW: '', currentLoadKW: '', kwhReading: '', demandIntervalKWH: '',
  mainBreakerStatus: 'closed', busbarTemp: '', groundFaultStatus: 'normal',
  arcFlashIndicator: false,
  safetyStatus: 'normal', alarmActive: false, alarmDescription: '',
  runtimeHours: '', kwDraw: '',
  operatorNotes: '',
};

export function validateMPCCForm(data: MPCCFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.incomingAmpsL1) errors.incomingAmpsL1 = 'L1 amperage required';
  if (!data.currentLoadKW)  errors.currentLoadKW  = 'Current load (kW) required';
  if (!data.kwhReading)     errors.kwhReading      = 'kWh meter reading required';
  return errors;
}

const safetyColors: Record<string, string> = {
  normal:  'bg-success/20 border-success/50 text-success',
  warning: 'bg-warning/20 border-warning/50 text-warning',
  alarm:   'bg-destructive/20 border-destructive/50 text-destructive',
  lockout: 'bg-destructive/20 border-destructive/50 text-destructive',
};

const breakerColors: Record<string, string> = {
  closed: 'bg-success/20 border-success/50 text-success',
  open:   'bg-destructive/20 border-destructive/50 text-destructive',
  tripped:'bg-warning/20 border-warning/50 text-warning',
};

interface MPCCFormProps {
  data: MPCCFormData;
  onChange: (data: MPCCFormData) => void;
  errors: Record<string, string>;
}

export function MPCCForm({ data, onChange, errors }: MPCCFormProps) {
  const updateField = (field: keyof MPCCFormData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  // Auto-calculate average current load from 3-phase amps
  const avgAmps = (() => {
    const a = parseFloat(data.incomingAmpsL1);
    const b = parseFloat(data.incomingAmpsL2);
    const c = parseFloat(data.incomingAmpsL3);
    if (a && b && c) return ((a + b + c) / 3).toFixed(1);
    return null;
  })();

  // Auto-calculate load % vs baseline (if available via window context)
  const loadPercent = (() => {
    const kw = parseFloat(data.currentLoadKW);
    const peak = parseFloat(data.peakDemandKW);
    if (kw && peak) return Math.round((kw / peak) * 100);
    return null;
  })();

  return (
    <div className="form-section animate-fade-in space-y-6">

      {/* ── Incoming Supply Voltages ─────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-yellow-500/20">
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          Incoming Supply — Voltage (V)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="L1-L2 Voltage" id="incomingVoltageL1L2" type="number" step="0.1"
            value={data.incomingVoltageL1L2} onChange={v => updateField('incomingVoltageL1L2', v)}
            placeholder="480" error={errors.incomingVoltageL1L2} unit="V" />
          <FormField label="L2-L3 Voltage" id="incomingVoltageL2L3" type="number" step="0.1"
            value={data.incomingVoltageL2L3} onChange={v => updateField('incomingVoltageL2L3', v)}
            placeholder="480" unit="V" />
          <FormField label="L1-L3 Voltage" id="incomingVoltageL1L3" type="number" step="0.1"
            value={data.incomingVoltageL1L3} onChange={v => updateField('incomingVoltageL1L3', v)}
            placeholder="480" unit="V" />
        </div>
      </div>

      {/* ── Incoming Amperage ────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-yellow-500/20">
            <Activity className="h-4 w-4 text-yellow-400" />
          </div>
          Incoming Amperage (A) *
          {avgAmps && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              Avg: {avgAmps} A
            </span>
          )}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="L1 Amps *" id="incomingAmpsL1" type="number" step="0.1"
            value={data.incomingAmpsL1} onChange={v => updateField('incomingAmpsL1', v)}
            placeholder="350" error={errors.incomingAmpsL1} unit="A" />
          <FormField label="L2 Amps" id="incomingAmpsL2" type="number" step="0.1"
            value={data.incomingAmpsL2} onChange={v => updateField('incomingAmpsL2', v)}
            placeholder="348" unit="A" />
          <FormField label="L3 Amps" id="incomingAmpsL3" type="number" step="0.1"
            value={data.incomingAmpsL3} onChange={v => updateField('incomingAmpsL3', v)}
            placeholder="352" unit="A" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <FormField label="Frequency" id="frequency" type="number" step="0.1"
            value={data.frequency} onChange={v => updateField('frequency', v)}
            placeholder="60" unit="Hz" />
          <FormField label="Power Factor" id="powerFactor" type="number" step="0.01"
            value={data.powerFactor} onChange={v => updateField('powerFactor', v)}
            placeholder="0.92" unit="PF" />
        </div>
      </div>

      {/* ── Demand & Consumption ─────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          Demand & Consumption
          {loadPercent !== null && (
            <span className={cn(
              'text-xs font-normal ml-2 px-2 py-0.5 rounded-full border',
              loadPercent > 90 ? 'bg-destructive/20 text-destructive border-destructive/30' :
              loadPercent > 75 ? 'bg-warning/20 text-warning border-warning/30' :
              'bg-success/20 text-success border-success/30'
            )}>
              {loadPercent}% of peak
            </span>
          )}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Current Load *" id="currentLoadKW" type="number" step="0.1"
            value={data.currentLoadKW} onChange={v => updateField('currentLoadKW', v)}
            placeholder="280" error={errors.currentLoadKW} unit="kW" />
          <FormField label="Peak Demand (this interval)" id="peakDemandKW" type="number" step="0.1"
            value={data.peakDemandKW} onChange={v => updateField('peakDemandKW', v)}
            placeholder="320" unit="kW" />
          <FormField label="kWh Meter Reading *" id="kwhReading" type="number" step="0.1"
            value={data.kwhReading} onChange={v => updateField('kwhReading', v)}
            placeholder="142500" error={errors.kwhReading} unit="kWh" />
          <FormField label="Interval Consumption" id="demandIntervalKWH" type="number" step="0.1"
            value={data.demandIntervalKWH} onChange={v => updateField('demandIntervalKWH', v)}
            placeholder="48.5" unit="kWh" />
        </div>
      </div>

      {/* ── Panel Status ─────────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-muted/50">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          Panel Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main Breaker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Main Breaker Status</Label>
            <div className="flex gap-2 flex-wrap">
              {['closed', 'open', 'tripped'].map(s => (
                <button key={s} type="button"
                  onClick={() => updateField('mainBreakerStatus', s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition-all capitalize',
                    data.mainBreakerStatus === s
                      ? breakerColors[s]
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-border'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ground Fault */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ground Fault Status</Label>
            <div className="flex gap-2">
              {['normal', 'fault'].map(s => (
                <button key={s} type="button"
                  onClick={() => updateField('groundFaultStatus', s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition-all capitalize',
                    data.groundFaultStatus === s
                      ? s === 'normal' ? 'bg-success/20 border-success/50 text-success' : 'bg-destructive/20 border-destructive/50 text-destructive'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-border'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Busbar Temp */}
          <FormField label="Busbar Temp" id="busbarTemp" type="number" step="0.1"
            value={data.busbarTemp} onChange={v => updateField('busbarTemp', v)}
            placeholder="35" unit="°C" />
        </div>

        {/* Arc Flash Indicator */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 mt-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Arc Flash Indicator</Label>
            <p className="text-xs text-muted-foreground">Arc flash detection system active</p>
          </div>
          <Switch checked={data.arcFlashIndicator} onCheckedChange={v => updateField('arcFlashIndicator', v)} />
        </div>
      </div>

      {/* ── Safety Status ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-muted/50">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          Safety Status
        </h3>
        <div className="flex gap-2 flex-wrap mb-4">
          {['normal', 'warning', 'alarm', 'lockout'].map(s => (
            <button key={s} type="button"
              onClick={() => updateField('safetyStatus', s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition-all capitalize',
                data.safetyStatus === s
                  ? safetyColors[s]
                  : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-border'
              )}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
          <div>
            <Label className="text-sm font-medium text-foreground">Active Alarm</Label>
            <p className="text-xs text-muted-foreground">Any active alarm on the MPCC panel</p>
          </div>
          <Switch checked={data.alarmActive} onCheckedChange={v => updateField('alarmActive', v)} />
        </div>

        {data.alarmActive && (
          <div className="mt-3 space-y-2">
            <Label className="text-sm font-medium">Alarm Description</Label>
            <Textarea
              value={data.alarmDescription}
              onChange={e => updateField('alarmDescription', e.target.value)}
              placeholder="Describe the active alarm and any corrective action taken..."
              className="min-h-[80px]"
            />
          </div>
        )}
      </div>

      {/* ── Energy & Runtime ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Timer className="h-4 w-4 text-primary" />
          </div>
          Energy & Runtime
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Runtime Hours (this shift)" id="runtimeHours" type="number" step="0.1"
            value={data.runtimeHours} onChange={v => updateField('runtimeHours', v)}
            placeholder="8.0" unit="hrs" />
          <FormField label="kW Draw (avg this shift)" id="kwDraw" type="number" step="0.1"
            value={data.kwDraw} onChange={v => updateField('kwDraw', v)}
            placeholder="280" unit="kW" />
        </div>
        {data.runtimeHours && data.kwDraw && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <span className="text-muted-foreground">Estimated shift consumption: </span>
            <span className="font-bold text-primary">
              {(parseFloat(data.runtimeHours) * parseFloat(data.kwDraw)).toFixed(1)} kWh
            </span>
            <span className="text-muted-foreground ml-2">
              ≈ ${(parseFloat(data.runtimeHours) * parseFloat(data.kwDraw) * 0.18).toFixed(2)} @ $0.18/kWh
            </span>
          </div>
        )}
      </div>

      {/* ── Operator Notes ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Operator Notes</Label>
        <Textarea
          value={data.operatorNotes}
          onChange={e => updateField('operatorNotes', e.target.value)}
          placeholder="Any observations, abnormalities, corrective actions, or scheduled work..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
