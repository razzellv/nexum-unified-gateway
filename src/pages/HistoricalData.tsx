import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { EquipmentReadingsChart } from '@/components/EquipmentReadingsChart';
import { ReadingsDataTable } from '@/components/ReadingsDataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NexumBranding } from '@/components/NexumBranding';

const HistoricalData = () => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('boiler');

  // Mock equipment list - replace with your actual equipment data
  const equipment = [
    { id: 'boiler', name: 'Main Boiler', assetTag: 'BLR-001' },
    { id: 'chiller', name: 'Primary Chiller', assetTag: 'CHL-001' },
    { id: 'pump', name: 'CHW Pump', assetTag: 'PMP-001' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Historical Equipment Data
            </h1>
            <p className="text-muted-foreground mt-2">
              View and analyze equipment performance trends
            </p>
          </div>
          
          <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.assetTag})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Equipment readings over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentReadingsChart equipmentId={selectedEquipmentId} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reading History</CardTitle>
                <CardDescription>
                  Detailed view of all equipment readings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReadingsDataTable equipmentId={selectedEquipmentId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HistoricalData;
