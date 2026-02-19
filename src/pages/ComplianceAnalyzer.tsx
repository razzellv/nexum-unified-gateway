import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Activity,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function ComplianceAnalyzer() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const runAnalysis = async () => {
    if (!user?.facilityId) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/compliance-analyzer?days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexum_access_token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Compliance analysis data:', data);
        setAnalysisData(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Analysis failed:', response.status, errorText);
        setError(`Analysis failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setError(`Network error: ${error.message || 'Unable to connect to analysis service'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [days, user?.facilityId]);

  const severityData = analysisData?.summary ? [
    { name: 'Critical', value: analysisData.summary.critical, color: '#ef4444' },
    { name: 'High', value: analysisData.summary.high, color: '#f97316' },
    { name: 'Medium', value: analysisData.summary.medium, color: '#eab308' },
    { name: 'Low', value: analysisData.summary.low, color: '#22c55e' },
  ] : [];

  const employeeData = analysisData?.employeeScores?.map((emp: any) => ({
    name: `Emp ${String(emp.operatorId || emp.employeeId || 'Unknown').slice(-4)}`,
    score: emp.virtuousScore,
    violations: emp.violationCount
  })) || [];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary" />
              Compliance Analyzer
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered violation detection and compliance scoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            
            <Button onClick={runAnalysis} disabled={isAnalyzing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Analysis Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isAnalyzing && !analysisData && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing compliance data...</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {analysisData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Compliance Score</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                      {analysisData.complianceScore}%
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Logs Analyzed</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {analysisData.logsAnalyzed}
                    </p>
                  </div>
                  <Activity className="w-10 h-10 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Violations Found</p>
                    <p className="text-2xl font-bold text-warning mt-1">
                      {analysisData.violationsFound}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-warning/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">At-Risk Staff</p>
                    <p className="text-2xl font-bold text-critical mt-1">
                      {analysisData.employeeScores?.filter((e: any) => e.riskScore > 50).length || 0}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-critical/20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        {analysisData && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employees">Employee Scores</TabsTrigger>
              <TabsTrigger value="violations">Violation Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
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
                            (analysisData?.violations || []).reduce((acc: any, v: any) => {
                              const type = v.violationType || 'Unknown';
                              if (!acc[type]) {
                                acc[type] = { count: 0, totalSeverity: 0 };
                              }
                              acc[type].count += 1;
                              acc[type].totalSeverity += (v.severity || 50);
                              return acc;
                            }, {})
                          )
                          .sort((a: any, b: any) => b[1].count - a[1].count)
                          .map(([type, data]: [string, any], i: number) => {
                            const avgSeverity = Math.round(data.totalSeverity / data.count);
                            return (
                              <tr 
                                key={i}
                                className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className={cn(
                                      "w-4 h-4",
                                      avgSeverity >= 80 ? "text-red-500" :
                                      avgSeverity >= 60 ? "text-orange-500" :
                                      avgSeverity >= 40 ? "text-yellow-500" :
                                      "text-green-500"
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
                                    "px-3 py-1 rounded-full font-semibold text-sm",
                                    avgSeverity >= 80 ? "bg-red-500/20 text-red-400" :
                                    avgSeverity >= 60 ? "bg-orange-500/20 text-orange-400" :
                                    avgSeverity >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-green-500/20 text-green-400"
                                  )}>
                                    {avgSeverity}%
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <span className="font-bold text-lg">
                                    {data.totalSeverity}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Employee Scores */}
                <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Performance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={employeeData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.1}/>
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
                        <Bar dataKey="score" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="employees">
              <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
                <CardHeader>
                  <CardTitle>Employee Accountability & Performance</CardTitle>
                </CardHeader>
                <CardContent>
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
                        {analysisData.employeeScores?.map((emp: any, i: number) => (
                          <tr 
                            key={i}
                            className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                          >
                            <td className="p-3">
                              <span className="font-mono text-sm font-medium">
                                {String(emp.operatorId).slice(-8)}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium">
                              {emp.logsSubmitted || 0}
                            </td>
                            <td className="p-3 text-right">
                              <span className={cn(
                                "px-2 py-1 rounded font-semibold text-sm",
                                (emp.violationCount || 0) === 0 ? "text-green-400" :
                                (emp.violationCount || 0) <= 2 ? "text-yellow-400" :
                                "text-red-400"
                              )}>
                                {emp.violationCount || 0}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-semibold",
                                (emp.avgSeverity || 0) < 30 ? "bg-green-500/20 text-green-400" :
                                (emp.avgSeverity || 0) < 60 ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              )}>
                                {emp.avgSeverity || 0}%
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-primary font-bold text-lg">
                                {emp.virtuousScore || 100}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={cn(
                                "font-semibold",
                                (emp.riskScore || 0) < 30 ? "text-green-400" :
                                (emp.riskScore || 0) < 60 ? "text-yellow-400" :
                                "text-red-400"
                              )}>
                                {emp.riskScore || 0}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-green-400 font-semibold">
                                {emp.complianceRate || 100}%
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={
                                  emp.cumulativeLevel === "Excellent" ? "default" :
                                  emp.cumulativeLevel === "Good" ? "secondary" :
                                  "outline"
                                }
                                className={cn(
                                  emp.cumulativeLevel === "Excellent" && "bg-green-500/20 text-green-400 border-green-500/30",
                                  emp.cumulativeLevel === "Good" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                  emp.cumulativeLevel === "Fair" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                                  emp.cumulativeLevel === "Needs Improvement" && "bg-red-500/20 text-red-400 border-red-500/30"
                                )}
                              >
                                {emp.cumulativeLevel || "Good"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="violations">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Detected Violations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisData.violations?.map((v: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 ${
                              v.severity >= 90 ? 'text-critical' :
                              v.severity >= 70 ? 'text-warning' :
                              v.severity >= 40 ? 'text-yellow-500' : 'text-green-500'
                            }`} />
                            <span className="font-medium">{v.violationType}</span>
                          </div>
                          <Badge>{v.severity}% severity</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{v.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{v.equipmentId}</span>
                          <span>•</span>
                          <span>{new Date(v.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!analysisData && !isAnalyzing && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-12 text-center">
              <ShieldCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Click "Run Analysis" to analyze facility logs</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
