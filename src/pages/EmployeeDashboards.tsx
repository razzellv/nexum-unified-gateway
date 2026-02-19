import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wrench, 
  Gauge, 
  Cpu, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleCards = [
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

export default function EmployeeDashboards() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Dashboards</h1>
          <p className="text-muted-foreground">
            Select a role to view the corresponding employee dashboard
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roleCards.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.route}
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
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Box */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> These dashboards show role-specific views 
              of work orders, tasks, and equipment. In production, users will automatically be directed to 
              their assigned role dashboard based on their account permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
