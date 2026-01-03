/**
 * Metrics Registry Factory
 *
 * Creates a fully-configured metrics registry with all standard Aivo metrics.
 */
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics, } from 'prom-client';
import { METRIC_NAMES, METRIC_LABELS, HISTOGRAM_BUCKETS } from '../constants.js';
export function createMetricsRegistry(config) {
    const { serviceName, environment = 'development', prefix = '', defaultLabels = {}, collectDefaultMetrics: collectDefault = true, } = config;
    // Create a new registry (don't use global to avoid conflicts)
    const registry = new Registry();
    // Set default labels
    registry.setDefaultLabels({
        service: serviceName,
        env: environment,
        ...defaultLabels,
    });
    // Collect Node.js default metrics if enabled
    if (collectDefault) {
        collectDefaultMetrics({ register: registry, prefix });
    }
    // ════════════════════════════════════════════════════════════════════════════
    // HTTP METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const httpRequestDuration = new Histogram({
        name: `${prefix}${METRIC_NAMES.HTTP_REQUEST_DURATION}`,
        help: 'Duration of HTTP requests in seconds',
        labelNames: [METRIC_LABELS.METHOD, METRIC_LABELS.ROUTE, METRIC_LABELS.STATUS_CODE, METRIC_LABELS.STATUS_CLASS],
        buckets: HISTOGRAM_BUCKETS.HTTP_DURATION,
        registers: [registry],
    });
    const httpRequestsTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.HTTP_REQUESTS_TOTAL}`,
        help: 'Total number of HTTP requests',
        labelNames: [METRIC_LABELS.METHOD, METRIC_LABELS.ROUTE, METRIC_LABELS.STATUS_CODE, METRIC_LABELS.STATUS_CLASS],
        registers: [registry],
    });
    const httpRequestSize = new Histogram({
        name: `${prefix}${METRIC_NAMES.HTTP_REQUEST_SIZE}`,
        help: 'Size of HTTP request bodies in bytes',
        labelNames: [METRIC_LABELS.METHOD, METRIC_LABELS.ROUTE],
        buckets: HISTOGRAM_BUCKETS.SIZE_BYTES,
        registers: [registry],
    });
    const httpResponseSize = new Histogram({
        name: `${prefix}${METRIC_NAMES.HTTP_RESPONSE_SIZE}`,
        help: 'Size of HTTP response bodies in bytes',
        labelNames: [METRIC_LABELS.METHOD, METRIC_LABELS.ROUTE, METRIC_LABELS.STATUS_CODE],
        buckets: HISTOGRAM_BUCKETS.SIZE_BYTES,
        registers: [registry],
    });
    const httpActiveRequests = new Gauge({
        name: `${prefix}${METRIC_NAMES.HTTP_ACTIVE_REQUESTS}`,
        help: 'Number of HTTP requests currently being processed',
        labelNames: [METRIC_LABELS.METHOD],
        registers: [registry],
    });
    const http = {
        requestDuration: httpRequestDuration,
        requestsTotal: httpRequestsTotal,
        requestSize: httpRequestSize,
        responseSize: httpResponseSize,
        activeRequests: httpActiveRequests,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // AI METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const aiRequestDuration = new Histogram({
        name: `${prefix}${METRIC_NAMES.AI_REQUEST_DURATION}`,
        help: 'Duration of AI provider requests in seconds',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.PROVIDER, METRIC_LABELS.MODEL, METRIC_LABELS.TENANT_ID],
        buckets: HISTOGRAM_BUCKETS.AI_DURATION,
        registers: [registry],
    });
    const aiRequestsTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_REQUESTS_TOTAL}`,
        help: 'Total number of AI requests',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.PROVIDER, METRIC_LABELS.MODEL, METRIC_LABELS.STATUS_CODE],
        registers: [registry],
    });
    const aiTokensTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_TOKENS_TOTAL}`,
        help: 'Total number of AI tokens used',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.PROVIDER, METRIC_LABELS.MODEL, METRIC_LABELS.TOKEN_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const aiCostTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_COST_USD_TOTAL}`,
        help: 'Total AI cost in USD',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.PROVIDER, METRIC_LABELS.MODEL, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const aiFailoverTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_FAILOVER_TOTAL}`,
        help: 'Total number of AI provider failovers',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.FAILOVER_FROM, METRIC_LABELS.FAILOVER_TO],
        registers: [registry],
    });
    const aiSafetyBlocksTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_SAFETY_BLOCKS_TOTAL}`,
        help: 'Total number of AI safety blocks',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.SAFETY_STATUS, METRIC_LABELS.SAFETY_REASON],
        registers: [registry],
    });
    const aiErrorsTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AI_ERRORS_TOTAL}`,
        help: 'Total number of AI errors',
        labelNames: [METRIC_LABELS.AGENT_TYPE, METRIC_LABELS.PROVIDER, METRIC_LABELS.MODEL, 'error_type'],
        registers: [registry],
    });
    const ai = {
        requestDuration: aiRequestDuration,
        requestsTotal: aiRequestsTotal,
        tokensTotal: aiTokensTotal,
        costTotal: aiCostTotal,
        failoverTotal: aiFailoverTotal,
        safetyBlocksTotal: aiSafetyBlocksTotal,
        errorsTotal: aiErrorsTotal,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // SESSION METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const sessionsStartedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.SESSIONS_STARTED_TOTAL}`,
        help: 'Total number of sessions started',
        labelNames: [METRIC_LABELS.SESSION_TYPE, METRIC_LABELS.SUBJECT, METRIC_LABELS.GRADE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const sessionsCompletedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.SESSIONS_COMPLETED_TOTAL}`,
        help: 'Total number of sessions completed',
        labelNames: [METRIC_LABELS.SESSION_TYPE, METRIC_LABELS.SUBJECT, METRIC_LABELS.GRADE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const sessionsAbandonedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.SESSIONS_ABANDONED_TOTAL}`,
        help: 'Total number of sessions abandoned',
        labelNames: [METRIC_LABELS.SESSION_TYPE, METRIC_LABELS.SUBJECT, METRIC_LABELS.GRADE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const sessionDuration = new Histogram({
        name: `${prefix}${METRIC_NAMES.SESSION_DURATION_SECONDS}`,
        help: 'Duration of sessions in seconds',
        labelNames: [METRIC_LABELS.SESSION_TYPE, METRIC_LABELS.COMPLETION_STATUS, METRIC_LABELS.TENANT_ID],
        buckets: HISTOGRAM_BUCKETS.SESSION_DURATION,
        registers: [registry],
    });
    const sessionsActive = new Gauge({
        name: `${prefix}${METRIC_NAMES.SESSIONS_ACTIVE}`,
        help: 'Number of active sessions',
        labelNames: [METRIC_LABELS.SESSION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const sessions = {
        startedTotal: sessionsStartedTotal,
        completedTotal: sessionsCompletedTotal,
        abandonedTotal: sessionsAbandonedTotal,
        duration: sessionDuration,
        active: sessionsActive,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // FOCUS METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const focusInterventionsTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.FOCUS_INTERVENTIONS_TOTAL}`,
        help: 'Total number of focus interventions triggered',
        labelNames: [METRIC_LABELS.INTERVENTION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const focusScore = new Gauge({
        name: `${prefix}${METRIC_NAMES.FOCUS_SCORE}`,
        help: 'Current focus score (0-100)',
        labelNames: [METRIC_LABELS.TENANT_ID, 'learner_id'],
        registers: [registry],
    });
    const focusEffectivenessTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.FOCUS_INTERVENTION_EFFECTIVENESS}`,
        help: 'Focus intervention effectiveness counts',
        labelNames: [METRIC_LABELS.INTERVENTION_TYPE, METRIC_LABELS.EFFECTIVENESS, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const focus = {
        interventionsTotal: focusInterventionsTotal,
        score: focusScore,
        effectivenessTotal: focusEffectivenessTotal,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // RECOMMENDATION METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const recommendationsCreatedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.RECOMMENDATIONS_CREATED_TOTAL}`,
        help: 'Total number of recommendations created',
        labelNames: [METRIC_LABELS.RECOMMENDATION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const recommendationsAcceptedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.RECOMMENDATIONS_ACCEPTED_TOTAL}`,
        help: 'Total number of recommendations accepted',
        labelNames: [METRIC_LABELS.RECOMMENDATION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const recommendationsDeclinedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.RECOMMENDATIONS_DECLINED_TOTAL}`,
        help: 'Total number of recommendations declined',
        labelNames: [METRIC_LABELS.RECOMMENDATION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const recommendationsExpiredTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.RECOMMENDATIONS_EXPIRED_TOTAL}`,
        help: 'Total number of recommendations that expired',
        labelNames: [METRIC_LABELS.RECOMMENDATION_TYPE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const recommendations = {
        createdTotal: recommendationsCreatedTotal,
        acceptedTotal: recommendationsAcceptedTotal,
        declinedTotal: recommendationsDeclinedTotal,
        expiredTotal: recommendationsExpiredTotal,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // AUTH METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const authRequestsTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AUTH_REQUESTS_TOTAL}`,
        help: 'Total number of authentication requests',
        labelNames: [METRIC_LABELS.AUTH_METHOD, METRIC_LABELS.STATUS_CODE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const authFailuresTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AUTH_FAILURES_TOTAL}`,
        help: 'Total number of authentication failures',
        labelNames: [METRIC_LABELS.AUTH_METHOD, METRIC_LABELS.FAILURE_REASON, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const authTokenRefreshesTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.AUTH_TOKEN_REFRESHES_TOTAL}`,
        help: 'Total number of token refreshes',
        labelNames: [METRIC_LABELS.STATUS_CODE, METRIC_LABELS.TENANT_ID],
        registers: [registry],
    });
    const auth = {
        requestsTotal: authRequestsTotal,
        failuresTotal: authFailuresTotal,
        tokenRefreshesTotal: authTokenRefreshesTotal,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // EVENT METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const eventsPublishedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.EVENTS_PUBLISHED_TOTAL}`,
        help: 'Total number of events published',
        labelNames: [METRIC_LABELS.EVENT_TYPE, METRIC_LABELS.EVENT_SOURCE],
        registers: [registry],
    });
    const eventsProcessedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.EVENTS_PROCESSED_TOTAL}`,
        help: 'Total number of events processed',
        labelNames: [METRIC_LABELS.EVENT_TYPE, METRIC_LABELS.EVENT_SOURCE],
        registers: [registry],
    });
    const eventsFailedTotal = new Counter({
        name: `${prefix}${METRIC_NAMES.EVENTS_FAILED_TOTAL}`,
        help: 'Total number of events that failed processing',
        labelNames: [METRIC_LABELS.EVENT_TYPE, METRIC_LABELS.EVENT_SOURCE, 'error_type'],
        registers: [registry],
    });
    const eventsDlqDepth = new Gauge({
        name: `${prefix}${METRIC_NAMES.EVENTS_DLQ_DEPTH}`,
        help: 'Current depth of the dead letter queue',
        labelNames: [METRIC_LABELS.EVENT_TYPE],
        registers: [registry],
    });
    const eventProcessingDuration = new Histogram({
        name: `${prefix}${METRIC_NAMES.EVENT_PROCESSING_DURATION}`,
        help: 'Duration of event processing in seconds',
        labelNames: [METRIC_LABELS.EVENT_TYPE],
        buckets: HISTOGRAM_BUCKETS.EVENT_DURATION,
        registers: [registry],
    });
    const events = {
        publishedTotal: eventsPublishedTotal,
        processedTotal: eventsProcessedTotal,
        failedTotal: eventsFailedTotal,
        dlqDepth: eventsDlqDepth,
        processingDuration: eventProcessingDuration,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // DATABASE METRICS
    // ════════════════════════════════════════════════════════════════════════════
    const dbQueryDuration = new Histogram({
        name: `${prefix}${METRIC_NAMES.DB_QUERY_DURATION}`,
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table'],
        buckets: HISTOGRAM_BUCKETS.DB_DURATION,
        registers: [registry],
    });
    const dbConnectionsActive = new Gauge({
        name: `${prefix}${METRIC_NAMES.DB_CONNECTIONS_ACTIVE}`,
        help: 'Number of active database connections',
        registers: [registry],
    });
    const dbConnectionsIdle = new Gauge({
        name: `${prefix}${METRIC_NAMES.DB_CONNECTIONS_IDLE}`,
        help: 'Number of idle database connections',
        registers: [registry],
    });
    const dbConnectionsWaiting = new Gauge({
        name: `${prefix}${METRIC_NAMES.DB_CONNECTIONS_WAITING}`,
        help: 'Number of waiting database connection requests',
        registers: [registry],
    });
    const database = {
        queryDuration: dbQueryDuration,
        connectionsActive: dbConnectionsActive,
        connectionsIdle: dbConnectionsIdle,
        connectionsWaiting: dbConnectionsWaiting,
    };
    // ════════════════════════════════════════════════════════════════════════════
    // REGISTRY INTERFACE
    // ════════════════════════════════════════════════════════════════════════════
    return {
        registry,
        serviceName,
        http,
        ai,
        sessions,
        focus,
        recommendations,
        auth,
        events,
        database,
        async getMetricsText() {
            return registry.metrics();
        },
        getContentType() {
            return registry.contentType;
        },
        reset() {
            registry.resetMetrics();
        },
    };
}
//# sourceMappingURL=registry.js.map