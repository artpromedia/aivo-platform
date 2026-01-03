/**
 * Context Propagation Helpers
 *
 * Utilities for extracting and injecting trace context
 * across service boundaries.
 */
import type { Context } from '@opentelemetry/api';
export interface TraceContext {
    traceId: string;
    spanId: string;
    traceFlags: number;
    traceState?: string;
}
export interface CarrierHeaders {
    traceparent?: string;
    tracestate?: string;
    'x-request-id'?: string;
    'x-correlation-id'?: string;
    [key: string]: string | undefined;
}
/**
 * Extract trace context from incoming request headers
 *
 * @param headers - HTTP headers containing trace context
 * @returns The extracted context that can be used to create child spans
 */
export declare function extractContext(headers: CarrierHeaders): Context;
/**
 * Extract trace context info from headers for logging/debugging
 *
 * @param headers - HTTP headers containing trace context
 * @returns Parsed trace context information
 */
export declare function extractTraceInfo(headers: CarrierHeaders): TraceContext | null;
/**
 * Inject trace context into outgoing request headers
 *
 * @param headers - Headers object to inject context into
 * @param ctx - Optional context to inject (defaults to active context)
 * @returns The modified headers with trace context
 */
export declare function injectContext(headers?: CarrierHeaders, ctx?: Context): CarrierHeaders;
/**
 * Get the current trace context as headers for outgoing requests
 *
 * @returns Headers object with trace context
 */
export declare function getTraceHeaders(): CarrierHeaders;
/**
 * Get the current trace ID (if available)
 */
export declare function getCurrentTraceId(): string | undefined;
/**
 * Get the current span ID (if available)
 */
export declare function getCurrentSpanId(): string | undefined;
/**
 * Run a function within a specific trace context
 *
 * @param ctx - The context to use
 * @param fn - Function to run within the context
 * @returns The result of the function
 */
export declare function withContext<T>(ctx: Context, fn: () => T): T;
/**
 * Run an async function within a specific trace context
 *
 * @param ctx - The context to use
 * @param fn - Async function to run within the context
 * @returns Promise resolving to the function result
 */
export declare function withContextAsync<T>(ctx: Context, fn: () => Promise<T>): Promise<T>;
/**
 * Create a linked context for batch operations
 * Links the current span to multiple parent traces
 *
 * @param parentContexts - Array of parent contexts to link
 * @returns New context with links to all parents
 */
export declare function createLinkedContext(parentContexts: Context[]): Context;
//# sourceMappingURL=context.d.ts.map