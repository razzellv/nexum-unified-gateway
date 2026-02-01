/**
 * Equipment Logging Utility with Proper Cognito Auth
 * 
 * This utility ensures all equipment logs are saved with:
 * - operatorId: Cognito sub ID (for filtering/queries)
 * - operator: { id, name, email } (for display)
 * 
 * Usage in any form component:
 * 
 * import { submitEquipmentLog } from '@/lib/equipment-logger';
 * import { useAuth } from '@/contexts/AuthContext';
 * 
 * const { user } = useAuth();
 * 
 * await submitEquipmentLog({
 *   equipmentId: 'B-01',
 *   systemType: 'boiler',
 *   data: formData,
 *   user: user  // Pass the auth user
 * });
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

export interface EquipmentLogPayload {
  equipmentId: string;
  systemType: 'boiler' | 'chiller' | 'ahu' | 'pump' | 'cooling_tower';
  data: Record<string, any>;
  user: {
    sub?: string;
    username?: string;
    name?: string;
    email?: string;
    facilityId?: string;
    orgId?: string;
  };
}

export interface EquipmentLogResponse {
  success: boolean;
  logId?: string;
  timestamp?: string;
  message?: string;
}

/**
 * Submit equipment log with proper Cognito authentication
 */
export async function submitEquipmentLog(payload: EquipmentLogPayload): Promise<EquipmentLogResponse> {
  try {
    const { equipmentId, systemType, data, user } = payload;
    
    if (!user?.sub && !user?.username) {
      throw new Error('User authentication required');
    }

    // ✅ PROPER FORMAT: Use Cognito sub as operatorId
    const operatorId = user.sub || user.username || '';
    const operatorName = user.name || user.email || 'Unknown Operator';
    
    const logPayload = {
      equipmentId,
      systemType,
      data,
      timestamp: new Date().toISOString(),
      
      // ✅ CRITICAL: Store Cognito sub as operatorId (for filtering)
      operatorId: operatorId,
      
      // ✅ CRITICAL: Store full operator info (for display)
      operator: {
        id: operatorId,           // Cognito sub ID
        name: operatorName,       // Display name
        email: user.email || ''
      },
      
      // Facility context
      facilityId: user.facilityId,
      orgId: user.orgId,
    };

    console.log('📝 Submitting equipment log:', {
      equipmentId,
      systemType,
      operatorId,
      operatorName
    });

    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(logPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Log submitted successfully:', result);
    
    return {
      success: true,
      logId: result.logId,
      timestamp: result.timestamp,
      message: 'Equipment log saved successfully'
    };
    
  } catch (error) {
    console.error('❌ Error submitting equipment log:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit log'
    };
  }
}

/**
 * Helper to get current user from auth context
 * Use this if you can't access useAuth() hook
 */
export function getUserFromToken() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    
    // Decode JWT token (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload['cognito:username'],
      facilityId: payload['custom:facilityId'],
      orgId: payload['custom:orgId']
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Validate that user has required auth fields
 */
export function validateUserAuth(user: any): boolean {
  if (!user) {
    console.error('❌ No user provided');
    return false;
  }
  
  if (!user.sub && !user.username) {
    console.error('❌ User missing sub/username');
    return false;
  }
  
  if (!user.facilityId) {
    console.warn('⚠️ User missing facilityId');
  }
  
  return true;
}
