import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Wrench,
  Zap,
  Flame,
  Snowflake,
  Wind,
  Droplets,
  ShieldCheck,
  MapPin,
  Radio,
  CalendarClock,
  TruckIcon,
  HardHat,
  Building2,
  XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneStatus = 'online' | 'warning' | 'critical';

interface Zone {
  id: string;
  name: string;
  status: ZoneStatus;
  lastActivity: string;
  staffCount: number;
  detail: string;
}

interface Alert {
  id: string;
  type: string;
  description: string;
  timeAgo: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface WorkOrder {
  id: string;
  title: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  zone: string;
  shiftStatus: 'on-duty' | 'break' | 'overtime';
}

interface SystemReading {
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  trend: 'normal' | 'high' | 'low';
}

interface ScheduleEvent {
  id: string;
  title: string;
  time: string;
  type: 'inspection' | 'pm' | 'shift' | 'vendor';
}

interface EmergencySystem {
  name: string;
  status: 'ready' | 'check-required';
  detail: string;
  lastVerified: string;
  icon: React.ElementType;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ZONES: Zone[] = [
  { id: 'boiler', name: 'Boiler Room', status: 'online', lastActivity: '2 min ago', staffCount: 2, detail: 'All burners nominal. Stack temp 480°F. No alarms.' },
  { id: 'chiller', name: 'Chiller Plant', status: 'warning', lastActivity: '8 min ago', staffCount: 1, detail: 'Chiller #2 showing elevated leaving-water temp (+3°F above setpoint). Tech dispatched.' },
  { id: 'hvac2', name: 'HVAC Floor 2', status: 'online', lastActivity: '5 min ago', staffCount: 1, detail: 'AHU-02 and AHU-03 running at design capacity. Filters replaced 6 days ago.' },
  { id: 'electrical', name: 'Electrical Room', status: 'online', lastActivity: '12 min ago', staffCount: 0, detail: 'Main switchgear normal. Load at 64% of capacity. UPS battery at 97%.' },
  { id: 'loading', name: 'Loading Dock', status: 'online', lastActivity: '18 min ago', staffCount: 3, detail: 'Receiving active. 2 vendor trucks on-site. Dock #3 door motor flagged for PM.' },
  { id: 'fire', name: 'Fire Safety', status: 'online', lastActivity: '1 hr ago', staffCount: 0, detail: 'All sprinkler zones pressurized. Panel shows clear. Monthly test completed 4/18.' },
  { id: 'parking', name: 'Parking Structure', status: 'critical', lastActivity: '3 min ago', staffCount: 1, detail: 'Level B2 ventilation fan VFD fault — CO sensor reading elevated. Area being monitored.' },
  { id: 'admin', name: 'Admin Wing', status: 'online', lastActivity: '22 min ago', staffCount: 4, detail: 'HVAC setpoints nominal. Access control normal. Occupancy at 71%.' },
  { id: 'penthouse', name: 'Mechanical Penthouse', status: 'online', lastActivity: '9 min ago', staffCount: 1, detail: 'Cooling tower fans operating. Make-up water valve auto. No alarms.' },
];

const INITIAL_ALERTS: Alert[] = [
  { id: 'a1', type: 'Equipment Offline', description: 'Parking B2 VFD #4 fault — ventilation degraded, CO levels rising.', timeAgo: '3 min ago', severity: 'critical' },
  { id: 'a2', type: 'System Warning', description: 'Chiller #2 leaving-water temp deviation +3°F above 44°F setpoint.', timeAgo: '8 min ago', severity: 'high' },
  { id: 'a3', type: 'Work Order Critical', description: 'WO-2041 overdue: Monthly boiler water treatment not logged.', timeAgo: '1 hr ago', severity: 'high' },
  { id: 'a4', type: 'Compliance Flag', description: 'Fire extinguisher inspection overdue in Loading Dock Zone D.', timeAgo: '2 hrs ago', severity: 'medium' },
  { id: 'a5', type: 'System Warning', description: 'BMS communication timeout — Penthouse RTU-06 polling delayed.', timeAgo: '4 hrs ago', severity: 'low' },
];

const WORK_ORDERS: WorkOrder[] = [
  { id: 'WO-2041', title: 'Boiler Water Treatment Log', assignee: 'Marcus Webb', priority: 'critical', status: 'Overdue' },
  { id: 'WO-2044', title: 'Chiller #2 Leaving-Temp Diagnosis', assignee: 'Sofia Delgado', priority: 'high', status: 'In Progress' },
  { id: 'WO-2048', title: 'Parking B2 VFD #4 Repair', assignee: 'Terrence Hall', priority: 'critical', status: 'In Progress' },
  { id: 'WO-2051', title: 'AHU Filter Replacement — Floor 3', assignee: 'Priya Nair', priority: 'medium', status: 'Scheduled' },
  { id: 'WO-2053', title: 'Dock Door #3 Motor PM', assignee: 'James Okonkwo', priority: 'low', status: 'Open' },
];

const STAFF: StaffMember[] = [
  { id: 's1', name: 'Marcus Webb', role: 'Boiler Operator', zone: 'Boiler Room', shiftStatus: 'on-duty' },
  { id: 's2', name: 'Sofia Delgado', role: 'HVAC Technician', zone: 'Chiller Plant', shiftStatus: 'on-duty' },
  { id: 's3', name: 'Terrence Hall', role: 'Electrical Tech', zone: 'Parking Structure', shiftStatus: 'overtime' },
  { id: 's4', name: 'Priya Nair', role: 'Facilities Engineer', zone: 'HVAC Floor 2', shiftStatus: 'on-duty' },
  { id: 's5', name: 'James Okonkwo', role: 'Maintenance Tech', zone: 'Loading Dock', shiftStatus: 'break' },
];

const SYSTEM_READINGS: SystemReading[] = [
  { label: 'Boiler Output Temp', value: '180', unit: '°F', icon: Flame, trend: 'normal' },
  { label: 'Chiller Leaving Temp', value: '47', unit: '°F', icon: Snowflake, trend: 'high' },
  { label: 'Outside Air Temp', value: '61', unit: '°F', icon: Wind, trend: 'normal' },
  { label: 'Electrical Load', value: '64', unit: '%', icon: Zap, trend: 'normal' },
  { label: 'Water Pressure (Main)', value: '62', unit: ' psi', icon: Droplets, trend: 'normal' },
];

const SCHEDULE: ScheduleEvent[] = [
  { id: 'e1', title: 'OSHA Fire Suppression Inspection', time: '10:00 AM', type: 'inspection' },
  { id: 'e2', title: 'Chiller #1 Quarterly PM', time: '1:00 PM', type: 'pm' },
  { id: 'e3', title: 'B-Shift Changeover', time: '3:00 PM', type: 'shift' },
  { id: 'e4', title: 'HVAC Parts Vendor Arrival', time: '4:30 PM', type: 'vendor' },
];

const EMERGENCY_SYSTEMS: EmergencySystem[] = [
  {
    name: 'Fire Suppression',
    status: 'ready',
    detail: 'All zones pressurized — 14 sprinkler zones nominal',
    lastVerified: 'April 18, 2026',
    icon: ShieldCheck,
  },
  {
    name: 'Emergency Exits',
    status: 'ready',
    detail: '22 exits operational — last full test passed',
    lastVerified: 'April 10, 2026',
    icon: MapPin,
  },
  {
    name: 'AED Locations',
    status: 'check-required',
    detail: '6 units on-site — Unit AED-04 (Loading Dock) battery alert',
    lastVerified: 'March 29, 2026',
    icon: Activity,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: ZoneStatus) {
  if (status === 'online') return 'text-emerald-400';
  if (status === 'warning') return 'text-amber-400';
  return 'text-red-400';
}

function statusBg(status: ZoneStatus) {
  if (status === 'online') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  if (status === 'warning') return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  return 'bg-red-500/15 border-red-500/30 text-red-300';
}

function severityBg(severity: Alert['severity']) {
  if (severity === 'critical') return 'bg-red-500/20 border-red-500/40 text-red-300';
  if (severity === 'high') return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
  if (severity === 'medium') return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
  return 'bg-slate-500/20 border-slate-500/40 text-slate-300';
}

function priorityBg(priority: WorkOrder['priority']) {
  if (priority === 'critical') return 'bg-red-500/20 text-red-300 border-red-500/40';
  if (priority === 'high') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  if (priority === 'medium') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  return 'bg-slate-600/40 text-slate-300 border-slate-500/40';
}

function shiftBg(status: StaffMember['shiftStatus']) {
  if (status === 'on-duty') return 'bg-emerald-500/20 text-emerald-300';
  if (status === 'overtime') return 'bg-orange-500/20 text-orange-300';
  return 'bg-slate-600/40 text-slate-400';
}

function scheduleIcon(type: ScheduleEvent['type']) {
  if (type === 'inspection') return ShieldCheck;
  if (type === 'pm') return Wrench;
  if (type === 'shift') return HardHat;
  return TruckIcon;
}

function readingColor(trend: SystemReading['trend']) {
  if (trend === 'high') return 'text-amber-400';
  if (trend === 'low') return 'text-sky-400';
  return 'text-cyan-300';
}

// ─── Pulsing dot ──────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', color)} />
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FacilityCommandCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: 'Alert acknowledged', description: 'Alert has been dismissed from the active queue.' });
  };

  const handleZoneClick = (id: string) => {
    setSelectedZone((prev) => (prev === id ? null : id));
  };

  const selectedZoneData = ZONES.find((z) => z.id === selectedZone);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <Radio className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Facility Command Center</h1>
              <p className="text-sm text-muted-foreground">Situation Room — Live Operational View · Thu, April 24, 2026</p>
            </div>
          </div>
          <Badge className="self-start sm:self-auto bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-medium px-3 py-1">
            LIVE
          </Badge>
        </div>

        {/* ── Row 1: Live Status Strip ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Systems */}
          <div className="flex items-center gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
            <PulseDot color="bg-emerald-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Systems</p>
              <p className="text-xl font-bold text-emerald-300">8 / 9 Operational</p>
            </div>
            <Activity className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          </div>

          {/* Staff */}
          <div className="flex items-center gap-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-5 py-4">
            <PulseDot color="bg-cyan-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Staff Active</p>
              <p className="text-xl font-bold text-cyan-300">17 / 22 On Duty</p>
            </div>
            <Users className="h-5 w-5 text-cyan-500 flex-shrink-0" />
          </div>

          {/* Alerts */}
          <div className="flex items-center gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
            <PulseDot color="bg-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Active Alerts</p>
              <p className="text-xl font-bold text-amber-300">{alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          </div>
        </div>

        {/* ── Row 2: Floor Map + Alerts ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">

          {/* Zone Grid (70%) */}
          <div className="lg:col-span-7">
            <Card className="border border-border/60 bg-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-cyan-300">
                  <Building2 className="h-4 w-4" />
                  Live Facility Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ZONES.map((zone) => {
                    const isSelected = selectedZone === zone.id;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => handleZoneClick(zone.id)}
                        className={cn(
                          'text-left rounded-lg border p-3 transition-all duration-200',
                          'hover:border-cyan-500/40 hover:bg-cyan-500/5',
                          isSelected
                            ? 'border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                            : 'border-border/50 bg-background/40',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={cn('text-sm font-semibold leading-tight', isSelected ? 'text-cyan-200' : 'text-foreground')}>
                            {zone.name}
                          </span>
                          <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border flex-shrink-0', statusBg(zone.status))}>
                            {zone.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {zone.lastActivity}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {zone.staffCount}
                          </span>
                        </div>
                        {isSelected && (
                          <p className="mt-2 text-xs text-cyan-200/80 border-t border-cyan-500/20 pt-2 leading-relaxed">
                            {zone.detail}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!selectedZone && (
                  <p className="text-xs text-muted-foreground text-center pt-1">Click any zone to view details</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts (30%) */}
          <div className="lg:col-span-3">
            <Card className="border border-border/60 bg-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Active Alerts
                  {alerts.length > 0 && (
                    <span className="ml-auto text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full px-2 py-0.5">
                      {alerts.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">All clear — no active alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn('rounded-lg border p-3 space-y-2', severityBg(alert.severity))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{alert.type}</span>
                        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border', severityBg(alert.severity))}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{alert.description}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] opacity-60 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {alert.timeAgo}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2 hover:bg-white/10"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Row 3: Four Columns ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Active Work Orders */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                <Wrench className="h-4 w-4" /> Active Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {WORK_ORDERS.map((wo) => (
                <div key={wo.id} className="rounded-md border border-border/40 bg-background/30 p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-foreground leading-tight">{wo.title}</span>
                    <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border flex-shrink-0', priorityBg(wo.priority))}>
                      {wo.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><HardHat className="h-3 w-3" /> {wo.assignee}</span>
                    <span className="text-cyan-400/70">{wo.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Staff on Duty */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                <Users className="h-4 w-4" /> Staff on Duty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {STAFF.map((s) => (
                <div key={s.id} className="rounded-md border border-border/40 bg-background/30 p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{s.name}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', shiftBg(s.shiftStatus))}>
                      {s.shiftStatus === 'on-duty' ? 'On Duty' : s.shiftStatus === 'overtime' ? 'Overtime' : 'Break'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{s.role}</p>
                  <p className="text-[11px] text-cyan-400/70 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {s.zone}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Readings */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                <Activity className="h-4 w-4" /> System Readings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SYSTEM_READINGS.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">{r.label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-sm font-bold', readingColor(r.trend))}>
                          {r.value}{r.unit}
                        </span>
                        {r.trend !== 'normal' && (
                          <span className="text-[10px] text-amber-400 font-medium">
                            {r.trend === 'high' ? '▲ HIGH' : '▼ LOW'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                <CalendarClock className="h-4 w-4" /> Upcoming — Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {SCHEDULE.map((ev) => {
                const Icon = scheduleIcon(ev.type);
                return (
                  <div key={ev.id} className="flex items-start gap-3 rounded-md border border-border/40 bg-background/30 p-2.5">
                    <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0 mt-0.5">
                      <Icon className="h-3 w-3 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">{ev.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {ev.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Emergency Readiness ────────────────────────────────────── */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" />
              Emergency Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {EMERGENCY_SYSTEMS.map((sys) => {
                const Icon = sys.icon;
                const isReady = sys.status === 'ready';
                return (
                  <div
                    key={sys.name}
                    className={cn(
                      'rounded-xl border p-4 space-y-3',
                      isReady
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-red-500/25 bg-red-500/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-2 rounded-lg border', isReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')}>
                          <Icon className={cn('h-4 w-4', isReady ? 'text-emerald-400' : 'text-red-400')} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{sys.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded border',
                          isReady
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-red-500/20 border-red-500/40 text-red-300',
                        )}
                      >
                        {isReady ? 'Ready' : 'Check Required'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sys.detail}</p>
                    <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Last verified: {sys.lastVerified}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
