/**
 * Event Validation Utilities
 *
 * Helper functions for validating, creating, and type-guarding events.
 * All utilities ensure tenantId is present for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/validation
 */
import { z, ZodError } from 'zod';
import { type BaseEvent } from './base.js';
/**
 * Validates any event against a specific schema.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated and typed event
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * const event = validateEvent(ActivityCompletedEventSchema, rawData);
 * // event is now typed as ActivityCompletedEvent
 * ```
 */
export declare function validateEvent<T extends z.ZodSchema>(schema: T, data: unknown): z.infer<T>;
/**
 * Safely validates an event, returning a result object instead of throwing.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag and either data or error
 *
 * @example
 * ```typescript
 * const result = safeValidateEvent(ActivityCompletedEventSchema, rawData);
 * if (result.success) {
 *   console.log(result.data.payload.learnerId);
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export declare function safeValidateEvent<T extends z.ZodSchema>(schema: T, data: unknown): {
    success: true;
    data: z.infer<T>;
} | {
    success: false;
    error: ZodError;
};
/**
 * Validates that data conforms to the base event schema.
 *
 * @param data - The data to validate
 * @returns The validated base event
 * @throws ZodError if validation fails
 */
export declare function validateBaseEvent(data: unknown): BaseEvent;
/**
 * Event source for automatic population
 */
interface EventSourceConfig {
    service: string;
    version: string;
}
/**
 * Creates an event with automatic metadata generation.
 *
 * Automatically sets:
 * - eventId: Generated UUID
 * - timestamp: Current ISO timestamp
 * - eventVersion: Default '1.0'
 * - source: From environment or defaults
 *
 * @param schema - The event schema to validate against
 * @param payload - Event data (without auto-generated fields)
 * @returns The complete, validated event
 *
 * @example
 * ```typescript
 * const event = createEvent(ActivityCompletedEventSchema, {
 *   tenantId: 'clg123...',
 *   eventType: 'learning.activity.completed',
 *   payload: {
 *     learnerId: 'clg456...',
 *     sessionId: 'clg789...',
 *     // ... other payload fields
 *   }
 * });
 * // event now has eventId, timestamp, source auto-populated
 * ```
 */
export declare function createEvent<T extends z.ZodSchema>(schema: T, payload: Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>): z.infer<T>;
/**
 * Creates an event with a custom source configuration.
 *
 * @param schema - The event schema to validate against
 * @param payload - Event data (without auto-generated fields)
 * @param source - Custom source configuration
 * @returns The complete, validated event
 */
export declare function createEventWithSource<T extends z.ZodSchema>(schema: T, payload: Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>, source: EventSourceConfig): z.infer<T>;
/**
 * Type guard to check if an event has a valid tenantId.
 *
 * @param event - Any value to check
 * @returns True if event has a string tenantId property
 *
 * @example
 * ```typescript
 * if (isTenantScopedEvent(event)) {
 *   console.log(`Processing event for tenant: ${event.tenantId}`);
 * }
 * ```
 */
export declare function isTenantScopedEvent(event: unknown): event is {
    tenantId: string;
};
/**
 * Type guard to check if an event conforms to the base event schema.
 *
 * @param event - Any value to check
 * @returns True if event has all required base event properties
 */
export declare function isBaseEvent(event: unknown): event is BaseEvent;
/**
 * Type guard to check if an event has correlation context.
 *
 * @param event - Any value to check
 * @returns True if event has correlationId
 */
export declare function hasCorrelationContext(event: unknown): event is {
    correlationId: string;
    causationId?: string;
};
/**
 * Error thrown when an event is missing tenantId.
 */
export declare class MissingTenantIdError extends Error {
    constructor(eventType?: string);
}
/**
 * Asserts that an event has a tenantId, throwing if not.
 *
 * Use this at service boundaries to ensure all events are tenant-scoped
 * before processing.
 *
 * @param event - Any value to check
 * @throws MissingTenantIdError if event lacks tenantId
 *
 * @example
 * ```typescript
 * function processEvent(event: unknown) {
 *   requireTenantId(event);
 *   // event is now narrowed to { tenantId: string }
 *   console.log(`Processing for tenant: ${event.tenantId}`);
 * }
 * ```
 */
export declare function requireTenantId(event: unknown): asserts event is {
    tenantId: string;
};
/**
 * Asserts that an event conforms to the base event schema.
 *
 * @param event - Any value to check
 * @throws ZodError if event doesn't match BaseEventSchema
 */
export declare function requireBaseEvent(event: unknown): asserts event is BaseEvent;
/**
 * Extracts the tenant ID from an event, returning undefined if not present.
 *
 * @param event - Any value to extract from
 * @returns The tenantId string or undefined
 */
export declare function extractTenantId(event: unknown): string | undefined;
/**
 * Adds correlation context to an event for distributed tracing.
 *
 * @param event - The event to add context to
 * @param correlationId - The correlation ID to add
 * @param causationId - Optional causation ID (the event that caused this one)
 * @returns The event with correlation context added
 */
export declare function withCorrelationContext<T extends object>(event: T, correlationId: string, causationId?: string): T & {
    correlationId: string;
    causationId?: string;
};
/**
 * Adds causation context to an event, linking it to a parent event.
 *
 * @param event - The event to add context to
 * @param parentEvent - The event that caused this one
 * @returns The event with both correlation and causation IDs from parent
 */
export declare function withCausation<T extends object>(event: T, parentEvent: {
    eventId: string;
    correlationId?: string;
}): T & {
    correlationId: string;
    causationId: string;
};
export {};
//# sourceMappingURL=validation.d.ts.map