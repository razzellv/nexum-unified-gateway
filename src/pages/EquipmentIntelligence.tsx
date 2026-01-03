import HeroSection from "@/components/equipment-intelligence/HeroSection";
import UploadSection from "@/components/equipment-intelligence/UploadSection";
import AnalysisResults from "@/components/equipment-intelligence/AnalysisResults";
import EquipmentLibrary from "@/components/equipment-intelligence/EquipmentLibrary";
import { EquipmentProvider } from "@/contexts/EquipmentContext";

export default function EquipmentIntelligence() {
  return (
    <EquipmentProvider>
      <div className="min-h-screen bg-background">
        <HeroSection />
        <UploadSection />
        <AnalysisResults />
        <EquipmentLibrary />
      </div>
    </EquipmentProvider>
  );
}
