/**
 * TraceContext - Distributed tracing support for agent operations
 */

import { v4 as uuid } from 'uuid';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  status: 'ok' | 'error';
  tags: Record<string, string | number | boolean>;
  logs: SpanLog[];
}

export interface SpanLog {
  timestamp: Date;
  message: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

export interface TraceExporter {
  export(spans: Span[]): Promise<void>;
}

export interface TraceContextConfig {
  serviceName: string;
  enabled: boolean;
  sampleRate?: number;
  exporters?: TraceExporter[];
  maxSpansPerTrace?: number;
}

/**
 * Console trace exporter for development
 */
export class ConsoleTraceExporter implements TraceExporter {
  async export(spans: Span[]): Promise<void> {
    for (const span of spans) {
      console.log(
        `[TRACE] ${span.operationName} ` +
        `trace=${span.traceId.slice(0, 8)} ` +
        `span=${span.spanId.slice(0, 8)} ` +
        `duration=${span.durationMs}ms ` +
        `status=${span.status}`
      );
    }
  }
}

/**
 * Buffer exporter for testing
 */
export class BufferTraceExporter implements TraceExporter {
  private spans: Span[] = [];

  async export(spans: Span[]): Promise<void> {
    this.spans.push(...spans);
  }

  getSpans(): Span[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }
}

export class TraceContext {
  private config: Required<TraceContextConfig>;
  private currentTrace?: string;
  private spans: Map<string, Span> = new Map();
  private spanStack: string[] = [];

  constructor(config: Partial<TraceContextConfig>) {
    this.config = {
      serviceName: 'ts-agents',
      enabled: true,
      sampleRate: 1.0,
      exporters: [],
      maxSpansPerTrace: 100,
      ...config,
    };
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, traceId?: string): Span {
    if (!this.shouldSample()) {
      return this.createNoopSpan(operationName);
    }

    this.currentTrace = traceId || this.generateId();
    return this.startSpan(operationName);
  }

  /**
   * Start a new span
   */
  startSpan(operationName: string, parentSpanId?: string): Span {
    if (!this.config.enabled || !this.currentTrace) {
      return this.createNoopSpan(operationName);
    }

    if (this.spans.size >= this.config.maxSpansPerTrace) {
      return this.createNoopSpan(operationName);
    }

    const spanId = this.generateId();
    const parent = parentSpanId || this.getCurrentSpanId();

    const span: Span = {
      traceId: this.currentTrace,
      spanId,
      parentSpanId: parent,
      operationName,
      startTime: new Date(),
      status: 'ok',
      tags: {
        'service.name': this.config.serviceName,
      },
      logs: [],
    };

    this.spans.set(spanId, span);
    this.spanStack.push(spanId);

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status?: 'ok' | 'error'): void {
    if (!this.config.enabled) return;

    const actualSpan = this.spans.get(span.spanId);
    if (!actualSpan) return;

    actualSpan.endTime = new Date();
    actualSpan.durationMs = actualSpan.endTime.getTime() - actualSpan.startTime.getTime();
    if (status) {
      actualSpan.status = status;
    }

    // Remove from stack
    const index = this.spanStack.indexOf(span.spanId);
    if (index !== -1) {
      this.spanStack.splice(index, 1);
    }
  }

  /**
   * Add a tag to a span
   */
  setTag(span: Span, key: string, value: string | number | boolean): void {
    if (!this.config.enabled) return;

    const actualSpan = this.spans.get(span.spanId);
    if (actualSpan) {
      actualSpan.tags[key] = value;
    }
  }

  /**
   * Add multiple tags to a span
   */
  setTags(span: Span, tags: Record<string, string | number | boolean>): void {
    for (const [key, value] of Object.entries(tags)) {
      this.setTag(span, key, value);
    }
  }

  /**
   * Add a log entry to a span
   */
  log(
    span: Span,
    message: string,
    level: SpanLog['level'] = 'info',
    data?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return;

    const actualSpan = this.spans.get(span.spanId);
    if (actualSpan) {
      actualSpan.logs.push({
        timestamp: new Date(),
        message,
        level,
        data,
      });
    }
  }

  /**
   * Get the current trace ID
   */
  getTraceId(): string | undefined {
    return this.currentTrace;
  }

  /**
   * Get the current span ID
   */
  getCurrentSpanId(): string | undefined {
    return this.spanStack[this.spanStack.length - 1];
  }

  /**
   * Get all spans for the current trace
   */
  getSpans(): Span[] {
    return Array.from(this.spans.values());
  }

  /**
   * End the current trace and export spans
   */
  async endTrace(): Promise<void> {
    if (!this.config.enabled) return;

    // End any remaining open spans
    for (const spanId of [...this.spanStack].reverse()) {
      const span = this.spans.get(spanId);
      if (span && !span.endTime) {
        this.endSpan(span);
      }
    }

    // Export spans
    const spans = this.getSpans();
    for (const exporter of this.config.exporters) {
      try {
        await exporter.export(spans);
      } catch (error) {
        console.error('Trace export error:', error);
      }
    }

    // Clear state
    this.currentTrace = undefined;
    this.spans.clear();
    this.spanStack = [];
  }

  /**
   * Create a scoped span that auto-ends
   */
  async withSpan<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(operationName);
    try {
      const result = await fn(span);
      this.endSpan(span, 'ok');
      return result;
    } catch (error) {
      this.endSpan(span, 'error');
      throw error;
    }
  }

  /**
   * Get context for propagation
   */
  getContext(): { traceId?: string; spanId?: string } {
    return {
      traceId: this.currentTrace,
      spanId: this.getCurrentSpanId(),
    };
  }

  /**
   * Set context from propagated headers
   */
  setContext(traceId: string, parentSpanId?: string): void {
    this.currentTrace = traceId;
    if (parentSpanId) {
      this.spanStack.push(parentSpanId);
    }
  }

  /**
   * Extract trace context from headers
   */
  static extractFromHeaders(headers: Record<string, string>): {
    traceId?: string;
    spanId?: string;
  } {
    // W3C Trace Context format
    const traceparent = headers['traceparent'];
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        return {
          traceId: parts[1],
          spanId: parts[2],
        };
      }
    }

    // Fallback to custom headers
    return {
      traceId: headers['x-trace-id'],
      spanId: headers['x-span-id'],
    };
  }

  /**
   * Inject trace context into headers
   */
  injectToHeaders(): Record<string, string> {
    const traceId = this.currentTrace;
    const spanId = this.getCurrentSpanId();

    if (!traceId) {
      return {};
    }

    return {
      traceparent: `00-${traceId}-${spanId || '0000000000000000'}-01`,
      'x-trace-id': traceId,
      'x-span-id': spanId || '',
    };
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private generateId(): string {
    return uuid().replace(/-/g, '');
  }

  private createNoopSpan(operationName: string): Span {
    return {
      traceId: '',
      spanId: '',
      operationName,
      startTime: new Date(),
      status: 'ok',
      tags: {},
      logs: [],
    };
  }
}
