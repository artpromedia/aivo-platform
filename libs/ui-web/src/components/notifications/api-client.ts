/**
 * Notification API Client
 *
 * Client for interacting with the notification service.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  groupKey?: string;
  createdAt: Date;
}

export interface NotificationPreferences {
  enabled: boolean;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  digest: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    time: string;
  };
  types: Record<string, {
    enabled: boolean;
    channels?: {
      inApp?: boolean;
      push?: boolean;
      email?: boolean;
    };
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NotificationFilters {
  types?: string[];
  isRead?: boolean;
  priority?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export class NotificationApiClient {
  private baseUrl: string;
  private getAuthToken: () => Promise<string>;

  constructor(baseUrl: string, getAuthToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IN-APP NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get paginated list of notifications
   */
  async getNotifications(
    page: number = 1,
    pageSize: number = 20,
    filters?: NotificationFilters
  ): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters?.types?.length) {
      params.set('types', filters.types.join(','));
    }
    if (filters?.isRead !== undefined) {
      params.set('isRead', filters.isRead.toString());
    }
    if (filters?.priority) {
      params.set('priority', filters.priority);
    }

    return this.request<PaginatedResponse<Notification>>(
      `/notifications/in-app?${params.toString()}`
    );
  }

  /**
   * Get single notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification> {
    return this.request<Notification>(`/notifications/in-app/${notificationId}`);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/in-app/unread-count');
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(): Promise<Record<string, Notification[]>> {
    return this.request<Record<string, Notification[]>>(
      '/notifications/in-app/grouped'
    );
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.request<Notification>(
      `/notifications/in-app/${notificationId}/read`,
      { method: 'POST' }
    );
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(notificationIds: string[]): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/in-app/read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/in-app/read-all', {
      method: 'POST',
    });
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId: string): Promise<Notification> {
    return this.request<Notification>(
      `/notifications/in-app/${notificationId}/dismiss`,
      { method: 'POST' }
    );
  }

  /**
   * Dismiss all notifications
   */
  async dismissAll(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/in-app/dismiss-all', {
      method: 'POST',
    });
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string): Promise<void> {
    await this.request<void>(`/notifications/in-app/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences');
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUSH NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Register device token for push notifications
   */
  async registerDevice(
    token: string,
    platform: 'web' | 'ios' | 'android'
  ): Promise<{ deviceId: string }> {
    return this.request<{ deviceId: string }>('/notifications/devices', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    await this.request<void>(`/notifications/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get registered devices
   */
  async getDevices(): Promise<{ id: string; platform: string; lastActive: Date }[]> {
    return this.request<{ id: string; platform: string; lastActive: Date }[]>(
      '/notifications/devices'
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseNotificationsOptions {
  client: NotificationApiClient;
  pollInterval?: number;
  filters?: NotificationFilters;
  pageSize?: number;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing notifications
 */
export function useNotifications({
  client,
  pollInterval = 30000,
  filters = {},
  pageSize = 20,
}: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const [notificationsResponse, unreadResponse] = await Promise.all([
        client.getNotifications(pageNum, pageSize, filters),
        client.getUnreadCount(),
      ]);

      setNotifications((prev) =>
        append ? [...prev, ...notificationsResponse.data] : notificationsResponse.data
      );
      setTotalCount(notificationsResponse.total);
      setHasMore(notificationsResponse.hasMore);
      setUnreadCount(unreadResponse.count);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setIsLoading(false);
    }
  }, [client, filters, pageSize]);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();

    if (pollInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchNotifications();
      }, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications, pollInterval]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchNotifications(page + 1, true);
    }
  }, [fetchNotifications, hasMore, isLoading, page]);

  const markAsRead = useCallback(async (id: string) => {
    await client.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [client]);

  const markAllAsRead = useCallback(async () => {
    await client.markAllAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);
  }, [client]);

  const dismiss = useCallback(async (id: string) => {
    await client.dismiss(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotalCount((prev) => prev - 1);
  }, [client]);

  const deleteNotification = useCallback(async (id: string) => {
    await client.delete(id);
    const notification = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotalCount((prev) => prev - 1);
    if (notification && !notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [client, notifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    dismiss,
    deleteNotification,
    refresh,
  };
}
