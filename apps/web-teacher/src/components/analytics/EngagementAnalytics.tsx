/**
 * Engagement Analytics Component
 *
 * Displays engagement metrics and trends for a class.
 * Shows which students are actively engaged vs struggling.
 *
 * Features:
 * - Engagement level distribution
 * - Activity frequency tracking
 * - Time-on-task analysis
 * - Completion rate metrics
 * - WCAG 2.1 AA compliant
 */

'use client';

import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
} from 'lucide-react';
import * as React from 'react';

import { analyticsApi } from '@/lib/api/analytics';
import type { ClassEngagementAnalytics, EngagementLevel, TimePeriod } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EngagementAnalyticsProps {
  classId: string;
  period: TimePeriod;
}

interface ComponentState {
  data: ClassEngagementAnalytics | null;
  isLoading: boolean;
  error: Error | null;
}

export function EngagementAnalytics({ classId, period }: EngagementAnalyticsProps) {
  const [state, setState] = React.useState<ComponentState>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await analyticsApi.getEngagementAnalytics(classId, period);
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load engagement data'),
      });
    }
  }, [classId, period]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (state.isLoading) {
    return <EngagementSkeleton />;
  }

  if (state.error || !state.data) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center" role="alert">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">Unable to load engagement data</h3>
        <p className="text-muted-foreground mb-4">{state.error?.message || 'Unknown error'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Active Students"
          value={`${data.activeStudents}/${data.totalStudents}`}
          subtitle={`${Math.round((data.activeStudents / data.totalStudents) * 100)}% participation`}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Time on Task"
          value={formatDuration(data.averageTimeOnTask)}
          trend={data.timeOnTaskTrend}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completion Rate"
          value={`${Math.round(data.completionRate * 100)}%`}
          trend={data.completionRateTrend}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Avg Sessions/Week"
          value={data.averageSessionsPerWeek.toFixed(1)}
          trend={data.sessionsTrend}
        />
      </div>

      {/* Engagement Distribution */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Engagement Levels</h3>
        <div className="space-y-4">
          <EngagementBar
            level="highly-engaged"
            count={data.distribution.highlyEngaged}
            total={data.totalStudents}
            color="bg-green-500"
          />
          <EngagementBar
            level="engaged"
            count={data.distribution.engaged}
            total={data.totalStudents}
            color="bg-blue-500"
          />
          <EngagementBar
            level="passive"
            count={data.distribution.passive}
            total={data.totalStudents}
            color="bg-yellow-500"
          />
          <EngagementBar
            level="disengaged"
            count={data.distribution.disengaged}
            total={data.totalStudents}
            color="bg-orange-500"
          />
          <EngagementBar
            level="absent"
            count={data.distribution.absent}
            total={data.totalStudents}
            color="bg-red-500"
          />
        </div>
      </div>

      {/* Activity Heatmap (simplified) */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Weekly Activity Pattern
        </h3>
        <WeeklyActivityChart data={data.weeklyActivity} />
      </div>

      {/* Students Needing Attention */}
      {data.lowEngagementStudents.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            Students with Low Engagement
          </h3>
          <div className="space-y-2">
            {data.lowEngagementStudents.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {getInitials(student.studentName)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      Last active: {formatRelativeTime(student.lastActiveDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <EngagementBadge level={student.engagementLevel} />
                  <a
                    href={`/students/${student.studentId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentChange: number };
}

function MetricCard({ icon, label, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <TrendIndicator direction={trend.direction} />
          <span
            className={cn(
              trend.direction === 'up' && 'text-green-600',
              trend.direction === 'down' && 'text-red-600',
              trend.direction === 'stable' && 'text-gray-500'
            )}
          >
            {trend.direction === 'stable'
              ? 'No change'
              : `${trend.percentChange > 0 ? '+' : ''}${trend.percentChange.toFixed(1)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

// Trend Indicator
function TrendIndicator({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-green-500" aria-label="Increasing" />;
    case 'down':
      return <TrendingDown className="h-3 w-3 text-red-500" aria-label="Decreasing" />;
    default:
      return <Minus className="h-3 w-3 text-gray-400" aria-label="Stable" />;
  }
}

// Engagement Bar Component
interface EngagementBarProps {
  level: EngagementLevel;
  count: number;
  total: number;
  color: string;
}

function EngagementBar({ level, count, total, color }: EngagementBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const levelLabel = level
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{levelLabel}</span>
        <span className="text-muted-foreground">
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${levelLabel}: ${count} students`}
        />
      </div>
    </div>
  );
}

// Weekly Activity Chart (simplified)
interface WeeklyActivityChartProps {
  data: { day: string; sessions: number; avgDuration: number }[];
}

function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((day) => {
        const height = (day.sessions / maxSessions) * 100;
        return (
          <div key={day.day} className="flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center mb-2">
              <div
                className="w-8 bg-primary rounded-t transition-all hover:bg-primary/80"
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${day.sessions} sessions, avg ${formatDuration(day.avgDuration)}`}
              />
            </div>
            <span className="text-xs text-muted-foreground">{day.day}</span>
          </div>
        );
      })}
    </div>
  );
}

// Engagement Badge
function EngagementBadge({ level }: { level: EngagementLevel }) {
  const config = getEngagementConfig(level);
  return (
    <span
      className={cn('inline-flex px-2 py-1 text-xs font-medium rounded-full', config.className)}
    >
      {config.label}
    </span>
  );
}

// Skeleton Loader
function EngagementSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="h-40 bg-gray-200 rounded-lg" />
    </div>
  );
}

// Helper Functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getEngagementConfig(level: EngagementLevel) {
  switch (level) {
    case 'highly-engaged':
      return { label: 'Highly Engaged', className: 'bg-green-100 text-green-800' };
    case 'engaged':
      return { label: 'Engaged', className: 'bg-blue-100 text-blue-800' };
    case 'passive':
      return { label: 'Passive', className: 'bg-yellow-100 text-yellow-800' };
    case 'disengaged':
      return { label: 'Disengaged', className: 'bg-orange-100 text-orange-800' };
    case 'absent':
      return { label: 'Absent', className: 'bg-red-100 text-red-800' };
    default:
      return { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
  }
}
