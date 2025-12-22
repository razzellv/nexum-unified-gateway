import { useState, useEffect, useCallback } from "react";
import {
  getStoredTokens,
  isTokenExpired,
  handleAuthCallback,
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

  // Add auth event to the log
  const addAuthEvent = useCallback((type: string, message: string) => {
    setAuthEvents(prev => [
      { type, message, timestamp: new Date() },
      ...prev.slice(0, 49), // Keep last 50 events
    ]);
  }, []);

  // Initialize auth state
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
        // Token exists but expired - will be refreshed on next API call
        addAuthEvent("info", "Token expired, will refresh on next request");
        setAuthState({
          isAuthenticated: true, // Still "authenticated" - token will refresh
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

    // Listen to auth events
    const unsubscribe = addAuthEventListener((event, message) => {
      addAuthEvent(event, message);
      
      // Update auth state based on events
      if (event === "token_refreshed" || event === "session_renewed") {
        const tokens = getStoredTokens();
        setAuthState(prev => ({ ...prev, tokens, isAuthenticated: true }));
      } else if (event === "auth_failed" || event === "logout") {
        setAuthState(prev => ({ ...prev, isAuthenticated: false, tokens: null }));
      }
    });

    return unsubscribe;
  }, [addAuthEvent]);

  const logout = useCallback(() => {
    authLogout();
  }, []);

  return {
    ...authState,
    authEvents,
    logout,
  };
};
