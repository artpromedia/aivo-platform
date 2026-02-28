/**
 * Header Component
 *
 * Top navigation bar with search, notifications, and user menu
 *
 * Enterprise UI Audit: RE-AUDIT-AUTH-001
 * - Uses auth context for user data instead of hardcoded values
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { LanguageSwitcher } from '@aivo/i18n';
import { useAuth } from '../shared/providers';

import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationsRead,
  getNotificationRoute,
  type Notification,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const { userName, userInitials, userRole, userEmail } = useAuth();
  const { unreadCount } = useUnreadCount();
  const router = useRouter();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // Use auth context data with fallbacks for display
  const displayName = userName || 'User';
  const displayInitials = userInitials || 'U';
  const displayRole = userRole || 'Teacher';
  const displayEmail = userEmail || 'teacher@school.edu';

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // ⌘K / Ctrl+K keyboard shortcut — focus search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-6',
        className
      )}
    >
      {/* Page Title */}
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold text-text">{title}</h1>}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:block">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search students, classes, assignments..."
            className="w-80 rounded-lg border border-border bg-surface-muted py-2 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-muted">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Add */}
        <QuickAddButton />

        {/* Notifications */}
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="relative rounded-lg p-2 text-muted hover:bg-surface-muted"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationsDropdown
              onClose={() => {
                setShowNotifications(false);
              }}
            />
          )}
        </div>

        {/* User Menu */}
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
              {displayInitials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-text">{displayName}</p>
              <p className="text-xs text-muted">{displayRole}</p>
            </div>
            <svg className="h-4 w-4 text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showUserMenu && (
            <UserMenuDropdown
              onClose={() => {
                setShowUserMenu(false);
              }}
              userName={displayName}
              userEmail={displayEmail}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function QuickAddButton() {
  const [showMenu, setShowMenu] = React.useState(false);

  const quickActions = [
    { label: 'New Assignment', href: '/assignments/new', icon: '📝' },
    { label: 'Add Student', href: '/students/new', icon: '👤' },
    { label: 'Schedule Event', href: '/calendar/new', icon: '📅' },
    { label: 'Send Message', href: '/messages/new', icon: '✉️' },
    { label: 'Create Report', href: '/reports/new', icon: '📊' },
  ];

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <button
        onClick={() => {
          setShowMenu(!showMenu);
        }}
        className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">Quick Add</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => {
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface-muted"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface DropdownProps {
  onClose: () => void;
}

interface UserMenuDropdownProps extends DropdownProps {
  userName: string;
  userEmail: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function NotificationsDropdown({ onClose }: DropdownProps) {
  const router = useRouter();
  const { notifications, isLoading, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const unreadIds = notifications
    .filter((n: Notification) => !n.isRead)
    .map((n: Notification) => n.id);

  const handleMarkAllRead = () => {
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      markRead.mutate([notification.id]);
    }
    const url =
      notification.actionUrl ||
      getNotificationRoute(notification.type, notification.actionData);
    onClose();
    router.push(url);
  };

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-medium text-text">Notifications</h3>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadIds.length === 0 || markRead.isPending}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted">Failed to load notifications</p>
            <button
              onClick={() => void refetch()}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted">No notifications yet</p>
          </div>
        )}

        {/* Notification list */}
        {!isLoading &&
          !error &&
          notifications.map((notification: Notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                'flex w-full gap-3 border-b border-border px-4 py-3 text-left hover:bg-surface-muted',
                !notification.isRead && 'bg-primary-50/50'
              )}
            >
              <div
                className={cn(
                  'mt-1 h-2 w-2 shrink-0 rounded-full',
                  !notification.isRead ? 'bg-primary-600' : 'bg-transparent'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{notification.title}</p>
                <p className="text-sm text-muted line-clamp-2">{notification.body}</p>
                <p className="mt-1 text-xs text-muted/70">
                  {formatTimeAgo(notification.createdAt)}
                </p>
              </div>
            </button>
          ))}
      </div>
      <div className="border-t border-border p-3">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block text-center text-sm text-primary-600 hover:text-primary-700"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

function UserMenuDropdown({ onClose, userName, userEmail }: UserMenuDropdownProps) {
  const { logout } = useAuth();

  const menuItems = [
    { label: 'My Profile', href: '/profile', icon: '👤' },
    { label: 'Account Settings', href: '/settings/account', icon: '⚙️' },
    { label: 'Notification Preferences', href: '/settings/notifications', icon: '🔔' },
    { label: 'Help Center', href: '/help', icon: '❓' },
    { divider: true },
    { label: 'Sign Out', href: '#', icon: '🚪', danger: true, action: logout },
  ];

  return (
    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg">
      <div className="border-b border-border px-4 py-3">
        <p className="font-medium text-text">{userName}</p>
        <p className="text-sm text-muted">{userEmail}</p>
      </div>
      <div className="py-1">
        {menuItems.map((item) => {
          if ('divider' in item) {
            return <div key="menu-divider" className="my-1 border-t" />;
          }
          if ('action' in item && item.action) {
            return (
              <button
                key={item.label}
                onClick={() => {
                  onClose();
                  void item.action();
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface-muted',
                  item.danger ? 'text-red-400' : 'text-text'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface-muted"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
