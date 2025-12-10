'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { MasteryDistribution } from '../../../../components/mastery-distribution';
import { SessionsChart } from '../../../../components/sessions-chart';
import {
  fetchClassroomOverview,
  fetchClassroomLearnerList,
  type ClassroomOverviewResponse,
  type ClassroomLearnerListResponse,
  getRiskFlagLabel,
  getRiskFlagColor,
  getMasteryLabel,
} from '../../../../lib/classroom-analytics';

// Helper to safely format date string
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function ClassroomAnalyticsPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [overview, setOverview] = useState<ClassroomOverviewResponse | null>(null);
  const [learnerList, setLearnerList] = useState<ClassroomLearnerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    return {
      from: formatDateString(from),
      to: formatDateString(to),
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, get access token from auth context
      const accessToken = 'mock-token';

      const [overviewData, learnerData] = await Promise.all([
        fetchClassroomOverview(classroomId, accessToken, dateRange),
        fetchClassroomLearnerList(classroomId, accessToken, dateRange),
      ]);

      setOverview(overviewData);
      setLearnerList(learnerData);

      // Set default selected subject
      if (overviewData.learningProgress.bySubject.length > 0 && !selectedSubject) {
        setSelectedSubject(overviewData.learningProgress.bySubject[0].subjectCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [classroomId, dateRange, selectedSubject]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to });
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted">Loading analytics...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <Card title="Error" className="border-error">
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={loadData} className="mt-4">
            Retry
          </Button>
        </Card>
      </section>
    );
  }

  if (!overview || !learnerList) {
    return null;
  }

  const selectedSubjectData = overview.learningProgress.bySubject.find(
    (s) => s.subjectCode === selectedSubject
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/classrooms"
            className="text-sm text-muted hover:text-primary mb-1 inline-block"
          >
            ← Back to Classrooms
          </Link>
          <Heading kicker="Class Analytics" className="text-headline font-semibold">
            {overview.classroomName}
          </Heading>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onChange={handleDateRangeChange}
          />
          <span className="text-xs text-muted">
            Data as of {new Date(overview.dataFreshAsOf).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Engagement Section */}
      <Card title="Class Engagement" subtitle="Activity overview for the selected period">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <MetricCard
            label="Active Learners"
            value={overview.engagement.activeLearnersCount}
            subtext={`of ${overview.engagement.totalLearnersCount} total`}
            variant={overview.engagement.inactiveLearnersCount > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Inactive Learners"
            value={overview.engagement.inactiveLearnersCount}
            subtext="no sessions in period"
            variant={overview.engagement.inactiveLearnersCount > 3 ? 'error' : 'neutral'}
          />
          <MetricCard
            label="Avg Sessions/Learner"
            value={overview.engagement.avgSessionsPerLearner}
            subtext={`${overview.engagement.totalSessions} total sessions`}
          />
          <MetricCard
            label="Total Time"
            value={`${Math.round(overview.engagement.totalMinutes / 60)}h`}
            subtext={`${overview.engagement.totalMinutes} minutes`}
          />
        </div>

        <div className="h-48">
          <SessionsChart data={overview.engagement.sessionsPerDay} />
        </div>
      </Card>

      {/* Learning Progress Section */}
      <Card title="Learning Progress" subtitle="Mastery score distribution by subject">
        {overview.learningProgress.bySubject.length > 0 ? (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {overview.learningProgress.bySubject.map((subject) => (
                <Button
                  key={subject.subjectCode}
                  variant={selectedSubject === subject.subjectCode ? 'primary' : 'ghost'}
                  onClick={() => {
                    setSelectedSubject(subject.subjectCode);
                  }}
                  className="text-sm"
                >
                  {subject.subjectName}
                </Button>
              ))}
            </div>

            {selectedSubjectData && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">
                    {Math.round(selectedSubjectData.avgMastery * 100)}%
                  </span>
                  <span className="text-muted text-sm">
                    Average mastery ({selectedSubjectData.learnersWithData} learners with data)
                  </span>
                </div>

                <MasteryDistribution buckets={selectedSubjectData.masteryDistribution} />

                <p className="text-sm text-muted italic">
                  {getMasteryLabel(selectedSubjectData.masteryDistribution)}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted text-sm">No learning progress data available for this period.</p>
        )}
      </Card>

      {/* Learner List with Signals */}
      <Card
        title="Learner List with Signals"
        subtitle={`${learnerList.totalCount} learners • ${learnerList.flagCounts.lowEngagement + learnerList.flagCounts.struggling + learnerList.flagCounts.atRiskOverload} need attention`}
      >
        {/* Flag summary */}
        <div className="flex gap-4 mb-4 text-sm">
          {learnerList.flagCounts.lowEngagement > 0 && (
            <span className="flex items-center gap-1">
              <Badge tone="warning">{learnerList.flagCounts.lowEngagement}</Badge>
              <span className="text-muted">Low Engagement</span>
            </span>
          )}
          {learnerList.flagCounts.struggling > 0 && (
            <span className="flex items-center gap-1">
              <Badge tone="error">{learnerList.flagCounts.struggling}</Badge>
              <span className="text-muted">Needs Support</span>
            </span>
          )}
          {learnerList.flagCounts.atRiskOverload > 0 && (
            <span className="flex items-center gap-1">
              <Badge tone="info">{learnerList.flagCounts.atRiskOverload}</Badge>
              <span className="text-muted">Focus Challenges</span>
            </span>
          )}
        </div>

        {/* Learner table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Learner</th>
                <th className="px-4 py-3 text-left font-semibold">Sessions</th>
                <th className="px-4 py-3 text-left font-semibold">Mastery</th>
                <th className="px-4 py-3 text-left font-semibold">Focus Breaks/Session</th>
                <th className="px-4 py-3 text-left font-semibold">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {learnerList.learners.map((learner) => (
                <tr key={learner.learnerId} className="transition hover:bg-surface-muted/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/learners/${learner.learnerId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {learner.learnerName}
                    </Link>
                    <div className="text-xs text-muted">Grade {learner.grade}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={learner.sessionsCount < 4 ? 'text-warning' : ''}>
                      {learner.sessionsCount}
                    </span>
                    <div className="text-xs text-muted">{learner.totalMinutes} min</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={learner.avgMasteryScore < 0.4 ? 'text-error' : ''}>
                      {Math.round(learner.avgMasteryScore * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={learner.focusBreaksPerSession > 3 ? 'text-warning' : ''}>
                      {learner.focusBreaksPerSession}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {learner.riskFlags.length === 0 ? (
                        <Badge tone="success">On Track</Badge>
                      ) : (
                        learner.riskFlags.map((flag) => (
                          <Badge key={flag} tone={getRiskFlagColor(flag)}>
                            {getRiskFlagLabel(flag)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Homework & Focus Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Homework Helper Usage">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted">Learners using Homework Helper</span>
              <span className="font-semibold">
                {overview.homework.learnersUsingHomework} / {overview.homework.totalLearners}
              </span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2"
                style={{ width: `${overview.homework.usagePercentage}%` }}
              />
            </div>
            <p className="text-sm text-muted">
              {overview.homework.usagePercentage}% of learners have used Homework Helper at least
              once. Average {overview.homework.avgSessionsPerUser} sessions per user.
            </p>
          </div>
        </Card>

        <Card title="Focus Summary">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted">Avg Focus Breaks per Session</span>
              <span
                className={`font-semibold ${overview.focus.avgBreaksPerSession > 2 ? 'text-warning' : ''}`}
              >
                {overview.focus.avgBreaksPerSession}
              </span>
            </div>
            <p className="text-sm text-muted">
              {overview.focus.breakRatePercentage}% of sessions ({overview.focus.sessionsWithBreaks}{' '}
              sessions) included focus breaks.{' '}
              {overview.focus.avgBreaksPerSession <= 1.5
                ? 'Students are maintaining good focus overall.'
                : 'Consider reviewing session length or complexity.'}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  subtext,
  variant = 'neutral',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'neutral' | 'success' | 'warning' | 'error';
}) {
  const colorClass = {
    neutral: 'text-text',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }[variant];

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <div className="text-xs font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
      {subtext && <div className="text-xs text-muted mt-1">{subtext}</div>}
    </div>
  );
}

function DateRangeFilter({
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 14 days', days: 14 },
    { label: 'Last 28 days', days: 28 },
    { label: 'Last 90 days', days: 90 },
  ];

  const handlePreset = (days: number) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    onChange(fromDate.toISOString().split('T')[0] ?? '', toDate.toISOString().split('T')[0] ?? '');
  };

  return (
    <div className="flex gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.days}
          variant="ghost"
          className="text-xs"
          onClick={() => {
            handlePreset(preset.days);
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
