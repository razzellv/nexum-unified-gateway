import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TechDashboard() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyWorkOrders();
  }, []);

  const fetchMyWorkOrders = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter to only work orders assigned to this user
        const myOrders = (data.workOrders || []).filter((wo: any) => 
          wo.assignedTo === user?.sub || wo.createdBy === user?.sub
        );
        setWorkOrders(myOrders);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openOrders = workOrders.filter((wo: any) => wo.status === 'open');
  const inProgressOrders = workOrders.filter((wo: any) => wo.status === 'in_progress');
  const completedToday = workOrders.filter((wo: any) => 
    wo.status === 'completed' && 
    new Date(wo.updatedAt).toDateString() === new Date().toDateString()
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Technician Portal</h1>
            <p className="text-muted-foreground">Your assigned work orders and tasks</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{completedToday.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* My Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : workOrders.length === 0 ? (
              <p className="text-muted-foreground">No work orders assigned</p>
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
                        <Badge variant={wo.status === 'open' ? 'default' : 'secondary'}>
                          {wo.status}
                        </Badge>
                        <Badge variant="outline">{wo.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{wo.description}</p>
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
