'use client';

import { Search, BookOpen, ChevronRight, Clock, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useCourses } from '@/lib/hooks/use-learner-api';

const FILTERS = ['All', 'In Progress', 'Not Started', 'Completed'] as const;

export default function CoursesPage() {
  const { data: courses, isLoading, error, refetch } = useCourses();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All');

  if (isLoading) return <PageSkeleton />;
  if (error || !courses) {
    return <ErrorState message="Couldn't load your courses." onRetry={() => void refetch()} />;
  }

  const filtered = courses.filter((c) => {
    const matchesSearch =
      !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === 'All' ||
      (activeFilter === 'In Progress' && c.progress > 0 && c.progress < 100) ||
      (activeFilter === 'Not Started' && c.progress === 0) ||
      (activeFilter === 'Completed' && c.progress === 100);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-500 mt-1">
            {courses.length} course{courses.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Explore Courses
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === f
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <EmptyState emoji="📚" title="No courses found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}/lessons/${course.nextLesson.id}`}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 transition"
            >
              {/* Color banner */}
              <div className={`h-2 bg-gradient-to-r ${course.color}`} />

              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                    {course.thumbnail}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{course.description}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {course.completedLessons}/{course.totalLessons} lessons
                  </span>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">{course.progress}%</span>
                </div>

                {/* Next lesson */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400 truncate">
                    Next: <span className="text-gray-600">{course.nextLesson.title}</span>
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
