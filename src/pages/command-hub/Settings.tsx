import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Bell, Shield, Users, Zap, Database, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'team', label: 'Team & Roles', icon: Users },
    { id: 'integration', label: 'Integrations', icon: Zap },
    { id: 'data', label: 'Data & Backup', icon: Database }
  ];

  const teamMembers = [
    { name: 'Razzell Valentine', email: 'razzellv@nexumsuum.com', role: 'Owner/Admin', status: 'active' },
    { name: 'Mike Johnson', email: 'mjohnson@facility.com', role: 'Supervisor', status: 'active' },
    { name: 'Sarah Chen', email: 'schen@facility.com', role: 'Technician', status: 'active' },
    { name: 'David Park', email: 'dpark@facility.com', role: 'Technician', status: 'active' },
    { name: 'Tom Wilson', email: 'twilson@facility.com', role: 'Technician', status: 'active' }
  ];

  const handleSave = () => toast({ title: 'Settings Saved', description: 'Your changes have been saved successfully.' });
  const handleAddTeamMember = () => toast({ title: 'Add Team Member', description: 'Feature connected to backend' });
  const handleConfigure = () => toast({ title: 'Configure', description: 'Feature connected to backend' });

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div><h1 className="text-xl md:text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Manage your account and system preferences</p></div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar - Horizontal scroll on mobile */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0", activeTab === tab.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 glass-panel p-4 md:p-6 min-w-0">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base md:text-lg font-semibold mb-4">Profile Settings</h2>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 mb-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/20 flex items-center justify-center text-xl md:text-2xl font-bold text-primary shrink-0">RV</div>
                    <Button variant="outline" size="sm">Change Avatar</Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium mb-2 block">Full Name</label><Input defaultValue="Razzell Valentine" /></div>
                    <div><label className="text-sm font-medium mb-2 block">Email</label><Input defaultValue="razzellv@nexumsuum.com" /></div>
                    <div><label className="text-sm font-medium mb-2 block">Role</label><Input defaultValue="Owner/Admin" disabled /></div>
                    <div><label className="text-sm font-medium mb-2 block">Phone</label><Input defaultValue="(555) 000-0000" /></div>
                  </div>
                  <Button className="mt-6" onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base md:text-lg font-semibold">Team & Roles</h2>
                  <Button size="sm" onClick={handleAddTeamMember}>Add Team Member</Button>
                </div>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs md:text-sm font-medium text-primary shrink-0">{member.name.split(' ').map(n => n[0]).join('')}</div>
                        <div className="min-w-0"><p className="font-medium text-sm truncate">{member.name}</p><p className="text-xs text-muted-foreground truncate">{member.email}</p></div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 ml-11 sm:ml-0">
                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        <span className="status-dot status-dot-success" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Notification Preferences</h2>
                <div className="space-y-3 md:space-y-4">
                  {[
                    { label: 'Critical Signals', desc: 'Immediate alerts for critical system signals', enabled: true },
                    { label: 'Task Assignments', desc: 'When you are assigned to a task', enabled: true },
                    { label: 'Emergency Alerts', desc: 'All emergency declarations and updates', enabled: true },
                    { label: 'Vendor Responses', desc: 'When vendors respond to requests', enabled: true },
                    { label: 'Weekly Summary', desc: 'Weekly digest of facility operations', enabled: false }
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 md:p-4 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Button variant={item.enabled ? 'default' : 'outline'} size="sm" className="self-start sm:self-auto shrink-0">{item.enabled ? 'Enabled' : 'Disabled'}</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'security' || activeTab === 'integration' || activeTab === 'data') && (
              <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {activeTab === 'security' && <Shield className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                  {activeTab === 'integration' && <Zap className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                  {activeTab === 'data' && <Database className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">Configure your {activeTab} preferences and options.</p>
                <Button variant="outline" onClick={handleConfigure}>Configure</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
