/**
 * Explainability Types
 *
 * Structured types for explanation events that provide human-readable
 * justifications for platform decisions.
 *
 * @module @aivo/ts-types/explainability
 */
/**
 * Source systems that generate explanations.
 */
export declare const EXPLANATION_SOURCE_TYPES: readonly ["LESSON_PLANNER", "VIRTUAL_BRAIN", "FOCUS_AGENT", "RECOMMENDER", "SYSTEM_POLICY", "BASELINE_AGENT", "HOMEWORK_HELPER"];
export type ExplanationSourceType = (typeof EXPLANATION_SOURCE_TYPES)[number];
/**
 * Types of actions being explained.
 */
export declare const EXPLANATION_ACTION_TYPES: readonly ["CONTENT_SELECTION", "DIFFICULTY_CHANGE", "FOCUS_BREAK_TRIGGER", "FOCUS_INTERVENTION", "MODULE_RECOMMENDATION", "LEARNING_PATH_ADJUSTMENT", "SKILL_PROGRESSION", "SCAFFOLDING_DECISION", "POLICY_ENFORCEMENT"];
export type ExplanationActionType = (typeof EXPLANATION_ACTION_TYPES)[number];
/**
 * Common related entity types.
 */
export declare const RELATED_ENTITY_TYPES: readonly ["LEARNING_OBJECT_VERSION", "RECOMMENDATION", "SKILL", "SESSION_EVENT", "EXPERIMENT", "POLICY_RULE", "MODULE", "ACTIVITY"];
export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];
/**
 * A single reason contributing to a decision.
 */
export interface ExplanationReason {
    /** Machine-readable reason code (e.g., 'LOW_MASTERY', 'RECENT_STRUGGLE') */
    code: string;
    /** Weight/importance of this reason (0-1) */
    weight: number;
    /** Human-readable description */
    description: string;
}
/**
 * Machine-readable details structure for explanation events.
 */
export interface ExplanationDetails {
    /** Array of reasons contributing to the decision */
    reasons?: ExplanationReason[];
    /** Input signals/metrics used in the decision */
    inputs?: {
        masteryScore?: number;
        recentAccuracy?: number;
        focusScore?: number;
        sessionDurationMinutes?: number;
        attemptCount?: number;
        streakLength?: number;
        idleSeconds?: number;
        [key: string]: unknown;
    };
    /** Thresholds used for comparison */
    thresholds?: {
        masteryThreshold?: number;
        accuracyThreshold?: number;
        focusThreshold?: number;
        timeThresholdMinutes?: number;
        [key: string]: unknown;
    };
    /** Policy identifiers that influenced the decision */
    policyReferences?: string[];
    /** A/B test experiment key (if applicable) */
    experimentKey?: string;
    /** Experiment variant ID (if applicable) */
    variantId?: string;
    /** Additional context-specific data */
    [key: string]: unknown;
}
/**
 * Input for creating a new explanation event.
 * Note: Optional properties include `| undefined` to satisfy exactOptionalPropertyTypes.
 */
export interface CreateExplanationEventInput {
    /** Tenant ID (required for multi-tenant isolation) */
    tenantId: string;
    /** Learner ID (nullable for tenant-wide explanations) */
    learnerId?: string | undefined;
    /** User ID - recipient of the explanation (parent, teacher) */
    userId?: string | undefined;
    /** Session ID (nullable for non-session decisions) */
    sessionId?: string | undefined;
    /** Which system generated this explanation */
    sourceType: ExplanationSourceType;
    /** What kind of decision is being explained */
    actionType: ExplanationActionType;
    /** Type of the related entity */
    relatedEntityType: string;
    /** ID of the related entity */
    relatedEntityId: string;
    /** Human-readable explanation (1-2 sentences) */
    summaryText: string;
    /** Machine-readable details */
    detailsJson?: ExplanationDetails | undefined;
    /** Link to AI call that generated this explanation */
    aiCallLogId?: string | undefined;
    /** Template ID used to generate the summary */
    templateId?: string | undefined;
    /** Confidence score (0-1) */
    confidence?: number | undefined;
    /** Version of explanation generator */
    generatorVersion?: string | undefined;
}
/**
 * Stored explanation event record.
 */
export interface ExplanationEvent extends CreateExplanationEventInput {
    /** Unique identifier */
    id: string;
    /** Machine-readable details (always present, may be empty object) */
    detailsJson: ExplanationDetails;
    /** Version of explanation generator */
    generatorVersion: string;
    /** When the explanation was created */
    createdAt: Date;
}
/**
 * Explanation event with camelCase field names for API responses.
 */
export interface ExplanationEventResponse {
    id: string;
    tenantId: string;
    learnerId: string | null;
    userId: string | null;
    sessionId: string | null;
    sourceType: ExplanationSourceType;
    actionType: ExplanationActionType;
    relatedEntityType: string;
    relatedEntityId: string;
    summaryText: string;
    detailsJson: ExplanationDetails;
    aiCallLogId: string | null;
    templateId: string | null;
    confidence: number | null;
    generatorVersion: string;
    createdAt: string;
}
/**
 * Input for creating an explanation template.
 */
export interface CreateExplanationTemplateInput {
    /** Which source this template applies to */
    sourceType: ExplanationSourceType;
    /** Which action type this template applies to */
    actionType: ExplanationActionType;
    /** Unique key for programmatic lookup */
    templateKey: string;
    /** Human-readable name for admin UI */
    displayName: string;
    /** Template text with {placeholder} variables */
    templateText: string;
    /** JSON Schema for validating placeholder values */
    placeholdersSchema?: Record<string, unknown>;
    /** Whether this template is active */
    isActive?: boolean;
}
/**
 * Stored explanation template record.
 */
export interface ExplanationTemplate extends CreateExplanationTemplateInput {
    /** Unique identifier */
    id: string;
    /** JSON Schema for validating placeholder values */
    placeholdersSchema: Record<string, unknown>;
    /** Whether this template is active */
    isActive: boolean;
    /** User who created the template */
    createdBy: string | null;
    /** User who last updated the template */
    updatedBy: string | null;
    /** When the template was created */
    createdAt: Date;
    /** When the template was last updated */
    updatedAt: Date;
}
/**
 * Filters for querying explanation events.
 */
export interface ExplanationEventFilters {
    /** Filter by tenant (required) */
    tenantId: string;
    /** Filter by learner */
    learnerId?: string;
    /** Filter by user (recipient) */
    userId?: string;
    /** Filter by session */
    sessionId?: string;
    /** Filter by source type(s) */
    sourceTypes?: ExplanationSourceType[];
    /** Filter by action type(s) */
    actionTypes?: ExplanationActionType[];
    /** Filter by related entity type */
    relatedEntityType?: string;
    /** Filter by related entity ID */
    relatedEntityId?: string;
    /** Filter by date range (start) */
    createdAfter?: Date;
    /** Filter by date range (end) */
    createdBefore?: Date;
    /** Pagination: page number (1-indexed) */
    page?: number;
    /** Pagination: items per page */
    pageSize?: number;
}
/**
 * Paginated response for explanation events.
 */
export interface ExplanationEventPage {
    /** The explanation events */
    items: ExplanationEventResponse[];
    /** Total count matching filters */
    totalCount: number;
    /** Current page (1-indexed) */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there are more pages */
    hasMore: boolean;
}
/**
 * Template rendering context - values to substitute into template placeholders.
 * Note: Properties are explicitly typed as `| undefined` to satisfy exactOptionalPropertyTypes.
 */
export interface TemplateContext {
    learner_name?: string | undefined;
    subject?: string | undefined;
    skill_area?: string | undefined;
    content_name?: string | undefined;
    module_name?: string | undefined;
    duration_minutes?: number | undefined;
    reason?: string | undefined;
    prerequisite_skill?: string | undefined;
    [key: string]: string | number | boolean | undefined;
}
/**
 * Result of rendering a template.
 */
export interface RenderedTemplate {
    /** The rendered text */
    text: string;
    /** The template ID used */
    templateId: string;
    /** The template key used */
    templateKey: string;
    /** Any placeholders that could not be substituted */
    missingPlaceholders?: string[];
}
/**
 * Well-known template keys for programmatic use.
 */
export declare const TEMPLATE_KEYS: {
    readonly DIFFICULTY_DOWN_STRUGGLE: "DIFFICULTY_DOWN_STRUGGLE";
    readonly DIFFICULTY_UP_MASTERY: "DIFFICULTY_UP_MASTERY";
    readonly FOCUS_BREAK_TIME_BASED: "FOCUS_BREAK_TIME_BASED";
    readonly FOCUS_BREAK_ATTENTION: "FOCUS_BREAK_ATTENTION";
    readonly FOCUS_INTERVENTION_ACTIVITY: "FOCUS_INTERVENTION_ACTIVITY";
    readonly CONTENT_SKILL_GAP: "CONTENT_SKILL_GAP";
    readonly CONTENT_REINFORCEMENT: "CONTENT_REINFORCEMENT";
    readonly RECOMMEND_NEXT_SKILL: "RECOMMEND_NEXT_SKILL";
    readonly RECOMMEND_PRACTICE: "RECOMMEND_PRACTICE";
    readonly PATH_ACCELERATE: "PATH_ACCELERATE";
    readonly PATH_REINFORCE: "PATH_REINFORCE";
    readonly SCAFFOLD_HINT: "SCAFFOLD_HINT";
    readonly SCAFFOLD_STEP_BREAKDOWN: "SCAFFOLD_STEP_BREAKDOWN";
    readonly POLICY_TIME_LIMIT: "POLICY_TIME_LIMIT";
    readonly POLICY_CONTENT_FILTER: "POLICY_CONTENT_FILTER";
};
export type TemplateKey = (typeof TEMPLATE_KEYS)[keyof typeof TEMPLATE_KEYS];
/**
 * Reason codes for machine-readable explanation details.
 */
export declare const REASON_CODES: {
    readonly LOW_MASTERY: "LOW_MASTERY";
    readonly HIGH_MASTERY: "HIGH_MASTERY";
    readonly MASTERY_PLATEAU: "MASTERY_PLATEAU";
    readonly RECENT_STRUGGLE: "RECENT_STRUGGLE";
    readonly RECENT_SUCCESS: "RECENT_SUCCESS";
    readonly ACCURACY_BELOW_THRESHOLD: "ACCURACY_BELOW_THRESHOLD";
    readonly ACCURACY_ABOVE_THRESHOLD: "ACCURACY_ABOVE_THRESHOLD";
    readonly FOCUS_LOSS_DETECTED: "FOCUS_LOSS_DETECTED";
    readonly TIME_BASED_BREAK: "TIME_BASED_BREAK";
    readonly IDLE_DETECTED: "IDLE_DETECTED";
    readonly PREREQUISITE_MET: "PREREQUISITE_MET";
    readonly SKILL_GAP_IDENTIFIED: "SKILL_GAP_IDENTIFIED";
    readonly REINFORCEMENT_NEEDED: "REINFORCEMENT_NEEDED";
    readonly POLICY_RULE_TRIGGERED: "POLICY_RULE_TRIGGERED";
    readonly TIME_LIMIT_REACHED: "TIME_LIMIT_REACHED";
    readonly CONTENT_RESTRICTION: "CONTENT_RESTRICTION";
    readonly EXPERIMENT_VARIANT: "EXPERIMENT_VARIANT";
};
export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];
//# sourceMappingURL=explainability.d.ts.map