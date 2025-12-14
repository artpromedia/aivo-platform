/**
 * Structured JSON Logger with Loki Integration
 *
 * Provides a Pino-based logger with consistent field names
 * and optional Loki transport for centralized log aggregation.
 */

import pino from 'pino';
import type { Logger, LoggerOptions, DestinationStream } from 'pino';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LoggerConfig {
  serviceName: string;
  environment?: string;
  level?: string;
  prettyPrint?: boolean;

  // Loki configuration
  loki?: {
    host: string; // e.g., http://localhost:3100
    labels?: Record<string, string>;
    batching?: boolean;
    interval?: number; // batch interval in seconds
  };
}

export interface AivoLogger extends Logger {
  /**
   * Create a child logger with request context
   */
  withContext(ctx: LogContext): AivoLogger;

  /**
   * Log an AI call event
   */
  aiCall(data: AiCallLogData): void;

  /**
   * Log a safety event
   */
  safetyEvent(data: SafetyLogData): void;

  /**
   * Log a session event
   */
  sessionEvent(data: SessionLogData): void;

  /**
   * Log an error with structured context
   */
  errorWithContext(error: Error, message: string, context?: Record<string, unknown>): void;
}

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  learnerId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
}

export interface AiCallLogData {
  event: 'ai_call';
  agentType: string;
  provider: string;
  model: string;
  tokensInput?: number;
  tokensOutput?: number;
  durationMs: number;
  costUsd?: number;
  success: boolean;
  errorType?: string;
  safetyStatus?: string;
  tenantId?: string;
}

export interface SafetyLogData {
  event: 'safety_block' | 'safety_warning' | 'pii_detected' | 'content_filtered';
  reason: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  agentType?: string;
  tenantId?: string;
  incidentId?: string;
}

export interface SessionLogData {
  event: 'session_start' | 'session_end' | 'session_abandoned';
  sessionId: string;
  sessionType?: string;
  durationSeconds?: number;
  itemsCompleted?: number;
  focusScore?: number;
  tenantId?: string;
  learnerId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

export function createLogger(config: LoggerConfig): AivoLogger {
  const {
    serviceName,
    environment = 'development',
    level = environment === 'production' ? 'info' : 'debug',
    prettyPrint = environment !== 'production',
  } = config;

  // Base logger options
  const loggerOptions: LoggerOptions = {
    level,
    base: {
      service: serviceName,
      env: environment,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings: Record<string, unknown>) => ({
        service: (bindings.service as string) ?? serviceName,
        env: (bindings.env as string) ?? environment,
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
  let transport: DestinationStream | undefined;

  if (prettyPrint) {
    transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });
  } else if (config.loki) {
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
  const logger = baseLogger as AivoLogger;

  logger.withContext = function (ctx: LogContext): AivoLogger {
    return this.child(ctx) as AivoLogger;
  };

  logger.aiCall = function (data: AiCallLogData): void {
    this.info(
      {
        event: data.event,
        agentType: data.agentType,
        provider: data.provider,
        model: data.model,
        tokensInput: data.tokensInput,
        tokensOutput: data.tokensOutput,
        tokensTotal:
          data.tokensInput !== undefined && data.tokensOutput !== undefined
            ? data.tokensInput + data.tokensOutput
            : undefined,
        durationMs: data.durationMs,
        costUsd: data.costUsd,
        success: data.success,
        errorType: data.errorType,
        safetyStatus: data.safetyStatus,
        tenantId: data.tenantId,
      },
      `AI call: ${data.agentType} via ${data.provider}/${data.model} - ${data.success ? 'success' : 'failed'}`
    );
  };

  logger.safetyEvent = function (data: SafetyLogData): void {
    const logMethod =
      data.severity === 'CRITICAL' || data.severity === 'HIGH' ? this.warn : this.info;
    logMethod.call(
      this,
      {
        event: data.event,
        reason: data.reason,
        category: data.category,
        severity: data.severity,
        agentType: data.agentType,
        tenantId: data.tenantId,
        incidentId: data.incidentId,
      },
      `Safety event: ${data.event} - ${data.reason}`
    );
  };

  logger.sessionEvent = function (data: SessionLogData): void {
    this.info(
      {
        event: data.event,
        sessionId: data.sessionId,
        sessionType: data.sessionType,
        durationSeconds: data.durationSeconds,
        itemsCompleted: data.itemsCompleted,
        focusScore: data.focusScore,
        tenantId: data.tenantId,
        learnerId: data.learnerId,
      },
      `Session: ${data.event} - ${data.sessionId}`
    );
  };

  logger.errorWithContext = function (
    error: Error,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.error(
      {
        err: {
          type: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      },
      message
    );
  };

  return logger;
}

/**
 * Create a request-scoped logger with context from headers
 */
export function createRequestLogger(
  baseLogger: AivoLogger,
  headers: Record<string, string | string[] | undefined>,
  tenantId?: string,
  userId?: string
): AivoLogger {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name.toLowerCase()];
    return typeof value === 'string' ? value : undefined;
  };

  const context: LogContext = {};
  const requestId = getHeader('x-request-id');
  const correlationId = getHeader('x-correlation-id');
  const traceId = getHeader('traceparent')?.split('-')[1];

  if (requestId) context.requestId = requestId;
  if (correlationId) context.correlationId = correlationId;
  if (traceId) context.traceId = traceId;
  if (tenantId) context.tenantId = tenantId;
  if (userId) context.userId = userId;

  return baseLogger.withContext(context);
}
