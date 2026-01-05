// Centralized placeholder data for all dashboards
// Used when APIs return empty or for visual demonstration

import { format, subDays } from 'date-fns';

// Generate dates for the last N days
const generateDates = (days: number) => 
  Array.from({ length: days }, (_, i) => 
    format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd')
  );

// ============================================
// EXECUTIVE DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockExecutiveMetrics = {
  boilerAvgEfficiency: 87,
  chillerCOP: 4.2,
  dailyCost: 13900,
  riskIndex: 23,
  mttr: 4.5,
  uptime: 97.8,
  roi: 12.5,
  openWorkOrders: 8,
};

export const mockExecutiveTrends = {
  boiler: generateDates(30).map((date, i) => ({
    date,
    value: 82 + Math.sin(i / 5) * 5 + Math.random() * 3,
  })),
  chiller: generateDates(30).map((date, i) => ({
    date,
    value: 3.8 + Math.sin(i / 7) * 0.4 + Math.random() * 0.2,
  })),
  savings: generateDates(30).map((date, i) => ({
    date,
    value: 800 + Math.sin(i / 4) * 200 + Math.random() * 100,
  })),
};

export const mockTopSites = [
  { name: 'Main Campus', boilerEfficiency: 89, cop: 4.3, dailyCost: 5200, facilityIntegrity: 92 },
  { name: 'North Building', boilerEfficiency: 85, cop: 4.0, dailyCost: 4100, facilityIntegrity: 78 },
  { name: 'South Complex', boilerEfficiency: 91, cop: 4.5, dailyCost: 4600, facilityIntegrity: 88 },
];

export const mockTopEmployees = [
  { id: '1', name: 'John Smith', riskLevel: 'Low' as const, complianceScore: 95, violations: 1 },
  { id: '2', name: 'Jane Doe', riskLevel: 'Moderate' as const, complianceScore: 78, violations: 3 },
  { id: '3', name: 'Mike Johnson', riskLevel: 'High' as const, complianceScore: 62, violations: 7 },
];

// ============================================
// BOILER DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockBoilerLogs = generateDates(10).map((date, i) => ({
  id: `boiler-${i}`,
  date,
  time: '08:00',
  equipment_id: `B-0${(i % 3) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  boiler_type: ['Hydronic', 'Steam', 'Hydronic'][i % 3],
  supply_temp: 180 + Math.random() * 10,
  return_temp: 160 + Math.random() * 8,
  steam_pressure: 12 + Math.random() * 3,
  system_pressure: 12 + Math.random() * 3,
  fuel_pressure: 5 + Math.random() * 2,
  water_level: ['Normal', 'Normal', 'High'][i % 3],
  blowdown_performed: i % 2 === 0,
  safety_valve_test: i % 3 === 0,
  run_time: 8 + Math.random() * 4,
  used_ccf: 20 + Math.random() * 10,
  flue_gas_temp: 350 + Math.random() * 50,
  o2_level: 3 + Math.random() * 2,
  co2_level: 10 + Math.random() * 2,
  feed_water_temp: 140 + Math.random() * 20,
  steam_generated: 1000 + Math.random() * 500,
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// CHILLER DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockChillerLogs = generateDates(10).map((date, i) => ({
  id: `chiller-${i}`,
  date,
  time: '08:00',
  equipment_id: `CH-0${(i % 2) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  evap_supply_temp: 42 + Math.random() * 4,
  evap_return_temp: 52 + Math.random() * 4,
  cond_supply_temp: 85 + Math.random() * 8,
  cond_return_temp: 95 + Math.random() * 8,
  evap_pressure: 38 + Math.random() * 4,
  cond_pressure: 120 + Math.random() * 10,
  flow_rate: 240 + Math.random() * 40,
  amperage: 180 + Math.random() * 30,
  voltage: 460 + Math.random() * 10,
  efficiency: 0.55 + Math.random() * 0.15,
  refrigerant_type: 'R-134a',
  leak_check: i % 2 === 0,
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// PUMP DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockPumpLogs = generateDates(10).map((date, i) => ({
  id: `pump-${i}`,
  date,
  time: '08:00',
  equipment_id: `P-0${(i % 4) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  flow_rate: 120 + Math.random() * 60,
  discharge_pressure: 40 + Math.random() * 15,
  suction_pressure: 10 + Math.random() * 5,
  amperage: 20 + Math.random() * 10,
  voltage: 460 + Math.random() * 10,
  vibration: 0.05 + Math.random() * 0.1,
  bearing_temp: 120 + Math.random() * 30,
  temperature: 140 + Math.random() * 20,
  seal_condition: ['Good', 'Good', 'Fair'][i % 3],
  cavitation: i % 5 === 0,
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// AHU/RTU DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockAhuRtuLogs = generateDates(10).map((date, i) => ({
  id: `ahu-${i}`,
  date,
  time: '08:00',
  equipment_id: `AHU-0${(i % 3) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  supply_air_temp: 52 + Math.random() * 8,
  return_air_temp: 70 + Math.random() * 5,
  mixed_air_temp: 62 + Math.random() * 6,
  static_pressure: 1.2 + Math.random() * 0.5,
  humidity: 45 + Math.random() * 15,
  co2_level: 600 + Math.random() * 300,
  supply_fan_amps: 15 + Math.random() * 5,
  return_fan_amps: 12 + Math.random() * 4,
  filter_condition: ['Good', 'Good', 'Fair'][i % 3],
  filter_pressure_drop: 0.3 + Math.random() * 0.2,
  damper_position: 40 + Math.random() * 30,
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// COMPRESSOR DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockCompressorLogs = generateDates(10).map((date, i) => ({
  id: `comp-${i}`,
  date,
  time: '08:00',
  equipment_id: `COMP-0${(i % 2) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  discharge_pressure: 120 + Math.random() * 15,
  suction_pressure: 30 + Math.random() * 10,
  discharge_temp: 180 + Math.random() * 30,
  oil_pressure: 55 + Math.random() * 10,
  oil_temp: 130 + Math.random() * 20,
  oil_level: ['Normal', 'Normal', 'Low'][i % 3],
  air_flow_rate: 400 + Math.random() * 100,
  amperage: 80 + Math.random() * 20,
  voltage: 460 + Math.random() * 10,
  vibration: 0.08 + Math.random() * 0.06,
  air_filter_condition: ['Good', 'Good', 'Fair'][i % 3],
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// COOLING TOWER DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockCoolingTowerLogs = generateDates(10).map((date, i) => ({
  id: `ct-${i}`,
  date,
  time: '08:00',
  equipment_id: `CT-0${(i % 2) + 1}`,
  operator_name: ['John S.', 'Jane D.', 'Mike J.'][i % 3],
  inlet_temp: 92 + Math.random() * 6,
  outlet_temp: 82 + Math.random() * 5,
  wet_bulb_temp: 75 + Math.random() * 5,
  water_level: ['Normal', 'Normal', 'High'][i % 3],
  tds: 800 + Math.random() * 400,
  ph: 7.2 + Math.random() * 0.6,
  blowdown_rate: 2 + Math.random() * 2,
  makeup_water: 10 + Math.random() * 5,
  fan_status: ['Running', 'Running', 'Off'][i % 3],
  biocide_treatment: i % 3 === 0,
  user_id: 'demo-user',
  created_at: new Date().toISOString(),
}));

// ============================================
// SUPERVISOR DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockSupervisorStats = {
  openWorkOrders: 3,
  highSeverityViolations: 2,
  avgComplianceScore: 85,
  unassignedWorkOrders: 1,
  activeAlerts: 4,
  waterChemistryAlerts: 1,
};

export const mockViolationsSummary = [
  { employeeId: 'E001', employeeName: 'John Smith', violationCount: 1, avgWeight: 0.3, avgSeverity: 25 },
  { employeeId: 'E002', employeeName: 'Jane Doe', violationCount: 3, avgWeight: 0.5, avgSeverity: 55 },
  { employeeId: 'E003', employeeName: 'Mike Johnson', violationCount: 7, avgWeight: 0.8, avgSeverity: 85 },
];

export const mockDepartmentMetrics = [
  { department: 'Operations', avgSeverity: 35, trend: 'down' as const, violationCount: 12, complianceRate: 88 },
  { department: 'Engineering', avgSeverity: 20, trend: 'stable' as const, violationCount: 6, complianceRate: 95 },
  { department: 'Maintenance', avgSeverity: 45, trend: 'stable' as const, violationCount: 8, complianceRate: 78 },
];

export const mockWorkOrders = [
  { id: 'WO001', title: 'Boiler Inspection', description: 'Routine check', status: 'Open' as const, priority: 'High' as const, assignedTo: 'John Smith', equipment: 'B-01', dueDate: '2025-01-30', createdAt: '2025-01-20' },
  { id: 'WO002', title: 'Pump Seal Replacement', description: 'Leaking seal', status: 'In Progress' as const, priority: 'Critical' as const, assignedTo: 'Jane Doe', equipment: 'P-03', dueDate: '2025-01-28', createdAt: '2025-01-22' },
  { id: 'WO003', title: 'Chiller Maintenance', description: 'Scheduled PM', status: 'Open' as const, priority: 'Medium' as const, assignedTo: '', equipment: 'CH-02', dueDate: '2025-02-05', createdAt: '2025-01-24' },
];

// ============================================
// MANAGER DASHBOARD PLACEHOLDER DATA
// ============================================
export const mockAssetHealthBySystem = [
  { system: 'Boilers', score: 87, status: 'healthy' as const, lastUpdated: '2 min ago' },
  { system: 'Chillers', score: 92, status: 'healthy' as const, lastUpdated: '5 min ago' },
  { system: 'Pumps', score: 78, status: 'warning' as const, lastUpdated: '3 min ago' },
  { system: 'AHU/RTU', score: 85, status: 'healthy' as const, lastUpdated: '8 min ago' },
  { system: 'Cooling Towers', score: 65, status: 'warning' as const, lastUpdated: '12 min ago' },
  { system: 'Compressors', score: 91, status: 'healthy' as const, lastUpdated: '1 min ago' },
];

export const mockEnergyTrend = [
  { day: 'Mon', usage: 2400, cost: 180 },
  { day: 'Tue', usage: 2210, cost: 165 },
  { day: 'Wed', usage: 2290, cost: 172 },
  { day: 'Thu', usage: 2000, cost: 150 },
  { day: 'Fri', usage: 2181, cost: 164 },
  { day: 'Sat', usage: 1500, cost: 112 },
  { day: 'Sun', usage: 1200, cost: 90 },
];

export const mockWorkOrderAging = [
  { range: '0-3 days', count: 12, color: '#00f2ea' },
  { range: '4-7 days', count: 8, color: '#22c55e' },
  { range: '8-14 days', count: 5, color: '#eab308' },
  { range: '15+ days', count: 2, color: '#ef4444' },
];

export const mockTeamLogging = [
  { team: 'Day Shift', consistency: 96 },
  { team: 'Night Shift', consistency: 89 },
  { team: 'Weekend', consistency: 92 },
  { team: 'Maintenance', consistency: 98 },
];
