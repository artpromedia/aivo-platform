'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LessonItem {
  /** Unique lesson ID */
  id: string;
  /** Lesson title */
  title: string;
  /** Duration label (e.g., "12:30") */
  duration?: string;
  /** Completion status */
  status: 'completed' | 'in-progress' | 'locked' | 'available';
  /** Is this the current lesson */
  isCurrent?: boolean;
}

export interface LessonChapter {
  /** Chapter title */
  title: string;
  /** Lessons in this chapter */
  lessons: LessonItem[];
}

export interface LessonNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Chapters with their lessons */
  chapters: LessonChapter[];
  /** Called when a lesson is clicked */
  onSelect?: (lessonId: string) => void;
  /** Show chapter numbers */
  showNumbers?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Status icons                                                       */
/* ------------------------------------------------------------------ */

function CheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-500 flex-shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function PlayCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-indigo-600 flex-shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 flex-shrink-0" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function CircleOutline() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-300 flex-shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function StatusIcon({ status }: { status: LessonItem['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle />;
    case 'in-progress':
      return <PlayCircle />;
    case 'locked':
      return <LockIcon />;
    default:
      return <CircleOutline />;
  }
}

/* ------------------------------------------------------------------ */
/*  LessonNav                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sidebar lesson/chapter navigation with completion checkmarks.
 *
 * Used in course player views to show progress through lessons.
 */
export function LessonNav({
  chapters,
  onSelect,
  showNumbers = true,
  className,
  ...props
}: Readonly<LessonNavProps>) {
  const [expandedChapters, setExpandedChapters] = React.useState<Set<number>>(() => {
    // Auto-expand chapters that contain the current lesson
    const expanded = new Set<number>();
    chapters.forEach((ch, idx) => {
      if (ch.lessons.some((l) => l.isCurrent || l.status === 'in-progress')) {
        expanded.add(idx);
      }
    });
    // If nothing expanded, expand first
    if (expanded.size === 0 && chapters.length > 0) expanded.add(0);
    return expanded;
  });

  const toggleChapter = (idx: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <nav className={cn('w-full', className)} aria-label="Lesson navigation" {...props}>
      <ul className="space-y-1">
        {chapters.map((chapter, chIdx) => {
          const isExpanded = expandedChapters.has(chIdx);
          const completedCount = chapter.lessons.filter((l) => l.status === 'completed').length;
          const totalCount = chapter.lessons.length;

          return (
            <li key={chapter.title}>
              {/* Chapter header */}
              <button
                type="button"
                onClick={() => toggleChapter(chIdx)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn('flex-shrink-0 text-slate-400 transition-transform', isExpanded && 'rotate-90')}
                  aria-hidden
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="flex-1 text-sm font-semibold text-slate-700">
                  {showNumbers && `${chIdx + 1}. `}
                  {chapter.title}
                </span>
                <span className="text-xs text-slate-400">
                  {completedCount}/{totalCount}
                </span>
              </button>

              {/* Lesson list */}
              {isExpanded && (
                <ul className="mt-0.5 space-y-0.5 pb-1 pl-3">
                  {chapter.lessons.map((lesson) => {
                    const isClickable = lesson.status !== 'locked';
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          disabled={!isClickable}
                          onClick={() => isClickable && onSelect?.(lesson.id)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            lesson.isCurrent
                              ? 'bg-indigo-50 font-medium text-indigo-700'
                              : isClickable
                                ? 'text-slate-600 hover:bg-slate-50'
                                : 'cursor-not-allowed text-slate-400'
                          )}
                        >
                          <StatusIcon status={lesson.status} />
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.duration && (
                            <span className="flex-shrink-0 text-xs text-slate-400">{lesson.duration}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
