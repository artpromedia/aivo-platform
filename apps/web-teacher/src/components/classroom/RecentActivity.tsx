/**
 * RecentActivity Component
 *
 * Displays recent activity feed for the classroom
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { RecentActivityItem } from '@/lib/types';

interface RecentActivityProps {
  activities: RecentActivityItem[];
  className?: string;
  maxItems?: number;
}

export function RecentActivity({
  activities,
  className,
  maxItems = 10,
}: RecentActivityProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className={cn('rounded-xl border border-border bg-surface', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-text">Recent Activity</h2>
        </div>
        <Link
          href="/activity"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-border">
        {displayActivities.length > 0 ? (
          displayActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="p-8 text-center">
            <InboxIcon className="mx-auto h-12 w-12 text-muted/50" />
            <p className="mt-2 text-sm text-muted">No recent activity</p>
          </div>
        )}
      </div>

      {/* Load More */}
      {activities.length > maxItems && (
        <div className="border-t border-border p-3 text-center">
          <Link
            href="/activity"
            className="text-sm text-primary hover:underline"
          >
            View {activities.length - maxItems} more activities
          </Link>
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  activity: RecentActivityItem;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const typeConfig: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string }
  > = {
    assignment_submitted: {
      icon: <UploadIcon className="h-4 w-4" />,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    grade_updated: {
      icon: <CheckCircleIcon className="h-4 w-4" />,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    message_received: {
      icon: <MailIcon className="h-4 w-4" />,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    iep_updated: {
      icon: <FileTextIcon className="h-4 w-4" />,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    intervention_added: {
      icon: <AlertCircleIcon className="h-4 w-4" />,
      color: 'text-error',
      bg: 'bg-error/10',
    },
    student_enrolled: {
      icon: <UserPlusIcon className="h-4 w-4" />,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  };

  const config = typeConfig[activity.type] || typeConfig.assignment_submitted;

  const getActivityLink = (): string | undefined => {
    switch (activity.type) {
      case 'assignment_submitted':
      case 'grade_updated':
        return `/gradebook?student=${activity.studentId}`;
      case 'message_received':
        return '/messages';
      case 'iep_updated':
      case 'intervention_added':
        return activity.studentId ? `/students/${activity.studentId}` : undefined;
      case 'student_enrolled':
        return activity.classId ? `/classes/${activity.classId}` : undefined;
      default:
        return undefined;
    }
  };

  const link = getActivityLink();
  const content = (
    <div className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-muted/50">
      {/* Icon */}
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0', config.bg, config.color)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">
          <span className="text-muted">{activity.title}</span>
          {activity.studentName && (
            <span className="font-medium"> {activity.studentName}</span>
          )}
        </p>
        {activity.description && (
          <p className="text-xs text-muted mt-0.5 truncate">{activity.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
          {activity.className && (
            <>
              <span>{activity.className}</span>
              <span>•</span>
            </>
          )}
          <span>{formatTimeAgo(activity.timestamp)}</span>
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Icons
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}
