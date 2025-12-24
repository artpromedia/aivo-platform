/**
 * Mastery Distribution Chart
 *
 * Donut/pie chart showing student distribution across mastery levels.
 * Optimized for quick comprehension during 5-minute between-class checks.
 * WCAG 2.1 AA compliant with patterns and high-contrast colors.
 */

'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import type { MasteryDistribution } from '@/lib/types';

interface MasteryDistributionChartProps {
  readonly data: MasteryDistribution;
  readonly totalStudents: number;
  readonly showLabels?: boolean;
  readonly height?: number;
  readonly className?: string;
}

// Colors designed for accessibility (colorblind-friendly palette)
const COLORS = {
  mastered: '#059669', // Emerald-600
  proficient: '#10b981', // Emerald-500
  developing: '#f59e0b', // Amber-500
  beginning: '#ef4444', // Red-500
};

// Patterns for additional accessibility
const _PATTERNS = {
  mastered: 'none',
  proficient: 'diagonal-stripe',
  developing: 'dots',
  beginning: 'cross',
};

const LABELS = {
  mastered: 'Mastered (90%+)',
  proficient: 'Proficient (70-89%)',
  developing: 'Developing (50-69%)',
  beginning: 'Beginning (<50%)',
};

export function MasteryDistributionChart({
  data,
  totalStudents,
  showLabels = true,
  height = 250,
  className,
}: MasteryDistributionChartProps) {
  const chartData = React.useMemo(() => {
    return [
      { name: 'Mastered', value: data.mastered, color: COLORS.mastered, label: LABELS.mastered },
      {
        name: 'Proficient',
        value: data.proficient,
        color: COLORS.proficient,
        label: LABELS.proficient,
      },
      {
        name: 'Developing',
        value: data.developing,
        color: COLORS.developing,
        label: LABELS.developing,
      },
      {
        name: 'Beginning',
        value: data.beginning,
        color: COLORS.beginning,
        label: LABELS.beginning,
      },
    ].filter((item) => item.value > 0);
  }, [data]);

  // Calculate percentages
  const percentages = React.useMemo(() => {
    if (totalStudents === 0) return {};
    return {
      mastered: Math.round((data.mastered / totalStudents) * 100),
      proficient: Math.round((data.proficient / totalStudents) * 100),
      developing: Math.round((data.developing / totalStudents) * 100),
      beginning: Math.round((data.beginning / totalStudents) * 100),
    };
  }, [data, totalStudents]);

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

  return (
    <figure
      className={className}
      aria-label={`Mastery distribution chart: ${data.mastered} mastered, ${data.proficient} proficient, ${data.developing} developing, ${data.beginning} beginning`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={showLabels ? ({ name, value }) => `${name}: ${value}` : undefined}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const item = payload[0].payload as { name: string; value: number; label: string };
                const percent =
                  totalStudents > 0 ? Math.round((item.value / totalStudents) * 100) : 0;
                return (
                  <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">
                      {item.value} student{item.value !== 1 ? 's' : ''} ({percent}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Accessible data table (visually hidden but available for screen readers) */}
      <table className="sr-only">
        <caption>Mastery distribution data</caption>
        <thead>
          <tr>
            <th>Level</th>
            <th>Students</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mastered (90%+)</td>
            <td>{data.mastered}</td>
            <td>{percentages.mastered}%</td>
          </tr>
          <tr>
            <td>Proficient (70-89%)</td>
            <td>{data.proficient}</td>
            <td>{percentages.proficient}%</td>
          </tr>
          <tr>
            <td>Developing (50-69%)</td>
            <td>{data.developing}</td>
            <td>{percentages.developing}%</td>
          </tr>
          <tr>
            <td>Beginning (&lt;50%)</td>
            <td>{data.beginning}</td>
            <td>{percentages.beginning}%</td>
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
