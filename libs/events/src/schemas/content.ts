// =============================================================================
// @aivo/events - Content Event Schemas
// =============================================================================
//
// Events for content lifecycle: publishing, versioning, reviews, ingestion.

import { z } from 'zod';

import { BaseEventSchema } from './base.js';

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export const CONTENT_EVENT_TYPES = {
  /** Learning object published and available */
  CONTENT_PUBLISHED: 'content.published',
  /** Learning object retired/unpublished */
  CONTENT_RETIRED: 'content.retired',
  /** New version created */
  VERSION_CREATED: 'content.version.created',
  /** Version submitted for review */
  VERSION_SUBMITTED: 'content.version.submitted',
  /** Version approved by reviewer */
  VERSION_APPROVED: 'content.version.approved',
  /** Version changes requested */
  VERSION_CHANGES_REQUESTED: 'content.version.changes_requested',
  /** Version rejected */
  VERSION_REJECTED: 'content.version.rejected',
  /** Ingestion job started */
  INGESTION_STARTED: 'content.ingestion.started',
  /** Ingestion job completed */
  INGESTION_COMPLETED: 'content.ingestion.completed',
  /** Ingestion job failed */
  INGESTION_FAILED: 'content.ingestion.failed',
} as const;

export type ContentEventType = (typeof CONTENT_EVENT_TYPES)[keyof typeof CONTENT_EVENT_TYPES];

// -----------------------------------------------------------------------------
// Payload Schemas
// -----------------------------------------------------------------------------

/**
 * Content published payload
 */
const ContentPublishedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Version ID that was published */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** Content slug */
  slug: z.string(),
  /** Subject area */
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']),
  /** Grade band */
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']),
  /** User who published */
  publishedByUserId: z.string(),
  /** Tenant ID (null for global catalog) */
  tenantId: z.string().nullable(),
  /** Primary skill alignment */
  primarySkillId: z.string().uuid().nullable(),
  /** Tags for discovery */
  tags: z.array(z.string()),
});

/**
 * Content retired payload
 */
const ContentRetiredPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Content slug */
  slug: z.string(),
  /** User who retired the content */
  retiredByUserId: z.string(),
  /** Reason for retirement */
  reason: z.string().optional(),
});

/**
 * Version created payload
 */
const VersionCreatedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** New version ID */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** Previous version ID if any */
  previousVersionId: z.string().uuid().nullable(),
  /** User who created */
  createdByUserId: z.string(),
  /** Change summary */
  changeSummary: z.string().optional(),
});

/**
 * Version submitted for review payload
 */
const VersionSubmittedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Version ID */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** User who submitted */
  submittedByUserId: z.string(),
  /** Content title for notification context */
  title: z.string(),
});

/**
 * Version approved payload
 */
const VersionApprovedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Version ID */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** Reviewer user ID */
  reviewerUserId: z.string(),
  /** Review comments */
  comments: z.string().optional(),
  /** Whether auto-published */
  autoPublished: z.boolean().optional(),
});

/**
 * Version changes requested payload
 */
const VersionChangesRequestedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Version ID */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** Reviewer user ID */
  reviewerUserId: z.string(),
  /** Review comments explaining changes */
  comments: z.string(),
  /** Validation errors found */
  validationErrors: z.array(z.string()).optional(),
});

/**
 * Version rejected payload
 */
const VersionRejectedPayloadSchema = z.object({
  /** Learning object ID */
  loId: z.string().uuid(),
  /** Version ID */
  versionId: z.string().uuid(),
  /** Version number */
  versionNumber: z.number().int().positive(),
  /** Reviewer user ID */
  reviewerUserId: z.string(),
  /** Rejection reason */
  reason: z.string(),
});

/**
 * Ingestion started payload
 */
const IngestionStartedPayloadSchema = z.object({
  /** Job ID */
  jobId: z.string().uuid(),
  /** Ingestion source */
  source: z.enum(['MANUAL', 'FILE_CSV', 'FILE_JSON', 'AI_DRAFT']),
  /** User who started ingestion */
  userId: z.string(),
  /** Total rows/items to process */
  totalRows: z.number().int().nonnegative().optional(),
  /** File URL if file-based */
  fileUrl: z.string().url().optional(),
});

/**
 * Ingestion completed payload
 */
const IngestionCompletedPayloadSchema = z.object({
  /** Job ID */
  jobId: z.string().uuid(),
  /** Ingestion source */
  source: z.enum(['MANUAL', 'FILE_CSV', 'FILE_JSON', 'AI_DRAFT']),
  /** User who started ingestion */
  userId: z.string(),
  /** Total rows processed */
  totalRows: z.number().int().nonnegative(),
  /** Success count */
  successCount: z.number().int().nonnegative(),
  /** Error count */
  errorCount: z.number().int().nonnegative(),
  /** Created LO IDs */
  createdLoIds: z.array(z.string().uuid()),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
});

/**
 * Ingestion failed payload
 */
const IngestionFailedPayloadSchema = z.object({
  /** Job ID */
  jobId: z.string().uuid(),
  /** Ingestion source */
  source: z.enum(['MANUAL', 'FILE_CSV', 'FILE_JSON', 'AI_DRAFT']),
  /** User who started ingestion */
  userId: z.string(),
  /** Error message */
  error: z.string(),
  /** Processed rows before failure */
  processedRows: z.number().int().nonnegative().optional(),
});

// -----------------------------------------------------------------------------
// Event Schemas
// -----------------------------------------------------------------------------

export const ContentPublishedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.CONTENT_PUBLISHED),
  payload: ContentPublishedPayloadSchema,
});

export const ContentRetiredSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.CONTENT_RETIRED),
  payload: ContentRetiredPayloadSchema,
});

export const VersionCreatedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.VERSION_CREATED),
  payload: VersionCreatedPayloadSchema,
});

export const VersionSubmittedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.VERSION_SUBMITTED),
  payload: VersionSubmittedPayloadSchema,
});

export const VersionApprovedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.VERSION_APPROVED),
  payload: VersionApprovedPayloadSchema,
});

export const VersionChangesRequestedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.VERSION_CHANGES_REQUESTED),
  payload: VersionChangesRequestedPayloadSchema,
});

export const VersionRejectedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.VERSION_REJECTED),
  payload: VersionRejectedPayloadSchema,
});

export const IngestionStartedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.INGESTION_STARTED),
  payload: IngestionStartedPayloadSchema,
});

export const IngestionCompletedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.INGESTION_COMPLETED),
  payload: IngestionCompletedPayloadSchema,
});

export const IngestionFailedSchema = BaseEventSchema.extend({
  eventType: z.literal(CONTENT_EVENT_TYPES.INGESTION_FAILED),
  payload: IngestionFailedPayloadSchema,
});

// -----------------------------------------------------------------------------
// TypeScript Types
// -----------------------------------------------------------------------------

export type ContentPublished = z.infer<typeof ContentPublishedSchema>;
export type ContentRetired = z.infer<typeof ContentRetiredSchema>;
export type VersionCreated = z.infer<typeof VersionCreatedSchema>;
export type VersionSubmitted = z.infer<typeof VersionSubmittedSchema>;
export type VersionApproved = z.infer<typeof VersionApprovedSchema>;
export type VersionChangesRequested = z.infer<typeof VersionChangesRequestedSchema>;
export type VersionRejected = z.infer<typeof VersionRejectedSchema>;
export type IngestionStarted = z.infer<typeof IngestionStartedSchema>;
export type IngestionCompleted = z.infer<typeof IngestionCompletedSchema>;
export type IngestionFailed = z.infer<typeof IngestionFailedSchema>;

// Union type for all content events
export type ContentEvent =
  | ContentPublished
  | ContentRetired
  | VersionCreated
  | VersionSubmitted
  | VersionApproved
  | VersionChangesRequested
  | VersionRejected
  | IngestionStarted
  | IngestionCompleted
  | IngestionFailed;
