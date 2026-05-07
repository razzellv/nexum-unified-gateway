/**
 * sync-storage.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Local-first data layer for Nexum Suum.
 *
 * Pattern:
 *   1. WRITE  → localStorage immediately (zero latency for the UI)
 *             → enqueue background sync to API / S3 via Lambda
 *   2. READ   → try API first; fall back to localStorage on error/offline
 *   3. QUEUE  → persisted to localStorage so pending syncs survive page refresh
 *
 * All keys are scoped to facilityId to prevent cross-tenant leakage.
 *
 * Usage:
 *   import { syncWrite, syncRead, getSyncStatus } from '@/lib/sync-storage';
 *
 *   // Write (instant local + background cloud sync)
 *   await syncWrite('nexum_inventory', items, '/inventory', facilityId);
 *
 *   // Read (cloud-first with local fallback)
 *   const items = await syncRead('nexum_inventory', '/inventory', facilityId);
 *
 *   // Status badge
 *   const { pending, failed, lastSynced } = getSyncStatus();
 */

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'offline';

export interface SyncQueueEntry {
  id: string;
  localKey: string;
  endpoint: string;
  method: 'PUT' | 'POST';
  payload: any;
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
}

const QUEUE_KEY  = 'nexum_sync_queue';
const STATUS_KEY = 'nexum_sync_status';
const MAX_ATTEMPTS = 5;

// ── Internal helpers ──────────────────────────────────────────────────────────

function getQueue(): SyncQueueEntry[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function setQueue(q: SyncQueueEntry[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_BASE_URL || '';
}

function getToken(): string {
  return localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
}

function scopedKey(key: string, facilityId: string): string {
  // Avoid double-scoping if key already contains facilityId
  if (key.includes(facilityId)) return key;
  return `${key}_${facilityId}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Write data locally (instant) and enqueue a background sync to the cloud.
 * @param key        Base localStorage key (will be scoped to facilityId)
 * @param data       The data to store
 * @param endpoint   API path to sync to, e.g. '/inventory'
 * @param facilityId Tenant identifier
 * @param method     HTTP method — defaults to PUT
 */
export async function syncWrite<T>(
  key: string,
  data: T,
  endpoint: string,
  facilityId: string,
  method: 'PUT' | 'POST' = 'PUT',
): Promise<void> {
  // 1. Persist locally right away
  const local = scopedKey(key, facilityId);
  localStorage.setItem(local, JSON.stringify(data));
  updateSyncTimestamp('pending');

  // 2. Enqueue cloud sync
  const entry: SyncQueueEntry = {
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    localKey:    local,
    endpoint:    `${endpoint}?facility_id=${facilityId}`,
    method,
    payload:     data,
    enqueuedAt:  new Date().toISOString(),
    attempts:    0,
  };

  const q = getQueue();
  // Deduplicate — replace any existing entry for the same key+endpoint
  const idx = q.findIndex(e => e.localKey === local && e.endpoint === entry.endpoint);
  if (idx >= 0) q.splice(idx, 1);
  q.push(entry);
  setQueue(q);

  // 3. Try to flush immediately (fire-and-forget — never throws)
  flushQueue().catch(() => { /* handled inside */ });
}

/**
 * Read data — tries the API first, falls back to localStorage.
 * @param key        Base localStorage key (will be scoped to facilityId)
 * @param endpoint   API path, e.g. '/inventory'
 * @param facilityId Tenant identifier
 * @returns The data, or null if nothing is available
 */
export async function syncRead<T>(
  key: string,
  endpoint: string,
  facilityId: string,
): Promise<T | null> {
  const local     = scopedKey(key, facilityId);
  const apiBase   = getApiBase();
  const token     = getToken();

  if (apiBase && token) {
    try {
      const res = await fetch(`${apiBase}${endpoint}?facility_id=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const fresh = await res.json() as T;
        // Mirror to localStorage as backup
        localStorage.setItem(local, JSON.stringify(fresh));
        updateSyncTimestamp('synced');
        return fresh;
      }
    } catch { /* fall through to localStorage */ }
  }

  // Fallback: localStorage
  try {
    const cached = localStorage.getItem(local);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* ignore */ }

  return null;
}

/**
 * Flush the sync queue — attempts to push all pending entries to the API.
 * Safe to call at any time; silently skips entries that fail.
 */
export async function flushQueue(): Promise<void> {
  const q = getQueue();
  if (q.length === 0) return;

  const apiBase = getApiBase();
  const token   = getToken();
  if (!apiBase || !token) return; // offline or not authenticated

  const updated: SyncQueueEntry[] = [];
  let anyFailed = false;

  for (const entry of q) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      anyFailed = true;
      updated.push({ ...entry, lastError: 'Max retry attempts exceeded' });
      continue;
    }
    try {
      const res = await fetch(`${apiBase}${entry.endpoint}`, {
        method:  entry.method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:   JSON.stringify(entry.payload),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        // Success — drop from queue (don't push to updated)
        continue;
      }
      // Server error — keep with incremented attempts
      updated.push({ ...entry, attempts: entry.attempts + 1, lastError: `HTTP ${res.status}` });
      anyFailed = true;
    } catch (err: any) {
      updated.push({ ...entry, attempts: entry.attempts + 1, lastError: err?.message || 'Network error' });
      anyFailed = true;
    }
  }

  setQueue(updated);
  updateSyncTimestamp(updated.length === 0 ? 'synced' : anyFailed ? 'failed' : 'pending');
}

// ── Sync status (for UI badges) ───────────────────────────────────────────────

interface SyncState {
  status:     SyncStatus;
  pending:    number;
  failed:     number;
  lastSynced: string | null;
}

function updateSyncTimestamp(status: SyncStatus) {
  const q = getQueue();
  const state: SyncState = {
    status,
    pending:    q.filter(e => e.attempts < MAX_ATTEMPTS).length,
    failed:     q.filter(e => e.attempts >= MAX_ATTEMPTS).length,
    lastSynced: status === 'synced' ? new Date().toISOString() : getSyncStatus().lastSynced,
  };
  localStorage.setItem(STATUS_KEY, JSON.stringify(state));
}

export function getSyncStatus(): SyncState {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as SyncState;
  } catch { /* ignore */ }
  return { status: 'synced', pending: 0, failed: 0, lastSynced: null };
}

/**
 * Auto-flush on page focus and network reconnect.
 * Call once at app startup (e.g. in App.tsx).
 */
export function initSyncListeners(): () => void {
  const onFocus   = () => flushQueue().catch(() => {});
  const onOnline  = () => flushQueue().catch(() => {});

  window.addEventListener('focus',  onFocus);
  window.addEventListener('online', onOnline);

  // Initial flush
  flushQueue().catch(() => {});

  return () => {
    window.removeEventListener('focus',  onFocus);
    window.removeEventListener('online', onOnline);
  };
}

// ── SyncStatusBadge helper (returns display props) ──────────────────────────

export function getSyncBadgeProps(): { label: string; color: string; title: string } {
  const { status, pending, failed, lastSynced } = getSyncStatus();
  const lastSync = lastSynced ? `Last synced: ${new Date(lastSynced).toLocaleTimeString()}` : 'Not yet synced';

  if (status === 'synced')  return { label: 'Synced',         color: 'text-green-400',  title: lastSync };
  if (status === 'pending') return { label: `Syncing (${pending})`, color: 'text-yellow-400', title: `${pending} change${pending !== 1 ? 's' : ''} pending. ${lastSync}` };
  if (status === 'failed')  return { label: `Sync failed (${failed})`, color: 'text-red-400', title: `${failed} item${failed !== 1 ? 's' : ''} failed to sync. Will retry on next action.` };
  return { label: 'Offline', color: 'text-muted-foreground', title: 'Working offline. Data saved locally.' };
}
