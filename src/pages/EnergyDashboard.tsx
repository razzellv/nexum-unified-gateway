import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { ParticleBackground } from "@/components/ParticleBackground";

import { MainLayout } from '@/components/MainLayout';
import { Loader2, Calendar, Download, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { EfficiencyGauge } from '@/components/energy/EfficiencyGauge';
import { CostAnalyticsCard } from '@/components/energy/CostAnalyticsCard';
import { SavingsScoreWidget } from '@/components/energy/SavingsScoreWidget';
import { EmptyDataMessage } from '@/components/global/EmptyDataMessage';
import { ScopeFilters } from '@/components/global/ScopeFilters';
import { calculateBoilerEfficiency, calculateChillerPerformance, calculateDailyEnergyCost, calculateSavingsScore, type UtilityRates } from '@/lib/energy-calculations';
import { mockBoilerLogs, mockChillerLogs } from '@/lib/mock-data';
import { ROLE_DEFINITIONS } from '@/lib/role-filters';

export default function EnergyDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentRole, roleScope, canAccessApp } = useRole();
  const [boilerLogs, setBoilerLogs] = useState<any[]>([]);
  const [chillerLogs, setChillerLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Selection context
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');

  // Default utility rates (could be made configurable)
  const utilityRates: UtilityRates = {
    naturalGas: 1.2, // $/therm
    electricity: 0.12, // $/kWh
    water: 4.5, // $/1000 gal
    sewer: 5.2, // $/1000 gal
  };

  // Role-based content visibility
  const showCostAnalytics = currentRole === 'executive' || currentRole === 'manager';
  const showDetailedCharts = currentRole !== 'operator';
  const showBenchmarks = currentRole === 'executive' || currentRole === 'manager';
  const showOperationalIssues = currentRole === 'supervisor' || currentRole === 'manager';

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Using mock data for now - TODO: Connect to energy-dash Lambda
      setBoilerLogs(mockBoilerLogs);
      setChillerLogs(mockChillerLogs);
    } catch (err) {
      console.error('Error loading energy data:', err);
      setError('Unable to load energy data. Please try again.');
      setBoilerLogs(mockBoilerLogs);
      setChillerLogs(mockChillerLogs);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  // Check if we have valid data to display
  const hasEnergyData = boilerLogs.length > 0 || chillerLogs.length > 0;

  // Calculate current boiler performance
  const latestBoiler = boilerLogs[0];
  const boilerMetrics = latestBoiler ? {
    supplyTemp: Number(latestBoiler.supply_temp) || Number(latestBoiler.water_temperature) || 0,
    returnTemp: Number(latestBoiler.return_temp) || 0,
    steamPressure: Number(latestBoiler.steam_pressure),
    fuelPressure: Number(latestBoiler.fuel_pressure) || 0,
    flueGasTemp: Number(latestBoiler.flue_gas_temp),
    o2Level: Number(latestBoiler.o2_level),
    co2Level: Number(latestBoiler.co2_level),
  } : null;

  const boilerPerformance = boilerMetrics ? calculateBoilerEfficiency(boilerMetrics) : null;

  // Calculate current chiller performance
  const latestChiller = chillerLogs[0];
  const chillerMetrics = latestChiller ? {
    evapSupplyTemp: Number(latestChiller.evap_supply_temp) || 0,
    evapReturnTemp: Number(latestChiller.evap_return_temp) || 0,
    condSupplyTemp: Number(latestChiller.cond_supply_temp) || 0,
    condReturnTemp: Number(latestChiller.cond_return_temp) || 0,
    amperage: Number(latestChiller.amperage) || 0,
    voltage: Number(latestChiller.voltage) || 0,
    flowRate: Number(latestChiller.flow_rate) || 0,
  } : null;

  const chillerPerformance = chillerMetrics ? calculateChillerPerformance(chillerMetrics) : null;

  // Calculate cost analytics (simplified estimates)
  const dailyGasUsage = 150; // therms/day estimate
  const dailyElectricUsage = 2400; // kWh/day estimate
  const dailyWaterUsage = 5000; // gallons/day estimate

  const costAnalytics = calculateDailyEnergyCost(
    dailyGasUsage,
    dailyElectricUsage,
    dailyWaterUsage,
    utilityRates
  );

  // Calculate savings score
  const avgEfficiency = boilerPerformance ? boilerPerformance.efficiency : 80;
  const baselineEfficiency = 80;
  const savingsData = calculateSavingsScore(
    avgEfficiency,
    baselineEfficiency,
    costAnalytics.annualProjection
  );

  // Prepare trend data
  const trendData = boilerLogs.slice(0, 14).reverse().map((log, index) => {
    const chillerLog = chillerLogs[index];
    const boilerEff = calculateBoilerEfficiency({
      supplyTemp: Number(log.supply_temp) || Number(log.water_temperature) || 0,
      returnTemp: Number(log.return_temp) || 0,
      fuelPressure: Number(log.fuel_pressure) || 0,
      flueGasTemp: Number(log.flue_gas_temp),
      o2Level: Number(log.o2_level),
    });

    return {
      date: format(new Date(log.date), 'MM/dd'),
      boilerEff: boilerEff.efficiency,
      chillerKW: chillerLog ? calculateChillerPerformance({
        evapSupplyTemp: Number(chillerLog.evap_supply_temp) || 0,
        evapReturnTemp: Number(chillerLog.evap_return_temp) || 0,
        condSupplyTemp: Number(chillerLog.cond_supply_temp) || 0,
        condReturnTemp: Number(chillerLog.cond_return_temp) || 0,
        amperage: Number(chillerLog.amperage) || 0,
        voltage: Number(chillerLog.voltage) || 0,
        flowRate: Number(chillerLog.flow_rate) || 0,
      }).kwPerTon : 0,
    };
  });

  // Benchmark radar data
  const radarData = [
    { metric: 'Boiler Efficiency', value: boilerPerformance ? (boilerPerformance.efficiency / 95) * 100 : 0, optimal: 90 },
    { metric: 'Chiller kW/ton', value: chillerPerformance ? (1 - (chillerPerformance.kwPerTon / 1.2)) * 100 : 0, optimal: 90 },
    { metric: 'Combustion', value: boilerMetrics?.o2Level ? (1 - Math.abs(boilerMetrics.o2Level - 4) / 10) * 100 : 0, optimal: 90 },
    { metric: 'Heat Transfer', value: 75, optimal: 90 },
    { metric: 'Runtime Efficiency', value: 82, optimal: 90 },
  ];

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neon-cyan mb-2">
              {currentRole === 'executive' ? 'Energy Intelligence Overview' :
               currentRole === 'manager' ? 'Energy Performance Analytics' :
               'Energy Operations Dashboard'}
            </h1>
            <p className="text-lg text-neon-teal">
              {currentRole === 'executive' ? 'Portfolio energy spend and efficiency trends' :
               currentRole === 'manager' ? 'System performance and cost contributors' :
               'Real-time operational monitoring'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(startDate, 'MM/dd/yy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                <CalendarComponent mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
              </PopoverContent>
            </Popover>
            <span className="self-center text-muted-foreground text-sm">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(endDate, 'MM/dd/yy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                <CalendarComponent mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Scope Filters */}
        <Card className="p-4 border-border/50">
          <ScopeFilters
            selectedFacility={selectedFacility}
            selectedBuilding={selectedBuilding}
            selectedSystem={selectedSystem}
            onFacilityChange={setSelectedFacility}
            onBuildingChange={setSelectedBuilding}
            onSystemChange={setSelectedSystem}
            showSystem={false}
          />
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            <span className="ml-3 text-muted-foreground">Loading energy data...</span>
          </div>
        ) : error && !hasEnergyData ? (
          <EmptyDataMessage 
            type="energy" 
            context={selectedBuilding !== 'all' ? selectedBuilding : selectedFacility !== 'all' ? selectedFacility : undefined}
          />
        ) : (
          <>
            {/* Efficiency Gauges - Always show for all roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boilerPerformance && (
                <EfficiencyGauge
                  title="Boiler Efficiency"
                  value={boilerPerformance.efficiency}
                  unit="%"
                  target={85}
                  status={boilerPerformance.status}
                  subtitle={currentRole === 'executive' ? 'Portfolio average' : `${boilerPerformance.issues.length} operational notes`}
                />
              )}
              {chillerPerformance && (
                <EfficiencyGauge
                  title="Chiller Performance"
                  value={chillerPerformance.kwPerTon}
                  unit=" kW/ton"
                  target={0.6}
                  status={chillerPerformance.status}
                  subtitle={currentRole === 'executive' ? 'Portfolio average' : `COP: ${chillerPerformance.cop.toFixed(2)}`}
                />
              )}
            </div>

            {/* Cost Analytics & Savings Score - Executive and Manager only */}
            {showCostAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CostAnalyticsCard {...costAnalytics} />
                <SavingsScoreWidget {...savingsData} />
              </div>
            )}

            {/* Performance Trends - All roles except operator */}
            {showDetailedCharts && (
              <Card className="border-neon-cyan/20">
                <CardHeader>
                  <CardTitle>
                    {currentRole === 'executive' ? 'Portfolio Efficiency Trends' : 'Performance Trends (14-Day)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis yAxisId="left" className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="boilerEff" stroke="hsl(var(--neon-cyan))" name="Boiler Efficiency (%)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="chillerKW" stroke="hsl(var(--neon-teal))" name="Chiller kW/ton" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Benchmark Radar - Executive and Manager only */}
            {showBenchmarks && (
              <Card className="border-neon-cyan/20">
                <CardHeader>
                  <CardTitle>
                    {currentRole === 'executive' ? 'Portfolio Benchmark vs. Industry Standards' : 'Performance Benchmark'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" className="text-xs" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                      <Radar name="Current" dataKey="value" stroke="hsl(var(--neon-cyan))" fill="hsl(var(--neon-cyan))" fillOpacity={0.3} />
                      <Radar name="Optimal" dataKey="optimal" stroke="hsl(var(--neon-teal))" fill="hsl(var(--neon-teal))" fillOpacity={0.1} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Operational Issues - Supervisor and Manager only */}
            {showOperationalIssues && boilerPerformance && boilerPerformance.issues.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-500">Engineering Observations & Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {boilerPerformance.issues.map((issue, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-yellow-500">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {showOperationalIssues && chillerPerformance && chillerPerformance.issues.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-500">Chiller System Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {chillerPerformance.issues.map((issue, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-yellow-500">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}