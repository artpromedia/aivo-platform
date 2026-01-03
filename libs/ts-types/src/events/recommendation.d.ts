/**
 * Recommendation Event Schemas
 *
 * Events related to AI-generated recommendations for difficulty changes,
 * accommodations, and content suggestions.
 * All events include tenantId for multi-tenant isolation.
 *
 * @module @aivo/ts-types/events/recommendation
 */
import { z } from 'zod';
/**
 * Types of recommendations the system can generate
 */
export declare const RecommendationTypeSchema: z.ZodEnum<["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY", "ADD_ACCOMMODATION", "REMOVE_ACCOMMODATION", "CONTENT_SUGGESTION", "SCHEDULE_CHANGE"]>;
export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;
/**
 * Roles that can approve recommendations
 */
export declare const ApproverRoleSchema: z.ZodEnum<["PARENT", "TEACHER", "ADMIN"]>;
export type ApproverRole = z.infer<typeof ApproverRoleSchema>;
/**
 * Response types for recommendations
 */
export declare const RecommendationResponseSchema: z.ZodEnum<["ACCEPTED", "DECLINED", "DEFERRED"]>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
/**
 * Recommendation payload schema with flexible supporting data
 */
export declare const RecommendationPayloadSchema: z.ZodObject<{
    /** Subject area (if applicable) */
    subject: z.ZodOptional<z.ZodString>;
    /** Previous level (if difficulty change) */
    fromLevel: z.ZodOptional<z.ZodString>;
    /** Target level (if difficulty change) */
    toLevel: z.ZodOptional<z.ZodString>;
    /** Human-readable reason for the recommendation */
    reason: z.ZodString;
    /** Confidence score (0.0 to 1.0) */
    confidence: z.ZodNumber;
    /** Additional data supporting the recommendation */
    supportingData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    subject?: string;
    fromLevel?: string;
    toLevel?: string;
    confidence?: number;
    supportingData?: Record<string, unknown>;
}, {
    reason?: string;
    subject?: string;
    fromLevel?: string;
    toLevel?: string;
    confidence?: number;
    supportingData?: Record<string, unknown>;
}>;
export type RecommendationPayload = z.infer<typeof RecommendationPayloadSchema>;
/**
 * Recommendation Created Event
 *
 * Emitted when the AI system generates a new recommendation for a learner.
 */
export declare const RecommendationCreatedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** Learner the recommendation is for */
        learnerId: z.ZodString;
        /** Unique recommendation identifier */
        recommendationId: z.ZodString;
        /** Type of recommendation */
        type: z.ZodEnum<["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY", "ADD_ACCOMMODATION", "REMOVE_ACCOMMODATION", "CONTENT_SUGGESTION", "SCHEDULE_CHANGE"]>;
        /** Detailed recommendation payload */
        payload: z.ZodObject<{
            /** Subject area (if applicable) */
            subject: z.ZodOptional<z.ZodString>;
            /** Previous level (if difficulty change) */
            fromLevel: z.ZodOptional<z.ZodString>;
            /** Target level (if difficulty change) */
            toLevel: z.ZodOptional<z.ZodString>;
            /** Human-readable reason for the recommendation */
            reason: z.ZodString;
            /** Confidence score (0.0 to 1.0) */
            confidence: z.ZodNumber;
            /** Additional data supporting the recommendation */
            supportingData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        }, {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        }>;
        /** Whether this requires human approval before applying */
        requiresApproval: z.ZodBoolean;
        /** Role required to approve (if requiresApproval is true) */
        approverRole: z.ZodOptional<z.ZodEnum<["PARENT", "TEACHER", "ADMIN"]>>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    }, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    }>;
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    };
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    };
}>;
export type RecommendationCreatedEvent = z.infer<typeof RecommendationCreatedEventSchema>;
/**
 * Recommendation Responded Event
 *
 * Emitted when someone (parent, teacher, admin) responds to a recommendation.
 */
export declare const RecommendationRespondedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** The recommendation being responded to */
        recommendationId: z.ZodString;
        /** Learner the recommendation was for */
        learnerId: z.ZodString;
        /** The response given */
        response: z.ZodEnum<["ACCEPTED", "DECLINED", "DEFERRED"]>;
        /** User who responded */
        respondedByUserId: z.ZodString;
        /** Role of the user who responded */
        respondedByRole: z.ZodString;
        /** Optional feedback explaining the response */
        feedback: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    }, {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    }>;
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
    payload?: {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    };
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
    payload?: {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    };
}>;
export type RecommendationRespondedEvent = z.infer<typeof RecommendationRespondedEventSchema>;
/**
 * Recommendation Applied Event
 *
 * Emitted when a recommendation is actually applied to the learner's profile.
 */
export declare const RecommendationAppliedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** The recommendation being applied */
        recommendationId: z.ZodString;
        /** Learner the recommendation was for */
        learnerId: z.ZodString;
        /** Type of recommendation that was applied */
        type: z.ZodEnum<["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY", "ADD_ACCOMMODATION", "REMOVE_ACCOMMODATION", "CONTENT_SUGGESTION", "SCHEDULE_CHANGE"]>;
        /** When it was applied */
        appliedAt: z.ZodString;
        /** Whether it was auto-applied or required approval */
        autoApplied: z.ZodBoolean;
        /** User who approved (if not auto-applied) */
        approvedByUserId: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    }, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    }>;
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    };
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    };
}>;
export type RecommendationAppliedEvent = z.infer<typeof RecommendationAppliedEventSchema>;
/**
 * Union of all recommendation event schemas for type guards
 */
export declare const RecommendationEventSchemas: readonly [z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** Learner the recommendation is for */
        learnerId: z.ZodString;
        /** Unique recommendation identifier */
        recommendationId: z.ZodString;
        /** Type of recommendation */
        type: z.ZodEnum<["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY", "ADD_ACCOMMODATION", "REMOVE_ACCOMMODATION", "CONTENT_SUGGESTION", "SCHEDULE_CHANGE"]>;
        /** Detailed recommendation payload */
        payload: z.ZodObject<{
            /** Subject area (if applicable) */
            subject: z.ZodOptional<z.ZodString>;
            /** Previous level (if difficulty change) */
            fromLevel: z.ZodOptional<z.ZodString>;
            /** Target level (if difficulty change) */
            toLevel: z.ZodOptional<z.ZodString>;
            /** Human-readable reason for the recommendation */
            reason: z.ZodString;
            /** Confidence score (0.0 to 1.0) */
            confidence: z.ZodNumber;
            /** Additional data supporting the recommendation */
            supportingData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        }, {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        }>;
        /** Whether this requires human approval before applying */
        requiresApproval: z.ZodBoolean;
        /** Role required to approve (if requiresApproval is true) */
        approverRole: z.ZodOptional<z.ZodEnum<["PARENT", "TEACHER", "ADMIN"]>>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    }, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    }>;
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    };
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        payload?: {
            reason?: string;
            subject?: string;
            fromLevel?: string;
            toLevel?: string;
            confidence?: number;
            supportingData?: Record<string, unknown>;
        };
        learnerId?: string;
        recommendationId?: string;
        requiresApproval?: boolean;
        approverRole?: "PARENT" | "TEACHER" | "ADMIN";
    };
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** The recommendation being responded to */
        recommendationId: z.ZodString;
        /** Learner the recommendation was for */
        learnerId: z.ZodString;
        /** The response given */
        response: z.ZodEnum<["ACCEPTED", "DECLINED", "DEFERRED"]>;
        /** User who responded */
        respondedByUserId: z.ZodString;
        /** Role of the user who responded */
        respondedByRole: z.ZodString;
        /** Optional feedback explaining the response */
        feedback: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    }, {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    }>;
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
    payload?: {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    };
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
    payload?: {
        response?: "ACCEPTED" | "DECLINED" | "DEFERRED";
        learnerId?: string;
        recommendationId?: string;
        respondedByUserId?: string;
        respondedByRole?: string;
        feedback?: string;
    };
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
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
    payload: z.ZodObject<{
        /** The recommendation being applied */
        recommendationId: z.ZodString;
        /** Learner the recommendation was for */
        learnerId: z.ZodString;
        /** Type of recommendation that was applied */
        type: z.ZodEnum<["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY", "ADD_ACCOMMODATION", "REMOVE_ACCOMMODATION", "CONTENT_SUGGESTION", "SCHEDULE_CHANGE"]>;
        /** When it was applied */
        appliedAt: z.ZodString;
        /** Whether it was auto-applied or required approval */
        autoApplied: z.ZodBoolean;
        /** User who approved (if not auto-applied) */
        approvedByUserId: z.ZodOptional<z.ZodString>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    }, {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    }>;
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    };
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
    payload?: {
        type?: "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "ADD_ACCOMMODATION" | "REMOVE_ACCOMMODATION" | "CONTENT_SUGGESTION" | "SCHEDULE_CHANGE";
        learnerId?: string;
        recommendationId?: string;
        appliedAt?: string;
        autoApplied?: boolean;
        approvedByUserId?: string;
    };
}>];
/**
 * Recommendation event type literals
 */
export declare const RECOMMENDATION_EVENT_TYPES: readonly ["recommendation.created", "recommendation.responded", "recommendation.applied"];
export type RecommendationEventType = (typeof RECOMMENDATION_EVENT_TYPES)[number];
//# sourceMappingURL=recommendation.d.ts.map