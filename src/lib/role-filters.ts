// Role-based filtering configuration for Facility Nexus Engine
// This application is READ-ONLY - no role may submit or modify data

export type ViewRole = 'operator' | 'supervisor' | 'manager' | 'executive';

export interface RoleScope {
  role: ViewRole;
  label: string;
  description: string;
  canAccessApp: boolean;
  facilityScope: 'none' | 'assigned' | 'single' | 'multi';
  buildingScope: 'none' | 'assigned' | 'all';
  systemScope: 'none' | 'assigned' | 'all';
  assignedFacilities: string[];
  assignedBuildings: string[];
  assignedSystems: string[];
}

export const ROLE_DEFINITIONS: Record<ViewRole, Omit<RoleScope, 'assignedFacilities' | 'assignedBuildings' | 'assignedSystems'>> = {
  operator: {
    role: 'operator',
    label: 'Operator',
    description: 'No access to analytics platform',
    canAccessApp: false,
    facilityScope: 'none',
    buildingScope: 'none',
    systemScope: 'none',
  },
  supervisor: {
    role: 'supervisor',
    label: 'Supervisor',
    description: 'View assigned buildings and systems only',
    canAccessApp: true,
    facilityScope: 'assigned',
    buildingScope: 'assigned',
    systemScope: 'assigned',
  },
  manager: {
    role: 'manager',
    label: 'Manager',
    description: 'View full facility data',
    canAccessApp: true,
    facilityScope: 'single',
    buildingScope: 'all',
    systemScope: 'all',
  },
  executive: {
    role: 'executive',
    label: 'Executive',
    description: 'View multi-facility comparisons',
    canAccessApp: true,
    facilityScope: 'multi',
    buildingScope: 'all',
    systemScope: 'all',
  },
};

// Demo data for assigned resources (in production, this would come from the backend)
export const DEMO_ASSIGNMENTS = {
  supervisor: {
    facilities: ['Main Campus'],
    buildings: ['Building A', 'Building B'],
    systems: ['boiler', 'chiller', 'pump'],
  },
  manager: {
    facilities: ['Main Campus'],
    buildings: [], // All buildings in facility
    systems: [], // All systems
  },
  executive: {
    facilities: ['Main Campus', 'North Campus', 'South Campus', 'West Campus'],
    buildings: [], // All buildings
    systems: [], // All systems
  },
};

// Available facilities, buildings, and systems for filtering
export const AVAILABLE_FACILITIES = ['Main Campus', 'North Campus', 'South Campus', 'West Campus'];
export const AVAILABLE_BUILDINGS = ['Building A', 'Building B', 'Building C', 'Building D', 'Mechanical Plant', 'Central Utility'];
export const AVAILABLE_SYSTEMS = ['boiler', 'chiller', 'pump', 'cooling_tower', 'ahu_rtu', 'compressor'];

export const SYSTEM_LABELS: Record<string, string> = {
  boiler: 'Boiler',
  chiller: 'Chiller',
  pump: 'Pump',
  cooling_tower: 'Cooling Tower',
  ahu_rtu: 'AHU/RTU',
  compressor: 'Compressor',
};

export function getRoleScope(role: ViewRole): RoleScope {
  const definition = ROLE_DEFINITIONS[role];
  const assignments = DEMO_ASSIGNMENTS[role as keyof typeof DEMO_ASSIGNMENTS] || { facilities: [], buildings: [], systems: [] };
  
  return {
    ...definition,
    assignedFacilities: assignments.facilities,
    assignedBuildings: assignments.buildings,
    assignedSystems: assignments.systems,
  };
}

export function getAvailableFacilities(role: ViewRole): string[] {
  const scope = getRoleScope(role);
  if (scope.facilityScope === 'none') return [];
  if (scope.facilityScope === 'assigned') return scope.assignedFacilities;
  return AVAILABLE_FACILITIES;
}

export function getAvailableBuildings(role: ViewRole, selectedFacility?: string): string[] {
  const scope = getRoleScope(role);
  if (scope.buildingScope === 'none') return [];
  if (scope.buildingScope === 'assigned') return scope.assignedBuildings;
  return AVAILABLE_BUILDINGS;
}

export function getAvailableSystems(role: ViewRole): string[] {
  const scope = getRoleScope(role);
  if (scope.systemScope === 'none') return [];
  if (scope.systemScope === 'assigned') return scope.assignedSystems;
  return AVAILABLE_SYSTEMS;
}

export function canViewFacility(role: ViewRole, facility: string): boolean {
  const available = getAvailableFacilities(role);
  return available.includes(facility);
}

export function canViewBuilding(role: ViewRole, building: string): boolean {
  const available = getAvailableBuildings(role);
  return available.length === 0 || available.includes(building); // Empty means all
}

export function canViewSystem(role: ViewRole, system: string): boolean {
  const available = getAvailableSystems(role);
  return available.length === 0 || available.includes(system); // Empty means all
}
