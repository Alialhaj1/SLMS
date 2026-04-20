/**
 * ============================================================================
 * §17.4 — Global Command Palette (Ctrl+K)
 * ============================================================================
 * Quick-search overlay that searches across:
 *   - Navigation pages (from menu registry)
 *   - Shipments (by number/BL)
 *   - Customers/Vendors (by name)
 *   - Recent items
 *
 * Activated by Ctrl+K keyboard shortcut globally.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useDebounce } from '../../hooks/useDebounce';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: 'page' | 'shipment' | 'customer' | 'vendor' | 'action';
  title: string;
  titleAr?: string;
  subtitle?: string;
  path: string;
  icon?: string;
  /** Group label */
  group: string;
}

interface CommandPaletteProps {
  /** Menu items to search through */
  menuItems?: Array<{
    label: string;
    path?: string;
    key: string;
    children?: any[];
  }>;
  /** Custom search handler for entities */
  onEntitySearch?: (query: string) => Promise<SearchResult[]>;
}

// ─── Flatten Menu Helper ────────────────────────────────────────────────────

function flattenMenu(items: any[], parentLabel = ''): SearchResult[] {
  const results: SearchResult[] = [];
  for (const item of items) {
    if (item.path) {
      results.push({
        id: `page-${item.key || item.path}`,
        type: 'page',
        title: parentLabel ? `${parentLabel} → ${item.label}` : item.label,
        path: item.path,
        group: 'الصفحات | Pages',
      });
    }
    if (item.children?.length) {
      results.push(
        ...flattenMenu(item.children, item.label)
      );
    }
  }
  return results;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette({ menuItems = [], onEntitySearch }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [searchingEntities, setSearchingEntities] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 200);

  // Global Ctrl+K to open
  useKeyboardShortcuts({
    'ctrl+k': () => {
      setIsOpen(true);
      setQuery('');
      setSelectedIndex(0);
    },
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Menu-based results (instant)
  const pageResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return flattenMenu(menuItems).filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q)
    );
  }, [debouncedQuery, menuItems]);

  // Entity search (debounced API call)
  useEffect(() => {
    if (!debouncedQuery.trim() || !onEntitySearch) {
      setEntityResults([]);
      return;
    }
    setSearchingEntities(true);
    onEntitySearch(debouncedQuery)
      .then(setEntityResults)
      .catch(() => setEntityResults([]))
      .finally(() => setSearchingEntities(false));
  }, [debouncedQuery, onEntitySearch]);

  // Quick actions (always shown)
  const quickActions: SearchResult[] = useMemo(() => {
    if (debouncedQuery.trim()) return [];
    return [
      { id: 'act-shipment', type: 'action', title: 'إنشاء شحنة جديدة | New Shipment', path: '/shipments/create', group: 'إجراءات سريعة | Quick Actions' },
      { id: 'act-po', type: 'action', title: 'أمر شراء جديد | New Purchase Order', path: '/purchasing/orders/new', group: 'إجراءات سريعة | Quick Actions' },
      { id: 'act-journal', type: 'action', title: 'قيد يومية جديد | New Journal Entry', path: '/accounting/journals/create', group: 'إجراءات سريعة | Quick Actions' },
      { id: 'act-dashboard', type: 'action', title: 'لوحة التحكم | Dashboard', path: '/dashboard', group: 'إجراءات سريعة | Quick Actions' },
    ];
  }, [debouncedQuery]);

  const allResults = [...quickActions, ...pageResults, ...entityResults];

  // Navigate to selected result
  const navigateTo = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery('');
      router.push(result.path);
    },
    [router]
  );

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (allResults[selectedIndex]) {
          navigateTo(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  if (!isOpen) return null;

  // Group results
  const groups: Record<string, SearchResult[]> = {};
  for (const r of allResults) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  }

  let flatIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[15%] z-[10000] mx-auto w-full max-w-xl px-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-4 dark:border-gray-700">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent py-3 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white"
              placeholder="بحث سريع... | Quick search (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {allResults.length === 0 && debouncedQuery.trim() && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                لا توجد نتائج | No results found
              </div>
            )}

            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
                  {group}
                </div>
                {items.map((result) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={result.id}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                        idx === selectedIndex
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                          result.type === 'page'
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            : result.type === 'action'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                            : result.type === 'shipment'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                            : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                        }`}
                      >
                        {result.type === 'page'
                          ? '📄'
                          : result.type === 'action'
                          ? '⚡'
                          : result.type === 'shipment'
                          ? '🚢'
                          : '👤'}
                      </span>
                      <div className="flex-1 truncate">
                        <span>{result.title}</span>
                        {result.subtitle && (
                          <span className="ml-2 text-xs text-gray-400">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{result.path}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {searchingEntities && (
              <div className="px-4 py-2 text-center text-xs text-gray-400">
                جاري البحث... | Searching...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700">
            <span>
              <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-700">↑↓</kbd> للتنقل
            </span>
            <span>
              <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-700">Enter</kbd> للفتح
            </span>
            <span>
              <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-700">Esc</kbd> لإغلاق
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default CommandPalette;
