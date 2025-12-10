'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MasteryDistributionChartProps {
  data: {
    '0-25': number;
    '26-50': number;
    '51-75': number;
    '76-100': number;
  };
}

export function MasteryDistributionChart({ data }: MasteryDistributionChartProps) {
  const chartData = [
    { range: '0-25%', count: data['0-25'], fill: 'var(--color-danger)' },
    { range: '26-50%', count: data['26-50'], fill: 'var(--color-warning)' },
    { range: '51-75%', count: data['51-75'], fill: 'var(--color-primary)' },
    { range: '76-100%', count: data['76-100'], fill: 'var(--color-success)' },
  ];

  const total = Object.values(data).reduce((sum, n) => sum + n, 0);

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
