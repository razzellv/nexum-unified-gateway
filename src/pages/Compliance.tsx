import { Button } from "@/components/ui/button";
import { ArrowLeft, FileCheck, Shield, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { GridBackground } from "@/components/GridBackground";
import { FuturisticPanel } from "@/components/FuturisticPanel";

const Compliance = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <GridBackground />
      
      <header className="relative z-10 border-b border-border/30 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-glow-accent">Compliance Analyzer</h1>
          <p className="text-muted-foreground mt-1">Automated compliance checking and reporting</p>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Shield, title: "Compliance Score", value: "98%", color: "primary" },
            { icon: FileCheck, title: "Checks Passed", value: "142", color: "primary" },
            { icon: AlertCircle, title: "Action Items", value: "3", color: "accent" },
          ].map((item, i) => (
            <FuturisticPanel key={i} className="p-6" glowColor={item.color as any}>
              <item.icon className={`w-8 h-8 text-${item.color} mb-3`} />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className={`text-4xl font-bold text-${item.color}`}>{item.value}</p>
            </FuturisticPanel>
          ))}
        </div>

        <FuturisticPanel className="p-6" glowColor="accent">
          <h3 className="text-xl font-semibold mb-4">Launch Compliance Bot</h3>
          <p className="text-muted-foreground mb-4">AI-powered compliance monitoring with real-time policy validation.</p>
          <Button asChild className="bg-accent hover:bg-accent-glow text-accent-foreground">
            <a href="https://suit-compliance-bot.lovable.app" target="_blank" rel="noopener noreferrer">
              Open Compliance Portal <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </FuturisticPanel>
      </main>
    </div>
  );
};

export default Compliance;
