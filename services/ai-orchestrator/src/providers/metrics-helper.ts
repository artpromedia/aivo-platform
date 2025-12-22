/**
 * Metrics Helper
 *
 * Provides a unified interface for recording LLM metrics.
 * Integrates with the observability library when available.
 */

// Try to import from observability lib, fallback to no-op
let observabilityMetrics: {
  increment: (name: string, tags?: Record<string, string>, value?: number) => void;
  histogram: (name: string, value: number, tags?: Record<string, string>) => void;
} | null = null;

// Attempt to load observability lib
try {
  // Dynamic import to handle missing package gracefully
  const loadObservability = async () => {
    try {
      const obs = await import('@aivo/ts-observability');
      if (obs.metrics) {
        observabilityMetrics = obs.metrics;
      }
    } catch {
      // Observability lib not available, use console logging
    }
  };
  loadObservability();
} catch {
  // Ignore
}

/**
 * Increment a counter metric
 */
export function incrementCounter(name: string, tags?: Record<string, string>, value = 1): void {
  if (observabilityMetrics) {
    observabilityMetrics.increment(name, tags, value);
  } else {
    // Fallback: log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[METRIC] ${name}`, { tags, value });
    }
  }
}

/**
 * Record a histogram metric
 */
export function recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
  if (observabilityMetrics) {
    observabilityMetrics.histogram(name, value, tags);
  } else {
    // Fallback: log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[METRIC] ${name}`, { value, tags });
    }
  }
}
