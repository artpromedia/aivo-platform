'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Minus, BookOpen, Clock, Target, Award } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface SubjectProgress {
  subject: string;
  color: string;
  currentLevel: number;
  totalLevels: number;
  lessonsCompleted: number;
  totalLessons: number;
  averageScore: number;
  trend: 'up' | 'down' | 'stable';
  weeklyProgress: number[];
}

export interface ProgressStats {
  totalLessonsCompleted: number;
  totalMinutesLearned: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
}

export interface WeeklyData {
  labels: string[];
  minutes: number[];
  lessons: number[];
  scores: number[];
}

interface ProgressOverviewProps {
  subjects: SubjectProgress[];
  stats: ProgressStats;
  weeklyData: WeeklyData;
  onSubjectClick?: (subject: string) => void;
}

const subjectColorMap: Record<string, { primary: string; secondary: string; bg: string }> = {
  math: { primary: '#3B82F6', secondary: '#93C5FD', bg: 'bg-blue-50' },
  reading: { primary: '#10B981', secondary: '#6EE7B7', bg: 'bg-emerald-50' },
  science: { primary: '#8B5CF6', secondary: '#C4B5FD', bg: 'bg-purple-50' },
  writing: { primary: '#F59E0B', secondary: '#FCD34D', bg: 'bg-amber-50' },
  'social studies': { primary: '#EF4444', secondary: '#FCA5A5', bg: 'bg-red-50' },
  art: { primary: '#EC4899', secondary: '#F9A8D4', bg: 'bg-pink-50' },
  music: { primary: '#6366F1', secondary: '#A5B4FC', bg: 'bg-indigo-50' },
};

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
}

export function ProgressOverview({
  subjects,
  stats,
  weeklyData,
  onSubjectClick,
}: ProgressOverviewProps) {
  // Weekly activity chart data
  const weeklyActivityData = useMemo(() => ({
    labels: weeklyData.labels,
    datasets: [
      {
        label: 'Minutes',
        data: weeklyData.minutes,
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366F1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  }), [weeklyData]);

  // Subject distribution chart data
  const subjectDistributionData = useMemo(() => ({
    labels: subjects.map(s => s.subject),
    datasets: [
      {
        data: subjects.map(s => s.lessonsCompleted),
        backgroundColor: subjects.map(s => {
          const colors = subjectColorMap[s.subject.toLowerCase()];
          return colors?.primary || s.color;
        }),
        borderWidth: 0,
      },
    ],
  }), [subjects]);

  // Score trend chart data
  const scoreTrendData = useMemo(() => ({
    labels: weeklyData.labels,
    datasets: [
      {
        label: 'Average Score',
        data: weeklyData.scores,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [weeklyData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Progress Overview</h2>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-medium">Lessons</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalLessonsCompleted}</p>
          <p className="text-xs text-gray-500">completed</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Learning Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(stats.totalMinutesLearned / 60)}h {stats.totalMinutesLearned % 60}m
          </p>
          <p className="text-xs text-gray-500">total time</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Score</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
          <p className="text-xs text-gray-500">across all subjects</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <Award className="w-4 h-4" />
            <span className="text-xs font-medium">Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.currentStreak} days</p>
          <p className="text-xs text-gray-500">best: {stats.longestStreak} days</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Weekly Learning Time</h3>
          <div className="h-48">
            <Line data={weeklyActivityData} options={chartOptions} />
          </div>
        </div>

        {/* Subject Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Subject Focus</h3>
          <div className="h-48">
            <Doughnut data={subjectDistributionData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Subject Progress Details */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Subject Progress</h3>
        <div className="space-y-4">
          {subjects.map(subject => {
            const colors = subjectColorMap[subject.subject.toLowerCase()] || {
              primary: subject.color,
              secondary: subject.color + '40',
              bg: 'bg-gray-50',
            };
            const progressPercent = Math.round((subject.lessonsCompleted / subject.totalLessons) * 100);

            return (
              <div
                key={subject.subject}
                className={`${colors.bg} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onSubjectClick?.(subject.subject)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSubjectClick?.(subject.subject);
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span className="font-medium text-gray-900">{subject.subject}</span>
                    <TrendIndicator trend={subject.trend} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Level {subject.currentLevel}/{subject.totalLevels}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: colors.primary }}
                    >
                      {subject.averageScore}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-24 text-right">
                    {subject.lessonsCompleted}/{subject.totalLessons} lessons
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Goal Progress */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Weekly Goal Progress</span>
          <span className="text-sm text-gray-500">
            {stats.weeklyGoalProgress}/{stats.weeklyGoalTarget} min
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (stats.weeklyGoalProgress / stats.weeklyGoalTarget) * 100)}%`,
            }}
          />
        </div>
        {stats.weeklyGoalProgress >= stats.weeklyGoalTarget && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
            <Award className="w-4 h-4" />
            Weekly goal achieved! Great work!
          </p>
        )}
      </div>
    </div>
  );
}
