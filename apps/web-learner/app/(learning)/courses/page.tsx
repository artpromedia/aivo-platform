'use client';

import Link from 'next/link';

import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useCourses } from '@/lib/hooks/use-learner-api';

export default function CoursesPage() {
  const { data: courses, isLoading, error, refetch } = useCourses();

  if (isLoading) return <PageSkeleton />;
  if (error || !courses) {
    return <ErrorState message="Couldn't load your courses." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <p className="mt-1 text-slate-600">Continue where you left off or start something new</p>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <EmptyState emoji="📚" title="No courses yet" description="Courses will appear here once you're enrolled." />
      ) : (
      <div className="grid gap-6 sm:grid-cols-2">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            {/* Course Header */}
            <div className={`bg-gradient-to-r ${course.color} p-6`}>
              <div className="flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
                  {course.thumbnail}
                </div>
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{course.progress}%</div>
                  <div className="text-sm text-white/80">Complete</div>
                </div>
              </div>
            </div>

            {/* Course Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{course.description}</p>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {course.completedLessons} of {course.totalLessons} lessons
                  </span>
                  <span>{course.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${course.color} transition-all`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              {/* Next Lesson */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-500">Next:</span>{' '}
                  <span className="font-medium text-slate-700">{course.nextLesson.title}</span>
                </div>
                <Link
                  href={`/courses/${course.id}/lessons/${course.nextLesson.id}`}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Continue ▶️
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Explore More Section */}
      <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="text-4xl">🌟</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-700">Want to learn more?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Explore additional courses and topics available in your learning path
        </p>
        <Link
          href="/explore"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Explore Courses →
        </Link>
      </section>
    </div>
  );
}
