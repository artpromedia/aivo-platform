import type {
  FatigueAssessment,
  FatigueIndicator,
  SessionData,
} from '../types/index.js';
import { prisma } from '../prisma.js';

interface FatigueSignals {
  responseTimeDegradation: number;
  accuracyDecline: number;
  engagementDrop: number;
  timeOnTask: number;
  errorPatternScore: number;
}

const FATIGUE_WEIGHTS = {
  responseTimeDegradation: 0.25,
  accuracyDecline: 0.25,
  engagementDrop: 0.20,
  timeOnTask: 0.15,
  errorPatternScore: 0.15,
};

const FATIGUE_THRESHOLDS = {
  mildFatigue: 40,
  moderateFatigue: 60,
  severeFatigue: 80,
  criticalFatigue: 90,
};

export class FatigueDetector {
  private learnerBaselines: Map<string, LearnerBaseline> = new Map();

  /**
   * Detect fatigue based on session data
   */
  async detectFatigue(learnerId: string, sessionData: SessionData): Promise<FatigueAssessment> {
    // Get learner baseline for comparison
    const baseline = await this.getLearnerBaseline(learnerId);

    // Analyze fatigue signals
    const signals = this.analyzeSignals(sessionData, baseline);

    // Calculate indicators
    const indicators = this.calculateIndicators(signals);

    // Calculate overall fatigue level
    const fatigueLevel = this.calculateFatigueLevel(signals);

    // Determine recommendation
    const recommendation = this.determineRecommendation(fatigueLevel, signals);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(sessionData, indicators);

    return {
      level: fatigueLevel,
      indicators,
      recommendation,
      confidence,
    };
  }

  /**
   * Get historical fatigue patterns for a learner
   */
  async getFatigueHistory(
    learnerId: string,
    days: number = 7
  ): Promise<{
    averageFatigueByHour: Map<number, number>;
    fatiguePatterns: string[];
    recommendations: string[];
  }> {
    const sessions = await prisma.cognitiveSession.findMany({
      where: {
        learnerId,
        startedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      include: {
        cognitiveStates: true,
      },
    });

    // Calculate average fatigue by hour of day
    const fatigueByHour = new Map<number, number[]>();
    for (const session of sessions) {
      for (const state of session.cognitiveStates) {
        const hour = state.timestamp.getHours();
        if (!fatigueByHour.has(hour)) {
          fatigueByHour.set(hour, []);
        }
        fatigueByHour.get(hour)!.push(state.fatigueLevel);
      }
    }

    const averageFatigueByHour = new Map<number, number>();
    for (const [hour, levels] of fatigueByHour) {
      const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
      averageFatigueByHour.set(hour, Math.round(avg));
    }

    // Identify patterns
    const patterns = this.identifyFatiguePatterns(averageFatigueByHour, sessions);

    // Generate recommendations based on patterns
    const recommendations = this.generatePatternRecommendations(patterns, averageFatigueByHour);

    return {
      averageFatigueByHour,
      fatiguePatterns: patterns,
      recommendations,
    };
  }

  // ========== Private Helper Methods ==========

  private async getLearnerBaseline(learnerId: string): Promise<LearnerBaseline> {
    // Check cache
    if (this.learnerBaselines.has(learnerId)) {
      return this.learnerBaselines.get(learnerId)!;
    }

    // Calculate from historical data
    const interactions = await prisma.cognitiveInteraction.findMany({
      where: {
        learnerId,
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        responseTime: { not: null },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (interactions.length < 10) {
      // Not enough data, use defaults
      return {
        averageResponseTime: 3000,
        averageAccuracy: 0.75,
        typicalSessionLength: 30,
        standardDevResponseTime: 1000,
        standardDevAccuracy: 0.1,
      };
    }

    // Calculate baseline metrics
    const responseTimes = interactions
      .filter((i) => i.responseTime && i.responseTime > 0)
      .map((i) => i.responseTime!);

    const accuracies = interactions
      .filter((i) => i.isCorrect !== null)
      .map((i) => (i.isCorrect ? 1 : 0));

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

    // Standard deviations
    const stdResponseTime = Math.sqrt(
      responseTimes.reduce((sum, rt) => sum + Math.pow(rt - avgResponseTime, 2), 0) / responseTimes.length
    );
    const stdAccuracy = Math.sqrt(
      accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracies.length
    );

    const baseline: LearnerBaseline = {
      averageResponseTime: avgResponseTime,
      averageAccuracy: avgAccuracy,
      typicalSessionLength: 30, // Will be refined with more session data
      standardDevResponseTime: stdResponseTime || 1000,
      standardDevAccuracy: stdAccuracy || 0.1,
    };

    this.learnerBaselines.set(learnerId, baseline);
    return baseline;
  }

  private analyzeSignals(sessionData: SessionData, baseline: LearnerBaseline): FatigueSignals {
    const interactions = sessionData.interactions;

    if (interactions.length < 5) {
      return {
        responseTimeDegradation: 0,
        accuracyDecline: 0,
        engagementDrop: 0,
        timeOnTask: this.calculateTimeOnTaskScore(sessionData),
        errorPatternScore: 0,
      };
    }

    // Split into early and late halves for comparison
    const midpoint = Math.floor(interactions.length / 2);
    const earlyInteractions = interactions.slice(0, midpoint);
    const lateInteractions = interactions.slice(midpoint);

    // Response time degradation
    const earlyAvgRT = this.getAverageResponseTime(earlyInteractions);
    const lateAvgRT = this.getAverageResponseTime(lateInteractions);
    const responseTimeDegradation = this.calculateDegradation(
      earlyAvgRT,
      lateAvgRT,
      baseline.averageResponseTime,
      baseline.standardDevResponseTime
    );

    // Accuracy decline
    const earlyAccuracy = this.getAverageAccuracy(earlyInteractions);
    const lateAccuracy = this.getAverageAccuracy(lateInteractions);
    const accuracyDecline = this.calculateAccuracyDecline(
      earlyAccuracy,
      lateAccuracy,
      baseline.averageAccuracy,
      baseline.standardDevAccuracy
    );

    // Engagement drop
    const engagementDrop = this.calculateEngagementDrop(earlyInteractions, lateInteractions);

    // Time on task score
    const timeOnTask = this.calculateTimeOnTaskScore(sessionData);

    // Error pattern score
    const errorPatternScore = this.analyzeErrorPatterns(interactions);

    return {
      responseTimeDegradation,
      accuracyDecline,
      engagementDrop,
      timeOnTask,
      errorPatternScore,
    };
  }

  private getAverageResponseTime(interactions: SessionData['interactions']): number {
    const withResponseTime = interactions.filter(
      (i) => i.data.responseTime && i.data.responseTime > 0
    );
    if (withResponseTime.length === 0) return 0;

    return (
      withResponseTime.reduce((sum, i) => sum + (i.data.responseTime ?? 0), 0) /
      withResponseTime.length
    );
  }

  private getAverageAccuracy(interactions: SessionData['interactions']): number {
    const withAccuracy = interactions.filter((i) => i.data.isCorrect !== undefined);
    if (withAccuracy.length === 0) return 0;

    return (
      withAccuracy.filter((i) => i.data.isCorrect).length / withAccuracy.length
    );
  }

  private calculateDegradation(
    early: number,
    late: number,
    baseline: number,
    stdDev: number
  ): number {
    if (early === 0 || late === 0) return 0;

    // How much has response time increased from early to late?
    const increase = late - early;

    // Normalize by baseline standard deviation
    const normalizedIncrease = increase / stdDev;

    // Convert to 0-100 scale
    // 0 std devs = 0 fatigue, 2+ std devs = 100 fatigue
    return Math.min(100, Math.max(0, normalizedIncrease * 50));
  }

  private calculateAccuracyDecline(
    early: number,
    late: number,
    baseline: number,
    stdDev: number
  ): number {
    // How much has accuracy dropped from early to late?
    const decline = early - late;

    if (decline <= 0) return 0; // No decline

    // Normalize by baseline standard deviation
    const normalizedDecline = decline / stdDev;

    // Convert to 0-100 scale
    return Math.min(100, Math.max(0, normalizedDecline * 50));
  }

  private calculateEngagementDrop(
    earlyInteractions: SessionData['interactions'],
    lateInteractions: SessionData['interactions']
  ): number {
    // Calculate interaction frequency for each period
    const earlyDuration = this.calculateDuration(earlyInteractions);
    const lateDuration = this.calculateDuration(lateInteractions);

    const earlyFrequency = earlyDuration > 0 ? earlyInteractions.length / earlyDuration : 0;
    const lateFrequency = lateDuration > 0 ? lateInteractions.length / lateDuration : 0;

    if (earlyFrequency === 0) return 0;

    // Percentage drop in interaction frequency
    const dropPercentage = (earlyFrequency - lateFrequency) / earlyFrequency;

    return Math.min(100, Math.max(0, dropPercentage * 100));
  }

  private calculateDuration(interactions: SessionData['interactions']): number {
    if (interactions.length < 2) return 0;

    const start = interactions[0].timestamp.getTime();
    const end = interactions[interactions.length - 1].timestamp.getTime();

    return (end - start) / 60000; // minutes
  }

  private calculateTimeOnTaskScore(sessionData: SessionData): number {
    const sessionDurationMinutes =
      (Date.now() - sessionData.startedAt.getTime()) / 60000;

    // Score based on Pomodoro-style optimal session lengths
    if (sessionDurationMinutes < 15) return 0;
    if (sessionDurationMinutes < 25) return 20;
    if (sessionDurationMinutes < 35) return 40;
    if (sessionDurationMinutes < 50) return 60;
    if (sessionDurationMinutes < 60) return 75;
    if (sessionDurationMinutes < 90) return 85;
    return 100; // > 90 minutes without break
  }

  private analyzeErrorPatterns(interactions: SessionData['interactions']): number {
    const withCorrectness = interactions.filter((i) => i.data.isCorrect !== undefined);
    if (withCorrectness.length < 5) return 0;

    // Look for consecutive errors (indicates confusion/fatigue)
    let maxConsecutiveErrors = 0;
    let currentConsecutiveErrors = 0;
    let totalErrorsLateSession = 0;

    const lateStartIndex = Math.floor(withCorrectness.length * 0.6);

    for (let i = 0; i < withCorrectness.length; i++) {
      if (withCorrectness[i].data.isCorrect === false) {
        currentConsecutiveErrors++;
        maxConsecutiveErrors = Math.max(maxConsecutiveErrors, currentConsecutiveErrors);

        if (i >= lateStartIndex) {
          totalErrorsLateSession++;
        }
      } else {
        currentConsecutiveErrors = 0;
      }
    }

    // Score based on consecutive errors and late session errors
    const consecutiveScore = Math.min(50, maxConsecutiveErrors * 15);
    const lateErrorRate =
      totalErrorsLateSession / (withCorrectness.length - lateStartIndex);
    const lateErrorScore = Math.min(50, lateErrorRate * 100);

    return consecutiveScore + lateErrorScore;
  }

  private calculateIndicators(signals: FatigueSignals): FatigueIndicator[] {
    const indicators: FatigueIndicator[] = [];

    // Response time indicator
    if (signals.responseTimeDegradation > 20) {
      indicators.push({
        type: 'response_time',
        value: signals.responseTimeDegradation,
        threshold: 30,
        severity:
          signals.responseTimeDegradation > 60
            ? 'high'
            : signals.responseTimeDegradation > 30
            ? 'medium'
            : 'low',
      });
    }

    // Accuracy indicator
    if (signals.accuracyDecline > 15) {
      indicators.push({
        type: 'accuracy',
        value: signals.accuracyDecline,
        threshold: 25,
        severity:
          signals.accuracyDecline > 50
            ? 'high'
            : signals.accuracyDecline > 25
            ? 'medium'
            : 'low',
      });
    }

    // Engagement indicator
    if (signals.engagementDrop > 20) {
      indicators.push({
        type: 'engagement',
        value: signals.engagementDrop,
        threshold: 30,
        severity:
          signals.engagementDrop > 50
            ? 'high'
            : signals.engagementDrop > 30
            ? 'medium'
            : 'low',
      });
    }

    // Time on task indicator
    if (signals.timeOnTask > 40) {
      indicators.push({
        type: 'time_on_task',
        value: signals.timeOnTask,
        threshold: 50,
        severity:
          signals.timeOnTask > 80
            ? 'high'
            : signals.timeOnTask > 50
            ? 'medium'
            : 'low',
      });
    }

    // Error pattern indicator
    if (signals.errorPatternScore > 30) {
      indicators.push({
        type: 'error_pattern',
        value: signals.errorPatternScore,
        threshold: 40,
        severity:
          signals.errorPatternScore > 70
            ? 'high'
            : signals.errorPatternScore > 40
            ? 'medium'
            : 'low',
      });
    }

    return indicators;
  }

  private calculateFatigueLevel(signals: FatigueSignals): number {
    return Math.min(
      100,
      Math.round(
        signals.responseTimeDegradation * FATIGUE_WEIGHTS.responseTimeDegradation +
          signals.accuracyDecline * FATIGUE_WEIGHTS.accuracyDecline +
          signals.engagementDrop * FATIGUE_WEIGHTS.engagementDrop +
          signals.timeOnTask * FATIGUE_WEIGHTS.timeOnTask +
          signals.errorPatternScore * FATIGUE_WEIGHTS.errorPatternScore
      )
    );
  }

  private determineRecommendation(
    fatigueLevel: number,
    signals: FatigueSignals
  ): FatigueAssessment['recommendation'] {
    if (fatigueLevel >= FATIGUE_THRESHOLDS.criticalFatigue) {
      return 'end_session';
    }

    if (fatigueLevel >= FATIGUE_THRESHOLDS.severeFatigue) {
      return 'take_long_break';
    }

    if (fatigueLevel >= FATIGUE_THRESHOLDS.moderateFatigue) {
      return 'take_short_break';
    }

    // Even if overall fatigue is low, check individual signals
    if (signals.timeOnTask >= 60 || signals.responseTimeDegradation >= 50) {
      return 'take_short_break';
    }

    return 'continue';
  }

  private calculateConfidence(sessionData: SessionData, indicators: FatigueIndicator[]): number {
    let confidence = 0.5; // Base confidence

    // More interactions = higher confidence
    const interactionCount = sessionData.interactions.length;
    confidence += Math.min(0.2, interactionCount / 100);

    // More diverse interaction types = higher confidence
    const uniqueTypes = new Set(sessionData.interactions.map((i) => i.type));
    confidence += Math.min(0.1, uniqueTypes.size / 20);

    // Session with cognitive history = higher confidence
    if (sessionData.cognitiveStateHistory.length > 5) {
      confidence += 0.1;
    }

    // More indicators triggered = higher confidence (more signal)
    if (indicators.length >= 3) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  private identifyFatiguePatterns(
    averageFatigueByHour: Map<number, number>,
    sessions: any[]
  ): string[] {
    const patterns: string[] = [];

    // Find high fatigue hours
    const highFatigueHours: number[] = [];
    for (const [hour, fatigue] of averageFatigueByHour) {
      if (fatigue > 60) {
        highFatigueHours.push(hour);
      }
    }

    if (highFatigueHours.length > 0) {
      patterns.push(`Higher fatigue levels typically occur around ${highFatigueHours.join(', ')}:00`);
    }

    // Find low fatigue hours (optimal study times)
    const lowFatigueHours: number[] = [];
    for (const [hour, fatigue] of averageFatigueByHour) {
      if (fatigue < 40) {
        lowFatigueHours.push(hour);
      }
    }

    if (lowFatigueHours.length > 0) {
      patterns.push(`Optimal learning hours appear to be around ${lowFatigueHours.join(', ')}:00`);
    }

    // Check for long session pattern
    const avgSessionLength =
      sessions.reduce((sum, s) => {
        if (s.endedAt) {
          return sum + (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        }
        return sum;
      }, 0) / sessions.filter((s) => s.endedAt).length;

    if (avgSessionLength > 45) {
      patterns.push('Sessions tend to be longer than recommended (45+ minutes)');
    }

    return patterns;
  }

  private generatePatternRecommendations(
    patterns: string[],
    averageFatigueByHour: Map<number, number>
  ): string[] {
    const recommendations: string[] = [];

    // Find optimal hours
    const hoursByFatigue = Array.from(averageFatigueByHour.entries()).sort(
      (a, b) => a[1] - b[1]
    );

    if (hoursByFatigue.length > 0) {
      const bestHours = hoursByFatigue.slice(0, 3).map(([h]) => h);
      recommendations.push(
        `Schedule challenging tasks around ${bestHours.join(', ')}:00 for optimal performance`
      );
    }

    // Pattern-based recommendations
    if (patterns.some((p) => p.includes('longer than recommended'))) {
      recommendations.push('Consider using the Pomodoro technique (25 minutes work, 5 minutes break)');
    }

    if (patterns.some((p) => p.includes('Higher fatigue'))) {
      recommendations.push('Schedule lighter review activities during typical high-fatigue hours');
    }

    recommendations.push('Take regular breaks every 25-30 minutes to maintain focus');

    return recommendations;
  }
}

interface LearnerBaseline {
  averageResponseTime: number;
  averageAccuracy: number;
  typicalSessionLength: number;
  standardDevResponseTime: number;
  standardDevAccuracy: number;
}
