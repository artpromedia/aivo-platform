'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Target,
  Award,
  BarChart3,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  summary: {
    totalMinutes: number;
    previousWeekMinutes: number;
    lessonsCompleted: number;
    previousWeekLessons: number;
    averageScore: number;
    previousWeekScore: number;
    activeDays: number;
    previousWeekActiveDays: number;
  };
  highlights: {
    type: 'achievement' | 'improvement' | 'concern' | 'milestone';
    text: string;
  }[];
  subjectBreakdown: {
    subject: string;
    minutes: number;
    lessons: number;
    averageScore: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  dailyActivity: {
    day: string;
    minutes: number;
    lessons: number;
  }[];
  recommendations: string[];
}

interface WeeklyReportProps {
  childId: string;
  childName?: string;
  data: WeeklyReportData;
  onWeekChange?: (weekStart: Date) => void;
  onDownload?: () => void;
  onShare?: () => void;
}

function StatComparison({
  label,
  current,
  previous,
  unit,
  icon: Icon,
  format: formatValue = (v: number) => String(v),
}: {
  label: string;
  current: number;
  previous: number;
  unit?: string;
  icon: typeof Clock;
  format?: (value: number) => string;
}) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{formatValue(current)}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {previous > 0 && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : isNegative ? (
            <TrendingDown className="w-3 h-3" />
          ) : null}
          <span>
            {isPositive ? '+' : ''}{Math.round(change)}% vs last week
          </span>
        </div>
      )}
    </div>
  );
}

export function WeeklyReport({
  childId,
  childName,
  data,
  onWeekChange,
  onDownload,
  onShare,
}: WeeklyReportProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date(data.weekStart));

  const handlePreviousWeek = () => {
    const newWeek = subWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
    onWeekChange?.(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = subWeeks(selectedWeek, -1);
    const now = new Date();
    if (newWeek <= now) {
      setSelectedWeek(newWeek);
      onWeekChange?.(newWeek);
    }
  };

  const isCurrentWeek = format(startOfWeek(selectedWeek), 'yyyy-MM-dd') ===
    format(startOfWeek(new Date()), 'yyyy-MM-dd');

  const maxDailyMinutes = Math.max(...data.dailyActivity.map(d => d.minutes), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Weekly Report</h2>
            <p className="text-sm text-gray-500">
              {childName ? `${childName}'s progress` : 'Learning summary'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Share report"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Download report"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-lg p-3">
        <button
          onClick={handlePreviousWeek}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">
            {format(new Date(data.weekStart), 'MMM d')} - {format(new Date(data.weekEnd), 'MMM d, yyyy')}
          </span>
          {isCurrentWeek && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
              This Week
            </span>
          )}
        </div>
        <button
          onClick={handleNextWeek}
          disabled={isCurrentWeek}
          className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatComparison
          label="Learning Time"
          current={data.summary.totalMinutes}
          previous={data.summary.previousWeekMinutes}
          unit="min"
          icon={Clock}
        />
        <StatComparison
          label="Lessons"
          current={data.summary.lessonsCompleted}
          previous={data.summary.previousWeekLessons}
          icon={BookOpen}
        />
        <StatComparison
          label="Avg Score"
          current={data.summary.averageScore}
          previous={data.summary.previousWeekScore}
          unit="%"
          icon={Target}
        />
        <StatComparison
          label="Active Days"
          current={data.summary.activeDays}
          previous={data.summary.previousWeekActiveDays}
          unit="/7"
          icon={Award}
        />
      </div>

      {/* Daily Activity Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Activity</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {data.dailyActivity.map((day, index) => {
            const height = (day.minutes / maxDailyMinutes) * 100;
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2">{day.day.slice(0, 3)}</span>
                <span className="text-xs text-gray-400">{day.minutes}m</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Subject Breakdown</h3>
        <div className="space-y-3">
          {data.subjectBreakdown.map((subject) => (
            <div
              key={subject.subject}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{subject.subject}</span>
                {subject.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {subject.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">{subject.minutes} min</span>
                <span className="text-gray-500">{subject.lessons} lessons</span>
                <span className="font-medium text-indigo-600">{subject.averageScore}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Week Highlights</h3>
          <div className="space-y-2">
            {data.highlights.map((highlight, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  highlight.type === 'achievement'
                    ? 'bg-amber-50 text-amber-800'
                    : highlight.type === 'improvement'
                    ? 'bg-green-50 text-green-800'
                    : highlight.type === 'concern'
                    ? 'bg-red-50 text-red-800'
                    : 'bg-purple-50 text-purple-800'
                }`}
              >
                {highlight.type === 'achievement' && <Award className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {highlight.type === 'improvement' && <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {highlight.type === 'concern' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {highlight.type === 'milestone' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span className="text-sm">{highlight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
          <h3 className="text-sm font-medium text-indigo-900 mb-2">Recommendations for Next Week</h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-indigo-800 flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
