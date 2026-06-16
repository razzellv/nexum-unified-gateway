import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Facility, Building, SystemInfo, SystemType } from '@/types/logging';

const mapEquipmentType = (apiType: string): SystemType | null => {
  const typeMap: Record<string, SystemType> = {
    // ── Existing ──────────────────────────────────────────────────────────
    'boiler': 'boiler', 'boilers': 'boiler',
    'chiller': 'chiller', 'chillers': 'chiller',
    'pump': 'pump', 'pumps': 'pump', 'compressor': 'pump',
    'ahu': 'ahu', 'air_handler': 'ahu', 'rtu': 'ahu', 'air handler': 'ahu',
    'cooling_tower': 'tower', 'tower': 'tower', 'cooling tower': 'tower',
    'fan': 'ahu', 'vav': 'ahu',
    // ── New ───────────────────────────────────────────────────────────────
    'heat_exchanger': 'heat_exchanger', 'heat exchanger': 'heat_exchanger',
    'hot_water_heater': 'hot_water_heater', 'hot water heater': 'hot_water_heater',
    'turbine': 'turbine',
    'condensate_system': 'condensate_system', 'condensate system': 'condensate_system',
    'generator': 'generator',
    'ro_system': 'ro_system', 'ro system': 'ro_system',
    'wfi_system': 'wfi_system', 'wfi system': 'wfi_system',
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
    if (!user) return;
    fetchData();
  }, [user?.sub]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const idToken = localStorage.getItem('nexum_id_token');
      const accessToken = localStorage.getItem('nexum_access_token');
      const token = idToken || accessToken;
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };
      const facilityId = user?.facilityId || 'facility-001';
      console.log('useFacilityEquipment: using facilityId =', facilityId);

      let buildingsList: any[] = [];
      try {
        const bRes = await fetch(`${baseUrl}/buildings?facilityId=${facilityId}`, { headers });
        if (bRes.ok) {
          const bData = await bRes.json();
          buildingsList = bData.buildings || [];
        }
      } catch (_) {}

      let equipmentList: any[] = [];
      try {
        const eRes = await fetch(`${baseUrl}/equipment`, { headers });
        if (eRes.ok) {
          const eData = await eRes.json();
          equipmentList = eData.equipment || eData.items || [];
        }
      } catch (_) {}

      console.log(`Buildings: ${buildingsList.length}, Equipment: ${equipmentList.length}, facilityId: ${facilityId}`);

      const buildSystems = (items: any[], buildingName: string): SystemInfo[] => {
        return items
          .map((item: any) => {
            const sysType = mapEquipmentType(item.equipmentType || item.type);
            if (!sysType) return null;
            return {
              id: item.equipmentId || item.id,
              assetTag: item.equipmentId || item.id,
              type: sysType,
              name: item.equipmentName || buildSystemName(item),
              location: item.zone || item.floor || item.location || buildingName,
            } as SystemInfo;
          })
          .filter(Boolean) as SystemInfo[];
      };

      if (buildingsList.length === 0) {
        const systems = buildSystems(equipmentList, 'Main Building');
        systems.push({
          id: 'default-energy',
          assetTag: 'ENERGY',
          type: 'energy',
          name: 'Energy & Utilities',
          location: 'Building Level',
        });
        setFacilities([{
          id: facilityId,
          name: user?.facilityName || 'Main Facility',
          buildings: [{ id: 'main-building', name: 'Main Building', systems }],
        }]);
        return;
      }

      const assignedIds = new Set<string>();
      const buildingEquipment: Record<string, any[]> = {};

      buildingsList.forEach((bld: any) => {
        buildingEquipment[bld.buildingId] = equipmentList.filter((e: any) => {
          if (e.buildingId === bld.buildingId) {
            assignedIds.add(e.equipmentId || e.id);
            return true;
          }
          if (e.location?.toLowerCase().includes(bld.name?.toLowerCase())) {
            assignedIds.add(e.equipmentId || e.id);
            return true;
          }
          return false;
        });
      });

      const unassigned = equipmentList.filter(e => !assignedIds.has(e.equipmentId || e.id));
      if (unassigned.length > 0 && buildingsList.length > 0) {
        buildingEquipment[buildingsList[0].buildingId] = [
          ...(buildingEquipment[buildingsList[0].buildingId] || []),
          ...unassigned,
        ];
      }

      const facility: Facility = {
        id: facilityId,
        name: user?.facilityName || 'Main Facility',
        buildings: buildingsList.map((bld: any) => {
          const bldItems = buildingEquipment[bld.buildingId] || [];
          const systems = buildSystems(bldItems, bld.name);
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
      setFacilities([{
        id: 'facility-001',
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
