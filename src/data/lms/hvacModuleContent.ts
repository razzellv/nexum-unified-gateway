import { ModuleContent } from "@/types/lms/course";

export const hvacModuleContent: Record<number, ModuleContent> = {
  1: {
    id: 1,
    title: "Building System Discipline & Troubleshooting Habits",
    objective: "Master foundational troubleshooting methodologies and build disciplined maintenance habits",
    duration: "50 minutes",
    narrationScript: [
      "Welcome to HVAC Optimization Mastery. Effective facility management starts with discipline and systematic troubleshooting habits.",
      "In this module, you'll learn to approach HVAC problems methodically, document findings accurately, and build habits that prevent recurring issues.",
      "The best technicians aren't just problem solvers—they're problem preventers through disciplined systems thinking.",
    ],
    scenario: {
      title: "The Monday Morning Crisis",
      description: "Multiple HVAC complaints after weekend shutdown",
      situation: "You arrive Monday morning to find three separate HVAC complaints: Zone 2 is too cold (62°F), Zone 5 is too hot (78°F), and the main AHU is showing a high static pressure alarm. Weekend logs show the BAS was in 'unoccupied mode' as scheduled. Where do you start, and what systematic approach will you use to triage and resolve these issues?",
    },
    standards: {
      title: "Key Standards & Protocols",
      items: [
        "ASHRAE Guideline 0-2019: The Commissioning Process",
        "NFPA 70: National Electrical Code for HVAC controls",
        "Systematic troubleshooting methodology (symptom → hypothesis → test → resolution)",
        "Documentation standards for maintenance logs and work orders",
      ],
    },
    sopExample: `# Standard Operating Procedure: HVAC Troubleshooting Protocol

## Purpose
Establish systematic approach for diagnosing and resolving HVAC issues

## Scope
All HVAC equipment and systems

## Procedure
1. **Initial Assessment**
   - Gather complaint details and symptoms
   - Review BAS alarms and trend data
   - Check recent maintenance activities

2. **Hypothesis Development**
   - List possible causes (most to least likely)
   - Consider recent changes or work performed
   - Review equipment maintenance history

3. **Systematic Testing**
   - Test hypotheses in order of likelihood
   - Document each test result
   - Isolate variables when testing

4. **Resolution & Verification**
   - Implement corrective action
   - Monitor system for 24-48 hours
   - Document root cause and solution

5. **Follow-up Documentation**
   - Update work order with detailed findings
   - Log solution in knowledge base
   - Schedule follow-up inspection if needed`,
    quiz: [
      {
        id: 1,
        question: "When multiple HVAC complaints occur simultaneously, what is the FIRST step in systematic troubleshooting?",
        type: "multiple-choice",
        options: [
          "Immediately check each zone individually",
          "Review BAS data and look for common cause patterns",
          "Reset all systems to clear alarms",
          "Call the equipment vendor for support",
        ],
        correctAnswer: 1,
        explanation: "Reviewing BAS data first allows you to identify patterns and potential common causes before spending time on individual zone checks. This systematic approach is more efficient and often reveals the root cause affecting multiple zones.",
      },
      {
        id: 2,
        question: "What is the primary benefit of documenting troubleshooting steps in a maintenance log?",
        type: "multiple-choice",
        options: [
          "To meet insurance requirements",
          "To build a knowledge base and prevent repeat issues",
          "To satisfy regulatory audits",
          "To track labor hours for billing",
        ],
        correctAnswer: 1,
        explanation: "While documentation serves multiple purposes, its primary benefit is creating a knowledge base that helps diagnose similar issues faster and prevents recurring problems through systematic learning.",
      },
      {
        id: 3,
        question: "Which troubleshooting approach follows best practices for HVAC systems?",
        type: "multiple-choice",
        options: [
          "Replace suspected faulty components immediately",
          "Form hypothesis → test systematically → verify solution",
          "Try multiple fixes simultaneously to save time",
          "Focus only on the most expensive equipment first",
        ],
        correctAnswer: 1,
        explanation: "The scientific method (hypothesis → test → verify) prevents wasted time and money on unnecessary repairs while ensuring you understand the root cause.",
      },
      {
        id: 4,
        question: "Why is it important to isolate variables when testing HVAC systems?",
        type: "multiple-choice",
        options: [
          "To speed up the testing process",
          "To clearly identify which change resolved the issue",
          "To reduce energy consumption during testing",
          "To comply with OSHA requirements",
        ],
        correctAnswer: 1,
        explanation: "Isolating variables ensures you know exactly which action solved the problem, building reliable knowledge for future troubleshooting.",
      },
      {
        id: 5,
        question: "What should you do BEFORE implementing a corrective action for an HVAC issue?",
        type: "multiple-choice",
        options: [
          "Notify all building occupants",
          "Document the current state and test your hypothesis",
          "Order replacement parts",
          "Shut down the entire system",
        ],
        correctAnswer: 1,
        explanation: "Testing your hypothesis before taking action prevents unnecessary work and ensures your solution addresses the actual problem, not just symptoms.",
      },
      {
        id: 6,
        question: "How long should you monitor an HVAC system after implementing a fix?",
        type: "multiple-choice",
        options: [
          "Until the end of your shift",
          "24-48 hours minimum to verify stability",
          "Only until alarms clear",
          "No monitoring needed if fix seems successful",
        ],
        correctAnswer: 1,
        explanation: "A 24-48 hour monitoring period ensures the fix addresses the root cause and the system operates stably under various conditions.",
      },
      {
        id: 7,
        question: "In the scenario, Zone 2 is 62°F and Zone 5 is 78°F. What common cause should you investigate FIRST?",
        type: "multiple-choice",
        options: [
          "Individual thermostat calibration",
          "Supply air temperature from main AHU",
          "Zone damper positions",
          "Individual room heat loads",
        ],
        correctAnswer: 1,
        explanation: "When multiple zones have temperature issues, checking the common source (supply air temp) first is most efficient. If the AHU isn't providing correct supply air, individual zone adjustments won't help.",
      },
      {
        id: 8,
        question: "What does 'disciplined troubleshooting' mean in HVAC maintenance?",
        type: "multiple-choice",
        options: [
          "Following strict time limits for repairs",
          "Using systematic methods and proper documentation every time",
          "Only working on equipment you're certified for",
          "Always calling supervisors before making changes",
        ],
        correctAnswer: 1,
        explanation: "Disciplined troubleshooting means consistently applying systematic methods and proper documentation, building reliable knowledge and preventing recurring issues.",
      },
      {
        id: 9,
        question: "An AHU shows 4.2\" w.c. static pressure (normal is 2.8\" w.c.). Calculate the percentage increase in static pressure.",
        type: "math",
        options: [],
        correctAnswer: 50,
        explanation: "Increase = (4.2 - 2.8) / 2.8 × 100 = 1.4 / 2.8 × 100 = 50%. This 50% increase indicates a significant restriction, possibly dirty filters or closed dampers.",
      },
      {
        id: 10,
        question: "You find BAS shows 'unoccupied mode' on Monday morning. What system literacy check should you perform?",
        type: "system-literacy",
        options: [
          "Verify the BAS schedule programming matches building occupancy",
          "Immediately switch to occupied mode without checking",
          "Assume it's correct and look elsewhere",
          "Disable the BAS and run systems manually",
        ],
        correctAnswer: 0,
        explanation: "System literacy means understanding how the BAS operates. If the building is occupied on Mondays but the schedule shows unoccupied, this is likely causing your issues. Always verify BAS programming matches actual building use.",
      },
    ],
    reflectionPrompt: "Think about a recent HVAC issue you encountered. How would applying systematic troubleshooting methodology have changed your approach? What documentation habits would improve your team's response to similar issues?",
    keyTakeaways: [
      "Systematic troubleshooting saves time and prevents unnecessary repairs",
      "Look for common causes when multiple issues occur simultaneously",
      "Proper documentation builds a knowledge base that benefits the entire team",
      "Isolate variables during testing to clearly identify root causes",
      "Monitor systems after repairs to verify solutions address root problems, not just symptoms",
    ],
  },
};
