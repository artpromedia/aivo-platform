/**
 * Engagement and Frustration Detection
 *
 * Analyzes behavioral signals to detect:
 * - Disengagement (boredom, distraction)
 * - Frustration (struggling, overwhelmed)
 * - Flow state (optimal engagement)
 *
 * Based on research:
 * - Baker et al. (2010) - Better to be frustrated than bored
 * - D'Mello & Graesser (2012) - Dynamics of affective states
 * - Cocea & Weibelzahl (2009) - Log file analysis for disengagement detection
 */

import type { PracticeOutcome, NeurodiverseProfile } from '../bkt/types.js';

/**
 * Behavioral signals for engagement analysis
 */
export interface BehavioralSignals {
  /** Response time in milliseconds */
  responseTime?: number | undefined;

  /** Time spent on task in milliseconds */
  timeOnTask?: number | undefined;

  /** Number of hints used */
  hintsUsed?: number | undefined;

  /** Whether the response was correct */
  correct: boolean;

  /** Which attempt this is on the current problem */
  attemptNumber?: number | undefined;

  /** Recent practice outcomes for pattern analysis */
  recentOutcomes: PracticeOutcome[];

  /** Whether learner requested to skip */
  skipped?: boolean | undefined;

  /** Number of times help was accessed */
  helpAccesses?: number | undefined;

  /** Whether there was a long pause */
  longPause?: boolean | undefined;
}

/**
 * Engagement analysis result
 */
export interface EngagementAnalysis {
  /** Overall engagement level */
  level: 'high' | 'medium' | 'low' | 'disengaged';

  /** Frustration score (0 to 1) */
  frustration: number;

  /** Boredom score (0 to 1) */
  boredom: number;

  /** Flow state indicator (0 to 1) */
  flow: number;

  /** Confidence in the assessment (0 to 1) */
  confidence: number;

  /** Signals that contributed to this assessment */
  signals: string[];

  /** Recommended interventions */
  recommendations: string[];
}

/**
 * Thresholds for engagement detection (can be calibrated per learner)
 */
export interface EngagementThresholds {
  /** Fast response threshold (ms) */
  fastResponse: number;

  /** Slow response threshold (ms) */
  slowResponse: number;

  /** Very slow response threshold (ms) */
  verySlowResponse: number;

  /** Rapid guessing threshold (ms) */
  rapidGuessing: number;

  /** High hint usage threshold */
  highHintUsage: number;

  /** Streak length for pattern analysis */
  streakLength: number;
}

/**
 * Default thresholds based on research
 */
export const DEFAULT_THRESHOLDS: EngagementThresholds = {
  fastResponse: 3000, // 3 seconds
  slowResponse: 60000, // 60 seconds
  verySlowResponse: 120000, // 2 minutes
  rapidGuessing: 1500, // 1.5 seconds
  highHintUsage: 3,
  streakLength: 5,
};

/**
 * Engagement Detector implementation
 */
export class EngagementDetector {
  private thresholds: EngagementThresholds;

  constructor(thresholds: Partial<EngagementThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Analyze behavioral signals to determine engagement state
   *
   * @param signals - Behavioral signals from learner interaction
   * @returns Engagement analysis
   */
  analyze(signals: BehavioralSignals): EngagementAnalysis {
    const analysisSignals: string[] = [];
    const recommendations: string[] = [];

    let frustrationScore = 0;
    let boredomScore = 0;
    let flowScore = 0.5; // Start neutral
    let confidence = 0;

    // 1. Response time analysis
    if (signals.responseTime !== undefined) {
      confidence += 0.2;

      if (signals.responseTime < this.thresholds.rapidGuessing) {
        // Rapid responses might indicate guessing or boredom
        if (!signals.correct) {
          frustrationScore += 0.2;
          analysisSignals.push('rapid_incorrect_response');
        } else {
          boredomScore += 0.15; // Might be too easy
          analysisSignals.push('rapid_correct_response');
        }
      } else if (signals.responseTime > this.thresholds.verySlowResponse) {
        // Very slow response indicates struggle or distraction
        if (!signals.correct) {
          frustrationScore += 0.3;
          analysisSignals.push('prolonged_struggle');
        } else {
          // Slow but correct - might be careful thinking
          flowScore += 0.1;
          analysisSignals.push('thoughtful_response');
        }
      } else if (signals.responseTime > this.thresholds.slowResponse) {
        frustrationScore += 0.15;
        analysisSignals.push('slow_response');
      } else if (
        signals.responseTime >= this.thresholds.fastResponse &&
        signals.responseTime <= this.thresholds.slowResponse &&
        signals.correct
      ) {
        // Optimal response time with correct answer
        flowScore += 0.15;
        analysisSignals.push('optimal_response_time');
      }
    }

    // 2. Hint usage analysis
    if (signals.hintsUsed !== undefined) {
      confidence += 0.15;

      if (signals.hintsUsed >= this.thresholds.highHintUsage) {
        frustrationScore += 0.25;
        analysisSignals.push('high_hint_usage');
        recommendations.push('Consider scaffolded content or prerequisite review');
      } else if (signals.hintsUsed === 0 && signals.correct) {
        flowScore += 0.15;
        analysisSignals.push('independent_success');
      }
    }

    // 3. Multiple attempt analysis
    if (signals.attemptNumber !== undefined && signals.attemptNumber > 1) {
      confidence += 0.1;

      if (signals.attemptNumber >= 4) {
        frustrationScore += 0.3;
        analysisSignals.push('many_attempts');
        recommendations.push('Student may need direct instruction or simpler problem');
      } else if (signals.attemptNumber === 2 && signals.correct) {
        flowScore += 0.1;
        analysisSignals.push('learned_from_mistake');
      }
    }

    // 4. Recent performance pattern analysis
    if (signals.recentOutcomes.length >= 3) {
      confidence += 0.25;

      const streakLength = Math.min(this.thresholds.streakLength, signals.recentOutcomes.length);
      const recentWindow = signals.recentOutcomes.slice(-streakLength);
      const recentCorrect = recentWindow.filter((o) => o.correct).length;
      const recentAccuracy = recentCorrect / recentWindow.length;

      if (recentAccuracy >= 0.9) {
        boredomScore += 0.25;
        flowScore -= 0.1;
        analysisSignals.push('high_streak');
        recommendations.push('Consider increasing difficulty');
      } else if (recentAccuracy <= 0.3) {
        frustrationScore += 0.35;
        flowScore -= 0.2;
        analysisSignals.push('low_streak');
        recommendations.push('Consider reducing difficulty or providing more support');
      } else if (recentAccuracy >= 0.6 && recentAccuracy <= 0.85) {
        flowScore += 0.2;
        analysisSignals.push('optimal_challenge');
      }

      // Check for performance decline
      if (signals.recentOutcomes.length >= 6) {
        const firstHalf = signals.recentOutcomes.slice(-6, -3);
        const secondHalf = signals.recentOutcomes.slice(-3);

        const firstAccuracy = firstHalf.filter((o) => o.correct).length / 3;
        const secondAccuracy = secondHalf.filter((o) => o.correct).length / 3;

        if (secondAccuracy < firstAccuracy - 0.3) {
          frustrationScore += 0.2;
          analysisSignals.push('performance_decline');
          recommendations.push('Performance declining - consider a break');
        }
      }
    }

    // 5. Time on task (fatigue detection)
    if (signals.timeOnTask !== undefined) {
      confidence += 0.15;

      const minutesOnTask = signals.timeOnTask / (1000 * 60);

      if (minutesOnTask > 30) {
        frustrationScore += 0.1;
        boredomScore += 0.15;
        analysisSignals.push('extended_session');
        recommendations.push('Consider suggesting a break');
      }

      if (minutesOnTask > 45) {
        frustrationScore += 0.15;
        boredomScore += 0.2;
        recommendations.push('Session is quite long - break strongly recommended');
      }
    }

    // 6. Skip behavior
    if (signals.skipped) {
      confidence += 0.1;
      frustrationScore += 0.25;
      boredomScore += 0.15;
      analysisSignals.push('skipped_problem');
    }

    // 7. Help seeking behavior
    if (signals.helpAccesses !== undefined && signals.helpAccesses > 0) {
      confidence += 0.1;

      if (signals.helpAccesses >= 3) {
        frustrationScore += 0.2;
        analysisSignals.push('frequent_help_seeking');
      }
    }

    // 8. Long pause detection
    if (signals.longPause) {
      confidence += 0.1;
      boredomScore += 0.2;
      frustrationScore += 0.1;
      analysisSignals.push('long_pause_detected');
      recommendations.push('Check if student is still engaged');
    }

    // Normalize scores
    frustrationScore = Math.max(0, Math.min(1, frustrationScore));
    boredomScore = Math.max(0, Math.min(1, boredomScore));
    flowScore = Math.max(0, Math.min(1, flowScore - (frustrationScore + boredomScore) / 4));
    confidence = Math.min(1, confidence);

    // Determine engagement level
    const level = this.determineEngagementLevel(frustrationScore, boredomScore, flowScore);

    // Add level-specific recommendations
    if (level === 'disengaged') {
      recommendations.unshift('Student appears disengaged - try interactive activity or break');
    } else if (level === 'low') {
      recommendations.unshift('Engagement is low - consider changing activity type');
    }

    return {
      level,
      frustration: frustrationScore,
      boredom: boredomScore,
      flow: flowScore,
      confidence,
      signals: analysisSignals,
      recommendations,
    };
  }

  /**
   * Determine overall engagement level from component scores
   */
  private determineEngagementLevel(
    frustration: number,
    boredom: number,
    flow: number
  ): 'high' | 'medium' | 'low' | 'disengaged' {
    // High frustration or boredom indicates low engagement
    if (frustration > 0.7 || boredom > 0.7) {
      return 'disengaged';
    }

    if (frustration > 0.5 || boredom > 0.5) {
      return 'low';
    }

    // Flow state indicates high engagement
    if (flow > 0.6 && frustration < 0.3 && boredom < 0.3) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Calibrate thresholds for a specific learner based on their history
   *
   * @param historicalOutcomes - Past practice outcomes
   * @param learnerProfile - Neurodiverse profile
   * @returns Calibrated thresholds
   */
  calibrateForLearner(
    historicalOutcomes: PracticeOutcome[],
    learnerProfile?: NeurodiverseProfile
  ): EngagementThresholds {
    const calibrated = { ...this.thresholds };

    // Calculate learner-specific response time distribution
    const responseTimes = historicalOutcomes
      .filter((o) => o.responseTime !== undefined)
      .map((o) => o.responseTime!);

    if (responseTimes.length >= 10) {
      // Use percentiles for this learner
      responseTimes.sort((a, b) => a - b);
      const p25Index = Math.floor(responseTimes.length * 0.25);
      const p75Index = Math.floor(responseTimes.length * 0.75);
      const p25 = responseTimes[p25Index] ?? calibrated.fastResponse;
      const p75 = responseTimes[p75Index] ?? calibrated.slowResponse;

      // Adjust thresholds based on learner's typical patterns
      calibrated.fastResponse = p25 * 0.5;
      calibrated.slowResponse = p75 * 1.5;
      calibrated.verySlowResponse = p75 * 2.5;
      calibrated.rapidGuessing = p25 * 0.3;
    }

    // Adjust for neurodiversity
    if (learnerProfile?.processingSpeed === 'slow') {
      calibrated.fastResponse *= 1.5;
      calibrated.slowResponse *= 1.5;
      calibrated.verySlowResponse *= 1.5;
      calibrated.rapidGuessing *= 1.5;
    } else if (learnerProfile?.processingSpeed === 'fast') {
      calibrated.fastResponse *= 0.7;
      calibrated.slowResponse *= 0.7;
      calibrated.verySlowResponse *= 0.7;
      calibrated.rapidGuessing *= 0.7;
    }

    if (learnerProfile?.adhd) {
      // ADHD learners may show more variable response times
      // Widen the "normal" range
      calibrated.fastResponse *= 0.8;
      calibrated.slowResponse *= 1.3;
    }

    return calibrated;
  }

  /**
   * Analyze engagement trends over time
   *
   * @param analyses - Series of engagement analyses
   * @returns Trend information
   */
  analyzeTrends(analyses: EngagementAnalysis[]): {
    engagementTrend: 'improving' | 'stable' | 'declining';
    frustrationTrend: 'increasing' | 'stable' | 'decreasing';
    averageEngagement: 'high' | 'medium' | 'low' | 'disengaged';
  } {
    if (analyses.length < 3) {
      return {
        engagementTrend: 'stable',
        frustrationTrend: 'stable',
        averageEngagement: 'medium',
      };
    }

    // Map levels to numeric values
    const levelToNum: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
      disengaged: 0,
    };

    const levels = analyses.map((a) => levelToNum[a.level] ?? 2);
    const frustrations = analyses.map((a) => a.frustration);

    // Calculate trends
    const firstHalf = levels.slice(0, Math.floor(levels.length / 2));
    const secondHalf = levels.slice(Math.floor(levels.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let engagementTrend: 'improving' | 'stable' | 'declining';
    if (secondAvg > firstAvg + 0.3) {
      engagementTrend = 'improving';
    } else if (secondAvg < firstAvg - 0.3) {
      engagementTrend = 'declining';
    } else {
      engagementTrend = 'stable';
    }

    // Frustration trend
    const firstFrust = frustrations.slice(0, Math.floor(frustrations.length / 2));
    const secondFrust = frustrations.slice(Math.floor(frustrations.length / 2));

    const firstFrustAvg = firstFrust.reduce((a, b) => a + b, 0) / firstFrust.length;
    const secondFrustAvg = secondFrust.reduce((a, b) => a + b, 0) / secondFrust.length;

    let frustrationTrend: 'increasing' | 'stable' | 'decreasing';
    if (secondFrustAvg > firstFrustAvg + 0.1) {
      frustrationTrend = 'increasing';
    } else if (secondFrustAvg < firstFrustAvg - 0.1) {
      frustrationTrend = 'decreasing';
    } else {
      frustrationTrend = 'stable';
    }

    // Average engagement
    const overallAvg = levels.reduce((a, b) => a + b, 0) / levels.length;
    let averageEngagement: 'high' | 'medium' | 'low' | 'disengaged';
    if (overallAvg >= 2.5) {
      averageEngagement = 'high';
    } else if (overallAvg >= 1.5) {
      averageEngagement = 'medium';
    } else if (overallAvg >= 0.5) {
      averageEngagement = 'low';
    } else {
      averageEngagement = 'disengaged';
    }

    return {
      engagementTrend,
      frustrationTrend,
      averageEngagement,
    };
  }

  /**
   * Get intervention recommendations based on engagement state
   */
  getInterventions(analysis: EngagementAnalysis): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    if (analysis.frustration > 0.6) {
      immediate.push('Reduce difficulty immediately');
      immediate.push('Offer encouragement');
      shortTerm.push('Review prerequisite skills');
      longTerm.push('Consider additional scaffolding for this topic');
    }

    if (analysis.boredom > 0.6) {
      immediate.push('Increase challenge level');
      immediate.push('Introduce variety in activity type');
      shortTerm.push('Add gamification elements');
      longTerm.push('Accelerate curriculum pace');
    }

    if (analysis.level === 'disengaged') {
      immediate.push('Suggest taking a break');
      immediate.push('Switch to a different activity type');
      shortTerm.push('Review learning goals with student');
      longTerm.push('Assess for underlying issues');
    }

    if (analysis.flow > 0.7) {
      // Don't interrupt flow state!
      immediate.push('Maintain current challenge level');
      shortTerm.push('Continue with similar activities');
    }

    return { immediate, shortTerm, longTerm };
  }
}
