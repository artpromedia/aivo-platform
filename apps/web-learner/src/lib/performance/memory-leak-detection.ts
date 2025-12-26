/**
 * Memory Leak Detection Utilities
 *
 * Helps identify and prevent common memory leaks in React applications:
 * - Uncleared timers/intervals
 * - Stale closures
 * - Event listener leaks
 * - Unsubscribed observables
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// MEMORY TRACKING
// ============================================================================

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class MemoryTracker {
  private snapshots: MemorySnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 100;
  private intervalId?: number;

  start(intervalMs: number = 5000): void {
    if (this.intervalId) return;

    this.takeSnapshot();
    this.intervalId = window.setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private takeSnapshot(): void {
    if (!('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getMemoryTrend(): {
    growing: boolean;
    averageGrowthPerSecond: number;
    currentUsage: number;
    usagePercentage: number;
  } {
    if (this.snapshots.length < 2) {
      return {
        growing: false,
        averageGrowthPerSecond: 0,
        currentUsage: 0,
        usagePercentage: 0,
      };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000;
    const memoryDiff = last.usedJSHeapSize - first.usedJSHeapSize;

    return {
      growing: memoryDiff > 0,
      averageGrowthPerSecond: memoryDiff / timeDiff,
      currentUsage: last.usedJSHeapSize,
      usagePercentage: (last.usedJSHeapSize / last.jsHeapSizeLimit) * 100,
    };
  }

  detectLeak(thresholdBytes: number = 10 * 1024 * 1024): boolean {
    const trend = this.getMemoryTrend();
    // If memory is consistently growing by more than threshold per minute
    return trend.averageGrowthPerSecond * 60 > thresholdBytes;
  }

  clear(): void {
    this.snapshots = [];
  }
}

export const memoryTracker = new MemoryTracker();

// ============================================================================
// SAFE TIMER HOOKS
// ============================================================================

/**
 * Safe setTimeout that auto-clears on unmount
 */
export function useSafeTimeout(): (
  callback: () => void,
  delay: number
) => void {
  const timeoutIds = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      callback();
    }, delay);
    timeoutIds.current.add(id);
  }, []);
}

/**
 * Safe setInterval that auto-clears on unmount
 */
export function useSafeInterval(): {
  start: (callback: () => void, delay: number) => void;
  stop: () => void;
} {
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, []);

  const start = useCallback((callback: () => void, delay: number) => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    intervalId.current = setInterval(callback, delay);
  }, []);

  const stop = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  return { start, stop };
}

// ============================================================================
// EVENT LISTENER MANAGEMENT
// ============================================================================

type EventHandler = (...args: any[]) => void;

/**
 * Track and manage event listeners to prevent leaks
 */
class EventListenerTracker {
  private listeners: Map<
    EventTarget,
    Map<string, Set<EventHandler>>
  > = new Map();

  add(
    target: EventTarget,
    event: string,
    handler: EventHandler,
    options?: AddEventListenerOptions
  ): void {
    if (!this.listeners.has(target)) {
      this.listeners.set(target, new Map());
    }

    const targetListeners = this.listeners.get(target)!;
    if (!targetListeners.has(event)) {
      targetListeners.set(event, new Set());
    }

    targetListeners.get(event)!.add(handler);
    target.addEventListener(event, handler, options);
  }

  remove(target: EventTarget, event: string, handler: EventHandler): void {
    const targetListeners = this.listeners.get(target);
    if (!targetListeners) return;

    const eventHandlers = targetListeners.get(event);
    if (!eventHandlers) return;

    eventHandlers.delete(handler);
    target.removeEventListener(event, handler);

    if (eventHandlers.size === 0) {
      targetListeners.delete(event);
    }

    if (targetListeners.size === 0) {
      this.listeners.delete(target);
    }
  }

  removeAll(target: EventTarget): void {
    const targetListeners = this.listeners.get(target);
    if (!targetListeners) return;

    for (const [event, handlers] of targetListeners) {
      for (const handler of handlers) {
        target.removeEventListener(event, handler);
      }
    }

    this.listeners.delete(target);
  }

  getStats(): { targets: number; totalListeners: number } {
    let totalListeners = 0;
    for (const targetListeners of this.listeners.values()) {
      for (const handlers of targetListeners.values()) {
        totalListeners += handlers.size;
      }
    }

    return {
      targets: this.listeners.size,
      totalListeners,
    };
  }
}

export const eventListenerTracker = new EventListenerTracker();

/**
 * Hook for safe event listener management
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: Window | HTMLElement | null
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element ?? window;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K]);
    };

    targetElement.addEventListener(eventName, eventListener);

    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

interface Subscription {
  unsubscribe: () => void;
}

/**
 * Hook for managing subscriptions
 */
export function useSubscription<T>(
  subscribe: (callback: (value: T) => void) => Subscription,
  callback: (value: T) => void
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const subscription = subscribe((value) => {
      callbackRef.current(value);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [subscribe]);
}

// ============================================================================
// COMPONENT MOUNT TRACKING
// ============================================================================

/**
 * Track mounted components for debugging
 */
class ComponentMountTracker {
  private mounted: Map<string, number> = new Map();

  mount(componentName: string): void {
    const count = this.mounted.get(componentName) || 0;
    this.mounted.set(componentName, count + 1);
  }

  unmount(componentName: string): void {
    const count = this.mounted.get(componentName) || 0;
    if (count > 1) {
      this.mounted.set(componentName, count - 1);
    } else {
      this.mounted.delete(componentName);
    }
  }

  getStats(): Map<string, number> {
    return new Map(this.mounted);
  }

  getMostMounted(limit: number = 10): Array<{ name: string; count: number }> {
    return Array.from(this.mounted.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const componentMountTracker = new ComponentMountTracker();

/**
 * Hook to track component mounts
 */
export function useComponentTracking(componentName: string): void {
  useEffect(() => {
    componentMountTracker.mount(componentName);

    return () => {
      componentMountTracker.unmount(componentName);
    };
  }, [componentName]);
}

// ============================================================================
// ABORT CONTROLLER MANAGEMENT
// ============================================================================

/**
 * Hook for managing abort controllers
 */
export function useAbortController(): AbortController {
  const controllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return controllerRef.current;
}

/**
 * Hook for safe async operations
 */
export function useSafeAsync<T>(): {
  execute: (
    asyncFn: (signal: AbortSignal) => Promise<T>
  ) => Promise<T | undefined>;
  abort: () => void;
} {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (
      asyncFn: (signal: AbortSignal) => Promise<T>
    ): Promise<T | undefined> => {
      // Abort previous request
      controllerRef.current?.abort();

      // Create new controller
      controllerRef.current = new AbortController();

      try {
        return await asyncFn(controllerRef.current.signal);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return undefined;
        }
        throw error;
      }
    },
    []
  );

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { execute, abort };
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/**
 * Get memory leak diagnostics
 */
export function getLeakDiagnostics(): {
  memory: ReturnType<typeof memoryTracker.getMemoryTrend>;
  eventListeners: ReturnType<typeof eventListenerTracker.getStats>;
  mountedComponents: Array<{ name: string; count: number }>;
  potentialLeaks: string[];
} {
  const memory = memoryTracker.getMemoryTrend();
  const eventListeners = eventListenerTracker.getStats();
  const mountedComponents = componentMountTracker.getMostMounted(10);
  const potentialLeaks: string[] = [];

  // Check for memory leak
  if (memoryTracker.detectLeak()) {
    potentialLeaks.push('Memory usage is growing consistently - possible leak');
  }

  // Check for too many event listeners
  if (eventListeners.totalListeners > 100) {
    potentialLeaks.push(
      `High number of event listeners (${eventListeners.totalListeners}) - possible leak`
    );
  }

  // Check for components with high mount counts
  const highMountComponents = mountedComponents.filter((c) => c.count > 50);
  if (highMountComponents.length > 0) {
    potentialLeaks.push(
      `Components with high mount counts: ${highMountComponents.map((c) => c.name).join(', ')}`
    );
  }

  return {
    memory,
    eventListeners,
    mountedComponents,
    potentialLeaks,
  };
}
