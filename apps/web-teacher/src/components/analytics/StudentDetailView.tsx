/**
 * Student Detail View
 *
 * Comprehensive view of individual student analytics.
 * Deep dive into progress, skills, engagement, and recommendations.
 *
 * Features:
 * - Overall metrics summary
 * - Skill mastery breakdown
 * - Engagement metrics
 * - IEP progress (if applicable)
 * - Recent session history
 * - Personalized recommendations
 * - WCAG 2.1 AA compliant
 */

'use client';

import {
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Calendar,
  Book,
  Award,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import * as React from 'react';

import { analyticsApi } from '@/lib/api/analytics';
import type {
  StudentAnalytics,
  SkillMasteryDetail,
  SessionSummary,
  StudentRecommendation,
  TimePeriod,
  RiskLevel,
  EngagementLevel,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface StudentDetailViewProps {
  studentId: string;
  period?: TimePeriod;
}

interface ViewState {
  data: StudentAnalytics | null;
  isLoading: boolean;
  error: Error | null;
}

export function StudentDetailView({ studentId, period = 'month' }: StudentDetailViewProps) {
  const [state, setState] = React.useState<ViewState>({
    data: null,
    isLoading: true,
    error: null,
  });

  const [selectedPeriod, setSelectedPeriod] = React.useState<TimePeriod>(period);

  const fetchData = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await analyticsApi.getStudentAnalytics(studentId, selectedPeriod);
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load student data'),
      });
    }
  }, [studentId, selectedPeriod]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (state.isLoading) {
    return <StudentDetailSkeleton />;
  }

  if (state.error || !state.data) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center" role="alert">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">Unable to load student data</h3>
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
            {getInitials(data.studentName)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{data.studentName}</h1>
            <p className="text-muted-foreground">Grade {data.gradeLevel}</p>
            <div className="flex items-center gap-2 mt-1">
              <RiskBadge level={data.riskLevel} />
              <EngagementBadge level={data.engagementLevel} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value as TimePeriod);
            }}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="Select time period"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="px-4 py-2 border rounded-md text-sm hover:bg-accent flex items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Log Contact
          </button>
        </div>
      </div>

      {/* Risk Factors Alert */}
      {data.riskFactors.length > 0 && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <h3 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Risk Factors Detected
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {data.riskFactors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Overall Mastery"
          value={`${Math.round(data.overallMastery * 100)}%`}
          trend={data.masteryTrend}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Total Learning Time"
          value={formatDuration(data.totalLearningTime)}
          subtitle={`${data.averageSessionLength}min avg session`}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Sessions Completed"
          value={data.sessionsCompleted.toString()}
          subtitle={`${data.streakDays} day streak`}
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4" />}
          label="Last Active"
          value={formatRelativeDate(data.lastActiveDate)}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Strengths & Growth Areas */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-base font-semibold mb-4">Strengths & Growth Areas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-green-600 flex items-center gap-1 mb-2">
                  <Award className="h-4 w-4" aria-hidden="true" />
                  Strengths
                </h4>
                {data.strengthAreas.length > 0 ? (
                  <ul className="space-y-1">
                    {data.strengthAreas.map((skill, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" aria-hidden="true" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Building strengths...</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-600 flex items-center gap-1 mb-2">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  Growth Areas
                </h4>
                {data.growthAreas.length > 0 ? (
                  <ul className="space-y-1">
                    {data.growthAreas.map((skill, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Target className="h-3 w-3 text-orange-500" aria-hidden="true" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">All areas on track!</p>
                )}
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-base font-semibold mb-4">Engagement Metrics</h3>
            <div className="space-y-4">
              <EngagementMetricBar
                label="Time on Task"
                value={data.engagementMetrics.averageTimeOnTask}
                max={30}
                unit="min"
              />
              <EngagementMetricBar
                label="Completion Rate"
                value={data.engagementMetrics.completionRate * 100}
                max={100}
                unit="%"
              />
              <EngagementMetricBar
                label="Correct First Attempt"
                value={data.engagementMetrics.correctFirstAttemptRate * 100}
                max={100}
                unit="%"
              />
              <EngagementMetricBar
                label="Hint Usage"
                value={data.engagementMetrics.hintUsageRate * 100}
                max={100}
                unit="%"
                inverted
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Skill Mastery */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Book className="h-4 w-4" aria-hidden="true" />
              Skill Mastery
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.skillMastery.slice(0, 10).map((skill) => (
                <SkillRow key={skill.skillId} skill={skill} />
              ))}
            </div>
            {data.skillMastery.length > 10 && (
              <button className="mt-3 text-sm text-primary hover:underline">
                View all {data.skillMastery.length} skills
              </button>
            )}
          </div>

          {/* IEP Progress (if applicable) */}
          {data.iepProgress?.hasIEP && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Target className="h-4 w-4" aria-hidden="true" />
                IEP Goals
              </h3>
              <div className="space-y-3">
                {data.iepProgress.goals.slice(0, 3).map((goal) => (
                  <div key={goal.goalId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <IEPStatusBadge status={goal.status} />
                      <span className="text-sm font-medium truncate">{goal.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(goal.currentProgress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(goal.currentProgress)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <a
                href={`/students/${studentId}/iep`}
                className="mt-3 text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View full IEP
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Accommodations */}
          {data.activeAccommodations.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-base font-semibold mb-3">Active Accommodations</h3>
              <div className="flex flex-wrap gap-2">
                {data.activeAccommodations.map((acc, i) => (
                  <span key={i} className="px-3 py-1 text-sm bg-blue-50 text-blue-800 rounded-full">
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Recommendations</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {data.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Recent Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">
                  Activities
                </th>
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">
                  Avg Score
                </th>
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentSessions.slice(0, 5).map((session) => (
                <tr key={session.sessionId} className="border-b last:border-0">
                  <td className="py-3 text-sm">{formatDate(session.date)}</td>
                  <td className="py-3 text-sm">{session.duration} min</td>
                  <td className="py-3 text-sm">{session.activitiesCompleted}</td>
                  <td className="py-3 text-sm">{Math.round(session.averageScore * 100)}%</td>
                  <td className="py-3">
                    <EngagementBadge level={session.engagementLevel} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
              trend.direction === 'down' && 'text-red-600'
            )}
          >
            {trend.percentChange > 0 ? '+' : ''}
            {trend.percentChange.toFixed(1)}%
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
      return <TrendingUp className="h-3 w-3 text-green-500" aria-hidden="true" />;
    case 'down':
      return <TrendingDown className="h-3 w-3 text-red-500" aria-hidden="true" />;
    default:
      return <Minus className="h-3 w-3 text-gray-400" aria-hidden="true" />;
  }
}

// Risk Badge
function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    'on-track': { label: 'On Track', className: 'bg-green-100 text-green-800' },
    watch: { label: 'Watch', className: 'bg-yellow-100 text-yellow-800' },
    'at-risk': { label: 'At Risk', className: 'bg-orange-100 text-orange-800' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
  };
  const { label, className } = config[level];
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', className)}>{label}</span>
  );
}

// Engagement Badge
function EngagementBadge({
  level,
  size = 'default',
}: {
  level: EngagementLevel;
  size?: 'sm' | 'default';
}) {
  const config = {
    'highly-engaged': { label: 'Highly Engaged', className: 'bg-green-100 text-green-800' },
    engaged: { label: 'Engaged', className: 'bg-blue-100 text-blue-800' },
    passive: { label: 'Passive', className: 'bg-yellow-100 text-yellow-800' },
    disengaged: { label: 'Disengaged', className: 'bg-orange-100 text-orange-800' },
    absent: { label: 'Absent', className: 'bg-red-100 text-red-800' },
  };
  const { label, className } = config[level];
  return (
    <span
      className={cn(
        'font-medium rounded-full',
        className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {label}
    </span>
  );
}

// IEP Status Badge
function IEPStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string }> = {
    met: { className: 'bg-green-100 text-green-800' },
    'on-track': { className: 'bg-blue-100 text-blue-800' },
    'at-risk': { className: 'bg-yellow-100 text-yellow-800' },
    behind: { className: 'bg-red-100 text-red-800' },
  };
  const { className } = config[status] || { className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', className)}>
      {status.replace('-', ' ')}
    </span>
  );
}

// Engagement Metric Bar
interface EngagementMetricBarProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  inverted?: boolean;
}

function EngagementMetricBar({ label, value, max, unit, inverted }: EngagementMetricBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const color = inverted
    ? percentage > 50
      ? 'bg-orange-500'
      : 'bg-green-500'
    : percentage < 50
      ? 'bg-orange-500'
      : 'bg-green-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Skill Row
function SkillRow({ skill }: { skill: SkillMasteryDetail }) {
  const masteryPercent = Math.round(skill.mastery * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{skill.skillName}</span>
          <div className="flex items-center gap-1">
            {skill.trend === 'improving' && (
              <TrendingUp className="h-3 w-3 text-green-500" aria-hidden="true" />
            )}
            {skill.trend === 'declining' && (
              <TrendingDown className="h-3 w-3 text-red-500" aria-hidden="true" />
            )}
            <span className="text-sm">{masteryPercent}%</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full',
              masteryPercent >= 90
                ? 'bg-green-500'
                : masteryPercent >= 70
                  ? 'bg-blue-500'
                  : masteryPercent >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            )}
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Recommendation Card
function RecommendationCard({ recommendation }: { recommendation: StudentRecommendation }) {
  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  };

  return (
    <div
      className={cn(
        'p-4 bg-gray-50 rounded-lg border-l-4',
        priorityColors[recommendation.priority]
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 rounded-full uppercase">
          {recommendation.type}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {recommendation.priority} priority
        </span>
      </div>
      <h4 className="font-medium text-sm mb-1">{recommendation.title}</h4>
      <p className="text-sm text-muted-foreground mb-2">{recommendation.description}</p>
      <ul className="text-xs space-y-1">
        {recommendation.actionItems.slice(0, 2).map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Skeleton Loader
function StudentDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
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
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
