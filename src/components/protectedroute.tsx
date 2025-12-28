import { Navigate } from "react-router-dom";
import { getAccessToken, isTokenValid } from "../auth/token";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = getAccessToken();

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
