'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SessionsChartProps {
  data: { date: string; count: number }[];
}

export function SessionsChart({ data }: SessionsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No session data available for this period.
      </div>
    );
  }

  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ className: 'stroke-border' }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
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
          labelStyle={{ fontWeight: 600 }}
          formatter={(value: number) => [`${value} sessions`, 'Sessions']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-primary)', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: 'var(--color-primary)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
