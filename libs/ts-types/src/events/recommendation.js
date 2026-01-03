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
import { createEventSchema } from './base.js';
// ══════════════════════════════════════════════════════════════════════════════
// SHARED ENUMS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Types of recommendations the system can generate
 */
export const RecommendationTypeSchema = z.enum([
    /** Increase difficulty level */
    'INCREASE_DIFFICULTY',
    /** Decrease difficulty level */
    'DECREASE_DIFFICULTY',
    /** Add an accommodation */
    'ADD_ACCOMMODATION',
    /** Remove an accommodation */
    'REMOVE_ACCOMMODATION',
    /** Suggest specific content */
    'CONTENT_SUGGESTION',
    /** Suggest schedule changes */
    'SCHEDULE_CHANGE',
]);
/**
 * Roles that can approve recommendations
 */
export const ApproverRoleSchema = z.enum(['PARENT', 'TEACHER', 'ADMIN']);
/**
 * Response types for recommendations
 */
export const RecommendationResponseSchema = z.enum([
    /** Recommendation was accepted */
    'ACCEPTED',
    /** Recommendation was declined */
    'DECLINED',
    /** Decision was deferred */
    'DEFERRED',
]);
// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION PAYLOAD SCHEMA
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Recommendation payload schema with flexible supporting data
 */
export const RecommendationPayloadSchema = z.object({
    /** Subject area (if applicable) */
    subject: z.string().optional(),
    /** Previous level (if difficulty change) */
    fromLevel: z.string().optional(),
    /** Target level (if difficulty change) */
    toLevel: z.string().optional(),
    /** Human-readable reason for the recommendation */
    reason: z.string().min(1),
    /** Confidence score (0.0 to 1.0) */
    confidence: z.number().min(0).max(1),
    /** Additional data supporting the recommendation */
    supportingData: z.record(z.unknown()).optional(),
});
// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION EVENTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Recommendation Created Event
 *
 * Emitted when the AI system generates a new recommendation for a learner.
 */
export const RecommendationCreatedEventSchema = createEventSchema('recommendation.created', z.object({
    /** Learner the recommendation is for */
    learnerId: z.string().cuid(),
    /** Unique recommendation identifier */
    recommendationId: z.string().cuid(),
    /** Type of recommendation */
    type: RecommendationTypeSchema,
    /** Detailed recommendation payload */
    payload: RecommendationPayloadSchema,
    /** Whether this requires human approval before applying */
    requiresApproval: z.boolean(),
    /** Role required to approve (if requiresApproval is true) */
    approverRole: ApproverRoleSchema.optional(),
}));
/**
 * Recommendation Responded Event
 *
 * Emitted when someone (parent, teacher, admin) responds to a recommendation.
 */
export const RecommendationRespondedEventSchema = createEventSchema('recommendation.responded', z.object({
    /** The recommendation being responded to */
    recommendationId: z.string().cuid(),
    /** Learner the recommendation was for */
    learnerId: z.string().cuid(),
    /** The response given */
    response: RecommendationResponseSchema,
    /** User who responded */
    respondedByUserId: z.string().cuid(),
    /** Role of the user who responded */
    respondedByRole: z.string().min(1),
    /** Optional feedback explaining the response */
    feedback: z.string().optional(),
}));
/**
 * Recommendation Applied Event
 *
 * Emitted when a recommendation is actually applied to the learner's profile.
 */
export const RecommendationAppliedEventSchema = createEventSchema('recommendation.applied', z.object({
    /** The recommendation being applied */
    recommendationId: z.string().cuid(),
    /** Learner the recommendation was for */
    learnerId: z.string().cuid(),
    /** Type of recommendation that was applied */
    type: RecommendationTypeSchema,
    /** When it was applied */
    appliedAt: z.string().datetime(),
    /** Whether it was auto-applied or required approval */
    autoApplied: z.boolean(),
    /** User who approved (if not auto-applied) */
    approvedByUserId: z.string().cuid().optional(),
}));
// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Union of all recommendation event schemas for type guards
 */
export const RecommendationEventSchemas = [
    RecommendationCreatedEventSchema,
    RecommendationRespondedEventSchema,
    RecommendationAppliedEventSchema,
];
/**
 * Recommendation event type literals
 */
export const RECOMMENDATION_EVENT_TYPES = [
    'recommendation.created',
    'recommendation.responded',
    'recommendation.applied',
];
//# sourceMappingURL=recommendation.js.map