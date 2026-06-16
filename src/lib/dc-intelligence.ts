// Decision Continuity™ Intelligence — shared data hook for all dashboards
// Self-aware about tier gating (dc_vault = premium+) and role-based filtering.
// Callers simply mount it; it handles access control internally.

import { useState, useEffect, useCallback } from 'react';
import { useTier } from '@/hooks/useTier';
import { useAuth } from '@/hooks/useAuth';
import { ROLES_BY_ORG_TYPE } from '@/config/roles';

const API = import.meta.env.VITE_API_BASE_URL as string;

function getToken() {
  return (
    localStorage.getItem('nexum_id_token') ||
    localStorage.getItem('nexum_access_token') ||
    ''
  );
}

// ── Role classification helpers ────────────────────────────────────────────────

const ALL_LEADERSHIP_ROLES = new Set([
  ...ROLES_BY_ORG_TYPE.facility.leadership,
  ...ROLES_BY_ORG_TYPE.retail.leadership,
  ...ROLES_BY_ORG_TYPE.government.leadership,
  'admin',
  'owner',
  'operations_manager',
  'dispatch_manager',
]);

const EXECUTIVE_ROLES = new Set([
  'executive', 'director', 'admin', 'owner', 'chief',
  'operations_manager', 'dispatch_manager',
]);

const MANAGER_ROLES = new Set([
  'manager', 'captain', 'lieutenant',
  'compliance_officer', 'shift_lead',
]);

/**
 * Derive DC roleScope from user role string.
 * admin / executive → 'executive'  (all chains, full stats)
 * manager-tier      → 'manager'    (department-filtered)
 * supervisor        → 'supervisor' (active-only + department)
 * everyone else     → 'staff'      (no DC data)
 */
function deriveRoleScope(role: string): 'executive' | 'manager' | 'supervisor' | 'staff' {
  if (role === 'admin' || EXECUTIVE_ROLES.has(role)) return 'executive';
  if (MANAGER_ROLES.has(role)) return 'manager';
  if (role === 'supervisor') return 'supervisor';
  return 'staff';
}

// ── Public types ───────────────────────────────────────────────────────────────

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
  /** True when user lacks tier or role access — callers can gate UI on this */
  accessDenied: boolean;
  refresh: () => void;
}

export interface UseDCIntelligenceOptions {
  /** Only load when this is true (default: true) */
  enabled?: boolean;
  /** Filter chains to a specific department (overrides auto-derived dept filter) */
  department?: string;
  /** Max chains to return (default: 20) */
  limit?: number;
  /**
   * Force a specific role scope. Leave undefined to auto-derive from the
   * logged-in user's role — recommended in most cases.
   *  'executive' → all chains (+ full stats)
   *  'manager'   → department-filtered
   *  'supervisor'→ department-filtered, active-only
   *  'staff'     → no data (returns empty, accessDenied=true)
   */
  roleScope?: 'executive' | 'manager' | 'supervisor' | 'staff';
}

export function useDCIntelligence(options: UseDCIntelligenceOptions = {}): DCIntelligence {
  const { enabled = true, department, limit = 20 } = options;

  const { user }    = useAuth();
  const { can, isAdmin } = useTier();

  const role = user?.role || user?.['custom:role'] || 'staff';
  const userDept = user?.department || user?.['custom:department'] || '';

  // ── Access control ─────────────────────────────────────────────────────────
  // Tier gate: dc_vault requires premium tier (admin always bypasses)
  const hasTierAccess = isAdmin || can('dc_vault');
  // Role gate: only leadership sees DC data
  const hasRoleAccess = isAdmin || ALL_LEADERSHIP_ROLES.has(role);

  const accessDenied = !hasTierAccess || !hasRoleAccess;

  // Derive scope from user's role unless caller overrides
  const roleScope = options.roleScope ?? (accessDenied ? 'staff' : deriveRoleScope(role));

  // Auto-inject department filter for manager/supervisor if none provided
  const effectiveDept = department ?? (
    (roleScope === 'manager' || roleScope === 'supervisor') && userDept
      ? userDept
      : undefined
  );

  const [stats, setStats] = useState<DCStats | null>(null);
  const [chains, setChains] = useState<DCChainSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (accessDenied || roleScope === 'staff') return;

    setLoading(true);
    setError(null);

    const token = getToken();
    if (!token) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const qs = new URLSearchParams();
      if (effectiveDept)              qs.set('department', effectiveDept);
      if (limit)                      qs.set('limit', String(limit));
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
  }, [accessDenied, roleScope, effectiveDept, limit]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { stats, chains, loading, error, accessDenied, refresh: load };
}
