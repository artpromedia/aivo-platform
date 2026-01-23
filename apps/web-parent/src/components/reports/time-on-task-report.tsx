'use client';

import React from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Calendar,
  Timer,
} from 'lucide-react';

import type { TimeOnTaskData, DailyTimeEntry, SubjectTimeEntry, ActivityTimeEntry } from './types';

interface TimeOnTaskReportProps {
  data: TimeOnTaskData;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'indigo',
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'indigo' | 'green' | 'amber' | 'purple' | 'blue';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-gray-900">{value}</span>
        {subValue && <span className="text-sm text-gray-500">{subValue}</span>}
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: DailyTimeEntry[] }) {
  const maxMinutes = Math.max(...data.map(d => d.totalMinutes), 1);

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Learning Time</h4>
      <div className="flex items-end justify-between gap-1 h-32">
        {data.map((day) => {
          const totalHeight = (day.totalMinutes / maxMinutes) * 100;
          const learningHeight = (day.learningMinutes / day.totalMinutes) * 100 || 0;
          const practiceHeight = (day.practiceMinutes / day.totalMinutes) * 100 || 0;

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div className="w-full relative" style={{ height: '100px' }}>
                <div
                  className="absolute bottom-0 w-full rounded-t overflow-hidden transition-all duration-500"
                  style={{ height: `${totalHeight}%` }}
                >
                  {/* Learning (lessons) */}
                  <div
                    className="w-full bg-indigo-500"
                    style={{ height: `${learningHeight}%` }}
                  />
                  {/* Practice */}
                  <div
                    className="w-full bg-purple-400"
                    style={{ height: `${practiceHeight}%` }}
                  />
                  {/* Assessments */}
                  <div
                    className="w-full bg-amber-400"
                    style={{ height: `${100 - learningHeight - practiceHeight}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-2">{day.day.slice(0, 3)}</span>
              <span className="text-xs text-gray-400">{day.totalMinutes}m</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-500 rounded" />
          <span className="text-xs text-gray-600">Lessons</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-400 rounded" />
          <span className="text-xs text-gray-600">Practice</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-400 rounded" />
          <span className="text-xs text-gray-600">Assessments</span>
        </div>
      </div>
    </div>
  );
}

function SubjectBreakdown({ data }: { data: SubjectTimeEntry[] }) {
  const sortedData = [...data].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const maxMinutes = sortedData[0]?.totalMinutes || 1;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Time by Subject</h4>
      <div className="space-y-3">
        {sortedData.map((subject) => (
          <div key={subject.subject}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
                <TrendIcon trend={subject.trend} />
              </div>
              <span className="text-sm text-gray-500">{subject.totalMinutes} min ({subject.percentage}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(subject.totalMinutes / maxMinutes) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityBreakdown({ data }: { data: ActivityTimeEntry[] }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Activity Distribution</h4>
      <div className="flex items-center justify-center gap-4">
        {/* Donut chart representation */}
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.reduce((acc, activity, index) => {
              const offset = acc.offset;
              const percentage = activity.percentage;
              const circumference = 2 * Math.PI * 40;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -offset * (circumference / 100);

              acc.elements.push(
                <circle
                  key={activity.activity}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={activity.color}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
              acc.offset += percentage;
              return acc;
            }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-xl font-bold text-gray-900">
                {data.reduce((sum, a) => sum + a.minutes, 0)}
              </span>
              <span className="text-xs text-gray-500 block">min</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {data.map((activity) => (
            <div key={activity.activity} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: activity.color }}
              />
              <span className="text-sm text-gray-600">
                {activity.activity} ({activity.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimeOnTaskReport({ data }: TimeOnTaskReportProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Time on Task Report</h2>
          <p className="text-sm text-gray-500">Learning time analysis and patterns</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Clock}
          label="Total Time"
          value={Math.round(data.totalMinutes / 60)}
          subValue="hours"
          color="indigo"
        />
        <StatCard
          icon={Calendar}
          label="Daily Average"
          value={data.dailyAverage}
          subValue="min/day"
          color="purple"
        />
        <StatCard
          icon={Sun}
          label="Most Productive"
          value={data.mostProductiveTime}
          color="amber"
        />
        <StatCard
          icon={Timer}
          label="Avg Session"
          value={data.sessionStats.averageLength}
          subValue="min"
          color="blue"
        />
      </div>

      {/* Session Stats */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Session Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.sessionStats.sessionsThisWeek}</p>
            <p className="text-xs text-gray-500">Sessions This Week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.sessionStats.averageLength}</p>
            <p className="text-xs text-gray-500">Avg Length (min)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.sessionStats.longestSession}</p>
            <p className="text-xs text-gray-500">Longest (min)</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <DailyChart data={data.dailyBreakdown} />
        </div>

        {/* Subject Breakdown */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <SubjectBreakdown data={data.subjectBreakdown} />
        </div>
      </div>

      {/* Activity Distribution */}
      {data.activityBreakdown.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <ActivityBreakdown data={data.activityBreakdown} />
        </div>
      )}
    </div>
  );
}
