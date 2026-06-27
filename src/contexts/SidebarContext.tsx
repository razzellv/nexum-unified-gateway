import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDevice } from '@/hooks/use-device';

const STORAGE_KEY = 'nexum_sidebar_collapsed';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const device = useDevice();

  // Desktop: restore from localStorage (default expanded); mobile/tablet: always collapsed
  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (device !== 'desktop') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : false;
  });

  // When device changes, override: non-desktop forces collapsed;
  // desktop restores the last saved preference
  useEffect(() => {
    if (device !== 'desktop') {
      setCollapsedState(true);
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      setCollapsedState(stored !== null ? stored === 'true' : false);
    }
  }, [device]);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    // Persist desktop preference; on mobile the state is ephemeral
    if (device === 'desktop') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  };

  const toggle = () => setCollapsed(!collapsed);

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
