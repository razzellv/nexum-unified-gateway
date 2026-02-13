import { AlertTriangle, Clock, Users, Building2, MessageSquare, Paperclip, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Emergency } from '@/types/facility';

interface EmergencyCardProps {
  emergency: Emergency;
}

const typeIcons: Record<string, string> = {
  'fire': '🔥',
  'flood': '🌊',
  'power-loss': '⚡',
  'chiller-fail': '❄️',
  'boiler-lockout': '🔥',
  'production-shutdown': '🏭',
  'chemical-spill': '☢️'
};

const statusStyles = {
  'active': 'bg-critical/20 border-critical/50 text-critical',
  'contained': 'bg-warning/20 border-warning/50 text-warning',
  'resolved': 'bg-success/20 border-success/50 text-success'
};

export function EmergencyCard({ emergency }: EmergencyCardProps) {
  const duration = emergency.endTime 
    ? Math.round((new Date(emergency.endTime).getTime() - new Date(emergency.startTime).getTime()) / (1000 * 60))
    : Math.round((Date.now() - new Date(emergency.startTime).getTime()) / (1000 * 60));

  return (
    <div className={cn(
      "glass-panel p-5 border-l-4",
      emergency.status === 'active' && "border-l-critical animate-pulse",
      emergency.status === 'contained' && "border-l-warning",
      emergency.status === 'resolved' && "border-l-success"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[emergency.type]}</span>
          <div>
            <h3 className="text-lg font-semibold">{emergency.title}</h3>
            <p className="text-sm text-muted-foreground">{emergency.location}</p>
          </div>
        </div>
        <Badge className={cn("capitalize", statusStyles[emergency.status])}>
          {emergency.status}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">{emergency.description}</p>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 mb-4 py-3 border-y border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>{duration} min {!emergency.endTime && '(ongoing)'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>{emergency.personnelNotified.length} personnel</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span>{emergency.vendorsContacted.length} vendors</span>
        </div>
      </div>

      {/* Resources */}
      {emergency.resources.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Resources Deployed</p>
          <div className="flex flex-wrap gap-2">
            {emergency.resources.map((resource, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {resource}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Timeline preview */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Latest Update</p>
        {emergency.timeline.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-sm">{emergency.timeline[emergency.timeline.length - 1].action}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(emergency.timeline[emergency.timeline.length - 1].timestamp).toLocaleTimeString()} • 
              {emergency.timeline[emergency.timeline.length - 1].author}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <MessageSquare className="w-4 h-4 mr-1" />
          Chat
        </Button>
        <Button size="sm" className="flex-1">
          Command Center
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
