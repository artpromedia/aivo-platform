/**
 * Base Event Schema
 *
 * All events in the AIVO platform MUST extend this base schema to ensure:
 * - Tenant isolation via required tenantId
 * - Consistent metadata for tracing and debugging
 * - Version control for schema evolution
 *
 * @module @aivo/ts-types/events/base
 */
import { z } from 'zod';
/**
 * Source service metadata for event origin tracking
 */
export declare const EventSourceSchema: z.ZodObject<{
    /** Service name that emitted the event */
    service: z.ZodString;
    /** Service version for debugging and compatibility */
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version?: string;
    service?: string;
}, {
    version?: string;
    service?: string;
}>;
export type EventSource = z.infer<typeof EventSourceSchema>;
/**
 * Base schema that ALL events must extend.
 *
 * This ensures every event in the system has:
 * - Unique identifier for deduplication
 * - Tenant ID for multi-tenant isolation (REQUIRED)
 * - Type and version for schema evolution
 * - Timestamp for ordering and analytics
 * - Source for debugging and tracing
 * - Optional correlation/causation IDs for distributed tracing
 */
export declare const BaseEventSchema: z.ZodObject<{
    /** Unique event identifier for deduplication */
    eventId: z.ZodString;
    /** Tenant ID for multi-tenant isolation (REQUIRED) */
    tenantId: z.ZodString;
    /** Event type identifier (e.g., 'learning.activity.completed') */
    eventType: z.ZodString;
    /** Schema version for backward compatibility */
    eventVersion: z.ZodDefault<z.ZodString>;
    /** ISO 8601 timestamp when event occurred */
    timestamp: z.ZodString;
    /** Source service that emitted this event */
    source: z.ZodObject<{
        /** Service name that emitted the event */
        service: z.ZodString;
        /** Service version for debugging and compatibility */
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    /** Correlation ID for tracing related events across services */
    correlationId: z.ZodOptional<z.ZodString>;
    /** Causation ID linking to the event that caused this one */
    causationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
}, {
    tenantId?: string;
    source?: {
        version?: string;
        service?: string;
    };
    eventId?: string;
    eventType?: string;
    eventVersion?: string;
    timestamp?: string;
    correlationId?: string;
    causationId?: string;
}>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
/**
 * Factory for creating typed event schemas that extend the base.
 *
 * This ensures all domain events automatically include:
 * - All base event fields (eventId, tenantId, timestamp, etc.)
 * - A literal event type for type-safe discrimination
 * - A typed payload specific to the event
 *
 * @param eventType - The literal event type string (e.g., 'learning.activity.completed')
 * @param payloadSchema - Zod schema for the event-specific payload
 * @returns A complete event schema extending BaseEventSchema
 *
 * @example
 * ```typescript
 * const MyEventSchema = createEventSchema(
 *   'my.event.type',
 *   z.object({ userId: z.string().cuid() })
 * );
 * type MyEvent = z.infer<typeof MyEventSchema>;
 * ```
 */
export declare function createEventSchema<T extends z.ZodRawShape>(eventType: string, payloadSchema: z.ZodObject<T>): z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        /** Service name that emitted the event */
        service: z.ZodString;
        /** Service version for debugging and compatibility */
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<T, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<T> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        /** Service name that emitted the event */
        service: z.ZodString;
        /** Service version for debugging and compatibility */
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<T, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_4 ? { [k in keyof T_4]: T_4[k]; } : never, z.baseObjectInputType<T> extends infer T_5 ? { [k_1 in keyof T_5]: T_5[k_1]; } : never>;
}>, any> extends infer T_3 ? { [k_2 in keyof T_3]: T_3[k_2]; } : never, z.baseObjectInputType<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        /** Service name that emitted the event */
        service: z.ZodString;
        /** Service version for debugging and compatibility */
        version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
    }, {
        version?: string;
        service?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    payload: z.ZodObject<T, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_7 ? { [k in keyof T_7]: T_7[k]; } : never, z.baseObjectInputType<T> extends infer T_8 ? { [k_1 in keyof T_8]: T_8[k_1]; } : never>;
}> extends infer T_6 ? { [k_3 in keyof T_6]: T_6[k_3]; } : never>;
/**
 * Type helper for extracting the inferred type from a created event schema
 */
export type InferEventType<T extends ReturnType<typeof createEventSchema>> = z.infer<T>;
//# sourceMappingURL=base.d.ts.map