export type UserRole = 'operator' | 'supervisor' | 'manager' | 'executive' | 'admin';
export type MeasurementType = 'measured' | 'estimated';
export type Shift = 'day' | 'evening' | 'night';

// ── SystemType — add new types here ──────────────────────────────────────────
export type SystemType =
  | 'boiler'
  | 'chiller'
  | 'pump'
  | 'ahu'
  | 'tower'
  | 'energy'
  // NEW
  | 'heat_exchanger'
  | 'hot_water_heater'
  | 'turbine'
  | 'condensate_system'
  | 'generator'
  | 'ro_system'
  | 'wfi_system'
  | 'mpcc'
  | 'water_chemistry';

export interface BaseLogEntry {
  id?: string;
  facility: string;
  building: string;
  systemType: SystemType;
  systemId: string | null;
  dateTime: Date;
  enteredBy: string;
  shift: Shift;
  notes: string;
  abnormalCondition: boolean;
  measurementType: MeasurementType;
  isEstimated?: boolean;
  reviewNotes?: string;
  status: 'draft' | 'submitted' | 'flagged';
}

export interface BoilerLog extends BaseLogEntry {
  systemType: 'boiler';
  operatingMode: 'standby' | 'low-fire' | 'high-fire' | 'modulating';
  supplyTemp: number;
  returnTemp: number;
  stackTemp: number;
  o2Level?: number;
  co2Level?: number;
  fuelType: 'natural-gas' | 'fuel-oil' | 'dual-fuel' | 'electric' | 'unfired';
  firingRate: number;
  makeUpWater: boolean;
  safetyStatus: 'normal' | 'alarm' | 'lockout';
  lwcoTestResult: 'pass' | 'fail';
  blowdownPerformed: boolean;
}

export interface ChillerLog extends BaseLogEntry {
  systemType: 'chiller';
  chillerType: 'centrifugal' | 'screw' | 'scroll' | 'reciprocating' | 'absorption' | 'air-cooled';
  enteringWaterTemp: number;
  leavingWaterTemp: number;
  enteringCondenserWaterTemp?: number;
  leavingCondenserWaterTemp?: number;
  estimatedTons: number;
  runStatus: 'running' | 'stopped' | 'starting' | 'stopping';
  alarmStatus: 'none' | 'warning' | 'alarm' | 'shutdown';
}

export interface PumpLog extends BaseLogEntry {
  systemType: 'pump';
  vfdFrequency: number;
  motorSpeed: number;
  motorCurrent: number;
  motorVoltage: number;
  loadPercent: number;
  vibrationIndicator: 'normal' | 'elevated' | 'high';
  sealLeakIndicator: 'none' | 'minor' | 'significant';
}

export interface AHULog extends BaseLogEntry {
  systemType: 'ahu';
  supplyAirTemp: number;
  returnAirTemp: number;
  fanSpeed: number;
  filterStatus: 'clean' | 'dirty' | 'replace';
  damperPosition: number;
  occupancyMode: 'occupied' | 'unoccupied' | 'standby';
}

export interface TowerLog extends BaseLogEntry {
  systemType: 'tower';
  basinLevel: 'low' | 'normal' | 'high';
  approachTemp: number;
  fanStatus: 'off' | 'low' | 'high' | 'vfd';
  makeUpWaterStatus: 'active' | 'inactive';
  driftObservation: 'none' | 'minor' | 'significant';
}

export interface EnergyLog extends BaseLogEntry {
  systemType: 'energy';
  electricMeterReading: number;
  waterMeterReading: number;
  gasUsage: number;
  gasUnit: 'therms' | 'ccf';
  fuelOilUsage?: number;
}

// ── NEW LOG INTERFACES ────────────────────────────────────────────────────────

export interface HeatExchangerLog extends BaseLogEntry {
  systemType: 'heat_exchanger';
  primaryTempIn: number;
  primaryTempOut: number;
  secondaryTempIn: number;
  secondaryTempOut: number;
  primaryFlow: number;
  differentialPressure?: number;
  operationalStatus: 'normal' | 'reduced' | 'fouling' | 'offline';
  foulingNotes?: string;
  runtimeHours: number;
  primaryPumpKw?: number;
}

export interface HotWaterHeaterLog extends BaseLogEntry {
  systemType: 'hot_water_heater';
  supplyTemp: number;
  returnTemp: number;
  setpointTemp: number;
  verifiedFlow: number; // measured GPM, not rated
  currentLoad: number;
  inletPressure?: number;
  blowdownPerformed: boolean;
  runStatus: 'firing' | 'low-fire' | 'standby' | 'offline';
  safetyStatus: 'normal' | 'alarm' | 'lockout';
  runtimeHours: number;
  gasConsumptionCCF?: number;
  kwDraw?: number;
}

export interface TurbineLog extends BaseLogEntry {
  systemType: 'turbine';
  rpmReading: number;
  outputKw: number;
  inletSteamPressure: number;
  exhaustPressure: number;
  inletSteamTemp: number;
  vibrationLevel: 'normal' | 'elevated' | 'high';
  oilPressure: number;
  runStatus: 'running' | 'standby' | 'tripped' | 'offline';
  alarmStatus: 'none' | 'watch' | 'alarm' | 'trip';
  runtimeHours: number;
  steamFlowLbs?: number;
}

export interface CondensateSystemLog extends BaseLogEntry {
  systemType: 'condensate_system';
  waterLevel: 'low' | 'normal' | 'high';
  tankTemperature: number;
  conductivity?: number;
  returnFlowObservation: 'normal' | 'reduced' | 'none';
  pumpStatus: 'active' | 'inactive' | 'standby' | 'fault';
  alarmStatus: 'none' | 'warning' | 'alarm';
  runtimeHours: number;
  pumpKw?: number;
}

export interface GeneratorLog extends BaseLogEntry {
  systemType: 'generator';
  runStatus: 'standby-ready' | 'running-load' | 'running-test' | 'fault' | 'offline';
  outputKw: number;
  voltage: number;
  frequency: number;
  fuelLevel: number;
  coolantTemp: number;
  oilPressure: number;
  transferSwitchStatus: 'normal' | 'generator' | 'test';
  alarmStatus: 'none' | 'warning' | 'alarm';
  runtimeHours: number;
  fuelConsumed?: number;
}

export interface ROSystemLog extends BaseLogEntry {
  systemType: 'ro_system';
  feedPressure: number;
  productPressure: number;
  rejectPressure?: number;
  feedFlow: number;
  productFlow: number;
  rejectFlow: number;
  feedTDS: number;
  productTDS: number;
  recoveryRate?: number;
  operationalStatus: 'normal' | 'low-recovery' | 'high-tds' | 'fouling' | 'offline';
  alarmStatus: 'none' | 'warning' | 'alarm';
  runtimeHours: number;
  pumpKw?: number;
}

export interface WFISystemLog extends BaseLogEntry {
  systemType: 'wfi_system';
  distributionTemp: number;
  storageTemp: number;
  conductivity: number;
  toc: number;
  productionRate?: number;
  storageLevel: number;
  loopPressure: number;
  operationalStatus: 'normal' | 'out-of-spec' | 'sanitizing' | 'offline';
  sanitizationStatus: 'current' | 'due' | 'overdue' | 'in-progress';
  alarmStatus: 'none' | 'warning' | 'alarm';
  runtimeHours: number;
  pumpKw?: number;
  heaterKw?: number;
}

export type LogEntry =
  | BoilerLog
  | ChillerLog
  | PumpLog
  | AHULog
  | TowerLog
  | EnergyLog
  | HeatExchangerLog
  | HotWaterHeaterLog
  | TurbineLog
  | CondensateSystemLog
  | GeneratorLog
  | ROSystemLog
  | WFISystemLog;

export interface Facility {
  id: string;
  name: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  systems: SystemInfo[];
}

export interface SystemInfo {
  id: string;
  assetTag: string;
  type: SystemType;
  name: string;
  location: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  assignedSystems: string[];
  assignedFacilities: string[];
}
