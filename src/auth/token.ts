// Token storage and management
const ACCESS_TOKEN_KEY = 'nexum_access_token';
const REFRESH_TOKEN_KEY = 'nexum_refresh_token';
const ID_TOKEN_KEY = 'nexum_id_token';

export interface Tokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

export function setTokens(access: string, id: string, refresh?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(ID_TOKEN_KEY, id);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getIdToken(): string | null {
  return localStorage.getItem(ID_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
}

export function isTokenValid(token: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    }
    return true;
  } catch (error) {
    return false;
  }
}
