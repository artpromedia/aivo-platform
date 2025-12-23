/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Learning Curve Analyzer
 *
 * Analyzes learning patterns to:
 * - Fit learning curve models (power law, exponential)
 * - Detect plateaus and anomalies
 * - Predict future performance
 * - Optimize practice spacing (spacing effect)
 * - Model forgetting curves
 *
 * References:
 * - Newell, A., & Rosenbloom, P.S. (1981). Mechanisms of skill acquisition
 * - Ebbinghaus, H. (1885). Memory: A contribution to experimental psychology
 * - Cepeda, N.J., et al. (2006). Distributed practice in verbal recall tasks
 */

import type { PracticeOutcome } from '../bkt/types.js';

import type {
  LearningCurveAnalysis,
  LearningAnomaly,
  RollingWindowStats,
  ForgettingCurveAnalysis,
  SpacingOptimization,
  PowerLawParams,
  ExponentialParams,
  LearningCurveModel,
} from './types.js';

/**
 * Learning Curve Analyzer implementation
 */
export class LearningCurveAnalyzer {
  private readonly MIN_DATA_POINTS = 5;
  private readonly PLATEAU_THRESHOLD = 0.02; // Max change to consider plateau
  private readonly PLATEAU_WINDOW = 5; // Consecutive attempts to check for plateau

  /**
   * Analyze learning curve from practice history
   *
   * @param history - Practice outcomes in chronological order
   * @param predictAhead - How many practices ahead to predict
   * @returns Learning curve analysis
   */
  analyze(history: PracticeOutcome[], predictAhead = 5): LearningCurveAnalysis {
    if (history.length < this.MIN_DATA_POINTS) {
      return this.createLowConfidenceResult(history);
    }

    // Calculate accuracy at each point
    const accuracyByPractice = this.calculateRollingAccuracy(history, 3);

    // Fit both power law and exponential, choose better fit
    const powerFit = this.fitPowerLaw(accuracyByPractice);
    const expFit = this.fitExponential(accuracyByPractice);

    // Choose model with better R-squared
    const usePower = powerFit.rSquared >= expFit.rSquared;
    const model: LearningCurveModel = usePower ? 'power' : 'exponential';
    const params = usePower ? powerFit.params : expFit.params;
    const rSquared = usePower ? powerFit.rSquared : expFit.rSquared;

    // Current performance (last rolling average)
    const currentPerformance = accuracyByPractice.length > 0 ? (accuracyByPractice.at(-1) ?? 0) : 0;

    // Predict future performance
    const n = history.length + predictAhead;
    const predictedPerformance = usePower
      ? this.predictPowerLaw(powerFit.params, n)
      : this.predictExponential(expFit.params, n);

    // Detect plateau
    const { plateau, plateauLevel } = this.detectPlateau(accuracyByPractice);

    // Calculate learning rate
    const learningRate = this.calculateLearningRate(accuracyByPractice);

    // Detect anomalies
    const anomalies = this.detectAnomalies(history, accuracyByPractice);

    // Calculate confidence based on data and fit quality
    const confidence = Math.min(1, (history.length / 20) * 0.5 + rSquared * 0.5);

    return {
      model,
      params,
      rSquared,
      currentPerformance,
      predictedPerformance,
      plateau,
      plateauLevel: plateau ? plateauLevel : undefined,
      learningRate,
      confidence,
      anomalies,
    };
  }

  /**
   * Calculate rolling accuracy (moving average of correct rate)
   */
  private calculateRollingAccuracy(history: PracticeOutcome[], windowSize: number): number[] {
    if (history.length === 0) return [];

    const accuracies: number[] = [];

    for (let i = 0; i < history.length; i++) {
      const windowStart = Math.max(0, i - windowSize + 1);
      const window = history.slice(windowStart, i + 1);
      const correct = window.filter((o) => o.correct).length;
      accuracies.push(correct / window.length);
    }

    return accuracies;
  }

  /**
   * Fit power law: P(n) = 1 - a * n^(-b)
   * Uses linear regression on log-transformed data
   */
  private fitPowerLaw(accuracies: number[]): { params: PowerLawParams; rSquared: number } {
    if (accuracies.length < 2) {
      return { params: { a: 0.5, b: 0.5 }, rSquared: 0 };
    }

    // Transform: log(1 - P) = log(a) - b * log(n)
    const logData: { logN: number; logError: number }[] = [];

    for (let i = 0; i < accuracies.length; i++) {
      const p = accuracies[i];
      if (p === undefined) continue;
      const n = i + 1;
      const error = 1 - p;

      if (error > 0.001 && error < 0.999) {
        logData.push({ logN: Math.log(n), logError: Math.log(error) });
      }
    }

    if (logData.length < 2) {
      return { params: { a: 0.5, b: 0.5 }, rSquared: 0 };
    }

    // Linear regression: logError = logA - b * logN
    const { slope, intercept, rSquared } = this.linearRegression(
      logData.map((d) => d.logN),
      logData.map((d) => d.logError)
    );

    const a = Math.exp(intercept);
    const b = -slope;

    return {
      params: { a: Math.max(0.01, Math.min(1, a)), b: Math.max(0.01, Math.min(2, b)) },
      rSquared: Math.max(0, rSquared),
    };
  }

  /**
   * Fit exponential: P(n) = 1 - a * e^(-b*n)
   * Uses linear regression on log-transformed data
   */
  private fitExponential(accuracies: number[]): { params: ExponentialParams; rSquared: number } {
    if (accuracies.length < 2) {
      return { params: { a: 0.5, b: 0.1 }, rSquared: 0 };
    }

    // Transform: log(1 - P) = log(a) - b * n
    const logData: { n: number; logError: number }[] = [];

    for (let i = 0; i < accuracies.length; i++) {
      const p = accuracies[i];
      if (p === undefined) continue;
      const n = i + 1;
      const error = 1 - p;

      if (error > 0.001 && error < 0.999) {
        logData.push({ n, logError: Math.log(error) });
      }
    }

    if (logData.length < 2) {
      return { params: { a: 0.5, b: 0.1 }, rSquared: 0 };
    }

    // Linear regression: logError = logA - b * n
    const { slope, intercept, rSquared } = this.linearRegression(
      logData.map((d) => d.n),
      logData.map((d) => d.logError)
    );

    const a = Math.exp(intercept);
    const b = -slope;

    return {
      params: { a: Math.max(0.01, Math.min(1, a)), b: Math.max(0.001, Math.min(1, b)) },
      rSquared: Math.max(0, rSquared),
    };
  }

  /**
   * Simple linear regression
   */
  private linearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      if (xi === undefined || yi === undefined) continue;

      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      if (xi === undefined || yi === undefined) continue;

      const predicted = slope * xi + intercept;
      ssRes += (yi - predicted) ** 2;
      ssTot += (yi - meanY) ** 2;
    }

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      slope: Number.isNaN(slope) ? 0 : slope,
      intercept: Number.isNaN(intercept) ? 0 : intercept,
      rSquared,
    };
  }

  /**
   * Predict performance using power law
   */
  private predictPowerLaw(params: PowerLawParams, n: number): number {
    return Math.max(0, Math.min(1, 1 - params.a * Math.pow(n, -params.b)));
  }

  /**
   * Predict performance using exponential
   */
  private predictExponential(params: ExponentialParams, n: number): number {
    return Math.max(0, Math.min(1, 1 - params.a * Math.exp(-params.b * n)));
  }

  /**
   * Detect learning plateau
   */
  private detectPlateau(accuracies: number[]): { plateau: boolean; plateauLevel: number } {
    if (accuracies.length < this.PLATEAU_WINDOW) {
      return { plateau: false, plateauLevel: 0 };
    }

    const recentWindow = accuracies.slice(-this.PLATEAU_WINDOW);
    const min = Math.min(...recentWindow);
    const max = Math.max(...recentWindow);
    const range = max - min;
    const avg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;

    return {
      plateau: range < this.PLATEAU_THRESHOLD,
      plateauLevel: avg,
    };
  }

  /**
   * Calculate current learning rate (slope of recent improvement)
   */
  private calculateLearningRate(accuracies: number[]): number {
    if (accuracies.length < 3) return 0;

    const recent = accuracies.slice(-5);
    const { slope } = this.linearRegression(
      recent.map((_, i) => i),
      recent
    );

    return slope;
  }

  /**
   * Detect anomalies in learning pattern
   */
  private detectAnomalies(history: PracticeOutcome[], accuracies: number[]): LearningAnomaly[] {
    const anomalies: LearningAnomaly[] = [];

    if (accuracies.length < 5) return anomalies;

    // Calculate statistics
    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, x) => sum + (x - mean) ** 2, 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);

    // Detect sudden drops (2+ std dev below recent mean)
    for (let i = 3; i < accuracies.length; i++) {
      const current = accuracies[i];
      const recent = accuracies.slice(i - 3, i);
      const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;

      if (current !== undefined) {
        if (current < recentMean - 2 * stdDev) {
          anomalies.push({
            type: 'sudden_drop',
            atPractice: i + 1,
            severity: Math.min(1, (recentMean - current) / recentMean),
            description: 'Sudden performance drop detected',
          });
        }

        // Detect sudden jumps
        if (current > recentMean + 2 * stdDev && current > 0.8) {
          anomalies.push({
            type: 'sudden_jump',
            atPractice: i + 1,
            severity: Math.min(1, (current - recentMean) / (1 - recentMean)),
            description: 'Unusual performance jump detected',
          });
        }
      }
    }

    // Detect regression (sustained decline)
    if (accuracies.length >= 8) {
      const firstHalf = accuracies.slice(0, Math.floor(accuracies.length / 2));
      const secondHalf = accuracies.slice(Math.floor(accuracies.length / 2));

      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondMean < firstMean - 0.1) {
        anomalies.push({
          type: 'regression',
          atPractice: Math.floor(accuracies.length / 2),
          severity: Math.min(1, (firstMean - secondMean) / firstMean),
          description: 'Performance regression: later performance worse than earlier',
        });
      }
    }

    // Detect high variability
    if (stdDev > 0.25) {
      anomalies.push({
        type: 'variability',
        atPractice: accuracies.length,
        severity: Math.min(1, stdDev / 0.5),
        description: 'High performance variability detected',
      });
    }

    return anomalies;
  }

  /**
   * Create a low-confidence result when insufficient data
   */
  private createLowConfidenceResult(history: PracticeOutcome[]): LearningCurveAnalysis {
    const correct = history.filter((h) => h.correct).length;
    const currentPerformance = history.length > 0 ? correct / history.length : 0;

    return {
      model: 'power',
      params: { a: 1 - currentPerformance, b: 0.5 },
      rSquared: 0,
      currentPerformance,
      predictedPerformance: currentPerformance,
      plateau: false,
      plateauLevel: undefined,
      learningRate: 0,
      confidence: history.length / this.MIN_DATA_POINTS,
      anomalies: [],
    };
  }

  /**
   * Analyze forgetting curve (retention over time)
   *
   * Uses Ebbinghaus forgetting curve: R = e^(-t/S)
   * Where R is retention, t is time, S is stability (strength of memory)
   *
   * @param lastPractice - Last practice timestamp
   * @param currentMastery - Current mastery level (affects stability)
   * @returns Forgetting curve analysis
   */
  analyzeForgetting(lastPractice: Date, currentMastery: number): ForgettingCurveAnalysis {
    const now = new Date();
    const timeSinceLastPractice = now.getTime() - lastPractice.getTime();

    // Stability increases with mastery
    // Higher mastery = slower forgetting
    const baseHalfLife = 24 * 60 * 60 * 1000; // 1 day in ms
    const stabilityMultiplier = 1 + currentMastery * 4; // 1x to 5x based on mastery
    const retentionHalfLife = baseHalfLife * stabilityMultiplier;

    // Retention: R = 0.5^(t/halfLife) = e^(-t * ln(2) / halfLife)
    const predictedRetention = Math.pow(0.5, timeSinceLastPractice / retentionHalfLife);

    // Recommend review when retention drops to 70%
    const targetRetention = 0.7;
    let recommendedReviewTime: Date | null = null;

    if (predictedRetention > targetRetention) {
      // Calculate when retention will hit target
      // 0.7 = 0.5^(t/halfLife)
      // log(0.7) = (t/halfLife) * log(0.5)
      // t = halfLife * log(0.7) / log(0.5)
      const timeToTarget = (retentionHalfLife * Math.log(targetRetention)) / Math.log(0.5);
      recommendedReviewTime = new Date(lastPractice.getTime() + timeToTarget);
    }

    return {
      timeSinceLastPractice,
      predictedRetention,
      recommendedReviewTime,
      retentionHalfLife,
    };
  }

  /**
   * Calculate optimal spacing for next practice
   *
   * Based on spacing effect research:
   * - Optimal spacing increases with mastery
   * - Too soon = wasted effort
   * - Too late = excessive forgetting
   *
   * @param currentMastery - Current mastery level
   * @param successStreak - Number of consecutive successes
   * @returns Spacing optimization recommendation
   */
  calculateOptimalSpacing(currentMastery: number, successStreak: number): SpacingOptimization {
    // Base spacing: 1 day
    const baseSpacing = 24 * 60 * 60 * 1000;

    // Optimal spacing increases with mastery and success streak
    // Using exponential expansion similar to spaced repetition systems
    const masteryFactor = 1 + currentMastery * 2; // 1x to 3x
    const streakFactor = Math.pow(2, Math.min(successStreak, 5) / 2); // 1x to ~2.8x

    const optimalDelay = baseSpacing * masteryFactor * streakFactor;

    // Minimum: at least a few hours (avoid cramming)
    const minDelay = 4 * 60 * 60 * 1000; // 4 hours

    // Maximum: don't wait too long (forgetting curve)
    const maxDelay = Math.min(optimalDelay * 2, 30 * 24 * 60 * 60 * 1000); // 30 days max

    // Confidence based on available data
    const confidence = Math.min(1, currentMastery * 0.5 + successStreak * 0.1);

    return {
      optimalDelay,
      minDelay,
      maxDelay,
      confidence,
    };
  }

  /**
   * Get rolling window statistics for learning analysis
   */
  getRollingStats(history: PracticeOutcome[], windowSize = 10): RollingWindowStats | null {
    if (history.length < windowSize) {
      return null;
    }

    const window = history.slice(-windowSize);
    const accuracies: number[] = window.map((o) => (o.correct ? 1 : 0));
    const avgPerformance = accuracies.reduce((a, b) => a + b, 0) / windowSize;

    // Standard deviation
    const variance = accuracies.reduce((sum, x) => sum + (x - avgPerformance) ** 2, 0) / windowSize;
    const stdDev = Math.sqrt(variance);

    // Trend (linear regression slope)
    const { slope } = this.linearRegression(
      accuracies.map((_, i) => i),
      accuracies
    );

    let trend: 'up' | 'down' | 'flat';
    if (slope > 0.02) {
      trend = 'up';
    } else if (slope < -0.02) {
      trend = 'down';
    } else {
      trend = 'flat';
    }

    return {
      windowSize,
      avgPerformance,
      stdDev,
      trend,
      trendMagnitude: slope,
    };
  }
}
