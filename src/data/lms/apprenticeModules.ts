import { ApprenticeModule } from "@/types/lms/apprentice";

export const apprenticeModules: ApprenticeModule[] = [
  {
    id: 1,
    title: "Facility Intelligence Foundations",
    duration: "45 min",
    description: "What Facility Intelligence is, the difference between data, metrics, and insight, and why facilities fail without structured data.",
    topics: [
      "What Facility Intelligence is",
      "Difference between data, metrics, and insight",
      "Why facilities fail without structured data",
      "Role of operators, supervisors, engineers, and executives"
    ],
    completed: false,
    locked: false,
  },
  {
    id: 2,
    title: "Database Management for Facilities",
    duration: "50 min",
    description: "Understanding facilities databases, data integrity, validation, and why bad data destroys optimization.",
    topics: [
      "What a facilities database is",
      "Logs vs dashboards vs analytics",
      "Structured vs unstructured data",
      "Data integrity, timestamps, validation",
      "Why bad data destroys optimization"
    ],
    completed: false,
    locked: true,
  },
  {
    id: 3,
    title: "Data Entry & System Connectivity",
    duration: "55 min",
    description: "Field data collection, proper data entry practices, and linking HVAC systems to metrics.",
    topics: [
      "How field data is collected (manual logs, VFDs, BAS, meters)",
      "Proper data entry practices",
      "Linking HVAC systems to metrics: Boilers, Chillers, Pumps, Fans, AHUs",
      "Common data mistakes operators make"
    ],
    completed: false,
    locked: true,
  },
];
