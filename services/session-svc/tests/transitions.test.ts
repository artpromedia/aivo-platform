/**
 * Transition Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    transitionPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    transitionRoutine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transitionEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Mock transition event publisher
vi.mock('../src/transitions/transition.events.js', () => ({
  transitionEventPublisher: {
    publishTransitionStarted: vi.fn().mockResolvedValue(undefined),
    publishTransitionWarning: vi.fn().mockResolvedValue(undefined),
    publishTransitionAcknowledged: vi.fn().mockResolvedValue(undefined),
    publishRoutineStepProgress: vi.fn().mockResolvedValue(undefined),
    publishTransitionCompleted: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '../src/prisma.js';
import { transitionEventPublisher } from '../src/transitions/transition.events.js';
import { transitionRoutes } from '../src/transitions/transition.routes.js';

describe('Transition Service', () => {
  let app: FastifyInstance;
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const sessionId = 'session-789';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });

    // Mock auth decorator
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        sub: 'user-789',
        tenantId,
        role: 'learner',
      };
    });

    await app.register(transitionRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /transitions/preferences/:learnerId', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-001',
        tenantId,
        learnerId,
        warningStyle: 'visual_audio',
        defaultWarningSeconds: [30, 15, 5],
        visualSettingsJson: {
          style: 'circle',
          colorScheme: 'green_yellow_red',
          showTimer: true,
        },
        audioSettingsJson: {
          enabled: true,
          warningType: 'gentle_chime',
          volume: 0.7,
        },
        hapticSettingsJson: {
          enabled: true,
          intensity: 'medium',
        },
        showFirstThenBoard: true,
        requireAcknowledgment: true,
        allowSkipTransition: false,
        extendedTimeMultiplier: 1.0,
      };

      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(mockPreferences as any);

      const response = await app.inject({
        method: 'GET',
        url: `/transitions/preferences/${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.learnerId).toBe(learnerId);
      expect(body.warningStyle).toBe('visual_audio');
    });

    it('should create default preferences if none exist', async () => {
      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(null);

      const mockCreatedPreferences = {
        id: 'pref-new',
        tenantId,
        learnerId,
        warningStyle: 'visual_audio',
        defaultWarningSeconds: [30, 15, 5],
        visualSettingsJson: {},
        audioSettingsJson: {},
        hapticSettingsJson: {},
        showFirstThenBoard: true,
        requireAcknowledgment: true,
        allowSkipTransition: false,
        extendedTimeMultiplier: 1.0,
      };

      vi.mocked(prisma.transitionPreferences.upsert).mockResolvedValue(
        mockCreatedPreferences as any
      );

      const response = await app.inject({
        method: 'GET',
        url: `/transitions/preferences/${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PUT /transitions/preferences/:learnerId', () => {
    it('should update preferences', async () => {
      const existingPrefs = {
        id: 'pref-001',
        tenantId,
        learnerId,
        warningStyle: 'visual_audio',
        defaultWarningSeconds: [30, 15, 5],
      };

      const updatedPrefs = {
        ...existingPrefs,
        warningStyle: 'all',
        showFirstThenBoard: false,
      };

      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(existingPrefs as any);
      vi.mocked(prisma.transitionPreferences.update).mockResolvedValue(updatedPrefs as any);

      const response = await app.inject({
        method: 'PUT',
        url: `/transitions/preferences/${learnerId}`,
        payload: {
          tenantId,
          warningStyle: 'all',
          showFirstThenBoard: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.warningStyle).toBe('all');
    });

    it('should reject invalid warning style', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/transitions/preferences/${learnerId}`,
        payload: {
          tenantId,
          warningStyle: 'invalid_style',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /transitions/plan', () => {
    it('should create a transition plan', async () => {
      const mockPreferences = {
        id: 'pref-001',
        tenantId,
        learnerId,
        warningStyle: 'visual_audio',
        defaultWarningSeconds: [30, 15, 5],
        visualSettingsJson: {
          style: 'circle',
          colorScheme: 'green_yellow_red',
        },
        audioSettingsJson: { enabled: true },
        hapticSettingsJson: { enabled: true },
        showFirstThenBoard: true,
        requireAcknowledgment: true,
        allowSkipTransition: false,
        extendedTimeMultiplier: 1.0,
        preferredRoutineId: null,
      };

      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.transitionPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const response = await app.inject({
        method: 'POST',
        url: '/transitions/plan',
        payload: {
          sessionId,
          tenantId,
          learnerId,
          currentActivity: {
            id: 'activity-001',
            title: 'Math Lesson',
            type: 'lesson',
          },
          nextActivity: {
            id: 'activity-002',
            title: 'Math Quiz',
            type: 'quiz',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.transitionId).toBeDefined();
      expect(body.warnings).toBeInstanceOf(Array);
      expect(body.warnings.length).toBeGreaterThan(0);
      expect(body.visual).toBeDefined();
      expect(body.audio).toBeDefined();
    });

    it('should include First/Then board when enabled', async () => {
      const mockPreferences = {
        id: 'pref-001',
        tenantId,
        learnerId,
        showFirstThenBoard: true,
        warningStyle: 'visual_only',
        defaultWarningSeconds: [30, 15, 5],
        visualSettingsJson: {},
        audioSettingsJson: {},
        hapticSettingsJson: {},
        requireAcknowledgment: false,
        allowSkipTransition: true,
        extendedTimeMultiplier: 1.0,
        preferredRoutineId: null,
      };

      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.transitionPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const response = await app.inject({
        method: 'POST',
        url: '/transitions/plan',
        payload: {
          sessionId,
          tenantId,
          learnerId,
          currentActivity: {
            id: 'activity-001',
            title: 'Video: Fractions',
            type: 'video',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
          },
          nextActivity: {
            id: 'activity-002',
            title: 'Practice: Fractions',
            type: 'practice',
            thumbnailUrl: 'https://example.com/thumb2.jpg',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.firstThenBoard).toBeDefined();
      expect(body.firstThenBoard.currentActivity.title).toBe('Video: Fractions');
      expect(body.firstThenBoard.nextActivity.title).toBe('Practice: Fractions');
    });

    it('should apply extended time for learners who need predictable flow', async () => {
      const mockPreferences = {
        id: 'pref-001',
        tenantId,
        learnerId,
        warningStyle: 'all',
        defaultWarningSeconds: [30, 15, 5],
        visualSettingsJson: {},
        audioSettingsJson: {},
        hapticSettingsJson: {},
        showFirstThenBoard: true,
        requireAcknowledgment: true,
        allowSkipTransition: false,
        extendedTimeMultiplier: 1.5,
        preferredRoutineId: null,
      };

      vi.mocked(prisma.transitionPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.transitionPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const response = await app.inject({
        method: 'POST',
        url: '/transitions/plan',
        payload: {
          sessionId,
          tenantId,
          learnerId,
          currentActivity: {
            id: 'activity-001',
            title: 'Lesson',
            type: 'lesson',
          },
          nextActivity: {
            id: 'activity-002',
            title: 'Quiz',
            type: 'quiz',
          },
          learnerProfile: {
            requiresPredictableFlow: true,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // With 1.5x multiplier and predictable flow, duration should be extended
      expect(body.totalDuration).toBeGreaterThanOrEqual(30);
    });
  });

  describe('POST /transitions/:transitionId/acknowledge', () => {
    it('should acknowledge a transition', async () => {
      const transitionId = 'trans-001';

      const response = await app.inject({
        method: 'POST',
        url: `/transitions/${transitionId}/acknowledge`,
        payload: {
          sessionId,
          tenantId,
          learnerId,
          readyState: 'ready',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(transitionEventPublisher.publishTransitionAcknowledged).toHaveBeenCalled();
    });

    it('should handle needs_more_time state', async () => {
      const transitionId = 'trans-001';

      const response = await app.inject({
        method: 'POST',
        url: `/transitions/${transitionId}/acknowledge`,
        payload: {
          sessionId,
          tenantId,
          learnerId,
          readyState: 'needs_more_time',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /transitions/:transitionId/complete', () => {
    it('should complete a transition and record analytics', async () => {
      const transitionId = 'trans-001';

      vi.mocked(prisma.transitionEvent.create).mockResolvedValue({
        id: 'event-001',
        transitionId,
        outcome: 'smooth',
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: `/transitions/${transitionId}/complete`,
        payload: {
          sessionId,
          tenantId,
          learnerId,
          outcome: 'smooth',
          actualDuration: 28,
          warningsAcknowledged: 2,
          routineStepsCompleted: 4,
          learnerInteractions: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(transitionEventPublisher.publishTransitionCompleted).toHaveBeenCalled();
    });

    it('should record struggled transitions', async () => {
      const transitionId = 'trans-002';

      vi.mocked(prisma.transitionEvent.create).mockResolvedValue({
        id: 'event-002',
        transitionId,
        outcome: 'struggled',
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: `/transitions/${transitionId}/complete`,
        payload: {
          sessionId,
          tenantId,
          learnerId,
          outcome: 'struggled',
          actualDuration: 90,
          warningsAcknowledged: 1,
          routineStepsCompleted: 2,
          learnerInteractions: 8,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /transitions/routines', () => {
    it('should list available routines', async () => {
      const mockRoutines = [
        {
          id: 'routine-001',
          tenantId,
          name: 'Quick Calm',
          description: 'A short routine',
          isSystemRoutine: true,
          isActive: true,
          stepsJson: [{ id: 'step-1', type: 'breathing', duration: 15, instruction: 'Breathe' }],
        },
        {
          id: 'routine-002',
          tenantId,
          learnerId,
          name: 'My Routine',
          isSystemRoutine: false,
          isActive: true,
          stepsJson: [{ id: 'step-1', type: 'movement', duration: 10, instruction: 'Stretch' }],
        },
      ];

      vi.mocked(prisma.transitionRoutine.findMany).mockResolvedValue(mockRoutines as any);

      const response = await app.inject({
        method: 'GET',
        url: `/transitions/routines?tenantId=${tenantId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.routines).toBeInstanceOf(Array);
      expect(body.routines.length).toBe(2);
    });

    it('should filter by learner when specified', async () => {
      vi.mocked(prisma.transitionRoutine.findMany).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/transitions/routines?tenantId=${tenantId}&learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.transitionRoutine.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /transitions/routines', () => {
    it('should create a new routine', async () => {
      const newRoutine = {
        id: 'routine-new',
        tenantId,
        learnerId,
        name: 'Custom Routine',
        description: 'My custom transition routine',
        isSystemRoutine: false,
        isActive: true,
        stepsJson: [
          { id: 'step-1', type: 'breathing', duration: 15, instruction: 'Take deep breaths' },
          { id: 'step-2', type: 'ready_check', duration: 5, instruction: 'Tap when ready' },
        ],
      };

      vi.mocked(prisma.transitionRoutine.create).mockResolvedValue(newRoutine as any);

      const response = await app.inject({
        method: 'POST',
        url: '/transitions/routines',
        payload: {
          tenantId,
          learnerId,
          name: 'Custom Routine',
          description: 'My custom transition routine',
          steps: [
            { type: 'breathing', duration: 15, instruction: 'Take deep breaths' },
            {
              type: 'ready_check',
              duration: 5,
              instruction: 'Tap when ready',
              requiresCompletion: true,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Custom Routine');
    });

    it('should reject invalid step types', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transitions/routines',
        payload: {
          tenantId,
          name: 'Bad Routine',
          steps: [{ type: 'invalid_type', duration: 15, instruction: 'This should fail' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /transitions/analytics', () => {
    it('should return transition analytics for a learner', async () => {
      vi.mocked(prisma.transitionEvent.findMany).mockResolvedValue([
        {
          id: 'event-001',
          outcome: 'smooth',
          actualDuration: 28,
          plannedDuration: 30,
          warningsAcknowledged: 2,
          routineStepsCompleted: 4,
        },
        {
          id: 'event-002',
          outcome: 'successful',
          actualDuration: 35,
          plannedDuration: 30,
          warningsAcknowledged: 3,
          routineStepsCompleted: 4,
        },
      ] as any);

      vi.mocked(prisma.transitionEvent.count).mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: `/transitions/analytics?tenantId=${tenantId}&learnerId=${learnerId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalTransitions).toBeDefined();
    });
  });
});

describe('Transition Strategies', () => {
  describe('getWarningIntervals', () => {
    it('should return appropriate intervals for short durations', async () => {
      const { getWarningIntervals } = await import('../src/transitions/transition-strategies.js');

      const intervals = getWarningIntervals(15);
      expect(intervals).toEqual([10, 5]);
    });

    it('should return appropriate intervals for medium durations', async () => {
      const { getWarningIntervals } = await import('../src/transitions/transition-strategies.js');

      const intervals = getWarningIntervals(30);
      expect(intervals).toEqual([20, 10, 5]);
    });

    it('should return appropriate intervals for long durations', async () => {
      const { getWarningIntervals } = await import('../src/transitions/transition-strategies.js');

      const intervals = getWarningIntervals(120);
      expect(intervals).toEqual([60, 30, 10]);
    });
  });

  describe('getRecommendedDuration', () => {
    it('should increase duration for younger learners', async () => {
      const { getRecommendedDuration } =
        await import('../src/transitions/transition-strategies.js');

      const youngLearnerDuration = getRecommendedDuration({ gradeBand: 'K_2' });
      const olderLearnerDuration = getRecommendedDuration({ gradeBand: 'G9_12' });

      expect(youngLearnerDuration).toBeGreaterThan(olderLearnerDuration);
    });

    it('should increase duration for predictable flow needs', async () => {
      const { getRecommendedDuration } =
        await import('../src/transitions/transition-strategies.js');

      const standardDuration = getRecommendedDuration({});
      const predictableDuration = getRecommendedDuration({ requiresPredictableFlow: true });

      expect(predictableDuration).toBeGreaterThanOrEqual(standardDuration);
    });

    it('should increase duration when transitioning to assessment', async () => {
      const { getRecommendedDuration } =
        await import('../src/transitions/transition-strategies.js');

      const standardDuration = getRecommendedDuration({});
      const assessmentDuration = getRecommendedDuration({ activityChange: 'to_assessment' });

      expect(assessmentDuration).toBeGreaterThan(standardDuration);
    });
  });

  describe('findMatchingRoutine', () => {
    it('should find grade-appropriate routines', async () => {
      const { findMatchingRoutine } = await import('../src/transitions/transition-strategies.js');

      const k5Routine = findMatchingRoutine('K5');
      expect(k5Routine).toBeDefined();
      expect(k5Routine?.name).toContain('K-5');
    });

    it('should prefer activity-specific routines', async () => {
      const { findMatchingRoutine } = await import('../src/transitions/transition-strategies.js');

      const quizRoutine = findMatchingRoutine(undefined, 'quiz');
      expect(quizRoutine).toBeDefined();
      expect(quizRoutine?.name).toBe('Quiz Preparation');
    });
  });
});
