/**
 * Class Detail Page
 *
 * Shows class info + tabbed views for Students, Assignments, Analytics, Attendance.
 * Wired to real APIs via classesApi / analyticsApi hooks.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { PageHeader, Tabs } from '@/components/layout/breadcrumb';
import { useClass, useClassAnalytics } from '@/hooks/use-classes';
import { classesApi } from '@/lib/api';
import type { StudentRosterEntry } from '@/lib/types/student';
import type { Assignment } from '@/lib/types/assignment';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatClassTitle(name: string, section?: string): string {
  if (section) return name + ' - ' + section;
  return name;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return value + '%';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { class: classData, loading, error } = useClass(classId);
  const { analytics } = useClassAnalytics(classId);
  const [activeTab, setActiveTab] = React.useState('students');
  const [students, setStudents] = React.useState<StudentRosterEntry[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [studentsLoading, setStudentsLoading] = React.useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!classId) return;
    classesApi
      .getStudents(classId)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
    classesApi
      .getAssignments(classId)
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, [classId]);

  const tabs = [
    { id: 'students', label: 'Students', count: students.length },
    { id: 'assignments', label: 'Assignments', count: assignments.length },
    { id: 'analytics', label: 'Analytics' },
    { id: 'attendance', label: 'Attendance' },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error?.message ?? 'Class not found'}</p>
        <Link href="/classes" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to Classes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={formatClassTitle(classData.name, classData.section)}
        description={[classData.room, classData.schedule].filter(Boolean).join(' · ')}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/gradebook?class=${classId}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              📊 Gradebook
            </Link>
            <Link
              href={`/assignments/new?class=${classId}`}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              + New Assignment
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatBox label="Students" value={students.length} />
        <StatBox
          label="Class Average"
          value={formatPercent(analytics?.averageScore)}
        />
        <StatBox label="Assignments" value={assignments.length} />
        <StatBox
          label="At Risk"
          value={analytics?.atRiskStudents ?? 0}
          alert={(analytics?.atRiskStudents ?? 0) > 0}
        />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-4">
          {activeTab === 'students' && (
            <StudentsTab students={students} loading={studentsLoading} classId={classId} />
          )}
          {activeTab === 'assignments' && (
            <AssignmentsTab
              assignments={assignments}
              loading={assignmentsLoading}
              classId={classId}
            />
          )}
          {activeTab === 'analytics' && <AnalyticsTab classId={classId} analytics={analytics} />}
          {activeTab === 'attendance' && <AttendanceTab classId={classId} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Students
// ═══════════════════════════════════════════════════════════════════════════

function StudentsTab({
  students,
  loading,
  classId,
}: Readonly<{
  students: StudentRosterEntry[];
  loading: boolean;
  classId: string;
}>) {
  if (loading) return <LoadingSkeleton rows={5} />;
  if (students.length === 0)
    return <EmptyState message="No students enrolled yet." action="Add students from the roster." />;

  return (
    <div className="rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Mastery</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId ?? s.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{s.name ?? `${s.firstName} ${s.lastName}`}</td>
              <td className="px-4 py-3">{s.gradeLevel ?? '—'}</td>
              <td className="px-4 py-3">{formatPercent(s.mastery)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status ?? 'active'} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/students/${s.studentId ?? s.id}`}
                  className="text-primary-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Assignments
// ═══════════════════════════════════════════════════════════════════════════

function AssignmentsTab({
  assignments,
  loading,
  classId,
}: Readonly<{
  assignments: Assignment[];
  loading: boolean;
  classId: string;
}>) {
  if (loading) return <LoadingSkeleton rows={4} />;
  if (assignments.length === 0)
    return (
      <EmptyState
        message="No assignments yet."
        action={
          <Link
            href={`/assignments/new?class=${classId}`}
            className="mt-2 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            + Create Assignment
          </Link>
        }
      />
    );

  return (
    <div className="space-y-3">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-xl border bg-white p-4"
        >
          <div>
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-gray-500">
              {a.category ?? a.type} · Due {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={a.status} />
            <Link
              href={`/assignments/${a.id}`}
              className="text-sm text-primary-600 hover:underline"
            >
              View
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Analytics
// ═══════════════════════════════════════════════════════════════════════════

interface ClassAnalyticsData {
  averageScore?: number;
  completionRate?: number;
  engagementRate?: number;
  atRiskStudents?: number;
  topPerformers?: number;
}

function AnalyticsTab({
  classId,
  analytics,
}: Readonly<{
  classId: string;
  analytics: ClassAnalyticsData | null;
}>) {
  if (!analytics) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
        Loading analytics…
      </div>
    );
  }

  const metrics = [
    { label: 'Average Score', value: `${analytics.averageScore ?? 0}%` },
    { label: 'Completion Rate', value: `${analytics.completionRate ?? 0}%` },
    { label: 'Engagement', value: `${analytics.engagementRate ?? 0}%` },
    { label: 'Top Performers', value: analytics.topPerformers ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <StatBox key={m.label} label={m.label} value={m.value} />
        ))}
      </div>
      <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
        <p>Detailed charts and trend visualisation will appear here.</p>
        <Link
          href={`/analytics?class=${classId}`}
          className="mt-2 inline-block text-sm text-primary-600 hover:underline"
        >
          Open Full Analytics →
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Attendance
// ═══════════════════════════════════════════════════════════════════════════

function AttendanceTab({ classId }: Readonly<{ classId: string }>) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
      <p>Attendance tracking coming soon.</p>
      <p className="mt-1 text-sm">
        This feature will integrate with session-svc to show daily attendance and trends.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════

function StatBox({
  label,
  value,
  alert = false,
}: Readonly<{
  label: string;
  value: string | number;
  alert?: boolean;
}>) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
    inactive: 'bg-gray-100 text-gray-500',
    'at-risk': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function LoadingSkeleton({ rows }: Readonly<{ rows: number }>) {
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line react/no-array-index-key */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skeleton-${i}`} className="h-14 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

function EmptyState({ message, action }: Readonly<{ message: string; action?: React.ReactNode }>) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
      <p>{message}</p>
      {typeof action === 'string' ? <p className="mt-1 text-sm">{action}</p> : action}
    </div>
  );
}
