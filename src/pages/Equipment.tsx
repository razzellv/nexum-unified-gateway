import { useEquipmentData } from '../hooks/useEquipmentData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Thermometer, Droplet, Gauge, Wind } from 'lucide-react';

// Get facilityId from JWT token custom attributes
// For now, we'll hardcode a test facility ID
const TEST_FACILITY_ID = 'facility-001';

export default function Equipment() {
  const { data, isLoading, error } = useEquipmentData({
    facilityId: TEST_FACILITY_ID,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading equipment data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load equipment data: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const boilers = data?.metrics.filter(m => m.systemType === 'boiler') || [];
  const chillers = data?.metrics.filter(m => m.systemType === 'chiller') || [];
  const pumps = data?.metrics.filter(m => m.systemType === 'pump') || [];
  const ahus = data?.metrics.filter(m => m.systemType === 'ahu') || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Equipment Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Facility: {data?.facilityId} | {data?.startDate || 'All time'}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Boilers */}
        {boilers.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Thermometer className="w-6 h-6 text-orange-500" />
              Boilers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boilers.map((boiler) => (
                <Card key={boiler.systemId}>
                  <CardHeader>
                    <CardTitle>{boiler.systemId}</CardTitle>
                    <CardDescription>
                      {boiler.count} readings | Last: {boiler.lastReading ? new Date(boiler.lastReading).toLocaleString() : 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Efficiency</span>
                        <span className="font-semibold">{boiler.avgEfficiency?.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Runtime</span>
                        <span className="font-semibold">{boiler.totalRuntime?.toFixed(0)} hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Chillers */}
        {chillers.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Droplet className="w-6 h-6 text-blue-500" />
              Chillers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chillers.map((chiller) => (
                <Card key={chiller.systemId}>
                  <CardHeader>
                    <CardTitle>{chiller.systemId}</CardTitle>
                    <CardDescription>
                      {chiller.count} readings | Last: {chiller.lastReading ? new Date(chiller.lastReading).toLocaleString() : 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg COP</span>
                        <span className="font-semibold">{chiller.avgCOP?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Runtime</span>
                        <span className="font-semibold">{chiller.totalRuntime?.toFixed(0)} hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Pumps */}
        {pumps.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Gauge className="w-6 h-6 text-purple-500" />
              Pumps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pumps.map((pump) => (
                <Card key={pump.systemId}>
                  <CardHeader>
                    <CardTitle>{pump.systemId}</CardTitle>
                    <CardDescription>
                      {pump.count} readings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Pressure</span>
                        <span className="font-semibold">{pump.avgPressure?.toFixed(1)} PSI</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Flow</span>
                        <span className="font-semibold">{pump.avgFlow?.toFixed(0)} GPM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* AHUs */}
        {ahus.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Wind className="w-6 h-6 text-green-500" />
              Air Handling Units
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ahus.map((ahu) => (
                <Card key={ahu.systemId}>
                  <CardHeader>
                    <CardTitle>{ahu.systemId}</CardTitle>
                    <CardDescription>
                      {ahu.count} readings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Flow</span>
                        <span className="font-semibold">{ahu.avgFlow?.toFixed(0)} CFM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* No data message */}
        {(!data?.metrics || data.metrics.length === 0) && (
          <Alert>
            <AlertDescription>
              No equipment data available for this facility. Start by logging equipment readings in the Facility Data Source module.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
