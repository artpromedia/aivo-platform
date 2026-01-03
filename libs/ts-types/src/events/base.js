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
// ══════════════════════════════════════════════════════════════════════════════
// BASE EVENT SCHEMA
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Source service metadata for event origin tracking
 */
export const EventSourceSchema = z.object({
    /** Service name that emitted the event */
    service: z.string().min(1),
    /** Service version for debugging and compatibility */
    version: z.string().min(1),
});
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
export const BaseEventSchema = z.object({
    /** Unique event identifier for deduplication */
    eventId: z.string().uuid(),
    /** Tenant ID for multi-tenant isolation (REQUIRED) */
    tenantId: z.string().cuid(),
    /** Event type identifier (e.g., 'learning.activity.completed') */
    eventType: z.string().min(1),
    /** Schema version for backward compatibility */
    eventVersion: z.string().default('1.0'),
    /** ISO 8601 timestamp when event occurred */
    timestamp: z.string().datetime(),
    /** Source service that emitted this event */
    source: EventSourceSchema,
    /** Correlation ID for tracing related events across services */
    correlationId: z.string().uuid().optional(),
    /** Causation ID linking to the event that caused this one */
    causationId: z.string().uuid().optional(),
});
// ══════════════════════════════════════════════════════════════════════════════
// EVENT SCHEMA FACTORY
// ══════════════════════════════════════════════════════════════════════════════
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
export function createEventSchema(eventType, payloadSchema) {
    return BaseEventSchema.extend({
        eventType: z.literal(eventType),
        payload: payloadSchema,
    });
}
//# sourceMappingURL=base.js.map