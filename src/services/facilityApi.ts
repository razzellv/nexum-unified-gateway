import { metricsApi } from '@/utils/api';

export interface MetricsResponse {
  facilityId: string;
  startDate?: string;
  endDate?: string;
  metrics: Array<{
    systemId: string;
    systemType: string;
    count: number;
    lastReading?: string;
    avgEfficiency?: number;
    avgCOP?: number;
    totalRuntime?: number;
    avgKW?: number;
    avgPressure?: number;
    avgFlow?: number;
  }>;
}

export async function getMetrics(
  facilityId: string,
  startDate?: string,
  endDate?: string
): Promise<MetricsResponse> {
  try {
    console.log('Fetching metrics from API:', { facilityId, startDate, endDate });
    
    const response = await metricsApi.get(facilityId, {
      start_date: startDate,
      end_date: endDate,
    });

    console.log('API Response:', response);

    return {
      facilityId: response.facility_id || facilityId,
      startDate: response.start_date,
      endDate: response.end_date,
      metrics: response.equipment_metrics || [],
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}
