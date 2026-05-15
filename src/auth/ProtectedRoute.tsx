import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES_BY_ORG_TYPE } from '../config/roles';

const ADMIN_DOMAINS = ['nexumsuum.com', 'nexumsuum-facilityintelligence.com'];

function getPostLoginRoute(role: string, orgType: string): string | null {
  const retail   = ROLES_BY_ORG_TYPE.retail;
  const govt     = ROLES_BY_ORG_TYPE.government;
  const facility = ROLES_BY_ORG_TYPE.facility;

  if (orgType === 'retail') {
    if ([...retail.staff, ...retail.leadership].includes(role)) return '/retail-dashboard';
  }
  if (orgType === 'government') {
    if (govt.leadership.includes(role)) return '/government-dashboard';
    if (role === 'dispatcher')                        return '/dashboard/dispatcher';
    if (role === 'firefighter' || role === 'ems_tech') return '/dashboard/firefighter';
    if (role === 'officer' || role === 'personnel')   return '/dashboard/officer';
    return '/government-dashboard';
  }
  if (role === 'executive' || role === 'director') return '/dashboard/executive';
  if (role === 'manager')    return '/dashboard/manager';
  if (role === 'supervisor') return '/dashboard/supervisor';
  if (role === 'engineer')   return '/dashboard/engineer';
  if (role === 'technician') return '/dashboard/tech';
  if (role === 'operator')   return '/dashboard/operator';
  if (role === 'custodian')  return '/dashboard/custodian';
  if (facility.staff.includes(role) || role === 'admin' || role === 'employee') return null;
  return null;
}

export default function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (window.location.pathname !== '/') return;
      const orgType = localStorage.getItem('nexum_org_type') || 'facility';
      const role    = user.role || 'employee';
      const target  = getPostLoginRoute(role, orgType);
      if (target) navigate(target, { replace: true });
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
    return <Navigate to="/login" replace />;
  }

  // ── Onboarding + plan gate ────────────────────────────────────────────────
  // Skip for admins (Nexum internal domain) — they always have full access
  if (user) {
    const email  = (user.email || '').toLowerCase();
    const domain = email.split('@')[1] || '';
    const isAdmin = user.role === 'admin' || ADMIN_DOMAINS.includes(domain);

    if (!isAdmin) {
      // No plan purchased → send to pricing (no free ride)
      const tier = user.tier || user['custom:tier'] || user['custom:subscription'];
      if (!tier) {
        return <Navigate to="/pricing" replace />;
      }

      // Plan exists but onboarding not done → onboarding first
      const onboardingDone = localStorage.getItem('nexum_onboarding_complete') === 'true';
      if (!onboardingDone) {
        // Don't intercept if already on onboarding
        if (window.location.pathname !== '/onboarding') {
          return <Navigate to="/onboarding" replace />;
        }
      }
    }
  }

  return <Outlet />;
}
