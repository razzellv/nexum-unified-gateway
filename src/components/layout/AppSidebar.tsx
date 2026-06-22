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
  GraduationCap, ShoppingCart, Shield,
  Wrench, BrainCircuit, FlaskConical, Leaf, Briefcase, Rocket, BookOpen, LayoutGrid,
  Brain, Cpu, TrendingDown, Thermometer, Target, ClipboardCheck, Zap, UserCheck,
} from "lucide-react";
import { NavLink as RouterNavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { TierBadge } from '@/components/global/TierGate';
import { useTier } from '@/hooks/useTier';
import { useDevice } from '@/hooks/use-device';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  { name: 'Main Hub',          href: '/',                   icon: Home,    access: 'all' },
  { name: 'Onboarding Status', href: '/onboarding-status',  icon: Rocket,  access: 'all' },

  // ── Command Hub — AI-assisted operational execution ───────────────────────
  { type: 'separator', name: 'Command Hub', access: 'leadership' },
  { name: 'Command Hub',    href: '/command-hub',    icon: Command,       access: 'leadership' },
  { name: 'Work Orders',    href: '/work-orders',    icon: ClipboardList, access: 'leadership', tier: 'work_orders' },
  { name: 'Project Controls', href: '/project-controls', icon: Target,   access: 'leadership', tier: 'project_controls' },
  { name: 'Violations',     href: '/violations',     icon: AlertTriangle, access: 'leadership', tier: 'violations_tracking' },
  { name: 'Messages',       href: '/messages',       icon: MessageSquare, access: 'leadership', tier: 'messages' },
  { name: 'Kanban',         href: '/kanban',         icon: Columns3,      access: 'leadership', tier: 'kanban' },
  { name: 'Emergency',      href: '/emergency',      icon: AlertOctagon,  access: 'leadership' },
  { name: 'Vendors',        href: '/vendors',        icon: Building2,     access: 'leadership', tier: 'vendors' },
  { name: 'Calendar',       href: '/calendar',       icon: Calendar,      access: 'leadership', tier: 'calendar' },
  { name: 'Workflows',      href: '/workflows',      icon: Workflow,      access: 'leadership', tier: 'operations_center' },
  { name: 'Workload',       href: '/workload',       icon: Users,         access: 'leadership', tier: 'workload' },
  { name: 'Settings',       href: '/settings',       icon: Settings,      access: 'leadership' },

  // Retail-staff minimal nav
  { type: 'separator', name: 'My Work', access: 'retail_staff' },
  { name: 'Checklist',  href: '/employee-dashboard', icon: ClipboardList, access: 'retail_staff' },
  { name: 'Inventory',  href: '/inventory-library',  icon: Boxes,         access: 'retail_staff', tier: 'inventory_library' },
  { name: 'Violations', href: '/violations',          icon: AlertTriangle, access: 'retail_staff', tier: 'violations_tracking' },

  // Govt-staff minimal nav
  { type: 'separator', name: 'My Work', access: 'govt_staff' },
  { name: 'Work Orders', href: '/work-orders',       icon: ClipboardList, access: 'govt_staff', tier: 'work_orders' },
  { name: 'Violations',  href: '/violations',        icon: AlertTriangle, access: 'govt_staff', tier: 'violations_tracking' },
  { name: 'Messages',    href: '/messages',          icon: MessageSquare, access: 'govt_staff', tier: 'messages' },
  { name: 'Personnel',   href: '/employee-dashboard',icon: Users,         access: 'govt_staff' },

  // ── Perception Layer™ — What is happening right now? ──────────────────────
  { type: 'separator', name: 'Perception Layer™', access: 'all' },
  { name: 'Observation Journal™',   href: '/observations',        icon: BookOpen,   access: 'all',        tier: 'compliance_logging' },
  { name: 'Equipment Intelligence™',href: '/equipment-intelligence', icon: Camera,  access: 'all' },
  { name: 'Facility Data Source™',  href: '/data-source',         icon: Upload,     access: 'all',        tier: 'facility_data_source' },
  { name: 'Compliance Logger™',     href: '/compliance-logger',   icon: ShieldCheck,access: 'all',        tier: 'compliance_logging' },
  { name: 'Climate Intelligence™',  href: '/climate-intelligence',icon: Thermometer,access: 'leadership' },
  { name: 'Energy Intelligence™',   href: '/dashboard/energy',    icon: Zap,        access: 'leadership', tier: 'energy_dashboard' },
  { name: 'Evidence Vault™',         href: '/evidence-board',      icon: LayoutGrid, access: 'all',        tier: 'compliance_logging' },

  // ── Memory Layer™ — What must never be forgotten? ─────────────────────────
  { type: 'separator', name: 'Memory Layer™', access: 'leadership' },
  { name: 'Facility Memory™',        href: '/facility-memory',        icon: Brain,     access: 'leadership', tier: 'facility_memory' },
  { name: 'Operational DNA™',        href: '/operational-dna',        icon: Cpu,       access: 'leadership', tier: 'operational_dna' },
  { name: 'Leadership Transition™',  href: '/leadership-transition',  icon: UserCheck, access: 'leadership' },

  // ── Integrity Layer™ — Can this information be trusted? ───────────────────
  { type: 'separator', name: 'Integrity Layer™', access: 'leadership' },
  { name: 'Event Integrity™',         href: '/event-integrity',       icon: ShieldCheck,  access: 'leadership', tier: 'event_integrity' },
  { name: 'Decision Continuity™ Vault',href: '/dc-vault',             icon: Shield,       access: 'leadership', tier: 'dc_vault' },
  { name: 'Decision Outcomes™',        href: '/decision-outcomes',    icon: ClipboardCheck,access: 'leadership', tier: 'decision_outcomes' },

  // ── Intelligence Layer™ — What does this mean? ────────────────────────────
  { type: 'separator', name: 'Intelligence Layer™', access: 'leadership' },
  { name: 'Operational Intelligence™', href: '/operational-intelligence', icon: BrainCircuit, access: 'leadership', tier: 'executive_dashboard' },
  { name: 'OCCAE™',                    href: '/occae',                    icon: BrainCircuit, access: 'leadership', tier: 'occae' },
  { name: 'Drift Intelligence™',       href: '/drift-intelligence',       icon: TrendingDown, access: 'leadership', tier: 'drift_intelligence' },
  { name: 'System Violations™',        href: '/system-violations',        icon: AlertOctagon, access: 'leadership', tier: 'system_violations' },
  { name: 'Continuity Intelligence™',  href: '/continuity-intelligence',  icon: Shield,       access: 'leadership', tier: 'continuity_intelligence' },

  // ── Decision Layer™ — What should we do? ─────────────────────────────────
  { type: 'separator', name: 'Decision Layer™', access: 'all' },
  { name: 'Executive Intelligence Center™',  href: '/dashboard/executive', icon: TrendingUp,     access: 'leadership', tier: 'executive_dashboard' },
  { name: 'Operations Intelligence Center™', href: '/dashboard/manager',   icon: LayoutDashboard,access: 'leadership', tier: 'manager_dashboard' },
  { name: 'Field Intelligence Center™',      href: '/dashboard/supervisor',icon: Gauge,          access: 'leadership', tier: 'supervisor_dashboard' },
  { name: 'Facility Intelligence',           href: '/facility-intelligence',icon: BarChart3,     access: 'leadership' },
  { name: 'Operation Center',                href: '/employee-dashboard',   icon: Users,          access: 'all',        tier: 'operations_center' },

  // ── Learning Layer™ — How do we become better? ────────────────────────────
  { type: 'separator', name: 'Learning Layer™', access: 'leadership' },
  { name: 'Optimize & Learn™',   href: '/optimize-learn', icon: GraduationCap, access: 'leadership', tier: 'lms' },
  { name: 'Facility Instructor™',href: '/instructor',     icon: MessageSquare, access: 'leadership', tier: 'vvfi' },

  // ── Toolkit — Reference & Configuration ───────────────────────────────────
  { type: 'separator', name: 'Toolkit', access: 'all' },
  { name: 'Equipment Library',     href: '/equipment-library',    icon: Package,    access: 'all',        tier: 'equipment_library' },
  { name: 'Equipment Metrics',     href: '/equipment',            icon: Activity,   access: 'all',        tier: 'equipment_metrics' },
  { name: 'Inventory Library',     href: '/inventory-library',    icon: Boxes,      access: 'all',        tier: 'inventory_library' },
  { name: 'Compliance Documents',  href: '/compliance-documents', icon: ShieldCheck,access: 'all',        tier: 'compliance_documents' },
  { name: 'Compliance Intelligence™', href: '/dashboard/compliance', icon: ShieldCheck, access: 'leadership' },
  { name: 'Equipment Systems',     href: '/equipment-systems',    icon: Network,    access: 'leadership' },
  { name: 'Chemical & Hazmat',     href: '/inventory-library',    icon: FlaskConical,access: 'leadership', tier: 'inventory_library', orgTypes: ['facility', 'government'] },
  { name: 'OSHA 300 Log',          href: '/osha-300',             icon: ClipboardList,access: 'leadership',tier: 'compliance_logging', orgTypes: ['facility', 'government'] },
  { name: 'Environmental',         href: '/environmental',        icon: Leaf,       access: 'leadership', tier: 'compliance_logging', orgTypes: ['facility', 'government'] },
  { name: 'Consulting Services',   href: '/consulting',           icon: Briefcase,  access: 'leadership' },
  { name: 'Retail Dashboard',      href: '/retail-dashboard',     icon: ShoppingCart,access: 'all',       tier: 'retail_inventory',   orgTypes: ['retail'] },
  { name: 'Gov / Public Safety',   href: '/government-dashboard', icon: Shield,     access: 'all',        tier: 'retail_inventory',   orgTypes: ['government'] },

  // ── Nexum Internal (admin only) ───────────────────────────────────────────
  { type: 'separator', name: 'Nexum Internal', access: 'admin_only' },
  { name: 'Workspace',            href: '/nexum-workspace',      icon: LayoutDashboard, access: 'admin_only' },
  { name: 'Implementation Guide', href: '/implementation-guide', icon: Rocket,          access: 'admin_only' },
  { name: 'FIAS Assessment',      href: '/fias',                 icon: Activity,        access: 'admin_only' },
  { name: 'Contractor Installs',  href: '/contractor-installs',  icon: Wrench,          access: 'admin_only' },
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
  const { collapsed, setCollapsed } = useSidebar();
  const { userRole, logout } = useAuth();
  const { isAdmin } = useTier();
  const device = useDevice();

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

  const renderNavItem = (item: NavItem, idx: number) => {
    if (item.type === 'separator') {
      return (
        <div key={`sep-${item.name}-${idx}`} className={cn('px-3 pt-4 pb-2', collapsed && 'px-0 pt-3 pb-1')}>
          {collapsed
            ? <div className="h-px bg-sidebar-border/50 mx-2" />
            : <h3 className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">{item.name}</h3>
          }
        </div>
      );
    }

    const href   = item._locked ? '/pricing' : item.href!;
    const locked = !!item._locked;
    const itemKey = item.href || item.name || String(idx);

    if (collapsed && item.name) {
      return (
        <Tooltip key={itemKey} delayDuration={200}>
          <TooltipTrigger asChild>
            <RouterNavLink
              to={href}
              onClick={() => { if (device === 'mobile') setCollapsed(true); }}
              className={({ isActive }) => cn(
                'flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-colors',
                locked && 'opacity-40',
                isActive && !locked
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
            </RouterNavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.name}
            {locked && ' (upgrade required)'}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <RouterNavLink
        key={itemKey}
        to={href}
        onClick={() => { if (device === 'mobile') setCollapsed(true); }}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          locked && 'opacity-40',
          isActive && !locked
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
        <span className="flex-1 truncate">{item.name}</span>
        {item.tier && <TierBadge feature={item.tier} />}
      </RouterNavLink>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16 overflow-hidden" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-sidebar-border shrink-0', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Command className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col ml-3 min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">Nexum Suum</span>
            <span className="text-xs text-primary font-medium truncate">Facility Intelligence™</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item, idx) => renderNavItem(item, idx))}
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        {collapsed ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
