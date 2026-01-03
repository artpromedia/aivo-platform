// =============================================================================
// @aivo/events - Base Event Types
// =============================================================================
//
// Core event interface and common types used across all AIVO events.
// All events must extend BaseEvent and include tenant isolation.
import { z } from 'zod';
// -----------------------------------------------------------------------------
// Event Source Schema
// -----------------------------------------------------------------------------
/**
 * Identifies the service that emitted the event.
 */
export const EventSourceSchema = z.object({
    /** Service name (e.g., "session-svc", "focus-svc") */
    service: z.string().min(1),
    /** Service version (semver) */
    version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/),
    /** Optional instance ID for distributed deployments */
    instanceId: z.string().optional(),
});
// -----------------------------------------------------------------------------
// Base Event Schema
// -----------------------------------------------------------------------------
/**
 * Base schema for all AIVO events.
 * Every event must include these fields for tracing and tenant isolation.
 */
export const BaseEventSchema = z.object({
    /** Unique event ID (UUIDv4) */
    eventId: z.string().uuid(),
    /** Tenant ID for multi-tenant isolation */
    tenantId: z.string().uuid(),
    /** Event type (e.g., "learning.session.started") */
    eventType: z.string().min(1).regex(/^[\w]+\.[\w]+\.?[\w]*$/),
    /** Schema version for evolution (semver) */
    eventVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** ISO 8601 timestamp when event occurred */
    timestamp: z.string().datetime({ offset: true }),
    /** Source service information */
    source: EventSourceSchema,
    /** Correlation ID for request tracing (optional) */
    correlationId: z.string().uuid().optional(),
    /** Causation ID linking to triggering event (optional) */
    causationId: z.string().uuid().optional(),
    /** Optional metadata for extensibility */
    metadata: z.record(z.unknown()).optional(),
});
// -----------------------------------------------------------------------------
// Event Envelope (for wire format)
// -----------------------------------------------------------------------------
/**
 * Envelope schema wrapping the event with headers for NATS.
 */
export const EventEnvelopeSchema = z.object({
    /** The actual event data */
    event: BaseEventSchema.passthrough(),
    /** NATS message headers */
    headers: z.object({
        /** Subject the event was published to */
        subject: z.string(),
        /** Timestamp when message was received by NATS */
        receivedAt: z.string().datetime({ offset: true }).optional(),
        /** Delivery attempt count */
        deliveryCount: z.number().int().min(1).optional(),
    }).optional(),
});
// -----------------------------------------------------------------------------
// Common Types
// -----------------------------------------------------------------------------
/** Grade band type used across learning events */
export const GradeBandSchema = z.enum([
    'K',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
]);
/** Session origin indicating where the session started */
export const SessionOriginSchema = z.enum([
    'MOBILE_LEARNER',
    'MOBILE_PARENT',
    'MOBILE_TEACHER',
    'WEB_LEARNER',
    'WEB_TEACHER',
    'WEB_AUTHOR',
    'WEB_ADMIN',
    'API',
]);
/** Session type categorizing the learning context */
export const SessionTypeSchema = z.enum([
    'LEARNING',
    'HOMEWORK',
    'ASSESSMENT',
    'BASELINE',
    'PRACTICE',
    'REVIEW',
]);
/**
 * Validates an event against a schema and returns typed result.
 */
export function validateEvent(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
//# sourceMappingURL=base.js.map