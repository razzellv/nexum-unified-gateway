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
  GraduationCap, ShoppingCart, Shield} from "lucide-react";
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { TierBadge } from '@/components/global/TierGate';
import { useTier } from '@/hooks/useTier';
import type { TierFeature } from '@/config/tiers';
import { ROLES_BY_ORG_TYPE } from '@/config/roles';

// ── Role sets ────────────────────────────────────────────────────────────────
const FACILITY_LEADERSHIP  = ROLES_BY_ORG_TYPE.facility.leadership;
const RETAIL_STAFF         = ROLES_BY_ORG_TYPE.retail.staff;
const RETAIL_LEADERSHIP    = ROLES_BY_ORG_TYPE.retail.leadership;
const GOVT_STAFF           = ROLES_BY_ORG_TYPE.government.staff;
const GOVT_LEADERSHIP      = ROLES_BY_ORG_TYPE.government.leadership;
// Legacy facility staff definition
const FACILITY_STAFF       = ROLES_BY_ORG_TYPE.facility.staff;

type NavItem = {
  name?: string;
  href?: string;
  icon?: any;
  /** 'all' | 'leadership' | 'retail_staff' | 'govt_staff' | string[] of exact hrefs */
  access: string;
  type?: string;
  tier?: TierFeature;
  /** Only show for these org types (undefined = all) */
  orgTypes?: string[];
  /** Set at runtime by getVisibleItems when tier check fails */
  _locked?: boolean;
};

const allNavItems: NavItem[] = [
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

  // Retail-staff-only items (minimal nav)
  { type: 'separator', name: 'My Work', access: 'retail_staff' },
  { name: 'Checklist', href: '/employee-dashboard', icon: ClipboardList, access: 'retail_staff' },
  { name: 'Inventory', href: '/inventory-library', icon: Boxes, access: 'retail_staff', tier: 'inventory_library' },
  { name: 'Violations', href: '/violations', icon: AlertTriangle, access: 'retail_staff', tier: 'violations_tracking' },

  // Govt-staff-only items (minimal nav)
  { type: 'separator', name: 'My Work', access: 'govt_staff' },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, access: 'govt_staff', tier: 'work_orders' },
  { name: 'Violations', href: '/violations', icon: AlertTriangle, access: 'govt_staff', tier: 'violations_tracking' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, access: 'govt_staff', tier: 'messages' },
  { name: 'Personnel', href: '/employee-dashboard', icon: Users, access: 'govt_staff' },

  { type: 'separator', name: 'Operations', access: 'all' },
  { name: 'Equipment Intelligence', href: '/equipment-intelligence', icon: Camera, access: 'all' },
  { name: 'Facility Data Source', href: '/data-source', icon: Upload, access: 'all', tier: 'facility_data_source' },
  { name: 'Equipment Metrics', href: '/equipment', icon: Activity, access: 'all', tier: 'equipment_metrics' },
  { name: 'Equipment Library', href: '/equipment-library', icon: Package, access: 'all', tier: 'equipment_library' },
  { name: 'Inventory Library', href: '/inventory-library', icon: Boxes, access: 'all', tier: 'inventory_library' },
  { name: 'Compliance Documents', href: '/compliance-documents', icon: ShieldCheck, access: 'all', tier: 'compliance_documents' },
  { name: 'Retail Dashboard', href: '/retail-dashboard', icon: ShoppingCart, access: 'all', tier: 'retail_inventory', orgTypes: ['retail'] },
  { name: 'Gov / Public Safety', href: '/government-dashboard', icon: Shield, access: 'all', tier: 'retail_inventory', orgTypes: ['government'] },
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

// ── Nav visibility logic ─────────────────────────────────────────────────────
function getVisibleItems(
  role: string,
  orgType: string,
  isLeadership: boolean,
  isAdmin: boolean,
  canFeature: (f: TierFeature) => boolean,
): NavItem[] {
  const isRetailStaff    = orgType === 'retail'      && RETAIL_STAFF.includes(role);
  const isRetailLeader   = orgType === 'retail'      && RETAIL_LEADERSHIP.includes(role);
  const isGovtStaff      = orgType === 'government'  && GOVT_STAFF.includes(role);
  const isGovtLeader     = orgType === 'government'  && GOVT_LEADERSHIP.includes(role);

  return allNavItems.filter(item => {
    // Admin-only items (e.g. FIAS) — never shown to non-admins
    if (item.access === 'admin_only') return isAdmin;

    // Tier-locked items: keep visible so users see what's available, but mark locked
    // (TierBadge handles the visual lock; routing guard handles access)
    // Exception: admin always has full access
    if (item.tier && !isAdmin && !canFeature(item.tier)) {
      item._locked = true; // mark for visual treatment
    } else {
      item._locked = false;
    }

    // Org-type filter — admin sees all org dashboards; others only see their own
    if (item.orgTypes && item.orgTypes.length > 0) {
      if (!isAdmin && !item.orgTypes.includes(orgType)) return false;
    }

    if (item.type === 'separator') {
      // Never show staff-only separators to admin (they see leadership section already)
      if (item.access === 'retail_staff' || item.access === 'govt_staff') return !isAdmin && (isRetailStaff || isGovtStaff);
      if (item.access === 'leadership')   return isAdmin || isLeadership || isRetailLeader || isGovtLeader;
      return true;
    }

    // Admin sees everything EXCEPT staff-only items (already covered by leadership section)
    if (isAdmin) {
      if (item.access === 'retail_staff' || item.access === 'govt_staff') return false;
      return true;
    }

    // Retail staff: only see retail_staff items + Main Hub
    if (isRetailStaff) {
      return item.access === 'retail_staff' || item.href === '/';
    }

    // Govt staff: only see govt_staff items + Main Hub
    if (isGovtStaff) {
      return item.access === 'govt_staff' || item.href === '/';
    }

    // Retail / govt leadership: full nav minus org-type-exclusive items
    if (isRetailLeader || isGovtLeader) {
      if (item.access === 'retail_staff' || item.access === 'govt_staff') return false;
      if (item.access === 'all') return true;
      if (item.access === 'leadership') return true;
      return false;
    }

    // Default facility behavior
    if (item.access === 'retail_staff' || item.access === 'govt_staff') return false;
    if (item.access === 'all') return true;
    if (item.access === 'leadership') return isLeadership;
    return false;
  });
}

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const { userRole, logout } = useAuth();
  const { isAdmin } = useTier();

  const orgType   = localStorage.getItem('nexum_org_type') || 'facility';
  const role      = userRole || 'employee';

  const allLeadershipRoles = [
    ...FACILITY_LEADERSHIP,
    ...RETAIL_LEADERSHIP,
    ...GOVT_LEADERSHIP,
    'admin',
  ];
  const isLeadership = allLeadershipRoles.includes(role);

  const { can } = useTier();
  const visibleItems = getVisibleItems(role, orgType, isLeadership, isAdmin, can);

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
          {visibleItems.map((item, idx) => {
            if (item.type === 'separator') {
              return (
                <div key={`sep-${item.name}-${idx}`} className="px-3 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {!collapsed && item.name}
                  </h3>
                </div>
              );
            }
            if (item._locked) {
              // Show locked items dimmed — click goes to pricing to upgrade
              const Icon = item.icon!;
              return (
                <NavLink
                  key={item.href || item.name}
                  to="/pricing"
                  icon={item.icon!}
                  collapsed={collapsed}
                  className="opacity-40 hover:opacity-60"
                >
                  {item.name}
                  {!collapsed && item.tier && <TierBadge feature={item.tier} />}
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.href || item.name}
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
