import { useState } from 'react';
import type { EnergyMeter, EnergyReading, CostConfig } from '@/types/energy';
import {
  calcConsumption, calcBTUs, calcCarbon, calcCost, calcIntensityPerSqFt,
  calcIntensityPerOccupant, getSeason, detectEvents, saveReading, saveEvent,
  generateOIExplanation,
} from '@/lib/energy-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  meter: EnergyMeter;
  history: EnergyReading[];
  config: CostConfig;
  facilityId: string;
  operator: string;
  onSaved: () => void;
}

export function ReadingDialog({ open, onClose, meter, history, config, facilityId, operator, onSaved }: Props) {
  const { toast } = useToast();
  const lastReading = history
    .filter(r => r.meterId === meter.meterId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const [form, setForm] = useState({
    currentReading:  '',
    previousReading: lastReading?.currentReading?.toString() || '',
    demandKw:        '',
    peakConsumption: '',
    offPeakConsumption: '',
    outsideAirTemp:  '',
    occupancy:       '',
    shift:           '',
    productionStatus:'',
    isHoliday:       false,
    isWeekend:       new Date().getDay() === 0 || new Date().getDay() === 6,
    abnormalEvent:   '',
    notes:           '',
    timestamp:       new Date().toISOString().slice(0, 16),
  });

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function preview() {
    const cur  = parseFloat(form.currentReading) || 0;
    const prev = parseFloat(form.previousReading) || 0;
    const consumption = calcConsumption(cur, prev, meter.meterMultiplier);
    const demandKw    = parseFloat(form.demandKw) || undefined;
    const ts          = new Date(form.timestamp).toISOString();
    const cost        = calcCost(consumption, meter.utilityType, config, ts, demandKw);
    return { consumption, cost, btus: calcBTUs(consumption, meter.utilityType), carbon: calcCarbon(consumption, meter.utilityType) };
  }

  const pre = preview();

  function save() {
    const cur  = parseFloat(form.currentReading);
    const prev = parseFloat(form.previousReading);
    if (isNaN(cur) || isNaN(prev)) {
      toast({ title: 'Current and previous readings are required', variant: 'destructive' }); return;
    }
    const ts          = new Date(form.timestamp).toISOString();
    const consumption = calcConsumption(cur, prev, meter.meterMultiplier);
    const demandKw    = parseFloat(form.demandKw) || undefined;
    const cost        = calcCost(consumption, meter.utilityType, config, ts, demandKw);
    const date        = new Date(ts);

    const reading: EnergyReading = {
      readingId:          `rg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      meterId:            meter.meterId,
      utilityType:        meter.utilityType,
      timestamp:          ts,
      operator,
      building:           meter.building,
      equipment:          meter.equipmentServed,
      currentReading:     cur,
      previousReading:    prev,
      unit:               meter.unit,
      meterMultiplier:    meter.meterMultiplier,
      consumption,
      peakConsumption:    parseFloat(form.peakConsumption) || undefined,
      offPeakConsumption: parseFloat(form.offPeakConsumption) || undefined,
      season:             getSeason(date),
      outsideAirTemp:     parseFloat(form.outsideAirTemp) || undefined,
      occupancy:          parseFloat(form.occupancy) || undefined,
      shift:              form.shift || undefined,
      productionStatus:   form.productionStatus || undefined,
      isHoliday:          form.isHoliday,
      isWeekend:          form.isWeekend,
      abnormalEvent:      form.abnormalEvent || undefined,
      notes:              form.notes,
      cost,
      demandKw,
      carbonLbs:          calcCarbon(consumption, meter.utilityType),
      btus:               calcBTUs(consumption, meter.utilityType),
      intensityPerSqFt:   calcIntensityPerSqFt(consumption, config.squareFeet),
      intensityPerOccupant: calcIntensityPerOccupant(consumption, config.occupantCount),
      createdAt:          new Date().toISOString(),
    };

    saveReading(facilityId, reading);

    // Detect and save events
    const events = detectEvents(reading, history, meter);
    events.forEach(e => saveEvent(facilityId, e));

    if (events.length > 0) {
      toast({
        title: `⚡ ${events.length} Event${events.length > 1 ? 's' : ''} Detected`,
        description: events.map(e => e.title).join('; '),
      });
    } else {
      toast({ title: 'Reading Logged', description: `${consumption.toFixed(1)} ${meter.unit} — $${cost.toFixed(2)}` });
    }

    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-[#00FFE1]">Log Reading — {meter.label || meter.meterNumber}</DialogTitle>
        </DialogHeader>

        {/* Live preview */}
        <div className="grid grid-cols-4 gap-2 bg-white/3 rounded-lg p-3 border border-white/10">
          {[
            { label: 'Consumption', value: `${pre.consumption.toFixed(1)} ${meter.unit}` },
            { label: 'Cost',        value: `$${pre.cost.toFixed(2)}` },
            { label: 'BTUs',        value: pre.btus > 1e6 ? `${(pre.btus/1e6).toFixed(1)}M` : pre.btus.toLocaleString() },
            { label: 'Carbon',      value: `${pre.carbon.toFixed(1)} lbs` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="text-sm font-semibold text-[#00FFE1]">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Current Reading *</Label>
            <Input type="number" value={form.currentReading} onChange={e => set('currentReading', e.target.value)} placeholder={`Current ${meter.unit}`} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Previous Reading *</Label>
            <Input type="number" value={form.previousReading} onChange={e => set('previousReading', e.target.value)} placeholder="Previous reading" className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Timestamp</Label>
            <Input type="datetime-local" value={form.timestamp} onChange={e => set('timestamp', e.target.value)} className="h-8 mt-1" />
          </div>
          {meter.hasDemandCharges && (
            <div>
              <Label className="text-xs text-muted-foreground">Peak Demand (kW)</Label>
              <Input type="number" value={form.demandKw} onChange={e => set('demandKw', e.target.value)} placeholder="kW" className="h-8 mt-1" />
            </div>
          )}
          {meter.touEnabled && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">On-Peak Consumption</Label>
                <Input type="number" value={form.peakConsumption} onChange={e => set('peakConsumption', e.target.value)} className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Off-Peak Consumption</Label>
                <Input type="number" value={form.offPeakConsumption} onChange={e => set('offPeakConsumption', e.target.value)} className="h-8 mt-1" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Outside Air Temp (°F)</Label>
            <Input type="number" value={form.outsideAirTemp} onChange={e => set('outsideAirTemp', e.target.value)} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Occupancy (%)</Label>
            <Input type="number" value={form.occupancy} onChange={e => set('occupancy', e.target.value)} min={0} max={100} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Shift</Label>
            <Select value={form.shift} onValueChange={v => set('shift', v)}>
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                {['Day', 'Evening', 'Night', 'Weekend', 'All-Day'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Production Status</Label>
            <Select value={form.productionStatus} onValueChange={v => set('productionStatus', v)}>
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {['Full Production', 'Partial', 'Idle', 'Shutdown', 'Maintenance'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 col-span-2 pt-1">
            {[
              { key: 'isHoliday', label: 'Holiday' },
              { key: 'isWeekend', label: 'Weekend' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={e => set(key, e.target.checked)}
                  className="accent-[#00FFE1]"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Abnormal Event</Label>
            <Input value={form.abnormalEvent} onChange={e => set('abnormalEvent', e.target.value)} placeholder="e.g. Chiller #2 started, storm event" className="h-8 mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} className="bg-[#00FFE1]/10 text-[#00FFE1] border border-[#00FFE1]/30 hover:bg-[#00FFE1]/20">
            Log Reading
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
