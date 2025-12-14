/**
 * Context Propagation Helpers
 *
 * Utilities for extracting and injecting trace context
 * across service boundaries.
 */

import { context, propagation, trace } from '@opentelemetry/api';
import type { Context, TextMapGetter, TextMapSetter } from '@opentelemetry/api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// GETTERS AND SETTERS
// ══════════════════════════════════════════════════════════════════════════════

const headerGetter: TextMapGetter<CarrierHeaders> = {
  get(carrier: CarrierHeaders, key: string): string | undefined {
    return carrier[key.toLowerCase()];
  },
  keys(carrier: CarrierHeaders): string[] {
    return Object.keys(carrier);
  },
};

const headerSetter: TextMapSetter<CarrierHeaders> = {
  set(carrier: CarrierHeaders, key: string, value: string): void {
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
export function extractContext(headers: CarrierHeaders): Context {
  return propagation.extract(context.active(), headers, headerGetter);
}

/**
 * Extract trace context info from headers for logging/debugging
 *
 * @param headers - HTTP headers containing trace context
 * @returns Parsed trace context information
 */
export function extractTraceInfo(headers: CarrierHeaders): TraceContext | null {
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

  const result: TraceContext = {
    traceId: parts[1]!,
    spanId: parts[2]!,
    traceFlags: Number.parseInt(parts[3]!, 16),
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
export function injectContext(headers: CarrierHeaders = {}, ctx?: Context): CarrierHeaders {
  const activeContext = ctx ?? context.active();
  propagation.inject(activeContext, headers, headerSetter);
  return headers;
}

/**
 * Get the current trace context as headers for outgoing requests
 *
 * @returns Headers object with trace context
 */
export function getTraceHeaders(): CarrierHeaders {
  const headers: CarrierHeaders = {};
  propagation.inject(context.active(), headers, headerSetter);
  return headers;
}

/**
 * Get the current trace ID (if available)
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) {
    return undefined;
  }
  return span.spanContext().traceId;
}

/**
 * Get the current span ID (if available)
 */
export function getCurrentSpanId(): string | undefined {
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
export function withContext<T>(ctx: Context, fn: () => T): T {
  return context.with(ctx, fn);
}

/**
 * Run an async function within a specific trace context
 *
 * @param ctx - The context to use
 * @param fn - Async function to run within the context
 * @returns Promise resolving to the function result
 */
export async function withContextAsync<T>(ctx: Context, fn: () => Promise<T>): Promise<T> {
  return context.with(ctx, fn);
}

/**
 * Create a linked context for batch operations
 * Links the current span to multiple parent traces
 *
 * @param parentContexts - Array of parent contexts to link
 * @returns New context with links to all parents
 */
export function createLinkedContext(parentContexts: Context[]): Context {
  // Note: This is a simplified implementation
  // Full link support requires span creation with links
  return parentContexts[0] ?? context.active();
}
