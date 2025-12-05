import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, GraduationCap, Shield, TrendingUp, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
  id: string;
  date: string;
  timestampUTC: string;
  timestampLocal: string;
  type: string;
  system: "equipment" | "lms" | "compliance" | "analyzer";
  score: number;
  status: "success" | "warning" | "critical" | "info";
  payload?: Record<string, unknown>;
  triggerSource?: string;
  importance: number;
}

const mockData: FeedItem[] = [
  { 
    id: "1",
    date: "2025-01-15", 
    timestampUTC: "14:32:00 UTC",
    timestampLocal: "09:32:00 EST",
    type: "Compliance Check", 
    system: "compliance",
    score: 98, 
    status: "success",
    payload: { checkType: "annual", items: 42, passed: 41 },
    triggerSource: "Scheduled Task",
    importance: 85
  },
  { 
    id: "2",
    date: "2025-01-14", 
    timestampUTC: "11:15:00 UTC",
    timestampLocal: "06:15:00 EST",
    type: "Equipment Scan", 
    system: "equipment",
    score: 95, 
    status: "success",
    payload: { assetsScanned: 156, anomalies: 3 },
    triggerSource: "IoT Sensor",
    importance: 72
  },
  { 
    id: "3",
    date: "2025-01-13", 
    timestampUTC: "16:45:00 UTC",
    timestampLocal: "11:45:00 EST",
    type: "Risk Analysis", 
    system: "analyzer",
    score: 92, 
    status: "info",
    payload: { risksIdentified: 7, mitigated: 5 },
    triggerSource: "Manual Trigger",
    importance: 90
  },
  { 
    id: "4",
    date: "2025-01-12", 
    timestampUTC: "09:00:00 UTC",
    timestampLocal: "04:00:00 EST",
    type: "Course Completion", 
    system: "lms",
    score: 100, 
    status: "success",
    payload: { courseId: "SAFETY-101", completions: 24 },
    triggerSource: "User Action",
    importance: 60
  },
  { 
    id: "5",
    date: "2025-01-11", 
    timestampUTC: "22:30:00 UTC",
    timestampLocal: "17:30:00 EST",
    type: "System Health Alert", 
    system: "equipment",
    score: 67, 
    status: "warning",
    payload: { component: "Compressor #3", metric: "temperature", value: "87°C" },
    triggerSource: "Threshold Breach",
    importance: 95
  },
];

const systemConfig = {
  equipment: { icon: Cpu, color: "text-secondary", label: "Equipment Intelligence" },
  lms: { icon: GraduationCap, color: "text-primary", label: "LMS" },
  compliance: { icon: Shield, color: "text-accent", label: "Compliance Bot" },
  analyzer: { icon: TrendingUp, color: "text-primary", label: "Risk Analyzer" },
};

const statusConfig = {
  success: { color: "bg-primary/20 text-primary border-primary/30", label: "SUCCESS" },
  warning: { color: "bg-accent/20 text-accent border-accent/30", label: "WARNING" },
  critical: { color: "bg-destructive/20 text-destructive border-destructive/30", label: "CRITICAL" },
  info: { color: "bg-secondary/20 text-secondary border-secondary/30", label: "INFO" },
};

export const SystemFeed = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
      <CardHeader className="border-b border-border/30">
        <CardTitle className="flex items-center gap-3 text-foreground">
          <div className="p-2 rounded-lg bg-primary/20">
            <Activity className="w-5 h-5 text-primary animate-glow-pulse" />
          </div>
          <div>
            <span className="text-glow-primary">Live Telemetry Stream</span>
            <p className="text-xs font-normal text-muted-foreground mt-1">Real-time system activity feed</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/30 to-transparent" />
          
          {mockData.map((item, index) => {
            const SystemIcon = systemConfig[item.system].icon;
            const isExpanded = expandedId === item.id;
            
            return (
              <div
                key={item.id}
                className={cn(
                  "relative pl-16 pr-4 py-4",
                  "border-b border-border/20 last:border-b-0",
                  "hover:bg-muted/20 transition-all duration-300",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-6 top-6 w-5 h-5 rounded-full",
                  "flex items-center justify-center",
                  "bg-card border-2",
                  item.status === "critical" && "border-destructive",
                  item.status === "warning" && "border-accent",
                  item.status === "success" && "border-primary",
                  item.status === "info" && "border-secondary",
                  (item.status === "critical" || item.status === "warning") && "pulse-glow"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    item.status === "critical" && "bg-destructive",
                    item.status === "warning" && "bg-accent",
                    item.status === "success" && "bg-primary",
                    item.status === "info" && "bg-secondary"
                  )} />
                </div>

                {/* Event Card */}
                <div className={cn(
                  "rounded-xl p-4",
                  "bg-muted/30 border border-border/30",
                  "hover:border-primary/30 transition-all duration-300",
                  isExpanded && "border-primary/40"
                )}>
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-card/80", systemConfig[item.system].color)}>
                        <SystemIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{item.type}</h4>
                        <p className="text-xs text-muted-foreground">{systemConfig[item.system].label}</p>
                      </div>
                    </div>
                    <Badge className={statusConfig[item.status].color}>
                      {statusConfig[item.status].label}
                    </Badge>
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.timestampUTC}</span>
                    </div>
                    <span className="text-border">|</span>
                    <span>{item.timestampLocal}</span>
                  </div>

                  {/* Score Meter */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Health Score</span>
                      <span className={cn(
                        "font-mono font-bold",
                        item.score >= 90 && "text-primary",
                        item.score >= 70 && item.score < 90 && "text-secondary",
                        item.score < 70 && "text-accent"
                      )}>
                        {item.score}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          item.score >= 90 && "bg-primary",
                          item.score >= 70 && item.score < 90 && "bg-secondary",
                          item.score < 70 && "bg-accent"
                        )}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Expand Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full mt-3 text-muted-foreground hover:text-primary"
                  >
                    {isExpanded ? (
                      <>Hide Details <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>View Details <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Trigger Source</span>
                          <p className="font-medium text-foreground">{item.triggerSource}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Importance Score</span>
                          <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-accent" />
                            <span className="font-medium text-foreground">{item.importance}/100</span>
                          </div>
                        </div>
                      </div>
                      
                      {item.payload && (
                        <div>
                          <span className="text-muted-foreground text-xs">Raw Payload</span>
                          <pre className="mt-1 p-3 rounded-lg bg-card/80 text-xs font-mono text-muted-foreground overflow-x-auto">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
