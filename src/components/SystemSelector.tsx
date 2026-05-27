import { useState } from 'react';
import {
  Flame, Snowflake, Gauge, Wind, Droplets, Zap,
  ChevronRight, Building2, MapPin,
  ArrowLeftRight, Thermometer, Wind as TurbineIcon,
  FlaskConical, Battery, Filter, Beaker,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFacilityEquipment } from '@/hooks/useFacilityEquipment';
import { SystemType, SystemInfo, Facility, Building } from '@/types/logging';
import { cn } from '@/lib/utils';

const systemConfig: Record<SystemType, { icon: any; label: string; color: string; bgColor: string }> = {
  // ── Existing ──────────────────────────────────────────────────────────────
  boiler: {
    icon: Flame,
    label: 'Boiler',
    color: 'text-boiler',
    bgColor: 'bg-boiler-muted border-boiler/40',
  },
  chiller: {
    icon: Snowflake,
    label: 'Chiller',
    color: 'text-chiller',
    bgColor: 'bg-chiller-muted border-chiller/40',
  },
  pump: {
    icon: Gauge,
    label: 'Pump / Compressor',
    color: 'text-pump',
    bgColor: 'bg-pump-muted border-pump/40',
  },
  ahu: {
    icon: Wind,
    label: 'AHU / RTU',
    color: 'text-ahu',
    bgColor: 'bg-ahu-muted border-ahu/40',
  },
  tower: {
    icon: Droplets,
    label: 'Cooling Tower',
    color: 'text-tower',
    bgColor: 'bg-tower-muted border-tower/40',
  },
  energy: {
    icon: Zap,
    label: 'Energy & Utilities',
    color: 'text-energy',
    bgColor: 'bg-energy-muted border-energy/40',
  },
  // ── NEW ───────────────────────────────────────────────────────────────────
  heat_exchanger: {
    icon: ArrowLeftRight,
    label: 'Heat Exchanger',
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
  },
  hot_water_heater: {
    icon: Thermometer,
    label: 'Hot Water Heater',
    color: 'text-boiler',
    bgColor: 'bg-boiler-muted border-boiler/40',
  },
  turbine: {
    icon: TurbineIcon,
    label: 'Turbine',
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
  },
  condensate_system: {
    icon: Droplets,
    label: 'Condensate System',
    color: 'text-chiller',
    bgColor: 'bg-chiller-muted border-chiller/40',
  },
  generator: {
    icon: Battery,
    label: 'Generator / CHP',
    color: 'text-energy',
    bgColor: 'bg-energy-muted border-energy/40',
  },
  ro_system: {
    icon: Filter,
    label: 'RO System',
    color: 'text-tower',
    bgColor: 'bg-tower-muted border-tower/40',
  },
  mpcc: {
    icon: Zap,
    label: 'MPCC (Main Power Control Centre)',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20 border-yellow-400/40',
  },
  wfi_system: {
    icon: Beaker,
    label: 'WFI System',
    color: 'text-chiller',
    bgColor: 'bg-chiller-muted border-chiller/40',
  },
  water_chemistry: {
    icon: FlaskConical,
    label: 'Water Chemistry',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/30',
  },
};

interface SystemSelectorProps {
  onSelect: (facility: Facility, building: Building, system: SystemInfo | null) => void;
}

export function SystemSelector({ onSelect }: SystemSelectorProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');

  const { facilities, loading, error } = useFacilityEquipment();

  const facility = facilities.find((f) => f.id === selectedFacility);
  const building = facility?.buildings.find((b) => b.id === selectedBuilding);

  // Group systems by type, excluding energy (handled separately)
  const groupedSystems = building?.systems
    .filter((s) => s.type !== 'energy')
    .reduce((acc, system) => {
      if (!acc[system.type]) acc[system.type] = [];
      acc[system.type].push(system);
      return acc;
    }, {} as Record<SystemType, SystemInfo[]>);

  const handleSystemSelect = (system: SystemInfo) => {
    if (facility && building) {
      onSelect(facility, building, system);
    }
  };

  const handleEnergyLogSelect = () => {
    if (facility && building) {
      onSelect(facility, building, null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Select System</h1>
          <p className="text-muted-foreground">Choose a facility, building, and system to log</p>
        </div>

        {/* Facility & Building Selectors */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Facility
              </label>
              <Select
                value={selectedFacility}
                onValueChange={(v) => {
                  setSelectedFacility(v);
                  setSelectedBuilding('');
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select facility..." />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>Loading facilities...</SelectItem>
                  ) : error ? (
                    <SelectItem value="error" disabled>Error loading equipment</SelectItem>
                  ) : facilities.length === 0 ? (
                    <SelectItem value="none" disabled>No equipment registered yet</SelectItem>
                  ) : (
                    facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="input-group">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Building
              </label>
              <Select
                value={selectedBuilding}
                onValueChange={setSelectedBuilding}
                disabled={!selectedFacility}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={selectedFacility ? 'Select building...' : 'Select facility first'} />
                </SelectTrigger>
                <SelectContent>
                  {facility?.buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* System Cards */}
        {building && groupedSystems && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-center">Available Systems</h2>

            {/* Energy & Utilities — building level */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={cn('p-1 rounded', systemConfig.energy.bgColor)}>
                  <Zap className={cn('h-3.5 w-3.5', systemConfig.energy.color)} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {systemConfig.energy.label}
                </span>
              </div>
              <button
                onClick={handleEnergyLogSelect}
                className={cn(
                  'w-full system-card p-4 text-left border-2',
                  systemConfig.energy.bgColor
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Log Energy & Utilities</p>
                    <p className="text-sm text-muted-foreground">Building-level readings</p>
                  </div>
                  <ChevronRight className={cn('h-5 w-5', systemConfig.energy.color)} />
                </div>
              </button>
            </div>

            {/* Water Chemistry — standalone, links to equipment inside the form */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={cn('p-1 rounded', systemConfig.water_chemistry.bgColor)}>
                  <FlaskConical className={cn('h-3.5 w-3.5', systemConfig.water_chemistry.color)} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {systemConfig.water_chemistry.label}
                </span>
              </div>
              <button
                onClick={() => facility && building && onSelect(facility, building, {
                  id: 'water_chemistry',
                  name: 'Water Chemistry Log',
                  type: 'water_chemistry',
                  assetTag: 'WATER-CHEM',
                  location: building.name,
                })}
                className={cn(
                  'w-full system-card p-4 text-left border-2',
                  systemConfig.water_chemistry.bgColor
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Log Water Chemistry</p>
                    <p className="text-sm text-muted-foreground">pH, conductivity, treatment levels</p>
                  </div>
                  <ChevronRight className={cn('h-5 w-5', systemConfig.water_chemistry.color)} />
                </div>
              </button>
            </div>

            {/* Equipment-based systems */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.entries(groupedSystems) as [SystemType, SystemInfo[]][]).map(
                ([type, systems]) => {
                  const config = systemConfig[type];
                  // Guard: skip types not yet in systemConfig (future-proofing)
                  if (!config) return null;
                  const Icon = config.icon;

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <div className={cn('p-1 rounded', config.bgColor)}>
                          <Icon className={cn('h-3.5 w-3.5', config.color)} />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {config.label}
                        </span>
                      </div>
                      {systems.map((system) => (
                        <button
                          key={system.id}
                          onClick={() => handleSystemSelect(system)}
                          className={cn(
                            'w-full system-card p-4 text-left border-2',
                            config.bgColor
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{system.name}</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {system.assetTag}
                              </p>
                            </div>
                            <ChevronRight className={cn('h-5 w-5', config.color)} />
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedBuilding && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Select a facility and building to view available systems</p>
          </div>
        )}
      </div>
    </div>
  );
}
