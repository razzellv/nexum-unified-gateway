import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViolationType, ViolationTypeConfig } from '@/types/facility';
import { violationTypeConfigs } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { getSeverityColor } from '@/lib/command-hub/violationService';

interface ViolationTypeSelectProps {
  value: ViolationType | '';
  onValueChange: (value: ViolationType, config: ViolationTypeConfig) => void;
}

export function ViolationTypeSelect({ value, onValueChange }: ViolationTypeSelectProps) {
  const handleChange = (val: string) => {
    const config = violationTypeConfigs.find(c => c.value === val);
    if (config) {
      onValueChange(val as ViolationType, config);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder="Select violation type..." />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        {violationTypeConfigs.map((config) => (
          <SelectItem 
            key={config.value} 
            value={config.value}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between gap-4 w-full">
              <span>{config.label}</span>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("font-medium", getSeverityColor(config.defaultSeverity))}>
                  Sev: {config.defaultSeverity}
                </span>
                <span className="text-muted-foreground">
                  {config.weightFactor}x
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
