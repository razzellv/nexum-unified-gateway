import { createContext, useContext, useState, ReactNode } from 'react';

interface RetailContextType {
  isRetailMode: boolean;
  toggleRetailMode: () => void;
  storeInfo: { name: string; type: string; locations: number };
  setStoreInfo: (info: any) => void;
}

const RetailContext = createContext<RetailContextType>({
  isRetailMode: false,
  toggleRetailMode: () => {},
  storeInfo: { name: '', type: 'retail', locations: 1 },
  setStoreInfo: () => {},
});

export function RetailProvider({ children }: { children: ReactNode }) {
  const [isRetailMode, setIsRetailMode] = useState(() => {
    return localStorage.getItem('nexum_retail_mode') === 'true';
  });
  const [storeInfo, setStoreInfoState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexum_store_info') || '{"name":"","type":"retail","locations":1}'); } catch { return { name: '', type: 'retail', locations: 1 }; }
  });

  const toggleRetailMode = () => {
    const next = !isRetailMode;
    setIsRetailMode(next);
    localStorage.setItem('nexum_retail_mode', String(next));
  };

  const setStoreInfo = (info: any) => {
    setStoreInfoState(info);
    localStorage.setItem('nexum_store_info', JSON.stringify(info));
  };

  return (
    <RetailContext.Provider value={{ isRetailMode, toggleRetailMode, storeInfo, setStoreInfo }}>
      {children}
    </RetailContext.Provider>
  );
}

export const useRetail = () => useContext(RetailContext);
