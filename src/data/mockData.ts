import { Facility, User } from '@/types/logging';

export const mockFacilities: Facility[] = [
  {
    id: 'fac-001',
    name: 'Main Campus',
    buildings: [
      {
        id: 'bld-001',
        name: 'Building A - Administration',
        systems: [
          { id: 'sys-001', assetTag: 'BLR-A-001', type: 'boiler', name: 'Primary Boiler #1', location: 'Mechanical Room A1' },
          { id: 'sys-002', assetTag: 'BLR-A-002', type: 'boiler', name: 'Primary Boiler #2', location: 'Mechanical Room A1' },
          { id: 'sys-003', assetTag: 'CHL-A-001', type: 'chiller', name: 'Chiller Plant #1', location: 'Chiller Room A' },
          { id: 'sys-004', assetTag: 'AHU-A-001', type: 'ahu', name: 'AHU Lobby', location: 'Rooftop' },
        ],
      },
      {
        id: 'bld-002',
        name: 'Building B - Operations',
        systems: [
          { id: 'sys-005', assetTag: 'PMP-B-001', type: 'pump', name: 'CHW Pump #1', location: 'Pump Room B1' },
          { id: 'sys-006', assetTag: 'PMP-B-002', type: 'pump', name: 'CHW Pump #2', location: 'Pump Room B1' },
          { id: 'sys-007', assetTag: 'TWR-B-001', type: 'tower', name: 'Cooling Tower Bank', location: 'Rooftop' },
        ],
      },
      {
        id: 'bld-003',
        name: 'Central Plant',
        systems: [
          { id: 'sys-008', assetTag: 'CHL-CP-001', type: 'chiller', name: 'Central Chiller #1', location: 'Central Plant' },
          { id: 'sys-009', assetTag: 'CHL-CP-002', type: 'chiller', name: 'Central Chiller #2', location: 'Central Plant' },
          { id: 'sys-010', assetTag: 'ENR-CP-001', type: 'energy', name: 'Main Energy Meters', location: 'Electrical Room' },
        ],
      },
    ],
  },
  {
    id: 'fac-002',
    name: 'West Campus',
    buildings: [
      {
        id: 'bld-004',
        name: 'Building W1',
        systems: [
          { id: 'sys-011', assetTag: 'BLR-W1-001', type: 'boiler', name: 'Boiler Unit', location: 'Basement' },
          { id: 'sys-012', assetTag: 'AHU-W1-001', type: 'ahu', name: 'Main AHU', location: 'Mechanical Room' },
        ],
      },
    ],
  },
];

export const mockUser: User = {
  id: 'user-001',
  name: 'John Operator',
  role: 'operator',
  assignedSystems: ['sys-001', 'sys-002', 'sys-003', 'sys-004', 'sys-005', 'sys-006', 'sys-007', 'sys-008', 'sys-009', 'sys-010'],
  assignedFacilities: ['fac-001', 'fac-002'],
};

export const getCurrentShift = (): 'day' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'day';
  if (hour >= 14 && hour < 22) return 'evening';
  return 'night';
};
