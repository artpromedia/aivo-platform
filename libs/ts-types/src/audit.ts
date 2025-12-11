/**
 * Audit Event Types
 *
 * Types for the unified audit trail system that tracks changes to:
 * - Learner difficulty levels
 * - Today Plans
 * - Policy documents
 *
 * @module @aivo/ts-types/audit
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Type of actor that performed an audited action
 */
export type AuditActorType = 'USER' | 'SYSTEM' | 'AGENT';

export const AUDIT_ACTOR_TYPES: AuditActorType[] = ['USER', 'SYSTEM', 'AGENT'];

/**
 * Type of action performed
 */
export type AuditActionType = 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';

export const AUDIT_ACTION_TYPES: AuditActionType[] = [
  'CREATED',
  'UPDATED',
  'DELETED',
  'ACTIVATED',
  'DEACTIVATED',
];

/**
 * Well-known entity types for audit events
 */
export type AuditEntityType =
  | 'LEARNER_DIFFICULTY'
  | 'TODAY_PLAN'
  | 'POLICY_DOCUMENT'
  | 'LEARNER_PROFILE'
  | 'TENANT_SETTINGS'
  | 'USER_ROLE';

export const AUDIT_ENTITY_TYPES: AuditEntityType[] = [
  'LEARNER_DIFFICULTY',
  'TODAY_PLAN',
  'POLICY_DOCUMENT',
  'LEARNER_PROFILE',
  'TENANT_SETTINGS',
  'USER_ROLE',
];

// ══════════════════════════════════════════════════════════════════════════════
// CHANGE JSON SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Change structure for LEARNER_DIFFICULTY entity
 */
export interface DifficultyChangeJson {
  before: {
    level: number;
    band?: string;
    subject?: string;
  };
  after: {
    level: number;
    band?: string;
    subject?: string;
  };
  delta?: {
    level: string; // e.g., "+1", "-2"
  };
}

/**
 * Change structure for TODAY_PLAN entity
 */
export interface TodayPlanChangeJson {
  before?: {
    activities: string[];
    totalDurationMinutes?: number;
  };
  after: {
    activities: string[];
    totalDurationMinutes?: number;
  };
  added?: string[];
  removed?: string[];
  reordered?: boolean;
}

/**
 * Change structure for POLICY_DOCUMENT entity
 */
export interface PolicyDocumentChangeJson {
  before?: {
    name?: string;
    version?: number;
    is_active?: boolean;
  };
  after: {
    name?: string;
    version?: number;
    is_active?: boolean;
  };
  /** List of changed JSON paths */
  changed_fields?: string[];
}

/**
 * Union of all known change JSON schemas
 */
export type AuditChangeJson =
  | DifficultyChangeJson
  | TodayPlanChangeJson
  | PolicyDocumentChangeJson
  | Record<string, unknown>;

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Full audit event entity
 */
export interface AuditEvent {
  id: string;
  tenantId: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorDisplayName: string | null;
  entityType: string;
  entityId: string;
  entityDisplayName: string | null;
  action: AuditActionType;
  changeJson: AuditChangeJson;
  summary: string;
  reason: string | null;
  relatedExplanationId: string | null;
  sessionId: string | null;
  learnerId: string | null;
  createdAt: string;
}

/**
 * Audit event for timeline display (subset of fields)
 */
export interface AuditEventSummary {
  id: string;
  actorType: AuditActorType;
  actorDisplayName: string | null;
  entityType: string;
  entityDisplayName: string | null;
  action: AuditActionType;
  summary: string;
  relatedExplanationId: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Input for creating an audit event
 */
export interface CreateAuditEventInput {
  tenantId: string;
  actorType: AuditActorType;
  actorId?: string | null;
  actorDisplayName?: string | null;
  entityType: string;
  entityId: string;
  entityDisplayName?: string | null;
  action: AuditActionType;
  changeJson: AuditChangeJson;
  summary: string;
  reason?: string | null;
  relatedExplanationId?: string | null;
  sessionId?: string | null;
  learnerId?: string | null;
}

/**
 * Query filters for listing audit events
 */
export interface AuditEventFilters {
  /** Filter by tenant */
  tenantId?: string;
  /** Filter by entity type */
  entityType?: string;
  /** Filter by specific entity */
  entityId?: string;
  /** Filter by actor type */
  actorType?: AuditActorType;
  /** Filter by actor */
  actorId?: string;
  /** Filter by learner */
  learnerId?: string;
  /** Filter by session */
  sessionId?: string;
  /** Filter by action */
  action?: AuditActionType;
  /** Filter by date range (from) */
  fromDate?: string;
  /** Filter by date range (to) */
  toDate?: string;
  /** Pagination: limit */
  limit?: number;
  /** Pagination: offset */
  offset?: number;
}

/**
 * Response for listing audit events
 */
export interface AuditEventsResponse {
  events: AuditEventSummary[];
  total: number;
}

/**
 * Response for single audit event with full details
 */
export interface AuditEventDetailResponse {
  event: AuditEvent;
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Actor type display configuration
 */
export const ACTOR_TYPE_DISPLAY: Record<AuditActorType, { label: string; icon: string }> = {
  USER: { label: 'User', icon: 'user' },
  SYSTEM: { label: 'System', icon: 'server' },
  AGENT: { label: 'AI Agent', icon: 'bot' },
};

/**
 * Action type display configuration
 */
export const ACTION_TYPE_DISPLAY: Record<AuditActionType, { label: string; colorClass: string }> = {
  CREATED: { label: 'Created', colorClass: 'bg-emerald-100 text-emerald-800' },
  UPDATED: { label: 'Updated', colorClass: 'bg-blue-100 text-blue-800' },
  DELETED: { label: 'Deleted', colorClass: 'bg-red-100 text-red-800' },
  ACTIVATED: { label: 'Activated', colorClass: 'bg-green-100 text-green-800' },
  DEACTIVATED: { label: 'Deactivated', colorClass: 'bg-amber-100 text-amber-800' },
};

/**
 * Entity type display configuration
 */
export const ENTITY_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  LEARNER_DIFFICULTY: { label: 'Difficulty Level', icon: 'gauge' },
  TODAY_PLAN: { label: 'Today Plan', icon: 'calendar' },
  POLICY_DOCUMENT: { label: 'Policy', icon: 'file-text' },
  LEARNER_PROFILE: { label: 'Learner Profile', icon: 'user' },
  TENANT_SETTINGS: { label: 'Tenant Settings', icon: 'settings' },
  USER_ROLE: { label: 'User Role', icon: 'shield' },
};

/**
 * Well-known agent IDs for display
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  VIRTUAL_BRAIN: 'Virtual Brain',
  LESSON_PLANNER: 'Lesson Planner',
  FOCUS_AGENT: 'Focus Agent',
  BASELINE_AGENT: 'Baseline Agent',
  HOMEWORK_HELPER: 'Homework Helper',
  RECOMMENDER: 'Recommender',
};
