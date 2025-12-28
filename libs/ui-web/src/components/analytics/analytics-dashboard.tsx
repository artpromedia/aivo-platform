// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD COMPONENTS
// React components for analytics visualization
// ══════════════════════════════════════════════════════════════════════════════

'use client';

import * as React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'percentage' | 'duration' | 'currency';
  className?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface StudentMetricsSummary {
  studentId: string;
  studentName: string;
  lessonsCompleted: number;
  averageScore: number;
  masteryLevel: number;
  timeOnTask: number;
  lastActive: Date | null;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ClassMetricsSummary {
  classId: string;
  className: string;
  studentCount: number;
  activeStudents: number;
  averageScore: number;
  completionRate: number;
  atRiskCount: number;
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Metric Card ───────────────────────────────────────────────────────────────

/**
 * A card component displaying a single metric with optional trend indicator
 */
export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  format = 'number',
  className,
}: MetricCardProps) {
  const formattedValue = React.useMemo(() => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'percentage':
        return formatPercentage(value);
      case 'duration':
        return formatDuration(value);
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      default:
        return formatNumber(value);
    }
  }, [value, format]);

  const trendColor = React.useMemo(() => {
    if (!trend) return '';
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  }, [trend]);

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-gray-100',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{formattedValue}</p>
          {change !== undefined && (
            <div className={cn('flex items-center mt-2 text-sm', trendColor)}>
              {trend === 'up' && (
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
              {trend === 'down' && (
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              <span>
                {change >= 0 ? '+' : ''}
                {change}%
              </span>
              {changeLabel && <span className="ml-1 text-gray-500">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
        )}
      </div>
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

/**
 * A progress bar component with customizable colors and sizes
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = 'primary',
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    danger: 'bg-red-600',
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-gray-900">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── Mastery Level Indicator ───────────────────────────────────────────────────

export interface MasteryLevelProps {
  level: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Visual indicator for skill mastery level
 */
export function MasteryLevel({ level, size = 'md', showLabel = true, className }: MasteryLevelProps) {
  const segments = 5;
  const filledSegments = Math.round(level * segments);

  const sizeClasses = {
    sm: 'h-2 gap-0.5',
    md: 'h-3 gap-1',
    lg: 'h-4 gap-1.5',
  };

  const getMasteryColor = (segmentIndex: number, filled: boolean): string => {
    if (!filled) return 'bg-gray-200';
    if (level >= 0.9) return 'bg-green-500';
    if (level >= 0.7) return 'bg-blue-500';
    if (level >= 0.5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getMasteryLabel = (): string => {
    if (level >= 0.9) return 'Mastered';
    if (level >= 0.7) return 'Proficient';
    if (level >= 0.5) return 'Developing';
    if (level >= 0.25) return 'Emerging';
    return 'Beginning';
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('flex items-center', sizeClasses[size])}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm transition-colors',
              getMasteryColor(i, i < filledSegments),
              sizeClasses[size].split(' ')[0]
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1">
          {getMasteryLabel()} ({formatPercentage(level)})
        </span>
      )}
    </div>
  );
}

// ─── At-Risk Badge ─────────────────────────────────────────────────────────────

export interface AtRiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  showLabel?: boolean;
  className?: string;
}

/**
 * Badge indicating student at-risk status
 */
export function AtRiskBadge({ level, showLabel = true, className }: AtRiskBadgeProps) {
  const config = {
    low: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'On Track',
      dot: 'bg-green-500',
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Needs Attention',
      dot: 'bg-yellow-500',
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      label: 'At Risk',
      dot: 'bg-orange-500',
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Critical',
      dot: 'bg-red-500',
    },
  };

  const { bg, text, label, dot } = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        bg,
        text,
        className
      )}
    >
      <span className={cn('w-2 h-2 rounded-full mr-1.5', dot)} />
      {showLabel && label}
    </span>
  );
}

// ─── Student Progress Card ─────────────────────────────────────────────────────

export interface StudentProgressCardProps {
  student: StudentMetricsSummary;
  onClick?: () => void;
  className?: string;
}

/**
 * Card showing individual student progress summary
 */
export function StudentProgressCard({ student, onClick, className }: StudentProgressCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm border border-gray-100',
        'hover:shadow-md transition-shadow duration-200 cursor-pointer',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{student.studentName}</h4>
          <p className="text-sm text-gray-500">
            {student.lastActive
              ? `Last active: ${new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                }).format(student.lastActive)}`
              : 'No recent activity'}
          </p>
        </div>
        {student.riskLevel && <AtRiskBadge level={student.riskLevel} showLabel={false} />}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Average Score</span>
          <span className="font-medium">{student.averageScore.toFixed(0)}%</span>
        </div>
        <ProgressBar
          value={student.averageScore}
          color={student.averageScore >= 70 ? 'success' : student.averageScore >= 50 ? 'warning' : 'danger'}
          size="sm"
          showValue={false}
        />

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Mastery</span>
          <span className="font-medium">{formatPercentage(student.masteryLevel)}</span>
        </div>
        <MasteryLevel level={student.masteryLevel} size="sm" showLabel={false} />

        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{student.lessonsCompleted}</p>
            <p className="text-xs text-gray-500">Lessons</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{formatDuration(student.timeOnTask)}</p>
            <p className="text-xs text-gray-500">Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Class Overview Card ───────────────────────────────────────────────────────

export interface ClassOverviewCardProps {
  classData: ClassMetricsSummary;
  onClick?: () => void;
  className?: string;
}

/**
 * Card showing class-level overview metrics
 */
export function ClassOverviewCard({ classData, onClick, className }: ClassOverviewCardProps) {
  const participationRate = classData.activeStudents / classData.studentCount;

  return (
    <div
      className={cn(
        'bg-white rounded-lg p-5 shadow-sm border border-gray-100',
        'hover:shadow-md transition-shadow duration-200 cursor-pointer',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{classData.className}</h3>
          <p className="text-sm text-gray-500">
            {classData.activeStudents} / {classData.studentCount} active students
          </p>
        </div>
        {classData.atRiskCount > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full">
            {classData.atRiskCount} at risk
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Avg Score</p>
          <p className="text-2xl font-bold text-gray-900">{classData.averageScore.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Completion</p>
          <p className="text-2xl font-bold text-gray-900">{formatPercentage(classData.completionRate)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Participation</span>
          <span className="font-medium">{formatPercentage(participationRate)}</span>
        </div>
        <ProgressBar
          value={participationRate * 100}
          color={participationRate >= 0.8 ? 'success' : participationRate >= 0.5 ? 'warning' : 'danger'}
          size="md"
          showValue={false}
        />
      </div>
    </div>
  );
}

// ─── Trend Sparkline ───────────────────────────────────────────────────────────

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
}

/**
 * Simple sparkline chart for showing trends
 */
export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = '#3b82f6',
  showDots = false,
  className,
}: SparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width={width} height={height} className={className}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return <circle key={index} cx={x} cy={y} r="3" fill={color} />;
        })}
    </svg>
  );
}

// ─── Data Table ────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

/**
 * Reusable data table component for analytics reports
 */
export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'hover:bg-gray-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const value = (row as Record<string, unknown>)[column.key as string];
                return (
                  <td
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-sm text-gray-900',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.render ? column.render(value, row) : String(value ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const AnalyticsDashboard = {
  MetricCard,
  ProgressBar,
  MasteryLevel,
  AtRiskBadge,
  StudentProgressCard,
  ClassOverviewCard,
  Sparkline,
  DataTable,
};

export default AnalyticsDashboard;
