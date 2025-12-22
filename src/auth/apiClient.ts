// Centralized API client with automatic Bearer token attachment and refresh handling

import { getValidAccessToken, redirectToLogin } from "./session";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Shared fetch wrapper with automatic token handling
export const apiClient = async <T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> => {
  const { skipAuth = false, ...fetchOptions } = options;
  
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(fetchOptions.headers);
  
  // Attach Bearer token if auth is not skipped
  if (!skipAuth) {
    const token = await getValidAccessToken();
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  
  // Set default content type if not provided
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - token expired or invalid
    if (response.status === 401 && !skipAuth) {
      // Try to refresh token and retry the request
      const newToken = await getValidAccessToken();
      
      if (!newToken) {
        // Refresh failed, redirect to login
        redirectToLogin();
        return {
          data: null,
          error: "Authentication required",
          status: 401,
        };
      }

      // Retry with new token
      headers.set("Authorization", `Bearer ${newToken}`);
      
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (retryResponse.status === 401) {
        // Still unauthorized after refresh, redirect to login
        redirectToLogin();
        return {
          data: null,
          error: "Authentication failed",
          status: 401,
        };
      }

      return parseResponse<T>(retryResponse);
    }

    return parseResponse<T>(response);
  } catch (error) {
    console.error("[API] Request failed:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
};

// Parse response based on content type
const parseResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get("content-type");
  
  let data: T | null = null;
  let error: string | null = null;

  try {
    if (contentType?.includes("application/json")) {
      const json = await response.json();
      
      if (response.ok) {
        data = json as T;
      } else {
        error = json.message || json.error || `Request failed with status ${response.status}`;
      }
    } else if (response.ok) {
      data = (await response.text()) as unknown as T;
    } else {
      error = `Request failed with status ${response.status}`;
    }
  } catch (parseError) {
    error = "Failed to parse response";
  }

  return {
    data,
    error,
    status: response.status,
  };
};

// Convenience methods
export const api = {
  get: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
