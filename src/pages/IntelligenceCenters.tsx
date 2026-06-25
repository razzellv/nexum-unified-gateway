import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, LayoutDashboard, Gauge, BarChart3, ArrowRight } from 'lucide-react';

const CENTERS = [
  {
    id: 'executive',
    title: 'Executive Intelligence Center™',
    description: 'Facility-wide KPIs, cost summaries, compliance posture, and capital planning. Full operational picture for executives and directors.',
    href: '/dashboard/executive',
    icon: TrendingUp,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
    badge: 'Executive',
    roles: ['executive', 'director', 'admin'],
  },
  {
    id: 'manager',
    title: 'Operations Intelligence Center™',
    description: 'Work order status, team performance, equipment health, cost breakdowns, and system alerts for operations managers.',
    href: '/dashboard/manager',
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    badge: 'Manager',
    roles: ['manager', 'admin'],
  },
  {
    id: 'supervisor',
    title: 'Field Intelligence Center™',
    description: 'Shift-level view: active work orders, open violations, compliance due, equipment coverage, and crew assignments.',
    href: '/dashboard/supervisor',
    icon: Gauge,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    badge: 'Supervisor',
    roles: ['supervisor', 'admin'],
  },
  {
    id: 'facility',
    title: 'Facility Intelligence',
    description: 'Integrated facility performance view — energy, compliance score, equipment status, and maintenance backlog.',
    href: '/facility-intelligence',
    icon: BarChart3,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    badge: 'Facility',
    roles: ['all'],
  },
];

export default function IntelligenceCenters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Centers™</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Role-based dashboards that synthesize operational data into decision-ready intelligence.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CENTERS.map(c => {
            const hasAccess = isAdmin || c.roles.includes('all') || c.roles.includes(role);
            return (
              <Card
                key={c.id}
                className={`border transition-shadow ${c.bg} ${hasAccess ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => hasAccess && navigate(c.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${c.bg}`}>
                      <c.icon className={`w-6 h-6 ${c.color}`} />
                    </div>
                    <Badge className={`text-[10px] ${c.bg.replace('bg-', 'bg-').replace('border', 'border')} ${c.color}`}>{c.badge}</Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!hasAccess}
                    onClick={e => { e.stopPropagation(); if (hasAccess) navigate(c.href); }}
                  >
                    {hasAccess ? <><span>Open</span><ArrowRight className="w-3.5 h-3.5 ml-2" /></> : 'Access Restricted'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
