/**
 * Notification Center
 *
 * Bell icon dropdown for the top nav / sidebar showing aggregated
 * notifications from compliance, sync, billing, SSO, and IEP sources.
 *
 * Features:
 *  • Unread badge counter
 *  • Category icons + severity colours
 *  • Mark All Read button
 *  • Auto-refresh every 60 s
 *  • Read state persisted in localStorage
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../app/providers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  category: 'compliance' | 'sync' | 'license' | 'sso' | 'iep';
  title: string;
  description: string;
  timestamp: string;
  link: string;
  severity: 'info' | 'warning' | 'error';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'aivo_notification_read_ids';
const POLL_INTERVAL_MS = 60_000;

const CATEGORY_ICONS: Record<Notification['category'], string> = {
  compliance: '📋',
  iep: '📝',
  sync: '🔄',
  license: '💳',
  sso: '🔐',
};

const SEVERITY_BORDER: Record<Notification['severity'], string> = {
  info: 'border-l-blue-400',
  warning: 'border-l-yellow-400',
  error: 'border-l-red-500',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // quota exceeded — ignore
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationCenter({ collapsed }: { collapsed?: boolean }) {
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId ?? '';

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restore read IDs on mount
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?tenantId=${tenantId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: Notification[] };
      setNotifications(data.notifications);
    } catch {
      // Swallow — non-fatal
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Initial load + polling
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, POLL_INTERVAL_MS);
    return () => { clearInterval(interval); };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }
    return undefined;
  }, [open]);

  // Derived
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Actions
  const markAllRead = () => {
    const newIds = new Set(readIds);
    for (const n of notifications) newIds.add(n.id);
    setReadIds(newIds);
    persistReadIds(newIds);
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    const newIds = new Set(readIds);
    newIds.add(id);
    setReadIds(newIds);
    persistReadIds(newIds);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* ── Bell Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(!open); }}
        className={`relative rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-text ${
          collapsed ? 'mx-auto flex justify-center' : ''
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title={collapsed ? 'Notifications' : undefined}
      >
        {/* Bell SVG */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ──────────────────────────────────────────── */}
      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 rounded-xl border border-border bg-surface shadow-xl ${
            collapsed ? 'left-full ml-2 top-0' : 'right-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">
                No new notifications
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.link}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className={`flex gap-3 border-l-4 px-4 py-3 transition-colors hover:bg-surface-muted ${
                          SEVERITY_BORDER[n.severity]
                        } ${isRead ? 'opacity-60' : ''}`}
                      >
                        {/* Category icon */}
                        <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                          {CATEGORY_ICONS[n.category]}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${isRead ? 'text-muted' : 'font-medium text-text'}`}>
                              {n.title}
                            </p>
                            {!isRead && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.description}</p>
                          <p className="mt-1 text-[10px] text-muted/70">{timeAgo(n.timestamp)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2 text-center">
              <button
                onClick={() => {
                  markAllRead();
                  setOpen(false);
                }}
                className="text-xs font-medium text-muted hover:text-text"
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
