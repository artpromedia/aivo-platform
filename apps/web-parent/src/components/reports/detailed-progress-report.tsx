'use client';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BookOpen,
  Target,
  Flame,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import type { DetailedProgress, ProgressPeriod } from './types';

interface DetailedProgressReportProps {
  data: DetailedProgress;
  childName?: string;
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
  trend,
  color = 'indigo',
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
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
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subValue && <span className="text-sm text-gray-500">{subValue}</span>}
        {trend && <TrendIcon trend={trend} />}
      </div>
    </div>
  );
}

function ProgressChart({ periods }: { periods: ProgressPeriod[] }) {
  const maxScore = 100;
  const maxTime = Math.max(...periods.map(p => p.timeSpent), 1);

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-4">Progress Over Time</h4>
      <div className="relative h-48">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-40 flex items-end gap-2">
          {periods.map((period, index) => {
            const scoreHeight = (period.score / maxScore) * 100;
            const timeHeight = (period.timeSpent / maxTime) * 100;

            return (
              <div key={period.label} className="flex-1 flex flex-col items-center">
                <div className="w-full flex gap-1 items-end" style={{ height: '140px' }}>
                  {/* Score bar */}
                  <div
                    className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all duration-500"
                    style={{ height: `${scoreHeight}%` }}
                    title={`Score: ${period.score}%`}
                  />
                  {/* Time bar */}
                  <div
                    className="flex-1 bg-gradient-to-t from-purple-500 to-purple-400 rounded-t transition-all duration-500"
                    style={{ height: `${timeHeight}%` }}
                    title={`Time: ${period.timeSpent} min`}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2">{period.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded" />
          <span className="text-xs text-gray-600">Average Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded" />
          <span className="text-xs text-gray-600">Time Spent</span>
        </div>
      </div>
    </div>
  );
}

export function DetailedProgressReport({ data, childName }: DetailedProgressReportProps) {
  const completionPercentage = Math.round((data.lessonsCompleted / data.totalLessons) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Detailed Progress Report</h2>
          <p className="text-sm text-gray-500">
            {childName ? `${childName}'s learning journey` : 'Overall progress summary'}
          </p>
        </div>
      </div>

      {/* Overall Score Highlight */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm">Overall Performance Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold">{data.overallScore}%</span>
              <TrendIcon trend={data.overallTrend} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm">Grade Level Progress</p>
            <p className="text-xl font-semibold">{data.gradeLevel.current}</p>
            <div className="mt-2 w-24 h-2 bg-white/30 rounded-full">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${data.gradeLevel.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={BookOpen}
          label="Lessons Completed"
          value={data.lessonsCompleted}
          subValue={`of ${data.totalLessons}`}
          color="indigo"
        />
        <StatCard
          icon={Clock}
          label="Total Learning Time"
          value={Math.round(data.totalLearningTime / 60)}
          subValue="hours"
          color="purple"
        />
        <StatCard
          icon={Target}
          label="Avg Session Time"
          value={data.averageSessionTime}
          subValue="min"
          color="blue"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={data.streak.current}
          subValue={`best: ${data.streak.longest}`}
          color="amber"
        />
      </div>

      {/* Completion Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Curriculum Completion</span>
          <span className="text-sm font-medium text-indigo-600">{completionPercentage}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {data.totalLessons - data.lessonsCompleted} lessons remaining
        </p>
      </div>

      {/* Progress Chart */}
      {data.periods.length > 0 && <ProgressChart periods={data.periods} />}
    </div>
  );
}
