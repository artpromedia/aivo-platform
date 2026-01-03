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
/**
 * Type of actor that performed an audited action
 */
export type AuditActorType = 'USER' | 'SYSTEM' | 'AGENT';
export declare const AUDIT_ACTOR_TYPES: AuditActorType[];
/**
 * Type of action performed
 */
export type AuditActionType = 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';
export declare const AUDIT_ACTION_TYPES: AuditActionType[];
/**
 * Well-known entity types for audit events
 */
export type AuditEntityType = 'LEARNER_DIFFICULTY' | 'TODAY_PLAN' | 'POLICY_DOCUMENT' | 'LEARNER_PROFILE' | 'TENANT_SETTINGS' | 'USER_ROLE';
export declare const AUDIT_ENTITY_TYPES: AuditEntityType[];
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
        level: string;
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
export type AuditChangeJson = DifficultyChangeJson | TodayPlanChangeJson | PolicyDocumentChangeJson | Record<string, unknown>;
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
/**
 * Actor type display configuration
 */
export declare const ACTOR_TYPE_DISPLAY: Record<AuditActorType, {
    label: string;
    icon: string;
}>;
/**
 * Action type display configuration
 */
export declare const ACTION_TYPE_DISPLAY: Record<AuditActionType, {
    label: string;
    colorClass: string;
}>;
/**
 * Entity type display configuration
 */
export declare const ENTITY_TYPE_DISPLAY: Record<string, {
    label: string;
    icon: string;
}>;
/**
 * Well-known agent IDs for display
 */
export declare const AGENT_DISPLAY_NAMES: Record<string, string>;
//# sourceMappingURL=audit.d.ts.map