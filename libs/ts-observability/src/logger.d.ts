/**
 * Structured JSON Logger with Loki Integration
 *
 * Provides a Pino-based logger with consistent field names
 * and optional Loki transport for centralized log aggregation.
 */
import type { Logger } from 'pino';
export interface LoggerConfig {
    serviceName: string;
    environment?: string;
    level?: string;
    prettyPrint?: boolean;
    loki?: {
        host: string;
        labels?: Record<string, string>;
        batching?: boolean;
        interval?: number;
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
export declare function createLogger(config: LoggerConfig): AivoLogger;
/**
 * Create a request-scoped logger with context from headers
 */
export declare function createRequestLogger(baseLogger: AivoLogger, headers: Record<string, string | string[] | undefined>, tenantId?: string, userId?: string): AivoLogger;
//# sourceMappingURL=logger.d.ts.map