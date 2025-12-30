import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getAccessToken, isTokenValid, clearTokens } from './token';

interface AuthEvent {
  type: string;
  message: string;
  timestamp: Date;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
  authEvents: AuthEvent[];
}

export const AuthContext = createContext<AuthContextType>({
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
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, authEvents }}>
      {children}
    </AuthContext.Provider>
  );
}
