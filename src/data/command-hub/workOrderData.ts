import { WorkOrder, Equipment } from '@/types/workOrder';

export const mockEquipment: Equipment[] = [
  { id: 'boiler-001', name: 'Boiler #1', type: 'boiler', location: 'Mechanical Room A' },
  { id: 'boiler-002', name: 'Boiler #2', type: 'boiler', location: 'Mechanical Room A' },
  { id: 'chiller-001', name: 'Chiller #1', type: 'chiller', location: 'Mechanical Room B' },
  { id: 'chiller-002', name: 'Chiller #2', type: 'chiller', location: 'Mechanical Room B' },
  { id: 'ahu-001', name: 'AHU-1 (Main Building)', type: 'ahu', location: 'Roof Level' },
  { id: 'ahu-007', name: 'AHU-7 (Production)', type: 'ahu', location: 'Production Floor' },
  { id: 'rtu-001', name: 'RTU-1 (Office Wing)', type: 'rtu', location: 'Roof Level' },
  { id: 'pump-cw-001', name: 'CW Pump #1', type: 'pump', location: 'Mechanical Room B' },
  { id: 'pump-cw-002', name: 'CW Pump #2', type: 'pump', location: 'Mechanical Room B' },
  { id: 'pump-hw-001', name: 'HW Pump #1', type: 'pump', location: 'Mechanical Room A' },
  { id: 'compressor-001', name: 'Air Compressor #1', type: 'compressor', location: 'Production Floor' },
  { id: 'panel-e12', name: 'Electrical Panel E-12', type: 'electrical', location: 'Building C' },
  { id: 'panel-mcc1', name: 'MCC-1 Motor Control Center', type: 'electrical', location: 'Mechanical Room A' },
  { id: 'bms-001', name: 'BMS Controller #1', type: 'controls', location: 'Control Room' },
  { id: 'fire-panel-01', name: 'Fire Alarm Panel', type: 'fire_safety', location: 'Main Lobby' },
];

export const mockWorkOrders: WorkOrder[] = [
  {
    workOrderId: 'wo-2026-001',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'boiler-001',
    equipmentType: 'boiler',
    type: 'preventive',
    priority: 'urgent',
    status: 'assigned',
    title: 'Replace boiler pressure relief valve',
    description: 'Annual PRV replacement per ASME code requirements. Must be completed before inspection on 1/15.',
    assignedTo: 'emp-1',
    assignedToName: 'Mike Johnson',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2026-01-02T10:00:00Z',
    dueDate: '2026-01-10T17:00:00Z',
    scheduledDate: '2026-01-08T09:00:00Z',
    estimatedHours: 4,
    partsRequired: ['PRV-150PSI', 'Teflon tape', 'Pipe sealant'],
    estimatedCost: 850.00,
    tags: ['safety', 'compliance', 'asme'],
    attachments: [],
    notes: [
      {
        id: 'note-1',
        content: 'Parts ordered and expected to arrive 1/6',
        author: 'emp-1',
        authorName: 'Mike Johnson',
        createdAt: '2026-01-03T14:30:00Z'
      }
    ],
    safetyPrecautions: 'Lockout/tagout required. Pressure relief needed before work. Hot work permit required.',
  },
  {
    workOrderId: 'wo-2026-002',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'chiller-001',
    equipmentType: 'chiller',
    type: 'preventive',
    priority: 'normal',
    status: 'in_progress',
    title: 'Chiller tube cleaning',
    description: 'Annual condenser tube cleaning to maintain efficiency. Current approach temp is 3°F above design.',
    assignedTo: 'emp-2',
    assignedToName: 'Sarah Chen',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2026-01-03T08:00:00Z',
    dueDate: '2026-01-15T17:00:00Z',
    scheduledDate: '2026-01-12T07:00:00Z',
    estimatedHours: 12,
    actualHours: 6,
    partsRequired: ['Tube brushes', 'Cleaning solution'],
    estimatedCost: 1200.00,
    tags: ['efficiency', 'preventive'],
    attachments: [],
    notes: [],
    safetyPrecautions: 'Ensure chiller is isolated and locked out. Wear chemical resistant gloves.',
  },
  {
    workOrderId: 'wo-2026-003',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'ahu-007',
    equipmentType: 'ahu',
    type: 'corrective',
    priority: 'emergency',
    status: 'in_progress',
    title: 'AHU-7 VFD failure - production cooling affected',
    description: 'Variable frequency drive failed causing AHU to run at fixed speed. Production area temperature rising. Vendor dispatched.',
    assignedTo: 'emp-3',
    assignedToName: 'David Park',
    createdBy: 'user-456',
    createdByName: 'Tom Wilson',
    createdAt: '2026-01-03T06:45:00Z',
    dueDate: '2026-01-03T18:00:00Z',
    estimatedHours: 8,
    actualHours: 4,
    partsRequired: ['VFD-50HP', 'Control wiring'],
    estimatedCost: 4500.00,
    tags: ['production', 'critical', 'vendor'],
    attachments: [],
    notes: [
      {
        id: 'note-2',
        content: 'Vendor on-site. VFD confirmed failed. Replacement being sourced.',
        author: 'emp-3',
        authorName: 'David Park',
        createdAt: '2026-01-03T09:15:00Z'
      },
      {
        id: 'note-3',
        content: 'Temporary portable cooler deployed to production area.',
        author: 'emp-3',
        authorName: 'David Park',
        createdAt: '2026-01-03T10:00:00Z'
      }
    ],
    safetyPrecautions: 'LOTO required. Verify VFD is de-energized before work.',
  },
  {
    workOrderId: 'wo-2026-004',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'pump-cw-001',
    equipmentType: 'pump',
    type: 'predictive',
    priority: 'normal',
    status: 'open',
    title: 'CW Pump #1 bearing replacement - vibration trending up',
    description: 'Vibration analysis shows bearing wear. Schedule replacement before failure.',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2026-01-02T14:00:00Z',
    dueDate: '2026-01-20T17:00:00Z',
    estimatedHours: 6,
    partsRequired: ['Bearing kit - CW pump', 'Shaft seal'],
    estimatedCost: 650.00,
    tags: ['predictive', 'vibration'],
    attachments: [],
    notes: [],
    safetyPrecautions: 'LOTO required. Drain pump before work.',
  },
  {
    workOrderId: 'wo-2026-005',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'panel-e12',
    equipmentType: 'electrical',
    type: 'inspection',
    priority: 'routine',
    status: 'completed',
    title: 'Electrical Panel E-12 thermal scan',
    description: 'Annual thermal imaging inspection. No hot spots detected.',
    assignedTo: 'emp-2',
    assignedToName: 'Sarah Chen',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2025-12-28T09:00:00Z',
    dueDate: '2026-01-05T17:00:00Z',
    scheduledDate: '2026-01-02T10:00:00Z',
    completedAt: '2026-01-02T11:30:00Z',
    estimatedHours: 2,
    actualHours: 1.5,
    partsRequired: [],
    estimatedCost: 0,
    actualCost: 0,
    tags: ['inspection', 'electrical', 'safety'],
    attachments: [],
    notes: [
      {
        id: 'note-4',
        content: 'Inspection complete. All connections within normal temperature range. Report uploaded.',
        author: 'emp-2',
        authorName: 'Sarah Chen',
        createdAt: '2026-01-02T11:30:00Z'
      }
    ],
    safetyPrecautions: 'Arc flash PPE required. Maintain safe distance from energized equipment.',
  },
  {
    workOrderId: 'wo-2026-006',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'fire-panel-01',
    equipmentType: 'fire_safety',
    type: 'inspection',
    priority: 'urgent',
    status: 'open',
    title: 'Fire alarm panel annual inspection',
    description: 'Annual fire alarm system inspection and testing per NFPA 72.',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2026-01-02T08:00:00Z',
    dueDate: '2026-01-08T17:00:00Z',
    estimatedHours: 8,
    partsRequired: ['Smoke detector test kit', 'Battery backup test equipment'],
    estimatedCost: 350.00,
    tags: ['compliance', 'fire-safety', 'nfpa'],
    attachments: [],
    notes: [],
    safetyPrecautions: 'Notify building occupants before testing. Coordinate with fire department.',
  },
  {
    workOrderId: 'wo-2026-007',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'compressor-001',
    equipmentType: 'compressor',
    type: 'preventive',
    priority: 'normal',
    status: 'on_hold',
    title: 'Air compressor oil change and filter replacement',
    description: 'Quarterly PM service. On hold waiting for filter shipment.',
    assignedTo: 'emp-4',
    assignedToName: 'Tom Wilson',
    createdBy: 'user-123',
    createdByName: 'Jane Smith',
    createdAt: '2025-12-20T10:00:00Z',
    dueDate: '2026-01-10T17:00:00Z',
    estimatedHours: 3,
    partsRequired: ['Compressor oil 5-gal', 'Air filter', 'Oil filter'],
    estimatedCost: 275.00,
    tags: ['preventive', 'quarterly'],
    attachments: [],
    notes: [
      {
        id: 'note-5',
        content: 'Filters on backorder. Expected 1/7.',
        author: 'emp-4',
        authorName: 'Tom Wilson',
        createdAt: '2026-01-02T09:00:00Z'
      }
    ],
    safetyPrecautions: 'Ensure compressor is depressurized before service.',
  },
  {
    workOrderId: 'wo-2026-008',
    facilityId: 'facility-001',
    orgId: 'org-demo-001',
    equipmentId: 'boiler-002',
    equipmentType: 'boiler',
    type: 'corrective',
    priority: 'urgent',
    status: 'assigned',
    title: 'Boiler #2 low water cutoff replacement',
    description: 'LWCO failed during testing. Must replace before boiler can return to service.',
    assignedTo: 'emp-1',
    assignedToName: 'Mike Johnson',
    createdBy: 'user-456',
    createdByName: 'Tom Wilson',
    createdAt: '2026-01-03T07:30:00Z',
    dueDate: '2026-01-05T17:00:00Z',
    violationId: 'vio-2',
    estimatedHours: 4,
    partsRequired: ['LWCO assembly', 'Probe', 'Wiring'],
    estimatedCost: 1100.00,
    tags: ['safety', 'critical', 'boiler'],
    attachments: [],
    notes: [],
    safetyPrecautions: 'LOTO required. Boiler must be cold and drained. Hot work permit required.',
  },
];

// Helper to get stats
export function getWorkOrderStats(workOrders: WorkOrder[]) {
  const now = new Date();
  
  const openStatuses: WorkOrder['status'][] = ['open', 'assigned', 'in_progress', 'on_hold'];
  const openOrders = workOrders.filter(wo => openStatuses.includes(wo.status));
  
  const urgentEmergency = workOrders.filter(
    wo => (wo.priority === 'urgent' || wo.priority === 'emergency') && openStatuses.includes(wo.status)
  );
  
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueThisWeek = workOrders.filter(wo => {
    if (!wo.dueDate) return false;
    const dueDate = new Date(wo.dueDate);
    return dueDate <= weekFromNow && openStatuses.includes(wo.status);
  });
  
  const overdue = workOrders.filter(wo => {
    if (!wo.dueDate) return false;
    const dueDate = new Date(wo.dueDate);
    return dueDate < now && openStatuses.includes(wo.status);
  });
  
  return {
    totalOpen: openOrders.length,
    urgentEmergency: urgentEmergency.length,
    dueThisWeek: dueThisWeek.length,
    overdue: overdue.length,
  };
}
