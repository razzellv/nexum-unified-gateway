import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDevice } from '@/hooks/use-device';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const device = useDevice();
  // desktop: expanded by default; mobile/tablet: collapsed by default
  const [collapsed, setCollapsed] = useState(device !== 'desktop');

  useEffect(() => {
    if (device === 'desktop') setCollapsed(false);
    else setCollapsed(true);
  }, [device]);

  const toggle = () => setCollapsed(c => !c);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
}
