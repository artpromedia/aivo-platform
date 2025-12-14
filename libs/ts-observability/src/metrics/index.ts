/**
 * Prometheus Metrics Registry
 *
 * Provides standard metrics for HTTP, AI, and business operations.
 * Uses prom-client for Prometheus-compatible metric exposition.
 */

export * from './types.js';
export { createMetricsRegistry } from './registry.js';
