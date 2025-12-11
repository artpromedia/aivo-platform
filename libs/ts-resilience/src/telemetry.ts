/**
 * Network Resilience Telemetry
 *
 * Collects and exports metrics for network resilience monitoring.
 * Designed to work with OpenTelemetry and custom dashboards.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TelemetryMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

export interface TelemetryReport {
  timestamp: Date;
  metrics: TelemetryMetric[];
  summary: {
    totalErrors: number;
    errorRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    openCircuits: string[];
    healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  };
}

// ============================================================================
// METRIC COLLECTORS
// ============================================================================

class Counter {
  private value = 0;

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  inc(amount = 1): void {
    this.value += amount;
  }

  get(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  toMetric(): TelemetryMetric {
    return {
      name: this.name,
      type: 'counter',
      value: this.value,
      labels: this.labels,
      timestamp: new Date(),
    };
  }
}

class Gauge {
  private value = 0;

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  set(value: number): void {
    this.value = value;
  }

  inc(amount = 1): void {
    this.value += amount;
  }

  dec(amount = 1): void {
    this.value -= amount;
  }

  get(): number {
    return this.value;
  }

  toMetric(): TelemetryMetric {
    return {
      name: this.name,
      type: 'gauge',
      value: this.value,
      labels: this.labels,
      timestamp: new Date(),
    };
  }
}

class Histogram {
  private samples: number[] = [];
  private sum = 0;
  private count = 0;

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {},
    private readonly maxSamples = 1000
  ) {}

  observe(value: number): void {
    this.samples.push(value);
    this.sum += value;
    this.count++;

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  get mean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  percentile(p: number): number {
    if (this.samples.length === 0) return 0;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  get p50(): number {
    return this.percentile(50);
  }

  get p95(): number {
    return this.percentile(95);
  }

  get p99(): number {
    return this.percentile(99);
  }

  reset(): void {
    this.samples = [];
    this.sum = 0;
    this.count = 0;
  }

  toMetric(): TelemetryMetric {
    return {
      name: this.name,
      type: 'histogram',
      value: this.mean,
      labels: {
        ...this.labels,
        p50: String(this.p50),
        p95: String(this.p95),
        p99: String(this.p99),
        count: String(this.count),
      },
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// RESILIENCE TELEMETRY SERVICE
// ============================================================================

/**
 * Telemetry service for network resilience metrics.
 */
export class ResilienceTelemetry {
  // Counters
  private httpErrorsTotal = new Map<string, Counter>();
  private retryAttemptsTotal = new Counter('retry_attempts_total');
  private circuitBreakerOpensTotal = new Counter('circuit_breaker_opens_total');
  private fallbacksUsedTotal = new Counter('fallbacks_used_total');
  private timeoutsTotal = new Counter('timeouts_total');

  // Gauges
  private activeRequests = new Gauge('active_requests');
  private openCircuits = new Gauge('open_circuits');

  // Histograms
  private requestLatency = new Histogram('request_latency_ms');
  private endpointLatencies = new Map<string, Histogram>();

  // Listeners
  private reportListeners: ((report: TelemetryReport) => void)[] = [];

  private static _instance: ResilienceTelemetry | undefined;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ResilienceTelemetry {
    if (!ResilienceTelemetry._instance) {
      ResilienceTelemetry._instance = new ResilienceTelemetry();
    }
    return ResilienceTelemetry._instance;
  }

  // Recording methods

  recordHttpError(errorType: string, endpoint?: string): void {
    const key = `${errorType}:${endpoint ?? 'unknown'}`;
    let counter = this.httpErrorsTotal.get(key);
    if (!counter) {
      counter = new Counter('http_errors_total', {
        error_type: errorType,
        endpoint: endpoint ?? 'unknown',
      });
      this.httpErrorsTotal.set(key, counter);
    }
    counter.inc();
  }

  recordRetryAttempt(): void {
    this.retryAttemptsTotal.inc();
  }

  recordCircuitOpen(): void {
    this.circuitBreakerOpensTotal.inc();
    this.openCircuits.inc();
  }

  recordCircuitClose(): void {
    this.openCircuits.dec();
  }

  recordFallbackUsed(): void {
    this.fallbacksUsedTotal.inc();
  }

  recordTimeout(endpoint?: string): void {
    this.timeoutsTotal.inc();
    this.recordHttpError('timeout', endpoint);
  }

  recordRequestLatency(endpoint: string, latencyMs: number): void {
    this.requestLatency.observe(latencyMs);

    const normalized = this.normalizeEndpoint(endpoint);
    let histogram = this.endpointLatencies.get(normalized);
    if (!histogram) {
      histogram = new Histogram('endpoint_latency_ms', { endpoint: normalized });
      this.endpointLatencies.set(normalized, histogram);
    }
    histogram.observe(latencyMs);
  }

  setActiveRequests(count: number): void {
    this.activeRequests.set(count);
  }

  incActiveRequests(): void {
    this.activeRequests.inc();
  }

  decActiveRequests(): void {
    this.activeRequests.dec();
  }

  // Reporting methods

  generateReport(openCircuitNames: string[] = []): TelemetryReport {
    const metrics: TelemetryMetric[] = [];

    // Add all counters
    for (const counter of this.httpErrorsTotal.values()) {
      metrics.push(counter.toMetric());
    }
    metrics.push(this.retryAttemptsTotal.toMetric());
    metrics.push(this.circuitBreakerOpensTotal.toMetric());
    metrics.push(this.fallbacksUsedTotal.toMetric());
    metrics.push(this.timeoutsTotal.toMetric());

    // Add gauges
    metrics.push(this.activeRequests.toMetric());
    metrics.push(this.openCircuits.toMetric());

    // Add histograms
    metrics.push(this.requestLatency.toMetric());
    for (const histogram of this.endpointLatencies.values()) {
      metrics.push(histogram.toMetric());
    }

    // Calculate totals
    let totalErrors = 0;
    for (const counter of this.httpErrorsTotal.values()) {
      totalErrors += counter.get();
    }

    // Determine health status
    const healthStatus = this.calculateHealthStatus(
      totalErrors,
      this.requestLatency.mean,
      openCircuitNames.length
    );

    return {
      timestamp: new Date(),
      metrics,
      summary: {
        totalErrors,
        errorRate: 0, // Would need request count to calculate
        avgLatencyMs: this.requestLatency.mean,
        p95LatencyMs: this.requestLatency.p95,
        p99LatencyMs: this.requestLatency.p99,
        openCircuits: openCircuitNames,
        healthStatus,
      },
    };
  }

  private calculateHealthStatus(
    totalErrors: number,
    avgLatency: number,
    openCircuitCount: number
  ): 'healthy' | 'degraded' | 'unhealthy' | 'critical' {
    if (openCircuitCount > 0) {
      return 'critical';
    }
    if (totalErrors > 50 || avgLatency > 5000) {
      return 'unhealthy';
    }
    if (totalErrors > 10 || avgLatency > 2000) {
      return 'degraded';
    }
    return 'healthy';
  }

  private normalizeEndpoint(endpoint: string): string {
    // Remove query params
    const withoutQuery = endpoint.split('?')[0];
    // Replace UUIDs with :id
    return withoutQuery
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  // Listener management

  addReportListener(listener: (report: TelemetryReport) => void): void {
    this.reportListeners.push(listener);
  }

  removeReportListener(listener: (report: TelemetryReport) => void): void {
    const index = this.reportListeners.indexOf(listener);
    if (index > -1) {
      this.reportListeners.splice(index, 1);
    }
  }

  emitReport(openCircuitNames: string[] = []): void {
    const report = this.generateReport(openCircuitNames);
    for (const listener of this.reportListeners) {
      listener(report);
    }
  }

  // Reset

  reset(): void {
    this.httpErrorsTotal.clear();
    this.retryAttemptsTotal.reset();
    this.circuitBreakerOpensTotal.reset();
    this.fallbacksUsedTotal.reset();
    this.timeoutsTotal.reset();
    this.activeRequests.set(0);
    this.openCircuits.set(0);
    this.requestLatency.reset();
    this.endpointLatencies.clear();
  }
}

// Export singleton accessor
export const telemetry = ResilienceTelemetry.getInstance();
