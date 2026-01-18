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
      
      return response.json();
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
    
    return response.json();
  },
};

// Submit facility log entry
export const submitFacilityLog = async (logData: any) => {
  const token = localStorage.getItem('nexum_id_token');
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  // Transform data to match Lambda expectations
  const payload = {
    facility_id: logData.facilityId,
    system: logData.systemType,
    equipment_id: logData.systemId,
    timestamp: logData.timestamp,
    operator: {
      name: logData.operator,
      id: logData.operatorId,
    },
    system_asset: {
      id: logData.systemId,
      equipment_id: logData.systemId,
    },
    // Spread all the metrics from the form
    ...logData.metrics,
    // Add metadata
    measurement_type: logData.measurementType,
    abnormal_condition: logData.abnormalCondition,
    operator_notes: logData.operatorNotes,
    shift: logData.shift,
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}/logs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    
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
