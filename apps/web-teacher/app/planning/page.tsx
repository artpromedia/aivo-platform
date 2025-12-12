import { Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { Suspense } from 'react';

import { LessonPlanForm } from './lesson-plan-form';

/**
 * Lesson Planning Page
 *
 * Allows teachers to create lesson plans with marketplace content
 * integrated into activities.
 */
export default function LessonPlanningPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading kicker="Planning" className="text-headline font-semibold">
            Create Lesson Plan
          </Heading>
          <p className="mt-1 text-muted">Build engaging lessons using your library resources.</p>
        </div>
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Classrooms
        </Link>
      </div>

      <Suspense fallback={<FormSkeleton />}>
        <LessonPlanForm />
      </Suspense>
    </section>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  );
}
