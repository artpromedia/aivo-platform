/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Class Detail Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader, Tabs } from '@/components/layout/breadcrumb';

// This would normally come from params and API
export default function ClassDetailPage({ params }: { params: { classId: string } }) {
  // Mock data
  const classData = {
    id: params.classId,
    name: 'Algebra I',
    section: 'Period 1',
    room: 'Room 204',
    studentCount: 28,
    averageGrade: 82.5,
    schedule: 'Mon, Wed, Fri 8:00-8:50 AM',
  };

  return (
    <div>
      <PageHeader
        title={`${classData.name} - ${classData.section}`}
        description={`${classData.room} · ${classData.schedule}`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/gradebook?class=${classData.id}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              📊 Gradebook
            </Link>
            <Link
              href={`/assignments/new?class=${classData.id}`}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              + New Assignment
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatBox label="Students" value={classData.studentCount} />
        <StatBox label="Class Average" value={`${classData.averageGrade}%`} />
        <StatBox label="Assignments" value={12} />
        <StatBox label="Missing Work" value={5} alert />
      </div>

      {/* Tabs would go here for Students, Assignments, Analytics, Settings */}
      <div className="mt-6 rounded-xl border bg-white p-6">
        <p className="text-center text-gray-500">
          Class detail tabs with students roster, assignments, and analytics would be displayed
          here.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Link
            href={`/classes/${classData.id}/students`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            View Students
          </Link>
          <Link
            href={`/classes/${classData.id}/assignments`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            View Assignments
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
