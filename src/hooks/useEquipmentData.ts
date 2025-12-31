import { useQuery } from '@tanstack/react-query';
import { getMetrics, MetricsResponse } from '../services/facilityApi';

interface UseEquipmentDataOptions {
  facilityId: string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function useEquipmentData({
  facilityId,
  startDate,
  endDate,
  enabled = true,
}: UseEquipmentDataOptions) {
  return useQuery<MetricsResponse>({
    queryKey: ['equipment-metrics', facilityId, startDate, endDate],
    queryFn: () => getMetrics(facilityId, startDate, endDate),
    enabled: enabled && !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
