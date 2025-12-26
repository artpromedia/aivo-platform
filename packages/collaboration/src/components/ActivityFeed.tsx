/**
 * ActivityFeed Component
 *
 * Displays real-time activity stream with:
 * - Activity grouping
 * - Time-based sections
 * - Unread indicators
 * - Infinite scroll
 */

import React, { useCallback, useEffect, useRef, CSSProperties } from 'react';
import type { ActivityItem, ActivityType } from '../types';

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
  hasMore: boolean;
  unreadCount: number;
  onLoadMore: () => void;
  onMarkAsRead: (activityId: string) => void;
  onMarkAllAsRead: () => void;
  onActivityClick?: (activity: ActivityItem) => void;
  emptyMessage?: string;
}

const activityIcons: Partial<Record<ActivityType, string>> = {
  'lesson.created': '📝',
  'lesson.updated': '✏️',
  'lesson.published': '🚀',
  'lesson.completed': '✅',
  'assessment.created': '📋',
  'assessment.submitted': '📤',
  'assessment.graded': '⭐',
  'class.joined': '👋',
  'class.left': '👋',
  'comment.added': '💬',
  'comment.resolved': '✔️',
  'achievement.earned': '🏆',
  'badge.awarded': '🎖️',
  'goal.completed': '🎯',
  'collaboration.started': '🤝',
  'collaboration.ended': '👋',
  'user.online': '🟢',
  'user.offline': '⚪',
  'system.announcement': '📢',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function groupActivitiesByDate(activities: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  activities.forEach((activity) => {
    const date = new Date(activity.createdAt).toDateString();
    let label: string;

    if (date === today) {
      label = 'Today';
    } else if (date === yesterday) {
      label = 'Yesterday';
    } else {
      label = new Date(activity.createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }

    const group = groups.get(label) || [];
    group.push(activity);
    groups.set(label, group);
  });

  return groups;
}

// Individual activity item
const ActivityItemComponent: React.FC<{
  activity: ActivityItem;
  onRead: () => void;
  onClick?: () => void;
}> = ({ activity, onRead, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Mark as read when visible
  useEffect(() => {
    if (activity.read) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onRead();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [activity.read, onRead]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '12px 16px',
    cursor: onClick ? 'pointer' : 'default',
    backgroundColor: activity.read ? 'transparent' : '#EFF6FF',
    borderRadius: 8,
    transition: 'background-color 150ms ease',
  };

  const iconStyle: CSSProperties = {
    fontSize: 20,
    flexShrink: 0,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const messageStyle: CSSProperties = {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 1.4,
  };

  const actorStyle: CSSProperties = {
    fontWeight: 600,
  };

  const targetStyle: CSSProperties = {
    fontWeight: 500,
    color: '#3B82F6',
  };

  const timeStyle: CSSProperties = {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  };

  const avatarStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    flexShrink: 0,
    overflow: 'hidden',
  };

  return (
    <div
      ref={ref}
      style={containerStyle}
      onClick={onClick}
      role="article"
      aria-label={activity.message}
    >
      {activity.actorAvatarUrl ? (
        <div style={avatarStyle}>
          <img
            src={activity.actorAvatarUrl}
            alt={activity.actorName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div style={iconStyle}>{activityIcons[activity.type] || '📌'}</div>
      )}
      <div style={contentStyle}>
        <div style={messageStyle}>
          <span style={actorStyle}>{activity.actorName}</span>{' '}
          {activity.message.replace(activity.actorName, '').trim()}
          {activity.targetName && (
            <>
              {' '}
              <span style={targetStyle}>{activity.targetName}</span>
            </>
          )}
        </div>
        <div style={timeStyle}>{formatRelativeTime(new Date(activity.createdAt))}</div>
      </div>
      {!activity.read && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            flexShrink: 0,
            alignSelf: 'center',
          }}
        />
      )}
    </div>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading,
  hasMore,
  unreadCount,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  onActivityClick,
  emptyMessage = 'No activity yet',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const groupedActivities = groupActivitiesByDate(activities);

  const containerStyle: CSSProperties = {
    height: '100%',
    overflowY: 'auto',
    padding: 16,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: '0 4px',
  };

  const titleStyle: CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: '#1F2937',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const badgeStyle: CSSProperties = {
    backgroundColor: '#3B82F6',
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 10,
  };

  const markAllStyle: CSSProperties = {
    fontSize: 13,
    color: '#3B82F6',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
  };

  const dateHeaderStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: '16px 4px 8px',
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: 32,
    color: '#9CA3AF',
    fontSize: 14,
  };

  const loadingStyle: CSSProperties = {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280',
    fontSize: 13,
  };

  if (activities.length === 0 && !isLoading) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          Activity
          {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button style={markAllStyle} onClick={onMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {Array.from(groupedActivities.entries()).map(([date, items]) => (
        <div key={date}>
          <div style={dateHeaderStyle}>{date}</div>
          {items.map((activity) => (
            <ActivityItemComponent
              key={activity.id}
              activity={activity}
              onRead={() => onMarkAsRead(activity.id)}
              onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
            />
          ))}
        </div>
      ))}

      <div ref={loadMoreRef} style={{ height: 1 }} />

      {isLoading && <div style={loadingStyle}>Loading more...</div>}
    </div>
  );
};
