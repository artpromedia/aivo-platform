/**
 * Engagement Detector Tests
 *
 * Tests for the engagement and affective state detection including:
 * - Frustration detection
 * - Boredom detection
 * - Flow state identification
 * - Intervention recommendations
 * - Neurodiverse learner calibration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EngagementDetector } from '../src/models/analytics/engagement-detector.js';
import type { EngagementSignals } from '../src/models/analytics/types.js';

describe('EngagementDetector', () => {
  let detector: EngagementDetector;

  beforeEach(() => {
    detector = new EngagementDetector();
  });

  describe('analyze', () => {
    it('should detect flow state with optimal challenge and performance', () => {
      const flowSignals: EngagementSignals = {
        responseTime: 8000, // 8 seconds - reasonable
        expectedResponseTime: 10000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 5, // Good streak
      };

      const analysis = detector.analyze(flowSignals);

      expect(analysis.flowScore).toBeGreaterThan(0.5);
      expect(analysis.state).toBe('flow');
    });

    it('should detect frustration with multiple attempts and hints', () => {
      const frustratedSignals: EngagementSignals = {
        responseTime: 45000, // Very long response time
        expectedResponseTime: 10000,
        hintsUsed: 3, // All hints used
        maxHints: 3,
        attemptNumber: 4, // Multiple attempts
        isCorrect: false,
        performanceStreak: -3, // Negative streak
      };

      const analysis = detector.analyze(frustratedSignals);

      expect(analysis.frustrationScore).toBeGreaterThan(0.5);
      expect(analysis.state).toBe('frustrated');
    });

    it('should detect boredom with very fast responses', () => {
      const boredSignals: EngagementSignals = {
        responseTime: 1000, // Very fast - not engaging
        expectedResponseTime: 10000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 10, // Too easy
      };

      const analysis = detector.analyze(boredSignals);

      expect(analysis.boredomScore).toBeGreaterThan(0.3);
    });

    it('should detect engaged state for normal performance', () => {
      const engagedSignals: EngagementSignals = {
        responseTime: 10000,
        expectedResponseTime: 10000,
        hintsUsed: 1,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 2,
      };

      const analysis = detector.analyze(engagedSignals);

      expect(analysis.engagementScore).toBeGreaterThan(0.4);
      expect(['engaged', 'flow']).toContain(analysis.state);
    });

    it('should return scores between 0 and 1', () => {
      const signals: EngagementSignals = {
        responseTime: 5000,
        expectedResponseTime: 10000,
        hintsUsed: 1,
        maxHints: 3,
        attemptNumber: 2,
        isCorrect: true,
        performanceStreak: 0,
      };

      const analysis = detector.analyze(signals);

      expect(analysis.frustrationScore).toBeGreaterThanOrEqual(0);
      expect(analysis.frustrationScore).toBeLessThanOrEqual(1);
      expect(analysis.boredomScore).toBeGreaterThanOrEqual(0);
      expect(analysis.boredomScore).toBeLessThanOrEqual(1);
      expect(analysis.engagementScore).toBeGreaterThanOrEqual(0);
      expect(analysis.engagementScore).toBeLessThanOrEqual(1);
      expect(analysis.flowScore).toBeGreaterThanOrEqual(0);
      expect(analysis.flowScore).toBeLessThanOrEqual(1);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should include confidence score', () => {
      const signals: EngagementSignals = {
        responseTime: 10000,
        expectedResponseTime: 10000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 3,
      };

      const analysis = detector.analyze(signals);

      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe('calibrateForLearner', () => {
    it('should adjust thresholds based on learner baseline', () => {
      const calibrationData = {
        avgResponseTime: 15000, // Slower than average
        responseTimeStdDev: 5000,
        avgHintsUsed: 1.5,
        avgAttempts: 2,
      };

      const calibratedDetector = detector.calibrateForLearner(calibrationData);

      // Test with a response that would be fast for this learner
      const fastForLearner: EngagementSignals = {
        responseTime: 10000, // Faster than their average
        expectedResponseTime: 15000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 3,
      };

      const analysis = calibratedDetector.analyze(fastForLearner);

      // Should show positive engagement for this learner
      expect(analysis.engagementScore).toBeGreaterThan(0.4);
    });

    it('should handle learners with high variability', () => {
      const highVariability = {
        avgResponseTime: 10000,
        responseTimeStdDev: 8000, // High variability
        avgHintsUsed: 0.5,
        avgAttempts: 1.2,
      };

      const calibratedDetector = detector.calibrateForLearner(highVariability);

      // Analysis should still work
      const signals: EngagementSignals = {
        responseTime: 20000,
        expectedResponseTime: 10000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 0,
      };

      const analysis = calibratedDetector.analyze(signals);
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrends', () => {
    it('should detect declining engagement trend', () => {
      const decliningHistory = [
        {
          frustrationScore: 0.1,
          boredomScore: 0.1,
          engagementScore: 0.8,
          flowScore: 0.7,
          state: 'flow' as const,
          confidence: 0.9,
        },
        {
          frustrationScore: 0.2,
          boredomScore: 0.2,
          engagementScore: 0.6,
          flowScore: 0.5,
          state: 'engaged' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.4,
          boredomScore: 0.3,
          engagementScore: 0.4,
          flowScore: 0.3,
          state: 'engaged' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.6,
          boredomScore: 0.2,
          engagementScore: 0.3,
          flowScore: 0.1,
          state: 'frustrated' as const,
          confidence: 0.85,
        },
        {
          frustrationScore: 0.7,
          boredomScore: 0.1,
          engagementScore: 0.2,
          flowScore: 0.1,
          state: 'frustrated' as const,
          confidence: 0.9,
        },
      ];

      const trends = detector.analyzeTrends(decliningHistory);

      expect(trends.overallTrend).toBe('declining');
      expect(trends.frustrationTrend).toBe('increasing');
    });

    it('should detect improving engagement trend', () => {
      const improvingHistory = [
        {
          frustrationScore: 0.6,
          boredomScore: 0.2,
          engagementScore: 0.3,
          flowScore: 0.1,
          state: 'frustrated' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.4,
          boredomScore: 0.2,
          engagementScore: 0.5,
          flowScore: 0.3,
          state: 'engaged' as const,
          confidence: 0.85,
        },
        {
          frustrationScore: 0.2,
          boredomScore: 0.1,
          engagementScore: 0.7,
          flowScore: 0.5,
          state: 'engaged' as const,
          confidence: 0.85,
        },
        {
          frustrationScore: 0.1,
          boredomScore: 0.1,
          engagementScore: 0.8,
          flowScore: 0.7,
          state: 'flow' as const,
          confidence: 0.9,
        },
      ];

      const trends = detector.analyzeTrends(improvingHistory);

      expect(trends.overallTrend).toBe('improving');
      expect(trends.frustrationTrend).toBe('decreasing');
    });

    it('should detect stable engagement', () => {
      const stableHistory = [
        {
          frustrationScore: 0.2,
          boredomScore: 0.2,
          engagementScore: 0.6,
          flowScore: 0.5,
          state: 'engaged' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.25,
          boredomScore: 0.18,
          engagementScore: 0.58,
          flowScore: 0.48,
          state: 'engaged' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.22,
          boredomScore: 0.22,
          engagementScore: 0.62,
          flowScore: 0.52,
          state: 'engaged' as const,
          confidence: 0.8,
        },
        {
          frustrationScore: 0.2,
          boredomScore: 0.2,
          engagementScore: 0.6,
          flowScore: 0.5,
          state: 'engaged' as const,
          confidence: 0.8,
        },
      ];

      const trends = detector.analyzeTrends(stableHistory);

      expect(trends.overallTrend).toBe('stable');
    });

    it('should handle empty history', () => {
      const trends = detector.analyzeTrends([]);

      expect(trends.overallTrend).toBe('stable');
    });
  });

  describe('getInterventions', () => {
    it('should recommend break for high frustration', () => {
      const frustratedAnalysis = {
        frustrationScore: 0.8,
        boredomScore: 0.1,
        engagementScore: 0.2,
        flowScore: 0.0,
        state: 'frustrated' as const,
        confidence: 0.9,
      };

      const interventions = detector.getInterventions(frustratedAnalysis);

      expect(interventions.some((i) => i.type === 'break')).toBe(true);
    });

    it('should recommend easier activity for frustration', () => {
      const frustratedAnalysis = {
        frustrationScore: 0.7,
        boredomScore: 0.1,
        engagementScore: 0.3,
        flowScore: 0.1,
        state: 'frustrated' as const,
        confidence: 0.85,
      };

      const interventions = detector.getInterventions(frustratedAnalysis);

      expect(
        interventions.some((i) => i.type === 'adjust_difficulty' && i.direction === 'decrease')
      ).toBe(true);
    });

    it('should recommend harder activity for boredom', () => {
      const boredAnalysis = {
        frustrationScore: 0.1,
        boredomScore: 0.8,
        engagementScore: 0.3,
        flowScore: 0.2,
        state: 'bored' as const,
        confidence: 0.85,
      };

      const interventions = detector.getInterventions(boredAnalysis);

      expect(
        interventions.some((i) => i.type === 'adjust_difficulty' && i.direction === 'increase')
      ).toBe(true);
    });

    it('should recommend activity change for disengagement', () => {
      const disengagedAnalysis = {
        frustrationScore: 0.3,
        boredomScore: 0.5,
        engagementScore: 0.2,
        flowScore: 0.1,
        state: 'disengaged' as const,
        confidence: 0.8,
      };

      const interventions = detector.getInterventions(disengagedAnalysis);

      expect(interventions.some((i) => i.type === 'change_activity')).toBe(true);
    });

    it('should not recommend interventions for flow state', () => {
      const flowAnalysis = {
        frustrationScore: 0.1,
        boredomScore: 0.1,
        engagementScore: 0.8,
        flowScore: 0.9,
        state: 'flow' as const,
        confidence: 0.9,
      };

      const interventions = detector.getInterventions(flowAnalysis);

      // Minimal or no interventions for flow
      expect(interventions.length).toBeLessThanOrEqual(1);
    });

    it('should prioritize interventions by urgency', () => {
      const criticalAnalysis = {
        frustrationScore: 0.95,
        boredomScore: 0.0,
        engagementScore: 0.1,
        flowScore: 0.0,
        state: 'frustrated' as const,
        confidence: 0.95,
      };

      const interventions = detector.getInterventions(criticalAnalysis);

      // First intervention should be highest priority (break)
      if (interventions.length > 0) {
        expect(interventions[0].priority).toBe('high');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle zero response time', () => {
      const signals: EngagementSignals = {
        responseTime: 0,
        expectedResponseTime: 10000,
        hintsUsed: 0,
        maxHints: 3,
        attemptNumber: 1,
        isCorrect: true,
        performanceStreak: 0,
      };

      const analysis = detector.analyze(signals);

      // Should detect as potential cheating or system issue
      expect(analysis.boredomScore).toBeGreaterThan(0);
    });

    it('should handle very long response time', () => {
      const signals: EngagementSignals = {
        responseTime: 300000, // 5 minutes
        expectedResponseTime: 10000,
        hintsUsed: 3,
        maxHints: 3,
        attemptNumber: 5,
        isCorrect: false,
        performanceStreak: -5,
      };

      const analysis = detector.analyze(signals);

      expect(analysis.frustrationScore).toBeGreaterThan(0.5);
    });

    it('should handle negative performance streak', () => {
      const signals: EngagementSignals = {
        responseTime: 15000,
        expectedResponseTime: 10000,
        hintsUsed: 2,
        maxHints: 3,
        attemptNumber: 2,
        isCorrect: false,
        performanceStreak: -10,
      };

      const analysis = detector.analyze(signals);

      expect(analysis.frustrationScore).toBeGreaterThan(0.3);
    });
  });
});
