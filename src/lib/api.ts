const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const getAuthToken = (): string | null => {
  // API Gateway JWT authorizer validates the `aud` claim.
  // Cognito ID tokens carry `aud = client_id`; access tokens do not.
  // So we prefer the ID token here.
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
      let body: any = null;
      try { body = await response.json(); } catch { /* ignore parse failure */ }
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
