import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Leaf, Plus, Download, AlertTriangle, CheckCircle2, Clock, AlertCircle, FlaskConical, FileText, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WATER_SAMPLE_SOURCES, computeWaterStats } from '@/lib/waterChemistry';
import type { WaterParamStats } from '@/lib/waterChemistry';

// ─── Types ────────────────────────────────────────────────────────────────────

type TestType = 'air_quality' | 'indoor_air_quality' | 'water_quality' | 'soil_sampling' | 'noise_level' | 'radiation' | 'wastewater' | 'stormwater' | 'groundwater' | 'stack_emissions' | 'other';
type MonitoringStatus = 'compliant' | 'warning' | 'violation' | 'pending_lab';

interface MonitoringRecord {
  monitoringId: string;
  testType: TestType;
  parameter: string;
  value: number;
  unit: string;
  regulatoryLimit: number;
  regulatoryStandard: string;
  status: MonitoringStatus;
  sampleLocation: string;
  sampleDate: string;
  sampleTime: string;
  collectedBy: string;
  labName: string;
  labResultDate: string;
  chainOfCustodyNumber: string;
  permitNumber: string;
  reportingRequired: boolean;
  reportingDeadline: string;
  corrective_action: string;
  notes: string;
  sampleSource?: string;   // boiler_feed, cooling_tower_sump, etc.
  equipmentId?: string;
  equipmentName?: string;
  batchId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexum_env_monitoring';

const PARAM_SUGGESTIONS: Record<string, string[]> = {
  air_quality: ['PM2.5', 'PM10', 'CO', 'CO2', 'NO2', 'SO2', 'O3', 'VOCs', 'Lead'],
  indoor_air_quality: ['O2', 'CO', 'CO2', 'NO2', 'VOCs', 'PM2.5', 'PM10', 'Humidity', 'Temperature', 'Radon', 'Formaldehyde'],
  stack_emissions: ['PM2.5', 'PM10', 'CO', 'CO2', 'O2', 'NO2', 'SO2', 'O3', 'VOCs', 'Lead'],
  water_quality: ['pH', 'Turbidity', 'Dissolved Oxygen', 'BOD', 'COD', 'TSS', 'TDS', 'Nitrates', 'Phosphorus', 'Lead', 'Arsenic', 'Coliform', 'Hardness', 'Alkalinity', 'Conductivity', 'Chlorine', 'Iron', 'Langelier Index', 'Cycles of Concentration', 'Silica', 'Phosphate', 'Molybdate'],
  wastewater: ['pH', 'Turbidity', 'Dissolved Oxygen', 'BOD', 'COD', 'TSS', 'TDS', 'Nitrates', 'Phosphorus', 'Lead', 'Arsenic', 'Coliform', 'Hardness', 'Alkalinity', 'Conductivity', 'Chlorine', 'Iron', 'Langelier Index', 'Cycles of Concentration', 'Silica', 'Phosphate', 'Molybdate'],
  stormwater: ['pH', 'Turbidity', 'Dissolved Oxygen', 'BOD', 'COD', 'TSS', 'TDS', 'Nitrates', 'Phosphorus', 'Lead', 'Arsenic', 'Coliform', 'Hardness', 'Alkalinity', 'Conductivity', 'Chlorine', 'Iron', 'Langelier Index', 'Cycles of Concentration', 'Silica', 'Phosphate', 'Molybdate'],
  groundwater: ['pH', 'Turbidity', 'Dissolved Oxygen', 'BOD', 'COD', 'TSS', 'TDS', 'Nitrates', 'Phosphorus', 'Lead', 'Arsenic', 'Coliform', 'Hardness', 'Alkalinity', 'Conductivity', 'Chlorine', 'Iron', 'Langelier Index', 'Cycles of Concentration', 'Silica', 'Phosphate', 'Molybdate'],
  soil_sampling: ['Lead', 'Arsenic', 'Mercury', 'Cadmium', 'Petroleum Hydrocarbons', 'PCBs', 'PAHs'],
};

const MOCK_RECORDS: MonitoringRecord[] = [
  { monitoringId: 'ENV-001', testType: 'air_quality', parameter: 'PM2.5', value: 10.2, unit: 'µg/m³', regulatoryLimit: 12, regulatoryStandard: 'EPA NAAQS', status: 'compliant', sampleLocation: 'Roof Station A', sampleDate: '2026-05-01', sampleTime: '08:00', collectedBy: 'J. Martinez', labName: 'EnviroLab Inc.', labResultDate: '2026-05-05', chainOfCustodyNumber: 'COC-2026-001', permitNumber: 'AIR-2024-0042', reportingRequired: false, reportingDeadline: '', corrective_action: '', notes: '' },
  { monitoringId: 'ENV-002', testType: 'air_quality', parameter: 'PM2.5', value: 11.4, unit: 'µg/m³', regulatoryLimit: 12, regulatoryStandard: 'EPA NAAQS', status: 'warning', sampleLocation: 'Roof Station A', sampleDate: '2026-05-08', sampleTime: '08:00', collectedBy: 'J. Martinez', labName: 'EnviroLab Inc.', labResultDate: '2026-05-10', chainOfCustodyNumber: 'COC-2026-002', permitNumber: 'AIR-2024-0042', reportingRequired: true, reportingDeadline: '2026-05-25', corrective_action: '', notes: 'Elevated after maintenance' },
  { monitoringId: 'ENV-003', testType: 'water_quality', parameter: 'Lead', value: 0.018, unit: 'mg/L', regulatoryLimit: 0.015, regulatoryStandard: 'EPA Action Level', status: 'violation', sampleLocation: 'Discharge Point 001', sampleDate: '2026-04-28', sampleTime: '09:30', collectedBy: 'S. Chen', labName: 'Aqua Test Labs', labResultDate: '2026-05-02', chainOfCustodyNumber: 'COC-2026-003', permitNumber: 'NPDES-OH-2024-0011', reportingRequired: true, reportingDeadline: '2026-05-20', corrective_action: 'Replace aged pipe section B7', notes: 'Above action level' },
  { monitoringId: 'ENV-004', testType: 'water_quality', parameter: 'pH', value: 7.4, unit: 'pH units', regulatoryLimit: 9.0, regulatoryStandard: 'NPDES Permit', status: 'compliant', sampleLocation: 'Discharge Point 001', sampleDate: '2026-05-05', sampleTime: '09:30', collectedBy: 'S. Chen', labName: 'Aqua Test Labs', labResultDate: '2026-05-07', chainOfCustodyNumber: 'COC-2026-004', permitNumber: 'NPDES-OH-2024-0011', reportingRequired: false, reportingDeadline: '', corrective_action: '', notes: '' },
  { monitoringId: 'ENV-005', testType: 'soil_sampling', parameter: 'Lead', value: 380, unit: 'mg/kg', regulatoryLimit: 400, regulatoryStandard: 'EPA RSL Residential', status: 'warning', sampleLocation: 'East Yard — Grid E4', sampleDate: '2026-04-15', sampleTime: '10:00', collectedBy: 'R. Patel', labName: 'GeoAnalytics LLC', labResultDate: '2026-04-22', chainOfCustodyNumber: 'COC-2026-005', permitNumber: 'RCRA-2023-0007', reportingRequired: true, reportingDeadline: '2026-06-01', corrective_action: 'Monitor quarterly', notes: 'Near boundary limit' },
  { monitoringId: 'ENV-006', testType: 'noise_level', parameter: 'Noise Level', value: 62, unit: 'dBA', regulatoryLimit: 70, regulatoryStandard: 'Local Ordinance §4.2', status: 'compliant', sampleLocation: 'North Property Line', sampleDate: '2026-05-03', sampleTime: '14:00', collectedBy: 'T. Brooks', labName: 'AcousTech Services', labResultDate: '2026-05-03', chainOfCustodyNumber: 'COC-2026-006', permitNumber: 'NOISE-2025-0003', reportingRequired: false, reportingDeadline: '', corrective_action: '', notes: 'Daytime reading' },
  { monitoringId: 'ENV-007', testType: 'wastewater', parameter: 'BOD', value: 35, unit: 'mg/L', regulatoryLimit: 30, regulatoryStandard: 'NPDES Effluent Limit', status: 'violation', sampleLocation: 'WWTP Effluent', sampleDate: '2026-05-10', sampleTime: '07:00', collectedBy: 'J. Martinez', labName: 'EnviroLab Inc.', labResultDate: '2026-05-12', chainOfCustodyNumber: 'COC-2026-007', permitNumber: 'NPDES-OH-2024-0011', reportingRequired: true, reportingDeadline: '2026-05-17', corrective_action: 'Increase aeration; notify regulator', notes: 'Monthly composite sample' },
  { monitoringId: 'ENV-008', testType: 'groundwater', parameter: 'Nitrates', value: 7.2, unit: 'mg/L', regulatoryLimit: 10, regulatoryStandard: 'EPA MCL', status: 'compliant', sampleLocation: 'Monitoring Well MW-3', sampleDate: '2026-04-20', sampleTime: '11:00', collectedBy: 'S. Chen', labName: 'Aqua Test Labs', labResultDate: '2026-04-25', chainOfCustodyNumber: 'COC-2026-008', permitNumber: 'GW-PERMIT-2022-0005', reportingRequired: false, reportingDeadline: '', corrective_action: '', notes: '' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(value: number, limit: number): MonitoringStatus {
  if (value > limit) return 'violation';
  if (value >= limit * 0.9) return 'warning';
  return 'compliant';
}

function genId() {
  return `ENV-${Date.now().toString(36).toUpperCase()}`;
}

function statusColor(s: MonitoringStatus) {
  return {
    compliant: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    violation: 'bg-red-100 text-red-800 border-red-200',
    pending_lab: 'bg-blue-100 text-blue-800 border-blue-200',
  }[s];
}

function statusLabel(s: MonitoringStatus) {
  return { compliant: 'Compliant', warning: 'Warning', violation: 'Violation', pending_lab: 'Pending Lab' }[s];
}

const TAB_TYPES: { label: string; types: TestType[] | null }[] = [
  { label: 'Air Quality', types: ['air_quality', 'indoor_air_quality', 'stack_emissions'] },
  { label: 'Water Testing', types: ['water_quality', 'wastewater', 'stormwater'] },
  { label: 'Soil & Groundwater', types: ['soil_sampling', 'groundwater'] },
  { label: 'Noise', types: ['noise_level', 'radiation'] },
  { label: 'All Records', types: null },
];

function toCSV(records: MonitoringRecord[]): string {
  const headers = ['ID', 'TestType', 'Parameter', 'Value', 'Unit', 'Limit', 'Standard', 'Status', 'Location', 'Date', 'CollectedBy', 'Lab', 'Permit', 'ReportingRequired', 'Deadline'];
  const rows = records.map(r => [r.monitoringId, r.testType, r.parameter, r.value, r.unit, r.regulatoryLimit, r.regulatoryStandard, r.status, r.sampleLocation, r.sampleDate, r.collectedBy, r.labName, r.permitNumber, r.reportingRequired, r.reportingDeadline].join(','));
  return [headers.join(','), ...rows].join('\n');
}

const BLANK: Omit<MonitoringRecord, 'monitoringId' | 'status'> = {
  testType: 'air_quality', parameter: '', value: 0, unit: '', regulatoryLimit: 0,
  regulatoryStandard: '', sampleLocation: '', sampleDate: '', sampleTime: '',
  collectedBy: '', labName: '', labResultDate: '', chainOfCustodyNumber: '',
  permitNumber: '', reportingRequired: false, reportingDeadline: '',
  corrective_action: '', notes: '',
  sampleSource: '', equipmentId: '', equipmentName: '', batchId: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnvironmentalMonitoring() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<MonitoringRecord, 'monitoringId' | 'status'>>(BLANK);
  const [selectedParam, setSelectedParam] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setRecords(stored ? JSON.parse(stored) : MOCK_RECORDS);
  }, []);

  function save(next: MonitoringRecord[]) {
    setRecords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const filtered = useMemo(() => {
    const types = TAB_TYPES[activeTab].types;
    return types ? records.filter(r => types.includes(r.testType)) : records;
  }, [records, activeTab]);

  const kpi = useMemo(() => ({
    total: filtered.length,
    compliant: filtered.filter(r => r.status === 'compliant').length,
    warning: filtered.filter(r => r.status === 'warning').length,
    violation: filtered.filter(r => r.status === 'violation').length,
    pending: filtered.filter(r => r.status === 'pending_lab').length,
  }), [filtered]);

  const trendData = useMemo(() => {
    if (!selectedParam) return null;
    const grouped = records
      .filter(r => r.parameter === selectedParam)
      .sort((a, b) => a.sampleDate.localeCompare(b.sampleDate));
    if (grouped.length < 2) return null;
    return { data: grouped.map(r => ({ date: r.sampleDate, value: r.value, limit: r.regulatoryLimit })), limit: grouped[0].regulatoryLimit };
  }, [records, selectedParam]);

  const reportsDue = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return records.filter(r => r.reportingRequired && r.reportingDeadline && new Date(r.reportingDeadline) <= cutoff);
  }, [records]);

  function openAdd() {
    setEditingId(null);
    setForm(BLANK);
    setShowModal(true);
  }

  function openEdit(r: MonitoringRecord) {
    const { monitoringId, status, ...rest } = r;
    setEditingId(monitoringId);
    setForm(rest);
    setShowModal(true);
  }

  function deleteRecord(id: string) {
    save(records.filter(r => r.monitoringId !== id));
    toast.success('Record deleted');
  }

  function submitForm() {
    const status = computeStatus(form.value, form.regulatoryLimit);
    if (editingId) {
      save(records.map(r => r.monitoringId === editingId ? { ...form, monitoringId: editingId, status } : r));
      toast.success('Record updated');
    } else {
      save([...records, { ...form, monitoringId: genId(), status }]);
      toast.success('Record added');
    }
    setShowModal(false);
  }

  function exportCSV() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'environmental_monitoring.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  const suggestions = PARAM_SUGGESTIONS[form.testType] ?? [];

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Leaf className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Environmental Monitoring</h1>
              <p className="text-sm text-gray-500">Track compliance, sampling, and reporting obligations</p>
            </div>
            <Badge className="bg-green-700 text-white ml-2">EH&S</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Record</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TAB_TYPES.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={cn('px-4 py-2 text-sm font-medium rounded-t-md transition-colors', activeTab === i ? 'bg-white border border-b-white border-gray-200 -mb-px text-green-700' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Tests', value: kpi.total, icon: <FlaskConical className="w-4 h-4 text-gray-500" />, cls: 'text-gray-700' },
            { label: 'Compliant', value: kpi.compliant, icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, cls: 'text-green-700' },
            { label: 'Warnings', value: kpi.warning, icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />, cls: 'text-yellow-700' },
            { label: 'Violations', value: kpi.violation, icon: <AlertCircle className="w-4 h-4 text-red-600" />, cls: 'text-red-700' },
            { label: 'Pending Lab', value: kpi.pending, icon: <Clock className="w-4 h-4 text-blue-600" />, cls: 'text-blue-700' },
          ].map((k, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className="flex justify-center mb-1">{k.icon}</div>
                <div className={cn('text-2xl font-bold', k.cls)}>{k.value}</div>
                <div className="text-xs text-gray-500">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Water Chemistry Statistical Analysis — only for Water Testing tab */}
        {activeTab === 1 && (() => {
          const waterRecs = filtered;
          const stats = computeWaterStats(waterRecs);
          if (stats.length === 0) return null;
          return (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Water Chemistry Analysis</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((s: WaterParamStats) => (
                  <div key={s.parameter} className={`rounded-lg border p-3 ${s.status === 'out_of_range' ? 'border-red-500/30 bg-red-500/5' : s.status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{s.parameter}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.status === 'out_of_range' ? 'bg-red-500/20 text-red-400' : s.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                        {s.status === 'out_of_range' ? 'OUT OF RANGE' : s.status === 'warning' ? 'WARNING' : 'OK'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Latest:</span><span className="text-foreground font-medium">{s.latestValue.toLocaleString(undefined,{maximumFractionDigits:3})} {s.unit}</span></div>
                      <div className="flex justify-between"><span>Mean ({s.sampleCount} samples):</span><span className="font-mono">{s.mean.toLocaleString(undefined,{maximumFractionDigits:3})}</span></div>
                      <div className="flex justify-between"><span>Std Dev (σ):</span><span className="font-mono">{s.stdDev.toLocaleString(undefined,{maximumFractionDigits:3})}</span></div>
                      <div className="flex justify-between"><span>Range:</span><span className="font-mono">{s.min.toLocaleString(undefined,{maximumFractionDigits:2})} – {s.max.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
                    </div>
                    {/* Confidence bar */}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Confidence</span><span className={s.confidenceScore >= 70 ? 'text-green-400' : s.confidenceScore >= 40 ? 'text-amber-400' : 'text-red-400'}>{s.confidenceScore}%</span></div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.confidenceScore >= 70 ? 'bg-green-500' : s.confidenceScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.confidenceScore}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Last sample: {s.latestDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monitoring Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Parameter', 'Value / Unit', 'Limit', 'Status', 'Location', 'Date', 'Collected By', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No records for this category.</td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r.monitoringId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        <button className="hover:underline text-green-700" onClick={() => setSelectedParam(p => p === r.parameter ? null : r.parameter)}>{r.parameter}</button>
                        <div className="text-xs text-gray-400">{r.permitNumber}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{r.value} {r.unit}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">{r.regulatoryLimit} {r.unit}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', statusColor(r.status))}>{statusLabel(r.status)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.sampleLocation}
                        {r.sampleSource && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{WATER_SAMPLE_SOURCES.find(s => s.value === r.sampleSource)?.label || r.sampleSource}</span>}
                        {r.equipmentName && <span className="ml-1 text-xs text-muted-foreground">· {r.equipmentName}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.sampleDate}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.collectedBy}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => deleteRecord(r.monitoringId)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        {trendData && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trend: {selectedParam}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={trendData.limit} stroke="#ef4444" strokeDasharray="6 3" label={{ value: 'Limit', fill: '#ef4444', fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Reports Due */}
        {reportsDue.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                Reports Due (Next 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 border-b border-orange-100">
                  <tr>
                    {['Permit #', 'Parameter', 'Deadline', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-50">
                  {reportsDue.map(r => {
                    const overdue = new Date(r.reportingDeadline) < new Date();
                    return (
                      <tr key={r.monitoringId} className="hover:bg-orange-50/50">
                        <td className="px-4 py-2 font-medium">{r.permitNumber}</td>
                        <td className="px-4 py-2">{r.parameter}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{r.reportingDeadline}</td>
                        <td className="px-4 py-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', overdue ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200')}>
                            {overdue ? 'Overdue' : 'Due Soon'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Consulting Services Banner */}
      <div className="mx-1 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Briefcase className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Need expert help with NPDES permits or stormwater compliance?</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Our Industrial Stormwater Compliance Audit delivers a corrective action report in 5 business days — starting at $2,400.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/consulting')}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          View Services <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Record' : 'Add Monitoring Record'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Test Type</Label>
                  <Select value={form.testType} onValueChange={v => setForm(f => ({ ...f, testType: v as TestType }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['air_quality','indoor_air_quality','water_quality','soil_sampling','noise_level','radiation','wastewater','stormwater','groundwater','stack_emissions','other'] as TestType[]).map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Parameter</Label>
                  <Input list="param-list" className="mt-1" value={form.parameter} onChange={e => setForm(f => ({ ...f, parameter: e.target.value }))} placeholder="e.g. PM2.5" />
                  <datalist id="param-list">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Value</Label>
                  <Input type="number" className="mt-1" value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Unit</Label>
                  <Input className="mt-1" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="µg/m³, mg/L, dBA…" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Regulatory Limit</Label>
                  <Input type="number" className="mt-1" value={form.regulatoryLimit} onChange={e => setForm(f => ({ ...f, regulatoryLimit: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Regulatory Standard</Label>
                  <Input className="mt-1" value={form.regulatoryStandard} onChange={e => setForm(f => ({ ...f, regulatoryStandard: e.target.value }))} placeholder="EPA NAAQS, NPDES…" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Sample Location</Label>
                  <Input className="mt-1" value={form.sampleLocation} onChange={e => setForm(f => ({ ...f, sampleLocation: e.target.value }))} />
                </div>
                {['water_quality','wastewater','stormwater','groundwater'].includes(form.testType) && (
                  <div>
                    <label className="text-sm font-medium">Sample Source</label>
                    <Select value={form.sampleSource || ''} onValueChange={v => setForm(f => ({ ...f, sampleSource: v }))}>
                      <SelectTrigger><SelectValue placeholder="Where was sample collected?" /></SelectTrigger>
                      <SelectContent>
                        {WATER_SAMPLE_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {['water_quality','wastewater','stormwater','groundwater'].includes(form.testType) && (
                  <div>
                    <label className="text-sm font-medium">Associated Equipment (optional)</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Boiler 1, Chiller A, Cooling Tower 2..."
                      value={form.equipmentName || ''}
                      onChange={e => setForm(f => ({ ...f, equipmentName: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Collected By</Label>
                  <Input className="mt-1" value={form.collectedBy} onChange={e => setForm(f => ({ ...f, collectedBy: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Sample Date</Label>
                  <Input type="date" className="mt-1" value={form.sampleDate} onChange={e => setForm(f => ({ ...f, sampleDate: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Sample Time</Label>
                  <Input type="time" className="mt-1" value={form.sampleTime} onChange={e => setForm(f => ({ ...f, sampleTime: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Lab Name</Label>
                  <Input className="mt-1" value={form.labName} onChange={e => setForm(f => ({ ...f, labName: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Chain of Custody #</Label>
                  <Input className="mt-1" value={form.chainOfCustodyNumber} onChange={e => setForm(f => ({ ...f, chainOfCustodyNumber: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Permit Number</Label>
                  <Input className="mt-1" value={form.permitNumber} onChange={e => setForm(f => ({ ...f, permitNumber: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Lab Result Date</Label>
                  <Input type="date" className="mt-1" value={form.labResultDate} onChange={e => setForm(f => ({ ...f, labResultDate: e.target.value }))} />
                </div>
                <div className="col-span-2 flex items-center gap-3 pt-1">
                  <Switch id="reporting" checked={form.reportingRequired} onCheckedChange={v => setForm(f => ({ ...f, reportingRequired: v }))} />
                  <Label htmlFor="reporting" className="text-sm">Reporting Required</Label>
                  {form.reportingRequired && (
                    <Input type="date" className="ml-auto w-40" value={form.reportingDeadline} onChange={e => setForm(f => ({ ...f, reportingDeadline: e.target.value }))} />
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Corrective Action</Label>
                  <Textarea className="mt-1 text-sm" rows={2} value={form.corrective_action} onChange={e => setForm(f => ({ ...f, corrective_action: e.target.value }))} placeholder="Describe corrective action if needed…" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Notes</Label>
                  <Textarea className="mt-1 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={submitForm}>{editingId ? 'Save Changes' : 'Add Record'}</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
