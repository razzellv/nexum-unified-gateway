import { ToolCard } from "@/components/ToolCard";
import { SystemFeed } from "@/components/SystemFeed";
import { 
  GraduationCap, 
  Cpu, 
  FileCheck, 
  TrendingUp, 
  Sparkles, 
  Database, 
  Command, 
  BarChart3, 
  ExternalLink, 
  CheckCircle,
  XCircle,
  RefreshCw,
  ScrollText
} from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModuleCard = ({ 
  title, 
  description, 
  url, 
  icon,
  colorTheme = "primary"
}: { 
  title: string; 
  description: string; 
  url: string; 
  icon: React.ReactNode;
  colorTheme?: "primary" | "secondary" | "accent";
}) => {
  const { status } = useHealthCheck(url);
  
  const colorClasses = {
    primary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(168_92%_55%/0.25)]",
      border: "border-primary/20 group-hover:border-primary/50",
      icon: "text-primary",
      badge: status === "connected" 
        ? "bg-primary/10 text-primary border-primary/30" 
        : "bg-destructive/10 text-destructive border-destructive/30",
    },
    secondary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(210_100%_54%/0.25)]",
      border: "border-secondary/20 group-hover:border-secondary/50",
      icon: "text-secondary",
      badge: status === "connected"
        ? "bg-secondary/10 text-secondary border-secondary/30"
        : "bg-destructive/10 text-destructive border-destructive/30",
    },
    accent: {
      glow: "group-hover:shadow-[0_0_40px_hsl(24_100%_55%/0.25)]",
      border: "border-accent/20 group-hover:border-accent/50",
      icon: "text-accent",
      badge: status === "connected"
        ? "bg-accent/10 text-accent border-accent/30"
        : "bg-destructive/10 text-destructive border-destructive/30",
    },
  };
  
  return (
    <div 
      className={cn(
        "group relative rounded-xl overflow-hidden",
        "bg-card/50 backdrop-blur-xl",
        "border transition-all duration-300",
        "hover:-translate-y-1",
        colorClasses[colorTheme].border,
        colorClasses[colorTheme].glow
      )}
    >
      {/* Holographic overlay */}
      <div className="absolute inset-0 holographic opacity-10 group-hover:opacity-20 transition-opacity" />
      
      <div className="relative z-10 p-5">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-muted/50 transition-transform duration-300 group-hover:scale-105",
            colorClasses[colorTheme].icon
          )}>
            {icon}
          </div>
          
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              colorClasses[colorTheme].badge,
              status === "connected" && "pulse-glow"
            )}
          >
            {status === "connected" ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Online
              </>
            ) : status === "syncing" ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
        
        {/* Title & Description */}
        <h3 className="text-lg font-semibold mb-1 group-hover:text-glow-primary transition-all">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>
        
        {/* Launch Button */}
        <Button
          asChild
          size="sm"
          className={cn(
            "w-full font-medium",
            "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30",
            "transition-all duration-200"
          )}
        >
          <a href={url}>
            Open App
            <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary animate-glow-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-glow-primary">
              Nexum Suum™
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-14">
            Unified Operations Hub • Multi-Facility Command Center
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* System Tools Grid */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3">System Tools</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <ToolCard
              title="Courses (LMS)"
              description="Learning management and course delivery platform"
              route="/courses"
              status="connected"
              icon={<GraduationCap className="w-6 h-6" />}
              colorTheme="secondary"
            />
            <ToolCard
              title="Equipment Intelligence"
              description="Asset tracking and predictive maintenance"
              route="/equipment"
              status="connected"
              icon={<Cpu className="w-6 h-6" />}
              colorTheme="primary"
            />
            <ToolCard
              title="Compliance Analyzer"
              description="Automated compliance checking and reporting"
              route="/compliance"
              status="maintenance"
              icon={<FileCheck className="w-6 h-6" />}
              colorTheme="accent"
            />
            <ToolCard
              title="Virtuous Risk Analyzer"
              description="Risk assessment and mitigation strategies"
              route="/virtuous"
              status="connected"
              icon={<TrendingUp className="w-6 h-6" />}
              colorTheme="accent"
            />
          </div>
        </section>

        {/* Facility Modules */}
        <section className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-secondary/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3">Facility Modules</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-secondary/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Facility Data Source"
              description="Centralized facility data management and synchronization"
              url="https://facility-data-source.lovable.app"
              icon={<Database className="w-5 h-5" />}
              colorTheme="primary"
            />
            <ModuleCard
              title="Facility Command Center"
              description="Real-time facility operations and control hub"
              url="https://nexumsuum-facility-command-center.lovable.app"
              icon={<Command className="w-5 h-5" />}
              colorTheme="secondary"
            />
            <ModuleCard
              title="Facility Intelligence Dashboard"
              description="Analytics Core - Facility performance and system intelligence"
              url="https://nexumsuum-facilityintelligence-dash.lovable.app"
              icon={<BarChart3 className="w-5 h-5" />}
              colorTheme="primary"
            />
            <ModuleCard
              title="Nexus Log Keeper"
              description="Centralized event, audit, and operational log tracking"
              url="https://nexumsuum-compliance-log.lovable.app"
              icon={<ScrollText className="w-5 h-5" />}
              colorTheme="secondary"
            />
          </div>
        </section>

        {/* System Feed */}
        <section>
          <SystemFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Nexum Suum™ © 2025 • Powered by AWS + Lovable AI
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Support
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
