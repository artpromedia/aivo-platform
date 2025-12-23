/**
 * Performance Factor Analysis (PFA) Types
 *
 * PFA is a logistic regression-based approach to modeling student knowledge.
 * Unlike BKT's hidden state, PFA directly models success probability using
 * observable features (counts of successes and failures).
 *
 * Reference:
 * - Pavlik, P.I., Cen, H., & Koedinger, K.R. (2009). Performance Factors Analysis
 */

/**
 * PFA parameters for a skill
 */
export interface PFAParameters {
  /** Intercept (baseline difficulty, lower = harder) */
  beta: number;

  /** Weight for prior successes (typically positive) */
  gamma: number;

  /** Weight for prior failures (typically negative) */
  rho: number;
}

/**
 * PFA state for a learner-skill pair
 */
export interface PFAState {
  /** Skill identifier */
  skillId: string;

  /** Total number of successes */
  successes: number;

  /** Total number of failures */
  failures: number;

  /** Current predicted probability of success */
  predictedSuccess: number;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * PFA training example
 */
export interface PFAExample {
  /** Skill ID */
  skillId: string;

  /** Number of prior successes before this attempt */
  priorSuccesses: number;

  /** Number of prior failures before this attempt */
  priorFailures: number;

  /** Whether this attempt was successful */
  correct: boolean;
}

/**
 * Multi-skill PFA state for a learner
 */
export interface LearnerPFAState {
  /** Learner identifier */
  learnerId: string;

  /** Map of skill ID to PFA state */
  skills: Map<string, PFAState>;

  /** Overall predicted success rate */
  overallPredictedSuccess: number;

  /** Last updated timestamp */
  updatedAt: Date;
}
