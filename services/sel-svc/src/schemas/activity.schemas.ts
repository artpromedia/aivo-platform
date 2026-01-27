/**
 * AIVO SEL Service - Activity Validation Schemas
 */

import { z } from 'zod';

// Enums (matching Prisma schema)
export const ActivityType = z.enum([
  'LESSON',
  'GAME',
  'DISCUSSION',
  'JOURNALING',
  'MINDFULNESS',
  'ROLE_PLAY',
  'VIDEO',
  'READING',
  'GROUP_ACTIVITY',
  'SELF_REFLECTION',
  'SOCIAL_SCENARIO',
  'REGULATION_STRATEGY',
  'BREATHING_EXERCISE',
]);

export const DifficultyLevel = z.enum(['EASY', 'MEDIUM', 'CHALLENGING']);

export const HelpfulnessRating = z.enum([
  'NOT_HELPFUL',
  'SOMEWHAT_HELPFUL',
  'HELPFUL',
  'VERY_HELPFUL',
]);

// Query schemas
export const listActivitiesQuerySchema = z.object({
  competencyId: z.string().uuid().optional(),
  activityType: ActivityType.optional(),
  type: z.string().optional(), // Mobile compatibility: maps to activityType
  gradeLevel: z.coerce.number().int().min(0).max(12).optional(),
  category: z.string().optional(), // Filter by category
  difficulty: DifficultyLevel.optional(), // Filter by difficulty
  subtype: z.string().optional(), // Mobile: filter by subtype (e.g., breathing, guided)
  maxDuration: z.coerce.number().int().min(1).optional(), // Max duration in minutes
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Body schemas
export const recordCompletionSchema = z.object({
  activityId: z.string().uuid('Invalid activity ID format'),
  duration: z.number().int().min(1).max(480).optional(), // minutes, max 8 hours
  rating: z.number().int().min(1).max(5).optional(),
  reflection: z.string().max(2000).optional(),
  helpfulness: HelpfulnessRating.optional(),
  assignedBy: z.string().uuid('Invalid assignee ID format').optional(),
  context: z.string().max(500).optional(),
});

// Type exports
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
export type RecordCompletionInput = z.infer<typeof recordCompletionSchema>;
