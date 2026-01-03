/**
 * Structured JSON Logger with Loki Integration
 *
 * Provides a Pino-based logger with consistent field names
 * and optional Loki transport for centralized log aggregation.
 */
import pino from 'pino';
// ══════════════════════════════════════════════════════════════════════════════
// LOGGER FACTORY
// ══════════════════════════════════════════════════════════════════════════════
export function createLogger(config) {
    const { serviceName, environment = 'development', level = environment === 'production' ? 'info' : 'debug', prettyPrint = environment !== 'production', } = config;
    // Base logger options
    const loggerOptions = {
        level,
        base: {
            service: serviceName,
            env: environment,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => ({ level: label }),
            bindings: (bindings) => ({
                service: bindings.service ?? serviceName,
                env: bindings.env ?? environment,
                pid: bindings.pid,
                hostname: bindings.hostname,
            }),
        },
        // Redact sensitive fields
        redact: {
            paths: [
                'password',
                'token',
                'apiKey',
                'secret',
                'authorization',
                'cookie',
                '*.password',
                '*.token',
                '*.apiKey',
                '*.secret',
                'headers.authorization',
                'headers.cookie',
            ],
            censor: '[REDACTED]',
        },
    };
    // Configure transport
    let transport;
    if (prettyPrint) {
        transport = pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        });
    }
    else if (config.loki) {
        // Use Loki transport for production
        transport = pino.transport({
            target: 'pino-loki',
            options: {
                host: config.loki.host,
                labels: {
                    service: serviceName,
                    env: environment,
                    ...config.loki.labels,
                },
                batching: config.loki.batching ?? true,
                interval: config.loki.interval ?? 5,
            },
        });
    }
    const baseLogger = transport ? pino(loggerOptions, transport) : pino(loggerOptions);
    // Extend with Aivo-specific methods
    const logger = baseLogger;
    logger.withContext = function (ctx) {
        return this.child(ctx);
    };
    logger.aiCall = function (data) {
        this.info({
            event: data.event,
            agentType: data.agentType,
            provider: data.provider,
            model: data.model,
            tokensInput: data.tokensInput,
            tokensOutput: data.tokensOutput,
            tokensTotal: data.tokensInput !== undefined && data.tokensOutput !== undefined
                ? data.tokensInput + data.tokensOutput
                : undefined,
            durationMs: data.durationMs,
            costUsd: data.costUsd,
            success: data.success,
            errorType: data.errorType,
            safetyStatus: data.safetyStatus,
            tenantId: data.tenantId,
        }, `AI call: ${data.agentType} via ${data.provider}/${data.model} - ${data.success ? 'success' : 'failed'}`);
    };
    logger.safetyEvent = function (data) {
        const logMethod = data.severity === 'CRITICAL' || data.severity === 'HIGH' ? this.warn : this.info;
        logMethod.call(this, {
            event: data.event,
            reason: data.reason,
            category: data.category,
            severity: data.severity,
            agentType: data.agentType,
            tenantId: data.tenantId,
            incidentId: data.incidentId,
        }, `Safety event: ${data.event} - ${data.reason}`);
    };
    logger.sessionEvent = function (data) {
        this.info({
            event: data.event,
            sessionId: data.sessionId,
            sessionType: data.sessionType,
            durationSeconds: data.durationSeconds,
            itemsCompleted: data.itemsCompleted,
            focusScore: data.focusScore,
            tenantId: data.tenantId,
            learnerId: data.learnerId,
        }, `Session: ${data.event} - ${data.sessionId}`);
    };
    logger.errorWithContext = function (error, message, context) {
        this.error({
            err: {
                type: error.name,
                message: error.message,
                stack: error.stack,
            },
            ...context,
        }, message);
    };
    return logger;
}
/**
 * Create a request-scoped logger with context from headers
 */
export function createRequestLogger(baseLogger, headers, tenantId, userId) {
    const getHeader = (name) => {
        const value = headers[name.toLowerCase()];
        return typeof value === 'string' ? value : undefined;
    };
    const context = {};
    const requestId = getHeader('x-request-id');
    const correlationId = getHeader('x-correlation-id');
    const traceId = getHeader('traceparent')?.split('-')[1];
    if (requestId)
        context.requestId = requestId;
    if (correlationId)
        context.correlationId = correlationId;
    if (traceId)
        context.traceId = traceId;
    if (tenantId)
        context.tenantId = tenantId;
    if (userId)
        context.userId = userId;
    return baseLogger.withContext(context);
}
//# sourceMappingURL=logger.js.map