const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const getAuthToken = (): string | null => {
  return localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  console.log('🔍 API Request:', {
    endpoint,
    hasToken: !!token,
    url: API_BASE_URL + endpoint
  });
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('📡 API Response:', {
      endpoint,
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn(`🔒 Authentication required for ${endpoint}`);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Data received:', endpoint, data);
    return data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);
    throw error;
  }
}
