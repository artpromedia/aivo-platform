/**
 * Room and Collaboration Service
 *
 * Manages room membership, state, and collaborative editing with:
 * - Room access control
 * - Member management
 * - Document state and operations (OT-based)
 * - Locking mechanism for exclusive editing
 */

import { nanoid } from 'nanoid';

import { config } from '../config.js';
import { getRedisClient, RedisKeys } from '../redis/index.js';
import type {
  RoomMember,
  RoomState,
  RoomConfig,
  RoomType,
  RoomMessage,
  CollaborativeOperation,
  DocumentState,
  DocumentLock,
  LockResult,
  OperationResult,
} from '../types.js';

/**
 * Room Service
 */
export class RoomService {
  /**
   * Check if user can join a room
   */
  async canJoinRoom(
    userId: string,
    tenantId: string,
    roomId: string,
    roomType: RoomType
  ): Promise<boolean> {
    switch (roomType) {
      case 'class':
        return this.canAccessClass(userId, roomId);

      case 'session':
        return this.canAccessSession(userId, roomId);

      case 'document':
        return this.canAccessDocument(userId, roomId);

      case 'planning':
        return this.canAccessPlanning(userId, tenantId);

      case 'analytics':
        return this.canAccessClass(userId, roomId.replace('analytics:', ''));

      default:
        return false;
    }
  }

  /**
   * Check if user can access a class (for analytics room)
   */
  async canAccessClass(userId: string, classId: string): Promise<boolean> {
    // TODO: Integrate with actual Prisma database
    // For now, return true for development
    console.log(`[Room] Checking class access for user ${userId} on class ${classId}`);
    return true;
  }

  /**
   * Check if user can access a session
   */
  async canAccessSession(userId: string, sessionId: string): Promise<boolean> {
    console.log(`[Room] Checking session access for user ${userId} on session ${sessionId}`);
    return true;
  }

  /**
   * Check if user can access a document
   */
  async canAccessDocument(userId: string, documentId: string): Promise<boolean> {
    console.log(`[Room] Checking document access for user ${userId} on document ${documentId}`);
    return true;
  }

  /**
   * Check if user can access planning features
   */
  async canAccessPlanning(userId: string, tenantId: string): Promise<boolean> {
    console.log(`[Room] Checking planning access for user ${userId} in tenant ${tenantId}`);
    return true;
  }

  /**
   * Add member to room
   */
  async addMember(roomId: string, member: RoomMember): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.roomMembers(roomId);

    await redis.hset(key, member.socketId, JSON.stringify(member));
    await redis.expire(key, config.room.ttl);

    // Update room metadata
    await this.updateRoomMetadata(roomId, {
      memberCount: await this.getMemberCount(roomId),
      lastActivity: new Date(),
    });

    console.log(`[Room] Added member ${member.userId} to room ${roomId}`);
  }

  /**
   * Remove member from room
   */
  async removeMember(roomId: string, socketId: string): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.roomMembers(roomId);

    await redis.hdel(key, socketId);

    const memberCount = await this.getMemberCount(roomId);

    if (memberCount === 0) {
      // Room is empty, clean up
      await this.cleanupRoom(roomId);
    } else {
      await this.updateRoomMetadata(roomId, {
        memberCount,
        lastActivity: new Date(),
      });
    }

    console.log(`[Room] Removed socket ${socketId} from room ${roomId}`);
  }

  /**
   * Get room state
   */
  async getRoomState(roomId: string): Promise<RoomState> {
    const redis = getRedisClient();

    const [membersData, stateData] = await Promise.all([
      redis.hgetall(RedisKeys.roomMembers(roomId)),
      redis.get(RedisKeys.roomState(roomId)),
    ]);

    const members: RoomMember[] = membersData
      ? Object.values(membersData).map((m) => JSON.parse(m))
      : [];

    const state = stateData ? JSON.parse(stateData) : {};

    return {
      members,
      state: state.data || {},
      version: state.version || 0,
      lastModified: state.lastModified ? new Date(state.lastModified) : new Date(),
    };
  }

  /**
   * Get room configuration
   */
  async getRoomConfig(roomId: string): Promise<RoomConfig | null> {
    const redis = getRedisClient();
    const configStr = await redis.get(RedisKeys.roomConfig(roomId));
    return configStr ? JSON.parse(configStr) : null;
  }

  /**
   * Set room state
   */
  async setRoomState(
    roomId: string,
    state: Record<string, unknown>,
    version: number
  ): Promise<void> {
    const redis = getRedisClient();

    const stateData = {
      data: state,
      version,
      lastModified: new Date().toISOString(),
    };

    await redis.setex(RedisKeys.roomState(roomId), config.room.ttl, JSON.stringify(stateData));
  }

  /**
   * Add message to room history
   */
  async addMessage(roomId: string, message: RoomMessage): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.roomMessages(roomId);

    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, config.room.messageHistoryLimit - 1);
    await redis.expire(key, config.room.ttl);
  }

  /**
   * Get room message history
   */
  async getMessages(roomId: string, limit = 50): Promise<RoomMessage[]> {
    const redis = getRedisClient();
    const key = RedisKeys.roomMessages(roomId);
    const messages = await redis.lrange(key, 0, limit - 1);
    return messages.map((m) => JSON.parse(m));
  }

  /**
   * Apply collaborative operation (OT-based)
   */
  async applyOperation(
    documentId: string,
    operation: CollaborativeOperation,
    clientVersion: number,
    userId: string
  ): Promise<OperationResult> {
    const redis = getRedisClient();
    const docKey = RedisKeys.document(documentId);

    // Get current document state
    const docData = await redis.get(docKey);
    const doc: DocumentState = docData
      ? JSON.parse(docData)
      : { content: '', version: 0, operations: [], lastModified: new Date() };

    // Check version
    if (clientVersion < doc.version - config.collaboration.operationsBufferSize) {
      // Client is too far behind, need full sync
      return {
        success: false,
        conflict: true,
        serverVersion: doc.version,
        serverState: doc.content,
      };
    }

    // Get operations since client version
    const startIndex = Math.max(
      0,
      clientVersion - doc.version + config.collaboration.operationsBufferSize
    );
    const missedOperations = doc.operations.slice(startIndex);

    // Transform operation against missed operations
    let transformedOp = operation;
    for (const serverOp of missedOperations) {
      transformedOp = this.transformOperation(transformedOp, serverOp);
    }

    // Apply transformed operation to document
    const newContent = this.applyOperationToContent(doc.content, transformedOp);

    // Update document state
    doc.content = newContent;
    doc.version++;
    doc.operations.push(transformedOp);
    doc.lastModified = new Date();

    // Trim operations buffer
    if (doc.operations.length > config.collaboration.operationsBufferSize) {
      doc.operations = doc.operations.slice(-config.collaboration.operationsBufferSize);
    }

    // Save atomically
    await redis.set(docKey, JSON.stringify(doc));

    console.log(`[Room] Applied operation to document ${documentId}, version ${doc.version}`);

    return {
      success: true,
      transformedOperation: transformedOp,
      newVersion: doc.version,
      acknowledgedOperation: operation,
    };
  }

  /**
   * Transform operation (OT algorithm)
   * This is a simplified implementation - production would use a full OT library
   */
  private transformOperation(
    clientOp: CollaborativeOperation,
    serverOp: CollaborativeOperation
  ): CollaborativeOperation {
    // If both are inserts
    if (clientOp.type === 'insert' && serverOp.type === 'insert') {
      if (serverOp.position! <= clientOp.position!) {
        // Server insert is before client insert, shift client position
        return {
          ...clientOp,
          position: clientOp.position! + (serverOp.text?.length || 0),
        };
      }
    }

    // If client insert and server delete
    if (clientOp.type === 'insert' && serverOp.type === 'delete') {
      if (serverOp.position! < clientOp.position!) {
        // Delete before insert, shift insert position
        const shift = Math.min(serverOp.length!, clientOp.position! - serverOp.position!);
        return {
          ...clientOp,
          position: clientOp.position! - shift,
        };
      }
    }

    // If client delete and server insert
    if (clientOp.type === 'delete' && serverOp.type === 'insert') {
      if (serverOp.position! <= clientOp.position!) {
        return {
          ...clientOp,
          position: clientOp.position! + (serverOp.text?.length || 0),
        };
      }
    }

    // If both are deletes
    if (clientOp.type === 'delete' && serverOp.type === 'delete') {
      if (serverOp.position! < clientOp.position!) {
        const shift = Math.min(serverOp.length!, clientOp.position! - serverOp.position!);
        return {
          ...clientOp,
          position: clientOp.position! - shift,
        };
      }
    }

    return clientOp;
  }

  /**
   * Apply operation to content
   */
  private applyOperationToContent(content: string, operation: CollaborativeOperation): string {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) + operation.text! + content.slice(operation.position)
        );

      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position! + operation.length!)
        );

      case 'retain':
        return content;

      default:
        return content;
    }
  }

  /**
   * Acquire lock on document/element
   */
  async acquireLock(
    documentId: string,
    elementId: string | undefined,
    userId: string,
    displayName: string,
    duration = config.collaboration.lockDefaultTtl
  ): Promise<LockResult> {
    const redis = getRedisClient();
    const lockKey = elementId
      ? RedisKeys.elementLock(documentId, elementId)
      : RedisKeys.documentLock(documentId);

    const existingLock = await redis.get(lockKey);

    if (existingLock) {
      const lock: DocumentLock = JSON.parse(existingLock);

      // Check if lock has expired
      if (new Date(lock.expiresAt) > new Date()) {
        return {
          acquired: false,
          currentHolder: { userId: lock.userId, displayName: lock.displayName },
          expiresAt: new Date(lock.expiresAt),
        };
      }
    }

    // Acquire lock
    const lockId = `lock_${nanoid()}`;
    const expiresAt = new Date(Date.now() + duration);

    const lock: DocumentLock = {
      lockId,
      userId,
      displayName,
      elementId,
      acquiredAt: new Date(),
      expiresAt,
    };

    await redis.setex(lockKey, Math.ceil(duration / 1000), JSON.stringify(lock));

    console.log(
      `[Room] Lock acquired on ${documentId}${elementId ? `:${elementId}` : ''} by ${userId}`
    );

    return {
      acquired: true,
      lockId,
      expiresAt,
    };
  }

  /**
   * Release lock
   */
  async releaseLock(
    documentId: string,
    elementId: string | undefined,
    lockId: string,
    userId: string
  ): Promise<boolean> {
    const redis = getRedisClient();
    const lockKey = elementId
      ? RedisKeys.elementLock(documentId, elementId)
      : RedisKeys.documentLock(documentId);

    const existingLock = await redis.get(lockKey);

    if (!existingLock) {
      return true; // Already released
    }

    const lock: DocumentLock = JSON.parse(existingLock);

    // Verify ownership
    if (lock.lockId !== lockId || lock.userId !== userId) {
      return false;
    }

    await redis.del(lockKey);
    console.log(
      `[Room] Lock released on ${documentId}${elementId ? `:${elementId}` : ''} by ${userId}`
    );

    return true;
  }

  /**
   * Get current analytics for a class
   */
  async getCurrentAnalytics(classId: string): Promise<Record<string, unknown>> {
    // TODO: Integrate with analytics-svc via event bus
    // For now, return mock data
    return {
      activeSessions: 5,
      averageProgress: 68,
      recentProgress: [],
      topPerformers: [],
      needsAttention: [],
    };
  }

  /**
   * Get member count for a room
   */
  private async getMemberCount(roomId: string): Promise<number> {
    const redis = getRedisClient();
    return await redis.hlen(RedisKeys.roomMembers(roomId));
  }

  /**
   * Update room metadata
   */
  private async updateRoomMetadata(
    roomId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const redis = getRedisClient();
    await redis.hset(RedisKeys.roomMetadata(roomId), {
      ...metadata,
      updatedAt: new Date().toISOString(),
    });
    await redis.expire(RedisKeys.roomMetadata(roomId), config.room.ttl);
  }

  /**
   * Cleanup empty room
   */
  private async cleanupRoom(roomId: string): Promise<void> {
    const redis = getRedisClient();
    await Promise.all([
      redis.del(RedisKeys.roomMembers(roomId)),
      redis.del(RedisKeys.roomState(roomId)),
      redis.del(RedisKeys.roomMetadata(roomId)),
      redis.del(RedisKeys.roomMessages(roomId)),
    ]);

    console.log(`[Room] Cleaned up room ${roomId}`);
  }
}
