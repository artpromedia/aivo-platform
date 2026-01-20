/**
 * AIVO SEL Service - Activity Validation Schemas
 */

import { z } from 'zod';

// Enums
export const ActivityType = z.enum([
  'BREATHING',
  'MEDITATION',
  'JOURNALING',
  'MOVEMENT',
  'SOCIAL',
  'CREATIVE',
  'REFLECTION',
  'GAME',
  'VIDEO',
  'READING',
]);

export const HelpfulnessRating = z.enum(['NOT_HELPFUL', 'SOMEWHAT_HELPFUL', 'HELPFUL', 'VERY_HELPFUL']);

// Params
export const profileIdParamsSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format'),
});

// Query schemas
export const listActivitiesQuerySchema = z.object({
  competencyId: z.string().uuid().optional(),
  activityType: ActivityType.optional(),
  gradeLevel: z.coerce.number().int().min(0).max(12).optional(),
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
