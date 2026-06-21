const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// Per-equipment baseline mock data — shown when API returns no data or user has no token
const MOCK_READINGS: Record<string, any[]> = {
  boiler: [
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-17T02:05:26.956Z#boiler", facilityId: "facility-001", equipmentId: "boiler", systemType: "boiler", timestamp: "2026-01-17T02:05:26.956Z", source: "manual", operator: "Razzell", shift: "A", supply_temp: 185, return_temp: 165, efficiency: 84, psi: 130, gas_psi: 3.5, delta_t: 20, oat: 28, runtime_hrs: 6.2, firing_rate: 72 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T14:30:00.000Z#boiler", facilityId: "facility-001", equipmentId: "boiler", systemType: "boiler", timestamp: "2026-01-16T14:30:00.000Z", source: "manual", operator: "Mike T", shift: "day", supply_temp: 180, return_temp: 160, efficiency: 82, psi: 125, gas_psi: 3.2, delta_t: 20, oat: 34, runtime_hrs: 5.8, firing_rate: 65 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T06:00:00.000Z#boiler", facilityId: "facility-001", equipmentId: "boiler", systemType: "boiler", timestamp: "2026-01-16T06:00:00.000Z", source: "manual", operator: "Sarah L", shift: "night", supply_temp: 175, return_temp: 158, efficiency: 80, psi: 120, gas_psi: 3.0, delta_t: 17, oat: 22, runtime_hrs: 7.1, firing_rate: 80 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T22:00:00.000Z#boiler", facilityId: "facility-001", equipmentId: "boiler", systemType: "boiler", timestamp: "2026-01-15T22:00:00.000Z", source: "manual", operator: "John D", shift: "evening", supply_temp: 182, return_temp: 162, efficiency: 83, psi: 128, gas_psi: 3.3, delta_t: 20, oat: 31, runtime_hrs: 6.5, firing_rate: 70 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T10:00:00.000Z#boiler", facilityId: "facility-001", equipmentId: "boiler", systemType: "boiler", timestamp: "2026-01-15T10:00:00.000Z", source: "automated", operator: "System", shift: "day", supply_temp: 188, return_temp: 168, efficiency: 85, psi: 132, gas_psi: 3.6, delta_t: 20, oat: 38, runtime_hrs: 5.2, firing_rate: 60 },
  ],
  chiller: [
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-17T07:00:00.000Z#chiller", facilityId: "facility-001", equipmentId: "chiller", systemType: "chiller", timestamp: "2026-01-17T07:00:00.000Z", source: "manual", operator: "Razzell", shift: "A", supply_temp: 44, return_temp: 54, efficiency: 79, psi: 185, delta_t: 10, oat: 78, runtime_hrs: 8.0, approach_temp: 6.2 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T19:00:00.000Z#chiller", facilityId: "facility-001", equipmentId: "chiller", systemType: "chiller", timestamp: "2026-01-16T19:00:00.000Z", source: "manual", operator: "Sarah L", shift: "evening", supply_temp: 45, return_temp: 55, efficiency: 77, psi: 182, delta_t: 10, oat: 82, runtime_hrs: 7.5, approach_temp: 7.0 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T07:00:00.000Z#chiller", facilityId: "facility-001", equipmentId: "chiller", systemType: "chiller", timestamp: "2026-01-16T07:00:00.000Z", source: "automated", operator: "System", shift: "day", supply_temp: 44, return_temp: 53, efficiency: 81, psi: 188, delta_t: 9, oat: 74, runtime_hrs: 8.5, approach_temp: 5.8 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T19:00:00.000Z#chiller", facilityId: "facility-001", equipmentId: "chiller", systemType: "chiller", timestamp: "2026-01-15T19:00:00.000Z", source: "manual", operator: "Mike T", shift: "evening", supply_temp: 46, return_temp: 56, efficiency: 76, psi: 179, delta_t: 10, oat: 85, runtime_hrs: 9.0, approach_temp: 8.1 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T07:00:00.000Z#chiller", facilityId: "facility-001", equipmentId: "chiller", systemType: "chiller", timestamp: "2026-01-15T07:00:00.000Z", source: "manual", operator: "John D", shift: "day", supply_temp: 43, return_temp: 53, efficiency: 82, psi: 190, delta_t: 10, oat: 71, runtime_hrs: 7.8, approach_temp: 5.5 },
  ],
  pump: [
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-17T08:00:00.000Z#pump", facilityId: "facility-001", equipmentId: "pump", systemType: "pump", timestamp: "2026-01-17T08:00:00.000Z", source: "manual", operator: "Razzell", shift: "A", supply_temp: 58, return_temp: 52, efficiency: 88, psi: 42, delta_t: 6, oat: 28, runtime_hrs: 8.0, amps: 18.4 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T20:00:00.000Z#pump", facilityId: "facility-001", equipmentId: "pump", systemType: "pump", timestamp: "2026-01-16T20:00:00.000Z", source: "automated", operator: "System", shift: "evening", supply_temp: 57, return_temp: 51, efficiency: 87, psi: 41, delta_t: 6, oat: 31, runtime_hrs: 7.8, amps: 18.1 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-16T08:00:00.000Z#pump", facilityId: "facility-001", equipmentId: "pump", systemType: "pump", timestamp: "2026-01-16T08:00:00.000Z", source: "manual", operator: "Mike T", shift: "day", supply_temp: 59, return_temp: 53, efficiency: 86, psi: 44, delta_t: 6, oat: 34, runtime_hrs: 8.2, amps: 18.7 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T20:00:00.000Z#pump", facilityId: "facility-001", equipmentId: "pump", systemType: "pump", timestamp: "2026-01-15T20:00:00.000Z", source: "manual", operator: "Sarah L", shift: "evening", supply_temp: 56, return_temp: 50, efficiency: 89, psi: 40, delta_t: 6, oat: 29, runtime_hrs: 8.4, amps: 17.9 },
    { PK: "FACILITY#facility-001", SK: "LOGS#2026-01-15T08:00:00.000Z#pump", facilityId: "facility-001", equipmentId: "pump", systemType: "pump", timestamp: "2026-01-15T08:00:00.000Z", source: "automated", operator: "System", shift: "day", supply_temp: 60, return_temp: 54, efficiency: 88, psi: 43, delta_t: 6, oat: 36, runtime_hrs: 8.1, amps: 18.3 },
  ],
};

function getMockReadings(equipmentId: string) {
  const readings = MOCK_READINGS[equipmentId] ?? MOCK_READINGS['boiler'];
  return { success: true, count: readings.length, readings };
}

// Get token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
};

// Transform log item to flatten metrics for backward compatibility
const transformLogItem = (item: any) => {
  if (!item) return item;
  
  // If data is nested, flatten it
  if (item.data) {
    const { data, ...metadata } = item;
    return {
      ...metadata,
      ...data,
      // Preserve original data object for future use
      _rawData: data
    };
  }
  
  // Already flat, return as-is
  return item;
};


export const api = {
  async getEquipmentReadings(equipmentId: string, limit: number = 50) {
    const token = getAuthToken();
    
    if (!token) {
      console.log('📊 Using mock data (no auth token)');
      return new Promise((resolve) => {
        setTimeout(() => resolve(getMockReadings(equipmentId)), 500);
      });
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/equipment/readings?equipmentId=${equipmentId}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      // Fall back to mock if API returns no data for this equipment
      if (!json.readings || json.readings.length === 0) {
        console.log('📊 API returned empty — using baseline mock data');
        return getMockReadings(equipmentId);
      }

      json.readings = json.readings.map(transformLogItem);
      return json;
    } catch (error) {
      console.error('API Error:', error);
      console.log('📊 Falling back to mock data');
      return getMockReadings(equipmentId);
    }
  },

  async createEquipmentReading(data: {
    facilityId: string;
    equipmentId: string;
    systemType: string;
    operator: string;
    shift: string;
    notes: string;
    readings: Record<string, number>;
  }) {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/equipment/readings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create equipment reading');
    }
    
    const json = await response.json();
      
      // Transform readings to flatten nested data
      if (json.readings) {
        json.readings = json.readings.map(transformLogItem);
      }
      
      return json;
  },
};

// Decode a JWT payload section without any library
function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// Submit facility log entry
// Endpoint: POST /facility-log-ingest
// Writes to DynamoDB FacilityLogs-v2 with PK "FACILITY#<id>" / SK "LOG#<ts>"
export const submitFacilityLog = async (logData: any) => {
  // Use ID token — Lambda checks custom:facilityId which only exists in the ID token,
  // not the access token. Fall back to access token if ID token is unavailable.
  const token =
    localStorage.getItem('nexum_id_token') ||
    localStorage.getItem('nexum_access_token');

  if (!token) {
    throw new Error('No authentication token available');
  }

  // Resolve facilityId: JWT claim is authoritative, then logData, then fallback
  const jwtPayload = decodeJwtPayload(token);
  const facilityId =
    jwtPayload['custom:facilityId'] ||
    logData.facilityId ||
    'facility-001';

  const timestamp = logData.timestamp || new Date().toISOString();

  // Include PK/SK explicitly so the Lambda can write the correct DynamoDB keys.
  // Dashboard Lambdas query: PK = "FACILITY#<id>" AND SK >= "LOG#<since>"
  const payload = {
    PK:  `FACILITY#${facilityId}`,
    SK:  `LOG#${timestamp}`,

    // camelCase (frontend convention)
    facilityId,
    buildingId:        logData.buildingId,
    systemType:        logData.systemType,
    systemId:          logData.systemId,
    equipmentId:       logData.systemId,
    timestamp,
    shift:             logData.shift,
    operator:          logData.operator,
    operatorId:        logData.operatorId,
    measurementType:   logData.measurementType,
    abnormalCondition: logData.abnormalCondition,
    operatorNotes:     logData.operatorNotes,
    metrics:           logData.metrics || {},
    source:            'manual',

    // snake_case aliases — Lambda validation uses these
    facility_id:       facilityId,
    building_id:       logData.buildingId,
    system:            logData.systemType,
    system_type:       logData.systemType,
    system_id:         logData.systemId,
    equipment_id:      logData.systemId,
    operator_id:       logData.operatorId,
    measurement_type:  logData.measurementType,
    abnormal_condition: logData.abnormalCondition,
    operator_notes:    logData.operatorNotes,

    // Spread metrics to top level for dashboard backward compatibility
    ...logData.metrics,
  };

  console.log('📤 submitFacilityLog → /facility-log-ingest', {
    PK: payload.PK, SK: payload.SK, systemType: payload.systemType,
  });

  try {
    // Route through Netlify proxy to avoid CORS on the API Gateway OPTIONS preflight
    const response = await fetch('/.netlify/functions/facility-log-ingest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();

    // Cache submitted log locally so dashboards can show updates before API polling refreshes
    try {
      const entry = { ...payload, systemType: logData.systemType, facilityId, timestamp, metrics: logData.metrics || {} };
      // nexum_submitted_logs — used by some dashboards
      const cache: any[] = JSON.parse(localStorage.getItem('nexum_submitted_logs') || '[]');
      cache.unshift(entry);
      localStorage.setItem('nexum_submitted_logs', JSON.stringify(cache.slice(0, 200)));
      // nexum_facility_logs — read by OperationalIntelligence engine
      const logs: any[] = JSON.parse(localStorage.getItem('nexum_facility_logs') || '[]');
      logs.unshift(entry);
      localStorage.setItem('nexum_facility_logs', JSON.stringify(logs.slice(0, 500)));
    } catch { /* silent */ }

    return result;
  } catch (error) {
    console.error('❌ Error submitting facility log:', error);
    throw error;
  }
};
