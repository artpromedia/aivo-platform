/**
 * ClassPerformanceChart Component
 *
 * Displays class performance data with interactive charts
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ClassPerformanceData } from '@/lib/types';

interface ClassPerformanceChartProps {
  data: ClassPerformanceData[];
  className?: string;
}

type ChartView = 'trend' | 'mastery' | 'engagement';

export function ClassPerformanceChart({ data, className }: ClassPerformanceChartProps) {
  const [view, setView] = useState<ChartView>('trend');
  const [selectedClass, setSelectedClass] = useState<string | null>(
    data.length > 0 ? data[0].classId : null
  );

  const selectedClassData = data.find((d) => d.classId === selectedClass);

  const views: { id: ChartView; label: string }[] = [
    { id: 'trend', label: 'Progress Trend' },
    { id: 'mastery', label: 'Mastery Distribution' },
    { id: 'engagement', label: 'Engagement' },
  ];

  return (
    <div className={cn('rounded-xl border border-border bg-surface', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-text">Class Performance</h2>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === v.id
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Class Selector Tabs */}
      {data.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border p-3">
          {data.map((cls) => (
            <button
              key={cls.classId}
              onClick={() => setSelectedClass(cls.classId)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                selectedClass === cls.classId
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-surface-muted'
              )}
            >
              <span>{cls.className}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  cls.averageScore >= 85
                    ? 'bg-success/10 text-success'
                    : cls.averageScore >= 70
                    ? 'bg-warning/10 text-warning'
                    : 'bg-error/10 text-error'
                )}
              >
                {cls.averageScore}%
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Chart Content */}
      <div className="p-4">
        {selectedClassData && (
          <>
            {view === 'trend' && (
              <TrendChart data={selectedClassData.weeklyProgress} />
            )}
            {view === 'mastery' && (
              <MasteryDistributionChart
                distribution={selectedClassData.masteryDistribution}
              />
            )}
            {view === 'engagement' && (
              <EngagementChart data={selectedClassData.weeklyProgress} />
            )}
          </>
        )}

        {!selectedClassData && (
          <div className="h-64 flex items-center justify-center text-muted">
            No data available
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {selectedClassData && (
        <div className="grid grid-cols-4 gap-4 border-t border-border p-4">
          <SummaryStatCard
            label="Avg Score"
            value={`${selectedClassData.averageScore}%`}
            trend={selectedClassData.trend}
            trendValue={selectedClassData.trendValue}
          />
          <SummaryStatCard
            label="Students"
            value={selectedClassData.studentCount.toString()}
          />
          <SummaryStatCard
            label="Mastered"
            value={`${selectedClassData.masteryDistribution.mastered}%`}
            color="success"
          />
          <SummaryStatCard
            label="Need Support"
            value={`${selectedClassData.masteryDistribution.beginning + selectedClassData.masteryDistribution.developing}%`}
            color="warning"
          />
        </div>
      )}
    </div>
  );
}

interface TrendChartProps {
  data: { week: string; averageScore: number; engagement: number; completionRate: number }[];
}

function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Average Score']}
          />
          <Area
            type="monotone"
            dataKey="averageScore"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorScore)"
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-muted">Average Score</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-0.5 w-6 bg-success" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #10b981 2px, #10b981 4px)' }} />
          <span className="text-muted">Completion Rate</span>
        </div>
      </div>
    </div>
  );
}

interface MasteryDistributionChartProps {
  distribution: {
    mastered: number;
    proficient: number;
    developing: number;
    beginning: number;
  };
}

function MasteryDistributionChart({ distribution }: MasteryDistributionChartProps) {
  const data = [
    { name: 'Mastered', value: distribution.mastered, color: '#10b981' },
    { name: 'Proficient', value: distribution.proficient, color: '#6366f1' },
    { name: 'Developing', value: distribution.developing, color: '#f59e0b' },
    { name: 'Beginning', value: distribution.beginning, color: '#ef4444' },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}% of students`, '']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <rect key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface EngagementChartProps {
  data: { week: string; averageScore: number; engagement: number; completionRate: number }[];
}

function EngagementChart({ data }: EngagementChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend verticalAlign="bottom" height={36} />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', strokeWidth: 2 }}
            name="Engagement"
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2 }}
            name="Completion Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SummaryStatCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: 'success' | 'warning' | 'error' | 'info';
}

function SummaryStatCard({ label, value, trend, trendValue, color }: SummaryStatCardProps) {
  const colorClasses = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
  };

  return (
    <div className="text-center">
      <p className={cn('text-2xl font-bold', color ? colorClasses[color] : 'text-text')}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
      {trend && trendValue !== undefined && (
        <div
          className={cn(
            'mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs',
            trend === 'up' && 'bg-success/10 text-success',
            trend === 'down' && 'bg-error/10 text-error',
            trend === 'stable' && 'bg-muted/10 text-muted'
          )}
        >
          {trend === 'up' && <ArrowUpIcon className="h-3 w-3" />}
          {trend === 'down' && <ArrowDownIcon className="h-3 w-3" />}
          {trend === 'stable' && <MinusIcon className="h-3 w-3" />}
          <span>{Math.abs(trendValue)}%</span>
        </div>
      )}
    </div>
  );
}

// Icons
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}
