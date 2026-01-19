/**
 * InterventionAlerts Component
 *
 * Displays urgent alerts for students requiring intervention
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { InterventionAlert } from '@/lib/types';

interface InterventionAlertsProps {
  alerts: InterventionAlert[];
  className?: string;
  onDismiss?: (alertId: string) => void;
  onActionTaken?: (alertId: string, action: string) => void;
}

export function InterventionAlerts({
  alerts,
  className,
  onDismiss,
  onActionTaken,
}: InterventionAlertsProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.includes(alert.id));

  // Sort by severity: critical > high > medium > low
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
    onDismiss?.(alertId);
  };

  if (sortedAlerts.length === 0) {
    return null;
  }

  const criticalCount = sortedAlerts.filter((a) => a.severity === 'critical').length;
  const highCount = sortedAlerts.filter((a) => a.severity === 'high').length;

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface overflow-hidden',
        criticalCount > 0 ? 'border-error' : highCount > 0 ? 'border-warning' : 'border-border',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          criticalCount > 0
            ? 'bg-error/10'
            : highCount > 0
            ? 'bg-warning/10'
            : 'bg-surface-muted'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              criticalCount > 0
                ? 'bg-error/20 text-error'
                : highCount > 0
                ? 'bg-warning/20 text-warning'
                : 'bg-info/20 text-info'
            )}
          >
            <AlertBellIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-text">
              Intervention Alerts
              <span className="ml-2 text-sm font-normal text-muted">
                ({sortedAlerts.length})
              </span>
            </h2>
            {criticalCount > 0 && (
              <p className="text-xs text-error">
                {criticalCount} critical alert{criticalCount > 1 ? 's' : ''} requiring immediate action
              </p>
            )}
          </div>
        </div>
        <Link
          href="/students?filter=at-risk"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Alert List */}
      <div className="divide-y divide-border">
        {sortedAlerts.slice(0, 5).map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            isExpanded={expandedAlert === alert.id}
            onToggleExpand={() =>
              setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
            }
            onDismiss={() => handleDismiss(alert.id)}
            onActionTaken={(action) => onActionTaken?.(alert.id, action)}
          />
        ))}
      </div>

      {/* Show More */}
      {sortedAlerts.length > 5 && (
        <div className="border-t border-border p-3 text-center">
          <Link
            href="/students?filter=at-risk"
            className="text-sm text-primary hover:underline"
          >
            View {sortedAlerts.length - 5} more alerts
          </Link>
        </div>
      )}
    </div>
  );
}

interface AlertItemProps {
  alert: InterventionAlert;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDismiss: () => void;
  onActionTaken: (action: string) => void;
}

function AlertItem({
  alert,
  isExpanded,
  onToggleExpand,
  onDismiss,
  onActionTaken,
}: AlertItemProps) {
  const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-error/10', text: 'text-error', border: 'border-l-error' },
    high: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-l-warning' },
    medium: { bg: 'bg-info/10', text: 'text-info', border: 'border-l-info' },
    low: { bg: 'bg-muted/10', text: 'text-muted', border: 'border-l-muted' },
  };

  const typeIcons: Record<string, React.ReactNode> = {
    academic: <BookIcon className="h-4 w-4" />,
    behavioral: <UserAlertIcon className="h-4 w-4" />,
    attendance: <CalendarIcon className="h-4 w-4" />,
    engagement: <TrendingDownIcon className="h-4 w-4" />,
    iep_goal: <ClipboardIcon className="h-4 w-4" />,
  };

  const style = severityStyles[alert.severity];

  return (
    <div className={cn('border-l-4', style.border)}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-surface-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Student Avatar */}
        <div className="flex-shrink-0">
          {alert.studentAvatar ? (
            <img
              src={alert.studentAvatar}
              alt={alert.studentName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {alert.studentName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
          )}
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', style.bg, style.text)}>
              {alert.severity.toUpperCase()}
            </span>
            <span className="text-xs text-muted flex items-center gap-1">
              {typeIcons[alert.type]}
              {formatAlertType(alert.type)}
            </span>
          </div>
          <p className="font-medium text-text">{alert.studentName}</p>
          <p className="text-sm text-muted">{alert.title}</p>
          <p className="text-xs text-muted mt-1">{formatTimeAgo(alert.createdAt)}</p>
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0">
          <ChevronIcon
            className={cn(
              'h-5 w-5 text-muted transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 ml-13">
          <div className="bg-surface-muted rounded-lg p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-text">{alert.description}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                Action Required
              </p>
              <p className="text-sm text-text">{alert.actionRequired}</p>
            </div>

            {alert.suggestedActions && alert.suggestedActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                  Suggested Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {alert.suggestedActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionTaken(action);
                      }}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-primary hover:text-white hover:border-primary transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Link
                href={`/students/${alert.studentId}`}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                View Student Profile
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAlertType(type: string): string {
  const typeLabels: Record<string, string> = {
    academic: 'Academic',
    behavioral: 'Behavioral',
    attendance: 'Attendance',
    engagement: 'Engagement',
    iep_goal: 'IEP Goal',
  };
  return typeLabels[type] || type;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

// Icons
function AlertBellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function UserAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}
