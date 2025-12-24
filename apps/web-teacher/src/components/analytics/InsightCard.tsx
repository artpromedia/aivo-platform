/**
 * Insight Card Component
 *
 * Displays actionable insights for teachers with clear visual hierarchy.
 * Designed for quick scanning during 5-minute between-class checks.
 */

'use client';

import { CheckCircle2, AlertTriangle, Info, Zap, ChevronRight, Users } from 'lucide-react';
import * as React from 'react';

import type { ClassInsight } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: ClassInsight;
  onAction?: (insight: ClassInsight) => void;
  onDismiss?: (insight: ClassInsight) => void;
  className?: string;
}

export function InsightCard({ insight, onAction, onDismiss, className }: InsightCardProps) {
  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
    },
    action: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: Zap,
      iconColor: 'text-purple-600',
      titleColor: 'text-purple-900',
    },
  };

  const styles = typeStyles[insight.type];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-shadow hover:shadow-md',
        styles.bg,
        styles.border,
        className
      )}
      role="article"
      aria-labelledby={`insight-title-${insight.title.replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', styles.iconColor)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            id={`insight-title-${insight.title.replace(/\s+/g, '-')}`}
            className={cn('font-medium text-sm', styles.titleColor)}
          >
            {insight.title}
          </h4>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>

          {/* Affected students count */}
          {insight.affectedStudents && insight.affectedStudents.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {insight.affectedStudents.length} student
                {insight.affectedStudents.length !== 1 ? 's' : ''} affected
              </span>
            </div>
          )}

          {/* Suggested action */}
          {insight.suggestedAction && (
            <div className="mt-3">
              <button
                onClick={() => onAction?.(insight)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                {insight.suggestedAction}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Priority badge */}
        {insight.priority >= 8 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            High Priority
          </span>
        )}
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={() => {
            onDismiss(insight);
          }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Dismiss insight"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

/**
 * Compact insight list for sidebar/summary views
 */
interface InsightListProps {
  insights: ClassInsight[];
  maxVisible?: number;
  onAction?: (insight: ClassInsight) => void;
  onViewAll?: () => void;
  className?: string;
}

export function InsightList({
  insights,
  maxVisible = 3,
  onAction,
  onViewAll,
  className,
}: InsightListProps) {
  const visibleInsights = insights.slice(0, maxVisible);
  const hiddenCount = insights.length - maxVisible;

  if (insights.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No action items right now</p>
        <p className="text-xs text-gray-400 mt-1">Check back later for insights</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {visibleInsights.map((insight, index) => (
        <InsightCard key={`${insight.title}-${index}`} insight={insight} onAction={onAction} />
      ))}

      {hiddenCount > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View {hiddenCount} more insight{hiddenCount !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

/**
 * Quick insight summary badge
 */
interface InsightBadgeProps {
  type: ClassInsight['type'];
  count: number;
}

export function InsightBadge({ type, count }: InsightBadgeProps) {
  if (count === 0) return null;

  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    action: 'bg-purple-100 text-purple-800',
  };

  const labels = {
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    action: 'Action',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colors[type]
      )}
    >
      {count} {labels[type]}
    </span>
  );
}
