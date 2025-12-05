import { ArrowLeft, TrendingUp, Target, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { GridBackground } from "@/components/GridBackground";
import { FuturisticPanel } from "@/components/FuturisticPanel";

const Virtuous = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <GridBackground />
      
      <header className="relative z-10 border-b border-border/30 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-glow-primary">Virtuous Risk Analyzer</h1>
          <p className="text-muted-foreground mt-1">Risk assessment and mitigation strategies</p>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: TrendingUp, title: "Risk Score", value: "92%" },
            { icon: Target, title: "Mitigations", value: "18" },
            { icon: BarChart3, title: "Assessments", value: "67" },
            { icon: Shield, title: "Protected", value: "156" },
          ].map((item, i) => (
            <FuturisticPanel key={i} className="p-6" glowColor="primary">
              <item.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-4xl font-bold text-primary">{item.value}</p>
            </FuturisticPanel>
          ))}
        </div>

        <FuturisticPanel className="p-6" glowColor="primary">
          <h3 className="text-xl font-semibold mb-4">AI-Powered Risk Analysis</h3>
          <p className="text-muted-foreground">
            Advanced machine learning models identify potential risks, evaluate impact scenarios,
            and recommend mitigation strategies. Real-time monitoring and predictive analytics included.
          </p>
        </FuturisticPanel>
      </main>
    </div>
  );
};

export default Virtuous;
