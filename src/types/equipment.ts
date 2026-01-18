export interface EquipmentReading {
  PK: string;
  SK: string;
  facilityId: string;
  equipmentId: string;
  systemType: string;
  timestamp: string;
  created_at: string;
  source: 'manual' | 'automated';
  operator: string;
  operatorId: string;
  operatorNotes: string;
  shift: string;
  metrics: Record<string, any>;
  
  // Common readings
  supply_temp?: number;
  return_temp?: number;
  delta_t?: number;
  efficiency?: number;
  psi?: number;
  gas_psi?: number;
  
  // Additional fields
  [key: string]: any;
}

export interface EquipmentReadingsResponse {
  success: boolean;
  readings: EquipmentReading[];
  count: number;
}
