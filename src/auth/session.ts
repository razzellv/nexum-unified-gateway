// Cognito OAuth2 Session Management

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
}

const TOKEN_STORAGE_KEY = "nexum_auth_tokens";

const getCognitoConfig = () => ({
  domain: import.meta.env.VITE_COGNITO_DOMAIN || "",
  clientId: import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || "",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
  redirectUri: `${window.location.origin}/auth/callback`,
});

export const storeTokens = (tokens: AuthTokens): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("[Auth] Failed to store tokens:", error);
  }
};

export const getStoredTokens = (): AuthTokens | null => {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthTokens;
  } catch (error) {
    console.error("[Auth] Failed to retrieve tokens:", error);
    return null;
  }
};

export const clearTokens = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Auth tokens
    localStorage.removeItem("nexum_access_token");
    localStorage.removeItem("nexum_id_token");
    localStorage.removeItem("nexum_refresh_token");
    // Session / org context — cleared on logout (re-set at next login)
    localStorage.removeItem("nexum_org_type");
    localStorage.removeItem("nexum_retail_mode");
    localStorage.removeItem("nexum_store_info");
    localStorage.removeItem("nexum_onboarding_verified");
    localStorage.removeItem("nexum_onboarding_session");
    localStorage.removeItem("nexum_onboarding_tier");
    localStorage.removeItem("nexum_onboarding_email");
    localStorage.removeItem("nexum_active_facility_id");
    localStorage.removeItem("nexum_active_facility_name");
    localStorage.removeItem("nexum_facility_name");
    localStorage.removeItem("nexum_notif_read");
    localStorage.removeItem("nexum_notifications");
    // NOTE: Do NOT clear: nexum_dept_budgets, nexum_facilities,
    // compliance_docs, nexum_network_contacts — these persist across logins
  } catch (error) {
    console.error("[Auth] Failed to clear tokens:", error);
  }
};

export const isTokenExpired = (tokens: AuthTokens | null): boolean => {
  if (!tokens) return true;
  const bufferMs = 30 * 1000;
  return Date.now() >= tokens.expires_at - bufferMs;
};

type AuthEventType = "token_refreshed" | "session_renewed" | "auth_failed" | "logout" | "login";
type AuthEventListener = (event: AuthEventType, message: string) => void;
const authEventListeners: AuthEventListener[] = [];

export const addAuthEventListener = (listener: AuthEventListener): (() => void) => {
  authEventListeners.push(listener);
  return () => {
    const index = authEventListeners.indexOf(listener);
    if (index > -1) authEventListeners.splice(index, 1);
  };
};

const emitAuthEvent = (event: AuthEventType, message: string): void => {
  authEventListeners.forEach(listener => listener(event, message));
};

export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) {
    emitAuthEvent("auth_failed", "No refresh token available");
    return null;
  }

  const config = getCognitoConfig();
  if (!config.domain || !config.clientId) {
    console.error("[Auth] Missing Cognito configuration");
    emitAuthEvent("auth_failed", "Missing Cognito configuration");
    return null;
  }

  try {
    const response = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Auth] Token refresh failed:", errorText);
      emitAuthEvent("auth_failed", "Token refresh failed");
      return null;
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
    };

    storeTokens(newTokens);
    // Also store in legacy keys for API compatibility
    localStorage.setItem("nexum_access_token", data.access_token);
    if (data.id_token) localStorage.setItem("nexum_id_token", data.id_token);

    emitAuthEvent("token_refreshed", "Access token refreshed successfully");
    return newTokens;
  } catch (error) {
    console.error("[Auth] Token refresh error:", error);
    emitAuthEvent("auth_failed", "Token refresh network error");
    return null;
  }
};

export const getValidAccessToken = async (): Promise<string | null> => {
  let tokens = getStoredTokens();
  if (!tokens) return null;
  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken();
    if (!tokens) return null;
    emitAuthEvent("session_renewed", "Session renewed with new token");
  }
  return tokens.access_token;
};

export const redirectToLogin = (): void => {
  const config = getCognitoConfig();
  if (!config.domain || !config.clientId) {
    console.error("[Auth] Cannot redirect: Missing Cognito configuration");
    return;
  }

  const loginUrl = `${config.domain}/login?client_id=${config.clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(config.redirectUri)}`;

  console.log("[Auth] Redirecting to login:", loginUrl);
  emitAuthEvent("logout", "Redirecting to login");
  clearTokens();
  window.location.href = loginUrl;
};

export const handleAuthCallback = async (code: string): Promise<boolean> => {
  const config = getCognitoConfig();
  if (!config.domain || !config.clientId) {
    console.error("[Auth] Cannot exchange code: Missing Cognito configuration");
    return false;
  }

  try {
    const response = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Auth] Code exchange failed:", errorText);
      return false;
    }

    const data = await response.json();
    const tokens: AuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
    };

    storeTokens(tokens);
    // Also store in legacy keys so existing API calls work
    localStorage.setItem("nexum_access_token", data.access_token);
    if (data.id_token) localStorage.setItem("nexum_id_token", data.id_token);

    emitAuthEvent("login", "Successfully authenticated");
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (error) {
    console.error("[Auth] Auth callback error:", error);
    return false;
  }
};

export const logout = (): void => {
  clearTokens();
  emitAuthEvent("logout", "User logged out");
  window.location.href = "/";
};
