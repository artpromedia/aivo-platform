/**
 * Notification Hooks
 *
 * React Query hooks for fetching and managing teacher notifications.
 * Wired to /api/notifications proxy routes → notify-svc.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  imageUrl?: string;
  priority?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface UnreadCountResponse {
  count: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPE → ROUTE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

const NOTIFICATION_ROUTES: Record<string, (data?: Record<string, unknown>) => string> = {
  submission: (d) => d?.assignmentId ? `/assignments/${d.assignmentId}` : '/assignments',
  SUBMISSION: (d) => d?.assignmentId ? `/assignments/${d.assignmentId}` : '/assignments',
  message: (d) => d?.conversationId ? `/messages?conversation=${d.conversationId}` : '/messages',
  MESSAGE: (d) => d?.conversationId ? `/messages?conversation=${d.conversationId}` : '/messages',
  reminder: () => '/gradebook',
  REMINDER: () => '/gradebook',
  alert: (d) => d?.studentId ? `/students/${d.studentId}` : '/students',
  ALERT: (d) => d?.studentId ? `/students/${d.studentId}` : '/students',
  system: () => '/reports',
  SYSTEM: () => '/reports',
  iep_reminder: () => '/iep',
  IEP_REMINDER: () => '/iep',
  session_complete: () => '/monitoring',
  SESSION_COMPLETE: () => '/monitoring',
  ACHIEVEMENT: () => '/achievements',
  achievement: () => '/achievements',
};

export function getNotificationRoute(type: string, actionData?: Record<string, unknown>): string {
  const resolver = NOTIFICATION_ROUTES[type];
  return resolver ? resolver(actionData) : '/notifications';
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json() as Promise<NotificationsResponse>;
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count');
  if (!res.ok) throw new Error('Failed to fetch unread count');
  const data = (await res.json()) as UnreadCountResponse;
  return data.count;
}

async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationIds }),
  });
  if (!res.ok) throw new Error('Failed to mark notifications as read');
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch the notification list for the current teacher.
 */
export function useNotifications() {
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // refetch list every 60s
  });

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch only the unread notification count.
 * Polls every 30 seconds for badge updates.
 */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 15_000, // 15 seconds
    refetchInterval: 30_000, // poll every 30s
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
  };
}

/**
 * Mutation hook to mark notifications as read.
 * Invalidates both the notification list and unread count queries.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

/**
 * Hook that returns a handler to navigate to the correct route for a notification.
 */
export function useNotificationNavigate() {
  const router = useRouter();

  return (notification: Notification) => {
    // Use the notification's own actionUrl if set, otherwise resolve from type
    const url =
      notification.actionUrl ||
      getNotificationRoute(notification.type, notification.actionData);
    router.push(url);
  };
}
