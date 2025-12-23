/**
 * Progress Chart Component
 *
 * Line chart for tracking student/class progress over time
 */

'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface ProgressChartProps {
  data: DataPoint[];
  lines: {
    key: string;
    label: string;
    color: string;
  }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function ProgressChart({
  data,
  lines,
  title,
  height = 300,
  showLegend = true,
  className,
}: ProgressChartProps) {
  return (
    <div className={cn('rounded-xl border bg-white p-4', className)}>
      {title && <h3 className="mb-4 font-medium text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} stroke="#9ca3af" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Simple stat card
 */
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ title, value, change, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-white p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-sm',
                trend === 'up' && 'text-green-600',
                trend === 'down' && 'text-red-600',
                trend === 'neutral' && 'text-gray-500'
              )}
            >
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              <span>
                {change.value > 0 ? '+' : ''}
                {change.value}%
              </span>
              <span className="text-gray-400">{change.label}</span>
            </p>
          )}
        </div>
        {icon && <div className="rounded-lg bg-primary-50 p-2 text-primary-600">{icon}</div>}
      </div>
    </div>
  );
}
