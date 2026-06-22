/**
 * BMSPollService
 * ─────────────────────────────────────────────────────────────────────────────
 * Background singleton that polls all connected BAS / BMS / CMMS integrations
 * every 3 hours.  Results are stored to localStorage so every intelligence
 * layer (Equipment, Climate, Energy, Operational, Drift, etc.) can consume
 * them without hitting the API on every render.
 *
 * Storage keys written:
 *   nexum_bms_live_data       — raw feed data keyed by feedId
 *   nexum_bms_poll_status     — poll health + timing info
 *   nexum_facility_logs       — BMS readings appended as facility log entries
 *   nexum_climate_bms_data    — climate-relevant points (temp, humidity, CO2)
 *   nexum_energy_bms_data     — energy-relevant points (kW, kWh, demand, PF)
 *
 * Events dispatched:
 *   nexum_bms_poll_update     — fired after every poll attempt (success or fail)
 */

import { listBMSFeeds, getBMSFeedData, listSkids, getSkidData } from '@/lib/nexum-api';

const POLL_INTERVAL_MS  = 3 * 60 * 60 * 1000; // 3 hours
const STATUS_KEY        = 'nexum_bms_poll_status';
const LIVE_DATA_KEY     = 'nexum_bms_live_data';
const CLIMATE_KEY       = 'nexum_climate_bms_data';
const ENERGY_KEY        = 'nexum_energy_bms_data';
const FAC_LOGS_KEY      = 'nexum_facility_logs';

// Point-name patterns that classify into climate vs energy buckets
const CLIMATE_KEYWORDS  = ['temp', 'temperature', 'humidity', 'rh', 'co2', 'co_2', 'dew', 'pressure', 'iaq', 'voc', 'pm2', 'pm10', 'airflow', 'cfm'];
const ENERGY_KEYWORDS   = ['kw', 'kwh', 'demand', 'power', 'current', 'voltage', 'amps', 'pf', 'power_factor', 'thd', 'va', 'var'];

export interface BMSPollStatus {
  lastPolledAt:        string | null;
  nextPollAt:          string | null;
  activeFeedsCount:    number;
  totalDataPoints:     number;
  alarmCount:          number;
  status:              'idle' | 'polling' | 'success' | 'error';
  errorMessage?:       string;
  lastPollDurationMs?: number;
}

class BMSPollServiceClass {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    if (this.intervalId !== null) return; // already running
    // Fire immediately on startup, then on 3-hour cadence
    this.poll().catch(() => {});
    this.intervalId = setInterval(() => this.poll().catch(() => {}), POLL_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Manually trigger an immediate poll outside of the scheduled interval. */
  async triggerNow(): Promise<void> {
    return this.poll();
  }

  // ── Core poll cycle ────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (this.running) return; // don't overlap polls
    const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
    if (!token) return; // not authenticated — skip silently

    this.running = true;
    const start = Date.now();
    this.setStatus({ status: 'polling', lastPolledAt: this.getStatus().lastPolledAt, nextPollAt: null, activeFeedsCount: 0, totalDataPoints: 0, alarmCount: 0 });

    try {
      const [feedResults, skidResults] = await Promise.allSettled([
        this.pollBMSFeeds(),
        this.pollSkids(),
      ]);

      const feedData  = feedResults.status  === 'fulfilled' ? feedResults.value  : { count: 0, alarms: 0, points: 0 };
      const skidData  = skidResults.status  === 'fulfilled' ? skidResults.value  : { count: 0, alarms: 0, points: 0 };

      const now = new Date();
      const nextPoll = new Date(now.getTime() + POLL_INTERVAL_MS);

      this.setStatus({
        status:              'success',
        lastPolledAt:        now.toISOString(),
        nextPollAt:          nextPoll.toISOString(),
        activeFeedsCount:    feedData.count + skidData.count,
        totalDataPoints:     feedData.points + skidData.points,
        alarmCount:          feedData.alarms + skidData.alarms,
        lastPollDurationMs:  Date.now() - start,
      });
    } catch (err: any) {
      this.setStatus({
        ...this.getStatus(),
        status:       'error',
        errorMessage: err?.message || 'Unknown poll error',
      });
    } finally {
      this.running = false;
      this.dispatch();
    }
  }

  // ── BMS Feed polling ───────────────────────────────────────────────────────

  private async pollBMSFeeds(): Promise<{ count: number; alarms: number; points: number }> {
    const feedsResp = await listBMSFeeds();
    const feeds = feedsResp.feeds || [];
    const activeFeeds = feeds.filter((f: any) => f.status === 'active');

    const liveData: Record<string, any> = this.readLocal(LIVE_DATA_KEY) || {};
    const climateBatch: any[] = [];
    const energyBatch:  any[] = [];
    const logBatch:     any[] = [];
    let totalPoints = 0;
    let totalAlarms = 0;

    for (const feed of activeFeeds) {
      try {
        const data = await getBMSFeedData(feed.feedId);
        liveData[feed.feedId] = { ...data, _polledAt: new Date().toISOString() };
        totalAlarms += data.alarmCount || 0;

        const equipment: any[] = data.equipment || [];
        for (const eq of equipment) {
          const points: Record<string, any> = eq.points || {};
          totalPoints += Object.keys(points).length;

          // Classify points into intelligence buckets
          const climateEntry: Record<string, number> = {};
          const energyEntry:  Record<string, number> = {};
          const logMetrics:   Record<string, number> = {};

          for (const [key, point] of Object.entries(points)) {
            const k = key.toLowerCase();
            const val = typeof (point as any).value === 'number' ? (point as any).value : null;
            if (val === null) continue;

            logMetrics[key] = val;

            if (CLIMATE_KEYWORDS.some(kw => k.includes(kw))) {
              climateEntry[key] = val;
            } else if (ENERGY_KEYWORDS.some(kw => k.includes(kw))) {
              energyEntry[key] = val;
            }
          }

          const ts = new Date().toISOString();

          if (Object.keys(logMetrics).length > 0) {
            logBatch.push({
              PK:         `FACILITY#${feed.facilityId || 'bms'}`,
              SK:         `LOG#${ts}`,
              facilityId: feed.facilityId || 'bms',
              source:     'bms_auto',
              systemType: eq.equipmentType || 'bms',
              equipmentId: eq.equipmentId,
              timestamp:  ts,
              feedId:     feed.feedId,
              feedName:   feed.name,
              protocol:   feed.protocol,
              inAlarm:    eq.inAlarm || false,
              ...logMetrics,
            });
          }

          if (Object.keys(climateEntry).length > 0) {
            climateBatch.push({ ts, equipmentId: eq.equipmentId, feedId: feed.feedId, ...climateEntry });
          }
          if (Object.keys(energyEntry).length > 0) {
            energyBatch.push({ ts, equipmentId: eq.equipmentId, feedId: feed.feedId, ...energyEntry });
          }
        }
      } catch {
        // One feed failing shouldn't abort the others
      }
    }

    this.writeLocal(LIVE_DATA_KEY, liveData);
    this.appendLogs(logBatch);
    this.appendBucket(CLIMATE_KEY, climateBatch);
    this.appendBucket(ENERGY_KEY, energyBatch);

    return { count: activeFeeds.length, alarms: totalAlarms, points: totalPoints };
  }

  // ── Skid / CMMS polling ────────────────────────────────────────────────────

  private async pollSkids(): Promise<{ count: number; alarms: number; points: number }> {
    const skidsResp = await listSkids();
    const skids = skidsResp.skids || [];
    const connectedSkids = skids.filter((s: any) => s.bmsIntegrationId && s.status === 'active');

    let totalAlarms = 0;
    let totalPoints = 0;
    const liveData: Record<string, any> = this.readLocal(LIVE_DATA_KEY) || {};
    const logBatch: any[] = [];

    for (const skid of connectedSkids) {
      try {
        const data = await getSkidData(skid.skidId);
        liveData[`skid_${skid.skidId}`] = { ...data, _polledAt: new Date().toISOString() };
        totalAlarms += data.alarmCount || 0;

        const liveItems: any[] = data.liveData || [];
        for (const eq of liveItems) {
          const points: Record<string, any> = eq.points || {};
          const metrics: Record<string, number> = {};
          for (const [key, point] of Object.entries(points)) {
            const val = typeof (point as any).value === 'number' ? (point as any).value : null;
            if (val !== null) { metrics[key] = val; totalPoints++; }
          }
          if (Object.keys(metrics).length > 0) {
            logBatch.push({
              PK:         `FACILITY#skid`,
              SK:         `LOG#${new Date().toISOString()}`,
              source:     'cmms_auto',
              systemType: eq.equipmentType || 'skid',
              equipmentId: eq.equipmentId,
              skidId:     skid.skidId,
              skidName:   skid.skidName,
              timestamp:  new Date().toISOString(),
              inAlarm:    eq.inAlarm || false,
              ...metrics,
            });
          }
        }
      } catch {
        // One skid failing shouldn't abort the others
      }
    }

    this.writeLocal(LIVE_DATA_KEY, liveData);
    this.appendLogs(logBatch);

    return { count: connectedSkids.length, alarms: totalAlarms, points: totalPoints };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Append new log entries to nexum_facility_logs (capped at 1000). */
  private appendLogs(entries: any[]) {
    if (!entries.length) return;
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(FAC_LOGS_KEY) || '[]');
      const merged = [...entries, ...existing].slice(0, 1000);
      localStorage.setItem(FAC_LOGS_KEY, JSON.stringify(merged));
    } catch { /* silent */ }
  }

  /** Append entries to a keyed bucket (climate/energy), capped at 500. */
  private appendBucket(key: string, entries: any[]) {
    if (!entries.length) return;
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const merged = [...entries, ...existing].slice(0, 500);
      localStorage.setItem(key, JSON.stringify(merged));
    } catch { /* silent */ }
  }

  private readLocal(key: string): any {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  private writeLocal(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* silent */ }
  }

  getStatus(): BMSPollStatus {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      if (raw) return JSON.parse(raw) as BMSPollStatus;
    } catch { /* ignore */ }
    return { status: 'idle', lastPolledAt: null, nextPollAt: null, activeFeedsCount: 0, totalDataPoints: 0, alarmCount: 0 };
  }

  private setStatus(s: BMSPollStatus) {
    try { localStorage.setItem(STATUS_KEY, JSON.stringify(s)); } catch { /* silent */ }
  }

  private dispatch() {
    try { window.dispatchEvent(new CustomEvent('nexum_bms_poll_update')); } catch { /* silent */ }
  }

  /** How long until the next scheduled poll (in seconds). */
  msUntilNextPoll(): number | null {
    const { nextPollAt } = this.getStatus();
    if (!nextPollAt) return null;
    return Math.max(0, new Date(nextPollAt).getTime() - Date.now());
  }
}

export const BMSPollService = new BMSPollServiceClass();
