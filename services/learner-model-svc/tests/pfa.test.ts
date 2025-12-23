/**
 * Performance Factor Analysis Tests
 *
 * Tests for the PFA implementation including:
 * - State updates
 * - Prediction accuracy
 * - Parameter fitting
 * - Ensemble predictions with BKT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceFactorAnalysis } from '../src/models/pfa/performance-factor-analysis.js';
import type { PFAParameters, PFAState } from '../src/models/pfa/types.js';

describe('PerformanceFactorAnalysis', () => {
  let pfa: PerformanceFactorAnalysis;
  let defaultParams: PFAParameters;

  beforeEach(() => {
    defaultParams = {
      beta: 0.0, // Baseline difficulty
      gamma: 0.3, // Success weight (positive)
      rho: -0.3, // Failure weight (negative)
    };
    pfa = new PerformanceFactorAnalysis(defaultParams);
  });

  describe('initializeState', () => {
    it('should initialize with zero counts', () => {
      const state = pfa.initializeState();
      expect(state.successes).toBe(0);
      expect(state.failures).toBe(0);
    });
  });

  describe('updateState', () => {
    it('should increment successes on correct answer', () => {
      const state = pfa.initializeState();
      const newState = pfa.updateState(state, true);

      expect(newState.successes).toBe(1);
      expect(newState.failures).toBe(0);
    });

    it('should increment failures on incorrect answer', () => {
      const state = pfa.initializeState();
      const newState = pfa.updateState(state, false);

      expect(newState.successes).toBe(0);
      expect(newState.failures).toBe(1);
    });

    it('should accumulate counts over multiple updates', () => {
      let state = pfa.initializeState();

      // 5 correct, 3 incorrect
      for (let i = 0; i < 5; i++) {
        state = pfa.updateState(state, true);
      }
      for (let i = 0; i < 3; i++) {
        state = pfa.updateState(state, false);
      }

      expect(state.successes).toBe(5);
      expect(state.failures).toBe(3);
    });
  });

  describe('predictCorrect', () => {
    it('should predict around 0.5 for new learner', () => {
      const state = pfa.initializeState();
      const prediction = pfa.predictCorrect(state);

      // sigmoid(0) = 0.5
      expect(prediction).toBeCloseTo(0.5, 2);
    });

    it('should predict higher for more successes', () => {
      const lowSuccess: PFAState = { successes: 2, failures: 5 };
      const highSuccess: PFAState = { successes: 10, failures: 2 };

      const lowPrediction = pfa.predictCorrect(lowSuccess);
      const highPrediction = pfa.predictCorrect(highSuccess);

      expect(highPrediction).toBeGreaterThan(lowPrediction);
    });

    it('should predict lower for more failures', () => {
      const lowFailure: PFAState = { successes: 5, failures: 2 };
      const highFailure: PFAState = { successes: 5, failures: 10 };

      const lowPrediction = pfa.predictCorrect(lowFailure);
      const highPrediction = pfa.predictCorrect(highFailure);

      expect(lowPrediction).toBeGreaterThan(highPrediction);
    });

    it('should be bounded between 0 and 1', () => {
      const extremeSuccess: PFAState = { successes: 1000, failures: 0 };
      const extremeFailure: PFAState = { successes: 0, failures: 1000 };

      expect(pfa.predictCorrect(extremeSuccess)).toBeLessThanOrEqual(1);
      expect(pfa.predictCorrect(extremeSuccess)).toBeGreaterThan(0.99);
      expect(pfa.predictCorrect(extremeFailure)).toBeGreaterThanOrEqual(0);
      expect(pfa.predictCorrect(extremeFailure)).toBeLessThan(0.01);
    });
  });

  describe('getLogOdds', () => {
    it('should return 0 for balanced performance', () => {
      // With equal weights and equal counts, log odds should be near 0
      const balancedPfa = new PerformanceFactorAnalysis({
        beta: 0,
        gamma: 0.3,
        rho: -0.3,
      });
      const state: PFAState = { successes: 5, failures: 5 };

      const logOdds = balancedPfa.getLogOdds(state);
      expect(logOdds).toBeCloseTo(0, 1);
    });

    it('should be positive for more successes', () => {
      const state: PFAState = { successes: 10, failures: 2 };
      const logOdds = pfa.getLogOdds(state);

      expect(logOdds).toBeGreaterThan(0);
    });

    it('should be negative for more failures', () => {
      const state: PFAState = { successes: 2, failures: 10 };
      const logOdds = pfa.getLogOdds(state);

      expect(logOdds).toBeLessThan(0);
    });
  });

  describe('ensemblePrediction', () => {
    it('should combine BKT and PFA predictions', () => {
      const pfaState: PFAState = { successes: 5, failures: 2 };
      const bktPKnow = 0.7;

      const ensemble = pfa.ensemblePrediction(pfaState, bktPKnow);

      // Should be between the two individual predictions
      const pfaPred = pfa.predictCorrect(pfaState);
      expect(ensemble).toBeGreaterThan(Math.min(pfaPred, bktPKnow) - 0.1);
      expect(ensemble).toBeLessThan(Math.max(pfaPred, bktPKnow) + 0.1);
    });

    it('should weight predictions based on counts', () => {
      // With few observations, BKT should dominate
      const lowCount: PFAState = { successes: 1, failures: 1 };
      const highCount: PFAState = { successes: 20, failures: 10 };
      const bktPKnow = 0.8;

      const lowCountEnsemble = pfa.ensemblePrediction(lowCount, bktPKnow);
      const highCountEnsemble = pfa.ensemblePrediction(highCount, bktPKnow);

      // Low count should be closer to BKT prediction
      const pfaLowPred = pfa.predictCorrect(lowCount);
      const pfaHighPred = pfa.predictCorrect(highCount);

      // Calculate distances from BKT
      const lowDistFromBkt = Math.abs(lowCountEnsemble - bktPKnow);
      const highDistFromBkt = Math.abs(highCountEnsemble - bktPKnow);

      // Low count ensemble should be closer to BKT
      expect(lowDistFromBkt).toBeLessThanOrEqual(highDistFromBkt + 0.1);
    });
  });

  describe('fitParameters', () => {
    it('should fit parameters from practice history', () => {
      // Create synthetic data with known pattern
      const history: Array<{ isCorrect: boolean; priorState: PFAState }> = [];

      let state: PFAState = { successes: 0, failures: 0 };
      for (let i = 0; i < 20; i++) {
        // Success rate increases with practice
        const successRate = 0.3 + state.successes * 0.05;
        const isCorrect = Math.random() < successRate;
        history.push({ isCorrect, priorState: { ...state } });

        if (isCorrect) {
          state.successes++;
        } else {
          state.failures++;
        }
      }

      const fittedParams = PerformanceFactorAnalysis.fitParameters(history);

      // Gamma should be positive (successes help)
      expect(fittedParams.gamma).toBeGreaterThan(0);
      // Rho should be negative or near zero (failures hurt or neutral)
      expect(fittedParams.rho).toBeLessThanOrEqual(0.1);
    });

    it('should return defaults for empty history', () => {
      const fittedParams = PerformanceFactorAnalysis.fitParameters([]);

      expect(fittedParams.beta).toBe(0);
      expect(fittedParams.gamma).toBe(0.3);
      expect(fittedParams.rho).toBe(-0.3);
    });
  });

  describe('different parameter configurations', () => {
    it('should handle zero weights', () => {
      const zeroPfa = new PerformanceFactorAnalysis({
        beta: 0,
        gamma: 0,
        rho: 0,
      });

      const state: PFAState = { successes: 100, failures: 0 };
      const prediction = zeroPfa.predictCorrect(state);

      // With zero weights, should always predict 0.5
      expect(prediction).toBeCloseTo(0.5, 2);
    });

    it('should handle asymmetric weights', () => {
      // Strong success weight, weak failure weight
      const asymmetricPfa = new PerformanceFactorAnalysis({
        beta: 0,
        gamma: 0.5,
        rho: -0.1,
      });

      const state: PFAState = { successes: 5, failures: 5 };
      const prediction = asymmetricPfa.predictCorrect(state);

      // With stronger success weight, should predict > 0.5
      expect(prediction).toBeGreaterThan(0.5);
    });

    it('should handle positive baseline (easy skill)', () => {
      const easyPfa = new PerformanceFactorAnalysis({
        beta: 1.0, // Easy baseline
        gamma: 0.3,
        rho: -0.3,
      });

      const newLearner: PFAState = { successes: 0, failures: 0 };
      const prediction = easyPfa.predictCorrect(newLearner);

      // Easy skill should have higher baseline prediction
      expect(prediction).toBeGreaterThan(0.5);
    });

    it('should handle negative baseline (hard skill)', () => {
      const hardPfa = new PerformanceFactorAnalysis({
        beta: -1.0, // Hard baseline
        gamma: 0.3,
        rho: -0.3,
      });

      const newLearner: PFAState = { successes: 0, failures: 0 };
      const prediction = hardPfa.predictCorrect(newLearner);

      // Hard skill should have lower baseline prediction
      expect(prediction).toBeLessThan(0.5);
    });
  });
});
