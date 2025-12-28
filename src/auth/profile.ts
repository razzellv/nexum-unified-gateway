import jwtDecode from "jwt-decode";

export function getUserProfile() {
  const token = localStorage.getItem("id_token");
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}
