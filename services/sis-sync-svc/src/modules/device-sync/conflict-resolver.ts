/**
 * Conflict Resolver
 *
 * Handles automatic and manual conflict resolution between
 * client and server data states for device sync.
 *
 * Ported from sync-svc during Sprint 3 consolidation.
 */

import {
  ConflictResolutionStrategy,
  EntityType,
  type DeviceSyncConflict,
} from './types.js';

export class ConflictResolver {
  /**
   * Attempt to automatically resolve a conflict
   */
  async attemptAutoResolve(
    conflict: DeviceSyncConflict,
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Promise<{ data: Record<string, unknown>; conflictId: string } | null> {
    const strategy = conflict.suggestedResolution;

    // Only auto-resolve certain strategies
    if (strategy === ConflictResolutionStrategy.MANUAL) {
      return null;
    }

    const resolvedData = this.applyResolution(strategy, clientData, serverData);

    return {
      data: resolvedData,
      conflictId: conflict.id,
    };
  }

  /**
   * Apply a resolution strategy to conflicting data
   */
  applyResolution(
    strategy: ConflictResolutionStrategy,
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    mergedData?: Record<string, unknown>
  ): Record<string, unknown> {
    switch (strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        return { ...serverData };

      case ConflictResolutionStrategy.CLIENT_WINS:
        return { ...clientData };

      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.resolveByLastWrite(clientData, serverData);

      case ConflictResolutionStrategy.MERGE:
        return this.mergeData(clientData, serverData);

      case ConflictResolutionStrategy.MANUAL:
        if (!mergedData) {
          throw new Error('Manual resolution requires merged data');
        }
        return { ...mergedData };

      default:
        throw new Error(`Unknown resolution strategy: ${String(strategy)}`);
    }
  }

  /**
   * Resolve by comparing timestamps (last write wins)
   */
  private resolveByLastWrite(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Record<string, unknown> {
    const clientTime = this.getTimestamp(clientData);
    const serverTime = this.getTimestamp(serverData);

    return clientTime > serverTime ? { ...clientData } : { ...serverData };
  }

  /**
   * Merge client and server data intelligently
   */
  private mergeData(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...serverData };

    for (const [key, clientValue] of Object.entries(clientData)) {
      const serverValue = serverData[key];

      if (serverValue === undefined) {
        merged[key] = clientValue;
        continue;
      }

      if (JSON.stringify(clientValue) === JSON.stringify(serverValue)) {
        continue;
      }

      merged[key] = this.mergeField(key, clientValue, serverValue);
    }

    return merged;
  }

  /**
   * Merge a single field based on its type
   */
  private mergeField(
    fieldName: string,
    clientValue: unknown,
    serverValue: unknown
  ): unknown {
    if (
      typeof clientValue === 'number' &&
      typeof serverValue === 'number'
    ) {
      return this.mergeNumericField(fieldName, clientValue, serverValue);
    }

    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      return this.mergeArrayField(clientValue, serverValue);
    }

    if (this.isPlainObject(clientValue) && this.isPlainObject(serverValue)) {
      return this.mergeData(
        clientValue,
        serverValue
      );
    }

    if (this.isMetadataField(fieldName)) {
      return serverValue;
    }

    return clientValue;
  }

  /**
   * Merge numeric fields based on semantics
   */
  private mergeNumericField(
    fieldName: string,
    clientValue: number,
    serverValue: number
  ): number {
    const additiveFields = [
      'timeSpent',
      'duration',
      'attempts',
      'viewCount',
    ];

    if (additiveFields.includes(fieldName)) {
      return Math.max(clientValue, serverValue);
    }

    const progressFields = [
      'progress',
      'score',
      'masteryLevel',
      'completionPercent',
    ];

    if (progressFields.includes(fieldName)) {
      return Math.max(clientValue, serverValue);
    }

    return clientValue;
  }

  /**
   * Merge array fields by combining unique values
   */
  private mergeArrayField(
    clientArray: unknown[],
    serverArray: unknown[]
  ): unknown[] {
    if (clientArray.every((v) => this.isPrimitive(v))) {
      const combined = new Set([...serverArray, ...clientArray]);
      return Array.from(combined);
    }

    const mergedById = new Map<string, unknown>();

    for (const item of serverArray) {
      const id = this.getItemId(item);
      if (id) {
        mergedById.set(id, item);
      }
    }

    for (const item of clientArray) {
      const id = this.getItemId(item);
      if (id) {
        const existing = mergedById.get(id);
        if (existing && this.isPlainObject(existing) && this.isPlainObject(item)) {
          mergedById.set(
            id,
            this.mergeData(
              item,
              existing
            )
          );
        } else {
          mergedById.set(id, item);
        }
      }
    }

    return Array.from(mergedById.values());
  }

  private getTimestamp(data: Record<string, unknown>): number {
    const timeFields = ['updatedAt', 'modifiedAt', 'timestamp', 'lastModified'];

    for (const field of timeFields) {
      const value = data[field];
      if (typeof value === 'string') {
        return new Date(value).getTime();
      }
      if (typeof value === 'number') {
        return value;
      }
    }

    return 0;
  }

  private isMetadataField(fieldName: string): boolean {
    const metadataFields = [
      'id',
      'createdAt',
      'updatedAt',
      'version',
      'syncedAt',
      'tenantId',
      'userId',
    ];

    return metadataFields.includes(fieldName);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isPrimitive(value: unknown): boolean {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private getItemId(item: unknown): string | null {
    if (!this.isPlainObject(item)) {
      return null;
    }

    const idFields = ['id', '_id', 'uuid', 'key'];

    for (const field of idFields) {
      const value = item[field];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  /**
   * Get resolution strategy based on entity type
   */
  getStrategyForEntityType(
    entityType: EntityType
  ): ConflictResolutionStrategy {
    const strategies: Record<EntityType, ConflictResolutionStrategy> = {
      [EntityType.LEARNING_SESSION]: ConflictResolutionStrategy.LAST_WRITE_WINS,
      [EntityType.RESPONSE]: ConflictResolutionStrategy.CLIENT_WINS,
      [EntityType.PROGRESS]: ConflictResolutionStrategy.MERGE,
      [EntityType.SKILL_MASTERY]: ConflictResolutionStrategy.SERVER_WINS,
      [EntityType.SETTINGS]: ConflictResolutionStrategy.LAST_WRITE_WINS,
      [EntityType.BOOKMARK]: ConflictResolutionStrategy.CLIENT_WINS,
      [EntityType.NOTE]: ConflictResolutionStrategy.MERGE,
    };

    return strategies[entityType];
  }
}
