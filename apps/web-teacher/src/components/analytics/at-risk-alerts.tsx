/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
/**
 * At-Risk Alerts Component
 *
 * Display students who need attention
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import type { StudentAlert } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AtRiskAlertsProps {
  alerts: StudentAlert[];
  onDismiss?: (alertId: string) => void;
  onAction?: (alert: StudentAlert) => void;
  maxVisible?: number;
  className?: string;
}

export function AtRiskAlerts({
  alerts,
  onDismiss,
  onAction,
  maxVisible = 5,
  className,
}: AtRiskAlertsProps) {
  const [showAll, setShowAll] = React.useState(false);
  const visibleAlerts = showAll ? alerts : alerts.slice(0, maxVisible);

  if (alerts.length === 0) {
    return (
      <div className={cn('rounded-xl border bg-white p-6 text-center', className)}>
        <span className="text-4xl">✅</span>
        <p className="mt-2 text-gray-500">No at-risk students</p>
        <p className="text-sm text-gray-400">All students are on track!</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-white', className)}>
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <h3 className="font-medium text-gray-900">At-Risk Students</h3>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {alerts.length}
          </span>
        </div>
      </div>

      <div className="divide-y">
        {visibleAlerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} onAction={onAction} />
        ))}
      </div>

      {alerts.length > maxVisible && (
        <div className="border-t p-3 text-center">
          <button
            onClick={() => {
              setShowAll(!showAll);
            }}
            className="text-sm text-primary-600 hover:underline"
          >
            {showAll ? 'Show less' : `View all ${alerts.length} alerts`}
          </button>
        </div>
      )}
    </div>
  );
}

interface AlertItemProps {
  alert: StudentAlert;
  onDismiss?: (alertId: string) => void;
  onAction?: (alert: StudentAlert) => void;
}

function AlertItem({ alert, onDismiss, onAction }: AlertItemProps) {
  const severityColors = {
    low: 'border-l-yellow-400 bg-yellow-50',
    medium: 'border-l-orange-400 bg-orange-50',
    high: 'border-l-red-400 bg-red-50',
  };

  const typeIcons: Record<string, string> = {
    grade_drop: '📉',
    missing_work: '📝',
    attendance: '🏃',
    engagement: '💤',
    iep_progress: '🎯',
    behavior: '⚡',
  };

  return (
    <div className={cn('flex items-start gap-3 border-l-4 p-4', severityColors[alert.severity])}>
      <span className="text-xl">{typeIcons[alert.type] || '⚠️'}</span>
      <div className="flex-1">
        <Link
          href={`/students/${alert.studentId}`}
          className="font-medium text-gray-900 hover:text-primary-600"
        >
          {alert.studentName}
        </Link>
        <p className="text-sm text-gray-600">{alert.message}</p>
        <p className="mt-1 text-xs text-gray-400">{alert.className}</p>
      </div>
      <div className="flex items-center gap-2">
        {onAction && (
          <button
            onClick={() => {
              onAction(alert);
            }}
            className="rounded-lg bg-white px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {getActionLabel(alert.type)}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => {
              onDismiss(alert.id);
            }}
            className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
            title="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function getActionLabel(type: string): string {
  const labels: Record<string, string> = {
    grade_drop: 'View Grades',
    missing_work: 'View Work',
    attendance: 'Contact',
    engagement: 'Review',
    iep_progress: 'IEP Goals',
    behavior: 'Log Note',
  };
  return labels[type] || 'View';
}
