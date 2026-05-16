import { Course } from "@/types/lms/course";
import { modules as facilityModules } from "./modules";
import { hvacModules } from "./hvacModules";
import { thermodynamicsModules } from "./thermodynamicsModules";
import { specialistModules } from "./specialistModules";
import { facilityIntelligenceModules } from "./facilityIntelligenceModules";
import { newEquipmentModules } from "./newEquipmentModules";
import { facilityIntelligenceIIModules } from "./facilityIntelligenceIIModules";

export const courses: Course[] = [
  {
    id: "facility-optimization",
    title: "Facility Optimization & Compliance Mastery",
    description: "Comprehensive training on facility management, regulatory compliance, and operational excellence",
    modules: facilityModules,
  },
  {
    id: "hvac-optimization",
    title: "Facility HVAC Optimization Mastery: Compliance, Chemistry, and Control",
    description: "Master HVAC systems, chemistry, troubleshooting, and data-driven optimization strategies",
    modules: hvacModules,
  },
  {
    id: "thermodynamics-tech",
    title: "HVAC Thermodynamics & Smart Technology Integration",
    description: "Master thermodynamics principles, heat transfer, and AI/IoT integration in modern climate control systems",
    modules: thermodynamicsModules,
  },
  {
    id: "career-specialist",
    title: "Career Specialist Assessment",
    description: "Comprehensive aptitude assessment to discover your ideal career paths",
    modules: specialistModules,
  },
  {
    id: "facility-intelligence",
    title: "Facility Intelligence Engineer Certification",
    description: "Comprehensive training on the Nexum Suum SaaS ecosystem and real facility operations",
    modules: facilityIntelligenceModules,
  },
  {
    id: "new-equipment-systems",
    title: "Advanced Equipment Systems Operations",
    description: "Heat exchangers, turbines, hot water heaters, condensate systems, generators/CHP, RO systems, and WFI pharmaceutical water systems",
    modules: newEquipmentModules,
  },
  {
    id: "facility-intelligence-ii",
    title: "Facility Intelligence Certification II: Data to Decisions",
    description: "Transform operational data into structured intelligence for tracking inefficiencies, risk, depreciation, decision fatigue, and performance across government, retail, industrial, and manufacturing sectors",
    modules: facilityIntelligenceIIModules,
  },
];
