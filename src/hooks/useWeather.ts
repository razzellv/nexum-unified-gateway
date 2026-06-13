import { useState, useEffect } from 'react';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  city: string;
  state: string;
  fetchedAt: number;
}

interface CachedCoords {
  lat: number;
  lon: number;
  city: string;
  state: string;
  resolvedAt: number;
}

const WEATHER_TTL = 10 * 60 * 1000;
const COORDS_TTL  = 24 * 60 * 60 * 1000;

async function resolveCoords(): Promise<CachedCoords | null> {
  const raw = localStorage.getItem('nexum_weather_coords');
  if (raw) {
    try {
      const cached: CachedCoords = JSON.parse(raw);
      if (Date.now() - cached.resolvedAt < COORDS_TTL) return cached;
    } catch {}
  }

  const city  = localStorage.getItem('nexum_facility_city')?.trim();
  const state = localStorage.getItem('nexum_facility_state')?.trim();

  if (city) {
    try {
      const q   = encodeURIComponent(city + (state ? ` ${state}` : ''));
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`
      );
      const data = await res.json();
      const r = data.results?.[0];
      if (r) {
        const coords: CachedCoords = {
          lat: r.latitude,
          lon: r.longitude,
          city: r.name,
          state: r.admin1 || state || '',
          resolvedAt: Date.now(),
        };
        localStorage.setItem('nexum_weather_coords', JSON.stringify(coords));
        return coords;
      }
    } catch {}
  }

  // Fall back to browser geolocation
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords: CachedCoords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          city: 'Facility',
          state: '',
          resolvedAt: Date.now(),
        };
        localStorage.setItem('nexum_weather_coords', JSON.stringify(coords));
        resolve(coords);
      },
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

async function fetchWeather(force: boolean): Promise<WeatherData | null> {
  if (!force) {
    const raw = localStorage.getItem('nexum_weather_cache');
    if (raw) {
      try {
        const cached: WeatherData = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < WEATHER_TTL) return cached;
      } catch {}
    }
  }

  const coords = await resolveCoords();
  if (!coords) return null;

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
  );
  const data = await res.json();
  const c = data.current;

  const w: WeatherData = {
    temp:      Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity:  Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    code:      c.weather_code,
    city:      coords.city,
    state:     coords.state,
    fetchedAt: Date.now(),
  };

  localStorage.setItem('nexum_weather_cache', JSON.stringify(w));
  return w;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    setError(false);
    try {
      const w = await fetchWeather(force);
      setWeather(w);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { weather, loading, error, refresh: () => load(true) };
}
