import { useAuth } from "@/hooks/useAuth";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  User, 
  Zap,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleStatus = "active" | "in-progress";

interface ModuleCardProps {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  status?: ModuleStatus;
  colorTheme?: "primary" | "secondary";
}

function ModuleCard({ title, description, route, icon, status = "active", colorTheme = "primary" }: ModuleCardProps) {
  const navigate = (path: string) => window.location.href = path;
  
  return (
    <div
      onClick={() => navigate(route)}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer",
        "bg-card/30 backdrop-blur-xl",
        status === "active" 
          ? "border-green-500/20 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10" 
          : "border-yellow-500/20 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10",
        "hover:scale-[1.02]"
      )}
    >
      <div className="p-6 space-y-3">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-3 rounded-lg transition-colors",
            status === "active" 
              ? "bg-green-500/10 text-green-500 group-hover:bg-green-500/20" 
              : "bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20"
          )}>
            {icon}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className={cn(
        "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        status === "active" 
          ? "bg-gradient-to-br from-green-500/5 to-transparent" 
          : "bg-gradient-to-br from-yellow-500/5 to-transparent"
      )} />
    </div>
  );
}

export default function FacilityIntelligence() {
  const { userRole } = useAuth();

  return (
    <MainLayout>
      <ParticleBackground />
      
      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">Facility Intelligence™</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Performance & Analytics Dashboards
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time insights, multi-utility tracking, and role-based performance analytics
          </p>
        </section>

        {/* Role-Based Dashboards */}
        <section className="rounded-xl border border-blue-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3">
              Operational Dashboards
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Manager Dashboard */}
            {(userRole === 'admin' || userRole === 'executive' || userRole === 'manager') && (
              <ModuleCard
                title="Manager Dashboard"
                description="Facility-wide operations and performance overview"
                route="/dashboard/manager"
                icon={<Briefcase className="w-5 h-5" />}
                status="active"
              />
            )}

            {/* Executive Dashboard */}
            {(userRole === 'admin' || userRole === 'executive') && (
              <ModuleCard
                title="Executive Dashboard"
                description="High-level KPIs, financial metrics, and strategic insights"
                route="/dashboard/executive"
                icon={<TrendingUp className="w-5 h-5" />}
                status="active"
              />
            )}

            {/* Supervisor Dashboard */}
            {(userRole === 'admin' || userRole === 'manager' || userRole === 'supervisor') && (
              <ModuleCard
                title="Supervisor Dashboard"
                description="Work orders, violations, equipment status, and team performance"
                route="/dashboard/supervisor"
                icon={<Users className="w-5 h-5" />}
                status="active"
              />
            )}

{/* Operation Center */}
<ModuleCard
  title="Operation Center"
  description="Facility-wide live view — logs, work orders, equipment status, compliance, and staff activity"
  route="/employee-dashboard"
  icon={<User className="w-5 h-5" />}
  status="active"
/>

            {/* Energy Dashboard */}
            <ModuleCard
              title="Energy Dashboard"
              description="Multi-utility tracking: Electric, Natural Gas, and Water consumption"
              route="/dashboard/energy"
              icon={<Zap className="w-5 h-5" />}
              status="active"
            />

          </div>
        </section>

      </main>
    </MainLayout>
  );
}
