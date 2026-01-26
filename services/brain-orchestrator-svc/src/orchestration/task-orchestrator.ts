import type {
  LearningGoal,
  LearnerContext,
  OrchestrationPlan,
  Task,
  TaskResult,
  AdjustmentReason,
  CognitiveLoadProfile,
  CognitiveLoadLevel,
  PlanStatus,
} from '../types/index.js';
import { TaskDecomposer } from './task-decomposer.js';
import { TaskPrioritizer } from './task-prioritizer.js';
import { transitionTask, getCognitiveLoadLevel, COGNITIVE_LOAD_SCORES } from './task-types.js';
import type { ServiceCoordinator } from '../coordination/service-coordinator.js';
import type { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { prisma } from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';

interface OrchestrationOptions {
  maxConcurrentTasks?: number;
  autoAdjust?: boolean;
  breakReminders?: boolean;
}

export class TaskOrchestrator {
  private decomposer: TaskDecomposer;
  private prioritizer: TaskPrioritizer;
  private coordinator: ServiceCoordinator;
  private cognitiveManager: CognitiveLoadManager;
  private activePlans: Map<string, OrchestrationPlan> = new Map();

  constructor(
    decomposer: TaskDecomposer,
    prioritizer: TaskPrioritizer,
    coordinator: ServiceCoordinator,
    cognitiveManager: CognitiveLoadManager
  ) {
    this.decomposer = decomposer;
    this.prioritizer = prioritizer;
    this.coordinator = coordinator;
    this.cognitiveManager = cognitiveManager;
  }

  /**
   * Create and execute an orchestration plan for a learning goal
   */
  async orchestrate(
    goal: LearningGoal,
    learnerContext: LearnerContext,
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationPlan> {
    const { maxConcurrentTasks = 1, autoAdjust = true, breakReminders = true } = options;

    // Get learner profile from learner-model-svc
    const learnerProfile = await this.coordinator.getLearnerProfile(
      learnerContext.learnerId,
      learnerContext.tenantId
    );

    // Decompose the goal into tasks
    const decompositionResult = await this.decomposer.decompose(
      goal,
      learnerProfile,
      learnerContext.tenantId
    );

    // Prioritize the tasks
    const prioritizedQueue = await this.prioritizer.prioritize(
      decompositionResult.tasks,
      learnerContext,
      learnerContext.constraints
    );

    // Calculate cognitive load profile
    const cognitiveLoadProfile = this.calculateCognitiveLoadProfile(prioritizedQueue.tasks);

    // Create the orchestration plan
    const plan: OrchestrationPlan = {
      id: uuidv4(),
      learnerId: learnerContext.learnerId,
      tenantId: learnerContext.tenantId,
      goal,
      tasks: prioritizedQueue.tasks,
      status: 'draft',
      estimatedTotalDuration: decompositionResult.estimatedTotalDuration,
      cognitiveLoadProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save plan to database
    await this.savePlan(plan);

    // Cache active plan
    this.activePlans.set(plan.id, plan);

    return plan;
  }

  /**
   * Start executing an orchestration plan
   */
  async startPlan(planId: string): Promise<OrchestrationPlan> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status !== 'draft' && plan.status !== 'paused') {
      throw new Error(`Cannot start plan in status: ${plan.status}`);
    }

    plan.status = 'active';
    plan.startedAt = plan.startedAt ?? new Date();
    plan.updatedAt = new Date();

    await this.savePlan(plan);
    this.activePlans.set(planId, plan);

    return plan;
  }

  /**
   * Execute a specific task
   */
  async executeTask(
    planId: string,
    taskId: string,
    learnerContext: LearnerContext
  ): Promise<TaskResult> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const taskIndex = plan.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = plan.tasks[taskIndex];

    // Check if task can be started
    if (task.status !== 'pending' && task.status !== 'paused') {
      throw new Error(`Task cannot be executed in status: ${task.status}`);
    }

    // Check cognitive load before starting
    const cognitiveState = await this.cognitiveManager.assessCurrentLoad(
      learnerContext.learnerId,
      [] // Will be populated with recent activity
    );

    const breakRecommendation = await this.cognitiveManager.shouldTakeBreak(cognitiveState);
    if (breakRecommendation.urgency === 'required') {
      // Return a special result indicating break is needed
      return {
        success: false,
        timeSpent: 0,
        errorCount: 0,
        data: {
          reason: 'break_required',
          breakRecommendation,
        },
      };
    }

    // Update task status to in_progress
    plan.tasks[taskIndex] = transitionTask(task, 'in_progress');
    await this.savePlan(plan);

    // Delegate to appropriate service based on task type
    const result = await this.delegateTaskExecution(task, learnerContext);

    // Update task with result
    plan.tasks[taskIndex] = {
      ...plan.tasks[taskIndex],
      status: result.success ? 'completed' : 'failed',
      result,
      completedAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if plan is complete
    const allCompleted = plan.tasks.every(
      (t) => t.status === 'completed' || t.status === 'cancelled'
    );
    if (allCompleted) {
      plan.status = 'completed';
      plan.completedAt = new Date();
    }

    plan.updatedAt = new Date();
    await this.savePlan(plan);

    // Publish task completion event
    await this.coordinator.publishEvent('brain.task_completed', {
      planId,
      taskId,
      result,
      learnerId: learnerContext.learnerId,
    });

    return result;
  }

  /**
   * Delegate task execution to appropriate service
   */
  private async delegateTaskExecution(
    task: Task,
    learnerContext: LearnerContext
  ): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      let response;

      switch (task.type) {
        case 'lesson-completion':
          response = await this.coordinator.delegateToService('lesson-svc', {
            name: 'startLesson',
            method: 'POST',
            path: '/api/v1/lessons/start',
            payload: {
              lessonId: task.context.lessonId,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        case 'assessment':
          response = await this.coordinator.delegateToService('assessment-svc', {
            name: 'startAssessment',
            method: 'POST',
            path: '/api/v1/assessments/start',
            payload: {
              assessmentId: task.context.assessmentId,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        case 'practice-exercise':
          response = await this.coordinator.delegateToService('lesson-svc', {
            name: 'startPractice',
            method: 'POST',
            path: '/api/v1/practice/start',
            payload: {
              skillIds: task.context.skillIds,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        case 'review-session':
          response = await this.coordinator.delegateToService('learner-model-svc', {
            name: 'getReviewItems',
            method: 'GET',
            path: `/api/v1/learners/${learnerContext.learnerId}/review-items`,
          });
          break;

        case 'homework-help':
          response = await this.coordinator.delegateToService('homework-helper-svc', {
            name: 'startSession',
            method: 'POST',
            path: '/api/v1/homework/sessions',
            payload: {
              learnerId: learnerContext.learnerId,
              context: task.context,
            },
          });
          break;

        case 'skill-building':
          response = await this.coordinator.delegateToService('lesson-svc', {
            name: 'startSkillBuilding',
            method: 'POST',
            path: '/api/v1/skill-building/start',
            payload: {
              skillIds: task.context.skillIds,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        case 'project-work':
          response = await this.coordinator.delegateToService('virtual-brain-svc', {
            name: 'startProjectSession',
            method: 'POST',
            path: '/api/v1/projects/session',
            payload: {
              projectId: task.context.metadata.projectId,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        case 'collaboration':
          response = await this.coordinator.delegateToService('collaboration-svc', {
            name: 'joinSession',
            method: 'POST',
            path: '/api/v1/collaboration/join',
            payload: {
              sessionId: task.context.metadata.sessionId,
              learnerId: learnerContext.learnerId,
            },
          });
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const timeSpent = Math.round((Date.now() - startTime) / 60000); // Convert to minutes

      return {
        success: response.success,
        score: response.data?.score as number | undefined,
        masteryGain: response.data?.masteryGain as number | undefined,
        timeSpent,
        errorCount: response.data?.errorCount as number ?? 0,
        data: response.data ?? {},
      };
    } catch (error) {
      const timeSpent = Math.round((Date.now() - startTime) / 60000);

      return {
        success: false,
        timeSpent,
        errorCount: 1,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Adjust an existing plan based on learner performance or context changes
   */
  async adjustPlan(planId: string, reason: AdjustmentReason): Promise<OrchestrationPlan> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status !== 'active') {
      throw new Error(`Cannot adjust plan in status: ${plan.status}`);
    }

    // Get remaining tasks
    const remainingTasks = plan.tasks.filter((t) => t.status === 'pending' || t.status === 'paused');

    // Get current learner context
    const learnerContext = await this.buildLearnerContext(plan.learnerId, plan.tenantId);

    switch (reason.type) {
      case 'performance':
        await this.adjustForPerformance(plan, remainingTasks, reason.data);
        break;

      case 'cognitive_load':
        await this.adjustForCognitiveLoad(plan, remainingTasks, learnerContext);
        break;

      case 'time_constraint':
        await this.adjustForTimeConstraint(plan, remainingTasks, reason.data);
        break;

      case 'user_request':
        await this.adjustForUserRequest(plan, remainingTasks, reason.data);
        break;

      case 'system':
        await this.adjustForSystemChange(plan, remainingTasks, reason.data);
        break;
    }

    // Recalculate cognitive load profile
    plan.cognitiveLoadProfile = this.calculateCognitiveLoadProfile(plan.tasks);
    plan.estimatedTotalDuration = plan.tasks
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.estimatedDuration, 0);
    plan.updatedAt = new Date();

    await this.savePlan(plan);

    // Publish plan adjustment event
    await this.coordinator.publishEvent('brain.plan_adjusted', {
      planId,
      reason,
      remainingTasks: remainingTasks.length,
    });

    return plan;
  }

  private async adjustForPerformance(
    plan: OrchestrationPlan,
    remainingTasks: Task[],
    data?: Record<string, unknown>
  ): Promise<void> {
    const score = data?.score as number | undefined;
    if (score === undefined) return;

    // If performance is low, add more practice tasks
    if (score < 60) {
      const skillIds = new Set<string>();
      for (const task of plan.tasks.filter((t) => t.status === 'completed')) {
        task.context.skillIds.forEach((id) => skillIds.add(id));
      }

      // Insert additional practice for struggling skills
      const practiceTask: Task = {
        id: uuidv4(),
        type: 'practice-exercise',
        learnerId: plan.learnerId,
        tenantId: plan.tenantId,
        priority: 85,
        estimatedDuration: 15,
        cognitiveLoad: 'low', // Lower load for reinforcement
        prerequisites: [],
        dependencies: [],
        context: {
          skillIds: Array.from(skillIds),
          metadata: { reason: 'performance_boost', targetScore: score },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      plan.tasks.push(practiceTask);
    }

    // If performance is high, potentially skip easier tasks
    if (score > 90) {
      for (const task of remainingTasks) {
        if (task.type === 'review-session' && task.cognitiveLoad === 'low') {
          task.status = 'cancelled';
          task.updatedAt = new Date();
        }
      }
    }
  }

  private async adjustForCognitiveLoad(
    plan: OrchestrationPlan,
    remainingTasks: Task[],
    learnerContext: LearnerContext
  ): Promise<void> {
    const { cognitiveState } = learnerContext;

    // If learner is fatigued, reduce difficulty of upcoming tasks
    if (cognitiveState.loadScore > 70) {
      for (const task of remainingTasks) {
        if (task.cognitiveLoad === 'high') {
          task.cognitiveLoad = 'medium';
          task.estimatedDuration = Math.round(task.estimatedDuration * 1.2); // Give more time
          task.updatedAt = new Date();
        }
      }
    }

    // If very fresh, can handle more challenge
    if (cognitiveState.loadScore < 30 && cognitiveState.attentionScore > 80) {
      for (const task of remainingTasks) {
        if (task.cognitiveLoad === 'low' && task.type !== 'review-session') {
          task.cognitiveLoad = 'medium';
          task.updatedAt = new Date();
        }
      }
    }

    // Re-prioritize remaining tasks
    const reprioritized = await this.prioritizer.prioritize(
      remainingTasks,
      learnerContext,
      learnerContext.constraints
    );

    // Update task order
    const completedTasks = plan.tasks.filter(
      (t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'in_progress'
    );
    plan.tasks = [...completedTasks, ...reprioritized.tasks];
  }

  private async adjustForTimeConstraint(
    plan: OrchestrationPlan,
    remainingTasks: Task[],
    data?: Record<string, unknown>
  ): Promise<void> {
    const availableMinutes = data?.availableMinutes as number | undefined;
    if (availableMinutes === undefined) return;

    // Calculate total remaining time
    let totalRemaining = remainingTasks.reduce((sum, t) => sum + t.estimatedDuration, 0);

    if (totalRemaining <= availableMinutes) return; // No adjustment needed

    // Need to trim tasks
    // Sort by priority descending and keep high priority tasks
    const sortedTasks = [...remainingTasks].sort((a, b) => b.priority - a.priority);

    let accumulated = 0;
    for (const task of sortedTasks) {
      if (accumulated + task.estimatedDuration <= availableMinutes) {
        accumulated += task.estimatedDuration;
      } else {
        // Mark lower priority tasks as cancelled
        task.status = 'cancelled';
        task.updatedAt = new Date();
      }
    }
  }

  private async adjustForUserRequest(
    plan: OrchestrationPlan,
    _remainingTasks: Task[],
    data?: Record<string, unknown>
  ): Promise<void> {
    const action = data?.action as string | undefined;

    switch (action) {
      case 'skip_task':
        const taskIdToSkip = data?.taskId as string;
        const taskToSkip = plan.tasks.find((t) => t.id === taskIdToSkip);
        if (taskToSkip && taskToSkip.status === 'pending') {
          taskToSkip.status = 'cancelled';
          taskToSkip.updatedAt = new Date();
        }
        break;

      case 'add_break':
        // Handled by break scheduler
        break;

      case 'change_difficulty':
        const newDifficulty = data?.difficulty as CognitiveLoadLevel;
        for (const task of plan.tasks.filter((t) => t.status === 'pending')) {
          task.cognitiveLoad = newDifficulty;
          task.updatedAt = new Date();
        }
        break;
    }
  }

  private async adjustForSystemChange(
    plan: OrchestrationPlan,
    remainingTasks: Task[],
    data?: Record<string, unknown>
  ): Promise<void> {
    const changeType = data?.changeType as string | undefined;

    if (changeType === 'service_unavailable') {
      const affectedService = data?.service as string;

      // Pause tasks that depend on unavailable service
      for (const task of remainingTasks) {
        const serviceMap: Record<string, string[]> = {
          'lesson-svc': ['lesson-completion', 'practice-exercise', 'skill-building'],
          'assessment-svc': ['assessment'],
          'homework-helper-svc': ['homework-help'],
        };

        if (serviceMap[affectedService]?.includes(task.type)) {
          task.status = 'paused';
          task.updatedAt = new Date();
        }
      }
    }
  }

  /**
   * Pause an orchestration plan
   */
  async pausePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status !== 'active') {
      throw new Error(`Cannot pause plan in status: ${plan.status}`);
    }

    // Pause any in-progress tasks
    for (const task of plan.tasks) {
      if (task.status === 'in_progress') {
        task.status = 'paused';
        task.updatedAt = new Date();
      }
    }

    plan.status = 'paused';
    plan.updatedAt = new Date();

    await this.savePlan(plan);
    this.activePlans.set(planId, plan);

    await this.coordinator.publishEvent('brain.plan_paused', {
      planId,
      learnerId: plan.learnerId,
    });
  }

  /**
   * Resume a paused orchestration plan
   */
  async resumePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status !== 'paused') {
      throw new Error(`Cannot resume plan in status: ${plan.status}`);
    }

    plan.status = 'active';
    plan.updatedAt = new Date();

    await this.savePlan(plan);
    this.activePlans.set(planId, plan);

    await this.coordinator.publishEvent('brain.plan_resumed', {
      planId,
      learnerId: plan.learnerId,
    });
  }

  /**
   * Cancel an orchestration plan
   */
  async cancelPlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status === 'completed' || plan.status === 'cancelled') {
      throw new Error(`Cannot cancel plan in status: ${plan.status}`);
    }

    // Cancel all pending tasks
    for (const task of plan.tasks) {
      if (task.status === 'pending' || task.status === 'in_progress' || task.status === 'paused') {
        task.status = 'cancelled';
        task.updatedAt = new Date();
      }
    }

    plan.status = 'cancelled';
    plan.updatedAt = new Date();

    await this.savePlan(plan);
    this.activePlans.delete(planId);

    await this.coordinator.publishEvent('brain.plan_cancelled', {
      planId,
      learnerId: plan.learnerId,
    });
  }

  /**
   * Get the next task to execute
   */
  async getNextTask(planId: string): Promise<Task | null> {
    const plan = await this.getPlan(planId);
    if (!plan || plan.status !== 'active') {
      return null;
    }

    const cognitiveState = await this.cognitiveManager.assessCurrentLoad(plan.learnerId, []);

    // Find next eligible task
    for (const task of plan.tasks) {
      if (task.status !== 'pending') continue;

      // Check dependencies
      const depsCompleted = task.dependencies.every((depId) =>
        plan.tasks.find((t) => t.id === depId)?.status === 'completed'
      );
      if (!depsCompleted) continue;

      // Check prerequisites
      const prereqsCompleted = task.prerequisites.every((prereqId) =>
        plan.tasks.find((t) => t.id === prereqId)?.status === 'completed'
      );
      if (!prereqsCompleted) continue;

      // Check cognitive load compatibility
      if (cognitiveState.loadScore > 80 && task.cognitiveLoad === 'high') {
        continue; // Skip high-load tasks when fatigued
      }

      return task;
    }

    return null;
  }

  /**
   * Get current plan progress
   */
  async getPlanProgress(planId: string): Promise<{
    completedTasks: number;
    totalTasks: number;
    progress: number;
    estimatedTimeRemaining: number;
  }> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
    const totalTasks = plan.tasks.filter((t) => t.status !== 'cancelled').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const estimatedTimeRemaining = plan.tasks
      .filter((t) => t.status === 'pending' || t.status === 'paused')
      .reduce((sum, t) => sum + t.estimatedDuration, 0);

    return {
      completedTasks,
      totalTasks,
      progress,
      estimatedTimeRemaining,
    };
  }

  /**
   * Calculate cognitive load profile for a set of tasks
   */
  private calculateCognitiveLoadProfile(tasks: Task[]): CognitiveLoadProfile {
    if (tasks.length === 0) {
      return {
        averageLoad: 'low',
        peakLoad: 'low',
        breakFrequency: 0,
        recommendedSessionLength: 25,
      };
    }

    const loadScores = tasks.map((t) => COGNITIVE_LOAD_SCORES[t.cognitiveLoad]);
    const avgScore = loadScores.reduce((a, b) => a + b, 0) / loadScores.length;
    const peakScore = Math.max(...loadScores);

    const highLoadTasks = tasks.filter(
      (t) => t.cognitiveLoad === 'high' || t.cognitiveLoad === 'overload'
    ).length;
    const breakFrequency = highLoadTasks > 0 ? Math.ceil(tasks.length / highLoadTasks) : 4;

    // Recommend shorter sessions for high average load
    const recommendedSessionLength = avgScore > 60 ? 20 : avgScore > 40 ? 25 : 30;

    return {
      averageLoad: getCognitiveLoadLevel(avgScore),
      peakLoad: getCognitiveLoadLevel(peakScore),
      breakFrequency,
      recommendedSessionLength,
    };
  }

  /**
   * Build learner context from various sources
   */
  private async buildLearnerContext(learnerId: string, tenantId: string): Promise<LearnerContext> {
    const cognitiveState = await this.cognitiveManager.assessCurrentLoad(learnerId, []);

    // Get learner preferences from learner-model-svc
    const preferencesResponse = await this.coordinator.delegateToService('learner-model-svc', {
      name: 'getLearnerPreferences',
      method: 'GET',
      path: `/api/v1/learners/${learnerId}/preferences`,
    });

    const preferences = preferencesResponse.data as LearnerContext['preferences'] ?? {
      preferredSessionLength: 25,
      preferredBreakLength: 5,
      preferredDifficulty: 'adaptive',
      learningStyle: 'mixed',
      peakHours: [9, 10, 11, 14, 15, 16],
      avoidedActivityTypes: [],
    };

    return {
      learnerId,
      tenantId,
      currentSession: {
        sessionId: uuidv4(),
        startedAt: new Date(),
        tasksCompleted: 0,
        totalTimeSpent: 0,
      },
      cognitiveState,
      preferences,
      constraints: {
        availableTimeMinutes: preferences.preferredSessionLength * 4,
        hardDeadlines: [],
        requiredBreaks: true,
        maxCognitiveLoad: 'high',
      },
    };
  }

  /**
   * Get a plan from cache or database
   */
  private async getPlan(planId: string): Promise<OrchestrationPlan | null> {
    // Check cache first
    if (this.activePlans.has(planId)) {
      return this.activePlans.get(planId)!;
    }

    // Load from database
    try {
      const dbPlan = await prisma.orchestrationPlan.findUnique({
        where: { id: planId },
        include: { tasks: true },
      });

      if (!dbPlan) return null;

      const plan: OrchestrationPlan = {
        id: dbPlan.id,
        learnerId: dbPlan.learnerId,
        tenantId: dbPlan.tenantId,
        goal: dbPlan.goal as LearningGoal,
        tasks: dbPlan.tasks.map((t) => ({
          id: t.id,
          type: t.type as Task['type'],
          learnerId: dbPlan.learnerId,
          tenantId: dbPlan.tenantId,
          priority: t.priority,
          estimatedDuration: t.estimatedDuration,
          cognitiveLoad: t.cognitiveLoad as CognitiveLoadLevel,
          prerequisites: [],
          dependencies: [],
          context: { skillIds: [], metadata: {} },
          status: t.status as Task['status'],
          result: t.result as TaskResult | undefined,
          startedAt: t.startedAt ?? undefined,
          completedAt: t.completedAt ?? undefined,
          createdAt: dbPlan.createdAt,
          updatedAt: dbPlan.updatedAt,
        })),
        status: dbPlan.status as PlanStatus,
        estimatedTotalDuration: dbPlan.tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
        cognitiveLoadProfile: this.calculateCognitiveLoadProfile([]),
        startedAt: dbPlan.startedAt ?? undefined,
        completedAt: dbPlan.completedAt ?? undefined,
        createdAt: dbPlan.createdAt,
        updatedAt: dbPlan.updatedAt,
      };

      this.activePlans.set(planId, plan);
      return plan;
    } catch {
      return null;
    }
  }

  /**
   * Save a plan to the database
   */
  private async savePlan(plan: OrchestrationPlan): Promise<void> {
    await prisma.orchestrationPlan.upsert({
      where: { id: plan.id },
      update: {
        status: plan.status,
        startedAt: plan.startedAt,
        completedAt: plan.completedAt,
        updatedAt: plan.updatedAt,
      },
      create: {
        id: plan.id,
        learnerId: plan.learnerId,
        tenantId: plan.tenantId,
        goal: plan.goal as any,
        status: plan.status,
        startedAt: plan.startedAt,
        completedAt: plan.completedAt,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
    });

    // Save tasks
    for (const task of plan.tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: {
          status: task.status,
          result: task.result as any,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
        },
        create: {
          id: task.id,
          planId: plan.id,
          type: task.type,
          priority: task.priority,
          estimatedDuration: task.estimatedDuration,
          cognitiveLoad: task.cognitiveLoad,
          status: task.status,
          result: task.result as any,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
        },
      });
    }
  }
}
