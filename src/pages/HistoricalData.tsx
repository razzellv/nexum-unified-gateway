import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { EquipmentReadingsChart } from '@/components/EquipmentReadingsChart';
import { ReadingsDataTable } from '@/components/ReadingsDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NexumBranding } from '@/components/NexumBranding';
import { useEquipmentReadings } from '@/hooks/useEquipmentReadings';
import {
  TrendingUp, Thermometer, Clock, Brain, Table2,
  ShieldCheck, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EQUIPMENT_LIST = [
  { id: 'boiler',  name: 'Main Boiler',       assetTag: 'BLR-001', system: 'boiler'  },
  { id: 'chiller', name: 'Primary Chiller',    assetTag: 'CHL-001', system: 'chiller' },
  { id: 'pump',    name: 'CHW Pump',           assetTag: 'PMP-001', system: 'pump'    },
];

// ── Decision tracking per equipment (what changed + why) ─────────────────────
function DecisionLog({ readings }: { readings: any[] }) {
  if (!readings || readings.length < 2) return (
    <p className="text-sm text-muted-foreground py-4 text-center">Not enough readings to generate decision history.</p>
  );

  const events: { timestamp: string; isoTs: string; type: 'improve' | 'decline' | 'stable'; metric: string; from: number; to: number; note: string }[] = [];

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const eff  = (curr.efficiency ?? 0) - (prev.efficiency ?? 0);
    const dt   = (curr.delta_t ?? 0) - (prev.delta_t ?? 0);
    const psi  = (curr.psi ?? 0) - (prev.psi ?? 0);

    if (Math.abs(eff) >= 2) {
      events.push({
        timestamp: new Date(curr.timestamp).toLocaleString(),
        isoTs:     curr.timestamp,
        type:      eff > 0 ? 'improve' : 'decline',
        metric:    'Efficiency',
        from:      prev.efficiency ?? 0,
        to:        curr.efficiency ?? 0,
        note:      eff > 0
          ? `Efficiency gained ${eff.toFixed(1)}% — possible combustion improvement or load reduction.`
          : `Efficiency dropped ${Math.abs(eff).toFixed(1)}% — check for fouling, load spike, or combustion drift.`,
      });
    }
    if (Math.abs(dt) >= 3 && (curr.delta_t ?? 0) > 0) {
      events.push({
        timestamp: new Date(curr.timestamp).toLocaleString(),
        isoTs:     curr.timestamp,
        type:      dt > 0 ? 'improve' : 'decline',
        metric:    'ΔT',
        from:      prev.delta_t ?? 0,
        to:        curr.delta_t ?? 0,
        note:      dt < 0
          ? `ΔT narrowed to ${curr.delta_t?.toFixed(1)}°F — possible flow bypass or reduced load demand.`
          : `ΔT widened to ${curr.delta_t?.toFixed(1)}°F — improved heat transfer or increased load.`,
      });
    }
    if (Math.abs(psi) >= 5) {
      events.push({
        timestamp: new Date(curr.timestamp).toLocaleString(),
        isoTs:     curr.timestamp,
        type:      'decline',
        metric:    'Pressure',
        from:      prev.psi ?? 0,
        to:        curr.psi ?? 0,
        note:      psi > 0
          ? `Pressure rose ${psi.toFixed(0)} PSI — monitor for safety interlock threshold.`
          : `Pressure dropped ${Math.abs(psi).toFixed(0)} PSI — check for leak or relief valve event.`,
      });
    }
  }

  if (events.length === 0) return (
    <p className="text-sm text-muted-foreground py-4 text-center">No significant changes detected in this window.</p>
  );

  return (
    <div className="space-y-2">
      {events.slice(0, 12).map((ev, i) => (
        <div key={i} className={cn(
          'flex items-start gap-3 p-3 rounded-lg border',
          ev.type === 'improve' ? 'border-green-400/20 bg-green-400/5'
            : ev.type === 'decline' ? 'border-orange-400/20 bg-orange-400/5'
            : 'border-border/20 bg-background/30'
        )}>
          {ev.type === 'improve'
            ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge variant="outline" className="text-[10px]">{ev.metric}</Badge>
              <span className={cn('text-xs font-semibold',
                ev.type === 'improve' ? 'text-green-400' : 'text-orange-400'
              )}>
                {ev.from.toFixed(1)} → {ev.to.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-foreground/80">{ev.note}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{ev.isoTs}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Governance header for table ───────────────────────────────────────────────
function GovernanceStamp({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/20 bg-background/30 text-xs text-muted-foreground">
      <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
      <span>
        <span className="text-green-400 font-medium">{count} records</span>
        &nbsp;· All entries timestamped in ISO 8601 UTC · Immutable log maintained for admissibility ·
        Source: Nexum Suum Facility Intelligence™
      </span>
    </div>
  );
}

// ── Equipment stats bar ───────────────────────────────────────────────────────
function EquipmentStats({ equipmentId }: { equipmentId: string }) {
  const { data } = useEquipmentReadings(equipmentId, 50);
  if (!data?.readings?.length) return null;

  const readings = data.readings;
  const avg = (key: string) => {
    const vals = readings.map((r: any) => r[key]).filter((v: any) => v != null);
    return vals.length ? (vals.reduce((s: number, v: number) => s + v, 0) / vals.length) : null;
  };

  const avgEff = avg('efficiency');
  const avgOAT = avg('oat');
  const avgDT  = avg('delta_t');
  const avgPSI = avg('psi');
  const isCold = avgOAT != null && avgOAT < 50;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Avg Efficiency', value: avgEff != null ? `${avgEff.toFixed(1)}%` : '—', color: avgEff != null && avgEff >= 85 ? 'text-green-400' : 'text-yellow-400' },
        { label: 'Avg OAT', value: avgOAT != null ? `${avgOAT.toFixed(1)}°F` : '—', color: isCold ? 'text-blue-400' : 'text-orange-400' },
        { label: 'Avg ΔT', value: avgDT != null ? `${avgDT.toFixed(1)}°F` : '—', color: 'text-purple-400' },
        { label: 'Avg Pressure', value: avgPSI != null ? `${avgPSI.toFixed(0)} PSI` : '—', color: 'text-yellow-400' },
      ].map(({ label, value, color }) => (
        <div key={label} className="p-3 rounded-lg border border-border/20 bg-background/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn('text-lg font-bold', color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const HistoricalData = () => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('boiler');
  const { data } = useEquipmentReadings(selectedEquipmentId, 100);
  const readings = data?.readings ?? [];
  const selectedEquipment = EQUIPMENT_LIST.find(e => e.id === selectedEquipmentId)!;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipment History</h1>
            <p className="text-muted-foreground mt-1">
              Operational performance history · OAT correlation · Governance timestamps
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_LIST.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.assetTag})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
              {selectedEquipment.system}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <EquipmentStats equipmentId={selectedEquipmentId} />

        {/* Tabs */}
        <Tabs defaultValue="efficiency" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="efficiency" className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />Efficiency Trends
            </TabsTrigger>
            <TabsTrigger value="temps" className="flex items-center gap-1.5 text-xs">
              <Thermometer className="w-3.5 h-3.5" />Temperature Deltas
            </TabsTrigger>
            <TabsTrigger value="runtime" className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5" />Runtime vs Demand
            </TabsTrigger>
            <TabsTrigger value="decisions" className="flex items-center gap-1.5 text-xs">
              <Brain className="w-3.5 h-3.5" />Decision Tracking
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-1.5 text-xs">
              <Table2 className="w-3.5 h-3.5" />Table View
            </TabsTrigger>
          </TabsList>

          {/* Efficiency Trends */}
          <TabsContent value="efficiency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Efficiency Trends — {selectedEquipment.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquipmentReadingsChart equipmentId={selectedEquipmentId} view="efficiency" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temperature Deltas */}
          <TabsContent value="temps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  Temperature Deltas + OAT Conditions — {selectedEquipment.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquipmentReadingsChart equipmentId={selectedEquipmentId} view="temps" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Runtime vs Demand */}
          <TabsContent value="runtime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Runtime vs Demand — {selectedEquipment.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquipmentReadingsChart equipmentId={selectedEquipmentId} view="runtime" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decision Tracking */}
          <TabsContent value="decisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Decision Tracking — What Changed & Why
                  <Badge variant="outline" className="ml-auto text-[10px]">{selectedEquipment.name}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Automatically detects meaningful changes in efficiency, temperature differential, and pressure between consecutive readings. Each event is timestamped in ISO 8601 for defensibility.
                </p>
                <DecisionLog readings={readings} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table" className="space-y-3">
            <GovernanceStamp count={readings.length} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-primary" />
                  Reading History — {selectedEquipment.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReadingsDataTable equipmentId={selectedEquipmentId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <NexumBranding />
      </div>
    </MainLayout>
  );
};

export default HistoricalData;
