/**
 * 🕵️ useAuditTrail Hook
 * =====================================================
 * Manages audit trail data for a specific resource/record.
 * 
 * Usage:
 *   const { entries, loading, error, fetchAudit, addEntry } = useAuditTrail('countries', recordId);
 */

import { useState, useCallback } from 'react';
import { AuditEntry } from '../lib/governance/types';

interface UseAuditTrailResult {
  /** Audit entries for this resource/record */
  entries: AuditEntry[];
  /** Whether entries are being fetched */
  loading: boolean;
  /** Error message from last fetch */
  error: string | null;
  /** Fetch audit entries from the API */
  fetchAudit: () => Promise<void>;
  /** Add a local audit entry (not persisted to API) */
  addEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  /** Clear all entries */
  clearEntries: () => void;
}

export function useAuditTrail(
  resourceName: string,
  recordId?: number | string
): UseAuditTrailResult {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch audit entries from the API.
   * GET /api/audit-logs?resource={resourceName}&recordId={recordId}
   */
  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

      const params = new URLSearchParams();
      params.set('resource', resourceName);
      if (recordId !== undefined && recordId !== null) {
        params.set('recordId', String(recordId));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/audit-logs?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to fetch audit logs (${res.status})`);
      }

      const body = await res.json();

      // API may return { data: [...] } or { audit_logs: [...] } or just [...]
      let rawEntries: any[] = [];
      if (Array.isArray(body)) {
        rawEntries = body;
      } else if (Array.isArray(body.data)) {
        rawEntries = body.data;
      } else if (Array.isArray(body.audit_logs)) {
        rawEntries = body.audit_logs;
      }

      // Normalize entries to AuditEntry shape
      const normalized: AuditEntry[] = rawEntries.map((entry: any) => ({
        id: entry.id,
        action: entry.action || entry.action_type || 'view',
        userId: entry.user_id || entry.userId,
        userEmail: entry.user_email || entry.userEmail,
        userName: entry.user_name || entry.userName || entry.user_email || '',
        timestamp: entry.timestamp || entry.created_at || entry.createdAt || new Date().toISOString(),
        description: entry.description || entry.details || '',
        changes: entry.changes || entry.before_data || entry.after_data
          ? normalizeChanges(entry)
          : undefined,
        ipAddress: entry.ip_address || entry.ipAddress,
        userAgent: entry.user_agent || entry.userAgent,
      }));

      setEntries(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit trail');
      console.error('[useAuditTrail] Error fetching audit:', err);
    } finally {
      setLoading(false);
    }
  }, [resourceName, recordId]);

  /**
   * Add a local audit entry (not persisted to API).
   * Useful for optimistic UI updates or client-side tracking.
   */
  const addEntry = useCallback(
    (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    },
    []
  );

  /**
   * Clear all entries.
   */
  const clearEntries = useCallback(() => {
    setEntries([]);
    setError(null);
  }, []);

  return {
    entries,
    loading,
    error,
    fetchAudit,
    addEntry,
    clearEntries,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Normalize audit entry changes from various backend formats into
 * the AuditEntry.changes format.
 */
function normalizeChanges(
  entry: any
): Array<{ field: string; oldValue: any; newValue: any }> | undefined {
  // Format 1: Already in { field, oldValue, newValue }[] format
  if (Array.isArray(entry.changes)) {
    return entry.changes;
  }

  // Format 2: { changes: { fieldName: { before, after } } } — record-style
  if (entry.changes && typeof entry.changes === 'object' && !Array.isArray(entry.changes)) {
    return Object.entries(entry.changes).map(([field, change]: [string, any]) => ({
      field,
      oldValue: change?.before ?? change?.old ?? change?.oldValue ?? null,
      newValue: change?.after ?? change?.new ?? change?.newValue ?? null,
    }));
  }

  // Format 3: before_data / after_data JSONB columns
  if (entry.before_data || entry.after_data) {
    const before = entry.before_data || {};
    const after = entry.after_data || {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    for (const key of allKeys) {
      const oldVal = before[key];
      const newVal = after[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal ?? null, newValue: newVal ?? null });
      }
    }

    return changes.length > 0 ? changes : undefined;
  }

  return undefined;
}
