import type {
  LearningEvent,
  UnifiedLearnerState,
  CognitiveState,
  OrchestrationPlan,
  LearningPath,
  MasteryState,
  SkillMastery,
} from '../types/index.js';
import { prisma } from '../prisma.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { v4 as uuidv4 } from 'uuid';

interface EventHandler {
  eventType: string | RegExp;
  handler: (event: LearningEvent) => Promise<void>;
}

interface LearnerStateCache {
  state: UnifiedLearnerState;
  lastUpdated: Date;
}

const CACHE_TTL_MS = 60000; // 1 minute cache

export class EventAggregator {
  private eventHandlers: EventHandler[] = [];
  private learnerStateCache: Map<string, LearnerStateCache> = new Map();
  private eventBuffer: Map<string, LearningEvent[]> = new Map();
  private cognitiveManager: CognitiveLoadManager;

  constructor(cognitiveManager: CognitiveLoadManager) {
    this.cognitiveManager = cognitiveManager;
    this.registerDefaultHandlers();
  }

  /**
   * Process an incoming learning event
   */
  async processEvent(event: LearningEvent): Promise<void> {
    // Store event in buffer for aggregation
    const bufferId = `${event.learnerId}:${event.tenantId}`;
    if (!this.eventBuffer.has(bufferId)) {
      this.eventBuffer.set(bufferId, []);
    }
    this.eventBuffer.get(bufferId)!.push(event);

    // Limit buffer size
    const buffer = this.eventBuffer.get(bufferId)!;
    if (buffer.length > 1000) {
      buffer.shift();
    }

    // Persist event
    await this.persistEvent(event);

    // Invalidate cache
    this.learnerStateCache.delete(bufferId);

    // Execute matching handlers
    for (const handler of this.eventHandlers) {
      const matches =
        typeof handler.eventType === 'string'
          ? handler.eventType === event.type
          : handler.eventType.test(event.type);

      if (matches) {
        try {
          await handler.handler(event);
        } catch (error) {
          console.error(`Event handler error for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Get unified state for a learner by aggregating all events
   */
  async getUnifiedState(learnerId: string, tenantId: string): Promise<UnifiedLearnerState> {
    const cacheKey = `${learnerId}:${tenantId}`;

    // Check cache
    const cached = this.learnerStateCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated.getTime() < CACHE_TTL_MS) {
      return cached.state;
    }

    // Build unified state from various sources
    const [cognitiveState, currentPlan, currentPath, masteryState, recentEvents] =
      await Promise.all([
        this.getCognitiveState(learnerId),
        this.getCurrentPlan(learnerId, tenantId),
        this.getCurrentPath(learnerId, tenantId),
        this.getMasteryState(learnerId),
        this.getRecentEvents(learnerId, tenantId),
      ]);

    const state: UnifiedLearnerState = {
      learnerId,
      tenantId,
      cognitiveState,
      currentPlan,
      currentPath,
      masteryState,
      recentEvents,
      lastUpdated: new Date(),
    };

    // Cache the state
    this.learnerStateCache.set(cacheKey, {
      state,
      lastUpdated: new Date(),
    });

    return state;
  }

  /**
   * Register a custom event handler
   */
  registerHandler(eventType: string | RegExp, handler: (event: LearningEvent) => Promise<void>): void {
    this.eventHandlers.push({ eventType, handler });
  }

  /**
   * Get aggregated statistics for a learner
   */
  async getAggregatedStats(
    learnerId: string,
    tenantId: string,
    periodDays: number = 7
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    activeDays: number;
    averageEventsPerDay: number;
    peakActivityHours: number[];
    mostCommonActivities: string[];
  }> {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const events = await prisma.learningEvent.findMany({
      where: {
        learnerId,
        tenantId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Count events by type
    const eventsByType: Record<string, number> = {};
    const eventsByDay = new Map<string, number>();
    const eventsByHour = new Map<number, number>();
    const activityTypes: string[] = [];

    for (const event of events) {
      // Type counts
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;

      // Daily counts
      const dayKey = event.timestamp.toISOString().split('T')[0];
      eventsByDay.set(dayKey, (eventsByDay.get(dayKey) ?? 0) + 1);

      // Hourly distribution
      const hour = event.timestamp.getHours();
      eventsByHour.set(hour, (eventsByHour.get(hour) ?? 0) + 1);

      // Activity types
      const activityType = (event.data as Record<string, unknown>)?.activityType as string;
      if (activityType) {
        activityTypes.push(activityType);
      }
    }

    // Find peak hours (top 3)
    const sortedHours = Array.from(eventsByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Find most common activities
    const activityCounts = new Map<string, number>();
    for (const activity of activityTypes) {
      activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
    }
    const mostCommonActivities = Array.from(activityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([activity]) => activity);

    return {
      totalEvents: events.length,
      eventsByType,
      activeDays: eventsByDay.size,
      averageEventsPerDay: events.length / Math.max(1, eventsByDay.size),
      peakActivityHours: sortedHours,
      mostCommonActivities,
    };
  }

  /**
   * Batch process events (for background processing)
   */
  async batchProcessEvents(events: LearningEvent[]): Promise<void> {
    // Group events by learner
    const eventsByLearner = new Map<string, LearningEvent[]>();

    for (const event of events) {
      const key = `${event.learnerId}:${event.tenantId}`;
      if (!eventsByLearner.has(key)) {
        eventsByLearner.set(key, []);
      }
      eventsByLearner.get(key)!.push(event);
    }

    // Process each learner's events
    const processPromises = Array.from(eventsByLearner.entries()).map(
      async ([, learnerEvents]) => {
        for (const event of learnerEvents) {
          await this.processEvent(event);
        }
      }
    );

    await Promise.all(processPromises);
  }

  // ========== Private Helper Methods ==========

  private registerDefaultHandlers(): void {
    // Handle lesson completed events
    this.registerHandler('lesson.completed', async (event) => {
      await this.handleLessonCompleted(event);
    });

    // Handle assessment submitted events
    this.registerHandler('assessment.submitted', async (event) => {
      await this.handleAssessmentSubmitted(event);
    });

    // Handle homework completed events
    this.registerHandler('homework.completed', async (event) => {
      await this.handleHomeworkCompleted(event);
    });

    // Handle focus/attention changed events
    this.registerHandler(/^focus\./, async (event) => {
      await this.handleFocusEvent(event);
    });

    // Handle skill updated events
    this.registerHandler('learner.skill_updated', async (event) => {
      await this.handleSkillUpdated(event);
    });
  }

  private async handleLessonCompleted(event: LearningEvent): Promise<void> {
    const data = event.data as {
      lessonId: string;
      score?: number;
      timeSpent?: number;
      skillIds?: string[];
    };

    // Update learning path progress
    await prisma.learningPathProgress.updateMany({
      where: {
        path: { learnerId: event.learnerId },
        currentActivityId: data.lessonId,
      },
      data: {
        completedActivityIds: {
          push: data.lessonId,
        },
        lastActivityAt: new Date(),
      },
    });

    // Emit brain event
    await this.emitBrainEvent('brain.activity_completed', {
      learnerId: event.learnerId,
      activityType: 'lesson',
      activityId: data.lessonId,
      score: data.score,
      timeSpent: data.timeSpent,
    });
  }

  private async handleAssessmentSubmitted(event: LearningEvent): Promise<void> {
    const data = event.data as {
      assessmentId: string;
      score: number;
      passed: boolean;
      skillResults?: Record<string, number>;
    };

    // Update mastery if skill results are provided
    if (data.skillResults) {
      for (const [skillId, score] of Object.entries(data.skillResults)) {
        await this.updateSkillMastery(event.learnerId, skillId, score);
      }
    }

    // Check if assessment affects current plan
    await this.checkPlanProgress(event.learnerId, 'assessment', data.assessmentId);
  }

  private async handleHomeworkCompleted(event: LearningEvent): Promise<void> {
    const data = event.data as {
      homeworkId: string;
      score?: number;
      feedback?: string;
    };

    // Update any active orchestration plans
    await this.checkPlanProgress(event.learnerId, 'homework-help', data.homeworkId);
  }

  private async handleFocusEvent(event: LearningEvent): Promise<void> {
    const data = event.data as {
      focusLevel?: number;
      attentionScore?: number;
      sessionId?: string;
    };

    // Update cognitive state tracking
    if (data.focusLevel !== undefined || data.attentionScore !== undefined) {
      // This will be picked up by the cognitive load manager
      // when next state assessment is performed
    }
  }

  private async handleSkillUpdated(event: LearningEvent): Promise<void> {
    const data = event.data as {
      skillId: string;
      previousLevel: number;
      newLevel: number;
      source: string;
    };

    // Check for mastery milestones
    const milestones = [25, 50, 75, 90, 100];
    for (const milestone of milestones) {
      if (data.previousLevel < milestone && data.newLevel >= milestone) {
        await this.emitBrainEvent('brain.mastery_milestone', {
          learnerId: event.learnerId,
          skillId: data.skillId,
          milestone,
          level: data.newLevel,
        });
        break;
      }
    }
  }

  private async getCognitiveState(learnerId: string): Promise<CognitiveState> {
    return this.cognitiveManager.assessCurrentLoad(learnerId, []);
  }

  private async getCurrentPlan(
    learnerId: string,
    tenantId: string
  ): Promise<OrchestrationPlan | undefined> {
    const plan = await prisma.orchestrationPlan.findFirst({
      where: {
        learnerId,
        tenantId,
        status: { in: ['active', 'paused'] },
      },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) return undefined;

    // Convert to OrchestrationPlan type
    return {
      id: plan.id,
      learnerId: plan.learnerId,
      tenantId: plan.tenantId,
      goal: plan.goal as OrchestrationPlan['goal'],
      tasks: plan.tasks.map((t) => ({
        id: t.id,
        type: t.type as any,
        learnerId: plan.learnerId,
        tenantId: plan.tenantId,
        priority: t.priority,
        estimatedDuration: t.estimatedDuration,
        cognitiveLoad: t.cognitiveLoad as any,
        prerequisites: [],
        dependencies: [],
        context: { skillIds: [], metadata: {} },
        status: t.status as any,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      })),
      status: plan.status as any,
      estimatedTotalDuration: plan.tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      cognitiveLoadProfile: {
        averageLoad: 'medium',
        peakLoad: 'high',
        breakFrequency: 4,
        recommendedSessionLength: 25,
      },
      startedAt: plan.startedAt ?? undefined,
      completedAt: plan.completedAt ?? undefined,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private async getCurrentPath(
    learnerId: string,
    tenantId: string
  ): Promise<LearningPath | undefined> {
    const path = await prisma.learningPath.findFirst({
      where: {
        learnerId,
        tenantId,
        progress: {
          is: {
            totalProgress: { lt: 100 },
          },
        },
      },
      include: { progress: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!path) return undefined;

    return {
      id: path.id,
      learnerId: path.learnerId,
      tenantId: path.tenantId,
      name: path.name,
      description: path.description ?? '',
      activities: { orderedActivities: [], branchingPoints: [] },
      estimatedTotalDuration: path.estimatedDuration,
      progress: path.progress
        ? {
            completedActivityIds: path.progress.completedActivityIds as string[],
            currentActivityId: path.progress.currentActivityId ?? undefined,
            totalProgress: path.progress.totalProgress,
            estimatedTimeRemaining: path.progress.estimatedTimeRemaining,
            lastActivityAt: path.progress.lastActivityAt ?? undefined,
          }
        : {
            completedActivityIds: [],
            totalProgress: 0,
            estimatedTimeRemaining: path.estimatedDuration,
          },
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }

  private async getMasteryState(learnerId: string): Promise<MasteryState> {
    const masteryRecords = await prisma.skillMastery.findMany({
      where: { learnerId },
    });

    const skills = new Map<string, SkillMastery>();
    for (const record of masteryRecords) {
      skills.set(record.skillId, {
        skillId: record.skillId,
        level: record.level,
        confidence: record.confidence,
        lastPracticed: record.lastPracticed,
        practiceCount: record.practiceCount,
        trend: record.trend as 'improving' | 'stable' | 'declining',
      });
    }

    return {
      learnerId,
      skills,
      lastUpdated: new Date(),
    };
  }

  private async getRecentEvents(
    learnerId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<LearningEvent[]> {
    const events = await prisma.learningEvent.findMany({
      where: { learnerId, tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      type: e.type,
      learnerId: e.learnerId,
      tenantId: e.tenantId,
      timestamp: e.timestamp,
      data: e.data as Record<string, unknown>,
      source: e.source,
    }));
  }

  private async persistEvent(event: LearningEvent): Promise<void> {
    await prisma.learningEvent.create({
      data: {
        id: event.id || uuidv4(),
        type: event.type,
        learnerId: event.learnerId,
        tenantId: event.tenantId,
        timestamp: event.timestamp,
        data: event.data,
        source: event.source,
      },
    });
  }

  private async updateSkillMastery(
    learnerId: string,
    skillId: string,
    score: number
  ): Promise<void> {
    const existing = await prisma.skillMastery.findUnique({
      where: {
        learnerId_skillId: { learnerId, skillId },
      },
    });

    const newLevel = existing
      ? Math.min(100, existing.level + (score > 70 ? 5 : score > 50 ? 2 : -1))
      : score * 0.5;

    await prisma.skillMastery.upsert({
      where: {
        learnerId_skillId: { learnerId, skillId },
      },
      update: {
        level: newLevel,
        lastPracticed: new Date(),
        practiceCount: { increment: 1 },
        trend: newLevel > (existing?.level ?? 0) ? 'improving' : 'stable',
      },
      create: {
        learnerId,
        skillId,
        level: newLevel,
        confidence: 0.5,
        lastPracticed: new Date(),
        practiceCount: 1,
        trend: 'stable',
      },
    });
  }

  private async checkPlanProgress(
    learnerId: string,
    activityType: string,
    activityId: string
  ): Promise<void> {
    // Find active plan with matching task
    const plan = await prisma.orchestrationPlan.findFirst({
      where: {
        learnerId,
        status: 'active',
        tasks: {
          some: {
            type: activityType,
            status: 'in_progress',
          },
        },
      },
      include: { tasks: true },
    });

    if (!plan) return;

    // Mark matching task as completed
    const task = plan.tasks.find((t) => t.type === activityType && t.status === 'in_progress');
    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }
  }

  private async emitBrainEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    const event: LearningEvent = {
      id: uuidv4(),
      type: eventType,
      learnerId: data.learnerId as string,
      tenantId: '', // Would be set from context
      timestamp: new Date(),
      data,
      source: 'brain-orchestrator-svc',
    };

    await this.persistEvent(event);
  }
}
