/**
 * Session service integration types.
 */

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus-related event types.
 * Must match session-svc SessionEventType enum.
 */
export type FocusEventType =
  | 'FOCUS_LOSS_DETECTED'
  | 'FOCUS_BREAK_STARTED'
  | 'FOCUS_BREAK_ENDED'
  | 'FOCUS_INTERVENTION_SHOWN'
  | 'FOCUS_INTERVENTION_COMPLETED';

/**
 * Request to emit a session event.
 */
export interface EmitEventRequest {
  eventType: FocusEventType;
  eventTime?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from event emission.
 */
export interface EmitEventResponse {
  id: string;
  sessionId: string;
  eventType: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Session event for storing focus pings.
 * We use FOCUS_PING as a pseudo-event type stored in metadata.
 */
export interface FocusPingEventMetadata {
  type: 'FOCUS_PING';
  activityId: string;
  idleMs: number;
  appInBackground: boolean;
  selfReportedMood?: string;
  rapidExit?: boolean;
  clientTimestamp: string;
}
