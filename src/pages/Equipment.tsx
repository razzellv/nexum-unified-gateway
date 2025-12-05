import { Button } from "@/components/ui/button";
import { ArrowLeft, Cpu, Activity, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { GridBackground } from "@/components/GridBackground";
import { FuturisticPanel } from "@/components/FuturisticPanel";

const Equipment = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <GridBackground />
      
      <header className="relative z-10 border-b border-border/30 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-glow-secondary">Equipment Intelligence</h1>
          <p className="text-muted-foreground mt-1">Asset tracking and predictive maintenance</p>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Cpu, title: "Total Assets", value: "247", color: "secondary" },
            { icon: CheckCircle, title: "Operational", value: "231", color: "primary" },
            { icon: Activity, title: "Maintenance", value: "12", color: "accent" },
            { icon: AlertTriangle, title: "Alerts", value: "4", color: "accent" },
          ].map((item, i) => (
            <FuturisticPanel key={i} className="p-6" glowColor={item.color as any}>
              <item.icon className={`w-8 h-8 text-${item.color} mb-3`} />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className={`text-4xl font-bold text-${item.color}`}>{item.value}</p>
            </FuturisticPanel>
          ))}
        </div>

        <FuturisticPanel className="p-6" glowColor="secondary">
          <h3 className="text-xl font-semibold mb-4">Launch Equipment Portal</h3>
          <p className="text-muted-foreground mb-4">Access real-time IoT sensor data and predictive maintenance analytics.</p>
          <Button asChild className="bg-secondary hover:bg-secondary-glow text-secondary-foreground">
            <a href="https://nexum-insight-engine.lovable.app" target="_blank" rel="noopener noreferrer">
              Open Equipment Portal <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </FuturisticPanel>
      </main>
    </div>
  );
};

export default Equipment;
