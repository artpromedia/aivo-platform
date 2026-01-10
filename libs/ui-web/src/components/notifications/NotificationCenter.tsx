'use client';

import { Bell, CheckCheck, Filter, Loader2, Settings } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';

import { NotificationFilters } from './NotificationFilters';
import { NotificationItem } from './NotificationItem';

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

export interface NotificationCenterProps {
  /**
   * Notifications to display
   */
  notifications: Notification[];
  /**
   * Total unread count
   */
  unreadCount: number;
  /**
   * Total count of notifications
   */
  totalCount: number;
  /**
   * Loading state
   */
  isLoading?: boolean;
  /**
   * Whether there are more notifications to load
   */
  hasMore?: boolean;
  /**
   * Active tab
   */
  activeTab?: 'all' | 'unread';
  /**
   * Active filters
   */
  filters?: { types?: string[] };
  /**
   * Callback when notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;
  /**
   * Callback to mark notification as read
   */
  onMarkAsRead?: (notificationId: string) => void;
  /**
   * Callback to mark all as read
   */
  onMarkAllAsRead?: () => void;
  /**
   * Callback to dismiss notification
   */
  onDismiss?: (notificationId: string) => void;
  /**
   * Callback to delete notification
   */
  onDelete?: (notificationId: string) => void;
  /**
   * Callback to load more notifications
   */
  onLoadMore?: () => void;
  /**
   * Callback when tab changes
   */
  onTabChange?: (tab: 'all' | 'unread') => void;
  /**
   * Callback when filters change
   */
  onFiltersChange?: (filters: { types?: string[] }) => void;
  /**
   * Callback to open settings
   */
  onSettingsClick?: () => void;
  /**
   * Callback to view all notifications
   */
  onViewAllClick?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification Center Component
 *
 * Displays and manages user notifications:
 * - Real-time updates
 * - Unread count badge
 * - Mark as read/unread
 * - Archive and delete
 * - Filtering by type
 */
export function NotificationCenter({
  notifications,
  unreadCount,
  totalCount: _totalCount,
  isLoading = false,
  hasMore = false,
  activeTab = 'all',
  filters = {},
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onDelete,
  onLoadMore,
  onTabChange,
  onFiltersChange,
  onSettingsClick,
  onViewAllClick,
  className,
}: Readonly<NotificationCenterProps>) {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div className={cn('flex flex-col w-full max-w-md', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setShowFilters(!showFilters);
            }}
            aria-label="Filter notifications"
          >
            <Filter className="h-4 w-4" />
          </Button>

          {unreadCount > 0 && onMarkAllAsRead && (
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead} className="text-xs">
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}

          {onSettingsClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSettingsClick}
              aria-label="Notification settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b bg-muted/50">
          <NotificationFilters
            filters={filters}
            onChange={
              onFiltersChange ??
              ((_f: { types?: string[] }) => {
                /* no-op */
              })
            }
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            'flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onTabChange?.('all')}
        >
          All
        </button>
        <button
          className={cn(
            'flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'unread'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onTabChange?.('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto max-h-[400px]">{renderContent()}</div>

      {/* Footer */}
      {onViewAllClick && (
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full" onClick={onViewAllClick}>
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );

  function renderContent() {
    if (isLoading && notifications.length === 0) {
      return (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">No notifications</p>
          <p className="text-sm">You&apos;re all caught up!</p>
        </div>
      );
    }

    return (
      <>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={() => onNotificationClick?.(notification)}
            onMarkAsRead={() => onMarkAsRead?.(notification.id)}
            onDismiss={() => onDismiss?.(notification.id)}
            onDelete={() => onDelete?.(notification.id)}
          />
        ))}

        {hasMore && (
          <div className="p-4 text-center">
            <Button variant="ghost" onClick={onLoadMore} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load more
            </Button>
          </div>
        )}
      </>
    );
  }
}
