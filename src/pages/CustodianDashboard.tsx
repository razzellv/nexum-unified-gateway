import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  CheckCircle,
  Clock,
  BarChart3,
  Trophy,
  MapPin,
  RefreshCw,
  ClipboardList,
  Target,
  Award,
  Shield
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
                  ? "bg-gradient-to-t from-orange-500 to-orange-500/50" 
                  : "bg-muted/20"
              )}
              style={{ 
                height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`,
                minHeight: '4px'
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-orange-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Area coverage
const AreaCoverage = () => {
  const areas = [
    { name: 'Building A - Floors 1-3', tasks: 12, completed: 10 },
    { name: 'Building A - Floors 4-6', tasks: 8, completed: 8 },
    { name: 'Mechanical Rooms', tasks: 5, completed: 4 },
    { name: 'Common Areas', tasks: 15, completed: 12 },
  ];

  return (
    <div className="space-y-4">
      {areas.map((area, i) => {
        const percentage = (area.completed / area.tasks) * 100;
        
        return (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">{area.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {area.completed}/{area.tasks} tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={percentage} className="flex-1" />
              <span className="text-sm font-semibold text-orange-500">{Math.round(percentage)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function CustodianDashboard() {
  const { user } = useAuth();

  // Mock data
  const tasksToday = 12;
  const tasksCompleted = 8;
  const areasAssigned = 6;
  const cleanlinessScore = 96;

  const activityData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count: Math.floor(Math.random() * 6) + 4
  }));

  const completionRate = Math.round((tasksCompleted / tasksToday) * 100);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <Sparkles className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Custodian Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{user?.name || 'Custodian'}</Badge>
                <Badge variant="outline">Facilities Department</Badge>
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Day Shift</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Performance Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-orange-500/20">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="inline-flex p-4 rounded-full bg-orange-500/20 mb-4">
                  <Trophy className="w-12 h-12 text-orange-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Cleanliness Score</h3>
              <p className="text-5xl font-bold text-orange-500">{cleanlinessScore}%</p>
              <p className="text-muted-foreground mt-2">Facility-wide rating</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Today's Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tasks Assigned</span>
                  <span className="text-2xl font-bold">{tasksToday}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold text-green-500">{tasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-2xl font-bold text-yellow-500">{tasksToday - tasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="text-2xl font-bold text-orange-500">{completionRate}%</span>
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
                  <p className="text-2xl font-bold text-orange-500">52</p>
                </div>
                <ClipboardList className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Task Time</p>
                  <p className="text-2xl font-bold text-blue-500">18m</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Areas Assigned</p>
                  <p className="text-2xl font-bold text-green-500">{areasAssigned}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Rating</p>
                  <p className="text-2xl font-bold text-purple-500">4.9/5</p>
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
              <BarChart3 className="w-5 h-5 text-orange-500" />
              Task Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={activityData} />
          </CardContent>
        </Card>

        {/* Area Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Area Coverage Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaCoverage />
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Building A - Floor 1 Restrooms</p>
                    <p className="text-xs text-muted-foreground">Completed 2 hours ago</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-500">Done</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Common Area Vacuuming</p>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </div>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-500">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Mechanical Room Cleaning</p>
                    <p className="text-xs text-muted-foreground">Scheduled for 2:00 PM</p>
                  </div>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/facility-data-source'}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Log Maintenance
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>
              <Shield className="w-4 h-4 mr-2" />
              Safety Checks
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
