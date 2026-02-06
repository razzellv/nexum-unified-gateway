import { useState, useEffect } from 'react';
import { getRecentEquipment } from '@/lib/nexum-api';
import { Facility, Building, SystemInfo, SystemType } from '@/types/logging';

// Map equipment types from API to our SystemType
const mapEquipmentType = (apiType: string): SystemType | null => {
  const typeMap: Record<string, SystemType> = {
    'boiler': 'boiler',
    'boilers': 'boiler',
    'chiller': 'chiller',
    'chillers': 'chiller',
    'pump': 'pump',
    'pumps': 'pump',
    'compressor': 'pump',
    'ahu': 'ahu',
    'air_handler': 'ahu',
    'rtu': 'ahu',
    'cooling_tower': 'tower',
    'tower': 'tower',
  };
  return typeMap[apiType?.toLowerCase()] || null;
};

export function useFacilityEquipment() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all equipment (not just recent)
        const data = await getRecentEquipment(365); // Get all equipment from last year
        const equipment = data.equipment || data.items || data || [];
        
        console.log('🏗️ Building facility structure from equipment:', equipment);

        // Group equipment by facility and building
        const facilityMap = new Map<string, Facility>();

        equipment.forEach((item: any) => {
          const facilityId = item.facilityId || item.facility_id || 'facility-001';
          const buildingId = item.buildingId || item.building_id || 'bld-001';
          const buildingName = item.buildingName || item.building_name || 'Main Building';
          
          // Get or create facility
          let facility = facilityMap.get(facilityId);
          if (!facility) {
            facility = {
              id: facilityId,
              name: item.facilityName || item.facility_name || 'Main Campus',
              buildings: [],
            };
            facilityMap.set(facilityId, facility);
          }

          // Get or create building
          let building = facility.buildings.find(b => b.id === buildingId);
          if (!building) {
            building = {
              id: buildingId,
              name: buildingName,
              systems: [],
            };
            facility.buildings.push(building);
          }

          // Map equipment type
          const systemType = mapEquipmentType(item.type || item.equipmentType);
          if (!systemType) {
            console.warn('⚠️ Unknown equipment type:', item.type);
            return;
          }

          // Create system from equipment
          const system: SystemInfo = {
            id: item.equipmentId || item.id,
            assetTag: item.assetTag || item.equipmentId || item.id,
            type: systemType,
            name: item.name || `${item.manufacturer} ${item.model}` || item.equipmentId,
            location: item.location || 'Not specified',
          };

          // Add to building if not duplicate
          if (!building.systems.find(s => s.id === system.id)) {
            building.systems.push(system);
          }
        });

        const facilitiesList = Array.from(facilityMap.values());
        
        // Add energy system to each building
        facilitiesList.forEach(facility => {
          facility.buildings.forEach(building => {
            // Add energy/utilities option if not present
            if (!building.systems.find(s => s.type === 'energy')) {
              building.systems.push({
                id: `${building.id}-energy`,
                assetTag: 'ENERGY',
                type: 'energy',
                name: 'Energy & Utilities',
                location: 'Building Level',
              });
            }
          });
        });

        console.log('✅ Built facility structure:', facilitiesList);
        setFacilities(facilitiesList);
        
      } catch (err) {
        console.error('❌ Error fetching equipment:', err);
        setError('Failed to load equipment');
        // Return empty array on error - SystemSelector will show "no equipment" message
        setFacilities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  return { facilities, loading, error };
}
