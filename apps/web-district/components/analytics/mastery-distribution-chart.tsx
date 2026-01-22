'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MasteryBucket {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

interface MasteryDistributionChartProps {
  data: MasteryBucket[];
}

const FILL_COLORS: Record<string, string> = {
  '0-25': 'var(--color-danger)',
  '26-50': 'var(--color-warning)',
  '51-75': 'var(--color-primary)',
  '76-100': 'var(--color-success)',
};

export function MasteryDistributionChart({ data }: MasteryDistributionChartProps) {
  const chartData = data.map((bucket) => ({
    range: bucket.range,
    count: bucket.count,
    fill: FILL_COLORS[bucket.range] ?? 'var(--color-primary)',
  }));

  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No learner mastery data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="horizontal"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ className: 'stroke-border' }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ className: 'stroke-border' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [
            `${value} learners (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
            'Count',
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
