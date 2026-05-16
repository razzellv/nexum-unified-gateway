import { useState, useEffect, useCallback } from "react";
import {
  getStoredTokens,
  storeTokens,
  isTokenExpired,
  handleAuthCallback,
  redirectToLogin,
  logout as authLogout,
  addAuthEventListener,
  type AuthState,
} from "@/auth";

export interface AuthEvent {
  type: string;
  message: string;
  timestamp: Date;
}

const ADMIN_DOMAINS = ['nexumsuum.com', 'nexumsuum-facilityintelligence.com'];

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
  });
  const [authError, setAuthError] = useState<string | null>(
    sessionStorage.getItem('nexum_auth_error') || null
  );

  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);

  const addAuthEvent = useCallback((type: string, message: string) => {
    setAuthEvents(prev => [
      { type, message, timestamp: new Date() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        addAuthEvent("info", "Processing OAuth callback...");
        const success = await handleAuthCallback(code);
        if (success) {
          addAuthEvent("login", "Successfully authenticated via OAuth");
          const tokens = getStoredTokens();
          // Admin domain restriction — block non-Nexum emails claiming admin role
          const idToken = localStorage.getItem('nexum_id_token');
          if (idToken) {
            const decoded = decodeJwtPayload(idToken);
            const claimedRole = decoded?.['custom:role'] || decoded?.role || '';
            const email = decoded?.email || '';
            const domain = email.split('@')[1]?.toLowerCase() || '';
            if (claimedRole === 'admin' && !ADMIN_DOMAINS.includes(domain)) {
              authLogout();
              const msg = 'Admin access requires a Nexum Suum company email address.';
              sessionStorage.setItem('nexum_auth_error', msg);
              setAuthError(msg);
              setAuthState({ isAuthenticated: false, isLoading: false, tokens: null });
              return;
            }
          }
          sessionStorage.removeItem('nexum_auth_error');
          setAuthError(null);
          setAuthState({ isAuthenticated: true, isLoading: false, tokens });
          return;
        } else {
          addAuthEvent("auth_failed", "OAuth callback failed");
        }
      }

      const legacyAccess = localStorage.getItem('nexum_access_token');
      const legacyRefresh = localStorage.getItem('nexum_refresh_token') || '';
      if (legacyAccess && !getStoredTokens()) {
        storeTokens({
          access_token: legacyAccess,
          refresh_token: legacyRefresh,
          expires_at: Date.now() + (3600 * 1000),
        });
        addAuthEvent("session_renewed", "Legacy tokens migrated to session storage");
      }

      const tokens = getStoredTokens();

      if (tokens && !isTokenExpired(tokens)) {
        addAuthEvent("session_renewed", "Session restored from storage");
        setAuthState({ isAuthenticated: true, isLoading: false, tokens });
      } else if (tokens) {
        addAuthEvent("info", "Token expired, will refresh on next request");
        setAuthState({ isAuthenticated: true, isLoading: false, tokens });
      } else {
        addAuthEvent("info", "No active session found");
        setAuthState({ isAuthenticated: false, isLoading: false, tokens: null });
      }
    };

    initAuth();

    const unsubscribe = addAuthEventListener((event, message) => {
      addAuthEvent(event, message);
      if (event === "token_refreshed" || event === "session_renewed") {
        const tokens = getStoredTokens();
        setAuthState(prev => ({ ...prev, tokens, isAuthenticated: true }));
      } else if (event === "auth_failed" || event === "logout") {
        setAuthState(prev => ({ ...prev, isAuthenticated: false, tokens: null }));
      }
    });

    return unsubscribe;
  }, [addAuthEvent]);

  const login = useCallback(() => { redirectToLogin(); }, []);
  const logout = useCallback(() => { authLogout(); }, []);

  const user = authState.tokens ? (() => {
    try {
      const idToken = localStorage.getItem('nexum_id_token');
      const tokenToDecode = idToken || authState.tokens.access_token;
      const payload = decodeJwtPayload(tokenToDecode);
      if (!payload) return null;

      const emailDomain = (payload.email || '').split('@')[1]?.toLowerCase() || '';
      const isAdminDomain = ADMIN_DOMAINS.includes(emailDomain);
      const claimedRole = payload["custom:role"] || payload.role || 'employee';

      // If token claims admin but email domain is wrong → treat as no role (force re-login)
      const effectiveRole = isAdminDomain
        ? 'admin'
        : (claimedRole === 'admin' ? 'employee' : claimedRole);

      const orgType =
        payload["custom:orgType"] ||
        localStorage.getItem('nexum_org_type') ||
        sessionStorage.getItem('nexum_org_type') ||
        'facility';

      return {
        ...payload,
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        facilityId: payload["custom:facilityId"] || "facility-001",
        orgId: payload["custom:orgId"] || "org-001",
        tier: payload["custom:tier"] || payload["custom:subscription"],
        role: effectiveRole,
        orgType,
        department: payload["custom:department"] || "Operations",
      };
    } catch {
      return null;
    }
  })() : null;

  const userRole = user?.role || null;

  return {
    ...authState,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.isLoading,
    authEvents,
    authError,
    login,
    logout,
    user,
    userRole,
  };
};

// ── LMS auth adapter — used by optimize-learn components ────────────────────
export function useLMSAuth() {
  const auth = useAuth();
  const u = auth.user;

  const role = (u?.role || null) as string | null;
  const DEFAULT_ACCESS = ['admin', 'executive', 'director', 'manager', 'supervisor', 'engineer', 'compliance_officer'];
  const hasLMSAccess = !!u;
  const isReadOnly = !!u && !DEFAULT_ACCESS.includes(role || '');
  const canManageEnrollments = ['admin', 'executive', 'director', 'manager'].includes(role || '');
  const canEnrollManagers    = ['admin', 'executive', 'director'].includes(role || '');

  return {
    user: u ? { sub: u.sub || u.email || '', name: u.name || '', email: u.email || '', role: role as any, facilityId: u.facilityId || 'facility-001', orgId: u.orgId } : null,
    loading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    isAdmin: role === 'admin',
    isExecutive: role === 'executive' || role === 'director',
    isManager: role === 'manager',
    isSupervisor: role === 'supervisor',
    isEngineer: role === 'engineer',
    isNexumAdmin: role === 'admin',
    hasLMSAccess,
    canManageEnrollments,
    canEnrollManagers,
    isReadOnly,
    enrolledCourses: [] as string[],
    canAccessCourse: (_courseId: string) => !!u,
  };
}
