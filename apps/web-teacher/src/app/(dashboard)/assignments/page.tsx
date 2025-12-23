/**
 * Assignments List Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

const assignments = [
  {
    id: '1',
    title: 'Algebra Quiz 5',
    type: 'quiz',
    class: 'Algebra I',
    dueDate: '2024-12-20',
    status: 'published',
    submissions: 18,
    total: 28,
  },
  {
    id: '2',
    title: 'Chapter 6 Homework',
    type: 'homework',
    class: 'Algebra I',
    dueDate: '2024-12-22',
    status: 'published',
    submissions: 5,
    total: 28,
  },
  {
    id: '3',
    title: 'Final Project',
    type: 'project',
    class: 'Geometry',
    dueDate: '2024-12-30',
    status: 'draft',
    submissions: 0,
    total: 24,
  },
  {
    id: '4',
    title: 'Midterm Review',
    type: 'test',
    class: 'Pre-Calculus',
    dueDate: '2025-01-05',
    status: 'draft',
    submissions: 0,
    total: 22,
  },
];

export default function AssignmentsPage() {
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
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-xl border bg-white p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">
                {assignment.type === 'quiz' && '📋'}
                {assignment.type === 'homework' && '📝'}
                {assignment.type === 'project' && '🎯'}
                {assignment.type === 'test' && '📊'}
              </span>
              <div>
                <Link
                  href={`/assignments/${assignment.id}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {assignment.title}
                </Link>
                <p className="text-sm text-gray-500">
                  {assignment.class} · Due {assignment.dueDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {assignment.submissions}/{assignment.total}
                </p>
                <p className="text-xs text-gray-500">submitted</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  assignment.status === 'published'
                    ? 'bg-green-100 text-green-700'
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
        ))}
      </div>
    </div>
  );
}
