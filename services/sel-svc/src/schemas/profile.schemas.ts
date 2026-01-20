/**
 * AIVO SEL Service - Profile Validation Schemas
 */

import { z } from 'zod';

// Enums
export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Params
export const profileIdParamsSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format'),
});

// Query schemas
export const listProfilesQuerySchema = z.object({
  riskLevel: RiskLevel.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Body schemas
export const createProfileSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  riskLevel: RiskLevel.optional().default('LOW'),
  riskFactors: z.array(z.string().max(200)).optional().default([]),
  protectiveFactors: z.array(z.string().max(200)).optional().default([]),
  preferredCheckInTime: z.string().max(50).optional(),
  preferredActivities: z.array(z.string().uuid()).optional().default([]),
  strengths: z.string().max(2000).optional(),
  growthAreas: z.string().max(2000).optional(),
  supportStrategies: z.string().max(2000).optional(),
});

export const updateProfileSchema = z.object({
  riskLevel: RiskLevel.optional(),
  riskFactors: z.array(z.string().max(200)).optional(),
  protectiveFactors: z.array(z.string().max(200)).optional(),
  preferredCheckInTime: z.string().max(50).optional(),
  preferredActivities: z.array(z.string().uuid()).optional(),
  strengths: z.string().max(2000).optional(),
  growthAreas: z.string().max(2000).optional(),
  supportStrategies: z.string().max(2000).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Type exports
export type ProfileIdParams = z.infer<typeof profileIdParamsSchema>;
export type ListProfilesQuery = z.infer<typeof listProfilesQuerySchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
