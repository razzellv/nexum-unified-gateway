import { useState } from 'react';
import { useEquipmentReadings } from '@/hooks/useEquipmentReadings';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  equipmentId: string;
  /** 'efficiency' | 'temps' | 'runtime' — which sub-view to show */
  view?: 'efficiency' | 'temps' | 'runtime';
}

// Series config keyed by system type
const SERIES_CONFIG: Record<string, Record<string, { key: string; name: string; color: string; unit: string }[]>> = {
  boiler: {
    efficiency: [
      { key: 'efficiency',    name: 'Efficiency (%)',      color: '#10b981', unit: '%'  },
      { key: 'firing_rate',   name: 'Firing Rate (%)',     color: '#f59e0b', unit: '%'  },
    ],
    temps: [
      { key: 'supply_temp',   name: 'Supply Temp',         color: '#ef4444', unit: '°F' },
      { key: 'return_temp',   name: 'Return Temp',         color: '#3b82f6', unit: '°F' },
      { key: 'delta_t',       name: 'ΔT',                  color: '#a855f7', unit: '°F' },
      { key: 'oat',           name: 'OAT',                 color: '#64748b', unit: '°F' },
    ],
    runtime: [
      { key: 'runtime_hrs',   name: 'Runtime (hrs)',       color: '#06b6d4', unit: 'h'  },
      { key: 'psi',           name: 'Pressure (PSI)',      color: '#f59e0b', unit: 'PSI'},
    ],
  },
  chiller: {
    efficiency: [
      { key: 'efficiency',    name: 'Efficiency (%)',      color: '#10b981', unit: '%'  },
      { key: 'approach_temp', name: 'Approach Temp (°F)',  color: '#f59e0b', unit: '°F' },
    ],
    temps: [
      { key: 'supply_temp',   name: 'CHW Supply',          color: '#3b82f6', unit: '°F' },
      { key: 'return_temp',   name: 'CHW Return',          color: '#60a5fa', unit: '°F' },
      { key: 'delta_t',       name: 'ΔT',                  color: '#a855f7', unit: '°F' },
      { key: 'oat',           name: 'OAT',                 color: '#64748b', unit: '°F' },
    ],
    runtime: [
      { key: 'runtime_hrs',   name: 'Runtime (hrs)',       color: '#06b6d4', unit: 'h'  },
      { key: 'psi',           name: 'Refrigerant PSI',     color: '#f59e0b', unit: 'PSI'},
    ],
  },
  pump: {
    efficiency: [
      { key: 'efficiency',    name: 'Efficiency (%)',      color: '#10b981', unit: '%'  },
      { key: 'amps',          name: 'Amps (A)',            color: '#f59e0b', unit: 'A'  },
    ],
    temps: [
      { key: 'supply_temp',   name: 'Supply Temp',         color: '#ef4444', unit: '°F' },
      { key: 'return_temp',   name: 'Return Temp',         color: '#3b82f6', unit: '°F' },
      { key: 'delta_t',       name: 'ΔT',                  color: '#a855f7', unit: '°F' },
      { key: 'oat',           name: 'OAT',                 color: '#64748b', unit: '°F' },
    ],
    runtime: [
      { key: 'runtime_hrs',   name: 'Runtime (hrs)',       color: '#06b6d4', unit: 'h'  },
      { key: 'psi',           name: 'Pressure (PSI)',      color: '#f59e0b', unit: 'PSI'},
    ],
  },
};

// Fallback for unknown system types
const DEFAULT_SERIES = SERIES_CONFIG['boiler'];

function getSeries(equipmentId: string, view: string) {
  const sysKey = Object.keys(SERIES_CONFIG).find(k => equipmentId.toLowerCase().includes(k)) ?? 'boiler';
  return (SERIES_CONFIG[sysKey] ?? DEFAULT_SERIES)[view] ?? DEFAULT_SERIES[view];
}

function getSystemType(equipmentId: string) {
  if (equipmentId.toLowerCase().includes('chiller')) return 'chiller';
  if (equipmentId.toLowerCase().includes('pump'))    return 'pump';
  return 'boiler';
}

// OAT condition bands for annotation
function oatBand(oat: number | null): string {
  if (oat === null) return '';
  if (oat < 32) return 'Freeze Risk';
  if (oat < 50) return 'Cold';
  if (oat < 70) return 'Mild';
  if (oat < 85) return 'Warm';
  return 'Hot';
}

export const EquipmentReadingsChart = ({ equipmentId, view = 'temps' }: Props) => {
  const { data, isLoading, error } = useEquipmentReadings(equipmentId, 100);
  const [activeView, setActiveView] = useState<'efficiency' | 'temps' | 'runtime'>(view);

  if (isLoading) return (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <Alert variant="destructive">
      <AlertDescription>Failed to load equipment readings.</AlertDescription>
    </Alert>
  );

  if (!data?.readings || data.readings.length === 0) return (
    <Alert><AlertDescription>No readings available for this equipment.</AlertDescription></Alert>
  );

  const sysType = getSystemType(equipmentId);
  const series  = getSeries(equipmentId, activeView);

  const chartData = [...data.readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(r => ({
      date:         format(new Date(r.timestamp), 'MMM dd HH:mm'),
      iso:          r.timestamp,
      oatBand:      oatBand(r.oat ?? null),
      supply_temp:  r.supply_temp  ?? null,
      return_temp:  r.return_temp  ?? null,
      delta_t:      r.delta_t      ?? null,
      efficiency:   r.efficiency   ?? null,
      psi:          r.psi          ?? null,
      oat:          r.oat          ?? null,
      runtime_hrs:  (r as any).runtime_hrs  ?? null,
      firing_rate:  (r as any).firing_rate  ?? null,
      approach_temp:(r as any).approach_temp ?? null,
      amps:         (r as any).amps         ?? null,
    }));

  // Avg stats for header badges
  const avgEfficiency = chartData.reduce((s, d) => s + (d.efficiency ?? 0), 0) / chartData.filter(d => d.efficiency).length;
  const avgOAT        = chartData.reduce((s, d) => s + (d.oat ?? 0), 0) / chartData.filter(d => d.oat).length;
  const avgDeltaT     = chartData.reduce((s, d) => s + (d.delta_t ?? 0), 0) / chartData.filter(d => d.delta_t).length;

  const VIEWS = [
    { key: 'temps',      label: 'Temperature Deltas' },
    { key: 'efficiency', label: 'Efficiency Trends'  },
    { key: 'runtime',    label: 'Runtime / Demand'   },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Sub-view selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
              activeView === v.key
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
            )}
          >
            {v.label}
          </button>
        ))}

        {/* Avg stat badges */}
        <div className="ml-auto flex gap-2 flex-wrap">
          {!isNaN(avgEfficiency) && (
            <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">
              Avg Eff: {avgEfficiency.toFixed(1)}%
            </Badge>
          )}
          {!isNaN(avgOAT) && (
            <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-400/30">
              Avg OAT: {avgOAT.toFixed(1)}°F
            </Badge>
          )}
          {!isNaN(avgDeltaT) && sysType !== 'pump' && (
            <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/30">
              Avg ΔT: {avgDeltaT.toFixed(1)}°F
            </Badge>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            angle={-40}
            textAnchor="end"
            height={70}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              fontSize: 11,
            }}
            formatter={(value: any, name: string) => {
              const s = series.find(s => s.name === name);
              return [value != null ? `${Number(value).toFixed(1)}${s?.unit ?? ''}` : '—', name];
            }}
            labelFormatter={(label, payload) => {
              const iso = payload?.[0]?.payload?.iso;
              const band = payload?.[0]?.payload?.oatBand;
              return `${label}${iso ? `\n${iso}` : ''}${band ? ` · OAT: ${band}` : ''}`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {series.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              name={s.name}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}

          {/* Efficiency reference line for boiler/chiller */}
          {activeView === 'efficiency' && sysType !== 'pump' && (
            <ReferenceLine
              y={88.9}
              stroke="#10b981"
              strokeDasharray="4 2"
              label={{ value: 'Target 88.9%', position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* OAT condition summary */}
      {activeView === 'temps' && chartData.some(d => d.oat != null) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['Freeze Risk', 'Cold', 'Mild', 'Warm', 'Hot'] as const)
            .map(band => {
              const readings = chartData.filter(d => d.oatBand === band);
              if (readings.length === 0) return null;
              const avgSupply = readings.reduce((s, d) => s + (d.supply_temp ?? 0), 0) / readings.filter(d => d.supply_temp).length;
              const avgReturn = readings.reduce((s, d) => s + (d.return_temp ?? 0), 0) / readings.filter(d => d.return_temp).length;
              const colors: Record<string, string> = {
                'Freeze Risk': 'text-blue-300', Cold: 'text-blue-400',
                Mild: 'text-green-400', Warm: 'text-yellow-400', Hot: 'text-red-400',
              };
              return (
                <div key={band} className="p-2.5 rounded-lg border border-border/20 bg-background/30">
                  <p className={cn('text-xs font-semibold mb-1', colors[band])}>{band}</p>
                  <p className="text-[10px] text-muted-foreground">{readings.length} readings</p>
                  {!isNaN(avgSupply) && <p className="text-[10px]">Supply avg: <span className="text-red-400">{avgSupply.toFixed(1)}°F</span></p>}
                  {!isNaN(avgReturn) && <p className="text-[10px]">Return avg: <span className="text-blue-400">{avgReturn.toFixed(1)}°F</span></p>}
                </div>
              );
            })}
        </div>
      )}

      {/* Governance note */}
      <p className="text-[10px] text-muted-foreground/50">
        All timestamps in ISO 8601 UTC · Source: Nexum Suum Facility Intelligence™ · {chartData.length} readings
      </p>
    </div>
  );
};
