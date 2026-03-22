import { useState, useRef, useEffect } from 'react';
import { Search, User, ChevronDown, Menu, X, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationBell } from '@/components/global/NotificationBell';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'equipment' | 'workorder' | 'vendor' | 'violation';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const typeLabel: Record<string, string> = {
  equipment:  '⚙️',
  workorder:  '📋',
  vendor:     '🏢',
  violation:  '⚠️',
};

export function Header() {
  const navigate   = useNavigate();
  const { logout, user } = useAuth();
  const { collapsed, toggle } = useSidebar();

  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Click outside to close results
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token   = localStorage.getItem('nexum_access_token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const headers = { Authorization: `Bearer ${token}` };
        const q       = encodeURIComponent(value);

        const [eqRes, woRes] = await Promise.allSettled([
          fetch(`${baseUrl}/equipment?facility_id=${user?.facilityId}&search=${q}`, { headers }),
          fetch(`${baseUrl}/work-orders?search=${q}`, { headers }),
        ]);

        const newResults: SearchResult[] = [];

        if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
          const data = await eqRes.value.json();
          (data.equipment || data.items || []).slice(0, 4).forEach((eq: any) => {
            newResults.push({
              type: 'equipment',
              id: eq.equipmentId,
              title: eq.equipmentName || eq.equipmentId,
              subtitle: `${eq.equipmentType} · ${eq.location || ''}`,
              href: '/equipment-library',
            });
          });
        }

        if (woRes.status === 'fulfilled' && woRes.value.ok) {
          const data = await woRes.value.json();
          (data.workOrders || data.items || []).slice(0, 4).forEach((wo: any) => {
            newResults.push({
              type: 'workorder',
              id: wo.workOrderId || wo.id,
              title: wo.title || wo.description || 'Work Order',
              subtitle: `${wo.status} · ${wo.priority || ''}`,
              href: '/kanban',
            });
          });
        }

        setResults(newResults);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setQuery('');
    setShowResults(false);
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Staff';

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
          {collapsed
            ? <Menu className="w-5 h-5" />
            : <><X className="w-5 h-5 md:hidden" /><Menu className="w-5 h-5 hidden md:block" /></>
          }
        </Button>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xl hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
          <Input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search equipment, work orders, vendors..."
            className="pl-10 pr-10 bg-muted/50 border-border/50 focus:border-primary w-full"
          />

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {results.map(result => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-base">{typeLabel[result.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground capitalize">{result.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && query.length >= 2 && results.length === 0 && !searching && (
            <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="w-5 h-5" />
        </Button>

        {/* Notification bell — real data */}
        <NotificationBell />

        {/* System status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <span className="status-dot status-dot-success" />
          <span className="text-xs font-medium text-muted-foreground">Systems Online</span>
        </div>

        {/* User menu — real user info */}
        <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-sm font-medium truncate max-w-[120px]">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
        </Button>

        <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
