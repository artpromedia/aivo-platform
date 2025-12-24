/**
 * Risk Distribution Chart
 *
 * Horizontal bar chart showing student distribution across risk levels.
 * Designed for immediate visual impact during quick dashboard checks.
 * WCAG 2.1 AA compliant.
 */

'use client';

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

import type { RiskDistribution } from '@/lib/types';

interface RiskDistributionChartProps {
  readonly data: RiskDistribution;
  readonly totalStudents: number;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly height?: number;
  readonly showLabels?: boolean;
  readonly className?: string;
}

// Risk level colors - designed for clear visual hierarchy
const COLORS = {
  onTrack: '#22c55e', // Green-500
  watch: '#eab308', // Yellow-500
  atRisk: '#f97316', // Orange-500
  critical: '#dc2626', // Red-600
};

const _LABELS = {
  onTrack: 'On Track',
  watch: 'Watch',
  atRisk: 'At Risk',
  critical: 'Critical',
};

export function RiskDistributionChart({
  data,
  totalStudents,
  orientation = 'horizontal',
  height = 200,
  showLabels = true,
  className,
}: RiskDistributionChartProps) {
  const chartData = React.useMemo(() => {
    return [
      { name: 'On Track', value: data.onTrack, color: COLORS.onTrack, key: 'onTrack' },
      { name: 'Watch', value: data.watch, color: COLORS.watch, key: 'watch' },
      { name: 'At Risk', value: data.atRisk, color: COLORS.atRisk, key: 'atRisk' },
      { name: 'Critical', value: data.critical, color: COLORS.critical, key: 'critical' },
    ];
  }, [data]);

  const needsAttention = data.atRisk + data.critical;
  const ariaLabel = `Risk distribution: ${data.onTrack} on track, ${data.watch} watch, ${data.atRisk} at risk, ${data.critical} critical. ${needsAttention} student${needsAttention !== 1 ? 's' : ''} need${needsAttention === 1 ? 's' : ''} attention.`;

  if (totalStudents === 0) {
    return (
      <figure
        className={`flex items-center justify-center ${className ?? ''}`}
        style={{ height }}
        aria-label="No student data available"
      >
        <figcaption className="text-sm text-gray-500">No student data available</figcaption>
      </figure>
    );
  }

  if (orientation === 'vertical') {
    return (
      <VerticalRiskChart
        chartData={chartData}
        totalStudents={totalStudents}
        height={height}
        showLabels={showLabels}
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }

  return (
    <figure className={className} aria-label={ariaLabel}>
      {/* Horizontal stacked bar */}
      <div className="space-y-3">
        {chartData.map((item) => {
          const percent = totalStudents > 0 ? Math.round((item.value / totalStudents) * 100) : 0;

          return (
            <div key={item.key} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600">{item.name}</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: item.color,
                    minWidth: item.value > 0 ? '24px' : '0',
                  }}
                />
              </div>
              <div className="w-16 text-sm text-right">
                <span className="font-medium">{item.value}</span>
                <span className="text-gray-400 ml-1">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary alert for students needing attention */}
      {needsAttention > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">
            {needsAttention} student{needsAttention !== 1 ? 's' : ''} need
            {needsAttention === 1 ? 's' : ''} attention
          </p>
          <p className="text-xs text-red-600 mt-1">
            {data.critical > 0 && `${data.critical} critical`}
            {data.critical > 0 && data.atRisk > 0 && ', '}
            {data.atRisk > 0 && `${data.atRisk} at risk`}
          </p>
        </div>
      )}

      {/* Accessible data table (visually hidden) */}
      <table className="sr-only">
        <caption>Risk level distribution data</caption>
        <thead>
          <tr>
            <th>Risk Level</th>
            <th>Students</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((item) => (
            <tr key={item.key}>
              <td>{item.name}</td>
              <td>{item.value}</td>
              <td>{totalStudents > 0 ? Math.round((item.value / totalStudents) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Vertical bar chart variant
function VerticalRiskChart({
  chartData,
  totalStudents,
  height,
  showLabels,
  ariaLabel,
  className,
}: {
  chartData: { name: string; value: number; color: string; key: string }[];
  totalStudents: number;
  height: number;
  showLabels: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <figure className={className} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            {showLabels && (
              <LabelList dataKey="value" position="top" fill="#374151" fontSize={12} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

/**
 * Compact risk indicator for inline use
 */
interface RiskIndicatorProps {
  readonly level: 'on-track' | 'watch' | 'at-risk' | 'critical';
  readonly showLabel?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
}

export function RiskIndicator({
  level,
  showLabel = true,
  size = 'md',
}: Readonly<RiskIndicatorProps>) {
  const colorMap = {
    'on-track': 'bg-green-500',
    watch: 'bg-yellow-500',
    'at-risk': 'bg-orange-500',
    critical: 'bg-red-600',
  };

  const labelMap = {
    'on-track': 'On Track',
    watch: 'Watch',
    'at-risk': 'At Risk',
    critical: 'Critical',
  };

  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${sizeMap[size]} ${colorMap[level]} rounded-full`} aria-hidden="true" />
      {showLabel && <span className="text-sm text-gray-700">{labelMap[level]}</span>}
      <span className="sr-only">{labelMap[level]}</span>
    </span>
  );
}
