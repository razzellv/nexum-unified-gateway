import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'alert' | 'violation' | 'workorder';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
  context?: string; // building or system context
}

export function NotificationBell() {
  const { currentRole } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const fetchNotifications = async () => {
    try {
      // Fetch from alert_logs (role-aware)
      const { data: alerts, error } = await supabase
        .from('alert_logs')
        .select('*')
        .eq('acknowledged', false)
        .order('triggered_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform alerts to notifications with role-appropriate filtering
      const transformedAlerts: Notification[] = (alerts || [])
        .filter(alert => {
          // Supervisors see all operational alerts
          if (currentRole === 'supervisor') return true;
          // Managers see warnings and critical only
          if (currentRole === 'manager') return alert.severity !== 'info';
          // Executives see only critical alerts
          if (currentRole === 'executive') return alert.severity === 'critical';
          return false;
        })
        .slice(0, 10)
        .map(alert => ({
          id: alert.id,
          type: 'alert' as const,
          title: `${alert.equipment_type.replace(/-/g, ' ')} Alert`,
          message: `${alert.metric_name}: ${alert.metric_value} exceeded threshold`,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          timestamp: new Date(alert.triggered_at),
          read: false,
          context: alert.equipment_id,
        }));

      setNotifications(transformedAlerts);
    } catch (error) {
      // Silently handle - notifications are non-critical
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-yellow-500 text-yellow-950';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                    !notification.read && 'bg-primary/5'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <Badge className={cn('mt-0.5', getSeverityColor(notification.severity))}>
                      {notification.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
