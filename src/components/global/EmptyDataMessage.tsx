import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Building2, Database, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyDataMessageProps {
  type: 'energy' | 'equipment' | 'general';
  context?: string;
  className?: string;
}

export function EmptyDataMessage({ type, context, className }: EmptyDataMessageProps) {
  const messages = {
    energy: {
      icon: Database,
      title: 'Energy data not yet configured',
      description: context 
        ? `No energy data available for ${context}.`
        : 'No energy data available for this selection.',
      suggestions: [
        'Select a specific building or facility',
        'Verify equipment logs have been submitted',
        'Contact your administrator to configure energy monitoring',
      ],
    },
    equipment: {
      icon: Settings,
      title: 'No equipment data available',
      description: context
        ? `No logs found for ${context}.`
        : 'No equipment logs found for this selection.',
      suggestions: [
        'Select a different system type',
        'Check if operators have submitted recent logs',
        'Verify the equipment is configured in the system',
      ],
    },
    general: {
      icon: AlertCircle,
      title: 'No data available',
      description: context || 'Data is not available for the current selection.',
      suggestions: [
        'Try adjusting your filters',
        'Select a different time range',
        'Contact support if this persists',
      ],
    },
  };

  const config = messages[type];
  const Icon = config.icon;

  return (
    <Card className={cn('border-muted bg-muted/10', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {config.description}
        </p>
        <div className="text-left">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Next steps:</p>
          <ul className="space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
