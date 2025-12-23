/**
 * Learning Curve Analyzer Tests
 *
 * Tests for learning curve analysis including:
 * - Power law fitting
 * - Exponential fitting
 * - Plateau detection
 * - Forgetting curve analysis
 * - Optimal spacing calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningCurveAnalyzer } from '../src/models/analytics/learning-curve-analyzer.js';
import type { LearningCurveDataPoint } from '../src/models/analytics/types.js';

describe('LearningCurveAnalyzer', () => {
  let analyzer: LearningCurveAnalyzer;

  beforeEach(() => {
    analyzer = new LearningCurveAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze typical learning curve data', () => {
      // Simulate typical learning curve: starts low, improves over time
      const dataPoints: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.3, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0.4, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.5, timestamp: new Date() },
        { trialNumber: 4, performanceScore: 0.55, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 0.6, timestamp: new Date() },
        { trialNumber: 6, performanceScore: 0.65, timestamp: new Date() },
        { trialNumber: 7, performanceScore: 0.7, timestamp: new Date() },
        { trialNumber: 8, performanceScore: 0.72, timestamp: new Date() },
        { trialNumber: 9, performanceScore: 0.75, timestamp: new Date() },
        { trialNumber: 10, performanceScore: 0.78, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(dataPoints);

      expect(analysis.learningRate).toBeGreaterThan(0);
      expect(analysis.currentPerformance).toBeCloseTo(0.78, 1);
      expect(analysis.estimatedAsymptote).toBeGreaterThan(0.78);
    });

    it('should detect plateau in learning', () => {
      // Data that plateaus after trial 5
      const plateauData: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.3, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0.45, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.55, timestamp: new Date() },
        { trialNumber: 4, performanceScore: 0.62, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 0.65, timestamp: new Date() },
        { trialNumber: 6, performanceScore: 0.66, timestamp: new Date() },
        { trialNumber: 7, performanceScore: 0.65, timestamp: new Date() },
        { trialNumber: 8, performanceScore: 0.66, timestamp: new Date() },
        { trialNumber: 9, performanceScore: 0.65, timestamp: new Date() },
        { trialNumber: 10, performanceScore: 0.66, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(plateauData);

      expect(analysis.plateauDetected).toBe(true);
      expect(analysis.plateauStartTrial).toBeDefined();
      expect(analysis.plateauStartTrial).toBeGreaterThanOrEqual(4);
    });

    it('should handle perfect performance', () => {
      const perfectData: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 1, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 1, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 1, timestamp: new Date() },
        { trialNumber: 4, performanceScore: 1, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 1, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(perfectData);

      expect(analysis.currentPerformance).toBe(1);
      expect(analysis.estimatedAsymptote).toBe(1);
    });

    it('should handle declining performance', () => {
      const decliningData: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.8, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0.75, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.7, timestamp: new Date() },
        { trialNumber: 4, performanceScore: 0.65, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 0.6, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(decliningData);

      expect(analysis.learningRate).toBeLessThan(0);
    });

    it('should return best fitting model', () => {
      const dataPoints: LearningCurveDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
        trialNumber: i + 1,
        performanceScore: 1 - 0.7 * Math.pow(i + 1, -0.5),
        timestamp: new Date(),
      }));

      const analysis = analyzer.analyze(dataPoints);

      expect(['power', 'exponential']).toContain(analysis.bestFitModel);
      expect(analysis.fitQuality).toBeGreaterThan(0);
    });
  });

  describe('analyzeForgetting', () => {
    it('should calculate forgetting rate', () => {
      // Data showing forgetting over time (gaps between sessions)
      const now = Date.now();
      const forgettingData: LearningCurveDataPoint[] = [
        {
          trialNumber: 1,
          performanceScore: 0.8,
          timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000),
        },
        {
          trialNumber: 2,
          performanceScore: 0.7,
          timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
        },
        { trialNumber: 3, performanceScore: 0.6, timestamp: new Date(now) },
      ];

      const forgetting = analyzer.analyzeForgetting(forgettingData);

      expect(forgetting.forgettingRate).toBeGreaterThan(0);
      expect(forgetting.halfLife).toBeGreaterThan(0);
    });

    it('should estimate retention at future time', () => {
      const now = Date.now();
      const data: LearningCurveDataPoint[] = [
        {
          trialNumber: 1,
          performanceScore: 0.9,
          timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
        },
        {
          trialNumber: 2,
          performanceScore: 0.8,
          timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
        },
        { trialNumber: 3, performanceScore: 0.75, timestamp: new Date(now) },
      ];

      const forgetting = analyzer.analyzeForgetting(data);

      // Estimate retention 3 days from now
      expect(forgetting.estimatedRetentionAt).toBeDefined();
      expect(forgetting.estimatedRetentionAt).toBeLessThan(0.75);
    });

    it('should handle insufficient data for forgetting analysis', () => {
      const singlePoint: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.8, timestamp: new Date() },
      ];

      const forgetting = analyzer.analyzeForgetting(singlePoint);

      expect(forgetting.forgettingRate).toBe(0);
      expect(forgetting.halfLife).toBe(Infinity);
    });
  });

  describe('calculateOptimalSpacing', () => {
    it('should recommend longer spacing for well-learned material', () => {
      const wellLearned: LearningCurveDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        trialNumber: i + 1,
        performanceScore: 0.9 + Math.random() * 0.05,
        timestamp: new Date(),
      }));

      const poorlyLearned: LearningCurveDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        trialNumber: i + 1,
        performanceScore: 0.4 + Math.random() * 0.1,
        timestamp: new Date(),
      }));

      const wellLearnedSpacing = analyzer.calculateOptimalSpacing(wellLearned);
      const poorlyLearnedSpacing = analyzer.calculateOptimalSpacing(poorlyLearned);

      expect(wellLearnedSpacing.recommendedIntervalDays).toBeGreaterThan(
        poorlyLearnedSpacing.recommendedIntervalDays
      );
    });

    it('should account for forgetting rate in spacing', () => {
      const now = Date.now();
      const fastForgetter: LearningCurveDataPoint[] = [
        {
          trialNumber: 1,
          performanceScore: 0.9,
          timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
        },
        {
          trialNumber: 2,
          performanceScore: 0.6,
          timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
        },
        {
          trialNumber: 3,
          performanceScore: 0.4,
          timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000),
        },
        { trialNumber: 4, performanceScore: 0.3, timestamp: new Date(now) },
      ];

      const spacing = analyzer.calculateOptimalSpacing(fastForgetter);

      // Fast forgetter needs more frequent practice
      expect(spacing.recommendedIntervalDays).toBeLessThan(3);
    });

    it('should provide min and max interval bounds', () => {
      const data: LearningCurveDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        trialNumber: i + 1,
        performanceScore: 0.5 + i * 0.03,
        timestamp: new Date(),
      }));

      const spacing = analyzer.calculateOptimalSpacing(data);

      expect(spacing.minIntervalDays).toBeDefined();
      expect(spacing.maxIntervalDays).toBeDefined();
      expect(spacing.minIntervalDays).toBeLessThanOrEqual(spacing.recommendedIntervalDays);
      expect(spacing.maxIntervalDays).toBeGreaterThanOrEqual(spacing.recommendedIntervalDays);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect sudden performance drops', () => {
      const dataWithDrop: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.5, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0.6, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.7, timestamp: new Date() },
        { trialNumber: 4, performanceScore: 0.75, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 0.3, timestamp: new Date() }, // Sudden drop
        { trialNumber: 6, performanceScore: 0.7, timestamp: new Date() },
      ];

      const anomalies = analyzer.detectAnomalies(dataWithDrop);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some((a) => a.trialNumber === 5)).toBe(true);
      expect(anomalies.some((a) => a.type === 'sudden_drop')).toBe(true);
    });

    it('should detect unusually fast responses', () => {
      const dataWithFast: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.8, responseTime: 10000, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0.8, responseTime: 12000, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.8, responseTime: 500, timestamp: new Date() }, // Too fast
        { trialNumber: 4, performanceScore: 0.8, responseTime: 11000, timestamp: new Date() },
      ];

      const anomalies = analyzer.detectAnomalies(dataWithFast);

      expect(anomalies.some((a) => a.type === 'suspicious_speed')).toBe(true);
    });

    it('should return empty array for normal data', () => {
      const normalData: LearningCurveDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        trialNumber: i + 1,
        performanceScore: 0.4 + i * 0.05 + (Math.random() - 0.5) * 0.05,
        responseTime: 8000 + Math.random() * 4000,
        timestamp: new Date(),
      }));

      const anomalies = analyzer.detectAnomalies(normalData);

      // Normal data should have few or no anomalies
      expect(anomalies.length).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const analysis = analyzer.analyze([]);

      expect(analysis.learningRate).toBe(0);
      expect(analysis.currentPerformance).toBe(0);
    });

    it('should handle single data point', () => {
      const singlePoint: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.5, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(singlePoint);

      expect(analysis.currentPerformance).toBe(0.5);
    });

    it('should handle data with gaps in trial numbers', () => {
      const gappyData: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0.3, timestamp: new Date() },
        { trialNumber: 5, performanceScore: 0.5, timestamp: new Date() },
        { trialNumber: 10, performanceScore: 0.7, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(gappyData);

      expect(analysis.learningRate).toBeGreaterThan(0);
    });

    it('should handle zero performance scores', () => {
      const zeroData: LearningCurveDataPoint[] = [
        { trialNumber: 1, performanceScore: 0, timestamp: new Date() },
        { trialNumber: 2, performanceScore: 0, timestamp: new Date() },
        { trialNumber: 3, performanceScore: 0.1, timestamp: new Date() },
      ];

      const analysis = analyzer.analyze(zeroData);

      expect(analysis.learningRate).toBeGreaterThanOrEqual(0);
    });
  });
});
