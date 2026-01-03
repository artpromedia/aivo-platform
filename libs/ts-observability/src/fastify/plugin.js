/**
 * Fastify Observability Plugin
 *
 * Provides automatic HTTP instrumentation with:
 * - Request/response tracing
 * - Metrics collection (latency, errors, request counts)
 * - Structured logging with request context
 * - Prometheus metrics endpoint
 */
import { SpanStatusCode } from '@opentelemetry/api';
import fp from 'fastify-plugin';
import { AIVO_ATTRIBUTES } from '../constants.js';
import { extractContext } from '../context.js';
// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════
function getStatusClass(statusCode) {
    if (statusCode < 200)
        return '1xx';
    if (statusCode < 300)
        return '2xx';
    if (statusCode < 400)
        return '3xx';
    if (statusCode < 500)
        return '4xx';
    return '5xx';
}
function getRoutePattern(request) {
    // Use the registered route pattern, not the actual URL with params
    return request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown';
}
function shouldSkipRoute(url, skipRoutes) {
    const path = url.split('?')[0];
    return skipRoutes.some((skip) => path === skip || path?.startsWith(skip + '/'));
}
// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════
const observabilityPluginImpl = (fastify, opts, done) => {
    const { obs, metricsPath = '/metrics', exposeMetrics = true, skipRoutes = ['/health', '/ready', '/metrics'], logBodies = false, extractTenantId, extractUserId, extractLearnerId, } = opts;
    // Decorate fastify with observability instance
    fastify.decorate('obs', obs);
    // ────────────────────────────────────────────────────────────────────────────
    // METRICS ENDPOINT
    // ────────────────────────────────────────────────────────────────────────────
    if (exposeMetrics) {
        fastify.get(metricsPath, async (request, reply) => {
            const metrics = await obs.metrics.getMetricsText();
            reply.header('Content-Type', obs.metrics.getContentType());
            return metrics;
        });
    }
    // ────────────────────────────────────────────────────────────────────────────
    // REQUEST HOOKS
    // ────────────────────────────────────────────────────────────────────────────
    // onRequest: Start timing and create span
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip instrumentation for certain routes
        if (shouldSkipRoute(request.url, skipRoutes)) {
            return;
        }
        // Start timing
        request.startTime = process.hrtime();
        // Extract trace context from incoming headers
        const parentContext = extractContext(request.headers);
        // Extract Aivo context
        const tenantId = extractTenantId?.(request);
        const userId = extractUserId?.(request);
        const learnerId = extractLearnerId?.(request);
        if (tenantId)
            request.tenantId = tenantId;
        if (userId)
            request.userId = userId;
        if (learnerId)
            request.learnerId = learnerId;
        // Generate/extract request ID
        const incomingRequestId = request.headers['x-request-id'];
        request.requestId =
            typeof incomingRequestId === 'string' && incomingRequestId.length > 0
                ? incomingRequestId
                : request.id;
        request.correlationId = request.headers['x-correlation-id'] ?? request.requestId;
        // Create span within parent context
        const tracer = obs.tracer.tracer;
        const span = tracer.startSpan(`HTTP ${request.method} ${getRoutePattern(request)}`, {
            attributes: {
                [AIVO_ATTRIBUTES.HTTP_METHOD]: request.method,
                [AIVO_ATTRIBUTES.HTTP_URL]: request.url,
                [AIVO_ATTRIBUTES.HTTP_ROUTE]: getRoutePattern(request),
                [AIVO_ATTRIBUTES.HTTP_HOST]: request.hostname,
                [AIVO_ATTRIBUTES.REQUEST_ID]: request.requestId,
                ...(request.tenantId && { [AIVO_ATTRIBUTES.TENANT_ID]: request.tenantId }),
                ...(request.userId && { [AIVO_ATTRIBUTES.USER_ID]: request.userId }),
                ...(request.learnerId && { [AIVO_ATTRIBUTES.LEARNER_ID]: request.learnerId }),
            },
        }, parentContext);
        request.span = span;
        // Create request-scoped logger with proper context
        const logContext = {
            requestId: request.requestId,
            correlationId: request.correlationId,
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
        };
        if (request.tenantId)
            logContext.tenantId = request.tenantId;
        if (request.userId)
            logContext.userId = request.userId;
        if (request.learnerId)
            logContext.learnerId = request.learnerId;
        request.aivoLog = obs.logger.withContext(logContext);
        // Increment active requests gauge
        obs.metrics.http.activeRequests.inc({ method: request.method });
        // Log request start
        request.aivoLog?.debug({
            method: request.method,
            url: request.url,
            route: getRoutePattern(request),
            userAgent: request.headers['user-agent'],
            ...(logBodies && request.body ? { body: request.body } : {}),
        }, 'Request started');
        // Add request ID to response headers
        reply.header('X-Request-ID', request.requestId);
        reply.header('X-Correlation-ID', request.correlationId);
    });
    // onResponse: Record metrics and complete span
    fastify.addHook('onResponse', async (request, reply) => {
        // Skip instrumentation for certain routes
        if (shouldSkipRoute(request.url, skipRoutes)) {
            return;
        }
        const route = getRoutePattern(request);
        const statusCode = reply.statusCode.toString();
        const statusClass = getStatusClass(reply.statusCode);
        // Calculate duration
        let durationSeconds = 0;
        if (request.startTime) {
            const [seconds, nanoseconds] = process.hrtime(request.startTime);
            durationSeconds = seconds + nanoseconds / 1e9;
        }
        // Record HTTP metrics
        const labels = {
            method: request.method,
            route,
            status_code: statusCode,
            status_class: statusClass,
        };
        obs.metrics.http.requestDuration.observe(labels, durationSeconds);
        obs.metrics.http.requestsTotal.inc(labels);
        obs.metrics.http.activeRequests.dec({ method: request.method });
        // Complete span
        if (request.span) {
            request.span.setAttribute(AIVO_ATTRIBUTES.HTTP_STATUS_CODE, reply.statusCode);
            if (reply.statusCode >= 400) {
                request.span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `HTTP ${reply.statusCode}`,
                });
            }
            else {
                request.span.setStatus({ code: SpanStatusCode.OK });
            }
            request.span.end();
        }
        // Log request completion
        request.aivoLog?.info({
            method: request.method,
            url: request.url,
            route,
            statusCode: reply.statusCode,
            durationMs: Math.round(durationSeconds * 1000),
            contentLength: reply.getHeader('content-length'),
        }, `Request completed: ${reply.statusCode} in ${Math.round(durationSeconds * 1000)}ms`);
    });
    // onError: Log errors and update span
    fastify.addHook('onError', async (request, reply, error) => {
        // Skip instrumentation for certain routes
        if (shouldSkipRoute(request.url, skipRoutes)) {
            return;
        }
        // Record error on span
        if (request.span) {
            request.span.recordException(error);
            request.span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
        }
        // Log error
        request.aivoLog?.errorWithContext(error, 'Request error', {
            method: request.method,
            url: request.url,
            route: getRoutePattern(request),
        });
    });
    done();
};
// Export as Fastify plugin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const observabilityPlugin = fp(observabilityPluginImpl, {
    name: '@aivo/observability',
    fastify: '5.x',
});
//# sourceMappingURL=plugin.js.map