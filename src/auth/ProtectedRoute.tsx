import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES_BY_ORG_TYPE } from '../config/roles';

function getPostLoginRoute(role: string, orgType: string): string | null {
  const retail  = ROLES_BY_ORG_TYPE.retail;
  const govt    = ROLES_BY_ORG_TYPE.government;
  const facility = ROLES_BY_ORG_TYPE.facility;

  if (orgType === 'retail') {
    if ([...retail.staff, ...retail.leadership].includes(role)) return '/retail-dashboard';
  }

  if (orgType === 'government') {
    if ([...govt.staff, ...govt.leadership].includes(role)) return '/government-dashboard';
  }

  // Facility routing by seniority
  if (role === 'executive' || role === 'director') return '/dashboard/executive';
  if (role === 'manager')    return '/dashboard/manager';
  if (role === 'supervisor') return '/dashboard/supervisor';

  // Facility staff and admin → main hub
  if (facility.staff.includes(role) || role === 'admin' || role === 'employee') return null;

  return null;
}

export default function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  console.log("🔒 ProtectedRoute: checking auth");
  console.log("🔒 isAuthenticated:", isAuthenticated);
  console.log("🔒 loading:", loading);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Only redirect on the root path — don't intercept deep links
      if (window.location.pathname !== '/') return;

      const orgType = localStorage.getItem('nexum_org_type') || 'facility';
      const role    = user.role || 'employee';
      const target  = getPostLoginRoute(role, orgType);

      if (target) {
        console.log(`🔒 Role-based redirect: ${role} (${orgType}) → ${target}`);
        navigate(target, { replace: true });
      }
    }
  }, [loading, isAuthenticated, user, navigate]);

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
  return <Outlet />;
}
