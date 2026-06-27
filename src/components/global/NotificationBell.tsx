import { useState, useEffect, useCallback } from 'react';
import { useSupplyAlerts } from '@/lib/useSupplyAlerts';
import { Bell, AlertTriangle, ClipboardList, ShieldAlert, CheckCircle, X, MessageSquare, Clock, Siren } from 'lucide-react';
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
  type: 'emergency' | 'violation' | 'workorder' | 'deadline' | 'message' | 'compliance' | 'system';
  severity: 'critical' | 'warning' | 'info';
  read: boolean;
  timestamp: string;
  link?: string;
}

const typeIcon: Record<string, any> = {
  emergency:  Siren,
  violation:  AlertTriangle,
  workorder:  ClipboardList,
  deadline:   Clock,
  message:    MessageSquare,
  compliance: ShieldAlert,
  system:     CheckCircle,
};

const typeColor: Record<string, string> = {
  emergency:  'text-red-400',
  violation:  'text-destructive',
  deadline:   'text-orange-400',
  workorder:  'text-yellow-400',
  message:    'text-blue-400',
  compliance: 'text-orange-400',
  system:     'text-primary',
};

const severityBorder: Record<string, string> = {
  critical: 'border-l-2 border-l-red-500',
  warning:  'border-l-2 border-l-yellow-500',
  info:     '',
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
      const now = Date.now();
      const h48 = now + 48 * 60 * 60 * 1000; // 48 hrs from now
      const h24ago = now - 24 * 60 * 60 * 1000; // 24 hrs ago

      const [violationsRes, woRes, messagesRes] = await Promise.allSettled([
        fetch(`${baseUrl}/violations?facilityId=${user.facilityId}&limit=15&status=open`, { headers }),
        fetch(`${baseUrl}/work-orders?limit=30`, { headers }),
        fetch(`${baseUrl}/messages?facilityId=${user.facilityId}&unread=true&limit=10`, { headers }),
      ]);

      const notifs: Notification[] = [];

      // ── Violations: emergency (critical >=80) + standard violations ──
      if (violationsRes.status === 'fulfilled' && violationsRes.value.ok) {
        const data = await violationsRes.value.json();
        (data.violations || data.items || []).slice(0, 10).forEach((v: any) => {
          const score = v.severity || v.score || 0;
          const isCritical = score >= 80;
          notifs.push({
            id: `v-${v.violationId || v.id}`,
            title: isCritical ? `Emergency: ${v.violationType?.replace(/_/g, ' ') || 'Critical Violation'}` : (v.violationType?.replace(/_/g, ' ') || 'Violation'),
            message: v.description || 'A violation was logged and requires immediate attention.',
            type: isCritical ? 'emergency' : 'violation',
            severity: isCritical ? 'critical' : score >= 50 ? 'warning' : 'info',
            read: false,
            timestamp: v.timestamp || v.createdAt || new Date().toISOString(),
            link: '/violations',
          });
        });
      }

      // ── Work Orders: new (last 24h) + approaching deadlines (next 48h) + overdue ──
      if (woRes.status === 'fulfilled' && woRes.value.ok) {
        const data = await woRes.value.json();
        const wos: any[] = data.workOrders || data.items || [];

        wos.forEach((wo: any) => {
          const created = wo.createdAt || wo.created_at;
          const due = wo.dueDate;
          const isNew = created && new Date(created).getTime() >= h24ago;
          const dueTs = due ? new Date(due).getTime() : null;
          const isOverdue = dueTs && dueTs < now;
          const isApproaching = dueTs && !isOverdue && dueTs <= h48;

          if (isOverdue) {
            notifs.push({
              id: `wo-overdue-${wo.workOrderId || wo.id}`,
              title: 'Overdue Work Order',
              message: `${wo.title || wo.description || 'Work order'} — was due ${new Date(due).toLocaleDateString()}`,
              type: 'workorder',
              severity: 'warning',
              read: false,
              timestamp: due,
              link: '/work-orders',
            });
          } else if (isApproaching) {
            const hoursLeft = Math.round((dueTs - now) / 3600000);
            notifs.push({
              id: `wo-deadline-${wo.workOrderId || wo.id}`,
              title: 'Deadline Approaching',
              message: `${wo.title || 'Work order'} due in ~${hoursLeft}h`,
              type: 'deadline',
              severity: hoursLeft <= 12 ? 'critical' : 'warning',
              read: false,
              timestamp: wo.createdAt || new Date().toISOString(),
              link: '/work-orders',
            });
          } else if (isNew && wo.status !== 'completed') {
            notifs.push({
              id: `wo-new-${wo.workOrderId || wo.id}`,
              title: 'New Work Order',
              message: `${wo.title || 'New work order'} — ${wo.priority || 'Normal'} priority`,
              type: 'workorder',
              severity: wo.priority?.toLowerCase() === 'critical' ? 'critical' : wo.priority?.toLowerCase() === 'high' ? 'warning' : 'info',
              read: false,
              timestamp: created,
              link: '/work-orders',
            });
          }
        });
      }

      // ── Messages: unread messages ──
      if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
        const data = await messagesRes.value.json();
        (data.messages || data.items || []).slice(0, 5).forEach((msg: any) => {
          notifs.push({
            id: `msg-${msg.messageId || msg.id}`,
            title: `Message from ${msg.senderName || msg.sender || 'Team'}`,
            message: msg.subject || msg.body?.slice(0, 80) || 'New unread message',
            type: 'message',
            severity: 'info',
            read: false,
            timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
            link: '/messages',
          });
        });
      }

      // ── Inventory: low stock check ──
      try {
        const invRes = await fetch(`${baseUrl}/inventory?facilityId=${user.facilityId}&limit=100`, { headers });
        if (invRes.ok) {
          const invData = await invRes.json();
          const items: any[] = invData.items || invData.inventory || [];
          items.forEach((item: any) => {
            const qty = Number(item.quantity ?? item.qty ?? 0);
            const min = Number(item.minQuantity ?? item.minQty ?? item.reorderPoint ?? 0);
            if (min > 0 && qty <= min) {
              notifs.push({
                id: `inv-low-${item.itemId || item.id || item.partNumber}`,
                title: 'Low Stock Alert',
                message: `${item.name || item.itemName || item.partNumber || 'Item'} — ${qty} remaining (min: ${min})`,
                type: 'compliance',
                severity: qty === 0 ? 'critical' : 'warning',
                read: false,
                timestamp: new Date().toISOString(),
                link: '/inventory-library',
              });
            }
          });
        }
      } catch { /* best-effort */ }

      // Sort: emergencies first, then by timestamp desc
      notifs.sort((a, b) => {
        if (a.type === 'emergency' && b.type !== 'emergency') return -1;
        if (b.type === 'emergency' && a.type !== 'emergency') return 1;
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Restore read state from localStorage
      const readIds = new Set<string>(JSON.parse(localStorage.getItem('nexum_notif_read') || '[]'));
      const merged = notifs.slice(0, 25).map(n => ({ ...n, read: readIds.has(n.id) }));
      setNotifications(merged);
      localStorage.setItem('nexum_notifications', JSON.stringify(merged));
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

  const markRead = (ids: string[]) => {
    setNotifications(prev => {
      const updated = prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n);
      const allReadIds = updated.filter(n => n.read).map(n => n.id);
      localStorage.setItem('nexum_notif_read', JSON.stringify(allReadIds));
      localStorage.setItem('nexum_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setTimeout(() => {
        const ids = notifications.filter(n => !n.read).map(n => n.id);
        if (ids.length) markRead(ids);
      }, 3000);
    }
  };

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (n: Notification) => {
    if (n.link) window.location.href = n.link;
  };

  // Supply alerts — localStorage-based, no tick needed (bell re-renders on dropdown open)
  const supplyAlerts = useSupplyAlerts();
  const supplyAlertCount = supplyAlerts.length;

  const unreadCount = notifications.filter(n => !n.read).length + supplyAlertCount;
  const emergencyCount = notifications.filter(n => n.type === 'emergency' && !n.read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical' && !n.read).length + supplyAlerts.filter(a => a.severity === 'critical').length;

  const groupLabel: Record<string, string> = {
    emergency: 'Emergencies',
    deadline: 'Deadlines',
    violation: 'Violations',
    workorder: 'Work Orders',
    message: 'Messages',
    compliance: 'Compliance',
    system: 'System',
  };

  // Group notifications by type for display
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const g = n.type === 'emergency' ? 'emergency' : n.type;
    if (!acc[g]) acc[g] = [];
    acc[g].push(n);
    return acc;
  }, {});

  const typeOrder = ['emergency', 'deadline', 'violation', 'workorder', 'message', 'compliance', 'system'];

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold',
              emergencyCount > 0
                ? 'bg-red-500 text-white animate-pulse'
                : criticalCount > 0
                ? 'bg-destructive text-white animate-pulse'
                : 'bg-yellow-500 text-black'
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {emergencyCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 animate-pulse">
                {emergencyCount} emergency
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            )}
            <Button variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => markRead(notifications.map(n => n.id))}>
              Mark all read
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[380px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">All clear — no notifications</p>
            </div>
          ) : (
            <div>
              {typeOrder.filter(g => grouped[g]?.length).map(group => (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-y border-border/30">
                    {groupLabel[group]} ({grouped[group].length})
                  </div>
                  {grouped[group].map((n) => {
                    const Icon = typeIcon[n.type] || Bell;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={cn(
                          'flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors group cursor-pointer',
                          !n.read && 'bg-accent/20',
                          severityBorder[n.severity],
                        )}
                      >
                        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', typeColor[n.type])} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium leading-tight', !n.read && 'text-foreground')}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {(() => {
                              const d = new Date(n.timestamp);
                              return isNaN(d.getTime()) ? '' : d.toLocaleString();
                            })()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => dismiss(n.id, e)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
