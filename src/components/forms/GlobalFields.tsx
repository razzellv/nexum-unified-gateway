import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Building2, AlertTriangle, Gauge, Thermometer } from 'lucide-react';
import { Shift, SystemInfo, MeasurementType } from '@/types/logging';
import { mockUser, getCurrentShift } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface GlobalFieldsProps {
  facility: string;
  building: string;
  system: SystemInfo | null;
  isFacilityLevel?: boolean;
  shift: Shift;
  onShiftChange: (shift: Shift) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  abnormalCondition: boolean;
  onAbnormalChange: (abnormal: boolean) => void;
  measurementType: MeasurementType;
  onMeasurementTypeChange: (type: MeasurementType) => void;
  reviewNotes?: string;
  onReviewNotesChange?: (notes: string) => void;
  showReviewNotes?: boolean;
  isReadOnly?: boolean;
  oat?: string;
  onOatChange?: (val: string) => void;
}

export function GlobalFields({
  facility,
  building,
  system,
  isFacilityLevel = false,
  shift,
  onShiftChange,
  notes,
  onNotesChange,
  abnormalCondition,
  onAbnormalChange,
  measurementType,
  onMeasurementTypeChange,
  reviewNotes,
  onReviewNotesChange,
  showReviewNotes = false,
  isReadOnly = false,
  oat,
  onOatChange,
}: GlobalFieldsProps) {
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="form-section space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Entry Information
        </h3>
        {isReadOnly && (
          <Badge variant="secondary" className="text-xs">Read Only</Badge>
        )}
      </div>

      {/* Auto-captured fields */}
      <div className={cn('grid gap-3', isFacilityLevel ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Facility</p>
          <p className="font-medium text-sm truncate">{facility}</p>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Building</p>
          <p className="font-medium text-sm truncate">{building}</p>
        </div>
        {!isFacilityLevel && (
          <>
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Asset Tag</p>
              <p className="font-medium text-sm font-mono">{system?.assetTag || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="font-medium text-sm truncate">{system?.location || '—'}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Date & Time</p>
            <p className="font-medium text-sm font-mono">{currentTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Entered By</p>
            <p className="font-medium text-sm">{mockUser.name}</p>
          </div>
        </div>
      </div>

      {/* Shift selector */}
      <div className="input-group">
        <Label className="text-sm font-medium">Shift</Label>
        <Select value={shift} onValueChange={(v) => onShiftChange(v as Shift)} disabled={isReadOnly}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day Shift (6:00 AM - 2:00 PM)</SelectItem>
            <SelectItem value="evening">Evening Shift (2:00 PM - 10:00 PM)</SelectItem>
            <SelectItem value="night">Night Shift (10:00 PM - 6:00 AM)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Measurement Type - Required for all logs */}
      <div className="input-group">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Measurement Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {(['measured', 'estimated'] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={isReadOnly}
              onClick={() => onMeasurementTypeChange(type)}
              className={cn(
                'p-3 rounded-lg border-2 font-medium text-sm capitalize transition-all',
                measurementType === type
                  ? type === 'measured'
                    ? 'bg-success/20 border-success/50 text-success'
                    : 'bg-warning/20 border-warning/50 text-warning'
                  : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border',
                isReadOnly && 'opacity-50 cursor-not-allowed'
              )}
            >
              {type}
            </button>
          ))}
        </div>
        {measurementType === 'estimated' && (
          <p className="text-xs text-warning flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" />
            This entry will be tagged as estimated data
          </p>
        )}
      </div>

      {/* Outside Air Temperature */}
      <div className="input-group">
        <Label htmlFor="oat" className="text-sm font-medium flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-sky-400" />
          Outside Air Temperature (OAT) °F
        </Label>
        <Input
          id="oat"
          type="number"
          value={oat ?? ''}
          onChange={(e) => onOatChange?.(e.target.value)}
          placeholder="e.g. 32"
          disabled={isReadOnly}
          className="w-40"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Required for governance — affects efficiency benchmarks and load correlation.
        </p>
      </div>

      {/* Notes */}
      <div className="input-group">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes / Observations
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Enter any observations, unusual conditions, or additional notes..."
          className="min-h-[100px] resize-none"
          disabled={isReadOnly}
        />
      </div>

      {/* Supervisor Review Notes */}
      {showReviewNotes && (
        <div className="input-group">
          <Label htmlFor="reviewNotes" className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Supervisor Review Notes
          </Label>
          <Textarea
            id="reviewNotes"
            value={reviewNotes || ''}
            onChange={(e) => onReviewNotesChange?.(e.target.value)}
            placeholder="Add supervisor review comments..."
            className="min-h-[80px] resize-none border-primary/30"
            disabled={isReadOnly}
          />
        </div>
      )}

      {/* Abnormal condition toggle */}
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-lg border-2 transition-colors',
          abnormalCondition
            ? 'bg-destructive/10 border-destructive/50'
            : 'bg-background/50 border-border/50'
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              abnormalCondition ? 'text-destructive' : 'text-muted-foreground'
            )}
          />
          <div>
            <p className="font-medium text-sm">Abnormal Condition</p>
            <p className="text-xs text-muted-foreground">
              Toggle if any abnormal conditions were observed
            </p>
          </div>
        </div>
        <Switch
          checked={abnormalCondition}
          onCheckedChange={onAbnormalChange}
          className="data-[state=checked]:bg-destructive"
          disabled={isReadOnly}
        />
      </div>
    </div>
  );
}
