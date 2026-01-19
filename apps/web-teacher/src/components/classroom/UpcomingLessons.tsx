/**
 * UpcomingLessons Component
 *
 * Displays upcoming lessons and events for the teacher
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { UpcomingLesson, UpcomingEvent } from '@/lib/types';

interface UpcomingLessonsProps {
  lessons: UpcomingLesson[];
  events?: UpcomingEvent[];
  className?: string;
}

export function UpcomingLessons({ lessons, events = [], className }: UpcomingLessonsProps) {
  // Combine lessons and events, sort by date
  const allItems = [
    ...lessons.map((lesson) => ({
      ...lesson,
      itemType: 'lesson' as const,
      dateTime: new Date(`${lesson.scheduledDate}T${lesson.scheduledTime}`),
    })),
    ...events.map((event) => ({
      ...event,
      itemType: 'event' as const,
      dateTime: new Date(
        event.scheduledTime
          ? `${event.scheduledDate}T${event.scheduledTime}`
          : event.scheduledDate
      ),
    })),
  ].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  // Get items for today and upcoming
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() + 7);

  const todayItems = allItems.filter(
    (item) =>
      item.dateTime >= today &&
      item.dateTime < tomorrow
  );

  const upcomingItems = allItems.filter(
    (item) =>
      item.dateTime >= tomorrow &&
      item.dateTime < thisWeek
  );

  return (
    <div className={cn('rounded-xl border border-border bg-surface', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-text">Upcoming Schedule</h2>
        </div>
        <Link
          href="/calendar"
          className="text-sm text-primary hover:underline"
        >
          View Calendar
        </Link>
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {/* Today Section */}
        {todayItems.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
              Today
            </p>
            <div className="space-y-3">
              {todayItems.map((item) => (
                <ScheduleItem key={`${item.itemType}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* This Week Section */}
        {upcomingItems.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
              This Week
            </p>
            <div className="space-y-3">
              {upcomingItems.slice(0, 5).map((item) => (
                <ScheduleItem key={`${item.itemType}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {todayItems.length === 0 && upcomingItems.length === 0 && (
          <div className="p-8 text-center">
            <CalendarEmptyIcon className="mx-auto h-12 w-12 text-muted/50" />
            <p className="mt-2 text-sm text-muted">No upcoming lessons or events</p>
            <Link
              href="/lessons/new"
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Plan a Lesson
            </Link>
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Link
            href="/lessons/new"
            className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            + New Lesson
          </Link>
          <Link
            href="/calendar/event/new"
            className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            + New Event
          </Link>
        </div>
      </div>
    </div>
  );
}

type ScheduleItemType =
  | (UpcomingLesson & { itemType: 'lesson'; dateTime: Date })
  | (UpcomingEvent & { itemType: 'event'; dateTime: Date });

interface ScheduleItemProps {
  item: ScheduleItemType;
}

function ScheduleItem({ item }: ScheduleItemProps) {
  const isLesson = item.itemType === 'lesson';
  const lesson = isLesson ? (item as UpcomingLesson & { itemType: 'lesson'; dateTime: Date }) : null;
  const event = !isLesson ? (item as UpcomingEvent & { itemType: 'event'; dateTime: Date }) : null;

  const typeStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
    lesson: { bg: 'bg-primary/10', icon: <BookOpenIcon className="h-4 w-4 text-primary" /> },
    lecture: { bg: 'bg-primary/10', icon: <BookOpenIcon className="h-4 w-4 text-primary" /> },
    activity: { bg: 'bg-green-100', icon: <ActivityIcon className="h-4 w-4 text-green-600" /> },
    assessment: { bg: 'bg-orange-100', icon: <ClipboardCheckIcon className="h-4 w-4 text-orange-600" /> },
    review: { bg: 'bg-purple-100', icon: <RefreshIcon className="h-4 w-4 text-purple-600" /> },
    project: { bg: 'bg-blue-100', icon: <FolderIcon className="h-4 w-4 text-blue-600" /> },
    assignment_due: { bg: 'bg-orange-100', icon: <ClipboardCheckIcon className="h-4 w-4 text-orange-600" /> },
    meeting: { bg: 'bg-indigo-100', icon: <UsersIcon className="h-4 w-4 text-indigo-600" /> },
    iep_review: { bg: 'bg-yellow-100', icon: <FileTextIcon className="h-4 w-4 text-yellow-600" /> },
    parent_conference: { bg: 'bg-pink-100', icon: <UsersIcon className="h-4 w-4 text-pink-600" /> },
    professional_development: { bg: 'bg-teal-100', icon: <AwardIcon className="h-4 w-4 text-teal-600" /> },
  };

  const itemType = isLesson ? (lesson?.lessonType || 'lesson') : (event?.type || 'meeting');
  const style = typeStyles[itemType] || typeStyles.lesson;

  const href = isLesson
    ? `/lessons/${item.id}`
    : `/calendar/event/${item.id}`;

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-surface-muted transition-colors"
    >
      {/* Icon */}
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0', style.bg)}>
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text truncate">{item.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          {isLesson && lesson?.className && (
            <>
              <span>{lesson.className}</span>
              <span>•</span>
            </>
          )}
          {!isLesson && event?.className && (
            <>
              <span>{event.className}</span>
              <span>•</span>
            </>
          )}
          <span>{formatTime(item.dateTime)}</span>
          {isLesson && lesson?.duration && (
            <>
              <span>•</span>
              <span>{lesson.duration} min</span>
            </>
          )}
        </div>
        {!isLesson && event?.studentName && (
          <p className="text-xs text-muted mt-0.5">with {event.studentName}</p>
        )}
      </div>

      {/* Status Badge */}
      {isLesson && lesson?.status === 'in_progress' && (
        <span className="flex-shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Live
        </span>
      )}
    </Link>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date >= today && date < tomorrow;
  const isTomorrow =
    date >= tomorrow &&
    date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return timeStr;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + `, ${timeStr}`;
}

// Icons
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

function CalendarEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
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

function ActivityIcon({ className }: { className?: string }) {
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

function ClipboardCheckIcon({ className }: { className?: string }) {
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}
