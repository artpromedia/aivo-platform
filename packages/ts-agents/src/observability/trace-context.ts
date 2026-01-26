/**
 * Distributed tracing context for agent execution
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags?: number;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes?: SpanAttributes;
}

export type SpanStatus = 'unset' | 'ok' | 'error';

export interface Span {
  name: string;
  context: SpanContext;
  startTime: Date;
  endTime?: Date;
  attributes: SpanAttributes;
  events: SpanEvent[];
  status: SpanStatus;
  statusMessage?: string;
}

export interface TraceContextConfig {
  /** Service name for tracing */
  serviceName?: string;
  /** Enable tracing */
  enabled?: boolean;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Custom span exporter */
  exporter?: (span: Span) => void | Promise<void>;
}

/**
 * Trace context for distributed tracing
 */
export class TraceContext {
  private readonly config: TraceContextConfig;
  private readonly spans: Map<string, Span> = new Map();
  private currentSpan: Span | null = null;

  constructor(config?: TraceContextConfig) {
    this.config = {
      serviceName: config?.serviceName ?? 'agent-service',
      enabled: config?.enabled ?? true,
      sampleRate: config?.sampleRate ?? 1.0,
      exporter: config?.exporter,
    };
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: SpanAttributes): Span {
    if (!this.shouldSample()) {
      // Return a no-op span
      return this.createNoOpSpan(name);
    }

    const span: Span = {
      name,
      context: this.createSpanContext(),
      startTime: new Date(),
      attributes: {
        'service.name': this.config.serviceName ?? 'agent-service',
        ...attributes,
      },
      events: [],
      status: 'unset',
    };

    this.spans.set(span.context.spanId, span);
    this.currentSpan = span;

    return span;
  }

  /**
   * Start a child span
   */
  startChildSpan(name: string, parent: Span, attributes?: SpanAttributes): Span {
    if (!this.shouldSample()) {
      return this.createNoOpSpan(name);
    }

    const span: Span = {
      name,
      context: {
        traceId: parent.context.traceId,
        spanId: this.generateSpanId(),
        parentSpanId: parent.context.spanId,
      },
      startTime: new Date(),
      attributes: {
        'service.name': this.config.serviceName ?? 'agent-service',
        ...attributes,
      },
      events: [],
      status: 'unset',
    };

    this.spans.set(span.context.spanId, span);
    this.currentSpan = span;

    return span;
  }

  /**
   * End a span
   */
  async endSpan(span: Span, status?: SpanStatus, statusMessage?: string): Promise<void> {
    span.endTime = new Date();
    span.status = status ?? 'ok';
    span.statusMessage = statusMessage;

    if (this.config.exporter) {
      await this.config.exporter(span);
    }

    // Set current span to parent if exists
    if (span.context.parentSpanId) {
      this.currentSpan = this.spans.get(span.context.parentSpanId) ?? null;
    } else {
      this.currentSpan = null;
    }
  }

  /**
   * Add an event to a span
   */
  addEvent(span: Span, name: string, attributes?: SpanAttributes): void {
    span.events.push({
      name,
      timestamp: new Date(),
      attributes,
    });
  }

  /**
   * Set span attributes
   */
  setAttributes(span: Span, attributes: SpanAttributes): void {
    Object.assign(span.attributes, attributes);
  }

  /**
   * Set span status
   */
  setStatus(span: Span, status: SpanStatus, message?: string): void {
    span.status = status;
    span.statusMessage = message;
  }

  /**
   * Get the current span
   */
  getCurrentSpan(): Span | null {
    return this.currentSpan;
  }

  /**
   * Get a span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span[] {
    return Array.from(this.spans.values()).filter(
      span => span.context.traceId === traceId
    );
  }

  /**
   * Execute a function within a span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await fn(span);
      await this.endSpan(span, 'ok');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.endSpan(span, 'error', message);
      throw error;
    }
  }

  /**
   * Execute a function within a child span
   */
  async withChildSpan<T>(
    name: string,
    parent: Span,
    fn: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    const span = this.startChildSpan(name, parent, attributes);

    try {
      const result = await fn(span);
      await this.endSpan(span, 'ok');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.endSpan(span, 'error', message);
      throw error;
    }
  }

  /**
   * Create a trace context from a carrier (for distributed tracing)
   */
  static fromCarrier(carrier: Record<string, string>): SpanContext | null {
    const traceParent = carrier['traceparent'];
    if (!traceParent) return null;

    // Parse W3C Trace Context format: 00-traceId-spanId-flags
    const parts = traceParent.split('-');
    if (parts.length !== 4) return null;

    return {
      traceId: parts[1]!,
      spanId: parts[2]!,
      flags: parseInt(parts[3]!, 16),
    };
  }

  /**
   * Inject trace context into a carrier
   */
  injectIntoCarrier(span: Span, carrier: Record<string, string>): void {
    const flags = (span.context.flags ?? 1).toString(16).padStart(2, '0');
    carrier['traceparent'] = `00-${span.context.traceId}-${span.context.spanId}-${flags}`;
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.spans.clear();
    this.currentSpan = null;
  }

  private createSpanContext(): SpanContext {
    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
    };
  }

  private createNoOpSpan(name: string): Span {
    return {
      name,
      context: {
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
      },
      startTime: new Date(),
      attributes: {},
      events: [],
      status: 'unset',
    };
  }

  private shouldSample(): boolean {
    if (!this.config.enabled) return false;
    const sampleRate = this.config.sampleRate ?? 1.0;
    return Math.random() < sampleRate;
  }

  private generateTraceId(): string {
    // 32-character hex string (128 bits)
    return this.randomHex(32);
  }

  private generateSpanId(): string {
    // 16-character hex string (64 bits)
    return this.randomHex(16);
  }

  private randomHex(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }
}

/**
 * Create a trace context
 */
export function createTraceContext(config?: TraceContextConfig): TraceContext {
  return new TraceContext(config);
}

/**
 * Global trace context instance
 */
export const globalTraceContext = new TraceContext();
