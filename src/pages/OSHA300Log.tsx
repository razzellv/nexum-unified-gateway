import { useState, useEffect } from 'react';
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
import { ClipboardList, Plus, Printer, AlertTriangle, Users, Clock, CheckSquare, FileText, Trash2, Eye, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type InjuryType = 'injury' | 'skin_disorder' | 'respiratory' | 'poisoning' | 'hearing_loss' | 'all_other_illness';

interface OSHA300Case {
  caseNumber: string;
  employeeName: string;
  employeeJobTitle: string;
  department: string;
  dateOfInjury: string;
  whereEventOccurred: string;
  describeInjury: string;
  isDeath: boolean;
  isDaysAway: boolean;
  isDaysRestriction: boolean;
  isOtherRecordable: boolean;
  daysAwayCount: number;
  daysRestrictionCount: number;
  injuryType: InjuryType;
  isPrivacyCase: boolean;
  isWorkRelated: boolean;
  recordedBy: string;
  recordedDate: string;
  year: number;
  id: string;
}

const LS_KEY = 'nexum_osha300_cases';

const MOCK_CASES: OSHA300Case[] = [
  { id: 'mc1', caseNumber: '2026-001', employeeName: 'James Howell', employeeJobTitle: 'Maintenance Tech', department: 'Facilities', dateOfInjury: '2026-01-14', whereEventOccurred: 'Boiler Room B', describeInjury: 'Laceration to left hand from pipe fitting', isDeath: false, isDaysAway: true, isDaysRestriction: false, isOtherRecordable: false, daysAwayCount: 3, daysRestrictionCount: 0, injuryType: 'injury', isPrivacyCase: false, isWorkRelated: true, recordedBy: 'Safety Manager', recordedDate: '2026-01-15', year: 2026 },
  { id: 'mc2', caseNumber: '2026-002', employeeName: 'Sandra Lee', employeeJobTitle: 'Custodian', department: 'Housekeeping', dateOfInjury: '2026-02-03', whereEventOccurred: 'Hallway 2C', describeInjury: 'Slip and fall on wet floor, sprained ankle', isDeath: false, isDaysAway: true, isDaysRestriction: true, isOtherRecordable: false, daysAwayCount: 5, daysRestrictionCount: 10, injuryType: 'injury', isPrivacyCase: false, isWorkRelated: true, recordedBy: 'Safety Manager', recordedDate: '2026-02-04', year: 2026 },
  { id: 'mc3', caseNumber: '2026-003', employeeName: 'Privacy Case', employeeJobTitle: 'Warehouse Associate', department: 'Operations', dateOfInjury: '2026-03-21', whereEventOccurred: 'Warehouse Dock 3', describeInjury: 'Repetitive motion injury — wrist tendonitis', isDeath: false, isDaysAway: false, isDaysRestriction: true, isOtherRecordable: false, daysAwayCount: 0, daysRestrictionCount: 14, injuryType: 'all_other_illness', isPrivacyCase: true, isWorkRelated: true, recordedBy: 'HR Director', recordedDate: '2026-03-22', year: 2026 },
  { id: 'mc4', caseNumber: '2026-004', employeeName: 'Carlos Rivera', employeeJobTitle: 'HVAC Technician', department: 'Facilities', dateOfInjury: '2026-04-10', whereEventOccurred: 'Roof Mechanical Room', describeInjury: 'Exposure to refrigerant — respiratory irritation', isDeath: false, isDaysAway: false, isDaysRestriction: false, isOtherRecordable: true, daysAwayCount: 0, daysRestrictionCount: 0, injuryType: 'respiratory', isPrivacyCase: false, isWorkRelated: true, recordedBy: 'Safety Manager', recordedDate: '2026-04-11', year: 2026 },
];

const INJURY_LABELS: Record<InjuryType, string> = {
  injury: 'Injury',
  skin_disorder: 'Skin',
  respiratory: 'Resp.',
  poisoning: 'Poison',
  hearing_loss: 'Hearing',
  all_other_illness: 'Other Illness',
};

const INJURY_COLORS: Record<InjuryType, string> = {
  injury: 'bg-orange-100 text-orange-700',
  skin_disorder: 'bg-yellow-100 text-yellow-700',
  respiratory: 'bg-blue-100 text-blue-700',
  poisoning: 'bg-red-100 text-red-700',
  hearing_loss: 'bg-purple-100 text-purple-700',
  all_other_illness: 'bg-gray-100 text-gray-700',
};

const BLANK_FORM: Omit<OSHA300Case, 'id' | 'caseNumber' | 'year'> = {
  employeeName: '', employeeJobTitle: '', department: '', dateOfInjury: '',
  whereEventOccurred: '', describeInjury: '', isDeath: false, isDaysAway: false,
  isDaysRestriction: false, isOtherRecordable: false, daysAwayCount: 0,
  daysRestrictionCount: 0, injuryType: 'injury', isPrivacyCase: false,
  isWorkRelated: true, recordedBy: '', recordedDate: new Date().toISOString().split('T')[0],
};

export default function OSHA300Log() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<OSHA300Case[]>([]);
  const [year, setYear] = useState(2026);
  const [activeTab, setActiveTab] = useState<'log' | 'summary'>('log');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewCase, setViewCase] = useState<OSHA300Case | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [certSignature, setCertSignature] = useState('');
  const [certTitle, setCertTitle] = useState('');
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { setCases(JSON.parse(stored)); } catch { setCases(MOCK_CASES); }
    } else {
      setCases(MOCK_CASES);
      localStorage.setItem(LS_KEY, JSON.stringify(MOCK_CASES));
    }
  }, []);

  const yearCases = cases.filter(c => c.year === year);

  const kpi = {
    total: yearCases.length,
    deaths: yearCases.filter(c => c.isDeath).length,
    daysAway: yearCases.filter(c => c.isDaysAway).length,
    restricted: yearCases.filter(c => c.isDaysRestriction).length,
    other: yearCases.filter(c => c.isOtherRecordable).length,
    totalDaysAway: yearCases.reduce((s, c) => s + c.daysAwayCount, 0),
    totalDaysRestricted: yearCases.reduce((s, c) => s + c.daysRestrictionCount, 0),
  };

  const nextCaseNumber = () => {
    const seq = yearCases.length + 1;
    return `${year}-${String(seq).padStart(3, '0')}`;
  };

  const saveAll = (updated: OSHA300Case[]) => {
    setCases(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    const newCase: OSHA300Case = {
      ...form,
      id: crypto.randomUUID(),
      caseNumber: nextCaseNumber(),
      year,
    };
    saveAll([...cases, newCase]);
    setShowAddModal(false);
    setForm({ ...BLANK_FORM });
    toast.success(`Case ${newCase.caseNumber} recorded.`);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this OSHA 300 case?')) return;
    saveAll(cases.filter(c => c.id !== id));
    toast.success('Case deleted.');
  };

  const f = (field: keyof typeof form, val: unknown) => setForm(p => ({ ...p, [field]: val }));

  return (
    <MainLayout>
      <style dangerouslySetInnerHTML={{ __html: '@media print { .no-print { display: none !important; } }' }} />

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">OSHA 300 Log — Work-Related Injuries and Illnesses</h1>
            <p className="text-sm text-gray-500">29 CFR 1904 — Recordkeeping</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setForm({ ...BLANK_FORM }); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Incident
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print OSHA 300
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveTab('summary')}>
            <FileText className="h-4 w-4 mr-1" /> OSHA 300A Summary
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex gap-1 mb-4 border-b">
        {(['log', 'summary'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {tab === 'log' ? 'OSHA 300 Log' : 'OSHA 300A Summary'}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Cases', value: kpi.total, icon: Users, color: 'text-blue-600' },
          { label: 'Deaths', value: kpi.deaths, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Days Away Cases', value: kpi.daysAway, icon: Clock, color: 'text-orange-600' },
          { label: 'Restricted Work', value: kpi.restricted, icon: CheckSquare, color: 'text-yellow-600' },
          { label: 'Other Recordable', value: kpi.other, icon: FileText, color: 'text-purple-600' },
          { label: 'Days Away + Restricted', value: `${kpi.totalDaysAway} / ${kpi.totalDaysRestricted}`, icon: ClipboardList, color: 'text-gray-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log Table */}
      {activeTab === 'log' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Form 300 — Log of Work-Related Injuries and Illnesses (Year: {year})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['(A) Case #','(B) Employee','(C) Job Title','(D) Date','(E) Where','(F) Description','(G) Death','(H) Days Away','(I) Restrict','(J) Other','(K) Days Away','(L) Days Restr.','(M) Type',''].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {yearCases.length === 0 && (
                    <tr><td colSpan={14} className="text-center py-8 text-gray-400">No cases recorded for {year}.</td></tr>
                  )}
                  {yearCases.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 font-mono font-semibold text-blue-700">{c.caseNumber}</td>
                      <td className="px-2 py-2 font-medium">{c.isPrivacyCase ? <span className="italic text-gray-400">Privacy Case</span> : c.employeeName}</td>
                      <td className="px-2 py-2 text-gray-600">{c.employeeJobTitle}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{c.dateOfInjury}</td>
                      <td className="px-2 py-2 max-w-[120px] truncate" title={c.whereEventOccurred}>{c.whereEventOccurred}</td>
                      <td className="px-2 py-2 max-w-[160px] truncate" title={c.describeInjury}>{c.describeInjury}</td>
                      <td className="px-2 py-2 text-center">{c.isDeath ? <span className="text-red-600 font-bold">✓</span> : '—'}</td>
                      <td className="px-2 py-2 text-center">{c.isDaysAway ? <span className="text-orange-600 font-bold">✓</span> : '—'}</td>
                      <td className="px-2 py-2 text-center">{c.isDaysRestriction ? <span className="text-yellow-600 font-bold">✓</span> : '—'}</td>
                      <td className="px-2 py-2 text-center">{c.isOtherRecordable ? <span className="text-purple-600 font-bold">✓</span> : '—'}</td>
                      <td className="px-2 py-2 text-center">{c.daysAwayCount || '—'}</td>
                      <td className="px-2 py-2 text-center">{c.daysRestrictionCount || '—'}</td>
                      <td className="px-2 py-2">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', INJURY_COLORS[c.injuryType])}>
                          {INJURY_LABELS[c.injuryType]}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-600 no-print" onClick={() => setViewCase(c)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-500 no-print" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td colSpan={10} className="px-2 py-2 text-right text-gray-600">Totals:</td>
                    <td className="px-2 py-2 text-center">{kpi.totalDaysAway}</td>
                    <td className="px-2 py-2 text-center">{kpi.totalDaysRestricted}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OSHA 300A Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Form 300A — Summary of Work-Related Injuries and Illnesses (Year: {year})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  ['Total deaths', kpi.deaths],
                  ['Total cases with days away from work', kpi.daysAway],
                  ['Total cases with job restriction or transfer', kpi.restricted],
                  ['Total other recordable cases', kpi.other],
                  ['Total days away from work', kpi.totalDaysAway],
                  ['Total days of job restriction or transfer', kpi.totalDaysRestricted],
                ].map(([label, val]) => (
                  <div key={String(label)} className="border rounded p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded p-4 bg-blue-50 mb-4">
                <p className="text-xs text-blue-800 font-semibold mb-3">CERTIFICATION</p>
                <p className="text-xs text-blue-700 mb-4 italic">
                  "I certify that I have examined this document and that to the best of my knowledge the entries are true, accurate, and complete."
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Signature / Name</Label>
                    <Input className="mt-1 h-8 text-xs" placeholder="Certifying official name" value={certSignature} onChange={e => setCertSignature(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input className="mt-1 h-8 text-xs" placeholder="Title" value={certTitle} onChange={e => setCertTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" className="mt-1 h-8 text-xs" value={certDate} onChange={e => setCertDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print OSHA 300A
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Incident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800">Add OSHA 300 Incident — Case {nextCaseNumber()}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch id="privacy" checked={form.isPrivacyCase} onCheckedChange={v => f('isPrivacyCase', v)} />
                <Label htmlFor="privacy" className="text-sm">Privacy Case (hide employee name in log)</Label>
              </div>
              <div>
                <Label className="text-xs">Employee Name</Label>
                <Input className="mt-1 h-8 text-xs" placeholder="Full name" value={form.employeeName} onChange={e => f('employeeName', e.target.value)} disabled={form.isPrivacyCase} />
              </div>
              <div>
                <Label className="text-xs">Job Title</Label>
                <Input className="mt-1 h-8 text-xs" value={form.employeeJobTitle} onChange={e => f('employeeJobTitle', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Input className="mt-1 h-8 text-xs" value={form.department} onChange={e => f('department', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date of Injury / Illness</Label>
                <Input type="date" className="mt-1 h-8 text-xs" value={form.dateOfInjury} onChange={e => f('dateOfInjury', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Where Did the Event Occur?</Label>
                <Input className="mt-1 h-8 text-xs" placeholder="e.g. Loading Dock 3, Boiler Room B" value={form.whereEventOccurred} onChange={e => f('whereEventOccurred', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Describe the Injury or Illness</Label>
                <Textarea className="mt-1 text-xs" rows={3} placeholder="Parts of body affected and object/substance that directly injured the employee" value={form.describeInjury} onChange={e => f('describeInjury', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Injury / Illness Type</Label>
                <Select value={form.injuryType} onValueChange={v => f('injuryType', v as InjuryType)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injury">Injury</SelectItem>
                    <SelectItem value="skin_disorder">Skin Disorder</SelectItem>
                    <SelectItem value="respiratory">Respiratory Condition</SelectItem>
                    <SelectItem value="poisoning">Poisoning</SelectItem>
                    <SelectItem value="hearing_loss">Hearing Loss</SelectItem>
                    <SelectItem value="all_other_illness">All Other Illness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Recorded By</Label>
                <Input className="mt-1 h-8 text-xs" value={form.recordedBy} onChange={e => f('recordedBy', e.target.value)} />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([['isDeath','Death'],['isDaysAway','Days Away from Work'],['isDaysRestriction','Job Restriction / Transfer'],['isOtherRecordable','Other Recordable']] as [keyof typeof form, string][]).map(([field, label]) => (
                  <div key={field} className="flex items-center gap-2">
                    <Switch id={field} checked={form[field] as boolean} onCheckedChange={v => f(field, v)} />
                    <Label htmlFor={field} className="text-xs">{label}</Label>
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Days Away from Work</Label>
                <Input type="number" min={0} className="mt-1 h-8 text-xs" value={form.daysAwayCount} onChange={e => f('daysAwayCount', Number(e.target.value))} disabled={!form.isDaysAway} />
              </div>
              <div>
                <Label className="text-xs">Days of Job Restriction / Transfer</Label>
                <Input type="number" min={0} className="mt-1 h-8 text-xs" value={form.daysRestrictionCount} onChange={e => f('daysRestrictionCount', Number(e.target.value))} disabled={!form.isDaysRestriction} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!form.dateOfInjury || !form.describeInjury}>Save Case</Button>
            </div>
          </div>
        </div>
      )}

      {/* Consulting Services Banner */}
      <div className="no-print mx-1 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Briefcase className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">Need help staying OSHA-compliant year-round?</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Our OSHA recordkeeping review + Tier II / SARA chemical audit bundle covers your February deadlines — starting at $1,800.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/consulting')}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
        >
          View Services <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* OSHA 301 Incident Report Modal */}
      {viewCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800">OSHA 301 Incident Report — Case {viewCase.caseNumber}</h2>
              <button onClick={() => setViewCase(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Case Number', viewCase.caseNumber],
                  ['Date of Injury', viewCase.dateOfInjury],
                  ['Employee', viewCase.isPrivacyCase ? 'Privacy Case' : viewCase.employeeName],
                  ['Job Title', viewCase.employeeJobTitle],
                  ['Department', viewCase.department],
                  ['Where Occurred', viewCase.whereEventOccurred],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className="font-medium">{v || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500 mb-1">Description of Injury / Illness</p>
                <p>{viewCase.describeInjury}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Death', viewCase.isDeath],
                  ['Days Away from Work', viewCase.isDaysAway],
                  ['Job Restriction', viewCase.isDaysRestriction],
                  ['Other Recordable', viewCase.isOtherRecordable],
                  ['Work Related', viewCase.isWorkRelated],
                  ['Privacy Case', viewCase.isPrivacyCase],
                ].map(([l, v]) => (
                  <div key={String(l)} className={cn('rounded p-2 text-center', v ? 'bg-blue-50' : 'bg-gray-50')}>
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className={cn('font-semibold', v ? 'text-blue-700' : 'text-gray-400')}>{v ? 'Yes' : 'No'}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Days Away</p>
                  <p className="font-semibold">{viewCase.daysAwayCount}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Days Restricted</p>
                  <p className="font-semibold">{viewCase.daysRestrictionCount}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className={cn('text-xs font-medium px-1 py-0.5 rounded inline-block', INJURY_COLORS[viewCase.injuryType])}>{INJURY_LABELS[viewCase.injuryType]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-2">
                <span>Recorded by: {viewCase.recordedBy}</span>
                <span>Date recorded: {viewCase.recordedDate}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print OSHA 301
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewCase(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
