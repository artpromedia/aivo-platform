/**
 * Agent Contracts Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock database
vi.mock('./db.js', () => {
  const mockQuery = vi.fn();
  return {
    getMainPool: () => ({
      query: mockQuery,
    }),
    getWarehousePool: () => ({
      query: mockQuery,
    }),
    initPools: vi.fn(),
    closePools: vi.fn(),
    mockQuery,
  };
});

import {
  prepareVirtualBrainInput,
  processVirtualBrainOutput,
  prepareLessonPlannerInput,
  processLessonPlannerOutput,
  analyzeRecommendationFeedback,
  getAcceptanceRates,
} from './agentContracts.js';
import type { VirtualBrainSignalOutput, LessonPlannerSignalOutput } from './types.js';

describe('Virtual Brain Contract', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const db = await import('./db.js');
    mockQuery = (db as unknown as { mockQuery: ReturnType<typeof vi.fn> }).mockQuery;
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('prepareVirtualBrainInput', () => {
    it('should prepare input with engagement signals', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'signal-1',
            tenant_id: 'tenant-1',
            learner_id: 'learner-1',
            date: new Date('2025-01-15'),
            signal_type: 'ENGAGEMENT',
            signal_key: 'LOW_ENGAGEMENT',
            signal_value: { value: 1.5, threshold: 3, direction: 'below' },
            confidence: '0.75',
            source: 'ANALYTICS_ETL',
            metadata: {},
            expires_at: new Date('2025-01-22'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const input = await prepareVirtualBrainInput('tenant-1', 'learner-1', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      expect(input.learnerId).toBe('learner-1');
      expect((input as any).signals).toHaveLength(1);
      expect((input as any).signalSummary.hasLowEngagementRecently).toBe(true);
      expect((input as any).signalSummary.engagementLevel).toBe('LOW');
    });

    it('should identify high struggle signals', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'signal-2',
            tenant_id: 'tenant-1',
            learner_id: 'learner-1',
            date: new Date('2025-01-15'),
            signal_type: 'DIFFICULTY',
            signal_key: 'HIGH_STRUGGLE_MATH',
            signal_value: { domain: 'MATH', currentMastery: 0.35, recommendedAction: 'EASIER' },
            confidence: '0.80',
            source: 'ANALYTICS_ETL',
            metadata: {},
            expires_at: new Date('2025-01-22'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const input = await prepareVirtualBrainInput('tenant-1', 'learner-1', {
        timeOfDay: 'afternoon',
        dayOfWeek: 3,
      });

      expect((input as any).signalSummary.hasHighStruggle).toBe(true);
      expect((input as any).signalSummary.difficultyAdjustments['MATH']).toBe('EASIER');
    });
  });

  describe('processVirtualBrainOutput', () => {
    it('should log decisions to the database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'decision-1' }],
      });

      const input = {
        learnerId: 'learner-1',
        timestamp: new Date().toISOString(),
        signals: [
          {
            id: 'signal-1',
            tenantId: 'tenant-1',
            learnerId: 'learner-1',
            date: '2025-01-15',
            signalType: 'ENGAGEMENT' as const,
            signalKey: 'LOW_ENGAGEMENT' as const,
            signalValue: { value: 1.5 },
            confidence: 0.75,
            source: 'ANALYTICS_ETL' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        signalSummary: {
          engagementLevel: 'LOW' as const,
          difficultyAdjustments: {},
          focusProfile: { needsMoreBreaks: false, avgBreakDuration: 5 },
          hasLowEngagementRecently: true,
          hasHighStruggle: false,
          needsMoreBreaks: false,
        },
        context: {
          timeOfDay: 'morning' as const,
          dayOfWeek: 1,
        },
      };

      const output = {
        agentVersion: '1.0.0',
        recommendations: {
          adjustDifficulty: { domain: 'MATH', action: 'EASIER' },
        },
        reasoning: 'Learner showing low engagement, adjusting difficulty',
      } as any;

      const decisionId = await processVirtualBrainOutput(input as any, output);

      expect(decisionId).toBe('decision-1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO personalization_decision_logs'),
        expect.arrayContaining(['VIRTUAL_BRAIN'])
      );
    });
  });
});

describe('Lesson Planner Contract', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const db = await import('./db.js');
    mockQuery = (db as unknown as { mockQuery: ReturnType<typeof vi.fn> }).mockQuery;
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('prepareLessonPlannerInput', () => {
    it('should prepare input with module uptake signals', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'signal-1',
            tenant_id: 'tenant-1',
            learner_id: 'learner-1',
            date: new Date('2025-01-15'),
            signal_type: 'MODULE_UPTAKE',
            signal_key: 'MODULE_HIGH_UPTAKE',
            signal_value: { moduleId: 'module-123', uptakeRate: 0.85 },
            confidence: '0.70',
            source: 'ANALYTICS_ETL',
            metadata: {},
            expires_at: new Date('2025-01-22'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const input = await prepareLessonPlannerInput('tenant-1', 'learner-1', {
        targetDate: '2025-01-16',
        availableMinutes: 45,
      });

      expect(input.learnerId).toBe('learner-1');
      expect((input as any).constraints.preferredModules).toContain('module-123');
      expect((input as any).constraints.availableMinutes).toBe(45);
    });

    it('should identify modules to avoid', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'signal-2',
            tenant_id: 'tenant-1',
            learner_id: 'learner-1',
            date: new Date('2025-01-15'),
            signal_type: 'MODULE_UPTAKE',
            signal_key: 'MODULE_LOW_UPTAKE',
            signal_value: { moduleId: 'module-456', uptakeRate: 0.15 },
            confidence: '0.65',
            source: 'ANALYTICS_ETL',
            metadata: {},
            expires_at: new Date('2025-01-22'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const input = await prepareLessonPlannerInput('tenant-1', 'learner-1', {
        targetDate: '2025-01-16',
        availableMinutes: 30,
      });

      expect((input as any).constraints.avoidModules).toContain('module-456');
    });
  });

  describe('processLessonPlannerOutput', () => {
    it('should log lesson plan decisions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'decision-2' }],
      });

      const input = {
        learnerId: 'learner-1',
        targetDate: '2025-01-16',
        signals: [
          {
            id: 'signal-1',
            tenantId: 'tenant-1',
            learnerId: 'learner-1',
            date: '2025-01-15',
            signalType: 'DIFFICULTY' as const,
            signalKey: 'HIGH_STRUGGLE_MATH' as const,
            signalValue: { domain: 'MATH', recommendedAction: 'EASIER' },
            confidence: 0.75,
            source: 'ANALYTICS_ETL' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        constraints: {
          availableMinutes: 45,
          difficultyBySubject: { MATH: 'EASIER' as const },
          preferredModules: [],
          avoidModules: [],
          prioritizeEngaging: false,
        },
      };

      const output = {
        agentVersion: '1.0.0',
        plannedActivities: [
          { moduleId: 'module-1', durationMinutes: 15, difficulty: 'EASY' },
          { moduleId: 'module-2', durationMinutes: 15, difficulty: 'MEDIUM' },
        ],
        totalMinutes: 30,
        subjectDistribution: { MATH: 15, ELA: 15 },
        reasoning: 'Selected easier math content based on struggle signals',
      } as any;

      const decisionId = await processLessonPlannerOutput(input as any, output);

      expect(decisionId).toBe('decision-2');
    });
  });
});

describe('Feedback Loop', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const db = await import('./db.js');
    mockQuery = (db as unknown as { mockQuery: ReturnType<typeof vi.fn> }).mockQuery;
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('analyzeRecommendationFeedback', () => {
    it('should suggest stricter thresholds for low acceptance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            recommendation_type: 'CONTENT',
            total_count: '100',
            accepted_count: '25',
            acceptance_rate: '0.250',
          },
        ],
      });

      const adjustments = await analyzeRecommendationFeedback('tenant-1', 30);

      expect(adjustments).toHaveLength(1);
      expect((adjustments[0] as any).thresholdKey).toBe('content_confidence_threshold');
      expect((adjustments[0] as any).suggestedValue).toBeGreaterThan((adjustments[0] as any).currentValue);
      expect((adjustments[0] as any).reason).toContain('Low acceptance rate');
    });

    it('should suggest relaxed thresholds for high acceptance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            recommendation_type: 'ACTIVITY',
            total_count: '60',
            accepted_count: '54',
            acceptance_rate: '0.900',
          },
        ],
      });

      const adjustments = await analyzeRecommendationFeedback('tenant-1', 30);

      expect(adjustments).toHaveLength(1);
      expect((adjustments[0] as any).suggestedValue).toBeLessThan((adjustments[0] as any).currentValue);
    });

    it('should return no adjustments for moderate acceptance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            recommendation_type: 'CONTENT',
            total_count: '50',
            accepted_count: '30',
            acceptance_rate: '0.600',
          },
        ],
      });

      const adjustments = await analyzeRecommendationFeedback('tenant-1', 30);

      expect(adjustments).toHaveLength(0);
    });
  });

  describe('getAcceptanceRates', () => {
    it('should return acceptance rates by type', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            recommendation_type: 'CONTENT',
            total: '100',
            accepted: '70',
            rejected: '10',
          },
          {
            recommendation_type: 'ACTIVITY',
            total: '50',
            accepted: '40',
            rejected: '5',
          },
        ],
      });

      const rates = await getAcceptanceRates('tenant-1', undefined, 30);

      expect(rates).toHaveLength(2);
      expect(rates[0]!.recommendationType).toBe('CONTENT');
      expect(rates[0]!.acceptanceRate).toBe(0.7);
      expect(rates[1]!.recommendationType).toBe('ACTIVITY');
      expect(rates[1]!.acceptanceRate).toBe(0.8);
    });

    it('should filter by learner when specified', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await getAcceptanceRates('tenant-1', 'learner-1', 30);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND learner_id = $3'),
        expect.arrayContaining(['learner-1'])
      );
    });
  });
});
