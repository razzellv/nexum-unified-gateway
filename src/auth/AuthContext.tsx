import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getAccessToken, isTokenValid, clearTokens, setTokens } from './token';

function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(jsonPayload);
  } catch { return null; }
}

interface AuthEvent { type: string; message: string; timestamp: Date; }

export interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  userRole: string | null;
  user: { sub: string; email?: string; role?: string; facilityId?: string; orgId?: string; name?: string; [key: string]: any } | null;
  login: () => void;
  logout: () => void;
  authEvents: AuthEvent[];
}

export const AuthContext = createContext<AuthContextType>({
  userRole: null, user: null, isAuthenticated: false, loading: true,
  login: () => {}, logout: () => {}, authEvents: [],
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const addAuthEvent = (type: string, message: string) => {
    setAuthEvents(prev => [{ type, message, timestamp: new Date() }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    console.log("🟢 AuthProvider: Checking auth status");
    addAuthEvent("init", "Checking authentication status");

    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      if (accessToken && idToken) {
        setTokens(accessToken, idToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const token = getAccessToken();
    console.log("🟢 Access token exists:", !!token);

    if (token) {
      const valid = isTokenValid(token);
      console.log("🟢 Token is valid:", valid);
      if (valid) {
        setIsAuthenticated(true);
        const idToken = localStorage.getItem('nexum_id_token');
        const tokenToDecode = idToken || token;
        const decoded = decodeJWT(tokenToDecode);
        console.log("🔍 Decoded JWT:", decoded);
        const role = decoded?.["custom:role"] || decoded?.role || "employee";
        const facilityId = decoded?.["custom:facilityId"] || "facility-001";
        const orgId = decoded?.["custom:orgId"] || "org-001";
        const userData = { sub: decoded?.sub, email: decoded?.email, name: decoded?.name || decoded?.email, role, ...decoded, facilityId, orgId };
        setUserRole(role);
        setUser(userData);
        console.log("✅ User data:", userData);
        addAuthEvent("success", "User authenticated");
        console.log("✅ User is authenticated");
      } else {
        setIsAuthenticated(false); setUser(null); clearTokens();
        console.log("❌ Token invalid, cleared");
      }
    } else {
      setIsAuthenticated(false); setUser(null);
      console.log("❌ No token found");
    }
    setLoading(false);
    console.log("🟢 Auth check complete");
  }, []);

  const login = () => {
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    console.log("🟡 Redirecting to:", loginUrl);
    window.location.href = loginUrl;
  };

  const logout = () => {
    clearTokens();
    setIsAuthenticated(false); setUser(null); setUserRole(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, userRole, user, login, logout, authEvents }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
