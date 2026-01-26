import type {
  Task,
  LearnerContext,
  SchedulingConstraints,
  PrioritizedTaskQueue,
  PrioritizationFactor,
  CognitiveState,
  CognitiveLoadLevel,
} from '../types/index.js';
import { COGNITIVE_LOAD_SCORES } from './task-types.js';

interface TaskScore {
  task: Task;
  totalScore: number;
  factorScores: Map<string, number>;
}

const PRIORITIZATION_WEIGHTS: Record<string, number> = {
  deadline_urgency: 0.25,
  prerequisite_completion: 0.20,
  cognitive_load_balance: 0.15,
  learner_preference: 0.10,
  time_of_day: 0.10,
  spaced_repetition: 0.10,
  dependency_satisfaction: 0.10,
};

export class TaskPrioritizer {
  /**
   * Prioritize tasks based on multiple factors
   */
  async prioritize(
    tasks: Task[],
    learnerContext: LearnerContext,
    constraints: SchedulingConstraints
  ): Promise<PrioritizedTaskQueue> {
    if (tasks.length === 0) {
      return {
        tasks: [],
        prioritizationFactors: this.getPrioritizationFactors(),
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 60 * 1000), // Valid for 30 minutes
      };
    }

    // Filter out tasks that violate hard constraints
    const eligibleTasks = this.filterByConstraints(tasks, constraints);

    // Score each task
    const scoredTasks = await Promise.all(
      eligibleTasks.map((task) => this.scoreTask(task, learnerContext, constraints, tasks))
    );

    // Sort by total score descending
    scoredTasks.sort((a, b) => b.totalScore - a.totalScore);

    // Apply topological sort for dependency ordering
    const orderedTasks = this.topologicalSort(scoredTasks);

    return {
      tasks: orderedTasks.map((st) => st.task),
      prioritizationFactors: this.getPrioritizationFactors(),
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  /**
   * Score a single task based on all factors
   */
  private async scoreTask(
    task: Task,
    context: LearnerContext,
    constraints: SchedulingConstraints,
    allTasks: Task[]
  ): Promise<TaskScore> {
    const factorScores = new Map<string, number>();

    // Deadline urgency score
    factorScores.set('deadline_urgency', this.calculateDeadlineScore(task, constraints));

    // Prerequisite completion score
    factorScores.set('prerequisite_completion', this.calculatePrerequisiteScore(task, allTasks));

    // Cognitive load balance score
    factorScores.set(
      'cognitive_load_balance',
      this.calculateCognitiveLoadScore(task, context.cognitiveState, constraints)
    );

    // Learner preference score
    factorScores.set(
      'learner_preference',
      this.calculatePreferenceScore(task, context.preferences)
    );

    // Time of day score
    factorScores.set('time_of_day', this.calculateTimeOfDayScore(task, context.preferences));

    // Spaced repetition score
    factorScores.set('spaced_repetition', this.calculateSpacedRepetitionScore(task));

    // Dependency satisfaction score
    factorScores.set('dependency_satisfaction', this.calculateDependencyScore(task, allTasks));

    // Calculate weighted total
    let totalScore = 0;
    for (const [factor, score] of factorScores) {
      totalScore += score * (PRIORITIZATION_WEIGHTS[factor] ?? 0);
    }

    // Add base priority from task
    totalScore += task.priority * 0.5; // Base priority contributes 50%

    return { task, totalScore, factorScores };
  }

  /**
   * Calculate deadline urgency score (0-100)
   */
  private calculateDeadlineScore(task: Task, constraints: SchedulingConstraints): number {
    if (!task.deadline) {
      // Check if there's a hard deadline for this task
      const hardDeadline = constraints.hardDeadlines.find((d) => d.taskId === task.id);
      if (!hardDeadline) return 50; // Neutral score for tasks without deadlines

      const hoursUntilDeadline =
        (hardDeadline.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      return this.urgencyScore(hoursUntilDeadline, task.estimatedDuration);
    }

    const hoursUntilDeadline = (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    return this.urgencyScore(hoursUntilDeadline, task.estimatedDuration);
  }

  private urgencyScore(hoursUntilDeadline: number, estimatedDurationMinutes: number): number {
    const estimatedDurationHours = estimatedDurationMinutes / 60;

    if (hoursUntilDeadline < 0) return 100; // Overdue
    if (hoursUntilDeadline < estimatedDurationHours) return 95; // Barely enough time
    if (hoursUntilDeadline < estimatedDurationHours * 2) return 85; // Tight deadline
    if (hoursUntilDeadline < 24) return 70; // Due within a day
    if (hoursUntilDeadline < 72) return 50; // Due within 3 days
    if (hoursUntilDeadline < 168) return 30; // Due within a week
    return 10; // Far deadline
  }

  /**
   * Calculate prerequisite completion score (0-100)
   */
  private calculatePrerequisiteScore(task: Task, allTasks: Task[]): number {
    if (task.prerequisites.length === 0) return 100; // No prerequisites = ready to go

    const completedPrereqs = task.prerequisites.filter((prereqId) => {
      const prereqTask = allTasks.find((t) => t.id === prereqId);
      return prereqTask?.status === 'completed';
    });

    const completionRatio = completedPrereqs.length / task.prerequisites.length;
    return completionRatio * 100;
  }

  /**
   * Calculate cognitive load balance score (0-100)
   */
  private calculateCognitiveLoadScore(
    task: Task,
    cognitiveState: CognitiveState,
    constraints: SchedulingConstraints
  ): number {
    const taskLoadScore = COGNITIVE_LOAD_SCORES[task.cognitiveLoad];
    const currentLoadScore = cognitiveState.loadScore;
    const maxAllowedLoad = COGNITIVE_LOAD_SCORES[constraints.maxCognitiveLoad];

    // If learner is already overloaded, prefer low-load tasks
    if (currentLoadScore >= 75) {
      if (task.cognitiveLoad === 'low') return 100;
      if (task.cognitiveLoad === 'medium') return 50;
      return 10; // Discourage high-load tasks when fatigued
    }

    // If learner is fresh, match load to appropriate level
    if (currentLoadScore < 30) {
      // Fresh learner can handle more challenging tasks
      if (taskLoadScore <= maxAllowedLoad) {
        return 80 + (taskLoadScore / maxAllowedLoad) * 20;
      }
    }

    // Normal state: balance load
    const projectedLoad = currentLoadScore + taskLoadScore * 0.5;
    if (projectedLoad > 100) return 20;
    if (projectedLoad > 80) return 50;
    if (projectedLoad > 60) return 70;
    return 90;
  }

  /**
   * Calculate learner preference score (0-100)
   */
  private calculatePreferenceScore(
    task: Task,
    preferences: LearnerContext['preferences']
  ): number {
    // Check if this activity type is avoided
    if (preferences.avoidedActivityTypes.includes(task.type)) {
      return 20; // Low score but not zero
    }

    // Difficulty preference matching
    const taskDifficulty = this.taskTypeToDifficulty(task.type);
    if (preferences.preferredDifficulty === 'adaptive') {
      return 80; // Neutral for adaptive
    }

    const difficultyMatch =
      preferences.preferredDifficulty === taskDifficulty
        ? 100
        : Math.abs(
            this.difficultyToNumber(preferences.preferredDifficulty) -
              this.difficultyToNumber(taskDifficulty)
          ) <= 1
        ? 70
        : 40;

    return difficultyMatch;
  }

  private taskTypeToDifficulty(type: Task['type']): 'easy' | 'medium' | 'hard' {
    switch (type) {
      case 'review-session':
        return 'easy';
      case 'lesson-completion':
      case 'practice-exercise':
      case 'homework-help':
        return 'medium';
      case 'assessment':
      case 'skill-building':
      case 'project-work':
      case 'collaboration':
        return 'hard';
      default:
        return 'medium';
    }
  }

  private difficultyToNumber(difficulty: string): number {
    switch (difficulty) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Calculate time of day optimization score (0-100)
   */
  private calculateTimeOfDayScore(task: Task, preferences: LearnerContext['preferences']): number {
    const currentHour = new Date().getHours();
    const isPeakHour = preferences.peakHours.includes(currentHour);

    // High cognitive load tasks should be done during peak hours
    if (task.cognitiveLoad === 'high' || task.cognitiveLoad === 'overload') {
      return isPeakHour ? 100 : 40;
    }

    // Low cognitive load tasks are fine anytime
    if (task.cognitiveLoad === 'low') {
      return 80;
    }

    // Medium tasks slightly prefer peak hours
    return isPeakHour ? 90 : 70;
  }

  /**
   * Calculate spaced repetition score (0-100)
   */
  private calculateSpacedRepetitionScore(task: Task): number {
    // For review sessions, check if enough time has passed
    if (task.type === 'review-session') {
      const metadata = task.context.metadata;
      const lastReviewedAt = metadata.lastReviewedAt as Date | undefined;

      if (!lastReviewedAt) return 80; // No previous review = good time to review

      const hoursSinceReview = (Date.now() - lastReviewedAt.getTime()) / (1000 * 60 * 60);

      // Optimal review times based on spaced repetition research
      if (hoursSinceReview < 1) return 10; // Too soon
      if (hoursSinceReview < 24) return 40; // Same day
      if (hoursSinceReview < 72) return 90; // 1-3 days: optimal
      if (hoursSinceReview < 168) return 80; // 3-7 days: good
      return 60; // More than a week: should review soon
    }

    return 50; // Neutral for non-review tasks
  }

  /**
   * Calculate dependency satisfaction score (0-100)
   */
  private calculateDependencyScore(task: Task, allTasks: Task[]): number {
    if (task.dependencies.length === 0) return 100;

    const satisfiedDeps = task.dependencies.filter((depId) => {
      const depTask = allTasks.find((t) => t.id === depId);
      return depTask?.status === 'completed';
    });

    // All dependencies must be satisfied
    return satisfiedDeps.length === task.dependencies.length ? 100 : 0;
  }

  /**
   * Filter tasks by hard constraints
   */
  private filterByConstraints(tasks: Task[], constraints: SchedulingConstraints): Task[] {
    return tasks.filter((task) => {
      // Check time constraint
      if (task.estimatedDuration > constraints.availableTimeMinutes) {
        return false;
      }

      // Check cognitive load constraint
      const maxLoad = COGNITIVE_LOAD_SCORES[constraints.maxCognitiveLoad];
      const taskLoad = COGNITIVE_LOAD_SCORES[task.cognitiveLoad];
      if (taskLoad > maxLoad) {
        return false;
      }

      // Check excluded time slots
      if (constraints.excludedTimeSlots) {
        const now = new Date();
        for (const slot of constraints.excludedTimeSlots) {
          if (now >= slot.start && now <= slot.end) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Topological sort to respect dependencies
   */
  private topologicalSort(scoredTasks: TaskScore[]): TaskScore[] {
    const taskMap = new Map(scoredTasks.map((st) => [st.task.id, st]));
    const visited = new Set<string>();
    const result: TaskScore[] = [];

    const visit = (taskScore: TaskScore) => {
      if (visited.has(taskScore.task.id)) return;
      visited.add(taskScore.task.id);

      // Visit dependencies first
      for (const depId of taskScore.task.dependencies) {
        const depTask = taskMap.get(depId);
        if (depTask && !visited.has(depId)) {
          visit(depTask);
        }
      }

      // Visit prerequisites first
      for (const prereqId of taskScore.task.prerequisites) {
        const prereqTask = taskMap.get(prereqId);
        if (prereqTask && !visited.has(prereqId)) {
          visit(prereqTask);
        }
      }

      result.push(taskScore);
    };

    // Start with highest scored tasks
    for (const taskScore of scoredTasks) {
      visit(taskScore);
    }

    return result;
  }

  /**
   * Get the list of prioritization factors
   */
  private getPrioritizationFactors(): PrioritizationFactor[] {
    return [
      {
        name: 'deadline_urgency',
        weight: PRIORITIZATION_WEIGHTS.deadline_urgency,
        description: 'Urgency based on task deadline',
      },
      {
        name: 'prerequisite_completion',
        weight: PRIORITIZATION_WEIGHTS.prerequisite_completion,
        description: 'Whether prerequisites are completed',
      },
      {
        name: 'cognitive_load_balance',
        weight: PRIORITIZATION_WEIGHTS.cognitive_load_balance,
        description: "Balance with learner's current cognitive state",
      },
      {
        name: 'learner_preference',
        weight: PRIORITIZATION_WEIGHTS.learner_preference,
        description: "Match with learner's preferences",
      },
      {
        name: 'time_of_day',
        weight: PRIORITIZATION_WEIGHTS.time_of_day,
        description: 'Optimization for time of day',
      },
      {
        name: 'spaced_repetition',
        weight: PRIORITIZATION_WEIGHTS.spaced_repetition,
        description: 'Spaced repetition schedule adherence',
      },
      {
        name: 'dependency_satisfaction',
        weight: PRIORITIZATION_WEIGHTS.dependency_satisfaction,
        description: 'Task dependencies are satisfied',
      },
    ];
  }

  /**
   * Re-prioritize when cognitive state changes
   */
  async reprioritizeForCognitiveChange(
    currentQueue: PrioritizedTaskQueue,
    newCognitiveState: CognitiveState,
    context: LearnerContext,
    constraints: SchedulingConstraints
  ): Promise<PrioritizedTaskQueue> {
    // Update context with new cognitive state
    const updatedContext = {
      ...context,
      cognitiveState: newCognitiveState,
    };

    // Re-prioritize remaining tasks
    const remainingTasks = currentQueue.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'paused'
    );

    return this.prioritize(remainingTasks, updatedContext, constraints);
  }

  /**
   * Suggest next task based on current state
   */
  async suggestNextTask(
    queue: PrioritizedTaskQueue,
    cognitiveState: CognitiveState
  ): Promise<Task | null> {
    const eligibleTasks = queue.tasks.filter((task) => {
      // Must be pending
      if (task.status !== 'pending') return false;

      // All dependencies satisfied
      const depsCompleted = task.dependencies.every((depId) =>
        queue.tasks.find((t) => t.id === depId)?.status === 'completed'
      );
      if (!depsCompleted) return false;

      // All prerequisites completed
      const prereqsCompleted = task.prerequisites.every((prereqId) =>
        queue.tasks.find((t) => t.id === prereqId)?.status === 'completed'
      );
      if (!prereqsCompleted) return false;

      // Cognitive load check
      if (cognitiveState.loadScore > 80 && task.cognitiveLoad === 'high') {
        return false; // Skip high-load tasks when fatigued
      }

      return true;
    });

    return eligibleTasks[0] ?? null;
  }
}
