/**
 * Assignments List Page
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useAssignments } from '@/hooks';

// Helper to format due date
function formatDueDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper to get assignment type icon
function getTypeIcon(type?: string): string {
  switch (type) {
    case 'quiz':
      return '📋';
    case 'homework':
      return '📝';
    case 'project':
      return '🎯';
    case 'test':
      return '📊';
    default:
      return '📄';
  }
}

export default function AssignmentsPage() {
  const { assignments, loading, error } = useAssignments();

  if (loading) {
    return (
      <div>
        <PageHeader title="Assignments" description="Create and manage assignments" />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading assignments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Assignments" description="Create and manage assignments" />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load assignments: {error.message}</p>
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
        title="Assignments"
        description="Create and manage assignments"
        actions={
          <Link
            href="/assignments/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Assignment
          </Link>
        }
      />

      <div className="mt-6 space-y-4">
        {assignments.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">No assignments yet. Create your first assignment!</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getTypeIcon(assignment.type)}</span>
                <div>
                  <Link
                    href={`/assignments/${assignment.id}`}
                    className="font-medium text-gray-900 hover:text-primary-600"
                  >
                    {assignment.title}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {assignment.className ?? assignment.category} · Due{' '}
                    {formatDueDate(assignment.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {assignment.submissionCount ?? 0}/{assignment.totalStudents ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">submitted</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    assignment.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : assignment.status === 'closed'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {assignment.status}
                </span>
                <Link
                  href={`/assignments/${assignment.id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
