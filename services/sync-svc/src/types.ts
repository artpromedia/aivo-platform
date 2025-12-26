import { z } from 'zod';

// ============================================================================
// Sync Operation Types
// ============================================================================

export enum SyncOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum EntityType {
  LEARNING_SESSION = 'learning_session',
  RESPONSE = 'response',
  PROGRESS = 'progress',
  SKILL_MASTERY = 'skill_mastery',
  SETTINGS = 'settings',
  BOOKMARK = 'bookmark',
  NOTE = 'note',
}

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE = 'merge',
  MANUAL = 'manual',
}

export enum ConflictStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const SyncOperationSchema = z.object({
  id: z.string().uuid(),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string(),
  operation: z.nativeEnum(SyncOperationType),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
  clientVersion: z.number().int().positive(),
  checksum: z.string().optional(),
});

export const PushChangesRequestSchema = z.object({
  deviceId: z.string(),
  lastSyncTimestamp: z.string().datetime().optional(),
  operations: z.array(SyncOperationSchema),
});

export const PullChangesRequestSchema = z.object({
  deviceId: z.string(),
  lastSyncTimestamp: z.string().datetime().optional(),
  entityTypes: z.array(z.nativeEnum(EntityType)).optional(),
  limit: z.number().int().positive().max(500).default(100),
});

export const DeltaRequestSchema = z.object({
  deviceId: z.string(),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string(),
  clientVersion: z.number().int().positive(),
  clientFields: z.record(z.unknown()),
});

export const ConflictResolutionRequestSchema = z.object({
  conflictId: z.string().uuid(),
  resolution: z.nativeEnum(ConflictResolutionStrategy),
  mergedData: z.record(z.unknown()).optional(),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type PushChangesRequest = z.infer<typeof PushChangesRequestSchema>;
export type PullChangesRequest = z.infer<typeof PullChangesRequestSchema>;
export type DeltaRequest = z.infer<typeof DeltaRequestSchema>;
export type ConflictResolutionRequest = z.infer<
  typeof ConflictResolutionRequestSchema
>;

export interface SyncConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  clientData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  clientVersion: number;
  serverVersion: number;
  clientDeviceId: string;
  status: ConflictStatus;
  suggestedResolution: ConflictResolutionStrategy;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  conflicts: SyncConflict[];
  serverTimestamp: string;
}

export interface PushResult extends SyncResult {
  acceptedOperations: string[];
  rejectedOperations: Array<{
    id: string;
    reason: string;
  }>;
}

export interface PullResult {
  changes: ServerChange[];
  deletions: string[];
  hasMore: boolean;
  serverTimestamp: string;
  nextCursor?: string;
}

export interface ServerChange {
  entityType: EntityType;
  entityId: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  version: number;
  timestamp: string;
}

export interface DeltaResult {
  entityType: EntityType;
  entityId: string;
  hasConflict: boolean;
  serverVersion: number;
  fieldDeltas: FieldDelta[];
  conflict?: SyncConflict;
}

export interface FieldDelta {
  field: string;
  clientValue: unknown;
  serverValue: unknown;
  hasConflict: boolean;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export enum WebSocketMessageType {
  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PUSH_CHANGE = 'push_change',
  PULL_CHANGES = 'pull_changes',
  RESOLVE_CONFLICT = 'resolve_conflict',
  PING = 'ping',

  // Server -> Client
  CHANGE_NOTIFICATION = 'change_notification',
  CONFLICT_NOTIFICATION = 'conflict_notification',
  SYNC_COMPLETE = 'sync_complete',
  ERROR = 'error',
  PONG = 'pong',
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  requestId?: string;
  payload: unknown;
  timestamp: string;
}

export interface ChangeNotification {
  entityType: EntityType;
  entityId: string;
  operation: SyncOperationType;
  version: number;
  deviceId: string; // Source device
}

// ============================================================================
// Auth Context
// ============================================================================

export interface AuthContext {
  userId: string;
  tenantId: string;
  deviceId: string;
  roles: string[];
}
