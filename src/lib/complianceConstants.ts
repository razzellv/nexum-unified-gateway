export const VIOLATION_TYPES = [
  // Equipment violations
  { value: 'MISSING_LOG', label: 'Missing Equipment Log', severity: 25, category: 'Equipment' },
  { value: 'LATE_LOG', label: 'Late Log Entry', severity: 15, category: 'Equipment' },
  { value: 'INCOMPLETE_DATA', label: 'Incomplete Data Entry', severity: 35, category: 'Equipment' },
  { value: 'OUT_OF_RANGE', label: 'Out of Range Reading', severity: 50, category: 'Equipment' },
  { value: 'CRITICAL_FAILURE', label: 'Critical Equipment Failure', severity: 100, category: 'Equipment' },
  { value: 'UNSAFE_OPERATION', label: 'Unsafe Operation', severity: 90, category: 'Safety' },
  
  // Compliance violations
  { value: 'MISSED_ROUND', label: 'Missed Equipment Round', severity: 40, category: 'Compliance' },
  { value: 'DOCUMENTATION_ERROR', label: 'Documentation Error', severity: 30, category: 'Compliance' },
  { value: 'UNAUTHORIZED_CHANGE', label: 'Unauthorized System Change', severity: 75, category: 'Compliance' },
  { value: 'SAFETY_VIOLATION', label: 'Safety Protocol Violation', severity: 95, category: 'Safety' },
  { value: 'TRAINING_LAPSE', label: 'Training/Certification Lapse', severity: 35, category: 'Compliance' },
  
  // Operational violations
  { value: 'PROCEDURE_DEVIATION', label: 'Procedure Deviation', severity: 45, category: 'Operational' },
  { value: 'POOR_COMMUNICATION', label: 'Poor Communication', severity: 25, category: 'Operational' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', severity: 40, category: 'Operational' },
  { value: 'RESPONSE_DELAY', label: 'Delayed Response to Issue', severity: 55, category: 'Operational' },
  
  // Serious violations
  { value: 'UNETHICAL_CONDUCT', label: 'Unethical Conduct', severity: 85, category: 'Serious' },
  { value: 'DISHONESTY', label: 'Dishonesty/Falsification', severity: 95, category: 'Serious' },
  { value: 'POLICY_VIOLATION', label: 'Company Policy Violation', severity: 65, category: 'Serious' },
];

export const POSITIVE_BEHAVIORS = [
  { value: 'INITIATIVE', label: 'Taking Initiative', severity: -20 },
  { value: 'TEAMWORK', label: 'Exceptional Teamwork', severity: -15 },
  { value: 'PROACTIVE_REPORTING', label: 'Proactive Issue Reporting', severity: -15 },
  { value: 'EXCELLENCE', label: 'Operational Excellence', severity: -25 },
  { value: 'MENTORSHIP', label: 'Mentorship/Training Others', severity: -15 },
];

export const POLICY_REFERENCES = [
  { value: 'OSHA-1910.134', label: 'OSHA 1910.134 - Respiratory Protection' },
  { value: 'OSHA-1910.147', label: 'OSHA 1910.147 - Lockout/Tagout' },
  { value: 'OSHA-1910.1200', label: 'OSHA 1910.1200 - Hazard Communication' },
  { value: 'OSHA-1926.501', label: 'OSHA 1926.501 - Fall Protection' },
  { value: 'NFPA-70', label: 'NFPA 70 - National Electrical Code' },
  { value: 'NFPA-101', label: 'NFPA 101 - Life Safety Code' },
  { value: 'ASHRAE-62.1', label: 'ASHRAE 62.1 - Ventilation Standards' },
  { value: 'COMPANY-SOP-001', label: 'Company SOP-001 - General Safety' },
  { value: 'COMPANY-SOP-002', label: 'Company SOP-002 - Equipment Operation' },
  { value: 'COMPANY-SOP-003', label: 'Company SOP-003 - Emergency Response' },
  { value: 'other', label: 'Other (specify in notes)' },
];

export function getViolationDetails(violationType: string) {
  return VIOLATION_TYPES.find(v => v.value === violationType) || {
    value: violationType,
    label: violationType,
    severity: 50,
    category: 'General'
  };
}

export function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Equipment': 'border-blue-500/50 text-blue-400',
    'Safety': 'border-red-500/50 text-red-400',
    'Compliance': 'border-purple-500/50 text-purple-400',
    'Operational': 'border-yellow-500/50 text-yellow-400',
    'Serious': 'border-red-600/50 text-red-500',
    'General': 'border-gray-500/50 text-gray-400'
  };
  return colors[category] || colors['General'];
}
