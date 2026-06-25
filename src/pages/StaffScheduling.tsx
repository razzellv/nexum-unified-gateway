import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, RefreshCw, Link, Users, Clock, Calendar } from 'lucide-react';

interface StaffShift {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  area: string;
  shiftStart: string;
  shiftEnd: string;
  source: 'ukg' | 'manual';
  punchIn?: string;
  punchOut?: string;
}

interface UKGConfig {
  baseUrl: string;
  clientId: string;
  apiKey: string;
  tenantId: string;
  lastSync?: string;
  enabled: boolean;
}

const SHIFT_COLORS: Record<string, string> = {
  engineer:   'bg-purple-500/70 border-purple-500',
  operator:   'bg-green-500/70 border-green-500',
  custodian:  'bg-orange-500/70 border-orange-500',
  supervisor: 'bg-blue-500/70 border-blue-500',
  technician: 'bg-cyan-500/70 border-cyan-500',
  associate:  'bg-yellow-500/70 border-yellow-500',
  officer:    'bg-red-500/70 border-red-500',
  dispatcher: 'bg-pink-500/70 border-pink-500',
};

function roleColor(role: string): string {
  const key = Object.keys(SHIFT_COLORS).find(k => role.toLowerCase().includes(k));
  return key ? SHIFT_COLORS[key] : 'bg-muted/70 border-border';
}

const HOUR_WIDTH = 56; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function GanttRow({ shift, dateStart }: { shift: StaffShift; dateStart: Date }) {
  const start = new Date(shift.shiftStart);
  const end = new Date(shift.shiftEnd);
  const dayStart = new Date(dateStart);
  dayStart.setHours(0, 0, 0, 0);
  const offsetHours = (start.getTime() - dayStart.getTime()) / 3600000;
  const durationHours = Math.max(0.25, (end.getTime() - start.getTime()) / 3600000);
  const left = Math.max(0, offsetHours) * HOUR_WIDTH;
  const width = Math.min(durationHours, 24 - Math.max(0, offsetHours)) * HOUR_WIDTH;
  const now = new Date();
  const isActive = now >= start && now <= end;
  const hasPunch = !!shift.punchIn;
  return (
    <div
      className={`absolute top-1 h-8 rounded-md border text-xs flex items-center px-2 truncate text-white font-medium cursor-default ${roleColor(shift.role)} ${isActive ? 'ring-2 ring-white/30' : ''}`}
      style={{ left, width: Math.max(width, HOUR_WIDTH * 0.5) }}
      title={`${shift.employeeName} · ${shift.role} · ${shift.area}\n${start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} – ${end.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}${shift.punchIn ? `\nPunched in: ${new Date(shift.punchIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}` : ''}`}
    >
      {shift.employeeName}
      {hasPunch && <span className="ml-1 opacity-70">●</span>}
      {shift.source === 'ukg' && <span className="ml-1 text-[9px] opacity-70 font-mono">UKG</span>}
    </div>
  );
}

export default function StaffScheduling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<StaffShift[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_staff_schedule') || '[]'); } catch { return []; }
  });
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showUKGConfig, setShowUKGConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ukgConfig, setUKGConfig] = useState<UKGConfig>(() => {
    try { const raw = localStorage.getItem('nexum_integrations'); return raw ? JSON.parse(raw).ukg || { baseUrl: '', clientId: '', apiKey: '', tenantId: '', enabled: false } : { baseUrl: '', clientId: '', apiKey: '', tenantId: '', enabled: false }; }
    catch { return { baseUrl: '', clientId: '', apiKey: '', tenantId: '', enabled: false }; }
  });
  const [newShift, setNewShift] = useState({ employeeName: '', role: 'engineer', department: 'Facilities', area: '', shiftStart: `${new Date().toISOString().slice(0, 10)}T07:00`, shiftEnd: `${new Date().toISOString().slice(0, 10)}T15:00` });

  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const dayShifts = useMemo(() => {
    const dayStr = selectedDateObj.toDateString();
    return shifts.filter(s => new Date(s.shiftStart).toDateString() === dayStr || new Date(s.shiftEnd).toDateString() === dayStr);
  }, [shifts, selectedDateObj]);

  const uniqueRoles = useMemo(() => [...new Set(dayShifts.map(s => s.role))], [dayShifts]);
  const activeNow = dayShifts.filter(s => { const n = new Date(); return n >= new Date(s.shiftStart) && n <= new Date(s.shiftEnd); }).length;

  function saveShifts(updated: StaffShift[]) {
    try { localStorage.setItem('nexum_staff_schedule', JSON.stringify(updated)); } catch {}
    setShifts(updated);
  }

  function saveUKGConfig(cfg: UKGConfig) {
    try {
      const integrations = JSON.parse(localStorage.getItem('nexum_integrations') || '{}');
      localStorage.setItem('nexum_integrations', JSON.stringify({ ...integrations, ukg: cfg }));
    } catch {}
    setUKGConfig(cfg);
  }

  async function syncFromUKG() {
    if (!ukgConfig.enabled || !ukgConfig.baseUrl || !ukgConfig.apiKey) {
      toast({ title: 'UKG not configured', description: 'Enter UKG Pro credentials and enable the integration first.', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      // Real UKG Pro WFM API call shape:
      // GET {baseUrl}/v1/timekeeping/schedule/multi_read?date={selectedDate}
      // Headers: client_id, US-USER-ID, appkey, Authorization: Bearer {token}
      const resp = await fetch(`${ukgConfig.baseUrl}/v1/timekeeping/schedule/multi_read?date=${selectedDate}`, {
        headers: {
          'client_id': ukgConfig.clientId,
          'appkey': ukgConfig.apiKey,
          'US-TENANT-ID': ukgConfig.tenantId,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) throw new Error(`UKG API returned ${resp.status}`);
      const data = await resp.json();
      // Map UKG schedule items to StaffShift
      const mapped: StaffShift[] = (data.data || data.items || []).map((item: any) => ({
        shiftId: item.id || `ukg-${Date.now()}-${Math.random()}`,
        employeeId: item.employee?.id || '',
        employeeName: `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim(),
        role: item.laborCategory?.name || item.jobCode || 'staff',
        department: item.orgJob?.name || 'Operations',
        area: item.location?.name || '',
        shiftStart: item.startDateTime,
        shiftEnd: item.endDateTime,
        source: 'ukg' as const,
      }));
      const existing = shifts.filter(s => s.source !== 'ukg');
      saveShifts([...existing, ...mapped]);
      saveUKGConfig({ ...ukgConfig, lastSync: new Date().toISOString() });
      toast({ title: `Synced ${mapped.length} shifts from UKG` });
    } catch (err: any) {
      toast({ title: 'UKG sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  const now = new Date();
  const currentHourLine = selectedDateObj.toDateString() === now.toDateString()
    ? (now.getHours() + now.getMinutes() / 60) * HOUR_WIDTH
    : null;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Staff Scheduling</h1>
            <p className="text-sm text-muted-foreground">{dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''} on {selectedDateObj.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {activeNow} active now</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40" />
            <Button variant="outline" size="sm" onClick={() => setShowUKGConfig(true)}>
              <Link className="w-4 h-4 mr-2" />UKG / Integration
            </Button>
            {ukgConfig.enabled && (
              <Button variant="outline" size="sm" onClick={syncFromUKG} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing...' : 'Sync UKG'}
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Shift</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Staff Shift</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1"><Label>Employee Name</Label><Input placeholder="Full name" value={newShift.employeeName} onChange={e => setNewShift(p => ({ ...p, employeeName: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <Select value={newShift.role} onValueChange={v => setNewShift(p => ({ ...p, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['engineer','operator','custodian','supervisor','technician','associate','officer','dispatcher','manager','staff'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Area / Zone</Label><Input placeholder="Floor 1, Zone A..." value={newShift.area} onChange={e => setNewShift(p => ({ ...p, area: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Shift Start</Label><Input type="datetime-local" value={newShift.shiftStart} onChange={e => setNewShift(p => ({ ...p, shiftStart: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Shift End</Label><Input type="datetime-local" value={newShift.shiftEnd} onChange={e => setNewShift(p => ({ ...p, shiftEnd: e.target.value }))} /></div>
                  </div>
                  <Button className="w-full" onClick={() => {
                    if (!newShift.employeeName || !newShift.shiftStart || !newShift.shiftEnd) return;
                    const s: StaffShift = {
                      shiftId: `manual-${Date.now()}`,
                      employeeId: `emp-${Date.now()}`,
                      employeeName: newShift.employeeName,
                      role: newShift.role,
                      department: newShift.department,
                      area: newShift.area,
                      shiftStart: new Date(newShift.shiftStart).toISOString(),
                      shiftEnd: new Date(newShift.shiftEnd).toISOString(),
                      source: 'manual',
                    };
                    saveShifts([...shifts, s]);
                    toast({ title: 'Shift added' });
                  }}>Add Shift</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-blue-500 opacity-60" /><div><p className="text-sm text-muted-foreground">Scheduled</p><p className="text-2xl font-bold">{dayShifts.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="w-8 h-8 text-green-500 opacity-60" /><div><p className="text-sm text-muted-foreground">Active Now</p><p className="text-2xl font-bold text-green-500">{activeNow}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Calendar className="w-8 h-8 text-purple-500 opacity-60" /><div><p className="text-sm text-muted-foreground">Roles Covered</p><p className="text-2xl font-bold">{uniqueRoles.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Settings className="w-8 h-8 text-muted-foreground opacity-60" /><div><p className="text-sm text-muted-foreground">Source</p><p className="text-lg font-bold">{ukgConfig.enabled ? 'UKG' : 'Manual'}</p></div></div></CardContent></Card>
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Shift Timeline</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div style={{ minWidth: HOUR_WIDTH * 24 + 160 }}>
                {/* Time axis */}
                <div className="flex border-b border-border/40 bg-muted/20" style={{ paddingLeft: 160 }}>
                  {HOURS.map(h => (
                    <div key={h} className="text-[10px] text-muted-foreground text-center border-l border-border/20 py-1" style={{ width: HOUR_WIDTH, minWidth: HOUR_WIDTH }}>
                      {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                    </div>
                  ))}
                </div>

                {/* Rows by person */}
                {dayShifts.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No shifts for this day. Add shifts manually or sync from UKG.
                  </div>
                ) : (
                  dayShifts.map((shift, i) => (
                    <div key={shift.shiftId} className={`flex border-b border-border/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`} style={{ height: 48 }}>
                      {/* Name label */}
                      <div className="shrink-0 flex flex-col justify-center px-3 border-r border-border/30" style={{ width: 160 }}>
                        <p className="text-xs font-medium truncate">{shift.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{shift.role}</p>
                      </div>
                      {/* Bar area */}
                      <div className="relative flex-1" style={{ height: 48 }}>
                        {/* Hour grid lines */}
                        {HOURS.map(h => <div key={h} className="absolute top-0 bottom-0 border-l border-border/10" style={{ left: h * HOUR_WIDTH }} />)}
                        {/* Current time line */}
                        {currentHourLine !== null && <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" style={{ left: currentHourLine }} />}
                        <GanttRow shift={shift} dateStart={selectedDateObj} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(SHIFT_COLORS).map(([role, cls]) => (
            <div key={role} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${cls}`} />
              <span className="text-xs text-muted-foreground capitalize">{role}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4"><div className="w-px h-4 bg-red-500/60" /><span className="text-xs text-muted-foreground">Now</span></div>
          <div className="flex items-center gap-1.5"><span className="text-xs font-mono text-muted-foreground">●</span><span className="text-xs text-muted-foreground">Punched in</span></div>
        </div>

        {/* Shift list (detail table) */}
        {dayShifts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Shift Detail</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-xs text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Employee</th>
                      <th className="text-left pb-2 font-medium">Role</th>
                      <th className="text-left pb-2 font-medium">Area</th>
                      <th className="text-left pb-2 font-medium">Start</th>
                      <th className="text-left pb-2 font-medium">End</th>
                      <th className="text-left pb-2 font-medium">Punch In</th>
                      <th className="text-left pb-2 font-medium">Source</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {dayShifts.map(s => {
                      const n = new Date();
                      const isActive = n >= new Date(s.shiftStart) && n <= new Date(s.shiftEnd);
                      return (
                        <tr key={s.shiftId} className={isActive ? 'bg-green-500/5' : ''}>
                          <td className="py-2 pr-3 font-medium">{s.employeeName}</td>
                          <td className="py-2 pr-3 capitalize"><Badge className={`text-[10px] ${roleColor(s.role)}`}>{s.role}</Badge></td>
                          <td className="py-2 pr-3 text-muted-foreground">{s.area || '—'}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{new Date(s.shiftStart).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{new Date(s.shiftEnd).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{s.punchIn ? new Date(s.punchIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                          <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{s.source === 'ukg' ? 'UKG' : 'Manual'}</Badge></td>
                          <td className="py-2"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => saveShifts(shifts.filter(sh => sh.shiftId !== s.shiftId))}><span className="text-red-400 text-xs">×</span></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* UKG Config Dialog */}
      <Dialog open={showUKGConfig} onOpenChange={setShowUKGConfig}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Link className="w-4 h-4" />UKG Pro / InTouch DX Integration</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              Connect to UKG Pro WFM API to automatically sync schedules and punch data. Compatible with UKG InTouch DX G2 and UKG Ready. Configure your UKG Pro API credentials below.
            </div>
            <div className="space-y-1"><Label>UKG Pro Base URL</Label><Input placeholder="https://your-company.mykronos.com" value={ukgConfig.baseUrl} onChange={e => setUKGConfig(p => ({ ...p, baseUrl: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Client ID</Label><Input placeholder="client_id" value={ukgConfig.clientId} onChange={e => setUKGConfig(p => ({ ...p, clientId: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Tenant ID</Label><Input placeholder="tenant_id" value={ukgConfig.tenantId} onChange={e => setUKGConfig(p => ({ ...p, tenantId: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>API Key / App Key</Label><Input type="password" placeholder="your-api-key" value={ukgConfig.apiKey} onChange={e => setUKGConfig(p => ({ ...p, apiKey: e.target.value }))} /></div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
              <input type="checkbox" id="ukg-enabled" checked={ukgConfig.enabled} onChange={e => setUKGConfig(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4" />
              <Label htmlFor="ukg-enabled">Enable UKG sync</Label>
            </div>
            {ukgConfig.lastSync && <p className="text-xs text-muted-foreground">Last sync: {new Date(ukgConfig.lastSync).toLocaleString()}</p>}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Compatible hardware / software:</p>
              <p>· UKG InTouch DX G2 — time clocks auto-push punches to UKG Pro WFM API</p>
              <p>· UKG Ready — cloud-based; use UKG Ready API endpoint</p>
              <p>· Other clocking systems — configure to POST &#123;employeeId, name, role, shiftStart, shiftEnd, area&#125; to your facility's webhook endpoint</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUKGConfig(false)}>Cancel</Button>
              <Button onClick={() => { saveUKGConfig(ukgConfig); setShowUKGConfig(false); toast({ title: 'Integration settings saved' }); }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
