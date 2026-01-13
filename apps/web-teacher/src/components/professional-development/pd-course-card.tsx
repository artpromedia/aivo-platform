/**
 * PD Course Card Component
 *
 * Display a professional development course in card format
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import type { PDProgram, PDEnrollment } from '@/lib/api/professional-development';
import { formatDuration, formatCreditHours } from '@/lib/api/professional-development';
import { cn } from '@/lib/utils';

interface PDCourseCardProps {
  program: PDProgram;
  enrollment?: PDEnrollment;
  onEnroll?: () => void;
  className?: string;
}

export function PDCourseCard({ program, enrollment, onEnroll, className }: PDCourseCardProps) {
  const contentTypeIcons: Record<string, string> = {
    VIDEO: '🎬',
    READING: '📖',
    QUIZ: '📝',
    ACTIVITY: '🎯',
    DISCUSSION: '💬',
  };

  const categoryColors: Record<string, string> = {
    'Classroom Management': 'bg-blue-100 text-blue-700',
    'Instructional Strategies': 'bg-green-100 text-green-700',
    'Technology Integration': 'bg-purple-100 text-purple-700',
    'Special Education': 'bg-orange-100 text-orange-700',
    'Social-Emotional Learning': 'bg-pink-100 text-pink-700',
    'Assessment': 'bg-yellow-100 text-yellow-700',
    default: 'bg-gray-100 text-gray-700',
  };

  const moduleTypes = program.modules.reduce(
    (acc, mod) => {
      acc[mod.contentType] = (acc[mod.contentType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                categoryColors[program.category] || categoryColors.default
              )}
            >
              {program.category}
            </span>
            {enrollment && (
              <EnrollmentStatusBadge status={enrollment.status} />
            )}
          </div>
          <Link
            href={`/professional-development/courses/${program.id}`}
            className="font-semibold text-gray-900 hover:text-primary-600 text-lg"
          >
            {program.title}
          </Link>
          <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">{program.description}</p>
        </div>
      </div>

      {/* Module types preview */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(moduleTypes).map(([type, count]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
          >
            <span>{contentTypeIcons[type] || '📄'}</span>
            <span>
              {count} {type.toLowerCase()}
              {count > 1 ? 's' : ''}
            </span>
          </span>
        ))}
      </div>

      {/* Progress bar if enrolled */}
      {enrollment && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{enrollment.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${enrollment.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <ClockIcon />
            {formatDuration(program.estimatedDuration)}
          </span>
          <span className="flex items-center gap-1">
            <CreditIcon />
            {formatCreditHours(program.creditHours)}
          </span>
          <span className="flex items-center gap-1">
            <ModulesIcon />
            {program.modules.length} modules
          </span>
        </div>
        {!enrollment && onEnroll && (
          <button
            onClick={onEnroll}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Enroll
          </button>
        )}
        {enrollment && enrollment.status === 'IN_PROGRESS' && (
          <Link
            href={`/professional-development/courses/${program.id}`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Continue
          </Link>
        )}
        {enrollment && enrollment.status === 'COMPLETED' && (
          <span className="text-sm font-medium text-green-600">Completed</span>
        )}
      </div>
    </div>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ENROLLED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    WITHDRAWN: 'bg-red-100 text-red-700',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  );
}

function ModulesIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

/**
 * PD Course List Component
 */
interface PDCourseListProps {
  programs: PDProgram[];
  enrollments?: PDEnrollment[];
  emptyMessage?: string;
  onEnroll?: (programId: string) => void;
  className?: string;
}

export function PDCourseList({
  programs,
  enrollments = [],
  emptyMessage = 'No courses available',
  onEnroll,
  className,
}: PDCourseListProps) {
  const enrollmentMap = React.useMemo(() => {
    return enrollments.reduce(
      (acc, e) => {
        acc[e.programId] = e;
        return acc;
      },
      {} as Record<string, PDEnrollment>
    );
  }, [enrollments]);

  if (programs.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <span className="text-4xl">📚</span>
        <p className="mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {programs.map((program) => (
        <PDCourseCard
          key={program.id}
          program={program}
          enrollment={enrollmentMap[program.id]}
          onEnroll={onEnroll ? () => onEnroll(program.id) : undefined}
        />
      ))}
    </div>
  );
}
