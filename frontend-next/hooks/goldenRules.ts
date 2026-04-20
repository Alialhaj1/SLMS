/**
 * ============================================================================
 * §17 — Golden Rules: Hook Barrel Export
 * ============================================================================
 * All §17 hooks re-exported for clean imports:
 *
 *   import {
 *     useDebounce,
 *     useAutoSave,
 *     useUnsavedChanges,
 *     useKeyboardShortcuts,
 *     useVirtualScroll,
 *     useCachedQuery,
 *     useExcelExport,
 *     usePrint,
 *   } from '@/hooks/goldenRules';
 * ============================================================================
 */

// §17.3 — Performance
export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useCachedQuery, invalidateQuery, invalidateQueries, clearQueryCache, setQueryData } from './useCachedQuery';
export { useVirtualScroll, VIRTUAL_SCROLL_THRESHOLD } from './useVirtualScroll';

// §17.4 — UX
export { useAutoSave } from './useAutoSave';
export { useUnsavedChanges } from './useUnsavedChanges';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useExcelExport } from './useExcelExport';
export { usePrint } from './usePrint';
