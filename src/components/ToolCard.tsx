import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Wifi, RefreshCw, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  title: string;
  description: string;
  route: string;
  externalUrl?: string;
  status: "connected" | "maintenance";
  icon: React.ReactNode;
  colorTheme?: "primary" | "secondary" | "accent";
}

export const ToolCard = ({ 
  title, 
  description, 
  route, 
  externalUrl,
  status, 
  icon,
  colorTheme = "primary"
}: ToolCardProps) => {
  const [uptime, setUptime] = useState(99.2);
  const [isSyncing, setIsSyncing] = useState(false);

  // Simulate sync animation
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  useEffect(() => {
    // Simulate slight uptime variations
    const interval = setInterval(() => {
      setUptime(prev => Math.max(95, Math.min(100, prev + (Math.random() - 0.5) * 0.5)));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const colorClasses = {
    primary: {
      glow: "group-hover:shadow-[0_0_50px_hsl(168_92%_55%/0.3)]",
      border: "border-primary/20 group-hover:border-primary/50",
      icon: "text-primary bg-primary/10",
      button: "bg-primary hover:bg-primary-glow text-primary-foreground",
    },
    secondary: {
      glow: "group-hover:shadow-[0_0_50px_hsl(210_100%_54%/0.3)]",
      border: "border-secondary/20 group-hover:border-secondary/50",
      icon: "text-secondary bg-secondary/10",
      button: "bg-secondary hover:bg-secondary-glow text-secondary-foreground",
    },
    accent: {
      glow: "group-hover:shadow-[0_0_50px_hsl(24_100%_55%/0.3)]",
      border: "border-accent/20 group-hover:border-accent/50",
      icon: "text-accent bg-accent/10",
      button: "bg-accent hover:bg-accent-glow text-accent-foreground",
    },
  };

  const targetUrl = externalUrl || route;
  const isExternal = !!externalUrl;

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-card/40 backdrop-blur-xl",
        "border-2 transition-all duration-500",
        "hover:-translate-y-2 hover:scale-[1.01]",
        colorClasses[colorTheme].border,
        colorClasses[colorTheme].glow,
        "animate-fade-in-up"
      )}
    >
      {/* Circuit border animation */}
      <div className="absolute inset-0 circuit-border rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Holographic overlay */}
      <div className="absolute inset-0 holographic opacity-10 group-hover:opacity-20 transition-opacity" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-4 rounded-xl transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            colorClasses[colorTheme].icon
          )}>
            {icon}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sync Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSync}
              className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isSyncing && "animate-spin")} />
            </Button>
            
            {/* Status Badge */}
            <Badge 
              className={cn(
                "flex items-center gap-1.5",
                status === "connected" 
                  ? "bg-primary/20 text-primary border-primary/30 pulse-glow" 
                  : "bg-accent/20 text-accent border-accent/30"
              )}
            >
              {status === "connected" ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Online
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3" />
                  Maintenance
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          "text-xl font-semibold mb-2",
          "group-hover:text-glow-primary transition-all duration-300"
        )}>
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {description}
        </p>

        {/* Uptime Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">System Uptime</span>
            <span className="font-mono text-primary font-bold">{uptime.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
              style={{ width: `${uptime}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        {isExternal ? (
          <Button 
            asChild
            className={cn(
              "w-full font-semibold group/btn",
              "transition-all duration-300",
              colorClasses[colorTheme].button
            )}
          >
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              Launch App
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </a>
          </Button>
        ) : (
          <Button 
            asChild
            className={cn(
              "w-full font-semibold group/btn",
              "transition-all duration-300",
              colorClasses[colorTheme].button
            )}
          >
            <a href={targetUrl}>
              Open App
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};
