/**
 * AgentMetrics - Collect and track agent performance metrics
 */

export interface MetricValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p90?: number;
  p99?: number;
}

export interface MetricSnapshot {
  timestamp: Date;
  agentId: string;
  metrics: Record<string, MetricValue>;
}

export interface AgentMetricsConfig {
  enabled: boolean;
  flushIntervalMs?: number;
  histogramBuckets?: number;
  onFlush?: (snapshot: MetricSnapshot) => void;
}

class Histogram {
  private values: number[] = [];
  private maxValues: number;

  constructor(maxValues = 1000) {
    this.maxValues = maxValues;
  }

  record(value: number): void {
    this.values.push(value);
    if (this.values.length > this.maxValues) {
      this.values.shift();
    }
  }

  getStats(): MetricValue {
    if (this.values.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
      };
    }

    const sorted = [...this.values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const firstVal = sorted[0] ?? 0;
    const lastVal = sorted[sorted.length - 1] ?? 0;

    return {
      count: sorted.length,
      sum,
      min: firstVal,
      max: lastVal,
      avg: sum / sorted.length,
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  reset(): void {
    this.values = [];
  }
}

class Counter {
  private value = 0;

  increment(by = 1): void {
    this.value += by;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

class Gauge {
  private value = 0;

  set(value: number): void {
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }
}

export class AgentMetrics {
  private config: Required<AgentMetricsConfig>;
  private agentId: string;
  private histograms = new Map<string, Histogram>();
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(agentId: string, config?: Partial<AgentMetricsConfig>) {
    this.agentId = agentId;
    this.config = {
      enabled: true,
      flushIntervalMs: 60000, // 1 minute
      histogramBuckets: 1000,
      onFlush: (_snapshot: MetricSnapshot): void => {
        // Default no-op flush handler - override to export metrics
      },
      ...config,
    };

    if (this.config.enabled && this.config.flushIntervalMs > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Record execution duration
   */
  recordDuration(name: string, durationMs: number): void {
    if (!this.config.enabled) return;
    this.getOrCreateHistogram(name).record(durationMs);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, by = 1): void {
    if (!this.config.enabled) return;
    this.getOrCreateCounter(name).increment(by);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number): void {
    if (!this.config.enabled) return;
    this.getOrCreateGauge(name).set(value);
  }

  /**
   * Record agent execution
   */
  recordAgentExecution(durationMs: number, success: boolean): void {
    this.recordDuration('agent.execution_duration', durationMs);
    this.incrementCounter('agent.executions_total');
    if (success) {
      this.incrementCounter('agent.executions_success');
    } else {
      this.incrementCounter('agent.executions_failed');
    }
  }

  /**
   * Record tool execution
   */
  recordToolExecution(toolName: string, durationMs: number, success: boolean): void {
    this.recordDuration(`tool.${toolName}.duration`, durationMs);
    this.incrementCounter(`tool.${toolName}.calls_total`);
    if (success) {
      this.incrementCounter(`tool.${toolName}.calls_success`);
    } else {
      this.incrementCounter(`tool.${toolName}.calls_failed`);
    }
  }

  /**
   * Record token usage
   */
  recordTokenUsage(promptTokens: number, completionTokens: number): void {
    this.incrementCounter('tokens.prompt_total', promptTokens);
    this.incrementCounter('tokens.completion_total', completionTokens);
    this.incrementCounter('tokens.total', promptTokens + completionTokens);
  }

  /**
   * Record memory operation
   */
  recordMemoryOperation(type: 'store' | 'recall', memoryType: string, durationMs: number): void {
    this.recordDuration(`memory.${type}.${memoryType}.duration`, durationMs);
    this.incrementCounter(`memory.${type}.${memoryType}.total`);
  }

  /**
   * Set active sessions gauge
   */
  setActiveSessions(count: number): void {
    this.setGauge('agent.active_sessions', count);
  }

  /**
   * Set queue size gauge
   */
  setQueueSize(size: number): void {
    this.setGauge('agent.queue_size', size);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricSnapshot {
    const metrics: Record<string, MetricValue> = {};

    // Add histogram metrics
    for (const [name, histogram] of this.histograms) {
      metrics[name] = histogram.getStats();
    }

    // Add counter metrics
    for (const [name, counter] of this.counters) {
      const value = counter.getValue();
      metrics[name] = {
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
      };
    }

    // Add gauge metrics
    for (const [name, gauge] of this.gauges) {
      const value = gauge.getValue();
      metrics[name] = {
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
      };
    }

    return {
      timestamp: new Date(),
      agentId: this.agentId,
      metrics,
    };
  }

  /**
   * Get specific metric
   */
  getMetric(name: string): MetricValue | undefined {
    const histogram = this.histograms.get(name);
    if (histogram) {
      return histogram.getStats();
    }

    const counter = this.counters.get(name);
    if (counter) {
      const value = counter.getValue();
      return {
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
      };
    }

    const gauge = this.gauges.get(name);
    if (gauge) {
      const value = gauge.getValue();
      return {
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
      };
    }

    return undefined;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    for (const counter of this.counters.values()) {
      counter.reset();
    }
  }

  /**
   * Flush metrics
   */
  flush(): void {
    if (!this.config.enabled) return;

    const snapshot = this.getSnapshot();
    this.config.onFlush(snapshot);
  }

  /**
   * Stop the metrics collector
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private getOrCreateHistogram(name: string): Histogram {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = new Histogram(this.config.histogramBuckets);
      this.histograms.set(name, histogram);
    }
    return histogram;
  }

  private getOrCreateCounter(name: string): Counter {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = new Counter();
      this.counters.set(name, counter);
    }
    return counter;
  }

  private getOrCreateGauge(name: string): Gauge {
    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = new Gauge();
      this.gauges.set(name, gauge);
    }
    return gauge;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    this.flushTimer.unref();
  }
}
