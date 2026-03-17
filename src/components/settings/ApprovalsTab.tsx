// src/components/settings/ApprovalsTab.tsx
// Drop this into Settings.tsx as the 'approvals' tab — executive/admin only

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  CheckCircle, XCircle, Clock, Shield, Eye, Edit,
  RefreshCw, User, AlertTriangle, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Permission definitions ────────────────────────────────────────────────────
const MANAGER_PERMISSIONS = [
  { id: 'wo_create',       label: 'Create Work Orders',         description: 'Create new WOs for any equipment', category: 'work_orders' },
  { id: 'wo_close',        label: 'Close Work Orders',          description: 'Mark WOs as completed',            category: 'work_orders' },
  { id: 'wo_assign',       label: 'Assign Work Orders',         description: 'Assign WOs to staff members',      category: 'work_orders' },
  { id: 'vendor_approve',  label: 'Approve Vendor Spend',       description: 'Approve vendor invoices up to $5k',category: 'financial' },
  { id: 'budget_view',     label: 'View Full Budget',           description: 'See complete budget breakdown',    category: 'financial' },
  { id: 'staff_invite',    label: 'Invite Staff Members',       description: 'Send onboarding invites',          category: 'team' },
  { id: 'staff_edit',      label: 'Edit Staff Roles',           description: 'Change role assignments',          category: 'team' },
  { id: 'violation_log',   label: 'Log Violations',             description: 'Create compliance violations',     category: 'compliance' },
  { id: 'violation_close', label: 'Close Violations',           description: 'Mark violations as resolved',      category: 'compliance' },
  { id: 'report_export',   label: 'Export Reports',             description: 'Download facility reports',        category: 'reporting' },
  { id: 'equipment_edit',  label: 'Edit Equipment Records',     description: 'Update equipment library entries', category: 'equipment' },
  { id: 'inventory_edit',  label: 'Edit Inventory',             description: 'Adjust inventory quantities',      category: 'inventory' },
];

const CATEGORY_LABELS: Record<string, string> = {
  work_orders: 'Work Orders',
  financial:   'Financial',
  team:        'Team Management',
  compliance:  'Compliance',
  reporting:   'Reporting',
  equipment:   'Equipment',
  inventory:   'Inventory',
};

interface PermissionState {
  [userId: string]: {
    [permId: string]: 'approved' | 'denied' | 'pending';
  };
}

interface ApprovalRequest {
  id: string;
  userId: string;
  userName: string;
  permissionId: string;
  requestedAt: string;
  reason?: string;
}

export function ApprovalsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchTeamAndPermissions();
  }, []);

  const fetchTeamAndPermissions = async () => {
    setLoading(true);
    try {
      // Fetch team members
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const managers = (data.users || []).filter((u: any) =>
          ['manager', 'supervisor'].includes(u.role?.toLowerCase())
        );
        setTeamMembers(managers);
        if (managers.length > 0 && !selectedUser) {
          setSelectedUser(managers[0].sub || managers[0].userId);
        }

        // Load permissions from FacilitySettings
        const pRes = await fetch(`${baseUrl}/onboarding/utilities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          setPermissions(pData.managerPermissions || {});
          setPendingRequests(pData.pendingApprovals || []);
        }
      }
    } catch (err) {
      console.error('Approvals fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPermState = (userId: string, permId: string): 'approved' | 'denied' | 'pending' => {
    return permissions[userId]?.[permId] || 'denied';
  };

  const togglePerm = (userId: string, permId: string) => {
    const current = getPermState(userId, permId);
    const next = current === 'approved' ? 'denied' : 'approved';
    setPermissions(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [permId]: next },
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      // Save to FacilitySettings
      const settingsRes = await fetch(`${baseUrl}/onboarding/utilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const existing = settingsRes.ok ? await settingsRes.json() : {};

      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...existing,
          facilityId: user?.facilityId,
          managerPermissions: permissions,
          permissionsUpdatedAt: new Date().toISOString(),
          permissionsUpdatedBy: user?.name || user?.email,
        }),
      });
      toast({ title: 'Permissions saved', description: 'Manager access updated successfully.' });
    } catch (err) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const approveRequest = (req: ApprovalRequest) => {
    setPermissions(prev => ({
      ...prev,
      [req.userId]: { ...(prev[req.userId] || {}), [req.permissionId]: 'approved' },
    }));
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    toast({ title: 'Request approved', description: `${req.userName} now has "${MANAGER_PERMISSIONS.find(p => p.id === req.permissionId)?.label}"` });
  };

  const denyRequest = (req: ApprovalRequest) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    toast({ title: 'Request denied' });
  };

  const selectedMember = teamMembers.find(m => (m.sub || m.userId) === selectedUser);
  const categories = [...new Set(MANAGER_PERMISSIONS.map(p => p.category))];
  const approvedCount = selectedUser
    ? MANAGER_PERMISSIONS.filter(p => getPermState(selectedUser, p.id) === 'approved').length
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Manager & Supervisor Approvals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Control what managers and supervisors can view and edit</p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-400 text-xs">Executive Control</Badge>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Pending Access Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{req.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    Requesting: {MANAGER_PERMISSIONS.find(p => p.id === req.permissionId)?.label}
                    {req.reason && ` — "${req.reason}"`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => approveRequest(req)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => denyRequest(req)}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {teamMembers.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No managers or supervisors found.</p>
            <p className="text-xs mt-1">Add staff via onboarding or Settings → Team.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User selector */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Select Manager / Supervisor</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.sub || m.userId} value={m.sub || m.userId}>
                      {m.name || m.email} — {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMember && (
              <div className="pt-5">
                <Badge variant="outline" className="text-xs">
                  {approvedCount}/{MANAGER_PERMISSIONS.length} permissions active
                </Badge>
              </div>
            )}
          </div>

          {/* Permission matrix by category */}
          {selectedUser && categories.map(cat => (
            <Card key={cat} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MANAGER_PERMISSIONS.filter(p => p.category === cat).map(perm => {
                  const state = getPermState(selectedUser, perm.id);
                  return (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          state === 'approved' ? 'bg-green-500/20' : 'bg-muted/50'
                        }`}>
                          {state === 'approved'
                            ? <Edit className="w-3.5 h-3.5 text-green-400" />
                            : <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePerm(selectedUser, perm.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                          state === 'approved' ? 'bg-green-500' : 'bg-muted'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                          state === 'approved' ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Button onClick={savePermissions} disabled={saving} className="w-full">
            {saving
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              : <><Shield className="w-4 h-4 mr-2" />Save Permission Changes</>
            }
          </Button>
        </>
      )}
    </div>
  );
}
