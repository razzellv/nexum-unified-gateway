import { ToolCard } from "@/components/ToolCard";
import { HologramCard } from "@/components/HologramCard";
import { SystemFeed } from "@/components/SystemFeed";
import { GridBackground } from "@/components/GridBackground";
import { AIWidget } from "@/components/AIWidget";
import { NotificationBar } from "@/components/NotificationBar";
import { FuturisticPanel } from "@/components/FuturisticPanel";
import { SystemeIntegration } from "@/components/SystemeIntegration";
import { externalApps } from "@/config/systeme";
import { GraduationCap, Cpu, FileCheck, TrendingUp, Sparkles, Zap, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated background */}
      <GridBackground />

      {/* Header */}
      <header className="relative z-40 border-b border-border/30 bg-card/30 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <Sparkles className="w-10 h-10 text-primary animate-glow-pulse" />
                  <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-glow-primary tracking-tight">
                  Nexum Suum
                </h1>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                Unified Operations Dashboard
              </h2>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Access all Nexum Suum AI Systems from one hub
              </p>
            </div>
            
            {/* Right side: Notifications */}
            <div className="flex items-center gap-4">
              <NotificationBar />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 space-y-12">
        {/* System Tools Grid */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/20">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground text-glow-primary">System Modules</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ToolCard
              title="Courses (LMS)"
              description="Learning management and course delivery platform with AI-powered recommendations"
              route="/courses"
              externalUrl="https://nexum-optimize-learn.lovable.app"
              status="connected"
              icon={<GraduationCap className="w-7 h-7" />}
              colorTheme="primary"
            />
            <ToolCard
              title="Equipment Intelligence"
              description="Asset tracking, predictive maintenance, and IoT sensor analytics"
              route="/equipment"
              externalUrl="https://nexum-insight-engine.lovable.app"
              status="connected"
              icon={<Cpu className="w-7 h-7" />}
              colorTheme="secondary"
            />
            <ToolCard
              title="Compliance Analyzer"
              description="Automated compliance checking, reporting, and regulatory tracking"
              route="/compliance"
              externalUrl="https://suit-compliance-bot.lovable.app"
              status="connected"
              icon={<FileCheck className="w-7 h-7" />}
              colorTheme="accent"
            />
            <ToolCard
              title="Virtuous Risk Analyzer"
              description="Risk assessment, mitigation strategies, and predictive analytics"
              route="/virtuous"
              status="connected"
              icon={<TrendingUp className="w-7 h-7" />}
              colorTheme="primary"
            />
          </div>
        </section>

        {/* External Portals */}
        <section>
          <FuturisticPanel className="p-6" glowColor="secondary">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Globe className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground text-glow-secondary">External Portals</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HologramCard
                title="Systeme.io Portal"
                description="CRM sync, automation workflows, and client management"
                url={externalApps.find(a => a.id === "systeme")?.url || ""}
                healthEndpoint={externalApps.find(a => a.id === "systeme")?.healthEndpoint}
                icon={<Users className="w-6 h-6" />}
                colorTheme="primary"
              />
              <HologramCard
                title="Admin Portal (AWS)"
                description="Equipment library, user management, and system configuration"
                url={externalApps.find(a => a.id === "admin")?.url || ""}
                healthEndpoint={externalApps.find(a => a.id === "admin")?.healthEndpoint}
                icon={<Globe className="w-6 h-6" />}
                colorTheme="accent"
              />
            </div>
          </FuturisticPanel>
        </section>

        {/* Systeme.io Integration Module */}
        <section>
          <SystemeIntegration />
        </section>

        {/* System Feed */}
        <section>
          <SystemFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 bg-card/30 backdrop-blur-xl mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Nexum Suum © 2025 | Powered by AWS + Google Apps Script + Lovable AI
            </p>
            <div className="flex gap-6 text-sm">
              {["Support", "Terms", "Privacy", "Logout"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className={cn(
                    "text-muted-foreground",
                    "hover:text-primary transition-all duration-300",
                    "hover:text-glow-primary"
                  )}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* AI Assistant Widget */}
      <AIWidget />
    </div>
  );
};

export default Index;
