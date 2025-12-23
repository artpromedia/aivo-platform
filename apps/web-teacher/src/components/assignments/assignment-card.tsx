/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
/**
 * Assignment Card Component
 *
 * Display assignment summary in card format
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import type { Assignment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDueDate, formatDate } from '@/lib/utils/date-utils';

interface AssignmentCardProps {
  assignment: Assignment;
  showClass?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function AssignmentCard({
  assignment,
  showClass = false,
  onEdit,
  onDelete,
  className,
}: AssignmentCardProps) {
  const dueInfo = formatDueDate(assignment.dueDate);
  const submissionRate =
    assignment.submissionCount && assignment.totalStudents
      ? (assignment.submissionCount / assignment.totalStudents) * 100
      : 0;

  const typeIcons: Record<string, string> = {
    homework: '📝',
    quiz: '📋',
    test: '📊',
    project: '🎯',
    essay: '✍️',
    lab: '🔬',
    participation: '🙋',
    extra_credit: '⭐',
  };

  return (
    <div
      className={cn('rounded-xl border bg-white p-4 hover:shadow-md transition-shadow', className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeIcons[assignment.type] || '📄'}</span>
          <div>
            <Link
              href={`/assignments/${assignment.id}`}
              className="font-medium text-gray-900 hover:text-primary-600"
            >
              {assignment.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="rounded bg-gray-100 px-2 py-0.5">{assignment.category}</span>
              <span>·</span>
              <span>{assignment.totalPoints} pts</span>
              {showClass && assignment.className && (
                <>
                  <span>·</span>
                  <span>{assignment.className}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Due Date */}
      <div className="mt-3 flex items-center justify-between">
        <div className={cn('flex items-center gap-2 text-sm', dueInfo.className)}>
          <span>{dueInfo.icon}</span>
          <span>{dueInfo.text}</span>
        </div>
        <StatusBadge status={assignment.status} />
      </div>

      {/* Submission Progress */}
      {assignment.status === 'published' && assignment.totalStudents && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {assignment.submissionCount || 0} of {assignment.totalStudents} submitted
            </span>
            <span>{submissionRate.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${submissionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Assignment['status'] }) {
  const styles: Record<Assignment['status'], string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-700',
    closed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Assignment List Component
 */
interface AssignmentListProps {
  assignments: Assignment[];
  emptyMessage?: string;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
  className?: string;
}

export function AssignmentList({
  assignments,
  emptyMessage = 'No assignments found',
  onEdit,
  onDelete,
  className,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <span className="text-4xl">📝</span>
        <p className="mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          onEdit={
            onEdit
              ? () => {
                  onEdit(assignment);
                }
              : undefined
          }
          onDelete={
            onDelete
              ? () => {
                  onDelete(assignment);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
