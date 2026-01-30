import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import HeroSection from "@/components/equipment-intelligence/HeroSection";
import UploadSection from "@/components/equipment-intelligence/UploadSection";
import AnalysisResults from "@/components/equipment-intelligence/AnalysisResults";
import EquipmentLibrary from "@/components/equipment-intelligence/EquipmentLibrary";
import RecentEquipment from "@/components/equipment-intelligence/RecentEquipment"; // NEW
import InventorySection from "@/components/equipment-intelligence/InventorySection"; // NEW
import { EquipmentProvider } from "@/contexts/EquipmentContext";

export default function EquipmentIntelligence() {
  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      
      <EquipmentProvider>
        <div className="space-y-6">
          <HeroSection />
          <UploadSection />
          <AnalysisResults />
          
          {/* NEW: Recent Equipment (Last 7 Days) */}
          <RecentEquipment />
          
          <EquipmentLibrary />
          
          {/* NEW: Inventory Section */}
          <InventorySection />
        </div>
      </EquipmentProvider>
    </MainLayout>
  );
}
