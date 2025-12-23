/**
 * Bayesian Knowledge Tracing Tests
 *
 * Comprehensive tests for the BKT implementation including:
 * - Basic knowledge updates
 * - Context-aware updates
 * - Mastery detection
 * - Parameter fitting
 * - Neurodiverse learner adaptations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BayesianKnowledgeTracing } from '../src/models/bkt/bayesian-knowledge-tracing.js';
import type { BKTParameters, KnowledgeState, PracticeOutcome } from '../src/models/bkt/types.js';

describe('BayesianKnowledgeTracing', () => {
  let bkt: BayesianKnowledgeTracing;
  let defaultParams: BKTParameters;

  beforeEach(() => {
    defaultParams = {
      pLearn: 0.1, // 10% initial knowledge
      pTransit: 0.1, // 10% learning rate per opportunity
      pGuess: 0.2, // 20% chance of guessing correctly
      pSlip: 0.1, // 10% chance of slipping when known
    };
    bkt = new BayesianKnowledgeTracing(defaultParams);
  });

  describe('initializeState', () => {
    it('should initialize state with prior knowledge probability', () => {
      const state = bkt.initializeState();
      expect(state.pKnow).toBe(0.1);
      expect(state.practiceCount).toBe(0);
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it('should allow custom initial knowledge', () => {
      const customBkt = new BayesianKnowledgeTracing({
        ...defaultParams,
        pLearn: 0.3,
      });
      const state = customBkt.initializeState();
      expect(state.pKnow).toBe(0.3);
    });
  });

  describe('updateKnowledge', () => {
    it('should increase pKnow after correct answer', () => {
      const initialState = bkt.initializeState();
      const newState = bkt.updateKnowledge(initialState, true);

      expect(newState.pKnow).toBeGreaterThan(initialState.pKnow);
      expect(newState.practiceCount).toBe(1);
    });

    it('should decrease pKnow after incorrect answer', () => {
      // Start with higher knowledge to see decrease
      const highKnowledgeState: KnowledgeState = {
        pKnow: 0.7,
        practiceCount: 5,
        lastUpdated: new Date(),
      };
      const newState = bkt.updateKnowledge(highKnowledgeState, false);

      expect(newState.pKnow).toBeLessThan(highKnowledgeState.pKnow);
    });

    it('should apply learning transition after update', () => {
      const initialState = bkt.initializeState();
      const afterCorrect = bkt.updateKnowledge(initialState, true);

      // After correct answer, pKnow should increase due to both:
      // 1. Bayesian update (evidence of knowledge)
      // 2. Learning transition (chance of acquiring knowledge)
      expect(afterCorrect.pKnow).toBeGreaterThan(initialState.pKnow);
    });

    it('should converge to high probability after multiple correct answers', () => {
      let state = bkt.initializeState();

      // Simulate 20 correct answers in a row
      for (let i = 0; i < 20; i++) {
        state = bkt.updateKnowledge(state, true);
      }

      expect(state.pKnow).toBeGreaterThan(0.9);
    });

    it('should recover from incorrect answers', () => {
      let state: KnowledgeState = {
        pKnow: 0.8,
        practiceCount: 10,
        lastUpdated: new Date(),
      };

      // Make a mistake
      state = bkt.updateKnowledge(state, false);
      const afterMistake = state.pKnow;

      // Then get several correct
      for (let i = 0; i < 5; i++) {
        state = bkt.updateKnowledge(state, true);
      }

      expect(state.pKnow).toBeGreaterThan(afterMistake);
    });
  });

  describe('updateKnowledgeWithContext', () => {
    it('should boost learning for fast correct responses', () => {
      const state = bkt.initializeState();

      const fastCorrect: PracticeOutcome = {
        isCorrect: true,
        responseTime: 2000, // 2 seconds - fast
        hintsUsed: 0,
        attemptNumber: 1,
      };

      const slowCorrect: PracticeOutcome = {
        isCorrect: true,
        responseTime: 30000, // 30 seconds - slow
        hintsUsed: 0,
        attemptNumber: 1,
      };

      const afterFast = bkt.updateKnowledgeWithContext(state, fastCorrect);
      const afterSlow = bkt.updateKnowledgeWithContext(state, slowCorrect);

      // Fast correct should result in higher confidence
      expect(afterFast.pKnow).toBeGreaterThanOrEqual(afterSlow.pKnow);
    });

    it('should penalize hint usage', () => {
      const state = bkt.initializeState();

      const noHints: PracticeOutcome = {
        isCorrect: true,
        hintsUsed: 0,
        attemptNumber: 1,
      };

      const withHints: PracticeOutcome = {
        isCorrect: true,
        hintsUsed: 3,
        attemptNumber: 1,
      };

      const afterNoHints = bkt.updateKnowledgeWithContext(state, noHints);
      const afterHints = bkt.updateKnowledgeWithContext(state, withHints);

      // Using hints suggests less independent knowledge
      expect(afterNoHints.pKnow).toBeGreaterThanOrEqual(afterHints.pKnow);
    });

    it('should consider difficulty level', () => {
      const state: KnowledgeState = {
        pKnow: 0.5,
        practiceCount: 5,
        lastUpdated: new Date(),
      };

      const easyCorrect: PracticeOutcome = {
        isCorrect: true,
        difficulty: 1,
        attemptNumber: 1,
      };

      const hardCorrect: PracticeOutcome = {
        isCorrect: true,
        difficulty: 5,
        attemptNumber: 1,
      };

      const afterEasy = bkt.updateKnowledgeWithContext(state, easyCorrect);
      const afterHard = bkt.updateKnowledgeWithContext(state, hardCorrect);

      // Correct on hard problem is stronger evidence
      expect(afterHard.pKnow).toBeGreaterThanOrEqual(afterEasy.pKnow);
    });

    it('should consider attempt number', () => {
      const state = bkt.initializeState();

      const firstAttempt: PracticeOutcome = {
        isCorrect: true,
        attemptNumber: 1,
      };

      const thirdAttempt: PracticeOutcome = {
        isCorrect: true,
        attemptNumber: 3,
      };

      const afterFirst = bkt.updateKnowledgeWithContext(state, firstAttempt);
      const afterThird = bkt.updateKnowledgeWithContext(state, thirdAttempt);

      // First attempt correct is stronger evidence
      expect(afterFirst.pKnow).toBeGreaterThanOrEqual(afterThird.pKnow);
    });
  });

  describe('predictCorrect', () => {
    it('should predict low probability for low knowledge', () => {
      const lowKnowledge: KnowledgeState = {
        pKnow: 0.1,
        practiceCount: 0,
        lastUpdated: new Date(),
      };

      const prediction = bkt.predictCorrect(lowKnowledge);

      // P(correct) = P(know) * (1 - P(slip)) + (1 - P(know)) * P(guess)
      // = 0.1 * 0.9 + 0.9 * 0.2 = 0.09 + 0.18 = 0.27
      expect(prediction).toBeCloseTo(0.27, 2);
    });

    it('should predict high probability for high knowledge', () => {
      const highKnowledge: KnowledgeState = {
        pKnow: 0.95,
        practiceCount: 20,
        lastUpdated: new Date(),
      };

      const prediction = bkt.predictCorrect(highKnowledge);

      // P(correct) = 0.95 * 0.9 + 0.05 * 0.2 = 0.855 + 0.01 = 0.865
      expect(prediction).toBeCloseTo(0.865, 2);
    });
  });

  describe('isMastered', () => {
    it('should return false for low knowledge', () => {
      const lowKnowledge: KnowledgeState = {
        pKnow: 0.5,
        practiceCount: 5,
        lastUpdated: new Date(),
      };

      expect(bkt.isMastered(lowKnowledge)).toBe(false);
    });

    it('should return true for high knowledge', () => {
      const highKnowledge: KnowledgeState = {
        pKnow: 0.98,
        practiceCount: 20,
        lastUpdated: new Date(),
      };

      expect(bkt.isMastered(highKnowledge)).toBe(true);
    });

    it('should respect custom threshold', () => {
      const mediumKnowledge: KnowledgeState = {
        pKnow: 0.85,
        practiceCount: 15,
        lastUpdated: new Date(),
      };

      expect(bkt.isMastered(mediumKnowledge, 0.95)).toBe(false);
      expect(bkt.isMastered(mediumKnowledge, 0.8)).toBe(true);
    });
  });

  describe('createPersonalized', () => {
    it('should adjust slip rate for ADHD learners', () => {
      const { parameters: adjustedParams } = BayesianKnowledgeTracing.createPersonalized(
        defaultParams,
        {
          conditions: { adhd: true },
          masteryThreshold: 0.95,
          slipRateMultiplier: 1.5,
        }
      );

      // Higher slip rate for ADHD (attention issues)
      expect(adjustedParams.pSlip).toBeGreaterThan(defaultParams.pSlip);
    });

    it('should adjust response time expectations for processing delays', () => {
      const config = BayesianKnowledgeTracing.createPersonalized(defaultParams, {
        conditions: { processingDelay: true },
        masteryThreshold: 0.9,
        responseTimeMultiplier: 2.0,
      });

      expect(config.responseTimeMultiplier).toBe(2.0);
    });

    it('should lower mastery threshold when specified', () => {
      const config = BayesianKnowledgeTracing.createPersonalized(defaultParams, {
        conditions: { dyslexia: true },
        masteryThreshold: 0.85,
      });

      expect(config.masteryThreshold).toBe(0.85);
    });
  });

  describe('fitParameters', () => {
    it('should fit parameters from practice data', () => {
      // Create synthetic practice data with known pattern
      const practiceData: Array<{ isCorrect: boolean; priorPKnow: number }> = [];

      // Simulate learning: starts with low accuracy, improves over time
      let knowledge = 0.1;
      for (let i = 0; i < 20; i++) {
        const isCorrect = Math.random() < knowledge * 0.9 + 0.1 * 0.2;
        practiceData.push({ isCorrect, priorPKnow: knowledge });
        if (isCorrect) {
          knowledge = Math.min(knowledge + 0.08, 1);
        }
      }

      const fittedParams = BayesianKnowledgeTracing.fitParameters(practiceData);

      // Fitted parameters should be reasonable
      expect(fittedParams.pLearn).toBeGreaterThan(0);
      expect(fittedParams.pLearn).toBeLessThan(1);
      expect(fittedParams.pTransit).toBeGreaterThan(0);
      expect(fittedParams.pTransit).toBeLessThan(1);
      expect(fittedParams.pGuess).toBeGreaterThan(0);
      expect(fittedParams.pGuess).toBeLessThan(0.5);
      expect(fittedParams.pSlip).toBeGreaterThan(0);
      expect(fittedParams.pSlip).toBeLessThan(0.5);
    });

    it('should use default parameters for insufficient data', () => {
      const fittedParams = BayesianKnowledgeTracing.fitParameters([]);

      expect(fittedParams.pLearn).toBe(0.1);
      expect(fittedParams.pTransit).toBe(0.1);
      expect(fittedParams.pGuess).toBe(0.2);
      expect(fittedParams.pSlip).toBe(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle pKnow at boundaries', () => {
      const almostCertain: KnowledgeState = {
        pKnow: 0.999,
        practiceCount: 50,
        lastUpdated: new Date(),
      };

      const afterCorrect = bkt.updateKnowledge(almostCertain, true);
      expect(afterCorrect.pKnow).toBeLessThanOrEqual(1);
      expect(afterCorrect.pKnow).toBeGreaterThan(0);
    });

    it('should handle very low knowledge', () => {
      const veryLow: KnowledgeState = {
        pKnow: 0.001,
        practiceCount: 0,
        lastUpdated: new Date(),
      };

      const afterIncorrect = bkt.updateKnowledge(veryLow, false);
      expect(afterIncorrect.pKnow).toBeGreaterThanOrEqual(0);
      expect(afterIncorrect.pKnow).toBeLessThan(1);
    });

    it('should handle extreme parameter values', () => {
      const extremeBkt = new BayesianKnowledgeTracing({
        pLearn: 0.5,
        pTransit: 0.5,
        pGuess: 0.5,
        pSlip: 0.5,
      });

      const state = extremeBkt.initializeState();
      const updated = extremeBkt.updateKnowledge(state, true);

      expect(updated.pKnow).toBeGreaterThanOrEqual(0);
      expect(updated.pKnow).toBeLessThanOrEqual(1);
    });
  });
});
