// =============================================================================
// @aivo/events - Recommendation Event Schemas
// =============================================================================
//
// Events for personalization/recommendation system: created, served, feedback.
// Used for analytics, explainability, and A/B testing.
import { z } from 'zod';
import { BaseEventSchema, GradeBandSchema } from './base.js';
// -----------------------------------------------------------------------------
// Recommendation Type
// -----------------------------------------------------------------------------
export const RecommendationTypeSchema = z.enum([
    'next_activity',
    'skill_practice',
    'review_content',
    'challenge_content',
    'remediation',
    'enrichment',
    'break_suggestion',
    'goal_suggestion',
]);
// -----------------------------------------------------------------------------
// Recommendation Strategy
// -----------------------------------------------------------------------------
export const RecommendationStrategySchema = z.enum([
    'knowledge_tracing',
    'collaborative_filtering',
    'content_based',
    'skill_gap',
    'spaced_repetition',
    'engagement_optimized',
    'difficulty_adjusted',
    'goal_aligned',
    'teacher_assigned',
    'baseline',
]);
// -----------------------------------------------------------------------------
// Recommendation Created
// -----------------------------------------------------------------------------
export const RecommendationCreatedSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.created'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** Type of recommendation */
        type: RecommendationTypeSchema,
        /** Strategy used to generate */
        strategy: RecommendationStrategySchema,
        /** Recommended content/activity ID */
        contentId: z.string().uuid(),
        /** Content type */
        contentType: z.enum(['activity', 'lesson', 'quiz', 'video', 'game', 'reading']),
        /** Predicted relevance score (0-1) */
        relevanceScore: z.number().min(0).max(1),
        /** Predicted difficulty match (0-1, 1 = perfect match) */
        difficultyMatch: z.number().min(0).max(1),
        /** Predicted engagement score (0-1) */
        engagementPrediction: z.number().min(0).max(1),
        /** Position in recommendation list */
        position: z.number().int().min(1),
        /** Total recommendations in batch */
        batchSize: z.number().int().min(1),
        /** Experiment variant if A/B testing */
        experimentVariant: z.string().optional(),
        /** Explainability factors */
        factors: z.object({
            /** Skill gap addressed */
            skillGap: z.number().min(0).max(1).optional(),
            /** Recency factor (spaced repetition) */
            recency: z.number().min(0).max(1).optional(),
            /** Similar learner success rate */
            peerSuccess: z.number().min(0).max(1).optional(),
            /** Content quality rating */
            contentQuality: z.number().min(0).max(1).optional(),
            /** Goal alignment score */
            goalAlignment: z.number().min(0).max(1).optional(),
        }),
        /** Target skill IDs */
        targetSkillIds: z.array(z.string().uuid()).optional(),
        /** Grade band */
        gradeBand: GradeBandSchema.optional(),
        createdAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Recommendation Served
// -----------------------------------------------------------------------------
export const RecommendationServedSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.served'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** Position shown to user */
        displayPosition: z.number().int().min(1),
        /** Display context */
        displayContext: z.enum([
            'home_feed',
            'post_activity',
            'search_results',
            'skill_page',
            'notification',
            'teacher_dashboard',
        ]),
        /** Time since recommendation created (ms) */
        latencyMs: z.number().int().min(0),
        /** Client viewport size */
        viewportType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
        servedAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Recommendation Clicked
// -----------------------------------------------------------------------------
export const RecommendationClickedSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.clicked'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** Time from serve to click (ms) */
        dwellTimeMs: z.number().int().min(0),
        /** Was this the first interaction */
        firstInteraction: z.boolean(),
        /** Click source */
        clickSource: z.enum(['tap', 'keyboard', 'voice', 'auto_advance']),
        clickedAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Recommendation Dismissed
// -----------------------------------------------------------------------------
export const RecommendationDismissedSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.dismissed'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** How it was dismissed */
        dismissMethod: z.enum(['swipe', 'skip_button', 'back_navigation', 'timeout', 'replaced']),
        /** Time from serve to dismiss (ms) */
        dwellTimeMs: z.number().int().min(0),
        /** User provided reason */
        reason: z
            .enum([
            'not_interested',
            'too_easy',
            'too_hard',
            'already_know',
            'wrong_subject',
            'not_now',
            'none_given',
        ])
            .optional(),
        dismissedAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Recommendation Feedback
// -----------------------------------------------------------------------------
export const RecommendationFeedbackSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.feedback'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** Explicit feedback type */
        feedbackType: z.enum(['thumbs_up', 'thumbs_down', 'star_rating', 'completion_rating']),
        /** Rating value (1-5 for stars, 0-1 for binary) */
        ratingValue: z.number().min(0).max(5),
        /** Time since activity started (ms) */
        timeSinceStartMs: z.number().int().min(0),
        /** Activity outcome at feedback time */
        activityOutcome: z.enum(['completed', 'in_progress', 'abandoned']).optional(),
        /** Score if completed */
        activityScore: z.number().min(0).max(100).optional(),
        feedbackAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Recommendation Outcome (for model training)
// -----------------------------------------------------------------------------
export const RecommendationOutcomeSchema = BaseEventSchema.extend({
    eventType: z.literal('recommendation.outcome'),
    eventVersion: z.literal('1.0.0'),
    payload: z.object({
        recommendationId: z.string().uuid(),
        learnerId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
        /** Whether recommendation was accepted */
        wasAccepted: z.boolean(),
        /** Activity completion status */
        completionStatus: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']),
        /** Time spent on activity (ms) */
        timeSpentMs: z.number().int().min(0).optional(),
        /** Score achieved */
        score: z.number().min(0).max(100).optional(),
        /** Engagement during activity */
        engagementScore: z.number().min(0).max(100).optional(),
        /** Skill improvement observed */
        skillImprovement: z.number().min(-1).max(1).optional(),
        /** Label for model training (positive/negative outcome) */
        outcomeLabel: z.enum(['positive', 'neutral', 'negative']),
        recordedAt: z.string().datetime({ offset: true }),
    }),
});
// -----------------------------------------------------------------------------
// Union Types
// -----------------------------------------------------------------------------
export const RecommendationEventSchema = z.discriminatedUnion('eventType', [
    RecommendationCreatedSchema,
    RecommendationServedSchema,
    RecommendationClickedSchema,
    RecommendationDismissedSchema,
    RecommendationFeedbackSchema,
    RecommendationOutcomeSchema,
]);
// -----------------------------------------------------------------------------
// Event Type Mapping
// -----------------------------------------------------------------------------
export const RECOMMENDATION_EVENT_TYPES = {
    CREATED: 'recommendation.created',
    SERVED: 'recommendation.served',
    CLICKED: 'recommendation.clicked',
    DISMISSED: 'recommendation.dismissed',
    FEEDBACK: 'recommendation.feedback',
    OUTCOME: 'recommendation.outcome',
};
//# sourceMappingURL=recommendation.js.map