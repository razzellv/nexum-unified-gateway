export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: "concepts" | "scenarios" | "judgment";
}

export const apprenticeFinalExam: ExamQuestion[] = [
  // Q1-20: Concepts & Definitions
  {
    id: 1,
    question: "What best defines Facility Intelligence?",
    options: [
      "Using software to replace facility staff",
      "Collecting as much data as possible",
      "Turning facility data into operational decisions",
      "Automating all mechanical systems"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 2,
    question: "What is the difference between data and metrics?",
    options: [
      "Data is visual; metrics are raw",
      "Metrics are calculated values derived from data",
      "Data is only manual",
      "Metrics replace logs"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 3,
    question: "What is a facilities database?",
    options: [
      "A dashboard",
      "A collection of logs and reference tables",
      "A CMMS",
      "A spreadsheet only"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 4,
    question: "Which is an example of structured data?",
    options: [
      "Operator notes",
      "Photos",
      "GPM readings with timestamps",
      "Email reports"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 5,
    question: "What is the primary purpose of reference tables?",
    options: [
      "Visualization",
      "Standardization",
      "Automation",
      "Billing"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 6,
    question: "Which format supports long-term analytics best?",
    options: [
      "Free text",
      "Images",
      "Time-series numeric data",
      "PDFs"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 7,
    question: "Facility Intelligence is best described as:",
    options: [
      "A software product",
      "A maintenance program",
      "A decision framework supported by data",
      "A compliance checklist"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 8,
    question: "Why is timestamped data critical?",
    options: [
      "For audits only",
      "For billing accuracy",
      "To track trends and causality",
      "To meet OSHA requirements"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 9,
    question: "Which metric best represents pump performance?",
    options: [
      "Voltage",
      "Frequency",
      "Flow vs head",
      "Temperature"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 10,
    question: "Which metric connects boilers to efficiency?",
    options: [
      "Voltage",
      "GPM and ΔT",
      "Fan speed",
      "Pressure only"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 11,
    question: "What does poor data quality most commonly lead to?",
    options: [
      "Equipment failure",
      "Incorrect operational decisions",
      "Software crashes",
      "Compliance fines"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 12,
    question: "Which system directly affects indoor air quality?",
    options: [
      "Pumps",
      "Boilers",
      "AHUs",
      "Cooling towers"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 13,
    question: "Which is NOT a valid facility data source?",
    options: [
      "BAS",
      "VFD",
      "Utility meter",
      "Marketing CRM"
    ],
    correctAnswer: 3,
    category: "concepts"
  },
  {
    id: 14,
    question: "Why separate raw data from analytics?",
    options: [
      "Security",
      "Performance",
      "Auditability and traceability",
      "Cost"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 15,
    question: "What destroys data integrity fastest?",
    options: [
      "Too many logs",
      "Manual entry",
      "Missing units or inconsistent formats",
      "Automation"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 16,
    question: "Facility databases should be designed for:",
    options: [
      "IT teams",
      "Vendors",
      "Decision-makers and auditors",
      "Marketing teams"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 17,
    question: "Which role is primarily responsible for data entry accuracy?",
    options: [
      "Executive leadership",
      "Software vendor",
      "Facility operators and technicians",
      "Utility companies"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  {
    id: 18,
    question: "What is the danger of overwriting raw data?",
    options: [
      "Storage cost",
      "Loss of original truth",
      "Dashboard delay",
      "Operator confusion"
    ],
    correctAnswer: 1,
    category: "concepts"
  },
  {
    id: 19,
    question: "Which group benefits most from dashboards?",
    options: [
      "Operators only",
      "Engineers only",
      "Executives only",
      "All stakeholders, differently"
    ],
    correctAnswer: 3,
    category: "concepts"
  },
  {
    id: 20,
    question: "Facility Intelligence treats HVAC systems as:",
    options: [
      "Independent assets",
      "Utility consumers only",
      "Interconnected subsystems",
      "Maintenance liabilities"
    ],
    correctAnswer: 2,
    category: "concepts"
  },
  // Q21-40: Scenario-Based Decisions
  {
    id: 21,
    question: "A pump runs at reduced speed but current remains high. What does this indicate?",
    options: [
      "Normal operation",
      "Sensor error",
      "Mechanical or hydraulic issue",
      "Efficient operation"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 22,
    question: "Why do facilities fail without structured data?",
    options: [
      "Equipment becomes obsolete",
      "Compliance cannot be enforced",
      "Decisions become reactive and unverified",
      "Utility costs automatically increase"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 23,
    question: "A VFD operating at 40 Hz indicates:",
    options: [
      "40% load",
      "Reduced motor speed",
      "Full capacity",
      "Alarm condition"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 24,
    question: "Why is ΔT critical in hydronic systems?",
    options: [
      "Determines voltage",
      "Indicates heat transfer effectiveness",
      "Controls fan speed",
      "Sets alarms"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 25,
    question: "What is the main risk of undocumented system operation?",
    options: [
      "Lower efficiency",
      "Higher labor cost",
      "Loss of institutional knowledge",
      "Increased automation"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 26,
    question: "A dashboard shows improved efficiency but rising maintenance calls. What is likely missing?",
    options: [
      "More automation",
      "Better UI",
      "Contextual operational review",
      "Additional sensors"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 27,
    question: "Incorrect data entry most often results in:",
    options: [
      "Faster dashboards",
      "False optimization conclusions",
      "Better alarms",
      "Lower cost"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 28,
    question: "Which metric pairs with VFD speed for diagnostics?",
    options: [
      "Humidity",
      "Torque or current",
      "Pressure only",
      "Time"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 29,
    question: "An operator records a chilled water temperature of 180°F. What is the most likely issue?",
    options: [
      "The chiller has failed catastrophically",
      "A data entry error occurred",
      "The system is in heating mode",
      "Normal summer operation"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 30,
    question: "A boiler shows high efficiency on paper but the building is cold. What should you verify?",
    options: [
      "Thermostat batteries",
      "Pump operation and flow rates",
      "Window insulation",
      "Occupancy schedules"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 31,
    question: "Why are system relationships important?",
    options: [
      "For UI design",
      "For compliance reporting",
      "Because systems do not operate in isolation",
      "For automation"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 32,
    question: "A cooling tower fan runs at full speed but condenser water temperature rises. What might be wrong?",
    options: [
      "Normal operation on a hot day",
      "VFD malfunction",
      "Fouled fill media or low water level",
      "Chiller set incorrectly"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 33,
    question: "Which system most often lacks proper documentation?",
    options: [
      "Lighting",
      "Boilers",
      "HVAC auxiliary systems",
      "Office equipment"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 34,
    question: "Why is data validation important?",
    options: [
      "To reduce storage size",
      "To prevent garbage-in, garbage-out decisions",
      "To improve UI design",
      "To automate reporting"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 35,
    question: "An AHU shows 100% outdoor air but CO2 levels are high in the space. What should you check?",
    options: [
      "Damper position sensors",
      "Return fan speed",
      "Chiller capacity",
      "Lighting schedule"
    ],
    correctAnswer: 0,
    category: "scenarios"
  },
  {
    id: 36,
    question: "Why is motor current tracked?",
    options: [
      "Compliance",
      "Energy billing",
      "Load and mechanical health",
      "Automation"
    ],
    correctAnswer: 2,
    category: "scenarios"
  },
  {
    id: 37,
    question: "A facility reports lower energy use but higher occupant complaints. What type of analysis is needed?",
    options: [
      "Financial audit",
      "Comfort and performance correlation",
      "Staff training review",
      "Equipment age assessment"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 38,
    question: "What is the first step in connecting system data?",
    options: [
      "Build dashboards",
      "Define metrics",
      "Install sensors",
      "Buy software"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  {
    id: 39,
    question: "A pump shows normal pressure but low flow. What should be investigated?",
    options: [
      "Impeller wear or valve position",
      "Motor voltage",
      "VFD display calibration",
      "Pipe insulation"
    ],
    correctAnswer: 0,
    category: "scenarios"
  },
  {
    id: 40,
    question: "Energy consumption drops 30% after a control change but no verification occurs. What is the risk?",
    options: [
      "None—savings are savings",
      "The reduction may be from reduced service, not efficiency",
      "Equipment damage only",
      "Regulatory issues"
    ],
    correctAnswer: 1,
    category: "scenarios"
  },
  // Q41-60: Operational Judgment
  {
    id: 41,
    question: "Facility Intelligence prioritizes which outcome?",
    options: [
      "Lowest energy cost",
      "Maximum automation",
      "Informed operational decisions",
      "Software adoption"
    ],
    correctAnswer: 2,
    category: "judgment"
  },
  {
    id: 42,
    question: "Certification represents competency in:",
    options: [
      "Software usage",
      "Facility operations and data reasoning",
      "Engineering design",
      "Programming"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 43,
    question: "Facility Intelligence primarily supports:",
    options: [
      "Capital planning",
      "Operational clarity",
      "Vendor management",
      "Marketing"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 44,
    question: "When should you question dashboard data?",
    options: [
      "Never—dashboards are automated",
      "When numbers don't align with physical observation",
      "Only during audits",
      "Only when told by management"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 45,
    question: "What matters most when evaluating facility performance?",
    options: [
      "Single metric benchmarks",
      "Context and correlated data",
      "Vendor reports",
      "Budget vs actual only"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 46,
    question: "A metric shows improvement but staff report worse conditions. You should:",
    options: [
      "Trust the data over opinions",
      "Investigate the disconnect",
      "Ignore staff feedback",
      "Recalibrate sensors only"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 47,
    question: "The best time to establish baseline metrics is:",
    options: [
      "After a major renovation",
      "During normal stable operation",
      "During extreme weather",
      "After equipment failure"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 48,
    question: "A vendor claims their system will improve efficiency by 40%. What should you do?",
    options: [
      "Accept the claim if they provide case studies",
      "Request baseline requirements and verification methodology",
      "Implement immediately",
      "Reject all vendor claims"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 49,
    question: "Compliance data and operational data should be:",
    options: [
      "Kept completely separate",
      "Integrated where possible for verification",
      "Managed by different departments only",
      "Reported differently to auditors"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 50,
    question: "When metrics conflict with each other, you should:",
    options: [
      "Use the most favorable one",
      "Average them",
      "Investigate the source of the discrepancy",
      "Ignore both until they agree"
    ],
    correctAnswer: 2,
    category: "judgment"
  },
  {
    id: 51,
    question: "An operator suggests a control change that improved comfort but isn't in the logs. You should:",
    options: [
      "Ignore it—if it's not logged, it didn't happen",
      "Document it and verify the improvement",
      "Report the operator for bypassing procedures",
      "Wait for problems before investigating"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 52,
    question: "What is the relationship between data quality and trust in analytics?",
    options: [
      "No relationship—analytics fix bad data",
      "Direct—poor data quality undermines all analysis",
      "Inverse—more data overcomes quality issues",
      "Analytics improve data quality automatically"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 53,
    question: "Before implementing energy savings measures, you should:",
    options: [
      "Get executive approval only",
      "Establish measurement and verification protocols",
      "Wait for utility incentives",
      "Trust manufacturer efficiency ratings"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 54,
    question: "A building passes its energy audit but tenants complain of discomfort. This suggests:",
    options: [
      "Tenants are too sensitive",
      "Energy efficiency and occupant comfort may not be aligned",
      "The audit was incorrect",
      "HVAC systems need replacement"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 55,
    question: "When designing a data collection strategy, prioritize:",
    options: [
      "Collecting everything possible",
      "Metrics that inform decisions",
      "What's easiest to collect",
      "What competitors collect"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 56,
    question: "Legacy systems with poor data capabilities should be:",
    options: [
      "Replaced immediately",
      "Documented with manual processes until upgrade is feasible",
      "Ignored in analytics",
      "Connected to new systems without verification"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 57,
    question: "The primary purpose of trend data is to:",
    options: [
      "Generate reports for management",
      "Identify patterns and predict issues",
      "Comply with regulations",
      "Compare to other buildings"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 58,
    question: "A successful Facility Intelligence program requires:",
    options: [
      "The most expensive software",
      "Buy-in from all operational levels",
      "Complete automation",
      "External consultants only"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 59,
    question: "When presenting facility data to executives, focus on:",
    options: [
      "Technical details and all metrics",
      "Business impact and actionable insights",
      "Raw data tables",
      "Comparison to theoretical ideals"
    ],
    correctAnswer: 1,
    category: "judgment"
  },
  {
    id: 60,
    question: "The ultimate goal of Facility Intelligence is:",
    options: [
      "Data collection",
      "Cost reduction only",
      "Enabling better operational and strategic decisions",
      "Automation of all systems"
    ],
    correctAnswer: 2,
    category: "judgment"
  }
];
