/**
 * AIVO Event Collector Service - Type Definitions
 */

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email?: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type EventStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'DEAD_LETTER'
  | 'SKIPPED';

export type BatchStatus =
  | 'OPEN'
  | 'SEALED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export type EventPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'NORMAL'
  | 'LOW'
  | 'BULK';

export type DestinationType =
  | 'NATS'
  | 'KINESIS'
  | 'SQS'
  | 'WEBHOOK'
  | 'INTERNAL';

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - INGESTION
// ══════════════════════════════════════════════════════════════════════════════

export interface IngestEventInput {
  eventId: string;           // Client-provided idempotency key
  eventType: string;         // e.g., "learning.session.started"
  eventVersion?: string;
  payload: Record<string, unknown>;
  priority?: EventPriority;
  category?: string;
  occurredAt?: string;       // ISO timestamp, defaults to now
  correlationId?: string;
  causationId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  destinations?: string[];   // Override default routing
  expiresAt?: string;        // TTL
}

export interface IngestBatchInput {
  events: IngestEventInput[];
  batchId?: string;          // Optional client-provided batch ID
  priority?: EventPriority;
}

export interface IngestResult {
  accepted: number;
  rejected: number;
  duplicates: number;
  errors: IngestError[];
}

export interface IngestError {
  eventId: string;
  error: string;
  code: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - QUERIES
// ══════════════════════════════════════════════════════════════════════════════

export interface ListEventsQuery {
  eventType?: string;
  status?: EventStatus;
  priority?: EventPriority;
  fromDate?: string;
  toDate?: string;
  correlationId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListBatchesQuery {
  status?: BatchStatus;
  priority?: EventPriority;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListDeadLetterQuery {
  eventType?: string;
  isResolved?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - ROUTING
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateRouteInput {
  name: string;
  description?: string;
  eventTypePattern: string;
  sourcePattern?: string;
  conditions?: Record<string, unknown>;
  destinationType: DestinationType;
  destinationConfig: Record<string, unknown>;
  transformTemplate?: string;
  enrichmentRules?: Record<string, unknown>;
  filterRules?: Record<string, unknown>;
  rateLimitPerSec?: number;
  rateLimitBurst?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  retryBackoff?: number;
  priority?: number;
}

export interface UpdateRouteInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  eventTypePattern?: string;
  sourcePattern?: string;
  conditions?: Record<string, unknown>;
  destinationConfig?: Record<string, unknown>;
  transformTemplate?: string;
  enrichmentRules?: Record<string, unknown>;
  filterRules?: Record<string, unknown>;
  rateLimitPerSec?: number;
  rateLimitBurst?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  retryBackoff?: number;
  priority?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - DEAD LETTER
// ══════════════════════════════════════════════════════════════════════════════

export interface ResolveDeadLetterInput {
  resolution: 'reprocess' | 'discard' | 'manual';
  notes?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ProcessedEvent {
  eventId: string;
  success: boolean;
  deliveredTo: string[];
  failedDestinations: string[];
  processingTimeMs: number;
  error?: string;
}

export interface BatchProcessingResult {
  batchId: string;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  totalTimeMs: number;
  errors: Array<{ eventId: string; error: string }>;
}

export interface EventMetricsSummary {
  received: number;
  processed: number;
  failed: number;
  deadLettered: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  eventsPerSecond: number;
  bytesPerSecond: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
