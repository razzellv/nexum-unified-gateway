import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield, Truck, Users, AlertTriangle, Clock, CheckCircle, XCircle,
  FileText, Award, Activity, Package, ArrowRight, Zap, TrendingUp,
  AlertOctagon, Radio, MapPin, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Mock / localStorage data ─────────────────────────────────────────────────
const MOCK_UNITS = [
  { id: 'E1',  label: 'Engine 1',       type: 'Fire',    status: 'available',   location: 'Station 1',   mileage: 42310 },
  { id: 'E2',  label: 'Engine 2',       type: 'Fire',    status: 'responding',  location: 'En Route',    mileage: 38900 },
  { id: 'L1',  label: 'Ladder 1',       type: 'Fire',    status: 'available',   location: 'Station 1',   mileage: 61200 },
  { id: 'R1',  label: 'Rescue 1',       type: 'Fire',    status: 'maintenance', location: 'Shop',        mileage: 29840 },
  { id: 'P14', label: 'Police Unit 14', type: 'Police',  status: 'available',   location: 'Patrol Zone 2', mileage: 88450 },
  { id: 'P22', label: 'Police Unit 22', type: 'Police',  status: 'responding',  location: 'Incident 44',  mileage: 72310 },
  { id: 'P07', label: 'Police Unit 7',  type: 'Police',  status: 'off_duty',    location: 'Station',      mileage: 55220 },
  { id: 'M1',  label: 'Medic 1',        type: 'EMS',     status: 'available',   location: 'Station 2',    mileage: 44100 },
];

const MOCK_PERSONNEL = [
  { id: 'p1', name: 'Capt. R. Torres',  rank: 'Captain',  unit: 'E1', certs: [{ name: 'FF II', expiry: '2026-08-15' }, { name: 'HazMat', expiry: '2025-09-01' }, { name: 'EMT-B', expiry: '2027-03-12' }] },
  { id: 'p2', name: 'Lt. D. Okafor',    rank: 'Lieutenant', unit: 'E2', certs: [{ name: 'FF II', expiry: '2026-11-30' }, { name: 'Driver/Op', expiry: '2026-05-20' }] },
  { id: 'p3', name: 'FF J. Martinez',   rank: 'Firefighter', unit: 'L1', certs: [{ name: 'FF I', expiry: '2025-12-01' }, { name: 'EMT-B', expiry: '2026-02-14' }] },
  { id: 'p4', name: 'Ofc. A. Chen',     rank: 'Officer',  unit: 'P14', certs: [{ name: 'LE Cert', expiry: '2026-07-01' }, { name: 'TASER', expiry: '2025-10-15' }] },
  { id: 'p5', name: 'Ofc. M. Williams', rank: 'Officer',  unit: 'P22', certs: [{ name: 'LE Cert', expiry: '2027-01-20' }, { name: 'First Aid', expiry: '2025-08-30' }] },
  { id: 'p6', name: 'Medic K. Singh',   rank: 'Paramedic', unit: 'M1', certs: [{ name: 'Paramedic', expiry: '2026-09-10' }, { name: 'ACLS', expiry: '2025-11-22' }] },
];

const MOCK_INCIDENTS = [
  { id: 'INC-0044', type: 'Structure Fire', unit: 'E2', dispatch: '08:14', turnout: 1.2, travel: 4.8, total: 6.0, date: new Date().toISOString().split('T')[0] },
  { id: 'INC-0043', type: 'Medical Call', unit: 'M1', dispatch: '07:52', turnout: 0.9, travel: 3.1, total: 4.0, date: new Date().toISOString().split('T')[0] },
  { id: 'INC-0042', type: 'MVA', unit: 'P22', dispatch: '06:30', turnout: 1.5, travel: 5.2, total: 6.7, date: new Date().toISOString().split('T')[0] },
  { id: 'INC-0041', type: 'Alarm Activation', unit: 'E1', dispatch: '04:15', turnout: 1.1, travel: 2.9, total: 4.0, date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
];

const MOCK_CUSTODY_LOG = [
  { id: 'COC-091', item: 'Glock 17 — SN#G34219', action: 'Signed Out', officer: 'Ofc. A. Chen',     time: '06:00', shift: 'A' },
  { id: 'COC-092', item: 'AR-15 — SN#AR00412', action: 'Signed Out', officer: 'Ofc. M. Williams', time: '06:02', shift: 'A' },
  { id: 'COC-088', item: 'Glock 17 — SN#G34219', action: 'Returned',   officer: 'Ofc. A. Chen',     time: '18:05', shift: 'B' },
  { id: 'COC-089', item: 'TASER X26 — SN#T0091', action: 'Signed Out', officer: 'Ofc. S. Patel',    time: '18:10', shift: 'B' },
  { id: 'COC-085', item: 'Ballistic Vest — L #7', action: 'Inspected', officer: 'Sgt. R. Kim',       time: '18:30', shift: 'B' },
];

const MOCK_INVENTORY = [
  { id: 'inv-1', category: 'Firearms',    name: 'Glock 17 Service Pistol',    qty: 12, total: 12, condition: 'Good' },
  { id: 'inv-2', category: 'Firearms',    name: 'AR-15 Patrol Rifle',         qty: 6,  total: 8,  condition: 'Good' },
  { id: 'inv-3', category: 'Less-Lethal', name: 'TASER X26',                  qty: 8,  total: 10, condition: 'Good' },
  { id: 'inv-4', category: 'PPE',         name: 'Ballistic Vest (Level IIIA)', qty: 14, total: 16, condition: 'Good' },
  { id: 'inv-5', category: 'Uniform',     name: 'Class-A Dress Uniform',      qty: 18, total: 20, condition: 'Good' },
  { id: 'inv-6', category: 'Uniform',     name: 'Patrol Duty Uniform',        qty: 22, total: 24, condition: 'Good' },
  { id: 'inv-7', category: 'Fire PPE',    name: 'Turnout Gear Set',           qty: 9,  total: 10, condition: 'Good' },
  { id: 'inv-8', category: 'Fire PPE',    name: 'SCBA (Air Pack)',            qty: 6,  total: 8,  condition: 'Inspect' },
];

const NFPA_BENCHMARKS = { turnout: 1.5, travel: 4, total: 8 }; // minutes

function getDaysUntilExpiry(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function certColor(days: number) {
  if (days < 0) return 'text-red-400 border-red-400/30';
  if (days <= 60) return 'text-orange-400 border-orange-400/30';
  if (days <= 180) return 'text-yellow-400 border-yellow-400/30';
  return 'text-green-400 border-green-400/30';
}

function statusBadge(status: string) {
  switch (status) {
    case 'available':   return { label: 'Available',    cls: 'border-green-400/40 text-green-400 bg-green-400/5' };
    case 'responding':  return { label: 'Responding',   cls: 'border-blue-400/40 text-blue-400 bg-blue-400/5' };
    case 'maintenance': return { label: 'Maintenance',  cls: 'border-yellow-400/40 text-yellow-400 bg-yellow-400/5' };
    case 'off_duty':    return { label: 'Off Duty',     cls: 'border-muted-foreground/30 text-muted-foreground' };
    default:            return { label: status,         cls: 'border-border/30 text-muted-foreground' };
  }
}

export default function GovernmentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [custodyNew, setCustodyNew] = useState({ item: '', action: 'Signed Out', officer: '', time: new Date().toTimeString().slice(0, 5) });
  const [custodyLog, setCustodyLog] = useState(MOCK_CUSTODY_LOG);
  const [showAddCustody, setShowAddCustody] = useState(false);

  const units = MOCK_UNITS;
  const personnel = MOCK_PERSONNEL;
  const todayIncidents = MOCK_INCIDENTS.filter(i => i.date === new Date().toISOString().split('T')[0]);

  const availableUnits = units.filter(u => u.status === 'available').length;
  const respondingUnits = units.filter(u => u.status === 'responding').length;

  // Response metric averages (today)
  const avgTurnout = todayIncidents.length
    ? (todayIncidents.reduce((s, i) => s + i.turnout, 0) / todayIncidents.length).toFixed(1)
    : '—';
  const avgTravel = todayIncidents.length
    ? (todayIncidents.reduce((s, i) => s + i.travel, 0) / todayIncidents.length).toFixed(1)
    : '—';
  const avgTotal = todayIncidents.length
    ? (todayIncidents.reduce((s, i) => s + i.total, 0) / todayIncidents.length).toFixed(1)
    : '—';

  // Certification readiness
  const allCerts = personnel.flatMap(p => p.certs.map(c => ({ ...c, name: p.name })));
  const expiredCerts = allCerts.filter(c => getDaysUntilExpiry(c.expiry) < 0);
  const expiringCerts = allCerts.filter(c => { const d = getDaysUntilExpiry(c.expiry); return d >= 0 && d <= 60; });
  const personnelReadiness = Math.round(((allCerts.length - expiredCerts.length) / allCerts.length) * 100);

  const addCustodyEntry = () => {
    if (!custodyNew.item || !custodyNew.officer) return;
    const id = `COC-${String(custodyLog.length + 90).padStart(3, '0')}`;
    const shift = new Date().getHours() < 18 ? 'A' : 'B';
    setCustodyLog([{ id, ...custodyNew, shift }, ...custodyLog]);
    setCustodyNew({ item: '', action: 'Signed Out', officer: '', time: new Date().toTimeString().slice(0, 5) });
    setShowAddCustody(false);
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Public Safety Command</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">Gov / Public Safety</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {user?.facilityId && <span className="ml-2 text-muted-foreground/60">· {user.facilityId}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory-library')} className="border-border/50">
              <Package className="w-4 h-4 mr-2" />Inventory
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate('/pricing')}>
              <Zap className="w-4 h-4 mr-2" />Upgrade to Standard
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Units Available', value: `${availableUnits}/${units.length}`,
              icon: Radio, color: availableUnits >= units.length * 0.7 ? 'text-green-400' : 'text-yellow-400',
              sub: `${respondingUnits} responding`,
            },
            {
              label: "Today's Incidents", value: todayIncidents.length,
              icon: AlertTriangle, color: 'text-blue-400',
              sub: 'dispatched today',
            },
            {
              label: 'Avg Response Time', value: avgTotal === '—' ? '—' : `${avgTotal}m`,
              icon: Clock,
              color: avgTotal === '—' ? 'text-muted-foreground' : parseFloat(avgTotal) <= NFPA_BENCHMARKS.total ? 'text-green-400' : 'text-yellow-400',
              sub: `NFPA target ≤${NFPA_BENCHMARKS.total}m`,
            },
            {
              label: 'Personnel Readiness', value: `${personnelReadiness}%`,
              icon: Award,
              color: personnelReadiness >= 90 ? 'text-green-400' : personnelReadiness >= 70 ? 'text-yellow-400' : 'text-red-400',
              sub: `${expiredCerts.length} cert(s) expired`,
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="neon-border">
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

        {/* Unit Availability + Response Metrics */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Unit Availability */}
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="w-4 h-4 text-primary" />Unit Availability Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-y-auto">
              {units.map(unit => {
                const badge = statusBadge(unit.status);
                return (
                  <div key={unit.id} className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg border',
                    unit.status === 'available' ? 'border-green-400/20 bg-green-400/5' :
                    unit.status === 'responding' ? 'border-blue-400/20 bg-blue-400/5' :
                    unit.status === 'maintenance' ? 'border-yellow-400/20 bg-yellow-400/5' :
                    'border-border/20 bg-muted/10'
                  )}>
                    <div className="flex items-center gap-3">
                      {unit.status === 'available'
                        ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        : unit.status === 'maintenance'
                        ? <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                        : unit.status === 'responding'
                        ? <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                        : <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-medium">{unit.label}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{unit.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{unit.mileage.toLocaleString()} mi</span>
                      <Badge variant="outline" className={cn('text-[10px]', badge.cls)}>{badge.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Response Metrics */}
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" />Response Metrics
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">NFPA 1710 Benchmark</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Benchmark bars */}
              {[
                { label: 'Avg Turnout Time', value: parseFloat(avgTurnout) || 0, target: NFPA_BENCHMARKS.turnout, unit: 'min', raw: avgTurnout },
                { label: 'Avg Travel Time',  value: parseFloat(avgTravel) || 0,  target: NFPA_BENCHMARKS.travel,  unit: 'min', raw: avgTravel },
                { label: 'Total Response',   value: parseFloat(avgTotal) || 0,   target: NFPA_BENCHMARKS.total,   unit: 'min', raw: avgTotal },
              ].map(metric => {
                const pct = metric.raw === '—' ? 0 : Math.min(100, (metric.value / (metric.target * 2)) * 100);
                const onTarget = metric.raw !== '—' && metric.value <= metric.target;
                return (
                  <div key={metric.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className={cn('font-semibold', onTarget ? 'text-green-400' : metric.raw === '—' ? 'text-muted-foreground' : 'text-yellow-400')}>
                        {metric.raw === '—' ? '—' : `${metric.raw}m`}
                        <span className="text-muted-foreground font-normal ml-1">/ {metric.target}m target</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}

              {/* Today's incident log */}
              <div className="pt-2 border-t border-border/20">
                <p className="text-xs text-muted-foreground mb-2">Today's Dispatches</p>
                {todayIncidents.length === 0 && (
                  <p className="text-xs text-muted-foreground/50">No incidents logged today.</p>
                )}
                {todayIncidents.map(inc => (
                  <div key={inc.id} className="flex items-center justify-between py-1.5 text-xs border-b border-border/10 last:border-0">
                    <div>
                      <span className="font-medium">{inc.id}</span>
                      <span className="text-muted-foreground ml-2">{inc.type}</span>
                    </div>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>TO: <span className={cn('font-medium', inc.turnout <= NFPA_BENCHMARKS.turnout ? 'text-green-400' : 'text-yellow-400')}>{inc.turnout}m</span></span>
                      <span>TR: <span className={cn('font-medium', inc.travel <= NFPA_BENCHMARKS.travel ? 'text-green-400' : 'text-yellow-400')}>{inc.travel}m</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personnel & Certifications + Chain of Custody */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Personnel Certifications */}
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" />Personnel & Certifications
                {expiredCerts.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[10px] border-red-400/30 text-red-400">
                    {expiredCerts.length} expired
                  </Badge>
                )}
                {expiringCerts.length > 0 && (
                  <Badge variant="outline" className="text-[10px] border-orange-400/30 text-orange-400">
                    {expiringCerts.length} expiring
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {personnel.map(p => (
                <div key={p.id} className="p-2.5 rounded-lg border border-border/30 bg-muted/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-[10px] text-muted-foreground">{p.rank} · {p.unit}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.certs.map((cert, ci) => {
                      const days = getDaysUntilExpiry(cert.expiry);
                      const color = certColor(days);
                      return (
                        <span key={ci} className={cn('text-[10px] px-2 py-0.5 rounded-full border', color)}>
                          {cert.name}
                          <span className="opacity-70 ml-1">
                            {days < 0 ? 'EXPIRED' : days <= 60 ? `${days}d` : cert.expiry}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chain of Custody */}
          <Card className="neon-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4 text-primary" />Chain of Custody
                </CardTitle>
                <Button size="sm" variant="outline" className="text-xs h-7 px-2 border-border/40"
                  onClick={() => setShowAddCustody(v => !v)}>
                  + Log Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {showAddCustody && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 mb-3">
                  <input
                    className="w-full text-xs bg-background border border-border/40 rounded px-2 py-1.5"
                    placeholder="Item (e.g. Glock 17 — SN#G34219)"
                    value={custodyNew.item}
                    onChange={e => setCustodyNew({ ...custodyNew, item: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 text-xs bg-background border border-border/40 rounded px-2 py-1.5"
                      placeholder="Officer name"
                      value={custodyNew.officer}
                      onChange={e => setCustodyNew({ ...custodyNew, officer: e.target.value })}
                    />
                    <select
                      className="text-xs bg-background border border-border/40 rounded px-2 py-1.5"
                      value={custodyNew.action}
                      onChange={e => setCustodyNew({ ...custodyNew, action: e.target.value })}
                    >
                      <option>Signed Out</option>
                      <option>Returned</option>
                      <option>Inspected</option>
                      <option>Transferred</option>
                    </select>
                    <input
                      type="time"
                      className="text-xs bg-background border border-border/40 rounded px-2 py-1.5"
                      value={custodyNew.time}
                      onChange={e => setCustodyNew({ ...custodyNew, time: e.target.value })}
                    />
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs" onClick={addCustodyEntry}>Save Entry</Button>
                </div>
              )}
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {custodyLog.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between p-2.5 rounded-lg border border-border/20 bg-muted/10 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <FileText className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-medium text-muted-foreground/60">{entry.id}</span>
                        <Badge variant="outline" className={cn('text-[10px] py-0',
                          entry.action === 'Signed Out' ? 'border-blue-400/30 text-blue-400' :
                          entry.action === 'Returned' ? 'border-green-400/30 text-green-400' :
                          'border-muted-foreground/30 text-muted-foreground'
                        )}>{entry.action}</Badge>
                      </div>
                      <p className="font-medium">{entry.item}</p>
                      <p className="text-muted-foreground">{entry.officer}</p>
                    </div>
                    <div className="text-right text-muted-foreground shrink-0 ml-3">
                      <p>{entry.time}</p>
                      <p>Shift {entry.shift}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weapons & Uniform Inventory */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-primary" />Weapons &amp; Uniform Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MOCK_INVENTORY.map(item => {
                const pct = Math.round((item.qty / item.total) * 100);
                const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={item.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.category}</span>
                      <Badge variant="outline" className={cn('text-[10px]',
                        item.condition === 'Good' ? 'border-green-400/30 text-green-400' : 'border-yellow-400/30 text-yellow-400'
                      )}>{item.condition}</Badge>
                    </div>
                    <p className="text-xs font-medium leading-tight">{item.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">In Service</span>
                        <span className={cn('font-semibold', color)}>{item.qty}/{item.total}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Expiring cert alerts */}
        {(expiredCerts.length > 0 || expiringCerts.length > 0) && (
          <Card className="neon-border border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-orange-400">
                <AlertOctagon className="w-4 h-4" />Certification Alerts — Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...expiredCerts, ...expiringCerts].map((cert, idx) => {
                  const days = getDaysUntilExpiry(cert.expiry);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{cert.name}</p>
                        <p className="text-xs text-muted-foreground">{(cert as any).name}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', days < 0 ? 'border-red-500/30 text-red-400' : days <= 30 ? 'border-orange-400/30 text-orange-400' : 'border-yellow-400/30 text-yellow-400')}>
                        {days < 0 ? 'EXPIRED' : `${days}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade CTA */}
        <div className="glass-panel rounded-2xl p-6 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">Ready for full command intelligence?</p>
                <p className="text-sm text-muted-foreground mt-1">Upgrade to Standard and get CAD integration, shift scheduling, work order management, compliance document storage, and multi-station analytics.</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['CAD Integration', 'Shift Scheduling', 'Work Orders', 'Compliance Docs', 'Multi-Station'].map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5">{f}</span>
                  ))}
                </div>
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground shrink-0" onClick={() => navigate('/pricing')}>
              Upgrade to Standard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
