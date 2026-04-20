/**
 * ============================================================================
 * §17.4 — useAutoSave Hook
 * ============================================================================
 * Auto-saves form drafts every 30 seconds to localStorage.
 *
 * Usage:
 *   const { isDirty, lastSaved, clearDraft } = useAutoSave('shipment-create', formData, {
 *     interval: 30000, // default 30s per §17.4
 *     onSave: (data) => console.log('Draft saved', data),
 *   });
 *
 *   // Restore draft on mount:
 *   const draft = useAutoSave.getDraft('shipment-create');
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  /** Save interval in ms (default: 30000 = 30 seconds per §17.4) */
  interval?: number;
  /** Enable auto-save (default: true) */
  enabled?: boolean;
  /** Callback when draft is saved */
  onSave?: (data: any) => void;
  /** Callback when draft is restored */
  onRestore?: (data: any) => void;
}

interface AutoSaveReturn<T> {
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Force save now */
  saveNow: () => void;
  /** Restore saved draft (returns null if none) */
  restoreDraft: () => T | null;
  /** Whether a draft exists */
  hasDraft: boolean;
}

const DRAFT_PREFIX = 'slms_draft_';

export function useAutoSave<T>(
  key: string,
  data: T,
  options: AutoSaveOptions = {}
): AutoSaveReturn<T> {
  const {
    interval = 30000, // 30 seconds per §17.4
    enabled = true,
    onSave,
    onRestore,
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const initialDataRef = useRef<string>(JSON.stringify(data));
  const currentDataRef = useRef<T>(data);
  currentDataRef.current = data;

  const storageKey = `${DRAFT_PREFIX}${key}`;

  // Check if draft exists on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setHasDraft(!!stored);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const isDirty = JSON.stringify(data) !== initialDataRef.current;

  const saveNow = useCallback(() => {
    try {
      const payload = JSON.stringify({
        data: currentDataRef.current,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, payload);
      setLastSaved(new Date());
      setHasDraft(true);
      onSave?.(currentDataRef.current);
    } catch (e) {
      console.warn('§17.4 Auto-save failed:', e);
    }
  }, [storageKey, onSave]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setLastSaved(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const restoreDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      onRestore?.(parsed.data);
      return parsed.data as T;
    } catch {
      return null;
    }
  }, [storageKey, onRestore]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const timer = setInterval(() => {
      if (JSON.stringify(currentDataRef.current) !== initialDataRef.current) {
        saveNow();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, isDirty, interval, saveNow]);

  return { isDirty, lastSaved, clearDraft, saveNow, restoreDraft, hasDraft };
}

/**
 * Static helper to get a draft without the hook.
 */
useAutoSave.getDraft = function <T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!stored) return null;
    return JSON.parse(stored).data as T;
  } catch {
    return null;
  }
};

export default useAutoSave;
