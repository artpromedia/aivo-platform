import type {
  CognitiveState,
  CognitiveLoadLevel,
  Activity,
  ActivityRecommendation,
  BreakRecommendation,
  DifficultyAdjustment,
  LearnerInteraction,
} from '../types/index.js';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

interface RecentActivity {
  type: string;
  timestamp: Date;
  duration: number;
  cognitiveLoad: CognitiveLoadLevel;
  score?: number;
  errorCount: number;
}

const COGNITIVE_LOAD_WEIGHTS = {
  taskComplexity: 0.25,
  timeOnTask: 0.20,
  errorRate: 0.20,
  responseLatency: 0.15,
  sessionDuration: 0.10,
  taskSwitching: 0.10,
};

export class CognitiveLoadManager {
  private stateCache: Map<string, CognitiveState> = new Map();

  /**
   * Assess the current cognitive load of a learner
   */
  async assessCurrentLoad(
    learnerId: string,
    recentActivity: RecentActivity[]
  ): Promise<CognitiveState> {
    // Check cache first (valid for configured interval)
    const cachedState = this.stateCache.get(learnerId);
    if (cachedState && Date.now() - cachedState.lastUpdated.getTime() < config.cognitive.updateIntervalMs) {
      return cachedState;
    }

    // Calculate various load indicators
    const taskComplexityScore = this.calculateTaskComplexityScore(recentActivity);
    const timeOnTaskScore = this.calculateTimeOnTaskScore(recentActivity);
    const errorRateScore = this.calculateErrorRateScore(recentActivity);
    const responseLatencyScore = await this.calculateResponseLatencyScore(learnerId, recentActivity);
    const sessionDurationScore = this.calculateSessionDurationScore(recentActivity);
    const taskSwitchingScore = this.calculateTaskSwitchingScore(recentActivity);

    // Calculate weighted load score
    const loadScore = Math.min(100, Math.round(
      taskComplexityScore * COGNITIVE_LOAD_WEIGHTS.taskComplexity +
      timeOnTaskScore * COGNITIVE_LOAD_WEIGHTS.timeOnTask +
      errorRateScore * COGNITIVE_LOAD_WEIGHTS.errorRate +
      responseLatencyScore * COGNITIVE_LOAD_WEIGHTS.responseLatency +
      sessionDurationScore * COGNITIVE_LOAD_WEIGHTS.sessionDuration +
      taskSwitchingScore * COGNITIVE_LOAD_WEIGHTS.taskSwitching
    ));

    // Calculate fatigue level
    const fatigueLevel = this.calculateFatigueLevel(
      sessionDurationScore,
      errorRateScore,
      responseLatencyScore
    );

    // Calculate attention score
    const attentionScore = this.calculateAttentionScore(
      errorRateScore,
      responseLatencyScore,
      taskSwitchingScore
    );

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(recentActivity);

    // Determine time since last break
    const timeSinceBreak = await this.getTimeSinceBreak(learnerId);

    const state: CognitiveState = {
      currentLoad: this.scoreToLevel(loadScore),
      loadScore,
      fatigueLevel,
      attentionScore,
      timeSinceBreak,
      tasksCompleted: recentActivity.filter(a => a.score !== undefined).length,
      errorRate: this.calculateOverallErrorRate(recentActivity),
      responseLatency: this.calculateAverageResponseLatency(recentActivity),
      engagementScore,
      lastUpdated: new Date(),
    };

    // Cache the state
    this.stateCache.set(learnerId, state);

    // Persist to database for historical tracking
    await this.persistCognitiveState(learnerId, state);

    return state;
  }

  /**
   * Recommend the next best activity based on cognitive state
   */
  async recommendNextActivity(
    learnerId: string,
    availableActivities: Activity[],
    currentState: CognitiveState
  ): Promise<ActivityRecommendation> {
    // Filter activities based on current cognitive state
    const eligibleActivities = availableActivities.filter(activity => {
      // If overloaded, only allow low-load activities
      if (currentState.currentLoad === 'overload') {
        return activity.cognitiveLoad === 'low';
      }

      // If high load, avoid high-load activities
      if (currentState.currentLoad === 'high') {
        return activity.cognitiveLoad !== 'high' && activity.cognitiveLoad !== 'overload';
      }

      return true;
    });

    if (eligibleActivities.length === 0) {
      // No eligible activities, recommend a break
      const fallbackActivity: Activity = {
        id: 'break',
        type: 'review-session',
        title: 'Review Session',
        description: 'A light review to reinforce recent learning',
        estimatedDuration: 10,
        cognitiveLoad: 'low',
        difficulty: 2,
        skillIds: [],
        prerequisites: [],
        metadata: { isBreakAlternative: true },
      };

      return {
        activity: fallbackActivity,
        reason: 'Current cognitive load is too high. Recommending a light activity.',
        predictedSuccess: 0.9,
        predictedEngagement: 0.6,
        cognitiveLoadImpact: 'low',
        alternativeActivities: [],
      };
    }

    // Score each activity based on fit with current state
    const scoredActivities = eligibleActivities.map(activity => ({
      activity,
      score: this.scoreActivityFit(activity, currentState),
    }));

    // Sort by score descending
    scoredActivities.sort((a, b) => b.score - a.score);

    const recommended = scoredActivities[0];
    const alternatives = scoredActivities.slice(1, 4).map(sa => sa.activity);

    return {
      activity: recommended.activity,
      reason: this.generateRecommendationReason(recommended.activity, currentState),
      predictedSuccess: this.predictSuccess(recommended.activity, currentState),
      predictedEngagement: this.predictEngagement(recommended.activity, currentState),
      cognitiveLoadImpact: recommended.activity.cognitiveLoad,
      alternativeActivities: alternatives,
    };
  }

  /**
   * Determine if the learner should take a break
   */
  async shouldTakeBreak(state: CognitiveState): Promise<BreakRecommendation> {
    const reasons: string[] = [];
    let urgency: 'optional' | 'recommended' | 'required' = 'optional';

    // Check fatigue level
    if (state.fatigueLevel >= 90) {
      urgency = 'required';
      reasons.push('Fatigue level is very high');
    } else if (state.fatigueLevel >= config.cognitive.fatigueThreshold) {
      urgency = urgency === 'required' ? 'required' : 'recommended';
      reasons.push('Fatigue level is elevated');
    }

    // Check time since break
    if (state.timeSinceBreak >= config.cognitive.defaultBreakIntervalMinutes * 2) {
      urgency = 'required';
      reasons.push('Extended time without a break');
    } else if (state.timeSinceBreak >= config.cognitive.defaultBreakIntervalMinutes) {
      urgency = urgency === 'required' ? 'required' : 'recommended';
      reasons.push('Regular break interval reached');
    }

    // Check cognitive load
    if (state.currentLoad === 'overload') {
      urgency = 'required';
      reasons.push('Cognitive overload detected');
    } else if (state.currentLoad === 'high' && state.loadScore > 80) {
      urgency = urgency === 'required' ? 'required' : 'recommended';
      reasons.push('High cognitive load sustained');
    }

    // Check attention score
    if (state.attentionScore < 30) {
      urgency = urgency === 'required' ? 'required' : 'recommended';
      reasons.push('Attention level is low');
    }

    // Check error rate
    if (state.errorRate > 0.4) {
      urgency = urgency === 'required' ? 'required' : 'recommended';
      reasons.push('Error rate is elevated');
    }

    // Determine break duration based on urgency
    const suggestedDuration = urgency === 'required' ? 10 :
                              urgency === 'recommended' ? 5 : 3;

    return {
      shouldTakeBreak: urgency !== 'optional',
      urgency,
      suggestedDuration,
      suggestedActivity: this.suggestBreakActivity(state.fatigueLevel, suggestedDuration),
      reason: reasons.length > 0 ? reasons.join('. ') : 'No break needed at this time',
    };
  }

  /**
   * Recommend difficulty adjustment based on cognitive state
   */
  async adjustDifficulty(
    currentDifficulty: number,
    state: CognitiveState
  ): Promise<DifficultyAdjustment> {
    let recommendedDifficulty = currentDifficulty;
    let reason = '';
    let confidence = 0.5;

    // If overloaded or high fatigue, decrease difficulty
    if (state.currentLoad === 'overload' || state.fatigueLevel > 80) {
      recommendedDifficulty = Math.max(1, currentDifficulty - 2);
      reason = 'Reducing difficulty due to high cognitive load or fatigue';
      confidence = 0.85;
    } else if (state.currentLoad === 'high' || state.fatigueLevel > 60) {
      recommendedDifficulty = Math.max(1, currentDifficulty - 1);
      reason = 'Slightly reducing difficulty to maintain optimal learning';
      confidence = 0.75;
    }
    // If low load and high attention, can increase difficulty
    else if (state.currentLoad === 'low' && state.attentionScore > 80 && state.errorRate < 0.15) {
      recommendedDifficulty = Math.min(10, currentDifficulty + 1);
      reason = 'Increasing difficulty to maintain challenge and engagement';
      confidence = 0.70;
    }
    // If error rate is high despite low load, decrease difficulty
    else if (state.errorRate > 0.3) {
      recommendedDifficulty = Math.max(1, currentDifficulty - 1);
      reason = 'Reducing difficulty due to elevated error rate';
      confidence = 0.80;
    }
    // If very low error rate and good engagement, slight increase
    else if (state.errorRate < 0.1 && state.engagementScore > 70) {
      recommendedDifficulty = Math.min(10, currentDifficulty + 0.5);
      reason = 'Material may be too easy, slight difficulty increase recommended';
      confidence = 0.65;
    } else {
      reason = 'Current difficulty level is appropriate';
      confidence = 0.60;
    }

    return {
      currentDifficulty,
      recommendedDifficulty: Math.round(recommendedDifficulty * 10) / 10,
      adjustmentReason: reason,
      confidence,
    };
  }

  /**
   * Track a new interaction and update cognitive state
   */
  async trackInteraction(interaction: LearnerInteraction): Promise<CognitiveState> {
    // Store interaction
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

    // Invalidate cache
    this.stateCache.delete(interaction.learnerId);

    // Get recent activity and reassess
    const recentInteractions = await this.getRecentInteractions(interaction.learnerId);
    const recentActivity: RecentActivity[] = recentInteractions.map(i => ({
      type: i.type,
      timestamp: i.timestamp,
      duration: i.duration ?? 0,
      cognitiveLoad: this.inferCognitiveLoad(i.type),
      score: i.isCorrect !== null ? (i.isCorrect ? 100 : 0) : undefined,
      errorCount: i.isCorrect === false ? 1 : 0,
    }));

    return this.assessCurrentLoad(interaction.learnerId, recentActivity);
  }

  // ========== Private Helper Methods ==========

  private calculateTaskComplexityScore(activities: RecentActivity[]): number {
    if (activities.length === 0) return 30; // Baseline

    const loadValues = { low: 25, medium: 50, high: 75, overload: 100 };
    const avgLoad = activities.reduce((sum, a) => sum + loadValues[a.cognitiveLoad], 0) / activities.length;

    return avgLoad;
  }

  private calculateTimeOnTaskScore(activities: RecentActivity[]): number {
    if (activities.length === 0) return 30;

    const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);

    // Score increases with time on task (fatigue indicator)
    if (totalMinutes < 15) return 20;
    if (totalMinutes < 30) return 40;
    if (totalMinutes < 45) return 60;
    if (totalMinutes < 60) return 75;
    return 90;
  }

  private calculateErrorRateScore(activities: RecentActivity[]): number {
    const activitiesWithScores = activities.filter(a => a.score !== undefined);
    if (activitiesWithScores.length === 0) return 30;

    const totalErrors = activities.reduce((sum, a) => sum + a.errorCount, 0);
    const errorRate = totalErrors / activitiesWithScores.length;

    // Higher error rate = higher cognitive load
    return Math.min(100, errorRate * 150);
  }

  private async calculateResponseLatencyScore(learnerId: string, _activities: RecentActivity[]): Promise<number> {
    // Get baseline response time for this learner
    const baseline = await this.getLearnerBaselineResponseTime(learnerId);
    const current = this.calculateAverageResponseLatency(_activities);

    if (baseline === 0 || current === 0) return 40;

    // If current is significantly higher than baseline, cognitive load is high
    const ratio = current / baseline;

    if (ratio < 1.1) return 30;
    if (ratio < 1.3) return 50;
    if (ratio < 1.5) return 70;
    return 90;
  }

  private calculateSessionDurationScore(activities: RecentActivity[]): number {
    if (activities.length === 0) return 20;

    const sortedByTime = [...activities].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const sessionStart = sortedByTime[0]?.timestamp;
    const sessionEnd = sortedByTime[sortedByTime.length - 1]?.timestamp;

    if (!sessionStart || !sessionEnd) return 20;

    const sessionMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / 60000;

    // Score based on session duration
    if (sessionMinutes < 15) return 15;
    if (sessionMinutes < 30) return 35;
    if (sessionMinutes < 45) return 55;
    if (sessionMinutes < 60) return 70;
    if (sessionMinutes < 90) return 85;
    return 95;
  }

  private calculateTaskSwitchingScore(activities: RecentActivity[]): number {
    if (activities.length < 2) return 20;

    let switches = 0;
    for (let i = 1; i < activities.length; i++) {
      if (activities[i].type !== activities[i - 1].type) {
        switches++;
      }
    }

    const switchRate = switches / (activities.length - 1);

    // High switch rate can indicate cognitive load or distraction
    return Math.min(100, switchRate * 120);
  }

  private calculateFatigueLevel(
    sessionDurationScore: number,
    errorRateScore: number,
    latencyScore: number
  ): number {
    // Fatigue is heavily influenced by time and increasing errors
    return Math.min(100, Math.round(
      sessionDurationScore * 0.5 +
      errorRateScore * 0.3 +
      latencyScore * 0.2
    ));
  }

  private calculateAttentionScore(
    errorRateScore: number,
    latencyScore: number,
    taskSwitchingScore: number
  ): number {
    // Inverse relationship: high error/latency/switching = low attention
    const rawScore = (errorRateScore + latencyScore + taskSwitchingScore) / 3;
    return Math.max(0, Math.round(100 - rawScore));
  }

  private calculateEngagementScore(activities: RecentActivity[]): number {
    if (activities.length === 0) return 50;

    // Calculate based on activity completion and scores
    const completedWithScore = activities.filter(a => a.score !== undefined);
    const avgScore = completedWithScore.length > 0
      ? completedWithScore.reduce((sum, a) => sum + (a.score ?? 0), 0) / completedWithScore.length
      : 50;

    // Higher scores and consistent activity indicate engagement
    const activityRate = Math.min(1, activities.length / 10);

    return Math.round((avgScore * 0.6 + activityRate * 100 * 0.4));
  }

  private calculateOverallErrorRate(activities: RecentActivity[]): number {
    const activitiesWithScores = activities.filter(a => a.score !== undefined);
    if (activitiesWithScores.length === 0) return 0;

    const totalErrors = activities.reduce((sum, a) => sum + a.errorCount, 0);
    return totalErrors / activitiesWithScores.length;
  }

  private calculateAverageResponseLatency(activities: RecentActivity[]): number {
    const withDuration = activities.filter(a => a.duration > 0);
    if (withDuration.length === 0) return 0;

    return withDuration.reduce((sum, a) => sum + a.duration * 60000 / (a.errorCount + 1), 0) / withDuration.length;
  }

  private scoreToLevel(score: number): CognitiveLoadLevel {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'overload';
  }

  private scoreActivityFit(activity: Activity, state: CognitiveState): number {
    let score = 50; // Base score

    // Load matching
    const loadMap = { low: 1, medium: 2, high: 3, overload: 4 };
    const activityLoad = loadMap[activity.cognitiveLoad];
    const currentLoad = loadMap[state.currentLoad];

    // Prefer activities with complementary load
    if (currentLoad >= 3 && activityLoad <= 2) {
      score += 30; // Low load activity when fatigued
    } else if (currentLoad <= 2 && activityLoad >= 2 && activityLoad <= 3) {
      score += 20; // Medium-high load when fresh
    } else if (Math.abs(activityLoad - currentLoad) <= 1) {
      score += 10; // Similar load
    }

    // Difficulty matching based on state
    if (state.errorRate < 0.2 && activity.difficulty >= 5) {
      score += 15; // Can handle challenge
    } else if (state.errorRate > 0.3 && activity.difficulty <= 4) {
      score += 15; // Need easier content
    }

    // Engagement boost
    if (state.engagementScore < 50 && activity.estimatedDuration <= 15) {
      score += 10; // Short activities for disengaged learners
    }

    // Fatigue consideration
    if (state.fatigueLevel > 60 && activity.estimatedDuration <= 20) {
      score += 10;
    }

    return score;
  }

  private generateRecommendationReason(activity: Activity, state: CognitiveState): string {
    const reasons: string[] = [];

    if (state.currentLoad === 'high' || state.currentLoad === 'overload') {
      if (activity.cognitiveLoad === 'low') {
        reasons.push('A lighter activity to help reduce cognitive load');
      }
    }

    if (state.fatigueLevel > 60 && activity.estimatedDuration <= 20) {
      reasons.push('Short duration appropriate for current energy level');
    }

    if (state.attentionScore < 50) {
      reasons.push('Designed to re-engage and capture attention');
    }

    if (state.errorRate > 0.25 && activity.difficulty <= 5) {
      reasons.push('Moderate difficulty to build confidence');
    }

    if (reasons.length === 0) {
      reasons.push('Well-suited to your current learning state');
    }

    return reasons.join('. ');
  }

  private predictSuccess(activity: Activity, state: CognitiveState): number {
    let prediction = 0.7; // Base prediction

    // Adjust based on cognitive state
    if (state.currentLoad === 'low') prediction += 0.1;
    if (state.currentLoad === 'high') prediction -= 0.1;
    if (state.currentLoad === 'overload') prediction -= 0.2;

    // Adjust based on activity difficulty
    if (activity.difficulty <= 3) prediction += 0.1;
    if (activity.difficulty >= 7) prediction -= 0.1;

    // Adjust based on error rate
    prediction -= state.errorRate * 0.2;

    // Adjust based on attention
    prediction += (state.attentionScore / 100) * 0.1;

    return Math.max(0.1, Math.min(0.95, prediction));
  }

  private predictEngagement(activity: Activity, state: CognitiveState): number {
    let prediction = 0.6;

    // Base on current engagement
    prediction = (state.engagementScore / 100) * 0.5 + 0.3;

    // Short activities tend to maintain engagement better when fatigued
    if (state.fatigueLevel > 50 && activity.estimatedDuration <= 15) {
      prediction += 0.1;
    }

    // Appropriate difficulty maintains engagement
    if (activity.difficulty >= 4 && activity.difficulty <= 7) {
      prediction += 0.05;
    }

    return Math.max(0.2, Math.min(0.95, prediction));
  }

  private suggestBreakActivity(fatigueLevel: number, duration: number): BreakRecommendation['suggestedActivity'] {
    if (fatigueLevel > 80) {
      return {
        type: 'walk',
        duration,
        instructions: 'Take a short walk to refresh your mind and body.',
      };
    }

    if (fatigueLevel > 60) {
      return {
        type: 'stretch',
        duration,
        instructions: 'Stand up and do some gentle stretching exercises.',
      };
    }

    if (duration >= 5) {
      return {
        type: 'eye_rest',
        duration,
        instructions: 'Rest your eyes by looking at something distant or closing them briefly.',
      };
    }

    return {
      type: 'hydrate',
      duration,
      instructions: 'Take a moment to drink some water.',
    };
  }

  private async getTimeSinceBreak(learnerId: string): Promise<number> {
    const lastBreak = await prisma.breakRecord.findFirst({
      where: { session: { learnerId } },
      orderBy: { endedAt: 'desc' },
    });

    if (!lastBreak?.endedAt) {
      // Check session start time
      const currentSession = await prisma.cognitiveSession.findFirst({
        where: { learnerId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });

      if (!currentSession) return 0;

      return Math.round((Date.now() - currentSession.startedAt.getTime()) / 60000);
    }

    return Math.round((Date.now() - lastBreak.endedAt.getTime()) / 60000);
  }

  private async getLearnerBaselineResponseTime(learnerId: string): Promise<number> {
    const interactions = await prisma.cognitiveInteraction.findMany({
      where: {
        learnerId,
        responseTime: { not: null },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    if (interactions.length === 0) return 0;

    const responseTimes = interactions.map(i => i.responseTime!).filter(rt => rt > 0);
    if (responseTimes.length === 0) return 0;

    // Use median as baseline (more robust to outliers)
    responseTimes.sort((a, b) => a - b);
    const mid = Math.floor(responseTimes.length / 2);

    return responseTimes.length % 2 !== 0
      ? responseTimes[mid]
      : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
  }

  private async getRecentInteractions(learnerId: string) {
    return prisma.cognitiveInteraction.findMany({
      where: {
        learnerId,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  private inferCognitiveLoad(interactionType: string): CognitiveLoadLevel {
    switch (interactionType) {
      case 'page_view':
      case 'idle':
        return 'low';
      case 'click':
      case 'content_interaction':
      case 'pause':
      case 'resume':
        return 'medium';
      case 'answer_submit':
      case 'help_request':
        return 'high';
      default:
        return 'medium';
    }
  }

  private async persistCognitiveState(learnerId: string, state: CognitiveState): Promise<void> {
    // Find current session
    let session = await prisma.cognitiveSession.findFirst({
      where: { learnerId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      // Create new session
      session = await prisma.cognitiveSession.create({
        data: {
          learnerId,
          tenantId: '', // Will be updated from context
          startedAt: new Date(),
        },
      });
    }

    // Store state snapshot
    await prisma.cognitiveStateSnapshot.create({
      data: {
        sessionId: session.id,
        loadLevel: state.currentLoad,
        loadScore: state.loadScore,
        fatigueLevel: state.fatigueLevel,
        attentionScore: state.attentionScore,
        errorRate: state.errorRate,
        responseLatency: state.responseLatency,
        engagementScore: state.engagementScore,
        timestamp: state.lastUpdated,
      },
    });
  }
}
