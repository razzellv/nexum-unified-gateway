import { ToolCard } from "@/components/ToolCard";
import { PortalButton } from "@/components/PortalButton";
import { SystemFeed } from "@/components/SystemFeed";
import { GraduationCap, Cpu, FileCheck, TrendingUp, Sparkles } from "lucide-react";

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

        {/* Portal Integration Bar */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-6 text-foreground">External Portals</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <PortalButton
              label="View in Systeme Portal"
              url="https://nexumsuum-clientportal.systeme.io/nxs-main-dash"
              variant="primary"
            />
            <PortalButton
              label="Open Same.new Dashboard"
              url="https://same.new/portal/nexum"
              variant="secondary"
            />
            <PortalButton
              label="Admin Login (AWS Cognito)"
              url="https://portal.nexumsuum.com/login"
              variant="default"
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
