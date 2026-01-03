/**
 * Context Propagation Helpers
 *
 * Utilities for extracting and injecting trace context
 * across service boundaries.
 */
import { context, propagation, trace } from '@opentelemetry/api';
// ══════════════════════════════════════════════════════════════════════════════
// GETTERS AND SETTERS
// ══════════════════════════════════════════════════════════════════════════════
const headerGetter = {
    get(carrier, key) {
        return carrier[key.toLowerCase()];
    },
    keys(carrier) {
        return Object.keys(carrier);
    },
};
const headerSetter = {
    set(carrier, key, value) {
        carrier[key.toLowerCase()] = value;
    },
};
// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Extract trace context from incoming request headers
 *
 * @param headers - HTTP headers containing trace context
 * @returns The extracted context that can be used to create child spans
 */
export function extractContext(headers) {
    return propagation.extract(context.active(), headers, headerGetter);
}
/**
 * Extract trace context info from headers for logging/debugging
 *
 * @param headers - HTTP headers containing trace context
 * @returns Parsed trace context information
 */
export function extractTraceInfo(headers) {
    const traceparent = headers.traceparent;
    if (!traceparent) {
        return null;
    }
    // traceparent format: version-traceId-spanId-traceFlags
    // e.g., 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
    const parts = traceparent.split('-');
    if (parts.length < 4) {
        return null;
    }
    const result = {
        traceId: parts[1],
        spanId: parts[2],
        traceFlags: Number.parseInt(parts[3], 16),
    };
    if (headers.tracestate) {
        result.traceState = headers.tracestate;
    }
    return result;
}
// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT INJECTION
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Inject trace context into outgoing request headers
 *
 * @param headers - Headers object to inject context into
 * @param ctx - Optional context to inject (defaults to active context)
 * @returns The modified headers with trace context
 */
export function injectContext(headers = {}, ctx) {
    const activeContext = ctx ?? context.active();
    propagation.inject(activeContext, headers, headerSetter);
    return headers;
}
/**
 * Get the current trace context as headers for outgoing requests
 *
 * @returns Headers object with trace context
 */
export function getTraceHeaders() {
    const headers = {};
    propagation.inject(context.active(), headers, headerSetter);
    return headers;
}
/**
 * Get the current trace ID (if available)
 */
export function getCurrentTraceId() {
    const span = trace.getActiveSpan();
    if (!span) {
        return undefined;
    }
    return span.spanContext().traceId;
}
/**
 * Get the current span ID (if available)
 */
export function getCurrentSpanId() {
    const span = trace.getActiveSpan();
    if (!span) {
        return undefined;
    }
    return span.spanContext().spanId;
}
// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Run a function within a specific trace context
 *
 * @param ctx - The context to use
 * @param fn - Function to run within the context
 * @returns The result of the function
 */
export function withContext(ctx, fn) {
    return context.with(ctx, fn);
}
/**
 * Run an async function within a specific trace context
 *
 * @param ctx - The context to use
 * @param fn - Async function to run within the context
 * @returns Promise resolving to the function result
 */
export async function withContextAsync(ctx, fn) {
    return context.with(ctx, fn);
}
/**
 * Create a linked context for batch operations
 * Links the current span to multiple parent traces
 *
 * @param parentContexts - Array of parent contexts to link
 * @returns New context with links to all parents
 */
export function createLinkedContext(parentContexts) {
    // Note: This is a simplified implementation
    // Full link support requires span creation with links
    return parentContexts[0] ?? context.active();
}
//# sourceMappingURL=context.js.map