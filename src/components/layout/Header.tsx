import { Bell, Search, User, ChevronDown, Menu, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockSignals } from '@/data/mockData';
import { useSidebar } from '@/contexts/SidebarContext';

export function Header() {
  const navigate = useNavigate();

  const { logout, user } = useAuth();

  const handleLogout = () => {

    logout();

    navigate('/login');

  };
  const { collapsed, toggle } = useSidebar();
  const unacknowledgedSignals = mockSignals.filter(s => !s.acknowledged).length;
  const criticalSignals = mockSignals.filter(s => s.severity === 'critical' && !s.acknowledged).length;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left section with menu toggle */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          className="shrink-0"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5 md:hidden" />}
          {!collapsed && <Menu className="w-5 h-5 hidden md:block" />}
        </Button>
        
        {/* Search - hidden on mobile */}
        <div className="relative flex-1 max-w-xl hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks, vendors, emergencies..." 
            className="pl-10 bg-muted/50 border-border/50 focus:border-primary w-full"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="w-5 h-5" />
        </Button>

        {/* Signals indicator */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/messages')} />
          {unacknowledgedSignals > 0 && (
            <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
              criticalSignals > 0 ? 'bg-critical text-critical-foreground animate-pulse' : 'bg-warning text-warning-foreground'
            }`}>
              {unacknowledgedSignals}
            </span>
          )}
        </Button>

        {/* System status - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <span className="status-dot status-dot-success" />
          <span className="text-xs font-medium text-muted-foreground">Systems Online</span>
        </div>

        {/* User menu */}
        <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-sm font-medium truncate max-w-[120px]">Razzell Valentine</p>
            <p className="text-xs text-muted-foreground">Owner/Admin</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
        </Button>
      </div>
    </header>
  );
}
