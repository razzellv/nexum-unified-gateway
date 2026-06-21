import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, BarChart3, FileText, Zap, Clock, AlertTriangle, TrendingDown, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OIFinding {
  type: 'anomaly' | 'pattern' | 'fault' | 'trend';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  timestamp?: string;
}

interface OIReport {
  reportId: string;
  orgId: string;
  orgName: string;
  equipmentName: string;
  generatedAt: string;
  period: string;
  tier: string;
  summary: string;
  findings: OIFinding[];
  readingsAnalyzed: number;
  checkInsCompleted?: number;
}

interface ReportOrg {
  orgId: string;
  orgName: string;
  orgType: string;
  tier: string;
  lastSyncDate?: string;
  nextCheckIn?: string;
  reportCount: number;
  reports: OIReport[];
}

const FINDING_ICONS: Record<string, any> = {
  anomaly: AlertTriangle,
  pattern: Clock,
  fault: Zap,
  trend: TrendingDown,
};

const FINDING_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

function generateDemoFindings(orgName: string, equipment: string): OIFinding[] {
  return [
    { type: 'pattern', severity: 'warning', title: 'Temperature dip — 4:00 AM daily', detail: `${equipment} supply temp drops 8–12°F every night between 3:45–4:20 AM. Consistent across 22 of 30 monitored days. Likely setback schedule conflict or night-mode override issue.` },
    { type: 'fault', severity: 'critical', title: 'Compressor surge — 4:55 PM', detail: `Surge event detected 4:55 PM on 3 separate days this period. Corresponds with peak-demand onset. Recommend surge control valve inspection and load-shedding schedule review.` },
    { type: 'anomaly', severity: 'warning', title: 'Consistent low supply pressure', detail: `Supply pressure averaging 18 PSI vs. 22 PSI design setpoint. Delta has widened 2.1 PSI over 30-day period — trending toward alarm threshold. Filter or impeller inspection recommended.` },
    { type: 'trend', severity: 'info', title: 'Runtime hours trending higher', detail: `Average daily runtime increased from 14.2 hrs to 17.8 hrs over the monitored period. No fault codes. Possible setpoint drift or occupancy schedule change driving longer cycles.` },
  ];
}

const DEMO_ORGS: ReportOrg[] = [
  { orgId: 'org-001', orgName: 'Metro Industrial LLC', orgType: 'facility', tier: 'enterprise', lastSyncDate: '2026-06-15', nextCheckIn: '2026-06-28', reportCount: 5, reports: [] },
  { orgId: 'org-002', orgName: 'Oakview Memorial Hospital', orgType: 'facility', tier: 'premium', lastSyncDate: '2026-06-10', nextCheckIn: '2026-07-01', reportCount: 3, reports: [] },
  { orgId: 'org-005', orgName: 'NorthStar Manufacturing', orgType: 'facility', tier: 'business', lastSyncDate: '2026-05-28', nextCheckIn: '2026-07-05', reportCount: 2, reports: [] },
];

export default function OIReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<ReportOrg[]>(DEMO_ORGS);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<OIReport | null>(null);

  const isAdmin = user?.role === 'admin' || user?.['custom:role'] === 'admin';

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nexum_oi_reports') || '[]') as OIReport[];
      if (stored.length > 0) {
        setOrgs(prev => prev.map(org => ({
          ...org,
          reports: stored.filter(r => r.orgId === org.orgId),
          reportCount: stored.filter(r => r.orgId === org.orgId).length || org.reportCount,
        })));
      }
    } catch {}
  }, []);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Admin access required.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleGenerate = async (org: ReportOrg) => {
    setGenerating(org.orgId);
    await new Promise(r => setTimeout(r, 2200));

    const equipmentName = org.orgId === 'org-001' ? 'Main Chiller · CH-01' :
                          org.orgId === 'org-002' ? 'AHU-3 · Air Handler North Wing' :
                          'VFD-01 · Cooling Tower Fan Drive';

    const report: OIReport = {
      reportId: `oir-${Date.now()}`,
      orgId: org.orgId,
      orgName: org.orgName,
      equipmentName,
      generatedAt: new Date().toISOString(),
      period: 'June 2026',
      tier: org.tier,
      summary: `${org.orgName} — June 2026 operational analysis identified ${4} findings across ${org.orgId === 'org-001' ? 30 : org.orgId === 'org-002' ? 30 : 7}-day monitoring window. Two items require immediate attention: a recurring compressor surge at 4:55 PM and consistent low supply pressure trending toward alarm threshold. Temperature dip pattern at 4 AM warrants schedule audit. Runtime trending upward with no associated faults — monitor for setpoint drift.`,
      findings: generateDemoFindings(org.orgName, equipmentName),
      readingsAnalyzed: org.orgId === 'org-001' ? 720 : org.orgId === 'org-002' ? 720 : 336,
      checkInsCompleted: org.tier === 'enterprise' ? 4 : org.tier === 'premium' ? 4 : undefined,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('nexum_oi_reports') || '[]');
      localStorage.setItem('nexum_oi_reports', JSON.stringify([report, ...existing]));
    } catch {}

    setOrgs(prev => prev.map(o => o.orgId === org.orgId ? { ...o, reports: [report, ...o.reports], reportCount: o.reportCount + 1, lastSyncDate: new Date().toISOString().split('T')[0] } : o));
    setGenerating(null);
    setViewReport(report);
    toast({ title: 'Report generated', description: `OI report for ${org.orgName} is ready.` });
  };

  const handleExport = (report: OIReport) => {
    const text = [
      `NEXUM SUUM — OPERATIONAL INTELLIGENCE REPORT`,
      `Organization: ${report.orgName}`,
      `Equipment: ${report.equipmentName}`,
      `Period: ${report.period}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Readings Analyzed: ${report.readingsAnalyzed}`,
      report.checkInsCompleted ? `On-Site Check-Ins: ${report.checkInsCompleted}` : '',
      ``,
      `EXECUTIVE SUMMARY`,
      report.summary,
      ``,
      `FINDINGS`,
      ...report.findings.map((f, i) => [`${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`, `   ${f.detail}`, ''].join('\n')),
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard', description: 'Report ready to paste.' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              OI Report Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Operational Intelligence — monthly findings reports</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-3">
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Subscribed Orgs</p>
            <p className="text-2xl font-bold">{orgs.length}</p>
          </CardContent></Card>
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reports Generated</p>
            <p className="text-2xl font-bold">{orgs.reduce((s, o) => s + o.reportCount, 0)}</p>
          </CardContent></Card>
          <Card className="neon-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-green-400">{orgs.reduce((s, o) => s + o.reports.filter(r => r.period === 'June 2026').length, 0)}</p>
          </CardContent></Card>
        </div>

        {/* Org cards */}
        <div className="grid gap-4">
          {orgs.map(org => (
            <Card key={org.orgId} className="neon-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{org.orgName}</h3>
                      <Badge variant="outline" className="text-xs capitalize">{org.tier}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{org.orgType}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                      {org.lastSyncDate && (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />Last sync: {new Date(org.lastSyncDate).toLocaleDateString()}
                        </span>
                      )}
                      {org.nextCheckIn && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />Next check-in: {new Date(org.nextCheckIn).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />{org.reportCount} report{org.reportCount !== 1 ? 's' : ''} total
                      </span>
                    </div>

                    {/* Recent reports */}
                    {org.reports.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {org.reports.slice(0, 2).map(r => (
                          <button key={r.reportId} onClick={() => setViewReport(r)}
                            className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-xs">
                            <span className="text-primary font-medium">{r.period} — {r.equipmentName}</span>
                            <span className="text-muted-foreground">{new Date(r.generatedAt).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleGenerate(org)}
                    disabled={generating === org.orgId}
                    className="shrink-0"
                  >
                    {generating === org.orgId ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" />Generate Report</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report Viewer Dialog */}
      <Dialog open={!!viewReport} onOpenChange={o => { if (!o) setViewReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  OI Report — {viewReport.period}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{viewReport.orgName} · {viewReport.equipmentName}</p>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Meta */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-muted-foreground">Readings</p>
                    <p className="font-bold text-lg">{viewReport.readingsAnalyzed}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-muted-foreground">Findings</p>
                    <p className="font-bold text-lg">{viewReport.findings.length}</p>
                  </div>
                  {viewReport.checkInsCompleted && (
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-muted-foreground">Check-ins</p>
                      <p className="font-bold text-lg text-green-400">{viewReport.checkInsCompleted}</p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Executive Summary</p>
                  <p className="text-sm leading-relaxed">{viewReport.summary}</p>
                </div>

                {/* Findings */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Findings</p>
                  <div className="space-y-3">
                    {viewReport.findings.map((f, i) => {
                      const Icon = FINDING_ICONS[f.type] || AlertTriangle;
                      return (
                        <div key={i} className={cn('p-3 rounded-lg border text-sm', FINDING_COLORS[f.severity])}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="font-semibold">{f.title}</span>
                            <Badge variant="outline" className={cn('text-xs ml-auto capitalize', FINDING_COLORS[f.severity])}>{f.severity}</Badge>
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">{f.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => handleExport(viewReport)}>
                  <Download className="w-4 h-4 mr-2" />Copy Report to Clipboard
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
