/**
 * Cache Metrics - Track and report cache performance
 */
export interface MetricBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
  timestamp: number;
}

export interface CacheMetricsConfig {
  bucketDuration: number; // ms
  maxBuckets: number;
  reportInterval: number; // ms
  onReport?: (metrics: CacheMetricsReport) => void;
}

export interface CacheMetricsReport {
  timestamp: number;
  period: number;
  l1: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
  };
  l2: {
    hits: number;
    misses: number;
    hitRate: number;
    errors: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    invalidations: number;
  };
  compression: {
    compressed: number;
    uncompressed: number;
    avgRatio: number;
  };
}

export class CacheMetrics {
  private config: CacheMetricsConfig;
  private buckets: Map<string, MetricBucket[]> = new Map();
  private counters: Map<string, number> = new Map();
  private latencies: number[] = [];
  private reportInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheMetricsConfig> = {}) {
    this.config = {
      bucketDuration: 60000, // 1 minute
      maxBuckets: 60, // 1 hour of history
      reportInterval: 60000, // Report every minute
      ...config,
    };

    if (this.config.reportInterval > 0) {
      this.reportInterval = setInterval(() => {
        this.report();
      }, this.config.reportInterval);
    }
  }

  /**
   * Record a counter increment
   */
  increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a latency value
   */
  recordLatency(ms: number): void {
    this.latencies.push(ms);

    // Keep only recent latencies (last 10000)
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-5000);
    }
  }

  /**
   * Record a gauge value
   */
  gauge(name: string, value: number): void {
    const buckets = this.buckets.get(name) || [];
    const now = Date.now();
    const currentBucket = Math.floor(now / this.config.bucketDuration);

    const lastBucket = buckets[buckets.length - 1];
    if (
      lastBucket &&
      Math.floor(lastBucket.timestamp / this.config.bucketDuration) ===
        currentBucket
    ) {
      // Update existing bucket
      lastBucket.count++;
      lastBucket.sum += value;
      lastBucket.min = Math.min(lastBucket.min, value);
      lastBucket.max = Math.max(lastBucket.max, value);
    } else {
      // Create new bucket
      buckets.push({
        count: 1,
        sum: value,
        min: value,
        max: value,
        timestamp: now,
      });

      // Trim old buckets
      while (buckets.length > this.config.maxBuckets) {
        buckets.shift();
      }
    }

    this.buckets.set(name, buckets);
  }

  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get percentile from latencies
   */
  getPercentile(percentile: number): number {
    if (this.latencies.length === 0) return 0;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate metrics report
   */
  report(): CacheMetricsReport {
    const l1Hits = this.getCounter('l1.hits');
    const l1Misses = this.getCounter('l1.misses');
    const l2Hits = this.getCounter('l2.hits');
    const l2Misses = this.getCounter('l2.misses');

    const report: CacheMetricsReport = {
      timestamp: Date.now(),
      period: this.config.reportInterval,
      l1: {
        hits: l1Hits,
        misses: l1Misses,
        hitRate: l1Hits + l1Misses > 0 ? l1Hits / (l1Hits + l1Misses) : 0,
        evictions: this.getCounter('l1.evictions'),
        size: this.getCounter('l1.size'),
      },
      l2: {
        hits: l2Hits,
        misses: l2Misses,
        hitRate: l2Hits + l2Misses > 0 ? l2Hits / (l2Hits + l2Misses) : 0,
        errors: this.getCounter('l2.errors'),
      },
      latency: {
        p50: this.getPercentile(50),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
        avg:
          this.latencies.length > 0
            ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
            : 0,
      },
      operations: {
        gets: this.getCounter('ops.gets'),
        sets: this.getCounter('ops.sets'),
        deletes: this.getCounter('ops.deletes'),
        invalidations: this.getCounter('ops.invalidations'),
      },
      compression: {
        compressed: this.getCounter('compression.compressed'),
        uncompressed: this.getCounter('compression.uncompressed'),
        avgRatio: this.getCounter('compression.ratio.sum') / 
          Math.max(1, this.getCounter('compression.ratio.count')),
      },
    };

    if (this.config.onReport) {
      this.config.onReport(report);
    }

    // Reset counters after report
    this.resetCounters();

    return report;
  }

  /**
   * Reset all counters
   */
  resetCounters(): void {
    this.counters.clear();
    this.latencies = [];
  }

  /**
   * Stop reporting
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  /**
   * Get historical data for a metric
   */
  getHistory(
    name: string
  ): Array<{ timestamp: number; avg: number; min: number; max: number }> {
    const buckets = this.buckets.get(name) || [];
    return buckets.map((b) => ({
      timestamp: b.timestamp,
      avg: b.sum / b.count,
      min: b.min,
      max: b.max,
    }));
  }
}
