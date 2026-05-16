import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViolationTypeConfig } from '@/types/facility';
import { violationTypeConfigs } from '@/data/mockData';
import { loadCustomViolations, customToConfig } from '@/lib/customViolations';
import { cn } from '@/lib/utils';
import { getSeverityColor } from '@/lib/command-hub/violationService';

interface ViolationTypeSelectProps {
  value: string;
  onValueChange: (value: string, config: ViolationTypeConfig) => void;
  filterSector?: 'facility' | 'retail' | 'government';
}

const SECTOR_ORDER = ['general', 'facility', 'retail', 'government', 'custom'] as const;
const SECTOR_LABELS: Record<string, string> = {
  general:    'General',
  facility:   'Facility',
  retail:     'Retail',
  government: 'Government / Public Safety',
  custom:     'Custom (Organization-Defined)',
};

type GroupMap = Record<string, Record<string, ViolationTypeConfig[]>>;

function buildGroups(filterSector?: string): GroupMap {
  const groups: GroupMap = {};

  // Built-in violation types
  for (const cfg of violationTypeConfigs) {
    const sector = cfg.sector ?? 'general';
    if (filterSector && sector !== 'general' && sector !== filterSector) continue;
    const sub = cfg.subcategory ?? 'General';
    if (!groups[sector]) groups[sector] = {};
    if (!groups[sector][sub]) groups[sector][sub] = [];
    groups[sector][sub].push(cfg);
  }

  // Custom (organization-defined) violation types
  const customs = loadCustomViolations();
  for (const cv of customs) {
    const cfg = customToConfig(cv);
    const sub = cfg.subcategory ?? 'Custom';
    if (!groups['custom']) groups['custom'] = {};
    if (!groups['custom'][sub]) groups['custom'][sub] = [];
    groups['custom'][sub].push(cfg);
  }

  return groups;
}

// Fake config used when "Other" is chosen
const OTHER_CONFIG: ViolationTypeConfig = {
  value: 'other_custom' as any,
  label: 'Other — specify below',
  defaultSeverity: 5,
  defaultCategory: 'operational',
  weightFactor: 1,
};

export function ViolationTypeSelect({ value, onValueChange, filterSector }: ViolationTypeSelectProps) {
  const groups = buildGroups(filterSector);

  const handleChange = (val: string) => {
    if (val === 'other_custom') {
      onValueChange('other_custom', OTHER_CONFIG);
      return;
    }
    // Check built-in types
    const builtIn = violationTypeConfigs.find(c => c.value === val);
    if (builtIn) { onValueChange(val, builtIn); return; }
    // Check custom types
    const customs = loadCustomViolations();
    const cv = customs.find(c => `custom_${c.id}` === val);
    if (cv) { onValueChange(val, customToConfig(cv)); return; }
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
                {SECTOR_LABELS[sector]}{sub !== 'General' && sub !== 'Custom' ? ` › ${sub}` : ''}
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

        {/* Other — always last */}
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-2 pt-2">Other</SelectLabel>
          <SelectItem value="other_custom" className="cursor-pointer italic text-muted-foreground">
            Other — specify below
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
