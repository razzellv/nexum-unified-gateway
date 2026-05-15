import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield,
  CheckCircle2,
  Circle,
  ClipboardList,
  Camera,
  AlertTriangle,
  FileText,
  Plus,
  Pencil,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficerAssignment {
  beat: string;
  supervisor: string;
  shiftStart: string;
  shiftEnd: string;
  partner: string;
  unit: string;
  radioChannel: string;
}

interface EquipmentItem {
  id: string;
  name: string;
  checked: boolean;
  timeChecked: string | null;
}

interface EquipmentRecord {
  date: string;
  items: EquipmentItem[];
}

interface Incident {
  id: string;
  caseNumber: string;
  dateTime: string;
  incidentType: string;
  address: string;
  disposition: string;
  uof: boolean;
}

interface UOFEntry {
  id: string;
  date: string;
  caseNumber: string;
  subjectDescription: string;
  forceType: string;
  injurySubject: boolean;
  injuryOfficer: boolean;
  supervisorNotified: boolean;
  reportFiled: boolean;
}

interface BodyCamEntry {
  id: string;
  date: string;
  hoursRecorded: number;
  uploadStatus: 'Uploaded' | 'Pending';
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EQUIPMENT_ITEMS: string[] = [
  'Service Weapon',
  'Spare Magazine(s)',
  'Radio (charged)',
  'Body Camera (charged + recording)',
  'Badge/ID',
  'Taser/Less-Lethal',
  'OC Spray',
  'Handcuffs (2)',
  'First Aid Kit',
  'Vehicle (fueled + lights/siren working)',
];

const INCIDENT_TYPES = [
  'Traffic Stop',
  'Domestic Disturbance',
  'Theft',
  'Assault',
  'Welfare Check',
  'Suspicious Person',
  'Accident',
  'Arrest',
  'Warrant Service',
  'Other',
];

const DISPOSITIONS = [
  'Report Filed',
  'Arrest Made',
  'Referred to Detective',
  'No Action',
  'Unfounded',
  'Mutual Aid',
];

const FORCE_TYPES = [
  'Verbal Commands',
  'Soft Hands',
  'Hard Hands',
  'OC Spray',
  'Taser',
  'Impact Weapon',
  'Firearm',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const getShift = (): string => {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'Day Shift';
  if (h >= 14 && h < 22) return 'Evening Shift';
  return 'Night Shift';
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const buildDefaultEquipment = (): EquipmentRecord => ({
  date: todayStr(),
  items: EQUIPMENT_ITEMS.map((name, i) => ({
    id: `eq-${i}`,
    name,
    checked: true,
    timeChecked: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  })),
});

const buildDefaultAssignment = (): OfficerAssignment => ({
  beat: 'Beat 3 / North District',
  supervisor: 'Sgt. Williams',
  shiftStart: '07:00',
  shiftEnd: '19:00',
  partner: '',
  unit: '247',
  radioChannel: 'Ch 2',
});

const buildDefaultIncidents = (): Incident[] => {
  const base = Date.now();
  const day = 86400000;
  return [
    {
      id: 'inc-1',
      caseNumber: 'CASE-2026-0001',
      dateTime: new Date(base - day * 4).toISOString(),
      incidentType: 'Traffic Stop',
      address: '1400 N. Main St',
      disposition: 'Report Filed',
      uof: false,
    },
    {
      id: 'inc-2',
      caseNumber: 'CASE-2026-0002',
      dateTime: new Date(base - day * 3).toISOString(),
      incidentType: 'Domestic Disturbance',
      address: '832 Elm Ave, Apt 4B',
      disposition: 'Arrest Made',
      uof: true,
    },
    {
      id: 'inc-3',
      caseNumber: 'CASE-2026-0003',
      dateTime: new Date(base - day * 2).toISOString(),
      incidentType: 'Welfare Check',
      address: '205 Oak Blvd',
      disposition: 'No Action',
      uof: false,
    },
    {
      id: 'inc-4',
      caseNumber: 'CASE-2026-0004',
      dateTime: new Date(base - day).toISOString(),
      incidentType: 'Theft',
      address: '570 Commerce Dr',
      disposition: 'Referred to Detective',
      uof: false,
    },
    {
      id: 'inc-5',
      caseNumber: 'CASE-2026-0005',
      dateTime: new Date(base - 1800000).toISOString(),
      incidentType: 'Suspicious Person',
      address: '1100 Riverside Park',
      disposition: 'Report Filed',
      uof: false,
    },
  ];
};

const buildDefaultUOF = (): UOFEntry[] => [
  {
    id: 'uof-1',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    caseNumber: 'CASE-2026-0002',
    subjectDescription: 'Male, 30s, resisted arrest',
    forceType: 'Soft Hands',
    injurySubject: false,
    injuryOfficer: false,
    supervisorNotified: true,
    reportFiled: true,
  },
];

const buildDefaultBodyCam = (): BodyCamEntry[] => {
  const base = Date.now();
  const day = 86400000;
  return [
    { id: 'bc-1', date: new Date(base - day * 4).toISOString().split('T')[0], hoursRecorded: 9.5, uploadStatus: 'Uploaded', notes: 'Full shift' },
    { id: 'bc-2', date: new Date(base - day * 3).toISOString().split('T')[0], hoursRecorded: 10.0, uploadStatus: 'Uploaded', notes: 'Full shift' },
    { id: 'bc-3', date: new Date(base - day * 2).toISOString().split('T')[0], hoursRecorded: 8.5, uploadStatus: 'Uploaded', notes: 'Battery low last 30 min' },
    { id: 'bc-4', date: new Date(base - day).toISOString().split('T')[0], hoursRecorded: 9.0, uploadStatus: 'Pending', notes: 'Upload queued' },
  ];
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadOrInit<T>(key: string, init: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  const val = init();
  localStorage.setItem(key, JSON.stringify(val));
  return val;
}

function persist<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const YesNoBadge = ({ value }: { value: boolean }) => (
  <Badge className={cn('text-xs', value ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200')}>
    {value ? 'Yes' : 'No'}
  </Badge>
);

const UploadBadge = ({ status }: { status: 'Uploaded' | 'Pending' }) => (
  <Badge className={cn('text-xs', status === 'Uploaded' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200')}>
    {status}
  </Badge>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function OfficerDashboard() {
  // ── State: assignment ──────────────────────────────────────────────────────
  const [assignment, setAssignment] = useState<OfficerAssignment>(() =>
    loadOrInit('nexum_officer_assignment', buildDefaultAssignment)
  );
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState<OfficerAssignment>(assignment);

  // ── State: equipment ───────────────────────────────────────────────────────
  const [equipRecord, setEquipRecord] = useState<EquipmentRecord>(() => {
    const stored = loadOrInit<EquipmentRecord>('nexum_officer_equip', buildDefaultEquipment);
    if (stored.date !== todayStr()) {
      const fresh = buildDefaultEquipment();
      persist('nexum_officer_equip', fresh);
      return fresh;
    }
    return stored;
  });

  // ── State: incidents ───────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState<Incident[]>(() =>
    loadOrInit('nexum_officer_incidents', buildDefaultIncidents)
  );
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    incidentType: '',
    address: '',
    disposition: '',
    uof: false,
  });

  // ── State: UOF ─────────────────────────────────────────────────────────────
  const [uofEntries, setUofEntries] = useState<UOFEntry[]>(() =>
    loadOrInit('nexum_officer_uof', buildDefaultUOF)
  );
  const [uofModalOpen, setUofModalOpen] = useState(false);
  const [uofForm, setUofForm] = useState({
    caseNumber: '',
    subjectDescription: '',
    forceType: '',
    injurySubject: false,
    injuryOfficer: false,
    supervisorNotified: false,
    reportFiled: false,
  });

  // ── State: body cam ────────────────────────────────────────────────────────
  const [bodyCam, setBodyCam] = useState<BodyCamEntry[]>(() =>
    loadOrInit('nexum_officer_bodycam', buildDefaultBodyCam)
  );
  const [bodyCamModalOpen, setBodyCamModalOpen] = useState(false);
  const [bodyCamForm, setBodyCamForm] = useState({
    date: todayStr(),
    hoursRecorded: '',
    uploadStatus: 'Pending' as 'Uploaded' | 'Pending',
    notes: '',
  });

  // ── KPI calculations ───────────────────────────────────────────────────────
  const equipChecksToday = equipRecord.date === todayStr()
    ? equipRecord.items.filter(i => i.checked).length
    : 0;

  const incidentsToday = incidents.filter(inc =>
    inc.dateTime.startsWith(todayStr())
  ).length;

  const bodyCamHoursMonth = bodyCam
    .filter(bc => {
      const d = new Date(bc.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, bc) => sum + bc.hoursRecorded, 0);

  const uofYTD = uofEntries.filter(u =>
    new Date(u.date).getFullYear() === currentYear
  ).length;

  // ── Equipment helpers ──────────────────────────────────────────────────────
  const toggleEquipItem = (id: string) => {
    const now = new Date().toISOString();
    const updated: EquipmentRecord = {
      ...equipRecord,
      items: equipRecord.items.map(item =>
        item.id === id
          ? { ...item, checked: !item.checked, timeChecked: !item.checked ? now : null }
          : item
      ),
    };
    setEquipRecord(updated);
    persist('nexum_officer_equip', updated);
  };

  const markAllChecked = () => {
    const now = new Date().toISOString();
    const updated: EquipmentRecord = {
      ...equipRecord,
      items: equipRecord.items.map(item => ({ ...item, checked: true, timeChecked: now })),
    };
    setEquipRecord(updated);
    persist('nexum_officer_equip', updated);
    toast.success('All equipment marked as checked');
  };

  // ── Assignment helpers ─────────────────────────────────────────────────────
  const saveAssignment = () => {
    setAssignment(assignmentDraft);
    persist('nexum_officer_assignment', assignmentDraft);
    setEditAssignmentOpen(false);
    toast.success('Assignment updated');
  };

  // ── Incident helpers ───────────────────────────────────────────────────────
  const nextCaseNumber = (): string => {
    const nums = incidents
      .map(i => parseInt(i.caseNumber.split('-')[2] || '0', 10))
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `CASE-${currentYear}-${String(next).padStart(4, '0')}`;
  };

  const logIncident = () => {
    if (!incidentForm.incidentType || !incidentForm.address || !incidentForm.disposition) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      caseNumber: nextCaseNumber(),
      dateTime: new Date().toISOString(),
      incidentType: incidentForm.incidentType,
      address: incidentForm.address,
      disposition: incidentForm.disposition,
      uof: incidentForm.uof,
    };
    const updated = [newInc, ...incidents];
    setIncidents(updated);
    persist('nexum_officer_incidents', updated);
    setIncidentForm({ incidentType: '', address: '', disposition: '', uof: false });
    setIncidentModalOpen(false);
    toast.success(`Incident logged — ${newInc.caseNumber}`);
  };

  // ── UOF helpers ────────────────────────────────────────────────────────────
  const addUOF = () => {
    if (!uofForm.caseNumber || !uofForm.subjectDescription || !uofForm.forceType) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newUof: UOFEntry = {
      id: `uof-${Date.now()}`,
      date: todayStr(),
      ...uofForm,
    };
    const updated = [newUof, ...uofEntries];
    setUofEntries(updated);
    persist('nexum_officer_uof', updated);
    setUofForm({ caseNumber: '', subjectDescription: '', forceType: '', injurySubject: false, injuryOfficer: false, supervisorNotified: false, reportFiled: false });
    setUofModalOpen(false);
    toast.success('Use-of-force report added');
  };

  // ── Body cam helpers ───────────────────────────────────────────────────────
  const addBodyCamEntry = () => {
    if (!bodyCamForm.date || !bodyCamForm.hoursRecorded) {
      toast.error('Please fill in date and hours');
      return;
    }
    const newEntry: BodyCamEntry = {
      id: `bc-${Date.now()}`,
      date: bodyCamForm.date,
      hoursRecorded: parseFloat(bodyCamForm.hoursRecorded),
      uploadStatus: bodyCamForm.uploadStatus,
      notes: bodyCamForm.notes,
    };
    const updated = [newEntry, ...bodyCam];
    setBodyCam(updated);
    persist('nexum_officer_bodycam', updated);
    setBodyCamForm({ date: todayStr(), hoursRecorded: '', uploadStatus: 'Pending', notes: '' });
    setBodyCamModalOpen(false);
    toast.success('Body camera entry added');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const shift = getShift();
  const allChecked = equipRecord.items.every(i => i.checked);

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── 1. Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Shield className="w-7 h-7 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Field Operations</h1>
              <p className="text-sm text-muted-foreground">
                {shift} &mdash; {today}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              onClick={() => setIncidentModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Log Incident
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                const el = document.getElementById('equipment-check-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <ClipboardList className="w-4 h-4 mr-1" />
              Equipment Check
            </Button>
          </div>
        </div>

        {/* ── 2. KPI Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Equipment Checks This Shift',
              value: `${equipChecksToday} / ${equipRecord.items.length}`,
              icon: <ClipboardList className="w-5 h-5 text-indigo-400" />,
              sub: equipChecksToday === equipRecord.items.length ? 'All items checked' : `${equipRecord.items.length - equipChecksToday} remaining`,
              accent: equipChecksToday === equipRecord.items.length ? 'text-green-400' : 'text-yellow-400',
            },
            {
              label: 'Incidents Reported Today',
              value: incidentsToday,
              icon: <FileText className="w-5 h-5 text-indigo-400" />,
              sub: 'Logged this date',
              accent: 'text-indigo-400',
            },
            {
              label: 'Body Cam Hours (Month)',
              value: bodyCamHoursMonth.toFixed(1),
              icon: <Camera className="w-5 h-5 text-indigo-400" />,
              sub: `${new Date().toLocaleString('default', { month: 'long' })} total`,
              accent: 'text-indigo-400',
            },
            {
              label: 'Use-of-Force Reports YTD',
              value: uofYTD,
              icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
              sub: `Year ${currentYear}`,
              accent: uofYTD > 0 ? 'text-orange-400' : 'text-muted-foreground',
            },
          ].map((kpi, i) => (
            <Card key={i} className="border-border/50 bg-card/60 backdrop-blur-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                    <p className={cn('text-2xl font-bold', kpi.accent)}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-500/10">{kpi.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 3. Shift Assignment ────────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Shift Assignment
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              onClick={() => { setAssignmentDraft(assignment); setEditAssignmentOpen(true); }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit Assignment
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Beat / Zone', value: assignment.beat },
                { label: 'Supervisor', value: assignment.supervisor },
                { label: 'Shift Hours', value: `${assignment.shiftStart} – ${assignment.shiftEnd}` },
                { label: 'Partner', value: assignment.partner || '—' },
                { label: 'Unit #', value: `Unit ${assignment.unit}` },
                { label: 'Radio Channel', value: assignment.radioChannel },
              ].map((field, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{field.label}</p>
                  <p className="text-sm font-semibold text-foreground">{field.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 4. Equipment Check ────────────────────────────────────────── */}
        <Card id="equipment-check-section" className="border-border/50 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                Pre-Shift Equipment Check
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {equipRecord.items.filter(i => i.checked).length} of {equipRecord.items.length} items verified
              </p>
            </div>
            <Button
              size="sm"
              disabled={allChecked}
              className={cn(
                allChecked
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              )}
              onClick={markAllChecked}
            >
              {allChecked ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  All Checked
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Mark All Checked
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {equipRecord.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleEquipItem(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 group text-left',
                    item.checked
                      ? 'bg-green-500/5 border-green-500/25 hover:bg-green-500/10'
                      : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/8'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.checked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                    )}
                    <span className={cn(
                      'text-sm font-medium transition-colors',
                      item.checked ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.checked && item.timeChecked ? (
                      <span className="text-xs text-green-500/80">
                        {new Date(item.timeChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Not checked</span>
                    )}
                    {item.checked ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 px-1.5">OK</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 px-1.5">Pending</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 5. Incident / Report Log ──────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Incident / Report Log
            </CardTitle>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIncidentModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Log Incident
            </Button>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No incidents logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Date/Time</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Case #</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Address</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Disposition</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">UOF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(inc => (
                      <tr key={inc.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(inc.dateTime)}</td>
                        <td className="py-2.5 px-2 font-mono text-xs text-indigo-400">{inc.caseNumber}</td>
                        <td className="py-2.5 px-2 text-xs">{inc.incidentType}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">{inc.address}</td>
                        <td className="py-2.5 px-2">
                          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                            {inc.disposition}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2">
                          <YesNoBadge value={inc.uof} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 6. Use-of-Force Log ───────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Use-of-Force Log
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">All UOF events are logged and time-stamped for review</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              onClick={() => setUofModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add UOF Report
            </Button>
          </CardHeader>
          <CardContent>
            {uofEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No use-of-force incidents on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Case #</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Subject</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Force Type</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Inj. Subject</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Inj. Officer</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Supe. Notified</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uofEntries.map(entry => (
                      <tr key={entry.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-2 font-mono text-xs text-indigo-400">{entry.caseNumber}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground hidden lg:table-cell">{entry.subjectDescription}</td>
                        <td className="py-2.5 px-2">
                          <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                            {entry.forceType}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2"><YesNoBadge value={entry.injurySubject} /></td>
                        <td className="py-2.5 px-2"><YesNoBadge value={entry.injuryOfficer} /></td>
                        <td className="py-2.5 px-2 hidden md:table-cell"><YesNoBadge value={entry.supervisorNotified} /></td>
                        <td className="py-2.5 px-2"><YesNoBadge value={entry.reportFiled} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 7. Body Camera Log ────────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Body Camera Log
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              onClick={() => setBodyCamModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </Button>
          </CardHeader>
          <CardContent>
            {bodyCam.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No body camera entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Hours Recorded</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Upload Status</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyCam.map(entry => (
                      <tr key={entry.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-2 text-sm font-semibold text-indigo-400">{entry.hoursRecorded.toFixed(1)} hrs</td>
                        <td className="py-2.5 px-2"><UploadBadge status={entry.uploadStatus} /></td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">{entry.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Modal: Edit Assignment ─────────────────────────────────────── */}
      <Dialog open={editAssignmentOpen} onOpenChange={setEditAssignmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Edit Shift Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: 'Beat / Zone', key: 'beat' },
              { label: 'Supervisor', key: 'supervisor' },
              { label: 'Shift Start', key: 'shiftStart', type: 'time' },
              { label: 'Shift End', key: 'shiftEnd', type: 'time' },
              { label: 'Partner (optional)', key: 'partner' },
              { label: 'Vehicle / Unit #', key: 'unit' },
              { label: 'Radio Channel', key: 'radioChannel' },
            ].map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  type={field.type || 'text'}
                  value={(assignmentDraft as any)[field.key]}
                  onChange={e => setAssignmentDraft(d => ({ ...d, [field.key]: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditAssignmentOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveAssignment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Log Incident ───────────────────────────────────────── */}
      <Dialog open={incidentModalOpen} onOpenChange={setIncidentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Log Incident
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Incident Type *</Label>
              <Select value={incidentForm.incidentType} onValueChange={v => setIncidentForm(f => ({ ...f, incidentType: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address / Location *</Label>
              <Input
                value={incidentForm.address}
                onChange={e => setIncidentForm(f => ({ ...f, address: e.target.value }))}
                className="h-8 text-sm"
                placeholder="e.g. 123 Main St"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disposition *</Label>
              <Select value={incidentForm.disposition} onValueChange={v => setIncidentForm(f => ({ ...f, disposition: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select disposition" /></SelectTrigger>
                <SelectContent>
                  {DISPOSITIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncidentForm(f => ({ ...f, uof: !f.uof }))}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  incidentForm.uof
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'border-border text-muted-foreground hover:border-border/80'
                )}
              >
                {incidentForm.uof ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                Use of Force Involved
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Case # will be auto-generated: <span className="font-mono text-indigo-400">{nextCaseNumber()}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIncidentModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={logIncident}>Log Incident</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: UOF Report ─────────────────────────────────────────── */}
      <Dialog open={uofModalOpen} onOpenChange={setUofModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Add Use-of-Force Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Case # *</Label>
              <Input
                value={uofForm.caseNumber}
                onChange={e => setUofForm(f => ({ ...f, caseNumber: e.target.value }))}
                className="h-8 text-sm font-mono"
                placeholder="CASE-2026-XXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject Description *</Label>
              <Input
                value={uofForm.subjectDescription}
                onChange={e => setUofForm(f => ({ ...f, subjectDescription: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Force Type *</Label>
              <Select value={uofForm.forceType} onValueChange={v => setUofForm(f => ({ ...f, forceType: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {FORCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Injury to Subject', key: 'injurySubject' },
                { label: 'Injury to Officer', key: 'injuryOfficer' },
                { label: 'Supervisor Notified', key: 'supervisorNotified' },
                { label: 'Report Filed', key: 'reportFiled' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setUofForm(form => ({ ...form, [f.key]: !(form as any)[f.key] }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all text-left',
                    (uofForm as any)[f.key]
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  )}
                >
                  {(uofForm as any)[f.key] ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUofModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={addUOF}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Body Cam Entry ─────────────────────────────────────── */}
      <Dialog open={bodyCamModalOpen} onOpenChange={setBodyCamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Add Body Camera Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={bodyCamForm.date}
                onChange={e => setBodyCamForm(f => ({ ...f, date: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hours Recorded *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={bodyCamForm.hoursRecorded}
                onChange={e => setBodyCamForm(f => ({ ...f, hoursRecorded: e.target.value }))}
                className="h-8 text-sm"
                placeholder="e.g. 9.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Upload Status</Label>
              <Select
                value={bodyCamForm.uploadStatus}
                onValueChange={v => setBodyCamForm(f => ({ ...f, uploadStatus: v as 'Uploaded' | 'Pending' }))}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uploaded">Uploaded</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input
                value={bodyCamForm.notes}
                onChange={e => setBodyCamForm(f => ({ ...f, notes: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBodyCamModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addBodyCamEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
