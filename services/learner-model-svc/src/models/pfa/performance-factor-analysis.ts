/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Performance Factor Analysis (PFA) Implementation
 *
 * PFA is a logistic regression-based approach to modeling student knowledge.
 * Unlike BKT's hidden state, PFA directly models success probability using
 * observable features (counts of successes and failures).
 *
 * The model: P(correct) = sigmoid(β + γ*successes + ρ*failures)
 *
 * Advantages over BKT:
 * - No hidden state to infer (computationally simpler)
 * - Parameters are more interpretable
 * - Easier to extend with additional features
 * - Better handles skills with variable difficulty items
 *
 * Reference:
 * - Pavlik, P.I., Cen, H., & Koedinger, K.R. (2009). Performance Factors Analysis
 */

import type { PFAParameters, PFAState, PFAExample, LearnerPFAState } from './types.js';

/**
 * Default PFA parameters (based on research literature)
 */
export const DEFAULT_PFA_PARAMS: PFAParameters = {
  beta: -1.0, // Intercept (skill difficulty)
  gamma: 0.3, // Success weight (positive = successes help)
  rho: -0.1, // Failure weight (negative = failures hurt, but less than successes help)
};

/**
 * Performance Factor Analysis implementation
 */
export class PerformanceFactorAnalysis {
  constructor(
    private readonly skillParams: Map<string, PFAParameters> = new Map(),
    private readonly defaultParams: PFAParameters = DEFAULT_PFA_PARAMS
  ) {}

  /**
   * Sigmoid function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Predict probability of correct response
   *
   * @param state - Current PFA state for the skill
   * @param params - Optional skill-specific parameters
   * @returns Probability of correct response (0-1)
   */
  predictCorrect(state: PFAState, params?: PFAParameters): number {
    const p = params ?? this.getParams(state.skillId);
    const logit = p.beta + p.gamma * state.successes + p.rho * state.failures;
    return this.sigmoid(logit);
  }

  /**
   * Update state after an outcome
   *
   * @param state - Current PFA state
   * @param correct - Whether the response was correct
   * @returns Updated PFA state
   */
  updateState(state: PFAState, correct: boolean): PFAState {
    const newState: PFAState = {
      skillId: state.skillId,
      successes: state.successes + (correct ? 1 : 0),
      failures: state.failures + (correct ? 0 : 1),
      predictedSuccess: 0, // Will be calculated below
      updatedAt: new Date(),
    };

    newState.predictedSuccess = this.predictCorrect(newState);
    return newState;
  }

  /**
   * Initialize state for a new skill
   *
   * @param skillId - Skill identifier
   * @param priorSuccesses - Optional prior successes (e.g., from pretest)
   * @param priorFailures - Optional prior failures
   * @returns Initial PFA state
   */
  initializeState(skillId: string, priorSuccesses = 0, priorFailures = 0): PFAState {
    const state: PFAState = {
      skillId,
      successes: priorSuccesses,
      failures: priorFailures,
      predictedSuccess: 0,
      updatedAt: new Date(),
    };

    state.predictedSuccess = this.predictCorrect(state);
    return state;
  }

  /**
   * Check if skill is mastered (predicted success above threshold)
   *
   * @param state - Current PFA state
   * @param threshold - Mastery threshold (default 0.9)
   * @returns Whether skill is considered mastered
   */
  isMastered(state: PFAState, threshold = 0.9): boolean {
    return state.predictedSuccess >= threshold && state.successes >= 3;
  }

  /**
   * Get parameters for a skill
   */
  getParams(skillId: string): PFAParameters {
    return this.skillParams.get(skillId) ?? this.defaultParams;
  }

  /**
   * Set skill-specific parameters
   */
  setSkillParams(skillId: string, params: PFAParameters): void {
    this.skillParams.set(skillId, params);
  }

  /**
   * Estimate attempts needed to reach mastery
   *
   * @param state - Current PFA state
   * @param threshold - Mastery threshold
   * @returns Estimated attempts to mastery
   */
  estimateAttemptsToMastery(state: PFAState, threshold = 0.9): number {
    if (state.predictedSuccess >= threshold) return 0;

    const params = this.getParams(state.skillId);
    let tempState = { ...state };
    let attempts = 0;
    const maxAttempts = 50;

    // Simulate assuming 80% correct rate going forward
    while (tempState.predictedSuccess < threshold && attempts < maxAttempts) {
      // Simulate a likely-correct response
      const isCorrect = Math.random() < 0.8;
      tempState = this.updateState(tempState, isCorrect);
      attempts++;
    }

    return attempts;
  }

  /**
   * Update a multi-skill learner state
   *
   * @param learnerState - Current learner state
   * @param skillId - Skill that was practiced
   * @param correct - Whether response was correct
   * @returns Updated learner state
   */
  updateLearnerState(
    learnerState: LearnerPFAState,
    skillId: string,
    correct: boolean
  ): LearnerPFAState {
    const currentSkillState = learnerState.skills.get(skillId) ?? this.initializeState(skillId);
    const updatedSkillState = this.updateState(currentSkillState, correct);

    const newSkills = new Map(learnerState.skills);
    newSkills.set(skillId, updatedSkillState);

    // Calculate overall predicted success
    let totalPredicted = 0;
    let count = 0;
    for (const [_, skillState] of newSkills) {
      totalPredicted += skillState.predictedSuccess;
      count++;
    }

    return {
      learnerId: learnerState.learnerId,
      skills: newSkills,
      overallPredictedSuccess: count > 0 ? totalPredicted / count : 0,
      updatedAt: new Date(),
    };
  }

  /**
   * Initialize a learner state
   *
   * @param learnerId - Learner identifier
   * @returns Initial learner state
   */
  initializeLearnerState(learnerId: string): LearnerPFAState {
    return {
      learnerId,
      skills: new Map(),
      overallPredictedSuccess: 0,
      updatedAt: new Date(),
    };
  }

  /**
   * Fit PFA parameters from training data using logistic regression
   * Uses gradient descent for optimization
   *
   * @param examples - Training examples
   * @param learningRate - Gradient descent learning rate
   * @param iterations - Number of iterations
   * @returns Fitted parameters
   */
  static fitParameters(
    examples: PFAExample[],
    learningRate = 0.01,
    iterations = 1000
  ): PFAParameters {
    // Initialize parameters
    let beta = -1.0;
    let gamma = 0.3;
    let rho = -0.1;

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    for (let iter = 0; iter < iterations; iter++) {
      let gradBeta = 0;
      let gradGamma = 0;
      let gradRho = 0;

      for (const example of examples) {
        const logit = beta + gamma * example.priorSuccesses + rho * example.priorFailures;
        const predicted = sigmoid(logit);
        const target = example.correct ? 1 : 0;
        const error = target - predicted;

        // Gradient for logistic regression
        gradBeta += error;
        gradGamma += error * example.priorSuccesses;
        gradRho += error * example.priorFailures;
      }

      // Update parameters
      beta += learningRate * (gradBeta / examples.length);
      gamma += learningRate * (gradGamma / examples.length);
      rho += learningRate * (gradRho / examples.length);
    }

    // Constrain parameters to reasonable ranges
    return {
      beta: Math.max(-5, Math.min(5, beta)),
      gamma: Math.max(0.01, Math.min(1, gamma)),
      rho: Math.max(-0.5, Math.min(0, rho)),
    };
  }

  /**
   * Combine BKT and PFA predictions for ensemble modeling
   * Research shows ensemble approaches often outperform either alone
   *
   * @param bktPrediction - BKT prediction (0-1)
   * @param pfaPrediction - PFA prediction (0-1)
   * @param bktWeight - Weight for BKT (0-1), PFA weight = 1 - bktWeight
   * @returns Combined prediction
   */
  static ensemblePrediction(bktPrediction: number, pfaPrediction: number, bktWeight = 0.5): number {
    return bktWeight * bktPrediction + (1 - bktWeight) * pfaPrediction;
  }
}

export * from './types.js';
