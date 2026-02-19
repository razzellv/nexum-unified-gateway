import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Wrench, 
  ClipboardList, 
  CheckCircle,
  Activity,
  TrendingUp,
  Award,
  Clock,
  BarChart3,
  Trophy,
  Target,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple bar chart
const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No activity data for the last 7 days</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div 
              className={cn(
                "w-full rounded-t transition-all duration-300",
                item.count > 0 
                  ? "bg-gradient-to-t from-blue-500 to-blue-500/50" 
                  : "bg-muted/20"
              )}
              style={{ 
                height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`,
                minHeight: '4px'
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-blue-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function TechDashboard() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const myOrders = (data.workOrders || []).filter((wo: any) => 
          wo.assignedTo === user?.sub || wo.createdBy === user?.sub
        );
        setWorkOrders(myOrders);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');
  const openOrders = workOrders.filter(wo => wo.status === 'open');
  const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress');
  const completionRate = workOrders.length > 0 ? Math.round((completedOrders.length / workOrders.length) * 100) : 0;

  // Mock activity data (last 7 days)
  const activityData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count: Math.floor(Math.random() * 5) + 1
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Wrench className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Technician Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{user?.name || 'Technician'}</Badge>
                <Badge variant="outline">Maintenance Department</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Performance Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-blue-500/20">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="inline-flex p-4 rounded-full bg-blue-500/20 mb-4">
                  <Trophy className="w-12 h-12 text-blue-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Performance Score</h3>
              <p className="text-5xl font-bold text-blue-500">{completionRate}%</p>
              <p className="text-muted-foreground mt-2">Completion Rate</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Work Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Assigned</span>
                  <span className="text-2xl font-bold">{workOrders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold text-green-500">{completedOrders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <span className="text-2xl font-bold text-yellow-500">{inProgressOrders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Open</span>
                  <span className="text-2xl font-bold text-blue-500">{openOrders.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks This Week</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {workOrders.filter(wo => 
                      new Date(wo.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold text-green-500">2.5h</p>
                </div>
                <Clock className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Equipment Types</p>
                  <p className="text-2xl font-bold text-orange-500">8</p>
                </div>
                <Target className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-2xl font-bold text-purple-500">95%</p>
                </div>
                <Award className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Activity Timeline (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={activityData} />
          </CardContent>
        </Card>

        {/* My Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">No work orders assigned - great job!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.map((wo: any) => (
                  <div
                    key={wo.workOrderId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{wo.title || 'Work Order'}</h3>
                        <Badge variant={wo.status === 'open' ? 'default' : wo.status === 'completed' ? 'outline' : 'secondary'}>
                          {wo.status}
                        </Badge>
                        <Badge variant="outline">{wo.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{wo.description || wo.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(wo.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/facility-data-source'}>
              <Activity className="w-4 h-4 mr-2" />
              Log Equipment Data
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>
              Compliance Logger
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/messages'}>
              My Messages
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
