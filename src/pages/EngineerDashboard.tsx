import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, 
  TrendingUp, 
  CheckCircle,
  Clock,
  BarChart3,
  Trophy,
  Target,
  RefreshCw,
  Lightbulb,
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple bar chart
const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No project activity for the last 7 days</p>
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
                  ? "bg-gradient-to-t from-purple-500 to-purple-500/50" 
                  : "bg-muted/20"
              )}
              style={{ 
                height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`,
                minHeight: '4px'
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-purple-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Project status
const ProjectProgress = () => {
  const projects = [
    { name: 'Boiler Efficiency Analysis', progress: 85, status: 'In Progress' },
    { name: 'Chiller Optimization', progress: 60, status: 'In Progress' },
    { name: 'Energy Audit Report', progress: 100, status: 'Completed' },
    { name: 'HVAC System Upgrade', progress: 30, status: 'Planning' },
  ];

  return (
    <div className="space-y-4">
      {projects.map((project, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{project.name}</span>
            <Badge variant={project.status === 'Completed' ? 'outline' : 'default'}>
              {project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={project.progress} className="flex-1" />
            <span className="text-sm font-semibold text-muted-foreground">{project.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function EngineerDashboard() {
  const { user } = useAuth();

  // Mock data
  const activeProjects = 3;
  const completedProjects = 12;
  const recommendations = 8;
  const efficiencyGain = 14.5;

  const activityData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count: Math.floor(Math.random() * 4) + 1
  }));

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Cpu className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Engineer Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{user?.name || 'Engineer'}</Badge>
                <Badge variant="outline">Engineering Department</Badge>
                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Technical Lead</Badge>
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
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="border-purple-500/20">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="inline-flex p-4 rounded-full bg-purple-500/20 mb-4">
                  <Trophy className="w-12 h-12 text-purple-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">System Efficiency Impact</h3>
              <p className="text-5xl font-bold text-purple-500">+{efficiencyGain}%</p>
              <p className="text-muted-foreground mt-2">Facility-wide improvement</p>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="border-purple-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Project Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Projects</span>
                  <span className="text-2xl font-bold">{activeProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold text-green-500">{completedProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recommendations</span>
                  <span className="text-2xl font-bold text-yellow-500">{recommendations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Technical Reviews</span>
                  <span className="text-2xl font-bold text-blue-500">5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projects This Month</p>
                  <p className="text-2xl font-bold text-purple-500">{activeProjects}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Project Time</p>
                  <p className="text-2xl font-bold text-blue-500">12d</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Systems Analyzed</p>
                  <p className="text-2xl font-bold text-orange-500">23</p>
                </div>
                <Target className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Implementation Rate</p>
                  <p className="text-2xl font-bold text-green-500">87%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Project Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={activityData} />
          </CardContent>
        </Card>

        {/* Project Progress */}
        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Active Engineering Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectProgress />
          </CardContent>
        </Card>

        {/* Recent Recommendations */}
        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Recent Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Optimize Boiler #3 Combustion</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-500">Pending</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analysis shows 8% efficiency gain possible with air-fuel ratio adjustment
                </p>
                <p className="text-xs text-muted-foreground mt-2">Submitted 2 days ago</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Chiller Condenser Cleaning Schedule</h3>
                  <Badge className="bg-green-500/20 text-green-500">Approved</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Quarterly cleaning regimen will improve heat transfer by 12%
                </p>
                <p className="text-xs text-muted-foreground mt-2">Approved 1 week ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20" className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/facility-data-source'}>
              <Activity className="w-4 h-4 mr-2" />
              View System Data
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>
              Technical Compliance
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
