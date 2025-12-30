import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  console.log("🔒 ProtectedRoute: checking auth");
  console.log("🔒 isAuthenticated:", isAuthenticated);
  console.log("🔒 loading:", loading);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🔒 Not authenticated, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("🔒 Authenticated! Rendering children");
  // CRITICAL: Render children using Outlet
  return <Outlet />;
}
