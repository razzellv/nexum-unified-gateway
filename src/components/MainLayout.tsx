import { Link, useLocation } from 'react-router-dom';
import { Flame, Wrench, Shield, Users, LayoutDashboard, ClipboardList, UserCog, Zap, BarChart3, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/global/NotificationBell';
import { RoleSelector } from '@/components/global/RoleSelector';
import { NoAccessScreen } from '@/components/global/NoAccessScreen';
import { ROLE_DEFINITIONS } from '@/lib/role-filters';
import { PageWrapper } from '@/components/PageWrapper';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { currentRole, canAccessApp, roleScope } = useRole();

  // Role-based navigation based on view role
  const getNavigation = () => {
    const roleDef = ROLE_DEFINITIONS[currentRole];
    
    if (!roleDef?.canAccessApp) return [];

    const baseNav = [
      { 
        name: 'Dashboard', 
        path: '/dashboard/manager', 
        icon: LayoutDashboard,
        roles: ['manager', 'supervisor', 'executive']
      },
      { 
        name: 'Equipment Intelligence', 
        path: '/equipment-intelligence', 
        icon: Wrench,
        roles: ['all']
      },
      { 
        name: 'Equipment', 
        path: '/equipment', 
        icon: Flame,
        roles: ['employee', 'supervisor', 'manager']
      },
      { 
        name: 'Facility Data Source', 
        path: '/data-source', 
        icon: History,
        roles: ['all']
      },
      { 
        name: 'Compliance Logger', 
        path: '/compliance-logger', 
        icon: Shield,
        roles: ['supervisor', 'manager', 'executive']
      },
    ];

    return baseNav.filter(item => 
      item.roles.includes('all') || item.roles.includes(currentRole)
    );
  };

  // ✅ Wait for auth to resolve before enforcing any access checks
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

  // ✅ Don't block render while auth is still resolving on navigation
  if (!isAuthenticated) {
    return null;
  }

  const navigation = getNavigation();

  if (!canAccessApp) {
    return <NoAccessScreen currentRole={currentRole} />;
  }

  return (
    <PageWrapper>
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                <span className="font-bold text-lg" style={{
                  color: '#06b6d4',
                  textShadow: '0 0 20px rgba(6, 182, 212, 0.6)'
                }}>
                  Nexum Suum
                </span>
              </Link>
              
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

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden sm:flex border-neon-cyan/30">
                {roleScope?.assignedFacilities?.[0] || 'Main Campus'}
              </Badge>
              <RoleSelector />
              <NotificationBell />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </PageWrapper>
  );
};
