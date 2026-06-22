import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  Thermometer, Droplets, Wind, Gauge, MapPin, RefreshCw,
  Zap, Flame, Activity, AlertTriangle, CheckCircle2, Settings,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// ── Psychrometric helpers ────────────────────────────────────────────────────

function calcDewPoint(tempF: number, rh: number): number {
  const T = (tempF - 32) * 5 / 9;
  const alpha = 17.27 * T / (237.7 + T) + Math.log(rh / 100);
  return Math.round((237.7 * alpha / (17.27 - alpha)) * 9 / 5 + 32);
}

function calcWetBulb(tempF: number, rh: number): number {
  const T = (tempF - 32) * 5 / 9;
  const Tw = T * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(T + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
  return Math.round(Tw * 9 / 5 + 32);
}

function windCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function hPaToInHg(hpa: number): string { return (hpa * 0.02953).toFixed(2); }

function fmtHour(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ── WMO helpers ──────────────────────────────────────────────────────────────

function wmoIcon(code: number) {
  if (code === 0)  return Sun;
  if (code <= 3)   return Cloud;
  if (code <= 48)  return Cloud;
  if (code <= 67)  return CloudRain;
  if (code <= 77)  return CloudSnow;
  if (code <= 82)  return CloudRain;
  if (code <= 86)  return CloudSnow;
  return CloudLightning;
}
function wmoLabel(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 2)  return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

// ── HVAC performance calculations at OAT ────────────────────────────────────

function chillerCalc(oat: number) {
  const cwts = Math.round(oat + 12);     // condenser water supply (tower out)
  const cwtr = cwts + 10;                // condenser water return (to tower)
  const designCOP = 5.5;
  const cop = parseFloat(Math.max(2.5, designCOP + (95 - cwts) * 0.04).toFixed(2));
  const kwPerTon = parseFloat((3.517 / cop).toFixed(2));
  const chws = 44, chwr = 54;            // chilled water supply / return (design)
  const chwDT = chwr - chws;
  const cwDT = cwtr - cwts;
  const pctDesign = Math.min(130, Math.round((designCOP / cop) * 100));

  let eff: string, effColor: string, effBg: string;
  if (oat < 65)      { eff = 'High Efficiency'; effColor = 'text-green-400'; effBg = 'bg-green-500/10 border-green-500/30'; }
  else if (oat < 85) { eff = 'Normal';           effColor = 'text-blue-400';  effBg = 'bg-blue-500/10 border-blue-500/30';  }
  else if (oat < 95) { eff = 'Elevated Load';    effColor = 'text-amber-400'; effBg = 'bg-amber-500/10 border-amber-500/30';}
  else               { eff = 'Peak Stress';       effColor = 'text-red-400';   effBg = 'bg-red-500/10 border-red-500/30';   }

  return { cwts, cwtr, cwDT, chws, chwr, chwDT, cop, kwPerTon, pctDesign, eff, effColor, effBg };
}

function ahuCalc(oat: number) {
  let mode: 'cooling' | 'economizer' | 'heating';
  let sat: number, oaPct: number, mat: number;

  if (oat > 65)       { mode = 'cooling';    oaPct = 20;  mat = Math.round(0.2 * oat + 0.8 * 75); sat = 55; }
  else if (oat >= 55) { mode = 'economizer'; oaPct = 100; mat = oat;                               sat = Math.max(55, oat - 2); }
  else                { mode = 'heating';    oaPct = 15;  mat = Math.round(0.15 * oat + 0.85 * 72); sat = 65; }

  const satLabel = Math.round(sat);
  const matLabel = Math.round(mat);
  const oaLabel  = Math.round(oaPct);
  const airDelta = Math.abs(oat - satLabel);
  const rat = 75; // design return air temp

  let modeLabel: string, modeColor: string, modeBg: string;
  if (mode === 'cooling')    { modeLabel = 'Cooling Mode';              modeColor = 'text-blue-400';  modeBg = 'bg-blue-500/10 border-blue-500/30';  }
  else if (mode === 'economizer') { modeLabel = 'Economizer (Free Cooling)'; modeColor = 'text-green-400'; modeBg = 'bg-green-500/10 border-green-500/30'; }
  else                       { modeLabel = 'Heating Mode';              modeColor = 'text-orange-400';modeBg = 'bg-orange-500/10 border-orange-500/30';}

  return { mode, modeLabel, modeColor, modeBg, sat: satLabel, mat: matLabel, oaPct: oaLabel, airDelta, rat };
}

function boilerCalc(oat: number) {
  const hws = Math.round(Math.min(180, Math.max(100, 180 - (oat - 20) * 1.5)));
  const hwr = hws - 20;
  const hwDT = hws - hwr;
  const loadPct = Math.max(0, Math.min(100, Math.round((65 - oat) / 45 * 100)));
  const hdd = Math.max(0, Math.round(65 - oat));

  let status: string, statusColor: string, statusBg: string;
  if (oat > 60)      { status = 'Standby';      statusColor = 'text-slate-400'; statusBg = 'bg-muted/50 border-border'; }
  else if (oat > 40) { status = 'Low Load';     statusColor = 'text-blue-400';  statusBg = 'bg-blue-500/10 border-blue-500/30'; }
  else if (oat > 20) { status = 'Medium Load';  statusColor = 'text-amber-400'; statusBg = 'bg-amber-500/10 border-amber-500/30'; }
  else               { status = 'High Load';    statusColor = 'text-red-400';   statusBg = 'bg-red-500/10 border-red-500/30'; }

  return { hws, hwr, hwDT, loadPct, hdd, status, statusColor, statusBg };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface WeatherDetails {
  temp: number; feelsLike: number; humidity: number;
  windSpeed: number; windGusts: number; windDir: number;
  precipitation: number; pressure: number;
  code: number; city: string; state: string;
  dewPoint: number; wetBulb: number;
  forecast: { hour: string; temp: number; humidity: number; code: number }[];
}

interface Equipment {
  equipmentId: string; equipmentName?: string; equipmentType: string;
  manufacturer?: string; model?: string; location?: string;
}

// ── Stat chip ────────────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value, sub, iconClass }: {
  icon: any; label: string; value: string; sub?: string; iconClass?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <Icon className={cn('w-4 h-4 shrink-0', iconClass || 'text-muted-foreground')} />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({ name, location, badge, badgeBg, rows }: {
  name: string; location?: string; badge: string; badgeBg: string;
  rows: { label: string; air?: boolean; water?: boolean; values: { label: string; val: string }[] }[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            {location && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{location}</p>}
          </div>
          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', badgeBg)}>{badge}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.map((row, i) => (
          <div key={i} className={cn('px-4 py-2.5 border-b border-border/30 last:border-0', i % 2 === 1 && 'bg-muted/20')}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{row.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              {row.values.map((v, j) => (
                <div key={j}>
                  <p className="text-[10px] text-muted-foreground">{v.label}</p>
                  <p className="text-sm font-semibold tabular-nums">{v.val}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'chillers' | 'air' | 'boilers' | 'forecast' | 'chain';

export default function ClimateIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [weather, setWeather] = useState<WeatherDetails | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState(0);

  const hasLocation = !!(
    localStorage.getItem('nexum_facility_city') ||
    localStorage.getItem('nexum_weather_coords')
  );

  const load = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      // ── Weather ──────────────────────────────────────────────────────────
      let coords: { lat: number; lon: number; city: string; state: string } | null = null;
      const raw = localStorage.getItem('nexum_weather_coords');
      if (raw) {
        try { coords = JSON.parse(raw); } catch {}
      }
      if (!coords) {
        const city  = localStorage.getItem('nexum_facility_city')?.trim();
        const state = localStorage.getItem('nexum_facility_state')?.trim();
        if (city) {
          const gr = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city + (state ? ` ${state}` : ''))}&count=1&language=en&format=json`
          );
          const gd = await gr.json();
          const r = gd.results?.[0];
          if (r) {
            coords = { lat: r.latitude, lon: r.longitude, city: r.name, state: r.admin1 || state || '' };
            localStorage.setItem('nexum_weather_coords', JSON.stringify({ ...coords, resolvedAt: Date.now() }));
          }
        }
      }

      if (coords) {
        const wr = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,surface_pressure` +
          `&hourly=temperature_2m,relative_humidity_2m,weather_code` +
          `&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=2&timezone=auto`
        );
        const wd = await wr.json();
        const c = wd.current;

        // Find current hour index in hourly array for next-24h slice
        const now = new Date().toISOString().slice(0, 13);
        const hTimes: string[] = wd.hourly.time;
        const startIdx = Math.max(0, hTimes.findIndex(t => t.slice(0, 13) >= now));
        const forecast = hTimes.slice(startIdx, startIdx + 24).map((t: string, i: number) => ({
          hour:     fmtHour(t),
          temp:     Math.round(wd.hourly.temperature_2m[startIdx + i]),
          humidity: Math.round(wd.hourly.relative_humidity_2m[startIdx + i]),
          code:     wd.hourly.weather_code[startIdx + i],
        }));

        const temp = Math.round(c.temperature_2m);
        const rh   = Math.round(c.relative_humidity_2m);
        setWeather({
          temp, feelsLike: Math.round(c.apparent_temperature), humidity: rh,
          windSpeed: Math.round(c.wind_speed_10m), windGusts: Math.round(c.wind_gusts_10m),
          windDir: c.wind_direction_10m, precipitation: c.precipitation,
          pressure: c.surface_pressure, code: c.weather_code,
          city: coords.city, state: coords.state,
          dewPoint: calcDewPoint(temp, rh), wetBulb: calcWetBulb(temp, rh),
          forecast,
        });
      }

      // ── Equipment ────────────────────────────────────────────────────────
      const token    = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token') || '';
      const baseUrl  = import.meta.env.VITE_API_BASE_URL;
      const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';

      try {
        const er = await fetch(`${baseUrl}/equipment?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (er.ok) {
          const ed = await er.json();
          const items: Equipment[] = (ed.equipment || ed.items || []);
          setEquipment(items);
        }
      } catch {}

      setLastFetched(Date.now());
    } catch (e) {
      setError('Unable to load weather data. Check your facility location in onboarding settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Re-load when BMS poll delivers fresh climate-relevant data
    window.addEventListener('nexum_bms_poll_update', load);
    return () => window.removeEventListener('nexum_bms_poll_update', load);
  }, []);

  // ── Derived asset lists ────────────────────────────────────────────────────

  const chillers = useMemo(
    () => equipment.filter(e => /chiller/i.test(e.equipmentType)),
    [equipment]
  );
  const ahus = useMemo(
    () => equipment.filter(e => /ahu|air.?handler|air.?handling/i.test(e.equipmentType)),
    [equipment]
  );
  const boilers = useMemo(
    () => equipment.filter(e => /boiler/i.test(e.equipmentType)),
    [equipment]
  );

  const oat = weather?.temp ?? 72;
  const ch  = chillerCalc(oat);
  const ah  = ahuCalc(oat);
  const bo  = boilerCalc(oat);

  const WeatherIcon = weather ? wmoIcon(weather.code) : Cloud;
  const location    = weather ? [weather.city, weather.state].filter(Boolean).join(', ') : '';

  // ── Forecast chart data (add equipment thresholds) ─────────────────────────
  const forecastData = weather?.forecast ?? [];

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'chillers',  label: 'Chillers',        count: chillers.length },
    { id: 'air',       label: 'Air Handlers',     count: ahus.length },
    { id: 'boilers',   label: 'Boilers',          count: boilers.length },
    { id: 'forecast',  label: '24h Forecast' },
    { id: 'chain',     label: 'Operational Chain™' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
            <WeatherIcon className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Climate Intelligence™</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {location && <><MapPin className="w-3 h-3" />{location} · </>}
              Outdoor conditions + HVAC asset performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastFetched > 0 && (
            <span className="text-xs text-muted-foreground">
              Updated {Math.floor((Date.now() - lastFetched) / 60000)} min ago
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => load(true)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
          {!hasLocation && (
            <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')}>
              <Settings className="w-3.5 h-3.5 mr-1.5" />Set Location
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !weather ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : weather ? (
        <>
          {/* ── Current Conditions hero ─────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Big conditions card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-5xl font-bold tabular-nums">{weather.temp}°F</p>
                    <p className="text-sm text-muted-foreground mt-1">{wmoLabel(weather.code)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{location}
                    </p>
                  </div>
                  <WeatherIcon className="w-16 h-16 text-sky-400 opacity-80" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0 divide-y divide-border/30">
                  <Stat icon={Thermometer} label="Feels Like"    value={`${weather.feelsLike}°F`}  iconClass="text-orange-400" />
                  <Stat icon={Droplets}    label="Dew Point"     value={`${weather.dewPoint}°F`}   iconClass="text-blue-400" />
                  <Stat icon={Droplets}    label="Wet Bulb"      value={`${weather.wetBulb}°F`}    iconClass="text-cyan-400" />
                  <Stat icon={Droplets}    label="Humidity"      value={`${weather.humidity}%`}    iconClass="text-blue-400" />
                  <Stat icon={Wind}        label="Wind"          value={`${weather.windSpeed} mph`} sub={windCompass(weather.windDir)} iconClass="text-slate-400" />
                  <Stat icon={Wind}        label="Gusts"         value={`${weather.windGusts} mph`} iconClass="text-slate-400" />
                  <Stat icon={Gauge}       label="Pressure"      value={`${hPaToInHg(weather.pressure)} inHg`} iconClass="text-purple-400" />
                  <Stat icon={CloudRain}   label="Precipitation" value={`${weather.precipitation} in`} iconClass="text-sky-400" />
                </div>
              </CardContent>
            </Card>

            {/* HVAC quick status */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">

              {/* Chiller fleet */}
              <Card className={cn('border', ch.effBg)}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold">Chiller Fleet</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{chillers.length} units</Badge>
                  </div>
                  <p className={cn('text-sm font-medium', ch.effColor)}>{ch.eff}</p>
                  <p className="text-xs text-muted-foreground mt-1">OAT {oat}°F → CWT {ch.cwts}°F</p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Est. COP</span><span className="font-semibold tabular-nums">{ch.cop}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">kW/Ton</span><span className="font-semibold tabular-nums">{ch.kwPerTon}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">vs Design</span><span className="font-semibold tabular-nums">{ch.pctDesign > 100 ? '+' : ''}{ch.pctDesign - 100}%</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* AHU fleet */}
              <Card className={cn('border', ah.modeBg)}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold">Air Handlers</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{ahus.length} units</Badge>
                  </div>
                  <p className={cn('text-sm font-medium', ah.modeColor)}>{ah.modeLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">OAT {oat}°F · {ah.oaPct}% OA</p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Supply Air</span><span className="font-semibold tabular-nums">{ah.sat}°F</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mixed Air</span><span className="font-semibold tabular-nums">{ah.mat}°F</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">OAT–SAT ΔT</span><span className="font-semibold tabular-nums">{ah.airDelta}°F</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Boiler fleet */}
              <Card className={cn('border', bo.statusBg)}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-semibold">Boiler Plant</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{boilers.length} units</Badge>
                  </div>
                  <p className={cn('text-sm font-medium', bo.statusColor)}>{bo.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">HDD {bo.hdd} · {bo.loadPct}% load</p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">HWS Reset</span><span className="font-semibold tabular-nums">{bo.hws}°F</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">HWR</span><span className="font-semibold tabular-nums">{bo.hwr}°F</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">HW ΔT</span><span className="font-semibold tabular-nums">{bo.hwDT}°F</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  tab === t.id
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}>
                {t.label}
                {t.count !== undefined && (
                  <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full', tab === t.id ? 'bg-primary/20' : 'bg-muted')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview tab ─────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Outside Air Temp', value: `${oat}°F`, sub: `Wet bulb ${weather.wetBulb}°F`, icon: Thermometer, cls: 'text-sky-400' },
                  { label: 'Relative Humidity', value: `${weather.humidity}%`, sub: `Dew point ${weather.dewPoint}°F`, icon: Droplets, cls: 'text-blue-400' },
                  { label: 'Chiller COP Est.', value: `${ch.cop}`, sub: `${ch.kwPerTon} kW/ton · ${ch.eff}`, icon: Zap, cls: 'text-blue-400' },
                  { label: 'Heating Deg. Day', value: `${bo.hdd} HDD`, sub: `Boiler load ~${bo.loadPct}%`, icon: Flame, cls: 'text-orange-400' },
                ].map((k, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2 mb-2">
                        <k.icon className={cn('w-4 h-4', k.cls)} />
                        <span className="text-xs text-muted-foreground">{k.label}</span>
                      </div>
                      <p className="text-2xl font-bold tabular-nums">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Air + water delta summary table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Temperature Delta Summary at {oat}°F OAT</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">System</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supply Temp</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Return Temp</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ΔT</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">vs OAT</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Side</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">Chilled Water</td>
                          <td className="px-4 py-2.5 tabular-nums text-blue-400">{ch.chws}°F</td>
                          <td className="px-4 py-2.5 tabular-nums">{ch.chwr}°F</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{ch.chwDT}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{oat - ch.chws}°F above supply</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">Water</Badge></td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">Condenser Water</td>
                          <td className="px-4 py-2.5 tabular-nums text-amber-400">{ch.cwts}°F</td>
                          <td className="px-4 py-2.5 tabular-nums">{ch.cwtr}°F</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{ch.cwDT}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">+{ch.cwts - oat}°F above OAT</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">Water</Badge></td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">Hot Water (Boiler)</td>
                          <td className="px-4 py-2.5 tabular-nums text-orange-400">{bo.hws}°F</td>
                          <td className="px-4 py-2.5 tabular-nums">{bo.hwr}°F</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{bo.hwDT}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">+{bo.hws - oat}°F above OAT</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">Water</Badge></td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">AHU Supply Air</td>
                          <td className="px-4 py-2.5 tabular-nums text-sky-400">{ah.sat}°F</td>
                          <td className="px-4 py-2.5 tabular-nums">{ah.rat}°F (design RAT)</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{ah.rat - ah.sat}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{Math.abs(oat - ah.sat)}°F {oat > ah.sat ? 'above' : 'below'} OAT</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">Air</Badge></td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">Mixed Air (AHU)</td>
                          <td className="px-4 py-2.5 tabular-nums">{ah.mat}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">—</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{ah.mat - ah.sat}°F</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{ah.oaPct}% OA @ {oat}°F</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">Air</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Chillers tab ──────────────────────────────────────────────── */}
          {tab === 'chillers' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Performance estimates based on {oat}°F OAT. Condenser water approach assumes standard cooling tower (10–12°F).
              </p>
              {chillers.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No chillers registered in Equipment Library.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/equipment-library')}>Add Equipment</Button>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {chillers.map(eq => {
                    const name = eq.equipmentName || `${eq.manufacturer || ''} ${eq.model || eq.equipmentType}`.trim();
                    return (
                      <AssetCard key={eq.equipmentId} name={name} location={eq.location} badge={ch.eff} badgeBg={ch.effBg}
                        rows={[
                          { label: 'Condenser Water (Tower Side)',
                            values: [
                              { label: 'CWT Supply', val: `${ch.cwts}°F` },
                              { label: 'CWT Return', val: `${ch.cwtr}°F` },
                              { label: 'CW ΔT', val: `${ch.cwDT}°F` },
                              { label: 'vs OAT', val: `+${ch.cwts - oat}°F` },
                            ]
                          },
                          { label: 'Chilled Water (Load Side)',
                            values: [
                              { label: 'CHWS (Design)', val: `${ch.chws}°F` },
                              { label: 'CHWR (Design)', val: `${ch.chwr}°F` },
                              { label: 'CHW ΔT', val: `${ch.chwDT}°F` },
                              { label: 'vs OAT', val: `${oat - ch.chws}°F` },
                            ]
                          },
                          { label: 'Performance',
                            values: [
                              { label: 'Est. COP', val: `${ch.cop}` },
                              { label: 'kW/Ton', val: `${ch.kwPerTon}` },
                              { label: 'vs Design', val: `${ch.pctDesign > 100 ? '+' : ''}${ch.pctDesign - 100}%` },
                              { label: 'OAT', val: `${oat}°F` },
                            ]
                          },
                        ]}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Air handlers tab ─────────────────────────────────────────── */}
          {tab === 'air' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Air-side analysis at {oat}°F OAT. Mode determined by outdoor conditions. Estimates based on design setpoints (SAT 55°F cooling, 65°F heating).
              </p>
              {ahus.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No air handling units registered in Equipment Library.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/equipment-library')}>Add Equipment</Button>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {ahus.map(eq => {
                    const name = eq.equipmentName || `${eq.manufacturer || ''} ${eq.model || eq.equipmentType}`.trim();
                    return (
                      <AssetCard key={eq.equipmentId} name={name} location={eq.location} badge={ah.modeLabel} badgeBg={ah.modeBg}
                        rows={[
                          { label: 'Air-Side Temperatures',
                            values: [
                              { label: 'OAT',      val: `${oat}°F` },
                              { label: 'Mixed Air', val: `${ah.mat}°F` },
                              { label: 'Supply Air', val: `${ah.sat}°F` },
                              { label: 'Return Air', val: `${ah.rat}°F` },
                            ]
                          },
                          { label: 'Deltas & Outdoor Air',
                            values: [
                              { label: 'OAT→SAT ΔT', val: `${ah.airDelta}°F` },
                              { label: 'MAT→SAT ΔT', val: `${Math.abs(ah.mat - ah.sat)}°F` },
                              { label: 'RAT→SAT ΔT', val: `${ah.rat - ah.sat}°F` },
                              { label: 'OA %',        val: `${ah.oaPct}%` },
                            ]
                          },
                        ]}
                      />
                    );
                  })}
                </div>
              )}

              {/* Economizer opportunity indicator */}
              <Card className={cn('border', oat >= 55 && oat <= 65 ? 'border-green-500/50 bg-green-500/5' : 'border-border')}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-start gap-3">
                    {oat >= 55 && oat <= 65
                      ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className="text-sm font-semibold">
                        {oat >= 55 && oat <= 65 ? 'Economizer Opportunity Active' : 'Economizer Not Active'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {oat >= 55 && oat <= 65
                          ? `OAT ${oat}°F is within economizer range (55–65°F). AHUs should be running 100% OA for free cooling — verify damper positions.`
                          : oat > 65
                          ? `OAT ${oat}°F is above economizer lockout (65°F). Mechanical cooling required. Check 24h forecast for upcoming economizer windows.`
                          : `OAT ${oat}°F is below economizer low limit (55°F). Heating mode active. Dampers at minimum OA position.`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Boilers tab ──────────────────────────────────────────────── */}
          {tab === 'boilers' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Heating load estimates at {oat}°F OAT using outdoor air reset curve. HDD base 65°F.
              </p>
              {boilers.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Flame className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No boilers registered in Equipment Library.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/equipment-library')}>Add Equipment</Button>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {boilers.map(eq => {
                    const name = eq.equipmentName || `${eq.manufacturer || ''} ${eq.model || eq.equipmentType}`.trim();
                    return (
                      <AssetCard key={eq.equipmentId} name={name} location={eq.location} badge={bo.status} badgeBg={bo.statusBg}
                        rows={[
                          { label: 'Hot Water Temperatures (OAR)',
                            values: [
                              { label: 'HWS (Reset)', val: `${bo.hws}°F` },
                              { label: 'HWR',         val: `${bo.hwr}°F` },
                              { label: 'HW ΔT',       val: `${bo.hwDT}°F` },
                              { label: 'vs OAT',      val: `+${bo.hws - oat}°F` },
                            ]
                          },
                          { label: 'Load Assessment',
                            values: [
                              { label: 'Load Est.',  val: `${bo.loadPct}%` },
                              { label: 'HDD',        val: `${bo.hdd}` },
                              { label: 'OAT',        val: `${oat}°F` },
                              { label: 'Status',     val: bo.status },
                            ]
                          },
                        ]}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 24h Forecast tab ─────────────────────────────────────────── */}
          {tab === 'forecast' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">24-Hour OAT Forecast — Equipment Operating Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={forecastData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={3} />
                      <YAxis yAxisId="temp" domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit="°F" width={44} />
                      <YAxis yAxisId="rh" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={36} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any, name: string) => [name === 'Temp' ? `${v}°F` : `${v}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {/* Economizer band 55–65°F */}
                      <ReferenceLine yAxisId="temp" y={65} stroke="#22c55e" strokeDasharray="5 3" label={{ value: 'Econ High 65°F', fill: '#22c55e', fontSize: 10, position: 'insideTopLeft' }} />
                      <ReferenceLine yAxisId="temp" y={55} stroke="#22c55e" strokeDasharray="5 3" label={{ value: 'Econ Low 55°F', fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft' }} />
                      <Area yAxisId="temp" type="monotone" dataKey="temp" stroke="#38bdf8" strokeWidth={2} fill="url(#tempGrad)" name="Temp" dot={false} />
                      <Line yAxisId="rh" type="monotone" dataKey="humidity" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="RH%" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Green dashed lines = economizer opportunity zone (55–65°F). Data via Open-Meteo.
                  </p>
                </CardContent>
              </Card>

              {/* Per-hour equipment outlook */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Hourly Equipment Mode Outlook</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Hour', 'OAT', 'RH', 'AHU Mode', 'Chiller', 'Boiler Load'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {forecastData.filter((_, i) => i % 2 === 0).map((f, i) => {
                          const fAh = ahuCalc(f.temp);
                          const fBo = boilerCalc(f.temp);
                          const fCh = chillerCalc(f.temp);
                          return (
                            <tr key={i} className={cn('hover:bg-muted/20', f.temp >= 55 && f.temp <= 65 && 'bg-green-500/5')}>
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{f.hour}</td>
                              <td className="px-3 py-2 tabular-nums font-semibold">{f.temp}°F</td>
                              <td className="px-3 py-2 tabular-nums">{f.humidity}%</td>
                              <td className={cn('px-3 py-2', fAh.modeColor)}>{fAh.modeLabel}</td>
                              <td className={cn('px-3 py-2', fCh.effColor)}>{fCh.eff}</td>
                              <td className="px-3 py-2">{fBo.loadPct > 0 ? `${fBo.loadPct}%` : 'Standby'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Operational Chain™ tab ────────────────────────────────────── */}
          {tab === 'chain' && (() => {
            const isEco = ah.mode === 'economizer';
            const energySavingsPct = oat < 50 ? 30 : oat < 65 ? 20 : oat < 80 ? 8 : -5;
            const comfortOk = oat >= 40 && oat <= 88 && (weather?.humidity ?? 50) < 80;
            const riskLevel = oat < 20 || oat > 95 ? 'High' : oat < 32 || oat > 85 ? 'Elevated' : 'Low';
            const thermalLoad = oat > 85 ? 'Peak Thermal Load' : oat > 65 ? 'Normal Cooling Load' : oat > 50 ? 'Reduced Load — Economizer Range' : 'Heating Load';
            const maintItems = [
              ...(isEco ? ['Verify economizer dampers at 100% OA position'] : []),
              ...(oat > 60 && ch.cop > 0 ? ['Check condenser water flow and approach temperatures'] : []),
              ...(bo.loadPct > 50 ? ['Inspect burner operation and flue gas analysis'] : []),
              ...(oat < 32 ? ['Monitor freeze protection on CT basin and exposed piping'] : []),
            ].slice(0, 3);
            const recommendations = [
              ...(isEco ? ['Enable or verify economizer sequence is active — free cooling available now'] : []),
              ...(energySavingsPct > 15 ? [`Consider reducing chiller staging — current COP est. ${ch.cop}`] : []),
              ...(bo.loadPct === 0 ? ['Boiler in standby — verify HHW isolation valves are properly seated'] : []),
              ...(oat < 32 ? ['Activate freeze protection monitoring protocol'] : []),
              'Log current conditions in Observation Journal for operational trending',
            ].slice(0, 4);

            const chain = [
              {
                step: 1, title: 'Weather Input',
                icon: Thermometer, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-400', border: 'border-sky-500/20',
                value: `${oat}°F OAT · ${weather?.humidity ?? '—'}% RH · ${weather ? wmoLabel(weather.code) : '—'}`,
                detail: `Wet bulb ${weather?.wetBulb ?? '—'}°F · Dew point ${weather?.dewPoint ?? '—'}°F · Wind ${weather?.windSpeed ?? '—'} mph`,
                status: isEco ? 'Economizer Band' : oat > 85 ? 'Heat Stress' : oat < 32 ? 'Freeze Risk' : 'Normal',
                statusClass: isEco ? 'text-green-400 border-green-500/30' : oat > 85 ? 'text-red-400 border-red-500/30' : oat < 32 ? 'text-blue-400 border-blue-500/30' : 'text-muted-foreground border-border',
              },
              {
                step: 2, title: 'Building Thermal Response',
                icon: Gauge, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', border: 'border-amber-500/20',
                value: thermalLoad,
                detail: `Building envelope heat gain/loss: ${oat > 80 ? 'High' : oat > 65 ? 'Moderate' : 'Low'} · Occupancy-driven internal load applies`,
                status: oat > 85 ? 'Peak Demand' : oat < 45 ? 'Heating Demand' : 'Reduced Load',
                statusClass: oat > 85 ? 'text-red-400 border-red-500/30' : oat < 45 ? 'text-orange-400 border-orange-500/30' : 'text-green-400 border-green-500/30',
              },
              {
                step: 3, title: 'Equipment Response',
                icon: Activity, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', border: 'border-blue-500/20',
                value: `Chiller ${ch.eff} · AHU ${ah.modeLabel} · Boiler ${bo.loadPct > 0 ? `${bo.loadPct}% Load` : 'Standby'}`,
                detail: `COP ${ch.cop} · ${ch.kwPerTon} kW/ton · AHU OA ${ah.oaPct}% · HWS ${bo.hws}°F · Supply Air ${ah.sat}°F`,
                status: ch.eff,
                statusClass: `${ch.effColor} border-current/30`,
              },
              {
                step: 4, title: 'Energy Response',
                icon: Zap, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-400', border: 'border-yellow-500/20',
                value: energySavingsPct > 0 ? `~${energySavingsPct}% below peak energy consumption estimated` : 'Near peak — design-day energy consumption conditions',
                detail: `Cooling plant at ${ch.kwPerTon} kW/ton vs 0.80 kW/ton design · ${isEco ? 'Economizer offsetting mechanical cooling' : 'Full mechanical cooling in service'}`,
                status: energySavingsPct > 15 ? 'Below Baseline' : energySavingsPct > 0 ? 'Moderate Savings' : 'Peak Consumption',
                statusClass: energySavingsPct > 15 ? 'text-green-400 border-green-500/30' : energySavingsPct > 0 ? 'text-blue-400 border-blue-500/30' : 'text-red-400 border-red-500/30',
              },
              {
                step: 5, title: 'Occupant Comfort',
                icon: Droplets, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400', border: 'border-cyan-500/20',
                value: comfortOk ? 'Comfort conditions met — no thermal discomfort expected' : 'Elevated comfort risk — conditions outside optimal zone',
                detail: `Supply air ${ah.sat}°F → space setpoint ~72°F · ${isEco ? 'Economizer providing enhanced ventilation' : 'Mechanical conditioning maintaining setpoints'}`,
                status: comfortOk ? 'Comfortable' : 'Risk',
                statusClass: comfortOk ? 'text-green-400 border-green-500/30' : 'text-amber-400 border-amber-500/30',
              },
              {
                step: 6, title: 'Maintenance Implications',
                icon: AlertTriangle, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400', border: 'border-orange-500/20',
                value: maintItems.length > 0 ? maintItems.join(' · ') : 'No immediate maintenance concerns at current conditions',
                detail: `Based on OAT ${oat}°F and active equipment state — review seasonal checklist`,
                status: maintItems.length > 1 ? 'Action Items' : 'Routine',
                statusClass: maintItems.length > 1 ? 'text-amber-400 border-amber-500/30' : 'text-green-400 border-green-500/30',
              },
              {
                step: 7, title: 'Financial Impact',
                icon: Zap, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', border: 'border-emerald-500/20',
                value: energySavingsPct > 10 ? 'Below-average energy spend projected for today' : energySavingsPct > 0 ? 'Near-average energy costs expected' : 'Above-average energy spend — peak load conditions',
                detail: `Cooling plant ${ch.kwPerTon} kW/ton · ${isEco ? 'Economizer reducing compressor runtime and demand charges' : 'Full mechanical conditioning active'}`,
                status: energySavingsPct > 10 ? 'Favorable' : energySavingsPct > 0 ? 'Neutral' : 'Elevated',
                statusClass: energySavingsPct > 10 ? 'text-green-400 border-green-500/30' : energySavingsPct > 0 ? 'text-blue-400 border-blue-500/30' : 'text-red-400 border-red-500/30',
              },
              {
                step: 8, title: 'Risk Assessment',
                icon: CheckCircle2,
                iconBg: riskLevel === 'Low' ? 'bg-green-500/10' : riskLevel === 'Elevated' ? 'bg-amber-500/10' : 'bg-red-500/10',
                iconColor: riskLevel === 'Low' ? 'text-green-400' : riskLevel === 'Elevated' ? 'text-amber-400' : 'text-red-400',
                border: riskLevel === 'Low' ? 'border-green-500/20' : riskLevel === 'Elevated' ? 'border-amber-500/20' : 'border-red-500/20',
                value: riskLevel === 'Low' ? 'Low operational risk — no weather-driven threats detected' : riskLevel === 'Elevated' ? 'Elevated risk — temperature conditions outside comfortable range' : 'High risk — extreme temperature range for equipment and personnel',
                detail: oat < 20 ? 'Freeze risk to exposed equipment and piping systems' : oat > 95 ? 'Equipment heat stress conditions — personnel safety monitoring required' : 'Weather conditions within normal operational parameters',
                status: `${riskLevel} Risk`,
                statusClass: riskLevel === 'Low' ? 'text-green-400 border-green-500/30' : riskLevel === 'Elevated' ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30',
              },
              {
                step: 9, title: 'Operational Recommendations',
                icon: CheckCircle2, iconBg: 'bg-primary/10', iconColor: 'text-primary', border: 'border-primary/20',
                value: recommendations.join(' · '),
                detail: `${recommendations.length} recommended ${recommendations.length === 1 ? 'action' : 'actions'} based on current climate and equipment state`,
                status: `${recommendations.length} Actions`,
                statusClass: 'text-primary border-primary/30',
              },
            ];

            return (
              <div className="space-y-2 max-w-3xl mx-auto">
                <div className="text-center pb-4">
                  <p className="text-sm font-semibold">Operational Intelligence Chain</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How today's {oat}°F OAT cascades through your facility operations
                  </p>
                </div>
                {chain.map((node, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={cn('w-full rounded-xl border p-4 bg-card/50', node.border)}>
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', node.iconBg)}>
                          <node.icon className={cn('w-4 h-4', node.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Step {node.step}</span>
                              <span className="text-xs font-semibold">{node.title}</span>
                            </div>
                            <Badge variant="outline" className={cn('text-[10px] h-5 shrink-0', node.statusClass)}>
                              {node.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1 leading-snug">{node.value}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{node.detail}</p>
                        </div>
                      </div>
                    </div>
                    {i < chain.length - 1 && (
                      <div className="flex flex-col items-center py-0.5">
                        <div className="w-px h-3 bg-primary/20" />
                        <span className="text-primary/40 text-[10px] leading-none">▼</span>
                        <div className="w-px h-3 bg-primary/20" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      ) : (
        /* No location configured */
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-base font-medium">Facility location not configured</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Set your facility city and state during onboarding to enable live weather and HVAC performance correlation.
            </p>
            <Button variant="outline" onClick={() => navigate('/onboarding')}>
              <Settings className="w-4 h-4 mr-2" />Configure Location
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
