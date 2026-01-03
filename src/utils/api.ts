import { API_CONFIG } from '@/config/api';

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiCall(
  endpoint: string, 
  options: ApiOptions = {}
) {
  const { requiresAuth = true, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (requiresAuth) {
    // TODO: Get token from Cognito auth context
    const token = localStorage.getItem('cognito_token') || 'mock-token';
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log(`API Call: ${fetchOptions.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `API Error: ${response.status}` 
    }));
    console.error('API Error:', error);
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const equipmentApi = {
  list: async (facilityId: string) => {
    return apiCall(`${API_CONFIG.ENDPOINTS.EQUIPMENT_LIST}?facilityId=${facilityId}`);
  },
  
  register: async (equipmentData: any) => {
    return apiCall(API_CONFIG.ENDPOINTS.EQUIPMENT_REGISTER, {
      method: 'POST',
      body: JSON.stringify(equipmentData),
    });
  },
};

export const logsApi = {
  submit: async (logData: any) => {
    return apiCall(API_CONFIG.ENDPOINTS.LOGS_SUBMIT, {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  },

  query: async (facilityId: string, filters?: any) => {
    const params = new URLSearchParams({ facilityId, ...filters });
    return apiCall(`${API_CONFIG.ENDPOINTS.LOGS_QUERY}?${params}`);
  },
};

export const dashboardApi = {
  manager: async (facilityId: string) => {
    return apiCall(`${API_CONFIG.ENDPOINTS.DASHBOARD_MANAGER}?facilityId=${facilityId}`);
  },

  supervisor: async (facilityId: string) => {
    return apiCall(`${API_CONFIG.ENDPOINTS.DASHBOARD_SUPERVISOR}?facilityId=${facilityId}`);
  },

  executive: async (facilityId: string) => {
    return apiCall(`${API_CONFIG.ENDPOINTS.DASHBOARD_EXECUTIVE}?facilityId=${facilityId}`);
  },

  energy: async (facilityId: string, days: number = 30) => {
    return apiCall(`${API_CONFIG.ENDPOINTS.DASHBOARD_ENERGY}?facilityId=${facilityId}&days=${days}`);
  },
};

export const metricsApi = {
  get: async (facilityId: string, options?: any) => {
    const params = new URLSearchParams({ facilityId, ...options });
    return apiCall(`${API_CONFIG.ENDPOINTS.METRICS_GET}?${params}`);
  },
};

export const analyticsApi = {
  savings: async (facilityId: string, equipmentId: string, window: string = '7d') => {
    const params = new URLSearchParams({ facilityId, equipmentId, window });
    return apiCall(`${API_CONFIG.ENDPOINTS.SAVINGS}?${params}`);
  },

  suggestedActions: async (facilityId: string, equipmentId: string, window: string = '24h') => {
    const params = new URLSearchParams({ facilityId, equipmentId, window });
    return apiCall(`${API_CONFIG.ENDPOINTS.SUGGESTED_ACTIONS}?${params}`);
  },
};

export const violationTypesApi = {
  list: async (filters?: any) => {
    const params = new URLSearchParams(filters);
    return apiCall(`${API_CONFIG.ENDPOINTS.VIOLATION_TYPES}?${params}`);
  },
};
