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
  LogOut,
  GraduationCap, ShoppingCart} from "lucide-react";
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { TierBadge } from '@/components/global/TierGate';
import { useTier } from '@/hooks/useTier';
import type { TierFeature } from '@/config/tiers';

const STAFF_ROLES = ['engineer', 'operator', 'technician', 'custodian', 'employee'];
const LEADERSHIP_ROLES = ['admin', 'executive', 'manager', 'supervisor'];

const allNavItems: { name?: string; href?: string; icon?: any; access: string; type?: string; tier?: TierFeature }[] = [
  { name: 'Main Hub', href: '/', icon: Home, access: 'all' },
  { type: 'separator', name: 'Command Hub', access: 'leadership' },
  { name: 'Command Hub', href: '/command-hub', icon: Command, access: 'leadership' },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, access: 'leadership', tier: 'work_orders' },
  { name: 'Violations', href: '/violations', icon: AlertTriangle, access: 'leadership', tier: 'violations_tracking' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, access: 'leadership', tier: 'messages' },
  { name: 'Kanban', href: '/kanban', icon: Columns3, access: 'leadership', tier: 'kanban' },
  { name: 'Emergency', href: '/emergency', icon: AlertOctagon, access: 'leadership' },
  { name: 'Vendors', href: '/vendors', icon: Building2, access: 'leadership', tier: 'vendors' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, access: 'leadership', tier: 'calendar' },
  { name: 'Workflows', href: '/workflows', icon: Workflow, access: 'leadership', tier: 'operations_center' },
  { name: 'Workload', href: '/workload', icon: Users, access: 'leadership', tier: 'workload' },
  { name: 'Settings', href: '/settings', icon: Settings, access: 'leadership' },
  { type: 'separator', name: 'Operations', access: 'all' },
  { name: 'Equipment Intelligence', href: '/equipment-intelligence', icon: Camera, access: 'all' },
  { name: 'Facility Data Source', href: '/data-source', icon: Upload, access: 'all', tier: 'facility_data_source' },
  { name: 'Equipment Metrics', href: '/equipment', icon: Activity, access: 'all', tier: 'equipment_metrics' },
  { name: 'Equipment Library', href: '/equipment-library', icon: Package, access: 'all', tier: 'equipment_library' },
  { name: 'Inventory Library', href: '/inventory-library', icon: Boxes, access: 'all', tier: 'inventory_library' },
  { name: 'Compliance Documents', href: '/compliance-documents', icon: ShieldCheck, access: 'all', tier: 'compliance_documents' },
  { name: 'Retail Dashboard', href: '/retail-dashboard', icon: ShoppingCart, access: 'all', tier: 'retail_inventory' },
  { name: 'Equipment Systems', href: '/equipment-systems', icon: Network, access: 'leadership' },
  { name: 'Compliance Logger', href: '/compliance-logger', icon: ShieldCheck, access: 'all', tier: 'compliance_logging' },
  { type: 'separator', name: 'Dashboards', access: 'all' },
  { name: 'Facility Intelligence', href: '/facility-intelligence', icon: BarChart3, access: 'leadership' },
  { name: 'Operation Center', href: '/employee-dashboard', icon: Users, access: 'all', tier: 'operations_center' },
  { name: 'Optimize & Learn', href: '/optimize-learn', icon: GraduationCap, access: 'leadership', tier: 'lms' },
  { name: 'Energy Dashboard', href: '/dashboard/energy', icon: BarChart3, access: 'leadership', tier: 'energy_dashboard' },
  { name: 'Executive Dashboard', href: '/dashboard/executive', icon: TrendingUp, access: 'leadership', tier: 'executive_dashboard' },
  { name: 'Manager Dashboard', href: '/dashboard/manager', icon: LayoutDashboard, access: 'leadership', tier: 'manager_dashboard' },
  { name: 'Supervisor Dashboard', href: '/dashboard/supervisor', icon: Gauge, access: 'leadership', tier: 'supervisor_dashboard' },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const { userRole, logout } = useAuth();
  const { can, isAdmin } = useTier();

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
                {!collapsed && item.tier && <TierBadge feature={item.tier} />}
              </NavLink>
            );
          })}
        </div>
      </nav>

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
