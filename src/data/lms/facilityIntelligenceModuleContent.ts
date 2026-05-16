import { ModuleContent } from "@/types/lms/course";

export const facilityIntelligenceModuleContent: Record<number, ModuleContent> = {
  1: {
    id: 1,
    title: "Facility Systems as Integrated Operations",
    objective: "Recognize facilities as integrated systems where HVAC, utilities, maintenance, and compliance depend on each other",
    duration: "60 minutes",
    narrationScript: [
      "Facilities are not collections of independent equipment. They are integrated systems where HVAC, electrical, plumbing, fire protection, and building envelope all influence each other.",
      "When a chiller underperforms, it affects air handling, occupant comfort, and energy costs. When a boiler fails, it can shut down an entire operation.",
      "Most facility problems arise not from equipment failure alone, but from managing systems in isolation without understanding their connections.",
      "This module establishes the foundation: you will learn to see your facility as a whole, identify system interdependencies, and recognize where isolated thinking creates operational blind spots.",
      "The goal is not to make you an expert in every system, but to help you ask the right questions when something does not look right."
    ],
    scenario: {
      title: "The Cascading Comfort Complaint",
      description: "A tenant complaint reveals multiple interconnected issues",
      situation: "Building occupants on the third floor report persistent temperature fluctuations. The HVAC technician checks the air handler and finds nothing wrong. The problem continues. You are asked to investigate. Walking the floor, you notice the VAV boxes are hunting, supply air temperature is inconsistent, and the chilled water supply temp is 2°F higher than setpoint. The chiller logs show the condenser water temperature has been elevated for three days. The cooling tower basin is low and the blowdown valve was left partially open after maintenance. A single oversight cascaded through four connected systems."
    },
    standards: {
      title: "Integrated Operations Standards",
      items: [
        "View equipment issues in context of connected systems, not in isolation",
        "Trace symptoms upstream and downstream before concluding root cause",
        "Verify that maintenance activities on one system do not create problems in others",
        "Communicate across trades when troubleshooting cross-system issues",
        "Document system interconnections in facility operating procedures",
        "Review utility and equipment data together, not separately",
        "Question single-point fixes when symptoms suggest broader issues"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "A boiler fails unexpectedly. What is the FIRST systems-level question you should ask?",
        type: "multiple-choice",
        options: [
          "How quickly can we get a replacement boiler?",
          "What other building systems and operations depend on this boiler, and what is the immediate impact?",
          "Who was the last person to service it?",
          "What brand of boiler should we buy next?"
        ],
        correctAnswer: 1,
        explanation: "Before focusing on repair or replacement, you need to understand the scope of impact. A boiler failure can affect heating, process steam, domestic hot water, humidification, and production—each with different urgency levels."
      },
      {
        id: 2,
        question: "An HVAC technician fixes a VAV box, but the comfort complaint returns within a day. What does this suggest?",
        type: "multiple-choice",
        options: [
          "The technician made an error",
          "The root cause may be upstream or downstream of the VAV box in the connected system",
          "The occupants are too sensitive",
          "The VAV box needs to be replaced"
        ],
        correctAnswer: 1,
        explanation: "When a fix does not hold, look beyond the immediate component. The VAV may be responding to inconsistent supply air temperature, incorrect pressure, or a problem originating elsewhere in the air or water systems."
      },
      {
        id: 3,
        question: "Why do facilities managed in silos often have higher operating costs?",
        type: "multiple-choice",
        options: [
          "Because silo management requires more staff",
          "Because problems in one system go unrecognized until they cause failures or inefficiencies in connected systems",
          "Because silo managers are less experienced",
          "Because equipment costs more when purchased separately"
        ],
        correctAnswer: 1,
        explanation: "Silo management delays recognition of interconnected issues. A small water chemistry problem becomes a heat exchanger failure. A damper actuator issue becomes an energy waste problem. Integration reduces these cascading costs."
      },
      {
        id: 4,
        question: "What is the primary risk of treating equipment symptoms without investigating system context?",
        type: "multiple-choice",
        options: [
          "The repair takes longer",
          "You may fix the symptom while the actual cause damages other equipment or continues creating waste",
          "The warranty may be voided",
          "The technician may get injured"
        ],
        correctAnswer: 1,
        explanation: "Symptom-focused repairs often leave root causes unaddressed. The chiller that keeps tripping on high head pressure may have a condenser issue, a cooling tower problem, or an undersized water pipe—each requiring different action."
      }
    ],
    reflectionPrompt: "Think of a recurring problem at your facility. Have you traced it through all connected systems, or has the investigation stayed within one trade or equipment type?",
    keyTakeaways: [
      "Facilities are integrated systems—HVAC, utilities, structure, and operations all influence each other",
      "Problems often cascade: a single oversight can create symptoms in multiple systems",
      "Trace issues upstream and downstream before concluding root cause",
      "Cross-trade communication is essential for resolving systemic problems",
      "Isolated thinking creates blind spots that increase costs and risks",
      "The goal is to ask the right questions, not to know every technical detail"
    ]
  },

  2: {
    id: 2,
    title: "Reading Building Conditions",
    objective: "Translate gauge readings, physical indicators, and equipment behavior into operational intelligence",
    duration: "75 minutes",
    narrationScript: [
      "A facility tells you how it is performing if you know how to read it. Gauges, temperatures, sounds, smells, and visual cues all provide information.",
      "Too many operators wait for alarms or automated alerts. By the time an alarm sounds, the condition has often already caused damage, waste, or discomfort.",
      "Reading building conditions means developing situational awareness—the ability to notice when something is not right before it becomes a problem.",
      "This module teaches you to interpret operational data and physical indicators systematically, so you can assess facility health without relying solely on automation.",
      "The best facility operators walk through their buildings with purpose. They listen, observe, and compare what they see to what they expect."
    ],
    scenario: {
      title: "The Walk-Through That Prevented a Shutdown",
      description: "Recognizing early warning signs during a routine inspection",
      situation: "During a morning walk-through of the mechanical room, you notice the condensate pump is cycling more frequently than usual—about every 90 seconds instead of every 3-4 minutes. The pump sounds normal, no alarms are present, and the steam system appears to be operating. You check the steam trap station upstream and find one trap has failed open, dumping live steam into the condensate system. Catching this early prevented waterlogging of the heating coils, potential water hammer, and an unplanned shutdown during a cold snap."
    },
    standards: {
      title: "Condition Assessment Standards",
      items: [
        "Conduct deliberate walk-throughs of mechanical spaces at least once per shift",
        "Compare current readings to baseline values and recent trends, not just to alarm setpoints",
        "Listen for abnormal sounds: grinding, cavitation, hunting, short-cycling, or unusual vibration",
        "Check for visual indicators: leaks, corrosion, discoloration, ice formation, or component damage",
        "Note unusual smells: electrical burning, refrigerant, fuel, mold, or hot bearings",
        "Record observations even when no alarm is present—early indicators prevent later failures",
        "Verify that automation reflects actual conditions; do not assume the BAS is always accurate"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "A chiller shows normal operation on the BAS, but you hear a rhythmic surging sound from the compressor. What should you do?",
        type: "multiple-choice",
        options: [
          "Ignore it—the BAS shows no alarm",
          "Investigate immediately; the sound may indicate refrigerant issues, liquid slugging, or impending failure not yet detected by sensors",
          "Wait until the next PM cycle",
          "Increase the chiller load to stabilize it"
        ],
        correctAnswer: 1,
        explanation: "Physical indicators often precede sensor-detected problems. Surging can indicate low refrigerant, liquid refrigerant entering the compressor, or condenser issues. Early investigation prevents compressor damage."
      },
      {
        id: 2,
        question: "What is the limitation of relying primarily on alarm systems for condition awareness?",
        type: "multiple-choice",
        options: [
          "Alarms are always accurate",
          "Alarms activate when conditions have already exceeded acceptable limits—damage or waste may already be occurring",
          "Alarms are too expensive to maintain",
          "Alarms cannot be calibrated"
        ],
        correctAnswer: 1,
        explanation: "Alarms are reactive by design. They tell you when something has crossed a threshold, not when it is trending toward trouble. Proactive observation catches issues before they trigger alarms."
      },
      {
        id: 3,
        question: "During a walk-through, you notice ice forming on a refrigerant suction line. What does this indicate?",
        type: "multiple-choice",
        options: [
          "Normal operation in cooling mode",
          "Possible low refrigerant charge, restricted airflow, or metering device issue causing superheat problems",
          "The insulation is working correctly",
          "The system is too efficient"
        ],
        correctAnswer: 1,
        explanation: "Ice on a suction line typically indicates the refrigerant is absorbing too much superheat, often due to low charge, poor airflow across the evaporator, or a metering device restriction. All require investigation."
      },
      {
        id: 4,
        question: "Why should you compare current readings to recent trends rather than just alarm setpoints?",
        type: "multiple-choice",
        options: [
          "Trends are easier to read than setpoints",
          "Gradual degradation often stays below alarm thresholds while still causing waste, wear, or impending failure",
          "Alarm setpoints are never accurate",
          "Trends are required by regulation"
        ],
        correctAnswer: 1,
        explanation: "A gradual efficiency loss of 2% per week may never trigger an alarm, but over months it becomes significant waste. Trend awareness catches slow degradation that point-in-time alarms miss."
      }
    ],
    reflectionPrompt: "When was the last time you noticed an equipment issue before an alarm told you about it? What indicators led you to investigate?",
    keyTakeaways: [
      "Buildings communicate through gauges, sounds, temperatures, smells, and visual cues",
      "Alarms are reactive—proactive observation catches issues earlier",
      "Compare readings to baselines and trends, not just alarm setpoints",
      "Walk-throughs should be deliberate and observational, not just check-the-box rounds",
      "Physical indicators often precede sensor-detected problems",
      "Document observations even when no alarm is present"
    ]
  },

  3: {
    id: 3,
    title: "Risk Identification in Daily Operations",
    objective: "Identify mechanical, safety, environmental, and regulatory risks in real facility scenarios",
    duration: "90 minutes",
    narrationScript: [
      "Every facility has risks. Some are obvious—exposed electrical, missing guards, leaking gas. Others are subtle—deferred maintenance, inadequate documentation, untrained personnel.",
      "Risk identification is not about creating fear. It is about seeing conditions clearly so you can prioritize action and allocate resources where they matter most.",
      "This module teaches you to recognize hazards and inefficiencies during routine operations—on boilers, chillers, electrical systems, rooftops, and in mechanical rooms.",
      "You will learn to distinguish between risks that require immediate action, those that can be scheduled, and those that should be monitored.",
      "The goal is not zero risk—that is impossible. The goal is informed decision-making about which risks to address, in what order, with what resources."
    ],
    scenario: {
      title: "The Deferred Maintenance Backlog",
      description: "Prioritizing risk when everything seems urgent",
      situation: "You inherit a facility with 47 open work orders, some dating back 18 months. The list includes: a boiler with a suspected tube leak (still operating), three rooftop units with non-functional economizers, a fire pump that failed its last flow test, emergency lighting with dead batteries in two stairwells, and a cooling tower with visible biological growth. Your budget can address about half of these this quarter. You need to rank them by risk—not by which manager is complaining loudest."
    },
    standards: {
      title: "Risk Identification Standards",
      items: [
        "Classify risks by category: life safety, regulatory compliance, equipment failure, energy waste, comfort impact",
        "Prioritize life safety and regulatory risks above operational convenience",
        "Document all identified risks with severity, likelihood, and potential impact",
        "Distinguish between conditions requiring immediate action, scheduled repair, or monitoring",
        "Review deferred maintenance backlogs monthly to identify escalating risks",
        "Conduct formal hazard assessments for confined spaces, electrical work, and hot work",
        "Report near-misses and unsafe conditions without blame—they indicate systemic risks"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "From the scenario, which issue should be addressed FIRST?",
        type: "multiple-choice",
        options: [
          "The rooftop economizers—they waste energy every day",
          "The fire pump—fire protection system failures are life safety issues with regulatory implications",
          "The cooling tower—biological growth looks bad",
          "The boiler tube leak—it is the largest piece of equipment"
        ],
        correctAnswer: 1,
        explanation: "A failed fire pump creates life safety exposure and regulatory violation. NFPA requires fire pumps to pass flow tests. This is a non-negotiable priority regardless of other operational concerns."
      },
      {
        id: 2,
        question: "What is the primary purpose of risk identification in facility operations?",
        type: "multiple-choice",
        options: [
          "To generate work orders",
          "To enable informed prioritization of resources toward conditions that matter most",
          "To assign blame for problems",
          "To satisfy auditors"
        ],
        correctAnswer: 1,
        explanation: "Risk identification supports decision-making. When you know which risks are most serious, you can allocate limited time, budget, and attention where they create the greatest reduction in exposure."
      },
      {
        id: 3,
        question: "Emergency lighting with dead batteries in stairwells represents what type of risk?",
        type: "multiple-choice",
        options: [
          "Energy waste",
          "Comfort impact",
          "Life safety—occupants cannot safely evacuate in a power outage or fire",
          "Aesthetic concern"
        ],
        correctAnswer: 2,
        explanation: "Emergency egress lighting is life safety equipment. Dead batteries mean the lights will not function during emergencies. This is both a safety hazard and a code violation requiring prompt correction."
      },
      {
        id: 4,
        question: "A boiler tube leak has been present for three months. Why might this be more serious than it initially appears?",
        type: "multiple-choice",
        options: [
          "Tube leaks always cause explosions",
          "Water loss increases operating cost slightly",
          "Continued operation with a leak can cause accelerating damage, water quality problems, efficiency loss, and eventual catastrophic failure",
          "It creates paperwork for the maintenance team"
        ],
        correctAnswer: 2,
        explanation: "Tube leaks worsen over time. Water loss affects chemistry balance. The leak location may spread. Continued thermal cycling stresses weakened metal. What starts as a minor issue can become an unplanned outage or safety incident."
      },
      {
        id: 5,
        question: "How should you handle a risk that you identify but cannot immediately fix due to budget constraints?",
        type: "multiple-choice",
        options: [
          "Ignore it until budget is available",
          "Document the risk, implement interim controls if possible, communicate to management, and schedule for future action",
          "Fix it anyway and deal with budget later",
          "Remove the documentation so no one asks about it"
        ],
        correctAnswer: 1,
        explanation: "Unfunded risks must still be documented and communicated. Interim controls (e.g., increased monitoring, temporary barriers, reduced operation) may reduce exposure. Management needs to understand what risks remain so they can make informed decisions."
      }
    ],
    reflectionPrompt: "Look at your facility's open work order list. Can you rank every item by risk category? Are there life safety or regulatory items that have been deferred due to budget or convenience?",
    keyTakeaways: [
      "Risks fall into categories: life safety, regulatory, equipment failure, energy waste, comfort",
      "Life safety and regulatory risks take priority over operational convenience",
      "Deferred maintenance often contains escalating risks that are easy to overlook",
      "Risk identification enables informed prioritization of limited resources",
      "Document risks even when you cannot immediately address them",
      "Near-misses and unsafe conditions are indicators of systemic risk"
    ]
  },

  4: {
    id: 4,
    title: "Maintenance Strategy and Reliability",
    objective: "Compare maintenance approaches and determine when each is appropriate based on equipment criticality",
    duration: "75 minutes",
    narrationScript: [
      "Maintenance strategy is not one-size-fits-all. Running equipment to failure makes sense for some components. Preventive schedules work for others. Condition-based monitoring is worth the investment for critical assets.",
      "The key is matching the strategy to the equipment: its criticality, failure modes, failure consequences, and the cost of different approaches.",
      "Too many facilities apply the same PM interval to everything—or worse, run everything to failure because they lack capacity to do otherwise.",
      "This module teaches you to evaluate maintenance approaches, assess PM schedules, and determine when to invest in monitoring versus when to accept run-to-failure.",
      "The goal is not perfect reliability. It is optimized reliability: the right level of maintenance for each piece of equipment given its role in your operation."
    ],
    scenario: {
      title: "The PM Schedule That Wastes Resources",
      description: "Evaluating whether a preventive maintenance program is effective",
      situation: "Your facility has a PM program that changes all AHU filters quarterly, regardless of condition. Technicians report that some filters are still clean at change-out while others are loaded within weeks. Meanwhile, a critical chiller has only annual PM while its cooling tower—which directly affects chiller efficiency—receives no scheduled maintenance at all. You are asked to evaluate whether the PM program is allocating effort effectively."
    },
    standards: {
      title: "Maintenance Strategy Standards",
      items: [
        "Classify equipment by criticality: what happens if it fails?",
        "Match maintenance strategy to failure mode: wear-out failures suit preventive maintenance; random failures do not",
        "Review PM task lists annually—remove tasks that do not prevent failures or extend life",
        "Apply condition-based monitoring to high-value equipment where failure is costly",
        "Accept run-to-failure for non-critical, low-cost items with no safety impact",
        "Track maintenance costs and equipment uptime to evaluate program effectiveness",
        "Ensure PM programs do not create new problems through unnecessary disassembly or adjustment"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "When is run-to-failure an acceptable maintenance strategy?",
        type: "multiple-choice",
        options: [
          "Never—all equipment requires preventive maintenance",
          "For low-cost, non-critical items with no safety impact and easy replacement",
          "For all equipment to save maintenance costs",
          "Only for equipment under warranty"
        ],
        correctAnswer: 1,
        explanation: "Run-to-failure is appropriate for components like light bulbs, small pumps in non-critical service, or equipment with redundant backup—where failure causes no safety issue and replacement cost is less than PM cost."
      },
      {
        id: 2,
        question: "A PM program changes air filters on a fixed 90-day schedule. Some filters are clean at change-out, others are loaded in 30 days. What does this indicate?",
        type: "multiple-choice",
        options: [
          "The PM program is working correctly",
          "The schedule is not matched to actual conditions—some filters are changed too early, others too late",
          "All filters should be changed more frequently",
          "Filter quality is inconsistent"
        ],
        correctAnswer: 1,
        explanation: "Fixed intervals that do not reflect actual conditions waste resources on clean filters while allowing dirty filters to restrict airflow. Condition-based change-out (differential pressure monitoring) is often more effective."
      },
      {
        id: 3,
        question: "What is the primary purpose of preventive maintenance?",
        type: "multiple-choice",
        options: [
          "To keep technicians busy",
          "To replace worn components before they fail, extending equipment life and preventing unplanned downtime",
          "To satisfy warranty requirements only",
          "To generate work orders for tracking"
        ],
        correctAnswer: 1,
        explanation: "Effective PM addresses wear-out failures by replacing components before they cause breakdown. The goal is planned intervention during convenient windows rather than unplanned failure during critical operation."
      },
      {
        id: 4,
        question: "Why might a chiller with annual PM still fail unexpectedly?",
        type: "multiple-choice",
        options: [
          "Annual PM is never sufficient",
          "If the failure mode is not wear-related (e.g., refrigerant leak, electrical fault), time-based PM may not catch it",
          "Chillers are too complex for maintenance",
          "The technicians are not qualified"
        ],
        correctAnswer: 1,
        explanation: "Time-based PM catches wear-out failures but not random failures like refrigerant leaks, electrical faults, or control issues. Condition monitoring (vibration, refrigerant analysis, electrical testing) catches these failure modes."
      },
      {
        id: 5,
        question: "A cooling tower receives no scheduled maintenance. What risks does this create for the chiller it serves?",
        type: "multiple-choice",
        options: [
          "No impact—cooling towers do not affect chillers",
          "Scale, biological growth, and fouling in the tower increase condenser water temperature, reducing chiller efficiency and life",
          "The chiller will run more efficiently without tower maintenance",
          "Cooling tower maintenance is not necessary"
        ],
        correctAnswer: 1,
        explanation: "The cooling tower directly affects condenser water temperature. Fouled towers deliver warmer water, forcing the chiller to work harder. This reduces efficiency and accelerates compressor wear. Tower maintenance protects chiller investment."
      }
    ],
    reflectionPrompt: "Review your facility's PM program. Are there tasks that have never prevented a failure? Are there critical assets that receive less attention than they should?",
    keyTakeaways: [
      "Match maintenance strategy to equipment criticality and failure modes",
      "Preventive maintenance works for wear-out failures with predictable timelines",
      "Condition-based monitoring catches random failures that time-based PM misses",
      "Run-to-failure is acceptable for non-critical, low-cost items with no safety impact",
      "PM programs should be reviewed annually—tasks that do not prevent failures waste resources",
      "Reliability is optimized, not maximized—the right level of maintenance for each asset"
    ]
  },

  5: {
    id: 5,
    title: "Energy, Utilities, and Operating Costs",
    objective: "Interpret utility data, identify waste sources, and connect operations to energy costs",
    duration: "75 minutes",
    narrationScript: [
      "Energy is often the largest controllable operating cost in a facility. Yet many operators do not connect their daily decisions to the utility bill.",
      "Understanding how equipment operation, building loads, and maintenance practices affect energy consumption is essential for cost control.",
      "This module teaches you to read utility data, identify waste patterns, and recognize the operational causes of high consumption.",
      "You will learn to see energy not as a fixed cost but as a variable that responds to equipment condition, scheduling, and operator decisions.",
      "The goal is not to obsess over every kilowatt, but to recognize when something is using more energy than it should—and know what to do about it."
    ],
    scenario: {
      title: "The Unexplained Consumption Spike",
      description: "Tracing a 15% increase in electrical demand to its source",
      situation: "The August electric bill shows a 15% increase in demand charges compared to the same month last year. Weather was similar. Occupancy was the same. Building automation shows no obvious changes. You investigate and find: a chiller running in manual override at fixed capacity (instead of auto-staging), economizers locked out on three rooftop units, and a scheduling error running exhaust fans 24/7 instead of occupied hours only. Each issue contributes to the spike."
    },
    standards: {
      title: "Energy Management Standards",
      items: [
        "Review utility bills monthly and compare to same period in prior years",
        "Investigate any consumption increase greater than 10% without corresponding load increase",
        "Audit BAS schedules quarterly to verify equipment operates only when needed",
        "Verify economizer operation during mild weather—free cooling reduces compressor runtime",
        "Monitor chiller and boiler efficiency trends—declining efficiency increases consumption",
        "Identify equipment running continuously that should cycle or stage",
        "Report energy anomalies promptly—waste compounds daily until corrected"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "A chiller running in manual override at fixed capacity (instead of auto-staging) affects energy use how?",
        type: "multiple-choice",
        options: [
          "It uses less energy because it is more stable",
          "It uses more energy because it cannot reduce output to match actual load",
          "It has no impact on energy",
          "It only affects water use, not electricity"
        ],
        correctAnswer: 1,
        explanation: "Chillers are most efficient when staging matches load. Running at fixed capacity when load is low forces the chiller to work harder than necessary, wasting energy and potentially causing other issues like short-cycling."
      },
      {
        id: 2,
        question: "Why should you compare utility bills to the same month in prior years rather than just to the prior month?",
        type: "multiple-choice",
        options: [
          "Prior year data is more accurate",
          "Weather and occupancy patterns are seasonal—comparing to same season provides better baseline for identifying anomalies",
          "Prior month data is not available",
          "It is required by regulators"
        ],
        correctAnswer: 1,
        explanation: "Energy use varies seasonally with weather and occupancy. August to August comparison controls for these variables. August to July comparison mixes summer cooling load with mid-summer transition, obscuring real changes."
      },
      {
        id: 3,
        question: "What is an economizer, and why does its failure waste energy?",
        type: "multiple-choice",
        options: [
          "A device that reduces heating costs only",
          "A system that uses outdoor air for cooling when conditions allow, reducing or eliminating compressor operation",
          "A type of chiller",
          "An energy billing adjustment"
        ],
        correctAnswer: 1,
        explanation: "Economizers bring in cool outdoor air to satisfy cooling load without running compressors. When economizers fail or are locked out, the system runs mechanical cooling even when free cooling is available—significant waste."
      },
      {
        id: 4,
        question: "Exhaust fans running 24/7 instead of occupied hours affects energy how?",
        type: "multiple-choice",
        options: [
          "No impact—fans use minimal energy",
          "Fans consume electricity continuously AND force the HVAC system to condition outdoor air that the exhaust pulls into the building",
          "It only affects air quality, not energy",
          "It saves energy by reducing HVAC load"
        ],
        correctAnswer: 1,
        explanation: "Exhaust fans both consume electricity and create negative pressure that pulls unconditioned outdoor air into the building. This infiltration load forces heating or cooling systems to work harder, compounding the waste."
      },
      {
        id: 5,
        question: "A 15% demand charge increase costs the facility $2,000/month. How much does three months of delay in fixing the issue cost?",
        type: "multiple-choice",
        options: [
          "$2,000",
          "$6,000—waste compounds until corrected",
          "$1,000—the rate decreases over time",
          "Nothing if the budget does not cover repairs"
        ],
        correctAnswer: 1,
        explanation: "Energy waste is continuous. Every month the issue persists costs another $2,000. Prompt action prevents compounding losses. Delaying repairs to defer cost often results in higher total expenditure."
      }
    ],
    reflectionPrompt: "Do you know what your facility spent on electricity last month? Do you know why it was higher or lower than the month before?",
    keyTakeaways: [
      "Energy is often the largest controllable operating cost",
      "Compare utility data to same period in prior years to identify anomalies",
      "Equipment in manual override, locked-out economizers, and scheduling errors are common waste sources",
      "Declining equipment efficiency increases consumption—monitor trends",
      "Energy waste compounds daily—prompt investigation and correction matters",
      "Operator decisions directly affect utility bills"
    ]
  },

  6: {
    id: 6,
    title: "Documentation, SOPs, and Compliance",
    objective: "Assess documentation quality and ensure regulatory defensibility in facility records",
    duration: "60 minutes",
    narrationScript: [
      "Documentation is not paperwork for its own sake. It is evidence that your facility operates safely, legally, and effectively.",
      "When an inspector, auditor, or attorney asks what you did and when you did it, your records are your defense.",
      "Poor documentation—missing signatures, vague entries, inconsistent logs—creates liability even when actual operations are sound.",
      "This module teaches you to evaluate SOPs, inspection logs, and compliance records for completeness and accuracy.",
      "You will learn to identify documentation gaps that create regulatory exposure or operational confusion before they become problems."
    ],
    scenario: {
      title: "The Audit That Revealed Documentation Gaps",
      description: "An insurance inspection exposes recordkeeping weaknesses",
      situation: "An insurance loss-control inspector reviews your boiler room records. She asks to see: the last three annual boiler inspections, water treatment logs for the past year, safety valve test records, operator training documentation, and the low-water cutoff test log. You can produce the boiler inspections and some water treatment logs, but the safety valve tests were done but not recorded, operator training was verbal with no sign-off sheets, and the low-water cutoff log shows inconsistent entries with gaps. The inspector notes these deficiencies in her report, potentially affecting your coverage terms."
    },
    standards: {
      title: "Documentation and Compliance Standards",
      items: [
        "All required inspections must be documented with date, inspector, findings, and follow-up actions",
        "SOPs must be reviewed annually and updated when equipment or regulations change",
        "Training must be documented with trainee signature, trainer, date, and topics covered",
        "Log entries must be legible, complete, and consistent—no gaps in required intervals",
        "Corrective actions from inspections must be documented with completion date and responsible party",
        "Compliance records must be retained per regulatory requirements—typically 3-5 years minimum",
        "Digital and paper records must be backed up and accessible for audits or investigations"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "A safety valve test was performed correctly, but no record exists. What is the regulatory and legal status of that test?",
        type: "multiple-choice",
        options: [
          "Fully compliant—the test was done",
          "Defensibly questionable—without documentation, you cannot prove the test occurred if challenged",
          "The test does not count for maintenance purposes",
          "Documentation is optional for safety equipment"
        ],
        correctAnswer: 1,
        explanation: "From a regulatory and legal standpoint, undocumented activities are difficult to defend. An inspector or attorney may assume the test was not done. Documentation is the evidence that supports your compliance claim."
      },
      {
        id: 2,
        question: "What is the primary purpose of Standard Operating Procedures (SOPs)?",
        type: "multiple-choice",
        options: [
          "To satisfy auditors only",
          "To ensure tasks are performed consistently, correctly, and safely regardless of which operator is on shift",
          "To create paperwork for regulatory files",
          "To restrict operator flexibility"
        ],
        correctAnswer: 1,
        explanation: "SOPs capture the correct way to perform a task. They ensure consistency across shifts and operators, reduce errors, and provide a training reference. They also demonstrate due diligence in maintaining operational standards."
      },
      {
        id: 3,
        question: "A log shows entries for most days but has unexplained gaps on weekends. What risk does this create?",
        type: "multiple-choice",
        options: [
          "No risk—weekends are less important",
          "Creates questions about whether required tasks were performed, and suggests inconsistent operational oversight",
          "Weekend entries are not required",
          "Gaps indicate efficient operation"
        ],
        correctAnswer: 1,
        explanation: "Unexplained gaps suggest either tasks were not performed or documentation was not prioritized. Both create compliance risk and operational questions. Consistent logging demonstrates consistent operation."
      },
      {
        id: 4,
        question: "How often should SOPs be reviewed for accuracy?",
        type: "multiple-choice",
        options: [
          "Only when equipment is replaced",
          "At least annually, and whenever equipment, processes, or regulations change",
          "Every five years",
          "SOPs do not require review once written"
        ],
        correctAnswer: 1,
        explanation: "Equipment, regulations, and best practices evolve. SOPs must be reviewed at least annually to ensure they reflect current requirements. Outdated SOPs can lead operators to perform tasks incorrectly or unsafely."
      },
      {
        id: 5,
        question: "An inspector asks for training records. You have verbal assurance that all operators were trained. Is this sufficient?",
        type: "multiple-choice",
        options: [
          "Yes—the training happened",
          "No—training without documentation cannot be verified and may not satisfy regulatory requirements",
          "Only if the inspector knows the trainer personally",
          "Verbal training is preferred over documented training"
        ],
        correctAnswer: 1,
        explanation: "Documented training proves who was trained, when, on what topics, and by whom. Without records, you cannot demonstrate compliance with training requirements or defend against claims of inadequate training."
      }
    ],
    reflectionPrompt: "If an inspector asked for your facility's records tomorrow, could you produce complete documentation for all required inspections, training, and maintenance activities?",
    keyTakeaways: [
      "Documentation is evidence—undocumented activities are legally and regulatorily questionable",
      "All required inspections, tests, and training must be documented with appropriate detail",
      "SOPs must be reviewed annually and updated when conditions change",
      "Consistent log entries demonstrate consistent operations",
      "Corrective actions must be documented with completion evidence",
      "Good documentation protects the facility, the organization, and you personally"
    ]
  },

  7: {
    id: 7,
    title: "Translating Conditions into Management Actions",
    objective: "Convert technical findings into clear, defensible recommendations for leadership",
    duration: "60 minutes",
    narrationScript: [
      "Identifying problems is only half the job. The other half is communicating what you found in a way that enables decision-makers to act.",
      "Technical jargon, excessive detail, and unclear recommendations frustrate leadership and delay action.",
      "This module teaches you to present facility conditions, risks, and recommendations in plain language that supports informed decisions.",
      "You will learn to structure management briefs, quantify impacts, and present options without overselling or understating.",
      "The goal is not to tell management what to do. It is to give them the information they need to make good decisions—and to stand behind your recommendations when asked."
    ],
    scenario: {
      title: "The Capital Request That Got Approved",
      description: "Presenting a chiller replacement recommendation to leadership",
      situation: "Your facility's 25-year-old chiller is increasingly unreliable. It has had three unplanned shutdowns this year, efficiency has declined 18% from nameplate, and the refrigerant is being phased out. You need to present a replacement recommendation to the CFO, who has limited technical background. You prepare a one-page brief that covers: current condition, operational risk, energy cost impact, regulatory timeline for refrigerant phase-out, replacement options with costs, and your recommendation with supporting rationale. The CFO approves the capital request."
    },
    standards: {
      title: "Management Communication Standards",
      items: [
        "Lead with the bottom line—what is the issue, what do you recommend, why does it matter",
        "Quantify impacts: dollars, downtime, risk level, timeline",
        "Present options with pros and cons, not just your preferred solution",
        "Use plain language—avoid jargon that obscures meaning",
        "Be honest about uncertainties—do not oversell benefits or downplay risks",
        "Support recommendations with evidence, not opinions",
        "Be prepared to answer questions and defend your reasoning"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "What is the most effective way to open a management brief about a facility issue?",
        type: "multiple-choice",
        options: [
          "With detailed technical background",
          "With the bottom line: what is the issue, what do you recommend, and why it matters",
          "With a history of the equipment",
          "With a request for more budget"
        ],
        correctAnswer: 1,
        explanation: "Decision-makers are busy. Lead with the key message—issue, recommendation, impact—then provide supporting detail. This structure respects their time and ensures the main point is communicated even if they stop reading early."
      },
      {
        id: 2,
        question: "Why should you present options rather than just your preferred solution?",
        type: "multiple-choice",
        options: [
          "To make the brief longer",
          "To show you considered alternatives, and to give decision-makers agency in choosing the approach",
          "To avoid making a recommendation",
          "Options are required by corporate policy"
        ],
        correctAnswer: 1,
        explanation: "Presenting options demonstrates thorough analysis and respects leadership's role in decision-making. It also builds trust—you're providing information for their decision, not just selling your preference."
      },
      {
        id: 3,
        question: "A chiller replacement will cost $350,000 but save $45,000/year in energy. How should you present this?",
        type: "multiple-choice",
        options: [
          "Just state the cost without benefits",
          "Present cost alongside energy savings, simple payback period (7.8 years), and other benefits like reduced maintenance and risk",
          "Inflate the savings to make the project more attractive",
          "Avoid mentioning cost until asked"
        ],
        correctAnswer: 1,
        explanation: "Present the full picture: cost, savings, payback, and qualitative benefits. Honest presentation of economics helps leadership make informed decisions. Inflating numbers damages credibility if discovered."
      },
      {
        id: 4,
        question: "What should you do when you are uncertain about a cost estimate or risk assessment?",
        type: "multiple-choice",
        options: [
          "Present your best guess as a fact",
          "State the estimate clearly, note the uncertainty, and explain what additional information would improve accuracy",
          "Avoid presenting uncertain information",
          "Inflate the estimate to be safe"
        ],
        correctAnswer: 1,
        explanation: "Acknowledging uncertainty is honest and professional. Decision-makers can factor uncertainty into their risk assessment. Presenting guesses as facts damages credibility when reality differs from predictions."
      },
      {
        id: 5,
        question: "A manager asks why you did not recommend the cheapest option. What is the appropriate response?",
        type: "multiple-choice",
        options: [
          "The cheapest option is always the worst",
          "Explain the trade-offs: the cheaper option may have higher risk, shorter life, or greater long-term cost",
          "Admit you made a mistake",
          "Defer to whatever the manager prefers"
        ],
        correctAnswer: 1,
        explanation: "Defending your recommendation means explaining the reasoning. Cheap options often have hidden costs—shorter life, lower efficiency, higher maintenance. Present the trade-offs clearly and let the decision-maker weigh them."
      }
    ],
    reflectionPrompt: "Think of the last time you presented a recommendation to leadership. Did they understand the issue, the options, and the rationale—or did they seem confused or unconvinced?",
    keyTakeaways: [
      "Lead with the bottom line—issue, recommendation, impact",
      "Quantify impacts in terms leadership understands: dollars, time, risk",
      "Present options with honest trade-offs, not just your preferred solution",
      "Use plain language and avoid technical jargon that obscures meaning",
      "Acknowledge uncertainty—do not oversell or understate",
      "Be prepared to defend your recommendations with evidence and reasoning"
    ]
  }
};
