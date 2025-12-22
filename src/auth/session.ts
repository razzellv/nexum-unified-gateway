// Cognito OAuth2 Session Management
// Environment variables expected: COGNITO_DOMAIN, CLIENT_ID, API_BASE_URL

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

// Get Cognito configuration from environment
const getCognitoConfig = () => ({
  domain: import.meta.env.VITE_COGNITO_DOMAIN || "",
  clientId: import.meta.env.VITE_CLIENT_ID || "",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
});

// Store tokens securely in localStorage
export const storeTokens = (tokens: AuthTokens): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("[Auth] Failed to store tokens:", error);
  }
};

// Retrieve stored tokens
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

// Clear stored tokens
export const clearTokens = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear tokens:", error);
  }
};

// Check if access token is expired (with 30-second buffer)
export const isTokenExpired = (tokens: AuthTokens | null): boolean => {
  if (!tokens) return true;
  const bufferMs = 30 * 1000; // 30 seconds before actual expiry
  return Date.now() >= tokens.expires_at - bufferMs;
};

// Auth event listeners for logging
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

// Refresh the access token using the refresh token
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      refresh_token: data.refresh_token || tokens.refresh_token, // Cognito may not return a new refresh token
      expires_at: Date.now() + (data.expires_in * 1000),
    };

    storeTokens(newTokens);
    emitAuthEvent("token_refreshed", "Access token refreshed successfully");
    
    return newTokens;
  } catch (error) {
    console.error("[Auth] Token refresh error:", error);
    emitAuthEvent("auth_failed", "Token refresh network error");
    return null;
  }
};

// Get a valid access token (refreshing if needed)
export const getValidAccessToken = async (): Promise<string | null> => {
  let tokens = getStoredTokens();

  if (!tokens) {
    return null;
  }

  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken();
    if (!tokens) {
      return null;
    }
    emitAuthEvent("session_renewed", "Session renewed with new token");
  }

  return tokens.access_token;
};

// Redirect to Cognito login
export const redirectToLogin = (): void => {
  const config = getCognitoConfig();
  if (!config.domain || !config.clientId) {
    console.error("[Auth] Cannot redirect: Missing Cognito configuration");
    return;
  }

  const redirectUri = window.location.origin;
  const loginUrl = `${config.domain}/login?client_id=${config.clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  emitAuthEvent("logout", "Redirecting to login");
  clearTokens();
  window.location.href = loginUrl;
};

// Handle OAuth callback (exchange code for tokens)
export const handleAuthCallback = async (code: string): Promise<boolean> => {
  const config = getCognitoConfig();
  if (!config.domain || !config.clientId) {
    console.error("[Auth] Cannot exchange code: Missing Cognito configuration");
    return false;
  }

  try {
    const response = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: window.location.origin,
      }),
    });

    if (!response.ok) {
      console.error("[Auth] Code exchange failed");
      return false;
    }

    const data = await response.json();
    
    const tokens: AuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
    };

    storeTokens(tokens);
    emitAuthEvent("login", "Successfully authenticated");
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    return true;
  } catch (error) {
    console.error("[Auth] Auth callback error:", error);
    return false;
  }
};

// Logout
export const logout = (): void => {
  const config = getCognitoConfig();
  clearTokens();
  emitAuthEvent("logout", "User logged out");
  
  if (config.domain && config.clientId) {
    const logoutUrl = `${config.domain}/logout?client_id=${config.clientId}&logout_uri=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  }
};
