import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Facility, Building, SystemInfo, SystemType } from '@/types/logging';

const mapEquipmentType = (apiType: string): SystemType | null => {
  const typeMap: Record<string, SystemType> = {
    'boiler': 'boiler', 'boilers': 'boiler',
    'chiller': 'chiller', 'chillers': 'chiller',
    'pump': 'pump', 'pumps': 'pump', 'compressor': 'pump',
    'ahu': 'ahu', 'air_handler': 'ahu', 'rtu': 'ahu', 'air handler': 'ahu',
    'cooling_tower': 'tower', 'tower': 'tower', 'cooling tower': 'tower',
    'fan': 'ahu', 'vav': 'ahu', 'heat_exchanger': 'pump',
  };
  return typeMap[apiType?.toLowerCase()] || null;
};

function buildSystemName(item: any): string {
  const clean = (str: string) => {
    if (!str) return '';
    return str.replace(/\*\*/g, '').replace(/™/g, '').replace(/®/g, '').split('(')[0].trim();
  };
  const mfr = clean(item.manufacturer);
  const mdl = clean(item.model);
  const equipId = item.equipmentId || item.id || '';
  const invalid = (s: string) => !s || ['information','not','unknown','number','n/a'].some(b => s.toLowerCase().includes(b));
  const typeLabel = item.equipmentType
    ? item.equipmentType.charAt(0).toUpperCase() + item.equipmentType.slice(1).replace(/_/g, ' ')
    : 'Equipment';
  const shortId = equipId.includes('-') ? equipId.split('-').pop() : equipId.slice(-6);
  const parts = [typeLabel];
  if (!invalid(mfr)) parts.push(`(${mfr}${!invalid(mdl) ? ' ' + mdl : ''})`);
  parts.push(`[${shortId}]`);
  return parts.join(' ');
}

export function useFacilityEquipment() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.facilityId) return;
    fetchData();
  }, [user?.facilityId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };
      const facilityId = user!.facilityId;

      // Load buildings (with graceful fallback)
      let buildingsList: any[] = [];
      try {
        const bRes = await fetch(`${baseUrl}/buildings?facilityId=${facilityId}`, { headers });
        if (bRes.ok) {
          const bData = await bRes.json();
          buildingsList = bData.buildings || [];
        }
      } catch (_) {}

      // Load equipment
      let equipmentList: any[] = [];
      try {
        const eRes = await fetch(`${baseUrl}/equipment?facilityId=${facilityId}&days=365`, { headers });
        if (eRes.ok) {
          const eData = await eRes.json();
          equipmentList = eData.equipment || eData.items || [];
        }
      } catch (_) {}

      console.log(`Buildings: ${buildingsList.length}, Equipment: ${equipmentList.length}`);

      // If no buildings — group all equipment under one default building
      if (buildingsList.length === 0) {
        const systems: SystemInfo[] = equipmentList
          .map((item: any) => {
            const sysType = mapEquipmentType(item.equipmentType || item.type);
            if (!sysType) return null;
            return {
              id: item.equipmentId || item.id,
              assetTag: item.equipmentId || item.id,
              type: sysType,
              name: buildSystemName(item),
              location: item.zone || item.floor || item.location || 'Main Building',
            } as SystemInfo;
          })
          .filter(Boolean) as SystemInfo[];

        // Always include energy
        systems.push({
          id: 'default-energy',
          assetTag: 'ENERGY',
          type: 'energy',
          name: 'Energy & Utilities',
          location: 'Building Level',
        });

        const facility: Facility = {
          id: facilityId,
          name: user!.facilityName || 'Main Facility',
          buildings: [{
            id: 'main-building',
            name: 'Main Building',
            systems,
          }],
        };
        setFacilities([facility]);
        return;
      }

      // Buildings exist — map equipment to buildings
      const facility: Facility = {
        id: facilityId,
        name: user!.facilityName || 'Main Facility',
        buildings: buildingsList.map((bld: any) => {
          const bldEquipment = equipmentList.filter((e: any) =>
            e.buildingId === bld.buildingId ||
            e.location?.toLowerCase().includes(bld.name?.toLowerCase()) ||
            (!e.buildingId)
          );

          const systems: SystemInfo[] = bldEquipment
            .map((item: any) => {
              const sysType = mapEquipmentType(item.equipmentType || item.type);
              if (!sysType) return null;
              return {
                id: item.equipmentId || item.id,
                assetTag: item.equipmentId || item.id,
                type: sysType,
                name: buildSystemName(item),
                location: item.zone || item.floor || item.location || bld.name,
              } as SystemInfo;
            })
            .filter(Boolean) as SystemInfo[];

          // Always include energy per building
          systems.push({
            id: `${bld.buildingId}-energy`,
            assetTag: 'ENERGY',
            type: 'energy',
            name: 'Energy & Utilities',
            location: 'Building Level',
          });

          return { id: bld.buildingId, name: bld.name, systems } as Building;
        }),
      };

      setFacilities([facility]);
    } catch (err) {
      console.error('Error fetching facility data:', err);
      setError('Failed to load facility data');
      // Provide minimal fallback so UI doesn't break
      setFacilities([{
        id: user!.facilityId,
        name: 'Main Facility',
        buildings: [{
          id: 'fallback',
          name: 'Main Building',
          systems: [{
            id: 'fallback-energy',
            assetTag: 'ENERGY',
            type: 'energy',
            name: 'Energy & Utilities',
            location: 'Building Level',
          }],
        }],
      }]);
    } finally {
      setLoading(false);
    }
  };

  return { facilities, loading, error };
}
