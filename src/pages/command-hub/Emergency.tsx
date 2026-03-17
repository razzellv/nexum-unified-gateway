import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmergencyCard } from '@/components/command-hub/emergency/EmergencyCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Plus, Phone, History, RefreshCw, MapPin, Clock, User } from 'lucide-react';
import { DeclareEmergencyDialog } from '@/components/command-hub/dialogs/DeclareEmergencyDialog';
import { useToast } from '@/hooks/use-toast';

const Emergency = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeclareEmergency, setShowDeclareEmergency] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>();
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // Fetch violations for active alerts
      const vRes = await fetch(`${baseUrl}/violations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        const items = vData.violations || vData.items || [];
        // High severity violations become emergency alerts
        const critical = items.filter((v: any) =>
          v.severity >= 8 || v.status === 'active' || v.type?.includes('emergency') || v.type?.includes('safety')
        );
        setViolations(critical);
      }

      // Fetch work orders tagged as emergency
      const woRes = await fetch(`${baseUrl}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (woRes.ok) {
        const woData = await woRes.json();
        const wos = woData.workOrders || woData.items || [];
        const emergencyWOs = wos.filter((wo: any) =>
          wo.priority === 'critical' || wo.type === 'emergency' || wo.category === 'emergency'
        );
        setEmergencies(emergencyWOs);
      }
    } catch (err) {
      console.error('Emergency fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (type: string) => {
    const typeMap: Record<string, string> = {
      'Fire': 'fire', 'Flood': 'flood', 'Power Loss': 'power-loss',
      'Chiller Fail': 'chiller-fail', 'Boiler Lockout': 'boiler-lockout',
      'Production': 'production-shutdown', 'Chemical Spill': 'chemical-spill'
    };
    setPreselectedType(typeMap[type]);
    setShowDeclareEmergency(true);
  };

  const activeCount = violations.length + emergencies.filter(e => e.status !== 'completed').length;

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Emergency Management
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeCount > 0
                ? <span className="text-red-400 font-medium">{activeCount} active alert{activeCount > 1 ? 's' : ''}</span>
                : <span className="text-green-400">No active emergencies</span>
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: 'Emergency Contacts', description: 'Opening contact directory...' })}>
              <Phone className="w-4 h-4 mr-2" />Contacts
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeclareEmergency(true)}>
              <Plus className="w-4 h-4 mr-2" />Declare Emergency
            </Button>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {['Fire','Flood','Power Loss','Chiller Fail','Boiler Lockout','Production','Chemical Spill'].map(type => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(type)}
              className="text-xs border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-400"
            >
              {type}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Active critical violations */}
            {violations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Critical Safety Violations ({violations.length})
                </h2>
                {violations.map((v: any, i: number) => (
                  <Card key={i} className="border-red-500/30 bg-red-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{v.violationType || v.type || 'Safety Violation'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{v.description || v.notes || ''}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            {v.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</span>}
                            {v.operatorId && <span className="flex items-center gap-1"><User className="w-3 h-3" />{v.operatorId}</span>}
                            {v.timestamp && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(v.timestamp).toLocaleString()}</span>}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Severity {v.severity || '!'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Critical work orders */}
            {emergencies.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Critical Work Orders ({emergencies.length})
                </h2>
                {emergencies.map((wo: any, i: number) => (
                  <Card key={i} className="border-orange-500/30 bg-orange-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{wo.title || wo.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{wo.reason || ''}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            {wo.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{wo.location}</span>}
                            {wo.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" />{wo.assignedTo}</span>}
                            {wo.createdAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(wo.createdAt).toLocaleString()}</span>}
                          </div>
                        </div>
                        <Badge className="text-xs shrink-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {wo.status || 'open'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* All clear state */}
            {violations.length === 0 && emergencies.length === 0 && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-green-400">All Clear</h3>
                  <p className="text-sm text-muted-foreground mt-1">No active emergencies or critical violations</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {showDeclareEmergency && (
        <DeclareEmergencyDialog
          open={showDeclareEmergency}
          preselectedType={preselectedType}
          onOpenChange={(o) => { if (!o) { setShowDeclareEmergency(false); setPreselectedType(undefined); fetchData(); } }}
        />
      )}
    </MainLayout>
  );
};

export default Emergency;
