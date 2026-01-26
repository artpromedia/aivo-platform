import type {
  LearnerInteraction,
  AttentionMetrics,
  DisengagementAlert,
} from '../types/index.js';
import { prisma } from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';

interface AttentionWindow {
  startTime: Date;
  endTime: Date;
  interactions: LearnerInteraction[];
  focusScore: number;
}

const ATTENTION_THRESHOLDS = {
  minFocusScore: 40, // Below this triggers disengagement alert
  maxIdleTimeMs: 120000, // 2 minutes idle
  maxDistractionsPerWindow: 5,
  windowSizeMs: 300000, // 5-minute analysis windows
};

export class AttentionTracker {
  private interactionBuffer: Map<string, LearnerInteraction[]> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();

  /**
   * Track a learner interaction
   */
  async trackInteraction(interaction: LearnerInteraction): Promise<void> {
    const learnerId = interaction.learnerId;

    // Add to buffer
    if (!this.interactionBuffer.has(learnerId)) {
      this.interactionBuffer.set(learnerId, []);
    }

    const buffer = this.interactionBuffer.get(learnerId)!;
    buffer.push(interaction);

    // Keep only recent interactions (last 30 minutes)
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    this.interactionBuffer.set(
      learnerId,
      buffer.filter((i) => i.timestamp >= cutoff)
    );

    // Persist interaction
    await prisma.cognitiveInteraction.create({
      data: {
        id: interaction.id,
        sessionId: interaction.sessionId,
        learnerId: interaction.learnerId,
        tenantId: interaction.tenantId,
        type: interaction.type,
        activityId: interaction.activityId,
        timestamp: interaction.timestamp,
        duration: interaction.duration,
        responseTime: interaction.data.responseTime,
        isCorrect: interaction.data.isCorrect,
        attemptNumber: interaction.data.attemptNumber,
        errorType: interaction.data.errorType,
        metadata: interaction.data.metadata ?? {},
      },
    });
  }

  /**
   * Get attention metrics for a learner
   */
  async getAttentionMetrics(learnerId: string): Promise<AttentionMetrics> {
    // Get recent interactions from buffer and database
    const bufferInteractions = this.interactionBuffer.get(learnerId) ?? [];
    const dbInteractions = await prisma.cognitiveInteraction.findMany({
      where: {
        learnerId,
        timestamp: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Merge and dedupe by id
    const interactionMap = new Map<string, LearnerInteraction>();
    for (const dbInt of dbInteractions) {
      interactionMap.set(dbInt.id, {
        id: dbInt.id,
        learnerId: dbInt.learnerId,
        tenantId: dbInt.tenantId,
        sessionId: dbInt.sessionId,
        type: dbInt.type as LearnerInteraction['type'],
        activityId: dbInt.activityId ?? undefined,
        timestamp: dbInt.timestamp,
        duration: dbInt.duration ?? undefined,
        data: {
          responseTime: dbInt.responseTime ?? undefined,
          isCorrect: dbInt.isCorrect ?? undefined,
          attemptNumber: dbInt.attemptNumber ?? undefined,
          errorType: dbInt.errorType ?? undefined,
          metadata: dbInt.metadata as Record<string, unknown> | undefined,
        },
      });
    }
    for (const bufInt of bufferInteractions) {
      interactionMap.set(bufInt.id, bufInt);
    }

    const interactions = Array.from(interactionMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    if (interactions.length === 0) {
      return {
        focusScore: 50,
        distractionEvents: 0,
        averageTimeOnTask: 0,
        taskSwitchFrequency: 0,
        engagementTrend: 'stable',
      };
    }

    // Calculate metrics
    const focusScore = this.calculateFocusScore(interactions);
    const distractionEvents = this.countDistractionEvents(interactions);
    const averageTimeOnTask = this.calculateAverageTimeOnTask(interactions);
    const taskSwitchFrequency = this.calculateTaskSwitchFrequency(interactions);
    const engagementTrend = this.determineEngagementTrend(interactions);

    return {
      focusScore,
      distractionEvents,
      averageTimeOnTask,
      taskSwitchFrequency,
      engagementTrend,
    };
  }

  /**
   * Detect if learner is disengaged
   */
  async detectDisengagement(learnerId: string): Promise<DisengagementAlert | null> {
    // Avoid spamming alerts
    const lastAlert = this.lastAlertTime.get(learnerId);
    if (lastAlert && Date.now() - lastAlert.getTime() < 5 * 60 * 1000) {
      return null; // Don't alert more than once per 5 minutes
    }

    const metrics = await this.getAttentionMetrics(learnerId);
    const indicators: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check focus score
    if (metrics.focusScore < 20) {
      indicators.push('Very low focus score');
      severity = 'high';
    } else if (metrics.focusScore < ATTENTION_THRESHOLDS.minFocusScore) {
      indicators.push('Low focus score');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Check distraction events
    if (metrics.distractionEvents > ATTENTION_THRESHOLDS.maxDistractionsPerWindow * 2) {
      indicators.push('High frequency of distractions');
      severity = 'high';
    } else if (metrics.distractionEvents > ATTENTION_THRESHOLDS.maxDistractionsPerWindow) {
      indicators.push('Elevated distraction events');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Check engagement trend
    if (metrics.engagementTrend === 'decreasing') {
      indicators.push('Declining engagement over time');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Check for extended idle time
    const idleTime = await this.getIdleTime(learnerId);
    if (idleTime > ATTENTION_THRESHOLDS.maxIdleTimeMs * 2) {
      indicators.push('Extended period of inactivity');
      severity = 'high';
    } else if (idleTime > ATTENTION_THRESHOLDS.maxIdleTimeMs) {
      indicators.push('Prolonged idle time detected');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // No disengagement detected
    if (indicators.length === 0) {
      return null;
    }

    // Generate suggested actions based on indicators
    const suggestedActions = this.generateSuggestedActions(indicators, severity);

    const alert: DisengagementAlert = {
      learnerId,
      sessionId: await this.getCurrentSessionId(learnerId),
      severity,
      indicators,
      suggestedActions,
      timestamp: new Date(),
    };

    // Record alert time
    this.lastAlertTime.set(learnerId, new Date());

    // Store alert for analytics
    await this.persistAlert(alert);

    return alert;
  }

  // ========== Private Helper Methods ==========

  private calculateFocusScore(interactions: LearnerInteraction[]): number {
    if (interactions.length === 0) return 50;

    let focusPoints = 0;
    let totalWeight = 0;

    // Analyze interaction patterns
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      let weight = 1;

      // More recent interactions have higher weight
      const recencyFactor = i / interactions.length;
      weight *= 0.5 + recencyFactor * 0.5;

      // Score based on interaction type
      switch (interaction.type) {
        case 'answer_submit':
          focusPoints += 90 * weight;
          break;
        case 'content_interaction':
          focusPoints += 80 * weight;
          break;
        case 'click':
          focusPoints += 60 * weight;
          break;
        case 'page_view':
          focusPoints += 50 * weight;
          break;
        case 'help_request':
          focusPoints += 70 * weight;
          break;
        case 'focus_change':
          focusPoints += 30 * weight; // Tab switching indicates distraction
          break;
        case 'idle':
          focusPoints += 10 * weight;
          break;
        default:
          focusPoints += 40 * weight;
      }

      totalWeight += weight;

      // Bonus for correct answers
      if (interaction.data.isCorrect === true) {
        focusPoints += 10 * weight;
      }

      // Penalty for errors indicating confusion
      if (interaction.data.isCorrect === false && (interaction.data.attemptNumber ?? 1) > 2) {
        focusPoints -= 5 * weight;
      }
    }

    // Calculate gaps between interactions
    const gapPenalty = this.calculateGapPenalty(interactions);

    const rawScore = totalWeight > 0 ? focusPoints / totalWeight : 50;
    return Math.max(0, Math.min(100, Math.round(rawScore - gapPenalty)));
  }

  private calculateGapPenalty(interactions: LearnerInteraction[]): number {
    if (interactions.length < 2) return 0;

    let totalGapMs = 0;
    let significantGaps = 0;

    for (let i = 1; i < interactions.length; i++) {
      const gap = interactions[i].timestamp.getTime() - interactions[i - 1].timestamp.getTime();

      if (gap > 60000) {
        // Gap > 1 minute
        totalGapMs += gap;
        significantGaps++;
      }
    }

    // Penalty based on number and duration of significant gaps
    const avgGapMinutes = significantGaps > 0 ? totalGapMs / significantGaps / 60000 : 0;
    const gapFrequencyPenalty = significantGaps * 2;
    const gapDurationPenalty = Math.min(20, avgGapMinutes * 2);

    return gapFrequencyPenalty + gapDurationPenalty;
  }

  private countDistractionEvents(interactions: LearnerInteraction[]): number {
    let count = 0;

    for (const interaction of interactions) {
      // Focus changes indicate tab switching or window changes
      if (interaction.type === 'focus_change') {
        count++;
      }

      // Extended idle periods
      if (interaction.type === 'idle' && (interaction.duration ?? 0) > 60000) {
        count++;
      }
    }

    // Also count large gaps between interactions
    for (let i = 1; i < interactions.length; i++) {
      const gap = interactions[i].timestamp.getTime() - interactions[i - 1].timestamp.getTime();
      if (gap > 180000) {
        // 3+ minute gap
        count++;
      }
    }

    return count;
  }

  private calculateAverageTimeOnTask(interactions: LearnerInteraction[]): number {
    const withDuration = interactions.filter((i) => i.duration && i.duration > 0);

    if (withDuration.length === 0) {
      // Estimate from gaps between interactions
      if (interactions.length < 2) return 0;

      let totalTime = 0;
      for (let i = 1; i < interactions.length; i++) {
        const gap = interactions[i].timestamp.getTime() - interactions[i - 1].timestamp.getTime();
        if (gap < 300000) {
          // Only count gaps < 5 minutes as active time
          totalTime += gap;
        }
      }

      return Math.round(totalTime / interactions.length);
    }

    const totalDuration = withDuration.reduce((sum, i) => sum + (i.duration ?? 0), 0);
    return Math.round(totalDuration / withDuration.length);
  }

  private calculateTaskSwitchFrequency(interactions: LearnerInteraction[]): number {
    if (interactions.length < 2) return 0;

    let switches = 0;
    let lastActivityId: string | undefined;

    for (const interaction of interactions) {
      if (interaction.activityId && interaction.activityId !== lastActivityId) {
        switches++;
        lastActivityId = interaction.activityId;
      }
    }

    // Calculate frequency per hour
    const durationMs =
      interactions[interactions.length - 1].timestamp.getTime() - interactions[0].timestamp.getTime();
    const durationHours = Math.max(0.1, durationMs / (1000 * 60 * 60));

    return Math.round(switches / durationHours);
  }

  private determineEngagementTrend(interactions: LearnerInteraction[]): 'increasing' | 'stable' | 'decreasing' {
    if (interactions.length < 10) return 'stable';

    // Split into early and late windows
    const midpoint = Math.floor(interactions.length / 2);
    const earlyInteractions = interactions.slice(0, midpoint);
    const lateInteractions = interactions.slice(midpoint);

    // Calculate focus scores for each window
    const earlyFocus = this.calculateFocusScore(earlyInteractions);
    const lateFocus = this.calculateFocusScore(lateInteractions);

    const difference = lateFocus - earlyFocus;

    if (difference > 10) return 'increasing';
    if (difference < -10) return 'decreasing';
    return 'stable';
  }

  private async getIdleTime(learnerId: string): Promise<number> {
    const lastInteraction = await prisma.cognitiveInteraction.findFirst({
      where: { learnerId },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastInteraction) return 0;

    return Date.now() - lastInteraction.timestamp.getTime();
  }

  private generateSuggestedActions(indicators: string[], severity: 'low' | 'medium' | 'high'): string[] {
    const actions: string[] = [];

    if (indicators.some((i) => i.includes('idle') || i.includes('inactivity'))) {
      actions.push('Send a gentle reminder or check-in message');
      actions.push('Offer a simpler or more engaging activity');
    }

    if (indicators.some((i) => i.includes('distraction'))) {
      actions.push('Suggest minimizing other browser tabs');
      actions.push('Offer a short break before continuing');
    }

    if (indicators.some((i) => i.includes('focus'))) {
      actions.push('Try a more interactive activity type');
      actions.push('Break content into smaller chunks');
    }

    if (indicators.some((i) => i.includes('engagement') || i.includes('Declining'))) {
      actions.push('Switch to a different topic or activity type');
      actions.push('Provide encouragement and highlight progress');
    }

    if (severity === 'high') {
      actions.push('Consider ending the session and resuming later');
    }

    return actions;
  }

  private async getCurrentSessionId(learnerId: string): Promise<string> {
    const session = await prisma.cognitiveSession.findFirst({
      where: { learnerId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    return session?.id ?? uuidv4();
  }

  private async persistAlert(alert: DisengagementAlert): Promise<void> {
    // Store in database for analytics and review
    await prisma.disengagementAlert.create({
      data: {
        id: uuidv4(),
        learnerId: alert.learnerId,
        sessionId: alert.sessionId,
        severity: alert.severity,
        indicators: alert.indicators,
        suggestedActions: alert.suggestedActions,
        timestamp: alert.timestamp,
      },
    });
  }
}
