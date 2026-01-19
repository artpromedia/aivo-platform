/**
 * StudentCard Component
 *
 * Card display for individual student with IEP/504 indicators
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';

interface StudentCardProps {
  student: Student;
  onClick: () => void;
  className?: string;
}

export function StudentCard({ student, onClick, className }: StudentCardProps) {
  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-muted';
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  const getRiskIndicator = (level?: string) => {
    if (!level || level === 'none') return null;
    const colors: Record<string, { bg: string; dot: string }> = {
      low: { bg: 'bg-info/10', dot: 'bg-info' },
      medium: { bg: 'bg-warning/10', dot: 'bg-warning' },
      high: { bg: 'bg-error/10', dot: 'bg-error' },
      critical: { bg: 'bg-error', dot: 'bg-white' },
    };
    return colors[level] || colors.low;
  };

  const riskStyle = getRiskIndicator(student.riskLevel);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border bg-surface p-4 text-left transition-all',
        'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5',
        riskStyle && student.riskLevel === 'critical'
          ? 'border-error ring-2 ring-error/20'
          : 'border-border',
        className
      )}
    >
      {/* Risk indicator stripe */}
      {riskStyle && student.riskLevel !== 'critical' && (
        <div
          className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', riskStyle.dot)}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {student.avatar ? (
          <img
            src={student.avatar}
            alt={student.name}
            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold flex-shrink-0">
            {student.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
        )}

        {/* Name & Grade */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text truncate">{student.name}</h3>
            {/* IEP Badge */}
            {student.hasIep && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                <IEPIcon className="h-3 w-3" />
                IEP
              </span>
            )}
            {/* 504 Badge */}
            {student.has504 && (
              <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                <Plan504Icon className="h-3 w-3" />
                504
              </span>
            )}
          </div>
          <p className="text-sm text-muted">Grade {student.gradeLevel}</p>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0">
          <p className={cn('text-xl font-bold', getScoreColor(student.averageScore))}>
            {student.averageScore !== undefined ? `${student.averageScore}%` : '-'}
          </p>
          <p className="text-xs text-muted">Avg</p>
        </div>
      </div>

      {/* Progress Bar */}
      {student.progressPercentage !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Course Progress</span>
            <span className="text-xs font-medium text-text">{student.progressPercentage}%</span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                student.progressPercentage >= 75
                  ? 'bg-success'
                  : student.progressPercentage >= 50
                  ? 'bg-primary'
                  : student.progressPercentage >= 25
                  ? 'bg-warning'
                  : 'bg-error'
              )}
              style={{ width: `${student.progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <StatItem
          icon={<AssignmentIcon className="h-3.5 w-3.5" />}
          value={
            student.assignmentsCompleted !== undefined && student.totalAssignments !== undefined
              ? `${student.assignmentsCompleted}/${student.totalAssignments}`
              : '-'
          }
          label="Tasks"
        />
        <StatItem
          icon={<EngagementIcon className="h-3.5 w-3.5" />}
          value={student.engagementLevel || '-'}
          label="Engagement"
          valueClassName={
            student.engagementLevel === 'high'
              ? 'text-success'
              : student.engagementLevel === 'low'
              ? 'text-error'
              : ''
          }
        />
        <StatItem
          icon={<ClockIcon className="h-3.5 w-3.5" />}
          value={student.lastActivity ? formatTimeAgo(student.lastActivity) : 'Never'}
          label="Last Active"
        />
      </div>

      {/* IEP Goals Summary (if applicable) */}
      {student.hasIep && student.iepDetails && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">IEP Goals</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-success">
                {student.iepDetails.goals.filter((g) => g.status === 'on_track').length} on track
              </span>
              {student.iepDetails.goals.filter((g) => g.status === 'at_risk').length > 0 && (
                <span className="text-xs text-warning">
                  {student.iepDetails.goals.filter((g) => g.status === 'at_risk').length} at risk
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors Alert */}
      {student.riskLevel && ['medium', 'high', 'critical'].includes(student.riskLevel) && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 rounded-lg p-2 text-xs',
            student.riskLevel === 'critical'
              ? 'bg-error/10 text-error'
              : student.riskLevel === 'high'
              ? 'bg-error/10 text-error'
              : 'bg-warning/10 text-warning'
          )}
        >
          <AlertIcon className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">
            {student.riskLevel === 'critical' && 'Critical attention needed'}
            {student.riskLevel === 'high' && 'High priority intervention'}
            {student.riskLevel === 'medium' && 'Monitor closely'}
          </span>
        </div>
      )}
    </button>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClassName?: string;
}

function StatItem({ icon, value, label, valueClassName }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
        {icon}
      </div>
      <p className={cn('text-sm font-semibold text-text capitalize', valueClassName)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return '1d';
  return `${diffDays}d`;
}

// Icons
function IEPIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
    </svg>
  );
}

function Plan504Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
      <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

function AssignmentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function EngagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

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

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
