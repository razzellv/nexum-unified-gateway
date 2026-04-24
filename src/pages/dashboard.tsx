import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  ShieldAlert,
  Zap,
  Calendar,
  Users,
  Thermometer,
  Droplets,
  Flame,
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Wrench,
  BookOpen,
  History,
  LayoutDashboard,
  Eye,
  X,
} from 'lucide-react';

// ── Static mock data ──────────────────────────────────────────────────────────

const KPI_DATA = [
  {
    label: 'Open Work Orders',
    value: 14,
    sub: '3 critical',
    subVariant: 'destructive' as const,
    icon: ClipboardList,
    route: '/work-orders',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    label: 'Active Violations',
    value: 6,
    sub: '2 high severity',
    subVariant: 'destructive' as const,
    icon: ShieldAlert,
    route: '/violations',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  {
    label: 'System Efficiency',
    value: '91%',
    sub: '+2.4% this week',
    subVariant: 'default' as const,
    icon: TrendingUp,
    route: '/equipment-intelligence',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    trend: 'up',
  },
  {
    label: 'Pending Inspections',
    value: 3,
    sub: 'Next: May 2',
    subVariant: 'secondary' as const,
    icon: Calendar,
    route: '/compliance-logger',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    label: 'Staff on Shift',
    value: '18/22',
    sub: '4 off-site',
    subVariant: 'secondary' as const,
    icon: Users,
    route: '/dashboard/employees',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
];

type SystemStatus = 'Operational' | 'Warning' | 'Critical';

interface SystemRow {
  name: string;
  icon: React.ElementType;
  status: SystemStatus;
  lastReading: string;
  metric: string;
}

const SYSTEM_HEALTH: SystemRow[] = [
  { name: 'Boiler', icon: Flame, status: 'Operational', lastReading: '2 min ago', metric: '185 PSI' },
  { name: 'Chiller', icon: Thermometer, status: 'Warning', lastReading: '5 min ago', metric: '44°F — high' },
  { name: 'HVAC Unit 1', icon: Activity, status: 'Operational', lastReading: '1 min ago', metric: '72°F supply' },
  { name: 'Electrical Panel', icon: Zap, status: 'Operational', lastReading: '3 min ago', metric: '480V nominal' },
  { name: 'Plumbing', icon: Droplets, status: 'Critical', lastReading: '8 min ago', metric: 'Pressure drop!' },
  { name: 'Fire Safety', icon: ShieldCheck, status: 'Operational', lastReading: '12 min ago', metric: 'All zones clear' },
];

const statusConfig: Record<SystemStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; dot: string }> = {
  Operational: { variant: 'default', icon: CheckCircle2, dot: 'bg-emerald-400' },
  Warning: { variant: 'secondary', icon: AlertCircle, dot: 'bg-amber-400' },
  Critical: { variant: 'destructive', icon: XCircle, dot: 'bg-red-500' },
};

interface ActivityEntry {
  icon: React.ElementType;
  iconColor: string;
  description: string;
  timeAgo: string;
  initials: string;
  initialsColor: string;
}

const RECENT_ACTIVITY: ActivityEntry[] = [
  {
    icon: ClipboardList,
    iconColor: 'text-blue-400',
    description: 'Work order #WO-2841 created — Boiler pressure valve replacement',
    timeAgo: '4 min ago',
    initials: 'MT',
    initialsColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: ShieldAlert,
    iconColor: 'text-red-400',
    description: 'Violation logged — Plumbing pressure drop below safe threshold',
    timeAgo: '11 min ago',
    initials: 'RJ',
    initialsColor: 'bg-red-500/20 text-red-400',
  },
  {
    icon: Activity,
    iconColor: 'text-primary',
    description: 'Equipment log submitted — Chiller Unit 2 daily reading',
    timeAgo: '18 min ago',
    initials: 'DS',
    initialsColor: 'bg-primary/20 text-primary',
  },
  {
    icon: Calendar,
    iconColor: 'text-amber-400',
    description: 'Inspection scheduled — Fire safety walkthrough May 2, 09:00',
    timeAgo: '42 min ago',
    initials: 'AL',
    initialsColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    icon: ShieldCheck,
    iconColor: 'text-purple-400',
    description: 'Compliance alert — OSHA annual training deadline in 7 days',
    timeAgo: '1 hr ago',
    initials: 'SY',
    initialsColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    description: 'Work order #WO-2836 closed — HVAC filter replacement complete',
    timeAgo: '2 hr ago',
    initials: 'BK',
    initialsColor: 'bg-emerald-500/20 text-emerald-400',
  },
];

interface QuickLaunchTile {
  label: string;
  icon: React.ElementType;
  route: string;
  description: string;
  accent: string;
  bg: string;
}

const QUICK_LAUNCH: QuickLaunchTile[] = [
  {
    label: 'Command Hub',
    icon: LayoutDashboard,
    route: '/command-hub',
    description: 'Central ops control',
    accent: 'text-primary',
    bg: 'bg-primary/10 border-primary/20 hover:border-primary/40',
  },
  {
    label: 'Work Orders',
    icon: ClipboardList,
    route: '/work-orders',
    description: 'Create & track tasks',
    accent: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20 hover:border-blue-400/40',
  },
  {
    label: 'Violations',
    icon: ShieldAlert,
    route: '/violations',
    description: 'Log & review incidents',
    accent: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20 hover:border-red-400/40',
  },
  {
    label: 'Equipment',
    icon: Wrench,
    route: '/equipment',
    description: 'Assets & maintenance',
    accent: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20 hover:border-amber-400/40',
  },
  {
    label: 'Compliance Logger',
    icon: BookOpen,
    route: '/compliance-logger',
    description: 'Log compliance events',
    accent: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20 hover:border-purple-400/40',
  },
  {
    label: 'Equipment Intelligence',
    icon: BarChart3,
    route: '/equipment-intelligence',
    description: 'Analytics & insights',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20 hover:border-emerald-400/40',
  },
  {
    label: 'Historical Data',
    icon: History,
    route: '/historical-data',
    description: 'Trends & archives',
    accent: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/20 hover:border-sky-400/40',
  },
  {
    label: 'Staff Dashboard',
    icon: Users,
    route: '/dashboard/employees',
    description: 'Team & scheduling',
    accent: 'text-pink-400',
    bg: 'bg-pink-400/10 border-pink-400/20 hover:border-pink-400/40',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ item }: { item: typeof KPI_DATA[number] }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.route)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50',
        item.bg,
        item.border,
        'bg-card'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', item.bg, 'border', item.border)}>
          <Icon className={cn('h-5 w-5', item.color)} />
        </div>
        {item.trend === 'up' ? (
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        ) : item.trend === 'down' ? (
          <TrendingDown className="h-4 w-4 text-red-400" />
        ) : null}
      </div>
      <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
      <p className="text-sm text-muted-foreground mt-0.5 mb-2">{item.label}</p>
      <Badge variant={item.subVariant} className="text-xs">
        {item.sub}
      </Badge>
    </button>
  );
}

function SystemHealthRow({ sys }: { sys: SystemRow }) {
  const navigate = useNavigate();
  const Icon = sys.icon;
  const cfg = statusConfig[sys.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="p-2 rounded-lg bg-muted/30 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{sys.name}</span>
          <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', cfg.dot)} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{sys.metric} · {sys.lastReading}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant={cfg.variant}
          className="text-xs hidden sm:flex items-center gap-1"
        >
          <StatusIcon className="h-3 w-3" />
          {sys.status}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
          onClick={() => navigate('/equipment')}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const Icon = entry.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={cn('p-1.5 rounded-lg bg-muted/30 shrink-0 mt-0.5')}>
        <Icon className={cn('h-4 w-4', entry.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{entry.description}</p>
        <p className="text-xs text-muted-foreground mt-1">{entry.timeAgo}</p>
      </div>
      <div
        className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          entry.initialsColor
        )}
      >
        {entry.initials}
      </div>
    </div>
  );
}

function QuickLaunchButton({ tile }: { tile: QuickLaunchTile }) {
  const navigate = useNavigate();
  const Icon = tile.icon;
  return (
    <button
      onClick={() => navigate(tile.route)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50',
        tile.bg
      )}
    >
      <Icon className={cn('h-5 w-5 mb-2', tile.accent)} />
      <p className="text-sm font-semibold text-foreground leading-tight">{tile.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{tile.description}</p>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const criticalSystems = SYSTEM_HEALTH.filter((s) => s.status === 'Critical').length;
  const warningSystems = SYSTEM_HEALTH.filter((s) => s.status === 'Warning').length;
  const attentionCount = criticalSystems + warningSystems;

  const displayName =
    (user as any)?.name ||
    (user as any)?.email?.split('@')[0] ||
    'Operator';

  const formattedRefresh = lastRefresh.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const overallHealthPct =
    Math.round(
      (SYSTEM_HEALTH.filter((s) => s.status === 'Operational').length /
        SYSTEM_HEALTH.length) *
        100
    );

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Alert Banner ── */}
          {!alertDismissed && attentionCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm text-amber-200">
                  <span className="font-semibold">{attentionCount} system{attentionCount > 1 ? 's' : ''} require attention</span>
                  {criticalSystems > 0 && (
                    <span className="text-amber-400 ml-1">— {criticalSystems} critical</span>
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-amber-400 hover:text-amber-200 hover:bg-amber-500/20"
                onClick={() => setAlertDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Unified Operations Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Live facility overview — all systems, all roles
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Welcome back, <span className="text-primary font-medium">{displayName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Last updated: {formattedRefresh}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-1.5 text-primary" />
                Refresh
              </Button>
            </div>
          </div>

          {/* ── KPI Row ── */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {KPI_DATA.map((item) => (
                <KPICard key={item.label} item={item} />
              ))}
            </div>
          </section>

          {/* ── System Health + Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* System Health */}
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    System Health
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{overallHealthPct}% nominal</span>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {}}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={overallHealthPct} className="h-1.5 flex-1" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {SYSTEM_HEALTH.map((sys) => (
                  <SystemHealthRow key={sys.name} sys={sys} />
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {RECENT_ACTIVITY.map((entry, i) => (
                  <ActivityItem key={i} entry={entry} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Quick Launch ── */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
              Quick Launch
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_LAUNCH.map((tile) => (
                <QuickLaunchButton key={tile.route} tile={tile} />
              ))}
            </div>
          </section>

          {/* ── System Status Summary ── */}
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { label: 'Operational', count: SYSTEM_HEALTH.filter((s) => s.status === 'Operational').length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                { label: 'Warning', count: warningSystems, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
                { label: 'Critical', count: criticalSystems, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
              ] as const
            ).map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'rounded-xl border px-4 py-3 text-center',
                  stat.bg
                )}
              >
                <p className={cn('text-2xl font-bold', stat.color)}>{stat.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
