import { z } from 'zod';
/**
 * Identifies the service that emitted the event.
 */
export declare const EventSourceSchema: z.ZodObject<{
    /** Service name (e.g., "session-svc", "focus-svc") */
    service: z.ZodString;
    /** Service version (semver) */
    version: z.ZodString;
    /** Optional instance ID for distributed deployments */
    instanceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    version?: string;
    service?: string;
    instanceId?: string;
}, {
    version?: string;
    service?: string;
    instanceId?: string;
}>;
export type EventSource = z.infer<typeof EventSourceSchema>;
/**
 * Base schema for all AIVO events.
 * Every event must include these fields for tracing and tenant isolation.
 */
export declare const BaseEventSchema: z.ZodObject<{
    /** Unique event ID (UUIDv4) */
    eventId: z.ZodString;
    /** Tenant ID for multi-tenant isolation */
    tenantId: z.ZodString;
    /** Event type (e.g., "learning.session.started") */
    eventType: z.ZodString;
    /** Schema version for evolution (semver) */
    eventVersion: z.ZodString;
    /** ISO 8601 timestamp when event occurred */
    timestamp: z.ZodString;
    /** Source service information */
    source: z.ZodObject<{
        /** Service name (e.g., "session-svc", "focus-svc") */
        service: z.ZodString;
        /** Service version (semver) */
        version: z.ZodString;
        /** Optional instance ID for distributed deployments */
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    /** Correlation ID for request tracing (optional) */
    correlationId: z.ZodOptional<z.ZodString>;
    /** Causation ID linking to triggering event (optional) */
    causationId: z.ZodOptional<z.ZodString>;
    /** Optional metadata for extensibility */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    tenantId?: string;
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
/**
 * Envelope schema wrapping the event with headers for NATS.
 */
export declare const EventEnvelopeSchema: z.ZodObject<{
    /** The actual event data */
    event: z.ZodObject<{
        /** Unique event ID (UUIDv4) */
        eventId: z.ZodString;
        /** Tenant ID for multi-tenant isolation */
        tenantId: z.ZodString;
        /** Event type (e.g., "learning.session.started") */
        eventType: z.ZodString;
        /** Schema version for evolution (semver) */
        eventVersion: z.ZodString;
        /** ISO 8601 timestamp when event occurred */
        timestamp: z.ZodString;
        /** Source service information */
        source: z.ZodObject<{
            /** Service name (e.g., "session-svc", "focus-svc") */
            service: z.ZodString;
            /** Service version (semver) */
            version: z.ZodString;
            /** Optional instance ID for distributed deployments */
            instanceId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            version?: string;
            service?: string;
            instanceId?: string;
        }, {
            version?: string;
            service?: string;
            instanceId?: string;
        }>;
        /** Correlation ID for request tracing (optional) */
        correlationId: z.ZodOptional<z.ZodString>;
        /** Causation ID linking to triggering event (optional) */
        causationId: z.ZodOptional<z.ZodString>;
        /** Optional metadata for extensibility */
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** Unique event ID (UUIDv4) */
        eventId: z.ZodString;
        /** Tenant ID for multi-tenant isolation */
        tenantId: z.ZodString;
        /** Event type (e.g., "learning.session.started") */
        eventType: z.ZodString;
        /** Schema version for evolution (semver) */
        eventVersion: z.ZodString;
        /** ISO 8601 timestamp when event occurred */
        timestamp: z.ZodString;
        /** Source service information */
        source: z.ZodObject<{
            /** Service name (e.g., "session-svc", "focus-svc") */
            service: z.ZodString;
            /** Service version (semver) */
            version: z.ZodString;
            /** Optional instance ID for distributed deployments */
            instanceId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            version?: string;
            service?: string;
            instanceId?: string;
        }, {
            version?: string;
            service?: string;
            instanceId?: string;
        }>;
        /** Correlation ID for request tracing (optional) */
        correlationId: z.ZodOptional<z.ZodString>;
        /** Causation ID linking to triggering event (optional) */
        causationId: z.ZodOptional<z.ZodString>;
        /** Optional metadata for extensibility */
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** Unique event ID (UUIDv4) */
        eventId: z.ZodString;
        /** Tenant ID for multi-tenant isolation */
        tenantId: z.ZodString;
        /** Event type (e.g., "learning.session.started") */
        eventType: z.ZodString;
        /** Schema version for evolution (semver) */
        eventVersion: z.ZodString;
        /** ISO 8601 timestamp when event occurred */
        timestamp: z.ZodString;
        /** Source service information */
        source: z.ZodObject<{
            /** Service name (e.g., "session-svc", "focus-svc") */
            service: z.ZodString;
            /** Service version (semver) */
            version: z.ZodString;
            /** Optional instance ID for distributed deployments */
            instanceId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            version?: string;
            service?: string;
            instanceId?: string;
        }, {
            version?: string;
            service?: string;
            instanceId?: string;
        }>;
        /** Correlation ID for request tracing (optional) */
        correlationId: z.ZodOptional<z.ZodString>;
        /** Causation ID linking to triggering event (optional) */
        causationId: z.ZodOptional<z.ZodString>;
        /** Optional metadata for extensibility */
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>;
    /** NATS message headers */
    headers: z.ZodOptional<z.ZodObject<{
        /** Subject the event was published to */
        subject: z.ZodString;
        /** Timestamp when message was received by NATS */
        receivedAt: z.ZodOptional<z.ZodString>;
        /** Delivery attempt count */
        deliveryCount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        subject?: string;
        receivedAt?: string;
        deliveryCount?: number;
    }, {
        subject?: string;
        receivedAt?: string;
        deliveryCount?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    headers?: {
        subject?: string;
        receivedAt?: string;
        deliveryCount?: number;
    };
    event?: {
        tenantId?: string;
        eventId?: string;
        eventType?: string;
        eventVersion?: string;
        timestamp?: string;
        source?: {
            version?: string;
            service?: string;
            instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
    } & {
        [k: string]: unknown;
    };
}, {
    headers?: {
        subject?: string;
        receivedAt?: string;
        deliveryCount?: number;
    };
    event?: {
        tenantId?: string;
        eventId?: string;
        eventType?: string;
        eventVersion?: string;
        timestamp?: string;
        source?: {
            version?: string;
            service?: string;
            instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
    } & {
        [k: string]: unknown;
    };
}>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
/** Grade band type used across learning events */
export declare const GradeBandSchema: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>;
export type GradeBand = z.infer<typeof GradeBandSchema>;
/** Session origin indicating where the session started */
export declare const SessionOriginSchema: z.ZodEnum<["MOBILE_LEARNER", "MOBILE_PARENT", "MOBILE_TEACHER", "WEB_LEARNER", "WEB_TEACHER", "WEB_AUTHOR", "WEB_ADMIN", "API"]>;
export type SessionOrigin = z.infer<typeof SessionOriginSchema>;
/** Session type categorizing the learning context */
export declare const SessionTypeSchema: z.ZodEnum<["LEARNING", "HOMEWORK", "ASSESSMENT", "BASELINE", "PRACTICE", "REVIEW"]>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
/**
 * Result of event validation.
 */
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
}
/**
 * Validates an event against a schema and returns typed result.
 */
export declare function validateEvent<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T>;
//# sourceMappingURL=base.d.ts.map