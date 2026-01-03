'use client';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react';

import { cn } from '../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number | ((index: number, item: T) => number);
  /** Height of the container */
  containerHeight: number;
  /** Number of extra items to render above/below viewport */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  /** Key extractor for React list keys */
  getItemKey?: (item: T, index: number) => string | number;
  /** Custom className for the container */
  className?: string;
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Loading state - renders skeleton items */
  isLoading?: boolean;
  /** Number of skeleton items to render when loading */
  loadingItemCount?: number;
  /** Custom skeleton renderer */
  renderSkeleton?: (index: number, style: CSSProperties) => ReactNode;
  /** Callback when scrolled near the end */
  onEndReached?: () => void;
  /** Distance from end to trigger onEndReached (in pixels) */
  endReachedThreshold?: number;
  /** Empty state renderer */
  renderEmpty?: () => ReactNode;
  /** ARIA label for the list */
  ariaLabel?: string;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: CSSProperties;
}

// ============================================================================
// HELPERS
// ============================================================================

function getItemHeight<T>(
  itemHeight: number | ((index: number, item: T) => number),
  index: number,
  item: T
): number {
  return typeof itemHeight === 'function' ? itemHeight(index, item) : itemHeight;
}

function calculateItemOffsets<T>(
  items: T[],
  itemHeight: number | ((index: number, item: T) => number)
): number[] {
  const offsets: number[] = [0];
  let totalHeight = 0;

  for (let i = 0; i < items.length; i++) {
    totalHeight += getItemHeight(itemHeight, i, items[i]);
    offsets.push(totalHeight);
  }

  return offsets;
}

function findStartIndex(offsets: number[], scrollTop: number): number {
  let low = 0;
  let high = offsets.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] < scrollTop) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return Math.max(0, low - 1);
}

// ============================================================================
// COMPONENT
// ============================================================================

function VirtualizedListInner<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  getItemKey,
  className,
  onScroll,
  isLoading = false,
  loadingItemCount = 10,
  renderSkeleton,
  onEndReached,
  endReachedThreshold = 200,
  renderEmpty,
  ariaLabel,
}: VirtualizedListProps<T>): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const endReachedTriggered = useRef(false);

  // Calculate item offsets for variable height support
  const offsets = useMemo(
    () => calculateItemOffsets(items, itemHeight),
    [items, itemHeight]
  );

  const totalHeight = offsets[offsets.length - 1] || 0;

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }

    const start = Math.max(0, findStartIndex(offsets, scrollTop) - overscan);
    let end = start;

    // Find end index
    while (end < items.length && offsets[end] < scrollTop + containerHeight) {
      end++;
    }
    end = Math.min(items.length, end + overscan);

    // Build visible items array
    const visible: VirtualItem<T>[] = [];
    for (let i = start; i < end; i++) {
      const height = getItemHeight(itemHeight, i, items[i]);
      visible.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: offsets[i],
          left: 0,
          right: 0,
          height,
        },
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: visible,
    };
  }, [items, offsets, scrollTop, containerHeight, overscan, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);

      // Check for end reached
      if (onEndReached) {
        const distanceFromEnd = totalHeight - (newScrollTop + containerHeight);
        if (distanceFromEnd <= endReachedThreshold && !endReachedTriggered.current) {
          endReachedTriggered.current = true;
          onEndReached();
        } else if (distanceFromEnd > endReachedThreshold) {
          endReachedTriggered.current = false;
        }
      }
    },
    [onScroll, onEndReached, endReachedThreshold, totalHeight, containerHeight]
  );

  // Reset end reached flag when items change
  useEffect(() => {
    endReachedTriggered.current = false;
  }, [items.length]);

  // Loading state
  if (isLoading && items.length === 0) {
    const skeletonHeight = typeof itemHeight === 'number' ? itemHeight : 60;
    const skeletons = Array.from({ length: loadingItemCount }, (_, i) => {
      const style: CSSProperties = {
        position: 'absolute',
        top: i * skeletonHeight,
        left: 0,
        right: 0,
        height: skeletonHeight,
      };

      return renderSkeleton ? (
        renderSkeleton(i, style)
      ) : (
        <div
          key={`skeleton-${i}`}
          style={style}
          className="animate-pulse bg-muted/20 border-b border-border"
        />
      );
    });

    return (
      <div
        className={cn('relative overflow-auto', className)}
        style={{ height: containerHeight }}
        aria-label={ariaLabel}
        aria-busy="true"
      >
        <div
          style={{
            height: loadingItemCount * skeletonHeight,
            position: 'relative',
          }}
        >
          {skeletons}
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && renderEmpty) {
    return (
      <div
        className={cn('relative overflow-auto', className)}
        style={{ height: containerHeight }}
        aria-label={ariaLabel}
      >
        {renderEmpty()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label={ariaLabel}
      aria-rowcount={items.length}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, style }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            role="listitem"
            aria-rowindex={index + 1}
          >
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

// ============================================================================
// HORIZONTAL VARIANT
// ============================================================================

export interface HorizontalVirtualizedListProps<T> {
  items: T[];
  itemWidth: number | ((index: number, item: T) => number);
  containerWidth: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  onScroll?: (scrollLeft: number) => void;
  ariaLabel?: string;
}

function HorizontalVirtualizedListInner<T>({
  items,
  itemWidth,
  containerWidth,
  containerHeight,
  overscan = 3,
  renderItem,
  getItemKey,
  className,
  onScroll,
  ariaLabel,
}: HorizontalVirtualizedListProps<T>): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const getWidth = useCallback(
    (index: number, item: T): number => {
      return typeof itemWidth === 'function' ? itemWidth(index, item) : itemWidth;
    },
    [itemWidth]
  );

  const offsets = useMemo(() => {
    const result: number[] = [0];
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getWidth(i, items[i]);
      result.push(total);
    }
    return result;
  }, [items, getWidth]);

  const totalWidth = offsets[offsets.length - 1] || 0;

  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];

    const start = Math.max(0, findStartIndex(offsets, scrollLeft) - overscan);
    let end = start;
    while (end < items.length && offsets[end] < scrollLeft + containerWidth) {
      end++;
    }
    end = Math.min(items.length, end + overscan);

    const visible: VirtualItem<T>[] = [];
    for (let i = start; i < end; i++) {
      visible.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          left: offsets[i],
          top: 0,
          bottom: 0,
          width: getWidth(i, items[i]),
        },
      });
    }
    return visible;
  }, [items, offsets, scrollLeft, containerWidth, overscan, getWidth]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const newScrollLeft = e.currentTarget.scrollLeft;
      setScrollLeft(newScrollLeft);
      onScroll?.(newScrollLeft);
    },
    [onScroll]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
    >
      <div
        style={{
          width: totalWidth,
          height: '100%',
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, style }) => (
          <div key={getItemKey ? getItemKey(item, index) : index} role="listitem">
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const HorizontalVirtualizedList = memo(
  HorizontalVirtualizedListInner
) as typeof HorizontalVirtualizedListInner;

// ============================================================================
// GRID VARIANT
// ============================================================================

export interface VirtualizedGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  ariaLabel?: string;
}

function VirtualizedGridInner<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  overscan = 2,
  renderItem,
  getItemKey,
  className,
  onEndReached,
  endReachedThreshold = 200,
  ariaLabel,
}: VirtualizedGridProps<T>): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const endReachedTriggered = useRef(false);

  // Calculate grid dimensions
  const columns = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  const rowHeight = itemHeight + gap;
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * rowHeight - gap;

  // Calculate visible rows
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(rows, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);

  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; style: CSSProperties }> = [];

    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= items.length) break;

        result.push({
          item: items[index],
          index,
          style: {
            position: 'absolute',
            top: row * rowHeight,
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
          },
        });
      }
    }

    return result;
  }, [items, startRow, endRow, columns, rowHeight, itemWidth, itemHeight, gap]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);

      if (onEndReached) {
        const distanceFromEnd = totalHeight - (newScrollTop + containerHeight);
        if (distanceFromEnd <= endReachedThreshold && !endReachedTriggered.current) {
          endReachedTriggered.current = true;
          onEndReached();
        } else if (distanceFromEnd > endReachedThreshold) {
          endReachedTriggered.current = false;
        }
      }
    },
    [onEndReached, endReachedThreshold, totalHeight, containerHeight]
  );

  useEffect(() => {
    endReachedTriggered.current = false;
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={rows}
      aria-colcount={columns}
    >
      <div
        style={{
          height: Math.max(totalHeight, 0),
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, style }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            role="gridcell"
            aria-rowindex={Math.floor(index / columns) + 1}
            aria-colindex={(index % columns) + 1}
          >
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualizedGrid = memo(VirtualizedGridInner) as typeof VirtualizedGridInner;
