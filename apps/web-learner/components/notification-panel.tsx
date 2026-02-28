'use client';

import { Bell, BellOff, Check, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { useNotifications, useMarkNotificationsRead } from '@/lib/hooks/use-learner-api';
import type { LearnerNotification } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  achievement_earned: '🏆',
  streak_reminder: '🔥',
  goal_completed: '🎯',
  new_lesson_available: '📚',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Notification item ──────────────────────────────────────

function NotificationItem({ notification }: { notification: LearnerNotification }) {
  const emoji = notification.emoji || TYPE_EMOJI[notification.type] || '📣';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <span className="mt-0.5 text-lg shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
      )}
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  // Click-outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const notifications = data?.notifications ?? [];
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  function handleMarkAllRead() {
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {unreadIds.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markRead.isPending}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {markRead.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <BellOff className="h-8 w-8" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
