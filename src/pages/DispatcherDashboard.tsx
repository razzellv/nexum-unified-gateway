import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Radio, Phone, Users, Clock, AlertTriangle, CheckCircle,
  Activity, XCircle, Mic, Plus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type CallPriority = 'Critical' | 'High' | 'Normal';
type CallStatus   = 'Dispatched' | 'En Route' | 'On Scene' | 'Closed';
type UnitStatus   = 'available' | 'en-route' | 'on-scene' | 'out-of-service';

interface DispatchCall {
  id: string;
  callType: string;
  location: string;
  priority: CallPriority;
  unitAssigned: string;
  timestamp: string;  // ISO string
  status: CallStatus;
}

interface DispatchUnit {
  id: string;
  label: string;
  status: UnitStatus;
}

interface RadioEntry {
  id: string;
  timestamp: string;
  unitId: string;
  channel: string;
  message: string;
}

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_CALLS    = 'nexum_dispatch_calls';
const LS_UNITS    = 'nexum_dispatch_units';
const LS_RADIO    = 'nexum_dispatch_radio';
const LS_HANDOFF  = 'nexum_dispatch_handoff';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CALLS: DispatchCall[] = [
  { id: 'CALL-001', callType: 'Structure Fire',      location: '1420 Maple Ave',        priority: 'Critical', unitAssigned: 'Engine 1',  timestamp: new Date(Date.now() - 12 * 60000).toISOString(), status: 'On Scene'   },
  { id: 'CALL-002', callType: 'Medical Emergency',   location: '88 Harbor Blvd, Unit 4', priority: 'Critical', unitAssigned: 'Medic 7',   timestamp: new Date(Date.now() - 5  * 60000).toISOString(), status: 'En Route'   },
  { id: 'CALL-003', callType: 'Traffic Accident',    location: 'I-90 & Exit 22',         priority: 'High',     unitAssigned: 'Unit 42',   timestamp: new Date(Date.now() - 22 * 60000).toISOString(), status: 'Dispatched' },
  { id: 'CALL-004', callType: 'Welfare Check',       location: '305 Oak St',             priority: 'Normal',   unitAssigned: 'Unit 44',   timestamp: new Date(Date.now() - 8  * 60000).toISOString(), status: 'En Route'   },
  { id: 'CALL-005', callType: 'Alarm Activation',    location: '770 Commerce Dr',        priority: 'Normal',   unitAssigned: 'Chief 1',   timestamp: new Date(Date.now() - 60 * 60000 - 3 * 3600000).toISOString(), status: 'Closed'     },
];

const MOCK_UNITS: DispatchUnit[] = [
  { id: 'engine-1',  label: 'Engine 1',  status: 'available'       },
  { id: 'engine-2',  label: 'Engine 2',  status: 'on-scene'        },
  { id: 'ladder-1',  label: 'Ladder 1',  status: 'available'       },
  { id: 'rescue-1',  label: 'Rescue 1',  status: 'en-route'        },
  { id: 'medic-7',   label: 'Medic 7',   status: 'available'       },
  { id: 'unit-42',   label: 'Unit 42',   status: 'available'       },
  { id: 'unit-44',   label: 'Unit 44',   status: 'on-scene'        },
  { id: 'chief-1',   label: 'Chief 1',   status: 'available'       },
];

const MOCK_RADIO: RadioEntry[] = [
  { id: 'r-1', timestamp: new Date(Date.now() - 3  * 60000).toISOString(), unitId: 'Engine 1', channel: 'Ch 1', message: 'On scene at 1420 Maple. Two-story residential, heavy smoke from second floor.'           },
  { id: 'r-2', timestamp: new Date(Date.now() - 5  * 60000).toISOString(), unitId: 'Medic 7',  channel: 'Ch 2', message: 'En route to 88 Harbor. ETA 3 minutes.'                                                    },
  { id: 'r-3', timestamp: new Date(Date.now() - 9  * 60000).toISOString(), unitId: 'Unit 42',  channel: 'Ch 1', message: 'Dispatched to I-90 & Exit 22. Acknowledge.'                                               },
  { id: 'r-4', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), unitId: 'Engine 2', channel: 'Ch 3', message: 'Clear from prior call, returning to station.'                                             },
  { id: 'r-5', timestamp: new Date(Date.now() - 28 * 60000).toISOString(), unitId: 'Chief 1',  channel: 'Ch 1', message: 'Alarm Activation at Commerce Dr — investigating, appears to be false alarm.'              },
  { id: 'r-6', timestamp: new Date(Date.now() - 40 * 60000).toISOString(), unitId: 'Rescue 1', channel: 'Ch 4', message: 'Responding to assist Engine 1. Requesting additional resources stand by.'                 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseArray<T>(key: string, fallback: T[]): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

function getShiftLabel(): string {
  const h = new Date().getHours();
  if (h >= 6  && h < 14) return 'Day Shift';
  if (h >= 14 && h < 22) return 'Evening Shift';
  return 'Night Shift';
}

function formatElapsed(isoTimestamp: string): string {
  const diffMs  = Date.now() - new Date(isoTimestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return '< 1 min';
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isToday(isoTimestamp: string): boolean {
  return isoTimestamp.split('T')[0] === todayISO();
}

const UNIT_STATUS_CYCLE: UnitStatus[] = ['available', 'en-route', 'on-scene', 'out-of-service'];

function nextUnitStatus(current: UnitStatus): UnitStatus {
  const idx = UNIT_STATUS_CYCLE.indexOf(current);
  return UNIT_STATUS_CYCLE[(idx + 1) % UNIT_STATUS_CYCLE.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: CallPriority }) {
  return (
    <Badge variant="outline" className={cn(
      'text-[10px] font-semibold uppercase tracking-wide',
      priority === 'Critical' && 'border-red-500/50 text-red-400 bg-red-500/10',
      priority === 'High'     && 'border-orange-400/50 text-orange-400 bg-orange-400/10',
      priority === 'Normal'   && 'border-blue-400/50 text-blue-400 bg-blue-400/10',
    )}>
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <Badge variant="outline" className={cn(
      'text-[10px]',
      status === 'Dispatched' && 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10',
      status === 'En Route'   && 'border-blue-400/50  text-blue-400  bg-blue-400/10',
      status === 'On Scene'   && 'border-orange-400/50 text-orange-400 bg-orange-400/10',
      status === 'Closed'     && 'border-green-400/50 text-green-400 bg-green-400/10',
    )}>
      {status}
    </Badge>
  );
}

function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return (
    <Badge variant="outline" className={cn(
      'text-[10px] capitalize',
      status === 'available'       && 'border-green-400/50  text-green-400  bg-green-400/10',
      status === 'en-route'        && 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10',
      status === 'on-scene'        && 'border-orange-400/50 text-orange-400 bg-orange-400/10',
      status === 'out-of-service'  && 'border-red-500/50    text-red-400    bg-red-500/10',
    )}>
      {status.replace('-', ' ')}
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CALL_TYPES = [
  'Structure Fire', 'Medical Emergency', 'Traffic Accident',
  'Welfare Check', 'Alarm Activation', 'Hazmat', 'Other',
] as const;

const CHANNELS = ['Ch 1', 'Ch 2', 'Ch 3', 'Ch 4'] as const;

export default function DispatcherDashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [calls, setCalls]   = useState<DispatchCall[]>(() => safeParseArray(LS_CALLS, MOCK_CALLS));
  const [units, setUnits]   = useState<DispatchUnit[]>(() => safeParseArray(LS_UNITS, MOCK_UNITS));
  const [radio, setRadio]   = useState<RadioEntry[]>(() => safeParseArray(LS_RADIO, MOCK_RADIO));
  const [handoff, setHandoff] = useState<string>(() => localStorage.getItem(LS_HANDOFF) || '');

  // Log Call modal
  const [showLogCall, setShowLogCall] = useState(false);
  const [newCall, setNewCall] = useState({
    callType: 'Structure Fire' as string,
    location: '',
    priority: 'Normal' as CallPriority,
    unitAssigned: '',
  });

  // Radio entry inline form
  const [showRadioForm, setShowRadioForm] = useState(false);
  const [newRadio, setNewRadio] = useState({ unitId: '', channel: 'Ch 1' as string, message: '' });

  // ── Persist on change ─────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LS_CALLS,  JSON.stringify(calls)); }, [calls]);
  useEffect(() => { localStorage.setItem(LS_UNITS,  JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem(LS_RADIO,  JSON.stringify(radio)); }, [radio]);

  const saveHandoff = useCallback((val: string) => {
    setHandoff(val);
    localStorage.setItem(LS_HANDOFF, val);
  }, []);

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const activeCalls   = calls.filter(c => c.status !== 'Closed');
  const availableUnits = units.filter(u => u.status === 'available').length;

  const todayClosed = calls.filter(c => c.status === 'Closed' && isToday(c.timestamp));
  const avgResponseTime = (() => {
    if (todayClosed.length === 0) return null;
    // estimate: time from call creation to "Closed" — we don't have a close timestamp,
    // so we approximate from elapsed time for demonstration purposes (closed calls are old).
    const totalMin = todayClosed.reduce((sum, c) => {
      return sum + Math.floor((Date.now() - new Date(c.timestamp).getTime()) / 60000);
    }, 0);
    return Math.round(totalMin / todayClosed.length);
  })();

  const totalCallsToday = calls.filter(c => isToday(c.timestamp)).length;

  // ── Actions ───────────────────────────────────────────────────────────────

  function submitLogCall() {
    if (!newCall.location.trim()) {
      toast.error('Location is required.');
      return;
    }
    const call: DispatchCall = {
      id: `CALL-${String(Date.now()).slice(-6)}`,
      callType: newCall.callType,
      location: newCall.location.trim(),
      priority: newCall.priority,
      unitAssigned: newCall.unitAssigned || 'Unassigned',
      timestamp: new Date().toISOString(),
      status: 'Dispatched',
    };
    setCalls(prev => [call, ...prev]);
    toast.success(`Call logged — ${call.id}`);
    setShowLogCall(false);
    setNewCall({ callType: 'Structure Fire', location: '', priority: 'Normal', unitAssigned: '' });
  }

  function closeCall(id: string) {
    setCalls(prev => prev.map(c => c.id === id ? { ...c, status: 'Closed' } : c));
    toast.success('Call closed.');
  }

  function cycleUnitStatus(unitId: string) {
    setUnits(prev => prev.map(u =>
      u.id === unitId ? { ...u, status: nextUnitStatus(u.status) } : u
    ));
  }

  function submitRadioEntry() {
    if (!newRadio.unitId.trim() || !newRadio.message.trim()) {
      toast.error('Unit ID and message are required.');
      return;
    }
    const entry: RadioEntry = {
      id: `r-${Date.now()}`,
      timestamp: new Date().toISOString(),
      unitId: newRadio.unitId.trim(),
      channel: newRadio.channel,
      message: newRadio.message.trim(),
    };
    setRadio(prev => [entry, ...prev]);
    toast.success('Radio entry saved.');
    setShowRadioForm(false);
    setNewRadio({ unitId: '', channel: 'Ch 1', message: '' });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const shiftLabel = getShiftLabel();
  const dateLabel  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">

        {/* ── 1. Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dispatch Operations</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className={cn(
                  'font-medium',
                  shiftLabel === 'Day Shift'     && 'text-yellow-400',
                  shiftLabel === 'Evening Shift' && 'text-orange-400',
                  shiftLabel === 'Night Shift'   && 'text-blue-400',
                )}>
                  {shiftLabel}
                </span>
                {' · '}
                {dateLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => { setShowRadioForm(v => !v); }}>
              <Mic className="w-4 h-4 mr-2" />Add Radio Entry
            </Button>
            <Button size="sm" onClick={() => setShowLogCall(true)}>
              <Phone className="w-4 h-4 mr-2" />Log Call
            </Button>
          </div>
        </div>

        {/* ── 2. KPI Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Active Calls',
              value: activeCalls.length,
              icon: AlertTriangle,
              color: activeCalls.length > 0 ? 'text-red-400' : 'text-green-400',
              sub: activeCalls.length > 0 ? 'in queue' : 'all clear',
            },
            {
              label: 'Units Available',
              value: availableUnits,
              icon: Users,
              color: availableUnits >= 3 ? 'text-green-400' : availableUnits >= 1 ? 'text-yellow-400' : 'text-red-400',
              sub: `of ${units.length} total`,
            },
            {
              label: 'Avg Response Time',
              value: avgResponseTime !== null ? `${avgResponseTime} min` : '-- min',
              icon: Clock,
              color: avgResponseTime === null ? 'text-muted-foreground' : avgResponseTime <= 6 ? 'text-green-400' : 'text-yellow-400',
              sub: 'closed calls today',
            },
            {
              label: 'Total Calls Today',
              value: totalCallsToday,
              icon: Activity,
              color: 'text-blue-400',
              sub: `${todayClosed.length} closed`,
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="neon-border bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 3. Active Calls / Priority Queue ───────────────────────────── */}
        <Card className="neon-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Active Calls &amp; Priority Queue
              {activeCalls.length > 0 && (
                <Badge variant="outline" className="ml-auto text-[10px] border-red-400/40 text-red-400">
                  {activeCalls.length} active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCalls.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm">No active calls — all clear</span>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-muted-foreground border-b border-border/20">
                      <th className="pb-2 pr-3 font-medium pl-1">Priority</th>
                      <th className="pb-2 pr-3 font-medium">Call Type</th>
                      <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Location</th>
                      <th className="pb-2 pr-3 font-medium hidden md:table-cell">Unit</th>
                      <th className="pb-2 pr-3 font-medium">Elapsed</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pl-1 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCalls.map(call => (
                      <tr
                        key={call.id}
                        className={cn(
                          'border-b border-border/10 last:border-0 transition-colors',
                          call.priority === 'Critical' && 'bg-red-500/5 hover:bg-red-500/10',
                          call.priority === 'High'     && 'bg-orange-400/5 hover:bg-orange-400/10',
                          call.priority === 'Normal'   && 'hover:bg-muted/20',
                        )}
                      >
                        <td className="py-2.5 pr-3 pl-1">
                          <PriorityBadge priority={call.priority} />
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-xs">{call.callType}</td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[160px] truncate">{call.location}</td>
                        <td className="py-2.5 pr-3 text-xs hidden md:table-cell">
                          <span className="px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono text-[10px]">{call.unitAssigned}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground tabular-nums">{formatElapsed(call.timestamp)}</td>
                        <td className="py-2.5 pr-3">
                          <StatusBadge status={call.status} />
                        </td>
                        <td className="py-2.5 pl-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
                            onClick={() => closeCall(call.id)}
                          >
                            Close
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 4. Unit Status Board ───────────────────────────────────────── */}
        <Card className="neon-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" />
              Unit Status Board
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">Click a unit to cycle status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {units.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => cycleUnitStatus(unit.id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30',
                    unit.status === 'available'      && 'border-green-400/30  bg-green-400/5',
                    unit.status === 'en-route'       && 'border-yellow-400/30 bg-yellow-400/5',
                    unit.status === 'on-scene'       && 'border-orange-400/30 bg-orange-400/5',
                    unit.status === 'out-of-service' && 'border-red-500/30    bg-red-500/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <p className="text-sm font-semibold leading-tight">{unit.label}</p>
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1 shrink-0',
                      unit.status === 'available'      && 'bg-green-400  shadow-[0_0_5px_#4ade80]',
                      unit.status === 'en-route'       && 'bg-yellow-400 shadow-[0_0_5px_#facc15]',
                      unit.status === 'on-scene'       && 'bg-orange-400 shadow-[0_0_5px_#fb923c]',
                      unit.status === 'out-of-service' && 'bg-red-400',
                    )} />
                  </div>
                  <UnitStatusBadge status={unit.status} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 5. Radio Log ───────────────────────────────────────────────── */}
        <Card className="neon-border bg-card/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="w-4 h-4 text-primary" />
                Radio Log
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 border-border/40"
                onClick={() => setShowRadioForm(v => !v)}
              >
                {showRadioForm
                  ? <><X className="w-3 h-3 mr-1" />Cancel</>
                  : <><Plus className="w-3 h-3 mr-1" />Add Entry</>
                }
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Inline add form */}
            {showRadioForm && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 mb-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Radio Entry</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="text-xs bg-background border border-border/40 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="Unit ID (e.g. Engine 1)"
                    value={newRadio.unitId}
                    onChange={e => setNewRadio({ ...newRadio, unitId: e.target.value })}
                  />
                  <select
                    className="text-xs bg-background border border-border/40 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    value={newRadio.channel}
                    onChange={e => setNewRadio({ ...newRadio, channel: e.target.value })}
                  >
                    {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </div>
                <textarea
                  className="w-full text-xs bg-background border border-border/40 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  rows={2}
                  placeholder="Message summary..."
                  value={newRadio.message}
                  onChange={e => setNewRadio({ ...newRadio, message: e.target.value })}
                />
                <Button size="sm" className="w-full h-7 text-xs" onClick={submitRadioEntry}>
                  Save Entry
                </Button>
              </div>
            )}

            {/* Entries list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {radio.slice(0, 20).map(entry => (
                <div
                  key={entry.id}
                  className="flex gap-3 p-2.5 rounded-lg border border-border/20 bg-muted/10 text-xs"
                >
                  <div className="shrink-0 text-right w-16">
                    <p className="text-muted-foreground tabular-nums">{formatTime(entry.timestamp)}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{entry.channel}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-primary mr-2">{entry.unitId}</span>
                    <span className="text-muted-foreground leading-relaxed">{entry.message}</span>
                  </div>
                </div>
              ))}
              {radio.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No radio entries yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── 6. Shift Handoff Notes ─────────────────────────────────────── */}
        <Card className="neon-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-primary" />
              Shift Handoff Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              End-of-shift notes for incoming dispatcher
            </p>
            <Textarea
              className="text-sm min-h-[120px] resize-y bg-background/60 border-border/40 focus:ring-primary/30"
              placeholder="Summarize open incidents, unit statuses, notable radio traffic, and anything the next dispatcher needs to know..."
              value={handoff}
              onChange={e => saveHandoff(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1.5">Auto-saved to local storage</p>
          </CardContent>
        </Card>

      </div>

      {/* ── Log Call Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showLogCall} onOpenChange={setShowLogCall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />New Incoming Call
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            {/* Call Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Call Type</label>
              <select
                className="w-full text-sm bg-background border border-border/40 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={newCall.callType}
                onChange={e => setNewCall({ ...newCall, callType: e.target.value })}
              >
                {CALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address / Location</label>
              <input
                className="w-full text-sm bg-background border border-border/40 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 1234 Main St, Unit 5B"
                value={newCall.location}
                onChange={e => setNewCall({ ...newCall, location: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submitLogCall()}
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
              <div className="flex gap-2">
                {(['Critical', 'High', 'Normal'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewCall({ ...newCall, priority: p })}
                    className={cn(
                      'flex-1 py-1.5 rounded-md border text-xs font-semibold transition-all',
                      newCall.priority === p && p === 'Critical' && 'bg-red-500/20 border-red-500/60 text-red-400',
                      newCall.priority === p && p === 'High'     && 'bg-orange-400/20 border-orange-400/60 text-orange-400',
                      newCall.priority === p && p === 'Normal'   && 'bg-blue-400/20 border-blue-400/60 text-blue-400',
                      newCall.priority !== p && 'border-border/30 text-muted-foreground hover:border-border/60',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit to Dispatch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit to Dispatch</label>
              <select
                className="w-full text-sm bg-background border border-border/40 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={newCall.unitAssigned}
                onChange={e => setNewCall({ ...newCall, unitAssigned: e.target.value })}
              >
                <option value="">-- Select Unit --</option>
                {units.map(u => (
                  <option key={u.id} value={u.label} disabled={u.status === 'out-of-service'}>
                    {u.label}{u.status !== 'available' ? ` (${u.status.replace('-', ' ')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={submitLogCall}>
                <Phone className="w-4 h-4 mr-2" />Dispatch Call
              </Button>
              <Button variant="outline" onClick={() => setShowLogCall(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
