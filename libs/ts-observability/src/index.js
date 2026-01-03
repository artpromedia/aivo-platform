/**
 * @aivo/observability - Enterprise-Grade Observability for Aivo Platform
 *
 * This package provides:
 * - OpenTelemetry tracing with Jaeger/OTLP export
 * - Prometheus-compatible metrics with standard golden signals
 * - Structured JSON logging via Pino with Loki integration
 * - SLO configuration and burn-rate calculations
 * - Fastify plugin for automatic HTTP instrumentation
 *
 * Usage:
 * ```typescript
 * import { initObservability } from '@aivo/observability';
 *
 * const obs = initObservability({
 *   serviceName: 'session-svc',
 *   environment: 'production',
 * });
 *
 * // Use throughout service
 * obs.logger.info({ tenantId: 'xyz' }, 'Session started');
 * obs.metrics.httpRequestDuration.observe({ route: '/sessions', method: 'POST' }, 0.125);
 * const span = obs.tracer.startSpan('processSession');
 * ```
 */
// Core initialization
export { initObservability } from './init.js';
// Tracer
export { createTracer } from './tracer.js';
// Metrics
export { createMetricsRegistry, } from './metrics/index.js';
// Logger
export { createLogger } from './logger.js';
// Fastify Plugin
export { observabilityPlugin } from './fastify/plugin.js';
// SLO Configuration
export { SLO_DEFINITIONS, calculateErrorBudget, calculateBurnRate, } from './slo/index.js';
// Context propagation helpers
export { extractContext, injectContext } from './context.js';
// Default instances for convenience
import { createLogger } from './logger.js';
import { createMetricsRegistry } from './metrics/index.js';
// Singleton logger for services that import directly
export const logger = createLogger({ serviceName: 'default' });
// Singleton metrics for services that import directly
export const metrics = createMetricsRegistry({ serviceName: 'default' });
// Standard attribute names
export { AIVO_ATTRIBUTES, METRIC_NAMES } from './constants.js';
//# sourceMappingURL=index.js.map