import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from '../src/services/analytics.service';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  describe('calculateItemAnalysis', () => {
    it('should calculate difficulty (p-value) correctly', () => {
      const attempts = [
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 0 }] },
        { responses: [{ questionId: 'q1', score: 0 }] },
      ];

      const question = { id: 'q1', points: 10, type: 'MULTIPLE_CHOICE' as const, stem: 'Q1' };

      const result = analyticsService.calculateItemAnalysis(question, attempts);
      
      // 2 correct out of 4 = 0.5 difficulty
      expect(result.difficulty).toBe(0.5);
    });

    it('should classify difficulty levels correctly', () => {
      const easyAttempts = [
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 10 }] },
        { responses: [{ questionId: 'q1', score: 0 }] },
      ];

      const question = { id: 'q1', points: 10, type: 'MULTIPLE_CHOICE' as const, stem: 'Q1' };

      const result = analyticsService.calculateItemAnalysis(question, easyAttempts);
      
      // 4/5 = 0.8, which is > 0.7, so "EASY"
      expect(result.difficulty).toBe(0.8);
      expect(result.difficultyLevel).toBe('EASY');
    });

    it('should calculate discrimination index', () => {
      // High performers get it right, low performers get it wrong
      const attempts = [
        { totalScore: 100, responses: [{ questionId: 'q1', score: 10 }] },
        { totalScore: 90, responses: [{ questionId: 'q1', score: 10 }] },
        { totalScore: 85, responses: [{ questionId: 'q1', score: 10 }] },
        { totalScore: 40, responses: [{ questionId: 'q1', score: 0 }] },
        { totalScore: 30, responses: [{ questionId: 'q1', score: 0 }] },
        { totalScore: 20, responses: [{ questionId: 'q1', score: 0 }] },
      ];

      const question = { id: 'q1', points: 10, type: 'MULTIPLE_CHOICE' as const, stem: 'Q1' };

      const result = analyticsService.calculateItemAnalysis(question, attempts);
      
      // Good discrimination: high performers do better
      expect(result.discrimination).toBeGreaterThan(0.3);
    });

    it('should count option selections for multiple choice', () => {
      const attempts = [
        { responses: [{ questionId: 'q1', response: 'a' }] },
        { responses: [{ questionId: 'q1', response: 'a' }] },
        { responses: [{ questionId: 'q1', response: 'b' }] },
        { responses: [{ questionId: 'q1', response: 'c' }] },
      ];

      const question = {
        id: 'q1',
        points: 10,
        type: 'MULTIPLE_CHOICE' as const,
        stem: 'Q1',
        options: [
          { id: 'a', text: 'A', isCorrect: true },
          { id: 'b', text: 'B', isCorrect: false },
          { id: 'c', text: 'C', isCorrect: false },
        ],
      };

      const result = analyticsService.calculateItemAnalysis(question, attempts);
      
      expect(result.responseDistribution).toBeDefined();
      expect(result.responseDistribution!['a']).toBe(2);
      expect(result.responseDistribution!['b']).toBe(1);
      expect(result.responseDistribution!['c']).toBe(1);
    });
  });

  describe('calculateScoreDistribution', () => {
    it('should calculate mean correctly', () => {
      const scores = [10, 20, 30, 40, 50];
      const result = analyticsService.calculateScoreDistribution(scores, 50);
      
      expect(result.mean).toBe(30);
    });

    it('should calculate median correctly for odd count', () => {
      const scores = [10, 20, 30, 40, 50];
      const result = analyticsService.calculateScoreDistribution(scores, 50);
      
      expect(result.median).toBe(30);
    });

    it('should calculate median correctly for even count', () => {
      const scores = [10, 20, 30, 40];
      const result = analyticsService.calculateScoreDistribution(scores, 40);
      
      expect(result.median).toBe(25); // (20 + 30) / 2
    });

    it('should calculate standard deviation', () => {
      const scores = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = analyticsService.calculateScoreDistribution(scores, 10);
      
      // Mean = 5, SD ≈ 2
      expect(result.mean).toBe(5);
      expect(result.standardDeviation).toBeCloseTo(2, 0);
    });

    it('should find mode', () => {
      const scores = [1, 2, 2, 3, 3, 3, 4];
      const result = analyticsService.calculateScoreDistribution(scores, 5);
      
      expect(result.mode).toBe(3);
    });

    it('should calculate percentiles', () => {
      const scores = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = analyticsService.calculateScoreDistribution(scores, 100);
      
      expect(result.percentiles.p25).toBeCloseTo(25.5, 0);
      expect(result.percentiles.p50).toBeCloseTo(50.5, 0);
      expect(result.percentiles.p75).toBeCloseTo(75.5, 0);
    });

    it('should calculate skewness', () => {
      // Right-skewed distribution
      const scores = [1, 1, 1, 2, 2, 3, 10];
      const result = analyticsService.calculateScoreDistribution(scores, 10);
      
      expect(result.skewness).toBeGreaterThan(0);
    });
  });

  describe('calculateReliability', () => {
    it('should calculate Cronbach alpha', () => {
      // Simulated item scores for 5 students on 4 items
      const itemScores = [
        [4, 4, 5, 5], // Student 1
        [3, 4, 4, 4], // Student 2
        [2, 2, 3, 3], // Student 3
        [5, 5, 5, 5], // Student 4
        [1, 2, 2, 1], // Student 5
      ];

      const result = analyticsService.calculateReliability(itemScores);
      
      // Items are correlated, so alpha should be high
      expect(result.cronbachAlpha).toBeGreaterThan(0.7);
      expect(result.cronbachAlpha).toBeLessThanOrEqual(1);
    });

    it('should handle perfect correlation', () => {
      const itemScores = [
        [5, 5, 5, 5],
        [4, 4, 4, 4],
        [3, 3, 3, 3],
        [2, 2, 2, 2],
        [1, 1, 1, 1],
      ];

      const result = analyticsService.calculateReliability(itemScores);
      
      expect(result.cronbachAlpha).toBeCloseTo(1, 1);
    });

    it('should calculate KR-20 for dichotomous items', () => {
      // Binary scores (0 or 1) for 5 students on 4 items
      const itemScores = [
        [1, 1, 1, 1],
        [1, 1, 0, 1],
        [0, 1, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ];

      const result = analyticsService.calculateReliability(itemScores);
      
      expect(result.kr20).toBeDefined();
      expect(result.kr20).toBeGreaterThanOrEqual(0);
      expect(result.kr20).toBeLessThanOrEqual(1);
    });

    it('should calculate split-half reliability', () => {
      const itemScores = [
        [4, 4, 5, 5, 4, 4],
        [3, 4, 4, 4, 3, 4],
        [2, 2, 3, 3, 2, 2],
        [5, 5, 5, 5, 5, 5],
        [1, 2, 2, 1, 1, 2],
      ];

      const result = analyticsService.calculateReliability(itemScores);
      
      expect(result.splitHalf).toBeDefined();
      expect(result.splitHalf).toBeGreaterThanOrEqual(-1);
      expect(result.splitHalf).toBeLessThanOrEqual(1);
    });

    it('should calculate standard error of measurement', () => {
      const itemScores = [
        [4, 4, 5, 5],
        [3, 4, 4, 4],
        [2, 2, 3, 3],
        [5, 5, 5, 5],
        [1, 2, 2, 1],
      ];

      const result = analyticsService.calculateReliability(itemScores);
      
      expect(result.sem).toBeDefined();
      expect(result.sem).toBeGreaterThan(0);
    });
  });

  describe('calculateStandardsMastery', () => {
    it('should calculate mastery percentage per standard', () => {
      const questions = [
        { id: 'q1', standards: ['S1'], points: 10 },
        { id: 'q2', standards: ['S1'], points: 10 },
        { id: 'q3', standards: ['S2'], points: 10 },
      ];

      const responses = [
        { questionId: 'q1', score: 10 }, // 100% on S1
        { questionId: 'q2', score: 5 },  // 50% on S1
        { questionId: 'q3', score: 8 },  // 80% on S2
      ];

      const result = analyticsService.calculateStandardsMastery(questions, responses);
      
      expect(result['S1'].masteryPercentage).toBe(75); // (10+5)/(10+10) = 75%
      expect(result['S2'].masteryPercentage).toBe(80); // 8/10 = 80%
    });

    it('should track question count per standard', () => {
      const questions = [
        { id: 'q1', standards: ['S1', 'S2'], points: 10 },
        { id: 'q2', standards: ['S1'], points: 10 },
        { id: 'q3', standards: ['S2'], points: 10 },
      ];

      const responses = [
        { questionId: 'q1', score: 10 },
        { questionId: 'q2', score: 10 },
        { questionId: 'q3', score: 10 },
      ];

      const result = analyticsService.calculateStandardsMastery(questions, responses);
      
      expect(result['S1'].questionCount).toBe(2);
      expect(result['S2'].questionCount).toBe(2);
    });
  });
});
