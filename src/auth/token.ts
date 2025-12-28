import jwtDecode from "jwt-decode";

export interface DecodedToken {
  exp: number;
  email?: string;
  sub?: string;
  [key: string]: any;
}

export function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function setTokens(access: string, id: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("id_token", id);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("id_token");
}
