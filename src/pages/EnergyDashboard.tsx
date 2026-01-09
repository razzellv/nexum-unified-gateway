import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NexumBranding } from "@/components/NexumBranding";

import { ParticleBackground } from "@/components/ParticleBackground";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { getEnergyDashboard } from "@/lib/nexum-api";
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

export default function EnergyDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<EnergyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiData = await getEnergyDashboard();
      console.log('✅ Energy data from API:', apiData);
      setData(apiData);
    } catch (err: any) {
      console.error('Error loading energy data:', err);
      setError(err.message || 'Unable to load energy data');
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
    switch(type) {
      case 'boiler': return <Flame className="h-5 w-5 text-orange-500" />;
      case 'chiller': return <Snowflake className="h-5 w-5 text-blue-500" />;
      case 'ahu': return <Wind className="h-5 w-5 text-cyan-500" />;
      case 'pump': return <Droplets className="h-5 w-5 text-indigo-500" />;
      default: return <Zap className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <MainLayout>
      <ParticleBackground />
        <NexumBranding />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-end">
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

        {error && <NexumError message={error} onRetry={fetchData} />}

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
              <TabsList className="grid w-full grid-cols-3">
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
                    <div className="space-y-4">
                      {data.by_utility.electric.map((system) => (
                        <div key={system.system_type} className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {getSystemIcon(system.system_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">{system.system_type}</span>
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
                    <div className="space-y-4">
                      {data.by_utility.gas.map((system) => (
                        <div key={system.system_type} className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {getSystemIcon(system.system_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">{system.system_type}</span>
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
                    <div className="space-y-4">
                      {data.by_utility.water.map((system) => (
                        <div key={system.system_type} className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {getSystemIcon(system.system_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">{system.system_type}</span>
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
                  </CardContent>
                </Card>
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
                          <p className="font-medium">{equip.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{equip.type}</p>
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
