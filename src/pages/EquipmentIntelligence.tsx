import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import HeroSection from "@/components/equipment-intelligence/HeroSection";
import UploadSection from "@/components/equipment-intelligence/UploadSection";
import ManualEquipmentEntry from "@/components/equipment-intelligence/ManualEquipmentEntry";
import AnalysisResults from "@/components/equipment-intelligence/AnalysisResults";
import RecentEquipment from "@/components/equipment-intelligence/RecentEquipment";
// ❌ REMOVED: import EquipmentLibrary from "@/components/equipment-intelligence/EquipmentLibrary";
import InventorySection from "@/components/equipment-intelligence/InventorySection";
import GlycolHealthScore from "@/components/equipment-intelligence/GlycolHealthScore";
import { EquipmentProvider } from "@/contexts/EquipmentContext";

export default function EquipmentIntelligence() {
  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      
      <EquipmentProvider>
        <div className="space-y-8">
          {/* Hero Section (now with "View Equipment Library" button) */}
          <HeroSection />
          
          {/* Upload Section */}
          <UploadSection />
          
          {/* Manual Equipment Entry */}
          <ManualEquipmentEntry />
          
          {/* Analysis Results */}
          <AnalysisResults />
          
          {/* Recent Equipment (Last 7 Days) */}
          <RecentEquipment />
          
          {/* ❌ REMOVED: <EquipmentLibrary /> */}
          
          {/* Glycol System Health Score */}
          <GlycolHealthScore />

          {/* Parts & Supplies Inventory */}
          <InventorySection />
        </div>
      </EquipmentProvider>
    </MainLayout>
  );
}
