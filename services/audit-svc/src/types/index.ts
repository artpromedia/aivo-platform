/**
 * AIVO Audit Service - Type Definitions
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export const AuditCategorySchema = z.enum([
  'AUTHENTICATION',
  'AUTHORIZATION',
  'DATA_ACCESS',
  'DATA_MODIFICATION',
  'CONFIGURATION',
  'SECURITY',
  'COMPLIANCE',
  'SYSTEM',
  'USER_ACTION',
  'API_ACCESS',
]);

export const AuditSeveritySchema = z.enum([
  'DEBUG',
  'INFO',
  'NOTICE',
  'WARNING',
  'ERROR',
  'CRITICAL',
  'ALERT',
  'EMERGENCY',
]);

export const AuditOutcomeSchema = z.enum([
  'SUCCESS',
  'FAILURE',
  'PARTIAL',
  'DENIED',
  'ERROR',
]);

export const ExportFormatSchema = z.enum(['JSON', 'CSV', 'PARQUET']);

export type AuditCategory = z.infer<typeof AuditCategorySchema>;
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating an audit log entry
 */
export const CreateAuditLogSchema = z.object({
  // Event identification
  eventId: z.string().uuid().optional(), // Auto-generated if not provided
  eventType: z.string().min(1).max(100),
  eventVersion: z.string().default('1.0'),

  // Classification
  category: AuditCategorySchema,
  severity: AuditSeveritySchema.default('INFO'),
  outcome: AuditOutcomeSchema,

  // Actor information
  actorId: z.string().uuid().optional(),
  actorType: z.string().min(1).max(50),
  actorEmail: z.string().email().optional(),
  actorRoles: z.array(z.string()).default([]),
  actorIpAddress: z.string().optional(),
  actorUserAgent: z.string().optional(),
  actorSessionId: z.string().uuid().optional(),

  // Target information
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  targetName: z.string().optional(),

  // Action details
  action: z.string().min(1).max(50),
  description: z.string().min(1).max(2000),

  // Request context
  requestId: z.string().optional(),
  requestMethod: z.string().optional(),
  requestPath: z.string().optional(),

  // Source service
  sourceService: z.string().min(1).max(100),
  sourceVersion: z.string().optional(),

  // Payload
  metadata: z.record(z.unknown()).default({}),
  previousState: z.record(z.unknown()).optional(),
  newState: z.record(z.unknown()).optional(),

  // Compliance fields
  dataClassification: z.string().optional(),
  complianceFlags: z.array(z.string()).default([]),
  retentionPolicy: z.string().optional(),

  // When the event occurred
  occurredAt: z.string().datetime().optional(), // Auto-generated if not provided
});

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;

/**
 * Schema for querying audit logs
 */
export const QueryAuditLogsSchema = z.object({
  // Filters
  eventType: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  category: AuditCategorySchema.optional(),
  categories: z.array(AuditCategorySchema).optional(),
  severity: AuditSeveritySchema.optional(),
  minSeverity: AuditSeveritySchema.optional(),
  outcome: AuditOutcomeSchema.optional(),
  actorId: z.string().uuid().optional(),
  actorType: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  sourceService: z.string().optional(),

  // Date range
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),

  // Search
  search: z.string().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(50),

  // Sorting
  sortBy: z.enum(['occurredAt', 'severity', 'category']).default('occurredAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryAuditLogs = z.infer<typeof QueryAuditLogsSchema>;

/**
 * Schema for creating an export request
 */
export const CreateExportSchema = z.object({
  filters: QueryAuditLogsSchema.omit({ page: true, pageSize: true }).optional(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  format: ExportFormatSchema.default('JSON'),
});

export type CreateExport = z.infer<typeof CreateExportSchema>;

/**
 * Schema for creating an audit policy
 */
export const CreatePolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  eventTypes: z.array(z.string()).default([]),
  categories: z.array(AuditCategorySchema).default([]),
  minSeverity: AuditSeveritySchema.default('INFO'),
  retentionDays: z.number().int().min(1).max(10000).default(2555),
  alertOnSeverity: AuditSeveritySchema.optional(),
  alertWebhookUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export type CreatePolicy = z.infer<typeof CreatePolicySchema>;

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AuditLogResponse {
  id: string;
  eventId: string;
  eventType: string;
  category: AuditCategory;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  actorId: string | null;
  actorType: string;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  action: string;
  description: string;
  sourceService: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// JWT TOKEN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email?: string;
  roles?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}
