/**
 * ============================================================================
 * §17.4 — useKeyboardShortcuts Hook
 * ============================================================================
 * Global keyboard shortcut handler per §17.4:
 *   - Ctrl+S → Save/Submit
 *   - Ctrl+K → Open global search/command palette
 *   - Escape → Close modal
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     'ctrl+s': () => handleSave(),
 *     'ctrl+k': () => setSearchOpen(true),
 *     'escape':  () => setModalOpen(false),
 *   });
 *
 *   // Or use the global provider for Ctrl+K:
 *   <KeyboardShortcutProvider onGlobalSearch={() => setOpen(true)} />
 * ============================================================================
 */

import { useEffect, useCallback, useRef } from 'react';

export type ShortcutKey =
  | 'ctrl+s'
  | 'ctrl+k'
  | 'ctrl+z'
  | 'ctrl+shift+z'
  | 'ctrl+p'
  | 'ctrl+n'
  | 'escape'
  | 'f1'
  | 'f2'
  | string;

type ShortcutMap = Partial<Record<ShortcutKey, () => void>>;

/**
 * Parse a keyboard event into a shortcut string like "ctrl+s" or "ctrl+shift+k".
 */
function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (!e.key) return '';

  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');

  const key = e.key.toLowerCase();
  // Avoid duplicate modifiers
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Hook for registering keyboard shortcuts on the current component/page.
 *
 * @param shortcuts - Map of shortcut keys to handler functions
 * @param enabled - Whether shortcuts are active (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Allow Escape and Ctrl+S even when typing
      const shortcut = eventToShortcut(e);
      const isAlwaysActive = shortcut === 'escape' || shortcut === 'ctrl+s';

      if (isTyping && !isAlwaysActive) return;

      const handler = shortcutsRef.current[shortcut];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        handler();
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export default useKeyboardShortcuts;
