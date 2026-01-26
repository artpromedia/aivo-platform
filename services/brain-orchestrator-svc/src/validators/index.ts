import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const UuidSchema = z.string().uuid();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================
// Orchestration Schemas
// ============================================

export const LearningGoalSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['skill_mastery', 'lesson_completion', 'assessment_score', 'project_completion', 'custom']),
  targetId: z.string(),
  targetValue: z.number().min(0).max(100).optional(),
  deadline: z.coerce.date().optional(),
  priority: z.number().min(1).max(100).default(50),
  description: z.string().min(1).max(500),
});

export const ConstraintsSchema = z.object({
  availableTimeMinutes: z.number().min(5).max(480).optional(),
  maxCognitiveLoad: z.enum(['low', 'medium', 'high']).optional(),
  requiredBreaks: z.boolean().optional(),
  excludedTimeSlots: z.array(z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })).optional(),
});

export const CreateOrchestrationPlanSchema = z.object({
  learnerId: z.string().uuid(),
  goal: LearningGoalSchema,
  constraints: ConstraintsSchema.optional(),
});

export const AdjustPlanSchema = z.object({
  reason: z.string().min(1).max(500),
  adjustments: z.array(z.object({
    type: z.enum(['skip_task', 'add_task', 'change_priority', 'change_difficulty']),
    taskId: z.string().uuid().optional(),
    data: z.record(z.unknown()).optional(),
  })),
});

export const AdjustmentReasonSchema = z.object({
  type: z.enum(['performance', 'cognitive_load', 'time_constraint', 'user_request', 'system']),
  description: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

// ============================================
// Cognitive Schemas
// ============================================

export const LearnerInteractionSchema = z.object({
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  type: z.enum([
    'page_view',
    'click',
    'answer_submit',
    'content_interaction',
    'help_request',
    'pause',
    'resume',
    'idle',
    'focus_change',
  ]),
  activityId: z.string().uuid().optional(),
  timestamp: z.coerce.date().optional(),
  duration: z.number().min(0).optional(),
  data: z.object({
    responseTime: z.number().min(0).optional(),
    isCorrect: z.boolean().optional(),
    attemptNumber: z.number().int().min(1).optional(),
    errorType: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional().default({}),
});

export const TrackInteractionSchema = LearnerInteractionSchema;

export const SessionDataSchema = z.object({
  sessionId: z.string().uuid(),
  startedAt: z.coerce.date(),
});

// ============================================
// Learning Schemas
// ============================================

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'lesson-completion',
    'assessment',
    'practice-exercise',
    'review-session',
    'homework-help',
    'skill-building',
    'project-work',
    'collaboration',
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  estimatedDuration: z.number().min(1).max(180),
  cognitiveLoad: z.enum(['low', 'medium', 'high', 'overload']),
  difficulty: z.number().min(1).max(10),
  skillIds: z.array(z.string()),
  prerequisites: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const CompleteActivitySchema = z.object({
  activityId: z.string().uuid(),
  result: z.object({
    success: z.boolean(),
    score: z.number().min(0).max(100).optional(),
    timeSpent: z.number().min(0),
    errorCount: z.number().int().min(0).optional().default(0),
    data: z.record(z.unknown()).optional().default({}),
  }),
});

export const MasteryEvidenceSchema = z.object({
  activityId: z.string().uuid(),
  skillId: z.string(),
  outcome: z.enum(['success', 'partial', 'failure']),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0),
  attemptCount: z.number().int().min(1).default(1),
  errorTypes: z.array(z.string()).optional().default([]),
});

export const SequencingConstraintsSchema = z.object({
  mustComplete: z.array(z.string()).optional().default([]),
  preferredOrder: z.array(z.string()).optional().default([]),
  interleaveTopics: z.boolean().optional().default(true),
  spacedRepetitionEnabled: z.boolean().optional().default(true),
  maxConsecutiveSameType: z.number().int().min(1).max(10).optional().default(3),
  difficultyProgression: z.enum(['ascending', 'descending', 'mixed', 'adaptive']).optional().default('adaptive'),
});

export const OptimizePathSchema = z.object({
  goals: z.array(LearningGoalSchema).optional(),
});

// ============================================
// Type exports
// ============================================

export type CreateOrchestrationPlanInput = z.infer<typeof CreateOrchestrationPlanSchema>;
export type AdjustPlanInput = z.infer<typeof AdjustPlanSchema>;
export type LearnerInteractionInput = z.infer<typeof LearnerInteractionSchema>;
export type CompleteActivityInput = z.infer<typeof CompleteActivitySchema>;
export type MasteryEvidenceInput = z.infer<typeof MasteryEvidenceSchema>;
export type SequencingConstraintsInput = z.infer<typeof SequencingConstraintsSchema>;
