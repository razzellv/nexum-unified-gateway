import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/equipment-api';

export const useEquipmentReadings = (equipmentId: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['equipment-readings', equipmentId, limit],
    queryFn: () => api.getEquipmentReadings(equipmentId, limit),
    enabled: !!equipmentId,
  });
};

export const useCreateEquipmentReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createEquipmentReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-readings'] });
    },
  });
};
