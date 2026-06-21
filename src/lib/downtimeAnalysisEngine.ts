// Downtime Analysis Engine
// Auto-detects downtime events from facility logs, work orders, violations, and compliance records.
// Builds time-pattern analysis, lead-up context, and AI-driven suggestions.

export interface OIGLogInput {
  timestamp: string;
  logType?: string;
  action?: string;
  notes?: string;
  equipmentId?: string;
  equipmentType?: string;
  operator?: string;
  severity?: string | number;
  alarmCode?: string;
  overrideFlag?: boolean;
  SK?: string;
}

export interface OIGWorkOrderInput {
  workOrderId?: string;
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  category?: string;
  equipmentId?: string;
  equipmentType?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface OIGViolationInput {
  violationId?: string;
  id?: string;
  category?: string;
  violationType?: string;
  severity?: number | string;
  status?: string;
  description?: string;
  notes?: string;
  equipmentId?: string;
  equipmentType?: string;
  createdAt?: string;
  timestamp?: string;
}

export interface OIGEquipmentInput {
  equipmentId: string;
  equipmentName?: string;
  equipmentType?: string;
  location?: string;
  status?: string;
}

export interface DowntimeAnalysisInput {
  facilityId: string;
  logs: OIGLogInput[];
  workOrders: OIGWorkOrderInput[];
  violations: OIGViolationInput[];
  equipment: OIGEquipmentInput[];
  manualEntries?: ManualDowntimeEntry[];
}

export interface ManualDowntimeEntry {
  id: string;
  equipmentName: string;
  location?: string;
  startedAt: string;
  resolvedAt?: string;
  severity: string;
  causeCategory: string;
  causeDetail: string;
  touches: { action: string; tech: string; outcome: string; timestamp: string }[];
  resolution?: string;
  status: string;
  loggedBy: string;
}

export interface LeadUpEvent {
  timestamp: string;
  type: 'log' | 'violation' | 'alarm' | 'override' | 'work_order';
  description: string;
  severity?: string;
  hoursBeforeEvent: number;
  source: string;
}

export interface RelatedComplianceItem {
  type: string;
  description: string;
  timestamp: string;
  link: string;
}

export interface DowntimeEvent {
  id: string;
  source: 'work_order' | 'violation' | 'log' | 'manual';
  equipmentId: string;
  equipmentName: string;
  systemType: string;
  occurredAt: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  causeCategory: string;
  durationMin?: number;
  leadUpEvents: LeadUpEvent[];
  relatedCompliance: RelatedComplianceItem[];
  recurrenceCount: number;
  recurrenceLabel: string;
  suggestions: string[];
}

export interface TimelineBucket {
  weekOf: string;
  label: string;
  critical: number;
  major: number;
  minor: number;
  total: number;
  events: DowntimeEvent[];
}

export interface DowntimePattern {
  id: string;
  type: 'time_of_day' | 'day_of_week' | 'equipment_repeat' | 'cause_cluster' | 'pre_event_sequence';
  title: string;
  description: string;
  confidence: 'High' | 'Moderate' | 'Low';
  affectedEquipment: string[];
  occurrenceCount: number;
  recommendation: string;
}

export interface DowntimeSuggestion {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  affectedEquipment: string[];
  estimatedImpact: string;
  actionItems: string[];
}

export interface DowntimeAnalysisResult {
  analysisTimestamp: string;
  facilityId: string;
  totalEvents: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  totalEquipmentAffected: number;
  avgEventsPerWeek: number;
  downtimeEvents: DowntimeEvent[];
  timelineBuckets: TimelineBucket[];
  patterns: DowntimePattern[];
  suggestions: DowntimeSuggestion[];
  topOffenders: { equipmentName: string; systemType: string; count: number; highestSeverity: string }[];
  executiveSummary: string;
}

// ── Keyword detection ─────────────────────────────────────────────────────────

const DOWNTIME_KEYWORDS = [
  'failure', 'failed', 'fail', 'trip', 'tripped', 'alarm', 'alarms', 'alarming',
  'shutdown', 'shut down', 'offline', 'down', 'fault', 'faulted', 'lockout',
  'locked out', 'surge', 'overheat', 'overheated', 'pressure loss', 'low pressure',
  'no cooling', 'no heat', 'not working', 'not running', 'stopped', 'not producing',
  'chiller down', 'boiler down', 'compressor fault', 'vfd fault', 'motor fault',
  'steam loss', 'glycol leak', 'refrigerant leak', 'power loss', 'breaker tripped',
  'high temp', 'emergency', 'critical', 'out of service',
];

const PRE_EVENT_KEYWORDS = [
  'vibration', 'noise', 'unusual', 'abnormal', 'high current', 'low flow',
  'low pressure', 'high pressure', 'temp rising', 'efficiency drop', 'leak',
  'override', 'alarm', 'warning', 'alert', 'intermittent', 'cycling',
  'short cycling', 'hunting', 'fluctuat',
];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function extractEquipmentName(entry: OIGWorkOrderInput | OIGLogInput | OIGViolationInput, equipment: OIGEquipmentInput[]): string {
  const eqId = (entry as any).equipmentId;
  if (eqId) {
    const found = equipment.find(e => e.equipmentId === eqId);
    if (found?.equipmentName) return found.equipmentName;
  }
  const type = (entry as any).equipmentType || '';
  if (type) return formatEquipmentType(type);
  const title = (entry as any).title || (entry as any).action || (entry as any).description || '';
  return extractSystemFromText(title) || 'Facility System';
}

function formatEquipmentType(t: string): string {
  const map: Record<string, string> = {
    chiller: 'Chiller', boiler: 'Boiler', ahu: 'AHU', vfd: 'VFD', pump: 'Pump',
    compressor: 'Compressor', cooling_tower: 'Cooling Tower', generator: 'Generator',
    spiral_freezer: 'Spiral Freezer', conveyor: 'Conveyor', heat_exchanger: 'Heat Exchanger',
    condensate_system: 'Condensate System', ro_system: 'RO System', mpcc: 'MPCC',
    hot_water_heater: 'HWH', autoclave: 'Autoclave',
  };
  return map[t.toLowerCase()] || t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractSystemFromText(text: string): string | null {
  const systems = [
    ['chiller', 'Chiller'], ['boiler', 'Boiler'], ['ahu', 'AHU'], ['vfd', 'VFD'],
    ['pump', 'Pump'], ['compressor', 'Compressor'], ['cooling tower', 'Cooling Tower'],
    ['generator', 'Generator'], ['spiral freezer', 'Spiral Freezer'],
    ['conveyor', 'Conveyor'], ['heat exchanger', 'Heat Exchanger'],
    ['freezer', 'Freezer'], ['refriger', 'Refrigeration'], ['hvac', 'HVAC'],
    ['steam', 'Steam System'], ['condensate', 'Condensate System'],
  ] as const;
  const lower = text.toLowerCase();
  for (const [kw, name] of systems) {
    if (lower.includes(kw)) return name;
  }
  return null;
}

function classifySystemType(name: string, type?: string): string {
  const combined = `${name} ${type || ''}`.toLowerCase();
  if (combined.match(/chiller|cooling|refriger|freezer/)) return 'cooling';
  if (combined.match(/boiler|steam|heat|hwh/)) return 'heating';
  if (combined.match(/ahu|air handler|vav|fan/)) return 'hvac';
  if (combined.match(/vfd|drive|motor/)) return 'electrical';
  if (combined.match(/pump|flow|pressure/)) return 'mechanical';
  if (combined.match(/conveyor|spiral|production|packaging/)) return 'production';
  if (combined.match(/generator|power|ups|transfer/)) return 'power';
  return 'general';
}

function classifyCause(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/bearing|seal|impeller|mechanical|vibrat/)) return 'Mechanical Failure';
  if (lower.match(/electrical|motor|wiring|breaker|fuse|voltage|current/)) return 'Electrical Fault';
  if (lower.match(/vfd|plc|sensor|control|setpoint|automation/)) return 'Controls / Automation';
  if (lower.match(/operator|procedure|user|override/)) return 'Operator Error';
  if (lower.match(/pm|maintenance|inspection|deferred|missed/)) return 'Maintenance Gap';
  if (lower.match(/power outage|utility|water supply|external/)) return 'External / Utility';
  if (lower.match(/wear|age|end.of.life|degradat/)) return 'Wear & Tear';
  return 'Unknown';
}

// ── Week bucketing ────────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function weekLabel(weekOf: string): string {
  const d = new Date(weekOf);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Recurrence analysis ───────────────────────────────────────────────────────

function calcRecurrence(equipmentName: string, allEvents: DowntimeEvent[]): { count: number; label: string } {
  const matches = allEvents.filter(e => e.equipmentName === equipmentName);
  const count = matches.length;
  if (count <= 1) return { count, label: 'First occurrence' };
  if (count === 2) return { count, label: '2nd occurrence — monitor closely' };
  if (count <= 4) return { count, label: `${count} events — recurring issue` };
  return { count, label: `${count} events — chronic problem` };
}

// ── Lead-up detection ─────────────────────────────────────────────────────────

function buildLeadUp(
  eventTime: string,
  equipmentId: string,
  logs: OIGLogInput[],
  violations: OIGViolationInput[],
): LeadUpEvent[] {
  const evtMs = new Date(eventTime).getTime();
  const windowMs = 48 * 3600 * 1000; // 48 hours before
  const leadUp: LeadUpEvent[] = [];

  for (const log of logs) {
    if (!log.timestamp) continue;
    const logMs = new Date(log.timestamp).getTime();
    const diffMs = evtMs - logMs;
    if (diffMs <= 0 || diffMs > windowMs) continue;
    if (equipmentId && log.equipmentId && log.equipmentId !== equipmentId) continue;
    const text = `${log.action || ''} ${log.notes || ''}`;
    if (!containsKeyword(text, PRE_EVENT_KEYWORDS) && !containsKeyword(text, DOWNTIME_KEYWORDS)) continue;
    leadUp.push({
      timestamp: log.timestamp,
      type: log.overrideFlag ? 'override' : log.alarmCode ? 'alarm' : 'log',
      description: log.action || log.notes || 'Facility log entry',
      severity: typeof log.severity === 'string' ? log.severity : undefined,
      hoursBeforeEvent: Math.round(diffMs / 3600000 * 10) / 10,
      source: 'Facility Log',
    });
  }

  for (const v of violations) {
    const ts = v.createdAt || v.timestamp;
    if (!ts) continue;
    const vMs = new Date(ts).getTime();
    const diffMs = evtMs - vMs;
    if (diffMs <= 0 || diffMs > windowMs) continue;
    if (equipmentId && v.equipmentId && v.equipmentId !== equipmentId) continue;
    leadUp.push({
      timestamp: ts,
      type: 'violation',
      description: v.description || v.notes || v.violationType || 'Violation recorded',
      severity: typeof v.severity === 'number' ? (v.severity >= 8 ? 'Critical' : v.severity >= 5 ? 'High' : 'Moderate') : v.severity || undefined,
      hoursBeforeEvent: Math.round(diffMs / 3600000 * 10) / 10,
      source: 'Compliance Logger',
    });
  }

  return leadUp.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Compliance context ────────────────────────────────────────────────────────

function buildComplianceContext(
  equipmentId: string,
  occurredAt: string,
  violations: OIGViolationInput[],
  logs: OIGLogInput[],
): RelatedComplianceItem[] {
  const items: RelatedComplianceItem[] = [];
  const evtMs = new Date(occurredAt).getTime();
  const windowMs = 7 * 24 * 3600000; // 7 days around event

  for (const v of violations) {
    const ts = v.createdAt || v.timestamp;
    if (!ts) continue;
    if (Math.abs(evtMs - new Date(ts).getTime()) > windowMs) continue;
    if (equipmentId && v.equipmentId && v.equipmentId !== equipmentId) continue;
    items.push({
      type: 'Compliance Violation',
      description: v.description || v.violationType || 'Violation event',
      timestamp: ts,
      link: '/command-hub/violations',
    });
  }

  const complianceLogs = logs.filter(l => {
    if (!l.timestamp) return false;
    if (Math.abs(evtMs - new Date(l.timestamp).getTime()) > windowMs) return false;
    if (equipmentId && l.equipmentId && l.equipmentId !== equipmentId) return false;
    return l.logType === 'compliance' || l.logType === 'inspection' || l.logType === 'pm';
  });

  for (const log of complianceLogs.slice(0, 3)) {
    items.push({
      type: log.logType === 'pm' ? 'PM Record' : 'Compliance Log',
      description: log.action || log.notes || 'Compliance entry',
      timestamp: log.timestamp,
      link: '/compliance-logger',
    });
  }

  return items.slice(0, 5);
}

// ── Suggestions ───────────────────────────────────────────────────────────────

function generateEventSuggestions(cause: string, systemType: string, recurrenceCount: number): string[] {
  const suggestions: string[] = [];

  if (recurrenceCount >= 3) {
    suggestions.push('Chronic recurrence detected — initiate root cause analysis (RCA) and create corrective action plan.');
  }
  if (cause === 'Mechanical Failure') {
    suggestions.push('Schedule precision alignment and bearing inspection. Review lubrication intervals.');
    suggestions.push('Consider vibration monitoring on this asset to catch degradation before next failure.');
  } else if (cause === 'Electrical Fault') {
    suggestions.push('Inspect motor windings, contactor contacts, and terminal connections. Test insulation resistance.');
    suggestions.push('Review power quality logs for voltage sag or harmonic distortion events preceding failure.');
  } else if (cause === 'Controls / Automation') {
    suggestions.push('Validate PID setpoints and control sequences. Check sensor calibration dates.');
    suggestions.push('Review VFD parameter settings and fault history log for leading indicators.');
  } else if (cause === 'Maintenance Gap') {
    suggestions.push('Review PM schedule — this event may be a direct result of deferred maintenance.');
    suggestions.push('Add this equipment to priority list for next PM cycle with enhanced inspection checklist.');
  } else if (cause === 'Operator Error') {
    suggestions.push('Review operating procedures with affected staff. Consider adding lockout/tagout verification step.');
  } else if (cause === 'Wear & Tear') {
    suggestions.push('Asset may be approaching end-of-life. Review replacement justification score in Equipment Library.');
  }

  if (systemType === 'cooling') {
    suggestions.push('Verify condenser coil cleanliness and refrigerant charge. Check approach temperatures against baseline.');
  } else if (systemType === 'heating') {
    suggestions.push('Inspect combustion efficiency, flue gas analysis, and heat transfer surfaces.');
  } else if (systemType === 'production') {
    suggestions.push('Coordinate with operations to schedule preventive inspections during planned downtime windows.');
  }

  return suggestions.slice(0, 3);
}

function buildGlobalSuggestions(events: DowntimeEvent[], patterns: DowntimePattern[]): DowntimeSuggestion[] {
  const suggestions: DowntimeSuggestion[] = [];

  // Find top repeat offenders
  const byEquip: Record<string, DowntimeEvent[]> = {};
  for (const e of events) {
    if (!byEquip[e.equipmentName]) byEquip[e.equipmentName] = [];
    byEquip[e.equipmentName].push(e);
  }
  const offenders = Object.entries(byEquip).filter(([, evts]) => evts.length >= 2).sort((a, b) => b[1].length - a[1].length);

  if (offenders.length > 0) {
    const [name, evts] = offenders[0];
    suggestions.push({
      id: 'sug-001',
      priority: evts.length >= 4 ? 'critical' : 'high',
      title: `Chronic downtime on ${name}`,
      detail: `${name} has experienced ${evts.length} downtime events in the analysis window. This pattern indicates a systemic issue requiring formal root cause analysis, not reactive repair.`,
      affectedEquipment: [name],
      estimatedImpact: 'Preventing one event could save 4–12 hours of unplanned downtime.',
      actionItems: [
        'Initiate formal Root Cause Analysis (RCA)',
        'Review all maintenance and inspection records for this asset',
        'Consider condition-based monitoring (CBM) or probe session',
        'Evaluate replacement justification score in Equipment Library',
      ],
    });
  }

  // Time-of-day pattern
  const hours = events.map(e => new Date(e.occurredAt).getHours());
  const hourCounts: Record<number, number> = {};
  hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const peakHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (peakHour && Number(peakHour[1]) >= 2) {
    const h = Number(peakHour[0]);
    const timeLabel = h < 12 ? `${h === 0 ? 12 : h}:00 AM` : `${h === 12 ? 12 : h - 12}:00 PM`;
    suggestions.push({
      id: 'sug-002',
      priority: 'medium',
      title: `Events cluster near ${timeLabel}`,
      detail: `${peakHour[1]} of your downtime events occurred near ${timeLabel}. This may correlate with shift changes, occupancy transitions, demand peaks, or automated schedule triggers.`,
      affectedEquipment: events.filter(e => new Date(e.occurredAt).getHours() === h).map(e => e.equipmentName).filter((v, i, a) => a.indexOf(v) === i),
      estimatedImpact: 'Targeted inspection before this window could prevent 60–80% of recurring events.',
      actionItems: [
        `Review operating schedules and setpoint changes that activate near ${timeLabel}`,
        'Check for demand-triggered events: occupancy sensors, HVAC schedules, production start sequences',
        'Schedule pre-shift walk-through 30 minutes before this time window',
      ],
    });
  }

  // Maintenance gap pattern
  const maintenanceGapEvents = events.filter(e => e.causeCategory === 'Maintenance Gap');
  if (maintenanceGapEvents.length >= 2) {
    suggestions.push({
      id: 'sug-003',
      priority: 'high',
      title: 'Multiple maintenance-gap-related failures',
      detail: `${maintenanceGapEvents.length} events were attributed to maintenance gaps — missed PMs, deferred repairs, or inspection lapses. This is a preventable failure class.`,
      affectedEquipment: maintenanceGapEvents.map(e => e.equipmentName).filter((v, i, a) => a.indexOf(v) === i),
      estimatedImpact: 'A proactive PM program typically reduces failure rate by 30–50% on affected assets.',
      actionItems: [
        'Audit PM schedule compliance for affected equipment in Work Orders',
        'Add overdue PM assets to priority maintenance list',
        'Set up compliance reminders via Compliance Logger for critical assets',
      ],
    });
  }

  // No lead-up logging pattern
  const noLeadUp = events.filter(e => e.leadUpEvents.length === 0);
  if (noLeadUp.length > events.length * 0.5 && events.length >= 3) {
    suggestions.push({
      id: 'sug-004',
      priority: 'medium',
      title: 'Limited pre-event data captured',
      detail: 'Many downtime events show no lead-up log entries. This limits ability to predict and prevent future failures. More consistent operational logging before failures occur would improve pattern detection.',
      affectedEquipment: [],
      estimatedImpact: 'Better pre-event data enables predictive maintenance and 40–60% earlier failure detection.',
      actionItems: [
        'Encourage daily operational log entries, especially for equipment showing signs of stress',
        'Consider a Prestige Probe monitoring session on high-risk assets',
        'Use the Compliance Logger to capture observations before issues escalate',
      ],
    });
  }

  return suggestions;
}

// ── Pattern analysis ──────────────────────────────────────────────────────────

function findPatterns(events: DowntimeEvent[]): DowntimePattern[] {
  const patterns: DowntimePattern[] = [];
  if (events.length < 2) return patterns;

  // Hour-of-day clustering
  const hours = events.map(e => new Date(e.occurredAt).getHours());
  const hourBuckets: Record<string, number> = { 'night (10PM–6AM)': 0, 'morning (6–10AM)': 0, 'midday (10AM–2PM)': 0, 'afternoon (2–6PM)': 0, 'evening (6–10PM)': 0 };
  hours.forEach(h => {
    if (h >= 22 || h < 6) hourBuckets['night (10PM–6AM)']++;
    else if (h < 10) hourBuckets['morning (6–10AM)']++;
    else if (h < 14) hourBuckets['midday (10AM–2PM)']++;
    else if (h < 18) hourBuckets['afternoon (2–6PM)']++;
    else hourBuckets['evening (6–10PM)']++;
  });
  const peakBucket = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  if (peakBucket && peakBucket[1] >= 2) {
    patterns.push({
      id: 'pat-time',
      type: 'time_of_day',
      title: `Events peak in the ${peakBucket[0]}`,
      description: `${peakBucket[1]} of ${events.length} downtime events (${Math.round(peakBucket[1] / events.length * 100)}%) occurred during ${peakBucket[0]}. This suggests a demand, schedule, or occupancy-related trigger.`,
      confidence: peakBucket[1] >= 3 ? 'High' : 'Moderate',
      affectedEquipment: events.map(e => e.equipmentName).filter((v, i, a) => a.indexOf(v) === i),
      occurrenceCount: peakBucket[1],
      recommendation: `Investigate equipment loading, setpoint schedules, and occupancy transitions during ${peakBucket[0]} to identify trigger conditions.`,
    });
  }

  // Day-of-week clustering
  const days = events.map(e => new Date(e.occurredAt).getDay());
  const dayCounts: Record<number, number> = {};
  days.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
  const peakDay = Object.entries(dayCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (peakDay && Number(peakDay[1]) >= 2) {
    patterns.push({
      id: 'pat-dow',
      type: 'day_of_week',
      title: `${dayNames[Number(peakDay[0])]} concentration`,
      description: `${peakDay[1]} events occurred on ${dayNames[Number(peakDay[0])]}s. May correlate with weekly maintenance windows, shift transitions, or production schedule changes.`,
      confidence: Number(peakDay[1]) >= 3 ? 'High' : 'Moderate',
      affectedEquipment: events.map(e => e.equipmentName).filter((v, i, a) => a.indexOf(v) === i),
      occurrenceCount: Number(peakDay[1]),
      recommendation: `Review what operational changes occur on ${dayNames[Number(peakDay[0])]}s — staffing, schedules, production loads, or maintenance activities.`,
    });
  }

  // Equipment repeat offenders
  const equipCounts: Record<string, DowntimeEvent[]> = {};
  events.forEach(e => { if (!equipCounts[e.equipmentName]) equipCounts[e.equipmentName] = []; equipCounts[e.equipmentName].push(e); });
  Object.entries(equipCounts).filter(([, evts]) => evts.length >= 3).forEach(([name, evts]) => {
    patterns.push({
      id: `pat-equip-${name.replace(/\s+/g, '-').toLowerCase()}`,
      type: 'equipment_repeat',
      title: `${name} — chronic repeat events`,
      description: `${name} has failed ${evts.length} times in the analysis window. Severity: ${evts.some(e => e.severity === 'critical') ? 'includes critical events' : 'major/minor'}. This asset is a significant operational risk.`,
      confidence: 'High',
      affectedEquipment: [name],
      occurrenceCount: evts.length,
      recommendation: `Initiate formal RCA for ${name}. Evaluate whether deferred maintenance, end-of-life degradation, or design issues are driving repeat failures.`,
    });
  });

  // Cause clustering
  const causeCounts: Record<string, number> = {};
  events.forEach(e => { if (e.causeCategory !== 'Unknown') causeCounts[e.causeCategory] = (causeCounts[e.causeCategory] || 0) + 1; });
  const topCause = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCause && topCause[1] >= 2) {
    patterns.push({
      id: 'pat-cause',
      type: 'cause_cluster',
      title: `${topCause[0]} is leading cause (${topCause[1]} events)`,
      description: `${topCause[0]} accounts for ${Math.round(topCause[1] / events.length * 100)}% of detected downtime events. This systemic pattern suggests a programmatic gap rather than isolated failures.`,
      confidence: topCause[1] >= 3 ? 'High' : 'Moderate',
      affectedEquipment: events.filter(e => e.causeCategory === topCause[0]).map(e => e.equipmentName).filter((v, i, a) => a.indexOf(v) === i),
      occurrenceCount: topCause[1],
      recommendation: `Address ${topCause[0]} at the program level — review related policies, PM schedules, and operator training across all affected assets.`,
    });
  }

  return patterns;
}

// ── Demo data fallback ────────────────────────────────────────────────────────

function buildDemoResult(facilityId: string): DowntimeAnalysisResult {
  const now = new Date('2026-06-21T12:00:00Z');
  const events: DowntimeEvent[] = [
    {
      id: 'demo-001', source: 'work_order', equipmentId: 'eq-ch1', equipmentName: 'Chiller CH-01',
      systemType: 'cooling', occurredAt: new Date(now.getTime() - 3 * 24 * 3600000).toISOString().replace('T12', 'T07:55'),
      severity: 'critical', description: 'Chiller tripped — compressor surge at 4:55 PM. Loss of cooling to spiral freezer production loop.',
      causeCategory: 'Controls / Automation', durationMin: 187,
      leadUpEvents: [
        { timestamp: new Date(now.getTime() - 3 * 24 * 3600000 - 6 * 3600000).toISOString(), type: 'log', description: 'Condenser approach temperature rising — 4°F above baseline', severity: 'High', hoursBeforeEvent: 6, source: 'Facility Log' },
        { timestamp: new Date(now.getTime() - 3 * 24 * 3600000 - 2 * 3600000).toISOString(), type: 'alarm', description: 'High refrigerant pressure alarm — auto-cleared', severity: 'Moderate', hoursBeforeEvent: 2, source: 'Facility Log' },
        { timestamp: new Date(now.getTime() - 3 * 24 * 3600000 - 0.5 * 3600000).toISOString(), type: 'violation', description: 'Chiller not at setpoint — supply temp 48°F vs 42°F target', severity: 'High', hoursBeforeEvent: 0.5, source: 'Compliance Logger' },
      ],
      relatedCompliance: [
        { type: 'Compliance Violation', description: 'Supply temp deviation recorded', timestamp: new Date(now.getTime() - 3 * 24 * 3600000 - 1800000).toISOString(), link: '/command-hub/violations' },
        { type: 'PM Record', description: 'Condenser coil cleaning — 47 days overdue', timestamp: new Date(now.getTime() - 47 * 24 * 3600000).toISOString(), link: '/compliance-logger' },
      ],
      recurrenceCount: 3, recurrenceLabel: '3rd event — recurring issue',
      suggestions: ['Surge control valve inspection needed — compressor is entering surge at peak load.', 'Condenser coil cleaning overdue by 47 days — fouling is increasing approach temperature and compressor lift.', 'Consider Prestige Probe session on CH-01 to capture 30-day operational data.'],
    },
    {
      id: 'demo-002', source: 'log', equipmentId: 'eq-boil', equipmentName: 'Boiler B-1',
      systemType: 'heating', occurredAt: new Date(now.getTime() - 8 * 24 * 3600000).toISOString().replace('T12', 'T04:10'),
      severity: 'major', description: 'Boiler lockout — low water cutoff activated at 4:10 AM. Steam loss to building.',
      causeCategory: 'Mechanical Failure', durationMin: 94,
      leadUpEvents: [
        { timestamp: new Date(now.getTime() - 8 * 24 * 3600000 - 12 * 3600000).toISOString(), type: 'log', description: 'Feedwater pump cycling more than normal', severity: 'Moderate', hoursBeforeEvent: 12, source: 'Facility Log' },
        { timestamp: new Date(now.getTime() - 8 * 24 * 3600000 - 3 * 3600000).toISOString(), type: 'log', description: 'Unusual noise from feedwater pump area', severity: 'Moderate', hoursBeforeEvent: 3, source: 'Facility Log' },
      ],
      relatedCompliance: [
        { type: 'Compliance Violation', description: 'Low water condition — safety cutoff activated', timestamp: new Date(now.getTime() - 8 * 24 * 3600000 + 600000).toISOString(), link: '/command-hub/violations' },
      ],
      recurrenceCount: 2, recurrenceLabel: '2nd occurrence — monitor closely',
      suggestions: ['Inspect feedwater pump and check valve — intermittent cycling suggests impeller wear or valve leakage.', 'Verify low water cutoff probe is calibrated and clean.'],
    },
    {
      id: 'demo-003', source: 'violation', equipmentId: 'eq-vfd3', equipmentName: 'VFD-03 Cooling Tower Fan',
      systemType: 'cooling', occurredAt: new Date(now.getTime() - 14 * 24 * 3600000).toISOString().replace('T12', 'T08:20'),
      severity: 'major', description: 'VFD fault F-005 — overcurrent. Fan offline. Cooling tower capacity reduced 40%.',
      causeCategory: 'Electrical Fault', durationMin: 65,
      leadUpEvents: [
        { timestamp: new Date(now.getTime() - 14 * 24 * 3600000 - 24 * 3600000).toISOString(), type: 'log', description: 'VFD ambient temp elevated — 104°F in cabinet', severity: 'Moderate', hoursBeforeEvent: 24, source: 'Facility Log' },
      ],
      relatedCompliance: [],
      recurrenceCount: 1, recurrenceLabel: 'First occurrence',
      suggestions: ['Check VFD cooling fan and cabinet ventilation. Overcurrent at 104°F ambient suggests thermal derating.', 'Inspect motor windings and verify motor nameplate amps against VFD parameters.'],
    },
    {
      id: 'demo-004', source: 'work_order', equipmentId: 'eq-sf1', equipmentName: 'Spiral Freezer SF-1',
      systemType: 'production', occurredAt: new Date(now.getTime() - 21 * 24 * 3600000).toISOString().replace('T12', 'T06:45'),
      severity: 'critical', description: 'Spiral freezer down — product temp not meeting spec. Production shutdown.',
      causeCategory: 'Maintenance Gap', durationMin: 312,
      leadUpEvents: [
        { timestamp: new Date(now.getTime() - 21 * 24 * 3600000 - 48 * 3600000).toISOString(), type: 'log', description: 'Evaporator coil frost buildup noted — partial defrost cycle', severity: 'Moderate', hoursBeforeEvent: 48, source: 'Facility Log' },
        { timestamp: new Date(now.getTime() - 21 * 24 * 3600000 - 24 * 3600000).toISOString(), type: 'violation', description: 'Product temperature variance recorded — 2°F off target', severity: 'High', hoursBeforeEvent: 24, source: 'Compliance Logger' },
        { timestamp: new Date(now.getTime() - 21 * 24 * 3600000 - 6 * 3600000).toISOString(), type: 'log', description: 'Defrost cycle not completing — manual override engaged', severity: 'High', hoursBeforeEvent: 6, source: 'Facility Log' },
      ],
      relatedCompliance: [
        { type: 'Compliance Violation', description: 'Product temp deviation — food safety concern', timestamp: new Date(now.getTime() - 21 * 24 * 3600000 - 86400000).toISOString(), link: '/command-hub/violations' },
        { type: 'PM Record', description: 'Coil cleaning / defrost inspection — 62 days overdue', timestamp: new Date(now.getTime() - 83 * 24 * 3600000).toISOString(), link: '/compliance-logger' },
      ],
      recurrenceCount: 2, recurrenceLabel: '2nd occurrence — monitor closely',
      suggestions: ['Evaporator coil cleaning is 62 days overdue — ice bridging is blocking airflow and reducing heat transfer.', 'Defrost timing and termination settings should be reviewed and adjusted for current production load.', 'Coordinate PM during planned downtime — a 4-hour PM prevents a 5+ hour unplanned shutdown.'],
    },
    {
      id: 'demo-005', source: 'log', equipmentId: 'eq-ch1', equipmentName: 'Chiller CH-01',
      systemType: 'cooling', occurredAt: new Date(now.getTime() - 35 * 24 * 3600000).toISOString().replace('T12', 'T16:55'),
      severity: 'critical', description: 'Second compressor surge event — chiller offline 3h 10m.',
      causeCategory: 'Controls / Automation', durationMin: 190,
      leadUpEvents: [
        { timestamp: new Date(now.getTime() - 35 * 24 * 3600000 - 4 * 3600000).toISOString(), type: 'log', description: 'Approach temperature creeping up over shift', severity: 'Moderate', hoursBeforeEvent: 4, source: 'Facility Log' },
      ],
      relatedCompliance: [],
      recurrenceCount: 2, recurrenceLabel: '2nd occurrence — monitor closely',
      suggestions: ['Surge control recalibration needed.', 'Consider Prestige Probe monitoring session.'],
    },
    {
      id: 'demo-006', source: 'violation', equipmentId: 'eq-ahu2', equipmentName: 'AHU-2 North Wing',
      systemType: 'hvac', occurredAt: new Date(now.getTime() - 42 * 24 * 3600000).toISOString().replace('T12', 'T07:15'),
      severity: 'minor', description: 'AHU supply fan belt failure — north wing comfort complaint.',
      causeCategory: 'Wear & Tear', durationMin: 45,
      leadUpEvents: [],
      relatedCompliance: [],
      recurrenceCount: 1, recurrenceLabel: 'First occurrence',
      suggestions: ['Inspect all belt-drive units on same PM cycle. Belts fail together when age is similar.', 'Consider replacing matched-set belts on AHU-1, 3, and 4 preemptively.'],
    },
  ];

  const recalcRecurrence = (evts: DowntimeEvent[]) => {
    const counts: Record<string, number> = {};
    evts.forEach(e => { counts[e.equipmentName] = (counts[e.equipmentName] || 0) + 1; });
    return evts.map(e => ({
      ...e,
      recurrenceCount: counts[e.equipmentName],
      recurrenceLabel: calcRecurrence(e.equipmentName, evts).label,
    }));
  };

  const finalEvents = recalcRecurrence(events);

  const now90 = new Date(now.getTime() - 90 * 24 * 3600000);
  const bucketMap: Record<string, TimelineBucket> = {};
  for (let d = new Date(now90); d <= now; d.setDate(d.getDate() + 7)) {
    const key = getWeekStart(d);
    bucketMap[key] = { weekOf: key, label: weekLabel(key), critical: 0, major: 0, minor: 0, total: 0, events: [] };
  }
  finalEvents.forEach(e => {
    const key = getWeekStart(new Date(e.occurredAt));
    if (!bucketMap[key]) bucketMap[key] = { weekOf: key, label: weekLabel(key), critical: 0, major: 0, minor: 0, total: 0, events: [] };
    bucketMap[key][e.severity]++;
    bucketMap[key].total++;
    bucketMap[key].events.push(e);
  });
  const timelineBuckets = Object.values(bucketMap).sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  const patterns = findPatterns(finalEvents);
  const suggestions = buildGlobalSuggestions(finalEvents, patterns);

  const equipCounts: Record<string, DowntimeEvent[]> = {};
  finalEvents.forEach(e => { if (!equipCounts[e.equipmentName]) equipCounts[e.equipmentName] = []; equipCounts[e.equipmentName].push(e); });
  const topOffenders = Object.entries(equipCounts).map(([name, evts]) => ({
    equipmentName: name,
    systemType: evts[0].systemType,
    count: evts.length,
    highestSeverity: evts.some(e => e.severity === 'critical') ? 'critical' : evts.some(e => e.severity === 'major') ? 'major' : 'minor',
  })).sort((a, b) => b.count - a.count);

  return {
    analysisTimestamp: now.toISOString(),
    facilityId,
    totalEvents: finalEvents.length,
    criticalCount: finalEvents.filter(e => e.severity === 'critical').length,
    majorCount: finalEvents.filter(e => e.severity === 'major').length,
    minorCount: finalEvents.filter(e => e.severity === 'minor').length,
    totalEquipmentAffected: Object.keys(equipCounts).length,
    avgEventsPerWeek: Math.round(finalEvents.length / 13 * 10) / 10,
    downtimeEvents: finalEvents,
    timelineBuckets,
    patterns,
    suggestions,
    topOffenders,
    executiveSummary: `Analysis of the past 90 days identified ${finalEvents.length} downtime events affecting ${Object.keys(equipCounts).length} equipment systems. Chiller CH-01 is the leading contributor with ${equipCounts['Chiller CH-01']?.length || 0} events — both attributed to compressor surge and condenser fouling. Spiral Freezer SF-1 experienced a critical 5-hour shutdown linked to a 62-day overdue PM. Controls/Automation and Maintenance Gaps are the top two cause categories, each accounting for multiple events. Immediate action items: CH-01 condenser coil cleaning, surge control recalibration, SF-1 PM scheduling.`,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function analyzeDowntime(input: DowntimeAnalysisInput): DowntimeAnalysisResult {
  const { facilityId, logs, workOrders, violations, equipment, manualEntries = [] } = input;

  const detectedEvents: DowntimeEvent[] = [];

  // From work orders
  for (const wo of workOrders) {
    const title = `${wo.title || wo.description || ''}`;
    const isDowntime = wo.priority === 'critical' || wo.type === 'emergency' || wo.category === 'emergency' || containsKeyword(title, DOWNTIME_KEYWORDS);
    if (!isDowntime) continue;
    const ts = wo.createdAt || new Date().toISOString();
    const eqName = extractEquipmentName(wo, equipment);
    const cause = classifyCause(title);
    const sysType = classifySystemType(eqName, wo.equipmentType);
    detectedEvents.push({
      id: `wo-${wo.workOrderId || wo.id || Date.now()}`,
      source: 'work_order',
      equipmentId: wo.equipmentId || '',
      equipmentName: eqName,
      systemType: sysType,
      occurredAt: ts,
      severity: wo.priority === 'critical' ? 'critical' : 'major',
      description: title || 'Emergency work order',
      causeCategory: cause,
      durationMin: wo.completedAt ? Math.round((new Date(wo.completedAt).getTime() - new Date(ts).getTime()) / 60000) : undefined,
      leadUpEvents: buildLeadUp(ts, wo.equipmentId || '', logs, violations),
      relatedCompliance: buildComplianceContext(wo.equipmentId || '', ts, violations, logs),
      recurrenceCount: 1,
      recurrenceLabel: 'First occurrence',
      suggestions: generateEventSuggestions(cause, sysType, 1),
    });
  }

  // From violations
  for (const v of violations) {
    const sev = typeof v.severity === 'number' ? v.severity : parseFloat(v.severity || '0');
    if (sev < 7) continue;
    const ts = v.createdAt || v.timestamp || new Date().toISOString();
    const text = `${v.description || v.notes || v.violationType || ''}`;
    const eqName = extractEquipmentName(v, equipment);
    const cause = classifyCause(text);
    const sysType = classifySystemType(eqName, v.equipmentType);
    if (detectedEvents.some(e => Math.abs(new Date(e.occurredAt).getTime() - new Date(ts).getTime()) < 3600000 && e.equipmentId === (v.equipmentId || ''))) continue;
    detectedEvents.push({
      id: `viol-${v.violationId || v.id || Date.now()}`,
      source: 'violation',
      equipmentId: v.equipmentId || '',
      equipmentName: eqName,
      systemType: sysType,
      occurredAt: ts,
      severity: sev >= 9 ? 'critical' : sev >= 7 ? 'major' : 'minor',
      description: text || 'High-severity violation',
      causeCategory: cause,
      leadUpEvents: buildLeadUp(ts, v.equipmentId || '', logs, violations),
      relatedCompliance: buildComplianceContext(v.equipmentId || '', ts, violations, logs),
      recurrenceCount: 1,
      recurrenceLabel: 'First occurrence',
      suggestions: generateEventSuggestions(cause, sysType, 1),
    });
  }

  // From logs with downtime keywords
  for (const log of logs) {
    const text = `${log.action || ''} ${log.notes || ''}`;
    if (!containsKeyword(text, DOWNTIME_KEYWORDS)) continue;
    const ts = log.timestamp;
    if (!ts) continue;
    if (detectedEvents.some(e => Math.abs(new Date(e.occurredAt).getTime() - new Date(ts).getTime()) < 3600000 && e.equipmentId === (log.equipmentId || ''))) continue;
    const eqName = extractEquipmentName(log, equipment);
    const cause = classifyCause(text);
    const sysType = classifySystemType(eqName, log.equipmentType);
    detectedEvents.push({
      id: `log-${log.SK || Date.now()}`,
      source: 'log',
      equipmentId: log.equipmentId || '',
      equipmentName: eqName,
      systemType: sysType,
      occurredAt: ts,
      severity: log.severity === 'critical' || log.severity === 'Critical' ? 'critical' : 'minor',
      description: text.trim() || 'Log entry — downtime signal',
      causeCategory: cause,
      leadUpEvents: buildLeadUp(ts, log.equipmentId || '', logs, violations),
      relatedCompliance: buildComplianceContext(log.equipmentId || '', ts, violations, logs),
      recurrenceCount: 1,
      recurrenceLabel: 'First occurrence',
      suggestions: generateEventSuggestions(cause, sysType, 1),
    });
  }

  // From manual entries
  for (const m of manualEntries) {
    const sysType = classifySystemType(m.equipmentName);
    detectedEvents.push({
      id: m.id,
      source: 'manual',
      equipmentId: '',
      equipmentName: m.equipmentName,
      systemType: sysType,
      occurredAt: m.startedAt,
      severity: m.severity as 'critical' | 'major' | 'minor',
      description: m.causeDetail || m.causeCategory || 'Manually logged downtime',
      causeCategory: m.causeCategory,
      durationMin: m.resolvedAt ? Math.round((new Date(m.resolvedAt).getTime() - new Date(m.startedAt).getTime()) / 60000) : undefined,
      leadUpEvents: [],
      relatedCompliance: [],
      recurrenceCount: 1,
      recurrenceLabel: 'First occurrence',
      suggestions: generateEventSuggestions(m.causeCategory, sysType, 1),
    });
  }

  // Fall back to demo if no data
  if (detectedEvents.length === 0) {
    return buildDemoResult(facilityId);
  }

  // Recalculate recurrence
  const equipCounts: Record<string, DowntimeEvent[]> = {};
  detectedEvents.forEach(e => { if (!equipCounts[e.equipmentName]) equipCounts[e.equipmentName] = []; equipCounts[e.equipmentName].push(e); });
  const finalEvents = detectedEvents.map(e => {
    const { count, label } = calcRecurrence(e.equipmentName, detectedEvents);
    return { ...e, recurrenceCount: count, recurrenceLabel: label, suggestions: generateEventSuggestions(e.causeCategory, e.systemType, count) };
  }).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // Build timeline (last 90 days, weekly buckets)
  const cutoff = new Date(Date.now() - 90 * 24 * 3600000);
  const bucketMap: Record<string, TimelineBucket> = {};
  for (let d = new Date(cutoff); d <= new Date(); d.setDate(d.getDate() + 7)) {
    const key = getWeekStart(d);
    bucketMap[key] = { weekOf: key, label: weekLabel(key), critical: 0, major: 0, minor: 0, total: 0, events: [] };
  }
  finalEvents.filter(e => new Date(e.occurredAt) >= cutoff).forEach(e => {
    const key = getWeekStart(new Date(e.occurredAt));
    if (!bucketMap[key]) bucketMap[key] = { weekOf: key, label: weekLabel(key), critical: 0, major: 0, minor: 0, total: 0, events: [] };
    bucketMap[key][e.severity]++;
    bucketMap[key].total++;
    bucketMap[key].events.push(e);
  });
  const timelineBuckets = Object.values(bucketMap).sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  const patterns = findPatterns(finalEvents);
  const suggestions = buildGlobalSuggestions(finalEvents, patterns);

  const topOffenders = Object.entries(equipCounts).map(([name, evts]) => ({
    equipmentName: name,
    systemType: evts[0].systemType,
    count: evts.length,
    highestSeverity: evts.some(e => e.severity === 'critical') ? 'critical' : evts.some(e => e.severity === 'major') ? 'major' : 'minor',
  })).sort((a, b) => b.count - a.count);

  const totalEvents = finalEvents.length;
  const criticalCount = finalEvents.filter(e => e.severity === 'critical').length;
  const topEquip = topOffenders[0];
  const summary = `${totalEvents} downtime event${totalEvents !== 1 ? 's' : ''} detected across ${Object.keys(equipCounts).length} equipment system${Object.keys(equipCounts).length !== 1 ? 's' : ''} in the past 90 days. ${criticalCount > 0 ? `${criticalCount} critical event${criticalCount > 1 ? 's' : ''} requiring immediate review. ` : ''}${topEquip ? `${topEquip.equipmentName} is the leading contributor with ${topEquip.count} event${topEquip.count > 1 ? 's' : ''}. ` : ''}${patterns.length > 0 ? `${patterns.length} operational pattern${patterns.length > 1 ? 's' : ''} identified.` : ''}`;

  return {
    analysisTimestamp: new Date().toISOString(),
    facilityId,
    totalEvents,
    criticalCount,
    majorCount: finalEvents.filter(e => e.severity === 'major').length,
    minorCount: finalEvents.filter(e => e.severity === 'minor').length,
    totalEquipmentAffected: Object.keys(equipCounts).length,
    avgEventsPerWeek: Math.round(totalEvents / 13 * 10) / 10,
    downtimeEvents: finalEvents,
    timelineBuckets,
    patterns,
    suggestions,
    topOffenders,
    executiveSummary: summary,
  };
}
