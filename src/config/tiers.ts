// ── NEXUM SUUM SUBSCRIPTION TIERS ─────────────────────────────────────────────────────────────────────────
// Central source of truth for all tier-based feature gating

export type SubscriptionTier =
  | 'trial'
  | 'basic' | 'standard' | 'business' | 'premium' | 'enterprise' | 'admin'
  | 'retail_starter' | 'retail_pro'
  | 'command_basic' | 'command_standard' | 'command_pro';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  price: number | 'quote';
  priceId?: string;
  description: string;
  maxFacilities: number | 'unlimited';
  maxUsers: number | 'unlimited';
  maxEquipment: number | 'unlimited';
  features: TierFeature[];
}

export type TierFeature =
  // Core facility
  | 'facility_data_source'
  | 'equipment_library'
  | 'work_orders'
  | 'violations_tracking'
  | 'basic_dashboards'
  | 'compliance_logging'
  | 'email_alerts'
  // Standard facility
  | 'inventory_library'
  | 'inventory_logger'
  | 'retail_inventory'
  | 'manager_dashboard'
  | 'supervisor_dashboard'
  | 'messages'
  | 'energy_dashboard'
  | 'kanban'
  | 'compliance_documents'
  // Business facility
  | 'operations_center'
  | 'decision_intelligence'
  | 'multi_facility'
  | 'equipment_metrics'
  | 'workload'
  | 'vendors'
  | 'calendar'
  | 'advanced_compliance'
  | 'mpcc'
  // Premium facility
  | 'executive_dashboard'
  | 'vvfi'
  | 'ai_compliance'
  | 'lms'
  | 'api_access'
  | 'priority_support'
  | 'audit_report'
  // Enterprise
  | 'white_label'
  | 'custom_integrations'
  | 'dedicated_manager'
  | 'custom_sla'
  | 'occae'
  // Retail
  | 'shelf_life_alerts'
  | 'health_inspection_score'
  | 'daily_checklists'
  | 'waste_tracking'
  | 'supplier_management'
  // Government / Public Safety
  | 'apparatus_tracking'
  | 'personnel_certs'
  | 'chain_of_custody'
  | 'response_metrics'
  | 'weapons_inventory'
  | 'compliance_reporting'
  // Facility Intelligence engines
  | 'facility_memory'
  | 'operational_dna'
  | 'event_integrity'
  | 'drift_intelligence'
  | 'system_violations'
  | 'dc_vault'
  // Project Controls / EVM
  | 'project_controls'
  // Decision Outcome Tracking™
  | 'decision_outcomes'
;

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  // ── Trial ──────────────────────────────────────────────────────────────────────────────
  trial: {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    description: '7-day trial — same features as Basic',
    maxFacilities: 2,
    maxUsers: 10,
    maxEquipment: 50,
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
    ],
  },
  // ── Facility tiers ──────────────────────────────────────────────────────────────────────
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 10788,
    priceId: 'price_1TAbJ4Dfw4bOR2dfEHzEs5qY',
    description: 'Core facility logging and visibility',
    maxFacilities: 2,
    maxUsers: 10,
    maxEquipment: 50,
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 23988,
    priceId: 'price_1TAbKQDfw4bOR2df9CbJymgf',
    description: 'Operations + inventory management',
    maxFacilities: 5,
    maxUsers: 25,
    maxEquipment: 200,
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
      'inventory_library', 'inventory_logger', 'retail_inventory',
      'manager_dashboard', 'supervisor_dashboard', 'messages',
      'energy_dashboard', 'kanban', 'compliance_documents', 'calendar',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 47988,
    priceId: 'price_1TAbNoDfw4bOR2dfepJUVort',
    description: 'Multi-facility + advanced intelligence',
    maxFacilities: 15,
    maxUsers: 50,
    maxEquipment: 'unlimited',
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
      'inventory_library', 'inventory_logger', 'retail_inventory',
      'manager_dashboard', 'supervisor_dashboard', 'messages',
      'energy_dashboard', 'kanban', 'compliance_documents',
      'operations_center', 'decision_intelligence', 'multi_facility',
      'equipment_metrics', 'workload', 'vendors', 'calendar',
      'advanced_compliance', 'mpcc',
      'facility_memory', 'event_integrity', 'drift_intelligence',
      'system_violations', 'project_controls',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 83988,
    priceId: 'price_1TAbPLDfw4bOR2dfeT4Posk4',
    description: 'Full platform intelligence — unlimited everything',
    maxFacilities: 'unlimited',
    maxUsers: 'unlimited',
    maxEquipment: 'unlimited',
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
      'inventory_library', 'inventory_logger', 'retail_inventory',
      'manager_dashboard', 'supervisor_dashboard', 'messages',
      'energy_dashboard', 'kanban', 'compliance_documents',
      'operations_center', 'decision_intelligence', 'multi_facility',
      'equipment_metrics', 'workload', 'vendors', 'calendar',
      'advanced_compliance', 'mpcc',
      'executive_dashboard', 'vvfi', 'ai_compliance', 'lms',
      'api_access', 'priority_support', 'audit_report',
      'facility_memory', 'operational_dna', 'event_integrity', 'drift_intelligence',
      'system_violations', 'dc_vault', 'project_controls', 'decision_outcomes',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'quote',
    description: 'Custom pricing based on team size, equipment, facilities',
    maxFacilities: 'unlimited',
    maxUsers: 'unlimited',
    maxEquipment: 'unlimited',
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
      'inventory_library', 'inventory_logger', 'retail_inventory',
      'manager_dashboard', 'supervisor_dashboard', 'messages',
      'energy_dashboard', 'kanban', 'compliance_documents',
      'operations_center', 'decision_intelligence', 'multi_facility',
      'equipment_metrics', 'workload', 'vendors', 'calendar',
      'advanced_compliance', 'mpcc',
      'executive_dashboard', 'vvfi', 'ai_compliance', 'lms',
      'api_access', 'priority_support', 'audit_report',
      'white_label', 'custom_integrations', 'dedicated_manager', 'custom_sla', 'occae',
      'facility_memory', 'operational_dna', 'event_integrity', 'drift_intelligence',
      'dc_vault', 'project_controls', 'decision_outcomes',
    ],
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    price: 0,
    description: 'Full platform access — developer and support',
    maxFacilities: 'unlimited',
    maxUsers: 'unlimited',
    maxEquipment: 'unlimited',
    features: [
      'facility_data_source', 'equipment_library', 'work_orders',
      'violations_tracking', 'basic_dashboards', 'compliance_logging', 'email_alerts',
      'inventory_library', 'inventory_logger', 'retail_inventory',
      'manager_dashboard', 'supervisor_dashboard', 'messages',
      'energy_dashboard', 'kanban', 'compliance_documents',
      'operations_center', 'decision_intelligence', 'multi_facility',
      'equipment_metrics', 'workload', 'vendors', 'calendar',
      'advanced_compliance', 'mpcc',
      'executive_dashboard', 'vvfi', 'ai_compliance', 'lms',
      'api_access', 'priority_support', 'audit_report',
      'white_label', 'custom_integrations', 'dedicated_manager', 'custom_sla', 'occae',
      'shelf_life_alerts', 'health_inspection_score', 'daily_checklists',
      'waste_tracking', 'supplier_management',
      'apparatus_tracking', 'personnel_certs', 'chain_of_custody',
      'response_metrics', 'weapons_inventory', 'compliance_reporting',
      'facility_memory', 'operational_dna', 'event_integrity', 'drift_intelligence',
      'system_violations', 'dc_vault', 'project_controls', 'decision_outcomes',
    ],
  },

  // ── Retail tiers ───────────────────────────────────────────────────────────────────────
  retail_starter: {
    id: 'retail_starter',
    name: 'Retail Starter',
    price: 197,
    priceId: 'price_1TGTF3Dfw4bOR2dfenLjfUMf',
    description: 'Essential retail compliance for single-location operations',
    maxFacilities: 1,
    maxUsers: 5,
    maxEquipment: 100,
    features: [
      'inventory_library', 'compliance_logging', 'email_alerts',
      'shelf_life_alerts', 'health_inspection_score', 'daily_checklists',
    ],
  },
  retail_pro: {
    id: 'retail_pro',
    name: 'Retail Pro',
    price: 297,
    priceId: 'price_1TGTIMDfw4bOR2dfWvWCGU87',
    description: 'Multi-location retail with supplier management and waste tracking',
    maxFacilities: 3,
    maxUsers: 10,
    maxEquipment: 500,
    features: [
      'inventory_library', 'compliance_logging', 'email_alerts',
      'shelf_life_alerts', 'health_inspection_score', 'daily_checklists',
      'waste_tracking', 'supplier_management', 'compliance_documents', 'manager_dashboard',
      'calendar', 'messages', 'kanban',
    ],
  },

  // ── Government / Public Safety tiers ──────────────────────────────────────────────
  command_basic: {
    id: 'command_basic',
    name: 'Command Basic',
    price: 4970,
    priceId: 'price_1TGTMYDfw4bOR2dfkANtaj0z',
    description: 'Core tools for public safety departments',
    maxFacilities: 1,
    maxUsers: 15,
    maxEquipment: 200,
    features: [
      'apparatus_tracking', 'personnel_certs', 'chain_of_custody',
      'equipment_library', 'work_orders', 'compliance_logging', 'email_alerts',
    ],
  },
  command_standard: {
    id: 'command_standard',
    name: 'Command Standard',
    price: 9970,
    priceId: 'price_1TGTNzDfw4bOR2df7EU4x1DQ',
    description: 'Response metrics and multi-unit coordination',
    maxFacilities: 5,
    maxUsers: 30,
    maxEquipment: 'unlimited',
    features: [
      'apparatus_tracking', 'personnel_certs', 'chain_of_custody',
      'equipment_library', 'work_orders', 'compliance_logging', 'email_alerts',
      'response_metrics', 'weapons_inventory', 'compliance_reporting',
      'inventory_library', 'compliance_documents',
      'calendar', 'messages', 'kanban',
    ],
  },
  command_pro: {
    id: 'command_pro',
    name: 'Command Pro',
    price: 19970,
    priceId: 'price_1TGTPGDfw4bOR2dfJZVGSrm5',
    description: 'Full platform for large public safety agencies',
    maxFacilities: 'unlimited',
    maxUsers: 'unlimited',
    maxEquipment: 'unlimited',
    features: [
      'apparatus_tracking', 'personnel_certs', 'chain_of_custody',
      'equipment_library', 'work_orders', 'compliance_logging', 'email_alerts',
      'response_metrics', 'weapons_inventory', 'compliance_reporting',
      'inventory_library', 'compliance_documents',
      'ai_compliance', 'lms', 'dedicated_manager',
      'operations_center', 'kanban', 'messages', 'vendors', 'calendar',
      'workload', 'violations_tracking', 'priority_support', 'project_controls', 'decision_outcomes',
    ],
  },
};

// ── Org-type specific features ──────────────────────────────────────────────────────────────────
// Retail/Govt orgs always retain access to their org-specific features,
// AND they inherit full facility tier features when they upgrade to
// standard / business / premium / enterprise.
const RETAIL_ORG_FEATURES: TierFeature[] = [
  'shelf_life_alerts', 'health_inspection_score', 'daily_checklists',
  'waste_tracking', 'supplier_management',
];
const GOVT_ORG_FEATURES: TierFeature[] = [
  'apparatus_tracking', 'personnel_certs', 'chain_of_custody',
  'response_metrics', 'weapons_inventory', 'compliance_reporting',
];
// Facility tiers that retail/govt can cross-upgrade into
const FACILITY_UPGRADE_TIERS: SubscriptionTier[] = ['standard', 'business', 'premium', 'enterprise'];

export type OrgType = 'facility' | 'retail' | 'government';

// ── TIER HOOK ───────────────────────────────────────────────────────────────────────────────
export function hasFeature(
  tier: SubscriptionTier | undefined,
  feature: TierFeature,
  orgType?: OrgType,
): boolean {
  if (!tier) return false;
  if (tier === 'admin') return true;

  // Retail orgs always have their specific features, regardless of tier
  if (orgType === 'retail' && RETAIL_ORG_FEATURES.includes(feature)) return true;

  // Govt orgs always have their specific features, regardless of tier
  if (orgType === 'government' && GOVT_ORG_FEATURES.includes(feature)) return true;

  // When retail/govt orgs upgrade to a facility tier (standard/business/premium/enterprise),
  // they get full facility tier access on top of their org features
  if (orgType === 'retail' || orgType === 'government') {
    if (FACILITY_UPGRADE_TIERS.includes(tier)) {
      return TIERS[tier]?.features.includes(feature) ?? false;
    }
  }

  return TIERS[tier]?.features.includes(feature) ?? false;
}

export function getTierFromRole(role: string, subscription?: string): SubscriptionTier {
  if (role === 'admin') return 'admin';
  if (subscription) return subscription as SubscriptionTier;
  const roleTierMap: Record<string, SubscriptionTier> = {
    executive: 'premium',
    director:  'business',
    manager:   'standard',
    supervisor:'standard',
    engineer:  'basic',
    operator:  'basic',
    technician:'basic',
    custodian: 'basic',
  };
  return roleTierMap[role] || 'basic';
}

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  trial:            'Free Trial',
  basic:            'Basic',
  standard:         'Standard',
  business:         'Business',
  premium:          'Premium',
  enterprise:       'Enterprise',
  admin:            'Admin',
  retail_starter:   'Retail Starter',
  retail_pro:       'Retail Pro',
  command_basic:    'Command Basic',
  command_standard: 'Command Standard',
  command_pro:      'Command Pro',
};

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  basic:            'text-muted-foreground border-border/40',
  standard:         'text-blue-400 border-blue-400/30',
  business:         'text-purple-400 border-purple-400/30',
  premium:          'text-yellow-400 border-yellow-400/30',
  enterprise:       'text-primary border-primary/30',
  admin:            'text-red-400 border-red-400/30',
  retail_starter:   'text-green-400 border-green-400/30',
  retail_pro:       'text-emerald-400 border-emerald-400/30',
  command_basic:    'text-blue-400 border-blue-400/30',
  command_standard: 'text-cyan-400 border-cyan-400/30',
  command_pro:      'text-purple-400 border-purple-400/30',
};

// Feature to tier mapping (what tier first unlocks a feature)
export const FEATURE_TIER: Record<TierFeature, SubscriptionTier> = {
  // Core facility
  facility_data_source:  'basic',
  equipment_library:     'basic',
  work_orders:           'basic',
  violations_tracking:   'basic',
  basic_dashboards:      'basic',
  compliance_logging:    'basic',
  email_alerts:          'basic',
  // Standard facility
  inventory_library:     'standard',
  inventory_logger:      'standard',
  retail_inventory:      'standard',
  manager_dashboard:     'standard',
  supervisor_dashboard:  'standard',
  messages:              'standard',
  energy_dashboard:      'standard',
  kanban:                'standard',
  compliance_documents:  'standard',
  // Business facility
  operations_center:     'business',
  decision_intelligence: 'business',
  multi_facility:        'business',
  equipment_metrics:     'business',
  workload:              'business',
  vendors:               'business',
  calendar:              'standard',
  advanced_compliance:   'business',
  mpcc:                  'business',
  // Premium facility
  executive_dashboard:   'premium',
  vvfi:                  'premium',
  ai_compliance:         'premium',
  lms:                   'premium',
  api_access:            'premium',
  priority_support:      'premium',
  audit_report:          'premium',
  // Enterprise
  white_label:           'enterprise',
  custom_integrations:   'enterprise',
  dedicated_manager:     'enterprise',
  custom_sla:            'enterprise',
  occae:                 'enterprise',
  // Retail
  shelf_life_alerts:     'retail_starter',
  health_inspection_score: 'retail_starter',
  daily_checklists:      'retail_starter',
  waste_tracking:        'retail_pro',
  supplier_management:   'retail_pro',
  // Government
  apparatus_tracking:    'command_basic',
  personnel_certs:       'command_basic',
  chain_of_custody:      'command_basic',
  response_metrics:      'command_standard',
  weapons_inventory:     'command_standard',
  compliance_reporting:  'command_standard',
  // Facility Intelligence engines
  facility_memory:       'business',
  operational_dna:       'premium',
  event_integrity:       'business',
  drift_intelligence:    'business',
  system_violations:     'business',
  dc_vault:              'premium',
  // Project Controls / EVM
  project_controls:      'business',
  // Decision Outcome Tracking™
  decision_outcomes:     'premium',
};
