import { Task, Vendor, Emergency, Signal, WorkflowTemplate, MetricCard, Violation, EmployeeAccountability, ViolationTypeConfig, Employee } from '@/types/facility';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Boiler #3 Stack Temperature Trend Analysis',
    description: 'Stack temperature has increased 15°F over 3 days. Investigate combustion efficiency.',
    system: 'boiler',
    priority: 'high',
    riskCategory: 'energy',
    status: 'in-progress',
    assignedPersonnel: ['Razzell Taylor1', 'Razzell Taylor2'],
    assignedVendor: 'Combustion Systems Inc.',
    dueDate: new Date('2024-12-15'),
    estimatedHours: 8,
    actualHours: 4,
    attachments: [],
    comments: [
      { id: '1', content: 'Initial inspection complete. Burner adjustment needed.', author: 'Razzell Taylor1', createdAt: new Date(), mentions: [] }
    ],
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Chiller #1 High Discharge Pressure Alarm',
    description: 'Condenser approach temperature rising. Schedule condenser cleaning.',
    system: 'chiller',
    priority: 'critical',
    riskCategory: 'reliability',
    status: 'ready',
    assignedPersonnel: ['Razzell Taylor3'],
    dueDate: new Date('2024-12-10'),
    estimatedHours: 12,
    attachments: [],
    comments: [],
    createdAt: new Date('2024-12-05'),
    updatedAt: new Date()
  },
  {
    id: '3',
    title: 'AHU-7 Belt Replacement PM',
    description: 'Preventive maintenance - replace drive belts per schedule.',
    system: 'ahu',
    priority: 'medium',
    riskCategory: 'reliability',
    status: 'backlog',
    assignedPersonnel: ['Tom Wilson'],
    dueDate: new Date('2024-12-20'),
    estimatedHours: 2,
    attachments: [],
    comments: [],
    createdAt: new Date('2024-12-03'),
    updatedAt: new Date()
  },
  {
    id: '4',
    title: 'Electrical Panel E-12 Thermal Scan',
    description: 'Annual thermal imaging for electrical panel.',
    system: 'electrical',
    priority: 'medium',
    riskCategory: 'safety',
    status: 'waiting-vendor',
    assignedPersonnel: ['Razzell Taylor2'],
    assignedVendor: 'ElectroPro Services',
    dueDate: new Date('2024-12-18'),
    estimatedHours: 4,
    attachments: [],
    comments: [],
    createdAt: new Date('2024-12-02'),
    updatedAt: new Date()
  },
  {
    id: '5',
    title: 'Production Line 2 Compressor Vibration Alert',
    description: 'Vibration levels exceeding baseline. Schedule bearing inspection.',
    system: 'compressor',
    priority: 'high',
    riskCategory: 'production',
    status: 'qa',
    assignedPersonnel: ['Razzell Taylor1'],
    dueDate: new Date('2024-12-12'),
    estimatedHours: 6,
    actualHours: 5,
    attachments: [],
    comments: [],
    createdAt: new Date('2024-12-04'),
    updatedAt: new Date()
  },
  {
    id: '6',
    title: 'Water Treatment Chemical Compliance Check',
    description: 'Monthly compliance verification for cooling tower water treatment.',
    system: 'water',
    priority: 'low',
    riskCategory: 'compliance',
    status: 'completed',
    assignedPersonnel: ['Razzell Taylor3'],
    dueDate: new Date('2024-12-08'),
    estimatedHours: 2,
    actualHours: 2,
    attachments: [],
    comments: [],
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date()
  }
];

export const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'Combustion Systems Inc.',
    specialty: ['boilers'],
    contactName: 'Robert Martinez',
    email: 'rmartinez@combustionsys.com',
    phone: '(555) 123-4567',
    onCall: true,
    responseTimeRating: 4.8,
    insuranceExpiry: new Date('2025-06-15'),
    activeContracts: 2,
    totalSpend: 125000,
    notes: 'Preferred vendor for all boiler work'
  },
  {
    id: '2',
    name: 'ChillerTech Solutions',
    specialty: ['chillers', 'hvac'],
    contactName: 'Jennifer Lee',
    email: 'jlee@chillertech.com',
    phone: '(555) 234-5678',
    onCall: true,
    responseTimeRating: 4.5,
    insuranceExpiry: new Date('2025-03-20'),
    activeContracts: 3,
    totalSpend: 245000
  },
  {
    id: '3',
    name: 'ElectroPro Services',
    specialty: ['electrical', 'controls'],
    contactName: 'Marcus Thompson',
    email: 'mthompson@electropro.com',
    phone: '(555) 345-6789',
    onCall: false,
    responseTimeRating: 4.2,
    insuranceExpiry: new Date('2025-09-01'),
    activeContracts: 1,
    totalSpend: 78000
  },
  {
    id: '4',
    name: 'SafetyFirst Contractors',
    specialty: ['safety', 'general'],
    contactName: 'Amanda Clark',
    email: 'aclark@safetyfirst.com',
    phone: '(555) 456-7890',
    onCall: true,
    responseTimeRating: 4.9,
    insuranceExpiry: new Date('2025-12-31'),
    activeContracts: 4,
    totalSpend: 156000
  }
];

export const mockEmergencies: Emergency[] = [
  {
    id: '1',
    type: 'chiller-fail',
    title: 'Chiller #2 Emergency Shutdown',
    description: 'Chiller #2 experienced low refrigerant alarm and auto-shutdown. Production cooling affected.',
    status: 'contained',
    location: 'Mechanical Room B',
    startTime: new Date('2024-12-08T14:30:00'),
    personnelNotified: ['Razzell Taylor1', 'Razzell Taylor2', 'Razzell Taylor3'],
    vendorsContacted: ['ChillerTech Solutions'],
    resources: ['Portable cooling unit deployed', 'Backup chiller online'],
    timeline: [
      { id: '1', timestamp: new Date('2024-12-08T14:30:00'), action: 'Alarm received - Chiller #2 low refrigerant', author: 'System' },
      { id: '2', timestamp: new Date('2024-12-08T14:32:00'), action: 'Emergency team notified', author: 'System' },
      { id: '3', timestamp: new Date('2024-12-08T14:45:00'), action: 'Backup chiller brought online', author: 'Razzell Taylor1' },
      { id: '4', timestamp: new Date('2024-12-08T15:00:00'), action: 'Vendor contacted - ETA 2 hours', author: 'Razzell Taylor2' }
    ],
    attachments: []
  }
];

export const mockSignals: Signal[] = [
  {
    id: '1',
    type: 'efficiency_drop',
    system: 'boiler',
    severity: 'warning',
    message: 'Boiler #3 efficiency dropped 3% over past 72 hours',
    value: 82,
    threshold: 85,
    timestamp: new Date(),
    acknowledged: false
  },
  {
    id: '2',
    type: 'high_pressure',
    system: 'chiller',
    severity: 'critical',
    message: 'Chiller #1 discharge pressure at 285 PSI',
    value: 285,
    threshold: 275,
    timestamp: new Date(),
    acknowledged: false
  },
  {
    id: '3',
    type: 'vibration',
    system: 'pump',
    severity: 'warning',
    message: 'CW Pump #2 vibration 0.3 in/s above baseline',
    value: 0.8,
    threshold: 0.5,
    timestamp: new Date(),
    acknowledged: true,
    taskCreated: '5'
  },
  {
    id: '4',
    type: 'consumption',
    system: 'electrical',
    severity: 'info',
    message: 'Electrical consumption 8% above forecast',
    timestamp: new Date(),
    acknowledged: false
  }
];

export const mockWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'Boiler Emergency Response',
    description: 'Standard response workflow for boiler alarms and failures',
    system: 'boiler',
    steps: [
      { id: '1', name: 'Verify alarm and assess severity', assignTo: ['technician'], estimatedHours: 0.5, notifications: ['supervisor'] },
      { id: '2', name: 'Implement immediate safety measures', assignTo: ['technician', 'supervisor'], estimatedHours: 1, notifications: ['manager', 'executive'] },
      { id: '3', name: 'Contact vendor if required', assignTo: ['supervisor'], estimatedHours: 0.5, notifications: [] },
      { id: '4', name: 'Document and analyze root cause', assignTo: ['technician'], estimatedHours: 2, notifications: [] }
    ],
    triggers: ['High stack temperature', 'Low water cutoff', 'Flame failure']
  },
  {
    id: '2',
    name: 'Chiller Performance Issue',
    description: 'Workflow for chiller efficiency drops and performance issues',
    system: 'chiller',
    steps: [
      { id: '1', name: 'Review operating parameters', assignTo: ['technician'], estimatedHours: 1, notifications: [] },
      { id: '2', name: 'Check refrigerant levels and pressures', assignTo: ['technician'], estimatedHours: 2, notifications: [] },
      { id: '3', name: 'Inspect condenser and evaporator', assignTo: ['technician'], estimatedHours: 3, notifications: ['supervisor'] },
      { id: '4', name: 'Schedule cleaning if required', assignTo: ['supervisor'], estimatedHours: 1, notifications: ['vendor'] }
    ],
    triggers: ['High discharge pressure', 'Low suction pressure', 'Efficiency drop >5%']
  }
];

export const dashboardMetrics: MetricCard[] = [
  { label: 'Active Tasks', value: 24, change: 3, trend: 'up', status: 'warning' },
  { label: 'Critical Issues', value: 2, change: -1, trend: 'down', status: 'critical' },
  { label: 'Vendor Response', value: '4.6h', trend: 'stable', status: 'success' },
  { label: 'System Health', value: '94%', change: 2, trend: 'up', status: 'success' },
  { label: 'Open Emergencies', value: 1, trend: 'stable', status: 'warning' },
  { label: 'Compliance Score', value: '98%', change: 1, trend: 'up', status: 'success' }
];

export const workloadData = [
  { name: 'Razzell Taylor1', tasks: 8, hours: 42, capacity: 85 },
  { name: 'Razzell Taylor2', tasks: 6, hours: 38, capacity: 76 },
  { name: 'Razzell Taylor3', tasks: 5, hours: 32, capacity: 64 },
  { name: 'Tom Wilson', tasks: 4, hours: 28, capacity: 56 },
  { name: 'Lisa Brown', tasks: 3, hours: 18, capacity: 36 }
];

export const systemHealthData = [
  { system: 'Boilers', health: 88, status: 'warning' as const },
  { system: 'Chillers', health: 72, status: 'critical' as const },
  { system: 'AHUs', health: 95, status: 'success' as const },
  { system: 'Pumps', health: 91, status: 'success' as const },
  { system: 'Electrical', health: 97, status: 'success' as const },
  { system: 'Production', health: 85, status: 'warning' as const }
];

// Violation Type Configurations
export const violationTypeConfigs: ViolationTypeConfig[] = [
  // ── General (no sector) ────────────────────────────────────────────────────
  { value: 'safety-protocol',    label: 'Safety Protocol Violation',   defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0 },
  { value: 'equipment-misuse',   label: 'Equipment Misuse',            defaultSeverity: 6,  defaultCategory: 'operational',  weightFactor: 1.5 },
  { value: 'attendance',         label: 'Attendance Issue',            defaultSeverity: 3,  defaultCategory: 'operational',  weightFactor: 1.0 },
  { value: 'documentation',      label: 'Documentation Failure',       defaultSeverity: 4,  defaultCategory: 'regulatory',   weightFactor: 1.0 },
  { value: 'procedure-deviation',label: 'Procedure Deviation',         defaultSeverity: 5,  defaultCategory: 'quality',      weightFactor: 1.5 },
  { value: 'ppe-compliance',     label: 'PPE Non-Compliance',          defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0 },
  { value: 'lockout-tagout',     label: 'LOTO Violation',              defaultSeverity: 10, defaultCategory: 'safety',       weightFactor: 2.5 },
  { value: 'chemical-handling',  label: 'Chemical Handling Violation', defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 2.0 },
  { value: 'unauthorized-access',label: 'Unauthorized Access',         defaultSeverity: 6,  defaultCategory: 'safety',       weightFactor: 1.5 },
  { value: 'quality-control',    label: 'Quality Control Failure',     defaultSeverity: 5,  defaultCategory: 'quality',      weightFactor: 1.5 },
  { value: 'time-reporting',     label: 'Time Reporting Issue',        defaultSeverity: 2,  defaultCategory: 'operational',  weightFactor: 1.0 },
  { value: 'housekeeping',       label: 'Housekeeping Violation',      defaultSeverity: 3,  defaultCategory: 'operational',  weightFactor: 1.0 },

  // ── Facility › Equipment ──────────────────────────────────────────────────
  { value: 'boiler-pressure-exceeded',      label: 'Boiler Pressure Exceeded Safe Limit',    defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 2.5, sector: 'facility', subcategory: 'Equipment' },
  { value: 'chiller-cop-below-threshold',   label: 'Chiller COP Below Acceptable Threshold', defaultSeverity: 7,  defaultCategory: 'operational',  weightFactor: 2.0, sector: 'facility', subcategory: 'Equipment' },
  { value: 'pm-not-completed',              label: 'Equipment Running Without PM Completed',  defaultSeverity: 6,  defaultCategory: 'operational',  weightFactor: 1.5, sector: 'facility', subcategory: 'Equipment' },
  { value: 'filter-not-replaced',           label: 'Filter Not Replaced Per Schedule',        defaultSeverity: 5,  defaultCategory: 'operational',  weightFactor: 1.5, sector: 'facility', subcategory: 'Equipment' },
  { value: 'refrigerant-leak',              label: 'Refrigerant Leak Detected',               defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 2.5, sector: 'facility', subcategory: 'Equipment' },
  { value: 'emergency-shutoff-inaccessible',label: 'Emergency Shutoff Inaccessible',          defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 2.5, sector: 'facility', subcategory: 'Equipment' },

  // ── Facility › Custodian ──────────────────────────────────────────────────
  { value: 'spill-not-cleaned',          label: 'Spill Not Cleaned Within Required Time',  defaultSeverity: 6,  defaultCategory: 'safety',       weightFactor: 1.5, sector: 'facility', subcategory: 'Custodian' },
  { value: 'biohazard-improper-disposal',label: 'Biohazard Waste Improperly Disposed',     defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 2.5, sector: 'facility', subcategory: 'Custodian' },
  { value: 'chemical-storage-unsecured', label: 'Chemical Storage Area Not Secured',       defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'facility', subcategory: 'Custodian' },
  { value: 'floor-drain-blocked',        label: 'Floor Drain Blocked or Overflowing',      defaultSeverity: 6,  defaultCategory: 'operational',  weightFactor: 1.5, sector: 'facility', subcategory: 'Custodian' },
  { value: 'restroom-sanitation',        label: 'Restroom Sanitation Standard Not Met',    defaultSeverity: 5,  defaultCategory: 'quality',      weightFactor: 1.5, sector: 'facility', subcategory: 'Custodian' },
  { value: 'trash-removal-missed',       label: 'Trash Not Removed Per Schedule',          defaultSeverity: 3,  defaultCategory: 'operational',  weightFactor: 1.0, sector: 'facility', subcategory: 'Custodian' },
  { value: 'cleaning-chemical-dilution', label: 'Cleaning Chemical Improperly Diluted',    defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'facility', subcategory: 'Custodian' },
  { value: 'safety-signage-missing',     label: 'Safety Signage Missing or Obscured',      defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'facility', subcategory: 'Custodian' },

  // ── Facility › Compliance ─────────────────────────────────────────────────
  { value: 'operating-log-incomplete',   label: 'Operating Log Not Completed',             defaultSeverity: 4,  defaultCategory: 'regulatory',   weightFactor: 1.0, sector: 'facility', subcategory: 'Compliance' },
  { value: 'license-cert-expired',       label: 'License / Certification Expired',         defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.0, sector: 'facility', subcategory: 'Compliance' },
  { value: 'inspection-overdue',         label: 'Inspection Overdue',                      defaultSeverity: 6,  defaultCategory: 'regulatory',   weightFactor: 1.5, sector: 'facility', subcategory: 'Compliance' },
  { value: 'emergency-contact-outdated', label: 'Emergency Contact List Outdated',         defaultSeverity: 5,  defaultCategory: 'regulatory',   weightFactor: 1.0, sector: 'facility', subcategory: 'Compliance' },
  { value: 'sds-sheet-missing',          label: 'MSDS/SDS Sheet Missing for Chemical',     defaultSeverity: 7,  defaultCategory: 'regulatory',   weightFactor: 2.0, sector: 'facility', subcategory: 'Compliance' },
  { value: 'fire-extinguisher-overdue',  label: 'Fire Extinguisher Inspection Overdue',    defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'facility', subcategory: 'Compliance' },
  { value: 'emergency-lighting-failed',  label: 'Exit Sign / Emergency Lighting Failed',   defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'facility', subcategory: 'Compliance' },

  // ── Retail › Food Safety ─────────────────────────────────────────────────
  { value: 'product-temp-out-of-range',  label: 'Product Temperature Out of Safe Range',   defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 2.5, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'expired-product-on-shelf',   label: 'Expired Product Found on Shelf',          defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'fifo-not-followed',          label: 'FIFO Rotation Not Followed',              defaultSeverity: 5,  defaultCategory: 'operational',  weightFactor: 1.5, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'cross-contamination-risk',   label: 'Cross-Contamination Risk Identified',     defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 2.5, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'food-surface-not-sanitized', label: 'Food Contact Surface Not Sanitized',      defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'handwashing-not-followed',   label: 'Handwashing Protocol Not Followed',       defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'pest-activity',              label: 'Pest Activity Observed',                  defaultSeverity: 9,  defaultCategory: 'regulatory',   weightFactor: 2.5, sector: 'retail', subcategory: 'Food Safety' },
  { value: 'improper-food-storage',      label: 'Improper Food Storage (Raw Above RTE)',   defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.0, sector: 'retail', subcategory: 'Food Safety' },

  // ── Retail › Inventory & Operations ──────────────────────────────────────
  { value: 'inventory-count-discrepancy',label: 'Inventory Count Discrepancy',             defaultSeverity: 5,  defaultCategory: 'quality',      weightFactor: 1.5, sector: 'retail', subcategory: 'Inventory & Operations' },
  { value: 'supplier-delivery-rejected', label: 'Supplier Delivery Rejected (Quality)',    defaultSeverity: 6,  defaultCategory: 'quality',      weightFactor: 1.5, sector: 'retail', subcategory: 'Inventory & Operations' },
  { value: 'shrinkage-theft-incident',   label: 'Shrinkage / Theft Incident',              defaultSeverity: 7,  defaultCategory: 'operational',  weightFactor: 2.0, sector: 'retail', subcategory: 'Inventory & Operations' },
  { value: 'pos-discrepancy',            label: 'POS Discrepancy at Close',                defaultSeverity: 6,  defaultCategory: 'operational',  weightFactor: 1.5, sector: 'retail', subcategory: 'Inventory & Operations' },
  { value: 'waste-log-incomplete',       label: 'Waste Log Not Completed',                 defaultSeverity: 4,  defaultCategory: 'regulatory',   weightFactor: 1.0, sector: 'retail', subcategory: 'Inventory & Operations' },

  // ── Retail › Compliance ───────────────────────────────────────────────────
  { value: 'health-permit-not-posted',   label: 'Health Permit Not Posted',                defaultSeverity: 7,  defaultCategory: 'regulatory',   weightFactor: 2.0, sector: 'retail', subcategory: 'Compliance' },
  { value: 'food-handler-cert-expired',  label: 'Employee Food Handler Cert Expired',      defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.0, sector: 'retail', subcategory: 'Compliance' },
  { value: 'temperature-log-incomplete', label: 'Temperature Log Not Completed',           defaultSeverity: 6,  defaultCategory: 'regulatory',   weightFactor: 1.5, sector: 'retail', subcategory: 'Compliance' },
  { value: 'allergen-label-missing',     label: 'Allergen Label Missing on Product',       defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, sector: 'retail', subcategory: 'Compliance' },
  { value: 'health-inspection-violation',label: 'Health Inspection Violation',             defaultSeverity: 9,  defaultCategory: 'regulatory',   weightFactor: 2.5, sector: 'retail', subcategory: 'Compliance' },

  // ── Government › Apparatus & Fleet ───────────────────────────────────────
  { value: 'apparatus-failed-inspection',    label: 'Apparatus Failed Daily Inspection',        defaultSeverity: 8,  defaultCategory: 'safety',     weightFactor: 2.5, sector: 'government', subcategory: 'Apparatus & Fleet' },
  { value: 'vehicle-out-of-service',         label: 'Vehicle Out of Service — Unscheduled',     defaultSeverity: 7,  defaultCategory: 'operational',weightFactor: 2.0, sector: 'government', subcategory: 'Apparatus & Fleet' },
  { value: 'maintenance-overdue-apparatus',  label: 'Maintenance Overdue on Apparatus',         defaultSeverity: 7,  defaultCategory: 'operational',weightFactor: 2.0, sector: 'government', subcategory: 'Apparatus & Fleet' },
  { value: 'equipment-not-returned',         label: 'Equipment Not Returned to Proper Location', defaultSeverity: 5,  defaultCategory: 'operational',weightFactor: 1.5, sector: 'government', subcategory: 'Apparatus & Fleet' },
  { value: 'chain-of-custody-not-documented',label: 'Chain of Custody Not Documented',          defaultSeverity: 8,  defaultCategory: 'regulatory', weightFactor: 2.5, sector: 'government', subcategory: 'Apparatus & Fleet' },

  // ── Government › Personnel ────────────────────────────────────────────────
  { value: 'required-cert-expired',         label: 'Required Certification Expired',          defaultSeverity: 8,  defaultCategory: 'regulatory', weightFactor: 2.0, sector: 'government', subcategory: 'Personnel' },
  { value: 'training-hours-incomplete',     label: 'Training Hours Not Completed',            defaultSeverity: 6,  defaultCategory: 'regulatory', weightFactor: 1.5, sector: 'government', subcategory: 'Personnel' },
  { value: 'shift-briefing-not-documented', label: 'Shift Briefing Not Documented',           defaultSeverity: 5,  defaultCategory: 'regulatory', weightFactor: 1.5, sector: 'government', subcategory: 'Personnel' },
  { value: 'protective-gear-not-worn',      label: 'Protective Gear Not Worn',                defaultSeverity: 8,  defaultCategory: 'safety',     weightFactor: 2.5, sector: 'government', subcategory: 'Personnel' },
  { value: 'use-of-force-incomplete',       label: 'Use of Force Documentation Incomplete',   defaultSeverity: 9,  defaultCategory: 'regulatory', weightFactor: 2.5, sector: 'government', subcategory: 'Personnel' },

  // ── Government › Facility ─────────────────────────────────────────────────
  { value: 'evidence-storage-protocol',    label: 'Evidence Storage Protocol Not Followed',  defaultSeverity: 9,  defaultCategory: 'regulatory', weightFactor: 2.5, sector: 'government', subcategory: 'Facility' },
  { value: 'weapons-inventory-discrepancy',label: 'Weapons Inventory Discrepancy',           defaultSeverity: 9,  defaultCategory: 'regulatory', weightFactor: 2.5, sector: 'government', subcategory: 'Facility' },
  { value: 'uniform-gear-not-accounted',   label: 'Uniform / Gear Not Accounted For',        defaultSeverity: 5,  defaultCategory: 'operational',weightFactor: 1.5, sector: 'government', subcategory: 'Facility' },
  { value: 'radio-equipment-failure',      label: 'Radio / Communication Equipment Failure', defaultSeverity: 7,  defaultCategory: 'operational',weightFactor: 2.0, sector: 'government', subcategory: 'Facility' },
  { value: 'station-safety-issue',         label: 'Station Facility Safety Issue',           defaultSeverity: 7,  defaultCategory: 'safety',     weightFactor: 2.0, sector: 'government', subcategory: 'Facility' },

  // ── EH&S — Safety & Health (facility + government) ─────────────────────────
  { value: 'osha-recordable-days-away',    label: 'OSHA Recordable Injury — Days Away from Work',   defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 3.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'osha-recordable-restricted',  label: 'OSHA Recordable Injury — Restricted Duty',        defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.5, subcategory: 'EH&S — Safety & Health' },
  { value: 'near-miss-incident',          label: 'Near Miss Incident — No Injury',                  defaultSeverity: 6,  defaultCategory: 'safety',       weightFactor: 2.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'first-aid-non-recordable',    label: 'First Aid Incident — Non-Recordable',              defaultSeverity: 3,  defaultCategory: 'safety',       weightFactor: 1.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'slip-trip-fall',              label: 'Slip/Trip/Fall — Investigation Required',         defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'ergonomic-hazard',            label: 'Ergonomic Hazard Identified',                     defaultSeverity: 5,  defaultCategory: 'safety',       weightFactor: 1.5, subcategory: 'EH&S — Safety & Health' },
  { value: 'electrical-hazard',          label: 'Electrical Hazard — Unsafe Condition',            defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 2.5, subcategory: 'EH&S — Safety & Health' },
  { value: 'fall-protection-violation',   label: 'Fall Protection Violation',                       defaultSeverity: 9,  defaultCategory: 'regulatory',   weightFactor: 3.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'lockout-tagout-violation',    label: 'Lockout/Tagout Violation',                        defaultSeverity: 10, defaultCategory: 'regulatory',   weightFactor: 3.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'confined-space-no-permit',    label: 'Confined Space Entry Without Permit',             defaultSeverity: 9,  defaultCategory: 'regulatory',   weightFactor: 3.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'ppe-not-worn',                label: 'PPE Not Worn in Required Area',                   defaultSeverity: 7,  defaultCategory: 'safety',       weightFactor: 2.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'chemical-exposure-incident',  label: 'Chemical Exposure Incident',                      defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 3.0, subcategory: 'EH&S — Safety & Health' },
  { value: 'hazmat-spill-contained',      label: 'Hazmat Spill — Contained',                       defaultSeverity: 7,  defaultCategory: 'environmental',weightFactor: 2.5, subcategory: 'EH&S — Safety & Health' },
  { value: 'hazmat-spill-release',        label: 'Hazmat Spill — Environmental Release',            defaultSeverity: 10, defaultCategory: 'environmental',weightFactor: 3.5, subcategory: 'EH&S — Safety & Health' },

  // ── EH&S — Environmental (facility + government) ────────────────────────────
  { value: 'air-quality-permit-exceeded', label: 'Air Quality Reading Exceeded Permit Limit',       defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 3.0, subcategory: 'EH&S — Environmental' },
  { value: 'water-quality-violation',     label: 'Water Quality Parameter Out of Compliance',       defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 3.0, subcategory: 'EH&S — Environmental' },
  { value: 'storm-drain-discharge',       label: 'Unauthorized Discharge to Storm Drain',           defaultSeverity: 10, defaultCategory: 'environmental',weightFactor: 3.5, subcategory: 'EH&S — Environmental' },
  { value: 'hazwaste-not-labeled',        label: 'Hazardous Waste Not Properly Labeled',            defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, subcategory: 'EH&S — Environmental' },
  { value: 'hazwaste-storage-violation',  label: 'Hazardous Waste Storage Violation',               defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, subcategory: 'EH&S — Environmental' },
  { value: 'spcc-plan-deviation',         label: 'SPCC Plan Deviation',                             defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, subcategory: 'EH&S — Environmental' },
  { value: 'spill-prevention-failure',    label: 'Spill Prevention Control Failure',                defaultSeverity: 8,  defaultCategory: 'environmental',weightFactor: 2.5, subcategory: 'EH&S — Environmental' },
  { value: 'sds-unavailable',             label: 'SDS Not Available for Chemical in Use',           defaultSeverity: 7,  defaultCategory: 'regulatory',   weightFactor: 2.0, subcategory: 'EH&S — Environmental' },
  { value: 'chemical-incompatibility',    label: 'Chemical Storage Incompatibility',                defaultSeverity: 8,  defaultCategory: 'safety',       weightFactor: 2.5, subcategory: 'EH&S — Environmental' },
  { value: 'tier2-threshold-exceeded',    label: 'Tier II Reporting Threshold Exceeded',            defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, subcategory: 'EH&S — Environmental' },

  // ── EH&S — Utility-Specific (government) ───────────────────────────────────
  { value: 'drinking-water-exceedance',   label: 'Drinking Water Quality Exceedance',              defaultSeverity: 10, defaultCategory: 'regulatory',   weightFactor: 3.5, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'wastewater-limit-exceeded',   label: 'Wastewater Effluent Limit Exceeded',             defaultSeverity: 9,  defaultCategory: 'regulatory',   weightFactor: 3.0, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'stormwater-permit-violation', label: 'Stormwater Permit Violation',                    defaultSeverity: 8,  defaultCategory: 'regulatory',   weightFactor: 2.5, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'cross-connection-failure',    label: 'Cross-Connection Control Failure',               defaultSeverity: 9,  defaultCategory: 'safety',       weightFactor: 3.0, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'backflow-not-tested',         label: 'Backflow Preventer Not Tested',                  defaultSeverity: 7,  defaultCategory: 'regulatory',   weightFactor: 2.0, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'water-main-break-env',        label: 'Water Main Break — Environmental Impact',        defaultSeverity: 8,  defaultCategory: 'environmental',weightFactor: 2.5, sector: 'government', subcategory: 'EH&S — Utility' },
  { value: 'sewer-overflow-event',        label: 'Sewer Overflow Event',                           defaultSeverity: 9,  defaultCategory: 'environmental',weightFactor: 3.0, sector: 'government', subcategory: 'EH&S — Utility' },
];

// Mock Employees
export const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Razzell Taylor1', role: 'Technician', department: 'Maintenance' },
  { id: 'emp-2', name: 'Razzell Taylor2', role: 'Engineer', department: 'Engineering' },
  { id: 'emp-3', name: 'Razzell Taylor3', role: 'Technician', department: 'Maintenance' },
  { id: 'emp-4', name: 'Tom Wilson', role: 'Technician', department: 'Production' },
  { id: 'emp-5', name: 'Lisa Brown', role: 'Supervisor', department: 'Operations' },
  { id: 'emp-6', name: 'James Rodriguez', role: 'Technician', department: 'HVAC' },
];

// Mock Violations
export const mockViolations: Violation[] = [
  {
    id: 'vio-1',
    employeeId: 'emp-1',
    employeeName: 'Razzell Taylor1',
    type: 'ppe-compliance',
    complianceCategory: 'safety',
    severityScore: 7,
    weightFactor: 2.0,
    description: 'Observed working without safety glasses in designated area.',
    issuedBy: 'Lisa Brown',
    issuedByRole: 'supervisor',
    issuedAt: new Date('2024-12-10T09:30:00'),
    acknowledged: true,
    acknowledgedAt: new Date('2024-12-10T14:00:00'),
    attachments: []
  },
  {
    id: 'vio-2',
    employeeId: 'emp-3',
    employeeName: 'Razzell Taylor3',
    type: 'lockout-tagout',
    complianceCategory: 'safety',
    severityScore: 10,
    weightFactor: 2.5,
    description: 'Failed to properly lockout equipment before maintenance.',
    workOrderId: '4',
    issuedBy: 'Lisa Brown',
    issuedByRole: 'supervisor',
    issuedAt: new Date('2024-12-08T11:15:00'),
    acknowledged: false,
    attachments: []
  },
  {
    id: 'vio-3',
    employeeId: 'emp-4',
    employeeName: 'Tom Wilson',
    type: 'documentation',
    complianceCategory: 'regulatory',
    severityScore: 4,
    weightFactor: 1.0,
    description: 'Incomplete maintenance log entries for past week.',
    issuedBy: 'Lisa Brown',
    issuedByRole: 'supervisor',
    issuedAt: new Date('2024-12-05T16:00:00'),
    acknowledged: true,
    acknowledgedAt: new Date('2024-12-06T08:30:00'),
    attachments: []
  },
  {
    id: 'vio-4',
    employeeId: 'emp-1',
    employeeName: 'Razzell Taylor1',
    type: 'attendance',
    complianceCategory: 'operational',
    severityScore: 3,
    weightFactor: 1.0,
    description: 'Late arrival without prior notification.',
    issuedBy: 'Lisa Brown',
    issuedByRole: 'supervisor',
    issuedAt: new Date('2024-12-02T08:45:00'),
    acknowledged: true,
    acknowledgedAt: new Date('2024-12-02T09:00:00'),
    attachments: []
  },
  {
    id: 'vio-5',
    employeeId: 'emp-6',
    employeeName: 'James Rodriguez',
    type: 'procedure-deviation',
    complianceCategory: 'quality',
    severityScore: 5,
    weightFactor: 1.5,
    description: 'Skipped required testing step during AHU inspection.',
    workOrderId: '3',
    issuedBy: 'Lisa Brown',
    issuedByRole: 'supervisor',
    issuedAt: new Date('2024-12-09T13:20:00'),
    acknowledged: false,
    attachments: []
  }
];

// Mock Employee Accountability
export const mockEmployeeAccountability: EmployeeAccountability[] = [
  {
    employeeId: 'emp-1',
    employeeName: 'Razzell Taylor1',
    role: 'Technician',
    department: 'Maintenance',
    violations30Days: 2,
    violations60Days: 2,
    violations90Days: 3,
    weightedScore30Days: 17,
    weightedScore60Days: 17,
    weightedScore90Days: 22,
    lastViolationDate: new Date('2024-12-10'),
    performanceStatus: 'warning'
  },
  {
    employeeId: 'emp-2',
    employeeName: 'Razzell Taylor2',
    role: 'Engineer',
    department: 'Engineering',
    violations30Days: 0,
    violations60Days: 0,
    violations90Days: 0,
    weightedScore30Days: 0,
    weightedScore60Days: 0,
    weightedScore90Days: 0,
    performanceStatus: 'good'
  },
  {
    employeeId: 'emp-3',
    employeeName: 'Razzell Taylor3',
    role: 'Technician',
    department: 'Maintenance',
    violations30Days: 1,
    violations60Days: 1,
    violations90Days: 2,
    weightedScore30Days: 25,
    weightedScore60Days: 25,
    weightedScore90Days: 32,
    lastViolationDate: new Date('2024-12-08'),
    performanceStatus: 'critical'
  },
  {
    employeeId: 'emp-4',
    employeeName: 'Tom Wilson',
    role: 'Technician',
    department: 'Production',
    violations30Days: 1,
    violations60Days: 1,
    violations90Days: 1,
    weightedScore30Days: 4,
    weightedScore60Days: 4,
    weightedScore90Days: 4,
    lastViolationDate: new Date('2024-12-05'),
    performanceStatus: 'good'
  },
  {
    employeeId: 'emp-6',
    employeeName: 'James Rodriguez',
    role: 'Technician',
    department: 'HVAC',
    violations30Days: 1,
    violations60Days: 1,
    violations90Days: 1,
    weightedScore30Days: 7.5,
    weightedScore60Days: 7.5,
    weightedScore90Days: 7.5,
    lastViolationDate: new Date('2024-12-09'),
    performanceStatus: 'good'
  }
];

// Mock user for GlobalFields

export const mockUser = {

  id: 'user-001',

  name: 'Razzell Taylor',

  email: 'razzell@nexumsuum.com',

  role: 'admin',

  facilityId: 'facility-001'

};

// Get current shift helper

export const getCurrentShift = (): 'day' | 'night' | 'swing' => {

  const hour = new Date().getHours();

  if (hour >= 6 && hour < 14) return 'day';

  if (hour >= 14 && hour < 22) return 'swing';

  return 'night';

};

