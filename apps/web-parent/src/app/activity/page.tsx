/**
 * Activity Page
 *
 * Shows a comprehensive view of all student activities -
 * lessons completed, quizzes taken, assignments done, achievements earned.
 */

'use client';

import { format, subDays } from 'date-fns';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  CheckCircle,
  Award,
  Calendar,
  TrendingUp,
  Clock,
  Star,
  Search,
  Gamepad2,
  Target,
  Play,
  Trophy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { QueryErrorDisplay } from '@/components/error-boundary';
import { ActivityPageSkeleton } from '@/components/skeletons';
import { useActivities, useSelectedChild } from '@/hooks';
import type { TimelineActivity } from '@/lib/api/parent.api';

// Map timeline types to display categories
type DisplayCategory = 'lesson' | 'quiz' | 'achievement' | 'other';

function getDisplayCategory(type: TimelineActivity['type']): DisplayCategory {
  switch (type) {
    case 'lesson_started':
    case 'lesson_completed':
      return 'lesson';
    case 'quiz_completed':
    case 'assessment_completed':
      return 'quiz';
    case 'achievement_earned':
    case 'milestone_reached':
      return 'achievement';
    case 'game_played':
    case 'practice_session':
    default:
      return 'other';
  }
}

const activityIcons: Record<TimelineActivity['type'], typeof BookOpen> = {
  lesson_started: Play,
  lesson_completed: BookOpen,
  quiz_completed: FileText,
  achievement_earned: Award,
  milestone_reached: Trophy,
  game_played: Gamepad2,
  practice_session: Target,
  assessment_completed: CheckCircle,
};

const activityColors: Record<DisplayCategory, { bg: string; text: string; border: string }> = {
  lesson: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  quiz: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  achievement: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  other: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
};

type FilterType = 'all' | 'lesson' | 'quiz' | 'achievement' | 'other';
type DateRange = '7days' | '30days' | 'all';

export default function ActivityPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7days');

  // Get selected child from parent profile
  const { selectedChildId: studentId, isLoading: _profileLoading } = useSelectedChild();

  const { data: activities = [], isLoading, error, refetch } = useActivities(studentId);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Search
    if (searchQuery && !activity.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filter - compare display category, not raw type
    if (filterType !== 'all' && getDisplayCategory(activity.type) !== filterType) {
      return false;
    }
    // Date range
    const activityDate = new Date(activity.timestamp);
    const now = new Date();
    if (dateRange === '7days' && activityDate < subDays(now, 7)) {
      return false;
    }
    if (dateRange === '30days' && activityDate < subDays(now, 30)) {
      return false;
    }
    return true;
  });

  // Group by date
  const groupedActivities = filteredActivities.reduce<Record<string, TimelineActivity[]>>(
    (groups, activity) => {
      const date = format(new Date(activity.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {}
  );

  // Stats
  const totalActivities = activities.length;
  const totalLessons = activities.filter(
    (a) => a.type === 'lesson_started' || a.type === 'lesson_completed'
  ).length;
  const avgScore =
    activities.filter((a) => a.score !== undefined).length > 0
      ? Math.round(
          activities
            .filter((a) => a.score !== undefined)
            .reduce((sum, a) => sum + (a.score || 0), 0) /
            activities.filter((a) => a.score !== undefined).length
        )
      : 0;
  const totalTime = activities
    .filter((a) => a.duration)
    .reduce((sum, a) => sum + (a.duration || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  router.push('/dashboard');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Activity History</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Activities</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalActivities}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">Lessons</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgScore}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Total Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.floor(totalTime / 60)}h {totalTime % 60}m
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'lesson', 'quiz', 'achievement', 'other'] as FilterType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFilterType(type);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}s
                  </button>
                )
              )}
            </div>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRange);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Activity List */}
        {isLoading ? (
          <ActivityPageSkeleton />
        ) : error ? (
          <QueryErrorDisplay error={error} onRetry={() => void refetch()} />
        ) : Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-500">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Activities will appear here as your child learns'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dayActivities]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-500 mb-4">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-3">
                    {dayActivities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityCard({ activity }: { readonly activity: TimelineActivity }) {
  const Icon = activityIcons[activity.type];
  const displayCategory = getDisplayCategory(activity.type);
  const colors = activityColors[displayCategory];

  // Format type for display
  const displayType = activity.type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
            >
              {displayType}
            </span>
            {activity.subject && <span className="text-xs text-gray-500">{activity.subject}</span>}
          </div>
          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>{format(new Date(activity.timestamp), 'h:mm a')}</span>
            {activity.duration && <span>{activity.duration} min</span>}
          </div>
        </div>
        {activity.score !== undefined && (
          <div
            className={`px-3 py-1 rounded-lg text-lg font-bold ${
              activity.score >= 90
                ? 'bg-green-100 text-green-700'
                : activity.score >= 70
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {activity.score}%
          </div>
        )}
      </div>
    </div>
  );
}
