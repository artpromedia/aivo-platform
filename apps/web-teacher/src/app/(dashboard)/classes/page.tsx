/**
 * Classes List Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

// Mock data
const classes = [
  {
    id: '1',
    name: 'Algebra I',
    section: 'Period 1',
    room: 'Room 204',
    studentCount: 28,
    averageGrade: 82.5,
    schedule: 'Mon, Wed, Fri 8:00-8:50 AM',
    color: 'bg-blue-500',
  },
  {
    id: '2',
    name: 'Algebra I',
    section: 'Period 3',
    room: 'Room 204',
    studentCount: 26,
    averageGrade: 78.3,
    schedule: 'Mon, Wed, Fri 10:00-10:50 AM',
    color: 'bg-blue-500',
  },
  {
    id: '3',
    name: 'Geometry',
    section: 'Period 2',
    room: 'Room 204',
    studentCount: 24,
    averageGrade: 85.1,
    schedule: 'Tue, Thu 9:00-10:15 AM',
    color: 'bg-green-500',
  },
  {
    id: '4',
    name: 'Pre-Calculus',
    section: 'Period 5',
    room: 'Room 204',
    studentCount: 22,
    averageGrade: 88.7,
    schedule: 'Mon, Wed, Fri 1:00-1:50 PM',
    color: 'bg-purple-500',
  },
  {
    id: '5',
    name: 'Math Lab',
    section: 'Period 6',
    room: 'Room 204',
    studentCount: 15,
    averageGrade: 75.2,
    schedule: 'Tue, Thu 2:00-3:15 PM',
    color: 'bg-orange-500',
  },
];

export default function ClassesPage() {
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
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/classes/${cls.id}`}
            className="group rounded-xl border bg-white p-5 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className={`h-3 w-3 rounded-full ${cls.color}`} />
              <span className="text-xs text-gray-400">{cls.room}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              {cls.name}
            </h3>
            <p className="text-sm text-gray-500">{cls.section}</p>
            <p className="mt-1 text-xs text-gray-400">{cls.schedule}</p>

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{cls.studentCount}</p>
                <p className="text-xs text-gray-500">students</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{cls.averageGrade.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">class average</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
