import { cn } from '@/lib/utils';
import { systemHealthData } from '@/data/mockData';

export function SystemHealthChart() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'critical': return 'bg-critical';
      default: return 'bg-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success/20';
      case 'warning': return 'bg-warning/20';
      case 'critical': return 'bg-critical/20';
      default: return 'bg-muted/20';
    }
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="text-lg font-semibold mb-4">System Health Overview</h3>
      <div className="space-y-4">
        {systemHealthData.map((item, index) => (
          <div key={item.system} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{item.system}</span>
              <span className={cn(
                "text-sm font-bold",
                item.status === 'success' && "text-success",
                item.status === 'warning' && "text-warning",
                item.status === 'critical' && "text-critical"
              )}>
                {item.health}%
              </span>
            </div>
            <div className={cn("h-2 rounded-full overflow-hidden", getStatusBg(item.status))}>
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", getStatusColor(item.status))}
                style={{ width: `${item.health}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
