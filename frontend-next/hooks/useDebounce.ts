/**
 * ============================================================================
 * §17.3 — useDebounce Hook
 * ============================================================================
 * Reusable debounce hook for search fields (300ms default per §17.3).
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 300);
 *   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 *
 *   // Or as callback:
 *   const debouncedFn = useDebouncedCallback((val) => search(val), 300);
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a value — returns the value after `delay` ms of inactivity.
 * Default delay: 300ms per §17.3.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function.
 * Returns a stable function that will postpone execution until `delay` ms
 * have passed since the last invocation.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export default useDebounce;
