export type UserRole = 'operator' | 'supervisor' | 'manager' | 'executive' | 'admin';

export type MeasurementType = 'measured' | 'estimated';

export type SystemType = 'boiler' | 'chiller' | 'pump' | 'ahu' | 'tower' | 'energy';

export type Shift = 'day' | 'evening' | 'night';

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

// ... rest of interfaces stay the same
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

export type LogEntry = BoilerLog | ChillerLog | PumpLog | AHULog | TowerLog | EnergyLog;

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
