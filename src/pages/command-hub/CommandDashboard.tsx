import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SignalsPanel } from '@/components/dashboard/SignalsPanel';
import { SystemHealthChart } from '@/components/dashboard/SystemHealthChart';
import { WorkloadChart } from '@/components/dashboard/WorkloadChart';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { dashboardMetrics, mockEmergencies } from '@/data/mockData';
import { EmergencyCard } from '@/components/emergency/EmergencyCard';
import { AlertTriangle } from 'lucide-react';

const Index = () => {
  const activeEmergencies = mockEmergencies.filter(e => e.status !== 'resolved');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Command Dashboard</h1>
            <p className="text-muted-foreground">Facility Command Center Overview</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="status-dot status-dot-success" />
            Connected to Facility Intelligence™
          </div>
        </div>

        {/* Active Emergencies Banner */}
        {activeEmergencies.length > 0 && (
          <div className="bg-critical/10 border border-critical/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-critical" />
              <div>
                <p className="font-semibold text-critical">
                  {activeEmergencies.length} Active Emergency{activeEmergencies.length > 1 ? 'ies' : ''}
                </p>
                <p className="text-sm text-critical/80">
                  {activeEmergencies[0].title}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {dashboardMetrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} delay={index * 50} />
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Signals */}
          <div className="lg:col-span-1">
            <SignalsPanel />
          </div>

          {/* Center Column - Tasks & Health */}
          <div className="lg:col-span-2 space-y-6">
            <RecentTasks />
            <div className="grid md:grid-cols-2 gap-6">
              <SystemHealthChart />
              <WorkloadChart />
            </div>
          </div>
        </div>

        {/* Active Emergency Details */}
        {activeEmergencies.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Emergencies</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {activeEmergencies.map((emergency) => (
                <EmergencyCard key={emergency.id} emergency={emergency} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
