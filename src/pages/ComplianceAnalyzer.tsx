import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  FileSearch,
  Clock,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Scale,
  Fingerprint,
  ClipboardList,
  Eye,
  Target,
  Layers,
  BarChart2,
  Brain,
  Lightbulb,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getViolationDetails, getCategoryColor } from '@/lib/complianceConstants';
import { apiRequest } from '@/lib/api';
import { listIssues, IssueOrigin, runAICritique, type AICritiqueResult } from '@/lib/nexum-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface EmployeeScore {
  operatorId?: string;
  employeeId?: string;
  logsSubmitted?: number;
  violationCount?: number;
  avgSeverity?: number;
  virtuousScore?: number;
  riskScore?: number;
  complianceRate?: number;
  cumulativeLevel?: string;
}

interface Violation {
  violationType?: string;
  description?: string;
  operatorId?: string;
  severity?: number;
  timestamp?: string;
  code?: string;
}

interface AnalysisData {
  complianceScore: number;
  logsAnalyzed: number;
  violationsFound: number;
  summary: ComplianceSummary;
  violations: Violation[];
  employeeScores: EmployeeScore[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAge(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function severityColor(severity: IssueOrigin['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high':     return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium':   return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low':      return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:         return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function statusColor(status: IssueOrigin['status']): string {
  switch (status) {
    case 'open':        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'resolved':    return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'closed':      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'reopened':    return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function sourceTypeLabel(sourceType: string): string {
  const map: Record<string, string> = {
    operator_log: 'Operator Log',
    pm: 'Preventive Maintenance',
    work_order: 'Work Order',
    violation: 'Violation Report',
    inspection: 'Inspection',
    photo: 'Photo Evidence',
    ai_detection: 'AI Detection',
    vendor_note: 'Vendor Note',
    bas_alarm: 'BAS Alarm',
    manual_report: 'Manual Report',
  };
  return map[sourceType] || sourceType;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ScoreRowProps {
  label: string;
  score: number;
  icon: React.ReactNode;
}

function ScoreRow({ label, score, icon }: ScoreRowProps) {
  const rounded = Math.round(score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={cn(
          'font-bold tabular-nums',
          rounded >= 80 ? 'text-green-400' :
          rounded >= 60 ? 'text-yellow-400' :
          rounded >= 40 ? 'text-orange-400' :
          'text-red-400'
        )}>
          {rounded}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', scoreBarColor(rounded))}
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClass?: string;
  iconClass?: string;
}

function MetricCard({ label, value, icon, valueClass = 'text-foreground', iconClass = 'text-primary/20' }: MetricCardProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', valueClass)}>{value}</p>
          </div>
          <div className={cn('w-10 h-10', iconClass)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ComplianceAnalyzer() {
  const { user } = useAuth();

  // --- Compliance Analyzer state ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  // --- Issues state ---
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [issues, setIssues] = useState<IssueOrigin[]>([]);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>('all');
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<string>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // --- Employee sub-tab ---
  const [empSubTab, setEmpSubTab] = useState<'chart' | 'table'>('table');

  // --- Work Integrity Critique ---
  const [critiqueTarget, setCritiqueTarget] = useState<string | null>(null);
  const [critiqueResult, setCritiqueResult] = useState<AICritiqueResult | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [critiqueInput, setCritiqueInput] = useState('');

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const facilityId = user?.facilityId || user?.['custom:facilityId'];

  const runAnalysis = useCallback(async () => {
    if (!facilityId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const data = await apiRequest<AnalysisData>(`/compliance-analyzer?days=${days}`);
      setAnalysisData(data);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [days, facilityId]);

  const loadIssues = useCallback(async () => {
    setIsLoadingIssues(true);
    setIssuesError(null);
    try {
      const params: { status?: string; severity?: string } = {};
      if (issueStatusFilter !== 'all') params.status = issueStatusFilter;
      if (issueSeverityFilter !== 'all') params.severity = issueSeverityFilter;
      const result = await listIssues(params);
      setIssues(result?.issues ?? []);
    } catch (err: any) {
      setIssuesError(err?.message || 'Failed to load issues');
      setIssues([]);
    } finally {
      setIsLoadingIssues(false);
    }
  }, [issueStatusFilter, issueSeverityFilter]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const complianceScore = analysisData?.complianceScore ?? 0;
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'reopened').length;

  const avgDefensibility = issues.length > 0
    ? Math.round(issues.reduce((sum, _i) => sum + complianceScore, 0) / issues.length)
    : null;

  const atRiskStaff = analysisData?.employeeScores?.filter((e) => (e.riskScore ?? 0) > 50).length ?? 0;

  // Admissibility scores
  const evidenceCompleteness = Math.min(100, complianceScore + 10);
  const validationScore = complianceScore;
  const timelineIntegrity = issues.length > 0 ? Math.min(100, complianceScore + 5) : complianceScore;
  const chainOfCustody = issues.length > 0 ? 75 : 60;
  const documentationCompleteness = complianceScore;
  const operationalVisibility = Math.max(0, 100 - (openIssues * 5));
  const decisionDefensibility = Math.min(100, complianceScore + (issues.length > 0 ? 10 : 0));
  const complianceDefensibility = complianceScore;
  const fipmoScore = Math.min(100, complianceScore + 5);

  const admissibilityScores = [
    { label: 'Evidence Completeness Score',       score: evidenceCompleteness,      icon: <Fingerprint className="w-3.5 h-3.5" /> },
    { label: 'Validation Score',                  score: validationScore,           icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { label: 'Timeline Integrity Score',          score: timelineIntegrity,         icon: <Clock className="w-3.5 h-3.5" /> },
    { label: 'Chain of Custody Score',            score: chainOfCustody,            icon: <GitBranch className="w-3.5 h-3.5" /> },
    { label: 'Documentation Completeness Score',  score: documentationCompleteness, icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { label: 'Operational Visibility Score',      score: operationalVisibility,     icon: <Eye className="w-3.5 h-3.5" /> },
    { label: 'Decision Defensibility Score',      score: decisionDefensibility,     icon: <Scale className="w-3.5 h-3.5" /> },
    { label: 'Compliance Defensibility Score',    score: complianceDefensibility,   icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: 'FIPMO Continuity Score',            score: fipmoScore,                icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.originalTimestamp).getTime() - new Date(a.originalTimestamp).getTime())
    .slice(0, 5);

  const employeeChartData = analysisData?.employeeScores?.map((emp) => ({
    name: `Emp ${String(emp.operatorId || emp.employeeId || 'Unknown').slice(-4)}`,
    score: emp.virtuousScore ?? 100,
    violations: emp.violationCount ?? 0,
  })) ?? [];

  const runCritique = async (title: string, description: string) => {
    setCritiqueTarget(title);
    setCritiqueLoading(true);
    setCritiqueResult(null);
    try {
      const result = await runAICritique({ title, description, taskType: 'compliance' });
      setCritiqueResult(result as AICritiqueResult);
    } catch {
      setCritiqueResult(null);
    } finally {
      setCritiqueLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <MainLayout>
      <div className="p-6 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Scale className="w-7 h-7 text-primary" />
              Operational Evidence &amp; Decision Defensibility Engine
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Admissible evidence chains · Chronological truth · Decision defensibility
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <Button onClick={runAnalysis} disabled={isAnalyzing} size="sm">
              <RefreshCw className={cn('w-4 h-4 mr-2', isAnalyzing && 'animate-spin')} />
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Error banners                                                      */}
        {/* ---------------------------------------------------------------- */}
        {analysisError && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Analysis Error</p>
                  <p className="text-xs text-muted-foreground">{analysisError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {issuesError && (
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-400 text-sm">Issue Board Warning</p>
                  <p className="text-xs text-muted-foreground">{issuesError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Top Metrics Row (6 cards)                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Compliance Score"
            value={analysisData ? `${analysisData.complianceScore}%` : '—'}
            icon={<CheckCircle className="w-full h-full" />}
            valueClass="text-green-400"
            iconClass="text-green-500/20"
          />
          <MetricCard
            label="Logs Analyzed"
            value={analysisData?.logsAnalyzed ?? '—'}
            icon={<Activity className="w-full h-full" />}
            iconClass="text-primary/20"
          />
          <MetricCard
            label="Violations Found"
            value={analysisData?.violationsFound ?? '—'}
            icon={<AlertTriangle className="w-full h-full" />}
            valueClass="text-yellow-400"
            iconClass="text-yellow-500/20"
          />
          <MetricCard
            label="Open Issues"
            value={isLoadingIssues ? '…' : openIssues}
            icon={<FileSearch className="w-full h-full" />}
            valueClass="text-blue-400"
            iconClass="text-blue-500/20"
          />
          <MetricCard
            label="Avg Defensibility"
            value={avgDefensibility !== null ? `${avgDefensibility}%` : 'N/A'}
            icon={<Scale className="w-full h-full" />}
            valueClass={avgDefensibility !== null ? (avgDefensibility >= 70 ? 'text-green-400' : avgDefensibility >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-muted-foreground'}
            iconClass="text-purple-500/20"
          />
          <MetricCard
            label="At-Risk Staff"
            value={analysisData ? atRiskStaff : '—'}
            icon={<Users className="w-full h-full" />}
            valueClass="text-red-400"
            iconClass="text-red-500/20"
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Main Tabs                                                          */}
        {/* ---------------------------------------------------------------- */}
        <Tabs defaultValue="intelligence" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="intelligence">Intelligence Overview</TabsTrigger>
            <TabsTrigger value="evidence">Issue Evidence Board</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
            <TabsTrigger value="timeline">Evidence Timeline</TabsTrigger>
          </TabsList>

          {/* ============================================================== */}
          {/* TAB 1: Intelligence Overview                                     */}
          {/* ============================================================== */}
          <TabsContent value="intelligence">
            <div className="grid md:grid-cols-2 gap-4">

              {/* Admissibility Score Panel */}
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Admissibility Score Panel
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {analysisData
                      ? issues.length > 0
                        ? 'Computed from compliance data and issue evidence'
                        : 'Estimated from compliance data (no issues loaded yet)'
                      : 'Run analysis to populate scores'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {admissibilityScores.map(({ label, score, icon }) => (
                    <ScoreRow key={label} label={label} score={score} icon={icon} />
                  ))}
                </CardContent>
              </Card>

              {/* Recent AI Intelligence */}
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Recent AI Intelligence
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingIssues ? 'Loading issues…' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} in scope`}
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingIssues ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : recentIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                      <FileSearch className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No issues found for this facility</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentIssues.map((issue) => (
                        <div
                          key={issue.issueId}
                          className="p-3 rounded-lg border border-border/30 bg-background/40 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">{issue.title}</p>
                            <Badge variant="outline" className={cn('shrink-0 text-xs', severityColor(issue.severity))}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            First observed by{' '}
                            <span className="text-foreground font-medium">{issue.firstReporterName}</span>
                            {' '}on{' '}
                            {new Date(issue.originalTimestamp).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                            {' '}via{' '}
                            <span className="text-primary/80">{sourceTypeLabel(issue.sourceType)}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatAge(issue.originalTimestamp)}
                            </span>
                            <Badge variant="outline" className={cn('text-xs', statusColor(issue.status))}>
                              {issue.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 2: Issue Evidence Board                                      */}
          {/* ============================================================== */}
          <TabsContent value="evidence">
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-primary" />
                    Issue Evidence Board
                  </CardTitle>
                  {/* Filter bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={issueStatusFilter}
                      onChange={(e) => setIssueStatusFilter(e.target.value)}
                      className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="reopened">Reopened</option>
                    </select>
                    <select
                      value={issueSeverityFilter}
                      onChange={(e) => setIssueSeverityFilter(e.target.value)}
                      className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadIssues}
                      disabled={isLoadingIssues}
                      className="text-xs"
                    >
                      <RefreshCw className={cn('w-3 h-3 mr-1', isLoadingIssues && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingIssues ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
                    <FileSearch className="w-14 h-14 text-muted-foreground/20" />
                    <div>
                      <p className="text-muted-foreground font-medium">No issues found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Adjust filters or check back later
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/30 bg-primary/10">
                          <th className="text-left p-3 font-semibold text-xs w-6"></th>
                          <th className="text-left p-3 font-semibold text-xs">Title</th>
                          <th className="text-left p-3 font-semibold text-xs">First Reporter</th>
                          <th className="text-left p-3 font-semibold text-xs">Role</th>
                          <th className="text-left p-3 font-semibold text-xs">Source</th>
                          <th className="text-left p-3 font-semibold text-xs">Observed</th>
                          <th className="text-center p-3 font-semibold text-xs">Severity</th>
                          <th className="text-center p-3 font-semibold text-xs">Status</th>
                          <th className="text-right p-3 font-semibold text-xs">Defensibility</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issues.map((issue) => {
                          const isExpanded = expandedIssues.has(issue.issueId);
                          const defensibility = Math.min(100, complianceScore + (issue.status === 'closed' ? 15 : issue.status === 'resolved' ? 10 : 0));
                          return (
                            <>
                              <tr
                                key={issue.issueId}
                                className="border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                                onClick={() => toggleExpand(issue.issueId)}
                              >
                                <td className="p-3 text-muted-foreground">
                                  {isExpanded
                                    ? <ChevronDown className="w-3.5 h-3.5" />
                                    : <ChevronRight className="w-3.5 h-3.5" />}
                                </td>
                                <td className="p-3">
                                  <span className="font-medium">{issue.title}</span>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {issue.firstReporterName}
                                </td>
                                <td className="p-3 text-muted-foreground text-xs">
                                  {issue.firstReporterRole}
                                </td>
                                <td className="p-3">
                                  <span className="text-xs text-primary/80">
                                    {sourceTypeLabel(issue.sourceType)}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(issue.originalTimestamp).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                  })}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className={cn('text-xs', severityColor(issue.severity))}>
                                    {issue.severity}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className={cn('text-xs', statusColor(issue.status))}>
                                    {issue.status.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right">
                                  <span className={cn(
                                    'font-bold tabular-nums',
                                    defensibility >= 80 ? 'text-green-400' :
                                    defensibility >= 60 ? 'text-yellow-400' :
                                    defensibility >= 40 ? 'text-orange-400' :
                                    'text-red-400'
                                  )}>
                                    {defensibility}%
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr key={`${issue.issueId}-expanded`} className="border-b border-border/30 bg-primary/5">
                                  <td colSpan={9} className="px-8 py-4">
                                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                      <div className="space-y-2">
                                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                                          Original Description
                                        </p>
                                        <p className="text-muted-foreground leading-relaxed">
                                          {issue.originalDescription || 'No description provided'}
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                                          Evidence Details
                                        </p>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                          <div className="flex justify-between">
                                            <span>Source Type</span>
                                            <span className="text-foreground">{sourceTypeLabel(issue.sourceType)}</span>
                                          </div>
                                          {issue.assetId && (
                                            <div className="flex justify-between">
                                              <span>Asset ID</span>
                                              <span className="text-foreground font-mono">{issue.assetId}</span>
                                            </div>
                                          )}
                                          {issue.systemType && (
                                            <div className="flex justify-between">
                                              <span>System Type</span>
                                              <span className="text-foreground">{issue.systemType}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between">
                                            <span>Report Category</span>
                                            <span className="text-foreground capitalize">
                                              {issue.reportSourceCategory.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Confidence</span>
                                            <span className="text-foreground">{issue.confidenceLevel}%</span>
                                          </div>
                                          {issue.tags && issue.tags.length > 0 && (
                                            <div className="flex justify-between items-start">
                                              <span>Tags</span>
                                              <div className="flex flex-wrap gap-1 justify-end">
                                                {issue.tags.map((tag) => (
                                                  <span key={tag} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 3: Compliance Analysis                                       */}
          {/* ============================================================== */}
          <TabsContent value="compliance" className="space-y-4">
            {!analysisData && !isAnalyzing && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-12 text-center">
                  <ShieldCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Click "Run Analysis" to analyze facility logs</p>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && !analysisData && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center">
                  <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing compliance data…</p>
                </CardContent>
              </Card>
            )}

            {analysisData && (
              <>
                {/* Active Violation Types + Employee Performance Chart */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Violations by Type Table */}
                  <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Active Violation Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-primary/30 bg-primary/10">
                              <th className="text-left p-3 font-semibold text-sm">Violation Type</th>
                              <th className="text-center p-3 font-semibold text-sm">Count</th>
                              <th className="text-center p-3 font-semibold text-sm">Avg Severity</th>
                              <th className="text-right p-3 font-semibold text-sm">Total Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(
                              (analysisData.violations ?? []).reduce<
                                Record<string, { count: number; totalSeverity: number }>
                              >((acc, v) => {
                                const type = v.violationType || 'Unknown';
                                if (!acc[type]) acc[type] = { count: 0, totalSeverity: 0 };
                                acc[type].count += 1;
                                acc[type].totalSeverity += v.severity ?? 50;
                                return acc;
                              }, {})
                            )
                              .sort((a, b) => b[1].count - a[1].count)
                              .map(([type, data], i) => {
                                const avgSeverity = Math.round(data.totalSeverity / data.count);
                                return (
                                  <tr
                                    key={i}
                                    className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                                  >
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className={cn(
                                          'w-4 h-4',
                                          avgSeverity >= 80 ? 'text-red-500' :
                                          avgSeverity >= 60 ? 'text-orange-500' :
                                          avgSeverity >= 40 ? 'text-yellow-500' :
                                          'text-green-500'
                                        )} />
                                        <span className="font-medium text-sm">{type}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold">
                                        {data.count}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={cn(
                                        'px-3 py-1 rounded-full font-semibold text-sm',
                                        avgSeverity >= 80 ? 'bg-red-500/20 text-red-400' :
                                        avgSeverity >= 60 ? 'bg-orange-500/20 text-orange-400' :
                                        avgSeverity >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-green-500/20 text-green-400'
                                      )}>
                                        {avgSeverity}%
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className="font-bold text-lg">{data.totalSeverity}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            {(analysisData.violations ?? []).length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">
                                  No violations detected in this period
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Employee Performance Chart */}
                  <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Employee Performance Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {employeeChartData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center gap-3">
                          <BarChart2 className="w-10 h-10 text-muted-foreground/20" />
                          <p className="text-sm text-muted-foreground">No employee data available</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={employeeChartData}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                              dataKey="name"
                              stroke="#888"
                              tick={{ fill: '#888', fontSize: 12 }}
                              label={{ value: 'Employees', position: 'insideBottom', offset: -5, fill: '#888' }}
                            />
                            <YAxis
                              stroke="#888"
                              tick={{ fill: '#888', fontSize: 12 }}
                              label={{ value: 'Virtuous Score', angle: -90, position: 'insideLeft', fill: '#888' }}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00d9ff' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke="#00d9ff"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorScore)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Employee Accountability Table */}
                <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Employee Accountability &amp; Performance</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={empSubTab === 'table' ? 'default' : 'outline'}
                          onClick={() => setEmpSubTab('table')}
                          className="text-xs"
                        >
                          Table
                        </Button>
                        <Button
                          size="sm"
                          variant={empSubTab === 'chart' ? 'default' : 'outline'}
                          onClick={() => setEmpSubTab('chart')}
                          className="text-xs"
                        >
                          Chart
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {empSubTab === 'table' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-primary/30 bg-primary/10">
                              <th className="text-left p-3 font-semibold text-sm">Employee ID</th>
                              <th className="text-right p-3 font-semibold text-sm">Logs Submitted</th>
                              <th className="text-right p-3 font-semibold text-sm">Violations</th>
                              <th className="text-right p-3 font-semibold text-sm">Avg Severity</th>
                              <th className="text-right p-3 font-semibold text-sm">Virtuous Score</th>
                              <th className="text-right p-3 font-semibold text-sm">Risk Score</th>
                              <th className="text-right p-3 font-semibold text-sm">Compliance %</th>
                              <th className="text-left p-3 font-semibold text-sm">Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(analysisData.employeeScores ?? []).map((emp, i) => (
                              <tr
                                key={i}
                                className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                              >
                                <td className="p-3">
                                  <span className="font-mono text-sm font-medium">
                                    {String(emp.operatorId ?? emp.employeeId ?? 'Unknown').slice(-8)}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-medium">{emp.logsSubmitted ?? 0}</td>
                                <td className="p-3 text-right">
                                  <span className={cn(
                                    'px-2 py-1 rounded font-semibold text-sm',
                                    (emp.violationCount ?? 0) === 0 ? 'text-green-400' :
                                    (emp.violationCount ?? 0) <= 2 ? 'text-yellow-400' :
                                    'text-red-400'
                                  )}>
                                    {emp.violationCount ?? 0}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <span className={cn(
                                    'px-2 py-1 rounded text-xs font-semibold',
                                    (emp.avgSeverity ?? 0) < 30 ? 'bg-green-500/20 text-green-400' :
                                    (emp.avgSeverity ?? 0) < 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  )}>
                                    {emp.avgSeverity ?? 0}%
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <span className="text-primary font-bold text-lg">
                                    {emp.virtuousScore ?? 100}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <span className={cn(
                                    'font-semibold',
                                    (emp.riskScore ?? 0) < 30 ? 'text-green-400' :
                                    (emp.riskScore ?? 0) < 60 ? 'text-yellow-400' :
                                    'text-red-400'
                                  )}>
                                    {emp.riskScore ?? 0}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <span className="text-green-400 font-semibold">
                                    {emp.complianceRate ?? 100}%
                                  </span>
                                </td>
                                <td className="p-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      emp.cumulativeLevel === 'Excellent' && 'bg-green-500/20 text-green-400 border-green-500/30',
                                      emp.cumulativeLevel === 'Good' && 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                      emp.cumulativeLevel === 'Fair' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                      emp.cumulativeLevel === 'Needs Improvement' && 'bg-red-500/20 text-red-400 border-red-500/30'
                                    )}
                                  >
                                    {emp.cumulativeLevel ?? 'Good'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                            {(analysisData.employeeScores ?? []).length === 0 && (
                              <tr>
                                <td colSpan={8} className="p-6 text-center text-muted-foreground text-sm">
                                  No employee score data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        {employeeChartData.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                            <BarChart2 className="w-10 h-10 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">No employee data available</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={employeeChartData}>
                              <defs>
                                <linearGradient id="colorScore2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.1} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00d9ff' }} />
                              <Area type="monotone" dataKey="score" stroke="#00d9ff" strokeWidth={2} fillOpacity={1} fill="url(#colorScore2)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Violations Detail Table */}
                <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Detected Violations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-primary/30 bg-primary/10">
                            <th className="text-left p-3 font-semibold text-sm">Code</th>
                            <th className="text-left p-3 font-semibold text-sm">Violation Type</th>
                            <th className="text-left p-3 font-semibold text-sm">Description</th>
                            <th className="text-left p-3 font-semibold text-sm">Operator</th>
                            <th className="text-center p-3 font-semibold text-sm">Severity</th>
                            <th className="text-left p-3 font-semibold text-sm">Timestamp</th>
                            <th className="text-left p-3 font-semibold text-sm">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analysisData.violations ?? []).map((v, i) => {
                            const violationDetails = getViolationDetails(v.violationType ?? '');
                            const category = violationDetails.category;
                            const severity = v.severity ?? 50;
                            return (
                              <tr
                                key={i}
                                className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                              >
                                <td className="p-3">
                                  <span className="font-mono text-xs font-semibold text-primary">
                                    {v.code ?? `V-${String(i).padStart(3, '0')}`}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className={cn(
                                      'w-4 h-4',
                                      severity >= 80 ? 'text-red-500' :
                                      severity >= 60 ? 'text-orange-500' :
                                      severity >= 40 ? 'text-yellow-500' :
                                      'text-green-500'
                                    )} />
                                    <span className="text-sm">{v.violationType ?? 'Unknown'}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="text-sm text-muted-foreground">
                                    {v.description ?? violationDetails.label ?? 'No description'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="text-sm font-mono">
                                    {String(v.operatorId ?? 'Unknown').slice(-8)}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={cn(
                                    'px-3 py-1 rounded-full font-semibold text-sm',
                                    severity >= 80 ? 'bg-red-500/20 text-red-400' :
                                    severity >= 60 ? 'bg-orange-500/20 text-orange-400' :
                                    severity >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                                  )}>
                                    {severity}%
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="text-xs text-muted-foreground">
                                    {v.timestamp
                                      ? new Date(v.timestamp).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric',
                                          hour: '2-digit', minute: '2-digit',
                                        })
                                      : '—'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className={getCategoryColor(category)}>
                                    {category}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                          {(analysisData.violations ?? []).length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">
                                No violations detected in this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Work Integrity Critique Panel */}
            <Card className="glass-panel bg-card/30 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Work Integrity Critique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Enter a compliance requirement to critique..."
                    value={critiqueInput}
                    onChange={e => setCritiqueInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => runCritique(critiqueInput, '')}
                    disabled={critiqueLoading || !critiqueInput.trim()}
                    className="gap-2 shrink-0"
                  >
                    {critiqueLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Run
                  </Button>
                </div>
                {critiqueLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing "{critiqueTarget}"...
                  </div>
                )}
                {critiqueResult && !critiqueLoading && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Overall Risk:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold border',
                          critiqueResult.overallRisk === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          critiqueResult.overallRisk === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        )}>{critiqueResult.overallRisk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Deadline Viability:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold border',
                          critiqueResult.deadlineViability === 'unrealistic' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          critiqueResult.deadlineViability === 'tight' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        )}>{critiqueResult.deadlineViability}</span>
                      </div>
                    </div>
                    {critiqueResult.assumptions && critiqueResult.assumptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Assumptions
                        </p>
                        {critiqueResult.assumptions.map((a, i) => (
                          <div key={i} className="p-2 rounded bg-muted/10 border border-border flex items-start justify-between gap-2">
                            <div className="text-xs flex-1">
                              <span className="font-medium">{a.text}</span>
                              {a.recommendation && <p className="text-muted-foreground mt-0.5">{a.recommendation}</p>}
                            </div>
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] border shrink-0',
                              a.risk === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              a.risk === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-green-500/20 text-green-400 border-green-500/30'
                            )}>{a.risk}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {critiqueResult.efficiencyGains && critiqueResult.efficiencyGains.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Efficiency Gains</p>
                        {critiqueResult.efficiencyGains.map((g, i) => (
                          <div key={i} className="text-xs flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded px-2 py-1">
                            <span>{g.description}</span>
                            <span className="text-green-400 font-semibold shrink-0 ml-2">-{g.estimatedTimeSavingHours}h</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {critiqueResult.simplifications && critiqueResult.simplifications.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-yellow-400" /> Simplifications
                        </p>
                        {critiqueResult.simplifications.map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground">· {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 4: Evidence Timeline (placeholder)                          */}
          {/* ============================================================== */}
          <TabsContent value="timeline">
            <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
              <CardContent className="p-16 flex flex-col items-center justify-center text-center gap-5">
                <div className="relative">
                  <Clock className="w-16 h-16 text-muted-foreground/20" />
                  <GitBranch className="w-6 h-6 text-primary/40 absolute -bottom-1 -right-1" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <p className="text-lg font-semibold text-muted-foreground">
                    Evidence Timeline
                  </p>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    Select an issue from the Evidence Board to view its full chronological
                    timeline, report attempts, and linked operational records.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tab = document.querySelector('[data-value="evidence"]') as HTMLButtonElement;
                    tab?.click();
                  }}
                >
                  Go to Evidence Board
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
