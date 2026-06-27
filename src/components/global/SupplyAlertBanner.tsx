import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SupplyAlert } from '@/lib/useSupplyAlerts';

interface Props {
  alerts: SupplyAlert[];
  onDismiss: () => void;
}

export function SupplyAlertBanner({ alerts, onDismiss }: Props) {
  const navigate = useNavigate();

  const critical = alerts.filter(a => a.severity === 'critical');
  const low      = alerts.filter(a => a.severity === 'low');

  const handlePurchaseOrder = () => {
    navigate('/work-orders?type=purchase_order');
    onDismiss();
  };

  const handleAssignVendor = () => {
    navigate('/vendors');
    onDismiss();
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[380px] max-h-[400px]',
        'flex flex-col rounded-lg border shadow-2xl',
        'bg-card border-amber-500/40',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/30 bg-amber-500/10 rounded-t-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-300">
            Supply Alert — {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onDismiss}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Critical section */}
        {critical.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border-b border-red-500/20">
              Critical ({critical.length})
            </div>
            {critical.map(alert => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Low stock section */}
        {low.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border-b border-amber-500/20">
              Low Stock ({low.length})
            </div>
            {low.map(alert => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t border-border/50 rounded-b-lg bg-card">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white"
          onClick={handlePurchaseOrder}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Create Purchase Order
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1.5 border-border/60"
          onClick={handleAssignVendor}
        >
          <Users className="w-3.5 h-3.5" />
          Assign Vendor
        </Button>
      </div>
    </div>
  );
}

// ── Single alert row ──────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: SupplyAlert }) {
  const isCritical = alert.severity === 'critical';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.itemName}</p>
        <p className="text-[11px] text-muted-foreground truncate">{alert.location}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[11px] font-semibold',
            isCritical
              ? 'bg-red-500/20 text-red-300'
              : 'bg-amber-500/20 text-amber-300',
          )}
        >
          {alert.currentQty} / {alert.minQty} min
        </span>
        <span className="text-[10px] text-muted-foreground">{alert.unit}</span>
      </div>
    </div>
  );
}
