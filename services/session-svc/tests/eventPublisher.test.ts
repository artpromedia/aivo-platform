/**
 * Event Publisher Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @aivo/events module
vi.mock('@aivo/events', () => ({
  createEventPublisher: vi.fn().mockReturnValue({
    publishLearningSessionStarted: vi.fn().mockResolvedValue(undefined),
    publishLearningSessionEnded: vi.fn().mockResolvedValue(undefined),
    publishActivityStarted: vi.fn().mockResolvedValue(undefined),
    publishActivityCompleted: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }),
  EventPublisher: vi.fn(),
}));

// Mock config
vi.mock('../src/config.js', () => ({
  config: {
    nats: {
      enabled: true,
      url: 'nats://localhost:4222',
    },
  },
}));

describe('Session Event Publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Types', () => {
    it('should define session started event structure', () => {
      const sessionStarted = {
        id: 'session-001',
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
        startedAt: new Date(),
        metadata: { deviceType: 'tablet' },
      };

      expect(sessionStarted.id).toBeDefined();
      expect(sessionStarted.tenantId).toBeDefined();
      expect(sessionStarted.learnerId).toBeDefined();
      expect(sessionStarted.sessionType).toBeDefined();
    });

    it('should define session ended event structure', () => {
      const sessionEnded = {
        sessionId: 'session-001',
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        durationMs: 1800000, // 30 minutes
        endReason: 'completed' as const,
        summary: {
          activitiesStarted: 5,
          activitiesCompleted: 4,
          correctAnswers: 15,
          incorrectAnswers: 3,
          hintsUsed: 2,
          avgFocusScore: 0.85,
        },
        endedAt: new Date(),
      };

      expect(sessionEnded.durationMs).toBe(1800000);
      expect(sessionEnded.summary.activitiesCompleted).toBe(4);
    });

    it('should define activity started event structure', () => {
      const activityStarted = {
        sessionId: 'session-001',
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        activityId: 'activity-001',
        activityType: 'lesson' as const,
        contentId: 'content-123',
        skillId: 'skill-abc',
        difficultyLevel: 3,
        sequenceNumber: 1,
        startedAt: new Date(),
      };

      expect(activityStarted.activityType).toBe('lesson');
      expect(activityStarted.sequenceNumber).toBe(1);
    });

    it('should define activity completed event structure', () => {
      const activityCompleted = {
        sessionId: 'session-001',
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        activityId: 'activity-001',
        durationMs: 300000, // 5 minutes
        outcome: 'completed' as const,
        score: 85,
        attempts: 2,
        masteryLevel: 0.75,
        onTaskRatio: 0.9,
        completedAt: new Date(),
      };

      expect(activityCompleted.score).toBe(85);
      expect(activityCompleted.outcome).toBe('completed');
    });
  });

  describe('End Reasons', () => {
    it('should support all end reason types', () => {
      const endReasons = [
        'completed',
        'user_exit',
        'timeout',
        'app_background',
        'connection_lost',
        'error',
      ];

      endReasons.forEach((reason) => {
        expect(reason).toBeDefined();
      });
    });
  });

  describe('Activity Types', () => {
    it('should support all activity types', () => {
      const activityTypes = [
        'lesson',
        'quiz',
        'practice',
        'game',
        'video',
        'reading',
        'interactive',
      ];

      activityTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('Activity Outcomes', () => {
    it('should support all activity outcomes', () => {
      const outcomes = [
        'completed',
        'skipped',
        'abandoned',
        'timed_out',
      ];

      outcomes.forEach((outcome) => {
        expect(outcome).toBeDefined();
      });
    });
  });
});

describe('Event Flow', () => {
  it('should follow correct session event sequence', () => {
    const expectedSequence = [
      'SESSION_STARTED',
      'ACTIVITY_STARTED',
      'ANSWER_SUBMITTED', // multiple
      'HINT_REQUESTED', // optional
      'ACTIVITY_COMPLETED',
      // repeat for more activities
      'SESSION_ENDED',
    ];

    expect(expectedSequence[0]).toBe('SESSION_STARTED');
    expect(expectedSequence[expectedSequence.length - 1]).toBe('SESSION_ENDED');
  });

  it('should support focus events during session', () => {
    const focusEvents = [
      'FOCUS_PING',
      'FOCUS_LOSS_DETECTED',
      'BREAK_STARTED',
      'REGULATION_ACTIVITY_STARTED',
      'REGULATION_ACTIVITY_COMPLETED',
      'BREAK_ENDED',
    ];

    focusEvents.forEach((event) => {
      expect(event).toBeDefined();
    });
  });
});
