import { Module } from "@/types/lms/course";

export const newEquipmentModules: Module[] = [
  {
    id: 101,
    title: "Heat Exchangers — Principles & Operations",
    description: "Shell & tube, plate & frame, brazed plate types. Primary/secondary fluid circuits, ΔT analysis, fouling detection and cleaning schedules.",
    duration: "45 min",
    objective: "Understand heat exchanger types, operating principles, ΔT calculations, and fouling detection methods",
    completed: false,
    locked: false,
  },
  {
    id: 102,
    title: "Turbines — Steam & Gas Operations",
    description: "Back pressure vs condensing turbines, RPM monitoring, oil pressure, vibration analysis, steam conditions, and trip response procedures.",
    duration: "60 min",
    objective: "Master turbine operations including RPM monitoring, oil systems, vibration analysis, and emergency trip procedures",
    completed: false,
    locked: true,
  },
  {
    id: 103,
    title: "Hot Water Heaters — Operations & Compliance",
    description: "Storage, tankless, steam-to-water types. Verified flow, setpoint management, blowdown procedures, safety status.",
    duration: "45 min",
    objective: "Operate and maintain hot water heater systems with proper flow verification, setpoint management, and safety compliance",
    completed: false,
    locked: true,
  },
  {
    id: 104,
    title: "Condensate Systems — Recovery & Management",
    description: "Condensate tank operations, water level monitoring, pump states, conductivity tracking.",
    duration: "40 min",
    objective: "Manage condensate recovery systems including tank levels, pump operations, and water quality monitoring",
    completed: false,
    locked: true,
  },
  {
    id: 105,
    title: "Generators & Cogeneration (CHP)",
    description: "Standby vs prime vs CHP generators, transfer switch operations, fuel monitoring, engine vitals.",
    duration: "55 min",
    objective: "Understand generator types, CHP operations, transfer switch management, and compliance testing requirements",
    completed: false,
    locked: true,
  },
  {
    id: 106,
    title: "Reverse Osmosis (RO) Systems",
    description: "Feed/product/reject flow, TDS monitoring, recovery rate calculations, membrane fouling detection.",
    duration: "50 min",
    objective: "Operate RO systems with proper flow measurement, TDS rejection monitoring, and membrane maintenance",
    completed: false,
    locked: true,
  },
  {
    id: 107,
    title: "WFI Systems — Pharmaceutical Water Operations",
    description: "USP compliance, conductivity limits, TOC monitoring, hot loop temperature, sanitization schedules.",
    duration: "65 min",
    objective: "Manage WFI systems meeting USP/EP standards including conductivity, TOC, and sanitization compliance",
    completed: false,
    locked: true,
  },
];

export const newEquipmentModuleContent: Record<number, any> = {};
