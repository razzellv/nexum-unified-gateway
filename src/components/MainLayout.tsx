import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Wrench, Shield, LayoutDashboard, History, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/global/NotificationBell';
import { RoleSelector } from '@/components/global/RoleSelector';
import { NoAccessScreen } from '@/components/global/NoAccessScreen';
import { ROLE_DEFINITIONS } from '@/lib/role-filters';
import { PageWrapper } from '@/components/PageWrapper';
import { EmergencyBroadcastPopup } from '@/components/command-hub/emergency/EmergencyBroadcast';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { currentRole, canAccessApp, roleScope } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getNavigation = () => {
    const roleDef = ROLE_DEFINITIONS[currentRole];
    if (!roleDef?.canAccessApp) return [];

    const baseNav = [
      { name: 'Dashboard',              path: '/dashboard/manager',     icon: LayoutDashboard, roles: ['manager', 'supervisor', 'executive'] },
      { name: 'Equipment Intelligence', path: '/equipment-intelligence', icon: Wrench,          roles: ['all'] },
      { name: 'Equipment',              path: '/equipment',              icon: Flame,           roles: ['employee', 'supervisor', 'manager'] },
      { name: 'Facility Data Source',   path: '/data-source',            icon: History,         roles: ['all'] },
      { name: 'Compliance Logger',      path: '/compliance-logger',      icon: Shield,          roles: ['supervisor', 'manager', 'executive'] },
    ];

    return baseNav.filter(item => item.roles.includes('all') || item.roles.includes(currentRole));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navigation = getNavigation();

  if (!canAccessApp) return <NoAccessScreen currentRole={currentRole} />;

  return (
    <PageWrapper>
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4 md:gap-8">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <Flame className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                <span className="font-bold text-lg" style={{ color: '#06b6d4', textShadow: '0 0 20px rgba(6,182,212,0.6)' }}>
                  Nexum Suum
                </span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-neon-cyan/10 text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'text-muted-foreground hover:text-neon-cyan hover:bg-accent hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Badge variant="outline" className="hidden sm:flex border-neon-cyan/30">
                {(() => {
                  const f = roleScope?.assignedFacilities?.[0];
                  if (!f) return 'Main Campus';
                  if (typeof f === 'string') return f;
                  return (f as any).name || (f as any).id || 'Main Campus';
                })()}
              </Badge>
              <RoleSelector />
              <NotificationBell />

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-neon-cyan/10 text-neon-cyan'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {children}
      </main>
    </PageWrapper>
  );
};
