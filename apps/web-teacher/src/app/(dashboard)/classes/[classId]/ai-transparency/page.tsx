/* cSpell:words Redactions */
/**
 * AI Transparency Page (Container 09 — Page 1 of 4)
 *
 * Class-level AI transparency dashboard showing how AI decisions
 * are made for students in a class. Teachers can review AI interactions,
 * safety measures, and flag concerns.
 *
 * Uses: ai-transparency API (ai-orchestrator + analytics-svc)
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useAccessToken } from '@/hooks/use-access-token';
import { useClass } from '@/hooks/use-classes';
import { classesApi } from '@/lib/api';
import {
  fetchStudentAiTransparency,
  fetchRecentAiDecisions,
  getActionTypeLabel,
  getSourceTypeLabel,
  getSafetyLevelDescription,
  formatMasteryLevel,
  formatRelativeTime,
  type StudentAiTransparencyReport,
  type ExplanationEvent,
} from '@/lib/api/ai-transparency';
import type { StudentRosterEntry } from '@/lib/types/student';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StudentAiSummary {
  studentId: string;
  studentName: string;
  report: StudentAiTransparencyReport | null;
  loading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassAiTransparencyPage() {
  const { classId } = useParams<{ classId: string }>();
  const { class: classData, loading: classLoading, error: classError } = useClass(classId);
  const { accessToken } = useAccessToken();

  const [students, setStudents] = React.useState<StudentRosterEntry[]>([]);
  const [studentsLoading, setStudentsLoading] = React.useState(true);
  const [reports, setReports] = React.useState<Map<string, StudentAiSummary>>(new Map());
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [recentDecisions, setRecentDecisions] = React.useState<ExplanationEvent[]>([]);
  const [decisionsLoading, setDecisionsLoading] = React.useState(false);
  const [timeRange, setTimeRange] = React.useState(7);

  // Fetch class roster
  React.useEffect(() => {
    if (!classId) return;
    classesApi
      .getStudents(classId)
      .then(setStudents)
      .catch(() => {
        setStudents([]);
      })
      .finally(() => {
        setStudentsLoading(false);
      });
  }, [classId]);

  // Fetch AI transparency reports for all students
  React.useEffect(() => {
    if (!students.length || !accessToken) return;

    const newReports = new Map<string, StudentAiSummary>();

    for (const s of students) {
      const sid = s.student.id;
      const name = s.student.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
      newReports.set(sid, {
        studentId: sid,
        studentName: name,
        report: null,
        loading: true,
        error: null,
      });
    }
    setReports(new Map(newReports));

    for (const s of students) {
      const sid = s.student.id;
      const name = s.student.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();

      fetchStudentAiTransparency(sid, accessToken, { days: timeRange, limit: 10 })
        .then((report) => {
          setReports((prev) => {
            const next = new Map(prev);
            next.set(sid, {
              studentId: sid,
              studentName: name,
              report,
              loading: false,
              error: null,
            });
            return next;
          });
        })
        .catch((err: unknown) => {
          setReports((prev) => {
            const next = new Map(prev);
            next.set(sid, {
              studentId: sid,
              studentName: name,
              report: null,
              loading: false,
              error: err instanceof Error ? err.message : String(err),
            });
            return next;
          });
        });
    }
  }, [students, accessToken, timeRange]);

  // Fetch recent decisions for selected student
  React.useEffect(() => {
    if (!selectedStudentId || !accessToken) {
      setRecentDecisions([]);
      return;
    }
    setDecisionsLoading(true);
    fetchRecentAiDecisions(selectedStudentId, accessToken, { days: timeRange, limit: 20 })
      .then((result) => {
        setRecentDecisions(result?.decisions ?? []);
      })
      .catch(() => {
        setRecentDecisions([]);
      })
      .finally(() => {
        setDecisionsLoading(false);
      });
  }, [selectedStudentId, accessToken, timeRange]);

  // Aggregate stats
  const aggregateStats = React.useMemo(() => {
    let totalInteractions = 0;
    let totalFiltered = 0;
    let totalPiiRedactions = 0;
    let studentsLoaded = 0;

    reports.forEach((s) => {
      if (s.report) {
        studentsLoaded++;
        totalInteractions += s.report.totalInteractions;
        totalFiltered += s.report.safetySummary.totalFiltered;
        totalPiiRedactions += s.report.safetySummary.piiRedactionCount;
      }
    });

    return { totalInteractions, totalFiltered, totalPiiRedactions, studentsLoaded };
  }, [reports]);

  // Loading
  if (classLoading || studentsLoading) {
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

  // Error
  if (classError || !classData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{classError?.message ?? 'Class not found'}</p>
        <Link
          href="/classes"
          className="mt-4 inline-block text-sm text-primary-600 hover:underline"
        >
          ← Back to Classes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Transparency"
        description={`How AI supports students in ${classData.name}`}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(Number(e.target.value));
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Link
              href={`/classes/${classId}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              ← Back to Class
            </Link>
          </div>
        }
      />

      {/* Aggregate Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Total AI Interactions"
          value={aggregateStats.totalInteractions}
          icon="🤖"
        />
        <StatCard label="Students Monitored" value={aggregateStats.studentsLoaded} icon="👥" />
        <StatCard
          label="Safety Filters Applied"
          value={aggregateStats.totalFiltered}
          icon="🛡️"
          alert={aggregateStats.totalFiltered > 0}
        />
        <StatCard label="PII Redactions" value={aggregateStats.totalPiiRedactions} icon="🔒" />
      </div>

      {/* Student-level Reports */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Student List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {Array.from(reports.values()).map((s) => (
              <button
                key={s.studentId}
                type="button"
                onClick={() => {
                  setSelectedStudentId(s.studentId === selectedStudentId ? null : s.studentId);
                }}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  selectedStudentId === s.studentId
                    ? 'border-primary-600 bg-primary-50'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">{s.studentName}</span>
                  {s.loading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  )}
                </div>
                {s.report && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{s.report.totalInteractions} interactions</span>
                    <span>·</span>
                    <span
                      className={s.report.safetySummary.totalFiltered > 0 ? 'text-amber-600' : ''}
                    >
                      {s.report.safetySummary.totalFiltered} filtered
                    </span>
                  </div>
                )}
                {s.error && <p className="mt-1 text-xs text-red-500 truncate">{s.error}</p>}
              </button>
            ))}
            {reports.size === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No students enrolled.</p>
            )}
          </div>
        </div>

        {/* Student Detail Panel */}
        <div className="lg:col-span-2">
          {selectedStudentId ? (
            <StudentReportPanel
              summary={reports.get(selectedStudentId) ?? null}
              recentDecisions={recentDecisions}
              decisionsLoading={decisionsLoading}
              classId={classId}
            />
          ) : (
            <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-medium">Select a student</p>
              <p className="text-sm mt-1">
                Click on a student to view their AI transparency report
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT REPORT PANEL
// ═══════════════════════════════════════════════════════════════════════════

function StudentReportPanel({
  summary,
  recentDecisions,
  decisionsLoading,
  _classId,
}: Readonly<{
  summary: StudentAiSummary | null;
  recentDecisions: ExplanationEvent[];
  decisionsLoading: boolean;
  classId: string;
}>) {
  if (!summary) return null;

  if (summary.loading) {
    return (
      <div className="rounded-xl border bg-white p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (summary.error || !summary.report) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-amber-700">{summary.error ?? 'No data available for this student'}</p>
        <p className="mt-2 text-sm text-amber-600">
          AI transparency data requires students to have recent AI interactions.
        </p>
      </div>
    );
  }

  const report = summary.report;
  const mastery = formatMasteryLevel(report.averageFactors.masteryLevel);

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{report.studentName}</h2>
            <p className="text-sm text-gray-500">
              {report.totalInteractions} AI interactions · {report.period.from} to{' '}
              {report.period.to}
            </p>
          </div>
          <Link
            href={`/students/${report.studentId}/ai-conversations`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            View Conversations →
          </Link>
        </div>

        {/* Average Factors */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Mastery Level</p>
            <p className={cn('text-lg font-bold', mastery.color)}>
              {mastery.percentage} <span className="text-sm font-normal">{mastery.label}</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Accuracy</p>
            <p className="text-lg font-bold text-gray-900">
              {Math.round(report.averageFactors.accuracy * 100)}%
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Focus Score</p>
            <p className="text-lg font-bold text-gray-900">
              {Math.round(report.averageFactors.focusScore * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Interaction Breakdown */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Interaction Types</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(report.interactionsByType).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
            >
              <span className="text-sm text-gray-700 capitalize">{type.replace(/_/g, ' ')}</span>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Summary */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🛡️ Safety Summary</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm text-gray-600">Content Filtered</span>
            <span
              className={cn(
                'text-sm font-semibold',
                report.safetySummary.totalFiltered > 0 ? 'text-amber-600' : 'text-green-600'
              )}
            >
              {report.safetySummary.totalFiltered}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm text-gray-600">PII Redacted</span>
            <span className="text-sm font-semibold text-gray-900">
              {report.safetySummary.piiRedactionCount}
            </span>
          </div>
          {Object.entries(report.safetySummary.safetyLevelCounts).map(([level, count]) => (
            <div
              key={level}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <span className="text-sm text-gray-600">{level}</span>
                <p className="text-xs text-gray-400">{getSafetyLevelDescription(level)}</p>
              </div>
              <SafetyLevelBadge level={level} count={count} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Decisions */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recent AI Decisions</h3>
        {decisionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : recentDecisions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent AI decisions recorded.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentDecisions.map((d) => (
              <div key={d.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {getActionTypeLabel(d.actionType)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {getSourceTypeLabel(d.sourceType)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{d.summaryText}</p>
                    {d.detailsJson.reasons && d.detailsJson.reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {d.detailsJson.reasons.slice(0, 3).map((r) => (
                          <span
                            key={r.code}
                            className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-500"
                            title={r.description}
                          >
                            {r.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatRelativeTime(d.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Interactions */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recent AI Interactions</h3>
        {report.recentInteractions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent interactions.</p>
        ) : (
          <div className="space-y-3">
            {report.recentInteractions.map((interaction) => (
              <div key={interaction.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {interaction.requestType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{interaction.subject}</span>
                      <SafetyLevelBadge level={interaction.safetyActions.safetyLevel} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{interaction.topic}</p>
                    <p className="mt-1 text-xs text-gray-400">{interaction.explanation}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {formatRelativeTime(interaction.timestamp)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>Model: {interaction.model}</span>
                  {interaction.confidence != null && (
                    <span>Confidence: {Math.round(interaction.confidence * 100)}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  alert = false,
}: Readonly<{
  label: string;
  value: number;
  icon: string;
  alert?: boolean;
}>) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', alert ? 'text-amber-600' : 'text-gray-900')}>
        {value}
      </p>
    </div>
  );
}

function SafetyLevelBadge({
  level,
  count,
}: Readonly<{
  level: string;
  count?: number;
}>) {
  const colors: Record<string, string> = {
    SAFE: 'bg-green-100 text-green-700',
    LOW: 'bg-yellow-100 text-yellow-700',
    MEDIUM: 'bg-orange-100 text-orange-700',
    HIGH: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        colors[level] ?? 'bg-gray-100 text-gray-600'
      )}
    >
      {level}
      {count != null ? ` (${count})` : ''}
    </span>
  );
}
