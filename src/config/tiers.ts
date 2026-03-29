// ── NEXUM SUUM SUBSCRIPTION TIERS ────────────────────────────────────────────
// Central source of truth for all tier-based feature gating

export type SubscriptionTier = 'basic' | 'standard' | 'business' | 'premium' | 'enterprise' | 'admin';

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
  // Core
  | 'facility_data_source'
  | 'equipment_library'
  | 'work_orders'
  | 'violations_tracking'
  | 'basic_dashboards'
  | 'compliance_logging'
  | 'email_alerts'
  // Standard
  | 'inventory_library'
  | 'inventory_logger'
  | 'retail_inventory'
  | 'manager_dashboard'
  | 'supervisor_dashboard'
  | 'messages'
  | 'energy_dashboard'
  | 'kanban'
  | 'compliance_documents'
  // Business
  | 'operations_center'
  | 'decision_intelligence'
  | 'multi_facility'
  | 'equipment_metrics'
  | 'workload'
  | 'vendors'
  | 'calendar'
  | 'advanced_compliance'
  | 'mpcc'
  // Premium
  | 'executive_dashboard'
  | 'vvfi'
  | 'ai_compliance'
  | 'lms'
  | 'api_access'
  | 'priority_support'
  // Enterprise
  | 'white_label'
  | 'custom_integrations'
  | 'dedicated_manager'
  | 'custom_sla';

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 899,
    priceId: 'price_1TAbKQDfw4bOR2df9CbJymgf',
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
    price: 1999,
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
      'energy_dashboard', 'kanban', 'compliance_documents',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 3999,
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
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 6999,
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
      'api_access', 'priority_support',
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
      'api_access', 'priority_support',
      'white_label', 'custom_integrations', 'dedicated_manager', 'custom_sla',
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
      'api_access', 'priority_support',
      'white_label', 'custom_integrations', 'dedicated_manager', 'custom_sla',
    ],
  },
};

// ── TIER HOOK ─────────────────────────────────────────────────────────────────
export function hasFeature(tier: SubscriptionTier | undefined, feature: TierFeature): boolean {
  if (!tier) return false;
  if (tier === 'admin') return true;
  return TIERS[tier]?.features.includes(feature) ?? false;
}

export function getTierFromRole(role: string, subscription?: string): SubscriptionTier {
  if (role === 'admin') return 'admin';
  if (subscription) return subscription as SubscriptionTier;
  // Default tier based on role if no subscription set
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
  basic:      'Basic',
  standard:   'Standard',
  business:   'Business',
  premium:    'Premium',
  enterprise: 'Enterprise',
  admin:      'Admin',
};

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  basic:      'text-muted-foreground border-border/40',
  standard:   'text-blue-400 border-blue-400/30',
  business:   'text-purple-400 border-purple-400/30',
  premium:    'text-yellow-400 border-yellow-400/30',
  enterprise: 'text-primary border-primary/30',
  admin:      'text-red-400 border-red-400/30',
};

// Feature to tier mapping (what tier first unlocks a feature)
export const FEATURE_TIER: Record<TierFeature, SubscriptionTier> = {
  facility_data_source:  'basic',
  equipment_library:     'basic',
  work_orders:           'basic',
  violations_tracking:   'basic',
  basic_dashboards:      'basic',
  compliance_logging:    'basic',
  email_alerts:          'basic',
  inventory_library:     'standard',
  inventory_logger:      'standard',
  retail_inventory:      'standard',
  manager_dashboard:     'standard',
  supervisor_dashboard:  'standard',
  messages:              'standard',
  energy_dashboard:      'standard',
  kanban:                'standard',
  compliance_documents:  'standard',
  operations_center:     'business',
  decision_intelligence: 'business',
  multi_facility:        'business',
  equipment_metrics:     'business',
  workload:              'business',
  vendors:               'business',
  calendar:              'business',
  advanced_compliance:   'business',
  mpcc:                  'business',
  executive_dashboard:   'premium',
  vvfi:                  'premium',
  ai_compliance:         'premium',
  lms:                   'premium',
  api_access:            'premium',
  priority_support:      'premium',
  white_label:           'enterprise',
  custom_integrations:   'enterprise',
  dedicated_manager:     'enterprise',
  custom_sla:            'enterprise',
};
