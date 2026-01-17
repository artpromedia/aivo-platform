/**
 * Client-Side Performance Optimization Utilities
 *
 * Includes:
 * - Bundle splitting strategies
 * - Image optimization
 * - Virtual scrolling
 * - Memoization utilities
 * - Performance monitoring
 */

import type { ComponentType } from 'react';
import React, {
  lazy,
  Suspense,
  memo,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from 'react';

// ============================================================================
// LAZY LOADING WITH RETRY
// ============================================================================

interface LazyOptions {
  retries?: number;
  delay?: number;
  fallback?: React.ReactNode;
}

/**
 * Enhanced lazy loading with retry logic
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-plus-operands */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): React.LazyExoticComponent<T> {
  const { retries = 3, delay = 1000 } = options;

  return lazy(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error as Error;

        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Component loading failed');
  });
}

/**
 * Preload a lazy component
 */
export function preloadComponent(
  factory: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
): void {
  factory().catch(() => {
    // Silently fail - component will be loaded when needed
  });
}

/**
 * Create a lazily loaded component with loading fallback
 */
export function createLazyComponent<P extends object = object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent?: ComponentType
): ComponentType<P> {
  const LazyComponent = lazyWithRetry(factory);

  return function LazyWrapper(props: P): React.JSX.Element {
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================================
// MEMOIZATION UTILITIES
// ============================================================================

/**
 * Deep comparison memo wrapper
 */
export function deepMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.MemoExoticComponent<ComponentType<P>> {
  return memo(Component, propsAreEqual || deepEqual);
}

function deepEqual(prev: any, next: any): boolean {
  if (prev === next) return true;
  if (typeof prev !== typeof next) return false;
  if (typeof prev !== 'object' || prev === null) return false;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false;
    if (!deepEqual(prev[key], next[key])) return false;
  }

  return true;
}

/**
 * Memoize a function with cache
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    keyFn?: (...args: Parameters<T>) => string;
    ttl?: number;
  } = {}
): T {
  const { maxSize = 100, keyFn, ttl } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);

    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      cache.delete(key);
    }

    const result = fn(...args);

    // Evict oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  }) as T;
}

// ============================================================================
// VIRTUAL SCROLLING
// ============================================================================

interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: VirtualListOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto' as const,
        position: 'relative' as const,
      },
      onScroll: handleScroll,
    },
    innerProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const,
      },
    },
  };
}

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

/**
 * Generate optimized image srcset
 */
export function generateSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048],
  quality = 75
): string {
  return widths
    .map((w) => {
      const url = transformImageUrl(src, { width: w, quality });
      return `${url} ${w}w`;
    })
    .join(', ');
}

/**
 * Transform image URL for optimization
 */
export function transformImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  }
): string {
  const { width, height, quality = 75, format = 'auto' } = options;

  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  params.set('f', format);

  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}${params.toString()}`;
}

/**
 * Hook for lazy loading images with intersection observer
 */
export function useLazyImage(
  src: string,
  options: {
    threshold?: number;
    rootMargin?: string;
  } = {}
): {
  ref: React.RefObject<HTMLImageElement>;
  isLoaded: boolean;
  isInView: boolean;
} {
  const ref = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold || 0,
        rootMargin: options.rootMargin || '50px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin]);

  useEffect(() => {
    if (isInView && ref.current) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setIsLoaded(true);
      };
    }
  }, [isInView, src]);

  return { ref, isLoaded, isInView };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  tti: number | null;
}

/**
 * Hook to track Core Web Vitals
 */
export function useWebVitals(
  onReport?: (metrics: Partial<PerformanceMetrics>) => void
): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    tti: null,
  });

  useEffect(() => {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcp) {
        const value = fcp.startTime;
        setMetrics((m) => ({ ...m, fcp: value }));
        onReport?.({ fcp: value });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1] as PerformanceEntry | undefined;
      const value = lcp?.startTime;
      if (value !== undefined) {
        setMetrics((m) => ({ ...m, lcp: value }));
        onReport?.({ lcp: value });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      const fid = entries[0] as PerformanceEventTiming | undefined;
      if (fid?.processingStart !== undefined) {
        const value = fid.processingStart - fid.startTime;
        setMetrics((m) => ({ ...m, fid: value }));
        onReport?.({ fid: value });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      setMetrics((m) => ({ ...m, cls: clsValue }));
      onReport?.({ cls: clsValue });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Time to First Byte
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navEntry?.responseStart !== undefined) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      setMetrics((m) => ({ ...m, ttfb }));
      onReport?.({ ttfb });
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [onReport]);

  return metrics;
}

/**
 * Report metrics to analytics
 */
export function reportWebVitals(metric: { name: string; value: number; id: string }): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    page: window.location.pathname,
    timestamp: Date.now(),
  });

  // Use sendBeacon if available for reliability, fallback to fetch
  const sendBeaconFn = navigator.sendBeacon?.bind(navigator);
  if (sendBeaconFn) {
    sendBeaconFn('/api/analytics/vitals', body);
  } else {
    void fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-plus-operands */

// ============================================================================
// RENDER OPTIMIZATION
// ============================================================================

/**
 * Hook to defer expensive renders
 */
export function useDeferredRender<T>(value: T, delay = 100): { current: T; isPending: boolean } {
  const [deferredValue, setDeferredValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setIsPending(true);

    timeoutRef.current = setTimeout(() => {
      setDeferredValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return { current: deferredValue, isPending };
}

/**
 * Hook to batch state updates
 */
export function useBatchedState<T extends object>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const frameRef = useRef<number>();

  const batchedSetState = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        setState((prev) => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
        frameRef.current = undefined;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
}

/**
 * Hook for idle callback scheduling
 */
export function useIdleCallback(callback: () => void, options: { timeout?: number } = {}): void {
  const optionsTimeoutRef = useRef(options.timeout);
  optionsTimeoutRef.current = options.timeout;

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = (window as Record<string, unknown>).requestIdleCallback as (
        cb: () => void,
        opts?: { timeout?: number }
      ) => number;
      const handle = id(callback, { timeout: optionsTimeoutRef.current });
      return () => {
        const cancelId = (window as Record<string, unknown>).cancelIdleCallback as (
          handle: number
        ) => void;
        cancelId(handle);
      };
    } else {
      const id = setTimeout(callback, 1);
      return () => {
        clearTimeout(id);
      };
    }
  }, [callback]);
}

// ============================================================================
// BUNDLE SIZE TRACKING
// ============================================================================

/**
 * Track component render times in development
 */
export function withRenderTracking<P extends object>(
  Component: ComponentType<P>,
  name: string
): ComponentType<P> {
  if (process.env.NODE_ENV !== 'development') {
    return Component;
  }

  return function TrackedComponent(props: P) {
    const startTime = performance.now();

    useEffect(() => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 16) {
        console.warn(`[Performance] ${name} took ${renderTime.toFixed(2)}ms to render`);
      }
    });

    return <Component {...props} />;
  };
}

// ============================================================================
// INTERSECTION OBSERVER HOOK
// ============================================================================

/**
 * Hook for intersection observer
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const currentElement = ref.current;
    if (!currentElement) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(currentElement);

    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.root, options.rootMargin, options.threshold]);

  return [ref, isIntersecting];
}

// ============================================================================
// DEBOUNCE AND THROTTLE
// ============================================================================

/**
 * Debounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [value, interval]);

  return throttledValue;
}
