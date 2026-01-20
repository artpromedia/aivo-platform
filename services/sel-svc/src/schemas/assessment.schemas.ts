/**
 * AIVO SEL Service - Assessment Validation Schemas
 */

import { z } from 'zod';

// Enums
export const AdministrationContext = z.enum(['CLASSROOM', 'INDIVIDUAL', 'GROUP', 'HOME', 'OTHER']);

// Params
export const assessmentIdParamsSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID format'),
});

// Body schemas
export const createAssessmentSchema = z.object({
  templateId: z.string().uuid('Invalid template ID format'),
  administeredBy: z.string().uuid('Invalid administrator ID format').optional(),
  administrationContext: AdministrationContext.optional(),
});

export const submitResponseSchema = z.object({
  itemNumber: z.number().int().min(1).max(500),
  response: z.string().max(5000),
  responseTime: z.number().int().min(0).max(3600000).optional(), // max 1 hour in ms
});

// Type exports
export type AssessmentIdParams = z.infer<typeof assessmentIdParamsSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
