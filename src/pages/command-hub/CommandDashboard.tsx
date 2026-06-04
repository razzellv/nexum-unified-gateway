import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/command-hub/dashboard/MetricCard';
import { SignalsPanel } from '@/components/command-hub/dashboard/SignalsPanel';
import { SystemHealthChart } from '@/components/command-hub/dashboard/SystemHealthChart';
import { WorkloadChart } from '@/components/command-hub/dashboard/WorkloadChart';
import { RecentTasks } from '@/components/command-hub/dashboard/RecentTasks';
import { EmergencyCard } from '@/components/command-hub/emergency/EmergencyCard';
import { AlertTriangle, RefreshCw, MessageSquare, Send, Hash, Lightbulb, CheckCheck, XCircle, Star, ArrowUpRight, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { listSuggestions, dismissSuggestion, actOnSuggestion, type Suggestion, getCostSummary, type CostSummary } from '@/lib/nexum-api';
import { cn } from '@/lib/utils';

const CommandDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([
    { label: 'Active Tasks', value: '--', change: 0, trend: 'stable', status: 'warning' },
    { label: 'Critical Issues', value: '--', change: 0, trend: 'stable', status: 'critical' },
    { label: 'Vendor Response', value: '4.6h', trend: 'stable', status: 'success' },
    { label: 'System Health', value: '--', change: 0, trend: 'stable', status: 'success' },
    { label: 'Open Emergencies', value: '--', trend: 'stable', status: 'warning' },
    { label: 'Compliance Score', value: '--', change: 0, trend: 'stable', status: 'success' }
  ]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: 'Bearer ' + token };

      const res = await fetch(baseUrl + '/dashboard/executive', { headers });
      if (res.ok) {
        const data = await res.json();

        setMetrics([
          { 
            label: 'Active Tasks', 
            value: data.operations?.work_orders_open || 0, 
            change: 0, trend: 'stable', 
            status: data.operations?.work_orders_open > 5 ? 'warning' : 'success' 
          },
          { 
            label: 'Critical Issues', 
            value: data.compliance?.high_severity_violations || 0, 
            change: 0, trend: 'stable', 
            status: data.compliance?.high_severity_violations > 0 ? 'critical' : 'success' 
          },
          { 
            label: 'Avg Response', 
            value: (data.operations?.average_response_time_hours || 4.5) + 'h', 
            trend: 'stable', status: 'success' 
          },
          { 
            label: 'System Health', 
            value: (data.kpis?.uptime_percentage || 95.5) + '%', 
            change: 0, trend: 'stable', 
            status: 'success' 
          },
          { 
            label: 'Open Violations', 
            value: data.compliance?.open_violations || 0, 
            trend: 'stable', 
            status: data.compliance?.open_violations > 0 ? 'warning' : 'success' 
          },
          { 
            label: 'Compliance Score', 
            value: (data.compliance?.score || 100) + '%', 
            change: 0, trend: 'stable', 
            status: data.compliance?.score >= 80 ? 'success' : 'warning' 
          }
        ]);

        setViolations(data.compliance?.recent_violations || []);
        setLastUpdated(new Date());

        getCostSummary().then(s => {
          setCostSummary(s);
          setMetrics(prev => [
            ...prev,
            { label: 'Monthly Spend', value: `$${((s.totalCostThisMonth || 0) / 1000).toFixed(1)}k`, trend: 'stable', status: 'success' },
            { label: 'YTD Cost', value: `$${((s.totalCostYTD || 0) / 1000).toFixed(1)}k`, trend: 'stable', status: 'success' },
          ]);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Command Hub fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const data = await listSuggestions('active');
      setSuggestions(data.items || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadSuggestions();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const highSeverityViolations = violations.filter(v => v.severity >= 80);
  const highSuggestions = suggestions.filter(s => s.priority === 'high');
  const suggPriorityColor: Record<string, string> = {
    high:   'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low:    'bg-slate-500/20 text-slate-400',
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Command Dashboard</h1>
            <p className="text-muted-foreground">Facility Command Center Overview</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button onClick={fetchData} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="status-dot status-dot-success" />
              Connected to Facility Intelligence
            </div>
          </div>
        </div>

        {/* Critical Violations Banner */}
        {highSeverityViolations.length > 0 && (
          <div className="glass-panel neon-border border-critical/30 rounded-lg p-4 bg-critical/5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-critical" />
              <div>
                <p className="font-semibold text-critical">
                  {highSeverityViolations.length} Critical Violation{highSeverityViolations.length > 1 ? 's' : ''} Requiring Attention
                </p>
                <p className="text-sm text-critical/80">
                  {highSeverityViolations[0]?.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} delay={index * 50} />
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SignalsPanel />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <RecentTasks />
            <div className="grid md:grid-cols-2 gap-6">
              <SystemHealthChart />
              <WorkloadChart />
            </div>
          </div>
        </div>

        {/* Messages Quick Card */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 border border-border/30 rounded-xl bg-card/50 p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate('/messages')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Team Messages</span>
              </div>
              <span className="text-xs text-primary hover:underline">Open →</span>
            </div>
            <div className="space-y-1">
              {[{ch: 'All Activity', msg: 'Click to view team messages and channels', time: 'now'}, {ch: 'Emergency Response', msg: 'Emergency channel — monitored 24/7', time: ''}, {ch: 'Maintenance Team', msg: 'Work orders and equipment coordination', time: ''}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                  <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground">{item.ch}</span>
                  <span className="text-xs text-muted-foreground/60 flex-1 truncate">— {item.msg}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/10 border border-border/20">
              <Send className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to open full messaging hub...</span>
            </div>
          </div>
          <div className="border border-border/30 rounded-xl bg-card/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Quick Links</span>
            </div>
            <div className="space-y-2">
              {[{label: 'Messages', path: '/messages', icon: MessageSquare}, {label: 'Work Orders', path: '/work-orders', icon: AlertTriangle}, {label: 'Emergency', path: '/emergency', icon: AlertTriangle}].map(({label, path, icon: Icon}) => (
                <button key={path} onClick={() => navigate(path)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all text-left">
                  <Icon className="w-4 h-4 shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Violations as Emergencies */}
        {violations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Violations</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {violations.slice(0, 4).map((v, i) => (
                <div key={i} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{v.type?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Operator: {v.operator} | Equipment: {v.equipment}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                      v.severity >= 80 ? 'bg-red-500/20 text-red-400' :
                      v.severity >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {v.severity >= 80 ? 'Critical' : v.severity >= 50 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(v.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Risk & Operations Suggestions ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Smart Suggestions</h2>
              {highSuggestions.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                  {highSuggestions.length} high priority
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSuggestions}
                className="text-muted-foreground hover:text-foreground"
                title="Refresh suggestions"
              >
                <RefreshCw className={cn('w-4 h-4', suggestionsLoading && 'animate-spin')} />
              </button>
              <button
                onClick={() => navigate('/suggestions')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {suggestionsLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1,2].map(i => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-lg" />)}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="border border-border/30 rounded-xl bg-card/50 p-6 text-center text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active suggestions. The system will surface insights as operational patterns are detected.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {suggestions.slice(0, 4).map(sug => (
                <div key={sug.id} className={cn(
                  "border rounded-lg p-4 bg-card space-y-2",
                  sug.priority === 'high' ? 'border-red-500/30' : 'border-border'
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", suggPriorityColor[sug.priority])}>
                          {sug.priority}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">{sug.category}</span>
                      </div>
                      <p className="font-medium text-sm leading-snug">{sug.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sug.detail}</p>
                      {sug.suggestedVendorName && (
                        <p className="text-xs text-cyan-400 mt-1.5 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-cyan-400" />
                          Suggested: {sug.suggestedVendorName}
                          {sug.vendorMatchScore !== null && ` · ${sug.vendorMatchScore}% match`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await actOnSuggestion(sug.SK);
                        loadSuggestions();
                      }}
                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 border border-green-500/30 rounded px-2 py-1 hover:bg-green-500/10 transition-colors"
                    >
                      <CheckCheck className="w-3 h-3" /> Act on this
                    </button>
                    <button
                      onClick={async () => {
                        await dismissSuggestion(sug.SK);
                        loadSuggestions();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted/20 rounded px-2 py-1 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
};

export default CommandDashboard;
