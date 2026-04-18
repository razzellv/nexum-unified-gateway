import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface FacilityInfo {
  facilityId: string;
  facilityName: string;
}

interface FacilityContextType {
  currentFacilityId: string;
  currentFacilityName: string;
  facilities: FacilityInfo[];
  switchFacility: (id: string, name: string) => void;
  isMultiFacility: boolean;
}

const FacilityContext = createContext<FacilityContextType>({
  currentFacilityId: 'facility-001',
  currentFacilityName: 'Main Campus',
  facilities: [],
  switchFacility: () => {},
  isMultiFacility: false,
});

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<FacilityInfo[]>([]);
  const [currentFacilityId, setCurrentFacilityId] = useState<string>('facility-001');
  const [currentFacilityName, setCurrentFacilityName] = useState<string>('Main Campus');

  useEffect(() => {
    if (!user) return;

    const defaultId = user.facilityId || user['custom:facilityId'] || 'facility-001';
    const stored = localStorage.getItem('nexum_active_facility_id');
    const storedName = localStorage.getItem('nexum_active_facility_name');

    setCurrentFacilityId(stored || defaultId);
    setCurrentFacilityName(storedName || localStorage.getItem('nexum_facility_name') || 'Main Campus');

    // Try to load facility list from API
    const tier = user.tier || '';
    const isMulti = ['business', 'premium', 'enterprise'].some(t => tier.toLowerCase().includes(t));
    if (isMulti) {
      loadFacilities(user.orgId || 'org-001');
    } else {
      // Single facility from JWT
      setFacilities([{ facilityId: defaultId, facilityName: storedName || 'Main Campus' }]);
    }
  }, [user?.facilityId]);

  async function loadFacilities(orgId: string) {
    try {
      const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token') || '';
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${baseUrl}/facilities?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: FacilityInfo[] = (data.facilities || data.items || []).map((f: any) => ({
          facilityId: f.facilityId || f.id,
          facilityName: f.facilityName || f.name || f.facilityId,
        }));
        if (list.length > 0) setFacilities(list);
      }
    } catch {
      // best-effort; fall back to localStorage
      const stored = localStorage.getItem('nexum_facilities');
      if (stored) {
        try { setFacilities(JSON.parse(stored)); } catch { /* ignore */ }
      }
    }
  }

  function switchFacility(id: string, name: string) {
    setCurrentFacilityId(id);
    setCurrentFacilityName(name);
    localStorage.setItem('nexum_active_facility_id', id);
    localStorage.setItem('nexum_active_facility_name', name);
    // Trigger a page reload so all data re-fetches with new facility
    window.location.reload();
  }

  const isMultiFacility = facilities.length > 1;

  return (
    <FacilityContext.Provider value={{ currentFacilityId, currentFacilityName, facilities, switchFacility, isMultiFacility }}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  return useContext(FacilityContext);
}
