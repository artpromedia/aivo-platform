/**
 * QuickStats Component
 *
 * Dashboard statistics cards showing key metrics at a glance
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/lib/types';

interface QuickStatsProps {
  stats: DashboardStats;
  className?: string;
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      change: stats.studentsChange,
      icon: <UsersIcon />,
      color: 'primary',
      subtitle: stats.iepStudents > 0 || stats.plan504Students > 0
        ? `${stats.iepStudents} IEP, ${stats.plan504Students} 504`
        : undefined,
    },
    {
      title: 'Average Mastery',
      value: `${stats.averageMastery}%`,
      change: stats.masteryChange,
      icon: <TrendingUpIcon />,
      color: getMasteryColor(stats.averageMastery),
      subtitle: 'Class performance',
    },
    {
      title: 'At-Risk Students',
      value: stats.atRiskStudents,
      change: stats.atRiskChange,
      invertTrend: true,
      icon: <AlertTriangleIcon />,
      color: stats.atRiskStudents > 0 ? 'warning' : 'success',
      subtitle: 'Needs attention',
      urgent: stats.atRiskStudents > 3,
    },
    {
      title: 'Pending Grades',
      value: stats.pendingGrades,
      icon: <ClipboardIcon />,
      color: stats.pendingGrades > 10 ? 'warning' : 'info',
      subtitle: 'To review',
    },
  ];

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  invertTrend?: boolean;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  urgent?: boolean;
}

function StatCard({
  title,
  value,
  change,
  invertTrend,
  icon,
  color,
  subtitle,
  urgent,
}: StatCardProps) {
  const hasPositiveChange = change !== undefined && change > 0;
  const hasNegativeChange = change !== undefined && change < 0;

  // For at-risk students, negative change is good (fewer at-risk)
  const isGoodChange = invertTrend ? hasNegativeChange : hasPositiveChange;
  const isBadChange = invertTrend ? hasPositiveChange : hasNegativeChange;

  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    info: 'bg-info/10 text-info',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-md',
        urgent && 'border-warning ring-2 ring-warning/20'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('rounded-lg p-2', colorClasses[color])}>
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isGoodChange && 'bg-success/10 text-success',
              isBadChange && 'bg-error/10 text-error'
            )}
          >
            {hasPositiveChange ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : (
              <ArrowDownIcon className="h-3 w-3" />
            )}
            <span>{Math.abs(change)}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-sm text-muted">{title}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted">{subtitle}</p>
        )}
      </div>

      {urgent && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangleIcon className="h-3.5 w-3.5" />
          <span>Requires immediate attention</span>
        </div>
      )}
    </div>
  );
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 85) return 'success';
  if (mastery >= 70) return 'warning';
  return 'error';
}

// Icons
function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
