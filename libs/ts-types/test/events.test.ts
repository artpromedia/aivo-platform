import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  // Base schemas and types
  BaseEventSchema,
  EventSourceSchema,
  createEventSchema,

  // Learning events
  ActivityCompletedEventSchema,
  AnswerSubmittedEventSchema,
  SessionStartedEventSchema,
  SessionCompletedEventSchema,
  type ActivityCompletedEvent,

  // Focus events
  FocusLossDetectedEventSchema,
  FocusInterventionTriggeredEventSchema,
  FocusInterventionCompletedEventSchema,
  type FocusLossDetectedEvent,

  // Recommendation events
  RecommendationCreatedEventSchema,
  RecommendationRespondedEventSchema,
  RecommendationAppliedEventSchema,
  type RecommendationCreatedEvent,

  // Homework events
  HomeworkTaskCreatedEventSchema,
  HomeworkTaskStartedEventSchema,
  HomeworkTaskCompletedEventSchema,
  HomeworkStepCompletedEventSchema,
  HomeworkHintRequestedEventSchema,
  type HomeworkTaskCreatedEvent,

  // Validation utilities
  safeValidateEvent,
  createEvent,
  requireTenantId,
  isTenantScopedEvent,
  isBaseEvent,
  extractTenantId,
  MissingTenantIdError,
} from '../src/events';

// Helper to generate valid CUID for tests
const validCuid = 'cjld2cjxh0000qzrmn831i7rn';
const validCuid2 = 'cjld2cyuq0000t3rmniod1foy';

describe('Event Schemas', () => {
  describe('BaseEventSchema', () => {
    it('should require tenantId', () => {
      const eventWithoutTenant = {
        eventId: randomUUID(),
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      const result = BaseEventSchema.safeParse(eventWithoutTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('tenantId'))).toBe(true);
      }
    });

    it('should validate tenantId is a valid CUID format', () => {
      const eventWithInvalidTenant = {
        eventId: randomUUID(),
        tenantId: 'not-a-valid-cuid',
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      const result = BaseEventSchema.safeParse(eventWithInvalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('tenantId'))).toBe(true);
      }
    });

    it('should accept valid base event', () => {
      const validEvent = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      const result = BaseEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should accept optional correlationId and causationId', () => {
      const eventWithCorrelation = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        correlationId: randomUUID(),
        causationId: randomUUID(),
      };

      const result = BaseEventSchema.safeParse(eventWithCorrelation);
      expect(result.success).toBe(true);
    });

    it('should require eventId to be a valid UUID', () => {
      const eventWithInvalidEventId = {
        eventId: 'not-a-uuid',
        tenantId: validCuid,
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      const result = BaseEventSchema.safeParse(eventWithInvalidEventId);
      expect(result.success).toBe(false);
    });
  });

  describe('EventSourceSchema', () => {
    it('should require service name', () => {
      const result = EventSourceSchema.safeParse({ version: '1.0.0' });
      expect(result.success).toBe(false);
    });

    it('should require version', () => {
      const result = EventSourceSchema.safeParse({ service: 'test' });
      expect(result.success).toBe(false);
    });

    it('should accept valid source', () => {
      const source = {
        service: 'test',
        version: '1.0.0',
      };
      const result = EventSourceSchema.safeParse(source);
      expect(result.success).toBe(true);
    });
  });

  describe('createEventSchema', () => {
    it('should create schema that extends BaseEventSchema', async () => {
      const { z } = await import('zod');
      const CustomEventSchema = createEventSchema(
        'custom.event',
        z.object({
          customField: z.string(),
        })
      );

      const validEvent = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'custom.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: { customField: 'test' },
      };

      const result = CustomEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should reject events without tenantId', async () => {
      const { z } = await import('zod');
      const CustomEventSchema = createEventSchema(
        'custom.event',
        z.object({
          customField: z.string(),
        })
      );

      const eventWithoutTenant = {
        eventId: randomUUID(),
        eventType: 'custom.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: { customField: 'test' },
      };

      const result = CustomEventSchema.safeParse(eventWithoutTenant);
      expect(result.success).toBe(false);
    });
  });
});

describe('Learning Events', () => {
  describe('ActivityCompletedEventSchema', () => {
    it('should validate complete activity event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.activity.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'learning-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          correct: true,
          score: 85,
          latencyMs: 12000,
          accommodationsActive: [],
        },
      };

      const result = ActivityCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should require tenantId for activity completed event', () => {
      const event = {
        eventId: randomUUID(),
        eventType: 'learning.activity.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          latencyMs: 12000,
        },
      };

      const result = ActivityCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should validate score is between 0 and 100', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.activity.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          score: 150, // Invalid score
          latencyMs: 12000,
        },
      };

      const result = ActivityCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('AnswerSubmittedEventSchema', () => {
    it('should validate answer submitted event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.answer.submitted',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'learning-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          questionId: validCuid,
          answerValue: 'Paris',
          correct: true,
          latencyMs: 5000,
          attemptNumber: 1,
        },
      };

      const result = AnswerSubmittedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate attemptNumber is positive', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.answer.submitted',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          questionId: validCuid,
          answerValue: 'test',
          correct: true,
          latencyMs: 5000,
          attemptNumber: 0, // Invalid - must be positive
        },
      };

      const result = AnswerSubmittedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('SessionStartedEventSchema', () => {
    it('should validate session started event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.session.started',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'session-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          sessionType: 'LESSON',
          plannedActivities: [validCuid],
          plannedDurationMinutes: 30,
        },
      };

      const result = SessionStartedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionCompletedEventSchema', () => {
    it('should validate session completed event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.session.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'session-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          actualDurationMinutes: 28.5,
          activitiesCompleted: 5,
          activitiesSkipped: 1,
          averageScore: 82.5,
          endReason: 'COMPLETED',
        },
      };

      const result = SessionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});

describe('Focus Events', () => {
  describe('FocusLossDetectedEventSchema', () => {
    it('should validate focus loss event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'focus.loss.detected',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'focus-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          signal: 'IDLE_DETECTED',
          confidence: 0.85,
          secondsSinceLastInteraction: 65,
        },
      };

      const result = FocusLossDetectedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should require tenantId for focus loss event', () => {
      const event = {
        eventId: randomUUID(),
        eventType: 'focus.loss.detected',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'focus-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          signal: 'IDLE_DETECTED',
          confidence: 0.85,
        },
      };

      const result = FocusLossDetectedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should validate confidence score is between 0 and 1', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'focus.loss.detected',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'focus-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          signal: 'IDLE_DETECTED',
          confidence: 1.5, // Invalid - must be <= 1
        },
      };

      const result = FocusLossDetectedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('FocusInterventionTriggeredEventSchema', () => {
    it('should validate intervention triggered event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'focus.intervention.triggered',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'focus-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          interventionType: 'BREAK_SUGGESTION',
          triggerSignal: 'IDLE_DETECTED',
          triggerEventId: randomUUID(),
        },
      };

      const result = FocusInterventionTriggeredEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('FocusInterventionCompletedEventSchema', () => {
    it('should validate intervention completed event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'focus.intervention.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'focus-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          interventionEventId: randomUUID(),
          outcome: 'COMPLETED',
          durationSeconds: 30,
          resumedActivity: true,
        },
      };

      const result = FocusInterventionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});

describe('Recommendation Events', () => {
  describe('RecommendationCreatedEventSchema', () => {
    it('should validate recommendation created event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'recommendation.created',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'ai-orchestrator', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          recommendationId: validCuid2,
          type: 'DECREASE_DIFFICULTY',
          payload: {
            subject: 'MATH',
            fromLevel: 'L3',
            toLevel: 'L2',
            reason: 'Based on recent performance struggles',
            confidence: 0.9,
          },
          requiresApproval: true,
          approverRole: 'PARENT',
        },
      };

      const result = RecommendationCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should require tenantId for recommendation event', () => {
      const event = {
        eventId: randomUUID(),
        eventType: 'recommendation.created',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'ai-orchestrator', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          recommendationId: validCuid2,
          type: 'DECREASE_DIFFICULTY',
          payload: {
            reason: 'Test reason',
            confidence: 0.9,
          },
          requiresApproval: false,
        },
      };

      const result = RecommendationCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('RecommendationRespondedEventSchema', () => {
    it('should validate recommendation responded event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'recommendation.responded',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'learning-svc', version: '1.0.0' },
        payload: {
          recommendationId: validCuid2,
          learnerId: validCuid,
          response: 'ACCEPTED',
          respondedByUserId: validCuid,
          respondedByRole: 'PARENT',
        },
      };

      const result = RecommendationRespondedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate response is valid enum value', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'recommendation.responded',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'learning-svc', version: '1.0.0' },
        payload: {
          recommendationId: validCuid2,
          learnerId: validCuid,
          response: 'invalid_response', // Invalid enum value
          respondedByUserId: validCuid,
          respondedByRole: 'PARENT',
        },
      };

      const result = RecommendationRespondedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('RecommendationAppliedEventSchema', () => {
    it('should validate recommendation applied event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'recommendation.applied',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'learning-svc', version: '1.0.0' },
        payload: {
          recommendationId: validCuid2,
          learnerId: validCuid,
          type: 'DECREASE_DIFFICULTY',
          appliedAt: new Date().toISOString(),
          autoApplied: false,
          approvedByUserId: validCuid,
        },
      };

      const result = RecommendationAppliedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});

describe('Homework Events', () => {
  describe('HomeworkTaskCreatedEventSchema', () => {
    it('should validate homework task created event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.task.created',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          subject: 'Mathematics',
          sourceType: 'UPLOAD',
          totalSteps: 5,
        },
      };

      const result = HomeworkTaskCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should require tenantId for homework task created', () => {
      const event = {
        eventId: randomUUID(),
        eventType: 'homework.task.created',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          subject: 'Mathematics',
          sourceType: 'UPLOAD',
          totalSteps: 5,
        },
      };

      const result = HomeworkTaskCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('HomeworkTaskStartedEventSchema', () => {
    it('should validate homework task started event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.task.started',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          sessionId: validCuid,
        },
      };

      const result = HomeworkTaskStartedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('HomeworkTaskCompletedEventSchema', () => {
    it('should validate homework task completed event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.task.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          status: 'COMPLETED',
          stepsCompleted: 5,
          totalTimeSeconds: 1800,
          totalHintsUsed: 2,
        },
      };

      const result = HomeworkTaskCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('HomeworkStepCompletedEventSchema', () => {
    it('should validate homework step completed event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.step.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          stepIndex: 2, // 0-based index
          hintsRequested: 1,
          timeSpentSeconds: 300,
          selfReportedUnderstanding: 'OK',
        },
      };

      const result = HomeworkStepCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate stepIndex is non-negative', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.step.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          stepIndex: -1, // Invalid - must be >= 0
          hintsRequested: 0,
          timeSpentSeconds: 300,
        },
      };

      const result = HomeworkStepCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('HomeworkHintRequestedEventSchema', () => {
    it('should validate homework hint requested event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'homework.hint.requested',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'homework-helper-svc', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          taskId: validCuid2,
          stepIndex: 1,
          hintNumber: 1, // first hint
          timeBeforeHintSeconds: 120,
        },
      };

      const result = HomeworkHintRequestedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});

describe('Validation Utilities', () => {
  describe('safeValidateEvent', () => {
    it('should return valid result for correct event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'learning.activity.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          latencyMs: 12000,
        },
      };

      const result = safeValidateEvent(ActivityCompletedEventSchema, event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenantId).toBe(validCuid);
      }
    });

    it('should return error for invalid event', () => {
      const event = {
        eventId: randomUUID(),
        // Missing tenantId
        eventType: 'learning.activity.completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          latencyMs: 12000,
        },
      };

      const result = safeValidateEvent(ActivityCompletedEventSchema, event);
      expect(result.success).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('should auto-generate eventId and timestamp', () => {
      const event = createEvent(ActivityCompletedEventSchema, {
        tenantId: validCuid,
        eventType: 'learning.activity.completed',
        payload: {
          learnerId: validCuid,
          sessionId: validCuid2,
          activityId: validCuid,
          subject: 'MATH',
          activityType: 'multiple-choice',
          difficulty: 'L1',
          latencyMs: 12000,
        },
      });

      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.tenantId).toBe(validCuid);
      expect(event.source).toBeDefined();
      expect(event.eventVersion).toBe('1.0');
    });
  });

  describe('requireTenantId', () => {
    it('should not throw for event with tenantId', () => {
      const event = {
        tenantId: validCuid,
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(() => requireTenantId(event)).not.toThrow();
    });

    it('should throw MissingTenantIdError for event without tenantId', () => {
      const event = {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(() => requireTenantId(event)).toThrow(MissingTenantIdError);
    });

    it('should throw MissingTenantIdError for null tenantId', () => {
      const event = {
        tenantId: null,
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(() => requireTenantId(event)).toThrow(MissingTenantIdError);
    });

    it('should throw MissingTenantIdError for empty string tenantId', () => {
      const event = {
        tenantId: '',
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(() => requireTenantId(event)).toThrow(MissingTenantIdError);
    });
  });

  describe('isTenantScopedEvent', () => {
    it('should return true for event with valid tenantId', () => {
      const event = {
        tenantId: validCuid,
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(isTenantScopedEvent(event)).toBe(true);
    });

    it('should return false for event without tenantId', () => {
      const event = {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(isTenantScopedEvent(event)).toBe(false);
    });

    it('should return false for event with null tenantId', () => {
      const event = {
        tenantId: null,
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(isTenantScopedEvent(event)).toBe(false);
    });

    it('should return false for event with empty string tenantId', () => {
      const event = {
        tenantId: '',
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
      };

      expect(isTenantScopedEvent(event)).toBe(false);
    });
  });

  describe('isBaseEvent', () => {
    it('should return true for valid base event', () => {
      const event = {
        eventId: randomUUID(),
        tenantId: validCuid,
        eventType: 'test.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      expect(isBaseEvent(event)).toBe(true);
    });

    it('should return false for event missing required fields', () => {
      const event = {
        eventId: randomUUID(),
        // Missing tenantId
        eventType: 'test.event',
        timestamp: new Date().toISOString(),
      };

      expect(isBaseEvent(event)).toBe(false);
    });
  });

  describe('extractTenantId', () => {
    it('should extract tenantId from valid event', () => {
      const event = {
        tenantId: validCuid,
        eventId: randomUUID(),
      };

      expect(extractTenantId(event)).toBe(validCuid);
    });

    it('should return undefined for event without tenantId', () => {
      const event = {
        eventId: randomUUID(),
      };

      expect(extractTenantId(event)).toBeUndefined();
    });
  });

  describe('MissingTenantIdError', () => {
    it('should be instance of Error', () => {
      const error = new MissingTenantIdError();
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new MissingTenantIdError();
      expect(error.name).toBe('MissingTenantIdError');
    });

    it('should have default message', () => {
      const error = new MissingTenantIdError();
      expect(error.message).toBe('Event must include tenantId for multi-tenant isolation');
    });

    it('should include event type in message when provided', () => {
      const error = new MissingTenantIdError('learning.activity.completed');
      expect(error.message).toContain('learning.activity.completed');
      expect(error.message).toContain('tenantId');
    });
  });
});

describe('Type Inference', () => {
  it('should correctly infer ActivityCompletedEvent type', () => {
    const event: ActivityCompletedEvent = {
      eventId: randomUUID(),
      tenantId: validCuid,
      eventType: 'learning.activity.completed',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'test', version: '1.0.0' },
      payload: {
        learnerId: validCuid,
        sessionId: validCuid2,
        activityId: validCuid,
        subject: 'MATH',
        activityType: 'multiple-choice',
        difficulty: 'L1',
        latencyMs: 12000,
      },
    };

    expect(event.tenantId).toBe(validCuid);
    expect(event.eventType).toBe('learning.activity.completed');
  });

  it('should correctly infer FocusLossDetectedEvent type', () => {
    const event: FocusLossDetectedEvent = {
      eventId: randomUUID(),
      tenantId: validCuid,
      eventType: 'focus.loss.detected',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'focus-svc', version: '1.0.0' },
      payload: {
        learnerId: validCuid,
        sessionId: validCuid2,
        signal: 'IDLE_DETECTED',
        confidence: 0.85,
      },
    };

    expect(event.tenantId).toBe(validCuid);
    expect(event.eventType).toBe('focus.loss.detected');
  });

  it('should correctly infer RecommendationCreatedEvent type', () => {
    const event: RecommendationCreatedEvent = {
      eventId: randomUUID(),
      tenantId: validCuid,
      eventType: 'recommendation.created',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'ai-orchestrator', version: '1.0.0' },
      payload: {
        learnerId: validCuid,
        recommendationId: validCuid2,
        type: 'DECREASE_DIFFICULTY',
        payload: {
          reason: 'Test reason',
          confidence: 0.9,
        },
        requiresApproval: false,
      },
    };

    expect(event.tenantId).toBe(validCuid);
    expect(event.eventType).toBe('recommendation.created');
  });

  it('should correctly infer HomeworkTaskCreatedEvent type', () => {
    const event: HomeworkTaskCreatedEvent = {
      eventId: randomUUID(),
      tenantId: validCuid,
      eventType: 'homework.task.created',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'homework-helper-svc', version: '1.0.0' },
      payload: {
        learnerId: validCuid,
        taskId: validCuid2,
        subject: 'Mathematics',
        sourceType: 'UPLOAD',
        totalSteps: 5,
      },
    };

    expect(event.tenantId).toBe(validCuid);
    expect(event.eventType).toBe('homework.task.created');
  });
});
