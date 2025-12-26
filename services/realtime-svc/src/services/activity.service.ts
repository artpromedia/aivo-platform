/**
 * Activity Feed Service
 *
 * Manages real-time activity feeds with:
 * - Multi-scope activity tracking (user, class, tenant, global)
 * - Activity aggregation
 * - Read/unread tracking
 * - Activity search and filtering
 */

import { nanoid } from 'nanoid';
import { getRedisClient, RedisKeys } from '../redis/index.js';

/**
 * Activity types
 */
export type ActivityType =
  | 'lesson.created'
  | 'lesson.updated'
  | 'lesson.published'
  | 'lesson.completed'
  | 'assessment.created'
  | 'assessment.submitted'
  | 'assessment.graded'
  | 'class.joined'
  | 'class.left'
  | 'comment.added'
  | 'comment.resolved'
  | 'achievement.earned'
  | 'badge.awarded'
  | 'goal.completed'
  | 'collaboration.started'
  | 'collaboration.ended'
  | 'user.online'
  | 'user.offline'
  | 'system.announcement';

/**
 * Activity scope
 */
export type ActivityScope = 'user' | 'class' | 'tenant' | 'global';

/**
 * Activity item
 */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  scope: ActivityScope;
  scopeId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  message: string;
  data?: Record<string, unknown>;
  metadata?: {
    url?: string;
    icon?: string;
    color?: string;
  };
  createdAt: Date;
}

/**
 * Activity aggregation
 */
export interface AggregatedActivity {
  type: ActivityType;
  count: number;
  actors: Array<{ id: string; name: string; avatarUrl?: string }>;
  latestMessage: string;
  latestTimestamp: Date;
}

/**
 * Activity subscription
 */
export interface ActivitySubscription {
  userId: string;
  scopes: ActivityScope[];
  scopeIds: string[];
}

/**
 * Activity Feed Service
 */
export class ActivityService {
  private readonly MAX_ACTIVITIES = 1000;
  private readonly ACTIVITY_TTL = 86400 * 30; // 30 days
  private readonly AGGREGATION_WINDOW = 3600; // 1 hour in seconds

  /**
   * Record an activity
   */
  async recordActivity(
    type: ActivityType,
    scope: ActivityScope,
    scopeId: string,
    actor: { id: string; name: string; avatarUrl?: string },
    message: string,
    options?: {
      targetType?: string;
      targetId?: string;
      targetName?: string;
      data?: Record<string, unknown>;
      metadata?: ActivityItem['metadata'];
    }
  ): Promise<ActivityItem> {
    const redis = getRedisClient();
    const activityId = nanoid(12);

    const activity: ActivityItem = {
      id: activityId,
      type,
      scope,
      scopeId,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatarUrl: actor.avatarUrl,
      targetType: options?.targetType,
      targetId: options?.targetId,
      targetName: options?.targetName,
      message,
      data: options?.data,
      metadata: options?.metadata,
      createdAt: new Date(),
    };

    // Store in scope-specific feed
    const feedKey = this.getFeedKey(scope, scopeId);
    await redis.lpush(feedKey, JSON.stringify(activity));
    await redis.ltrim(feedKey, 0, this.MAX_ACTIVITIES - 1);
    await redis.expire(feedKey, this.ACTIVITY_TTL);

    // Store individual activity for quick lookup
    await redis.setex(
      `activity:${activityId}`,
      this.ACTIVITY_TTL,
      JSON.stringify(activity)
    );

    // Update aggregation
    await this.updateAggregation(scope, scopeId, activity);

    console.log(`[Activity] Recorded ${type} activity in ${scope}:${scopeId}`);
    return activity;
  }

  /**
   * Get activities for a scope
   */
  async getActivities(
    scope: ActivityScope,
    scopeId: string,
    options?: {
      limit?: number;
      before?: string;
      types?: ActivityType[];
    }
  ): Promise<ActivityItem[]> {
    const redis = getRedisClient();
    const feedKey = this.getFeedKey(scope, scopeId);
    const limit = options?.limit || 50;

    let activities: string[];

    if (options?.before) {
      // Get activities before a specific activity
      const allActivities = await redis.lrange(feedKey, 0, -1);
      const beforeIndex = allActivities.findIndex((a) => {
        const activity = JSON.parse(a);
        return activity.id === options.before;
      });

      if (beforeIndex > -1) {
        activities = allActivities.slice(beforeIndex + 1, beforeIndex + 1 + limit);
      } else {
        activities = [];
      }
    } else {
      activities = await redis.lrange(feedKey, 0, limit - 1);
    }

    let result = activities.map((a) => JSON.parse(a) as ActivityItem);

    // Filter by types if specified
    if (options?.types?.length) {
      result = result.filter((a) => options.types!.includes(a.type));
    }

    return result;
  }

  /**
   * Get aggregated activities
   */
  async getAggregatedActivities(
    scope: ActivityScope,
    scopeId: string,
    options?: {
      limit?: number;
      types?: ActivityType[];
    }
  ): Promise<AggregatedActivity[]> {
    const redis = getRedisClient();
    const aggKey = `activity:agg:${scope}:${scopeId}`;
    const limit = options?.limit || 20;

    const data = await redis.hgetall(aggKey);
    let aggregations: AggregatedActivity[] = [];

    for (const [type, value] of Object.entries(data)) {
      aggregations.push(JSON.parse(value));
    }

    // Sort by latest timestamp
    aggregations.sort(
      (a, b) =>
        new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );

    // Filter by types if specified
    if (options?.types?.length) {
      aggregations = aggregations.filter((a) =>
        options.types!.includes(a.type as ActivityType)
      );
    }

    return aggregations.slice(0, limit);
  }

  /**
   * Get activity by ID
   */
  async getActivity(activityId: string): Promise<ActivityItem | null> {
    const redis = getRedisClient();
    const data = await redis.get(`activity:${activityId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get user's activity feed (combined from all subscribed scopes)
   */
  async getUserFeed(
    userId: string,
    subscriptions: ActivitySubscription[],
    options?: {
      limit?: number;
      types?: ActivityType[];
    }
  ): Promise<ActivityItem[]> {
    const limit = options?.limit || 50;
    const allActivities: ActivityItem[] = [];

    // Gather activities from all subscribed scopes
    for (const sub of subscriptions) {
      for (const scopeId of sub.scopeIds) {
        for (const scope of sub.scopes) {
          const activities = await this.getActivities(scope, scopeId, {
            limit: Math.ceil(limit / subscriptions.length),
            types: options?.types,
          });
          allActivities.push(...activities);
        }
      }
    }

    // Sort by timestamp and deduplicate
    const seen = new Set<string>();
    return allActivities
      .filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Mark activity as read
   */
  async markAsRead(userId: string, activityId: string): Promise<void> {
    const redis = getRedisClient();
    const key = `activity:read:${userId}`;

    await redis.sadd(key, activityId);
    await redis.expire(key, this.ACTIVITY_TTL);
  }

  /**
   * Mark all activities as read
   */
  async markAllAsRead(
    userId: string,
    scope: ActivityScope,
    scopeId: string
  ): Promise<void> {
    const redis = getRedisClient();
    const readKey = `activity:read:${userId}`;
    const timestampKey = `activity:read:timestamp:${userId}:${scope}:${scopeId}`;

    await redis.set(timestampKey, new Date().toISOString());
    await redis.expire(timestampKey, this.ACTIVITY_TTL);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(
    userId: string,
    scope: ActivityScope,
    scopeId: string
  ): Promise<number> {
    const redis = getRedisClient();
    const readKey = `activity:read:${userId}`;
    const timestampKey = `activity:read:timestamp:${userId}:${scope}:${scopeId}`;

    const lastReadTimestamp = await redis.get(timestampKey);
    const activities = await this.getActivities(scope, scopeId, { limit: 100 });

    if (!lastReadTimestamp) {
      // Count all except user's own activities
      return activities.filter((a) => a.actorId !== userId).length;
    }

    const lastRead = new Date(lastReadTimestamp);
    return activities.filter(
      (a) => a.actorId !== userId && new Date(a.createdAt) > lastRead
    ).length;
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: string): Promise<boolean> {
    const redis = getRedisClient();
    const activity = await this.getActivity(activityId);

    if (!activity) {
      return false;
    }

    // Remove from individual key
    await redis.del(`activity:${activityId}`);

    // Note: We don't remove from feed lists for performance
    // Activities will naturally expire

    console.log(`[Activity] Deleted activity ${activityId}`);
    return true;
  }

  /**
   * Clear activities for a scope
   */
  async clearActivities(scope: ActivityScope, scopeId: string): Promise<void> {
    const redis = getRedisClient();
    const feedKey = this.getFeedKey(scope, scopeId);
    const aggKey = `activity:agg:${scope}:${scopeId}`;

    await redis.del(feedKey, aggKey);
    console.log(`[Activity] Cleared activities for ${scope}:${scopeId}`);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getFeedKey(scope: ActivityScope, scopeId: string): string {
    return `activity:feed:${scope}:${scopeId}`;
  }

  private async updateAggregation(
    scope: ActivityScope,
    scopeId: string,
    activity: ActivityItem
  ): Promise<void> {
    const redis = getRedisClient();
    const aggKey = `activity:agg:${scope}:${scopeId}`;

    const existingStr = await redis.hget(aggKey, activity.type);
    let aggregation: AggregatedActivity;

    if (existingStr) {
      aggregation = JSON.parse(existingStr);

      // Check if within aggregation window
      const lastTimestamp = new Date(aggregation.latestTimestamp);
      const now = new Date();
      const diff = (now.getTime() - lastTimestamp.getTime()) / 1000;

      if (diff < this.AGGREGATION_WINDOW) {
        // Update existing aggregation
        aggregation.count++;
        aggregation.latestMessage = activity.message;
        aggregation.latestTimestamp = now;

        // Add actor if not already present
        if (!aggregation.actors.find((a) => a.id === activity.actorId)) {
          aggregation.actors.push({
            id: activity.actorId,
            name: activity.actorName,
            avatarUrl: activity.actorAvatarUrl,
          });
          // Keep only last 5 actors
          if (aggregation.actors.length > 5) {
            aggregation.actors = aggregation.actors.slice(-5);
          }
        }
      } else {
        // Start new aggregation
        aggregation = this.createAggregation(activity);
      }
    } else {
      // Create new aggregation
      aggregation = this.createAggregation(activity);
    }

    await redis.hset(aggKey, activity.type, JSON.stringify(aggregation));
    await redis.expire(aggKey, this.ACTIVITY_TTL);
  }

  private createAggregation(activity: ActivityItem): AggregatedActivity {
    return {
      type: activity.type,
      count: 1,
      actors: [
        {
          id: activity.actorId,
          name: activity.actorName,
          avatarUrl: activity.actorAvatarUrl,
        },
      ],
      latestMessage: activity.message,
      latestTimestamp: new Date(),
    };
  }
}

// Export singleton instance
export const activityService = new ActivityService();
