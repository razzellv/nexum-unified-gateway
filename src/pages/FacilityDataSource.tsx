import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import SystemSelector from '@/components/SystemSelector';
import LogEntryForm from '@/components/LogEntryForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Facility, Building, SystemInfo } from '@/types/logging';

const FacilityDataSource = () => {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<SystemInfo | null>(null);
  const [isEnergyLog, setIsEnergyLog] = useState(false);

  const handleSystemSelect = (facility: Facility, building: Building, system: SystemInfo | null) => {
    setSelectedFacility(facility);
    setSelectedBuilding(building);
    setSelectedSystem(system);
    setIsEnergyLog(system === null);
  };

  const handleBack = () => {
    setSelectedSystem(null);
    setSelectedBuilding(null);
    setSelectedFacility(null);
    setIsEnergyLog(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facility Data Source
            </h1>
            <p className="text-muted-foreground mt-2">
              Log daily operational readings and equipment data
            </p>
          </div>
        </div>

        {/* Content */}
        {(selectedSystem || isEnergyLog) && selectedFacility && selectedBuilding ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to System Selection
            </Button>
            <LogEntryForm
              facility={selectedFacility}
              building={selectedBuilding}
              system={selectedSystem}
              isEnergyLog={isEnergyLog}
              onBack={handleBack}
            />
          </div>
        ) : (
          <SystemSelector onSelect={handleSystemSelect} />
        )}
      </div>
    </MainLayout>
  );
};

export default FacilityDataSource;
