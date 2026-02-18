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

const navigation = [
  { name: 'Main Hub', href: '/', icon: Home },
  { name: 'Command Hub', href: '/command-hub', icon: Command },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
  { name: 'Violations', href: '/violations', icon: AlertTriangle },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Kanban', href: '/kanban', icon: Columns3 },
  { name: 'Emergency', href: '/emergency', icon: AlertOctagon },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Workload', href: '/workload', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
  { 
    type: 'separator',
    name: 'Operations'
  },
  { name: 'Equipment Intelligence', href: '/equipment-intelligence', icon: Camera },
  { name: 'Facility Data Source', href: '/data-source', icon: Upload },
  { name: 'Equipment Metrics', href: '/equipment', icon: Activity },
  { name: 'Compliance Logger', href: '/compliance-logger', icon: ShieldCheck },
  { 
    type: 'separator',
    name: 'Dashboards'
  },
  { name: 'Facility Intelligence', href: '/facility-intelligence', icon: BarChart3 },
  { name: 'Energy Dashboard', href: '/dashboard/energy', icon: BarChart3 },
  { name: 'Executive Dashboard', href: '/dashboard/executive', icon: LayoutDashboard },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();

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
          {navigation.map((item) => {
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
                to={item.href}
                icon={item.icon}
                collapsed={collapsed}
              >
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
