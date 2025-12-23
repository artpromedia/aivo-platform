/**
 * Type definitions for Bayesian Knowledge Tracing (BKT)
 *
 * BKT models student knowledge as a hidden Markov model with four parameters:
 * - P(L₀): Prior probability of knowing the skill before any practice
 * - P(T):  Probability of learning the skill after each opportunity (transition)
 * - P(G):  Probability of guessing correctly without knowing (guess)
 * - P(S):  Probability of making a mistake despite knowing (slip)
 *
 * References:
 * - Corbett, A.T. & Anderson, J.R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge
 * - Baker, R.S., Corbett, A.T., & Aleven, V. (2008). More Accurate Student Modeling through Contextual Estimation
 */

/**
 * BKT model parameters for a skill
 */
export interface BKTParameters {
  /** Prior probability of mastery (P(L₀)) - typically 0.0 to 0.5 */
  pInit: number;

  /** Probability of learning per opportunity (P(T)) - typically 0.05 to 0.4 */
  pLearn: number;

  /** Probability of guessing correctly (P(G)) - typically 0.1 to 0.3 */
  pGuess: number;

  /** Probability of slipping (P(S)) - typically 0.05 to 0.2 */
  pSlip: number;
}

/**
 * Current knowledge state for a learner on a skill
 */
export interface KnowledgeState {
  /** Current probability of mastery P(Lₙ) */
  pMastery: number;

  /** Number of practice opportunities */
  opportunities: number;

  /** Number of correct responses */
  correct: number;

  /** Estimated attempts to reach mastery threshold */
  estimatedAttemptsToMastery: number;

  /** Confidence in the estimate (based on observations) */
  confidence: number;

  /** Trend: improving, stable, or declining */
  trend: 'improving' | 'stable' | 'declining';

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * A practice outcome (observation) for BKT update
 */
export interface PracticeOutcome {
  /** Skill identifier */
  skillId: string;

  /** Whether the response was correct */
  correct: boolean;

  /** Response time in milliseconds */
  responseTime?: number | undefined;

  /** Number of hints used */
  hintsUsed?: number | undefined;

  /** Number of attempts on this problem */
  attemptsOnProblem?: number | undefined;

  /** Timestamp of the outcome */
  timestamp: Date;
}

/**
 * Forward-backward algorithm results for HMM
 */
export interface ForwardBackwardResult {
  /** Forward probabilities (alpha) */
  alpha: number[];

  /** Backward probabilities (beta) */
  beta: number[];

  /** Posterior probabilities (gamma) */
  gamma: number[];
}

/**
 * Configuration for BKT parameter fitting
 */
export interface BKTFitConfig {
  /** Maximum EM iterations */
  maxIterations: number;

  /** Convergence threshold for parameter changes */
  convergenceThreshold: number;

  /** Initial parameter guesses */
  initialParams?: Partial<BKTParameters> | undefined;
}

/**
 * Neurodiverse profile for personalized BKT parameters
 */
export interface NeurodiverseProfile {
  /** Whether learner has ADHD */
  adhd?: boolean | undefined;

  /** Whether learner has dyslexia */
  dyslexia?: boolean | undefined;

  /** Whether learner is on autism spectrum */
  autism?: boolean | undefined;

  /** Processing speed characteristic */
  processingSpeed?: 'slow' | 'average' | 'fast' | undefined;

  /** Working memory capacity */
  workingMemory?: 'low' | 'average' | 'high' | undefined;
}

/**
 * Personalized BKT configuration based on learner profile
 */
export interface PersonalizedBKTConfig {
  /** Base parameters (may be adjusted per learner) */
  baseParams: BKTParameters;

  /** Mastery threshold (default 0.95) */
  masteryThreshold: number;

  /** Minimum observations for confidence (default 5) */
  minObservationsForConfidence: number;

  /** Whether to use extended time thresholds */
  useExtendedTimeThresholds: boolean;

  /** Multiplier for time-based adjustments */
  timeMultiplier: number;
}
