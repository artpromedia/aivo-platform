/**
 * Class Overview Dashboard
 *
 * Main dashboard for teachers to view class-level analytics at a glance.
 * Designed for the 5-minute between-class check-in use case.
 *
 * Features:
 * - Key metrics cards (mastery, engagement, time, at-risk)
 * - Trend visualizations
 * - Top insights (limited to 3-5 for quick consumption)
 * - Distribution charts
 * - WCAG 2.1 AA compliant
 */

'use client';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Clock,
  Users,
  Download,
  RefreshCw,
} from 'lucide-react';
import * as React from 'react';

import { MasteryDistributionChart, TrendLineChart, RiskDistributionChart } from './charts';
import { InsightCard } from './InsightCard';

import { analyticsApi } from '@/lib/api/analytics';
import type { ClassOverviewMetrics, TimePeriod } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClassOverviewDashboardProps {
  classId: string;
  className: string;
}

interface DashboardState {
  metrics: ClassOverviewMetrics | null;
  isLoading: boolean;
  error: Error | null;
}

export function ClassOverviewDashboard({
  classId,
  className: classDisplayName,
}: ClassOverviewDashboardProps) {
  const [period, setPeriod] = React.useState<TimePeriod>('week');
  const [activeTab, setActiveTab] = React.useState('overview');
  const [state, setState] = React.useState<DashboardState>({
    metrics: null,
    isLoading: true,
    error: null,
  });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const metrics = await analyticsApi.getClassOverview(classId, period);
      setState({ metrics, isLoading: false, error: null });
    } catch (err) {
      setState({
        metrics: null,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to load analytics'),
      });
    }
  }, [classId, period]);

  React.useEffect(() => {
    void fetchData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(
      () => {
        void fetchData();
      },
      5 * 60 * 1000
    );
    return () => {
      clearInterval(interval);
    };
  }, [fetchData]);

  // Trend icon helper
  const trendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" aria-label="Trending up" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" aria-label="Trending down" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" aria-label="Stable" />;
    }
  };

  const formatPercentChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (state.isLoading) {
    return <DashboardSkeleton />;
  }

  if (state.error || !state.metrics) {
    return <DashboardError onRetry={fetchData} error={state.error} />;
  }

  const { metrics } = state;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{classDisplayName}</h1>
          <p className="text-sm text-gray-500">
            {metrics.activeStudents} of {metrics.totalStudents} students active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as TimePeriod);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Select time period"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Export report"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average Mastery */}
        <MetricCard
          title="Average Mastery"
          value={`${(metrics.averageMastery * 100).toFixed(0)}%`}
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
          trend={metrics.masteryTrend.direction}
          change={metrics.previousPeriodComparison.masteryChange}
          period={period}
        />

        {/* Engagement */}
        <MetricCard
          title="Engagement"
          value={`${(metrics.averageEngagement * 100).toFixed(0)}%`}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          trend={metrics.engagementTrend.direction}
          change={metrics.previousPeriodComparison.engagementChange}
          period={period}
        />

        {/* Learning Time */}
        <MetricCard
          title="Learning Time"
          value={formatDuration(metrics.totalLearningTime)}
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          subtitle={`${Math.round(metrics.totalLearningTime / metrics.totalStudents)} min avg per student`}
        />

        {/* Students at Risk */}
        <MetricCard
          title="Needs Attention"
          value={metrics.riskDistribution.critical + metrics.riskDistribution.atRisk}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          variant={metrics.riskDistribution.critical > 0 ? 'danger' : 'default'}
          badges={
            [
              metrics.riskDistribution.critical > 0 && {
                label: `${metrics.riskDistribution.critical} critical`,
                variant: 'danger' as const,
              },
              metrics.riskDistribution.atRisk > 0 && {
                label: `${metrics.riskDistribution.atRisk} at-risk`,
                variant: 'warning' as const,
              },
            ].filter(Boolean) as { label: string; variant: 'danger' | 'warning' }[]
          }
        />
      </div>

      {/* Insights */}
      {metrics.insights.length > 0 && (
        <section aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="text-lg font-semibold text-gray-900 mb-3">
            Key Insights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.insights.slice(0, 3).map((insight, index) => (
              <InsightCard key={`insight-${index}`} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Dashboard tabs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'mastery', label: 'Mastery' },
            { id: 'engagement', label: 'Engagement' },
            { id: 'at-risk', label: 'At-Risk Students' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Mastery Distribution */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Mastery Distribution</h3>
              <p className="text-sm text-gray-500 mb-4">
                How students are performing across mastery levels
              </p>
              <MasteryDistributionChart
                data={metrics.masteryDistribution}
                totalStudents={metrics.totalStudents}
              />
            </div>

            {/* Risk Distribution */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Student Risk Levels</h3>
              <p className="text-sm text-gray-500 mb-4">
                Students categorized by risk of falling behind
              </p>
              <RiskDistributionChart
                data={metrics.riskDistribution}
                totalStudents={metrics.totalStudents}
              />
            </div>

            {/* Trend Chart */}
            <div className="rounded-xl border bg-white p-6 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-1">Mastery Trend</h3>
              <p className="text-sm text-gray-500 mb-4">Class average mastery over time</p>
              <TrendLineChart
                data={metrics.masteryTrend.dataPoints}
                color="#22c55e"
                label="Class Average Mastery"
                height={300}
                showGoalLine
                goalValue={80}
                goalLabel="Target (80%)"
              />
            </div>
          </div>
        )}

        {activeTab === 'mastery' && (
          <div className="text-center py-12 text-gray-500">
            <p>Skill Mastery Matrix component will be loaded here</p>
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="text-center py-12 text-gray-500">
            <p>Engagement Analytics component will be loaded here</p>
          </div>
        )}

        {activeTab === 'at-risk' && (
          <div className="text-center py-12 text-gray-500">
            <p>At-Risk Students Panel component will be loaded here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  period?: TimePeriod;
  subtitle?: string;
  variant?: 'default' | 'danger';
  badges?: { label: string; variant: 'danger' | 'warning' }[];
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  change,
  period,
  subtitle,
  variant = 'default',
  badges,
}: MetricCardProps) {
  const trendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4',
        variant === 'danger' && 'border-red-200 bg-red-50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend && change !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
          {trendIcon(trend)}
          <span>
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}% from last {period}
          </span>
        </div>
      )}
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {badges.map((badge, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                badge.variant === 'danger' && 'bg-red-100 text-red-800',
                badge.variant === 'warning' && 'bg-yellow-100 text-yellow-800'
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Skeleton loader
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 bg-gray-200 rounded w-1/4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}

// Error state
function DashboardError({ onRetry, error }: { onRetry: () => void; error: Error | null }) {
  return (
    <div className="text-center py-12" role="alert">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load dashboard</h3>
      <p className="text-gray-500 mb-4">
        {error?.message || 'There was a problem loading the analytics data.'}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        Try Again
      </button>
    </div>
  );
}
