/**
 * Main Observability Initialization
 *
 * Provides a single entry point to initialize all observability components:
 * - Tracer (OpenTelemetry)
 * - Metrics (Prometheus)
 * - Logger (Pino + Loki)
 */

import type { AivoTracer, TracerConfig } from './tracer.js';
import { createTracer } from './tracer.js';
import type { MetricsRegistry } from './metrics/types.js';
import { createMetricsRegistry } from './metrics/registry.js';
import type { AivoLogger, LoggerConfig } from './logger.js';
import { createLogger } from './logger.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;

  // Tracing configuration
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

  // Metrics configuration
  metrics?: {
    enabled?: boolean;
    prefix?: string;
    collectDefaultMetrics?: boolean;
  };

  // Logging configuration
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

  // Components
  tracer: AivoTracer;
  metrics: MetricsRegistry;
  logger: AivoLogger;

  // Convenience methods
  shutdown(): Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

let globalInstance: ObservabilityInstance | null = null;

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
export function initObservability(config: ObservabilityConfig): ObservabilityInstance {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = process.env.NODE_ENV ?? 'development',
  } = config;

  // Create tracer
  const tracerConfig: TracerConfig = {
    serviceName,
    serviceVersion,
    environment,
    enabled: config.tracing?.enabled ?? true,
    jaeger: config.tracing?.jaeger,
    otlp: config.tracing?.otlp,
    console: config.tracing?.console,
  };
  const tracer = createTracer(tracerConfig);

  // Create metrics registry
  const metrics = createMetricsRegistry({
    serviceName,
    environment,
    prefix: config.metrics?.prefix ?? '',
    collectDefaultMetrics: config.metrics?.collectDefaultMetrics ?? true,
  });

  // Create logger
  const loggerConfig: LoggerConfig = {
    serviceName,
    environment,
    level: config.logging?.level,
    prettyPrint: config.logging?.prettyPrint,
    loki: config.logging?.loki,
  };
  const logger = createLogger(loggerConfig);

  // Log initialization
  logger.info(
    {
      serviceName,
      serviceVersion,
      environment,
      tracingEnabled: config.tracing?.enabled ?? true,
      metricsEnabled: config.metrics?.enabled ?? true,
    },
    'Observability initialized'
  );

  const instance: ObservabilityInstance = {
    serviceName,
    environment,
    tracer,
    metrics,
    logger,

    async shutdown(): Promise<void> {
      logger.info('Shutting down observability');
      await tracer.shutdown();
    },
  };

  globalInstance = instance;
  return instance;
}

/**
 * Get the global observability instance
 * Throws if not initialized
 */
export function getObservability(): ObservabilityInstance {
  if (!globalInstance) {
    throw new Error('Observability not initialized. Call initObservability() first.');
  }
  return globalInstance;
}

/**
 * Check if observability is initialized
 */
export function isObservabilityInitialized(): boolean {
  return globalInstance !== null;
}

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
export function initObservabilityFromEnv(): ObservabilityInstance {
  const serviceName = process.env.AIVO_SERVICE_NAME;
  if (!serviceName) {
    throw new Error('AIVO_SERVICE_NAME environment variable is required');
  }

  return initObservability({
    serviceName,
    serviceVersion: process.env.AIVO_SERVICE_VERSION,
    environment: process.env.NODE_ENV,
    tracing: {
      enabled: process.env.OTEL_TRACING_ENABLED !== 'false',
      jaeger: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT
        ? { endpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT }
        : undefined,
      otlp: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? { endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }
        : undefined,
    },
    logging: {
      level: process.env.LOG_LEVEL,
      loki: process.env.LOKI_HOST
        ? { host: process.env.LOKI_HOST }
        : undefined,
    },
  });
}
