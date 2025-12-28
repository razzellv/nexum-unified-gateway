import { Navigate, Outlet } from "react-router-dom";
import jwtDecode from "jwt-decode";

function isTokenValid(token: string) {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function ProtectedRoute() {
  const token = localStorage.getItem("access_token");

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
