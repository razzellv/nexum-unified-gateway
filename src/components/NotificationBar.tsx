import { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "success" | "warning" | "critical" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "critical", title: "Equipment Alert", message: "Compressor unit #3 temperature exceeding threshold", timestamp: new Date(), read: false },
  { id: "2", type: "warning", title: "Compliance Due", message: "Annual inspection deadline in 3 days", timestamp: new Date(Date.now() - 3600000), read: false },
  { id: "3", type: "success", title: "Work Order Complete", message: "WO-2024-0892 marked as completed", timestamp: new Date(Date.now() - 7200000), read: true },
  { id: "4", type: "info", title: "System Update", message: "New features available in Equipment Intelligence", timestamp: new Date(Date.now() - 86400000), read: true },
];

export const NotificationBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasCritical = notifications.some(n => n.type === "critical" && !n.read);

  const getTypeConfig = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/20", border: "border-destructive/30" };
      case "warning":
        return { icon: AlertTriangle, color: "text-accent", bg: "bg-accent/20", border: "border-accent/30" };
      case "success":
        return { icon: CheckCircle, color: "text-primary", bg: "bg-primary/20", border: "border-primary/30" };
      default:
        return { icon: Info, color: "text-secondary", bg: "bg-secondary/20", border: "border-secondary/30" };
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative",
          hasCritical && "animate-pulse"
        )}
      >
        <Bell className={cn("w-5 h-5", hasCritical ? "text-destructive" : "text-foreground")} />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center",
            hasCritical ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
          )}>
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          "absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)]",
          "rounded-xl overflow-hidden",
          "bg-card/95 backdrop-blur-2xl",
          "border border-border/50",
          "shadow-[0_0_40px_hsl(168_92%_55%/0.2)]",
          "animate-fade-in-up z-50"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              System Alerts
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Mark all read
            </Button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.map(notification => {
              const config = getTypeConfig(notification.type);
              const Icon = config.icon;
              
              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "p-4 border-b border-border/30 cursor-pointer",
                    "hover:bg-muted/30 transition-colors",
                    !notification.read && "bg-muted/20"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn("p-2 rounded-lg", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "font-medium text-sm",
                          !notification.read && "text-foreground",
                          notification.read && "text-muted-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary pulse-glow" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground/60 mt-2 block">
                        {notification.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
