/**
 * useActivity Hook
 *
 * Real-time activity feed with:
 * - Multi-scope activities (user, class, tenant, global)
 * - Aggregation support
 * - Unread tracking
 */

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type { ActivityItem, ActivityScope, ActivityType } from '../types';

interface UseActivityOptions {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  userId: string;
  scopes: ActivityScope[];
  scopeIds?: Record<ActivityScope, string>;
  types?: ActivityType[];
  pageSize?: number;
}

interface UseActivityResult {
  activities: ActivityItem[];
  aggregatedActivities: AggregatedActivity[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  markAsRead: (activityId: string) => void;
  markAllAsRead: () => void;
  subscribe: (scope: ActivityScope, scopeId: string) => void;
  unsubscribe: (scope: ActivityScope, scopeId: string) => void;
}

interface AggregatedActivity {
  id: string;
  type: ActivityType;
  count: number;
  actorNames: string[];
  latestMessage: string;
  targetId?: string;
  targetName?: string;
  firstAt: Date;
  lastAt: Date;
}

export function useActivity(options: UseActivityOptions): UseActivityResult {
  const { socket, userId, scopes, scopeIds = {}, types, pageSize = 20 } = options;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [aggregatedActivities, setAggregatedActivities] = useState<AggregatedActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load more activities
  const loadMore = useCallback(async (): Promise<void> => {
    if (!socket?.connected || isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    const oldestId = activities.length > 0 ? activities[activities.length - 1].id : undefined;

    return new Promise((resolve, reject) => {
      socket.emit(
        'activity:get',
        {
          userId,
          scopes,
          scopeIds,
          types,
          before: oldestId,
          limit: pageSize,
        },
        (response: {
          success: boolean;
          activities?: ActivityItem[];
          hasMore?: boolean;
          error?: string;
        }) => {
          setIsLoading(false);

          if (response.success && response.activities) {
            // Parse dates
            const newActivities = response.activities.map((a) => ({
              ...a,
              createdAt: new Date(a.createdAt),
            }));

            setActivities((prev) => [...prev, ...newActivities]);
            setHasMore(response.hasMore ?? false);
            resolve();
          } else {
            const errorMsg = response.error || 'Failed to load activities';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        }
      );
    });
  }, [socket, userId, scopes, scopeIds, types, activities, isLoading, hasMore, pageSize]);

  // Mark a single activity as read
  const markAsRead = useCallback(
    (activityId: string) => {
      if (!socket?.connected) return;

      socket.emit('activity:read', { activityId, userId });

      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, read: true } : a)));

      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [socket, userId]
  );

  // Mark all activities as read
  const markAllAsRead = useCallback(() => {
    if (!socket?.connected) return;

    socket.emit('activity:read-all', { userId, scopes, scopeIds });

    setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
  }, [socket, userId, scopes, scopeIds]);

  // Subscribe to a scope
  const subscribe = useCallback(
    (scope: ActivityScope, scopeId: string) => {
      if (!socket?.connected) return;

      socket.emit('activity:subscribe', { scope, scopeId, userId });
    },
    [socket, userId]
  );

  // Unsubscribe from a scope
  const unsubscribe = useCallback(
    (scope: ActivityScope, scopeId: string) => {
      if (!socket?.connected) return;

      socket.emit('activity:unsubscribe', { scope, scopeId, userId });
    },
    [socket, userId]
  );

  // Aggregate activities by type and target
  const aggregateActivities = useCallback((items: ActivityItem[]): AggregatedActivity[] => {
    const groups = new Map<string, ActivityItem[]>();

    // Group by type and target within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    items.forEach((item) => {
      if (new Date(item.createdAt) < oneHourAgo) return;

      const key = `${item.type}-${item.targetId || 'none'}`;
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    });

    // Create aggregated items
    const aggregated: AggregatedActivity[] = [];

    groups.forEach((group, _key) => {
      if (group.length === 0) return;

      const sorted = group.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const latest = sorted[0];
      const actorNames = [...new Set(group.map((g) => g.actorName))].slice(0, 3);

      aggregated.push({
        id: latest.id,
        type: latest.type,
        count: group.length,
        actorNames,
        latestMessage: latest.message,
        targetId: latest.targetId,
        targetName: latest.targetName,
        firstAt: new Date(sorted[sorted.length - 1].createdAt),
        lastAt: new Date(latest.createdAt),
      });
    });

    return aggregated.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle new activity
    const handleNewActivity = (activity: ActivityItem) => {
      // Check if activity matches our filters
      const matchesScope = scopes.includes(activity.scope);
      const matchesType = !types || types.includes(activity.type);

      if (!matchesScope || !matchesType) return;

      // Check scope ID if applicable
      if (activity.scope !== 'global') {
        const scopeId = scopeIds[activity.scope];
        if (scopeId && activity.scopeId !== scopeId) return;
      }

      // Parse date
      const parsedActivity = {
        ...activity,
        createdAt: new Date(activity.createdAt),
      };

      // Add to front of list
      setActivities((prev) => {
        // Check for duplicate
        if (prev.some((a) => a.id === activity.id)) {
          return prev;
        }
        return [parsedActivity, ...prev];
      });

      // Update aggregated
      setAggregatedActivities((prev) => {
        const updated = aggregateActivities([parsedActivity, ...activities]);
        return updated;
      });

      // Update unread count if not from current user
      if (activity.actorId !== userId) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('activity:new', handleNewActivity);

    // Subscribe to initial scopes
    scopes.forEach((scope) => {
      const scopeId = scopeIds[scope] || userId;
      socket.emit('activity:subscribe', { scope, scopeId, userId });
    });

    // Load initial activities and unread count
    loadMore().catch(console.error);

    socket.emit(
      'activity:unread-count',
      { userId, scopes, scopeIds },
      (response: { count: number }) => {
        setUnreadCount(response.count);
      }
    );

    return () => {
      socket.off('activity:new', handleNewActivity);

      // Unsubscribe from scopes
      scopes.forEach((scope) => {
        const scopeId = scopeIds[scope] || userId;
        socket.emit('activity:unsubscribe', { scope, scopeId, userId });
      });
    };
  }, [socket, userId, scopes, scopeIds, types, loadMore, aggregateActivities, activities]);

  // Update aggregated activities when activities change
  useEffect(() => {
    setAggregatedActivities(aggregateActivities(activities));
  }, [activities, aggregateActivities]);

  return {
    activities,
    aggregatedActivities,
    unreadCount,
    isLoading,
    hasMore,
    error,
    loadMore,
    markAsRead,
    markAllAsRead,
    subscribe,
    unsubscribe,
  };
}
