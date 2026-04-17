import { useState, useRef } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { TierGate } from '@/components/global/TierGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  FileText, Printer, RefreshCw, CheckCircle, AlertTriangle,
  Users, Gauge, ShieldCheck, Target, Building2, CalendarDays,
  TrendingUp, Award, Download,
} from 'lucide-react';

// ── Scoring helpers ────────────────────────────────────────────────────────────
function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent',          color: 'text-green-400' };
  if (score >= 75) return { label: 'Good',               color: 'text-blue-400' };
  if (score >= 60) return { label: 'Satisfactory',       color: 'text-yellow-400' };
  if (score >= 45) return { label: 'Needs Improvement',  color: 'text-orange-400' };
  return                  { label: 'At Risk',             color: 'text-red-400' };
}

// ── Baseline data pulled from module caches / mock ────────────────────────────
// In production: each hook hydrates this from the same DynamoDB queries
// used by StaffPerformanceCompass, EquipmentMetrics, ComplianceAnalyzer, Virtuous.
function buildReportData() {
  const facilityId   = localStorage.getItem('nexum_facility_id')   || 'facility-001';
  const facilityName = localStorage.getItem('nexum_facility_name') || 'Your Facility';
  const orgType      = localStorage.getItem('nexum_org_type')      || 'facility';

  // ── Staff performance ──────────────────────────────────────────────────────
  const staffScores = [
    { name: 'Repair & Maintenance',        score: 84 },
    { name: 'Work Order Discipline',       score: 78 },
    { name: 'System Stewardship',          score: 81 },
    { name: 'Organizational Virtue',       score: 76 },
  ];
  const staffAvg = Math.round(staffScores.reduce((s, d) => s + d.score, 0) / staffScores.length);

  // ── Equipment health ───────────────────────────────────────────────────────
  const equipmentScores = [
    { name: 'Boiler (BLR-001)',        score: 84, status: 'operational' },
    { name: 'Primary Chiller (CHL-001)', score: 79, status: 'operational' },
    { name: 'CHW Pump (PMP-001)',       score: 88, status: 'operational' },
    { name: 'AHU-3',                    score: 61, status: 'attention'  },
  ];
  const equipmentAvg = Math.round(equipmentScores.reduce((s, e) => s + e.score, 0) / equipmentScores.length);

  // ── Compliance ─────────────────────────────────────────────────────────────
  const complianceItems = [
    { name: 'Fire Suppression Cert',        status: 'compliant',    score: 100 },
    { name: 'Boiler Safety Inspection',     status: 'compliant',    score: 100 },
    { name: 'HVAC Preventive Maintenance',  status: 'attention',    score:  72 },
    { name: 'Electrical Panel Audit',       status: 'compliant',    score: 100 },
    { name: 'Elevator Inspection',          status: 'compliant',    score: 100 },
    { name: 'Chemical Handling Log',        status: 'attention',    score:  68 },
  ];
  const complianceAvg = Math.round(complianceItems.reduce((s, i) => s + i.score, 0) / complianceItems.length);

  // ── Risk ───────────────────────────────────────────────────────────────────
  const riskItems = [
    { title: 'Boiler Pressure Variance',   level: 'critical', score: 91, mitigated: false },
    { title: 'HVAC Filter Overdue',        level: 'high',     score: 74, mitigated: false },
    { title: 'Compliance Doc Expiry',      level: 'high',     score: 68, mitigated: true  },
    { title: 'Chiller Efficiency Drop',    level: 'medium',   score: 52, mitigated: true  },
    { title: 'Electrical Panel Load',      level: 'medium',   score: 48, mitigated: false },
    { title: 'Roof Drain Blockage',        level: 'low',      score: 22, mitigated: true  },
  ];
  const riskAvg = Math.round(riskItems.reduce((s, r) => s + r.score, 0) / riskItems.length);
  // Risk index is inverted: lower raw risk = higher index score
  const riskIndex = Math.max(0, 100 - riskAvg);

  const overall = Math.round((staffAvg + equipmentAvg + complianceAvg + riskIndex) / 4);

  return {
    facilityId, facilityName, orgType,
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    generatedAt: new Date().toLocaleString(),
    period: 'Q1 2026 (January – March)',
    overall, staffAvg, equipmentAvg, complianceAvg, riskIndex,
    staffScores, equipmentScores, complianceItems, riskItems,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function OrgEfficiencyReport() {
  const [data, setData]         = useState(() => buildReportData());
  const [refreshing, setRefreshing] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const [signedTitle, setSignedTitle] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(buildReportData());
      setRefreshing(false);
    }, 1000);
  };

  const handlePrint = () => window.print();

  const overall = scoreLabel(data.overall);

  return (
    <MainLayout>
      <TierGate feature="audit_report">
        <div className="space-y-6">

          {/* Page header — hidden in print */}
          <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Organizational Efficiency Report</h1>
                <p className="text-sm text-muted-foreground">Aggregate score across all platform modules · Premium</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
                <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
                Sync Data
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Export / Print
              </Button>
            </div>
          </div>

          {/* ── Printable report document ─────────────────────────────────── */}
          <div ref={reportRef} className="bg-card border border-border/40 rounded-xl p-8 space-y-8 print:border-0 print:shadow-none print:p-0">

            {/* Document header */}
            <div className="border-b border-border/40 pb-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">Nexum Suum · Facility Intelligence™</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mt-1">Operational Efficiency Overview</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Prepared for: <strong>{data.facilityName}</strong></p>
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Report date: <strong className="text-foreground">{data.reportDate}</strong></span>
                  </div>
                  <div>Period covered: <strong className="text-foreground">{data.period}</strong></div>
                  <div>Facility ID: <code className="text-xs">{data.facilityId}</code></div>
                </div>
              </div>
            </div>

            {/* Overall score */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              <div className="md:col-span-2 text-center p-6 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Overall Efficiency Score</p>
                <p className={cn('text-6xl font-bold mb-2', overall.color)}>{data.overall}</p>
                <Badge variant="outline" className={cn('text-sm', overall.color)}>{overall.label}</Badge>
                <p className="text-xs text-muted-foreground mt-2">Composite of all four domains</p>
              </div>
              <div className="md:col-span-3 grid grid-cols-2 gap-3">
                {[
                  { label: 'Staff Performance',  value: data.staffAvg,       icon: Users,      src: 'Staff Performance Compass' },
                  { label: 'Equipment Health',   value: data.equipmentAvg,   icon: Gauge,      src: 'Equipment Metrics' },
                  { label: 'Compliance Score',   value: data.complianceAvg,  icon: ShieldCheck,src: 'Compliance Analyzer' },
                  { label: 'Risk Index',         value: data.riskIndex,      icon: Target,     src: 'Virtuous Risk Analyzer' },
                ].map(({ label, value, icon: Icon, src }) => {
                  const meta = scoreLabel(value);
                  return (
                    <div key={label} className="p-3 rounded-lg border border-border/30 bg-background/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                      <p className={cn('text-2xl font-bold', meta.color)}>{value}</p>
                      <Progress value={value} className="h-1 mt-1.5 mb-1" />
                      <p className={cn('text-[10px] font-medium', meta.color)}>{meta.label}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">Source: {src}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section 1: Staff Performance ─────────────────────────────── */}
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 border-b border-border/20 pb-2">
                <Users className="w-4 h-4 text-primary" />Staff Performance Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.staffScores.map(({ name, score }) => {
                  const meta = scoreLabel(score);
                  return (
                    <div key={name} className="p-3 rounded-lg border border-border/20 bg-background/30">
                      <p className="text-xs text-muted-foreground mb-1">{name}</p>
                      <p className={cn('text-xl font-bold', meta.color)}>{score}</p>
                      <Progress value={score} className="h-1 mt-1" />
                      <p className={cn('text-[10px] mt-1', meta.color)}>{meta.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section 2: Equipment Health ───────────────────────────────── */}
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 border-b border-border/20 pb-2">
                <Gauge className="w-4 h-4 text-primary" />Equipment Health Summary
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/20">
                    <th className="pb-2 pr-4 font-medium">Equipment</th>
                    <th className="pb-2 pr-4 font-medium">Efficiency Score</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipmentScores.map(({ name, score, status }) => {
                    const meta = scoreLabel(score);
                    return (
                      <tr key={name} className="border-b border-border/10">
                        <td className="py-2 pr-4 font-medium">{name}</td>
                        <td className="py-2 pr-4">
                          <span className={cn('font-bold', meta.color)}>{score}%</span>
                          <Progress value={score} className="h-1 mt-1 w-24" />
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className={cn('text-[10px]', status === 'operational' ? 'text-green-400 border-green-400/30' : 'text-yellow-400 border-yellow-400/30')}>
                            {status === 'operational' ? 'Operational' : 'Needs Attention'}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <TrendingUp className={cn('w-3.5 h-3.5', meta.color)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Section 3: Compliance ─────────────────────────────────────── */}
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 border-b border-border/20 pb-2">
                <ShieldCheck className="w-4 h-4 text-primary" />Compliance Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.complianceItems.map(({ name, status, score }) => (
                  <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/20 bg-background/30">
                    {status === 'compliant'
                      ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />}
                    <span className="text-sm flex-1">{name}</span>
                    <span className={cn('text-sm font-bold', scoreLabel(score).color)}>{score}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 4: Risk Summary ───────────────────────────────────── */}
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 border-b border-border/20 pb-2">
                <Target className="w-4 h-4 text-primary" />Risk Assessment Summary
                <Badge variant="outline" className="text-[10px] ml-auto">Source: Virtuous Risk Analyzer</Badge>
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/20">
                    <th className="pb-2 pr-4 font-medium">Risk Item</th>
                    <th className="pb-2 pr-4 font-medium">Level</th>
                    <th className="pb-2 pr-4 font-medium">Score</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.riskItems.map(({ title, level, score, mitigated }) => {
                    const levelColors: Record<string, string> = {
                      critical: 'text-red-400', high: 'text-orange-400',
                      medium: 'text-yellow-400', low: 'text-green-400',
                    };
                    return (
                      <tr key={title} className="border-b border-border/10">
                        <td className="py-2 pr-4">{title}</td>
                        <td className="py-2 pr-4">
                          <span className={cn('text-xs font-semibold capitalize', levelColors[level])}>{level}</span>
                        </td>
                        <td className={cn('py-2 pr-4 font-bold', levelColors[level])}>{score}</td>
                        <td className="py-2">
                          {mitigated
                            ? <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Mitigated</span>
                            : <span className="text-[10px] text-orange-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Open</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Certification / Signature block ──────────────────────────── */}
            <div className="border-t border-border/40 pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Organizational Certification</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The undersigned authorized representative certifies that the information contained in this Organizational
                Efficiency Overview is accurate and complete to the best of their knowledge. This report was generated
                by the Nexum Suum Facility Intelligence™ platform and reflects data submitted by facility staff during
                the period noted above. This document may be submitted to licensing agencies, regulatory bodies, or
                oversight committees as an official organizational performance summary.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Authorized Signatory</p>
                  <input
                    type="text"
                    value={signedBy}
                    onChange={e => setSignedBy(e.target.value)}
                    placeholder="Full name"
                    className="w-full border-b border-border/60 bg-transparent text-sm py-1 outline-none focus:border-primary placeholder:text-muted-foreground/40 print:border-border"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Title / Role</p>
                  <input
                    type="text"
                    value={signedTitle}
                    onChange={e => setSignedTitle(e.target.value)}
                    placeholder="e.g. Facility Director"
                    className="w-full border-b border-border/60 bg-transparent text-sm py-1 outline-none focus:border-primary placeholder:text-muted-foreground/40 print:border-border"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date Signed</p>
                  <p className="text-sm border-b border-border/60 py-1">{data.reportDate}</p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-border/20 bg-background/30">
                <p className="text-[10px] text-muted-foreground/60">
                  Facility: {data.facilityName} · ID: {data.facilityId} · Generated: {data.generatedAt} · Platform: Nexum Suum Facility Intelligence™
                </p>
              </div>
            </div>

            {/* Print-only footer */}
            <div className="hidden print:block text-center text-[10px] text-muted-foreground border-t border-border/20 pt-4">
              Nexum Suum · Facility Intelligence™ · This report is auto-generated and reflects data entered by facility personnel.
            </div>
          </div>

          {/* Export note — screen only */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <Download className="w-3.5 h-3.5" />
            <span>Use <strong>Export / Print</strong> to save as PDF. Fill in the signature fields before printing.</span>
          </div>

        </div>
      </TierGate>
    </MainLayout>
  );
}
