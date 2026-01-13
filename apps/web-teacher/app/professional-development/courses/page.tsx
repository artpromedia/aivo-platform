/**
 * PD Courses Page
 *
 * Browse and enroll in professional development courses
 */

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PDCourseList } from '@/components/professional-development';
import { usePDPrograms, usePDEnrollments } from '@/hooks/use-professional-development';

const CATEGORIES = [
  'All',
  'Classroom Management',
  'Instructional Strategies',
  'Technology Integration',
  'Special Education',
  'Social-Emotional Learning',
  'Assessment',
];

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');

  const { programs, loading: programsLoading } = usePDPrograms(
    selectedCategory !== 'All' ? selectedCategory : undefined
  );
  const { enrollments, loading: enrollmentsLoading, enroll } = usePDEnrollments();

  const isLoading = programsLoading || enrollmentsLoading;

  // Filter programs based on search and enrollment status
  const filteredPrograms = React.useMemo(() => {
    let filtered = programs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Filter by enrollment status
    if (filterParam === 'in-progress') {
      const inProgressIds = new Set(
        enrollments.filter((e) => e.status === 'IN_PROGRESS').map((e) => e.programId)
      );
      filtered = filtered.filter((p) => inProgressIds.has(p.id));
    } else if (filterParam === 'completed') {
      const completedIds = new Set(
        enrollments.filter((e) => e.status === 'COMPLETED').map((e) => e.programId)
      );
      filtered = filtered.filter((p) => completedIds.has(p.id));
    } else if (filterParam === 'not-started') {
      const enrolledIds = new Set(enrollments.map((e) => e.programId));
      filtered = filtered.filter((p) => !enrolledIds.has(p.id));
    }

    return filtered;
  }, [programs, enrollments, searchQuery, filterParam]);

  const handleEnroll = async (programId: string) => {
    try {
      await enroll(programId);
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/professional-development" className="hover:text-primary-600">
            Professional Development
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Courses</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
          <p className="mt-1 text-gray-600">
            Discover courses to enhance your teaching skills
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-2">
            <Link
              href="/professional-development/courses"
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                !filterParam
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </Link>
            <Link
              href="/professional-development/courses?filter=in-progress"
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                filterParam === 'in-progress'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress
            </Link>
            <Link
              href="/professional-development/courses?filter=completed"
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                filterParam === 'completed'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </Link>
            <Link
              href="/professional-development/courses?filter=not-started"
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                filterParam === 'not-started'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Not Started
            </Link>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {filteredPrograms.length} course{filteredPrograms.length !== 1 ? 's' : ''} found
            </p>
            <PDCourseList
              programs={filteredPrograms}
              enrollments={enrollments}
              onEnroll={handleEnroll}
              emptyMessage="No courses match your search criteria"
            />
          </>
        )}
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
