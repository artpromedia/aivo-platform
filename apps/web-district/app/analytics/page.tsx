'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import { MasteryDistributionChart } from '../../components/analytics/mastery-distribution-chart';
import { TrendChart } from '../../components/analytics/trend-chart';
import {
  fetchTenantOverview,
  fetchTenantSchools,
  type TenantOverviewResponse,
  type TenantSchoolsResponse,
} from '../../lib/tenant-analytics';

// Helper to safely format date string
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function DistrictAnalyticsPage() {
  // In production, get tenantId from auth context
  const tenantId = 'tenant-1';

  const [overview, setOverview] = useState<TenantOverviewResponse | null>(null);
  const [schools, setSchools] = useState<TenantSchoolsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      const [overviewData, schoolsData] = await Promise.all([
        fetchTenantOverview(tenantId, accessToken, dateRange),
        fetchTenantSchools(tenantId, accessToken, dateRange),
      ]);

      setOverview(overviewData);
      setSchools(schoolsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateRange]);

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

  if (!overview || !schools) {
    return null;
  }

  const engagementRate = Math.round(
    (overview.engagement.activeLearnersCount / overview.engagement.totalLearnersCount) * 100
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading kicker="District Analytics" className="text-headline font-semibold">
            {overview.tenantName}
          </Heading>
          <p className="text-sm text-muted mt-1">
            Overview of learning activity across all schools
          </p>
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Learners"
          value={overview.engagement.activeLearnersCount.toLocaleString()}
          subtext={`of ${overview.engagement.totalLearnersCount.toLocaleString()} total (${engagementRate}%)`}
          variant={engagementRate >= 75 ? 'success' : engagementRate >= 50 ? 'warning' : 'error'}
        />
        <MetricCard
          label="Active Schools"
          value={overview.engagement.activeSchoolsCount}
          subtext={`of ${overview.engagement.totalSchoolsCount} total`}
        />
        <MetricCard
          label="Average Mastery"
          value={`${Math.round(overview.progress.overallAvgMastery * 100)}%`}
          subtext={`${overview.progress.learnersWithProgressData.toLocaleString()} learners with data`}
          variant={overview.progress.overallAvgMastery >= 0.7 ? 'success' : 'neutral'}
        />
        <MetricCard
          label="Avg Sessions/Learner"
          value={overview.engagement.avgSessionsPerLearner}
          subtext={`${overview.engagement.totalSessions.toLocaleString()} total sessions`}
        />
      </div>

      {/* Module Usage */}
      <Card title="Module Adoption" subtitle="Usage across the district">
        <div className="grid gap-4 md:grid-cols-3">
          {overview.moduleUsage.map((module) => (
            <div key={module.moduleName} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{module.moduleName}</span>
                <Badge tone={module.enabled ? 'success' : 'neutral'}>
                  {module.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="text-2xl font-bold mb-1">{module.usagePercentage}%</div>
              <div className="text-xs text-muted">
                {module.activeUsers.toLocaleString()} active users
              </div>
              <div className="w-full bg-surface-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${module.usagePercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trend Chart and Progress Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Daily Activity Trend" subtitle="Sessions and active learners over time">
          <div className="h-64">
            <TrendChart data={overview.dailyTrend} />
          </div>
        </Card>

        <Card title="Mastery Distribution" subtitle="District-wide progress breakdown">
          <div className="h-64">
            <MasteryDistributionChart buckets={overview.progress.masteryDistribution} />
          </div>
        </Card>
      </div>

      {/* School Table */}
      <Card
        title="Schools Overview"
        subtitle={`${schools.totalSchools} schools in district`}
        action={
          <Button variant="ghost" className="text-sm">
            Export
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">School</th>
                <th className="px-4 py-3 text-left font-semibold">Learners</th>
                <th className="px-4 py-3 text-left font-semibold">Engagement</th>
                <th className="px-4 py-3 text-left font-semibold">Avg Sessions</th>
                <th className="px-4 py-3 text-left font-semibold">Avg Mastery</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {schools.schools.map((school) => (
                <tr key={school.schoolId} className="transition hover:bg-surface-muted/80">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">{school.schoolName}</div>
                    <div className="text-xs text-muted">{school.classroomsCount} classrooms</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{school.activeLearnersCount.toLocaleString()}</div>
                    <div className="text-xs text-muted">
                      of {school.learnersCount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-muted rounded-full h-2">
                        <div
                          className={`rounded-full h-2 ${
                            school.engagementRate >= 80
                              ? 'bg-success'
                              : school.engagementRate >= 60
                                ? 'bg-warning'
                                : 'bg-error'
                          }`}
                          style={{ width: `${school.engagementRate}%` }}
                        />
                      </div>
                      <span className="text-xs">{school.engagementRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{school.avgSessionsPerLearner}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        school.avgMastery >= 0.7
                          ? 'text-success'
                          : school.avgMastery >= 0.5
                            ? 'text-text'
                            : 'text-warning'
                      }
                    >
                      {Math.round(school.avgMastery * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/schools/${school.schoolId}/analytics`}>
                      <Button variant="ghost" className="text-xs">
                        View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Privacy Note */}
      <p className="text-xs text-muted text-center">
        This dashboard shows aggregate data only. Individual student information is available to
        authorized school staff only.
      </p>
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</div>
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
