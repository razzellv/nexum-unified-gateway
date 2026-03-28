import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, X, Bell, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export interface ActiveEmergency {
  id: string;
  type: string;
  typeLabel: string;
  description: string;
  declaredBy: string;
  declaredByName: string;
  declaredAt: string;
  facilityId: string;
  severity: 'critical' | 'high' | 'medium';
  status: 'active' | 'resolved';
  acknowledgments: { userId: string; name: string; role: string; timestamp: string }[];
  totalStaff: number;
}

const STORAGE_KEY = 'nexum_active_emergencies';
const ACK_KEY = 'nexum_emergency_acks';

export function useEmergencyBroadcast() {
  const [activeEmergency, setActiveEmergency] = useState<ActiveEmergency | null>(null);

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const emergencies: ActiveEmergency[] = JSON.parse(stored);
        const active = emergencies.find(e => e.status === 'active');
        setActiveEmergency(active || null);
      }
    };
    load();
    // Poll every 5 seconds for new emergencies
    const interval = setInterval(load, 5000);
    window.addEventListener('storage', load);
    return () => { clearInterval(interval); window.removeEventListener('storage', load); };
  }, []);

  const declareEmergency = (type: string, typeLabel: string, description: string, user: any, facilityId: string) => {
    const emergency: ActiveEmergency = {
      id: `emergency-${Date.now()}`,
      type, typeLabel, description,
      declaredBy: user?.id || user?.sub || 'unknown',
      declaredByName: user?.name || user?.email || 'Unknown',
      declaredAt: new Date().toISOString(),
      facilityId: facilityId || user?.facilityId || 'facility-001',
      severity: 'critical',
      status: 'active',
      acknowledgments: [],
      totalStaff: 20,
    };
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([emergency, ...existing]));
    setActiveEmergency(emergency);
    window.dispatchEvent(new Event('storage'));
    return emergency;
  };

  const acknowledgeEmergency = (emergencyId: string, user: any) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const emergencies: ActiveEmergency[] = JSON.parse(stored);
    const updated = emergencies.map(e => {
      if (e.id !== emergencyId) return e;
      const alreadyAcked = e.acknowledgments.find(a => a.userId === (user?.id || user?.sub));
      if (alreadyAcked) return e;
      const newAck = { userId: user?.id || user?.sub || 'unknown', name: user?.name || user?.email || 'Unknown', role: user?.role || 'operator', timestamp: new Date().toISOString() };
      return { ...e, acknowledgments: [...e.acknowledgments, newAck] };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    const updatedEmergency = updated.find(e => e.id === emergencyId);
    setActiveEmergency(updatedEmergency || null);
    window.dispatchEvent(new Event('storage'));
  };

  const resolveEmergency = (emergencyId: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const emergencies: ActiveEmergency[] = JSON.parse(stored);
    const updated = emergencies.map(e => e.id === emergencyId ? { ...e, status: 'resolved' as const } : e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setActiveEmergency(null);
    window.dispatchEvent(new Event('storage'));
  };

  return { activeEmergency, declareEmergency, acknowledgeEmergency, resolveEmergency };
}

// ── GLOBAL EMERGENCY POPUP ────────────────────────────────────────────────────
export function EmergencyBroadcastPopup() {
  const { user } = useAuth();
  const { activeEmergency, acknowledgeEmergency, resolveEmergency } = useEmergencyBroadcast();
  const [dismissed, setDismissed] = useState(false);

  const userId = user?.id || user?.sub || '';
  const hasAcknowledged = activeEmergency?.acknowledgments.find(a => a.userId === userId);
  const isLeadership = ['manager','supervisor','director','executive','admin'].includes(user?.role || '');
  const ackCount = activeEmergency?.acknowledgments.length || 0;
  const ackPct = activeEmergency?.totalStaff ? Math.round((ackCount / activeEmergency.totalStaff) * 100) : 0;

  if (!activeEmergency || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Red header */}
        <div className="bg-red-500 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">EMERGENCY DECLARED</p>
            <p className="text-red-100 text-sm">{activeEmergency.facilityId} · {new Date(activeEmergency.declaredAt).toLocaleTimeString()}</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 animate-pulse">ACTIVE</Badge>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold mb-1">{activeEmergency.typeLabel}</p>
            <p className="text-muted-foreground text-sm">Declared by {activeEmergency.declaredByName}</p>
          </div>

          {activeEmergency.description && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm leading-relaxed">{activeEmergency.description}</p>
            </div>
          )}

          {/* Acknowledgment progress — visible to leadership */}
          {isLeadership && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Team Acknowledgments</span>
                <span className="text-xs font-bold text-primary">{ackCount} / {activeEmergency.totalStaff} ({ackPct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${ackPct}%` }} />
              </div>
              {activeEmergency.acknowledgments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeEmergency.acknowledgments.slice(0, 5).map(a => (
                    <Badge key={a.userId} variant="outline" className="text-[10px] border-green-400/30 text-green-400">
                      <CheckCircle className="w-2.5 h-2.5 mr-1" />{a.name.split(' ')[0]}
                    </Badge>
                  ))}
                  {activeEmergency.acknowledgments.length > 5 && (
                    <Badge variant="outline" className="text-[10px]">+{activeEmergency.acknowledgments.length - 5} more</Badge>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!hasAcknowledged ? (
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                onClick={() => acknowledgeEmergency(activeEmergency.id, user)}>
                <CheckCircle className="w-4 h-4 mr-2" />Acknowledge Emergency
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 border-green-400/30 text-green-400" disabled>
                <CheckCircle className="w-4 h-4 mr-2" />Acknowledged
              </Button>
            )}
            {isLeadership && (
              <Button variant="outline" className="border-border/50" onClick={() => resolveEmergency(activeEmergency.id)}>
                <Shield className="w-4 h-4 mr-2" />Resolve
              </Button>
            )}
          </div>

          {hasAcknowledged && !isLeadership && (
            <button onClick={() => setDismissed(true)} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 pt-1">
              <X className="w-3 h-3" />Dismiss (emergency still active)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EMERGENCY NOTIFICATION PANEL (for managers/admins) ───────────────────────
export function EmergencyAckPanel({ emergencyId }: { emergencyId: string }) {
  const [emergency, setEmergency] = useState<ActiveEmergency | null>(null);

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const all: ActiveEmergency[] = JSON.parse(stored);
        setEmergency(all.find(e => e.id === emergencyId) || null);
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [emergencyId]);

  if (!emergency) return null;

  const ackPct = emergency.totalStaff ? Math.round((emergency.acknowledgments.length / emergency.totalStaff) * 100) : 0;

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border/30 bg-card/50">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Acknowledgment Status</p>
        <Badge variant="outline" className={cn('text-xs', ackPct >= 80 ? 'border-green-400/30 text-green-400' : ackPct >= 50 ? 'border-yellow-400/30 text-yellow-400' : 'border-red-500/30 text-red-500')}>
          {ackPct}% acknowledged
        </Badge>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${ackPct}%` }} />
      </div>
      <div className="space-y-1.5">
        {emergency.acknowledgments.map(a => (
          <div key={a.userId} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-400" />{a.name}</span>
            <span className="text-muted-foreground capitalize">{a.role} · {new Date(a.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        {emergency.acknowledgments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No acknowledgments yet</p>}
      </div>
    </div>
  );
}
