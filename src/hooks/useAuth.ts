import { useState, useEffect, useCallback } from "react";
import {
  getStoredTokens,
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

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
  });

  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);

  const addAuthEvent = useCallback((type: string, message: string) => {
    setAuthEvents(prev => [
      { type, message, timestamp: new Date() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth callback code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        addAuthEvent("info", "Processing OAuth callback...");
        const success = await handleAuthCallback(code);

        if (success) {
          addAuthEvent("login", "Successfully authenticated via OAuth");
          const tokens = getStoredTokens();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            tokens,
          });
          return;
        } else {
          addAuthEvent("auth_failed", "OAuth callback failed");
        }
      }

      // Check for existing tokens
      const tokens = getStoredTokens();

      if (tokens && !isTokenExpired(tokens)) {
        addAuthEvent("session_renewed", "Session restored from storage");
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          tokens,
        });
      } else if (tokens) {
        addAuthEvent("info", "Token expired, will refresh on next request");
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          tokens,
        });
      } else {
        addAuthEvent("info", "No active session found");
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          tokens: null,
        });
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

  const login = useCallback(() => {
    redirectToLogin();
  }, []);

  const logout = useCallback(() => {
    authLogout();
  }, []);

  // Expose user info from stored tokens
  const user = authState.tokens ? (() => {
    try {
      const token = authState.tokens.access_token;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        role: payload["custom:role"] || payload.role || "employee",
        facilityId: payload["custom:facilityId"] || "facility-001",
        orgId: payload["custom:orgId"] || "org-001",
        ...payload,
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
    login,
    logout,
    user,
    userRole,
  };
};
