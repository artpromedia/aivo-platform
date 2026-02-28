/**
 * Notifications Page (full list)
 *
 * Paginated list of all notifications with type filters,
 * mark-read actions, and click-to-navigate.
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import {
  useNotifications,
  useMarkNotificationsRead,
  getNotificationRoute,
  type Notification,
} from '@/hooks/use-notifications';

/* ─── constants ───────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  submission: 'Submissions',
  message: 'Messages',
  reminder: 'Reminders',
  alert: 'Alerts',
  system: 'System',
  achievement: 'Achievements',
  iep_reminder: 'IEP',
  session_complete: 'Sessions',
};

/* ─── helpers ─────────────────────────────────────────────────────────── */

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function typeIcon(type: string) {
  const lc = type.toLowerCase();
  if (lc.includes('submission') || lc.includes('assignment')) return '📝';
  if (lc.includes('message')) return '💬';
  if (lc.includes('reminder') || lc.includes('iep')) return '🔔';
  if (lc.includes('alert')) return '⚠️';
  if (lc.includes('achievement')) return '🏆';
  if (lc.includes('session')) return '🖥️';
  return '📋';
}

/* ─── component ───────────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, isLoading, error } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [filter, setFilter] = React.useState<string>('all');

  /* derived lists */
  const types = React.useMemo(() => {
    const set = new Set(notifications.map((n) => n.type.toLowerCase()));
    return Array.from(set).sort();
  }, [notifications]);

  const filtered = React.useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.type.toLowerCase() === filter);
  }, [notifications, filter]);

  /* handlers */
  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead.mutate([n.id]);
    const url = n.actionUrl || getNotificationRoute(n.type, n.actionData);
    router.push(url);
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length) markRead.mutate(unreadIds);
  };

  /* ── render ────────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Failed to load notifications. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" description="All your alerts and updates in one place" />

      {/* ── toolbar ──────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({notifications.length})
          </FilterChip>
          <FilterChip active={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread ({notifications.filter((n) => !n.isRead).length})
          </FilterChip>
          {types.map((t) => (
            <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {TYPE_LABELS[t] ?? t}
            </FilterChip>
          ))}
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={!notifications.some((n) => !n.isRead)}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      {/* ── list ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="mt-10 text-center text-gray-500">
          <p className="text-4xl">🔔</p>
          <p className="mt-2 text-sm">No notifications to show.</p>
        </div>
      ) : (
        <div className="mt-4 divide-y rounded-xl border bg-white">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-gray-50 ${
                !n.isRead ? 'bg-blue-50/40' : ''
              }`}
            >
              <span className="mt-0.5 text-xl">{typeIcon(n.type)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{n.body}</p>
                <p className="mt-1 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── FilterChip ──────────────────────────────────────────────────────── */

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'border bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
