/**
 * AIVO SEL Service - Check-in Validation Schemas
 */

import { z } from 'zod';

// Enums
export const CheckInType = z.enum(['MOOD', 'MORNING', 'AFTERNOON', 'EXIT', 'TRIGGERED']);

// Query schemas
export const getCheckInsQuerySchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine(data => {
  if (data.fromDate && data.toDate) {
    return new Date(data.fromDate) <= new Date(data.toDate);
  }
  return true;
}, {
  message: 'fromDate must be before or equal to toDate',
  path: ['fromDate'],
});

export const moodTrendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// Body schemas
export const createCheckInSchema = z.object({
  checkInType: CheckInType.optional().default('MOOD'),
  moodRating: z.number().int().min(1).max(5).optional(),
  moodEmoji: z.string().max(10).optional(),
  emotions: z.array(z.string().max(50)).max(10).optional().default([]),
  energyLevel: z.number().int().min(1).max(5).optional(),
  context: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  trigger: z.string().max(500).optional(),
  reflection: z.string().max(2000).optional(),
  gratitude: z.string().max(1000).optional(),
  goal: z.string().max(500).optional(),
  needsSupport: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
});

// Type exports
export type GetCheckInsQuery = z.infer<typeof getCheckInsQuerySchema>;
export type MoodTrendsQuery = z.infer<typeof moodTrendsQuerySchema>;
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
