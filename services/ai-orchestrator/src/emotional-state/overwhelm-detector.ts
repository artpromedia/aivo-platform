/**
 * ND-2.3: Overwhelm Detector
 *
 * Detects overwhelm patterns from behavioral signals and contextual factors.
 * Tracks cognitive, sensory, emotional, and fatigue loads to identify
 * when a learner is approaching their overwhelm threshold.
 */

import type {
  BehavioralSignals,
  ContextualFactors,
  LoadBreakdown,
  OverwhelmAnalysisResult,
  OverwhelmThresholds,
  StateIndicator,
} from './emotional-state.types.js';

export class OverwhelmDetector {
  /**
   * Analyze behavioral signals for overwhelm indicators.
   */
  analyze(
    signals: BehavioralSignals,
    context: ContextualFactors,
    thresholds: OverwhelmThresholds
  ): OverwhelmAnalysisResult {
    const indicators: StateIndicator[] = [];

    // Calculate individual load components
    const cognitiveLoad = this.calculateCognitiveLoad(signals, context, thresholds);
    const sensoryLoad = context.estimatedSensoryLoad ?? 5;
    const emotionalLoad = this.calculateEmotionalLoad(signals, context);
    const fatigueLoad = this.calculateFatigueLoad(signals, context, thresholds);

    // Build indicators for each overloaded component
    if (cognitiveLoad >= thresholds.cognitiveLoadThreshold) {
      indicators.push({
        type: 'overwhelm',
        signal: 'high_cognitive_load',
        value: cognitiveLoad,
        normalRange: { min: 0, max: thresholds.cognitiveLoadThreshold },
        contribution: 0.7,
        description: 'Material complexity is exceeding comfortable processing capacity',
      });
    }

    if (sensoryLoad >= thresholds.sensoryLoadThreshold) {
      indicators.push({
        type: 'overwhelm',
        signal: 'high_sensory_load',
        value: sensoryLoad,
        normalRange: { min: 0, max: thresholds.sensoryLoadThreshold },
        contribution: 0.6,
        description: 'Sensory stimulation is higher than comfortable threshold',
      });
    }

    if (emotionalLoad >= thresholds.emotionalLoadThreshold) {
      indicators.push({
        type: 'overwhelm',
        signal: 'high_emotional_load',
        value: emotionalLoad,
        normalRange: { min: 0, max: thresholds.emotionalLoadThreshold },
        contribution: 0.7,
        description: 'Emotional demands are accumulating',
      });
    }

    if (fatigueLoad >= 7) {
      indicators.push({
        type: 'overwhelm',
        signal: 'fatigue',
        value: fatigueLoad,
        normalRange: { min: 0, max: 6 },
        contribution: 0.6,
        description: 'Signs of mental or physical fatigue',
      });
    }

    // Check for behavioral shutdown signs
    if (signals.idleTimeMs > 45000) {
      indicators.push({
        type: 'overwhelm',
        signal: 'extended_idle',
        value: signals.idleTimeMs,
        normalRange: { min: 0, max: 20000 },
        contribution: 0.8,
        description: 'Extended period of inactivity - possible shutdown response',
      });
    }

    // Sudden drop in engagement
    if (signals.interactionCount < 2 && context.sessionDurationMinutes > 5) {
      indicators.push({
        type: 'overwhelm',
        signal: 'low_interaction',
        value: signals.interactionCount,
        normalRange: { min: 5, max: Infinity },
        contribution: 0.5,
        description: 'Very low interaction rate',
      });
    }

    // Check for consecutive errors exceeding threshold
    if (signals.consecutiveErrors >= thresholds.consecutiveErrorsThreshold) {
      indicators.push({
        type: 'overwhelm',
        signal: 'consecutive_errors_threshold',
        value: signals.consecutiveErrors,
        normalRange: { min: 0, max: thresholds.consecutiveErrorsThreshold - 1 },
        contribution: 0.7,
        description: `${signals.consecutiveErrors} errors in a row - may need a break`,
      });
    }

    // Check for time on task exceeding threshold
    if (context.sessionDurationMinutes >= thresholds.timeOnTaskThreshold) {
      indicators.push({
        type: 'fatigue',
        signal: 'time_on_task_threshold',
        value: context.sessionDurationMinutes,
        normalRange: { min: 0, max: thresholds.timeOnTaskThreshold - 1 },
        contribution: 0.5,
        description: `Working for ${context.sessionDurationMinutes} minutes - may need a break`,
      });
    }

    // Calculate overall overwhelm risk
    const weights = {
      cognitive: 0.35,
      sensory: 0.25,
      emotional: 0.25,
      fatigue: 0.15,
    };

    const weightedSum =
      cognitiveLoad * weights.cognitive +
      sensoryLoad * weights.sensory +
      emotionalLoad * weights.emotional +
      fatigueLoad * weights.fatigue;

    // Determine how many systems are overloaded
    const overloadedSystems = [
      cognitiveLoad >= thresholds.cognitiveLoadThreshold,
      sensoryLoad >= thresholds.sensoryLoadThreshold,
      emotionalLoad >= thresholds.emotionalLoadThreshold,
      fatigueLoad >= 7,
    ].filter(Boolean).length;

    // Apply amplification if multiple systems are overloaded
    let riskLevel = weightedSum;
    if (overloadedSystems >= 2) {
      riskLevel *= 1.2;
    }
    if (overloadedSystems >= 3) {
      riskLevel *= 1.4;
    }

    riskLevel = Math.min(10, riskLevel);

    // Determine overwhelm type
    const loads = [
      { type: 'cognitive' as const, value: cognitiveLoad },
      { type: 'sensory' as const, value: sensoryLoad },
      { type: 'emotional' as const, value: emotionalLoad },
      { type: 'fatigue' as const, value: fatigueLoad },
    ].sort((a, b) => b.value - a.value);

    let overwhelmType: OverwhelmAnalysisResult['overwhelmType'];
    if (overloadedSystems >= 3) {
      overwhelmType = 'combined';
    } else {
      overwhelmType = loads[0].type;
    }

    // Calculate confidence
    const confidence = indicators.length > 0 ? Math.min(0.9, 0.5 + indicators.length * 0.1) : 0.4;

    return {
      riskLevel,
      confidence,
      overwhelmType,
      indicators,
      loadBreakdown: {
        cognitive: cognitiveLoad,
        sensory: sensoryLoad,
        emotional: emotionalLoad,
        fatigue: fatigueLoad,
      },
    };
  }

  /**
   * Calculate cognitive load based on signals and context.
   */
  private calculateCognitiveLoad(
    signals: BehavioralSignals,
    context: ContextualFactors,
    _thresholds: OverwhelmThresholds
  ): number {
    let load = context.estimatedCognitiveLoad ?? 5;

    // High error rate increases cognitive load perception
    if (signals.errorRate > 0.5) {
      load += 2;
    } else if (signals.errorRate > 0.3) {
      load += 1;
    }

    // New content increases load
    if (context.isNewContent) {
      load += 1;
    }

    // High difficulty content
    if (context.activityDifficulty === 'hard' || context.activityDifficulty === 'challenging') {
      load += 1;
    }

    // Poor previous performance on topic
    if (context.previousPerformanceOnTopic < 50) {
      load += 1;
    } else if (context.previousPerformanceOnTopic < 70) {
      load += 0.5;
    }

    // Many activities completed (cognitive fatigue)
    if (context.activitiesCompleted > 5) {
      load += 0.5;
    }

    // Time pressure adds cognitive load
    if (context.hasTimeLimit) {
      load += 1;
      if (context.timeRemainingSeconds !== undefined && context.timeRemainingSeconds < 60) {
        load += 1;
      }
    }

    // Lots of hint usage suggests content is too challenging
    if (signals.hintUsageCount >= 3) {
      load += 0.5;
    }

    // Backtracking suggests confusion/load
    if (signals.backtrackCount >= 3) {
      load += 0.5;
    }

    return Math.min(10, load);
  }

  /**
   * Calculate emotional load based on signals and context.
   */
  private calculateEmotionalLoad(signals: BehavioralSignals, context: ContextualFactors): number {
    let load = 3; // Baseline

    // Consecutive errors are emotionally taxing
    load += Math.min(3, signals.consecutiveErrors * 0.5);

    // Assessments add emotional weight
    if (context.isAssessment) {
      load += 2;
    }

    // Explicit mood signals
    if (signals.explicitMoodRating !== undefined && signals.explicitMoodRating <= 2) {
      load += 2;
    } else if (signals.explicitMoodRating !== undefined && signals.explicitMoodRating === 3) {
      load += 0.5;
    }

    if (signals.explicitFrustrationReport) {
      load += 2;
    }

    // Long time without positive reinforcement
    if (signals.consecutiveCorrect === 0 && signals.interactionCount > 10) {
      load += 1;
    }

    // Time pressure adds emotional load
    if (context.hasTimeLimit) {
      load += 0.5;
      if (context.timeRemainingSeconds !== undefined && context.timeRemainingSeconds < 60) {
        load += 1;
      }
    }

    // High error rate
    if (signals.errorRate > 0.5) {
      load += 1;
    }

    // Skip behavior can indicate emotional avoidance
    if (signals.skipCount >= 2) {
      load += 0.5;
    }

    return Math.min(10, load);
  }

  /**
   * Calculate fatigue load based on signals and context.
   */
  private calculateFatigueLoad(
    signals: BehavioralSignals,
    context: ContextualFactors,
    thresholds: OverwhelmThresholds
  ): number {
    let load = 0;

    // Time on task
    const minutesOverThreshold = context.sessionDurationMinutes - thresholds.timeOnTaskThreshold;
    if (minutesOverThreshold > 0) {
      load += Math.min(4, minutesOverThreshold * 0.3);
    }

    // Time since last break
    if (context.lastBreakMinutesAgo > 20) {
      load += 2;
    } else if (context.lastBreakMinutesAgo > 15) {
      load += 1;
    }

    // Session duration compared to typical
    const durationRatio = context.sessionDurationMinutes / context.typicalSessionLength;
    if (durationRatio > 1.2) {
      load += 1.5;
    } else if (durationRatio > 1) {
      load += 0.5;
    }

    // Slowing response times (fatigue indicator)
    const responseRatio = signals.responseTimeMs / signals.averageResponseTimeMs;
    if (responseRatio > 1.8) {
      load += 2;
    } else if (responseRatio > 1.5) {
      load += 1.5;
    } else if (responseRatio > 1.3) {
      load += 0.5;
    }

    // Increasing idle time
    if (signals.idleTimeMs > 30000) {
      load += 2;
    } else if (signals.idleTimeMs > 15000) {
      load += 1;
    }

    // Focus loss count indicates fatigue/distraction
    if (signals.focusLossCount >= 3) {
      load += 1;
    }

    // Time of day effects
    if (context.timeOfDay === 'afternoon') {
      load += 0.5; // Post-lunch dip
    }

    // Break requested
    if (signals.requestedBreak) {
      load += 2;
    }

    // Many activities completed
    if (context.activitiesCompleted >= 6) {
      load += 1;
    }

    return Math.min(10, load);
  }
}
