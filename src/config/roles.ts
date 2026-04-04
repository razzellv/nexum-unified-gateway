export const ROLES_BY_ORG_TYPE = {
  facility: {
    leadership: ['executive', 'director', 'manager', 'supervisor'],
    staff: ['engineer', 'operator', 'technician', 'custodian', 'employee'],
  },
  retail: {
    leadership: ['owner', 'manager', 'shift_lead'],
    staff: ['associate', 'clerk', 'cook', 'cashier', 'cs_associate'],
  },
  government: {
    leadership: ['chief', 'director', 'lieutenant', 'captain'],
    staff: ['officer', 'firefighter', 'dispatcher', 'ems_tech', 'personnel'],
  },
};

export const DEPARTMENTS = [
  'Operations', 'Maintenance', 'Utilities', 'Compliance',
  'Training', 'Security', 'Fleet', 'Dispatch', 'EMS', 'Patrol', 'All',
];

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  executive:   'Executive',
  director:    'Director',
  manager:     'Manager',
  supervisor:  'Supervisor',
  engineer:    'Engineer',
  operator:    'Operator',
  technician:  'Technician',
  custodian:   'Custodian',
  employee:    'Employee',
  owner:       'Owner',
  shift_lead:  'Shift Lead',
  associate:   'Associate',
  clerk:       'Clerk',
  cook:        'Cook',
  cashier:     'Cashier',
  cs_associate:'CS Associate',
  chief:       'Chief',
  lieutenant:  'Lieutenant',
  captain:     'Captain',
  officer:     'Officer',
  firefighter: 'Firefighter',
  dispatcher:  'Dispatcher',
  ems_tech:    'EMS Technician',
  personnel:   'Personnel',
  admin:       'Admin',
};

/** All roles for a given org type (leadership + staff), or all if orgType unknown */
export function getRolesForOrgType(orgType: string): string[] {
  const org = ROLES_BY_ORG_TYPE[orgType as keyof typeof ROLES_BY_ORG_TYPE];
  if (!org) {
    return [
      ...ROLES_BY_ORG_TYPE.facility.leadership,
      ...ROLES_BY_ORG_TYPE.facility.staff,
    ];
  }
  return [...org.leadership, ...org.staff];
}

/** Check if a role is leadership for the given org type */
export function isLeadershipRole(role: string, orgType: string): boolean {
  const org = ROLES_BY_ORG_TYPE[orgType as keyof typeof ROLES_BY_ORG_TYPE];
  if (!org) {
    return ROLES_BY_ORG_TYPE.facility.leadership.includes(role);
  }
  return org.leadership.includes(role);
}
