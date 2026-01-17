import { apiRequest } from './api';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo: string;
  equipment: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export interface ExecutiveData {
  facilities: any[];
  metrics: {
    totalFacilities: number;
    totalEmployees: number;
    activeWorkOrders: number;
    complianceScore: number;
  };
  alerts: any[];
  performanceMetrics: {
    energyEfficiency: number;
    equipmentUptime: number;
    costSavings: number;
  };
}

export interface ManagerData {
  facilities: any[];
  metrics: any;
  alerts: any[];
  performanceMetrics: any;
}

export interface SupervisorData {
  facility: any;
  teams: any[];
  metrics: any;
  workOrders: WorkOrder[];
}

export interface EmployeePortalData {
  employee: {
    name: string;
    id: string;
    role: string;
    department: string;
    shift: string;
    certifications?: string[];
  };
  virtuousScore: number;
  metrics: any;
  workOrders: WorkOrder[];
  complianceEvents: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    resolved: boolean;
  }>;
  latestBoilerLog?: {
    equipment_id: string;
    date: string;
    time: string;
    steam_pressure: number;
    water_level: string;
    fuel_pressure: number;
    stack_temp?: number;
    feedwater_temp?: number;
    flue_gas_temp?: number;
    blowdown_performed: boolean;
    notes?: string;
  };
  latestChillerLog?: {
    equipment_id: string;
    date: string;
    time: string;
    evap_supply_temp: number;
    evap_return_temp: number;
    cond_supply_temp: number;
    cond_return_temp: number;
    efficiency: string;
    refrigerant_type: string;
  };
}

const mockExecutiveData: ExecutiveData = {
  facilities: [],
  metrics: {
    totalFacilities: 5,
    totalEmployees: 42,
    activeWorkOrders: 12,
    complianceScore: 94
  },
  alerts: [],
  performanceMetrics: {
    energyEfficiency: 87.5,
    equipmentUptime: 96.3,
    costSavings: 125000
  }
};

const mockEnergyData = {
  facility_id: 'facility-001',
  generated_at: '2026-01-17T12:00:00Z',
  period_days: 30,
  rates: {
    electric: 0.125,
    gas: 0.40,
    water: 0.0167
  },
  summary: {
    total_kwh_consumed: 75000,
    estimated_electric_cost: 9375,
    total_therms_consumed: 12500,
    total_ccf_consumed: 125000,
    total_btus_consumed: 1250000000,
    estimated_gas_cost: 5000,
    gas_equivalent_kwh: 36625,
    total_gallons_consumed: 15000,
    estimated_water_cost: 250.50,
    total_energy_equivalent_kwh: 125000,
    estimated_total_utility_cost: 14625.50,
    total_runtime_hours: 720,
    average_kwh_per_day: 2500
  },
  by_utility: {
    electric: [
      {
        system_type: 'Chillers',
        kwh: 35000,
        estimated_cost: 4375,
        runtime_hours: 350,
        percentage_of_electric: 46.7
      },
      {
        system_type: 'Air Handlers',
        kwh: 20000,
        estimated_cost: 2500,
        runtime_hours: 400,
        percentage_of_electric: 26.7
      },
      {
        system_type: 'Pumps',
        kwh: 12000,
        estimated_cost: 1500,
        runtime_hours: 500,
        percentage_of_electric: 16.0
      },
      {
        system_type: 'Lighting',
        kwh: 8000,
        estimated_cost: 1000,
        runtime_hours: 720,
        percentage_of_electric: 10.7
      }
    ],
    gas: [
      {
        system_type: 'Boilers',
        therms: 10000,
        btus: 1000000000,
        estimated_cost: 4000,
        percentage_of_gas: 80.0
      },
      {
        system_type: 'Water Heaters',
        therms: 2500,
        btus: 250000000,
        estimated_cost: 1000,
        percentage_of_gas: 20.0
      }
    ],
    water: [
      {
        system_type: 'Cooling Towers',
        gallons: 10000,
        estimated_cost: 167,
        percentage_of_water: 66.7
      },
      {
        system_type: 'Domestic',
        gallons: 5000,
        estimated_cost: 83.50,
        percentage_of_water: 33.3
      }
    ]
  },
  equipment_breakdown: [
    {
      equipment_id: 'CH-001',
      type: 'Chiller',
      name: 'Primary Chiller #1',
      total_kwh: 18000,
      estimated_cost: 2250
    },
    {
      equipment_id: 'CH-002',
      type: 'Chiller',
      name: 'Primary Chiller #2',
      total_kwh: 17000,
      estimated_cost: 2125
    },
    {
      equipment_id: 'BLR-001',
      type: 'Boiler',
      name: 'Boiler #1',
      total_kwh: 29310,
      estimated_cost: 4000
    },
    {
      equipment_id: 'AHU-001',
      type: 'Air Handler',
      name: 'AHU Floor 1',
      total_kwh: 8000,
      estimated_cost: 1000
    }
  ]
};

const mockEmployeeData: EmployeePortalData = {
  employee: {
    id: 'EMP001',
    name: 'John Operator',
    role: 'Operator',
    department: 'Operations',
    shift: 'Day',
    certifications: ['Boiler Operator', 'HVAC Technician']
  },
  virtuousScore: 92,
  metrics: {
    tasksCompleted: 45,
    workOrders: 12,
    compliance: 98,
    efficiency: 92
  },
  workOrders: [
    {
      id: 'wo-002',
      title: 'Daily Equipment Check',
      description: 'Routine inspection',
      status: 'Open',
      priority: 'Medium',
      assignedTo: 'John Operator',
      equipment: 'Various',
      dueDate: '2026-01-17',
      createdAt: '2026-01-17'
    }
  ],
  complianceEvents: [
    {
      id: 'ce-001',
      type: 'Safety Check',
      description: 'Monthly safety inspection completed',
      timestamp: '2026-01-15T10:30:00Z',
      severity: 'info',
      resolved: true
    }
  ],
  latestBoilerLog: {
    equipment_id: 'BLR-001',
    date: '2026-01-17',
    time: '08:00',
    steam_pressure: 125,
    water_level: 'Normal',
    fuel_pressure: 45,
    stack_temp: 425,
    feedwater_temp: 212,
    flue_gas_temp: 380,
    blowdown_performed: true,
    notes: 'All systems operating normally'
  },
  latestChillerLog: {
    equipment_id: 'CH-001',
    date: '2026-01-17',
    time: '08:15',
    evap_supply_temp: 42,
    evap_return_temp: 54,
    cond_supply_temp: 95,
    cond_return_temp: 85,
    efficiency: '4.8 kW/ton',
    refrigerant_type: 'R-134a'
  }
};

export async function getMasterExecutive() {
  try {
    return await apiRequest<ExecutiveData>('/dashboard/manager');
  } catch (error) {
    console.warn('📊 Using mock data for Executive Dashboard');
    return mockExecutiveData;
  }
}

export async function getMasterWorkOrders() {
  try {
    return await apiRequest<WorkOrder[]>('/work-orders/list');
  } catch (error) {
    console.warn('📊 Using mock data for Work Orders');
    return [];
  }
}

export async function getManagerDashboard() {
  try {
    return await apiRequest<ExecutiveData>('/dashboard/manager');
  } catch (error) {
    console.warn('📊 Using mock data for Manager Dashboard');
    return mockExecutiveData;
  }
}

export async function getWorkOrders() {
  try {
    return await apiRequest<WorkOrder[]>('/work-orders/list');
  } catch (error) {
    console.warn('📊 Using mock data for Work Orders');
    return [];
  }
}

export async function getSupervisorDashboard(facilityId?: string) {
  try {
    return await apiRequest<any>('/dashboard/supervisor');
  } catch (error) {
    console.warn('📊 Using mock data for Supervisor Dashboard');
    return {};
  }
}

export async function getExecutiveDashboard() {
  try {
    return await apiRequest<ExecutiveData>('/dashboard/executive');
  } catch (error) {
    console.warn('📊 Using mock data for Executive Dashboard');
    return mockExecutiveData;
  }
}

export async function getEnergyDashboard() {
  try {
    return await apiRequest<any>('/dashboard/energy');
  } catch (error) {
    console.warn('📊 Using mock data for Energy Dashboard');
    return mockEnergyData;
  }
}

export async function getEmployeeDashboard(employeeId?: string) {
  try {
    const endpoint = employeeId 
      ? `/dashboard/employee/${employeeId}`
      : '/dashboard/employee';
    return await apiRequest<EmployeePortalData>(endpoint);
  } catch (error) {
    console.warn('📊 Using mock data for Employee Dashboard');
    return mockEmployeeData;
  }
}
