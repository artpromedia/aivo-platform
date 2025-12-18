/**
 * ND-2.3: Anxiety Detector
 *
 * Detects anxiety patterns from behavioral signals and contextual factors.
 * Identifies performance anxiety, time pressure anxiety, new content anxiety,
 * and other anxiety-related patterns.
 */

import type {
  AnxietyAnalysisResult,
  AnxietyPattern,
  BehavioralSignals,
  ContextualFactors,
  OverwhelmThresholds,
  StateIndicator,
} from './emotional-state.types.js';

export class AnxietyDetector {
  /**
   * Analyze behavioral signals for anxiety indicators.
   */
  analyze(
    signals: BehavioralSignals,
    context: ContextualFactors,
    learnerPatterns: AnxietyPattern[] | null,
    thresholds: OverwhelmThresholds
  ): AnxietyAnalysisResult {
    const indicators: StateIndicator[] = [];
    const triggers: string[] = [];
    let totalRisk = 0;
    let signalCount = 0;

    // ─── Performance Anxiety Detection ────────────────────────────────────
    if (context.isAssessment) {
      triggers.push('assessment');

      // Check for pre-test anxiety patterns: slower responses during assessment
      if (signals.responseTimeMs > signals.averageResponseTimeMs * 2) {
        totalRisk += 2;
        signalCount++;
        indicators.push({
          type: 'anxiety',
          signal: 'slow_assessment_start',
          value: signals.responseTimeMs,
          normalRange: { min: 0, max: signals.averageResponseTimeMs * 1.5 },
          contribution: 0.6,
          description: 'Taking longer to respond during assessment - possible performance anxiety',
        });
      }

      // Excessive reviewing/changing answers
      if (signals.backtrackCount >= 3) {
        totalRisk += 1.5;
        signalCount++;
        indicators.push({
          type: 'anxiety',
          signal: 'excessive_reviewing',
          value: signals.backtrackCount,
          normalRange: { min: 0, max: 2 },
          contribution: 0.5,
          description: 'Frequently going back to review answers',
        });
      }
    }

    // ─── Time Pressure Anxiety ────────────────────────────────────────────
    if (context.hasTimeLimit && context.timeRemainingSeconds !== undefined) {
      const timeRemaining = context.timeRemainingSeconds;

      // Less than 1 minute remaining
      if (timeRemaining < 60) {
        totalRisk += 2;
        signalCount++;
        triggers.push('time_pressure');
        indicators.push({
          type: 'anxiety',
          signal: 'low_time_remaining',
          value: timeRemaining,
          normalRange: { min: 120, max: Infinity },
          contribution: 0.7,
          description: 'Very little time remaining - time pressure anxiety likely',
        });

        // Rushing behavior - responding much faster than usual
        if (signals.responseTimeMs < signals.averageResponseTimeMs * 0.5) {
          totalRisk += 1.5;
          indicators.push({
            type: 'anxiety',
            signal: 'rushing',
            value: signals.responseTimeMs,
            normalRange: { min: signals.averageResponseTimeMs * 0.7, max: Infinity },
            contribution: 0.5,
            description: 'Responding much faster than usual - may be rushing due to anxiety',
          });
        }
      } else if (timeRemaining < 120) {
        // 1-2 minutes remaining
        totalRisk += 1;
        triggers.push('time_pressure_moderate');
      }
    }

    // ─── New Content Anxiety ──────────────────────────────────────────────
    if (context.isNewContent) {
      triggers.push('new_content');

      // Check learner-specific new content anxiety pattern
      const newContentPattern = learnerPatterns?.find((p) => p.patternType === 'new_content');
      if (newContentPattern && newContentPattern.occurrenceCount >= 2) {
        totalRisk += 1.5;
        signalCount++;
      }

      // Hesitation at start of new content
      if (signals.timeSinceLastInteraction > 10000) {
        totalRisk += 1;
        signalCount++;
        indicators.push({
          type: 'anxiety',
          signal: 'hesitation_new_content',
          value: signals.timeSinceLastInteraction,
          normalRange: { min: 0, max: 5000 },
          contribution: 0.4,
          description: 'Hesitating to engage with new content',
        });
      }

      // Low historical performance increases anxiety risk
      if (context.previousPerformanceOnTopic < 50) {
        totalRisk += 0.5;
      }
    }

    // ─── Avoidance Behaviors ──────────────────────────────────────────────
    if (signals.skipCount >= 2) {
      totalRisk += 1.5;
      signalCount++;
      indicators.push({
        type: 'anxiety',
        signal: 'skipping_behavior',
        value: signals.skipCount,
        normalRange: { min: 0, max: 1 },
        contribution: 0.5,
        description: 'Skipping questions/activities - possible avoidance due to anxiety',
      });
    }

    // ─── Erratic Behavior ─────────────────────────────────────────────────
    if (signals.scrollBehavior === 'erratic' || signals.scrollBehavior === 'rapid') {
      totalRisk += 1;
      signalCount++;
      indicators.push({
        type: 'anxiety',
        signal: 'erratic_scrolling',
        value: signals.scrollBehavior,
        normalRange: { min: 0, max: 0 },
        contribution: 0.3,
        description: 'Erratic scrolling behavior - may indicate restlessness or anxiety',
      });
    }

    // ─── Response Time Variability ────────────────────────────────────────
    if (signals.responseTimeVariance > 2.5) {
      totalRisk += 1;
      signalCount++;
      indicators.push({
        type: 'anxiety',
        signal: 'inconsistent_timing',
        value: signals.responseTimeVariance,
        normalRange: { min: 0, max: 1.5 },
        contribution: 0.4,
        description: 'Highly variable response times - inconsistent concentration',
      });
    }

    // ─── Help-Seeking Changes ─────────────────────────────────────────────
    // Not seeking help despite making errors can indicate anxiety about appearing unable
    if (signals.helpRequestCount === 0 && signals.consecutiveErrors >= 3) {
      totalRisk += 1.5;
      signalCount++;
      indicators.push({
        type: 'anxiety',
        signal: 'not_seeking_help',
        value: signals.helpRequestCount,
        normalRange: { min: 1, max: 5 },
        contribution: 0.5,
        description: 'Making errors but not asking for help - may be anxious about seeking help',
      });
    }

    // Sudden increase in help requests can also indicate anxiety
    if (signals.helpRequestCount >= 5 && signals.interactionCount < 15) {
      totalRisk += 0.5;
      signalCount++;
      indicators.push({
        type: 'anxiety',
        signal: 'excessive_help_seeking',
        value: signals.helpRequestCount,
        normalRange: { min: 0, max: 3 },
        contribution: 0.3,
        description: 'Seeking lots of help - may indicate uncertainty or anxiety',
      });
    }

    // ─── Known Triggers ───────────────────────────────────────────────────
    for (const trigger of context.knownAnxietyTriggers) {
      const triggerLower = trigger.toLowerCase();
      const activityLower = context.activityType.toLowerCase();

      if (
        activityLower.includes(triggerLower) ||
        (context.isAssessment && triggerLower === 'assessment') ||
        (context.isNewContent && triggerLower === 'new_content') ||
        (context.hasTimeLimit && triggerLower === 'time_limit')
      ) {
        totalRisk += 1.5;
        triggers.push(`known_trigger:${trigger}`);
      }
    }

    // ─── Explicit Signals ─────────────────────────────────────────────────
    if (signals.explicitFrustrationReport) {
      totalRisk += 2;
      signalCount++;
      indicators.push({
        type: 'explicit',
        signal: 'reported_frustration',
        value: true,
        normalRange: { min: 0, max: 0 },
        contribution: 0.8,
        description: 'Learner explicitly reported feeling frustrated',
      });
    }

    if (signals.explicitMoodRating !== undefined && signals.explicitMoodRating <= 2) {
      totalRisk += 1.5;
      signalCount++;
      indicators.push({
        type: 'explicit',
        signal: 'low_mood_rating',
        value: signals.explicitMoodRating,
        normalRange: { min: 3, max: 5 },
        contribution: 0.7,
        description: 'Learner reported feeling low mood',
      });
    }

    // ─── Pattern Matching ─────────────────────────────────────────────────
    // Check for matches with learned patterns
    if (learnerPatterns && learnerPatterns.length > 0) {
      for (const pattern of learnerPatterns) {
        const matchScore = this.checkPatternMatch(pattern, signals, context);
        if (matchScore > 0.5) {
          totalRisk += matchScore * pattern.averageIntensity * 0.2;
          triggers.push(`pattern:${pattern.patternType}`);
        }
      }
    }

    // ─── Calculate Final Risk Level ───────────────────────────────────────
    // Apply learner-specific sensitivity from thresholds
    const sensitivityMultiplier = (10 - thresholds.emotionalLoadThreshold) / 4 + 0.75; // 0.75 to 1.25
    const adjustedRisk = totalRisk * sensitivityMultiplier;
    const riskLevel = Math.min(10, adjustedRisk);

    // Calculate confidence based on number of signals
    const confidence = signalCount > 0 ? Math.min(0.95, 0.4 + signalCount * 0.1) : 0.3;

    // ─── Determine Anxiety Type ───────────────────────────────────────────
    let anxietyType: AnxietyAnalysisResult['anxietyType'] = 'unknown';
    if (triggers.includes('assessment') || context.isAssessment) {
      anxietyType = 'performance';
    } else if (triggers.includes('time_pressure') || triggers.includes('time_pressure_moderate')) {
      anxietyType = 'time_pressure';
    } else if (triggers.includes('new_content')) {
      anxietyType = 'new_content';
    } else if (triggers.some((t) => t.includes('social'))) {
      anxietyType = 'social';
    }

    return {
      riskLevel,
      confidence,
      anxietyType,
      indicators,
      triggers,
    };
  }

  /**
   * Check how well current signals match a learned pattern.
   * Returns match score 0-1.
   */
  private checkPatternMatch(
    pattern: AnxietyPattern,
    signals: BehavioralSignals,
    context: ContextualFactors
  ): number {
    let matchScore = 0;
    let totalWeight = 0;

    // Check trigger matches
    for (const trigger of pattern.triggers) {
      totalWeight += trigger.weight;

      switch (trigger.type) {
        case 'activity':
          if (context.activityType.toLowerCase().includes(trigger.value.toLowerCase())) {
            matchScore += trigger.weight;
          }
          break;
        case 'time':
          if (trigger.value.includes('time_limit') && context.hasTimeLimit) {
            matchScore += trigger.weight;
          }
          break;
        case 'performance':
          if (trigger.value.includes('errors') && signals.consecutiveErrors >= 3) {
            matchScore += trigger.weight;
          }
          break;
        case 'content':
          if (trigger.value.includes('new') && context.isNewContent) {
            matchScore += trigger.weight;
          }
          break;
      }
    }

    // Check behavioral indicator matches
    const indicators = pattern.behavioralIndicators;

    if (indicators.responseTimeChange) {
      const responseRatio = signals.responseTimeMs / signals.averageResponseTimeMs;
      if (indicators.responseTimeChange === 'increasing' && responseRatio > 1.5) {
        matchScore += 0.2;
      } else if (indicators.responseTimeChange === 'decreasing' && responseRatio < 0.7) {
        matchScore += 0.2;
      } else if (indicators.responseTimeChange === 'erratic' && signals.responseTimeVariance > 2) {
        matchScore += 0.2;
      }
      totalWeight += 0.2;
    }

    if (indicators.contentAvoidance !== undefined) {
      if (indicators.contentAvoidance && signals.skipCount >= 2) {
        matchScore += 0.15;
      }
      totalWeight += 0.15;
    }

    if (indicators.helpSeekingChange) {
      if (
        indicators.helpSeekingChange === 'decreased' &&
        signals.helpRequestCount === 0 &&
        signals.consecutiveErrors >= 2
      ) {
        matchScore += 0.15;
      } else if (indicators.helpSeekingChange === 'increased' && signals.helpRequestCount >= 3) {
        matchScore += 0.15;
      }
      totalWeight += 0.15;
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }
}
