import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Gauge, 
  ClipboardList, 
  AlertCircle, 
  CheckCircle,
  Activity,
  Clock
} from 'lucide-react';

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [logs, setLogs] = useState([]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <Gauge className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Operator Portal</h1>
            <p className="text-muted-foreground">Equipment monitoring and logging</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Shift Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Active</div>
              <p className="text-xs text-muted-foreground mt-1">6h 23m remaining</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Logs Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground mt-1">Assigned systems</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">2</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/facility-data-source'}>
              <Activity className="w-4 h-4 mr-2" />
              Log Equipment Reading
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Compliance Checks
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/messages'}>
              My Messages
            </Button>
          </CardContent>
        </Card>

        {/* My Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Equipment list will appear here</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
