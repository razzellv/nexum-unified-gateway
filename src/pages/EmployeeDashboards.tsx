import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wrench, Gauge, Cpu, Sparkles, ArrowRight,
  ShoppingCart, Package, Clipboard, Thermometer,
  Shield, Truck, Radio, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierFromRole, type SubscriptionTier } from '@/config/tiers';

// ── Role card definitions per tier vertical ───────────────────────────────────
const FACILITY_ROLES = [
  {
    title: 'Technician Portal',
    description: 'View assigned work orders, maintenance tasks, and equipment repairs',
    route: '/dashboard/tech',
    icon: Wrench,
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Operator Portal',
    description: 'Equipment monitoring, logging, and shift management',
    route: '/dashboard/operator',
    icon: Gauge,
    color: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500',
  },
  {
    title: 'Engineer Portal',
    description: 'Technical analysis, system optimization, and project oversight',
    route: '/dashboard/engineer',
    icon: Cpu,
    color: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
  },
  {
    title: 'Custodian Portal',
    description: 'Facility maintenance, cleanliness tasks, and area management',
    route: '/dashboard/custodian',
    icon: Sparkles,
    color: 'from-orange-500/20 to-orange-600/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-500',
  },
];

const RETAIL_ROLES = [
  {
    title: 'Floor Associate Portal',
    description: 'Daily checklists, product inventory, and temperature log tasks',
    route: '/dashboard/operator',
    icon: Clipboard,
    color: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500',
  },
  {
    title: 'Inventory Associate',
    description: 'Stock counts, FIFO rotation, expiration tracking, and receiving',
    route: '/dashboard/tech',
    icon: Package,
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Food Safety Technician',
    description: 'Temperature monitoring, shelf-life alerts, and compliance logs',
    route: '/dashboard/engineer',
    icon: Thermometer,
    color: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-500',
  },
  {
    title: 'Receiving / Supplier',
    description: 'Delivery verification, supplier compliance, and intake documentation',
    route: '/dashboard/custodian',
    icon: ShoppingCart,
    color: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-500',
  },
];

const GOVT_ROLES = [
  {
    title: 'Officer / Field Personnel',
    description: 'Daily briefings, equipment checks, and incident reporting',
    route: '/dashboard/operator',
    icon: Shield,
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Fleet Technician',
    description: 'Apparatus maintenance, vehicle inspections, and work orders',
    route: '/dashboard/tech',
    icon: Truck,
    color: 'from-orange-500/20 to-orange-600/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-500',
  },
  {
    title: 'Dispatch / Operations',
    description: 'Response coordination, resource tracking, and shift logs',
    route: '/dashboard/engineer',
    icon: Radio,
    color: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
  },
  {
    title: 'Records / Compliance',
    description: 'Chain-of-custody, personnel certifications, and compliance documentation',
    route: '/dashboard/custodian',
    icon: FileText,
    color: 'from-cyan-500/20 to-cyan-600/20',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-500',
  },
];

function getTierVertical(tier: SubscriptionTier): 'retail' | 'govt' | 'facility' {
  if (tier === 'retail_starter' || tier === 'retail_pro') return 'retail';
  if (tier === 'command_basic' || tier === 'command_standard' || tier === 'command_pro') return 'govt';
  return 'facility';
}

const VERTICAL_LABELS: Record<string, { label: string; badge: string; badgeClass: string }> = {
  facility: { label: 'Facility Operations', badge: 'Facility', badgeClass: 'bg-primary/20 text-primary border-primary/30' },
  retail:   { label: 'Retail Operations',   badge: 'Retail',   badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  govt:     { label: 'Public Safety',        badge: 'Command',  badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmployeeDashboards() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const tier = getTierFromRole(user?.role || 'operator', user?.subscription);
  const vertical = getTierVertical(tier);
  const roleCards = vertical === 'retail' ? RETAIL_ROLES : vertical === 'govt' ? GOVT_ROLES : FACILITY_ROLES;
  const { label, badge, badgeClass } = VERTICAL_LABELS[vertical];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold mb-2">Employee Dashboards</h1>
            <p className="text-muted-foreground">
              {label} — select a role portal to view your dashboard
            </p>
          </div>
          <Badge variant="outline" className={cn('text-sm px-3 py-1', badgeClass)}>
            {badge}
          </Badge>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roleCards.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.route + role.title}
                className={cn(
                  'cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg',
                  role.borderColor,
                  'bg-gradient-to-br',
                  role.color
                )}
                onClick={() => navigate(role.route)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg bg-background/50', role.borderColor, 'border')}>
                        <Icon className={cn('w-6 h-6', role.iconColor)} />
                      </div>
                      <CardTitle>{role.title}</CardTitle>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tier info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Showing {badge} roles.</strong>{' '}
              Role portals adapt to your subscription tier — Facility, Retail, or Public Safety.
              In production, users are automatically routed to their assigned role portal.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
