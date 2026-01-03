/**
 * OpenTelemetry Tracer Configuration
 *
 * Sets up the OTEL tracer provider with configurable exporters.
 * Supports Jaeger, OTLP, and console exporters.
 */
import type { Tracer, Span, SpanOptions } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
export interface TracerConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    enabled?: boolean;
    /** @deprecated Use OTLP exporter instead - Jaeger supports OTLP natively */
    jaeger?: {
        endpoint?: string;
    };
    otlp?: {
        endpoint?: string;
    };
    console?: boolean;
}
export interface AivoTracer {
    tracer: Tracer;
    provider: NodeTracerProvider;
    /**
     * Start a new span with Aivo-specific attributes
     */
    startSpan(name: string, options?: AivoSpanOptions): Span;
    /**
     * Execute a function within a new span
     */
    withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>, options?: AivoSpanOptions): Promise<T>;
    /**
     * Get the current active span
     */
    getActiveSpan(): Span | undefined;
    /**
     * Add Aivo context to current span
     */
    setAivoContext(ctx: AivoContext): void;
    /**
     * Shutdown the tracer provider
     */
    shutdown(): Promise<void>;
}
export interface AivoSpanOptions extends SpanOptions {
    tenantId?: string;
    userId?: string;
    learnerId?: string;
    requestId?: string;
}
export interface AivoContext {
    tenantId?: string;
    userId?: string;
    learnerId?: string;
    requestId?: string;
    sessionId?: string;
    agentType?: string;
    provider?: string;
    model?: string;
}
export declare function createTracer(config: TracerConfig): AivoTracer;
/**
 * Get the global tracer provider (if initialized)
 */
export declare function getGlobalTracerProvider(): NodeTracerProvider | null;
/**
 * Create span attributes for HTTP requests
 */
export declare function httpSpanAttributes(req: {
    method?: string;
    url?: string;
    route?: string;
    host?: string;
    userAgent?: string;
}): Record<string, string>;
/**
 * Create span attributes for AI calls
 */
export declare function aiSpanAttributes(call: {
    agentType: string;
    provider: string;
    model: string;
    tokensInput?: number;
    tokensOutput?: number;
    costUsd?: number;
    safetyStatus?: string;
}): Record<string, string | number>;
//# sourceMappingURL=tracer.d.ts.map