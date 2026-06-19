import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";
import { BaselineRatesManager } from "@/components/BaselineRatesManager";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { getEnergyDashboard } from "@/lib/nexum-api";
import { MPCCPanel } from '@/components/energy/MPCCPanel';
import { 
  Zap, 
  DollarSign, 
  Clock,
  RefreshCw,
  Flame,
  Snowflake,
  Wind,
  Droplets
} from 'lucide-react';

interface EnergyData {
  facility_id: string;
  generated_at: string;
  period_days: number;
  rates: {
    electric: number;
    gas: number;
    water: number;
  };
  summary: {
    total_kwh_consumed: number;
    estimated_electric_cost: number;
    total_therms_consumed: number;
    total_ccf_consumed: number;
    total_btus_consumed: number;
    estimated_gas_cost: number;
    gas_equivalent_kwh: number;
    total_gallons_consumed: number;
    estimated_water_cost: number;
    total_energy_equivalent_kwh: number;
    estimated_total_utility_cost: number;
    total_runtime_hours: number;
    average_kwh_per_day: number;
  };
  by_utility: {
    electric: Array<{
      system_type: string;
      kwh: number;
      estimated_cost: number;
      runtime_hours: number;
      percentage_of_electric: number;
    }>;
    gas: Array<{
      system_type: string;
      therms: number;
      btus: number;
      estimated_cost: number;
      percentage_of_gas: number;
    }>;
    water: Array<{
      system_type: string;
      gallons: number;
      estimated_cost: number;
      percentage_of_water: number;
    }>;
  };
  equipment_breakdown: Array<{
    equipment_id: string;
    type: string;
    name: string;
    total_kwh: number;
    estimated_cost: number;
  }>;
}

const DEMO_ENERGY_DATA: EnergyData = {
  facility_id: 'demo',
  generated_at: new Date().toISOString(),
  period_days: 30,
  rates: { electric: 0.12, gas: 0.85, water: 0.004 },
  summary: {
    total_kwh_consumed: 42800,
    estimated_electric_cost: 5136,
    total_therms_consumed: 620,
    total_ccf_consumed: 620,
    total_btus_consumed: 62000000,
    estimated_gas_cost: 527,
    gas_equivalent_kwh: 18172,
    total_gallons_consumed: 185000,
    estimated_water_cost: 740,
    total_energy_equivalent_kwh: 60972,
    estimated_total_utility_cost: 6403,
    total_runtime_hours: 712,
    average_kwh_per_day: 1427,
  },
  by_utility: {
    electric: [
      { system_type: 'Chiller', kwh: 18200, estimated_cost: 2184, runtime_hours: 310, percentage_of_electric: 42.5 },
      { system_type: 'AHU', kwh: 9400, estimated_cost: 1128, runtime_hours: 720, percentage_of_electric: 22.0 },
      { system_type: 'Pump', kwh: 7600, estimated_cost: 912, runtime_hours: 690, percentage_of_electric: 17.8 },
      { system_type: 'Lighting', kwh: 4200, estimated_cost: 504, runtime_hours: 720, percentage_of_electric: 9.8 },
      { system_type: 'Other', kwh: 3400, estimated_cost: 408, runtime_hours: 680, percentage_of_electric: 7.9 },
    ],
    gas: [
      { system_type: 'Boiler', therms: 480, btus: 48000000, estimated_cost: 408, percentage_of_gas: 77.4 },
      { system_type: 'Hot Water Heater', therms: 140, btus: 14000000, estimated_cost: 119, percentage_of_gas: 22.6 },
    ],
    water: [
      { system_type: 'Cooling Tower', gallons: 95000, estimated_cost: 380, percentage_of_water: 51.4 },
      { system_type: 'Boiler Makeup', gallons: 52000, estimated_cost: 208, percentage_of_water: 28.1 },
      { system_type: 'Domestic', gallons: 38000, estimated_cost: 152, percentage_of_water: 20.5 },
    ],
  },
  equipment_breakdown: [
    { equipment_id: 'eq1', type: 'Chiller', name: 'Chiller-01', total_kwh: 18200, estimated_cost: 2184 },
    { equipment_id: 'eq2', type: 'AHU',    name: 'AHU-North',   total_kwh: 5200,  estimated_cost: 624  },
    { equipment_id: 'eq3', type: 'AHU',    name: 'AHU-South',   total_kwh: 4200,  estimated_cost: 504  },
    { equipment_id: 'eq4', type: 'Pump',   name: 'CWP-01',      total_kwh: 4100,  estimated_cost: 492  },
    { equipment_id: 'eq5', type: 'Boiler', name: 'Boiler-01',   total_kwh: 3600,  estimated_cost: 432  },
  ],
};

function safeStr(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val || fallback;
  if (typeof val === 'object') return val.name || val.id || fallback;
  return String(val) || fallback;
}

export default function EnergyDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<EnergyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiData = await getEnergyDashboard();
      const valid = apiData?.summary?.total_energy_equivalent_kwh !== undefined && apiData?.by_utility;
      if (valid) {
        setData(apiData);
        setUsingDemo(false);
      } else {
        setData(DEMO_ENERGY_DATA);
        setUsingDemo(true);
      }
    } catch {
      setData(DEMO_ENERGY_DATA);
      setUsingDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  if (authLoading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const getSystemIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('boiler')) return <Flame className="h-5 w-5 text-orange-500" />;
    if (lowerType.includes('chiller')) return <Snowflake className="h-5 w-5 text-blue-500" />;
    if (lowerType.includes('ahu') || lowerType.includes('air')) return <Wind className="h-5 w-5 text-cyan-500" />;
    if (lowerType.includes('pump') || lowerType.includes('tower')) return <Droplets className="h-5 w-5 text-indigo-500" />;
    return <Zap className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Energy Intelligence™</h1>
            <p className="text-muted-foreground">
              Multi-utility consumption, cost analysis, and energy optimization
            </p>
          </div>
          <div className="flex gap-2">
            <BaselineRatesManager />
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {usingDemo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            Showing demo data — connect your utility meters or log energy readings to populate live figures.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <NexumLoader message="Loading energy data..." />
          </div>
        ) : data ? (
          <>
            {/* Total Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="neon-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Energy Equivalent</p>
                      <p className="text-2xl font-bold">{data.summary.total_energy_equivalent_kwh.toLocaleString()} kWh</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Electric + Gas (as kWh)
                      </p>
                    </div>
                    <Zap className="h-12 w-12 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="neon-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Total Cost</p>
                      <p className="text-2xl font-bold">${data.summary.estimated_total_utility_cost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All utilities combined
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="neon-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Runtime</p>
                      <p className="text-2xl font-bold">{data.summary.total_runtime_hours.toFixed(1)} hrs</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last {data.period_days} days
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Utility Breakdown Tabs */}
            <Tabs defaultValue="electric" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="electric">
                  <Zap className="h-4 w-4 mr-2" />
                  Electric
                </TabsTrigger>
                <TabsTrigger value="gas">
                  <Flame className="h-4 w-4 mr-2" />
                  Natural Gas
                </TabsTrigger>
                <TabsTrigger value="water">
                  <Droplets className="h-4 w-4 mr-2" />
                  Water
                </TabsTrigger>
                <TabsTrigger value="mpcc" className="flex items-center gap-2"><Zap className="w-4 h-4" /><span className="hidden md:inline">MPCC</span></TabsTrigger>
              </TabsList>

              {/* Electric Tab */}
              <TabsContent value="electric" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Electric Consumption</p>
                      <p className="text-2xl font-bold">{data.summary.total_kwh_consumed.toLocaleString()} kWh</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${data.rates.electric}/kWh
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Estimated Electric Cost</p>
                      <p className="text-2xl font-bold">${data.summary.estimated_electric_cost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Avg per Day</p>
                      <p className="text-2xl font-bold">{data.summary.average_kwh_per_day.toFixed(1)} kWh</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle>Electric by System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.by_utility.electric.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.electric.map((system, index) => (
                          <div key={safeStr(system.system_type, String(index))} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {getSystemIcon(safeStr(system.system_type))}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(system.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground">
                                  {system.kwh} kWh ({(system.percentage_of_electric || 0).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full transition-all"
                                  style={{ width: `${system.percentage_of_electric}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Est. ${(system.estimated_cost || 0).toFixed(2)} • {system.runtime_hours} hrs
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No electric usage data available. Log equipment data to see breakdowns.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Gas Tab */}
              <TabsContent value="gas" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Therms Consumed</p>
                      <p className="text-2xl font-bold">{data.summary.total_therms_consumed.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${data.rates.gas}/Therm
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">CCF Consumed</p>
                      <p className="text-2xl font-bold">{data.summary.total_ccf_consumed.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">BTUs</p>
                      <p className="text-2xl font-bold">{(data.summary.total_btus_consumed / 1000000).toFixed(2)}M</p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Estimated Gas Cost</p>
                      <p className="text-2xl font-bold">${data.summary.estimated_gas_cost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle>Natural Gas by System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.by_utility.gas.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.gas.map((system, index) => (
                          <div key={safeStr(system.system_type, String(index))} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {getSystemIcon(safeStr(system.system_type))}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(system.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground">
                                  {(system.therms || 0)} Therms ({(system.percentage_of_gas || 0).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-orange-500 h-2 rounded-full transition-all"
                                  style={{ width: `${system.percentage_of_gas}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Est. ${(system.estimated_cost || 0).toFixed(2)} • {(system.btus / 1000000).toFixed(2)}M BTUs
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No gas usage data available. Log boiler/heating equipment data to see breakdowns.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Water Tab */}
              <TabsContent value="water" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Water Consumption</p>
                      <p className="text-2xl font-bold">{data.summary.total_gallons_consumed.toLocaleString()} gal</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${data.rates.water}/gallon
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="neon-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Estimated Water Cost</p>
                      <p className="text-2xl font-bold">${data.summary.estimated_water_cost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="neon-border">
                  <CardHeader>
                    <CardTitle>Water Usage by System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.by_utility.water.length > 0 ? (
                      <div className="space-y-4">
                        {data.by_utility.water.map((system, index) => (
                          <div key={safeStr(system.system_type, String(index))} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {getSystemIcon(safeStr(system.system_type))}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{safeStr(system.system_type, 'Unknown')}</span>
                                <span className="text-sm text-muted-foreground">
                                  {(system.gallons || 0).toLocaleString()} gal ({(system.percentage_of_water || 0).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{ width: `${system.percentage_of_water}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Est. ${(system.estimated_cost || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No water usage data available. Log cooling tower/domestic water data to see breakdowns.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="mpcc">
                <MPCCPanel />
              </TabsContent>
            </Tabs>

            {/* Equipment Breakdown */}
            {data.equipment_breakdown.length > 0 && (
              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Top Energy Consumers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.equipment_breakdown.slice(0, 10).map((equip) => (
                      <div key={equip.equipment_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{safeStr(equip.name, 'Unknown')}</p>
                          <p className="text-xs text-muted-foreground capitalize">{safeStr(equip.type, 'Unknown')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{equip.total_kwh} kWh</p>
                          <p className="text-xs text-muted-foreground">Est. ${equip.estimated_cost.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
