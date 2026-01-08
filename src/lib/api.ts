import { getAccessToken } from '../auth/token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (requireAuth) {
    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please log in.');
    }
    headers['Authorization'] = `Bearer ${token}`;
    console.log("🔑 Sending Authorization header with token:", token.substring(0, 50) + "...");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🔵 API Request: ${fetchOptions.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  console.log(`🔵 API Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', errorText);
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ API Data received:', data);
  
  return data;
}

export async function apiGet<T>(endpoint: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  options?: ApiOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  options?: ApiOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}
