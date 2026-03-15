import { 
  LayoutDashboard, 
  AlertTriangle, 
  ClipboardList,
  ShieldCheck,
  Command,
  BarChart3,
  Camera,
  Upload,
  Activity,
  Database,
  Home,
  MessageSquare,
  Columns3,
  AlertOctagon,
  Building2,
  Calendar,
  Workflow,
  Settings,
  Users,
  Package,
  Boxes,
  Network,
  Gauge,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';

// Role definitions
// admin — full access (Nexum Suum internal)
// executive — leadership dashboards + full ops
// manager — leadership dashboards + full ops
// supervisor — leadership dashboards + full ops
// engineer/operator/technician/custodian — staff only (limited nav)

const STAFF_ROLES = ['engineer', 'operator', 'technician', 'custodian', 'employee'];
const LEADERSHIP_ROLES = ['admin', 'executive', 'manager', 'supervisor'];

const allNavItems = [
  // ── Main ──────────────────────────────────────────────
  { name: 'Main Hub', href: '/', icon: Home, access: 'all' },

  // ── Command Hub (leadership + admin only) ─────────────
  { type: 'separator', name: 'Command Hub', access: 'leadership' },
  { name: 'Command Hub', href: '/command-hub', icon: Command, access: 'leadership' },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, access: 'leadership' },
  { name: 'Violations', href: '/violations', icon: AlertTriangle, access: 'leadership' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, access: 'leadership' },
  { name: 'Kanban', href: '/kanban', icon: Columns3, access: 'leadership' },
  { name: 'Emergency', href: '/emergency', icon: AlertOctagon, access: 'leadership' },
  { name: 'Vendors', href: '/vendors', icon: Building2, access: 'leadership' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, access: 'leadership' },
  { name: 'Workflows', href: '/workflows', icon: Workflow, access: 'leadership' },
  { name: 'Workload', href: '/workload', icon: Users, access: 'leadership' },
  { name: 'Settings', href: '/settings', icon: Settings, access: 'leadership' },

  // ── Operations (all roles) ────────────────────────────
  { type: 'separator', name: 'Operations', access: 'all' },
  { name: 'Equipment Intelligence', href: '/equipment-intelligence', icon: Camera, access: 'all' },
  { name: 'Facility Data Source', href: '/data-source', icon: Upload, access: 'all' },
  { name: 'Equipment Metrics', href: '/equipment', icon: Activity, access: 'all' },
  { name: 'Equipment Library', href: '/equipment-library', icon: Package, access: 'all' },
  { name: 'Inventory Library', href: '/inventory-library', icon: Boxes, access: 'all' },
  { name: 'Equipment Systems', href: '/equipment-systems', icon: Network, access: 'leadership' },
  { name: 'Compliance Logger', href: '/compliance-logger', icon: ShieldCheck, access: 'all' },

  // ── Dashboards ────────────────────────────────────────
  { type: 'separator', name: 'Dashboards', access: 'all' },
  { name: 'Facility Intelligence', href: '/facility-intelligence', icon: BarChart3, access: 'leadership' },
  { name: 'Operation Center', href: '/employee-dashboard', icon: Users, access: 'all' },
  { name: 'Energy Dashboard', href: '/dashboard/energy', icon: BarChart3, access: 'leadership' },
  { name: 'Executive Dashboard', href: '/dashboard/executive', icon: TrendingUp, access: 'leadership' },
  { name: 'Manager Dashboard', href: '/dashboard/manager', icon: LayoutDashboard, access: 'leadership' },
  { name: 'Supervisor Dashboard', href: '/dashboard/supervisor', icon: Gauge, access: 'leadership' },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const { userRole, logout } = useAuth();

  const isStaff = STAFF_ROLES.includes(userRole || '');
  const isLeadership = LEADERSHIP_ROLES.includes(userRole || '');

  const visibleItems = allNavItems.filter(item => {
    if (item.access === 'all') return true;
    if (item.access === 'leadership') return isLeadership;
    return false;
  });

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
      collapsed ? "w-0 md:w-16 overflow-hidden" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Command className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Nexum Suum</span>
              <span className="text-xs text-primary font-medium">Facility Intelligence™</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key={item.name} className="px-3 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {!collapsed && item.name}
                  </h3>
                </div>
              );
            }
            return (
              <NavLink
                key={item.name}
                to={item.href!}
                icon={item.icon!}
                collapsed={collapsed}
              >
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
