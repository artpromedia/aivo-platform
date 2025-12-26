import { prisma } from '../prisma.js';
import { config } from '../config.js';
import {
  EntityType,
  SyncOperation,
  SyncOperationType,
  ConflictResolutionStrategy,
  ConflictStatus,
  PushResult,
  PullResult,
  SyncConflict,
  ServerChange,
  AuthContext,
} from '../types.js';
import { ConflictResolver } from './conflict-resolver.js';
import { SyncEventEmitter } from './sync-events.js';

/**
 * Sync Service
 *
 * Core service for bidirectional data synchronization between
 * mobile clients and the server. Implements:
 *
 * - Push changes from client to server
 * - Pull changes from server to client
 * - Delta sync for bandwidth efficiency
 * - Conflict detection and resolution
 * - Version tracking per entity
 */
export class SyncService {
  private conflictResolver: ConflictResolver;
  private eventEmitter: SyncEventEmitter;

  constructor() {
    this.conflictResolver = new ConflictResolver();
    this.eventEmitter = SyncEventEmitter.getInstance();
  }

  // ==========================================================================
  // Push Changes (Client -> Server)
  // ==========================================================================

  /**
   * Process changes pushed from a client device
   */
  async pushChanges(
    ctx: AuthContext,
    operations: SyncOperation[]
  ): Promise<PushResult> {
    const acceptedOperations: string[] = [];
    const rejectedOperations: Array<{ id: string; reason: string }> = [];
    const conflicts: SyncConflict[] = [];

    // Process operations in batches
    const batches = this.batchOperations(operations, config.sync.batchSize);

    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        for (const operation of batch) {
          try {
            const result = await this.processOperation(ctx, operation, tx);

            if (result.conflict) {
              conflicts.push(result.conflict);
              rejectedOperations.push({
                id: operation.id,
                reason: 'conflict',
              });
            } else if (result.accepted) {
              acceptedOperations.push(operation.id);

              // Emit change event for real-time sync
              this.eventEmitter.emitChange({
                entityType: operation.entityType,
                entityId: operation.entityId,
                operation: operation.operation,
                version: result.version!,
                deviceId: ctx.deviceId,
              });
            } else {
              rejectedOperations.push({
                id: operation.id,
                reason: result.reason || 'unknown',
              });
            }
          } catch (error) {
            rejectedOperations.push({
              id: operation.id,
              reason: error instanceof Error ? error.message : 'unknown error',
            });
          }
        }
      });
    }

    // Record sync history
    await this.recordSyncHistory(ctx, 'push', {
      acceptedCount: acceptedOperations.length,
      rejectedCount: rejectedOperations.length,
      conflictCount: conflicts.length,
    });

    return {
      success: rejectedOperations.length === 0,
      processedCount: operations.length,
      failedCount: rejectedOperations.length,
      conflicts,
      serverTimestamp: new Date().toISOString(),
      acceptedOperations,
      rejectedOperations,
    };
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(
    ctx: AuthContext,
    operation: SyncOperation,
    tx: typeof prisma
  ): Promise<{
    accepted: boolean;
    conflict?: SyncConflict;
    version?: number;
    reason?: string;
  }> {
    // Get current server state
    const serverEntity = await this.getServerEntity(
      ctx,
      operation.entityType,
      operation.entityId,
      tx
    );

    // Check for conflicts
    if (serverEntity && serverEntity.version >= operation.clientVersion) {
      // Conflict detected - server has newer version
      const conflict = await this.createConflict(
        ctx,
        operation,
        serverEntity,
        tx
      );

      // Attempt auto-resolution if enabled
      if (config.features.autoConflictResolution) {
        const resolved = await this.conflictResolver.attemptAutoResolve(
          conflict,
          operation.data || {},
          serverEntity.data
        );

        if (resolved) {
          await this.applyResolution(ctx, resolved, tx);
          return { accepted: true, version: serverEntity.version + 1 };
        }
      }

      return { accepted: false, conflict };
    }

    // Apply the operation
    const newVersion = await this.applyOperation(ctx, operation, tx);

    return { accepted: true, version: newVersion };
  }

  /**
   * Apply a sync operation to the database
   */
  private async applyOperation(
    ctx: AuthContext,
    operation: SyncOperation,
    tx: typeof prisma
  ): Promise<number> {
    const now = new Date();
    const tableName = this.getTableName(operation.entityType);

    switch (operation.operation) {
      case SyncOperationType.CREATE:
        await tx.$executeRaw`
          INSERT INTO ${tableName} (
            id, tenant_id, user_id, data, version, 
            created_at, updated_at, synced_at, device_id
          )
          VALUES (
            ${operation.entityId}, ${ctx.tenantId}, ${ctx.userId},
            ${JSON.stringify(operation.data)}::jsonb, 1,
            ${now}, ${now}, ${now}, ${ctx.deviceId}
          )
        `;
        return 1;

      case SyncOperationType.UPDATE:
        const updateResult = await tx.$executeRaw`
          UPDATE ${tableName}
          SET 
            data = data || ${JSON.stringify(operation.data)}::jsonb,
            version = version + 1,
            updated_at = ${now},
            synced_at = ${now},
            device_id = ${ctx.deviceId}
          WHERE id = ${operation.entityId}
            AND tenant_id = ${ctx.tenantId}
            AND user_id = ${ctx.userId}
          RETURNING version
        `;
        return updateResult as number;

      case SyncOperationType.DELETE:
        // Soft delete with tombstone
        await tx.$executeRaw`
          UPDATE ${tableName}
          SET 
            deleted_at = ${now},
            version = version + 1,
            synced_at = ${now},
            device_id = ${ctx.deviceId}
          WHERE id = ${operation.entityId}
            AND tenant_id = ${ctx.tenantId}
            AND user_id = ${ctx.userId}
        `;
        return 0;

      default:
        throw new Error(`Unknown operation type: ${operation.operation}`);
    }
  }

  // ==========================================================================
  // Pull Changes (Server -> Client)
  // ==========================================================================

  /**
   * Get changes from server for a client device
   */
  async pullChanges(
    ctx: AuthContext,
    lastSyncTimestamp?: string,
    entityTypes?: EntityType[],
    limit: number = 100
  ): Promise<PullResult> {
    const since = lastSyncTimestamp
      ? new Date(lastSyncTimestamp)
      : new Date(0);

    const types = entityTypes || Object.values(EntityType);
    const changes: ServerChange[] = [];
    const deletions: string[] = [];

    // Query each entity type for changes
    for (const entityType of types) {
      const entityChanges = await this.getEntityChanges(
        ctx,
        entityType,
        since,
        limit
      );

      for (const entity of entityChanges) {
        if (entity.deleted_at) {
          deletions.push(entity.id);
        } else {
          changes.push({
            entityType,
            entityId: entity.id,
            operation: entity.created_at > since
              ? SyncOperationType.CREATE
              : SyncOperationType.UPDATE,
            data: entity.data,
            version: entity.version,
            timestamp: entity.updated_at.toISOString(),
          });
        }
      }
    }

    // Sort by timestamp
    changes.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const hasMore = changes.length >= limit;
    const serverTimestamp = new Date().toISOString();

    // Record sync history
    await this.recordSyncHistory(ctx, 'pull', {
      changeCount: changes.length,
      deletionCount: deletions.length,
    });

    return {
      changes: changes.slice(0, limit),
      deletions,
      hasMore,
      serverTimestamp,
      nextCursor: hasMore
        ? changes[limit - 1]?.timestamp
        : undefined,
    };
  }

  /**
   * Get entity changes since a timestamp
   */
  private async getEntityChanges(
    ctx: AuthContext,
    entityType: EntityType,
    since: Date,
    limit: number
  ): Promise<
    Array<{
      id: string;
      data: Record<string, unknown>;
      version: number;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }>
  > {
    const tableName = this.getTableName(entityType);

    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        data: Record<string, unknown>;
        version: number;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }>
    >`
      SELECT id, data, version, created_at, updated_at, deleted_at
      FROM ${tableName}
      WHERE tenant_id = ${ctx.tenantId}
        AND user_id = ${ctx.userId}
        AND updated_at > ${since}
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `;

    return results;
  }

  // ==========================================================================
  // Delta Sync
  // ==========================================================================

  /**
   * Calculate delta between client and server state
   */
  async getDeltaChanges(
    ctx: AuthContext,
    entityType: EntityType,
    entityId: string,
    clientVersion: number,
    clientFields: Record<string, unknown>
  ): Promise<{
    hasChanges: boolean;
    hasConflict: boolean;
    serverVersion: number;
    fieldDeltas: Array<{
      field: string;
      clientValue: unknown;
      serverValue: unknown;
      hasConflict: boolean;
    }>;
  }> {
    const serverEntity = await this.getServerEntity(
      ctx,
      entityType,
      entityId
    );

    if (!serverEntity) {
      return {
        hasChanges: false,
        hasConflict: false,
        serverVersion: 0,
        fieldDeltas: [],
      };
    }

    const fieldDeltas: Array<{
      field: string;
      clientValue: unknown;
      serverValue: unknown;
      hasConflict: boolean;
    }> = [];

    let hasConflict = false;

    // Compare each field
    for (const [field, clientValue] of Object.entries(clientFields)) {
      const serverValue = serverEntity.data[field];

      if (JSON.stringify(clientValue) !== JSON.stringify(serverValue)) {
        const fieldConflict =
          serverEntity.version > clientVersion &&
          this.isConflictingField(entityType, field);

        fieldDeltas.push({
          field,
          clientValue,
          serverValue,
          hasConflict: fieldConflict,
        });

        if (fieldConflict) {
          hasConflict = true;
        }
      }
    }

    // Check for server-side additions
    for (const [field, serverValue] of Object.entries(serverEntity.data)) {
      if (!(field in clientFields)) {
        fieldDeltas.push({
          field,
          clientValue: undefined,
          serverValue,
          hasConflict: false,
        });
      }
    }

    return {
      hasChanges: fieldDeltas.length > 0,
      hasConflict,
      serverVersion: serverEntity.version,
      fieldDeltas,
    };
  }

  // ==========================================================================
  // Conflict Management
  // ==========================================================================

  /**
   * Get pending conflicts for a user
   */
  async getPendingConflicts(ctx: AuthContext): Promise<SyncConflict[]> {
    const conflicts = await prisma.syncConflict.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        status: ConflictStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      take: config.sync.maxConflicts,
    });

    return conflicts.map((c) => ({
      id: c.id,
      entityType: c.entityType as EntityType,
      entityId: c.entityId,
      clientData: c.clientData as Record<string, unknown>,
      serverData: c.serverData as Record<string, unknown>,
      clientVersion: c.clientVersion,
      serverVersion: c.serverVersion,
      clientDeviceId: c.clientDeviceId,
      status: c.status as ConflictStatus,
      suggestedResolution: c.suggestedResolution as ConflictResolutionStrategy,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt || undefined,
      resolvedBy: c.resolvedBy || undefined,
    }));
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    ctx: AuthContext,
    conflictId: string,
    resolution: ConflictResolutionStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<void> {
    const conflict = await prisma.syncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    if (conflict.userId !== ctx.userId) {
      throw new Error('Unauthorized to resolve this conflict');
    }

    const resolvedData = this.conflictResolver.applyResolution(
      resolution,
      conflict.clientData as Record<string, unknown>,
      conflict.serverData as Record<string, unknown>,
      mergedData
    );

    await prisma.$transaction(async (tx) => {
      // Apply resolved data
      const tableName = this.getTableName(conflict.entityType as EntityType);
      await tx.$executeRaw`
        UPDATE ${tableName}
        SET 
          data = ${JSON.stringify(resolvedData)}::jsonb,
          version = version + 1,
          updated_at = ${new Date()},
          synced_at = ${new Date()}
        WHERE id = ${conflict.entityId}
          AND tenant_id = ${ctx.tenantId}
          AND user_id = ${ctx.userId}
      `;

      // Mark conflict as resolved
      await tx.syncConflict.update({
        where: { id: conflictId },
        data: {
          status: ConflictStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: ctx.userId,
          resolvedData: resolvedData,
        },
      });
    });

    // Emit event
    this.eventEmitter.emitConflictResolved({
      conflictId,
      entityType: conflict.entityType as EntityType,
      entityId: conflict.entityId,
      resolution,
      userId: ctx.userId,
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get server entity state
   */
  private async getServerEntity(
    ctx: AuthContext,
    entityType: EntityType,
    entityId: string,
    tx: typeof prisma = prisma
  ): Promise<{
    data: Record<string, unknown>;
    version: number;
  } | null> {
    const tableName = this.getTableName(entityType);

    const results = await tx.$queryRaw<
      Array<{ data: Record<string, unknown>; version: number }>
    >`
      SELECT data, version
      FROM ${tableName}
      WHERE id = ${entityId}
        AND tenant_id = ${ctx.tenantId}
        AND user_id = ${ctx.userId}
        AND deleted_at IS NULL
    `;

    return results[0] || null;
  }

  /**
   * Create a conflict record
   */
  private async createConflict(
    ctx: AuthContext,
    operation: SyncOperation,
    serverEntity: { data: Record<string, unknown>; version: number },
    tx: typeof prisma
  ): Promise<SyncConflict> {
    const conflict = await tx.syncConflict.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        entityType: operation.entityType,
        entityId: operation.entityId,
        clientData: operation.data || {},
        serverData: serverEntity.data,
        clientVersion: operation.clientVersion,
        serverVersion: serverEntity.version,
        clientDeviceId: ctx.deviceId,
        status: ConflictStatus.PENDING,
        suggestedResolution: this.getSuggestedResolution(operation.entityType),
      },
    });

    return {
      id: conflict.id,
      entityType: conflict.entityType as EntityType,
      entityId: conflict.entityId,
      clientData: conflict.clientData as Record<string, unknown>,
      serverData: conflict.serverData as Record<string, unknown>,
      clientVersion: conflict.clientVersion,
      serverVersion: conflict.serverVersion,
      clientDeviceId: conflict.clientDeviceId,
      status: conflict.status as ConflictStatus,
      suggestedResolution:
        conflict.suggestedResolution as ConflictResolutionStrategy,
      createdAt: conflict.createdAt,
    };
  }

  /**
   * Apply a conflict resolution
   */
  private async applyResolution(
    ctx: AuthContext,
    resolved: {
      data: Record<string, unknown>;
      conflictId: string;
    },
    tx: typeof prisma
  ): Promise<void> {
    const conflict = await tx.syncConflict.findUnique({
      where: { id: resolved.conflictId },
    });

    if (!conflict) return;

    const tableName = this.getTableName(conflict.entityType as EntityType);

    await tx.$executeRaw`
      UPDATE ${tableName}
      SET 
        data = ${JSON.stringify(resolved.data)}::jsonb,
        version = version + 1,
        updated_at = ${new Date()},
        synced_at = ${new Date()}
      WHERE id = ${conflict.entityId}
        AND tenant_id = ${ctx.tenantId}
        AND user_id = ${ctx.userId}
    `;

    await tx.syncConflict.update({
      where: { id: resolved.conflictId },
      data: {
        status: ConflictStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: 'auto',
        resolvedData: resolved.data,
      },
    });
  }

  /**
   * Get table name for entity type
   */
  private getTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
      [EntityType.LEARNING_SESSION]: 'sync_learning_sessions',
      [EntityType.RESPONSE]: 'sync_responses',
      [EntityType.PROGRESS]: 'sync_progress',
      [EntityType.SKILL_MASTERY]: 'sync_skill_mastery',
      [EntityType.SETTINGS]: 'sync_settings',
      [EntityType.BOOKMARK]: 'sync_bookmarks',
      [EntityType.NOTE]: 'sync_notes',
    };

    return tableMap[entityType];
  }

  /**
   * Get suggested resolution strategy for entity type
   */
  private getSuggestedResolution(
    entityType: EntityType
  ): ConflictResolutionStrategy {
    const strategyMap: Record<EntityType, ConflictResolutionStrategy> = {
      [EntityType.LEARNING_SESSION]: ConflictResolutionStrategy.LAST_WRITE_WINS,
      [EntityType.RESPONSE]: ConflictResolutionStrategy.CLIENT_WINS,
      [EntityType.PROGRESS]: ConflictResolutionStrategy.MERGE,
      [EntityType.SKILL_MASTERY]: ConflictResolutionStrategy.SERVER_WINS,
      [EntityType.SETTINGS]: ConflictResolutionStrategy.LAST_WRITE_WINS,
      [EntityType.BOOKMARK]: ConflictResolutionStrategy.CLIENT_WINS,
      [EntityType.NOTE]: ConflictResolutionStrategy.MERGE,
    };

    return strategyMap[entityType];
  }

  /**
   * Check if a field is conflicting
   */
  private isConflictingField(
    entityType: EntityType,
    field: string
  ): boolean {
    // Fields that don't cause conflicts (additive or metadata)
    const nonConflictingFields: Record<EntityType, string[]> = {
      [EntityType.LEARNING_SESSION]: ['duration', 'lastActiveAt'],
      [EntityType.RESPONSE]: [],
      [EntityType.PROGRESS]: ['timeSpent'],
      [EntityType.SKILL_MASTERY]: [],
      [EntityType.SETTINGS]: [],
      [EntityType.BOOKMARK]: [],
      [EntityType.NOTE]: [],
    };

    return !nonConflictingFields[entityType]?.includes(field);
  }

  /**
   * Batch operations for transaction processing
   */
  private batchOperations(
    operations: SyncOperation[],
    batchSize: number
  ): SyncOperation[][] {
    const batches: SyncOperation[][] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Record sync history for analytics
   */
  private async recordSyncHistory(
    ctx: AuthContext,
    type: 'push' | 'pull',
    stats: Record<string, number>
  ): Promise<void> {
    await prisma.syncHistory.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        deviceId: ctx.deviceId,
        type,
        stats,
        timestamp: new Date(),
      },
    });
  }
}

// Export singleton instance
export const syncService = new SyncService();
