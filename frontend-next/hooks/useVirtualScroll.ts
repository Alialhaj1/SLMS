/**
 * ============================================================================
 * §17.3 — useVirtualScroll Hook
 * ============================================================================
 * Virtual scrolling for tables with 100+ rows per §17.3.
 * Wraps @tanstack/react-virtual for consistent API across the app.
 *
 * Usage:
 *   const { virtualRows, totalHeight, containerRef } = useVirtualScroll({
 *     count: data.length,
 *     estimateSize: () => 48,  // row height in px
 *     overscan: 10,
 *   });
 *
 *   return (
 *     <div ref={containerRef} style={{ height: '500px', overflow: 'auto' }}>
 *       <div style={{ height: totalHeight }}>
 *         {virtualRows.map(row => (
 *           <div key={row.index} style={{
 *             position: 'absolute', top: row.start, height: row.size
 *           }}>
 *             {data[row.index].name}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * ============================================================================
 */

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

/** Threshold above which virtual scrolling should be enabled */
export const VIRTUAL_SCROLL_THRESHOLD = 100;

interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

interface UseVirtualScrollOptions {
  /** Total number of items */
  count: number;
  /** Estimated item height in pixels */
  estimateSize?: () => number;
  /** Number of items to render above/below the visible area */
  overscan?: number;
  /** Enable virtual scrolling (default: auto-based on threshold) */
  enabled?: boolean;
}

interface UseVirtualScrollReturn {
  /** Virtual items to render */
  virtualRows: VirtualItem[];
  /** Total height of all items (for the spacer div) */
  totalHeight: number;
  /** Ref for the scroll container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Whether virtual scrolling is active */
  isVirtual: boolean;
}

/**
 * Lightweight virtual scroll implementation.
 * Falls back to regular rendering for <= VIRTUAL_SCROLL_THRESHOLD items.
 */
export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const {
    count,
    estimateSize = () => 48,
    overscan = 10,
    enabled,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null!);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const isVirtual = enabled !== undefined
    ? enabled
    : count > VIRTUAL_SCROLL_THRESHOLD;

  // Observe scroll position
  useEffect(() => {
    if (!isVirtual) return;
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => setScrollTop(container.scrollTop);
    const handleResize = () => setContainerHeight(container.clientHeight);

    handleResize();
    container.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [isVirtual]);

  const rowHeight = estimateSize();
  const totalHeight = count * rowHeight;

  const virtualRows = useMemo<VirtualItem[]>(() => {
    if (!isVirtual) {
      // Return all items (no virtualization)
      return Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * rowHeight,
        size: rowHeight,
        end: (i + 1) * rowHeight,
      }));
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      count - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * rowHeight,
        size: rowHeight,
        end: (i + 1) * rowHeight,
      });
    }
    return items;
  }, [isVirtual, count, scrollTop, containerHeight, rowHeight, overscan]);

  return { virtualRows, totalHeight, containerRef, isVirtual };
}

export default useVirtualScroll;
