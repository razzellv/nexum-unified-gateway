const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// Get auth token from localStorage - FIXED to match token.ts keys
const getAuthToken = (): string | null => {
  return localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  // If no token in development, log warning but don't fail
  if (!token) {
    console.warn(`⚠️ No auth token for ${endpoint} - API call will likely fail`);
  }
  
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

    if (!response.ok) {
      // Don't throw on 401 in development - let components handle it
      if (response.status === 401) {
        console.warn(`🔒 Authentication required for ${endpoint}`);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}
