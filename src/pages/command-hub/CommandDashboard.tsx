import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/command-hub/dashboard/MetricCard';
import { SignalsPanel } from '@/components/command-hub/dashboard/SignalsPanel';
import { SystemHealthChart } from '@/components/command-hub/dashboard/SystemHealthChart';
import { WorkloadChart } from '@/components/command-hub/dashboard/WorkloadChart';
import { RecentTasks } from '@/components/command-hub/dashboard/RecentTasks';
import { EmergencyCard } from '@/components/command-hub/emergency/EmergencyCard';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const CommandDashboard = () => {
  const { user } = useAuth();
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
      }
    } catch (err) {
      console.error('Command Hub fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const highSeverityViolations = violations.filter(v => v.severity >= 80);

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
      </div>
    </MainLayout>
  );
};

export default CommandDashboard;
