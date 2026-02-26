/**
 * 🔗 useReferenceIntegrity Hook
 * =====================================================
 * Checks reference integrity before delete operations.
 * 
 * Queries related tables to determine if a record is referenced
 * by other entities, preventing orphaned foreign keys.
 * 
 * Usage:
 *   const { checkReferences, references, loading, canDelete } = useReferenceIntegrity(relations);
 *   
 *   // Before showing delete confirm dialog:
 *   await checkReferences(recordId);
 *   if (!canDelete) { showToast('error', 'Cannot delete: record is in use'); }
 */

import { useState, useCallback } from 'react';

// We import RelationConfig from governance types — use a local interface
// to decouple from the exact shape (supports both naming conventions)
interface RelationConfigLike {
  key: string;
  label: string;
  labelAr?: string;
  endpoint: string;
  foreignKey: string;
  displayFields?: string[];
  linkTo?: string;
}

export interface ReferenceResult {
  /** Relation key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Arabic label */
  labelAr?: string;
  /** Number of records referencing this entity */
  count: number;
  /** Link to navigate to the related records */
  linkTo?: string;
  /** Sample records (first few for display) */
  samples?: Record<string, any>[];
}

interface UseReferenceIntegrityResult {
  /** Check all related tables for references to a record */
  checkReferences: (recordId: number | string) => Promise<void>;
  /** List of relations with reference counts */
  references: ReferenceResult[];
  /** Whether reference check is in progress */
  loading: boolean;
  /** Error from last check */
  error: string | null;
  /** True if no references found (safe to delete) */
  canDelete: boolean;
  /** Total number of referencing records across all relations */
  totalReferences: number;
  /** Reset state */
  reset: () => void;
}

export function useReferenceIntegrity(
  relations?: RelationConfigLike[]
): UseReferenceIntegrityResult {
  const [references, setReferences] = useState<ReferenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(true);
  const [totalReferences, setTotalReferences] = useState(0);

  /**
   * Check all configured relations for references to the given record.
   * Queries each relation's endpoint with the foreign key filter.
   */
  const checkReferences = useCallback(
    async (recordId: number | string) => {
      // No relations configured — always safe to delete
      if (!relations || relations.length === 0) {
        setCanDelete(true);
        setReferences([]);
        setTotalReferences(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        // Check all relations in parallel
        const results = await Promise.allSettled(
          relations.map(async (relation): Promise<ReferenceResult> => {
            const separator = relation.endpoint.includes('?') ? '&' : '?';
            const url = `${apiUrl}${relation.endpoint}${separator}${relation.foreignKey}=${encodeURIComponent(String(recordId))}&limit=5`;

            const res = await fetch(url, {
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });

            if (!res.ok) {
              // If we can't check (permission denied, endpoint not found), assume safe
              console.warn(
                `[useReferenceIntegrity] Could not check ${relation.key}: ${res.status}`
              );
              return {
                key: relation.key,
                label: relation.label,
                labelAr: relation.labelAr,
                count: 0,
                linkTo: relation.linkTo,
              };
            }

            const body = await res.json();

            // Extract count and samples from various response formats
            let count = 0;
            let samples: Record<string, any>[] = [];

            if (typeof body.total === 'number') {
              count = body.total;
            } else if (typeof body.count === 'number') {
              count = body.count;
            }

            if (Array.isArray(body.data)) {
              samples = body.data.slice(0, 5);
              if (count === 0) count = body.data.length;
            } else if (Array.isArray(body)) {
              samples = body.slice(0, 5);
              if (count === 0) count = body.length;
            }

            return {
              key: relation.key,
              label: relation.label,
              labelAr: relation.labelAr,
              count,
              linkTo: relation.linkTo
                ? `${relation.linkTo}?${relation.foreignKey}=${recordId}`
                : undefined,
              samples: samples.length > 0 ? samples : undefined,
            };
          })
        );

        // Process results
        const refResults: ReferenceResult[] = [];
        let total = 0;

        for (const result of results) {
          if (result.status === 'fulfilled') {
            refResults.push(result.value);
            total += result.value.count;
          } else {
            // On failure, treat as safe (don't block delete due to network errors)
            console.warn('[useReferenceIntegrity] Check failed:', result.reason);
          }
        }

        setReferences(refResults);
        setTotalReferences(total);
        setCanDelete(total === 0);
      } catch (err: any) {
        setError(err.message || 'Failed to check references');
        console.error('[useReferenceIntegrity] Error:', err);
        // On error, default to allowing delete (don't block on check failure)
        setCanDelete(true);
      } finally {
        setLoading(false);
      }
    },
    [relations]
  );

  /**
   * Reset all state.
   */
  const reset = useCallback(() => {
    setReferences([]);
    setLoading(false);
    setError(null);
    setCanDelete(true);
    setTotalReferences(0);
  }, []);

  return {
    checkReferences,
    references,
    loading,
    error,
    canDelete,
    totalReferences,
    reset,
  };
}
