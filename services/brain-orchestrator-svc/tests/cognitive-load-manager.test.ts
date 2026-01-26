import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CognitiveLoadManager } from '../src/cognitive/cognitive-load-manager.js';
import type { Activity, CognitiveState } from '../src/types/index.js';

// Mock prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    cognitiveInteraction: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    cognitiveSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'session-123' }),
    },
    cognitiveStateSnapshot: {
      create: vi.fn().mockResolvedValue({}),
    },
    breakRecord: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe('CognitiveLoadManager', () => {
  let manager: CognitiveLoadManager;

  beforeEach(() => {
    manager = new CognitiveLoadManager();
  });

  describe('assessCurrentLoad', () => {
    it('should return baseline cognitive state when no recent activity', async () => {
      const state = await manager.assessCurrentLoad('learner-123', []);

      expect(state).toBeDefined();
      expect(state.currentLoad).toBeDefined();
      expect(state.loadScore).toBeGreaterThanOrEqual(0);
      expect(state.loadScore).toBeLessThanOrEqual(100);
      expect(state.fatigueLevel).toBeGreaterThanOrEqual(0);
      expect(state.attentionScore).toBeGreaterThanOrEqual(0);
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it('should calculate higher load with more complex activities', async () => {
      const lowLoadActivities = [
        { type: 'review', timestamp: new Date(), duration: 10, cognitiveLoad: 'low' as const, errorCount: 0 },
        { type: 'review', timestamp: new Date(), duration: 10, cognitiveLoad: 'low' as const, errorCount: 0 },
      ];

      const highLoadActivities = [
        { type: 'assessment', timestamp: new Date(), duration: 30, cognitiveLoad: 'high' as const, errorCount: 0 },
        { type: 'project', timestamp: new Date(), duration: 45, cognitiveLoad: 'high' as const, errorCount: 0 },
      ];

      const lowState = await manager.assessCurrentLoad('learner-123', lowLoadActivities);
      const highState = await manager.assessCurrentLoad('learner-456', highLoadActivities);

      expect(highState.loadScore).toBeGreaterThan(lowState.loadScore);
    });

    it('should detect fatigue from error rate', async () => {
      const errorProneActivities = [
        { type: 'practice', timestamp: new Date(), duration: 15, cognitiveLoad: 'medium' as const, score: 50, errorCount: 3 },
        { type: 'practice', timestamp: new Date(), duration: 15, cognitiveLoad: 'medium' as const, score: 40, errorCount: 4 },
        { type: 'practice', timestamp: new Date(), duration: 15, cognitiveLoad: 'medium' as const, score: 45, errorCount: 3 },
      ];

      const state = await manager.assessCurrentLoad('learner-123', errorProneActivities);

      expect(state.errorRate).toBeGreaterThan(0);
    });
  });

  describe('recommendNextActivity', () => {
    it('should recommend low-load activity when overloaded', async () => {
      const overloadedState: CognitiveState = {
        currentLoad: 'overload',
        loadScore: 95,
        fatigueLevel: 85,
        attentionScore: 40,
        timeSinceBreak: 60,
        tasksCompleted: 10,
        errorRate: 0.4,
        responseLatency: 5000,
        engagementScore: 30,
        lastUpdated: new Date(),
      };

      const availableActivities: Activity[] = [
        {
          id: 'act-1',
          type: 'assessment',
          title: 'Hard Assessment',
          description: 'A challenging test',
          estimatedDuration: 30,
          cognitiveLoad: 'high',
          difficulty: 8,
          skillIds: ['skill-1'],
          prerequisites: [],
          metadata: {},
        },
        {
          id: 'act-2',
          type: 'review-session',
          title: 'Easy Review',
          description: 'A light review',
          estimatedDuration: 10,
          cognitiveLoad: 'low',
          difficulty: 2,
          skillIds: ['skill-1'],
          prerequisites: [],
          metadata: {},
        },
      ];

      const recommendation = await manager.recommendNextActivity(
        'learner-123',
        availableActivities,
        overloadedState
      );

      expect(recommendation.activity.cognitiveLoad).toBe('low');
      expect(recommendation.reason).toBeTruthy();
    });

    it('should provide fallback activity when none are suitable', async () => {
      const overloadedState: CognitiveState = {
        currentLoad: 'overload',
        loadScore: 95,
        fatigueLevel: 85,
        attentionScore: 40,
        timeSinceBreak: 60,
        tasksCompleted: 10,
        errorRate: 0.4,
        responseLatency: 5000,
        engagementScore: 30,
        lastUpdated: new Date(),
      };

      // Only high-load activities available
      const availableActivities: Activity[] = [
        {
          id: 'act-1',
          type: 'assessment',
          title: 'Hard Assessment',
          description: 'A challenging test',
          estimatedDuration: 30,
          cognitiveLoad: 'high',
          difficulty: 8,
          skillIds: ['skill-1'],
          prerequisites: [],
          metadata: {},
        },
      ];

      const recommendation = await manager.recommendNextActivity(
        'learner-123',
        availableActivities,
        overloadedState
      );

      // Should get a fallback low-load activity
      expect(recommendation.activity.cognitiveLoad).toBe('low');
    });
  });

  describe('shouldTakeBreak', () => {
    it('should recommend required break when fatigue is very high', async () => {
      const fatigueState: CognitiveState = {
        currentLoad: 'high',
        loadScore: 80,
        fatigueLevel: 95,
        attentionScore: 30,
        timeSinceBreak: 45,
        tasksCompleted: 8,
        errorRate: 0.3,
        responseLatency: 4000,
        engagementScore: 40,
        lastUpdated: new Date(),
      };

      const recommendation = await manager.shouldTakeBreak(fatigueState);

      expect(recommendation.shouldTakeBreak).toBe(true);
      expect(recommendation.urgency).toBe('required');
      expect(recommendation.suggestedDuration).toBeGreaterThan(0);
    });

    it('should recommend optional break when load is low', async () => {
      const freshState: CognitiveState = {
        currentLoad: 'low',
        loadScore: 25,
        fatigueLevel: 20,
        attentionScore: 85,
        timeSinceBreak: 10,
        tasksCompleted: 2,
        errorRate: 0.05,
        responseLatency: 2000,
        engagementScore: 90,
        lastUpdated: new Date(),
      };

      const recommendation = await manager.shouldTakeBreak(freshState);

      expect(recommendation.urgency).toBe('optional');
    });

    it('should include break activity suggestion', async () => {
      const state: CognitiveState = {
        currentLoad: 'medium',
        loadScore: 50,
        fatigueLevel: 65,
        attentionScore: 60,
        timeSinceBreak: 30,
        tasksCompleted: 5,
        errorRate: 0.2,
        responseLatency: 3000,
        engagementScore: 60,
        lastUpdated: new Date(),
      };

      const recommendation = await manager.shouldTakeBreak(state);

      expect(recommendation.suggestedActivity).toBeDefined();
      expect(recommendation.suggestedActivity?.type).toBeDefined();
      expect(recommendation.suggestedActivity?.instructions).toBeDefined();
    });
  });

  describe('adjustDifficulty', () => {
    it('should decrease difficulty when overloaded', async () => {
      const overloadedState: CognitiveState = {
        currentLoad: 'overload',
        loadScore: 90,
        fatigueLevel: 80,
        attentionScore: 35,
        timeSinceBreak: 50,
        tasksCompleted: 8,
        errorRate: 0.35,
        responseLatency: 5000,
        engagementScore: 40,
        lastUpdated: new Date(),
      };

      const adjustment = await manager.adjustDifficulty(7, overloadedState);

      expect(adjustment.recommendedDifficulty).toBeLessThan(7);
      expect(adjustment.adjustmentReason).toBeTruthy();
      expect(adjustment.confidence).toBeGreaterThan(0);
    });

    it('should increase difficulty when performing well', async () => {
      const excellentState: CognitiveState = {
        currentLoad: 'low',
        loadScore: 20,
        fatigueLevel: 15,
        attentionScore: 95,
        timeSinceBreak: 10,
        tasksCompleted: 3,
        errorRate: 0.05,
        responseLatency: 1500,
        engagementScore: 90,
        lastUpdated: new Date(),
      };

      const adjustment = await manager.adjustDifficulty(5, excellentState);

      expect(adjustment.recommendedDifficulty).toBeGreaterThan(5);
    });

    it('should maintain difficulty when performing normally', async () => {
      const normalState: CognitiveState = {
        currentLoad: 'medium',
        loadScore: 50,
        fatigueLevel: 40,
        attentionScore: 70,
        timeSinceBreak: 20,
        tasksCompleted: 4,
        errorRate: 0.2,
        responseLatency: 2500,
        engagementScore: 70,
        lastUpdated: new Date(),
      };

      const adjustment = await manager.adjustDifficulty(5, normalState);

      // Should stay close to current difficulty
      expect(Math.abs(adjustment.recommendedDifficulty - 5)).toBeLessThanOrEqual(1);
    });
  });
});
