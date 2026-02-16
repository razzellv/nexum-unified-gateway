import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmergencyCard } from '@/components/command-hub/emergency/EmergencyCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Phone, History } from 'lucide-react';
import { mockEmergencies } from '@/data/mockData';
import { DeclareEmergencyDialog } from '@/components/command-hub/dialogs/DeclareEmergencyDialog';
import { toast } from '@/hooks/use-toast';

const Emergency = () => {
  const [showDeclareEmergency, setShowDeclareEmergency] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>();
  
  const activeEmergencies = mockEmergencies.filter(e => e.status !== 'resolved');
  const resolvedEmergencies = mockEmergencies.filter(e => e.status === 'resolved');

  const handleEmergencyContacts = () => {
    toast({ title: 'Emergency Contacts', description: 'Opening emergency contact directory...' });
  };

  const handleHistory = () => {
    toast({ title: 'Emergency History', description: 'Loading emergency history records...' });
  };

  const handleQuickAction = (type: string) => {
    const typeMap: Record<string, string> = {
      'Fire': 'fire',
      'Flood': 'flood',
      'Power Loss': 'power-loss',
      'Chiller Fail': 'chiller-fail',
      'Boiler Lockout': 'boiler-lockout',
      'Production': 'production-shutdown',
      'Chemical Spill': 'chemical-spill'
    };
    setPreselectedType(typeMap[type]);
    setShowDeclareEmergency(true);
  };

  const handleViewProtocols = () => {
    toast({ title: 'Emergency Protocols', description: 'Opening emergency response protocols...' });
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className={`p-2 md:p-3 rounded-lg shrink-0 ${activeEmergencies.length > 0 ? 'bg-critical/20 animate-pulse' : 'bg-success/20'}`}>
                <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${activeEmergencies.length > 0 ? 'text-critical' : 'text-success'}`} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Emergency Command Center</h1>
                <p className="text-sm text-muted-foreground">
                  {activeEmergencies.length > 0 
                    ? `${activeEmergencies.length} active emergency` 
                    : 'All clear - No active emergencies'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Button variant="outline" size="sm" onClick={handleEmergencyContacts}>
                <Phone className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Emergency </span>Contacts
              </Button>
              <Button variant="outline" size="sm" onClick={handleHistory}>
                <History className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { setPreselectedType(undefined); setShowDeclareEmergency(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Declare Emergency
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4">
          {['🔥 Fire', '🌊 Flood', '⚡ Power Loss', '❄️ Chiller Fail', '🔥 Boiler Lockout', '🏭 Production', '☢️ Chemical Spill'].map((type) => (
            <Button 
              key={type} 
              variant="outline" 
              className="h-auto py-3 md:py-4 justify-start"
              onClick={() => handleQuickAction(type.split(' ').slice(1).join(' '))}
            >
              <span className="text-lg md:text-xl mr-2">{type.split(' ')[0]}</span>
              <span className="text-xs md:text-sm truncate">{type.split(' ').slice(1).join(' ')}</span>
            </Button>
          ))}
        </div>

        {/* Active Emergencies */}
        {activeEmergencies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Active Emergencies</h2>
              <Badge variant="destructive" className="animate-pulse">
                {activeEmergencies.length}
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {activeEmergencies.map((emergency) => (
                <EmergencyCard key={emergency.id} emergency={emergency} />
              ))}
            </div>
          </div>
        )}

        {/* No Active Emergencies */}
        {activeEmergencies.length === 0 && (
          <div className="glass-panel p-8 md:p-12 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-success" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2">All Systems Normal</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              No active emergencies at this time. Monitor the dashboard for any incoming signals.
            </p>
            <Button variant="outline" onClick={handleViewProtocols}>
              View Emergency Protocols
            </Button>
          </div>
        )}

        {/* Recent Emergencies */}
        {resolvedEmergencies.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Recently Resolved</h2>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {resolvedEmergencies.map((emergency) => (
                <EmergencyCard key={emergency.id} emergency={emergency} />
              ))}
            </div>
          </div>
        )}
      </div>

      <DeclareEmergencyDialog 
        open={showDeclareEmergency} 
        onOpenChange={setShowDeclareEmergency}
        preselectedType={preselectedType}
      />
    </MainLayout>
  );
};

export default Emergency;
