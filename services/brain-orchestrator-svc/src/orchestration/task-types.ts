// Re-export core task types from types module
export type {
  LearningTask,
  Task,
  TaskStatus,
  TaskContext,
  TaskResult,
  LearningGoal,
  OrchestrationPlan,
  PlanStatus,
  CognitiveLoadProfile,
  PrioritizedTaskQueue,
  PrioritizationFactor,
  AdjustmentReason,
} from '../types/index.js';

import type {
  Task,
  TaskStatus,
  TaskContext,
  LearningTask,
  CognitiveLoadLevel,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// Task creation utilities
export interface CreateTaskInput {
  type: LearningTask;
  learnerId: string;
  tenantId: string;
  priority?: number;
  estimatedDuration: number;
  cognitiveLoad: CognitiveLoadLevel;
  prerequisites?: string[];
  dependencies?: string[];
  deadline?: Date;
  context: Partial<TaskContext>;
}

export function createTask(input: CreateTaskInput): Task {
  const now = new Date();
  return {
    id: uuidv4(),
    type: input.type,
    learnerId: input.learnerId,
    tenantId: input.tenantId,
    priority: input.priority ?? 50,
    estimatedDuration: input.estimatedDuration,
    cognitiveLoad: input.cognitiveLoad,
    prerequisites: input.prerequisites ?? [],
    dependencies: input.dependencies ?? [],
    deadline: input.deadline,
    context: {
      skillIds: input.context.skillIds ?? [],
      metadata: input.context.metadata ?? {},
      ...input.context,
    },
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

// Task status transition rules
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'failed', 'paused', 'cancelled'],
  completed: [],
  failed: ['pending'], // Allow retry
  paused: ['in_progress', 'cancelled'],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export function transitionTask(task: Task, newStatus: TaskStatus): Task {
  if (!canTransition(task.status, newStatus)) {
    throw new Error(`Invalid task status transition from ${task.status} to ${newStatus}`);
  }

  const now = new Date();
  const updates: Partial<Task> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'in_progress' && !task.startedAt) {
    updates.startedAt = now;
  }

  if (newStatus === 'completed' || newStatus === 'failed') {
    updates.completedAt = now;
  }

  return { ...task, ...updates };
}

// Task type configurations
export interface TaskTypeConfig {
  type: LearningTask;
  defaultCognitiveLoad: CognitiveLoadLevel;
  typicalDuration: { min: number; max: number }; // minutes
  requiresAssessment: boolean;
  canBeInterrupted: boolean;
  recommendedBreakAfter: boolean;
}

export const TASK_TYPE_CONFIGS: Record<LearningTask, TaskTypeConfig> = {
  'lesson-completion': {
    type: 'lesson-completion',
    defaultCognitiveLoad: 'medium',
    typicalDuration: { min: 15, max: 45 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: false,
  },
  assessment: {
    type: 'assessment',
    defaultCognitiveLoad: 'high',
    typicalDuration: { min: 20, max: 60 },
    requiresAssessment: true,
    canBeInterrupted: false,
    recommendedBreakAfter: true,
  },
  'practice-exercise': {
    type: 'practice-exercise',
    defaultCognitiveLoad: 'medium',
    typicalDuration: { min: 10, max: 30 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: false,
  },
  'review-session': {
    type: 'review-session',
    defaultCognitiveLoad: 'low',
    typicalDuration: { min: 10, max: 20 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: false,
  },
  'homework-help': {
    type: 'homework-help',
    defaultCognitiveLoad: 'medium',
    typicalDuration: { min: 15, max: 45 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: false,
  },
  'skill-building': {
    type: 'skill-building',
    defaultCognitiveLoad: 'high',
    typicalDuration: { min: 20, max: 40 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: true,
  },
  'project-work': {
    type: 'project-work',
    defaultCognitiveLoad: 'high',
    typicalDuration: { min: 30, max: 90 },
    requiresAssessment: false,
    canBeInterrupted: true,
    recommendedBreakAfter: true,
  },
  collaboration: {
    type: 'collaboration',
    defaultCognitiveLoad: 'medium',
    typicalDuration: { min: 20, max: 60 },
    requiresAssessment: false,
    canBeInterrupted: false,
    recommendedBreakAfter: false,
  },
};

// Cognitive load utilities
export const COGNITIVE_LOAD_SCORES: Record<CognitiveLoadLevel, number> = {
  low: 25,
  medium: 50,
  high: 75,
  overload: 100,
};

export function getCognitiveLoadScore(level: CognitiveLoadLevel): number {
  return COGNITIVE_LOAD_SCORES[level];
}

export function getCognitiveLoadLevel(score: number): CognitiveLoadLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'overload';
}
