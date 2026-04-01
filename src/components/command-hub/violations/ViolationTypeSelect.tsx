import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViolationType, ViolationTypeConfig } from '@/types/facility';
import { violationTypeConfigs } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { getSeverityColor } from '@/lib/command-hub/violationService';

interface ViolationTypeSelectProps {
  value: ViolationType | '';
  onValueChange: (value: ViolationType, config: ViolationTypeConfig) => void;
}

// Build grouped structure: General → Facility (Equipment/Custodian/Compliance) → Retail → Government
const SECTOR_ORDER = ['general', 'facility', 'retail', 'government'] as const;
const SECTOR_LABELS: Record<string, string> = {
  general: 'General',
  facility: 'Facility',
  retail: 'Retail',
  government: 'Government / Public Safety',
};

type GroupMap = Record<string, Record<string, ViolationTypeConfig[]>>;

function buildGroups(): GroupMap {
  const groups: GroupMap = {};
  for (const cfg of violationTypeConfigs) {
    const sector = cfg.sector ?? 'general';
    const sub = cfg.subcategory ?? 'General';
    if (!groups[sector]) groups[sector] = {};
    if (!groups[sector][sub]) groups[sector][sub] = [];
    groups[sector][sub].push(cfg);
  }
  return groups;
}

const groups = buildGroups();

export function ViolationTypeSelect({ value, onValueChange }: ViolationTypeSelectProps) {
  const handleChange = (val: string) => {
    const config = violationTypeConfigs.find(c => c.value === val);
    if (config) onValueChange(val as ViolationType, config);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder="Select violation type..." />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50 max-h-80">
        {SECTOR_ORDER.map(sector => {
          const subs = groups[sector];
          if (!subs) return null;
          return Object.entries(subs).map(([sub, configs]) => (
            <SelectGroup key={`${sector}-${sub}`}>
              <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pt-2">
                {SECTOR_LABELS[sector]}{sub !== 'General' ? ` › ${sub}` : ''}
              </SelectLabel>
              {configs.map(config => (
                <SelectItem key={config.value} value={config.value} className="cursor-pointer">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span>{config.label}</span>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className={cn('font-medium', getSeverityColor(config.defaultSeverity))}>
                        Sev: {config.defaultSeverity}
                      </span>
                      <span className="text-muted-foreground">{config.weightFactor}x</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ));
        })}
      </SelectContent>
    </Select>
  );
}
