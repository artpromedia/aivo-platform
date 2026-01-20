/**
 * AIVO SEL Service - Intervention Validation Schemas
 */

import { z } from 'zod';

// Enums
export const InterventionType = z.enum([
  'TIER1_UNIVERSAL',
  'TIER2_TARGETED',
  'TIER3_INTENSIVE',
  'BEHAVIORAL',
  'COUNSELING',
  'MENTORING',
  'SKILL_BUILDING',
  'CRISIS',
]);

export const InterventionFrequency = z.enum([
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'AS_NEEDED',
]);

// Params
export const interventionIdParamsSchema = z.object({
  interventionId: z.string().uuid('Invalid intervention ID format'),
});

// Body schemas
export const createInterventionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  interventionType: InterventionType,
  targetCompetencies: z.array(z.string().uuid()).max(20).optional().default([]),
  strategies: z.array(z.string().max(500)).max(20).optional().default([]),
  frequency: InterventionFrequency.optional(),
  duration: z.number().int().min(1).max(480).optional(), // minutes per session, max 8 hours
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  interventionist: z.string().uuid('Invalid interventionist ID format'),
  supportTeam: z.array(z.string().uuid()).max(20).optional().default([]),
  baselineData: z.record(z.string(), z.unknown()).optional(),
  goalData: z.record(z.string(), z.unknown()).optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'startDate must be before or equal to endDate',
  path: ['startDate'],
});

export const logSessionSchema = z.object({
  duration: z.number().int().min(1).max(480).optional(), // minutes
  activitiesCompleted: z.array(z.string().max(200)).max(20).optional().default([]),
  studentResponse: z.string().max(2000).optional(),
  progressNotes: z.string().max(5000).optional(),
  dataPoints: z.record(z.string(), z.unknown()).optional(),
  loggedBy: z.string().uuid('Invalid logger ID format'),
});

// Type exports
export type InterventionIdParams = z.infer<typeof interventionIdParamsSchema>;
export type CreateInterventionInput = z.infer<typeof createInterventionSchema>;
export type LogSessionInput = z.infer<typeof logSessionSchema>;
