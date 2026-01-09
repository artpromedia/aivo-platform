/**
 * Presence Service
 *
 * Manages user presence with Redis-backed storage for scalability.
 * Supports:
 * - Online/offline status tracking
 * - Heartbeat-based presence validation
 * - Room-based presence queries
 * - Grace period for reconnection handling
 */

import { config } from '../config.js';
import { logger } from '../logger.js';
import { getRedisClient, RedisKeys } from '../redis/index.js';
import type { UserPresence, PresenceEntry, UserStatus, PresenceUpdatePayload } from '../types.js';

/**
 * Options for setting user offline
 */
interface OfflineOptions {
  gracePeriod?: number;
}

/**
 * Presence Service
 */
export class PresenceService {
  private readonly serverId: string;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.serverId = `server_${process.pid}_${Date.now()}`;
    this.startCleanupJob();
  }

  /**
   * Set user as online
   */
  async setOnline(
    userId: string,
    tenantId: string,
    presence: Omit<UserPresence, 'status'> & { status?: UserStatus }
  ): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);

    const fullPresence: UserPresence = {
      ...presence,
      status: presence.status || 'online',
    };

    const entry: PresenceEntry = {
      presence: fullPresence,
      expiresAt: Date.now() + config.presence.ttl * 1000,
      serverId: this.serverId,
    };

    await redis.setex(key, config.presence.ttl, JSON.stringify(entry));

    // Add to tenant's online users set
    await redis.sadd(RedisKeys.tenantOnline(tenantId), userId);

    // Add to sorted set for efficient queries
    await redis.zadd(RedisKeys.presenceSorted(tenantId), Date.now(), userId);

    logger.info({ userId, tenantId }, 'User set online');
  }

  /**
   * Set user as offline (with optional grace period)
   */
  async setOffline(userId: string, tenantId: string, options?: OfflineOptions): Promise<void> {
    const redis = getRedisClient();

    if (options?.gracePeriod) {
      // Set a delayed offline using Redis TTL
      const key = RedisKeys.presence(tenantId, userId);
      const entryStr = await redis.get(key);

      if (entryStr) {
        const entry = JSON.parse(entryStr) as PresenceEntry;
        entry.presence.status = 'offline';
        entry.expiresAt = Date.now() + options.gracePeriod;

        await redis.setex(key, Math.ceil(options.gracePeriod / 1000), JSON.stringify(entry));
      }
    } else {
      await this.removePresence(userId, tenantId);
    }

    logger.info({ userId, tenantId }, 'User set offline');
  }

  /**
   * Update user presence
   */
  async updatePresence(
    userId: string,
    tenantId: string,
    updates: Partial<PresenceUpdatePayload>
  ): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);
    const entryStr = await redis.get(key);

    if (entryStr) {
      const entry = JSON.parse(entryStr) as PresenceEntry;
      entry.presence = {
        ...entry.presence,
        ...updates,
        lastSeen: new Date(),
      };
      entry.expiresAt = Date.now() + config.presence.ttl * 1000;

      await redis.setex(key, config.presence.ttl, JSON.stringify(entry));

      // Update sorted set timestamp
      await redis.zadd(RedisKeys.presenceSorted(tenantId), Date.now(), userId);
    }
  }

  /**
   * Heartbeat to keep presence alive
   */
  async heartbeat(userId: string, tenantId: string): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);
    const entryStr = await redis.get(key);

    if (entryStr) {
      const entry = JSON.parse(entryStr) as PresenceEntry;
      entry.presence.lastSeen = new Date();
      entry.expiresAt = Date.now() + config.presence.ttl * 1000;

      await redis.setex(key, config.presence.ttl, JSON.stringify(entry));

      // Update sorted set
      await redis.zadd(RedisKeys.presenceSorted(tenantId), Date.now(), userId);
    }
  }

  /**
   * Get presence for specific users
   */
  async getPresence(userIds: string[], tenantId: string): Promise<UserPresence[]> {
    const redis = getRedisClient();
    const keys = userIds.map((id) => RedisKeys.presence(tenantId, id));

    if (keys.length === 0) {
      return [];
    }

    const entries = await redis.mget(...keys);

    return entries
      .filter((entry): entry is string => entry !== null)
      .map((entry) => {
        const parsed = JSON.parse(entry) as PresenceEntry;
        return parsed.presence;
      });
  }

  /**
   * Get all online users in a tenant
   */
  async getTenantOnlineUsers(tenantId: string): Promise<UserPresence[]> {
    const redis = getRedisClient();
    const userIds = await redis.smembers(RedisKeys.tenantOnline(tenantId));

    if (userIds.length === 0) {
      return [];
    }

    return this.getPresence(userIds, tenantId);
  }

  /**
   * Get presence for users in a room
   */
  async getRoomPresence(roomId: string): Promise<UserPresence[]> {
    const redis = getRedisClient();
    const memberData = await redis.hgetall(RedisKeys.roomMembers(roomId));

    if (!memberData || Object.keys(memberData).length === 0) {
      return [];
    }

    const presences: UserPresence[] = [];

    for (const data of Object.values(memberData)) {
      try {
        const member = JSON.parse(data);
        const tenantId = member.tenantId;
        if (tenantId) {
          const presence = await this.getUserPresence(member.userId, tenantId);
          if (presence) {
            presences.push(presence);
          }
        }
      } catch {
        // Skip invalid entries
      }
    }

    return presences;
  }

  /**
   * Get single user presence
   */
  async getUserPresence(userId: string, tenantId: string): Promise<UserPresence | null> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);
    const entryStr = await redis.get(key);

    if (!entryStr) {
      return null;
    }

    const entry = JSON.parse(entryStr) as PresenceEntry;
    return entry.presence;
  }

  /**
   * Check if user is online
   */
  async isOnline(userId: string, tenantId: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);
    return (await redis.exists(key)) === 1;
  }

  /**
   * Get online user count for tenant
   */
  async getOnlineCount(tenantId: string): Promise<number> {
    const redis = getRedisClient();
    return await redis.scard(RedisKeys.tenantOnline(tenantId));
  }

  /**
   * Get recently active users (for "who's typing" etc.)
   */
  async getRecentlyActiveUsers(tenantId: string, withinMs = 30000): Promise<string[]> {
    const redis = getRedisClient();
    const cutoff = Date.now() - withinMs;

    return await redis.zrangebyscore(RedisKeys.presenceSorted(tenantId), cutoff, '+inf');
  }

  /**
   * Bulk check online status
   */
  async bulkIsOnline(userIds: string[], tenantId: string): Promise<Map<string, boolean>> {
    const redis = getRedisClient();
    const result = new Map<string, boolean>();
    const pipeline = redis.pipeline();

    for (const userId of userIds) {
      pipeline.exists(RedisKeys.presence(tenantId, userId));
    }

    const results = await pipeline.exec();

    userIds.forEach((userId, index) => {
      const res = results?.[index];
      result.set(userId, res?.[1] === 1);
    });

    return result;
  }

  /**
   * Remove user presence
   */
  private async removePresence(userId: string, tenantId: string): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.presence(tenantId, userId);

    await Promise.all([
      redis.del(key),
      redis.srem(RedisKeys.tenantOnline(tenantId), userId),
      redis.zrem(RedisKeys.presenceSorted(tenantId), userId),
    ]);
  }

  /**
   * Start cleanup job for stale presences
   */
  private startCleanupJob(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupStalePresences();
      } catch (error) {
        logger.error({ err: error }, 'Presence cleanup error');
      }
    }, config.presence.cleanupInterval);
  }

  /**
   * Cleanup stale presences
   */
  private async cleanupStalePresences(): Promise<void> {
    // Note: In production, you'd use Redis SCAN to find all presence keys
    // and remove those that have expired but weren't cleaned up
    logger.debug('Running presence cleanup job');
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
