/**
 * Device Sync Module - Barrel Exports
 *
 * Offline-first bidirectional data synchronization between
 * mobile clients and the server.
 *
 * Absorbed from sync-svc during Sprint 3 consolidation.
 */

export { DeviceSyncService } from './sync-service.js';
export { ConflictResolver } from './conflict-resolver.js';
export { SyncEventEmitter } from './sync-events.js';
export { DeviceSyncWebSocketHandler } from './websocket-handler.js';
export { deviceSyncAuthMiddleware } from './auth.js';
export { deviceSyncRoutes } from './routes.js';
export { deviceSyncConfig } from './config.js';

export type {
  SyncOperation,
  PushChangesRequest,
  PullChangesRequest,
  DeltaRequest,
  ConflictResolutionRequest,
  DeviceSyncConflict,
  SyncResult,
  PushResult,
  PullResult,
  ServerChange,
  DeltaResult,
  FieldDelta,
  WebSocketMessage,
  ChangeNotification,
  DeviceSyncAuthContext,
} from './types.js';

export {
  SyncOperationType,
  EntityType,
  ConflictResolutionStrategy,
  ConflictStatus,
  WebSocketMessageType,
} from './types.js';
