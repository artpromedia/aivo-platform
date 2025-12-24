/**
 * Trend Line Chart
 *
 * Line chart for visualizing trends over time.
 * Used for mastery trends, engagement trends, etc.
 * WCAG 2.1 AA compliant with proper labeling and keyboard accessibility.
 */

'use client';

import { format, parseISO } from 'date-fns';
import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import type { TrendDataPoint } from '@/lib/types';

interface TrendLineChartProps {
  readonly data: TrendDataPoint[];
  readonly color?: string;
  readonly label?: string;
  readonly height?: number;
  readonly showGrid?: boolean;
  readonly showGoalLine?: boolean;
  readonly goalValue?: number;
  readonly goalLabel?: string;
  readonly dateFormat?: string;
  readonly className?: string;
}

export function TrendLineChart({
  data,
  color = '#3b82f6',
  label = 'Value',
  height = 300,
  showGrid = true,
  showGoalLine = false,
  goalValue = 80,
  goalLabel = 'Target',
  dateFormat = 'MMM d',
  className,
}: TrendLineChartProps) {
  // Transform data for chart (values are typically 0-1, display as 0-100)
  const chartData = React.useMemo(() => {
    return data.map((point) => ({
      date: point.date,
      value: point.value * 100,
      formattedDate: formatDateSafe(point.date, dateFormat),
    }));
  }, [data, dateFormat]);

  // Calculate trend summary for screen readers
  const trendSummary = React.useMemo(() => {
    if (chartData.length < 2) return 'Insufficient data for trend analysis';

    const first = chartData[0].value;
    const last = chartData.at(-1)?.value ?? 0;
    const change = last - first;
    let direction: string;
    if (change > 0) {
      direction = 'increased';
    } else if (change < 0) {
      direction = 'decreased';
    } else {
      direction = 'stayed stable';
    }
    const changeAbs = Math.abs(change).toFixed(1);

    return `${label} ${direction} by ${changeAbs}% over the period, from ${first.toFixed(1)}% to ${last.toFixed(1)}%`;
  }, [chartData, label]);

  if (data.length === 0) {
    return (
      <figure
        className={`flex items-center justify-center ${className ?? ''}`}
        style={{ height }}
        aria-label="No trend data available"
      >
        <figcaption className="text-sm text-gray-500">No trend data available</figcaption>
      </figure>
    );
  }

  return (
    <figure className={className} aria-label={trendSummary}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />}
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const point = payload[0].payload as { date: string; value: number };
                return (
                  <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
                    <p className="text-xs text-gray-500">
                      {formatDateSafe(point.date, 'MMM d, yyyy')}
                    </p>
                    <p className="font-medium text-gray-900">
                      {label}: {point.value.toFixed(1)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {showGoalLine && (
            <ReferenceLine
              y={goalValue}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{
                value: goalLabel,
                position: 'right',
                fill: '#10b981',
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Accessible data table (visually hidden) */}
      <table className="sr-only">
        <caption>{label} trend data</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((point) => (
            <tr key={point.date}>
              <td>{point.formattedDate}</td>
              <td>{point.value.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Multi-line trend chart for comparing multiple data series
 */
interface MultiTrendLineChartProps {
  readonly series: readonly {
    data: TrendDataPoint[];
    color: string;
    label: string;
  }[];
  readonly height?: number;
  readonly showGrid?: boolean;
  readonly dateFormat?: string;
  readonly className?: string;
}

export function MultiTrendLineChart({
  series,
  height = 300,
  showGrid = true,
  dateFormat = 'MMM d',
  className,
}: Readonly<MultiTrendLineChartProps>) {
  // Merge all dates from all series
  const chartData = React.useMemo(() => {
    const dateMap = new Map<string, Record<string, string | number>>();

    series.forEach(({ data, label }) => {
      data.forEach((point) => {
        const existing = dateMap.get(point.date) ?? { date: point.date };
        existing[label] = point.value * 100;
        dateMap.set(point.date, existing);
      });
    });

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime())
      .map((point) => ({
        ...point,
        formattedDate: formatDateSafe(String(point.date), dateFormat),
      }));
  }, [series, dateFormat]);

  if (chartData.length === 0) {
    return (
      <figure
        className={`flex items-center justify-center ${className ?? ''}`}
        style={{ height }}
        aria-label="No trend data available"
      >
        <figcaption className="text-sm text-gray-500">No trend data available</figcaption>
      </figure>
    );
  }

  return (
    <figure className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />}
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload, label: tooltipLabel }) => {
              if (active && payload?.length) {
                return (
                  <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
                    <p className="text-xs text-gray-500 mb-1">{tooltipLabel}</p>
                    {payload.map((entry) => (
                      <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {(entry.value as number).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          {series.map(({ color, label }) => (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              name={label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

// Helper function to safely format dates
function formatDateSafe(dateStr: string, formatStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, formatStr);
  } catch {
    return dateStr;
  }
}
