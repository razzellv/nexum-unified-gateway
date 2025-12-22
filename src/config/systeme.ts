export interface SystemeConfig {
  integration: string;
  status: "connected" | "disconnected" | "error";
  version: string;
  systeme_io: {
    base_url: string;
    api_key: string;
    enabled_features: {
      crm_sync: boolean;
      automation_workflows: boolean;
      client_management: boolean;
    };
    crm_sync: {
      push_leads: boolean;
      push_clients: boolean;
      tag_by_compliance: boolean;
      fields: Record<string, string>;
    };
    automation: {
      send_from_facility: boolean;
      trigger_events: Record<string, string>;
      actions: Record<string, boolean>;
    };
    client_management: {
      auto_create_portal_folder: boolean;
      send_dashboard_embed: boolean;
      assign_lms_courses: boolean;
      sync_contact_record: boolean;
      record_fields: Record<string, string>;
    };
    makecom_mapping: {
      event_source: string;
      flows: Record<string, {
        source_tab?: string;
        source_tabs?: string[];
        target: string;
        action: string;
      }>;
    };
  };
}

export const systemeConfig: SystemeConfig = {
  integration: "systeme_io",
  status: "connected",
  version: "1.0.0",
  systeme_io: {
    base_url: "https://api.systeme.io",
    api_key: "{{SYSTEME_API_KEY}}",
    enabled_features: {
      crm_sync: true,
      automation_workflows: true,
      client_management: true
    },
    crm_sync: {
      push_leads: true,
      push_clients: true,
      tag_by_compliance: true,
      fields: {
        client_id: "custom.client_id",
        company_name: "name",
        email: "email",
        phone: "phone",
        compliance_score: "custom.compliance_score",
        equipment_score: "custom.equipment_score",
        violations_count: "custom.violations_count",
        last_inspection: "custom.last_inspection"
      }
    },
    automation: {
      send_from_facility: true,
      trigger_events: {
        new_work_order: "/hooks/workorder",
        boiler_alert: "/hooks/boiler",
        chiller_alert: "/hooks/chiller",
        compliance_violation: "/hooks/violation",
        maintenance_due: "/hooks/maintenance"
      },
      actions: {
        create_tag: true,
        assign_workflow: true,
        add_to_campaign: true,
        send_followup_email: true
      }
    },
    client_management: {
      auto_create_portal_folder: true,
      send_dashboard_embed: true,
      assign_lms_courses: true,
      sync_contact_record: true,
      record_fields: {
        dashboard_url: "custom.dashboard_url",
        equipment_summary: "custom.equipment_summary",
        risk_profile: "custom.risk_profile",
        recommended_actions: "custom.recommended_actions"
      }
    },
    makecom_mapping: {
      event_source: "lovable",
      flows: {
        work_orders: {
          source_tab: "Work_Orders",
          target: "Systeme.io CRM",
          action: "create_task"
        },
        violations: {
          source_tab: "Violations",
          target: "Systeme.io",
          action: "tag_client"
        },
        equipment_logs: {
          source_tabs: ["BoilerLog", "ChillerLog", "Pump_Log"],
          target: "Systeme.io",
          action: "create_event"
        }
      }
    }
  }
};

export const externalApps = [
  {
    id: "compliance",
    name: "Compliance Bot",
    url: "https://suit-compliance-bot.lovable.app",
    healthEndpoint: "https://suit-compliance-bot.lovable.app"
  },
  {
    id: "equipment",
    name: "Equipment Intelligence",
    url: "https://nexum-insight-engine.lovable.app",
    healthEndpoint: "https://nexum-insight-engine.lovable.app"
  },
  {
    id: "lms",
    name: "LMS",
    url: "https://nexum-optimize-learn.lovable.app",
    healthEndpoint: "https://nexum-optimize-learn.lovable.app"
  },
  {
    id: "systeme",
    name: "Systeme.io Portal",
    url: "https://nexumsuum-clientportal.systeme.io/nxs-main-dash",
    healthEndpoint: "https://nexumsuum-clientportal.systeme.io"
  },
  {
    id: "admin",
    name: "Admin Portal (AWS)",
    url: "https://portal.nexumsuum.com/login",
    healthEndpoint: "https://portal.nexumsuum.com"
  }
];
