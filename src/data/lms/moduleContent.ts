import { ModuleContent } from "@/types/lms/course";

export const moduleContent: Record<number, ModuleContent> = {
  1: {
    id: 1,
    title: "Introduction to Facility Optimization & Compliance",
    objective: "Understand the critical role of facility optimization in meeting regulatory standards and operational excellence while developing a forward-thinking engineering mindset.",
    duration: "45 minutes",
    narrationScript: [
      "Welcome to the Nexum Suum Compliance & Optimization Training Series. You're about to embark on a journey that will transform how you think about facility management—not just as keeping systems running, but as orchestrating a complex symphony of efficiency, compliance, safety, and innovation.",
      
      "The year is 2035, and facilities engineering has evolved. You're no longer just maintaining equipment—you're optimizing integrated systems using real-time data, predictive analytics, and regulatory intelligence. But to get there, we need to master the fundamentals that never change: physics, chemistry, safety protocols, and ethical decision-making.",
      
      "Modern facility optimization rests on three pillars: Performance, Compliance, and Intelligence. Performance means maximizing efficiency while minimizing waste—whether that's energy, water, or operating time. Compliance means understanding and meeting the overlapping requirements of OSHA, EPA, FDA, ASME, and state regulations like NJAC 7:27-19.16. Intelligence means using data to predict failures before they happen and optimize operations before inefficiencies compound.",
      
      "Let me paint you a picture. You walk into a facility on a Monday morning. The boiler pressure is nominal, chillers are running efficiently, HVAC is maintaining set points, and your predictive maintenance dashboard shows all systems green for the next 30 days. That's not luck—that's optimization. That's what we're building toward.",
      
      "But here's the reality check: compliance isn't optional, and ignorance isn't a defense. A single EPA violation can cost your facility six figures. An OSHA citation can shut down operations. A boiler failure without proper maintenance records can result in criminal liability. We're not here to scare you—we're here to equip you with the knowledge and decision-making framework to never let that happen.",
      
      "Throughout this training series, you'll learn the technical fundamentals of every major facility system. You'll understand the regulatory landscape like a compliance officer. You'll develop the leadership mindset to make tough calls under pressure. And most importantly, you'll learn to think systematically—seeing how every component, every regulation, every maintenance task connects to the larger goal of operational excellence.",
      
      "The engineer of 2035 doesn't just react to problems. They anticipate them. They don't just follow regulations—they understand why those regulations exist and how to exceed them. They don't just manage equipment—they optimize entire systems for maximum efficiency and reliability.",
      
      "This is your foundation. Let's build something remarkable."
    ],
    scenario: {
      title: "The Monday Morning Walk-Through",
      description: "Real-world application of systematic facility assessment",
      situation: "You arrive at a pharmaceutical manufacturing facility at 6:00 AM on Monday. The weekend shift reports 'everything normal,' but as you conduct your morning walk-through, you notice the following: boiler #2 pressure is 5 PSI higher than usual, chiller #1 condenser water temperature has crept up 3°F, the main electrical panel shows a 7% higher amperage draw than Friday's readings, and the air handling unit for the clean room is cycling more frequently than scheduled. Nothing is in alarm status. Most engineers would document 'all systems operational' and move on. How would you approach this situation?"
    },
    standards: {
      title: "Key Standards Referenced in This Module",
      items: [
        "OSHA 29 CFR 1910 - Occupational Safety and Health Standards (General Industry)",
        "EPA Clean Air Act - 40 CFR Parts 50-99",
        "EPA Clean Water Act - 40 CFR Parts 100-149",
        "ASME Boiler and Pressure Vessel Code (BPVC)",
        "NJAC 7:27-19.16 - Operating Permits for Major Facilities",
        "21 CFR Part 211 - Current Good Manufacturing Practice (cGMP) for pharmaceuticals",
        "NFPA 70 - National Electrical Code (NEC)",
        "ASHRAE Standards - HVAC system design and energy efficiency"
      ]
    },
    quiz: [
      {
        id: 1,
        question: "What are the three pillars of modern facility optimization as described in this module?",
        type: "multiple-choice",
        options: [
          "Safety, Cost, Speed",
          "Performance, Compliance, Intelligence",
          "Maintenance, Operations, Engineering",
          "Efficiency, Reliability, Profitability"
        ],
        correctAnswer: 1,
        explanation: "The three pillars are Performance (efficiency and waste minimization), Compliance (regulatory adherence), and Intelligence (predictive analytics and data-driven decision making)."
      },
      {
        id: 2,
        question: "In the Monday morning scenario, what is the most appropriate initial response to the observed deviations, even though no alarms have triggered?",
        type: "multiple-choice",
        options: [
          "Document 'all systems operational' since nothing is in alarm",
          "Immediately shut down all systems for inspection",
          "Systematically investigate each deviation, correlate the data, and determine if they represent an emerging pattern",
          "Wait until the deviations worsen before taking action"
        ],
        correctAnswer: 2,
        explanation: "The professional approach is systematic investigation and correlation. Small deviations often indicate emerging issues. The engineer of 2035 doesn't wait for alarms—they anticipate problems through pattern recognition and data analysis."
      },
      {
        id: 3,
        question: "Why is 'ignorance is not a defense' particularly critical in facility compliance?",
        type: "short-answer",
        correctAnswer: "Regulatory agencies hold facility operators strictly liable for compliance violations regardless of intent or knowledge. Not knowing a regulation exists or applies to your facility does not exempt you from penalties, which can include fines, operational shutdowns, and even criminal liability. Facility engineers have a professional and legal obligation to understand applicable regulations.",
        explanation: "Strict liability means you are responsible for compliance whether you knew about the requirement or not. This is why systematic training and documentation are critical—they demonstrate due diligence and professional competence."
      },
      {
        id: 4,
        question: "Which regulatory standard specifically governs boiler and pressure vessel design and operation?",
        type: "multiple-choice",
        options: [
          "OSHA 29 CFR 1910",
          "ASME Boiler and Pressure Vessel Code (BPVC)",
          "EPA Clean Air Act",
          "NFPA 70 - National Electrical Code"
        ],
        correctAnswer: 1,
        explanation: "The ASME Boiler and Pressure Vessel Code (BPVC) is the international standard for the design, fabrication, and inspection of boilers and pressure vessels. While OSHA references ASME standards, ASME BPVC is the primary technical authority."
      },
      {
        id: 5,
        question: "In the context of facility optimization, what is the primary benefit of predictive maintenance over reactive maintenance?",
        type: "multiple-choice",
        options: [
          "It costs less to implement",
          "It eliminates the need for spare parts inventory",
          "It allows you to anticipate and prevent failures before they occur, minimizing downtime and optimizing maintenance schedules",
          "It requires less technical knowledge"
        ],
        correctAnswer: 2,
        explanation: "Predictive maintenance uses data and analytics to identify potential failures before they happen, allowing for planned interventions during scheduled downtime. This approach maximizes equipment reliability, extends asset life, and optimizes resource allocation—core principles of facility optimization."
      }
    ],
    reflectionPrompt: "Consider your current facility or a facility you're familiar with. Identify three areas where small deviations or 'normal but slightly off' conditions might indicate emerging problems. How would you systematically monitor and address these to prevent larger failures? What documentation would you create to demonstrate your proactive approach?",
    keyTakeaways: [
      "Modern facility optimization integrates Performance, Compliance, and Intelligence into every decision",
      "Small deviations from normal operating parameters often signal emerging problems—anticipate, don't wait for alarms",
      "Regulatory compliance is not optional; ignorance provides no legal protection",
      "The engineer of 2035 thinks systematically, seeing connections between components, regulations, and efficiency",
      "Documentation and data-driven decision making are professional obligations, not administrative burdens",
      "Leadership in facility management means making tough calls with incomplete information—training and systematic thinking provide your framework"
    ]
  }
};
