const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// Mock data for development
const mockReadings = {
  success: true,
  count: 5,
  readings: [
    {
      PK: "FACILITY#facility-001",
      SK: "LOGS#2026-01-17T02:05:26.956Z#boiler",
      facilityId: "facility-001",
      equipmentId: "boiler",
      systemType: "boiler",
      timestamp: "2026-01-17T02:05:26.956Z",
      created_at: "2026-01-17T02:05:26.956Z",
      source: "manual",
      operator: "Razzell",
      operatorId: "",
      operatorNotes: "Morning rounds - normal operation",
      shift: "A",
      metrics: {},
      supply_temp: 185,
      return_temp: 165,
      efficiency: 84,
      psi: 130,
      gas_psi: 3.5,
      delta_t: 20
    },
    {
      PK: "FACILITY#facility-001",
      SK: "LOGS#2026-01-16T14:30:00.000Z#boiler",
      facilityId: "facility-001",
      equipmentId: "boiler",
      systemType: "boiler",
      timestamp: "2026-01-16T14:30:00.000Z",
      created_at: "2026-01-16T14:30:00.000Z",
      source: "manual",
      operator: "Mike T",
      operatorId: "",
      operatorNotes: "Afternoon check",
      shift: "day",
      metrics: {},
      supply_temp: 180,
      return_temp: 160,
      efficiency: 82,
      psi: 125,
      gas_psi: 3.2,
      delta_t: 20
    },
    {
      PK: "FACILITY#facility-001",
      SK: "LOGS#2026-01-16T06:00:00.000Z#boiler",
      facilityId: "facility-001",
      equipmentId: "boiler",
      systemType: "boiler",
      timestamp: "2026-01-16T06:00:00.000Z",
      created_at: "2026-01-16T06:00:00.000Z",
      source: "manual",
      operator: "Sarah L",
      operatorId: "",
      operatorNotes: "Early morning startup",
      shift: "night",
      metrics: {},
      supply_temp: 175,
      return_temp: 158,
      efficiency: 80,
      psi: 120,
      gas_psi: 3.0,
      delta_t: 17
    },
    {
      PK: "FACILITY#facility-001",
      SK: "LOGS#2026-01-15T22:00:00.000Z#boiler",
      facilityId: "facility-001",
      equipmentId: "boiler",
      systemType: "boiler",
      timestamp: "2026-01-15T22:00:00.000Z",
      created_at: "2026-01-15T22:00:00.000Z",
      source: "manual",
      operator: "John D",
      operatorId: "",
      operatorNotes: "Evening rounds - all normal",
      shift: "evening",
      metrics: {},
      supply_temp: 182,
      return_temp: 162,
      efficiency: 83,
      psi: 128,
      gas_psi: 3.3,
      delta_t: 20
    },
    {
      PK: "FACILITY#facility-001",
      SK: "LOGS#2026-01-15T10:00:00.000Z#boiler",
      facilityId: "facility-001",
      equipmentId: "boiler",
      systemType: "boiler",
      timestamp: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
      source: "automated",
      operator: "System",
      operatorId: "",
      operatorNotes: "",
      shift: "day",
      metrics: {},
      supply_temp: 188,
      return_temp: 168,
      efficiency: 85,
      psi: 132,
      gas_psi: 3.6,
      delta_t: 20
    }
  ]
};

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
    
    // If no token, return mock data for development
    if (!token) {
      console.log('📊 Using mock data (no auth token)');
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockReadings), 500);
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
      
      // Transform readings to flatten nested data
      if (json.readings) {
        json.readings = json.readings.map(transformLogItem);
      }
      
      return json;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
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
  // Prefer access token; fall back to id token
  const token =
    localStorage.getItem('nexum_access_token') ||
    localStorage.getItem('nexum_id_token');

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

    // Canonical camelCase fields
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

    // Spread metrics to top level for dashboard backward compatibility
    ...logData.metrics,
  };

  console.log('📤 submitFacilityLog → /facility-log-ingest', {
    PK: payload.PK, SK: payload.SK, systemType: payload.systemType,
  });

  try {
    const response = await fetch(`${API_BASE_URL}/facility-log-ingest`, {
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

    return await response.json();
  } catch (error) {
    console.error('❌ Error submitting facility log:', error);
    throw error;
  }
};
