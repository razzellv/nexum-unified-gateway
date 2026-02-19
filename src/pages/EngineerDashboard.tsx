import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cpu, 
  ClipboardList, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

export default function EngineerDashboard() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <Cpu className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Engineer Portal</h1>
            <p className="text-muted-foreground">System analysis and technical oversight</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground mt-1">Active assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Technical Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">92%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
            </CardContent>
          </Card>
        </div>

        {/* My Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Active Engineering Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Boiler Efficiency Upgrade</h3>
                  <Badge>In Progress</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Analyzing combustion efficiency and recommending improvements</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Chiller System Analysis</h3>
                  <Badge variant="outline">Planning</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Evaluating refrigerant system performance</p>
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
              <BarChart3 className="w-4 h-4 mr-2" />
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
