/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Learning Curve Analyzer Types
 *
 * Learning curves model how performance improves with practice.
 * Common models include:
 * - Power Law: P(correct) = 1 - a * n^(-b)
 * - Exponential: P(correct) = 1 - a * e^(-b*n)
 *
 * Reference:
 * - Newell, A., & Rosenbloom, P.S. (1981). Mechanisms of skill acquisition
 * - Martin, B., et al. (2011). Evaluating and optimizing user models
 */

import type { PracticeOutcome } from '../bkt/types.js';

/**
 * Learning curve model type
 */
export type LearningCurveModel = 'power' | 'exponential' | 'linear';

/**
 * Power law learning curve parameters
 * P(correct) = 1 - a * n^(-b)
 */
export interface PowerLawParams {
  /** Initial error rate (a) */
  a: number;

  /** Learning rate exponent (b) */
  b: number;
}

/**
 * Exponential learning curve parameters
 * P(correct) = 1 - a * e^(-b*n)
 */
export interface ExponentialParams {
  /** Initial error rate (a) */
  a: number;

  /** Decay rate (b) */
  b: number;
}

/**
 * Learning curve analysis result
 */
export interface LearningCurveAnalysis {
  /** Model type used */
  model: LearningCurveModel;

  /** Fitted parameters */
  params: PowerLawParams | ExponentialParams;

  /** R-squared (goodness of fit, 0-1) */
  rSquared: number;

  /** Current performance level (0-1) */
  currentPerformance: number;

  /** Predicted performance after n more attempts */
  predictedPerformance: number;

  /** Whether a plateau has been detected */
  plateau: boolean;

  /** Plateau level if detected (0-1) */
  plateauLevel?: number | undefined;

  /** Learning rate (change per practice) */
  learningRate: number;

  /** Confidence in the analysis (based on data points) */
  confidence: number;

  /** Anomalies detected in learning pattern */
  anomalies: LearningAnomaly[];
}

/**
 * Anomaly in learning pattern
 */
export interface LearningAnomaly {
  /** Type of anomaly */
  type: 'sudden_drop' | 'sudden_jump' | 'regression' | 'plateau' | 'variability';

  /** When the anomaly occurred (practice number) */
  atPractice: number;

  /** Severity (0-1) */
  severity: number;

  /** Description */
  description: string;
}

/**
 * Rolling window statistics for learning analysis
 */
export interface RollingWindowStats {
  /** Window size */
  windowSize: number;

  /** Average performance in window */
  avgPerformance: number;

  /** Standard deviation */
  stdDev: number;

  /** Trend direction */
  trend: 'up' | 'down' | 'flat';

  /** Trend magnitude (slope) */
  trendMagnitude: number;
}

/**
 * Forgetting curve analysis
 */
export interface ForgettingCurveAnalysis {
  /** Time since last practice (milliseconds) */
  timeSinceLastPractice: number;

  /** Predicted retention (0-1) */
  predictedRetention: number;

  /** Recommended review time */
  recommendedReviewTime: Date | null;

  /** Half-life of retention (milliseconds) */
  retentionHalfLife: number;
}

/**
 * Spacing effect optimization
 */
export interface SpacingOptimization {
  /** Optimal delay before next practice (milliseconds) */
  optimalDelay: number;

  /** Minimum delay (too soon may not help) */
  minDelay: number;

  /** Maximum delay (beyond which forgetting is significant) */
  maxDelay: number;

  /** Confidence in recommendation */
  confidence: number;
}
