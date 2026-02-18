/**
 * Student Detail Page
 *
 * Displays individual student information, progress, and teacher actions.
 * Addresses UI-UX-001: Fixed broken href="#" links with proper routes
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useStudent } from '@/hooks/use-students';
import { studentsApi } from '@/lib/api';

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Fetch student data using the useStudent hook
  const { student: studentData, loading, error } = useStudent(params.studentId ?? '');

  // Transform student data for display
  const student = studentData
    ? {
        id: studentData.id,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        grade: parseInt(studentData.gradeLevel ?? '0', 10) || 0,
        email: studentData.email,
        currentGrade: studentData.overallGrade ?? 0,
        hasIep: studentData.hasIep,
        classes: studentData.classes?.map((c) => c.className) ?? [],
        accommodations: studentData.accommodations?.map((a) => a.description) ?? [],
      }
    : null;

  const handleAddNote = async () => {
    if (!noteText.trim() || !student) return;

    setIsSaving(true);
    setNoteError(null);
    try {
      await studentsApi.addNote(student.id, {
        content: noteText,
        type: 'observation',
        isPrivate: false,
      });
      setNoteText('');
      setIsNoteModalOpen(false);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500">Loading student data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !student) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error?.message ?? 'Student not found'}</p>
        <button
          onClick={() => {
            router.back();
          }}
          className="mt-4 text-sm text-primary-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

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
                onClick={() => {
                  setIsNoteModalOpen(true);
                }}
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
            <h3 className="text-lg font-semibold text-gray-900">
              Add Note for {student.firstName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This note will be visible to other teachers with access to this student.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={4}
              placeholder="Enter your note..."
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
              }}
            />
            {noteError && <p className="mt-2 text-sm text-red-600">{noteError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNoteModalOpen(false);
                }}
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
  const className =
    'flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-gray-50 w-full text-left';

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
