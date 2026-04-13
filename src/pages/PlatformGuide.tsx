import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle, Lock, ArrowRight, ClipboardList, Shield,
  Package, AlertTriangle, BarChart3, Activity, Users,
  Zap, BookOpen, TrendingUp, Building2, ShoppingCart,
  GraduationCap, Wrench, ChevronRight,
} from 'lucide-react';

// ── Tier feature map ──────────────────────────────────────────────────────────
const TIER_FEATURES: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  modules: string[];
}> = {
  basic: {
    label: 'Basic',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    modules: [
      'Equipment Library',
      'Facility Data Source',
      'Compliance Logger',
      'Work Orders',
      'Basic Dashboards',
      'Operation Center',
    ],
  },
  standard: {
    label: 'Standard',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    modules: [
      'Everything in Basic',
      'Vendor Hub',
      'Violations Tracking',
      'Energy Dashboard',
      'Inventory Library',
      'Manager Dashboard',
      'Supervisor Dashboard',
    ],
  },
  business: {
    label: 'Business',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    modules: [
      'Everything in Standard',
      'Executive Dashboard',
      'Multi-Facility Analytics',
      'Compliance Analyzer AI',
      'Staff Performance Compass',
      'Full Command Hub',
    ],
  },
  premium: {
    label: 'Premium',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    modules: [
      'Everything in Business',
      'VVFI Facility Instructor AI',
      'OVPI Performance Intelligence',
      'Optimize & Learn (LMS)',
      'Custom Onboarding',
      'Dedicated Account Manager',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    modules: [
      'All Premium features',
      'Multi-Agency Deployment',
      'White-Label Options',
      'Custom Integrations',
      'Dedicated SLA',
      'On-Site Training',
    ],
  },
};

// ── Where logging takes place ─────────────────────────────────────────────────
const LOGGING_POINTS = [
  {
    icon: ClipboardList,
    name: 'Compliance Logger',
    path: '/compliance-logger',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    description: 'Your primary record layer. Every log entry is append-only and immutable once submitted. Use this for daily inspections, equipment checks, and any compliance activity.',
    when: 'Daily — every shift',
  },
  {
    icon: Activity,
    name: 'Operation Center',
    path: '/employee-dashboard',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Live governance layer. All submitted logs are scored here as Admissible, Incomplete, or Invalid. Only admissible records feed your dashboards.',
    when: 'Ongoing — auto-populated',
  },
  {
    icon: Wrench,
    name: 'Work Orders',
    path: '/work-orders',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    description: 'Execution records for maintenance and repair tasks. Work orders require resolution notes and a closing technician before they can be marked complete.',
    when: 'When maintenance tasks arise',
  },
  {
    icon: AlertTriangle,
    name: 'Violations',
    path: '/violations',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Compliance incidents follow a locked sequence: Open → Acknowledged → In Review → Resolved. No skipping steps. Each stage creates a timestamped record.',
    when: 'When a violation is identified',
  },
  {
    icon: Package,
    name: 'Equipment Library',
    path: '/equipment-library',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    description: 'Register all assets here — mechanical equipment, furniture, appliances, IT assets. Include runtime hours and design life to track asset health automatically.',
    when: 'During setup + when adding assets',
  },
  {
    icon: Shield,
    name: 'Compliance Documents',
    path: '/compliance-documents',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Upload and manage SOPs, permits, inspection reports, certifications, and policies. Documents are tagged, categorized, and searchable.',
    when: 'Document uploads + renewals',
  },
];

// ── Quick actions by org type ─────────────────────────────────────────────────
function getQuickActions(orgType: string, tier: string) {
  const base = [
    { label: 'Open Compliance Logger', path: '/compliance-logger', icon: ClipboardList },
    { label: 'View Equipment Library', path: '/equipment-library', icon: Wrench },
    { label: 'Go to Dashboard', path: '/', icon: BarChart3 },
  ];
  if (orgType === 'retail')     base.unshift({ label: 'Retail Dashboard', path: '/retail-dashboard', icon: ShoppingCart });
  if (orgType === 'government') base.unshift({ label: 'Government Dashboard', path: '/government-dashboard', icon: Shield });
  if (['business', 'premium', 'enterprise'].includes(tier)) {
    base.push({ label: 'Executive Dashboard', path: '/dashboard/executive', icon: TrendingUp });
  }
  if (['premium', 'enterprise'].includes(tier)) {
    base.push({ label: 'Optimize & Learn', path: '/optimize-learn', icon: GraduationCap });
  }
  return base;
}

// ── Role access descriptions ──────────────────────────────────────────────────
const ROLE_ACCESS: Record<string, { label: string; can: string[]; cannot: string[] }> = {
  admin:      { label: 'Administrator',  can: ['Full platform access', 'FIAS assessments', 'All settings', 'User management'], cannot: [] },
  executive:  { label: 'Executive',      can: ['Executive dashboard', 'All reports', 'Budget settings', 'Plan & billing'], cannot: ['System integrations', 'FIAS'] },
  manager:    { label: 'Manager',        can: ['Work orders', 'Violations', 'Staff management', 'Compliance logs'], cannot: ['Billing', 'System data', 'FIAS'] },
  supervisor: { label: 'Supervisor',     can: ['Work orders', 'Violations', 'Supervisor dashboard', 'Compliance logs'], cannot: ['Budget', 'Billing', 'FIAS'] },
  engineer:   { label: 'Engineer',       can: ['Equipment library (view)', 'Request equipment add', 'Work orders (view)'], cannot: ['Add equipment directly', 'Billing', 'Dashboards'] },
  operator:   { label: 'Operator',       can: ['Submit compliance logs', 'View work orders'], cannot: ['Edit', 'Manage team', 'Billing'] },
  technician: { label: 'Technician',     can: ['Submit compliance logs', 'Close work orders'], cannot: ['Manage team', 'Billing', 'Dashboards'] },
  custodian:  { label: 'Custodian',      can: ['Submit compliance logs', 'Custodian dashboard'], cannot: ['Equipment management', 'Billing'] },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlatformGuide() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const tier    = (user?.tier || localStorage.getItem('nexum_tier') || 'basic').toLowerCase();
  const orgType = (user?.orgType || localStorage.getItem('nexum_org_type') || 'facility').toLowerCase();
  const role    = (userRole || 'operator').toLowerCase();

  const tierMeta  = TIER_FEATURES[tier] || TIER_FEATURES.basic;
  const roleMeta  = ROLE_ACCESS[role]   || ROLE_ACCESS.operator;
  const actions   = getQuickActions(orgType, tier);

  const facilityName = user?.facilityId
    ? localStorage.getItem(`nexum_facility_name_${user.facilityId}`) || 'Your Facility'
    : 'Your Facility';

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Welcome banner */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 self-start">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Setup Complete — Welcome to Nexum Suum
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {facilityName} is now live on the FI Platform.
              Your <span className={cn('font-semibold', tierMeta.color)}>{tierMeta.label}</span> plan is active.
              Here's everything you need to know to get started.
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="shrink-0">
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map(({ label, path, icon: Icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 hover:border-primary/30 transition-all text-left group">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">{label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        {/* Where logging takes place */}
        <Card className="neon-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-primary" />
              Where Logging Takes Place
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              All records on the FI Platform are append-only and immutable once submitted.
              Each module serves a distinct layer of the 4-layer governance model.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {LOGGING_POINTS.map(pt => {
              const Icon = pt.icon;
              return (
                <button key={pt.name} onClick={() => navigate(pt.path)}
                  className={cn('w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.01] group', pt.border, pt.bg)}>
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg bg-background/40 border', pt.border, 'shrink-0')}>
                      <Icon className={cn('w-4 h-4', pt.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{pt.name}</p>
                        <Badge variant="outline" className={cn('text-[10px]', pt.color, pt.border)}>{pt.when}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pt.description}</p>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 shrink-0 mt-1 transition-colors', pt.color, 'opacity-40 group-hover:opacity-100')} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Tier access */}
        <Card className="neon-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-primary" />
              Your Plan Access
              <Badge className={cn('ml-auto text-xs px-2 py-0.5', tierMeta.bg, tierMeta.color, 'border', tierMeta.border)}>
                {tierMeta.label}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              The following modules are unlocked under your current plan. Upgrade anytime in Settings → Plan & Billing.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tierMeta.modules.map(mod => (
                <div key={mod} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className={mod.startsWith('Everything') ? 'text-muted-foreground italic text-xs' : 'text-foreground'}>{mod}</span>
                </div>
              ))}
            </div>

            {/* Locked tiers preview */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-3">Unlock more by upgrading:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TIER_FEATURES)
                  .filter(([key]) => key !== tier)
                  .map(([key, meta]) => (
                    <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/30 text-xs text-muted-foreground">
                      <Lock className="w-2.5 h-2.5" />
                      {meta.label}
                    </div>
                  ))}
                {Object.keys(TIER_FEATURES).filter(k => k !== tier).length > 0 && (
                  <Button size="sm" variant="outline" className="text-xs h-6 px-2.5" onClick={() => navigate('/settings')}>
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role access */}
        <Card className="neon-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              Your Role Access
              <Badge variant="outline" className="ml-auto text-xs capitalize">{roleMeta.label}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Access is also gated by role. Here's what your <strong className="text-foreground">{roleMeta.label}</strong> account can do.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Can Access</p>
                {roleMeta.can.map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />{item}
                  </div>
                ))}
              </div>
              {roleMeta.cannot.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Not Available for This Role</p>
                  {roleMeta.cannot.map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3 shrink-0" />{item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Governance reminder */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-400">4-Layer Governance Model</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every action on this platform flows through: <strong className="text-foreground">Record</strong> (log it) →{' '}
              <strong className="text-foreground">Validate</strong> (governance scoring) →{' '}
              <strong className="text-foreground">Interpret</strong> (dashboards & KPIs) →{' '}
              <strong className="text-foreground">Execute</strong> (work orders & violations).
              All records are immutable once submitted. This is by design — it ensures your data is audit-ready at all times.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button size="lg" onClick={() => navigate('/')}>
            <Building2 className="w-4 h-4 mr-2" />Enter Platform
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/compliance-logger')}>
            <ClipboardList className="w-4 h-4 mr-2" />Start Logging
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/optimize-learn')}>
            <GraduationCap className="w-4 h-4 mr-2" />Platform Training
          </Button>
        </div>

      </div>
    </MainLayout>
  );
}
