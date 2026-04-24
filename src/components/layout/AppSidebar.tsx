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
  GraduationCap, ShoppingCart, Shield, ClipboardCheck, BookOpen, Briefcase, HardHat, Compass, FileText, Wrench} from "lucide-react";
import { externalApps } from '@/config/systeme';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { TierBadge } from '@/components/global/TierGate';
import { useTier } from '@/hooks/useTier';
import type { TierFeature } from '@/config/tiers';
import { ROLES_BY_ORG_TYPE } from '@/config/roles';

// ── Role sets ────────────────────────────────────────────────────────────────
const FACILITY_LEADERSHIP    = ROLES_BY_ORG_TYPE.facility.leadership;
const RETAIL_STAFF           = ROLES_BY_ORG_TYPE.retail.staff;
const RETAIL_LEADERSHIP      = ROLES_BY_ORG_TYPE.retail.leadership;
const GOVT_STAFF             = ROLES_BY_ORG_TYPE.government.staff;
const GOVT_LEADERSHIP        = ROLES_BY_ORG_TYPE.government.leadership;
const SERVICE_TECH_STAFF     = ROLES_BY_ORG_TYPE.service_tech.staff;
const SERVICE_TECH_LEADERSHIP = ROLES_BY_ORG_TYPE.service_tech.leadership;
// Legacy facility staff definition
const FACILITY_STAFF         = ROLES_BY_ORG_TYPE.facility.staff;

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
  { name: 'Retail Intelligence', href: '/retail-intelligence', icon: BarChart3, access: 'leadership', tier: 'retail_inventory', orgTypes: ['retail'] },
  { name: 'Gov / Public Safety', href: '/government-dashboard', icon: Shield, access: 'all', tier: 'retail_inventory', orgTypes: ['government'] },
  { name: 'Property & Fleet', href: '/property-dashboard', icon: Building2, access: 'all', tier: 'retail_inventory', orgTypes: ['property', 'entrepreneur'] },
  { name: 'Equipment Systems', href: '/equipment-systems', icon: Network, access: 'leadership' },
  { name: 'Compliance Logger', href: '/compliance-logger', icon: ShieldCheck, access: 'all', tier: 'compliance_logging' },

  { type: 'separator', name: 'Dashboards', access: 'all' },
  { name: 'Unified Dashboard', href: '/dashboard', icon: LayoutDashboard, access: 'leadership', tier: 'basic_dashboards' },
  { name: 'Operation Center', href: '/employee-dashboard', icon: Users, access: 'all', tier: 'operations_center' },
  { name: 'Optimize & Learn', href: '/optimize-learn', icon: GraduationCap, access: 'leadership', tier: 'lms' },
  { name: 'Energy Dashboard', href: '/dashboard/energy', icon: BarChart3, access: 'leadership', tier: 'energy_dashboard' },
  { name: 'Executive Dashboard', href: '/dashboard/executive', icon: TrendingUp, access: 'leadership', tier: 'executive_dashboard' },
  { name: 'Manager Dashboard', href: '/dashboard/manager', icon: LayoutDashboard, access: 'leadership', tier: 'manager_dashboard' },
  { name: 'Supervisor Dashboard', href: '/dashboard/supervisor', icon: Gauge, access: 'leadership', tier: 'supervisor_dashboard' },

  // Leadership tools
  { name: 'Equipment History',    href: '/historical-data',        icon: BarChart3, access: 'leadership', tier: 'energy_dashboard' },
  { name: 'Contractor Installs',  href: '/contractor-installs',    icon: HardHat,   access: 'leadership' },
  { name: 'Efficiency Report',    href: '/org-efficiency-report',  icon: FileText,  access: 'leadership', tier: 'audit_report' },

  // Vendor portal — vendor role only
  { type: 'separator', name: 'Vendor Portal', access: 'vendor' },
  { name: 'My Dashboard', href: '/vendor-dashboard', icon: Wrench, access: 'vendor' },

  // Service Tech portal — service_tech org type
  { type: 'separator', name: 'Service Operations', access: 'service_tech' },
  { name: 'Service Dashboard', href: '/service-tech', icon: Wrench, access: 'service_tech' },
  { name: 'Service Analytics', href: '/service-tech-analytics', icon: BarChart3, access: 'service_tech' },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, access: 'service_tech' },
  { name: 'Vendors', href: '/vendors', icon: Building2, access: 'service_tech' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, access: 'service_tech' },

  // Nexum Suum internal tools — admin only
  { type: 'separator', name: 'Nexum Internal', access: 'admin_only' },
  { name: 'FIAS',            href: '/fias',           icon: ClipboardCheck, access: 'admin_only' },
  { name: 'Policy Guide',    href: '/policy-guide',   icon: BookOpen,       access: 'admin_only' },
  { name: 'Platform Guide',  href: '/platform-guide', icon: BookOpen,       access: 'all' },
  { name: 'Workspace',       href: '/workspace',      icon: Briefcase,      access: 'admin_only' },
  { name: 'Facility Compass', href: '__fc_launch__',  icon: Compass,        access: 'admin_only' },
];

// ── Nav visibility logic ─────────────────────────────────────────────────────
function getVisibleItems(
  role: string,
  orgType: string,
  isLeadership: boolean,
  isAdmin: boolean,
): NavItem[] {
  const isRetailStaff      = orgType === 'retail'       && RETAIL_STAFF.includes(role);
  const isRetailLeader     = orgType === 'retail'       && RETAIL_LEADERSHIP.includes(role);
  const isGovtStaff        = orgType === 'government'   && GOVT_STAFF.includes(role);
  const isGovtLeader       = orgType === 'government'   && GOVT_LEADERSHIP.includes(role);
  const isServiceTech      = orgType === 'service_tech' || SERVICE_TECH_STAFF.includes(role) || SERVICE_TECH_LEADERSHIP.includes(role);

  // Active purchased add-on modules (persist across tier upgrades)
  let activeModules: string[] = [];
  try { activeModules = JSON.parse(localStorage.getItem('nexum_active_modules') || '[]'); } catch { /* ignore */ }
  const hasRetailModule    = activeModules.includes('addon_retail');
  const hasGovtModule      = activeModules.includes('addon_govt');
  const hasPropertyModule  = activeModules.includes('addon_property') || orgType === 'property' || orgType === 'entrepreneur';

  const isVendor = role === 'vendor';

  // Vendor role: only sees vendor portal items + Main Hub
  if (isVendor) {
    return allNavItems.filter(item =>
      item.access === 'vendor' || item.href === '/'
    );
  }

  // Service tech org/role: only sees service_tech items + Main Hub
  if (isServiceTech && !isAdmin) {
    return allNavItems.filter(item =>
      item.access === 'service_tech' || item.href === '/'
    );
  }

  return allNavItems.filter(item => {
    // Vendor-only items — never shown to non-vendors
    if (item.access === 'vendor') return false;

    // Service-tech-only items — never shown to non-service-tech (except admin)
    if (item.access === 'service_tech') return isAdmin;

    // Admin-only items (e.g. FIAS) — never shown to non-admins
    if (item.access === 'admin_only') return isAdmin;

    // Org-type filter — admin sees all org dashboards; others only see their own
    // Exception: if user purchased the Retail/Govt add-on module, show those dashboards regardless of org type
    if (item.orgTypes && item.orgTypes.length > 0) {
      if (isAdmin) { /* admin always sees all */ }
      else if (item.orgTypes.includes('retail')                         && hasRetailModule)   { /* add-on purchased */ }
      else if (item.orgTypes.includes('government')                     && hasGovtModule)    { /* add-on purchased */ }
      else if ((item.orgTypes.includes('property') || item.orgTypes.includes('entrepreneur')) && hasPropertyModule) { /* add-on purchased */ }
      else if (!item.orgTypes.includes(orgType)) return false;
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
    ...SERVICE_TECH_LEADERSHIP,
    'admin',
  ];
  const isLeadership = allLeadershipRoles.includes(role);

  const visibleItems = getVisibleItems(role, orgType, isLeadership, isAdmin);

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 h-full",
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
            if (item.href === '__fc_launch__') {
              return (
                <button
                  key="fc-launch"
                  onClick={() => {
                    const app = externalApps.find(a => a.id === 'facility-compass');
                    const token = localStorage.getItem('nexum_id_token') || '';
                    const facilityId = localStorage.getItem('nexum_facility_id') || '';
                    if (app?.url) {
                      window.open(
                        `${app.url}?token=${token}&facilityId=${facilityId}&source=nexum-gateway`,
                        '_blank'
                      );
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Compass className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">Facility Compass</span>}
                </button>
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
