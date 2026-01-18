import { useEquipmentReadings } from '@/hooks/useEquipmentReadings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  equipmentId: string;
}

export const EquipmentReadingsChart = ({ equipmentId }: Props) => {
  const { data, isLoading, error } = useEquipmentReadings(equipmentId, 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load equipment readings. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.readings || data.readings.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No readings available for this equipment.
        </AlertDescription>
      </Alert>
    );
  }

  // Transform data for chart
  const chartData = data.readings
    .map(reading => ({
      timestamp: new Date(reading.timestamp).getTime(),
      date: format(new Date(reading.timestamp), 'MMM dd HH:mm'),
      supply_temp: reading.supply_temp || null,
      return_temp: reading.return_temp || null,
      efficiency: reading.efficiency || null,
      psi: reading.psi || null,
      delta_t: reading.delta_t || null,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis className="text-xs" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))' 
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="supply_temp" 
          stroke="#ef4444" 
          name="Supply Temp (°F)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line 
          type="monotone" 
          dataKey="return_temp" 
          stroke="#3b82f6" 
          name="Return Temp (°F)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line 
          type="monotone" 
          dataKey="efficiency" 
          stroke="#10b981" 
          name="Efficiency (%)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line 
          type="monotone" 
          dataKey="psi" 
          stroke="#f59e0b" 
          name="Pressure (PSI)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
