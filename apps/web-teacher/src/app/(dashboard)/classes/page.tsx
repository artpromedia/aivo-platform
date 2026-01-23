/**
 * Classes List Page
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useClasses } from '@/hooks';

// Color palette for class cards
const classColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

export default function ClassesPage() {
  const { classes, loading, error } = useClasses();

  if (loading) {
    return (
      <div>
        <PageHeader
          title="My Classes"
          description="Manage your classes and view student progress"
        />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading classes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="My Classes"
          description="Manage your classes and view student progress"
        />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load classes: {error.message}</p>
          <button
            onClick={() => {
              globalThis.location.reload();
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Classes"
        description="Manage your classes and view student progress"
        actions={
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            + Add Class
          </button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, index) => (
          <Link
            key={cls.id}
            href={`/classes/${cls.id}`}
            className="group rounded-xl border bg-white p-5 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className={`h-3 w-3 rounded-full ${classColors[index % classColors.length]}`} />
              <span className="text-xs text-gray-400">{cls.gradeLevel}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              {cls.name}
            </h3>
            <p className="text-sm text-gray-500">{cls.subject}</p>
            {cls.period != null && (
              <p className="mt-1 text-xs text-gray-400">Period {cls.period}</p>
            )}

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{cls.studentCount}</p>
                <p className="text-xs text-gray-500">students</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {cls.averageGrade != null ? `${cls.averageGrade.toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-gray-500">class average</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
