import { createContext, useContext, useState, ReactNode } from 'react';
import { ViewRole, getRoleScope, RoleScope, ROLE_DEFINITIONS } from '@/lib/role-filters';

interface RoleContextType {
  currentRole: ViewRole;
  setCurrentRole: (role: ViewRole) => void;
  roleScope: RoleScope;
  canAccessApp: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<ViewRole>('executive');
  
  const roleScope = getRoleScope(currentRole);
  const canAccessApp = ROLE_DEFINITIONS[currentRole].canAccessApp;

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, roleScope, canAccessApp }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
