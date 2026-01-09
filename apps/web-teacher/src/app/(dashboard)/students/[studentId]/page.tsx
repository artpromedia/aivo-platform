/**
 * Student Detail Page
 *
 * Displays individual student information, progress, and teacher actions.
 * Addresses UI-UX-001: Fixed broken href="#" links with proper routes
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
  const router = useRouter();
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // TODO: Replace with real API call
  // This mock data should be replaced with: const { data: student } = useStudentQuery(params.studentId)
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

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    setIsSaving(true);
    try {
      // TODO: Replace with real API call
      // await addStudentNote(student.id, noteText);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
      setNoteText('');
      setIsNoteModalOpen(false);
    } finally {
      setIsSaving(false);
    }
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

          {/* Quick Actions - Fixed: replaced href="#" with proper routes/actions */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <ActionButton
                href={`/students/${student.id}/progress`}
                icon="📊"
                label="View Progress Report"
              />
              <ActionButton
                icon="📝"
                label="Add Note"
                onClick={() => setIsNoteModalOpen(true)}
              />
              <ActionButton
                href={`/messages/new?to=${student.id}&type=parent`}
                icon="📞"
                label="Contact Parent"
              />
              <ActionButton
                href={`/students/${student.id}/grades/calculator`}
                icon="📈"
                label="Grade Calculator"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Add Note for {student.firstName}</h3>
            <p className="mt-1 text-sm text-gray-500">
              This note will be visible to other teachers with access to this student.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={4}
              placeholder="Enter your note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isSaving || !noteText.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  href?: string;
  icon: string;
  label: string;
  onClick?: () => void;
}

function ActionButton({ href, icon, label, onClick }: ActionButtonProps) {
  const className = "flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-gray-50 w-full text-left";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <span>{icon}</span>
        <span>{label}</span>
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        <span>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }

  return null;
}
