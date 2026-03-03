/**
 * Students List Page
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useStudents } from '@/hooks';
import type { AssessmentChainStatus } from '@/lib/types/student';
import { studentsApi } from '@/lib/api';

/* ─── Assessment status helpers ───────────────────────────────────────── */

interface StatusDisplay {
  label: string;
  icon: string;
  className: string;
}

function getAssessmentDisplay(status: AssessmentChainStatus | null): StatusDisplay {
  if (!status || status.baselineStatus === 'NONE') {
    return { label: 'Setup needed', icon: '🔴', className: 'text-red-600' };
  }
  if (status.parentAssessmentStatus === 'PENDING') {
    return { label: 'Awaiting parent', icon: '🟡', className: 'text-yellow-600' };
  }
  if (status.parentAssessmentStatus === 'IN_PROGRESS') {
    return { label: 'Parent in progress', icon: '🟡', className: 'text-yellow-600' };
  }
  if (
    status.parentAssessmentStatus === 'COMPLETED' &&
    status.baselineStatus === 'NOT_STARTED'
  ) {
    return { label: 'Ready for baseline', icon: '🔵', className: 'text-blue-600' };
  }
  if (status.baselineStatus === 'IN_PROGRESS') {
    return { label: 'Baseline in progress', icon: '🔵', className: 'text-blue-600' };
  }
  if (status.baselineStatus === 'COMPLETED') {
    return { label: 'Learning active', icon: '✅', className: 'text-green-600' };
  }
  return { label: 'Setup needed', icon: '🔴', className: 'text-red-600' };
}

/* ─── Component ───────────────────────────────────────────────────────── */

export default function StudentsPage() {
  const { students, loading, error } = useStudents();
  const [statusMap, setStatusMap] = React.useState<Record<string, AssessmentChainStatus>>({});

  // Fetch assessment status for each student after student list loads
  React.useEffect(() => {
    if (!students.length) return;
    let cancelled = false;

    const fetchStatuses = async () => {
      const entries = await Promise.allSettled(
        students.map(async (s) => {
          const status = await studentsApi.getAssessmentStatus(s.id);
          return [s.id, status] as const;
        }),
      );

      if (cancelled) return;

      const map: Record<string, AssessmentChainStatus> = {};
      for (const entry of entries) {
        if (entry.status === 'fulfilled') {
          const [id, status] = entry.value;
          map[id] = status;
        }
      }
      setStatusMap(map);
    };

    void fetchStatuses();
    return () => { cancelled = true; };
  }, [students]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Students" description="View and manage all your students" />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading students...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Students" description="View and manage all your students" />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load students: {error.message}</p>
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
        title="Students"
        description="View and manage all your students"
        actions={
          <div className="flex gap-2">
            <select className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All Classes</option>
              <option value="1">Algebra I - Period 1</option>
              <option value="2">Algebra I - Period 3</option>
              <option value="3">Geometry - Period 2</option>
            </select>
            <input
              type="search"
              placeholder="Search students..."
              className="rounded-lg border px-4 py-2 text-sm"
            />
          </div>
        }
      />

      <div className="mt-6 rounded-xl border bg-white">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Grade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Current Avg
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Assessment
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Missing
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => {
              const assessmentStatus = statusMap[student.id] ?? null;
              const display = getAssessmentDisplay(assessmentStatus);

              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                        {student.firstName?.[0] ?? '?'}
                        {student.lastName?.[0] ?? ''}
                      </div>
                      <span className="font-medium text-gray-900 hover:text-primary-600">
                        {student.name ?? `${student.firstName ?? ''} ${student.lastName ?? ''}`}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{student.gradeLevel ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={getGradeClass(student.averageScore ?? 0)}>
                      {student.averageScore != null ? `${student.averageScore}%` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {student.hasIep && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                        IEP
                      </span>
                    )}
                    {student.has504 && (
                      <span className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        504
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${display.className}`}>
                      {display.icon} {display.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(student.missingAssignments ?? 0) > 0 ? (
                      <span className="text-sm text-red-600">{student.missingAssignments}</span>
                    ) : (
                      <span className="text-sm text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getGradeClass(grade: number): string {
  if (grade >= 90) return 'font-medium text-green-600';
  if (grade >= 80) return 'font-medium text-blue-600';
  if (grade >= 70) return 'font-medium text-yellow-600';
  if (grade >= 60) return 'font-medium text-orange-600';
  return 'font-medium text-red-600';
}
