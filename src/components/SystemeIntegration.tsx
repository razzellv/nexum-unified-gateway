import { useState, useEffect } from "react";
import { FuturisticPanel } from "./FuturisticPanel";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { systemeConfig } from "@/config/systeme";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  Zap, 
  FolderSync, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Webhook,
  Mail,
  Tag,
  FileText,
  Bell,
  Flame,
  Snowflake,
  AlertTriangle,
  Wrench,
  Shield
} from "lucide-react";

interface ToggleState {
  crm_sync: boolean;
  automation_workflows: boolean;
  client_management: boolean;
  // CRM sub-toggles
  push_leads: boolean;
  push_clients: boolean;
  tag_by_compliance: boolean;
  // Automation sub-toggles
  send_from_facility: boolean;
  create_tag: boolean;
  assign_workflow: boolean;
  add_to_campaign: boolean;
  send_followup_email: boolean;
  // Client management sub-toggles
  auto_create_portal_folder: boolean;
  send_dashboard_embed: boolean;
  assign_lms_courses: boolean;
  sync_contact_record: boolean;
}

export const SystemeIntegration = () => {
  const { authEvents } = useAuth();
  
  const [toggles, setToggles] = useState<ToggleState>({
    crm_sync: systemeConfig.systeme_io.enabled_features.crm_sync,
    automation_workflows: systemeConfig.systeme_io.enabled_features.automation_workflows,
    client_management: systemeConfig.systeme_io.enabled_features.client_management,
    push_leads: systemeConfig.systeme_io.crm_sync.push_leads,
    push_clients: systemeConfig.systeme_io.crm_sync.push_clients,
    tag_by_compliance: systemeConfig.systeme_io.crm_sync.tag_by_compliance,
    send_from_facility: systemeConfig.systeme_io.automation.send_from_facility,
    create_tag: systemeConfig.systeme_io.automation.actions.create_tag,
    assign_workflow: systemeConfig.systeme_io.automation.actions.assign_workflow,
    add_to_campaign: systemeConfig.systeme_io.automation.actions.add_to_campaign,
    send_followup_email: systemeConfig.systeme_io.automation.actions.send_followup_email,
    auto_create_portal_folder: systemeConfig.systeme_io.client_management.auto_create_portal_folder,
    send_dashboard_embed: systemeConfig.systeme_io.client_management.send_dashboard_embed,
    assign_lms_courses: systemeConfig.systeme_io.client_management.assign_lms_courses,
    sync_contact_record: systemeConfig.systeme_io.client_management.sync_contact_record,
  });

  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "success" | "error">>({});
  const [connectionLogs, setConnectionLogs] = useState<string[]>([
    `[${new Date().toISOString()}] System initialized`,
    `[${new Date().toISOString()}] Systeme.io connection established`,
  ]);

  // Add auth events to connection logs
  useEffect(() => {
    if (authEvents.length > 0) {
      const latestEvent = authEvents[0];
      const logEntry = `[${latestEvent.timestamp.toISOString()}] [Auth] ${latestEvent.message}`;
      setConnectionLogs(prev => {
        if (prev[prev.length - 1] !== logEntry) {
          return [...prev, logEntry];
        }
        return prev;
      });
    }
  }, [authEvents]);

  const handleToggle = (key: keyof ToggleState) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    setConnectionLogs(prev => [
      ...prev,
      `[${new Date().toISOString()}] Toggle ${key}: ${!toggles[key] ? "enabled" : "disabled"}`
    ]);
  };

  const testConnection = async (feature: string) => {
    setTestStatus(prev => ({ ...prev, [feature]: "testing" }));
    setConnectionLogs(prev => [...prev, `[${new Date().toISOString()}] Testing ${feature} connection...`]);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.2;
    setTestStatus(prev => ({ ...prev, [feature]: success ? "success" : "error" }));
    setConnectionLogs(prev => [
      ...prev,
      `[${new Date().toISOString()}] ${feature} test ${success ? "passed ✓" : "failed ✗"}`
    ]);
    
    setTimeout(() => {
      setTestStatus(prev => ({ ...prev, [feature]: "idle" }));
    }, 3000);
  };

  const triggerEvents = [
    { key: "new_work_order", label: "Work Order Created", icon: FileText, path: "/hooks/workorder" },
    { key: "boiler_alert", label: "Boiler Alert", icon: Flame, path: "/hooks/boiler" },
    { key: "chiller_alert", label: "Chiller Alert", icon: Snowflake, path: "/hooks/chiller" },
    { key: "compliance_violation", label: "Compliance Violation", icon: AlertTriangle, path: "/hooks/violation" },
    { key: "maintenance_due", label: "Maintenance Due", icon: Wrench, path: "/hooks/maintenance" },
  ];

  return (
    <FuturisticPanel className="p-6" glowColor="primary">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground text-glow-primary">Systeme.io Integration</h3>
            <p className="text-sm text-muted-foreground">v{systemeConfig.version}</p>
          </div>
        </div>
        <Badge className={cn(
          "flex items-center gap-1.5 px-3 py-1",
          systemeConfig.status === "connected" 
            ? "bg-primary/20 text-primary border-primary/30" 
            : "bg-destructive/20 text-destructive border-destructive/30"
        )}>
          {systemeConfig.status === "connected" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {systemeConfig.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRM Sync */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-primary" />
              <span className="font-medium">CRM Sync</span>
            </div>
            <Switch checked={toggles.crm_sync} onCheckedChange={() => handleToggle("crm_sync")} />
          </div>
          
          {toggles.crm_sync && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
              {[
                { key: "push_leads" as const, label: "Push Leads" },
                { key: "push_clients" as const, label: "Push Clients" },
                { key: "tag_by_compliance" as const, label: "Tag by Compliance" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <Switch 
                    checked={toggles[item.key]} 
                    onCheckedChange={() => handleToggle(item.key)}
                    className="scale-75"
                  />
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => testConnection("crm_sync")}
                disabled={testStatus.crm_sync === "testing"}
              >
                {testStatus.crm_sync === "testing" && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                {testStatus.crm_sync === "success" && <CheckCircle className="w-3 h-3 mr-2 text-primary" />}
                {testStatus.crm_sync === "error" && <XCircle className="w-3 h-3 mr-2 text-destructive" />}
                Test Connection
              </Button>
            </div>
          )}
        </div>

        {/* Automation Workflows */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" />
              <span className="font-medium">Automation</span>
            </div>
            <Switch checked={toggles.automation_workflows} onCheckedChange={() => handleToggle("automation_workflows")} />
          </div>
          
          {toggles.automation_workflows && (
            <div className="space-y-2 pl-4 border-l-2 border-secondary/30">
              {[
                { key: "create_tag" as const, label: "Create Tag", icon: Tag },
                { key: "assign_workflow" as const, label: "Assign Workflow", icon: Zap },
                { key: "add_to_campaign" as const, label: "Add to Campaign", icon: Bell },
                { key: "send_followup_email" as const, label: "Send Followup Email", icon: Mail },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3 h-3 text-secondary" />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <Switch 
                    checked={toggles[item.key]} 
                    onCheckedChange={() => handleToggle(item.key)}
                    className="scale-75"
                  />
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => testConnection("automation")}
                disabled={testStatus.automation === "testing"}
              >
                {testStatus.automation === "testing" && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                {testStatus.automation === "success" && <CheckCircle className="w-3 h-3 mr-2 text-primary" />}
                {testStatus.automation === "error" && <XCircle className="w-3 h-3 mr-2 text-destructive" />}
                Test Connection
              </Button>
            </div>
          )}
        </div>

        {/* Client Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span className="font-medium">Client Management</span>
            </div>
            <Switch checked={toggles.client_management} onCheckedChange={() => handleToggle("client_management")} />
          </div>
          
          {toggles.client_management && (
            <div className="space-y-2 pl-4 border-l-2 border-accent/30">
              {[
                { key: "auto_create_portal_folder" as const, label: "Auto Create Portal Folder" },
                { key: "send_dashboard_embed" as const, label: "Send Dashboard Embed" },
                { key: "assign_lms_courses" as const, label: "Assign LMS Courses" },
                { key: "sync_contact_record" as const, label: "Sync Contact Record" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <Switch 
                    checked={toggles[item.key]} 
                    onCheckedChange={() => handleToggle(item.key)}
                    className="scale-75"
                  />
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => testConnection("client_management")}
                disabled={testStatus.client_management === "testing"}
              >
                {testStatus.client_management === "testing" && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                {testStatus.client_management === "success" && <CheckCircle className="w-3 h-3 mr-2 text-primary" />}
                {testStatus.client_management === "error" && <XCircle className="w-3 h-3 mr-2 text-destructive" />}
                Test Connection
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Triggers */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-4 h-4 text-primary" />
          <span className="font-medium">Webhook Triggers</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {triggerEvents.map(event => (
            <div 
              key={event.key}
              className="p-3 rounded-lg bg-card/30 border border-border/30 hover:border-primary/50 transition-colors"
            >
              <event.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-medium">{event.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{event.path}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Logs */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Connection Logs</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 text-xs"
            onClick={() => setConnectionLogs([])}
          >
            Clear
          </Button>
        </div>
        <div className="h-32 overflow-y-auto rounded-lg bg-background/50 border border-border/30 p-3 font-mono text-xs">
          {connectionLogs.map((log, i) => (
            <div 
              key={i} 
              className={cn(
                "py-0.5",
                log.includes("[Auth]") ? "text-primary" : "text-muted-foreground"
              )}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </FuturisticPanel>
  );
};
