/**
 * AIVO SEL Service - Alert Validation Schemas
 */

import { z } from 'zod';

// Enums
export const AlertStatus = z.enum(['NEW', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']);
export const AlertSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Params
export const alertIdParamsSchema = z.object({
  alertId: z.string().uuid('Invalid alert ID format'),
});

// Query schemas
export const getAlertsQuerySchema = z.object({
  status: AlertStatus.optional(),
  severity: AlertSeverity.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Body schemas
export const resolveAlertSchema = z.object({
  resolution: z.string().min(1).max(2000),
});

// Type exports
export type AlertIdParams = z.infer<typeof alertIdParamsSchema>;
export type GetAlertsQuery = z.infer<typeof getAlertsQuerySchema>;
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;
