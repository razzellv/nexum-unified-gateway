import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Facility, Building, SystemInfo, SystemType } from '@/types/logging';

const mapEquipmentType = (apiType: string): SystemType | null => {
  const typeMap: Record<string, SystemType> = {
    'boiler': 'boiler', 'boilers': 'boiler',
    'chiller': 'chiller', 'chillers': 'chiller',
    'pump': 'pump', 'pumps': 'pump', 'compressor': 'pump',
    'ahu': 'ahu', 'air_handler': 'ahu', 'rtu': 'ahu',
    'cooling_tower': 'tower', 'tower': 'tower',
  };
  return typeMap[apiType?.toLowerCase()] || null;
};

export function useFacilityEquipment() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.facilityId) return;
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('nexum_access_token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const headers = { Authorization: 'Bearer ' + token };

        // Step 1: Load buildings
        const buildingsRes = await fetch(
          baseUrl + '/buildings?facilityId=' + user.facilityId,
          { headers }
        );
        const buildingsData = await buildingsRes.json();
        const buildingsList = buildingsData.buildings || [];

        console.log('Buildings loaded:', buildingsList.length);

        // Step 2: Load equipment
        const equipmentRes = await fetch(
          baseUrl + '/equipment?facilityId=' + user.facilityId + '&days=365',
          { headers }
        );
        const equipmentData = await equipmentRes.json();
        const equipmentList = equipmentData.equipment || equipmentData.items || [];

        console.log('Equipment loaded:', equipmentList.length);

        // Step 3: Build facility structure
        const facility: Facility = {
          id: user.facilityId,
          name: user.facilityName || 'Main Facility',
          buildings: buildingsList.map((bld: any) => {
            // Filter equipment for this building
            const bldEquipment = equipmentList.filter((e: any) =>
              e.buildingId === bld.buildingId || (!e.buildingId && bld.buildingId === buildingsList[0]?.buildingId)
            );

            const systems: SystemInfo[] = bldEquipment
              .map((item: any) => {
                const systemType = mapEquipmentType(item.equipmentType || item.type);
                if (!systemType) return null;
                
                return {
                  id: item.equipmentId || item.id,
                  assetTag: item.equipmentId || item.id,
                  type: systemType,
                  name: (() => {
                    // Clean helper function
                    const clean = (str: string) => {
                      if (!str) return '';
                      return str
                        .replace(/\*\*/g, '')
                        .replace(/™/g, '')
                        .replace(/®/g, '')
                        .split('(')[0]
                        .trim();
                    };

                    const mfr = clean(item.manufacturer);
                    const mdl = clean(item.model);
                    const equipId = item.equipmentId || item.id || '';
                    
                    // Skip generic/invalid manufacturers
                    const invalidMfr = !mfr || 
                                       mfr.toLowerCase().includes('information') || 
                                       mfr.toLowerCase().includes('not') ||
                                       mfr.toLowerCase().includes('unknown');
                    
                    // Skip generic/invalid models
                    const invalidMdl = !mdl || 
                                       mdl.toLowerCase().includes('information') || 
                                       mdl.toLowerCase().includes('not') ||
                                       mdl.toLowerCase().includes('number');

                    // Build display name
                    const parts = [];
                    
                    // Add type
                    const typeLabel = item.equipmentType 
                      ? item.equipmentType.charAt(0).toUpperCase() + item.equipmentType.slice(1)
                      : 'Equipment';
                    parts.push(typeLabel);
                    
                    // Add manufacturer if valid
                    if (!invalidMfr) {
                      parts.push(`(${mfr})`);
                    }
                    
                    // Add equipment ID
                    const shortId = equipId.includes('-') 
                      ? equipId.split('-').pop() 
                      : equipId.slice(-6);
                    parts.push(`[${shortId}]`);
                    
                    return parts.join(' ');
                  })(),
                  location: item.zone || item.floor || item.location || bld.name,
                };
              })
              .filter(Boolean) as SystemInfo[];

            // Always add energy option
            systems.push({
              id: bld.buildingId + '-energy',
              assetTag: 'ENERGY',
              type: 'energy',
              name: 'Energy & Utilities',
              location: 'Building Level',
            });

            return {
              id: bld.buildingId,
              name: bld.name,
              systems,
            } as Building;
          }),
        };

        // If no buildings, create default
        if (facility.buildings.length === 0) {
          facility.buildings = [{
            id: 'default',
            name: 'Main Building',
            systems: [{
              id: 'default-energy',
              assetTag: 'ENERGY',
              type: 'energy',
              name: 'Energy & Utilities',
              location: 'Building Level',
            }],
          }];
        }

        setFacilities([facility]);
        console.log('Facility structure built:', facility);

      } catch (err) {
        console.error('Error fetching facility data:', err);
        setError('Failed to load facility data');
        setFacilities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.facilityId]);

  return { facilities, loading, error };
}
