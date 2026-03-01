/**
 * AI Conversations Page (Container 09 — Page 2 of 4)
 *
 * Per-student view of all AI interactions with expandable conversation
 * transcripts, teacher annotation tools (flag/note/approve), and
 * subject filtering. Shows safety flags prominently.
 *
 * Uses: ai-transparency API (fetchStudentAiTransparency, fetchAiInteractionDetails, reportAiConcern)
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useAccessToken } from '@/hooks/use-access-token';
import { useStudent } from '@/hooks/use-students';
import {
  fetchStudentAiTransparency,
  fetchAiInteractionDetails,
  reportAiConcern,
  formatRelativeTime,
  getSafetyLevelDescription,
  type AiInteractionSummary,
  type StudentAiTransparencyReport,
} from '@/lib/api/ai-transparency';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function StudentAiConversationsPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const {
    student: studentData,
    loading: studentLoading,
    error: studentError,
  } = useStudent(params.studentId);
  const { accessToken } = useAccessToken();

  const [report, setReport] = React.useState<StudentAiTransparencyReport | null>(null);
  const [reportLoading, setReportLoading] = React.useState(true);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = React.useState<AiInteractionSummary | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [subjectFilter, setSubjectFilter] = React.useState<string>('all');
  const [timeRange, setTimeRange] = React.useState(30);

  // Flag concern modal state
  const [flagModalOpen, setFlagModalOpen] = React.useState(false);
  const [flagInteractionId, setFlagInteractionId] = React.useState<string | null>(null);
  const [flagType, setFlagType] = React.useState<
    'INAPPROPRIATE' | 'INCORRECT' | 'SAFETY' | 'OTHER'
  >('OTHER');
  const [flagDescription, setFlagDescription] = React.useState('');
  const [flagSubmitting, setFlagSubmitting] = React.useState(false);
  const [flagSuccess, setFlagSuccess] = React.useState<string | null>(null);

  // Fetch student AI transparency report
  React.useEffect(() => {
    if (!params.studentId || !accessToken) return;
    setReportLoading(true);
    setReportError(null);

    fetchStudentAiTransparency(params.studentId, accessToken, { days: timeRange, limit: 50 })
      .then((data) => {
        setReport(data);
      })
      .catch((err: unknown) => {
        setReportError(err instanceof Error ? err.message : 'Failed to load AI data');
      })
      .finally(() => {
        setReportLoading(false);
      });
  }, [params.studentId, accessToken, timeRange]);

  // Fetch expanded interaction detail
  React.useEffect(() => {
    if (!expandedId || !accessToken) {
      setExpandedDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchAiInteractionDetails(expandedId, accessToken)
      .then((data) => {
        setExpandedDetail(data);
      })
      .catch(() => {
        setExpandedDetail(null);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [expandedId, accessToken]);

  // Get unique subjects for filter
  const subjects = React.useMemo(() => {
    if (!report) return [];
    const set = new Set(report.recentInteractions.map((i) => i.subject));
    return Array.from(set).sort();
  }, [report]);

  // Filtered interactions
  const filteredInteractions = React.useMemo(() => {
    if (!report) return [];
    if (subjectFilter === 'all') return report.recentInteractions;
    return report.recentInteractions.filter((i) => i.subject === subjectFilter);
  }, [report, subjectFilter]);

  // Handle flag report
  const handleSubmitFlag = async () => {
    if (!flagInteractionId || !accessToken || !flagDescription.trim()) return;
    setFlagSubmitting(true);
    try {
      const result = await reportAiConcern(
        flagInteractionId,
        { type: flagType, description: flagDescription },
        accessToken
      );
      setFlagSuccess(`Report submitted (ID: ${result.reportId})`);
      setFlagDescription('');
      setTimeout(() => {
        setFlagModalOpen(false);
        setFlagSuccess(null);
      }, 2000);
    } catch {
      setFlagSuccess('Failed to submit report. Please try again.');
    } finally {
      setFlagSubmitting(false);
    }
  };

  const studentName = studentData ? `${studentData.firstName} ${studentData.lastName}` : 'Student';

  // Loading
  if (studentLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500">Loading student data...</p>
        </div>
      </div>
    );
  }

  // Student error
  if (studentError || !studentData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{studentError?.message ?? 'Student not found'}</p>
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
        title="AI Conversations"
        description={`AI interaction history for ${studentName}`}
        breadcrumbs={[
          { label: 'Students', href: '/students' },
          { label: studentName, href: `/students/${params.studentId}` },
          { label: 'AI Conversations' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        }
      />

      {/* Summary Stats */}
      {report && (
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="Total Interactions" value={report.totalInteractions} icon="💬" />
          <StatCard
            label="Safety Filtered"
            value={report.safetySummary.totalFiltered}
            icon="🛡️"
            alert={report.safetySummary.totalFiltered > 0}
          />
          <StatCard
            label="Avg Mastery"
            value={`${Math.round(report.averageFactors.masteryLevel * 100)}%`}
            icon="📊"
          />
          <StatCard
            label="Avg Focus"
            value={`${Math.round(report.averageFactors.focusScore * 100)}%`}
            icon="🎯"
          />
        </div>
      )}

      {/* Interactions List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Conversations
          {filteredInteractions.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredInteractions.length})
            </span>
          )}
        </h2>

        {reportLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : reportError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-600">{reportError}</p>
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">🤖</p>
            <p className="font-medium">No AI conversations found</p>
            <p className="text-sm mt-1">
              {subjectFilter !== 'all'
                ? 'Try changing the subject filter or time range.'
                : 'This student has no recorded AI interactions in the selected time range.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInteractions.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                isExpanded={expandedId === interaction.id}
                expandedDetail={expandedId === interaction.id ? expandedDetail : null}
                detailLoading={expandedId === interaction.id && detailLoading}
                onToggle={() => {
                  setExpandedId(expandedId === interaction.id ? null : interaction.id);
                }}
                onFlag={(id) => {
                  setFlagInteractionId(id);
                  setFlagModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Flag Concern Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">🚩 Flag AI Concern</h3>
            <p className="mt-1 text-sm text-gray-500">
              Report a concern about this AI interaction to platform administrators.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concern Type</label>
                <select
                  value={flagType}
                  onChange={(e) => {
                    setFlagType(e.target.value as typeof flagType);
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="INAPPROPRIATE">Inappropriate Content</option>
                  <option value="INCORRECT">Incorrect Information</option>
                  <option value="SAFETY">Safety Concern</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  placeholder="Describe your concern..."
                  value={flagDescription}
                  onChange={(e) => {
                    setFlagDescription(e.target.value);
                  }}
                />
              </div>
            </div>

            {flagSuccess && (
              <p
                className={cn(
                  'mt-3 text-sm',
                  flagSuccess.includes('Failed') ? 'text-red-600' : 'text-green-600'
                )}
              >
                {flagSuccess}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFlagModalOpen(false);
                  setFlagSuccess(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFlag}
                disabled={flagSubmitting || !flagDescription.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {flagSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION CARD
// ═══════════════════════════════════════════════════════════════════════════

function InteractionCard({
  interaction,
  isExpanded,
  expandedDetail,
  detailLoading,
  onToggle,
  onFlag,
}: Readonly<{
  interaction: AiInteractionSummary;
  isExpanded: boolean;
  expandedDetail: AiInteractionSummary | null;
  detailLoading: boolean;
  onToggle: () => void;
  onFlag: (id: string) => void;
}>) {
  const safetyLevel = interaction.safetyActions.safetyLevel;
  const hasSafetyConcern = safetyLevel === 'MEDIUM' || safetyLevel === 'HIGH';

  return (
    <div
      className={cn(
        'rounded-xl border bg-white transition-all',
        hasSafetyConcern && 'border-amber-200',
        isExpanded && 'ring-1 ring-primary-200'
      )}
    >
      {/* Header — always visible */}
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {interaction.requestType.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {interaction.subject}
              </span>
              <SafetyBadge level={safetyLevel} />
              {interaction.safetyActions.piiRedacted && (
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                  PII Redacted
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{interaction.topic}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-400">
              {formatRelativeTime(interaction.timestamp)}
            </span>
            <span className="text-lg">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {detailLoading ? (
            <div className="py-4 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Loading details...</p>
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              {/* Explanation */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  AI Explanation
                </h4>
                <p className="text-sm text-gray-700">
                  {expandedDetail?.explanation ?? interaction.explanation}
                </p>
              </div>

              {/* Decision Factors */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Decision Factors
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {interaction.decisionFactors.masteryLevel != null && (
                    <FactorPill
                      label="Mastery"
                      value={`${Math.round(interaction.decisionFactors.masteryLevel * 100)}%`}
                    />
                  )}
                  {interaction.decisionFactors.recentAccuracy != null && (
                    <FactorPill
                      label="Accuracy"
                      value={`${Math.round(interaction.decisionFactors.recentAccuracy * 100)}%`}
                    />
                  )}
                  {interaction.decisionFactors.focusScore != null && (
                    <FactorPill
                      label="Focus"
                      value={`${Math.round(interaction.decisionFactors.focusScore * 100)}%`}
                    />
                  )}
                  {interaction.decisionFactors.attemptCount != null && (
                    <FactorPill
                      label="Attempts"
                      value={String(interaction.decisionFactors.attemptCount)}
                    />
                  )}
                  {interaction.decisionFactors.sessionDurationMinutes != null && (
                    <FactorPill
                      label="Session"
                      value={`${interaction.decisionFactors.sessionDurationMinutes}m`}
                    />
                  )}
                </div>
                {interaction.decisionFactors.accommodations &&
                  interaction.decisionFactors.accommodations.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Accommodations applied: </span>
                      <span className="text-xs text-purple-600">
                        {interaction.decisionFactors.accommodations.join(', ')}
                      </span>
                    </div>
                  )}
              </div>

              {/* Safety Details */}
              {hasSafetyConcern && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <h4 className="text-xs font-semibold text-amber-700 uppercase mb-1">
                    ⚠️ Safety Details
                  </h4>
                  <p className="text-sm text-amber-700">{getSafetyLevelDescription(safetyLevel)}</p>
                  {interaction.safetyActions.contentFilters.length > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Filters: {interaction.safetyActions.contentFilters.join(', ')}
                    </p>
                  )}
                  {interaction.safetyActions.toxicityScore != null && (
                    <p className="mt-1 text-xs text-amber-600">
                      Toxicity score: {(interaction.safetyActions.toxicityScore * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}

              {/* Model Info */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>Model: {interaction.model}</span>
                <span>Provider: {interaction.provider}</span>
                {interaction.confidence != null && (
                  <span>Confidence: {Math.round(interaction.confidence * 100)}%</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    onFlag(interaction.id);
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  🚩 Flag Concern
                </button>
                <Link
                  href={`/students/${interaction.id}/progress`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  📊 View Progress
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
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
  value: string | number;
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

function SafetyBadge({ level }: Readonly<{ level: string }>) {
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
    </span>
  );
}

function FactorPill({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-900">{value}</span>
    </div>
  );
}
