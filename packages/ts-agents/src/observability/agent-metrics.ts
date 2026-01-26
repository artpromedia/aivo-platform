/**
 * Agent metrics collection and reporting
 */

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  values: MetricValue[];
  labels: string[];
}

export interface MetricsConfig {
  /** Prefix for all metric names */
  prefix?: string;
  /** Default labels for all metrics */
  defaultLabels?: Record<string, string>;
  /** Maximum values to keep per metric */
  maxValues?: number;
  /** Enable metric collection */
  enabled?: boolean;
}

/**
 * Agent metrics collector
 */
export class AgentMetrics {
  private readonly metrics: Map<string, Metric> = new Map();
  private readonly config: MetricsConfig;

  constructor(config?: MetricsConfig) {
    this.config = {
      prefix: config?.prefix ?? 'agent_',
      defaultLabels: config?.defaultLabels ?? {},
      maxValues: config?.maxValues ?? 1000,
      enabled: config?.enabled ?? true,
    };

    // Register default metrics
    this.registerDefaultMetrics();
  }

  /**
   * Increment a counter
   */
  increment(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const fullName = this.prefixName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = this.createMetric(fullName, 'counter', `Counter: ${name}`);
    }

    this.addValue(metric, value, labels);
  }

  /**
   * Set a gauge value
   */
  gauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const fullName = this.prefixName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = this.createMetric(fullName, 'gauge', `Gauge: ${name}`);
    }

    // For gauges, replace the last value with same labels
    const existingIndex = metric.values.findIndex(v =>
      this.labelsMatch(v.labels, labels)
    );

    if (existingIndex !== -1) {
      metric.values[existingIndex] = {
        value,
        timestamp: new Date(),
        labels: { ...this.config.defaultLabels, ...labels },
      };
    } else {
      this.addValue(metric, value, labels);
    }
  }

  /**
   * Record a histogram value
   */
  histogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const fullName = this.prefixName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = this.createMetric(fullName, 'histogram', `Histogram: ${name}`);
    }

    this.addValue(metric, value, labels);
  }

  /**
   * Record execution duration
   */
  timing(
    name: string,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    this.histogram(`${name}_duration_ms`, durationMs, labels);
  }

  /**
   * Create a timer that records duration when stopped
   */
  startTimer(
    name: string,
    labels?: Record<string, string>
  ): { stop: () => number } {
    const start = Date.now();

    return {
      stop: () => {
        const duration = Date.now() - start;
        this.timing(name, duration, labels);
        return duration;
      },
    };
  }

  /**
   * Get a metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(this.prefixName(name));
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  }> {
    const summary: Record<string, {
      count: number;
      sum: number;
      avg: number;
      min: number;
      max: number;
      latest: number;
    }> = {};

    for (const [name, metric] of this.metrics) {
      if (metric.values.length === 0) continue;

      const values = metric.values.map(v => v.value);
      const sum = values.reduce((a, b) => a + b, 0);

      summary[name] = {
        count: values.length,
        sum,
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1]!,
      };
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      metric.values = [];
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const value of metric.values) {
        const labels = value.labels
          ? `{${Object.entries(value.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';

        lines.push(`${metric.name}${labels} ${value.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [name, metric] of this.metrics) {
      result[name] = {
        type: metric.type,
        description: metric.description,
        values: metric.values,
      };
    }

    return result;
  }

  private registerDefaultMetrics(): void {
    // Execution metrics
    this.createMetric(
      this.prefixName('executions_total'),
      'counter',
      'Total number of agent executions'
    );
    this.createMetric(
      this.prefixName('executions_success'),
      'counter',
      'Number of successful executions'
    );
    this.createMetric(
      this.prefixName('executions_failed'),
      'counter',
      'Number of failed executions'
    );
    this.createMetric(
      this.prefixName('execution_duration_ms'),
      'histogram',
      'Execution duration in milliseconds'
    );

    // Tool metrics
    this.createMetric(
      this.prefixName('tool_calls_total'),
      'counter',
      'Total number of tool calls'
    );
    this.createMetric(
      this.prefixName('tool_call_duration_ms'),
      'histogram',
      'Tool call duration in milliseconds'
    );

    // Token metrics
    this.createMetric(
      this.prefixName('tokens_prompt'),
      'counter',
      'Total prompt tokens used'
    );
    this.createMetric(
      this.prefixName('tokens_completion'),
      'counter',
      'Total completion tokens used'
    );

    // Memory metrics
    this.createMetric(
      this.prefixName('memory_operations'),
      'counter',
      'Total memory operations'
    );

    // Active sessions
    this.createMetric(
      this.prefixName('active_sessions'),
      'gauge',
      'Number of active sessions'
    );
  }

  private createMetric(
    name: string,
    type: MetricType,
    description: string,
    labels: string[] = []
  ): Metric {
    const metric: Metric = {
      name,
      type,
      description,
      values: [],
      labels,
    };

    this.metrics.set(name, metric);
    return metric;
  }

  private addValue(
    metric: Metric,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (metric.values.length >= (this.config.maxValues ?? 1000)) {
      metric.values.shift();
    }

    metric.values.push({
      value,
      timestamp: new Date(),
      labels: { ...this.config.defaultLabels, ...labels },
    });
  }

  private prefixName(name: string): string {
    const prefix = this.config.prefix ?? 'agent_';
    if (name.startsWith(prefix)) {
      return name;
    }
    return `${prefix}${name}`;
  }

  private labelsMatch(
    a?: Record<string, string>,
    b?: Record<string, string>
  ): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every(key => a[key] === b[key]);
  }
}

/**
 * Create an agent metrics collector
 */
export function createAgentMetrics(config?: MetricsConfig): AgentMetrics {
  return new AgentMetrics(config);
}

/**
 * Global metrics instance
 */
export const globalMetrics = new AgentMetrics();
