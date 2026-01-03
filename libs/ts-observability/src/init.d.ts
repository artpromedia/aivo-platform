/**
 * Main Observability Initialization
 *
 * Provides a single entry point to initialize all observability components:
 * - Tracer (OpenTelemetry)
 * - Metrics (Prometheus)
 * - Logger (Pino + Loki)
 */
import type { AivoLogger } from './logger.js';
import type { MetricsRegistry } from './metrics/types.js';
import type { AivoTracer } from './tracer.js';
export interface ObservabilityConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    tracing?: {
        enabled?: boolean;
        jaeger?: {
            endpoint?: string;
        };
        otlp?: {
            endpoint?: string;
        };
        console?: boolean;
    };
    metrics?: {
        enabled?: boolean;
        prefix?: string;
        collectDefaultMetrics?: boolean;
    };
    logging?: {
        level?: string;
        prettyPrint?: boolean;
        loki?: {
            host: string;
            labels?: Record<string, string>;
            batching?: boolean;
            interval?: number;
        };
    };
}
export interface ObservabilityInstance {
    serviceName: string;
    environment: string;
    tracer: AivoTracer;
    metrics: MetricsRegistry;
    logger: AivoLogger;
    shutdown(): Promise<void>;
}
/**
 * Initialize observability for a service
 *
 * This is the main entry point for setting up observability.
 * It creates and configures all observability components.
 *
 * @example
 * ```typescript
 * const obs = initObservability({
 *   serviceName: 'session-svc',
 *   environment: 'production',
 *   tracing: {
 *     jaeger: { endpoint: 'http://jaeger:14268/api/traces' },
 *   },
 *   metrics: {
 *     collectDefaultMetrics: true,
 *   },
 *   logging: {
 *     level: 'info',
 *     loki: { host: 'http://loki:3100' },
 *   },
 * });
 *
 * // Use throughout your service
 * obs.logger.info('Service started');
 * obs.metrics.http.requestsTotal.inc({ method: 'GET', route: '/health' });
 * await obs.tracer.withSpan('operation', async (span) => { ... });
 * ```
 */
export declare function initObservability(config: ObservabilityConfig): ObservabilityInstance;
/**
 * Get the global observability instance
 * Throws if not initialized
 */
export declare function getObservability(): ObservabilityInstance;
/**
 * Check if observability is initialized
 */
export declare function isObservabilityInitialized(): boolean;
/**
 * Initialize observability from environment variables
 *
 * Environment variables:
 * - AIVO_SERVICE_NAME (required)
 * - AIVO_SERVICE_VERSION
 * - NODE_ENV
 * - OTEL_EXPORTER_JAEGER_ENDPOINT
 * - OTEL_EXPORTER_OTLP_ENDPOINT
 * - LOKI_HOST
 * - LOG_LEVEL
 */
export declare function initObservabilityFromEnv(): ObservabilityInstance;
//# sourceMappingURL=init.d.ts.map