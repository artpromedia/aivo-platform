/**
 * Fastify Observability Plugin
 *
 * Provides automatic HTTP instrumentation with:
 * - Request/response tracing
 * - Metrics collection (latency, errors, request counts)
 * - Structured logging with request context
 * - Prometheus metrics endpoint
 */
import type { Span } from '@opentelemetry/api';
import type { FastifyRequest } from 'fastify';
import type { ObservabilityInstance } from '../init.js';
import type { AivoLogger } from '../logger.js';
export interface ObservabilityPluginOptions {
    /** Pre-initialized observability instance */
    obs: ObservabilityInstance;
    /** Path for the metrics endpoint (default: /metrics) */
    metricsPath?: string;
    /** Whether to expose metrics endpoint (default: true) */
    exposeMetrics?: boolean;
    /** Routes to skip (e.g., ['/health', '/ready']) */
    skipRoutes?: string[];
    /** Whether to log request/response bodies (default: false, for PII safety) */
    logBodies?: boolean;
    /** Extract tenant ID from request */
    extractTenantId?: (request: FastifyRequest) => string | undefined;
    /** Extract user ID from request */
    extractUserId?: (request: FastifyRequest) => string | undefined;
    /** Extract learner ID from request */
    extractLearnerId?: (request: FastifyRequest) => string | undefined;
}
declare module 'fastify' {
    interface FastifyRequest {
        requestId: string;
        correlationId?: string;
        tenantId?: string;
        userId?: string;
        learnerId?: string;
        span?: Span;
        startTime?: [number, number];
        aivoLog?: AivoLogger;
    }
    interface FastifyInstance {
        obs: ObservabilityInstance;
    }
}
export declare const observabilityPlugin: any;
//# sourceMappingURL=plugin.d.ts.map