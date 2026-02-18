
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

  Users

} from 'lucide-react';

import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { getRoleAccess } from '@/config/roleAccess';

// Icon mapping for role-based nav
const iconMap: Record<string, any> = {
  'Main Hub': Home,
  'Command Hub': Command,
  'Work Orders': ClipboardList,
  'Violations': AlertTriangle,
  'Messages': MessageSquare,
  'Kanban': Columns3,
  'Emergency': AlertOctagon,
  'Vendors': Building2,
  'Calendar': Calendar,
  'Workflows': Workflow,
  'Workload': Users,
  'Settings': Settings,
  'Equipment Intelligence': Camera,
  'Facility Data Source': Upload,
  'Equipment Metrics': Activity,
  'Compliance Logger': ShieldCheck,
  'Facility Intelligence': BarChart3,
  'Energy Dashboard': BarChart3,
  'Executive Dashboard': LayoutDashboard,
  'Manager Dashboard': LayoutDashboard,
  'Supervisor Dashboard': LayoutDashboard,
  'Employee Dashboard': LayoutDashboard,
  'Performance Compass': Database,
};

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  
  // Get effective role (simulated or real)
  const simulatedRole = localStorage.getItem('simulated_role');
  const effectiveRole = simulatedRole || user?.role || 'operator';
  const roleAccess = getRoleAccess(effectiveRole);
  
  // Build navigation from role access
  let navigation = roleAccess.navItems.map(item => ({
    name: item.label,
    href: item.path,
    icon: iconMap[item.label] || Database
  }));
  
  // Add Command Hub sub-items based on permissions
  const commandHubIndex = navigation.findIndex(item => item.name === 'Command Hub');
  if (commandHubIndex !== -1) {
    const hubItems = [];
    
    if (roleAccess.commandHubAccess.workOrders) {
      hubItems.push({ name: 'Work Orders', href: '/work-orders', icon: ClipboardList });
    }
    if (roleAccess.commandHubAccess.violations) {
      hubItems.push({ name: 'Violations', href: '/violations', icon: AlertTriangle });
    }
    if (roleAccess.commandHubAccess.messages) {
      hubItems.push({ name: 'Messages', href: '/messages', icon: MessageSquare });
    }
    if (roleAccess.commandHubAccess.emergency) {
      hubItems.push({ name: 'Emergency', href: '/emergency', icon: AlertOctagon });
    }
    if (roleAccess.commandHubAccess.kanban) {
      hubItems.push({ name: 'Kanban', href: '/kanban', icon: Columns3 });
    }
    if (roleAccess.commandHubAccess.calendar) {
      hubItems.push({ name: 'Calendar', href: '/calendar', icon: Calendar });
    }
    if (roleAccess.commandHubAccess.vendors) {
      hubItems.push({ name: 'Vendors', href: '/vendors', icon: Building2 });
    }
    if (roleAccess.commandHubAccess.workflows) {
      hubItems.push({ name: 'Workflows', href: '/workflows', icon: Workflow });
    }
    if (roleAccess.commandHubAccess.workload) {
      hubItems.push({ name: 'Workload', href: '/workload', icon: Users });
    }
    if (roleAccess.commandHubAccess.settings) {
      hubItems.push({ name: 'Settings', href: '/settings', icon: Settings });
    }
    
    // Insert hub items after Command Hub
    navigation = [
      ...navigation.slice(0, commandHubIndex + 1),
      ...hubItems,
      ...navigation.slice(commandHubIndex + 1)
    ];
  }

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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`separator-${index}`} className="pt-4 pb-2">
                {!collapsed && (
                  <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {item.name}
                  </p>
                )}
                {collapsed && <div className="h-px bg-sidebar-border mx-2" />}
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-2"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-primary"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
