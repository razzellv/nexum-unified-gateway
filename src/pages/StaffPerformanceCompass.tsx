import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NexumLoader } from '@/components/global/NexumLoader';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { ScopeAlignmentPanel } from '@/components/global/ScopeAlignmentPanel';
import { DCIntelligencePanel } from '@/components/global/DCIntelligencePanel';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  ChevronRight,
  Shield,
  Target,
  Brain,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCriticalPath,
  getCompetencyMatch,
  type CriticalPathData,
  type CompetencyRecommendation,
} from '@/lib/nexum-api';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  overallScore: number;
  scoreTrend: 'up' | 'down' | 'stable';
  domains: {
    repairMaintenance: DomainScore;
    workOrderDiscipline: DomainScore;
    systemStewardship: DomainScore;
    organizationalVirtue: DomainScore;
  };
  strengths: any[];
  risks: any[];
  coachingPrompts: any[];
  scoreHistory: { month: string; score: number }[];
}

interface DomainScore {
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  metrics: any[];
}

const getScoreLevel = (score: number) => {
  if (score >= 90) return { label: 'Exceptional', color: 'text-green-400', bg: 'bg-green-400/20' };
  if (score >= 70) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-400/20' };
  if (score >= 50) return { label: 'Needs Improvement', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
  return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-400/20' };
};

export default function StaffPerformanceCompass() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [criticalPath, setCriticalPath] = useState<CriticalPathData | null>(null);
  const [competencyTask, setCompetencyTask] = useState('wo');
  const [competencyRecs, setCompetencyRecs] = useState<CompetencyRecommendation[]>([]);
  const [competencyLoading, setCompetencyLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('nexum_access_token');
        const response = await fetch(
          'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/staff-performance',
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        setEmployees(data.employees || []);
        setSummary(data.summary || {});
      } catch (error) {
        console.error('Failed to load staff performance:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchWI = async () => {
      try {
        const cp = await getCriticalPath();
        setCriticalPath(cp as CriticalPathData);
      } catch {
        // non-critical
      }
    };

    fetchData();
    fetchWI();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <NexumLoader message="Loading staff performance data..." />
      </MainLayout>
    );
  }

  const TrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // If employee selected, show detail view
  if (selectedEmployee) {
    return (
      <MainLayout>
        <ParticleBackground />
        <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
          {/* Back button */}
          <Button 
            variant="outline" 
            onClick={() => setSelectedEmployee(null)}
            className="mb-4"
          >
            ← Back to Team Overview
          </Button>

          {/* Employee Detail Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{selectedEmployee.name}</h1>
              <p className="text-muted-foreground">
                {selectedEmployee.role} · {selectedEmployee.department}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {TrendIcon(selectedEmployee.scoreTrend)}
              <span className="text-sm text-muted-foreground">
                {selectedEmployee.scoreTrend === 'up' && 'Improving'}
                {selectedEmployee.scoreTrend === 'down' && 'Declining'}
                {selectedEmployee.scoreTrend === 'stable' && 'Stable'}
              </span>
            </div>
          </div>

          {/* Overall Score */}
          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">
                  {selectedEmployee.overallScore}
                </div>
                <Badge className={getScoreLevel(selectedEmployee.overallScore).bg}>
                  {getScoreLevel(selectedEmployee.overallScore).label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Domain Scores */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(selectedEmployee.domains).map(([key, domain]) => (
              <Card key={key} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{domain.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{domain.score}</div>
                    {TrendIcon(domain.trend)}
                  </div>
                  <div className="mt-4 space-y-2">
                    {domain.metrics.slice(0, 2).map((metric: any, idx: number) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{metric.label}</span>
                          <span className="font-medium">{metric.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Strengths & Risks */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Award className="w-5 h-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEmployee.strengths.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No strengths identified yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee.strengths.map((strength: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-green-500/10">
                        <p className="font-medium text-sm">{strength.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{strength.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risks */}
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Areas for Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEmployee.risks.length === 0 ? (
                  <p className="text-sm text-green-400">No risks identified - excellent performance!</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee.risks.map((risk: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-red-500/10">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{risk.title}</p>
                          <Badge variant={risk.severity === 'high' ? 'destructive' : 'outline'}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coaching Prompts */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Coaching Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedEmployee.coachingPrompts.map((prompt: any) => (
                  <div key={prompt.id} className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium">{prompt.message}</p>
                      <Badge variant={prompt.priority === 'high' ? 'destructive' : 'outline'}>
                        {prompt.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{prompt.actionable}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Team overview (default view)
  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      
      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Staff Performance Compass
          </h1>
          <p className="text-muted-foreground mt-1">
            Organizational Virtue Performance Index (OVPI) - Team Overview
          </p>
        </div>

        {/* Team Decision Quality — DC + Scope Alignment, auto role+tier gated */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ScopeAlignmentPanel limit={10} />
          <DCIntelligencePanel limit={4} />
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.total}</div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avgScore}</div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-400">Exceptional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">{summary.exceptional}</div>
              </CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400">At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">{summary.atRisk}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee List */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees.map((employee) => {
                const scoreInfo = getScoreLevel(employee.overallScore);
                return (
                  <div
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-2xl font-bold">{employee.overallScore}</div>
                        <Badge className={cn('text-xs', scoreInfo.bg)}>
                          {scoreInfo.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.role} · {employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {TrendIcon(employee.scoreTrend)}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Work Integrity Summary Panel */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-primary" />
                Work Integrity Summary
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-primary"
                onClick={() => navigate('/work-integrity')}
              >
                View Work Integrity <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-sm text-muted-foreground">Overdue:</span>
                <span className="font-bold text-red-400">{criticalPath?.overdueCount ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-muted-foreground">At Risk:</span>
                <span className="font-bold text-amber-400">{criticalPath?.atRiskCount ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Completed This Week:</span>
                <span className="font-bold text-green-400">{criticalPath?.completedThisWeek ?? '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimal Assignment Panel */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-primary" />
              Optimal Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={competencyTask}
                onChange={e => setCompetencyTask(e.target.value)}
              >
                {['wo','pm','report','check','compliance','inspection'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={async () => {
                  setCompetencyLoading(true);
                  try {
                    const res = await getCompetencyMatch(competencyTask);
                    setCompetencyRecs((res as any).recommendations || []);
                  } catch {
                    setCompetencyRecs([]);
                  } finally {
                    setCompetencyLoading(false);
                  }
                }}
                disabled={competencyLoading}
                className="gap-1 shrink-0"
              >
                {competencyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Match
              </Button>
            </div>
            {competencyRecs.length > 0 && (
              <div className="space-y-2">
                {competencyRecs.map((r, i) => (
                  <div key={r.employeeId} className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.employeeName}</span>
                        {i === 0 && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Best Match</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reasoning}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">Reliability: <span className="text-foreground">{r.reliability}%</span></span>
                        <span className="text-[10px] text-muted-foreground">Completion: <span className="text-foreground">{r.completionRate}%</span></span>
                        <span className="text-[10px] text-muted-foreground">Active tasks: <span className="text-foreground">{r.currentWorkload}</span></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-bold ${r.competencyScore >= 80 ? 'text-green-400' : r.competencyScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.competencyScore}
                      </div>
                      <div className="text-[10px] text-muted-foreground">score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
