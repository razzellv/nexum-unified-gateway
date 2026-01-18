import { useEquipmentReadings } from '@/hooks/useEquipmentReadings';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  equipmentId: string;
}

export const ReadingsDataTable = ({ equipmentId }: Props) => {
  const { data, isLoading, error } = useEquipmentReadings(equipmentId, 50);

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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead className="text-right">Supply Temp</TableHead>
            <TableHead className="text-right">Return Temp</TableHead>
            <TableHead className="text-right">ΔT</TableHead>
            <TableHead className="text-right">Efficiency</TableHead>
            <TableHead className="text-right">Pressure</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.readings.map((reading) => (
            <TableRow key={reading.SK}>
              <TableCell className="font-medium">
                {format(new Date(reading.timestamp), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell>{reading.operator || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {reading.shift}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {reading.supply_temp ? `${reading.supply_temp}°F` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {reading.return_temp ? `${reading.return_temp}°F` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {reading.delta_t ? `${reading.delta_t}°F` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {reading.efficiency ? `${reading.efficiency}%` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {reading.psi ? `${reading.psi} PSI` : '-'}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={reading.source === 'manual' ? 'secondary' : 'default'}
                >
                  {reading.source}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
