import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Droplets, Thermometer, Wind, MapPin, RefreshCw } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function wmoIcon(code: number) {
  if (code === 0)   return Sun;
  if (code <= 3)    return Cloud;
  if (code <= 48)   return Cloud;
  if (code <= 67)   return CloudRain;
  if (code <= 77)   return CloudSnow;
  if (code <= 82)   return CloudRain;
  if (code <= 86)   return CloudSnow;
  return CloudLightning;
}

function wmoLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2)  return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

function minutesAgo(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1)  return 'just now';
  if (min === 1) return '1 min ago';
  return `${min} min ago`;
}

export function WeatherBar() {
  const { weather, loading, error, refresh } = useWeather();

  if (loading) {
    return (
      <div className="h-8 border-b border-border/40 bg-muted/20 flex items-center px-4 md:px-6 gap-3">
        <div className="flex gap-2 animate-pulse">
          <div className="w-20 h-3 rounded bg-muted" />
          <div className="w-16 h-3 rounded bg-muted" />
          <div className="w-24 h-3 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !weather) return null;

  const Icon  = wmoIcon(weather.code);
  const label = wmoLabel(weather.code);
  const location = [weather.city, weather.state].filter(Boolean).join(', ');

  return (
    <div className="h-8 border-b border-border/40 bg-muted/20 flex items-center px-4 md:px-6 gap-0 overflow-hidden">

      {/* OAT */}
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <Icon className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-semibold tabular-nums">{weather.temp}°F</span>
        <span className="text-muted-foreground hidden sm:inline">OAT</span>
      </div>

      <span className="mx-3 text-border/80 select-none">|</span>

      {/* Humidity */}
      <div className="flex items-center gap-1 text-xs shrink-0">
        <Droplets className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-semibold tabular-nums">{weather.humidity}%</span>
        <span className="text-muted-foreground hidden sm:inline">RH</span>
      </div>

      <span className="mx-3 text-border/80 select-none hidden sm:inline">|</span>

      {/* Condition */}
      <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">{label}</span>

      <span className="mx-3 text-border/80 select-none hidden md:inline">|</span>

      {/* Location */}
      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <MapPin className="w-3 h-3" />
        <span>{location}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Detail popover + refresh */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-1">
            <span>Updated {minutesAgo(weather.fetchedAt)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0" align="end" sideOffset={4}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{location || 'Facility Location'}</span>
                </div>
                <p className="text-2xl font-bold">{weather.temp}°F</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <Icon className="w-8 h-8 text-sky-400 mt-1 shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
              <div className="text-center">
                <Thermometer className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
                <p className="text-xs font-semibold">{weather.feelsLike}°F</p>
                <p className="text-[10px] text-muted-foreground">Feels Like</p>
              </div>
              <div className="text-center">
                <Droplets className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs font-semibold">{weather.humidity}%</p>
                <p className="text-[10px] text-muted-foreground">Humidity</p>
              </div>
              <div className="text-center">
                <Wind className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold">{weather.windSpeed} mph</p>
                <p className="text-[10px] text-muted-foreground">Wind</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                Updated {minutesAgo(weather.fetchedAt)}
              </span>
              <button
                onClick={refresh}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Refresh
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <button
        onClick={refresh}
        className="ml-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="Refresh weather"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
