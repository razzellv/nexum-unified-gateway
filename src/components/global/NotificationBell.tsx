import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, ClipboardList, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'violation' | 'workorder' | 'compliance' | 'system';
  severity: 'critical' | 'warning' | 'info';
  read: boolean;
  timestamp: string;
}

const typeIcon: Record<string, any> = {
  violation:  AlertTriangle,
  workorder:  ClipboardList,
  compliance: ShieldAlert,
  system:     CheckCircle,
};

const typeColor: Record<string, string> = {
  violation:  'text-destructive',
  workorder:  'text-yellow-400',
  compliance: 'text-orange-400',
  system:     'text-primary',
};

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.facilityId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const [violationsRes, woRes] = await Promise.allSettled([
        fetch(`${baseUrl}/violations?facilityId=${user.facilityId}&limit=10&status=open`, { headers }),
        fetch(`${baseUrl}/work-orders?overdue=true&limit=5`, { headers }),
      ]);

      const notifs: Notification[] = [];

      if (violationsRes.status === 'fulfilled' && violationsRes.value.ok) {
        const data = await violationsRes.value.json();
        (data.violations || data.items || []).slice(0, 6).forEach((v: any) => {
          notifs.push({
            id: `v-${v.violationId || v.id}`,
            title: v.violationType?.replace(/_/g, ' ') || 'Violation',
            message: v.description || 'A violation was logged and requires attention.',
            type: 'violation',
            severity: v.severity >= 80 ? 'critical' : v.severity >= 50 ? 'warning' : 'info',
            read: false,
            timestamp: v.timestamp || v.createdAt || new Date().toISOString(),
          });
        });
      }

      if (woRes.status === 'fulfilled' && woRes.value.ok) {
        const data = await woRes.value.json();
        (data.workOrders || data.items || [])
          .filter((wo: any) => wo.dueDate && new Date(wo.dueDate) < new Date())
          .slice(0, 4)
          .forEach((wo: any) => {
            notifs.push({
              id: `wo-${wo.workOrderId || wo.id}`,
              title: 'Overdue Work Order',
              message: wo.title || wo.description || 'A work order is past its due date.',
              type: 'workorder',
              severity: 'warning',
              read: false,
              timestamp: wo.dueDate,
            });
          });
      }

      // Sort by timestamp desc
      notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(notifs);
    } catch (err) {
      console.error('NotificationBell fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read when dropdown opens
  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setTimeout(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }, 2000);
    }
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical' && !n.read).length;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold',
              criticalCount > 0
                ? 'bg-destructive text-white animate-pulse'
                : 'bg-warning text-black'
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
            <Button variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
              Mark all read
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">All clear — no notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = typeIcon[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors group',
                      !n.read && 'bg-accent/30'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', typeColor[n.type])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => dismiss(n.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
