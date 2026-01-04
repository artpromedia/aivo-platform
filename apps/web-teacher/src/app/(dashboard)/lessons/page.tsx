/**
 * Lesson Builder Page
 *
 * Allows teachers to create, edit, and manage lesson plans with
 * integrated adaptive content and learning objectives.
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

interface Lesson {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  objectives: string[];
  status: 'draft' | 'published' | 'archived';
  lastModified: string;
  hasAdaptiveContent: boolean;
}

// Mock lesson data
const mockLessons: Lesson[] = [
  {
    id: '1',
    title: 'Introduction to Fractions',
    subject: 'Math',
    gradeLevel: '4th Grade',
    duration: 45,
    objectives: ['Identify fractions', 'Compare fractions with same denominator'],
    status: 'published',
    lastModified: '2024-12-15',
    hasAdaptiveContent: true,
  },
  {
    id: '2',
    title: 'Reading Comprehension: Main Ideas',
    subject: 'Reading',
    gradeLevel: '3rd Grade',
    duration: 30,
    objectives: ['Identify main idea', 'Find supporting details'],
    status: 'published',
    lastModified: '2024-12-14',
    hasAdaptiveContent: true,
  },
  {
    id: '3',
    title: 'Scientific Method Overview',
    subject: 'Science',
    gradeLevel: '5th Grade',
    duration: 50,
    objectives: ['Understand scientific method steps', 'Form hypotheses'],
    status: 'draft',
    lastModified: '2024-12-13',
    hasAdaptiveContent: false,
  },
  {
    id: '4',
    title: 'Multiplication Facts Practice',
    subject: 'Math',
    gradeLevel: '3rd Grade',
    duration: 25,
    objectives: ['Practice multiplication tables 1-10'],
    status: 'published',
    lastModified: '2024-12-12',
    hasAdaptiveContent: true,
  },
  {
    id: '5',
    title: 'Poetry Analysis',
    subject: 'Reading',
    gradeLevel: '5th Grade',
    duration: 40,
    objectives: ['Identify poetic devices', 'Analyze rhythm and rhyme'],
    status: 'archived',
    lastModified: '2024-11-20',
    hasAdaptiveContent: false,
  },
];

const subjectIcons: Record<string, string> = {
  Math: '🔢',
  Reading: '📚',
  Science: '🔬',
  Writing: '✏️',
  default: '📖',
};

export default function LessonsPage() {
  const [filter, setFilter] = React.useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredLessons = mockLessons.filter((lesson) => {
    if (filter !== 'all' && lesson.status !== filter) return false;
    if (searchQuery && !lesson.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Lesson['status']) => {
    switch (status) {
      case 'published':
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            Published
          </span>
        );
      case 'draft':
        return (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            Archived
          </span>
        );
    }
  };

  return (
    <div>
      <PageHeader
        title="Lesson Builder"
        description="Create and manage adaptive lesson plans"
        actions={
          <Link
            href="/lessons/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Lesson
          </Link>
        }
      />

      {/* Filters and Search */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          type="search"
          placeholder="Search lessons..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          className="w-64 rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {/* Lessons Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="group rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
              <span className="text-3xl">
                {subjectIcons[lesson.subject] || subjectIcons.default}
              </span>
              {getStatusBadge(lesson.status)}
            </div>

            {/* Title and Subject */}
            <Link
              href={`/lessons/${lesson.id}`}
              className="block font-semibold text-gray-900 hover:text-primary-600"
            >
              {lesson.title}
            </Link>
            <p className="mt-1 text-sm text-gray-500">
              {lesson.subject} · {lesson.gradeLevel} · {lesson.duration} min
            </p>

            {/* Objectives */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600">Learning Objectives:</p>
              <ul className="mt-1 space-y-0.5">
                {lesson.objectives.slice(0, 2).map((obj, i) => (
                  <li key={i} className="text-xs text-gray-500">
                    • {obj}
                  </li>
                ))}
                {lesson.objectives.length > 2 && (
                  <li className="text-xs text-gray-400">+{lesson.objectives.length - 2} more</li>
                )}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                {lesson.hasAdaptiveContent && (
                  <span
                    className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                    title="This lesson includes adaptive content"
                  >
                    🤖 Adaptive
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">Modified {lesson.lastModified}</span>
            </div>

            {/* Actions (visible on hover) */}
            <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Link
                href={`/lessons/${lesson.id}/edit`}
                className="flex-1 rounded-lg border py-1.5 text-center text-sm font-medium hover:bg-gray-50"
              >
                Edit
              </Link>
              <Link
                href={`/lessons/${lesson.id}`}
                className="flex-1 rounded-lg bg-primary-50 py-1.5 text-center text-sm font-medium text-primary-700 hover:bg-primary-100"
              >
                Preview
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredLessons.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No lessons found</p>
          <Link href="/lessons/new" className="mt-4 inline-block text-primary-600 hover:underline">
            Create your first lesson
          </Link>
        </div>
      )}
    </div>
  );
}
