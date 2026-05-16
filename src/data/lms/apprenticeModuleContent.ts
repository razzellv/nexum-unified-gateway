import { ApprenticeModuleContent } from "@/types/lms/apprentice";

export const apprenticeModuleContent: Record<number, ApprenticeModuleContent> = {
  1: {
    title: "Facility Intelligence Foundations",
    narration: `Facility Intelligence is the systematic approach to converting raw facility data into actionable operational decisions. It is not a software product or a maintenance program—it is a decision framework supported by data.

The distinction between data, metrics, and insight is fundamental:
• Data is raw information: temperatures, pressures, flow rates, timestamps
• Metrics are calculated values derived from data: efficiency ratios, consumption per square foot, uptime percentages
• Insight is the interpretation that drives decisions: "This chiller is degrading because..."

Facilities fail without structured data because decisions become reactive and unverified. Without documentation, you lose institutional knowledge. When experienced operators leave, critical system knowledge leaves with them.

Every role in facility operations benefits differently from Facility Intelligence:
• Operators need real-time system status and alarm context
• Supervisors need trend analysis and resource allocation data
• Engineers need performance baselines and diagnostic metrics
• Executives need cost summaries and compliance status

Timestamped data is critical because it allows you to track trends and establish causality. Without timestamps, you cannot correlate events or identify root causes.

HVAC auxiliary systems—pumps, VFDs, secondary loops—most often lack proper documentation, creating blind spots in facility optimization efforts.`,
    scenario: {
      title: "The Knowledge Gap",
      description: "A senior facility engineer is retiring after 25 years. The facility has minimal documentation. New staff cannot explain why certain systems operate the way they do, leading to inefficient operation and repeated troubleshooting of solved problems.",
      question: "What is the primary operational risk in this scenario?",
      correctAnswer: "Loss of institutional knowledge that cannot be recovered without structured documentation"
    },
    standards: [
      "ASHRAE Guideline 4: Preparation of Operating and Maintenance Documentation",
      "IFMA Facility Management Standards",
      "ISO 41001: Facility Management Systems"
    ],
    quiz: [
      { question: "What best defines Facility Intelligence?", options: ["Using software to replace facility staff", "Collecting as much data as possible", "Turning facility data into operational decisions", "Automating all mechanical systems"], correctAnswer: 2, explanation: "Facility Intelligence is fundamentally about converting data into decisions." },
      { question: "Which role is primarily responsible for data entry accuracy?", options: ["Executive leadership", "Software vendor", "Facility operators and technicians", "Utility companies"], correctAnswer: 2, explanation: "Operators and technicians are at the point of data collection." },
      { question: "Why do facilities fail without structured data?", options: ["Equipment becomes obsolete", "Compliance cannot be enforced", "Decisions become reactive and unverified", "Utility costs automatically increase"], correctAnswer: 2, explanation: "Without data structure, decisions lack verification." },
      { question: "What is the difference between data and metrics?", options: ["Data is visual; metrics are raw", "Metrics are calculated values derived from data", "Data is only manual", "Metrics replace logs"], correctAnswer: 1, explanation: "Metrics are derived calculations that provide meaning to raw data." },
      { question: "Which group benefits most from dashboards?", options: ["Operators only", "Engineers only", "Executives only", "All stakeholders, differently"], correctAnswer: 3, explanation: "Each stakeholder group uses dashboards differently." },
      { question: "What is the main risk of undocumented system operation?", options: ["Lower efficiency", "Higher labor cost", "Loss of institutional knowledge", "Increased automation"], correctAnswer: 2, explanation: "When operations aren't documented, critical knowledge leaves when personnel leave." },
      { question: "Facility Intelligence is best described as:", options: ["A software product", "A maintenance program", "A decision framework supported by data", "A compliance checklist"], correctAnswer: 2, explanation: "Facility Intelligence is a framework for making decisions." },
      { question: "Why is timestamped data critical?", options: ["For audits only", "For billing accuracy", "To track trends and causality", "To meet OSHA requirements"], correctAnswer: 2, explanation: "Timestamps enable trend analysis and cause-and-effect relationships." },
      { question: "Which system most often lacks proper documentation?", options: ["Lighting", "Boilers", "HVAC auxiliary systems", "Office equipment"], correctAnswer: 2, explanation: "Auxiliary systems like pumps and VFDs are frequently underdocumented." },
      { question: "Facility Intelligence primarily supports:", options: ["Capital planning", "Operational clarity", "Vendor management", "Marketing"], correctAnswer: 1, explanation: "The primary purpose is to bring clarity to daily operations." }
    ],
    reflection: "Consider your current facility: What critical operational knowledge exists only in the minds of experienced staff?"
  },
  2: {
    title: "Database Management for Facilities",
    narration: `A facilities database is not a dashboard or a CMMS alone—it is a collection of logs and reference tables that form the foundation for all facility analytics.

Understanding the hierarchy is essential:
• Logs are raw records of events and readings
• Dashboards are visual representations of current or historical state
• Analytics are derived insights from processed data

Data validation is critical because it prevents garbage-in, garbage-out decisions. Every data point should be checked for correct units, reasonable ranges, and consistent formats.

What destroys data integrity fastest? Missing units or inconsistent formats. A pump flow reading of "150" is useless without knowing if it's GPM, LPM, or CFM.

Never overwrite raw data. The danger of overwriting is loss of original truth. Raw data should be preserved; analytics should be separate calculations.

Time-series numeric data supports long-term analytics best because it enables trend analysis, baseline comparison, and predictive modeling.

Facility databases should be designed for decision-makers and auditors—not IT teams or vendors.`,
    scenario: {
      title: "The Data Disaster",
      description: "A facility manager discovers that energy reports for the past year were calculated using a spreadsheet formula that referenced the wrong cells. The raw meter data was overwritten with 'corrected' values.",
      question: "What primary database principle was violated?",
      correctAnswer: "Raw data should never be overwritten—analytics should be separate calculations that preserve the original truth"
    },
    standards: ["ASHRAE Guideline 36: High-Performance Sequences of Operation", "ISO 50001: Energy Management Systems", "NIST Cybersecurity Framework for Building Systems"],
    quiz: [
      { question: "What is a facilities database?", options: ["A dashboard", "A collection of logs and reference tables", "A CMMS", "A spreadsheet only"], correctAnswer: 1, explanation: "A database is the foundational collection of data." },
      { question: "Which is an example of structured data?", options: ["Operator notes", "Photos", "GPM readings with timestamps", "Email reports"], correctAnswer: 2, explanation: "Structured data follows a consistent format." },
      { question: "Why is data validation important?", options: ["To reduce storage size", "To prevent garbage-in, garbage-out decisions", "To improve UI design", "To automate reporting"], correctAnswer: 1, explanation: "Validation ensures data quality." },
      { question: "What destroys data integrity fastest?", options: ["Too many logs", "Manual entry", "Missing units or inconsistent formats", "Automation"], correctAnswer: 2, explanation: "Without units and consistent formats, data becomes meaningless." },
      { question: "What is the primary purpose of reference tables?", options: ["Visualization", "Standardization", "Automation", "Billing"], correctAnswer: 1, explanation: "Reference tables ensure consistent terminology." },
      { question: "Which is NOT a valid facility data source?", options: ["BAS", "VFD", "Utility meter", "Marketing CRM"], correctAnswer: 3, explanation: "Marketing CRM systems don't provide facility operational data." },
      { question: "Why separate raw data from analytics?", options: ["Security", "Performance", "Auditability and traceability", "Cost"], correctAnswer: 2, explanation: "Separation allows you to trace back to original data." },
      { question: "What is the danger of overwriting raw data?", options: ["Storage cost", "Loss of original truth", "Dashboard delay", "Operator confusion"], correctAnswer: 1, explanation: "Once raw data is overwritten, the original truth is lost." },
      { question: "Which format supports long-term analytics best?", options: ["Free text", "Images", "Time-series numeric data", "PDFs"], correctAnswer: 2, explanation: "Numeric time-series data can be mathematically analyzed." },
      { question: "Facility databases should be designed for:", options: ["IT teams", "Vendors", "Decision-makers and auditors", "Marketing teams"], correctAnswer: 2, explanation: "The database exists to support operational decisions." }
    ],
    reflection: "Are raw readings preserved separately from calculated metrics in your facility?"
  },
  3: {
    title: "Data Entry & System Connectivity",
    narration: `Field data collection happens through multiple channels: Manual logs, VFDs, BAS, and Meters.

Linking HVAC systems to the right metrics is essential:

BOILERS: Primary metrics are GPM and ΔT (temperature differential). ΔT indicates heat transfer effectiveness.

PUMPS: Primary metric is Flow vs head. Track motor current for load and mechanical health.

AHUs: Direct impact on indoor air quality. Track mixed air temperature and discharge temperature.

VFD diagnostics require paired metrics: VFD speed (frequency) should be paired with torque or current. A VFD operating at 40 Hz indicates reduced motor speed, not 40% load.

Common data mistakes: Recording without units, inconsistent equipment naming, missing timestamps, confusing setpoints with actual values.

Systems do not operate in isolation. Facility Intelligence treats HVAC systems as interconnected subsystems.

The first step in connecting system data is to define metrics—know what you need to measure before installing sensors.`,
    scenario: {
      title: "The Mysterious Pump",
      description: "A pump runs at reduced speed (VFD showing 40 Hz) but motor current remains high. The operator logs '40%' in the remarks column, assuming this represents load.",
      question: "What operational error occurred?",
      correctAnswer: "The operator confused VFD frequency with load percentage—high current at reduced speed indicates a mechanical or hydraulic problem"
    },
    standards: ["ASHRAE Standard 90.1: Energy Standard for Buildings", "ASHRAE Guideline 22: Instrumentation for Monitoring Energy Performance", "NEMA MG 1: Motors and Generators"],
    quiz: [
      { question: "Which metric best represents pump performance?", options: ["Voltage", "Frequency", "Flow vs head", "Temperature"], correctAnswer: 2, explanation: "Pump performance is defined by flow against resistance." },
      { question: "A VFD operating at 40 Hz indicates:", options: ["40% load", "Reduced motor speed", "Full capacity", "Alarm condition"], correctAnswer: 1, explanation: "Frequency indicates motor speed, not load." },
      { question: "Which metric connects boilers to efficiency?", options: ["Voltage", "GPM and ΔT", "Fan speed", "Pressure only"], correctAnswer: 1, explanation: "GPM and ΔT together indicate heat transfer effectiveness." },
      { question: "Why is motor current tracked?", options: ["Compliance", "Energy billing", "Load and mechanical health", "Automation"], correctAnswer: 2, explanation: "Current indicates how hard the motor is working." },
      { question: "Which system directly affects indoor air quality?", options: ["Pumps", "Boilers", "AHUs", "Cooling towers"], correctAnswer: 2, explanation: "AHUs condition and deliver air directly to occupied spaces." },
      { question: "Incorrect data entry most often results in:", options: ["Faster dashboards", "False optimization conclusions", "Better alarms", "Lower cost"], correctAnswer: 1, explanation: "Bad data leads to incorrect analysis." },
      { question: "Which metric pairs with VFD speed for diagnostics?", options: ["Humidity", "Torque or current", "Pressure only", "Time"], correctAnswer: 1, explanation: "Torque or current shows actual load." },
      { question: "Why are system relationships important?", options: ["For UI design", "For compliance reporting", "Because systems do not operate in isolation", "For automation"], correctAnswer: 2, explanation: "HVAC systems are interconnected." },
      { question: "What is the first step in connecting system data?", options: ["Build dashboards", "Define metrics", "Install sensors", "Buy software"], correctAnswer: 1, explanation: "Know what to measure before selecting sensors." },
      { question: "Facility Intelligence treats HVAC systems as:", options: ["Independent assets", "Utility consumers only", "Interconnected subsystems", "Maintenance liabilities"], correctAnswer: 2, explanation: "Systems work together; understanding relationships is core." }
    ],
    reflection: "Can you identify the primary metrics that indicate performance for each major HVAC system in your facility?"
  }
};
