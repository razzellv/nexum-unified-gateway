import { useNavigate } from "react-router-dom";
import { Package, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 tech-grid opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      
      <div className="container mx-auto px-4 relative z-10 text-center py-16">
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-glow" />
            Equipment Intelligence Module
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Document & Image{" "}
            <span className="glow-blue text-primary">Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze equipment nameplates, certificates, and water chemistry documents. 
            Extract structured operational intelligence automatically.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Nameplates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>Certificates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Water Chemistry</span>
            </div>
          </div>
          
          {/* ✅ UPDATED: Both Library Buttons */}
          <div className="pt-6 flex items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate('/equipment-library')}
              className="gap-2"
            >
              <Package className="w-5 h-5" />
              Equipment Library
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/inventory-library')}
              className="gap-2"
            >
              <Boxes className="w-5 h-5" />
              Inventory Library
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
