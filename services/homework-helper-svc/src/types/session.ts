/**
 * Session service integration types.
 * Used to create HOMEWORK sessions and emit events.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SESSION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SessionType = 'HOMEWORK';
export type SessionOrigin = 'HOMEWORK_HELPER' | 'MOBILE_LEARNER' | 'WEB_LEARNER';

/**
 * Request to create a new homework session.
 */
export interface CreateSessionRequest {
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  metadataJson?: Record<string, unknown>;
}

/**
 * Response from session creation.
 */
export interface CreateSessionResponse {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  startedAt: string;
  metadataJson?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Event types for homework workflow.
 * Must match session-svc SessionEventType enum.
 */
export type HomeworkEventType =
  | 'HOMEWORK_CAPTURED'
  | 'HOMEWORK_PARSED'
  | 'HOMEWORK_STEP_STARTED'
  | 'HOMEWORK_STEP_COMPLETED'
  | 'HOMEWORK_HINT_REQUESTED'
  | 'HOMEWORK_SOLUTION_SHOWN'
  | 'SESSION_ENDED';

/**
 * Request to emit a session event.
 */
export interface EmitEventRequest {
  sessionId: string;
  eventType: HomeworkEventType;
  /** JSON payload with event-specific data */
  payloadJson?: Record<string, unknown>;
}

/**
 * Response from event emission.
 */
export interface EmitEventResponse {
  id: string;
  sessionId: string;
  eventType: string;
  occurredAt: string;
  payloadJson?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION END
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Request to end a session.
 */
export interface EndSessionRequest {
  sessionId: string;
  /** Summary of what was accomplished */
  summaryJson?: Record<string, unknown>;
}

/**
 * Response from session end.
 */
export interface EndSessionResponse {
  id: string;
  endedAt: string;
  durationMs: number;
}
