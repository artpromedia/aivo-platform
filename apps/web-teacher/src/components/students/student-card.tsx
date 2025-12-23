/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition, @next/next/no-img-element */
/**
 * Student Card Component
 *
 * Display student summary with quick actions
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import type { Student, StudentRosterEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StudentCardProps {
  student: Student | StudentRosterEntry;
  showProgress?: boolean;
  onMessage?: () => void;
  className?: string;
}

export function StudentCard({
  student,
  showProgress = true,
  onMessage,
  className,
}: StudentCardProps) {
  const initials = `${student.firstName[0]}${student.lastName[0]}`;
  const fullName = `${student.firstName} ${student.lastName}`;
  const progress = 'currentGrade' in student ? student.currentGrade : null;
  const hasAccommodations = 'accommodations' in student && student.accommodations?.length > 0;
  const hasIep = 'hasIep' in student && student.hasIep;

  return (
    <div className={cn('rounded-xl border bg-white p-4', className)}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-medium text-primary-700">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={fullName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <Link
            href={`/students/${student.id}`}
            className="font-medium text-gray-900 hover:text-primary-600"
          >
            {fullName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {'grade' in student && <span>Grade {student.grade}</span>}
            {'studentId' in student && student.studentId && (
              <>
                <span>·</span>
                <span>ID: {student.studentId}</span>
              </>
            )}
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap gap-1">
            {hasIep && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                IEP
              </span>
            )}
            {hasAccommodations && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                {(student as StudentRosterEntry).accommodations?.length} accommodations
              </span>
            )}
            {'missingAssignments' in student && student.missingAssignments > 0 && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                {student.missingAssignments} missing
              </span>
            )}
          </div>
        </div>

        {/* Grade */}
        {showProgress && progress !== null && progress !== undefined && (
          <div className="text-right">
            <div className={cn('text-lg font-bold', getGradeColor(progress))}>
              {progress.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Current</div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {onMessage && (
        <div className="mt-3 flex justify-end gap-2 border-t pt-3">
          <button
            onClick={onMessage}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <span>✉️</span> Message
          </button>
          <Link
            href={`/students/${student.id}`}
            className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-100"
          >
            View Profile
          </Link>
        </div>
      )}
    </div>
  );
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-600';
  if (grade >= 80) return 'text-blue-600';
  if (grade >= 70) return 'text-yellow-600';
  if (grade >= 60) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Compact student list item
 */
interface StudentListItemProps {
  student: Student | StudentRosterEntry;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StudentListItem({
  student,
  selected = false,
  onClick,
  className,
}: StudentListItemProps) {
  const initials = `${student.firstName[0]}${student.lastName[0]}`;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg p-2 transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50',
        selected && 'bg-primary-50',
        className
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
        {initials}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-900">{fullName}</span>
      {'currentGrade' in student && student.currentGrade !== undefined && (
        <span className={cn('text-sm font-medium', getGradeColor(student.currentGrade))}>
          {student.currentGrade.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
