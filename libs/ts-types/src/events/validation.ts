/**
 * Event Validation Utilities
 *
 * Helper functions for validating, creating, and type-guarding events.
 * All utilities ensure tenantId is present for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/validation
 */

import { z, ZodError } from 'zod';
import { BaseEventSchema, type BaseEvent } from './base.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

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
export function validateEvent<T extends z.ZodSchema>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

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
export function safeValidateEvent<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates that data conforms to the base event schema.
 *
 * @param data - The data to validate
 * @returns The validated base event
 * @throws ZodError if validation fails
 */
export function validateBaseEvent(data: unknown): BaseEvent {
  return BaseEventSchema.parse(data);
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT CREATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Event source for automatic population
 */
interface EventSourceConfig {
  service: string;
  version: string;
}

/**
 * Gets the default event source from environment variables.
 */
function getDefaultSource(): EventSourceConfig {
  return {
    service: process.env.SERVICE_NAME || 'unknown-service',
    version: process.env.APP_VERSION || '1.0.0',
  };
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
export function createEvent<T extends z.ZodSchema>(
  schema: T,
  payload: Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>
): z.infer<T> {
  const event = {
    ...payload,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventVersion: '1.0',
    source: getDefaultSource(),
  };

  return schema.parse(event);
}

/**
 * Creates an event with a custom source configuration.
 *
 * @param schema - The event schema to validate against
 * @param payload - Event data (without auto-generated fields)
 * @param source - Custom source configuration
 * @returns The complete, validated event
 */
export function createEventWithSource<T extends z.ZodSchema>(
  schema: T,
  payload: Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>,
  source: EventSourceConfig
): z.infer<T> {
  const event = {
    ...payload,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventVersion: '1.0',
    source,
  };

  return schema.parse(event);
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ══════════════════════════════════════════════════════════════════════════════

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
export function isTenantScopedEvent(event: unknown): event is { tenantId: string } {
  return (
    typeof event === 'object' &&
    event !== null &&
    'tenantId' in event &&
    typeof (event as Record<string, unknown>).tenantId === 'string' &&
    (event as Record<string, unknown>).tenantId !== ''
  );
}

/**
 * Type guard to check if an event conforms to the base event schema.
 *
 * @param event - Any value to check
 * @returns True if event has all required base event properties
 */
export function isBaseEvent(event: unknown): event is BaseEvent {
  const result = BaseEventSchema.safeParse(event);
  return result.success;
}

/**
 * Type guard to check if an event has correlation context.
 *
 * @param event - Any value to check
 * @returns True if event has correlationId
 */
export function hasCorrelationContext(
  event: unknown
): event is { correlationId: string; causationId?: string } {
  return (
    typeof event === 'object' &&
    event !== null &&
    'correlationId' in event &&
    typeof (event as Record<string, unknown>).correlationId === 'string'
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSERTION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when an event is missing tenantId.
 */
export class MissingTenantIdError extends Error {
  constructor(eventType?: string) {
    const message = eventType
      ? `Event of type '${eventType}' must include tenantId for multi-tenant isolation`
      : 'Event must include tenantId for multi-tenant isolation';
    super(message);
    this.name = 'MissingTenantIdError';
  }
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
export function requireTenantId(event: unknown): asserts event is { tenantId: string } {
  if (!isTenantScopedEvent(event)) {
    const eventType =
      typeof event === 'object' && event !== null && 'eventType' in event
        ? String((event as Record<string, unknown>).eventType)
        : undefined;
    throw new MissingTenantIdError(eventType);
  }
}

/**
 * Asserts that an event conforms to the base event schema.
 *
 * @param event - Any value to check
 * @throws ZodError if event doesn't match BaseEventSchema
 */
export function requireBaseEvent(event: unknown): asserts event is BaseEvent {
  BaseEventSchema.parse(event);
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts the tenant ID from an event, returning undefined if not present.
 *
 * @param event - Any value to extract from
 * @returns The tenantId string or undefined
 */
export function extractTenantId(event: unknown): string | undefined {
  if (isTenantScopedEvent(event)) {
    return event.tenantId;
  }
  return undefined;
}

/**
 * Adds correlation context to an event for distributed tracing.
 *
 * @param event - The event to add context to
 * @param correlationId - The correlation ID to add
 * @param causationId - Optional causation ID (the event that caused this one)
 * @returns The event with correlation context added
 */
export function withCorrelationContext<T extends object>(
  event: T,
  correlationId: string,
  causationId?: string
): T & { correlationId: string; causationId?: string } {
  return {
    ...event,
    correlationId,
    ...(causationId && { causationId }),
  };
}

/**
 * Adds causation context to an event, linking it to a parent event.
 *
 * @param event - The event to add context to
 * @param parentEvent - The event that caused this one
 * @returns The event with both correlation and causation IDs from parent
 */
export function withCausation<T extends object>(
  event: T,
  parentEvent: { eventId: string; correlationId?: string }
): T & { correlationId: string; causationId: string } {
  return {
    ...event,
    correlationId: parentEvent.correlationId || parentEvent.eventId,
    causationId: parentEvent.eventId,
  };
}
