/**
 * Embedded Tools Service - Types
 *
 * Core TypeScript types for the Embed Framework.
 * Includes scopes, session models, and postMessage protocol.
 */

/* eslint-disable no-redeclare */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Tool session status
 */
export const ToolSessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type ToolSessionStatus = (typeof ToolSessionStatus)[keyof typeof ToolSessionStatus];

/**
 * Session event types - what tools can report back
 */
export const SessionEventType = {
  // Lifecycle
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',
  // Learning
  ACTIVITY_STARTED: 'ACTIVITY_STARTED',
  ACTIVITY_COMPLETED: 'ACTIVITY_COMPLETED',
  ACTIVITY_PROGRESS: 'ACTIVITY_PROGRESS',
  SCORE_RECORDED: 'SCORE_RECORDED',
  TIME_SPENT: 'TIME_SPENT',
  BADGE_EARNED: 'BADGE_EARNED',
  // Engagement
  INTERACTION: 'INTERACTION',
  HINT_REQUESTED: 'HINT_REQUESTED',
  HINT_VIEWED: 'HINT_VIEWED',
  // Errors
  TOOL_ERROR: 'TOOL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  // System
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  SCOPE_VIOLATION: 'SCOPE_VIOLATION',
} as const;
export type SessionEventType = (typeof SessionEventType)[keyof typeof SessionEventType];

/**
 * Tool scopes - COPPA/FERPA aware data access permissions
 */
export const ToolScope = {
  // Learner data (minimized)
  LEARNER_PROFILE_MIN: 'LEARNER_PROFILE_MIN',
  LEARNER_PROFILE_EXTENDED: 'LEARNER_PROFILE_EXTENDED',
  LEARNER_PSEUDONYM: 'LEARNER_PSEUDONYM',
  // Context
  CLASSROOM_CONTEXT: 'CLASSROOM_CONTEXT',
  ASSIGNMENT_CONTEXT: 'ASSIGNMENT_CONTEXT',
  // Events
  SESSION_EVENTS_WRITE: 'SESSION_EVENTS_WRITE',
  SESSION_EVENTS_READ: 'SESSION_EVENTS_READ',
  // Progress
  PROGRESS_READ: 'PROGRESS_READ',
  PROGRESS_WRITE: 'PROGRESS_WRITE',
  // Theme
  THEME_READ: 'THEME_READ',
  // Advanced (require elevated approval)
  LEARNER_NAME_FULL: 'LEARNER_NAME_FULL',
  LEARNER_GRADE_EXACT: 'LEARNER_GRADE_EXACT',
  TEACHER_CONTEXT: 'TEACHER_CONTEXT',
} as const;
export type ToolScope = (typeof ToolScope)[keyof typeof ToolScope];

/**
 * Actor types
 */
export const ActorType = {
  LEARNER: 'LEARNER',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

/**
 * Launch types (from marketplace-svc)
 */
export const EmbeddedToolLaunchType = {
  IFRAME_WEB: 'IFRAME_WEB',
  NATIVE_DEEPLINK: 'NATIVE_DEEPLINK',
  LTI_LIKE: 'LTI_LIKE',
} as const;
export type EmbeddedToolLaunchType =
  (typeof EmbeddedToolLaunchType)[keyof typeof EmbeddedToolLaunchType];

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH TOKEN TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * JWT claims for tool launch token
 */
export interface ToolLaunchTokenClaims {
  /** JWT ID - unique identifier for this token */
  jti: string;
  /** Issuer - always "aivo-embedded-tools" */
  iss: string;
  /** Audience - the tool's vendor slug or domain */
  aud: string;
  /** Subject - the tool session ID */
  sub: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Not before timestamp */
  nbf: number;

  // Aivo-specific claims (prefixed with aivo_)
  /** Tenant ID */
  aivo_tenant_id: string;
  /** Marketplace item ID */
  aivo_item_id: string;
  /** Item version ID */
  aivo_item_version_id: string;
  /** Installation ID */
  aivo_installation_id: string;
  /** Pseudonymous learner ID (not real ID) */
  aivo_learner_id?: string;
  /** Classroom ID (if in classroom context) */
  aivo_classroom_id?: string;
  /** Granted scopes */
  aivo_scopes: ToolScope[];
}

/**
 * Minimal learner context (passed based on scopes)
 */
export interface LearnerContext {
  /** Pseudonymous ID (hash-based) */
  pseudonymousId?: string;
  /** First name initial (e.g., "J.") - requires LEARNER_PROFILE_MIN */
  initials?: string;
  /** Grade band (e.g., "G3_5") - requires LEARNER_PROFILE_MIN */
  gradeBand?: string;
  /** Subject (e.g., "MATH") - requires LEARNER_PROFILE_MIN */
  subject?: string;
  /** Full first name - requires LEARNER_NAME_FULL */
  firstName?: string;
  /** Exact grade level - requires LEARNER_GRADE_EXACT */
  gradeLevel?: number;
}

/**
 * Classroom context (if CLASSROOM_CONTEXT scope granted)
 */
export interface ClassroomContext {
  /** Pseudonymous classroom ID */
  pseudonymousId: string;
  /** Classroom name */
  name?: string;
  /** Grade level */
  gradeLevel?: string;
}

/**
 * Launch payload sent to the tool
 */
export interface ToolLaunchPayload {
  /** Launch token (JWT) */
  token: string;
  /** Session ID */
  sessionId: string;
  /** Granted scopes */
  scopes: ToolScope[];
  /** Learner context (based on scopes) */
  learner?: LearnerContext;
  /** Classroom context (if scope granted) */
  classroom?: ClassroomContext;
  /** Theme information (if THEME_READ scope) */
  theme?: ThemeContext;
  /** Tool-specific config from installation */
  config?: Record<string, unknown>;
  /** Aivo platform information */
  platform: {
    name: 'aivo';
    version: string;
    environment: 'development' | 'staging' | 'production';
    messageOrigin: string;
  };
}

/**
 * Theme context for tool styling
 */
export interface ThemeContext {
  /** Color scheme */
  mode: 'light' | 'dark';
  /** Primary color (hex) */
  primaryColor: string;
  /** Accent color (hex) */
  accentColor: string;
  /** Grade band styling hints */
  gradeBandStyle?: 'primary' | 'elementary' | 'middle' | 'high';
}

// ══════════════════════════════════════════════════════════════════════════════
// POST MESSAGE PROTOCOL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base message structure for postMessage communication
 */
export interface EmbedMessage<T extends string = string, P = unknown> {
  /** Protocol identifier */
  protocol: 'aivo-embed-v1';
  /** Message type */
  type: T;
  /** Message ID for request/response correlation */
  messageId: string;
  /** Timestamp */
  timestamp: number;
  /** Payload */
  payload: P;
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages FROM Tool TO Aivo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool → Aivo: Tool is ready and initialized
 */
export type ToolReadyMessage = EmbedMessage<
  'TOOL_READY',
  {
    toolName: string;
    toolVersion: string;
  }
>;

/**
 * Tool → Aivo: Session event
 */
export type SessionEventMessage = EmbedMessage<
  'SESSION_EVENT',
  {
    eventType: SessionEventType;
    eventTimestamp: number;
    activityId?: string;
    score?: number;
    durationSeconds?: number;
    data?: Record<string, unknown>;
  }
>;

/**
 * Tool → Aivo: Request to end session
 */
export type EndSessionRequestMessage = EmbedMessage<
  'END_SESSION_REQUEST',
  {
    reason: 'completed' | 'user_exit' | 'error';
    summary?: {
      totalActivities?: number;
      completedActivities?: number;
      averageScore?: number;
      totalTimeSeconds?: number;
    };
  }
>;

/**
 * Tool → Aivo: Request token refresh
 */
export type TokenRefreshRequestMessage = EmbedMessage<
  'TOKEN_REFRESH_REQUEST',
  Record<string, never>
>;

/**
 * Tool → Aivo: Error report
 */
export type ToolErrorMessage = EmbedMessage<
  'TOOL_ERROR',
  {
    errorCode: string;
    errorMessage: string;
    errorStack?: string;
    severity: 'warning' | 'error' | 'fatal';
  }
>;

/**
 * Tool → Aivo: UI Request (resize, fullscreen, etc.)
 */
export type UIRequestMessage = EmbedMessage<
  'UI_REQUEST',
  {
    action: 'resize' | 'fullscreen' | 'exit_fullscreen' | 'focus';
    width?: number;
    height?: number;
  }
>;

/**
 * All messages from tool to Aivo
 */
export type ToolToAivoMessage =
  | ToolReadyMessage
  | SessionEventMessage
  | EndSessionRequestMessage
  | TokenRefreshRequestMessage
  | ToolErrorMessage
  | UIRequestMessage;

// ─────────────────────────────────────────────────────────────────────────────
// Messages FROM Aivo TO Tool
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aivo → Tool: Initialize with launch payload
 */
export type InitializeMessage = EmbedMessage<'INITIALIZE', ToolLaunchPayload>;

/**
 * Aivo → Tool: Theme update
 */
export type ThemeUpdateMessage = EmbedMessage<'THEME_UPDATE', ThemeContext>;

/**
 * Aivo → Tool: End session command
 */
export type EndSessionMessage = EmbedMessage<
  'END_SESSION',
  {
    reason: 'timeout' | 'user_exit' | 'admin_revoke' | 'session_limit';
  }
>;

/**
 * Aivo → Tool: Token refresh response
 */
export type TokenRefreshResponseMessage = EmbedMessage<
  'TOKEN_REFRESH_RESPONSE',
  {
    success: boolean;
    token?: string;
    expiresAt?: number;
    error?: string;
  }
>;

/**
 * Aivo → Tool: Event acknowledgment
 */
export type EventAckMessage = EmbedMessage<
  'EVENT_ACK',
  {
    originalMessageId: string;
    success: boolean;
    error?: string;
  }
>;

/**
 * Aivo → Tool: Pause/Resume
 */
export type PauseResumeMessage = EmbedMessage<
  'PAUSE_RESUME',
  {
    action: 'pause' | 'resume';
    reason?: string;
  }
>;

/**
 * All messages from Aivo to tool
 */
export type AivoToToolMessage =
  | InitializeMessage
  | ThemeUpdateMessage
  | EndSessionMessage
  | TokenRefreshResponseMessage
  | EventAckMessage
  | PauseResumeMessage;

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Request to create a new tool session
 */
export interface CreateSessionRequest {
  /** Tenant ID */
  tenantId: string;
  /** Marketplace item ID */
  marketplaceItemId: string;
  /** Item version ID (optional, uses latest if not specified) */
  marketplaceItemVersionId?: string;
  /** Installation ID */
  installationId: string;
  /** Learner ID (optional for teacher-only tools) */
  learnerId?: string;
  /** Classroom ID (optional) */
  classroomId?: string;
  /** Assignment ID (optional) */
  assignmentId?: string;
  /** User creating the session */
  createdByUserId: string;
  /** Actor type */
  createdByActorType: ActorType;
  /** Custom launch config overrides */
  launchConfig?: Record<string, unknown>;
}

/**
 * Response from creating a session
 */
export interface CreateSessionResponse {
  /** Session ID */
  sessionId: string;
  /** Launch URL (with token) */
  launchUrl: string;
  /** Launch type */
  launchType: EmbeddedToolLaunchType;
  /** Launch payload (for direct injection) */
  launchPayload: ToolLaunchPayload;
  /** Session expiration */
  expiresAt: string;
  /** Sandbox attributes for iframe */
  sandboxAttributes: string[];
  /** CSP directives for iframe */
  cspDirectives?: string;
}

/**
 * Request to record a session event
 */
export interface RecordEventRequest {
  /** Session ID */
  sessionId: string;
  /** Event type */
  eventType: SessionEventType;
  /** Event timestamp (ISO) */
  eventTimestamp: string;
  /** Activity ID within tool */
  activityId?: string;
  /** Score (0-100) */
  score?: number;
  /** Duration in seconds */
  durationSeconds?: number;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/**
 * Response from recording an event
 */
export interface RecordEventResponse {
  /** Event ID */
  eventId: string;
  /** Whether event was processed */
  processed: boolean;
  /** Processing error if any */
  error?: string;
}

/**
 * Session summary
 */
export interface SessionSummary {
  sessionId: string;
  status: ToolSessionStatus;
  marketplaceItemId: string;
  learnerId?: string;
  startedAt: string;
  endedAt?: string;
  totalEvents: number;
  lastEventAt?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCOPE DESCRIPTIONS (for documentation)
// ══════════════════════════════════════════════════════════════════════════════

export const SCOPE_DESCRIPTIONS: Record<
  ToolScope,
  { name: string; description: string; dataFields: string[] }
> = {
  LEARNER_PROFILE_MIN: {
    name: 'Minimal Learner Profile',
    description: 'First name initial, grade band, and subject only',
    dataFields: ['initials', 'gradeBand', 'subject'],
  },
  LEARNER_PROFILE_EXTENDED: {
    name: 'Extended Learner Profile',
    description: 'Additional learning preferences (requires consent)',
    dataFields: ['learningPreferences', 'accommodations'],
  },
  LEARNER_PSEUDONYM: {
    name: 'Pseudonymous Learner ID',
    description: 'Hash-based ID for tracking without PII',
    dataFields: ['pseudonymousId'],
  },
  CLASSROOM_CONTEXT: {
    name: 'Classroom Context',
    description: 'Classroom name and grade level',
    dataFields: ['classroomName', 'classroomGrade'],
  },
  ASSIGNMENT_CONTEXT: {
    name: 'Assignment Context',
    description: 'Assignment details if launched from assignment',
    dataFields: ['assignmentName', 'assignmentDueDate'],
  },
  SESSION_EVENTS_WRITE: {
    name: 'Write Session Events',
    description: 'Ability to send events back to Aivo',
    dataFields: [],
  },
  SESSION_EVENTS_READ: {
    name: 'Read Session Events',
    description: 'Ability to query own session events',
    dataFields: [],
  },
  PROGRESS_READ: {
    name: 'Read Progress',
    description: 'Access learner progress in this tool',
    dataFields: ['progressMarkers', 'completionStatus'],
  },
  PROGRESS_WRITE: {
    name: 'Write Progress',
    description: 'Save progress markers',
    dataFields: [],
  },
  THEME_READ: {
    name: 'Read Theme',
    description: 'Access current UI theme/styling',
    dataFields: ['colorScheme', 'gradeBandStyle'],
  },
  LEARNER_NAME_FULL: {
    name: 'Full Learner Name',
    description: 'Full first name (requires COPPA consent)',
    dataFields: ['firstName'],
  },
  LEARNER_GRADE_EXACT: {
    name: 'Exact Grade Level',
    description: 'Specific grade number',
    dataFields: ['gradeLevel'],
  },
  TEACHER_CONTEXT: {
    name: 'Teacher Context',
    description: 'Teacher name and contact (elevated)',
    dataFields: ['teacherName', 'teacherEmail'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is a valid ToolScope
 */
export function isToolScope(value: unknown): value is ToolScope {
  return typeof value === 'string' && Object.values(ToolScope).includes(value as ToolScope);
}

/**
 * Check if a value is a valid SessionEventType
 */
export function isSessionEventType(value: unknown): value is SessionEventType {
  return (
    typeof value === 'string' && Object.values(SessionEventType).includes(value as SessionEventType)
  );
}

/**
 * Check if a value is a valid ToolSessionStatus
 */
export function isToolSessionStatus(value: unknown): value is ToolSessionStatus {
  return (
    typeof value === 'string' &&
    Object.values(ToolSessionStatus).includes(value as ToolSessionStatus)
  );
}
