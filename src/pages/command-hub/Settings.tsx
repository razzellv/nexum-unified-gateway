import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  User, Bell, Shield, Users, Zap, Database, Save,
  DollarSign, Flame, Lock, Eye, Plus, Trash2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ApprovalsTab } from '@/components/settings/ApprovalsTab';

const ADMIN_ROLES = ['admin'];
const EXECUTIVE_ROLES = ['admin', 'executive'];
const LEADERSHIP_ROLES = ['admin', 'executive', 'manager', 'supervisor'];
const ALL_ROLES = ['admin', 'executive', 'manager', 'supervisor', 'engineer', 'operator', 'technician', 'custodian'];

function can(userRole: string, roles: string[]) {
  return roles.includes(userRole?.toLowerCase());
}

const ALL_TABS = [
  { id: 'profile',       label: 'Profile',         icon: User,       access: ALL_ROLES },
  { id: 'notifications', label: 'Notifications',    icon: Bell,       access: ALL_ROLES },
  { id: 'security',      label: 'Security',         icon: Shield,     access: ALL_ROLES },
  { id: 'team',          label: 'Team & Roles',     icon: Users,      access: LEADERSHIP_ROLES },
  { id: 'budget',        label: 'Budget',           icon: DollarSign, access: EXECUTIVE_ROLES },
  { id: 'utilities',     label: 'Utility Rates',    icon: Flame,      access: EXECUTIVE_ROLES },
  { id: 'approvals',     label: 'Approvals',        icon: Shield,     access: EXECUTIVE_ROLES },
  { id: 'integration',   label: 'Integrations',     icon: Zap,        access: ADMIN_ROLES },
  { id: 'data',          label: 'Data & Backup',    icon: Database,   access: ADMIN_ROLES },
];

const DEPT_DEFAULTS = ['Maintenance', 'Energy', 'Procurement', 'Operations', 'Safety & Compliance'];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userRole = user?.role?.toLowerCase() || 'employee';

  const visibleTabs = ALL_TABS.filter(t => can(userRole, t.access));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || 'profile');

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [budgetData, setBudgetData] = useState<any>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [deptBudgets, setDeptBudgets] = useState<any[]>([]);
  const [utilities, setUtilities] = useState({ electricRate: '0.18', gasRate: '1.52', waterRate: '15.07' });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (activeTab === 'budget' || activeTab === 'utilities') fetchBudget();
    if (activeTab === 'team') fetchTeam();
  }, [activeTab]);

  const fetchBudget = async () => {
    setBudgetLoading(true);
    try {
      const res = await fetch(`${baseUrl}/onboarding/utilities`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUtilities({ electricRate: String(data.electricRate || '0.18'), gasRate: String(data.gasRate || '1.52'), waterRate: String(data.waterRate || '15.07') });
        if (data.budget) {
          setBudgetData(data.budget);
          setDeptBudgets(data.budget.departments || DEPT_DEFAULTS.map(d => ({ department: d, annualBudget: '', monthlyBudget: '' })));
        } else {
          setDeptBudgets(DEPT_DEFAULTS.map(d => ({ department: d, annualBudget: '', monthlyBudget: '' })));
        }
      }
    } catch (err) { console.error(err); } finally { setBudgetLoading(false); }
  };

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTeamMembers(data.users || []); }
    } catch (err) { console.error(err); } finally { setTeamLoading(false); }
  };

  const saveBudget = async () => {
    try {
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...utilities, facilityId: user?.facilityId, budget: { ...(budgetData || {}), departments: deptBudgets.filter(d => d.department) } }),
      });
      toast({ title: 'Budget saved' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
  };

  const saveUtilities = async () => {
    try {
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...utilities, facilityId: user?.facilityId }),
      });
      toast({ title: 'Utility rates saved' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
  };

  const updateDept = (i: number, field: string, value: string) => {
    const updated = [...deptBudgets];
    updated[i][field] = value;
    if (field === 'annualBudget' && value) updated[i].monthlyBudget = (parseFloat(value) / 12).toFixed(2);
    setDeptBudgets(updated);
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isReadOnly = (tab: string) => {
    if (tab === 'budget') return !can(userRole, EXECUTIVE_ROLES);
    if (tab === 'team') return !can(userRole, ADMIN_ROLES);
    return false;
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and system preferences
            {can(userRole, ADMIN_ROLES) && <Badge className="ml-2 text-xs bg-primary/20 text-primary">Admin</Badge>}
            {!can(userRole, ADMIN_ROLES) && can(userRole, EXECUTIVE_ROLES) && <Badge className="ml-2 text-xs bg-purple-500/20 text-purple-400">Executive</Badge>}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {visibleTabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    activeTab === tab.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                  {isReadOnly(tab.id) && <Eye className="w-3 h-3 ml-auto opacity-50" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 glass-panel p-4 md:p-6 min-w-0">

            {/* Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Profile Settings</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                    {initials(user?.name || user?.email || 'U')}
                  </div>
                  <div>
                    <p className="font-medium">{user?.name || user?.email}</p>
                    <Badge variant="outline" className="text-xs mt-1">{user?.role || 'employee'}</Badge>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={profile.email} disabled className="opacity-60" /></div>
                  <div className="space-y-2"><Label>Role</Label><Input value={user?.role || ''} disabled className="opacity-60" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
                </div>
                <Button onClick={() => toast({ title: 'Profile saved' })}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Notification Preferences</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Critical Signals', desc: 'Immediate alerts for critical system signals', enabled: true },
                    { label: 'Task Assignments', desc: 'When you are assigned to a task', enabled: true },
                    { label: 'Emergency Alerts', desc: 'All emergency declarations and updates', enabled: true },
                    { label: 'Vendor Responses', desc: 'When vendors respond to requests', enabled: can(userRole, LEADERSHIP_ROLES) },
                    { label: 'Weekly Summary', desc: 'Weekly digest of facility operations', enabled: false },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Button variant={item.enabled ? 'default' : 'outline'} size="sm" className="self-start sm:self-auto shrink-0">
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Security</h2>
                <div className="space-y-4">
                  <Card className="border-border/50"><CardContent className="p-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Password</p><p className="text-xs text-muted-foreground">Managed through Cognito — use forgot password to reset</p></div>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </CardContent></Card>
                  <Card className="border-border/50"><CardContent className="p-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Session</p><p className="text-xs text-muted-foreground">Tokens expire automatically — re-login required after 1 hour</p></div>
                    <Shield className="w-4 h-4 text-green-500" />
                  </CardContent></Card>
                </div>
              </div>
            )}

            {/* Team & Roles */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Team & Roles</h2>
                  {can(userRole, ADMIN_ROLES) && (
                    <Button size="sm" onClick={() => toast({ title: 'Invite via Onboarding', description: 'Use the onboarding wizard to invite new staff.' })}>
                      <Plus className="w-4 h-4 mr-1.5" />Add Member
                    </Button>
                  )}
                </div>
                {!can(userRole, ADMIN_ROLES) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4 shrink-0" />View only — contact your admin to make team changes
                  </div>
                )}
                {teamLoading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No team members found. Add staff through the onboarding wizard.</div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member: any) => (
                      <div key={member.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {initials(member.name || member.email)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                          <Badge className={`text-xs ${member.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {member.status || 'invited'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Budget */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Budget Configuration</h2>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Executive Access</Badge>
                </div>
                {budgetLoading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <Card className="border-border/50">
                      <CardHeader className="pb-3"><CardTitle className="text-sm">Annual Facility Budget</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label>Total Annual Budget ($)</Label>
                            <Input type="number" value={budgetData?.annualTotal || ''} onChange={e => setBudgetData({ ...(budgetData || {}), annualTotal: e.target.value })} placeholder="e.g., 500000" />
                            {budgetData?.annualTotal && <p className="text-xs text-muted-foreground">Monthly: ${(parseFloat(budgetData.annualTotal) / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} / mo</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Fiscal Year Start</Label>
                            <Select value={budgetData?.fiscalYearStart || 'January'} onValueChange={v => setBudgetData({ ...(budgetData || {}), fiscalYearStart: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Track Budget vs Actuals</Label>
                            <Select value={budgetData?.trackActuals ? 'yes' : 'no'} onValueChange={v => setBudgetData({ ...(budgetData || {}), trackActuals: v === 'yes' })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes — enabled</SelectItem>
                                <SelectItem value="no">No — disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Department Budgets</CardTitle>
                          <Button variant="outline" size="sm" onClick={() => setDeptBudgets([...deptBudgets, { department: '', annualBudget: '', monthlyBudget: '' }])}>
                            <Plus className="w-3.5 h-3.5 mr-1" />Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {deptBudgets.map((dept, i) => (
                          <div key={i} className="grid grid-cols-5 gap-2 items-end">
                            <div className="col-span-2 space-y-1"><Label className="text-xs">Department</Label><Input value={dept.department} onChange={e => updateDept(i, 'department', e.target.value)} placeholder="e.g., Maintenance" /></div>
                            <div className="space-y-1"><Label className="text-xs">Annual ($)</Label><Input type="number" value={dept.annualBudget} onChange={e => updateDept(i, 'annualBudget', e.target.value)} placeholder="0" /></div>
                            <div className="space-y-1"><Label className="text-xs">Monthly ($)</Label><Input type="number" value={dept.monthlyBudget} onChange={e => updateDept(i, 'monthlyBudget', e.target.value)} placeholder="Auto" /></div>
                            <Button variant="ghost" size="icon" onClick={() => setDeptBudgets(deptBudgets.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Button onClick={saveBudget}><Save className="w-4 h-4 mr-2" />Save Budget</Button>
                  </>
                )}
              </div>
            )}

            {/* Utility Rates */}
            {activeTab === 'utilities' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Utility Rates</h2>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Executive Access</Badge>
                </div>
                <Card className="border-border/50"><CardContent className="p-6 space-y-5">
                  <div className="space-y-2"><Label>Electric Rate ($/kWh)</Label><Input type="number" step="0.001" value={utilities.electricRate} onChange={e => setUtilities({ ...utilities, electricRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $0.18/kWh</p></div>
                  <div className="space-y-2"><Label>Natural Gas Rate ($/therm)</Label><Input type="number" step="0.01" value={utilities.gasRate} onChange={e => setUtilities({ ...utilities, gasRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $1.52/therm</p></div>
                  <div className="space-y-2"><Label>Water Rate ($/1,000 gallons)</Label><Input type="number" step="0.01" value={utilities.waterRate} onChange={e => setUtilities({ ...utilities, waterRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $15.07/1,000 gal</p></div>
                </CardContent></Card>
                <Button onClick={saveUtilities}><Save className="w-4 h-4 mr-2" />Save Utility Rates</Button>
              </div>
            )}

            {/* ── Approvals (executive/admin only) ── */}
            {activeTab === 'approvals' && <ApprovalsTab />}

            {/* Integrations */}
            {activeTab === 'integration' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Integrations</h2>
                <div className="space-y-3">
                  {[
                    { name: 'Stripe Billing', desc: 'Payment processing and subscription management', status: 'connected' },
                    { name: 'AWS Cognito', desc: 'Authentication and user management', status: 'connected' },
                    { name: 'Claude AI', desc: 'VVFI Instructor, compliance narratives, photo analysis', status: 'connected' },
                    { name: 'S3 Storage', desc: 'Audit report and document storage', status: 'connected' },
                  ].map((int) => (
                    <div key={int.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{int.name}</p><p className="text-xs text-muted-foreground">{int.desc}</p></div>
                      <Badge className={int.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>{int.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data & Backup */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Data & Backup</h2>
                <div className="space-y-3">
                  {[
                    { label: 'DynamoDB Tables', desc: '19 tables — AuditReports, EquipmentLibrary, FacilityLogs, WorkOrders...', status: 'healthy' },
                    { label: 'S3 Buckets', desc: 'nexumsuum-audit-reports — audit PDFs and images', status: 'healthy' },
                    { label: 'Lambda Functions', desc: '20+ functions — all active in us-east-2', status: 'healthy' },
                    { label: 'Data Export', desc: 'Export facility data as CSV or JSON', status: 'available' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Badge className={item.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
