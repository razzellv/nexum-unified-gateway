import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Wrench, ShieldAlert, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRole } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

function getToken() {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

function getFacilityId() {
  // Try to decode from stored token claims or fall back to default
  try {
    const token = getToken();
    if (!token) return 'facility-001';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['custom:facilityId'] || 'facility-001';
  } catch {
    return 'facility-001';
  }
}

interface Notification {
  id:        string;
  type:      'violation' | 'workorder' | 'alert';
  title:     string;
  message:   string;
  severity:  'info' | 'warning' | 'critical';
  timestamp: Date;
  read:      boolean;
  category?: string;
}

function severityFromScore(score: number): 'info' | 'warning' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 40) return 'warning';
  return 'info';
}

function severityColors(s: 'info' | 'warning' | 'critical') {
  if (s === 'critical') return 'bg-destructive/20 text-destructive border-destructive/30';
  if (s === 'warning')  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-muted/50 text-muted-foreground border-border';
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  if (type === 'violation') return <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />;
  if (type === 'workorder') return <Wrench className="w-4 h-4 flex-shrink-0 mt-0.5" />;
  return <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />;
}

export function NotificationBell() {
  const { currentRole } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen]               = useState(false);
  const [loading, setLoading]             = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);

    try {
      const facilityId = getFacilityId();

      // ── Fetch violations ────────────────────────────────────────────────
      const vRes = await fetch(`${API_BASE}/violations?facilityId=${facilityId}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const violationNotifs: Notification[] = [];

      if (vRes.ok) {
        const vData = await vRes.json();
        const violations = vData.violations || [];

        // Role-aware filtering
        const filtered = violations.filter((v: any) => {
          const sev = severityFromScore(v.severityScore || v.severity || 0);
          if (currentRole === 'executive') return sev === 'critical';
          if (currentRole === 'manager')   return sev !== 'info';
          return true; // supervisor/admin sees all
        });

        filtered.slice(0, 15).forEach((v: any) => {
          if (v.acknowledged || v.resolved) return;
          const sev = severityFromScore(v.severityScore || v.severity || 0);
          const operatorName = typeof v.operator === 'object'
            ? v.operator?.name
            : (v.operator || v.operatorId || 'Unknown');

          violationNotifs.push({
            id:        v.violationId || v.id,
            type:      'violation',
            title:     `${v.type?.replace(/_/g, ' ')} — ${v.category || 'Compliance'}`,
            message:   v.description || `Violation by ${operatorName}`,
            severity:  sev,
            timestamp: new Date(v.timestamp || v.createdAt || Date.now()),
            read:      false,
            category:  v.category,
          });
        });
      }

      // ── Fetch open work orders ──────────────────────────────────────────
      const wRes = await fetch(`${API_BASE}/work-orders?facilityId=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const woNotifs: Notification[] = [];

      if (wRes.ok) {
        const wData = await wRes.json();
        const wos   = (wData.workOrders || []).filter((w: any) => w.status === 'open');

        // Only surface high/critical priority WOs as notifications
        wos
          .filter((w: any) => ['high', 'critical'].includes(w.priority))
          .slice(0, 5)
          .forEach((w: any) => {
            woNotifs.push({
              id:        w.workOrderId,
              type:      'workorder',
              title:     w.title || 'Open Work Order',
              message:   `Priority: ${w.priority} · ${w.equipmentName || w.equipmentId || ''}`,
              severity:  w.priority === 'critical' ? 'critical' : 'warning',
              timestamp: new Date(w.createdAt || Date.now()),
              read:      false,
            });
          });
      }

      // Merge, dedupe, sort newest first
      const all = [...violationNotifs, ...woNotifs]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);

      // Preserve read state from previous fetch
      setNotifications(prev => {
        const readIds = new Set(prev.filter(n => n.read).map(n => n.id));
        return all.map(n => ({ ...n, read: readIds.has(n.id) }));
      });

    } catch (err) {
      console.error('Notification fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const markAsRead    = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllAsRead = ()           => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {loading ? 'Loading...' : 'No active notifications'}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-muted/30 transition-colors',
                    !n.read && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-md border', severityColors(n.severity))}>
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {n.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <Badge variant="outline" className={cn('text-[10px] px-1 py-0', severityColors(n.severity))}>
                          {n.severity}
                        </Badge>
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground w-full"
              onClick={() => { setIsOpen(false); window.location.href = '/violations'; }}
            >
              View all in Violations & Accountability →
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
