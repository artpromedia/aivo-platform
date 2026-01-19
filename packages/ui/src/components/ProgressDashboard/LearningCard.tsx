'use client';

import { cn } from '../../utils';
import type { LearningCardProps } from './types';

/**
 * LearningCard Component
 *
 * Displays a lesson card with progress indicator.
 */
export function LearningCard({ lesson, onClick, className }: LearningCardProps) {
  const handleClick = () => {
    onClick?.(lesson.id, lesson.courseId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(lesson.id, lesson.courseId);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition',
        'hover:border-blue-300 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-2xl">
          {lesson.thumbnail}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {lesson.estimatedTime}
        </span>
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
        {lesson.title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{lesson.courseName}</p>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-blue-600">{lesson.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${lesson.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
