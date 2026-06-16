import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  Thermometer,
  Snowflake,
  Wind,
  Droplets,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = "https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod";

const getToken = () =>
  localStorage.getItem("nexum_access_token") ||
  localStorage.getItem("nexum_id_token") ||
  localStorage.getItem("accessToken") ||
  "";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface EquipmentNode {
  id: string;
  name: string;
  type: string;
  system?: string;
  violationCount: number;
  highestSeverity: number;
  status: "operational" | "warning" | "critical";
}

// ─── ModuleCard ───────────────────────────────────────────────────────────────

const ModuleCard = ({
  title,
  subtitle,
  description,
  route,
  icon,
  status,
  colorTheme = "primary",
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
      <div className="absolute inset-0 holographic opacity-10 group-hover:opacity-20 transition-opacity" />
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "p-3 rounded-lg bg-muted/50 transition-transform duration-300 group-hover:scale-110",
              colorClasses[colorTheme].icon
            )}
          >
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

// ─── Equipment type helpers ───────────────────────────────────────────────────

const getEquipmentIcon = (type: string) => {
  const t = type?.toLowerCase();
  if (t === "boiler") return Flame;
  if (t === "chiller") return Snowflake;
  if (t === "ahu" || t === "air_handler") return Wind;
  if (t === "pump") return Droplets;
  if (t === "cooling_tower" || t === "tower") return Droplets;
  return Activity;
};

const getEquipmentColor = (type: string) => {
  const t = type?.toLowerCase();
  if (t === "boiler") return "text-orange-500";
  if (t === "chiller") return "text-blue-500";
  if (t === "ahu" || t === "air_handler") return "text-cyan-500";
  if (t === "pump") return "text-green-500";
  if (t === "cooling_tower" || t === "tower") return "text-purple-500";
  return "text-primary";
};

const getTimeAgo = (timestamp: string) => {
  if (!timestamp) return "Unknown";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
};

const statusColor = (status: EquipmentNode["status"]) => {
  if (status === "critical") return "#E24B4A";
  if (status === "warning") return "#EF9F27";
  return "#1D9E75";
};

const statusBg = (status: EquipmentNode["status"]) => {
  if (status === "critical") return "bg-red-500/10 border-red-500/40";
  if (status === "warning") return "bg-yellow-500/10 border-yellow-500/40";
  return "bg-green-500/10 border-green-500/30";
};

const statusLabel = (status: EquipmentNode["status"]) => {
  if (status === "critical") return "Critical";
  if (status === "warning") return "Warning";
  return "Operational";
};

const typeLabel = (type: string) => {
  const t = type?.toLowerCase();
  if (t === "ahu" || t === "air_handler") return "AHU";
  if (t === "cooling_tower" || t === "tower") return "Tower";
  return (type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase()) || "—";
};

// ─── FacilityTopology ─────────────────────────────────────────────────────────

const FacilityTopology = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const facilityId = user?.facilityId || 'facility-001';
  const [nodes, setNodes] = useState<EquipmentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [worstAlert, setWorstAlert] = useState<string | null>(null);

  const fetchTopology = useCallback(async () => {
    const token = getToken();
    try {
      const [eqRes, vRes] = await Promise.all([
        fetch(`${API_BASE}/equipment?facilityId=${facilityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/violations?facilityId=${facilityId}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const eqData = eqRes.ok ? await eqRes.json() : { equipment: [] };
      const vData = vRes.ok ? await vRes.json() : { violations: [] };

      const equipment: any[] = eqData.equipment || eqData.items || eqData || [];
      const violations: any[] = vData.violations || vData.items || vData || [];

      const activeViolations = violations.filter(
        (v) => !v.resolvedAt && v.status !== "resolved"
      );

      const violationMap: Record<string, { count: number; maxSeverity: number; name: string }> = {};
      for (const v of activeViolations) {
        const eid = v.equipmentId || v.equipment_id || "";
        if (!eid) continue;
        if (!violationMap[eid]) violationMap[eid] = { count: 0, maxSeverity: 0, name: v.equipmentName || "" };
        violationMap[eid].count++;
        if ((v.severity || 0) > violationMap[eid].maxSeverity) {
          violationMap[eid].maxSeverity = v.severity || 0;
        }
      }

      const mapped: EquipmentNode[] = equipment.map((eq: any) => {
        const id = eq.equipmentId || eq.id || eq.SK?.replace("EQUIPMENT#", "") || "";
        const vInfo = violationMap[id] || { count: 0, maxSeverity: 0, name: "" };
        let status: EquipmentNode["status"] = "operational";
        if (vInfo.maxSeverity >= 80) status = "critical";
        else if (vInfo.maxSeverity >= 50 || vInfo.count > 0) status = "warning";

        return {
          id,
          name: eq.name || eq.equipmentName || `${eq.manufacturer || ""} ${eq.model || ""}`.trim() || "Unknown",
          type: eq.type || eq.equipmentType || "unknown",
          system: eq.system || eq.systemType || "",
          violationCount: vInfo.count,
          highestSeverity: vInfo.maxSeverity,
          status,
        };
      });

      setNodes(mapped);
      setLastUpdated(new Date());

      const critical = mapped.filter((n) => n.status === "critical");
      const warning = mapped.filter((n) => n.status === "warning");
      if (critical.length > 0) {
        setWorstAlert(`${critical.length} critical — ${critical.map((n) => n.name).join(", ")}`);
      } else if (warning.length > 0) {
        setWorstAlert(`${warning.length} warning — ${warning.map((n) => n.name).join(", ")}`);
      } else {
        setWorstAlert(null);
      }
    } catch (err) {
      console.error("Topology fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchTopology();
    const iv = setInterval(fetchTopology, 60_000);
    return () => clearInterval(iv);
  }, [fetchTopology]);

  const operational = nodes.filter((n) => n.status === "operational").length;
  const warnings = nodes.filter((n) => n.status === "warning").length;
  const criticals = nodes.filter((n) => n.status === "critical").length;

  return (
    <section className="rounded-xl border border-primary/20 bg-card/30 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-primary/50 to-transparent" />
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Facility Topology
          </h2>
          <div className="h-px w-8 bg-gradient-to-l from-primary/50 to-transparent" />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchTopology}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
            Live
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No equipment found for this facility.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-5 p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{operational}</span>
              <span className="text-xs text-muted-foreground">operational</span>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{warnings}</span>
              <span className="text-xs text-muted-foreground">warning</span>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">{criticals}</span>
              <span className="text-xs text-muted-foreground">critical</span>
            </div>
            {worstAlert && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <p className="text-xs text-yellow-500 truncate flex-1">{worstAlert}</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {nodes.map((node) => {
              const Icon = getEquipmentIcon(node.type);
              const colorClass = getEquipmentColor(node.type);
              return (
                <div
                  key={node.id}
                  onClick={() => navigate("/equipment-library")}
                  className={cn(
                    "group relative rounded-xl border p-4 cursor-pointer",
                    "transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02]",
                    statusBg(node.status)
                  )}
                >
                  <div
                    className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: statusColor(node.status) }}
                  />
                  <div className={cn("mb-3", colorClass)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold leading-tight truncate mb-0.5">
                    {node.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {typeLabel(node.type)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium"
                      style={{ color: statusColor(node.status) }}
                    >
                      {statusLabel(node.status)}
                    </span>
                    {node.violationCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs h-5 px-1.5 border-red-500/40 text-red-500"
                      >
                        {node.violationCount} violation{node.violationCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => navigate("/equipment-library")}
              className="text-sm text-primary hover:underline"
            >
              View full equipment library →
            </button>
          </div>
        </>
      )}
    </section>
  );
};

// ─── Main Index ───────────────────────────────────────────────────────────────

const Index = () => {
  const { userRole, logout, user } = useAuth();
  const navigate = useNavigate();

  const [equipmentCount, setEquipmentCount] = useState(0);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

  const fetchEquipment = async () => {
    setIsLoadingEquipment(true);
    const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
    try {
      const data = await getRecentEquipment(facilityId);
      const equipment = data.equipment || data.items || data || [];
      setEquipmentCount(equipment.length);
      const recent = equipment.slice(0, 3).map((item: any) => ({
        name: item.name || `${item.manufacturer} ${item.model}`,
        type: item.type || "Unknown",
        date: getTimeAgo(item.addedAt || item.createdAt),
        icon: getEquipmentIcon(item.type),
        color: getEquipmentColor(item.type),
      }));
      setRecentScans(recent);
    } catch (error) {
      console.error("❌ Error loading equipment:", error);
      setRecentScans([
        { name: "Cleaver-Brooks CB-700", type: "Boiler", date: "2 hours ago", icon: Flame, color: "text-orange-500" },
        { name: "Trane CVHE-500", type: "Chiller", date: "5 hours ago", icon: Snowflake, color: "text-blue-500" },
        { name: "Armstrong S-65", type: "Pump", date: "1 day ago", icon: Droplets, color: "text-green-500" },
      ]);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(fetchEquipment, 30000);
    const handleEquipmentAdded = () => fetchEquipment();
    window.addEventListener("equipmentAdded", handleEquipmentAdded);
    return () => {
      clearInterval(interval);
      window.removeEventListener("equipmentAdded", handleEquipmentAdded);
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
            Operational Intelligence Engine™ • Multi-Facility Command Center
          </p>
        </div>
      </header>

      {/* Admin Role Toggle + Sign Out */}
      {userRole === "admin" && (
        <div className="border-b border-border/50 bg-card/20 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">View as:</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate("/dashboard/employees")}>
                    <User className="w-3 h-3 mr-1" /> Employee
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate("/dashboard/supervisor")}>
                    <Users className="w-3 h-3 mr-1" /> Supervisor
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate("/dashboard/manager")}>
                    <Briefcase className="w-3 h-3 mr-1" /> Manager
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate("/dashboard/executive")}>
                    <TrendingUp className="w-3 h-3 mr-1" /> Executive
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Active Intelligence Capabilities */}
        <section className="rounded-xl border border-green-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Active Intelligence Capabilities
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-green-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Facility Intelligence"
              description="Integrated intelligence dashboards for energy, operations, and performance"
              route="/facility-intelligence"
              icon={<BarChart3 className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Field Intelligence Portals"
              description="Role-specific intelligence for technicians, operators, engineers, and custodians"
              route="/dashboard/employees"
              icon={<Users className="w-5 h-5" />}
              status="active"
              colorTheme="secondary"
            />
            <ModuleCard
              title="Equipment Intelligence™"
              description="AI-powered nameplate analysis, specs extraction, and asset knowledge capture"
              route="/equipment-intelligence"
              icon={<Camera className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Equipment Metrics"
              description="Real-time equipment performance data and operational health indicators"
              route="/equipment"
              icon={<Activity className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Facility Data Source™"
              description="Capture daily operational readings — the foundation of organizational knowledge"
              route="/data-source"
              icon={<Upload className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Compliance Logger™"
              description="Capture violations, PM checks, and safety observations into defensible records"
              route="/compliance-logger"
              icon={<Shield className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Command Hub"
              subtitle="AI-Assisted Operational Execution"
              description="AI accelerates execution — humans make decisions. Real-time operations control."
              route="/command-hub"
              icon={<Command className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Compliance Intelligence™"
              description="Automated compliance analysis, regulatory tracking, and audit readiness"
              route="/compliance-analyzer"
              icon={<ShieldCheck className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Climate Intelligence™"
              description="Operational chain analysis — from weather to equipment to energy to financial impact"
              route="/climate-intelligence"
              icon={<Thermometer className="w-5 h-5" />}
              status="active"
              colorTheme="primary"
            />
            <ModuleCard
              title="Facility Instructor™"
              description="AI technical mentor for HVAC, boilers, safety, capital projects, and ethics guidance"
              route="/instructor"
              icon={<MessageSquare className="w-5 h-5" />}
              status="active"
              colorTheme="accent"
            />
          </div>
        </section>

        {/* Intelligence Expanding */}
        <section className="rounded-xl border border-blue-500/20 bg-card/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-foreground px-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Intelligence Expanding
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModuleCard
              title="Optimize & Learn™"
              description="Organizational learning, training intelligence, and continuous improvement programs"
              route="/optimize-learn"
              icon={<GraduationCap className="w-5 h-5" />}
              status="in-progress"
              colorTheme="secondary"
            />
          </div>
        </section>

        {/* Equipment Library */}
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
            <Card
              className="neon-border cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate("/equipment-intelligence")}
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
                        onClick={(e) => { e.stopPropagation(); fetchEquipment(); }}
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

            <Card className="neon-border col-span-1 md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Recent Equipment Scans
                  </h3>
                  <button
                    onClick={() => navigate("/equipment-intelligence")}
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
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <item.icon className={cn("w-4 h-4", item.color)} />
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

        {/* Facility Topology */}
        <FacilityTopology />

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
              Nexum Suum™ © 2025 • Powered by AWS
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Support</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
