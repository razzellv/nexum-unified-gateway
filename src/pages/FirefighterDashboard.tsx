import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Flame, ShieldAlert, CheckCircle, Clock, AlertTriangle,
  Plus, X, Truck, Wind, Award, FileText, ChevronRight
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ApparatusCheck {
  id: string;
  name: string;
  checkedAt?: string;
  checkedBy?: string;
  date?: string;
}

interface ScbaEntry {
  id: string;
  date: string;
  unitNumber: string;
  airPressurePsi: number;
  lowPressureAlarm: 'Pass' | 'Fail';
  facePieceSeal: 'Pass' | 'Fail';
  checkedBy: string;
  notes: string;
}

interface CertEntry {
  id: string;
  personName: string;
  certType: string;
  issuedDate: string;
  expiryDate: string;
}

interface RunReport {
  id: string;
  dateTime: string;
  incidentType: string;
  address: string;
  alarmCad: string;
  role: string;
  disposition: string;
  notes: string;
}

// ─── localStorage keys ──────────────────────────────────────────────────────
const LS_APPARATUS = 'nexum_apparatus_checks';
const LS_SCBA = 'nexum_scba_log';
const LS_CERTS = 'nexum_ff_certs';
const LS_RUNS = 'nexum_run_reports';

// ─── Today helpers ──────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const nowIso = () => new Date().toISOString();
const currentMonthYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Mock data ───────────────────────────────────────────────────────────────
const TODAY = todayStr();
const MONTH = currentMonthYear();

const MOCK_APPARATUS: ApparatusCheck[] = [
  { id: 'app-1', name: 'Engine 1', checkedAt: `${TODAY}T06:12:00.000Z`, checkedBy: 'FF Martinez', date: TODAY },
  { id: 'app-2', name: 'Engine 2', date: undefined },
  { id: 'app-3', name: 'Ladder 1', checkedAt: `${TODAY}T06:18:00.000Z`, checkedBy: 'Capt. Torres', date: TODAY },
  { id: 'app-4', name: 'Rescue 1', date: undefined },
  { id: 'app-5', name: 'Medic 7', date: undefined },
];

const MOCK_SCBA: ScbaEntry[] = [
  { id: 'scba-1', date: TODAY, unitNumber: 'SCBA-01', airPressurePsi: 4500, lowPressureAlarm: 'Pass', facePieceSeal: 'Pass', checkedBy: 'FF Martinez', notes: '' },
  { id: 'scba-2', date: TODAY, unitNumber: 'SCBA-02', airPressurePsi: 4350, lowPressureAlarm: 'Pass', facePieceSeal: 'Fail', checkedBy: 'Lt. Okafor', notes: 'Seal replacement needed on left side' },
  {
    id: 'scba-3',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    unitNumber: 'SCBA-03', airPressurePsi: 4500, lowPressureAlarm: 'Pass', facePieceSeal: 'Pass',
    checkedBy: 'FF Singh', notes: ''
  },
  {
    id: 'scba-4',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    unitNumber: 'SCBA-04', airPressurePsi: 4200, lowPressureAlarm: 'Fail', facePieceSeal: 'Pass',
    checkedBy: 'Capt. Torres', notes: 'Alarm whistle replaced — recheck tomorrow'
  },
];

const future30 = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];
const future60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
const past = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];

const MOCK_CERTS: CertEntry[] = [
  { id: 'cert-1', personName: 'FF J. Martinez', certType: 'Firefighter I', issuedDate: '2022-03-15', expiryDate: '2027-03-15' },
  { id: 'cert-2', personName: 'FF J. Martinez', certType: 'EMT-Basic', issuedDate: '2023-06-01', expiryDate: future30 },
  { id: 'cert-3', personName: 'Lt. D. Okafor', certType: 'Firefighter II', issuedDate: '2020-09-10', expiryDate: future60 },
  { id: 'cert-4', personName: 'Capt. R. Torres', certType: 'Hazmat Technician', issuedDate: '2019-04-22', expiryDate: past },
  { id: 'cert-5', personName: 'Medic K. Singh', certType: 'Paramedic', issuedDate: '2021-11-30', expiryDate: '2026-11-30' },
  { id: 'cert-6', personName: 'FF A. Brooks', certType: 'Driver/Operator', issuedDate: '2023-01-07', expiryDate: future30 },
];

const MOCK_RUNS: RunReport[] = [
  { id: 'run-1', dateTime: `${MONTH}-03T08:14:00.000Z`, incidentType: 'Structure Fire', address: '412 Oak Street', alarmCad: 'CAD-0044', role: 'Attack', disposition: 'Controlled', notes: 'Room-and-contents fire, second floor' },
  { id: 'run-2', dateTime: `${MONTH}-05T14:32:00.000Z`, incidentType: 'Medical Call', address: '901 Maple Ave', alarmCad: 'CAD-0047', role: 'EMS', disposition: 'Patient Transported', notes: 'Chest pain, ALS dispatched' },
  { id: 'run-3', dateTime: `${MONTH}-08T22:05:00.000Z`, incidentType: 'Alarm Activation', address: '55 Commerce Blvd', alarmCad: 'CAD-0051', role: 'Driver', disposition: 'Unfounded', notes: 'Cooking smoke — no fire' },
  { id: 'run-4', dateTime: `${MONTH}-11T10:47:00.000Z`, incidentType: 'MVA w/ Entrapment', address: 'I-90 MM 24', alarmCad: 'CAD-0058', role: 'Backup', disposition: 'Mutual Aid', notes: 'Three patients, extrication performed' },
];

// ─── Cert status helper ──────────────────────────────────────────────────────
function certStatus(expiryDate: string): { label: string; cls: string } {
  const now = new Date();
  const exp = new Date(expiryDate);
  const diff = (exp.getTime() - now.getTime()) / 86400000;
  if (diff < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700 border-red-200' };
  if (diff <= 30) return { label: 'Expiring Soon', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: 'Current', cls: 'bg-green-100 text-green-700 border-green-200' };
}

// ─── SCBA serviceable ───────────────────────────────────────────────────────
function scbaServiceable(entry: ScbaEntry) {
  return entry.lowPressureAlarm === 'Pass' && entry.facePieceSeal === 'Pass';
}

// ─── Blank forms ─────────────────────────────────────────────────────────────
const BLANK_SCBA: Omit<ScbaEntry, 'id'> = {
  date: TODAY, unitNumber: '', airPressurePsi: 4500,
  lowPressureAlarm: 'Pass', facePieceSeal: 'Pass',
  checkedBy: '', notes: '',
};

const BLANK_CERT: Omit<CertEntry, 'id'> = {
  personName: '', certType: '', issuedDate: '', expiryDate: '',
};

const BLANK_RUN: Omit<RunReport, 'id'> = {
  dateTime: new Date().toISOString().slice(0, 16),
  incidentType: '', address: '', alarmCad: '', role: '', disposition: '', notes: '',
};

const CERT_TYPES = [
  'Firefighter I', 'Firefighter II', 'EMT-Basic', 'AEMT', 'Paramedic',
  'Hazmat Operations', 'Hazmat Technician', 'Driver/Operator', 'Fire Officer I',
  'CPR/AED', 'NIMS ICS-100', 'NIMS ICS-200', 'Other',
];

const RUN_INCIDENT_TYPES = [
  'Structure Fire', 'Alarm Activation', 'Medical Call', 'MVA', 'MVA w/ Entrapment',
  'Wildland Fire', 'Hazmat Incident', 'Water Rescue', 'Technical Rescue', 'Public Assist',
];

const RUN_ROLES = ['Driver', 'Attack', 'Backup', 'EMS', 'Command', 'Rescue', 'RIT'];

const RUN_DISPOSITIONS = [
  'Controlled', 'Unfounded', 'Patient Transported', 'Patient Refused', 'Mutual Aid', 'Cancelled'
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function FirefighterDashboard() {
  const [apparatus, setApparatus] = useState<ApparatusCheck[]>([]);
  const [scbaLog, setScbaLog] = useState<ScbaEntry[]>([]);
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [runReports, setRunReports] = useState<RunReport[]>([]);

  // Modal state
  const [showScbaModal, setShowScbaModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showAddApparatus, setShowAddApparatus] = useState(false);

  // Form state
  const [scbaForm, setScbaForm] = useState<Omit<ScbaEntry, 'id'>>(BLANK_SCBA);
  const [certForm, setCertForm] = useState<Omit<CertEntry, 'id'>>(BLANK_CERT);
  const [runForm, setRunForm] = useState<Omit<RunReport, 'id'>>(BLANK_RUN);
  const [newApparatusName, setNewApparatusName] = useState('');
  const [checkerName, setCheckerName] = useState('');

  // Load from localStorage (or seed mock data)
  useEffect(() => {
    const loadOrSeed = <T,>(key: string, mock: T[]): T[] => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { return JSON.parse(raw) as T[]; } catch { /* fall through */ }
      }
      localStorage.setItem(key, JSON.stringify(mock));
      return mock;
    };
    setApparatus(loadOrSeed(LS_APPARATUS, MOCK_APPARATUS));
    setScbaLog(loadOrSeed(LS_SCBA, MOCK_SCBA));
    setCerts(loadOrSeed(LS_CERTS, MOCK_CERTS));
    setRunReports(loadOrSeed(LS_RUNS, MOCK_RUNS));
  }, []);

  // ─── KPI derivations ────────────────────────────────────────────────────────
  const apparatusCheckedToday = apparatus.filter(a => a.date === TODAY).length;
  const scbaCheckedToday = scbaLog.filter(s => s.date === TODAY).length;
  const certsExpiringSoon = certs.filter(c => {
    const diff = (new Date(c.expiryDate).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;
  const runsThisMonth = runReports.filter(r => r.dateTime.startsWith(MONTH)).length;

  // ─── Actions ────────────────────────────────────────────────────────────────
  const markApparatusChecked = (id: string) => {
    if (!checkerName.trim()) {
      toast.error('Enter your name before marking apparatus checked.');
      return;
    }
    const updated = apparatus.map(a =>
      a.id === id
        ? { ...a, checkedAt: nowIso(), checkedBy: checkerName.trim(), date: TODAY }
        : a
    );
    setApparatus(updated);
    localStorage.setItem(LS_APPARATUS, JSON.stringify(updated));
    toast.success('Apparatus check logged.');
  };

  const addApparatus = () => {
    if (!newApparatusName.trim()) return;
    const entry: ApparatusCheck = { id: `app-${Date.now()}`, name: newApparatusName.trim() };
    const updated = [...apparatus, entry];
    setApparatus(updated);
    localStorage.setItem(LS_APPARATUS, JSON.stringify(updated));
    setNewApparatusName('');
    setShowAddApparatus(false);
    toast.success(`${entry.name} added.`);
  };

  const saveScba = () => {
    if (!scbaForm.unitNumber.trim() || !scbaForm.checkedBy.trim()) {
      toast.error('Unit # and Checked By are required.');
      return;
    }
    const entry: ScbaEntry = { ...scbaForm, id: `scba-${Date.now()}` };
    const updated = [entry, ...scbaLog];
    setScbaLog(updated);
    localStorage.setItem(LS_SCBA, JSON.stringify(updated));
    setScbaForm(BLANK_SCBA);
    setShowScbaModal(false);
    toast.success('SCBA check logged.');
  };

  const saveCert = () => {
    if (!certForm.personName.trim() || !certForm.certType || !certForm.issuedDate || !certForm.expiryDate) {
      toast.error('All certification fields are required.');
      return;
    }
    const entry: CertEntry = { ...certForm, id: `cert-${Date.now()}` };
    const updated = [entry, ...certs];
    setCerts(updated);
    localStorage.setItem(LS_CERTS, JSON.stringify(updated));
    setCertForm(BLANK_CERT);
    setShowCertModal(false);
    toast.success('Certification added.');
  };

  const saveRun = () => {
    if (!runForm.incidentType || !runForm.address.trim() || !runForm.role || !runForm.disposition) {
      toast.error('Incident type, address, role, and disposition are required.');
      return;
    }
    const entry: RunReport = { ...runForm, id: `run-${Date.now()}` };
    const updated = [entry, ...runReports];
    setRunReports(updated);
    localStorage.setItem(LS_RUNS, JSON.stringify(updated));
    setRunForm(BLANK_RUN);
    setShowRunModal(false);
    toast.success('Run report logged.');
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  // ─── KPI Card ───────────────────────────────────────────────────────────────
  const KpiCard = ({
    icon: Icon, label, value, sub, accent
  }: { icon: any; label: string; value: number; sub: string; accent: string }) => (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
            <p className={cn('text-3xl font-bold', accent)}>{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={cn('p-2 rounded-lg flex-shrink-0', `${accent.replace('text-', 'bg-')}/10`)}>
            <Icon className={cn('w-5 h-5', accent)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Modal wrapper ──────────────────────────────────────────────────────────
  const Modal = ({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={onSave}>Save</Button>
        </div>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-600/20">
              <Flame className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Apparatus &amp; Readiness</h1>
              <p className="text-sm text-muted-foreground">
                Station Operations &mdash;{' '}
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-red-600/30 text-red-600 hover:bg-red-600/10"
              onClick={() => { setRunForm(BLANK_RUN); setShowRunModal(true); }}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Log Run Report
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { setCertForm(BLANK_CERT); setShowCertModal(true); }}
            >
              <Award className="w-4 h-4 mr-1.5" />
              Add Certification
            </Button>
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Truck} label="Apparatus Checks Today" value={apparatusCheckedToday} sub="of today's checks" accent="text-red-500" />
          <KpiCard icon={Wind} label="SCBA Units Checked" value={scbaCheckedToday} sub="checked today" accent="text-orange-500" />
          <KpiCard icon={AlertTriangle} label="Certs Expiring in 30 Days" value={certsExpiringSoon} sub="personnel certs" accent="text-yellow-500" />
          <KpiCard icon={ShieldAlert} label="Calls This Month" value={runsThisMonth} sub={new Date().toLocaleDateString('en-US', { month: 'long' })} accent="text-blue-500" />
        </div>

        {/* ── Daily Apparatus Check ────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-500" />
                <CardTitle className="text-sm font-semibold">Daily Apparatus Check</CardTitle>
              </div>
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowAddApparatus(v => !v)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Apparatus
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Checker name input */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Your Name:</Label>
              <Input
                className="h-7 text-xs flex-1"
                placeholder="Enter your name to log checks…"
                value={checkerName}
                onChange={e => setCheckerName(e.target.value)}
              />
            </div>

            {/* Add apparatus inline */}
            {showAddApparatus && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <Input
                  className="h-7 text-xs flex-1"
                  placeholder="Apparatus name (e.g. Engine 3)"
                  value={newApparatusName}
                  onChange={e => setNewApparatusName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addApparatus()}
                />
                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={addApparatus}>Add</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddApparatus(false)}>Cancel</Button>
              </div>
            )}

            {/* Apparatus list */}
            <div className="divide-y divide-border/50 rounded-lg border border-border/40 overflow-hidden">
              {apparatus.map(a => {
                const isChecked = a.date === TODAY;
                return (
                  <div key={a.id} className={cn('flex items-center justify-between px-4 py-3 gap-3', isChecked ? 'bg-green-500/5' : 'bg-background')}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isChecked ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                      <span className="text-sm font-medium truncate">{a.name}</span>
                    </div>
                    {isChecked ? (
                      <div className="flex items-center gap-2 text-xs text-green-600 flex-shrink-0">
                        <CheckCircle className="w-4 h-4" />
                        <span>{formatTime(a.checkedAt!)} by {a.checkedBy}</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                        onClick={() => markApparatusChecked(a.id)}
                      >
                        Mark Checked
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── SCBA / Equipment Log ─────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-sm font-semibold">SCBA / Equipment Log</CardTitle>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { setScbaForm(BLANK_SCBA); setShowScbaModal(true); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add SCBA Check
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit #</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">PSI</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Low-P Alarm</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Face Seal</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Checked By</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {scbaLog.map(s => {
                    const svc = scbaServiceable(s);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{s.date}</td>
                        <td className="px-4 py-2.5 font-medium">{s.unitNumber}</td>
                        <td className="px-4 py-2.5">{s.airPressurePsi.toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('font-medium', s.lowPressureAlarm === 'Pass' ? 'text-green-600' : 'text-red-600')}>{s.lowPressureAlarm}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('font-medium', s.facePieceSeal === 'Pass' ? 'text-green-600' : 'text-red-600')}>{s.facePieceSeal}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.checkedBy}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn('text-[10px] px-1.5 py-0.5 border', svc ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200')}>
                            {svc ? 'Serviceable' : 'Action Required'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[180px] truncate">{s.notes || '—'}</td>
                      </tr>
                    );
                  })}
                  {scbaLog.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No SCBA checks logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Certification Tracker ─────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <CardTitle className="text-sm font-semibold">Certification Tracker</CardTitle>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { setCertForm(BLANK_CERT); setShowCertModal(true); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Certification
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Certification</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Issued</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Expires</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {certs.map(c => {
                    const { label, cls } = certStatus(c.expiryDate);
                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{c.personName}</td>
                        <td className="px-4 py-2.5">{c.certType}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.issuedDate}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.expiryDate}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn('text-[10px] px-1.5 py-0.5 border', cls)}>{label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {certs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No certifications logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Run Report Log ───────────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold">Run Report Log</CardTitle>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { setRunForm(BLANK_RUN); setShowRunModal(true); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Log Run Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date / Time</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Incident Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Address</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Alarm / CAD #</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Disposition</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {runReports.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDateTime(r.dateTime)}</td>
                      <td className="px-4 py-2.5 font-medium">{r.incidentType}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.address}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono">{r.alarmCad || '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge className="text-[10px] px-1.5 py-0.5 border bg-blue-100 text-blue-700 border-blue-200">{r.role}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={cn('text-[10px] px-1.5 py-0.5 border',
                          r.disposition === 'Controlled' ? 'bg-green-100 text-green-700 border-green-200' :
                          r.disposition === 'Unfounded' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          r.disposition === 'Patient Transported' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          r.disposition === 'Mutual Aid' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                        )}>{r.disposition}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[180px] truncate">{r.notes || '—'}</td>
                    </tr>
                  ))}
                  {runReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No run reports logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SCBA Modal ────────────────────────────────────────────────────────── */}
      {showScbaModal && (
        <Modal title="Add SCBA Check" onClose={() => setShowScbaModal(false)} onSave={saveScba}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" className="h-8 text-xs" value={scbaForm.date}
                onChange={e => setScbaForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit #</Label>
              <Input className="h-8 text-xs" placeholder="e.g. SCBA-05" value={scbaForm.unitNumber}
                onChange={e => setScbaForm(f => ({ ...f, unitNumber: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Air Pressure (PSI)</Label>
            <Input type="number" className="h-8 text-xs" min={0} max={5000} value={scbaForm.airPressurePsi}
              onChange={e => setScbaForm(f => ({ ...f, airPressurePsi: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Low-Pressure Alarm Test</Label>
              <Select value={scbaForm.lowPressureAlarm} onValueChange={v => setScbaForm(f => ({ ...f, lowPressureAlarm: v as 'Pass' | 'Fail' }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Face Piece Seal</Label>
              <Select value={scbaForm.facePieceSeal} onValueChange={v => setScbaForm(f => ({ ...f, facePieceSeal: v as 'Pass' | 'Fail' }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Checked By</Label>
            <Input className="h-8 text-xs" placeholder="Your name" value={scbaForm.checkedBy}
              onChange={e => setScbaForm(f => ({ ...f, checkedBy: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs resize-none" rows={2} placeholder="Optional notes…" value={scbaForm.notes}
              onChange={e => setScbaForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* ── Cert Modal ────────────────────────────────────────────────────────── */}
      {showCertModal && (
        <Modal title="Add Certification" onClose={() => setShowCertModal(false)} onSave={saveCert}>
          <div className="space-y-1">
            <Label className="text-xs">Person Name</Label>
            <Input className="h-8 text-xs" placeholder="Full name" value={certForm.personName}
              onChange={e => setCertForm(f => ({ ...f, personName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Certification Type</Label>
            <Select value={certForm.certType} onValueChange={v => setCertForm(f => ({ ...f, certType: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select certification…" /></SelectTrigger>
              <SelectContent>
                {CERT_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Issued Date</Label>
              <Input type="date" className="h-8 text-xs" value={certForm.issuedDate}
                onChange={e => setCertForm(f => ({ ...f, issuedDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" className="h-8 text-xs" value={certForm.expiryDate}
                onChange={e => setCertForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Run Report Modal ──────────────────────────────────────────────────── */}
      {showRunModal && (
        <Modal title="Log Run Report" onClose={() => setShowRunModal(false)} onSave={saveRun}>
          <div className="space-y-1">
            <Label className="text-xs">Date / Time</Label>
            <Input type="datetime-local" className="h-8 text-xs" value={runForm.dateTime}
              onChange={e => setRunForm(f => ({ ...f, dateTime: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Incident Type</Label>
            <Select value={runForm.incidentType} onValueChange={v => setRunForm(f => ({ ...f, incidentType: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {RUN_INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Address</Label>
            <Input className="h-8 text-xs" placeholder="Street address or location" value={runForm.address}
              onChange={e => setRunForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alarm Box / CAD #</Label>
            <Input className="h-8 text-xs" placeholder="e.g. CAD-0061" value={runForm.alarmCad}
              onChange={e => setRunForm(f => ({ ...f, alarmCad: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={runForm.role} onValueChange={v => setRunForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role…" /></SelectTrigger>
                <SelectContent>
                  {RUN_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Disposition</Label>
              <Select value={runForm.disposition} onValueChange={v => setRunForm(f => ({ ...f, disposition: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Disposition…" /></SelectTrigger>
                <SelectContent>
                  {RUN_DISPOSITIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs resize-none" rows={2} placeholder="Optional notes…" value={runForm.notes}
              onChange={e => setRunForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
