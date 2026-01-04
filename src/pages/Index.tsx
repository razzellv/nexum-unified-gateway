import { useNavigate } from "react-router-dom";
import { SystemFeed } from "@/components/SystemFeed";
import { 
  GraduationCap, 
  Cpu, 
  Sparkles, 
  Database, 
  Command, 
  BarChart3, 
  CheckCircle,
  Clock,
  ScrollText,
  BookOpen,
  ShieldCheck,
  Gauge,
  Camera,
  Activity,
  MessageSquare,
  Upload,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ModuleStatus = "active" | "in-progress";

interface ModuleCardProps {
  title: string;
  subtitle?: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  colorTheme?: "primary" | "secondary" | "accent";
}

const ModuleCard = ({ 
  title, 
  subtitle,
  description, 
  route, 
  icon,
  status,
  colorTheme = "primary"
}: ModuleCardProps) => {
  const navigate = useNavigate();
  
  const colorClasses = {
    primary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(168_92%_55%/0.25)]",
      border: "border-primary/20 group-hover:border-primary/50",
      icon: "text-primary",
    },
    secondary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(210_100%_54%/0.25)]",
      border: "border-secondary/20 group-hover:border-secondary/50",
      icon: "text-secondary",
    },
    accent: {
      glow: "group-hover:shadow-[0_0_40px_hsl(24_100%_55%/0.25)]",
      border: "border-accent/20 group-hover:border-accent/50",
      icon: "text-accent",
    },
  };

  const statusConfig = {
    active: {
      label: "Active",
      className: "bg-green-500/10 text-green-500 border-green-500/30",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    "in-progress": {
      label: "Integration in Progress",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      icon: <Clock className="w-3 h-3" />,
    },
  };

  const currentStatus = statusConfig[status];
  
  return (
    <div 
      onClick={() => navigate(route)}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "bg-card/50 backdrop-blur-xl",
        "border transition-all duration-300",
        "hover:-translate-y-1 hover:scale-[1.02]",
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
            "p-3 rounded-lg bg-muted/50 transition-transform duration-300 group-hover:scale-110",
            colorClasses[colorTheme].icon
          )}>
            {icon}
          </div>
          
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              currentStatus.className
            )}
          >
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
        </div>
        
        {/* Title & Description */}
        <h3 className="text-lg font-semibold mb-1 group-hover:text-glow-primary transition-all">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mb-1">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
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

        {/* Active Modules */}
        <section className="rounded-xl border border-green-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Active Modules
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-green-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Equipment Intelligence"
              description="AI-powered nameplate analysis and equipment specs extraction"
              route="/equipment-intelligence"
              icon={<Camera className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Equipment Metrics"
              description="Real-time equipment performance and operational data"
              route="/equipment"
              icon={<Activity className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
          </div>
        </section>

        {/* Modules In Progress */}
        <section className="rounded-xl border border-blue-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Modules In Progress
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Facility Intelligence Dashboard"
              subtitle="(Facility Nexus Engine)"
              description="Manager, Supervisor, Executive, and Energy analytics dashboards"
              route="/dashboard"
              icon={<BarChart3 className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
            <ModuleCard
              title="Facility Data Source"
              description="Log daily operational readings and equipment data"
              route="/data-source"
              icon={<Upload className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
            <ModuleCard
              title="Facility Command Center"
              description="Work orders, maintenance scheduling, and operations management"
              route="/command-center"
              icon={<Command className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
            <ModuleCard
              title="Facility Instructor"
              description="AI chat assistant for technical, safety, and HR questions"
              route="/instructor"
              icon={<MessageSquare className="w-5 h-5" />}
              status="in-progress"
              colorTheme="accent"
            />
            <ModuleCard
              title="Compliance Analyzer"
              description="Automated compliance analysis and regulatory tracking"
              route="/compliance-analyzer"
              icon={<ShieldCheck className="w-5 h-5" />}
              status="in-progress"
              colorTheme="accent"
            />
            <ModuleCard
              title="Compliance Log"
              description="Compliance event logging and record keeping"
              route="/compliance-log"
              icon={<FileText className="w-5 h-5" />}
              status="in-progress"
              colorTheme="accent"
            />
            <ModuleCard
              title="Optimize & Learn"
              description="Training modules and continuous improvement programs"
              route="/optimize-learn"
              icon={<GraduationCap className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
          </div>
        </section>

        {/* Live Facility Telemetry */}
        <section className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-muted-foreground">Live Facility Telemetry</h2>
          </div>
          <div className="h-[150px] flex items-center justify-center overflow-x-auto">
            <p className="text-sm text-muted-foreground/60 italic">
              Real-time telemetry stream (integration in progress)
            </p>
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
