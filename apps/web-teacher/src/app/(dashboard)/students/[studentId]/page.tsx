/**
 * Student Detail Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
  // Mock data
  const student = {
    id: params.studentId,
    firstName: 'Alex',
    lastName: 'Smith',
    grade: 8,
    email: 'alex.smith@students.school.edu',
    currentGrade: 65,
    hasIep: true,
    classes: ['Algebra I - Period 1', 'Biology - Period 4'],
    accommodations: ['Extended Time', 'Preferential Seating', 'Frequent Breaks'],
  };

  return (
    <div>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`Grade ${student.grade} · ${student.email}`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/messages/new?to=${student.id}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              ✉️ Message Parent
            </Link>
            <Link
              href={`/students/${student.id}/edit`}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Edit Profile
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grade Summary */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold text-gray-900">Grade Summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{student.currentGrade}%</p>
                <p className="text-sm text-gray-500">Current Average</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">D</p>
                <p className="text-sm text-gray-500">Letter Grade</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-3xl font-bold text-red-600">4</p>
                <p className="text-sm text-gray-500">Missing Assignments</p>
              </div>
            </div>
          </div>

          {/* Classes */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold text-gray-900">Enrolled Classes</h3>
            <div className="mt-4 space-y-2">
              {student.classes.map((cls, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-gray-900">{cls}</span>
                  <Link href="/gradebook" className="text-sm text-primary-600 hover:underline">
                    View Grades
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* IEP Info */}
          {student.hasIep && (
            <div className="rounded-xl border bg-purple-50 p-6">
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                  IEP
                </span>
                <h3 className="font-semibold text-gray-900">Accommodations</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {student.accommodations.map((acc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span>✓</span> {acc}
                  </li>
                ))}
              </ul>
              <Link
                href={`/students/${student.id}/iep`}
                className="mt-4 block text-center text-sm text-primary-600 hover:underline"
              >
                View IEP Goals →
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <ActionButton href="#" icon="📊" label="View Progress Report" />
              <ActionButton href="#" icon="📝" label="Add Note" />
              <ActionButton href="#" icon="📞" label="Contact Parent" />
              <ActionButton href="#" icon="📈" label="Grade Calculator" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-gray-50"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
