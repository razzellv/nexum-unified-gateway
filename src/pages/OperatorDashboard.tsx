import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gauge, Activity, CheckCircle, Clock, BarChart3, Trophy, Target, RefreshCw, Flame, Snowflake, Wind, Droplets, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const getGreeting = (user: any) => {
  const name = user?.name || user?.email?.split('@')[0] || 'there';
  const parts = name.split(' ');
  const first = parts[0];
  const lastInitial = parts[1]?.[0] ? `${parts[1][0]}.` : '';
  const empId = `EMP-${(user?.sub || '').slice(-6).toUpperCase()}`;
  return { displayName: `${first} ${lastInitial}`.trim(), empId };
};

const SimpleBarChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-32 text-muted-foreground"><p className="text-sm">No logging activity for the last 7 days</p></div>;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div className={cn("w-full rounded-t transition-all duration-300", item.count > 0 ? "bg-gradient-to-t from-green-500 to-green-500/50" : "bg-muted/20")}
              style={{ height: `${item.count > 0 ? (item.count / maxCount) * 100 : 10}%`, minHeight: '4px' }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-green-500">{item.count}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const EquipmentCoverage = () => {
  const equipment = [
    { type: 'Boilers', count: 12, icon: Flame, color: 'text-orange-500' },
    { type: 'Chillers', count: 8, icon: Snowflake, color: 'text-blue-500' },
    { type: 'AHUs', count: 15, icon: Wind, color: 'text-cyan-500' },
    { type: 'Pumps', count: 10, icon: Droplets, color: 'text-green-500' },
  ];
  const total = equipment.reduce((sum, e) => sum + e.count, 0);
  return (
    <div className="space-y-3">
      {equipment.map((item) => {
        const Icon = item.icon;
        const percentage = (item.count / total) * 100;
        return (
          <div key={item.type} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><Icon className={cn("w-4 h-4", item.color)} /><span>{item.type}</span></div>
              <span className="font-semibold">{item.count} logged</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full", item.color.replace('text-', 'bg-'))} style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function OperatorDashboard() {
  const { user } = useAuth();
  const { displayName, empId } = getGreeting(user);
  const logsThisWeek = 24;
  const complianceScore = 94;
  const equipmentChecked = 45;
  const shiftHoursRemaining = 6.5;
  const activityData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count: Math.floor(Math.random() * 8) + 3
  }));

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <Gauge className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hello, {displayName}</p>
              <h1 className="text-3xl font-bold">Operator Portal</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">{empId}</Badge>
                <Badge variant="outline">Operations Department</Badge>
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Day Shift</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="mb-4"><div className="inline-flex p-4 rounded-full bg-green-500/20 mb-4"><Trophy className="w-12 h-12 text-green-500" /></div></div>
              <h3 className="text-2xl font-bold mb-2">Compliance Score</h3>
              <p className="text-5xl font-bold text-green-500">{complianceScore}%</p>
              <p className="text-muted-foreground mt-2">All systems monitored</p>
            </CardContent>
          </Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Current Shift</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Logs Submitted</span><span className="text-2xl font-bold">{logsThisWeek}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Equipment Checked</span><span className="text-2xl font-bold text-green-500">{equipmentChecked}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Time Remaining</span><span className="text-2xl font-bold text-yellow-500">{shiftHoursRemaining}h</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Alerts</span><span className="text-2xl font-bold text-orange-500">2</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Logs This Week</p><p className="text-2xl font-bold text-green-500">{logsThisWeek}</p></div><ClipboardList className="w-8 h-8 text-green-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Log Time</p><p className="text-2xl font-bold text-blue-500">3.2m</p></div><Clock className="w-8 h-8 text-blue-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Equipment Types</p><p className="text-2xl font-bold text-orange-500">8</p></div><Target className="w-8 h-8 text-orange-500 opacity-50" /></div></CardContent></Card>
          <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Accuracy Rate</p><p className="text-2xl font-bold text-purple-500">98%</p></div><CheckCircle className="w-8 h-8 text-purple-500 opacity-50" /></div></CardContent></Card>
        </div>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-green-500" />Logging Activity (Last 7 Days)</CardTitle></CardHeader>
          <CardContent><SimpleBarChart data={activityData} /></CardContent>
        </Card>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-green-500" />Equipment Coverage This Week</CardTitle></CardHeader>
          <CardContent><EquipmentCoverage /></CardContent>
        </Card>

        <Card className="glass-panel neon-border bg-card/30 backdrop-blur-xl border-primary/20">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button onClick={() => window.location.href = '/data-source'}><Activity className="w-4 h-4 mr-2" />Log Equipment Reading</Button>
            <Button variant="outline" onClick={() => window.location.href = '/compliance-logger'}>Compliance Checks</Button>
            <Button variant="outline" onClick={() => window.location.href = '/messages'}>My Messages</Button>
            <Button variant="outline" onClick={() => window.location.href = '/observations'}>Observation Journal</Button>
            <Button variant="outline" onClick={() => window.location.href = '/violations'}>Report Violation</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
