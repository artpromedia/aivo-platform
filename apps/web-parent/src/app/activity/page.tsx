/**
 * Activity Page
 *
 * Shows a comprehensive view of all student activities -
 * lessons completed, quizzes taken, assignments done, achievements earned.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';

import { api } from '@/lib/api';
import { isDevMode } from '@/lib/mock-data';

interface Activity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'achievement';
  title: string;
  subject: string;
  score?: number;
  completedAt: string;
  duration?: number; // in minutes
}

// Mock activities data for development
function getMockActivities(): Activity[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'lesson',
      title: 'Introduction to Fractions',
      subject: 'Math',
      completedAt: subDays(now, 0).toISOString(),
      duration: 25,
    },
    {
      id: '2',
      type: 'quiz',
      title: 'Chapter 5 Quiz: Multiplication',
      subject: 'Math',
      score: 92,
      completedAt: subDays(now, 0).toISOString(),
      duration: 15,
    },
    {
      id: '3',
      type: 'achievement',
      title: 'Math Whiz - 10 Perfect Quizzes',
      subject: 'Achievement',
      completedAt: subDays(now, 1).toISOString(),
    },
    {
      id: '4',
      type: 'lesson',
      title: 'The Water Cycle',
      subject: 'Science',
      completedAt: subDays(now, 1).toISOString(),
      duration: 30,
    },
    {
      id: '5',
      type: 'assignment',
      title: 'Essay: My Favorite Book',
      subject: 'Reading',
      score: 88,
      completedAt: subDays(now, 2).toISOString(),
      duration: 45,
    },
    {
      id: '6',
      type: 'quiz',
      title: 'Vocabulary Test Week 12',
      subject: 'Reading',
      score: 95,
      completedAt: subDays(now, 2).toISOString(),
      duration: 10,
    },
    {
      id: '7',
      type: 'lesson',
      title: 'Parts of a Plant',
      subject: 'Science',
      completedAt: subDays(now, 3).toISOString(),
      duration: 20,
    },
    {
      id: '8',
      type: 'achievement',
      title: 'Early Bird - 5 Day Streak',
      subject: 'Achievement',
      completedAt: subDays(now, 3).toISOString(),
    },
    {
      id: '9',
      type: 'assignment',
      title: 'Science Lab Report',
      subject: 'Science',
      score: 90,
      completedAt: subDays(now, 4).toISOString(),
      duration: 35,
    },
    {
      id: '10',
      type: 'lesson',
      title: 'Ancient Egypt: Pyramids',
      subject: 'Social Studies',
      completedAt: subDays(now, 5).toISOString(),
      duration: 28,
    },
  ];
}

const activityIcons = {
  lesson: BookOpen,
  quiz: FileText,
  assignment: CheckCircle,
  achievement: Award,
};

const activityColors = {
  lesson: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  quiz: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  assignment: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  achievement: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
};

type FilterType = 'all' | 'lesson' | 'quiz' | 'assignment' | 'achievement';
type DateRange = '7days' | '30days' | 'all';

export default function ActivityPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7days');

  // Mock student ID
  const studentId = 'student-1';

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', studentId],
    queryFn: async () => {
      try {
        const data = await api.get<Activity[]>(`/parent/students/${studentId}/activities`);
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock activities data');
          return getMockActivities();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
  });

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Search
    if (searchQuery && !activity.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filter
    if (filterType !== 'all' && activity.type !== filterType) {
      return false;
    }
    // Date range
    const activityDate = new Date(activity.completedAt);
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
  const groupedActivities = filteredActivities.reduce(
    (groups, activity) => {
      const date = format(new Date(activity.completedAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, Activity[]>
  );

  // Stats
  const totalActivities = activities.length;
  const totalLessons = activities.filter((a) => a.type === 'lesson').length;
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
                onClick={() => router.push('/dashboard')}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'lesson', 'quiz', 'assignment', 'achievement'] as FilterType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
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
              onChange={(e) => setDateRange(e.target.value as DateRange)}
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
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

      {/* DEV Mode */}
      {isDevMode() && (
        <div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
          DEV MODE - Mock Data
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const Icon = activityIcons[activity.type];
  const colors = activityColors[activity.type];

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
              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
            </span>
            <span className="text-xs text-gray-500">{activity.subject}</span>
          </div>
          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>{format(new Date(activity.completedAt), 'h:mm a')}</span>
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
