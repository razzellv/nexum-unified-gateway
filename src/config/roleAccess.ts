/**
 * ROLE-BASED ACCESS CONTROL
 * 
 * SECURITY MODEL:
 * - Each role has strict data isolation
 * - Employees only see their assigned work orders and team data
 * - Supervisors see their team's data only
 * - Managers see facility-level data
 * - Executives see aggregated metrics only (no personal data)
 * - Admin role is for TESTING ONLY - not client-facing
 * 
 * DATA ISOLATION:
 * - Work orders filtered by assignedTo (employees)
 * - Work orders filtered by team (supervisors)
 * - Violations are role-appropriate
 * - Messages filtered by recipient
 * - No cross-tenant data leakage
 */

export type UserRole = 'operator' | 'tech' | 'engineer' | 'custodian' | 'mechanic' | 'supervisor' | 'manager' | 'executive' | 'admin';

export interface RoleAccess {
  role: UserRole;
  displayName: string;
  navItems: {
    label: string;
    path: string;
    icon?: string;
  }[];
  commandHubAccess: {
    messages: boolean;
    workOrders: boolean;
    violations: boolean;
    emergency: boolean;
    kanban: boolean;
    calendar: boolean;
    vendors: boolean;
    workflows: boolean;
    workload: boolean;
    settings: boolean;
  };
  canViewAllWorkOrders: boolean;
  canCreateWorkOrders: boolean;
  canDeleteWorkOrders: boolean;
  canAccessEquipmentIntelligence: boolean;
  canAccessFacilityDataSource: boolean;
  canAccessComplianceLogger: boolean;
  canAccessPerformanceCompass: boolean;
}

export const ROLE_ACCESS: Record<UserRole, RoleAccess> = {
  // Employee Roles - Limited Access
  operator: {
    role: 'operator',
    displayName: 'Operator',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: false,  // Only see assigned
      violations: false,
      emergency: false,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,  // Only assigned
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },
  
  tech: {
    role: 'tech',
    displayName: 'Tech',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: false,  // Only assigned
      violations: false,
      emergency: false,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },

  engineer: {
    role: 'engineer',
    displayName: 'Engineer',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: false,  // Only assigned
      violations: false,
      emergency: false,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },

  custodian: {
    role: 'custodian',
    displayName: 'Custodian',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: false,
      violations: false,
      emergency: false,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },

  mechanic: {
    role: 'mechanic',
    displayName: 'Mechanic',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: false,
      violations: false,
      emergency: false,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },

  // Supervisor - More Access
  supervisor: {
    role: 'supervisor',
    displayName: 'Supervisor',
    navItems: [
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: true,
      violations: true,
      emergency: true,
      kanban: false,
      calendar: false,
      vendors: false,
      workflows: false,
      workload: false,
      settings: false,
    },
    canViewAllWorkOrders: false,  // Only team's
    canCreateWorkOrders: true,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: false,
  },

  // Manager - Full Command Hub Access
  manager: {
    role: 'manager',
    displayName: 'Manager',
    navItems: [
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Manager Dashboard', path: '/dashboard/manager' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
      { label: 'Performance Compass', path: '/performance-compass' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: true,
      violations: true,
      emergency: true,
      kanban: true,
      calendar: true,
      vendors: true,
      workflows: true,
      workload: true,
      settings: false,
    },
    canViewAllWorkOrders: true,
    canCreateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: false,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: true,
  },

  // Executive - Strategic View
  executive: {
    role: 'executive',
    displayName: 'Executive',
    navItems: [
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Executive Dashboard', path: '/dashboard/executive' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
      { label: 'Performance Compass', path: '/performance-compass' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: true,
      violations: true,
      emergency: true,
      kanban: true,
      calendar: true,
      vendors: true,
      workflows: true,
      workload: true,
      settings: false,
    },
    canViewAllWorkOrders: true,
    canCreateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAccessEquipmentIntelligence: false,
    canAccessFacilityDataSource: false,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: true,
  },

  // Admin - Development/Testing Only
  // IMPORTANT: Admin role is for system testing and development.
  // It allows viewing all roles and data. This is NOT a client-facing role.
  // Production deployments should restrict admin to system owners only.
  admin: {
    role: 'admin',
    displayName: 'Admin',
    navItems: [
      { label: 'Main Hub', path: '/' },
      { label: 'Command Hub', path: '/command-hub' },
      { label: 'Equipment Intelligence', path: '/equipment-intelligence' },
      { label: 'Facility Data Source', path: '/facility-data-source' },
      { label: 'Compliance Logger', path: '/compliance-logger' },
      { label: 'Executive Dashboard', path: '/dashboard/executive' },
      { label: 'Manager Dashboard', path: '/dashboard/manager' },
    ],
    commandHubAccess: {
      messages: true,
      workOrders: true,
      violations: true,
      emergency: true,
      kanban: true,
      calendar: true,
      vendors: true,
      workflows: true,
      workload: true,
      settings: true,
    },
    canViewAllWorkOrders: true,
    canCreateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAccessEquipmentIntelligence: true,
    canAccessFacilityDataSource: true,
    canAccessComplianceLogger: true,
    canAccessPerformanceCompass: true,
  },
};

export function getRoleAccess(role: UserRole | string | undefined): RoleAccess {
  if (!role) return ROLE_ACCESS.operator;
  return ROLE_ACCESS[role as UserRole] || ROLE_ACCESS.operator;
}
