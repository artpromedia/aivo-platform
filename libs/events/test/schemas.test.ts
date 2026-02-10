import { describe, it, expect } from 'vitest';
import {
  BaseEventSchema,
  EventSourceSchema,
  EventEnvelopeSchema,
  GradeBandSchema,
  SessionOriginSchema,
  SessionTypeSchema,
  LearningSessionStartedSchema,
  LearningSessionEndedSchema,
  ActivityStartedSchema,
  ActivityCompletedSchema,
  SkillMasteryUpdatedSchema,
  EngagementMetricSchema,
  FocusPingSchema,
  FocusSampleSchema,
  FocusLossSchema,
  FocusSessionSummarySchema,
  HomeworkSessionStartedSchema,
  HomeworkSessionEndedSchema,
  HomeworkQuestionAskedSchema,
  HomeworkHintRequestedSchema,
  HomeworkHintDeliveredSchema,
  HomeworkSolutionAttemptedSchema,
  HomeworkQuestionCompletedSchema,
  RecommendationCreatedSchema,
  RecommendationServedSchema,
  RecommendationClickedSchema,
  RecommendationDismissedSchema,
  RecommendationFeedbackSchema,
  RecommendationOutcomeSchema,
  TransitionStartedSchema,
  TransitionCompletedSchema,
} from '../src/schemas/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

const UUID = '11111111-2222-3333-4444-555555555555';
const UUID2 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const UUID3 = 'cccccccc-dddd-eeee-ffff-000000000000';
const ISO_TS = '2026-02-09T10:00:00.000+00:00';

function baseFields(eventType: string) {
  return {
    eventId: UUID,
    tenantId: UUID,
    eventType,
    eventVersion: '1.0.0',
    timestamp: ISO_TS,
    source: { service: 'test-svc', version: '1.0.0' },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Event Source Schema', () => {
  it('parses valid source', () => {
    const result = EventSourceSchema.safeParse({
      service: 'session-svc',
      version: '1.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional instanceId', () => {
    const result = EventSourceSchema.safeParse({
      service: 'session-svc',
      version: '1.0.0',
      instanceId: 'node-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid version', () => {
    const result = EventSourceSchema.safeParse({
      service: 'svc',
      version: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty service', () => {
    const result = EventSourceSchema.safeParse({
      service: '',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });
});

describe('Base Event Schema', () => {
  it('parses valid base event', () => {
    const result = BaseEventSchema.safeParse({
      ...baseFields('learning.session.started'),
      payload: { anything: true },
    });
    // BaseEventSchema does not include payload, so let's test without it
    const result2 = BaseEventSchema.safeParse(baseFields('learning.session.started'));
    expect(result2.success).toBe(true);
  });

  it('rejects missing tenantId', () => {
    const { tenantId, ...rest } = baseFields('test.event');
    const result = BaseEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid tenantId', () => {
    const result = BaseEventSchema.safeParse({
      ...baseFields('test.event'),
      tenantId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid eventType format', () => {
    const result = BaseEventSchema.safeParse({
      ...baseFields('test.event'),
      eventType: 'invalid event type!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid eventVersion', () => {
    const result = BaseEventSchema.safeParse({
      ...baseFields('test.event'),
      eventVersion: 'v1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = BaseEventSchema.safeParse({
      ...baseFields('test.event'),
      correlationId: UUID2,
      causationId: UUID3,
      metadata: { key: 'value' },
    });
    expect(result.success).toBe(true);
  });
});

describe('Common Enums', () => {
  it('GradeBandSchema accepts valid grades', () => {
    for (const grade of ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']) {
      expect(GradeBandSchema.safeParse(grade).success).toBe(true);
    }
  });

  it('GradeBandSchema rejects invalid grades', () => {
    expect(GradeBandSchema.safeParse('13').success).toBe(false);
    expect(GradeBandSchema.safeParse('').success).toBe(false);
  });

  it('SessionOriginSchema accepts valid origins', () => {
    expect(SessionOriginSchema.safeParse('MOBILE_LEARNER').success).toBe(true);
    expect(SessionOriginSchema.safeParse('WEB_TEACHER').success).toBe(true);
  });

  it('SessionTypeSchema accepts valid types', () => {
    expect(SessionTypeSchema.safeParse('LEARNING').success).toBe(true);
    expect(SessionTypeSchema.safeParse('HOMEWORK').success).toBe(true);
    expect(SessionTypeSchema.safeParse('ASSESSMENT').success).toBe(true);
  });
});

describe('Learning Schemas', () => {
  it('LearningSessionStartedSchema parses valid event', () => {
    const result = LearningSessionStartedSchema.safeParse({
      ...baseFields('learning.session.started'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
        gradeBand: '3',
        startedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('LearningSessionStartedSchema rejects wrong eventType', () => {
    const result = LearningSessionStartedSchema.safeParse({
      ...baseFields('learning.session.ended'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
        gradeBand: '3',
        startedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(false);
  });

  it('LearningSessionEndedSchema parses valid event', () => {
    const result = LearningSessionEndedSchema.safeParse({
      ...baseFields('learning.session.ended'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        durationMs: 60000,
        endReason: 'completed',
        summary: {
          activitiesStarted: 3,
          activitiesCompleted: 2,
          correctAnswers: 10,
          incorrectAnswers: 2,
          hintsUsed: 1,
        },
        endedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('ActivityStartedSchema parses valid event', () => {
    const result = ActivityStartedSchema.safeParse({
      ...baseFields('learning.activity.started'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        activityId: UUID,
        activityType: 'lesson',
        contentId: UUID,
        sequenceNumber: 1,
        startedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('ActivityCompletedSchema parses valid event', () => {
    const result = ActivityCompletedSchema.safeParse({
      ...baseFields('learning.activity.completed'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        activityId: UUID,
        durationMs: 30000,
        outcome: 'completed',
        completedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('SkillMasteryUpdatedSchema parses valid event', () => {
    const result = SkillMasteryUpdatedSchema.safeParse({
      ...baseFields('learning.skill.mastery_updated'),
      payload: {
        learnerId: UUID3,
        skillId: UUID,
        skillName: 'Addition',
        previousLevel: 0.5,
        newLevel: 0.7,
        delta: 0.2,
        reason: 'activity_completion',
        evidenceCount: 5,
      },
    });
    expect(result.success).toBe(true);
  });

  it('EngagementMetricSchema parses valid event', () => {
    const result = EngagementMetricSchema.safeParse({
      ...baseFields('learning.engagement.metric'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        windowMs: 60000,
        engagementScore: 85,
        sampledAt: ISO_TS,
        components: {
          interactionRate: 10,
          onTaskRatio: 0.9,
          responsiveness: 0.8,
          persistence: 0.7,
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Focus Schemas', () => {
  it('FocusPingSchema parses valid event', () => {
    const result = FocusPingSchema.safeParse({
      ...baseFields('focus.ping'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        idleMs: 500,
        appInBackground: false,
        sequence: 1,
      },
    });
    expect(result.success).toBe(true);
  });

  it('FocusSampleSchema parses valid event', () => {
    const result = FocusSampleSchema.safeParse({
      ...baseFields('focus.sample'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        windowMs: 60000,
        pingCount: 12,
        avgIdleMs: 200,
        maxIdleMs: 1000,
        backgroundMs: 0,
        focusScore: 95,
        trend: 0.5,
        windowStart: ISO_TS,
        windowEnd: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('FocusLossSchema parses valid event', () => {
    const result = FocusLossSchema.safeParse({
      ...baseFields('focus.loss'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        reason: 'extended_idle',
        focusScore: 30,
        lowFocusDurationMs: 120000,
        detectedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('FocusSessionSummarySchema parses valid event', () => {
    const result = FocusSessionSummarySchema.safeParse({
      ...baseFields('focus.session.summary'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        sessionDurationMs: 1800000,
        totalPings: 360,
        avgFocusScore: 75,
        minFocusScore: 20,
        maxFocusScore: 100,
        focusScoreStdDev: 12.5,
        focusLossCount: 3,
        lowFocusMs: 120000,
        backgroundMs: 10000,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Homework Schemas', () => {
  it('HomeworkSessionStartedSchema parses valid event', () => {
    const result = HomeworkSessionStartedSchema.safeParse({
      ...baseFields('homework.session.started'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        origin: 'MOBILE_LEARNER',
        gradeBand: '5',
        startedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkSessionEndedSchema parses valid event', () => {
    const result = HomeworkSessionEndedSchema.safeParse({
      ...baseFields('homework.session.ended'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        durationMs: 45000,
        outcome: 'completed',
        summary: {
          questionsAsked: 5,
          hintsRequested: 2,
          solutionsViewed: 1,
          questionsCompleted: 4,
          avgTimePerQuestion: 9000,
        },
        endedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkQuestionAskedSchema parses valid event', () => {
    const result = HomeworkQuestionAskedSchema.safeParse({
      ...baseFields('homework.question.asked'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        questionId: UUID,
        questionType: 'free_response',
        subject: 'math',
        gradeBand: '5',
        hasImage: false,
        isVoiceInput: false,
        sequenceNumber: 1,
        askedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkHintRequestedSchema parses valid event', () => {
    const result = HomeworkHintRequestedSchema.safeParse({
      ...baseFields('homework.hint.requested'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        questionId: UUID,
        hintLevel: 1,
        timeSinceQuestionMs: 30000,
        attemptsBefore: 2,
        autoSuggested: false,
        requestedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkHintDeliveredSchema parses valid event', () => {
    const result = HomeworkHintDeliveredSchema.safeParse({
      ...baseFields('homework.hint.delivered'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        questionId: UUID,
        hintId: 'hint-1',
        hintLevel: 1,
        hintType: 'conceptual',
        generationLatencyMs: 500,
        deliveredAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkSolutionAttemptedSchema parses valid event', () => {
    const result = HomeworkSolutionAttemptedSchema.safeParse({
      ...baseFields('homework.solution.attempted'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        questionId: UUID,
        attemptNumber: 1,
        isCorrect: true,
        timeSpentMs: 15000,
        hintsUsed: 0,
        attemptedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('HomeworkQuestionCompletedSchema parses valid event', () => {
    const result = HomeworkQuestionCompletedSchema.safeParse({
      ...baseFields('homework.question.completed'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        questionId: UUID,
        totalTimeMs: 45000,
        totalAttempts: 2,
        totalHints: 1,
        outcome: 'correct',
        solutionViewed: false,
        completedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Recommendation Schemas', () => {
  it('RecommendationCreatedSchema parses valid event', () => {
    const result = RecommendationCreatedSchema.safeParse({
      ...baseFields('recommendation.created'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        type: 'next_activity',
        strategy: 'collaborative_filtering',
        contentId: UUID,
        contentType: 'lesson',
        relevanceScore: 0.9,
        difficultyMatch: 0.8,
        engagementPrediction: 0.7,
        position: 1,
        batchSize: 5,
        factors: {},
        createdAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('RecommendationServedSchema parses valid event', () => {
    const result = RecommendationServedSchema.safeParse({
      ...baseFields('recommendation.served'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        displayPosition: 1,
        displayContext: 'home_feed',
        latencyMs: 150,
        servedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('RecommendationClickedSchema parses valid event', () => {
    const result = RecommendationClickedSchema.safeParse({
      ...baseFields('recommendation.clicked'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        dwellTimeMs: 5000,
        firstInteraction: true,
        clickSource: 'tap',
        clickedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('RecommendationDismissedSchema parses valid event', () => {
    const result = RecommendationDismissedSchema.safeParse({
      ...baseFields('recommendation.dismissed'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        dismissMethod: 'swipe',
        dwellTimeMs: 2000,
        dismissedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('RecommendationFeedbackSchema parses valid event', () => {
    const result = RecommendationFeedbackSchema.safeParse({
      ...baseFields('recommendation.feedback'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        feedbackType: 'thumbs_up',
        ratingValue: 4,
        timeSinceStartMs: 60000,
        feedbackAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('RecommendationOutcomeSchema parses valid event', () => {
    const result = RecommendationOutcomeSchema.safeParse({
      ...baseFields('recommendation.outcome'),
      payload: {
        recommendationId: UUID2,
        learnerId: UUID3,
        wasAccepted: true,
        completionStatus: 'completed',
        outcomeLabel: 'positive',
        recordedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Transition Schemas', () => {
  it('TransitionStartedSchema parses valid event', () => {
    const result = TransitionStartedSchema.safeParse({
      ...baseFields('transition.started'),
      payload: {
        transitionId: UUID2,
        sessionId: UUID3,
        learnerId: UUID,
        toActivity: { id: UUID, title: 'Math Lesson', type: 'lesson' },
        plan: {
          totalDuration: 120,
          warningIntervals: [60, 30, 10],
          visualStyle: 'gentle',
          colorScheme: 'blue',
          enableAudio: true,
          enableHaptic: false,
          hasRoutine: true,
          hasFirstThenBoard: false,
        },
        scheduledAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });

  it('TransitionCompletedSchema parses valid event', () => {
    const result = TransitionCompletedSchema.safeParse({
      ...baseFields('transition.completed'),
      payload: {
        transitionId: UUID2,
        sessionId: UUID3,
        learnerId: UUID,
        fromActivityId: UUID,
        toActivityId: UUID2,
        outcome: 'smooth',
        plannedDuration: 30,
        actualDuration: 28,
        warningsDelivered: 2,
        warningsAcknowledged: 2,
        routineStepsCompleted: 3,
        routineStepsTotal: 3,
        learnerInteractions: 5,
        completedAt: ISO_TS,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Schema validation rejects invalid data', () => {
  it('rejects payload missing required fields', () => {
    const result = LearningSessionStartedSchema.safeParse({
      ...baseFields('learning.session.started'),
      payload: {
        sessionId: UUID2,
        // missing learnerId, sessionType, origin, gradeBand, startedAt
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects payload with invalid types', () => {
    const result = FocusPingSchema.safeParse({
      ...baseFields('focus.ping'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        idleMs: 'not-a-number', // should be number
        appInBackground: false,
        sequence: 1,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range values', () => {
    const result = EngagementMetricSchema.safeParse({
      ...baseFields('learning.engagement.metric'),
      payload: {
        sessionId: UUID2,
        learnerId: UUID3,
        windowMs: 60000,
        engagementScore: 150, // max 100
        sampledAt: ISO_TS,
        components: {
          interactionRate: 10,
          onTaskRatio: 0.9,
          responsiveness: 0.8,
          persistence: 0.7,
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
