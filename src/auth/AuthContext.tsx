import React, { createContext, useState, useEffect, ReactNode } from 'react';
// Decode JWT to get role
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

import { getAccessToken, isTokenValid, clearTokens } from './token';

interface AuthEvent {
  type: string;
  message: string;
  timestamp: Date;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  userRole: string | null;
  login: () => void;
  logout: () => void;
  authEvents: AuthEvent[];
}

export const AuthContext = createContext<AuthContextType>({
  userRole: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
  authEvents: [],
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const addAuthEvent = (type: string, message: string) => {
    setAuthEvents(prev => [{ type, message, timestamp: new Date() }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    console.log("🟢 AuthProvider: Checking auth status");
    addAuthEvent("init", "Checking authentication status");
    
    const token = getAccessToken();
    console.log("🟢 Access token exists:", !!token);
    
    if (token) {
      const valid = isTokenValid(token);
      console.log("🟢 Token is valid:", valid);
      
      if (valid) {
        setIsAuthenticated(true);
        
        // Decode JWT to get role
        const decoded = decodeJWT(token);
        console.log("🔍 Decoded JWT:", decoded);
        const role = decoded?.["custom:role"] || decoded?.role || "employee";
        setUserRole(role);
        addAuthEvent("role_detected", `User role: ${role}`);
        addAuthEvent("success", "User authenticated");
        console.log("✅ User is authenticated");
      } else {
        setIsAuthenticated(false);
        clearTokens();
        addAuthEvent("expired", "Token invalid, cleared");
        console.log("❌ Token invalid, cleared");
      }
    } else {
      setIsAuthenticated(false);
      addAuthEvent("info", "No token found");
      console.log("❌ No token found");
    }
    
    setLoading(false);
    console.log("🟢 Auth check complete");
  }, []);

  const login = () => {
    console.log("🟡 Login clicked");
    addAuthEvent("login", "Redirecting to login");
    
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;

    console.log("🟡 Cognito Domain:", cognitoDomain);
    console.log("🟡 Client ID:", clientId);
    console.log("🟡 Redirect URI:", redirectUri);

    const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid&redirect_uri=${redirectUri}`;
    
    console.log("🟡 Redirecting to:", loginUrl);
    window.location.href = loginUrl;
  };

  const logout = () => {
    console.log("🔴 Logout called");
    addAuthEvent("logout", "User logged out");
    clearTokens();
    setIsAuthenticated(false);
    
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;

    const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
    
    window.location.href = logoutUrl;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, userRole, login, logout, authEvents }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
