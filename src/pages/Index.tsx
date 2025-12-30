import { ToolCard } from "@/components/ToolCard";
import { SystemFeed } from "@/components/SystemFeed";
import { GraduationCap, Cpu, FileCheck, TrendingUp, Sparkles, Database, Command, BarChart3, ExternalLink, CheckCircle } from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";

const ModuleCard = ({ 
  title, 
  description, 
  url, 
  icon 
}: { 
  title: string; 
  description: string; 
  url: string; 
  icon: React.ReactNode;
}) => {
  const { status } = useHealthCheck(url);
  
  return (
    <a 
      href={url} 
      rel="noopener noreferrer" 
      className="block group"
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 hover:shadow-primary/10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                {title}
              </h3>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>{status === "connected" ? "Online" : status === "syncing" ? "Connecting" : "Offline"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </a>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary animate-glow-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold text-glow-primary">
              Nexum Suum
            </h1>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Unified Operations Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Access all Nexum Suum AI Systems from one hub
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Tool Grid */}
        <section>
          <h3 className="text-2xl font-bold mb-6 text-foreground">System Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ToolCard
              title="Courses (LMS)"
              description="Learning management and course delivery platform"
              route="/courses"
              status="connected"
              icon={<GraduationCap className="w-6 h-6" />}
            />
            <ToolCard
              title="Equipment Intelligence"
              description="Asset tracking and predictive maintenance"
              route="/equipment"
              status="connected"
              icon={<Cpu className="w-6 h-6" />}
            />
            <ToolCard
              title="Compliance Analyzer"
              description="Automated compliance checking and reporting"
              route="/compliance"
              status="maintenance"
              icon={<FileCheck className="w-6 h-6" />}
            />
            <ToolCard
              title="Virtuous Risk Analyzer"
              description="Risk assessment and mitigation strategies"
              route="/virtuous"
              status="connected"
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Facility Modules */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-6 text-foreground">Facility Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ModuleCard
              title="Facility Data Source"
              description="Centralized facility data management and synchronization"
              url="https://facility-data-source.lovable.app"
              icon={<Database className="w-6 h-6" />}
            />
            <ModuleCard
              title="Facility Command Center"
              description="Real-time facility operations and control hub"
              url="https://nexumsuum-facility-command-center.lovable.app"
              icon={<Command className="w-6 h-6" />}
            />
            <ModuleCard
              title="Facility Intelligence Dashboard (Analytics Core)"
              description="Facility performance analytics and system intelligence views"
              url="https://nexumsuum-facilityintelligence-dash.lovable.app"
              icon={<BarChart3 className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* System Feed */}
        <section>
          <SystemFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Nexum Suum © 2025 | Powered by AWS + Google Apps Script + Lovable AI
            </p>
            <div className="flex gap-6 text-sm">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors hover:text-glow-primary"
              >
                Support
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors hover:text-glow-primary"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors hover:text-glow-primary"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors hover:text-glow-primary"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
