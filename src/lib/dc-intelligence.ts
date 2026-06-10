// Decision Continuity™ Intelligence — shared data hook for all dashboards
// Returns role-filtered DC metrics and recent chains so any dashboard can
// display consistent, admissibility-governed decision health data.

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE_URL as string;

function getToken() {
  return (
    localStorage.getItem('nexum_id_token') ||
    localStorage.getItem('nexum_access_token') ||
    ''
  );
}

export interface DCStats {
  totalChains: number;
  activeChains: number;
  completeChains: number;
  admissibleChains: number;
  avgKPS: number | null;
  avgDAR: number | null;
  totalSignals: number;
  signalsByType: Record<string, number>;
  admissibilityRate: number; // derived: admissibleChains/totalChains*100
}

export interface DCChainSummary {
  id: string;
  title: string;
  sourceType: string;
  sourceId?: string;
  status: string;
  department?: string;
  createdAt: string;
  signalCount: number;
  headHash?: string;
  admissibilityVerified?: boolean;
  metrics?: {
    knowledgePreservationScore: number;
    authorizationQuality: number;
    admissibilityRate: number;
    repeatFailureRisk: number;
    decisionAccuracyRate: number | null;
  };
}

export interface DCIntelligence {
  stats: DCStats | null;
  chains: DCChainSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface UseDCIntelligenceOptions {
  /** Only load when this is true (default: true) */
  enabled?: boolean;
  /** Filter chains to a specific department */
  department?: string;
  /** Max chains to return */
  limit?: number;
  /** Only chains matching this role scope:
   *  'executive' → all chains
   *  'manager'   → department-filtered
   *  'supervisor'→ department-filtered, active only
   *  'staff'     → not loaded (returns empty)
   */
  roleScope?: 'executive' | 'manager' | 'supervisor' | 'staff';
}

export function useDCIntelligence(options: UseDCIntelligenceOptions = {}): DCIntelligence {
  const { enabled = true, department, limit = 20, roleScope = 'executive' } = options;

  const [stats, setStats] = useState<DCStats | null>(null);
  const [chains, setChains] = useState<DCChainSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Staff role gets no DC data (not their concern)
    if (roleScope === 'staff') return;

    setLoading(true);
    setError(null);

    const token = getToken();
    if (!token) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Build chain query string
      const qs = new URLSearchParams();
      if (department) qs.set('department', department);
      if (limit)      qs.set('limit', String(limit));
      if (roleScope === 'supervisor') qs.set('status', 'active');

      const [statsRes, chainsRes] = await Promise.allSettled([
        fetch(`${API}/dc-vault/stats`, { headers }),
        fetch(`${API}/dc-vault${qs.toString() ? '?' + qs : ''}`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const raw = await statsRes.value.json();
        const total = raw.totalChains ?? 0;
        const adm   = raw.admissibleChains ?? 0;
        setStats({
          ...raw,
          admissibilityRate: total > 0 ? Math.round((adm / total) * 100) : 0,
        });
      }

      if (chainsRes.status === 'fulfilled' && chainsRes.value.ok) {
        const raw = await chainsRes.value.json();
        setChains(raw.chains ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? 'DC Vault unavailable');
    } finally {
      setLoading(false);
    }
  }, [roleScope, department, limit]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { stats, chains, loading, error, refresh: load };
}
