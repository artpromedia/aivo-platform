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
export { initObservability, type ObservabilityConfig, type ObservabilityInstance } from './init.js';
export { createTracer, type TracerConfig, type AivoTracer } from './tracer.js';
export { createMetricsRegistry, type MetricsRegistry, type HttpMetrics, type AiMetrics, type MetricLabels, } from './metrics/index.js';
export { createLogger, type LoggerConfig, type AivoLogger } from './logger.js';
export { observabilityPlugin, type ObservabilityPluginOptions } from './fastify/plugin.js';
export { SLO_DEFINITIONS, type SloDefinition, type SloConfig, calculateErrorBudget, calculateBurnRate, } from './slo/index.js';
export { extractContext, injectContext, type TraceContext } from './context.js';
export declare const logger: import("./logger.js").AivoLogger;
export declare const metrics: import("./index.js").MetricsRegistry;
export { AIVO_ATTRIBUTES, METRIC_NAMES } from './constants.js';
//# sourceMappingURL=index.d.ts.map