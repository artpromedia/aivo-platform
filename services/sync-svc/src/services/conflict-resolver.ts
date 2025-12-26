import {
  ConflictResolutionStrategy,
  EntityType,
  SyncConflict,
} from '../types.js';

/**
 * Conflict Resolver
 *
 * Handles automatic and manual conflict resolution between
 * client and server data states.
 */
export class ConflictResolver {
  /**
   * Attempt to automatically resolve a conflict
   */
  async attemptAutoResolve(
    conflict: SyncConflict,
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Promise<{ data: Record<string, unknown>; conflictId: string } | null> {
    const strategy = conflict.suggestedResolution;

    // Only auto-resolve certain strategies
    if (
      strategy === ConflictResolutionStrategy.MANUAL
    ) {
      return null;
    }

    const resolvedData = this.applyResolution(
      strategy,
      clientData,
      serverData
    );

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
        throw new Error(`Unknown resolution strategy: ${strategy}`);
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

      // If field doesn't exist on server, use client value
      if (serverValue === undefined) {
        merged[key] = clientValue;
        continue;
      }

      // If values are equal, no conflict
      if (JSON.stringify(clientValue) === JSON.stringify(serverValue)) {
        continue;
      }

      // Handle different types of values
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
    // Numeric fields: use max or sum depending on semantics
    if (
      typeof clientValue === 'number' &&
      typeof serverValue === 'number'
    ) {
      return this.mergeNumericField(fieldName, clientValue, serverValue);
    }

    // Array fields: merge unique values
    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      return this.mergeArrayField(clientValue, serverValue);
    }

    // Object fields: deep merge
    if (
      this.isPlainObject(clientValue) &&
      this.isPlainObject(serverValue)
    ) {
      return this.mergeData(
        clientValue as Record<string, unknown>,
        serverValue as Record<string, unknown>
      );
    }

    // String and other fields: prefer client (most recent user intent)
    // but keep server metadata
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
    // Additive fields (durations, counts)
    const additiveFields = [
      'timeSpent',
      'duration',
      'attempts',
      'viewCount',
    ];

    if (additiveFields.includes(fieldName)) {
      // Return the maximum (assuming both started from same base)
      return Math.max(clientValue, serverValue);
    }

    // Progress fields: use max
    const progressFields = [
      'progress',
      'score',
      'masteryLevel',
      'completionPercent',
    ];

    if (progressFields.includes(fieldName)) {
      return Math.max(clientValue, serverValue);
    }

    // Default: prefer client value
    return clientValue;
  }

  /**
   * Merge array fields by combining unique values
   */
  private mergeArrayField(
    clientArray: unknown[],
    serverArray: unknown[]
  ): unknown[] {
    // For primitive arrays, merge unique values
    if (clientArray.every(this.isPrimitive)) {
      const combined = new Set([...serverArray, ...clientArray]);
      return Array.from(combined);
    }

    // For object arrays, merge by ID
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
              item as Record<string, unknown>,
              existing as Record<string, unknown>
            )
          );
        } else {
          mergedById.set(id, item);
        }
      }
    }

    return Array.from(mergedById.values());
  }

  /**
   * Get timestamp from data for last-write-wins
   */
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

  /**
   * Check if a field is a metadata field (managed by server)
   */
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

  /**
   * Check if value is a plain object
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  /**
   * Check if value is a primitive
   */
  private isPrimitive(value: unknown): boolean {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  /**
   * Get ID from an item for array merging
   */
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
