import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_ACCESS, UserRole } from "@/config/roleAccess";
import { getRecentEquipment } from "@/lib/nexum-api";
import { ParticleBackground } from "@/components/ParticleBackground";
import { SystemFeed } from "@/components/SystemFeed";
import { 
  GraduationCap, 
  Cpu, 
  Sparkles, 
  Database, 
  Command, 
  BarChart3, 
  CheckCircle,
  Clock,
  ScrollText,
  BookOpen,
  ShieldCheck,
  Gauge,
  Camera,
  Activity,
  MessageSquare,
  Upload,
  FileText,
  Briefcase,
  TrendingUp,
  Users,
  User,
  Zap,
  Shield,
  Flame,
  Snowflake,
  Wind,
  Droplets,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


type ModuleStatus = "active" | "in-progress";

interface ModuleCardProps {
  title: string;
  subtitle?: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  colorTheme?: "primary" | "secondary" | "accent";
}

const ModuleCard = ({ 
  title, 
  subtitle,
  description, 
  route, 
  icon,
  status,
  colorTheme = "primary"
}: ModuleCardProps) => {
  const navigate = useNavigate();
  
  const colorClasses = {
    primary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(168_92%_55%/0.25)]",
      border: "border-primary/20 group-hover:border-primary/50",
      icon: "text-primary",
    },
    secondary: {
      glow: "group-hover:shadow-[0_0_40px_hsl(210_100%_54%/0.25)]",
      border: "border-secondary/20 group-hover:border-secondary/50",
      icon: "text-secondary",
    },
    accent: {
      glow: "group-hover:shadow-[0_0_40px_hsl(24_100%_55%/0.25)]",
      border: "border-accent/20 group-hover:border-accent/50",
      icon: "text-accent",
    },
  };

  const statusConfig = {
    active: {
      label: "Active",
      className: "bg-green-500/10 text-green-500 border-green-500/30",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    "in-progress": {
      label: "Integration in Progress",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      icon: <Clock className="w-3 h-3" />,
    },
  };

  const currentStatus = statusConfig[status];
  
  return (
    <div 
      onClick={() => navigate(route)}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "bg-card/50 backdrop-blur-xl",
        "border transition-all duration-300",
        "hover:-translate-y-1 hover:scale-[1.02]",
        colorClasses[colorTheme].border,
        colorClasses[colorTheme].glow
      )}
    >
      {/* Holographic overlay */}
      <div className="absolute inset-0 holographic opacity-10 group-hover:opacity-20 transition-opacity" />
      
      <div className="relative z-10 p-5">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-muted/50 transition-transform duration-300 group-hover:scale-110",
            colorClasses[colorTheme].icon
          )}>
            {icon}
          </div>
          
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              currentStatus.className
            )}
          >
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
        </div>
        
        {/* Title & Description */}
        <h3 className="text-lg font-semibold mb-1 group-hover:text-glow-primary transition-all">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mb-1">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
};

// ✅ Live Telemetry Component
const LiveTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  
  useEffect(() => {
    // Simulate live telemetry updates
    const interval = setInterval(() => {
      const newData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        system: ['Boiler-1', 'Chiller-2', 'AHU-3', 'Pump-4'][Math.floor(Math.random() * 4)],
        type: ['boiler', 'chiller', 'ahu', 'pump'][Math.floor(Math.random() * 4)],
        value: Math.random() * 100,
        status: Math.random() > 0.8 ? 'warning' : 'normal'
      };
      
      setTelemetryData(prev => [newData, ...prev].slice(0, 10));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      boiler: Flame,
      chiller: Snowflake,
      ahu: Wind,
      pump: Droplets
    };
    return icons[type] || Activity;
  };

  return (
    <div className="space-y-2">
      {telemetryData.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Waiting for telemetry data...</p>
        </div>
      ) : (
        telemetryData.map((data) => {
          const Icon = getIcon(data.type);
          return (
            <div
              key={data.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border transition-all animate-fade-in",
                data.status === 'warning' 
                  ? "border-warning/50 bg-warning/10" 
                  : "border-border/30 bg-muted/20"
              )}
            >
              <Icon className={cn(
                "w-4 h-4",
                data.status === 'warning' ? "text-warning" : "text-primary"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{data.system}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Badge variant={data.status === 'warning' ? "destructive" : "outline"} className="text-xs">
                {data.value.toFixed(1)}
              </Badge>
            </div>
          );
        })
      )}
    </div>
  );
};

const Index = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  
  // ✅ Equipment Library with API
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

  // Helper functions
  const getTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getEquipmentIcon = (type: string) => {
    const icons: Record<string, any> = {
      boiler: Flame,
      chiller: Snowflake,
      ahu: Wind,
      pump: Droplets,
      cooling_tower: Droplets,
      tower: Droplets,
    };
    return icons[type?.toLowerCase()] || Database;
  };

  const getEquipmentColor = (type: string) => {
    const colors: Record<string, string> = {
      boiler: 'text-orange-500',
      chiller: 'text-blue-500',
      ahu: 'text-cyan-500',
      pump: 'text-green-500',
      cooling_tower: 'text-purple-500',
      tower: 'text-purple-500',
    };
    return colors[type?.toLowerCase()] || 'text-primary';
  };

  const fetchEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const data = await getRecentEquipment(7);
      console.log('✅ Equipment loaded:', data);
      const equipment = data.equipment || data.items || data || [];
      setEquipmentCount(equipment.length);
      
      const recent = equipment.slice(0, 3).map((item: any) => ({
        name: item.name || `${item.manufacturer} ${item.model}`,
        type: item.type || 'Unknown',
        date: getTimeAgo(item.addedAt || item.createdAt),
        icon: getEquipmentIcon(item.type),
        color: getEquipmentColor(item.type)
      }));
      setRecentScans(recent);
    } catch (error) {
      console.error('❌ Error loading equipment:', error);
      setRecentScans([
        { name: 'Cleaver-Brooks CB-700', type: 'Boiler', date: '2 hours ago', icon: Flame, color: 'text-orange-500' },
        { name: 'Trane CVHE-500', type: 'Chiller', date: '5 hours ago', icon: Snowflake, color: 'text-blue-500' },
        { name: 'Armstrong S-65', type: 'Pump', date: '1 day ago', icon: Droplets, color: 'text-green-500' },
      ]);
    } finally {
      setIsLoadingEquipment(false);
    }
  };


  useEffect(() => {
    fetchEquipment();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchEquipment, 30000);
    
    // Listen for equipment added events
    const handleEquipmentAdded = () => {
      console.log('🔄 Equipment added, refreshing...');
      fetchEquipment();
    };
    window.addEventListener('equipmentAdded', handleEquipmentAdded);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('equipmentAdded', handleEquipmentAdded);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <ParticleBackground />
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary animate-glow-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-glow-primary">
              Nexum Suum™
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-14">
            Unified Operations Hub • Multi-Facility Command Center
          </p>
        </div>
      </header>


      {/* Admin Role Toggle */}

      {userRole === 'admin' && (

        <div className="border-b border-border/50 bg-card/20 backdrop-blur-xl">

          <div className="container mx-auto px-4 py-3">

            <div className="flex items-center gap-3">

              <Shield className="w-4 h-4 text-primary" />

              <span className="text-sm font-medium">View as:</span>

              <div className="flex gap-2">

                <Button 

                  variant="ghost" 

                  size="sm"

                  className="h-8"

                  onClick={() => navigate('/dashboard/employee')}

                >

                  <User className="w-3 h-3 mr-1" />

                  Employee

                </Button>

                <Button 

                  variant="ghost" 

                  size="sm"

                  className="h-8"

                  onClick={() => navigate('/dashboard/supervisor')}

                >

                  <Users className="w-3 h-3 mr-1" />

                  Supervisor

                </Button>

                <Button 

                  variant="ghost" 

                  size="sm"

                  className="h-8"

                  onClick={() => navigate('/dashboard/manager')}

                >

                  <Briefcase className="w-3 h-3 mr-1" />

                  Manager

                </Button>

                <Button 

                  variant="ghost" 

                  size="sm"

                  className="h-8"

                  onClick={() => navigate('/dashboard/executive')}

                >

                  <TrendingUp className="w-3 h-3 mr-1" />

                  Executive

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}


      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Active Modules */}
        <section className="rounded-xl border border-green-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Active Modules
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-green-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Facility Intelligence"
              description="Real-time dashboards for energy, operations, and performance analytics"
              route="/facility-intelligence"
              icon={<BarChart3 className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Employee Dashboards"
              description="Role-specific portals for technicians, operators, engineers, and custodians"
              route="/dashboard/employees"
              icon={<Users className="w-5 h-5" />}
              status="active"
              colorTheme="secondary"
            />
            <ModuleCard
              title="Equipment Intelligence"
              description="AI-powered nameplate analysis and equipment specs extraction"
              route="/equipment-intelligence"
              icon={<Camera className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Equipment Metrics"
              description="Real-time equipment performance and operational data"
              route="/equipment"
              icon={<Activity className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Facility Data Source"
              description="Log daily operational readings and equipment data"
              route="/data-source"
              icon={<Upload className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Compliance Logger"
              description="Log violations, PM checks, and safety observations"
              route="/compliance-logger"
              icon={<Shield className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
  title="Command Hub"
  subtitle="Operations Control"
  description="Centralized facility operations with real-time alerts and system monitoring"
  route="/command-hub"
  icon={<Command className="w-5 h-5" />}
  status="active"
  colorTheme="primary"
/>
            <ModuleCard
              title="Compliance Analyzer"
              description="Automated compliance analysis and regulatory tracking"
              route="/compliance-analyzer"
              icon={<ShieldCheck className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
          </div>
        </section>

        {/* Modules In Progress */}
        <section className="rounded-xl border border-blue-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Modules In Progress
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
          <ModuleCard
              title="Facility Instructor"
              description="AI chat assistant for technical, safety, and HR questions"
              route="/instructor"
              icon={<MessageSquare className="w-5 h-5" />}
              status="in-progress"
              colorTheme="accent"
            />
            <ModuleCard
              title="Optimize & Learn"
              description="Training modules and continuous improvement programs"
              route="/optimize-learn"
              icon={<GraduationCap className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
          </div>
        </section>

        {/* ✅ Equipment Library Section with API */}
        <section className="rounded-xl border border-primary/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Equipment Library
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <Card 
              className="neon-border cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/equipment-intelligence')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Database className="w-8 h-8 text-primary" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {equipmentCount} Items
                    </Badge>
                    {!isLoadingEquipment && (
                      <RefreshCw 
                        className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchEquipment();
                        }}
                      />
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Equipment Registry</h3>
                <p className="text-sm text-muted-foreground">
                  View all scanned equipment, specifications, and AI analysis
                </p>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            <Card className="neon-border col-span-1 md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Recent Equipment Scans
                  </h3>
                  <button 
                    onClick={() => navigate('/equipment-intelligence')}
                    className="text-sm text-primary hover:underline"
                  >
                    View All →
                  </button>
                </div>
                {isLoadingEquipment ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <item.icon className={cn('w-4 h-4', item.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ✅ Live Facility Telemetry */}
        <section className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground animate-pulse" />
            <h2 className="text-lg font-semibold text-muted-foreground">Live Facility Telemetry</h2>
            <Badge variant="outline" className="ml-auto text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
              Live
            </Badge>
          </div>
          <div className="min-h-[200px]">
            <LiveTelemetry />
          </div>
        </section>

        {/* System Feed */}
        <section>
          <SystemFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Nexum Suum™ © 2025 • Powered by AWS + Lovable AI
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Support
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
