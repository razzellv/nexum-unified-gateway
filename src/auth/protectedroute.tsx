import { Navigate } from "react-router-dom";
import jwtDecode from "jwt-decode";

function isTokenValid(token: string) {
  const decoded: any = jwtDecode(token);
  return decoded.exp * 1000 > Date.now();
}

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access_token");

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
