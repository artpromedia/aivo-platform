/**
 * Student Detail Page
 *
 * Hub for viewing student progress, IEP, parent access, and accommodations.
 * Tabbed layout: Overview, Progress, IEP, Parent Access, Accommodations.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useStudent, useStudentProgress, useIEPGoals } from '@/hooks';
import { studentsApi } from '@/lib/api';
import type { Accommodation } from '@/lib/types/student';

// ─── Tab Type ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'progress' | 'iep' | 'parent' | 'accommodations';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'progress', label: 'Progress' },
  { id: 'iep', label: 'IEP' },
  { id: 'parent', label: 'Parent Access' },
  { id: 'accommodations', label: 'Accommodations' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId ?? '';

  const { student, loading, error } = useStudent(studentId);
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Student Detail"
          breadcrumbs={[
            { label: 'Students', href: '/students' },
            { label: 'Loading...' },
          ]}
        />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading student...</span>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div>
        <PageHeader
          title="Student Detail"
          breadcrumbs={[
            { label: 'Students', href: '/students' },
            { label: 'Error' },
          ]}
        />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">
            {error?.message ?? 'Student not found.'}
          </p>
          <Link
            href="/students"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    student.name ??
    (`${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
    'Unknown Student');

  return (
    <div>
      <PageHeader
        title={displayName}
        breadcrumbs={[
          { label: 'Students', href: '/students' },
          { label: displayName },
        ]}
        description={
          [
            student.gradeLevel ? `Grade ${student.gradeLevel}` : null,
            student.classes?.[0]?.className,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
      />

      {/* Student header card */}
      <div className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700">
            {student.firstName?.[0] ?? '?'}
            {student.lastName?.[0] ?? ''}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              {student.hasIep && (
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  IEP
                </span>
              )}
              {student.has504 && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  504
                </span>
              )}
              {student.isEll && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  ELL
                </span>
              )}
              {student.riskLevel && student.riskLevel !== 'none' && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    student.riskLevel === 'critical' || student.riskLevel === 'high'
                      ? 'bg-red-100 text-red-700'
                      : student.riskLevel === 'medium'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {student.riskLevel.toUpperCase()} RISK
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500">
              {student.email && <span>{student.email}</span>}
              {student.studentNumber && <span>ID: {student.studentNumber}</span>}
              {student.gradeLevel && <span>Grade {student.gradeLevel}</span>}
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden gap-4 sm:flex">
            <QuickStat
              label="Average"
              value={student.averageScore != null ? `${String(student.averageScore)}%` : '-'}
              color={getGradeColor(student.averageScore ?? 0)}
            />
            <QuickStat
              label="Progress"
              value={student.overallProgress != null ? `${String(student.overallProgress)}%` : '-'}
              color="text-gray-900"
            />
            <QuickStat
              label="Missing"
              value={String(student.missingAssignments ?? 0)}
              color={(student.missingAssignments ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}
            />
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mt-6 border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Student tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab student={student} />}
        {activeTab === 'progress' && <ProgressTab studentId={studentId} />}
        {activeTab === 'iep' && <IEPTab studentId={studentId} student={student} />}
        {activeTab === 'parent' && <ParentAccessTab student={student} />}
        {activeTab === 'accommodations' && <AccommodationsTab studentId={studentId} student={student} />}
      </div>
    </div>
  );
}

// ─── Quick stat pill ─────────────────────────────────────────────────────────

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ student }: { student: NonNullable<ReturnType<typeof useStudent>['student']> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Classes */}
      {student.classes && student.classes.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Classes</h3>
          <ul className="mt-3 divide-y">
            {student.classes.map((cls) => (
              <li key={cls.classId} className="flex items-center justify-between py-2">
                <Link href={`/classes/${cls.classId}`} className="text-sm text-primary-600 hover:underline">
                  {cls.className}
                </Link>
                <div className="flex items-center gap-3">
                  {cls.currentGrade != null && (
                    <span className={`text-sm font-medium ${getGradeColor(cls.currentGrade)}`}>
                      {cls.letterGrade ?? `${String(cls.currentGrade)}%`}
                    </span>
                  )}
                  {cls.trend && <TrendBadge trend={cls.trend} />}
                  {cls.missingAssignments > 0 && (
                    <span className="text-xs text-red-500">{cls.missingAssignments} missing</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths & Growth */}
      <div className="space-y-4">
        {student.strengths && student.strengths.length > 0 && (
          <div className="rounded-xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Strengths</h3>
            <ul className="mt-2 space-y-1">
              {student.strengths.map((s) => (
                <li key={`strength-${s}`} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {student.areasForGrowth && student.areasForGrowth.length > 0 && (
          <div className="rounded-xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Areas for Growth</h3>
            <ul className="mt-2 space-y-1">
              {student.areasForGrowth.map((a) => (
                <li key={`growth-${a}`} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-orange-500">→</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {student.recentActivity && student.recentActivity.length > 0 && (
        <div className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          <ul className="mt-3 divide-y">
            {student.recentActivity.slice(0, 10).map((activity) => (
              <li key={activity.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {student.notes && student.notes.length > 0 && (
        <div className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
          <ul className="mt-3 space-y-3">
            {student.notes.slice(0, 5).map((note) => (
              <li key={note.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    {note.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{note.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Progress Tab ────────────────────────────────────────────────────────────

function ProgressTab({ studentId }: { studentId: string }) {
  const { progress, loading, error } = useStudentProgress(studentId);

  if (loading) {
    return <LoadingSpinner label="Loading progress..." />;
  }
  if (error || !progress) {
    return <ErrorBanner message={error?.message ?? 'Unable to load progress data.'} />;
  }

  const { academicProgress, skillsProgress, attendanceProgress } = progress;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Academic summary */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Academic Progress</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <StatCard label="Overall Grade" value={`${String(academicProgress.overallGrade)}%`} />
          <StatCard
            label="Grade Change"
            value={`${academicProgress.gradeChange >= 0 ? '+' : ''}${String(academicProgress.gradeChange)}%`}
          />
          <StatCard
            label="Assignments"
            value={`${String(academicProgress.assignmentsCompleted)}/${String(academicProgress.assignmentsTotal)}`}
          />
          <StatCard label="Avg Score" value={`${String(academicProgress.averageScore)}%`} />
          <StatCard
            label="On-Time Rate"
            value={`${String(Math.round(academicProgress.onTimeSubmissionRate * 100))}%`}
          />
        </div>
      </div>

      {/* Attendance */}
      {attendanceProgress && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatCard label="Attendance Rate" value={`${String(attendanceProgress.attendanceRate)}%`} />
            <StatCard label="Days Present" value={String(attendanceProgress.daysPresent)} />
            <StatCard label="Days Absent" value={String(attendanceProgress.daysAbsent)} />
            <StatCard label="Tardies" value={String(attendanceProgress.tardies)} />
          </div>
        </div>
      )}

      {/* Skills progress */}
      {skillsProgress.length > 0 && (
        <div className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">Skills Progress</h3>
          <div className="mt-4 space-y-3">
            {skillsProgress.map((skill) => (
              <div key={`skill-${skill.skillName}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{skill.skillName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {skill.currentLevel}/{skill.targetLevel}
                    </span>
                    {skill.trend && <TrendBadge trend={skill.trend} />}
                  </div>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{
                      width: `${String(Math.min(100, (skill.currentLevel / skill.targetLevel) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {progress.recommendations && progress.recommendations.length > 0 && (
        <div className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">Recommendations</h3>
          <ul className="mt-3 space-y-2">
            {progress.recommendations.map((rec) => (
              <li key={`rec-${rec}`} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 text-primary-500">•</span> {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── IEP Tab ─────────────────────────────────────────────────────────────────

function IEPTab({
  studentId,
  student,
}: {
  studentId: string;
  student: NonNullable<ReturnType<typeof useStudent>['student']>;
}) {
  const { goals, loading, error } = useIEPGoals(studentId);

  if (!student.hasIep && !student.has504) {
    return (
      <div className="rounded-xl border bg-gray-50 p-8 text-center">
        <p className="text-gray-500">This student does not have an IEP or 504 plan on file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* IEP Summary */}
      {student.iepDetails && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">IEP Summary</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DetailItem label="Status" value={student.iepDetails.status ?? '-'} />
            <DetailItem label="Case Manager" value={student.iepDetails.caseManager ?? '-'} />
            <DetailItem
              label="Next Review"
              value={
                student.iepDetails.nextReviewDate
                  ? new Date(student.iepDetails.nextReviewDate).toLocaleDateString()
                  : '-'
              }
            />
            <DetailItem label="Primary Disability" value={student.iepDetails.primaryDisability ?? '-'} />
            <DetailItem label="Category" value={student.iepDetails.eligibilityCategory ?? '-'} />
          </div>
        </div>
      )}

      {/* 504 Plan */}
      {student.plan504Details && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">504 Plan</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DetailItem label="Status" value={student.plan504Details.status ?? '-'} />
            <DetailItem label="Condition" value={student.plan504Details.disablingCondition ?? '-'} />
            <DetailItem
              label="Renewal Date"
              value={
                student.plan504Details.renewalDate
                  ? new Date(student.plan504Details.renewalDate).toLocaleDateString()
                  : '-'
              }
            />
          </div>
          {student.plan504Details.accommodations && student.plan504Details.accommodations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500">Accommodations</p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {student.plan504Details.accommodations.map((acc) => (
                  <li key={`504-${acc}`} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {acc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* IEP Goals */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">IEP Goals</h3>
        {loading ? (
          <LoadingSpinner label="Loading goals..." />
        ) : error ? (
          <ErrorBanner message={error.message} />
        ) : goals.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No IEP goals found.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {goal.title ?? goal.description ?? 'Untitled Goal'}
                  </p>
                  {goal.status && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        goal.status === 'mastered'
                          ? 'bg-green-100 text-green-700'
                          : goal.status === 'on_track'
                            ? 'bg-blue-100 text-blue-700'
                            : goal.status === 'at_risk'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {goal.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {goal.description && (
                  <p className="mt-1 text-xs text-gray-500">{goal.description}</p>
                )}
                {goal.currentProgress != null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{goal.currentProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${String(Math.min(100, goal.currentProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      {student.iepDetails?.services && student.iepDetails.services.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Services</h3>
          <div className="mt-3 space-y-2">
            {student.iepDetails.services.map((svc) => (
              <div key={svc.id ?? `svc-${svc.serviceType ?? svc.type}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{svc.serviceType ?? svc.type}</p>
                  {svc.provider && <p className="text-xs text-gray-500">Provider: {svc.provider}</p>}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {svc.frequency && <p>{svc.frequency}</p>}
                  {svc.duration && <p>{svc.duration}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parent Access Tab ───────────────────────────────────────────────────────

function ParentAccessTab({
  student,
}: {
  student: NonNullable<ReturnType<typeof useStudent>['student']>;
}) {
  const contacts = student.parentContacts ?? [];
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviting, setInviting] = React.useState(false);
  const [inviteMsg, setInviteMsg] = React.useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await fetch(`/api/teacher/students/${student.id}/parent-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteMsg('Invitation sent successfully!');
      setInviteEmail('');
    } catch {
      setInviteMsg('Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing contacts */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Parent / Guardian Contacts</h3>
        {contacts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No parent contacts on file.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-500">
                    {contact.relationship} {contact.isPrimary && '(Primary)'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{contact.email}</p>
                  {contact.phone && <p>{contact.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite parent */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Invite Parent / Guardian</h3>
        <p className="mt-1 text-xs text-gray-500">
          Send an email invitation for a parent to create their Aivo account and link to this student.
        </p>
        <div className="mt-4 flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
            }}
            placeholder="parent@example.com"
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={() => {
              void handleInvite();
            }}
            disabled={inviting || !inviteEmail.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
        {inviteMsg && (
          <p className={`mt-2 text-sm ${inviteMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {inviteMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Accommodations Tab ──────────────────────────────────────────────────────

function AccommodationsTab({
  studentId,
  student,
}: {
  studentId: string;
  student: NonNullable<ReturnType<typeof useStudent>['student']>;
}) {
  const [accommodations, setAccommodations] = React.useState<Accommodation[]>(
    student.accommodations ?? [],
  );
  const [accLoading, setAccLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setAccLoading(true);
      try {
        const data = await studentsApi.getAccommodations(studentId);
        if (!cancelled) {
          setAccommodations(data);
        }
      } catch {
        // Fall back to what's already in student object
      } finally {
        if (!cancelled) {
          setAccLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (accLoading) {
    return <LoadingSpinner label="Loading accommodations..." />;
  }

  if (accommodations.length === 0) {
    return (
      <div className="rounded-xl border bg-gray-50 p-8 text-center">
        <p className="text-gray-500">No accommodations on record for this student.</p>
      </div>
    );
  }

  const active = accommodations.filter(
    (a) => a.isActive !== false && a.implementationStatus !== 'not_started',
  );
  const inactive = accommodations.filter(
    (a) => a.isActive === false || a.implementationStatus === 'not_started',
  );

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Active Accommodations</h3>
          <div className="mt-3 space-y-2">
            {active.map((acc) => (
              <AccommodationCard key={acc.id} accommodation={acc} />
            ))}
          </div>
        </div>
      )}
      {inactive.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Inactive / Pending</h3>
          <div className="mt-3 space-y-2">
            {inactive.map((acc) => (
              <AccommodationCard key={acc.id} accommodation={acc} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccommodationCard({ accommodation: acc }: { accommodation: Accommodation }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">
            {acc.description ?? acc.type ?? 'Accommodation'}
          </p>
          {acc.isCritical && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Critical</span>
          )}
        </div>
        {acc.source && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {acc.source.toUpperCase()}
          </span>
        )}
      </div>
      {acc.category && <p className="mt-0.5 text-xs text-gray-400">{acc.category}</p>}
      {acc.notes && <p className="mt-1 text-xs text-gray-500">{acc.notes}</p>}
      {acc.implementationStatus && (
        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
            acc.implementationStatus === 'implemented' || acc.implementationStatus === 'active'
              ? 'bg-green-100 text-green-700'
              : acc.implementationStatus === 'in_progress'
                ? 'bg-blue-100 text-blue-700'
                : acc.implementationStatus === 'needs_review'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500'
          }`}
        >
          {acc.implementationStatus.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'up') return <span className="text-xs text-green-600">↑</span>;
  if (trend === 'down') return <span className="text-xs text-red-500">↓</span>;
  return <span className="text-xs text-gray-400">→</span>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      <span className="ml-3 text-sm text-gray-500">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-600';
  if (grade >= 80) return 'text-blue-600';
  if (grade >= 70) return 'text-yellow-600';
  if (grade >= 60) return 'text-orange-600';
  return 'text-red-600';
}
