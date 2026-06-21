import { getValidAccessToken } from '@/auth/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const getAuthToken = (): string | null => {
  const idToken = localStorage.getItem('nexum_id_token');
  const accessToken = localStorage.getItem('nexum_access_token');
  const token = idToken || accessToken;
  if (token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      const expired = p.exp ? p.exp < Date.now() / 1000 : false;
      console.log(
        `🔑 Token claims — use=${p.token_use} | aud=${p.aud} | client_id=${p.client_id}` +
        ` | iss=${p.iss} | exp=${expired ? '🔴 EXPIRED' : '🟢 ok'} | email=${p.email}`
      );
    } catch (_) {}
  }
  return token;
};


/**
 * Recursively unmarshall DynamoDB objects to plain JavaScript values
 * Converts {S: "value"} to "value", {N: "123"} to 123, etc.
 */
function unmarshallDynamoDB(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => unmarshallDynamoDB(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    // Check if this is a DynamoDB typed object
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const type = keys[0];
      const value = obj[type];
      
      // DynamoDB type descriptors
      switch (type) {
        case 'S': // String
        case 'BOOL': // Boolean
          return value;
        case 'N': // Number
          return Number(value);
        case 'NULL':
          return null;
        case 'L': // List
          return Array.isArray(value) ? value.map(unmarshallDynamoDB) : value;
        case 'M': // Map
          return unmarshallDynamoDB(value);
        case 'SS': // String Set
        case 'NS': // Number Set
        case 'BS': // Binary Set
          return value;
        default:
          // Not a DynamoDB type, recurse into object
          break;
      }
    }
    
    // Regular object - recurse into all properties
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = unmarshallDynamoDB(obj[key]);
      }
    }
    return result;
  }
  
  // Primitive value
  return obj;
}


export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Prefer a valid (auto-refreshed) token; fall back to stored value for non-auth requests
  let token: string | null = null;
  try {
    token = await getValidAccessToken();
  } catch {
    token = getAuthToken();
  }
  if (!token) token = getAuthToken();

  // Use id_token for JWT authorizer (has `aud` claim); access_token as fallback
  const idToken = localStorage.getItem('nexum_id_token');
  const authHeader = idToken || token;

  console.log('🔑 Token claims —', (() => {
    try {
      const payload = JSON.parse(atob((authHeader || '').split('.')[1] || ''));
      const exp = payload.exp ? (payload.exp * 1000 > Date.now() ? '🟢 ok' : '🔴 EXPIRED') : '?';
      return `use=${idToken ? 'id' : 'access'} | aud=${payload.aud} | client_id=${payload.client_id} | iss=${payload.iss} | exp=${exp} | email=${payload.email}`;
    } catch { return 'decode error'; }
  })());

  console.log('🔍 API Request:', { endpoint, hasToken: !!authHeader, url: API_BASE_URL + endpoint });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeader ? { 'Authorization': `Bearer ${authHeader}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    console.log('📡 API Response:', { endpoint, status: response.status, ok: response.ok });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn(`🔒 Authentication required for ${endpoint}`);
      }
      let body: any = null;
      try { body = await response.json(); } catch { /* ignore */ }
      const err: any = new Error(body?.message || `API request failed: ${response.status} ${response.statusText}`);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    const rawData = await response.json();
    const data = unmarshallDynamoDB(rawData);
    console.log('✅ API Data received:', endpoint, data);
    return data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);
    throw error;
  }
}
