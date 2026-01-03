import { z } from 'zod';
export declare const RecommendationTypeSchema: z.ZodEnum<["next_activity", "skill_practice", "review_content", "challenge_content", "remediation", "enrichment", "break_suggestion", "goal_suggestion"]>;
export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;
export declare const RecommendationStrategySchema: z.ZodEnum<["knowledge_tracing", "collaborative_filtering", "content_based", "skill_gap", "spaced_repetition", "engagement_optimized", "difficulty_adjusted", "goal_aligned", "teacher_assigned", "baseline"]>;
export type RecommendationStrategy = z.infer<typeof RecommendationStrategySchema>;
export declare const RecommendationCreatedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.created">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Type of recommendation */
        type: z.ZodEnum<["next_activity", "skill_practice", "review_content", "challenge_content", "remediation", "enrichment", "break_suggestion", "goal_suggestion"]>;
        /** Strategy used to generate */
        strategy: z.ZodEnum<["knowledge_tracing", "collaborative_filtering", "content_based", "skill_gap", "spaced_repetition", "engagement_optimized", "difficulty_adjusted", "goal_aligned", "teacher_assigned", "baseline"]>;
        /** Recommended content/activity ID */
        contentId: z.ZodString;
        /** Content type */
        contentType: z.ZodEnum<["activity", "lesson", "quiz", "video", "game", "reading"]>;
        /** Predicted relevance score (0-1) */
        relevanceScore: z.ZodNumber;
        /** Predicted difficulty match (0-1, 1 = perfect match) */
        difficultyMatch: z.ZodNumber;
        /** Predicted engagement score (0-1) */
        engagementPrediction: z.ZodNumber;
        /** Position in recommendation list */
        position: z.ZodNumber;
        /** Total recommendations in batch */
        batchSize: z.ZodNumber;
        /** Experiment variant if A/B testing */
        experimentVariant: z.ZodOptional<z.ZodString>;
        /** Explainability factors */
        factors: z.ZodObject<{
            /** Skill gap addressed */
            skillGap: z.ZodOptional<z.ZodNumber>;
            /** Recency factor (spaced repetition) */
            recency: z.ZodOptional<z.ZodNumber>;
            /** Similar learner success rate */
            peerSuccess: z.ZodOptional<z.ZodNumber>;
            /** Content quality rating */
            contentQuality: z.ZodOptional<z.ZodNumber>;
            /** Goal alignment score */
            goalAlignment: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }>;
        /** Target skill IDs */
        targetSkillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Grade band */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationCreated = z.infer<typeof RecommendationCreatedSchema>;
export declare const RecommendationServedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.served">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Position shown to user */
        displayPosition: z.ZodNumber;
        /** Display context */
        displayContext: z.ZodEnum<["home_feed", "post_activity", "search_results", "skill_page", "notification", "teacher_dashboard"]>;
        /** Time since recommendation created (ms) */
        latencyMs: z.ZodNumber;
        /** Client viewport size */
        viewportType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        servedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationServed = z.infer<typeof RecommendationServedSchema>;
export declare const RecommendationClickedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.clicked">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Time from serve to click (ms) */
        dwellTimeMs: z.ZodNumber;
        /** Was this the first interaction */
        firstInteraction: z.ZodBoolean;
        /** Click source */
        clickSource: z.ZodEnum<["tap", "keyboard", "voice", "auto_advance"]>;
        clickedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationClicked = z.infer<typeof RecommendationClickedSchema>;
export declare const RecommendationDismissedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.dismissed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** How it was dismissed */
        dismissMethod: z.ZodEnum<["swipe", "skip_button", "back_navigation", "timeout", "replaced"]>;
        /** Time from serve to dismiss (ms) */
        dwellTimeMs: z.ZodNumber;
        /** User provided reason */
        reason: z.ZodOptional<z.ZodEnum<["not_interested", "too_easy", "too_hard", "already_know", "wrong_subject", "not_now", "none_given"]>>;
        dismissedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationDismissed = z.infer<typeof RecommendationDismissedSchema>;
export declare const RecommendationFeedbackSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.feedback">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Explicit feedback type */
        feedbackType: z.ZodEnum<["thumbs_up", "thumbs_down", "star_rating", "completion_rating"]>;
        /** Rating value (1-5 for stars, 0-1 for binary) */
        ratingValue: z.ZodNumber;
        /** Time since activity started (ms) */
        timeSinceStartMs: z.ZodNumber;
        /** Activity outcome at feedback time */
        activityOutcome: z.ZodOptional<z.ZodEnum<["completed", "in_progress", "abandoned"]>>;
        /** Score if completed */
        activityScore: z.ZodOptional<z.ZodNumber>;
        feedbackAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationFeedback = z.infer<typeof RecommendationFeedbackSchema>;
export declare const RecommendationOutcomeSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.outcome">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Whether recommendation was accepted */
        wasAccepted: z.ZodBoolean;
        /** Activity completion status */
        completionStatus: z.ZodEnum<["not_started", "in_progress", "completed", "abandoned"]>;
        /** Time spent on activity (ms) */
        timeSpentMs: z.ZodOptional<z.ZodNumber>;
        /** Score achieved */
        score: z.ZodOptional<z.ZodNumber>;
        /** Engagement during activity */
        engagementScore: z.ZodOptional<z.ZodNumber>;
        /** Skill improvement observed */
        skillImprovement: z.ZodOptional<z.ZodNumber>;
        /** Label for model training (positive/negative outcome) */
        outcomeLabel: z.ZodEnum<["positive", "neutral", "negative"]>;
        recordedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type RecommendationOutcome = z.infer<typeof RecommendationOutcomeSchema>;
export declare const RecommendationEventSchema: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.created">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Type of recommendation */
        type: z.ZodEnum<["next_activity", "skill_practice", "review_content", "challenge_content", "remediation", "enrichment", "break_suggestion", "goal_suggestion"]>;
        /** Strategy used to generate */
        strategy: z.ZodEnum<["knowledge_tracing", "collaborative_filtering", "content_based", "skill_gap", "spaced_repetition", "engagement_optimized", "difficulty_adjusted", "goal_aligned", "teacher_assigned", "baseline"]>;
        /** Recommended content/activity ID */
        contentId: z.ZodString;
        /** Content type */
        contentType: z.ZodEnum<["activity", "lesson", "quiz", "video", "game", "reading"]>;
        /** Predicted relevance score (0-1) */
        relevanceScore: z.ZodNumber;
        /** Predicted difficulty match (0-1, 1 = perfect match) */
        difficultyMatch: z.ZodNumber;
        /** Predicted engagement score (0-1) */
        engagementPrediction: z.ZodNumber;
        /** Position in recommendation list */
        position: z.ZodNumber;
        /** Total recommendations in batch */
        batchSize: z.ZodNumber;
        /** Experiment variant if A/B testing */
        experimentVariant: z.ZodOptional<z.ZodString>;
        /** Explainability factors */
        factors: z.ZodObject<{
            /** Skill gap addressed */
            skillGap: z.ZodOptional<z.ZodNumber>;
            /** Recency factor (spaced repetition) */
            recency: z.ZodOptional<z.ZodNumber>;
            /** Similar learner success rate */
            peerSuccess: z.ZodOptional<z.ZodNumber>;
            /** Content quality rating */
            contentQuality: z.ZodOptional<z.ZodNumber>;
            /** Goal alignment score */
            goalAlignment: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }, {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        }>;
        /** Target skill IDs */
        targetSkillIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Grade band */
        gradeBand: z.ZodOptional<z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }, {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        type?: "next_activity" | "skill_practice" | "review_content" | "challenge_content" | "remediation" | "enrichment" | "break_suggestion" | "goal_suggestion";
        learnerId?: string;
        sessionId?: string;
        gradeBand?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K" | "10" | "11" | "12";
        contentId?: string;
        recommendationId?: string;
        strategy?: "knowledge_tracing" | "collaborative_filtering" | "content_based" | "skill_gap" | "spaced_repetition" | "engagement_optimized" | "difficulty_adjusted" | "goal_aligned" | "teacher_assigned" | "baseline";
        contentType?: "lesson" | "quiz" | "game" | "video" | "reading" | "activity";
        relevanceScore?: number;
        difficultyMatch?: number;
        engagementPrediction?: number;
        position?: number;
        batchSize?: number;
        experimentVariant?: string;
        factors?: {
            skillGap?: number;
            recency?: number;
            peerSuccess?: number;
            contentQuality?: number;
            goalAlignment?: number;
        };
        targetSkillIds?: string[];
        createdAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.created";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.served">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Position shown to user */
        displayPosition: z.ZodNumber;
        /** Display context */
        displayContext: z.ZodEnum<["home_feed", "post_activity", "search_results", "skill_page", "notification", "teacher_dashboard"]>;
        /** Time since recommendation created (ms) */
        latencyMs: z.ZodNumber;
        /** Client viewport size */
        viewportType: z.ZodOptional<z.ZodEnum<["mobile", "tablet", "desktop"]>>;
        servedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        displayPosition?: number;
        displayContext?: "home_feed" | "post_activity" | "search_results" | "skill_page" | "notification" | "teacher_dashboard";
        latencyMs?: number;
        viewportType?: "mobile" | "tablet" | "desktop";
        servedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.served";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.clicked">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Time from serve to click (ms) */
        dwellTimeMs: z.ZodNumber;
        /** Was this the first interaction */
        firstInteraction: z.ZodBoolean;
        /** Click source */
        clickSource: z.ZodEnum<["tap", "keyboard", "voice", "auto_advance"]>;
        clickedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        firstInteraction?: boolean;
        clickSource?: "tap" | "keyboard" | "voice" | "auto_advance";
        clickedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.clicked";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.dismissed">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** How it was dismissed */
        dismissMethod: z.ZodEnum<["swipe", "skip_button", "back_navigation", "timeout", "replaced"]>;
        /** Time from serve to dismiss (ms) */
        dwellTimeMs: z.ZodNumber;
        /** User provided reason */
        reason: z.ZodOptional<z.ZodEnum<["not_interested", "too_easy", "too_hard", "already_know", "wrong_subject", "not_now", "none_given"]>>;
        dismissedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }, {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        reason?: "not_interested" | "too_easy" | "too_hard" | "already_know" | "wrong_subject" | "not_now" | "none_given";
        sessionId?: string;
        recommendationId?: string;
        dwellTimeMs?: number;
        dismissMethod?: "timeout" | "swipe" | "skip_button" | "back_navigation" | "replaced";
        dismissedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.dismissed";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.feedback">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Explicit feedback type */
        feedbackType: z.ZodEnum<["thumbs_up", "thumbs_down", "star_rating", "completion_rating"]>;
        /** Rating value (1-5 for stars, 0-1 for binary) */
        ratingValue: z.ZodNumber;
        /** Time since activity started (ms) */
        timeSinceStartMs: z.ZodNumber;
        /** Activity outcome at feedback time */
        activityOutcome: z.ZodOptional<z.ZodEnum<["completed", "in_progress", "abandoned"]>>;
        /** Score if completed */
        activityScore: z.ZodOptional<z.ZodNumber>;
        feedbackAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        recommendationId?: string;
        feedbackType?: "thumbs_up" | "thumbs_down" | "star_rating" | "completion_rating";
        ratingValue?: number;
        timeSinceStartMs?: number;
        activityOutcome?: "completed" | "abandoned" | "in_progress";
        activityScore?: number;
        feedbackAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.feedback";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>, z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"recommendation.outcome">;
    eventVersion: z.ZodLiteral<"1.0.0">;
    payload: z.ZodObject<{
        recommendationId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodOptional<z.ZodString>;
        /** Whether recommendation was accepted */
        wasAccepted: z.ZodBoolean;
        /** Activity completion status */
        completionStatus: z.ZodEnum<["not_started", "in_progress", "completed", "abandoned"]>;
        /** Time spent on activity (ms) */
        timeSpentMs: z.ZodOptional<z.ZodNumber>;
        /** Score achieved */
        score: z.ZodOptional<z.ZodNumber>;
        /** Engagement during activity */
        engagementScore: z.ZodOptional<z.ZodNumber>;
        /** Skill improvement observed */
        skillImprovement: z.ZodOptional<z.ZodNumber>;
        /** Label for model training (positive/negative outcome) */
        outcomeLabel: z.ZodEnum<["positive", "neutral", "negative"]>;
        recordedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }, {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        learnerId?: string;
        sessionId?: string;
        score?: number;
        engagementScore?: number;
        timeSpentMs?: number;
        recommendationId?: string;
        wasAccepted?: boolean;
        completionStatus?: "completed" | "abandoned" | "in_progress" | "not_started";
        skillImprovement?: number;
        outcomeLabel?: "positive" | "negative" | "neutral";
        recordedAt?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "recommendation.outcome";
    eventVersion?: "1.0.0";
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>]>;
export type RecommendationEvent = z.infer<typeof RecommendationEventSchema>;
export declare const RECOMMENDATION_EVENT_TYPES: {
    readonly CREATED: "recommendation.created";
    readonly SERVED: "recommendation.served";
    readonly CLICKED: "recommendation.clicked";
    readonly DISMISSED: "recommendation.dismissed";
    readonly FEEDBACK: "recommendation.feedback";
    readonly OUTCOME: "recommendation.outcome";
};
//# sourceMappingURL=recommendation.d.ts.map