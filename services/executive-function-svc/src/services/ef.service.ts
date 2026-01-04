/**
 * Executive Function Service - Core business logic
 * Provides comprehensive executive function support including task management,
 * visual schedules, planning assistance, and EF strategy recommendations.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type EFSkill = 'WORKING_MEMORY' | 'COGNITIVE_FLEXIBILITY' | 'INHIBITORY_CONTROL' | 'PLANNING' | 'ORGANIZATION' | 'TIME_MANAGEMENT' | 'TASK_INITIATION' | 'EMOTIONAL_REGULATION' | 'METACOGNITION';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type BlockType = 'LEARNING' | 'BREAK' | 'TRANSITION' | 'ROUTINE' | 'FLEXIBLE';

export interface CreateProfileRequest {
  learnerId: string;
  skillLevels?: Record<EFSkill, number>;
  preferredChunkMin?: number;
  preferredBreakMin?: number;
  needsVisualSchedule?: boolean;
  needsCountdown?: boolean;
  needsTransitionWarn?: boolean;
  transitionWarnMin?: number;
  bestFocusTime?: string;
  maxVisibleTasks?: number;
  rewardStyle?: string;
}

export interface CreateTaskRequest {
  learnerId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  parentTaskId?: string;
  estimatedMin?: number;
  dueAt?: Date;
  category?: string;
  icon?: string;
  color?: string;
  rewardXp?: number;
}

export interface TaskBreakdownResult {
  originalTask: string;
  subtasks: SubtaskSuggestion[];
  totalEstimatedMin: number;
  strategyRecommendations: string[];
}

export interface SubtaskSuggestion {
  title: string;
  description: string;
  estimatedMin: number;
  order: number;
}

export interface CreateScheduleRequest {
  learnerId: string;
  scheduleDate: Date;
  templateId?: string;
  blocks: ScheduleBlockInput[];
  notes?: string;
}

export interface ScheduleBlockInput {
  blockType: BlockType;
  title: string;
  startTime: Date;
  endTime: Date;
  icon?: string;
  color?: string;
  taskIds?: string[];
}

export interface CreateTemplateRequest {
  learnerId?: string;
  name: string;
  dayType: string;
  blocks: TemplateBlockInput[];
  isDefault?: boolean;
}

export interface TemplateBlockInput {
  blockType: BlockType;
  title: string;
  startTimeOffset: number; // Minutes from midnight
  durationMin: number;
  icon?: string;
  color?: string;
}

export interface CheckInRequest {
  update: string;
  feelingRating?: number;
  minutesWorked?: number;
  blockers?: string;
  nextStep?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE FUNCTION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ExecutiveFunctionService {
  constructor(private prisma: PrismaClient) {}

  // ════════════════════════════════════════════════════════════════════════════
  // EF PROFILES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create or update an EF profile for a learner
   */
  async upsertProfile(tenantId: string, request: CreateProfileRequest) {
    return this.prisma.eFProfile.upsert({
      where: { learnerId: request.learnerId },
      update: {
        skillLevels: (request.skillLevels as any) ?? undefined,
        preferredChunkMin: request.preferredChunkMin,
        preferredBreakMin: request.preferredBreakMin,
        needsVisualSchedule: request.needsVisualSchedule,
        needsCountdown: request.needsCountdown,
        needsTransitionWarn: request.needsTransitionWarn,
        transitionWarnMin: request.transitionWarnMin,
        bestFocusTime: request.bestFocusTime,
        maxVisibleTasks: request.maxVisibleTasks,
        rewardStyle: request.rewardStyle,
      },
      create: {
        tenantId,
        learnerId: request.learnerId,
        skillLevels: (request.skillLevels as any) ?? {},
        preferredChunkMin: request.preferredChunkMin ?? 15,
        preferredBreakMin: request.preferredBreakMin ?? 5,
        needsVisualSchedule: request.needsVisualSchedule ?? true,
        needsCountdown: request.needsCountdown ?? true,
        needsTransitionWarn: request.needsTransitionWarn ?? true,
        transitionWarnMin: request.transitionWarnMin ?? 5,
        bestFocusTime: request.bestFocusTime,
        maxVisibleTasks: request.maxVisibleTasks ?? 3,
        rewardStyle: request.rewardStyle ?? 'VISUAL',
      },
    });
  }

  /**
   * Get EF profile for a learner
   */
  async getProfile(learnerId: string) {
    return this.prisma.eFProfile.findUnique({
      where: { learnerId },
    });
  }

  /**
   * Update skill levels based on performance
   */
  async updateSkillLevel(learnerId: string, skill: EFSkill, change: number) {
    const profile = await this.prisma.eFProfile.findUnique({
      where: { learnerId },
    });

    if (!profile) return null;

    const skillLevels = (profile.skillLevels as Record<string, number>) || {};
    const currentLevel = skillLevels[skill] ?? 50;
    const newLevel = Math.max(0, Math.min(100, currentLevel + change));
    skillLevels[skill] = newLevel;

    return this.prisma.eFProfile.update({
      where: { learnerId },
      data: { skillLevels },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TASKS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new task
   */
  async createTask(tenantId: string, request: CreateTaskRequest) {
    // Get max order index for sibling tasks
    const maxOrder = await this.prisma.learnerTask.aggregate({
      where: {
        tenantId,
        learnerId: request.learnerId,
        parentTaskId: request.parentTaskId ?? null,
      },
      _max: { orderIndex: true },
    });

    return this.prisma.learnerTask.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        title: request.title,
        description: request.description,
        priority: request.priority ?? 'MEDIUM',
        parentTaskId: request.parentTaskId,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        estimatedMin: request.estimatedMin,
        dueAt: request.dueAt,
        category: request.category,
        icon: request.icon,
        color: request.color,
        rewardXp: request.rewardXp ?? 5,
        status: 'NOT_STARTED',
      },
    });
  }

  /**
   * Get tasks for a learner
   */
  async getTasks(tenantId: string, learnerId: string, options?: {
    status?: TaskStatus;
    parentTaskId?: string | null;
    includeSubtasks?: boolean;
    limit?: number;
  }) {
    const tasks = await this.prisma.learnerTask.findMany({
      where: {
        tenantId,
        learnerId,
        ...(options?.status && { status: options.status }),
        ...(options?.parentTaskId !== undefined && { parentTaskId: options.parentTaskId }),
      },
      include: {
        subtasks: options?.includeSubtasks ? {
          orderBy: { orderIndex: 'asc' },
        } : false,
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueAt: 'asc' },
        { orderIndex: 'asc' },
      ],
      take: options?.limit,
    });

    return tasks;
  }

  /**
   * Get active (visible) tasks respecting max visible setting
   */
  async getActiveTasks(tenantId: string, learnerId: string) {
    const profile = await this.getProfile(learnerId);
    const maxVisible = profile?.maxVisibleTasks ?? 3;

    return this.getTasks(tenantId, learnerId, {
      status: undefined, // Get non-completed
      parentTaskId: null, // Only top-level tasks
      includeSubtasks: true,
      limit: maxVisible,
    }).then(tasks =>
      tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SKIPPED')
    );
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<{
    title: string;
    description: string;
    priority: TaskPriority;
    estimatedMin: number;
    dueAt: Date;
    category: string;
    icon: string;
    color: string;
  }>) {
    return this.prisma.learnerTask.update({
      where: { id: taskId },
      data: updates,
    });
  }

  /**
   * Start a task
   */
  async startTask(taskId: string) {
    return this.prisma.learnerTask.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, actualMin?: number) {
    const task = await this.prisma.learnerTask.findUnique({
      where: { id: taskId },
      include: { subtasks: true },
    });

    if (!task) throw new Error('Task not found');

    // Complete all subtasks too
    if (task.subtasks.length > 0) {
      await this.prisma.learnerTask.updateMany({
        where: { parentTaskId: taskId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    // Update EF skill (TASK_INITIATION, PLANNING)
    await this.updateSkillLevel(task.learnerId, 'TASK_INITIATION', 2);

    // Bonus for accurate time estimation
    if (task.estimatedMin && actualMin) {
      const accuracy = 1 - Math.abs(task.estimatedMin - actualMin) / task.estimatedMin;
      if (accuracy > 0.8) {
        await this.updateSkillLevel(task.learnerId, 'TIME_MANAGEMENT', 3);
      }
    }

    return this.prisma.learnerTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualMin,
      },
    });
  }

  /**
   * Mark task as blocked
   */
  async blockTask(taskId: string, reason: string) {
    const task = await this.prisma.learnerTask.update({
      where: { id: taskId },
      data: { status: 'BLOCKED' },
    });

    // Log the blocker
    await this.addCheckIn(taskId, {
      update: 'Task blocked',
      blockers: reason,
    });

    return task;
  }

  /**
   * Skip a task
   */
  async skipTask(taskId: string) {
    return this.prisma.learnerTask.update({
      where: { id: taskId },
      data: { status: 'SKIPPED' },
    });
  }

  /**
   * Add a check-in to a task
   */
  async addCheckIn(taskId: string, request: CheckInRequest) {
    return this.prisma.taskCheckIn.create({
      data: {
        taskId,
        update: request.update,
        feelingRating: request.feelingRating,
        minutesWorked: request.minutesWorked,
        blockers: request.blockers,
        nextStep: request.nextStep,
      },
    });
  }

  /**
   * Reorder tasks
   */
  async reorderTasks(taskIds: string[]) {
    const updates = taskIds.map((id, index) =>
      this.prisma.learnerTask.update({
        where: { id },
        data: { orderIndex: index },
      })
    );

    await this.prisma.$transaction(updates);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TASK BREAKDOWN (AI-Assisted)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Break down a complex task into smaller subtasks
   * Uses pattern matching and heuristics (would integrate AI in production)
   */
  async breakdownTask(
    tenantId: string,
    learnerId: string,
    taskDescription: string,
    options?: { maxSubtasks?: number; preferredChunkMin?: number }
  ): Promise<TaskBreakdownResult> {
    const profile = await this.getProfile(learnerId);
    const chunkMin = options?.preferredChunkMin ?? profile?.preferredChunkMin ?? 15;
    const maxSubtasks = options?.maxSubtasks ?? 5;

    // In production, this would call an AI service
    // For now, use heuristic breakdown
    const subtasks = this.heuristicBreakdown(taskDescription, chunkMin, maxSubtasks);
    const totalEstimatedMin = subtasks.reduce((sum, s) => sum + s.estimatedMin, 0);

    // Get relevant strategies
    const strategies = await this.getRecommendedStrategies(learnerId, ['PLANNING', 'TASK_INITIATION']);

    // Create planning session record
    await this.prisma.planningSession.create({
      data: {
        tenantId,
        learnerId,
        planningGoal: 'Break down task into manageable steps',
        originalTask: taskDescription,
        breakdown: subtasks as any,
        totalEstimatedMin,
        createdTaskIds: [],
      },
    });

    return {
      originalTask: taskDescription,
      subtasks,
      totalEstimatedMin,
      strategyRecommendations: strategies.map(s => s.title),
    };
  }

  /**
   * Create tasks from a breakdown
   */
  async createTasksFromBreakdown(
    tenantId: string,
    learnerId: string,
    parentTaskId: string,
    subtasks: SubtaskSuggestion[]
  ) {
    const createdTasks = [];

    for (const subtask of subtasks) {
      const task = await this.createTask(tenantId, {
        learnerId,
        title: subtask.title,
        description: subtask.description,
        parentTaskId,
        estimatedMin: subtask.estimatedMin,
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }

  private heuristicBreakdown(task: string, chunkMin: number, maxSubtasks: number): SubtaskSuggestion[] {
    // Simple heuristic breakdown based on task complexity
    const words = task.split(' ').length;
    const estimatedTotal = Math.max(15, Math.min(120, words * 3)); // Rough estimate
    const numSubtasks = Math.min(maxSubtasks, Math.ceil(estimatedTotal / chunkMin));

    const subtasks: SubtaskSuggestion[] = [];
    const subtaskTime = Math.ceil(estimatedTotal / numSubtasks);

    // Generic breakdown pattern
    const patterns = [
      { prefix: 'Gather materials for', suffix: '' },
      { prefix: 'Review and understand', suffix: '' },
      { prefix: 'Start working on', suffix: '' },
      { prefix: 'Continue and complete', suffix: '' },
      { prefix: 'Review and finish', suffix: '' },
    ];

    for (let i = 0; i < numSubtasks; i++) {
      const pattern = patterns[Math.min(i, patterns.length - 1)];
      subtasks.push({
        title: `Step ${i + 1}: ${pattern.prefix} ${task.substring(0, 30)}...`,
        description: `Part ${i + 1} of ${numSubtasks} for this task`,
        estimatedMin: subtaskTime,
        order: i,
      });
    }

    return subtasks;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VISUAL SCHEDULES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a visual schedule
   */
  async createSchedule(tenantId: string, request: CreateScheduleRequest) {
    const schedule = await this.prisma.visualSchedule.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        scheduleDate: request.scheduleDate,
        templateId: request.templateId,
        notes: request.notes,
        isReviewed: false,
      },
    });

    // Create blocks
    for (let i = 0; i < request.blocks.length; i++) {
      const block = request.blocks[i];
      const durationMin = Math.round(
        (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
      );

      await this.prisma.scheduleBlock.create({
        data: {
          scheduleId: schedule.id,
          blockType: block.blockType,
          title: block.title,
          startTime: block.startTime,
          endTime: block.endTime,
          durationMin,
          orderIndex: i,
          icon: block.icon,
          color: block.color,
          taskIds: block.taskIds ?? [],
          isCompleted: false,
          isSkipped: false,
        },
      });
    }

    return this.getSchedule(tenantId, request.learnerId, request.scheduleDate);
  }

  /**
   * Get schedule for a specific date
   */
  async getSchedule(tenantId: string, learnerId: string, date: Date) {
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    return this.prisma.visualSchedule.findFirst({
      where: {
        tenantId,
        learnerId,
        scheduleDate,
      },
      include: {
        blocks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  /**
   * Get today's schedule
   */
  async getTodaySchedule(tenantId: string, learnerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getSchedule(tenantId, learnerId, today);
  }

  /**
   * Mark learner as having reviewed their schedule
   */
  async markScheduleReviewed(scheduleId: string) {
    return this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: {
        isReviewed: true,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Complete a schedule block
   */
  async completeBlock(blockId: string) {
    const block = await this.prisma.scheduleBlock.update({
      where: { id: blockId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Complete linked tasks
    if (block.taskIds.length > 0) {
      await this.prisma.learnerTask.updateMany({
        where: { id: { in: block.taskIds } },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    return block;
  }

  /**
   * Skip a schedule block
   */
  async skipBlock(blockId: string, reason: string) {
    return this.prisma.scheduleBlock.update({
      where: { id: blockId },
      data: {
        isSkipped: true,
        skipReason: reason,
      },
    });
  }

  /**
   * Create schedule from template
   */
  async createScheduleFromTemplate(tenantId: string, learnerId: string, templateId: string, date: Date) {
    const template = await this.prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) throw new Error('Template not found');

    const templateBlocks = template.blocks as TemplateBlockInput[];
    const blocks: ScheduleBlockInput[] = templateBlocks.map(tb => {
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      startTime.setMinutes(tb.startTimeOffset);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + tb.durationMin);

      return {
        blockType: tb.blockType,
        title: tb.title,
        startTime,
        endTime,
        icon: tb.icon,
        color: tb.color,
      };
    });

    return this.createSchedule(tenantId, {
      learnerId,
      scheduleDate: date,
      templateId,
      blocks,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a schedule template
   */
  async createTemplate(tenantId: string, request: CreateTemplateRequest) {
    // If setting as default, unset other defaults for same day type
    if (request.isDefault) {
      await this.prisma.scheduleTemplate.updateMany({
        where: {
          tenantId,
          learnerId: request.learnerId ?? null,
          dayType: request.dayType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.scheduleTemplate.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        name: request.name,
        dayType: request.dayType,
        blocks: request.blocks as any,
        isDefault: request.isDefault ?? false,
      },
    });
  }

  /**
   * Get templates for a learner
   */
  async getTemplates(tenantId: string, learnerId?: string) {
    return this.prisma.scheduleTemplate.findMany({
      where: {
        tenantId,
        OR: [
          { learnerId: null }, // Tenant-wide templates
          { learnerId },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get default template for a day type
   */
  async getDefaultTemplate(tenantId: string, learnerId: string, dayType: string) {
    // First try learner-specific default
    let template = await this.prisma.scheduleTemplate.findFirst({
      where: {
        tenantId,
        learnerId,
        dayType,
        isDefault: true,
      },
    });

    // Fall back to tenant-wide default
    if (!template) {
      template = await this.prisma.scheduleTemplate.findFirst({
        where: {
          tenantId,
          learnerId: null,
          dayType,
          isDefault: true,
        },
      });
    }

    return template;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STRATEGIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get all EF strategies
   */
  async getStrategies(options?: { skill?: EFSkill; minGrade?: number; maxGrade?: number }) {
    return this.prisma.eFStrategy.findMany({
      where: {
        isActive: true,
        ...(options?.skill && { skill: options.skill }),
        ...(options?.minGrade !== undefined && { minGrade: { lte: options.minGrade } }),
        ...(options?.maxGrade !== undefined && { maxGrade: { gte: options.maxGrade } }),
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Get recommended strategies for a learner based on their weak skills
   */
  async getRecommendedStrategies(learnerId: string, focusSkills?: EFSkill[]) {
    const profile = await this.getProfile(learnerId);
    const skillLevels = (profile?.skillLevels as Record<EFSkill, number>) || {};

    // Identify weak skills (below 50) or use provided focus skills
    let targetSkills: EFSkill[];
    if (focusSkills) {
      targetSkills = focusSkills;
    } else {
      targetSkills = (Object.entries(skillLevels) as [EFSkill, number][])
        .filter(([_, level]) => level < 50)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([skill]) => skill);

      // If no weak skills, recommend for common areas
      if (targetSkills.length === 0) {
        targetSkills = ['PLANNING', 'TIME_MANAGEMENT', 'TASK_INITIATION'];
      }
    }

    // Get strategies for target skills, excluding already favorited ones
    const usage = await this.prisma.learnerStrategyUsage.findMany({
      where: { learnerId, isFavorite: true },
      select: { strategyId: true },
    });

    const favoriteIds = usage.map(u => u.strategyId);

    const strategies = await this.prisma.eFStrategy.findMany({
      where: {
        skill: { in: targetSkills },
        isActive: true,
        id: { notIn: favoriteIds },
      },
      take: 5,
    });

    return strategies;
  }

  /**
   * Record strategy usage
   */
  async recordStrategyUsage(tenantId: string, learnerId: string, strategyId: string, rating?: number) {
    const existing = await this.prisma.learnerStrategyUsage.findFirst({
      where: { tenantId, learnerId, strategyId },
    });

    if (existing) {
      const newCount = existing.usageCount + 1;
      const newAvgRating = rating
        ? ((existing.avgRating ?? 0) * existing.usageCount + rating) / newCount
        : existing.avgRating;

      return this.prisma.learnerStrategyUsage.update({
        where: { id: existing.id },
        data: {
          usageCount: newCount,
          avgRating: newAvgRating,
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.learnerStrategyUsage.create({
      data: {
        tenantId,
        learnerId,
        strategyId,
        usageCount: 1,
        avgRating: rating,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Mark strategy as favorite
   */
  async favoriteStrategy(tenantId: string, learnerId: string, strategyId: string, isFavorite: boolean) {
    return this.prisma.learnerStrategyUsage.upsert({
      where: {
        tenantId_learnerId_strategyId: { tenantId, learnerId, strategyId },
      },
      update: { isFavorite },
      create: {
        tenantId,
        learnerId,
        strategyId,
        isFavorite,
        usageCount: 0,
      },
    });
  }

  /**
   * Get learner's favorite strategies
   */
  async getFavoriteStrategies(tenantId: string, learnerId: string) {
    const usage = await this.prisma.learnerStrategyUsage.findMany({
      where: { tenantId, learnerId, isFavorite: true },
    });

    const strategyIds = usage.map(u => u.strategyId);

    return this.prisma.eFStrategy.findMany({
      where: { id: { in: strategyIds } },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get EF performance summary for a learner
   */
  async getPerformanceSummary(tenantId: string, learnerId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tasks = await this.prisma.learnerTask.findMany({
      where: {
        tenantId,
        learnerId,
        createdAt: { gte: startDate },
      },
    });

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const onTimeTasks = completedTasks.filter(t =>
      !t.dueAt || (t.completedAt && t.completedAt <= t.dueAt)
    );

    // Time estimation accuracy
    const tasksWithEstimates = completedTasks.filter(t => t.estimatedMin && t.actualMin);
    const avgEstimationAccuracy = tasksWithEstimates.length > 0
      ? tasksWithEstimates.reduce((sum, t) => {
          const accuracy = 1 - Math.abs((t.estimatedMin! - t.actualMin!) / t.estimatedMin!);
          return sum + Math.max(0, accuracy);
        }, 0) / tasksWithEstimates.length
      : null;

    const profile = await this.getProfile(learnerId);

    return {
      period: { days, startDate, endDate: new Date() },
      tasks: {
        total: tasks.length,
        completed: completedTasks.length,
        completionRate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
        onTime: onTimeTasks.length,
        onTimeRate: completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 0,
      },
      timeManagement: {
        avgEstimationAccuracy,
        tasksWithEstimates: tasksWithEstimates.length,
      },
      skillLevels: profile?.skillLevels || {},
      recommendations: this.generatePerformanceRecommendations(tasks, completedTasks, avgEstimationAccuracy),
    };
  }

  private generatePerformanceRecommendations(
    allTasks: any[],
    completedTasks: any[],
    estimationAccuracy: number | null
  ): string[] {
    const recommendations: string[] = [];

    const completionRate = allTasks.length > 0 ? completedTasks.length / allTasks.length : 0;

    if (completionRate < 0.5) {
      recommendations.push('Consider breaking tasks into smaller, more manageable pieces');
    }

    if (estimationAccuracy !== null && estimationAccuracy < 0.6) {
      recommendations.push('Practice time estimation by tracking actual time spent on tasks');
    }

    const blockedTasks = allTasks.filter(t => t.status === 'BLOCKED');
    if (blockedTasks.length > 2) {
      recommendations.push('Review blocked tasks and identify common obstacles');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great progress! Keep using visual schedules and task breakdown');
    }

    return recommendations;
  }
}
