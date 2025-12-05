import { useState, useEffect } from "react";
import { ExternalLink, Wifi, WifiOff, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HologramCardProps {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  colorTheme?: "primary" | "secondary" | "accent";
}

export const HologramCard = ({ 
  title, 
  description, 
  url, 
  icon,
  colorTheme = "primary" 
}: HologramCardProps) => {
  const [status, setStatus] = useState<"connected" | "syncing" | "offline">("syncing");
  const [ping, setPing] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Simulate ping check
  useEffect(() => {
    const checkStatus = () => {
      const startTime = Date.now();
      // Simulate network check
      setTimeout(() => {
        const latency = Math.floor(Math.random() * 80) + 20;
        setPing(latency);
        setStatus(latency < 150 ? "connected" : "offline");
        setLastSync(new Date());
      }, 100);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const colorClasses = {
    primary: {
      glow: "group-hover:shadow-[0_0_60px_hsl(168_92%_55%/0.4)]",
      border: "border-primary/30 group-hover:border-primary/60",
      icon: "text-primary",
      button: "bg-primary hover:bg-primary-glow text-primary-foreground",
    },
    secondary: {
      glow: "group-hover:shadow-[0_0_60px_hsl(210_100%_54%/0.4)]",
      border: "border-secondary/30 group-hover:border-secondary/60",
      icon: "text-secondary",
      button: "bg-secondary hover:bg-secondary-glow text-secondary-foreground",
    },
    accent: {
      glow: "group-hover:shadow-[0_0_60px_hsl(24_100%_55%/0.4)]",
      border: "border-accent/30 group-hover:border-accent/60",
      icon: "text-accent",
      button: "bg-accent hover:bg-accent-glow text-accent-foreground",
    },
  };

  const statusConfig = {
    connected: { color: "bg-primary/20 text-primary border-primary/30", icon: Wifi, label: "Connected" },
    syncing: { color: "bg-secondary/20 text-secondary border-secondary/30", icon: Zap, label: "Syncing" },
    offline: { color: "bg-destructive/20 text-destructive border-destructive/30", icon: WifiOff, label: "Offline" },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div 
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-card/40 backdrop-blur-2xl",
        "border-2 transition-all duration-500",
        "hover:-translate-y-2 hover:scale-[1.02]",
        colorClasses[colorTheme].border,
        colorClasses[colorTheme].glow
      )}
    >
      {/* 3D Holographic effect layers */}
      <div className="absolute inset-0 holographic opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-background/40" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 scan-line" />
      </div>

      <div className="relative z-10 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-4 rounded-xl",
            "bg-gradient-to-br from-card/80 to-muted/40",
            "border border-border/50",
            "group-hover:scale-110 transition-transform duration-300",
            colorClasses[colorTheme].icon
          )}>
            {icon}
          </div>
          
          <Badge 
            className={cn(
              "flex items-center gap-1.5",
              statusConfig[status].color,
              status === "connected" && "pulse-glow"
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig[status].label}
          </Badge>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className={cn(
            "text-xl font-semibold mb-2",
            "group-hover:text-glow-primary transition-all"
          )}>
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {ping !== null && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary" />
              <span>Ping: {ping}ms</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-secondary" />
            <span>Last Sync: {lastSync.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Launch Button */}
        <Button
          asChild
          className={cn(
            "w-full font-semibold",
            "transition-all duration-300",
            colorClasses[colorTheme].button,
            "group-hover:glow-primary"
          )}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Launch Portal
            <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </Button>
      </div>
    </div>
  );
};
